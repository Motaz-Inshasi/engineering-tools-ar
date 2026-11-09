import { num, sym, cnst, op, neg, fn, add, sub, mul, div, pow, evaluate, dependsOn, equal, toTex, toText } from "./parser.js";
import { toRational, Unsupported, pdivmod, degree, trim } from "./polynomial.js";
import { decompose, realForm } from "./partial.js";
import { toFraction } from "./format.js";
import { InputError } from "./validate.js";

const isNum = (n, v) => n.type === "num" && (v === undefined || n.value === v);
const ONE = num(1);
const ZERO = num(0);

function hasSym(n) {
  if (n.type === "sym") return true;
  return (n.a ? hasSym(n.a) : false) || (n.b ? hasSym(n.b) : false);
}

function pureNumeric(n) {
  if (n.type === "num") return true;
  if (n.type === "sym" || n.type === "const" || n.type === "fn") return false;
  return (n.a ? pureNumeric(n.a) : true) && (n.b ? pureNumeric(n.b) : true);
}

function exactValue(n) {
  if (hasSym(n)) return null;
  const v = evaluate(n, {});
  if (!isFinite(v)) return null;
  const r = Math.round(v);
  if (Math.abs(v - r) < 1e-12 * Math.max(1, Math.abs(v))) return r;
  return null;
}

function addFactor(fs, base, exp) {
  const f = fs.find((x) => equal(x.base, base));
  if (f) f.exp = isNum(f.exp) && isNum(exp) ? num(f.exp.value + exp.value) : simp(add(f.exp, exp));
  else fs.push({ base, exp });
}

function scaleExp(e, k) {
  return k === 1 ? e : isNum(e) ? num(e.value * k) : simp(mul(num(k), e));
}

function productInfo(n, k = 1, acc = { c: 1, fs: [] }) {
  if (n.type === "num") { acc.c *= Math.pow(n.value, k); return acc; }
  if (n.type === "neg") { acc.c *= Math.pow(-1, k); return productInfo(n.a, k, acc); }
  if (n.type === "op" && n.op === "*") { productInfo(n.a, k, acc); productInfo(n.b, k, acc); return acc; }
  if (n.type === "op" && n.op === "/") { productInfo(n.a, k, acc); productInfo(n.b, -k, acc); return acc; }
  if (n.type === "op" && n.op === "^") {
    if (isNum(n.b) && Number.isInteger(n.b.value) && Number.isInteger(k)) return productInfo(n.a, k * n.b.value, acc);
    if (isNum(n.b) && (n.a.type === "sym" || n.a.type === "const" || n.a.type === "fn")) { addFactor(acc.fs, n.a, num(n.b.value * k)); return acc; }
    if (n.a.type === "num" && n.a.value > 0 && !isNum(n.b)) { addFactor(acc.fs, n.a, scaleExp(n.b, k)); return acc; }
    addFactor(acc.fs, n.a, scaleExp(n.b, k));
    return acc;
  }
  if (n.type === "fn" && n.name === "sqrt") {
    if (n.a.type === "num" && n.a.value >= 0) { addFactor(acc.fs, n.a, num(0.5 * k)); return acc; }
    addFactor(acc.fs, n.a, num(0.5 * k));
    return acc;
  }
  addFactor(acc.fs, n, num(k));
  return acc;
}

function factorOrder(f) {
  const b = f.base;
  if (b.type === "num") return "0";
  if (b.type === "const") return (b.name === "e" && !isNum(f.exp) ? "5" : "1") + b.name;
  if (b.type === "sym") return "2" + b.name;
  if (b.type === "op") return "3" + toText(b);
  return "4" + toText(b);
}

function factorNode(base, e) {
  if (isNum(e, 1)) return base;
  if (isNum(e, 0.5)) return fn("sqrt", base);
  if (base.type === "const" && base.name === "e" && false) return fn("exp", e);
  return pow(base, e);
}

function chain(list) {
  return list.reduce((a, b) => (a ? mul(a, b) : b), null);
}

function buildProduct(c, fs) {
  if (!isFinite(c)) return num(c);
  if (c === 0) return ZERO;
  const live = fs.filter((f) => !isNum(f.exp, 0));
  for (const f of live) {
    if (f.base.type === "num" && isNum(f.exp)) {
      const v = Math.pow(f.base.value, f.exp.value);
      const r = Math.round(v);
      if (Math.abs(v - r) < 1e-12 * Math.max(1, Math.abs(v))) { c *= r; f.exp = num(0); }
    }
  }
  const items = live.filter((f) => !isNum(f.exp, 0)).sort((a, b) => (factorOrder(a) < factorOrder(b) ? -1 : 1));
  const numer = [], denom = [];
  for (const f of items) {
    if (isNum(f.exp) && f.exp.value < 0) denom.push(factorNode(f.base, num(-f.exp.value)));
    else if (f.exp.type === "neg") denom.push(factorNode(f.base, f.exp.a));
    else numer.push(factorNode(f.base, f.exp));
  }
  const sign = c < 0 ? -1 : 1;
  const a = Math.abs(c);
  const fr = toFraction(a, 1000, 1e-12);
  let p, q;
  if (fr) { p = fr[0]; q = fr[1]; } else { p = a; q = 1; }
  if (p !== 1 || numer.length === 0) numer.unshift(num(p));
  if (q !== 1) denom.unshift(num(q));
  let node = chain(numer);
  if (denom.length) node = div(node, chain(denom));
  return sign < 0 ? neg(node) : node;
}

