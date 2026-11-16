import { str, fail } from "../core/validate.js";
import { parse, sub, variables } from "../core/parser.js";
import { toRational, toDescending, Unsupported, degree as pdeg } from "../core/polynomial.js";
import { parseNumber, normalizeDigits } from "../core/format.js";
import { C, cabs, ctex, cfmt } from "../core/complex.js";
import { roots, cleanRoot, fromDescending, pevalC, pdivmod, trim, toTex, factorTex, peval, groupRoots } from "../core/polynomial.js";
import { niceTex, nice, fmt } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Find all real and complex roots of a polynomial up to degree 20: enter it as is, such as x^7 − x^5, factored, or as an equation, with rational-root testing, synthetic division, verification and factorization.",
  keywords: ["polynomial roots", "polynomial", "polynomial roots", "cubic equation", "synthetic division", "factorization", "rational roots"],
  formulas: [
    { label: "Rational root test", tex: "a_n x^n + \\cdots + a_0 = 0,\\quad x = \\frac{p}{q},\\; p \\mid a_0,\\; q \\mid a_n" },
    { label: "Aberth numerical method for all roots together", tex: "z_k \\leftarrow z_k - \\frac{p/p'}{1 - \\frac{p}{p'}\\sum_{j\\ne k}\\frac{1}{z_k - z_j}}" }
  ],
  inputs: [
    { id: "c", label: "Polynomial or equation", type: "expr", default: "x^3 - 6x^2 + 11x - 6", help: "Enter it in any order: x^7 - x^5, (x-1)(x+2)^3, or an equation such as 2x^3 = 8x. You can also enter only the coefficients, starting from the highest power, such as 1 -6 11 -6.", wide: true }
  ],
  example: { values: { c: "x^3 - 6x^2 + 11x - 6" }, expect: ["x = 1", "x = 2", "x = 3"], note: "Example: $x^3 - 6x^2 + 11x - 6 = 0$." },
  invalid: { values: { c: "0 0 5" } },
  related: ["quadratic", "partial-fractions", "transfer-function", "root-finding"]
};

function divisors(n) {
  n = Math.abs(n);
  const out = [];
  for (let i = 1; i * i <= n; i++) if (n % i === 0) { out.push(i); if (i * i !== n) out.push(n / i); }
  return out.sort((a, b) => a - b);
}

export function rationalRoots(desc) {
  if (!desc.every((c) => Number.isInteger(c)) || desc.some((c) => Math.abs(c) > 1e6)) return null;
  let p = fromDescending(desc);
  const found = [];
  while (p.length > 1 && p[0] === 0) { found.push(0); p = p.slice(1); }
  if (p.length <= 1) return { found, rest: p };
  const a0 = p[0], an = p[p.length - 1];
  const cands = [];
  for (const q of divisors(an)) for (const pp of divisors(a0)) for (const s of [1, -1]) {
    const v = (s * pp) / q;
    if (!cands.some((c) => Math.abs(c - v) < 1e-12)) cands.push(v);
  }
  cands.sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
  let changed = true;
  while (changed && p.length > 1) {
    changed = false;
    for (const r of cands) {
      const val = peval(p, r);
      if (Math.abs(val) < 1e-9 * Math.max(1, ...p.map(Math.abs))) {
        found.push(r);
        p = pdivmod(p, [-r, 1]).q;
        changed = true;
        break;
      }
    }
  }
  return { found, rest: p, candidates: cands.length };
}

const MAX_DEG = 20;

export function readPolynomial(input) {
  const raw = normalizeDigits(str(input, "c", "Polynomial")).trim();
  const tokens = raw.split(/[\s,،;؛]+/).filter(Boolean);
  if (tokens.length && tokens.every((t) => isFinite(parseNumber(t)))) {
    if (tokens.length < 2) fail("Enter a polynomial of degree at least 1, such as x - 3 or the coefficients 1 -3.", "c");
    return { desc: tokens.map(parseNumber), v: "x", mode: "coeffs" };
  }
  const sides = raw.split("=");
  if (sides.length > 2) fail("The equation contains more than one = sign.", "c");
  let left, right;
  try {
    left = parse(sides[0]);
    right = sides.length === 2 ? parse(sides[1]) : null;
  } catch (e) {
    if (e.name === "InputError") fail(e.message, "c");
    throw e;
  }
  const vars = new Set([...variables(left), ...(right ? variables(right) : [])]);
  if (vars.size > 1) fail(`The polynomial must contain only one variable; found: ${[...vars].join("، ")}.`, "c");
  if (vars.size === 0) fail("There is no variable in the expression. Write a polynomial such as x^2 - 4.", "c");
  const v = [...vars][0];
  let r;
  try {
    r = toRational(right ? sub(left, right) : left, v);
  } catch (e) {
    if (e instanceof Unsupported) fail("This is not a polynomial: only addition, subtraction, multiplication and positive integer exponents are allowed (no functions such as sin or fractional exponents).", "c");
    if (e.name === "InputError") fail(e.message, "c");
    throw e;
  }
  if (pdeg(r.den) > 0) fail(`This is not a polynomial because ${v} appears in a denominator. Multiply both sides by the denominator first.`, "c");
  const scale = Math.max(...r.num.map(Math.abs));
  const asc = r.num.map((c) => (Math.abs(c) < 1e-14 * scale ? 0 : c / r.den[0]));
  return { desc: toDescending(asc), v, mode: "expr" };
}

