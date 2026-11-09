import { normalizeDigits, fmt, toFraction } from "./format.js";
import { InputError } from "./validate.js";

export const FUNCTIONS = [
  "arcsinh", "arccosh", "arctanh", "arcsin", "arccos", "arctan",
  "asinh", "acosh", "atanh", "asin", "acos", "atan",
  "sinh", "cosh", "tanh", "sin", "cos", "tan", "cot", "sec", "csc",
  "exp", "ln", "log10", "log2", "log", "sqrt", "cbrt", "abs"
];

const ALIAS = { arcsin: "asin", arccos: "acos", arctan: "atan", arcsinh: "asinh", arccosh: "acosh", arctanh: "atanh" };
const CONSTANTS = ["pi", "π", "e"];

export const num = (value) => ({ type: "num", value });
export const sym = (name) => ({ type: "sym", name });
export const cnst = (name) => ({ type: "const", name });
export const op = (o, a, b) => ({ type: "op", op: o, a, b });
export const neg = (a) => ({ type: "neg", a });
export const fn = (name, a) => ({ type: "fn", name, a });
export const add = (a, b) => op("+", a, b);
export const sub = (a, b) => op("-", a, b);
export const mul = (a, b) => op("*", a, b);
export const div = (a, b) => op("/", a, b);
export const pow = (a, b) => op("^", a, b);

function perr(msg) {
  throw new InputError(msg);
}

function tokenize(src) {
  const s = normalizeDigits(src)
    .replace(/\*\*/g, "^")
    .replace(/[×·⋅]/g, "*")
    .replace(/÷/g, "/")
    .replace(/√/g, "sqrt")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/∞/g, "inf");
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+(?![a-zA-Z]))?/);
      if (!m || m[0] === ".") perr(`رقم غير صحيح عند الموضع ${i + 1}.`);
      out.push({ t: "num", v: parseFloat(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[a-zA-Zπα-ωΑ-Ω]/.test(c)) {
      const rest = s.slice(i);
      if (/^inf(inity)?/i.test(rest)) {
        const m = rest.match(/^inf(inity)?/i);
        out.push({ t: "num", v: Infinity });
        i += m[0].length;
        continue;
      }
      const f = FUNCTIONS.find((n) => rest.startsWith(n));
      if (f) { out.push({ t: "fn", v: ALIAS[f] || f }); i += f.length; continue; }
      if (rest.startsWith("pi")) { out.push({ t: "const", v: "pi" }); i += 2; continue; }
      if (c === "π") { out.push({ t: "const", v: "pi" }); i++; continue; }
      if (c === "e") { out.push({ t: "const", v: "e" }); i++; continue; }
      out.push({ t: "sym", v: c });
      i++;
      continue;
    }
    if ("+-*/^()|,!".includes(c)) { out.push({ t: c }); i++; continue; }
    if (c === "[" || c === "{") { out.push({ t: "(" }); i++; continue; }
    if (c === "]" || c === "}") { out.push({ t: ")" }); i++; continue; }
    perr(`رمز غير مفهوم «${c}» في التعبير.`);
  }
  return out;
}

export function parse(src, allowed = null) {
  if (src === undefined || src === null || String(src).trim() === "") perr("أدخل تعبيراً رياضياً.");
  const toks = tokenize(String(src));
  let p = 0;
  let absDepth = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const expect = (t) => {
    const k = next();
    if (!k || k.t !== t) perr(t === ")" ? "يوجد قوس مفتوح لم يُغلق." : `كان متوقعاً «${t}».`);
  };
  const startsPrimary = (k) => k && (k.t === "num" || k.t === "sym" || k.t === "const" || k.t === "fn" || k.t === "(" || (k.t === "|" && absDepth === 0));

  function expr() {
    let left = term();
    while (peek() && (peek().t === "+" || peek().t === "-")) {
      const o = next().t;
      left = op(o, left, term());
    }
    return left;
  }

  function term() {
    let left = unary();
    for (;;) {
      const k = peek();
      if (k && (k.t === "*" || k.t === "/")) { next(); left = op(k.t, left, unary()); continue; }
      if (startsPrimary(k)) { left = op("*", left, power()); continue; }
      return left;
    }
  }

  function unary() {
    const k = peek();
    if (k && k.t === "-") { next(); return neg(unary()); }
    if (k && k.t === "+") { next(); return unary(); }
    return power();
  }

  function power() {
    const base = postfix();
    if (peek() && peek().t === "^") {
      next();
      return op("^", base, unary());
    }
    return base;
  }

  function postfix() {
    let n = primary();
    while (peek() && peek().t === "!") { next(); n = fn("fact", n); }
    return n;
  }

  function fnArg() {
    if (peek() && peek().t === "(") {
      next();
      const a = expr();
      expect(")");
      return a;
    }
    if (!startsPrimary(peek())) perr("الدالة تحتاج مُدخلاً بين قوسين.");
    let a = power();
    while (startsPrimary(peek()) && peek().t !== "fn") a = op("*", a, power());
    return a;
  }

  function primary() {
    const k = next();
    if (!k) perr("التعبير غير مكتمل.");
    if (k.t === "num") return num(k.v);
    if (k.t === "const") return cnst(k.v);
    if (k.t === "sym") {
      if (allowed && !allowed.includes(k.v)) perr(`المتغير «${k.v}» غير مسموح هنا. المتغيرات المسموحة: ${allowed.join("، ")}.`);
      return sym(k.v);
    }
    if (k.t === "fn") {
      if (peek() && peek().t === "^") {
        next();
        const e = unary();
        return op("^", fn(k.v, fnArg()), e);
      }
      return fn(k.v, fnArg());
    }
    if (k.t === "(") {
      const a = expr();
      expect(")");
      return a;
    }
    if (k.t === "|") {
      absDepth++;
      const a = expr();
      absDepth--;
      expect("|");
      return fn("abs", a);
    }
    if (k.t === ")") perr("يوجد قوس مغلق زائد أو في غير مكانه.");
    perr(`الرمز «${k.t}» في غير مكانه.`);
  }

  const tree = expr();
  if (p < toks.length) perr(toks[p].t === ")" ? "يوجد قوس مغلق زائد." : "تعذر فهم التعبير كاملاً، تحقق من الصياغة.");
  return tree;
}