function termInfo(n) {
  const info = productInfo(n);
  const consts = info.fs.filter((f) => f.base.type === "num");
  const rest = info.fs.filter((f) => f.base.type !== "num");
  const key = toText(buildProduct(1, rest.map((f) => ({ ...f })))) + "|" + toText(buildProduct(1, consts.map((f) => ({ ...f }))));
  return { c: info.c, fs: info.fs, key };
}

function collect(n, sign, out) {
  if (n.type === "op" && n.op === "+") { collect(n.a, sign, out); collect(n.b, sign, out); return; }
  if (n.type === "op" && n.op === "-") { collect(n.a, sign, out); collect(n.b, -sign, out); return; }
  if (n.type === "neg") { collect(n.a, -sign, out); return; }
  const s = simpNode(n);
  if (s.type === "op" && (s.op === "+" || s.op === "-") || s.type === "neg") { collect(s, sign, out); return; }
  const t = termInfo(s);
  t.c *= sign;
  out.push(t);
}

function termDegree(t) {
  if (!t.fs.length) return -1;
  let d = 0;
  for (const f of t.fs) {
    if (f.base.type === "sym" && isNum(f.exp)) d += f.exp.value;
    else if (f.base.type !== "num") d += 0;
  }
  return d;
}

function buildSum(terms) {
  const merged = [];
  for (const t of terms) {
    const m = merged.find((x) => x.key === t.key);
    if (m) m.c += t.c;
    else merged.push({ ...t, fs: t.fs.map((f) => ({ ...f })) });
  }
  const maxc = Math.max(1e-300, ...merged.map((t) => Math.abs(t.c)));
  const live = merged.filter((t) => Math.abs(t.c) > 1e-13 * maxc && t.c !== 0);
  if (!live.length) return ZERO;
  const idx = live.map((t, i) => ({ t, i, d: termDegree(t) }));
  idx.sort((a, b) => (b.d - a.d) || (a.i - b.i));
  let acc = null;
  for (const { t } of idx) {
    const node = buildProduct(Math.abs(t.c), t.fs.map((f) => ({ ...f })));
    if (!acc) acc = t.c < 0 ? neg(node) : node;
    else acc = t.c < 0 ? sub(acc, node) : add(acc, node);
  }
  return acc;
}

function simpNode(n) {
  switch (n.type) {
    case "num": return Object.is(n.value, -0) ? ZERO : n;
    case "sym": case "const": return n;
    case "neg": {
      const a = simpNode(n.a);
      if (a.type === "num") return num(-a.value);
      if (a.type === "neg") return a.a;
      return buildSum((() => { const o = []; collect(neg(a), 1, o); return o; })());
    }
    case "fn": {
      let a = simpNode(n.a);
      if (n.name === "exp") return simpNode(pow(cnst("e"), a));
      const out = fn(n.name, a);
      const ex = exactValue(out);
      if (ex !== null) return num(ex);
      if (n.name === "ln" && a.type === "const" && a.name === "e") return ONE;
      if (n.name === "ln" && a.type === "op" && a.op === "^" && a.a.type === "const" && a.a.name === "e") return a.b;
      if (n.name === "abs" && a.type === "num") return num(Math.abs(a.value));
      return out;
    }
    case "op": {
      if (n.op === "+" || n.op === "-") {
        const o = [];
        collect(n, 1, o);
        return buildSum(o);
      }
      if (n.op === "*" || n.op === "/") {
        const a = simpNode(n.a), b = simpNode(n.b);
        const info = productInfo(n.op === "*" ? mul(a, b) : div(a, b));
        return buildProduct(info.c, info.fs);
      }
      if (n.op === "^") {
        const a = simpNode(n.a);
        let b = simpNode(n.b);
        if (b.type !== "num" && pureNumeric(b)) { const bv = evaluate(b, {}); if (isFinite(bv)) b = num(bv); }
        if (isNum(b, 0)) return ONE;
        if (isNum(b, 1)) return a;
        if (isNum(a, 1)) return ONE;
        if (isNum(a, 0) && isNum(b) && b.value > 0) return ZERO;
        if (isNum(a) && isNum(b)) {
          const v = Math.pow(a.value, b.value);
          if (Number.isInteger(b.value) && Math.abs(v) < 1e15) {
            const info = productInfo(pow(a, b));
            return buildProduct(info.c, info.fs);
          }
          const r = Math.round(v);
          if (isFinite(v) && Math.abs(v - r) < 1e-12 * Math.max(1, Math.abs(v))) return num(r);
          return pow(a, b);
        }
        if (a.type === "op" && a.op === "^" && isNum(a.b) && isNum(b) && Number.isInteger(b.value)) return simpNode(pow(a.a, num(a.b.value * b.value)));
        if (a.type === "fn" && a.name === "sqrt" && isNum(b) && Number.isInteger(b.value)) return simpNode(pow(a.a, num(b.value / 2)));
        if (isNum(b) || a.type === "const" || a.type === "sym" || a.type === "fn" || (a.type === "num" && a.value > 0)) {
          const info = productInfo(pow(a, b));
          return buildProduct(info.c, info.fs);
        }
        return pow(a, b);
      }
    }
  }
  return n;
}

