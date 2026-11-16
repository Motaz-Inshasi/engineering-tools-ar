import { readTF, tfTex, polesZeros } from "../signals/common.js";
import { numx as num } from "../core/numexpr.js";
import { fail } from "../core/validate.js";
import { padd, peval, roots, trim } from "../core/polynomial.js";
import { cabs } from "../core/complex.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calculate the steady-state error of a unity feedback system: the system type, the error constants Kp, Kv, and Ka, and the error for a step input, a ramp, and a parabola, after first checking the stability of the closed loop.",
  keywords: ["steady-state error", "steady state error", "system type", "error constant", "Kp", "Kv", "Ka", "feedback"],
  formulas: [
    { label: "Error constants", tex: "K_p = \\lim_{s\\to0}G(s),\\quad K_v = \\lim_{s\\to0}sG(s),\\quad K_a = \\lim_{s\\to0}s^2G(s)" },
    { label: "Error for an input of amplitude A", tex: "e_{step} = \\frac{A}{1+K_p},\\quad e_{ramp} = \\frac{A}{K_v},\\quad e_{parabola} = \\frac{A}{K_a}" }
  ],
  inputs: [
    { id: "G", label: "Open-loop transfer function G(s)", type: "expr", default: "10(s + 2)/(s(s + 1)(s + 5))", help: "With unity feedback: T(s) = G/(1+G)." },
    { id: "A", label: "Input amplitude A", type: "number", default: "1" }
  ],
  example: { values: { G: "10(s + 2)/(s(s + 1)(s + 5))", A: "1" }, expect: ["e_ramp = 0.25"], note: "Example: a type 1 system, so the step error is zero and the ramp error is $1/K_v$." },
  invalid: { values: { G: "1/(s - 1)", A: "1" } },
  related: ["bode-plot", "routh-hurwitz", "transfer-function", "step-response"]
};

export function errorConstants(tf) {
  let den = trim(tf.den), N = 0;
  while (den.length > 1 && Math.abs(den[0]) < 1e-12 * Math.max(...den.map(Math.abs))) { den = den.slice(1); N++; }
  const g0 = peval(tf.num, 0) / den[0];
  const K = [0, 1, 2].map((k) => (N > k ? Infinity : N === k ? g0 : 0));
  return { type: N, Kp: K[0], Kv: K[1], Ka: K[2], g0 };
}

export function solve(input) {
  const tf = readTF(input, "G", "Open-loop transfer function");
  const A = num(input, "A", "Input amplitude", { nonZero: true });
  const charPoly = padd(tf.den, tf.num);
  const cl = roots(charPoly);
  const unstable = cl.filter((r) => r.re >= -1e-9);
  const steps = [
    { text: "Open-loop transfer function:", tex: `G(s) = ${tfTex(tf)}` },
    { text: "First we check the stability of the closed loop by finding the roots of the characteristic equation $1 + G(s) = 0$:", tex: `D(s) + N(s) = 0` }
  ];
  if (unstable.length) {
    fail(`The closed loop is unstable (${unstable.length} root(s) on or to the right of the imaginary axis), so steady-state error has no meaning.`, "G");
  }
  steps.push(`All closed-loop roots are in the left half-plane (the slowest at Re = ${fmt(Math.max(...cl.map((r) => r.re)), 5)}), so the system is stable and we continue.`);
  const c = errorConstants(tf);
  steps.push(`Number of poles at the origin = ${c.type}, so the system is of type ${c.type}.`);
  const kTex = (v) => (v === Infinity ? "\\infty" : ntex(v, 6));
  steps.push({ text: "Error constants:", tex: `K_p = ${kTex(c.Kp)},\\quad K_v = ${kTex(c.Kv)},\\quad K_a = ${kTex(c.Ka)}` });
  const e = (k, kind) => (kind === "step" ? A / (1 + k) : k === Infinity ? 0 : k === 0 ? Infinity : A / k);
  const es = e(c.Kp, "step"), er = e(c.Kv, "ramp"), ep = e(c.Ka, "par");
  steps.push({ text: `Substituting into the formulas with A = ${fmt(A)}:`, tex: `e_{step} = ${kTex(es)},\\quad e_{ramp} = ${kTex(er)},\\quad e_{parabola} = ${kTex(ep)}` });
  steps.push("An error of ∞ means the output cannot follow the input and the difference grows over time.");
  const show = (v) => (v === Infinity ? "∞" : fmt(v, 6));
  return {
    results: [
      { label: "system type", value: c.type },
      { label: "Kp", value: show(c.Kp) },
      { label: "Kv", value: show(c.Kv) },
      { label: "Ka", value: show(c.Ka) },
      { label: "Step error", value: show(es), text: `e_step = ${show(es)}` },
      { label: "Ramp error", value: show(er), text: `e_ramp = ${show(er)}` },
      { label: "Parabola error", value: show(ep), text: `e_parabola = ${show(ep)}` }
    ],
    steps,
    copy: `type ${c.type}: e_step = ${show(es)}, e_ramp = ${show(er)}, e_parabola = ${show(ep)}`
  };
}

export { cabs };
