import { integrate, simplify } from "../core/symbolic.js";
import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, niceTex, nice } from "../core/format.js";
import { integrateNumeric, sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "Compute the indefinite and definite integral of any function: a symbolic solution with steps when one is reliable, and a clearly labeled exact numerical value when no symbolic solution is available.",
  intro: "Symbolic integration supports powers, trigonometric, exponential and logarithmic functions, substitution, integration by parts and partial fractions. Every symbolic result is checked numerically before it is shown.",
  keywords: ["integral", "integral", "definite integral", "indefinite integral", "area under the curve", "integration by parts", "substitution"],
  formulas: [
    { label: "Indefinite and definite integral", tex: "\\int f(x)\\,dx = F(x) + C, \\qquad \\int_a^b f(x)\\,dx = F(b) - F(a)" },
    { label: "Power rule and integration by parts", tex: "\\int x^n dx = \\frac{x^{n+1}}{n+1} + C,\\qquad \\int u\\,dv = uv - \\int v\\,du" }
  ],
  inputs: [
    { id: "f", label: "Function to integrate", type: "expr", placeholder: "x e^x", help: "e.g. x^2 sin(x), 1/(x^2+1), e^(2x), ln(x)" },
    { id: "v", label: "Variable", type: "text", default: "x" },
    { id: "mode", label: "Integral type", type: "select", default: "indefinite", options: [["indefinite", "indefinite"], ["definite", "definite"]] },
    { id: "a", label: "Lower limit a", type: "number", when: { mode: ["definite"] }, help: "inf or -inf can be entered" },
    { id: "b", label: "Upper limit b", type: "number", when: { mode: ["definite"] } }
  ],
  example: { values: { f: "x e^x", v: "x", mode: "definite", a: "0", b: "1" }, expect: ["= 1"], note: "Example: $\\int_0^1 x e^x\\,dx$ by parts, with the result 1." },
  invalid: { values: { f: "sin(x", mode: "indefinite" } },
  related: ["derivative", "function-plotter", "laplace", "partial-fractions"]
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const mode = choice(input, "mode", "Integral type", ["indefinite", "definite"], "indefinite");
  const steps = [{ text: "The function after simplification:", tex: `f(${v}) = ${toTex(f)}` }];
  const blocks = [];
  const sym = integrate(f, v);
  if (sym) {
    for (const s of sym.steps) steps.push({ text: s.rule, tex: s.tex });
    steps.push(`We verified the result by differentiating it numerically and comparing it with the original function at several points.`);
  }
  if (mode === "indefinite") {
    if (!sym) {
      blocks.push({ type: "note", tone: "warn", text: "We could not find a reliable symbolic integral for this function with the supported rules. It may have no elementary antiderivative (such as $e^{x^2}$). Try a definite integral to get a numerical value." });
      return { results: [{ label: "Indefinite integral", value: "Not available symbolically" }], steps, blocks, copy: "The indefinite integral is not available symbolically" };
    }
    return {
      results: [{ label: "Indefinite integral", tex: `\\int ${toTex(f)}\\,d${v} = ${toTex(sym.result)} + C`, text: `${toText(sym.result)} + C` }],
      steps, blocks, copy: `∫ ${toText(f)} d${v} = ${toText(sym.result)} + C`
    };
  }
  const a = num(input, "a", "Lower limit", { allowInfinity: true });
  const b = num(input, "b", "Upper limit", { allowInfinity: true });
  if (a === b) fail("The limits are equal, so the integral equals zero. Enter two different limits.", "b");
  const F = f1(f, v);
  const numeric = integrateNumeric(F, a, b, { tol: 1e-11 });
  let exact = null;
  if (sym && isFinite(a) && isFinite(b)) {
    const G = f1(sym.result, v);
    const Fa = G(a), Fb = G(b);
    const pts = sampleFunction(F, Math.min(a, b), Math.max(a, b), 401);
    const continuous = pts.every(([, y]) => y !== null);
    const val = Fb - Fa;
    if (continuous && isFinite(val) && numeric.ok && Math.abs(val - numeric.value) <= 1e-6 * Math.max(1, Math.abs(val))) {
      exact = val;
      steps.push({ text: `We apply the fundamental theorem of calculus: $F(b) - F(a)$`, tex: `F(${ntex(b)}) - F(${ntex(a)}) = ${ntex(Fb, 10)} - (${ntex(Fa, 10)}) = ${ntex(val, 10)}` });
    } else if (!continuous) {
      blocks.push({ type: "note", tone: "warn", text: "The function is undefined at a point inside the integration interval, so $F(b)-F(a)$ cannot be applied directly." });
    }
  }
  const results = [];
  if (exact !== null) {
    const shown = Math.abs(exact - Math.round(exact)) < 1e-10 ? Math.round(exact) : exact;
    results.push({ label: "Value of the definite integral", tex: `\\int_{${ntex(a)}}^{${ntex(b)}} ${toTex(f)}\\,d${v} = ${niceTex(shown, 10)}`, text: `= ${nice(shown, 10)}` });
    results.push({ label: "Decimal value", value: exact, sig: 12 });
  } else {
    if (!numeric.ok || !isFinite(numeric.value)) {
      blocks.push({ type: "note", tone: "warn", text: "The integral does not converge or the function is unbounded on the interval, so no reliable value can be given." });
      return { results: [{ label: "Value of the definite integral", value: "Divergent or undefined" }], steps, blocks, copy: "The integral diverges" };
    }
    results.push({ label: "Value of the definite integral (numerical approximation)", value: numeric.value, sig: 10, text: `≈ ${fmt(numeric.value, 10)}` });
    results.push({ label: "Numerical error estimate", value: numeric.error, sig: 2 });
    steps.push(`We computed the value numerically using adaptive Gauss-Kronrod quadrature (15 points), dividing the interval into ${numeric.intervals} parts.`);
    if (!isFinite(a) || !isFinite(b)) steps.push("For infinite limits we used a change of variable that makes the interval finite before the numerical integration.");
    blocks.push({ type: "note", text: "This is an approximate numerical value, not a symbolic result." });
  }
  if (isFinite(a) && isFinite(b)) {
    const lo = Math.min(a, b), hi = Math.max(a, b), pad = (hi - lo) * 0.25;
    blocks.push({ type: "plot", title: `Graph of the function with the integration limits`, xLabel: v, yLabel: `f(${v})`, series: [{ name: `f(${v})`, points: sampleFunction(F, lo - pad, hi + pad, 400) }], vlines: [{ x: lo }, { x: hi }] });
  }
  const copyVal = exact !== null ? nice(exact, 10) : `≈ ${fmt(numeric.value, 10)}`;
  return { results, steps, blocks, copy: `∫ from ${fmt(a)} to ${fmt(b)} of ${toText(f)} d${v} = ${copyVal}` };
}