function simp(n) {
  return simpNode(n);
}

export function simplify(n) {
  let cur = n;
  for (let i = 0; i < 8; i++) {
    const nx = simpNode(cur);
    if (equal(nx, cur)) return nx;
    cur = nx;
  }
  return cur;
}

export function substitute(n, v, value) {
  if (n.type === "sym") return n.name === v ? value : n;
  if (n.type === "num" || n.type === "const") return n;
  if (n.type === "neg") return neg(substitute(n.a, v, value));
  if (n.type === "fn") return fn(n.name, substitute(n.a, v, value));
  return op(n.op, substitute(n.a, v, value), substitute(n.b, v, value));
}

export function replaceNode(n, target, w) {
  if (equal(n, target)) return w;
  if (n.type === "neg") return neg(replaceNode(n.a, target, w));
  if (n.type === "fn") return fn(n.name, replaceNode(n.a, target, w));
  if (n.type === "op") return op(n.op, replaceNode(n.a, target, w), replaceNode(n.b, target, w));
  return n;
}

const L = (s) => s;

function fnDerivative(name, u) {
  switch (name) {
    case "sin": return fn("cos", u);
    case "cos": return neg(fn("sin", u));
    case "tan": return pow(fn("sec", u), num(2));
    case "cot": return neg(pow(fn("csc", u), num(2)));
    case "sec": return mul(fn("sec", u), fn("tan", u));
    case "csc": return neg(mul(fn("csc", u), fn("cot", u)));
    case "asin": return div(ONE, fn("sqrt", sub(ONE, pow(u, num(2)))));
    case "acos": return neg(div(ONE, fn("sqrt", sub(ONE, pow(u, num(2))))));
    case "atan": return div(ONE, add(ONE, pow(u, num(2))));
    case "sinh": return fn("cosh", u);
    case "cosh": return fn("sinh", u);
    case "tanh": return div(ONE, pow(fn("cosh", u), num(2)));
    case "asinh": return div(ONE, fn("sqrt", add(pow(u, num(2)), ONE)));
    case "acosh": return div(ONE, fn("sqrt", sub(pow(u, num(2)), ONE)));
    case "atanh": return div(ONE, sub(ONE, pow(u, num(2))));
    case "ln": return div(ONE, u);
    case "log": case "log10": return div(ONE, mul(u, fn("ln", num(10))));
    case "log2": return div(ONE, mul(u, fn("ln", num(2))));
    case "sqrt": return div(ONE, mul(num(2), fn("sqrt", u)));
    case "cbrt": return div(ONE, mul(num(3), pow(fn("cbrt", u), num(2))));
    case "abs": return div(u, fn("abs", u));
    case "exp": return pow(cnst("e"), u);
  }
  throw new InputError("لا يمكن اشتقاق هذه الدالة رمزياً.");
}