export function solve(input) {
  const read = readPolynomial(input);
  let desc = read.desc;
  const v = read.v;
  while (desc.length && desc[0] === 0) desc = desc.slice(1);
  if (desc.length < 2) fail("The polynomial must be of degree at least 1 (the leading coefficient must be nonzero).", "c");
  if (desc.length - 1 > MAX_DEG) fail(`The maximum degree is ${MAX_DEG}.`, "c");
  const p = fromDescending(desc);
  const n = desc.length - 1;
  const steps = [{ text: `Polynomial of degree ${n}:`, tex: `p(${v}) = ${toTex(p, v)}` }];
  let all = [];
  let rest = p;
  const rr = rationalRoots(desc);
  if (rr && n > 2 && rr.found.length) {
    steps.push(`The coefficients are integers, so we test the possible rational roots $\\pm p/q$ (${rr.candidates ?? 0} candidates).`);
    for (const r of rr.found) steps.push(`The root $${v} = ${niceTex(r)}$ satisfies $p(${niceTex(r)}) = 0$, so we divide by $(${v} ${r < 0 ? "+" : "-"} ${niceTex(Math.abs(r))})$ using synthetic division.`);
    all = rr.found.map((r) => C(r));
    rest = rr.rest;
    if (rest.length > 1) steps.push({ text: "Remaining polynomial:", tex: toTex(rest, v) });
  }
  const dr = trim(rest).length - 1;
  if (dr === 1) {
    all.push(C(-rest[0] / rest[1]));
    steps.push(`The remainder is linear: $${v} = ${niceTex(-rest[0] / rest[1])}$.`);
  } else if (dr === 2) {
    const [c, b, a] = rest;
    const D = b * b - 4 * a * c;
    steps.push({ text: "The remainder is quadratic; we use the quadratic formula:", tex: `\\Delta = b^2 - 4ac = ${niceTex(D, 8)},\\quad ${v} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}` });
    all.push(...roots(rest));
  } else if (dr > 2) {
    steps.push(`We compute the remaining roots (${dr}) together with the iterative Aberth method, then refine each one with Newton's method.`);
    all.push(...roots(rest));
  }
  all = all.map(cleanRoot).sort((a, b) => a.re - b.re || a.im - b.im);
  const groups = groupRoots(all, 1e-6);
  const maxRes = Math.max(...all.map((r) => cabs(pevalC(p, r))));
  steps.push(`To verify, we substituted each root into $p(${v})$; the largest residual was ${fmt(maxRes, 2)}.`);
  const fact = factorTex(p, v);
  steps.push({ text: "Factorization (quadratic factors correspond to conjugate complex roots):", tex: `p(${v}) = ${fact}` });
  const rows = groups.map((g) => [{ tex: `${v} = ${ctex(g.root, 10)}` }, String(g.mult), g.root.im === 0 ? "Real" : "Complex"]);
  const text = groups.map((g) => `${v} = ${cfmt(g.root, 10)}${g.mult > 1 ? ` (repeated ${g.mult} times)` : ""}`).join("، ");
  const real = groups.filter((g) => g.root.im === 0).map((g) => g.root.re);
  const lo = Math.min(-2, ...real) - 1, hi = Math.max(2, ...real) + 1;
  return {
    results: [{ label: "Roots", value: text }, { label: "Number of distinct real roots", value: real.length }],
    blocks: [
      { type: "table", head: ["Root", "Multiplicity", "Type"], rows },
      { type: "plot", title: "Polynomial graph", xLabel: v, yLabel: `p(${v})`, series: [{ name: `p(${v})`, points: sampleFunction((x) => peval(p, x), lo, hi, 400) }, { name: "Real roots", points: real.map((r) => [r, 0]), marker: "o" }] }
    ],
    steps, copy: groups.map((g) => `${v} = ${cfmt(g.root, 10)}`).join("\n")
  };
}