function fact(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

const FN_EVAL = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  cot: (x) => 1 / Math.tan(x), sec: (x) => 1 / Math.cos(x), csc: (x) => 1 / Math.sin(x),
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
  exp: Math.exp, ln: Math.log, log: Math.log10, log10: Math.log10, log2: Math.log2,
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, fact
};

export function evaluate(n, scope = {}) {
  switch (n.type) {
    case "num": return n.value;
    case "const": return n.name === "pi" ? Math.PI : Math.E;
    case "sym": {
      if (!(n.name in scope)) throw new InputError(`لا توجد قيمة للمتغير «${n.name}».`);
      return scope[n.name];
    }
    case "neg": return -evaluate(n.a, scope);
    case "fn": return FN_EVAL[n.name](evaluate(n.a, scope));
    case "op": {
      const a = evaluate(n.a, scope), b = evaluate(n.b, scope);
      switch (n.op) {
        case "+": return a + b;
        case "-": return a - b;
        case "*": return a * b;
        case "/": return a / b;
        case "^": {
          if (a < 0 && !Number.isInteger(b)) {
            const f = toOddFraction(b);
            if (f) return -Math.pow(-a, b);
          }
          return Math.pow(a, b);
        }
      }
    }
  }
  throw new Error("unknown node");
}

function toOddFraction(b) {
  for (const d of [3, 5, 7, 9]) {
    const k = b * d;
    if (Math.abs(k - Math.round(k)) < 1e-12 && Math.round(k) % 2 !== 0) return true;
  }
  return false;
}

export function compile(n, v = "x") {
  return (x) => evaluate(n, { [v]: x });
}

export function variables(n, out = new Set()) {
  if (n.type === "sym") out.add(n.name);
  if (n.a) variables(n.a, out);
  if (n.b) variables(n.b, out);
  return out;
}

export function dependsOn(n, v) {
  if (n.type === "sym") return n.name === v;
  if (n.type === "num" || n.type === "const") return false;
  return (n.a ? dependsOn(n.a, v) : false) || (n.b ? dependsOn(n.b, v) : false);
}

export function equal(a, b) {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case "num": return a.value === b.value;
    case "sym": case "const": return a.name === b.name;
    case "neg": return equal(a.a, b.a);
    case "fn": return a.name === b.name && equal(a.a, b.a);
    case "op": return a.op === b.op && equal(a.a, b.a) && equal(a.b, b.b);
  }
  return false;
}

const PREC = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 4 };

function prec(n) {
  if (n.type === "op") return PREC[n.op];
  if (n.type === "neg") return 2;
  if (n.type === "num" && n.value < 0) return 2;
  return 5;
}

function numTex(v) {
  if (v === Infinity) return "\\infty";
  if (v === -Infinity) return "-\\infty";
  const s = fmt(v, 8);
  const m = s.match(/^(-?[\d.]+)e(-?\d+)$/);
  return m ? `${m[1]} \\times 10^{${m[2]}}` : s;
}