const FN_RULE = {
  sin: "مشتقة $\\sin u$ هي $\\cos u \\cdot u'$",
  cos: "مشتقة $\\cos u$ هي $-\\sin u \\cdot u'$",
  tan: "مشتقة $\\tan u$ هي $\\sec^2 u \\cdot u'$",
  cot: "مشتقة $\\cot u$ هي $-\\csc^2 u \\cdot u'$",
  sec: "مشتقة $\\sec u$ هي $\\sec u \\tan u \\cdot u'$",
  csc: "مشتقة $\\csc u$ هي $-\\csc u \\cot u \\cdot u'$",
  asin: "مشتقة $\\arcsin u$ هي $\\frac{u'}{\\sqrt{1-u^2}}$",
  acos: "مشتقة $\\arccos u$ هي $-\\frac{u'}{\\sqrt{1-u^2}}$",
  atan: "مشتقة $\\arctan u$ هي $\\frac{u'}{1+u^2}$",
  sinh: "مشتقة $\\sinh u$ هي $\\cosh u \\cdot u'$",
  cosh: "مشتقة $\\cosh u$ هي $\\sinh u \\cdot u'$",
  tanh: "مشتقة $\\tanh u$ هي $\\frac{u'}{\\cosh^2 u}$",
  asinh: "مشتقة $\\operatorname{arsinh} u$ هي $\\frac{u'}{\\sqrt{u^2+1}}$",
  acosh: "مشتقة $\\operatorname{arcosh} u$ هي $\\frac{u'}{\\sqrt{u^2-1}}$",
  atanh: "مشتقة $\\operatorname{artanh} u$ هي $\\frac{u'}{1-u^2}$",
  ln: "مشتقة اللوغاريتم الطبيعي: $(\\ln u)' = \\frac{u'}{u}$",
  log: "مشتقة اللوغاريتم العشري: $(\\log_{10} u)' = \\frac{u'}{u \\ln 10}$",
  log10: "مشتقة اللوغاريتم العشري: $(\\log_{10} u)' = \\frac{u'}{u \\ln 10}$",
  log2: "مشتقة اللوغاريتم للأساس 2: $(\\log_{2} u)' = \\frac{u'}{u \\ln 2}$",
  sqrt: "مشتقة الجذر: $(\\sqrt{u})' = \\frac{u'}{2\\sqrt{u}}$",
  cbrt: "مشتقة الجذر التكعيبي: $(\\sqrt[3]{u})' = \\frac{u'}{3\\sqrt[3]{u^2}}$",
  abs: "مشتقة القيمة المطلقة: $|u|' = \\frac{u}{|u|} u'$ (غير معرّفة عند $u=0$)",
  exp: "مشتقة الدالة الأسية: $(e^u)' = e^u u'$"
};

export function derivative(expr, v = "x", opts = {}) {
  const ctx = { steps: [], v, max: opts.maxSteps || 60 };
  const res = simplify(D(simplify(expr), ctx));
  return { result: res, steps: ctx.steps.filter(Boolean) };
}

export function diff(expr, v = "x") {
  return simplify(D(simplify(expr), { steps: null, v }));
}

function D(n, ctx) {
  const v = ctx.v;
  if (!dependsOn(n, v)) return ZERO;
  if (n.type === "sym") return ONE;
  let idx = -1;
  if (ctx.steps && ctx.steps.length < ctx.max) { idx = ctx.steps.length; ctx.steps.push(null); }
  let res, rule;
  const isV = (u) => u.type === "sym" && u.name === v;
  switch (n.type) {
    case "neg":
      res = neg(D(n.a, ctx));
      rule = "نخرج الإشارة السالبة ثم نشتق ما بداخلها";
      break;
    case "fn": {
      const outer = fnDerivative(n.name, n.a);
      if (isV(n.a)) { res = outer; rule = FN_RULE[n.name]; }
      else { res = mul(outer, D(n.a, ctx)); rule = `${FN_RULE[n.name]}، مع قاعدة السلسلة حيث $u = ${toTex(n.a)}$`; }
      break;
    }
    case "op": {
      const a = n.a, b = n.b;
      const da = () => D(a, ctx), db = () => D(b, ctx);
      if (n.op === "+") { res = add(da(), db()); rule = "قاعدة الجمع: مشتقة المجموع تساوي مجموع المشتقات"; }
      else if (n.op === "-") { res = sub(da(), db()); rule = "قاعدة الطرح: مشتقة الفرق تساوي فرق المشتقات"; }
      else if (n.op === "*") {
        if (!dependsOn(a, v)) { res = mul(a, db()); rule = `قاعدة الضرب في ثابت: نُخرج الثابت $${toTex(a)}$`; }
        else if (!dependsOn(b, v)) { res = mul(b, da()); rule = `قاعدة الضرب في ثابت: نُخرج الثابت $${toTex(b)}$`; }
        else { const A = da(), B = db(); res = add(mul(A, b), mul(a, B)); rule = `قاعدة الضرب: $(uv)' = u'v + uv'$ حيث $u = ${toTex(a)}$ و $v = ${toTex(b)}$`; }
      } else if (n.op === "/") {
        if (!dependsOn(b, v)) { res = div(da(), b); rule = `القسمة على ثابت: نشتق البسط ونُبقي المقام $${toTex(b)}$`; }
        else { const A = da(), B = db(); res = div(sub(mul(A, b), mul(a, B)), pow(b, num(2))); rule = `قاعدة القسمة: $\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}$ حيث $u = ${toTex(a)}$ و $v = ${toTex(b)}$`; }
      } else if (n.op === "^") {
        if (!dependsOn(b, v)) {
          const pr = mul(mul(b, pow(a, simplify(sub(b, ONE)))), ONE);
          if (isV(a)) { res = pr; rule = "قاعدة القوة: $\\frac{d}{dx}x^n = n x^{n-1}$"; }
          else { res = mul(pr, da()); rule = `قاعدة القوة مع قاعدة السلسلة: $(u^n)' = n u^{n-1} u'$ حيث $u = ${toTex(a)}$`; }
        } else if (!dependsOn(a, v)) {
          if (a.type === "const" && a.name === "e") {
            res = isV(b) ? n : mul(n, db());
            rule = isV(b) ? "مشتقة $e^x$ هي $e^x$ نفسها" : `الدالة الأسية مع قاعدة السلسلة: $(e^u)' = e^u u'$ حيث $u = ${toTex(b)}$`;
          } else {
            res = mul(mul(n, fn("ln", a)), db());
            rule = `مشتقة الأسية بأساس ثابت: $(a^u)' = a^u \\ln a \\cdot u'$`;
          }
        } else {
          res = mul(n, add(mul(db(), fn("ln", a)), div(mul(b, da()), a)));
          rule = "الاشتقاق اللوغاريتمي: $(u^w)' = u^w\\left(w' \\ln u + \\frac{w u'}{u}\\right)$";
        }
      }
      break;
    }
  }
  res = simplify(res);
  if (idx >= 0) ctx.steps[idx] = { rule, tex: `\\frac{d}{d${v}}\\left[${toTex(n)}\\right] = ${toTex(res)}` };
  return res;
}

