import { derivative, simplify } from "../core/symbolic.js";
import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { derivNumeric } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "Compute the derivative of any function symbolically, explaining each differentiation rule used: power, product, quotient, chain, and trigonometric, exponential and logarithmic functions.",
  intro: "Enter the function and get its first derivative or a higher-order derivative, with the rule used at each step explained, and the value of the derivative at a point if you wish.",
  keywords: ["derivative", "differentiation", "calculus", "derivative", "chain rule", "product rule", "quotient rule"],
  formulas: [
    { label: "Power rule and product rule", tex: "\\frac{d}{dx}x^n = n x^{n-1}, \\qquad (uv)' = u'v + uv'" },
    { label: "Quotient rule and chain rule", tex: "\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}, \\qquad \\frac{d}{dx}f(g(x)) = f'(g(x))\\,g'(x)" }
  ],
  inputs: [
    { id: "f", label: "Function f", type: "expr", placeholder: "x^2 sin(x)", help: "Use ^ for exponents, sin cos tan ln log sqrt exp abs, and the constants pi and e. Implicit multiplication such as 2x is allowed." },
    { id: "v", label: "Variable", type: "text", default: "x" },
    { id: "order", label: "Derivative order", type: "select", default: "1", options: [["1", "First"], ["2", "Second"], ["3", "Third"], ["4", "Fourth"], ["5", "Fifth"]] },
    { id: "at", label: "Value of the variable at which to evaluate the derivative (optional)", type: "number", placeholder: "e.g. 1.5" }
  ],
  example: { values: { f: "x^2 sin(x)", v: "x", order: "1", at: "" }, expect: ["x^2*cos(x) + 2*x*sin(x)"], note: "Example: derivative of $x^2\\sin x$ using the product rule." },
  invalid: { values: { f: "x^2 +* 3", v: "x", order: "1" } },
  related: ["integral", "limit", "taylor-series", "function-plotter"]
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const order = Number(choice(input, "order", "Derivative order", ["1", "2", "3", "4", "5"], "1"));
  const at = num(input, "at", "Evaluation point", { optional: true });
  const steps = [];
  steps.push({ text: "The function after simplification:", tex: `f(${v}) = ${toTex(f)}` });
  let cur = f;
  const all = [];
  for (let k = 1; k <= order; k++) {
    const r = derivative(cur, v, { maxSteps: k === 1 ? 40 : 12 });
    if (order > 1) steps.push({ text: `Derivative number ${k}: differentiate the result of the previous step.` });
    for (const s of r.steps) steps.push({ text: s.rule, tex: s.tex });
    cur = r.result;
    all.push(cur);
  }
  const prime = order === 1 ? "'" : order === 2 ? "''" : `^{(${order})}`;
  const results = [{ label: `The derivative $f${prime}(${v})$`, tex: `f${prime}(${v}) = ${toTex(cur)}`, text: toText(cur) }];
  const blocks = [];
  if (at !== null) {
    const val = f1(cur, v)(at);
    if (!isFinite(val)) {
      blocks.push({ type: "note", tone: "warn", text: `The derivative is undefined at ${v} = ${fmt(at)}.` });
    } else {
      results.push({ label: `Value at ${v} = ${fmt(at)}`, value: val, text: fmt(val, 10) });
      steps.push({ text: `Substitute ${v} = ${fmt(at)} into the derivative:`, tex: `f${prime}(${ntex(at)}) = ${ntex(val, 10)}` });
      if (order <= 2) {
        const nd = derivNumeric(f1(f, v), at, order);
        if (isFinite(nd)) steps.push(`Check: the numerical approximation using central differences gives ${fmt(nd, 8)}.`);
      }
    }
  }
  return { results, steps, blocks, copy: `f${order === 1 ? "'" : order === 2 ? "''" : `(${order})`}(${v}) = ${toText(cur)}${at !== null && isFinite(f1(cur, v)(at)) ? `
At ${v} = ${fmt(at)}: ${fmt(f1(cur, v)(at), 10)}` : ""}` };
}