const FN_TEX = {
  sin: "\\sin", cos: "\\cos", tan: "\\tan", cot: "\\cot", sec: "\\sec", csc: "\\csc",
  asin: "\\arcsin", acos: "\\arccos", atan: "\\arctan",
  sinh: "\\sinh", cosh: "\\cosh", tanh: "\\tanh",
  asinh: "\\operatorname{arsinh}", acosh: "\\operatorname{arcosh}", atanh: "\\operatorname{artanh}",
  ln: "\\ln", log: "\\log_{10}", log10: "\\log_{10}", log2: "\\log_{2}"
};

function startsWithNumber(n) {
  if (n.type === "num") return true;
  if (n.type === "op" && (n.op === "*" || n.op === "^" || n.op === "/")) return startsWithNumber(n.a);
  return false;
}

function fracOf(b) {
  if (b.type !== "num" || Number.isInteger(b.value)) return null;
  return toFraction(b.value, 100, 1e-12);
}

function expTex(b) {
  const f = fracOf(b);
  return f ? `${f[0] < 0 ? "-" : ""}\\frac{${Math.abs(f[0])}}{${f[1]}}` : toTex(b);
}

function expText(b) {
  const f = fracOf(b);
  return f ? `(${f[0]}/${f[1]})` : null;
}

export function toTex(n) {
  const wrap = (c, min) => (prec(c) < min ? `\\left(${toTex(c)}\\right)` : toTex(c));
  switch (n.type) {
    case "num": return numTex(n.value);
    case "sym": return n.name;
    case "const": return n.name === "pi" ? "\\pi" : "e";
    case "neg": return `-${wrap(n.a, 2)}`;
    case "fn": {
      const inner = toTex(n.a);
      if (n.name === "sqrt") return `\\sqrt{${inner}}`;
      if (n.name === "cbrt") return `\\sqrt[3]{${inner}}`;
      if (n.name === "abs") return `\\left|${inner}\\right|`;
      if (n.name === "exp") return `e^{${inner}}`;
      if (n.name === "fact") return `${wrap(n.a, 5)}!`;
      return `${FN_TEX[n.name]}\\left(${inner}\\right)`;
    }
    case "op": {
      if (n.op === "+") {
        if (n.b.type === "neg") return `${toTex(n.a)} - ${wrap(n.b.a, 2)}`;
        if (n.b.type === "num" && n.b.value < 0) return `${toTex(n.a)} - ${numTex(-n.b.value)}`;
        return `${toTex(n.a)} + ${toTex(n.b)}`;
      }
      if (n.op === "-") return `${toTex(n.a)} - ${wrap(n.b, 2)}`;
      if (n.op === "/") return `\\frac{${toTex(n.a)}}{${toTex(n.b)}}`;
      if (n.op === "^") {
        const base = n.a.type === "fn" && n.a.name !== "sqrt" && n.a.name !== "abs" && n.a.name !== "exp" && n.a.name !== "fact"
          ? `\\left(${toTex(n.a)}\\right)`
          : wrap(n.a, 5);
        return `${base}^{${expTex(n.b)}}`;
      }
      if (n.op === "*") {
        const l = wrap(n.a, 2);
        const r = n.b.type === "op" && n.b.op === "/" ? toTex(n.b) : wrap(n.b, 3);
        const implicit = !startsWithNumber(n.b) && prec(n.b) >= 3 && (n.a.type === "num" || n.a.type === "sym" || n.a.type === "const" || (n.a.type === "op" && (n.a.op === "^" || n.a.op === "*")));
        return implicit ? `${l} ${r}` : `${l} \\cdot ${r}`;
      }
    }
  }
  return "?";
}

export function toText(n) {
  const wrap = (c, min) => (prec(c) < min ? `(${toText(c)})` : toText(c));
  switch (n.type) {
    case "num": return n.value === Infinity ? "inf" : n.value === -Infinity ? "-inf" : fmt(n.value, 10);
    case "sym": return n.name;
    case "const": return n.name;
    case "neg": return `-${wrap(n.a, 2)}`;
    case "fn": return n.name === "fact" ? `${wrap(n.a, 5)}!` : `${n.name}(${toText(n.a)})`;
    case "op": {
      if (n.op === "+") return n.b.type === "neg" ? `${toText(n.a)} - ${wrap(n.b.a, 2)}` : `${toText(n.a)} + ${toText(n.b)}`;
      if (n.op === "-") return `${toText(n.a)} - ${wrap(n.b, 2)}`;
      if (n.op === "*") return `${wrap(n.a, 2)}*${wrap(n.b, 3)}`;
      if (n.op === "/") return `${wrap(n.a, 2)}/${wrap(n.b, 3)}`;
      if (n.op === "^") return `${wrap(n.a, 5)}^${expText(n.b) || wrap(n.b, 5)}`;
    }
  }
  return "?";
}