function linear(u, v) {
  if (!dependsOn(u, v)) return null;
  try {
    const r = toRational(u, v);
    if (degree(r.den) === 0 && degree(r.num) === 1) return { a: r.num[1] / r.den[0], b: r.num[0] / r.den[0] };
  } catch (e) {
    if (!(e instanceof Unsupported) && !(e instanceof InputError)) throw e;
  }
  return null;
}

function polyOf(n, v) {
  try {
    const r = toRational(n, v);
    if (degree(r.den) === 0) return trim(r.num.map((c) => c / r.den[0]));
  } catch (e) {
    if (!(e instanceof Unsupported) && !(e instanceof InputError)) throw e;
  }
  return null;
}

export function fromPoly(p, v) {
  let acc = null;
  for (let k = p.length - 1; k >= 0; k--) {
    const c = p[k];
    if (Math.abs(c) < 1e-14) continue;
    const t = k === 0 ? num(c) : k === 1 ? mul(num(c), sym(v)) : mul(num(c), pow(sym(v), num(k)));
    acc = acc ? add(acc, t) : t;
  }
  return simplify(acc || ZERO);
}

const sq = (x) => pow(x, num(2));
const lnabs = (u) => fn("ln", fn("abs", u));

function scaleBy(node, a) {
  return a === 1 ? node : div(node, num(a));
}

