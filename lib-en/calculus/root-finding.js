import { simplify, diff } from "../core/symbolic.js";
import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { bisection, newton, secant, sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "Find the root of f(x) = 0 numerically using bisection, Newton-Raphson or the secant method, with a full table for each iteration and a graph showing the location of the root.",
  keywords: ["root", "solve equation", "Newton", "Newton-Raphson", "bisection", "bisection", "newton", "secant", "secant", "numerical methods"],
  formulas: [
    { label: "Newton-Raphson", tex: "x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}" },
    { label: "Secant", tex: "x_{n+1} = x_n - f(x_n)\\frac{x_n - x_{n-1}}{f(x_n) - f(x_{n-1})}" },
    { label: "Bisection", tex: "m = \\frac{a+b}{2},\\quad f(a)\\,f(b) < 0" }
  ],
  inputs: [
    { id: "f", label: "Function f(x)", type: "expr", placeholder: "x^3 - 2x - 5" },
    { id: "v", label: "Variable", type: "text", default: "x" },
    { id: "method", label: "Method", type: "select", default: "newton", options: [["newton", "Newton-Raphson"], ["bisection", "Bisection"], ["secant", "Secant"]] },
    { id: "x0", label: "Initial value x₀", type: "number", default: "2", when: { method: ["newton", "secant"] } },
    { id: "x1", label: "Second value x₁", type: "number", default: "3", when: { method: ["secant"] } },
    { id: "a", label: "Start of interval a", type: "number", default: "2", when: { method: ["bisection"] } },
    { id: "b", label: "End of interval b", type: "number", default: "3", when: { method: ["bisection"] } },
    { id: "tol", label: "Required precision", type: "number", default: "1e-10" }
  ],
  example: { values: { f: "x^3 - 2x - 5", v: "x", method: "newton", x0: "2", tol: "1e-10" }, expect: ["2.0945514815"], note: "The classic Newton example: the root of $x^3 - 2x - 5 = 0$ near 2." },
  invalid: { values: { f: "x^2 + 1", method: "bisection", a: "0", b: "1" } },
  related: ["polynomial-roots", "quadratic", "function-plotter", "derivative"]
};

const REASONS = {
  sign: "f(a) and f(b) have the same sign, so bisection does not guarantee a root. Choose an interval where the sign of the function changes.",
  undefined: "The function is undefined at one of the calculation points. Try another initial value.",
  zeroDerivative: "The derivative equals zero at one of the points, so Newton's method stopped. Try another initial value.",
  diverged: "The method diverged and did not converge. Try an initial value closer to the root.",
  maxIter: "The method did not converge within 100 iterations. Try another initial value or the bisection method.",
  flat: "The function has equal values at two consecutive points, so the secant method stopped."
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const method = choice(input, "method", "Method", ["newton", "bisection", "secant"], "newton");
  const tol = num(input, "tol", "Precision", { positive: true, default: 1e-10 });
  const F = f1(f, v);
  const steps = [{ text: "The equation to solve:", tex: `${toTex(f)} = 0` }];
  let r, rows, head, start, field;
  if (method === "newton") {
    const x0 = num(input, "x0", "Initial value");
    const d = diff(f, v);
    steps.push({ text: "We compute the derivative symbolically:", tex: `f'(${v}) = ${toTex(d)}` });
    steps.push(`We start from ${v}₀ = ${fmt(x0)} and repeat the formula until the change becomes smaller than ${fmt(tol)}.`);
    r = newton(F, f1(d, v), x0, { tol });
    head = ["n", "xₙ", "f(xₙ)", "f'(xₙ)", "xₙ₊₁"];
    rows = r.rows.map((q) => [q.i, fmt(q.x, 12), fmt(q.fx, 4), fmt(q.dfx, 6), fmt(q.next, 12)]);
    start = [x0]; field = "x0";
  } else if (method === "secant") {
    const x0 = num(input, "x0", "Initial value"), x1 = num(input, "x1", "Second value");
    if (x0 === x1) fail("The two initial values must be different.", "x1");
    steps.push(`We start from ${v}₀ = ${fmt(x0)} and ${v}₁ = ${fmt(x1)} and repeat the secant formula.`);
    r = secant(F, x0, x1, { tol });
    head = ["n", "xₙ₋₁", "xₙ", "f(xₙ)", "xₙ₊₁"];
    rows = r.rows.map((q) => [q.i, fmt(q.x0, 12), fmt(q.x1, 12), fmt(q.fx1, 4), fmt(q.next, 12)]);
    start = [x0, x1]; field = "x0";
  } else {
    const a = num(input, "a", "Start of interval"), b = num(input, "b", "End of interval");
    if (a >= b) fail("The start of the interval must be less than its end.", "b");
    const fa = F(a), fb = F(b);
    steps.push(`We check the sign change: f(${fmt(a)}) = ${fmt(fa)} and f(${fmt(b)}) = ${fmt(fb)}.`);
    r = bisection(F, a, b, { tol });
    head = ["n", "a", "b", "m", "f(m)"];
    rows = r.rows.map((q) => [q.i, fmt(q.a, 12), fmt(q.b, 12), fmt(q.x, 12), fmt(q.fx, 4)]);
    if (rows.length > 60) rows.splice(30, rows.length - 60, ["…", "…", "…", "…", "…"]);
    start = [a, b]; field = r.reason === "sign" ? "b" : "a";
  }
  if (!r.ok) fail(REASONS[r.reason] || "The root could not be found.", field);
  const root = r.root;
  const fr = F(root);
  steps.push(`The method converged after ${r.iterations} iterations to ${v} ≈ ${fmt(root, 12)}.`);
  steps.push({ text: "To check, we substitute the root into the function:", tex: `f(${ntex(root, 12)}) = ${ntex(fr, 3)}` });
  const lo = Math.min(root, ...start), hi = Math.max(root, ...start);
  const pad = Math.max(1, (hi - lo) * 0.6);
  return {
    results: [
      { label: "Root", value: root, sig: 12 },
      { label: "Value of the function at the root", value: fr, sig: 3 },
      { label: "Number of iterations", value: r.iterations }
    ],
    blocks: [
      { type: "table", caption: "Iteration table", head, rows: rows.map((rw) => rw.map(String)) },
      { type: "plot", title: "The function and the location of the root", xLabel: v, yLabel: `f(${v})`, series: [{ name: `f(${v})`, points: sampleFunction(F, lo - pad, hi + pad, 400) }, { name: "Root", points: [[root, 0]], marker: "o" }] }
    ],
    steps,
    copy: `Root ${v} ≈ ${fmt(root, 12)} (f = ${fmt(fr, 3)}, ${r.iterations} iterations)`
  };
}
