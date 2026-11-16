import { str, choice, fail } from "../core/validate.js";
import { parse, evaluate, num as N, sym, cnst, op, neg, fn, add, mul, pow, toTex, toText, dependsOn } from "../core/parser.js";
import { simplify } from "../core/symbolic.js";
import { toRational, Unsupported, padd, pmul, pscale, pderiv, pdivmod, trim, degree, toTex as ptex, normalizeRational, factorTex } from "../core/polynomial.js";
import { decompose } from "../core/partial.js";
import { cabs, carg, ctex } from "../core/complex.js";
import { niceTex, nice, fmt, tex as ntex } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Laplace transform and its inverse using tables and steps: linearity, shift in frequency and multiplication by tⁿ; the inverse by partial fractions with real, repeated and complex roots, and a clear message when a form is not supported.",
  keywords: ["Laplace", "Laplace transform", "Inverse Laplace", "laplace", "inverse laplace", "partial fractions", "Laplace table"],
  formulas: [
    { label: "Definition and key table pairs", tex: "F(s) = \\int_0^\\infty f(t)e^{-st}dt,\\quad \\mathcal{L}\\{t^n\\} = \\frac{n!}{s^{n+1}},\\quad \\mathcal{L}\\{e^{at}\\} = \\frac{1}{s-a}" },
    { label: "Trigonometric functions and shift and multiplication-by-t properties", tex: "\\mathcal{L}\\{\\sin bt\\} = \\frac{b}{s^2+b^2},\\; \\mathcal{L}\\{\\cos bt\\} = \\frac{s}{s^2+b^2},\\; \\mathcal{L}\\{e^{at}g\\} = G(s-a),\\; \\mathcal{L}\\{t^n g\\} = (-1)^n G^{(n)}(s)" }
  ],
  inputs: [
    { id: "mode", label: "Direction", type: "select", default: "forward", options: [["forward", "Laplace transform f(t) → F(s)"], ["inverse", "Inverse Laplace F(s) → f(t)"]] },
    { id: "ft", label: "Function f(t)", type: "expr", default: "3 + 2t e^(-t) + sin(2t)", when: { mode: ["forward"] }, help: "Supported: constants, tⁿ, e^(at), sin, cos, sinh, cosh of bt, and their products. We assume f(t) = 0 for t < 0." },
    { id: "fs", label: "Function F(s)", type: "expr", default: "(s + 3)/((s + 1)(s + 2))", when: { mode: ["inverse"] }, help: "A rational function of s, such as 5/(s^2 + 4s + 13)." }
  ],
  example: { values: { mode: "inverse", fs: "(s + 3)/((s + 1)(s + 2))" }, expect: ["2*e^(-t) - e^(-2*t)"], note: "Example: inverse of $\\frac{s+3}{(s+1)(s+2)}$ by partial fractions." },
  invalid: { values: { mode: "forward", ft: "1/t" } },
  related: ["partial-fractions", "transfer-function", "step-response", "rc-rl-transient"]
};

const R = (num, den = [1]) => ({ num: trim(num), den: trim(den) });
function divides(d, D) {
  if (degree(d) > degree(D)) return null;
  const { q, r } = pdivmod(D, d);
  const scale = Math.max(1, ...D.map(Math.abs));
  return r.every((x) => Math.abs(x) <= 1e-11 * scale) ? q : null;
}

function rAdd(a, b) {
  if (a.num.length === 1 && a.num[0] === 0) return b;
  if (b.num.length === 1 && b.num[0] === 0) return a;
  const qa = divides(b.den, a.den);
  if (qa) return R(padd(a.num, pmul(b.num, qa)), a.den);
  const qb = divides(a.den, b.den);
  if (qb) return R(padd(b.num, pmul(a.num, qb)), b.den);
  return R(padd(pmul(a.num, b.den), pmul(b.num, a.den)), pmul(a.den, b.den));
}
const rScale = (a, k) => R(pscale(a.num, k), a.den);
const rDeriv = (a) => R(padd(pmul(pderiv(a.num), a.den), pscale(pmul(a.num, pderiv(a.den)), -1)), pmul(a.den, a.den));