function integrateSingle(base, e, v) {
  const lin = linear(base, v);
  if (lin && isNum(e) && !dependsOn(e, v)) {
    const k = e.value;
    if (k === -1) return { F: scaleBy(lnabs(base), lin.a), rule: "تكامل $\\frac{1}{u}$ هو $\\ln|u|$" + (lin.a !== 1 ? ` مقسوماً على معامل ${v}` : "") };
    return { F: scaleBy(div(pow(base, num(k + 1)), num(k + 1)), lin.a), rule: "قاعدة القوة للتكامل: $\\int u^n\\,du = \\frac{u^{n+1}}{n+1}$" + (lin.a !== 1 ? ` مع القسمة على معامل ${v} الخطي` : "") };
  }
  if (!dependsOn(base, v)) {
    const le = linear(e, v);
    if (!le) return null;
    if (base.type === "const" && base.name === "e") return { F: scaleBy(pow(base, e), le.a), rule: "تكامل الدالة الأسية: $\\int e^{u}\\,du = e^{u}$" };
    return { F: div(pow(base, e), mul(num(le.a), fn("ln", base))), rule: "تكامل الأسية بأساس ثابت: $\\int a^{u}\\,du = \\frac{a^u}{\\ln a}$" };
  }
  if (base.type === "fn" && isNum(e)) {
    const u = base.a;
    const lu = linear(u, v);
    if (!lu) return null;
    const a = lu.a;
    const k = e.value;
    const R = (F, rule) => ({ F: scaleBy(F, a), rule: rule + (a !== 1 ? ` (مع القسمة على ${toTex(num(a))} بسبب المعامل الخطي)` : "") });
    if (k === 1) {
      switch (base.name) {
        case "sin": return R(neg(fn("cos", u)), "$\\int \\sin u\\,du = -\\cos u$");
        case "cos": return R(fn("sin", u), "$\\int \\cos u\\,du = \\sin u$");
        case "tan": return R(neg(lnabs(fn("cos", u))), "$\\int \\tan u\\,du = -\\ln|\\cos u|$");
        case "cot": return R(lnabs(fn("sin", u)), "$\\int \\cot u\\,du = \\ln|\\sin u|$");
        case "sec": return R(lnabs(add(fn("sec", u), fn("tan", u))), "$\\int \\sec u\\,du = \\ln|\\sec u + \\tan u|$");
        case "csc": return R(neg(lnabs(add(fn("csc", u), fn("cot", u)))), "$\\int \\csc u\\,du = -\\ln|\\csc u + \\cot u|$");
        case "sinh": return R(fn("cosh", u), "$\\int \\sinh u\\,du = \\cosh u$");
        case "cosh": return R(fn("sinh", u), "$\\int \\cosh u\\,du = \\sinh u$");
        case "tanh": return R(fn("ln", fn("cosh", u)), "$\\int \\tanh u\\,du = \\ln(\\cosh u)$");
        case "ln": return R(sub(mul(u, fn("ln", u)), u), "بالتجزئة: $\\int \\ln u\\,du = u\\ln u - u$");
        case "log": case "log10": return R(div(sub(mul(u, fn("ln", u)), u), fn("ln", num(10))), "$\\int \\log_{10} u\\,du = \\frac{u\\ln u - u}{\\ln 10}$");
        case "log2": return R(div(sub(mul(u, fn("ln", u)), u), fn("ln", num(2))), "$\\int \\log_{2} u\\,du = \\frac{u\\ln u - u}{\\ln 2}$");
        case "atan": return R(sub(mul(u, fn("atan", u)), div(fn("ln", add(ONE, sq(u))), num(2))), "بالتجزئة: $\\int \\arctan u\\,du = u\\arctan u - \\frac{1}{2}\\ln(1+u^2)$");
        case "asin": return R(add(mul(u, fn("asin", u)), fn("sqrt", sub(ONE, sq(u)))), "بالتجزئة: $\\int \\arcsin u\\,du = u\\arcsin u + \\sqrt{1-u^2}$");
        case "acos": return R(sub(mul(u, fn("acos", u)), fn("sqrt", sub(ONE, sq(u)))), "بالتجزئة: $\\int \\arccos u\\,du = u\\arccos u - \\sqrt{1-u^2}$");
        case "exp": return R(pow(cnst("e"), u), "$\\int e^u\\,du = e^u$");
      }
    }
    if (k === 2) {
      switch (base.name) {
        case "sec": return R(fn("tan", u), "$\\int \\sec^2 u\\,du = \\tan u$");
        case "csc": return R(neg(fn("cot", u)), "$\\int \\csc^2 u\\,du = -\\cot u$");
        case "sin": return R(sub(div(u, num(2)), div(fn("sin", mul(num(2), u)), num(4))), "متطابقة نصف الزاوية: $\\sin^2 u = \\frac{1-\\cos 2u}{2}$");
        case "cos": return R(add(div(u, num(2)), div(fn("sin", mul(num(2), u)), num(4))), "متطابقة نصف الزاوية: $\\cos^2 u = \\frac{1+\\cos 2u}{2}$");
        case "tan": return R(sub(fn("tan", u), u), "$\\tan^2 u = \\sec^2 u - 1$");
      }
    }
    if (k === -2) {
      switch (base.name) {
        case "cos": return R(fn("tan", u), "$\\int \\frac{du}{\\cos^2 u} = \\tan u$");
        case "sin": return R(neg(fn("cot", u)), "$\\int \\frac{du}{\\sin^2 u} = -\\cot u$");
        case "cosh": return R(fn("tanh", u), "$\\int \\frac{du}{\\cosh^2 u} = \\tanh u$");
      }
    }
    if (k === 0.5 || k === -0.5) return null;
  }
  return null;
}

function integrateRational(n, v, ctx) {
  let r;
  try { r = toRational(n, v); } catch (e) { if (e instanceof Unsupported || e instanceof InputError) return null; throw e; }
  const x = sym(v);
  if (degree(r.den) === 0) {
    const p = r.num.map((c) => c / r.den[0]);
    const q = [0, ...p.map((c, k) => c / (k + 1))];
    return { F: fromPoly(q, v), rule: "كثير حدود: نكامل كل حد بقاعدة القوة $\\int x^n\\,dx = \\frac{x^{n+1}}{n+1}$" };
  }
  if (degree(r.den) > 8) return null;
  const dec = decompose(r.num, r.den);
  const parts = [];
  if (degree(dec.poly) >= 0 && !(dec.poly.length === 1 && dec.poly[0] === 0)) {
    const q = [0, ...dec.poly.map((c, k) => c / (k + 1))];
    parts.push(fromPoly(q, v));
  }
  for (const t of realForm(dec)) {
    if (t.kind === "real") {
      const lin = simplify(sub(x, num(t.r)));
      if (t.power === 1) parts.push(mul(num(t.A), lnabs(lin)));
      else parts.push(div(num(-t.A / (t.power - 1)), pow(lin, num(t.power - 1))));
    } else if (t.kind === "quad") {
      const w = Math.sqrt(t.q - (t.p * t.p) / 4);
      const quad = simplify(add(add(sq(x), mul(num(t.p), x)), num(t.q)));
      const k2 = t.Cc - (t.B * t.p) / 2;
      if (Math.abs(t.B) > 1e-14) parts.push(mul(num(t.B / 2), fn("ln", quad)));
      if (Math.abs(k2) > 1e-14) parts.push(mul(num(k2 / w), fn("atan", div(add(x, num(t.p / 2)), num(w)))));
    } else return null;
  }
  const F = parts.reduce((a, b) => (a ? add(a, b) : b), null) || ZERO;
  return { F, rule: "دالة كسرية: نقسم ثم نفكك إلى كسور جزئية ونكامل كل كسر (لوغاريتم أو ظل عكسي)" };
}

const TABULAR = ["sin", "cos", "sinh", "cosh", "exp"];

function isTabularG(f, v) {
  const b = f.base, e = f.exp;
  if (isNum(e, 1) && b.type === "fn" && TABULAR.includes(b.name) && linear(b.a, v)) return true;
  if (!dependsOn(b, v) && linear(e, v)) return true;
  return false;
}

function isLogLike(f, v) {
  return isNum(f.exp, 1) && f.base.type === "fn" && ["ln", "log", "log10", "log2", "atan", "asin", "acos"].includes(f.base.name);
}

function I(n, ctx) {
  const v = ctx.v;
  n = simplify(n);
  ctx.depth = (ctx.depth || 0) + 1;
  try {
    if (ctx.depth > 14) return null;
    let idx = -1;
    if (ctx.steps && ctx.steps.length < 60) { idx = ctx.steps.length; ctx.steps.push(null); }
    const done = (F, rule) => {
      if (!F) { if (idx >= 0) ctx.steps[idx] = null; return null; }
      const s = simplify(F);
      if (idx >= 0) ctx.steps[idx] = { rule, tex: `\\int ${toTex(n)}\\,d${v} = ${toTex(s)}` };
      return s;
    };
    if (!dependsOn(n, v)) return done(mul(n, sym(v)), "تكامل الثابت: $\\int k\\,dx = kx$");
    if (n.type === "neg") { const F = I(n.a, ctx); return done(F && neg(F), "نخرج الإشارة السالبة خارج التكامل"); }
    if (n.type === "op" && (n.op === "+" || n.op === "-")) {
      const A = I(n.a, ctx); if (!A) return done(null);
      const B = I(n.b, ctx); if (!B) return done(null);
      return done(n.op === "+" ? add(A, B) : sub(A, B), "خطية التكامل: تكامل المجموع يساوي مجموع التكاملات");
    }
    const info = productInfo(n);
    const constF = info.fs.filter((f) => !dependsOn(f.base, v) && !dependsOn(f.exp, v));
    const depF = info.fs.filter((f) => dependsOn(f.base, v) || dependsOn(f.exp, v));
    if (info.c !== 1 || constF.length) {
      const k = buildProduct(info.c, constF.map((f) => ({ ...f })));
      const rest = buildProduct(1, depF.map((f) => ({ ...f })));
      if (!equal(simplify(k), ONE)) {
        const F = I(rest, ctx);
        return done(F && mul(k, F), `نُخرج الثابت $${toTex(k)}$ خارج التكامل`);
      }
    }
    if (depF.length === 1) {
      const r = integrateSingle(depF[0].base, depF[0].exp, v);
      if (r) return done(r.F, r.rule);
    }
    const rat = integrateRational(n, v, ctx);
    if (rat) return done(rat.F, rat.rule);
    if (depF.length >= 2) {
      const gs = depF.filter((f) => isTabularG(f, v));
      const ps = depF.filter((f) => !isTabularG(f, v));
      if (gs.length === 1 && ps.length >= 1) {
        const P = polyOf(buildProduct(1, ps.map((f) => ({ ...f }))), v);
        if (P && degree(P) <= 8) {
          const g = buildProduct(1, gs.map((f) => ({ ...f })));
          const sub2 = { v, steps: null, depth: ctx.depth };
          let G = I(g, sub2);
          let Pk = P, sign = 1, acc = null;
          for (let k = 0; k <= degree(P) && G; k++) {
            const term = mul(fromPoly(Pk, v), G);
            acc = acc ? (sign > 0 ? add(acc, term) : sub(acc, term)) : term;
            Pk = trim(Pk.slice(1).map((c, i) => c * (i + 1)));
            sign = -sign;
            if (Pk.length === 1 && Pk[0] === 0) break;
            G = I(G, sub2);
          }
          if (acc && G) return done(acc, "التكامل بالتجزئة المتكرر (الطريقة الجدولية): $\\int P\\,g = P G_1 - P' G_2 + P'' G_3 - \\cdots$");
        }
      }
      if (gs.length === 2 && ps.length === 0) {
        const ex = gs.find((f) => !dependsOn(f.base, v));
        const tr = gs.find((f) => f.base.type === "fn" && (f.base.name === "sin" || f.base.name === "cos"));
        if (ex && tr && ex.base.type === "const" && ex.base.name === "e") {
          const A = linear(ex.exp, v).a, B = linear(tr.base.a, v).a;
          const E = pow(cnst("e"), ex.exp), u = tr.base.a;
          const den = num(A * A + B * B);
          const F = tr.base.name === "sin"
            ? div(mul(E, sub(mul(num(A), fn("sin", u)), mul(num(B), fn("cos", u)))), den)
            : div(mul(E, add(mul(num(A), fn("cos", u)), mul(num(B), fn("sin", u)))), den);
          return done(F, "بالتجزئة مرتين: $\\int e^{ax}\\sin bx\\,dx = \\frac{e^{ax}(a\\sin bx - b\\cos bx)}{a^2+b^2}$");
        }
      }
      const logs = depF.filter((f) => isLogLike(f, v));
      const others = depF.filter((f) => !isLogLike(f, v));
      if (logs.length === 1) {
        const P = others.length ? polyOf(buildProduct(1, others.map((f) => ({ ...f }))), v) : [1];
        if (P) {
          const Q = fromPoly([0, ...P.map((c, k) => c / (k + 1))], v);
          const Lf = logs[0].base;
          const sub2 = { v, steps: null, depth: ctx.depth };
          const rest = I(mul(Q, diff(Lf, v)), sub2);
          if (rest) return done(sub(mul(Q, Lf), rest), `التكامل بالتجزئة: $\\int u\\,dv = uv - \\int v\\,du$ مع $u = ${toTex(Lf)}$`);
        }
      }
    }
    const us = usub(n, ctx);
    if (us) return done(us.F, us.rule);
    return done(null);
  } finally {
    ctx.depth--;
  }
}