function shiftPoly(p, a) {
  let out = [0];
  let pw = [1];
  for (let k = 0; k < p.length; k++) {
    out = padd(out, pscale(pw, p[k]));
    pw = pmul(pw, [-a, 1]);
  }
  return out;
}

const rShift = (r, a) => R(shiftPoly(r.num, a), shiftPoly(r.den, a));

function fact(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function linearIn(node, v) {
  try {
    const r = toRational(node, v);
    if (degree(r.den) === 0 && degree(r.num) <= 1) return { a: (r.num[1] || 0) / r.den[0], b: r.num[0] / r.den[0] };
  } catch (e) {
    if (e instanceof Unsupported || e.name === "InputError") return null;
    throw e;
  }
  return null;
}

function unsupported(msg) {
  fail(`${msg} Supported forms: constants, tⁿ, e^(at), sin(bt), cos(bt), sinh(bt), cosh(bt), and products of tⁿ·e^(at) with one trigonometric function.`, "ft");
}

function factors(n, out = { c: 1, list: [] }) {
  if (n.type === "num") { out.c *= n.value; return out; }
  if (n.type === "neg") { out.c *= -1; return factors(n.a, out); }
  if (n.type === "op" && n.op === "*") { factors(n.a, out); factors(n.b, out); return out; }
  if (n.type === "op" && n.op === "/") {
    factors(n.a, out);
    invFactors(n.b, out);
    return out;
  }
  if (!dependsOn(n, "t")) { out.c *= evaluate(n, {}); return out; }
  out.list.push(n);
  return out;
}

function invFactors(n, out) {
  if (!dependsOn(n, "t")) { out.c /= evaluate(n, {}); return; }
  if (n.type === "op" && n.op === "*") { invFactors(n.a, out); invFactors(n.b, out); return; }
  if (n.type === "op" && n.op === "^" && !dependsOn(n.a, "t")) { out.list.push(pow(n.a, neg(n.b))); return; }
  unsupported("Division by a function of t is not supported.");
}

function terms(n, sign = 1, out = []) {
  if (n.type === "op" && (n.op === "+" || n.op === "-")) { terms(n.a, sign, out); terms(n.b, n.op === "-" ? -sign : sign, out); return out; }
  if (n.type === "neg") return terms(n.a, -sign, out);
  out.push({ sign, node: n });
  return out;
}

const BASE = {
  one: { R: () => R([1], [0, 1]), tex: () => "\\frac{1}{s}" },
  sin: { R: (b) => R([b], [b * b, 0, 1]), tex: (b) => `\\frac{${niceTex(b)}}{s^2 + ${niceTex(b * b)}}` },
  cos: { R: (b) => R([0, 1], [b * b, 0, 1]), tex: (b) => `\\frac{s}{s^2 + ${niceTex(b * b)}}` },
  sinh: { R: (b) => R([b], [-b * b, 0, 1]), tex: (b) => `\\frac{${niceTex(b)}}{s^2 - ${niceTex(b * b)}}` },
  cosh: { R: (b) => R([0, 1], [-b * b, 0, 1]), tex: (b) => `\\frac{s}{s^2 - ${niceTex(b * b)}}` }
};

function termTransform(node) {
  const f = factors(node);
  let n = 0, a = 0, c = f.c;
  const gs = [];
  for (const x of f.list) {
    if (x.type === "sym" && x.name === "t") { n += 1; continue; }
    if (x.type === "op" && x.op === "^" && x.a.type === "sym" && x.a.name === "t") {
      if (dependsOn(x.b, "t")) unsupported("A variable exponent such as t^t is not supported.");
      const k = evaluate(x.b, {});
      if (!Number.isInteger(k) || k < 0) unsupported(`The power t^${fmt(k)} is not supported (it must be a non-negative integer).`);
      n += k;
      continue;
    }
    if (x.type === "op" && x.op === "^" && !dependsOn(x.a, "t")) {
      const lin = linearIn(x.b, "t");
      if (!lin) unsupported("The exponent must be linear in t, such as e^(-2t).");
      const base = evaluate(x.a, {});
      if (!(base > 0)) unsupported("The base of the exponential function must be positive.");
      a += lin.a * Math.log(base);
      c *= Math.pow(base, lin.b);
      continue;
    }
    if (x.type === "fn" && ["sin", "cos", "sinh", "cosh"].includes(x.name)) {
      const lin = linearIn(x.a, "t");
      if (!lin || lin.a === 0) unsupported(`The argument of ${x.name} must be linear in t.`);
      const b = lin.a, ph = lin.b;
      if (["sin", "cos"].includes(x.name)) {
        if (x.name === "sin") gs.push([[Math.cos(ph), "sin", b], [Math.sin(ph), "cos", b]]);
        else gs.push([[Math.cos(ph), "cos", b], [-Math.sin(ph), "sin", b]]);
      } else {
        if (x.name === "sinh") gs.push([[Math.cosh(ph), "sinh", b], [Math.sinh(ph), "cosh", b]]);
        else gs.push([[Math.cosh(ph), "cosh", b], [Math.sinh(ph), "sinh", b]]);
      }
      continue;
    }
    if (x.type === "op" && x.op === "^" && x.a.type === "fn" && ["sin", "cos"].includes(x.a.name) && x.b.type === "num" && x.b.value === 2) {
      const lin = linearIn(x.a.a, "t");
      if (!lin || lin.b !== 0) unsupported("The square of a trigonometric function is supported only in the form sin(bt)^2 or cos(bt)^2.");
      gs.push([[0.5, "one", 0], [x.a.name === "sin" ? -0.5 : 0.5, "cos", 2 * lin.a]]);
      continue;
    }
    unsupported(`The term “${toText(x)}” is not in the supported transform table.`);
  }
  if (gs.length > 1) unsupported("Multiplying two trigonometric functions directly is not supported; use product identities first.");
  const g = gs[0] || [[1, "one", 0]];
  let F = R([0]);
  const gTex = [];
  for (const [k, type, b] of g) {
    if (Math.abs(k) < 1e-15) continue;
    const base = BASE[type].R(b);
    let P = { num: base.num, B: base.den, m: 1 };
    for (let i = 0; i < n; i++) P = { num: pscale(padd(pmul(pderiv(P.num), P.B), pscale(pmul(P.num, pderiv(P.B)), -P.m)), -1), B: P.B, m: P.m + 1 };
    let num = P.num, B = P.B;
    if (a !== 0) { num = shiftPoly(num, a); B = shiftPoly(B, a); }
    let den = [1];
    for (let i = 0; i < P.m; i++) den = pmul(den, B);
    F = rAdd(F, rScale(R(num, den), k));
    gTex.push(`${k === 1 ? "" : niceTex(k)}${BASE[type].tex(b)}`);
  }
  const ops = [];
  if (a !== 0) ops.push(`Frequency shift: replace s with $s ${a < 0 ? "+" : "-"} ${niceTex(Math.abs(a))}$ because of $e^{${niceTex(a)}t}$`);
  if (n > 0) ops.push(`Multiplication by $t^{${n}}$: differentiate ${n} times with respect to s and multiply by $(-1)^{${n}}$`);
  F = rScale(F, c);
  const lead = F.den[F.den.length - 1];
  F = R(pscale(F.num, 1 / lead), pscale(F.den, 1 / lead));
  return { F, c, n, a, gTex, ops };
}

export function forward(expr) {
  const f = simplify(parse(expr, ["t"]));
  const ts = terms(f);
  let total = R([0]);
  const steps = [{ text: "We apply linearity: transform each term separately.", tex: `f(t) = ${toTex(f)}` }];
  const parts = [];
  for (const { sign, node } of ts) {
    const r = termTransform(node);
    const F = rScale(r.F, sign);
    total = rAdd(total, F);
    const fTex = rTex(F);
    parts.push(fTex);
    steps.push({ text: `Term $${toTex(node)}$: from the table ${r.gTex.length ? `$\\mathcal{L} = ${r.gTex.join(" + ")}$` : ""}${r.ops.length ? ", then " + r.ops.join(", then ") : ""}.`, tex: `\\mathcal{L}\\left\\{${sign < 0 ? "-" : ""}${toTex(node)}\\right\\} = ${fTex}` });
  }
  const combined = normalizeRational(total);
  return { f, parts, combined, steps };
}

function rTex(r) {
  const d = trim(r.den);
  if (d.length === 1) return ptex(pscale(r.num, 1 / d[0]), "s");
  return `\\frac{${ptex(r.num, "s")}}{${ptex(d, "s")}}`;
}

function rText(r) {
  const d = trim(r.den);
  const p = (q) => ptex(q, "s").replace(/\\frac\{(\d+)\}\{(\d+)\}/g, "$1/$2").replace(/[{}]/g, "");
  if (d.length === 1) return p(pscale(r.num, 1 / d[0]));
  return `(${p(r.num)})/(${p(d)})`;
}

export function inverse(expr) {
  let r;
  try {
    r = typeof expr === "object" ? expr : toRational(parse(expr, ["s"]), "s");
  } catch (e) {
    if (e instanceof Unsupported) fail("Only rational functions of s (ratio of polynomials) are supported here. Time shifts such as e^(-as) are not supported.", "fs");
    if (e.name === "InputError") fail(e.message, "fs");
    throw e;
  }
  r = normalizeRational(r);
  if (r.num.every((c) => c === 0)) {
    return { r, dec: { roots: [], terms: [], poly: [0] }, ft: N(0), impulses: [], steps: [{ text: "The numerator is zero, so F(s) = 0 and its inverse f(t) = 0." }] };
  }
  if (degree(r.den) < 1) fail("The denominator must contain s; the inverse of a polynomial gives only delta functions.", "fs");
  if (degree(r.den) > 12) fail("The maximum degree of the denominator is 12.", "fs");
  const dec = decompose(r.num, r.den);
  const steps = [{ text: "The function in fractional form:", tex: `F(s) = ${rTex(r)}` }];
  steps.push({ text: "We factor the denominator:", tex: `D(s) = ${factorTex(r.den, "s")}` });
  const t = sym("t");
  let acc = null;
  const push = (node) => { acc = acc ? add(acc, node) : node; };
  const impulses = [];
  if (!(dec.poly.length === 1 && dec.poly[0] === 0)) {
    dec.poly.forEach((c, k) => {
      if (Math.abs(c) <= 1e-14) return;
      const coef = Math.abs(c - 1) < 1e-12 ? "" : Math.abs(c + 1) < 1e-12 ? "-" : nice(c, 8);
      impulses.push(`${coef}${k === 0 ? "δ(t)" : `δ${"'".repeat(k)}(t)`}`);
    });
    steps.push(`The numerator degree is greater than or equal to the denominator degree, so the polynomial part gives delta functions: ${impulses.join(" + ")}.`);
  }
  const done = new Set();
  for (const term of dec.terms) {
    const key = `${term.root.re}|${Math.abs(term.root.im)}|${term.power}`;
    if (done.has(key)) continue;
    done.add(key);
    const k = term.power;
    const tk = k > 1 ? mul(N(1 / fact(k - 1)), pow(t, N(k - 1))) : N(1);
    if (term.root.im === 0) {
      const A = term.coef.re;
      if (Math.abs(A) < 1e-13) continue;
      const node = mul(mul(N(A), tk), pow(cnst("e"), mul(N(term.root.re), t)));
      push(node);
      steps.push({ text: `Inverse of the fraction $\\frac{${niceTex(A, 8)}}{(s ${term.root.re < 0 ? "+" : "-"} ${niceTex(Math.abs(term.root.re))})${k > 1 ? `^{${k}}` : ""}}$ from the table $\\mathcal{L}^{-1}\\left\\{\\frac{1}{(s-a)^k}\\right\\} = \\frac{t^{k-1}}{(k-1)!}e^{at}$:`, tex: toTex(simplify(node)) });
    } else {
      const pos = term.root.im > 0 ? term : dec.terms.find((u) => u.power === k && Math.abs(u.root.re - term.root.re) < 1e-9 && Math.abs(u.root.im + term.root.im) < 1e-9) || term;
      const K = pos.coef, al = pos.root.re, be = Math.abs(pos.root.im);
      if (cabs(K) < 1e-13) continue;
      const B = 2 * K.re, Cc = -2 * K.im;
      const env = mul(tk, pow(cnst("e"), mul(N(al), t)));
      const node = mul(env, add(mul(N(B), fn("cos", mul(N(be), t))), mul(N(Cc), fn("sin", mul(N(be), t)))));
      push(node);
      steps.push({ text: `The complex conjugate roots $${ctex(pos.root, 6)}$ and their conjugate give (with coefficient $K = ${ctex(K, 6)}$): $2|K|\\,e^{\\alpha t}\\cos(\\beta t + \\angle K)$ = `, tex: toTex(simplify(node)) });
    }
  }
  const ft = simplify(acc || N(0));
  return { r, dec, ft, impulses, steps };
}

export function solve(input) {
  const mode = choice(input, "mode", "Direction", ["forward", "inverse"], "forward");
  if (mode === "forward") {
    const src = str(input, "ft", "Function f(t)");
    let res;
    try { res = forward(src); } catch (e) { if (e.name === "InputError") fail(e.message, "ft"); throw e; }
    const sumTex = res.parts.map((p, i) => (i === 0 ? p : p.startsWith("-") ? ` ${p}` : ` + ${p}`)).join("");
    res.steps.push({ text: "We add the transforms and combine the denominators:", tex: `F(s) = ${rTex(res.combined)}` });
    return {
      results: [
        { label: "F(s) term by term", tex: `F(s) = ${sumTex}` },
        { label: "F(s) as a single fraction", tex: `F(s) = ${rTex(res.combined)}`, text: rText(res.combined) }
      ],
      steps: res.steps, copy: `F(s) = ${rText(res.combined)}`
    };
  }
  const src = str(input, "fs", "Function F(s)");
  const res = inverse(src);
  const ftText = toText(res.ft);
  const full = [res.impulses.join(" + "), ftText !== "0" ? ftText : ""].filter(Boolean).join(" + ").split("+ -").join("- ") || "0";
  const blocks = [];
  if (ftText !== "0") {
    const F = (x) => evaluate(res.ft, { t: x });
    blocks.push({ type: "plot", title: "Time response f(t)", xLabel: "t", yLabel: "f(t)", series: [{ name: "f(t)", points: sampleFunction(F, 0, horizon(res.dec), 400) }] });
  }
  return {
    results: [{ label: "$f(t)$ when $t \\ge 0$", tex: `f(t) = ${[res.impulses.map((s) => s.replace(/δ/g, "\\delta ")).join(" + "), ftText !== "0" ? toTex(res.ft) : ""].filter(Boolean).join(" + ")}`, text: full }],
    blocks, steps: res.steps, copy: `f(t) = ${full}`
  };
}

function horizon(dec) {
  const decays = dec.roots.map((r) => r.root.re).filter((x) => x < 0).map((x) => 5 / -x);
  const osc = dec.roots.map((r) => Math.abs(r.root.im)).filter((x) => x > 0).map((x) => (4 * Math.PI) / x);
  const h = Math.max(...decays, ...osc, 0);
  return h > 0 && isFinite(h) ? Math.min(h, 1e6) : 5;
}

export { rTex, rText };