function candidates(n, v, out = []) {
  if (n.type === "fn" || n.type === "op") {
    if (dependsOn(n, v)) out.push(n);
    if (n.a) candidates(n.a, v, out);
    if (n.b) candidates(n.b, v, out);
  } else if (n.type === "neg") candidates(n.a, v, out);
  return out;
}

function usub(n, ctx) {
  const v = ctx.v;
  if (ctx.depth > 6) return null;
  const w = v === "u" ? "w" : "u";
  const seen = [];
  const cands = candidates(n, v).filter((c) => !equal(c, n)).sort((a, b) => toText(b).length - toText(a).length);
  for (const c of cands.slice(0, 24)) {
    const u = simplify(c);
    if (u.type === "sym" || linear(u, v)) continue;
    if (seen.some((s) => equal(s, u))) continue;
    seen.push(u);
    const du = diff(u, v);
    if (isNum(du, 0)) continue;
    const G = simplify(div(n, du));
    const Gw = simplify(replaceNode(G, u, sym(w)));
    if (dependsOn(Gw, v)) continue;
    const sub2 = { v: w, steps: null, depth: ctx.depth + 1 };
    const H = I(Gw, sub2);
    if (!H) continue;
    const F = simplify(substitute(H, w, u));
    return { F, rule: `التعويض: نضع $${w} = ${toTex(u)}$ فيكون $d${w} = ${toTex(du)}\\,d${v}$ ويصبح التكامل $\\int ${toTex(Gw)}\\,d${w} = ${toTex(H)}$` };
  }
  return null;
}

function numDeriv(F, x, v) {
  const h = 1e-4 * Math.max(1, Math.abs(x));
  const f = (t) => evaluate(F, { [v]: t });
  return (-f(x + 2 * h) + 8 * f(x + h) - 8 * f(x - h) + f(x - 2 * h)) / (12 * h);
}

export function verifyAntiderivative(F, f, v) {
  const pts = [-2.7, -1.3, -0.62, 0.37, 0.81, 1.73, 2.9, 4.1, 0.13, -0.29];
  let ok = 0;
  for (const x of pts) {
    let fx, dF;
    try { fx = evaluate(f, { [v]: x }); dF = numDeriv(F, x, v); } catch { continue; }
    if (!isFinite(fx) || !isFinite(dF) || Math.abs(fx) > 1e6) continue;
    if (Math.abs(dF - fx) > 1e-5 * (1 + Math.abs(fx))) return false;
    ok++;
  }
  return ok >= 3;
}

export function integrate(expr, v = "x") {
  const ctx = { steps: [], v, depth: 0 };
  const f = simplify(expr);
  const F = I(f, ctx);
  if (!F) return null;
  if (!verifyAntiderivative(F, f, v)) return null;
  return { result: F, steps: ctx.steps.filter(Boolean) };
}

export { toTex, toText };
