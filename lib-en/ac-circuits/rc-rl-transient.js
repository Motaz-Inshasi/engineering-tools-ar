import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Transient response of RC and RL circuits during charging or discharging: the time constant, the time equation of voltage and current, the value at any instant, and the time needed to reach a given percentage, with a plot.",
  keywords: ["Time constant", "time constant", "Capacitor charging", "Capacitor discharging", "RC circuit", "RL circuit", "Transient response", "transient", "τ"],
  formulas: [
    { label: "Time constant", tex: "\\tau_{RC} = RC,\\qquad \\tau_{RL} = \\frac{L}{R}" },
    { label: "General formula for any quantity in a first-order circuit", tex: "x(t) = x(\\infty) + \\left[x(0) - x(\\infty)\\right]e^{-t/\\tau}" }
  ],
  inputs: [
    { id: "type", label: "Circuit", type: "select", default: "RC", options: [["RC", "RC (capacitor voltage)"], ["RL", "RL (inductor current)"]] },
    { id: "mode", label: "Mode", type: "select", default: "charge", options: [["charge", "Charging (source connected)"], ["discharge", "Discharging (source removed)"]] },
    { id: "Vs", label: "Source voltage Vs", unit: "V", type: "number", default: "5" },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10k" },
    { id: "C", label: "C", unit: "F", type: "number", default: "100u", when: { type: ["RC"] } },
    { id: "L", label: "L", unit: "H", type: "number", default: "10m", when: { type: ["RL"] } },
    { id: "t", label: "Instant for calculating the value (optional)", unit: "s", type: "number", default: "1" },
    { id: "pct", label: "Target percentage of the final value (optional)", unit: "%", type: "number", default: "90" }
  ],
  example: { values: { type: "RC", mode: "charge", Vs: "5", R: "10k", C: "100u", t: "1", pct: "90" }, expect: ["τ = 1 s", "3.161 V"], note: "Example: charging a 100 µF capacitor through 10 kΩ from 5 V." },
  invalid: { values: { type: "RC", mode: "charge", Vs: "5", R: "10k", C: "-1u" } },
  related: ["step-response", "laplace", "passive-filter", "timer-555"]
};

export function solve(input) {
  const type = choice(input, "type", "Circuit", ["RC", "RL"], "RC");
  const mode = choice(input, "mode", "Mode", ["charge", "discharge"], "charge");
  const Vs = num(input, "Vs", "Source voltage", { nonZero: true });
  const R = num(input, "R", "R", { positive: true });
  const tau = type === "RC" ? R * num(input, "C", "C", { positive: true }) : num(input, "L", "L", { positive: true }) / R;
  const t = num(input, "t", "Instant", { optional: true, nonNegative: true });
  const pct = num(input, "pct", "Percentage", { optional: true, positive: true, below: 100 });
  const final = type === "RC" ? Vs : Vs / R;
  const unit = type === "RC" ? "V" : "A";
  const qty = type === "RC" ? "v_C" : "i_L";
  const x = mode === "charge" ? (s) => final * (1 - Math.exp(-s / tau)) : (s) => final * Math.exp(-s / tau);
  const steps = [
    { text: "Time constant:", tex: type === "RC" ? `\\tau = RC = ${ntex(R)} \\times ${ntex(tau / R)} = ${ntex(tau, 6)}\\ s` : `\\tau = \\frac{L}{R} = \\frac{${ntex(tau * R)}}{${ntex(R)}} = ${ntex(tau, 6)}\\ s` },
    type === "RC" ? "Capacitor voltage cannot change instantly, so it is the appropriate variable." : "Inductor current cannot change instantly, so it is the appropriate variable.",
    mode === "charge"
      ? { text: `Initial value 0 and final value ${eng(final, unit, 5)}:`, tex: `${qty}(t) = ${ntex(final, 6)}\\left(1 - e^{-t/${ntex(tau, 6)}}\\right)` }
      : { text: `Initial value ${eng(final, unit, 5)} and final value 0:`, tex: `${qty}(t) = ${ntex(final, 6)}\\,e^{-t/${ntex(tau, 6)}}` },
    `After one τ the response reaches ${mode === "charge" ? "63.2%" : "36.8%"} of ${mode === "charge" ? "the final value" : "the initial value"}, and after 5τ = ${eng(5 * tau, "s", 4)} it is considered settled (99.3%).`
  ];
  const results = [{ label: "Time constant τ", value: eng(tau, "s", 5), text: `τ = ${eng(tau, "s", 5)}` }, { label: "Approximate settling time 5τ", value: eng(5 * tau, "s", 4) }, { label: mode === "charge" ? "the final value" : "the initial value", value: eng(final, unit, 5) }];
  if (t !== null) {
    const v = x(t);
    const other = type === "RC" ? (mode === "charge" ? (Vs - v) / R : -v / R) : mode === "charge" ? Vs - v * R : -v * R;
    results.push({ label: `${type === "RC" ? "Capacitor voltage" : "Inductor current"} at t = ${eng(t, "s")}`, value: eng(v, unit, 4), text: `${qty}(${eng(t, "s")}) = ${eng(v, unit, 4)}` });
    results.push({ label: type === "RC" ? "Circuit current at that point" : "Inductor voltage at that point", value: eng(other, type === "RC" ? "A" : "V", 4) });
    steps.push({ text: `At $t = ${ntex(t)}$ s:`, tex: `${qty}(${ntex(t)}) = ${ntex(v, 6)}\\ ${unit}` });
  }
  if (pct !== null) {
    const tp = mode === "charge" ? -tau * Math.log(1 - pct / 100) : -tau * Math.log(pct / 100);
    results.push({ label: mode === "charge" ? `Time to reach ${fmt(pct)}%` : `Time to fall to ${fmt(pct)}%`, value: eng(tp, "s", 4) });
    steps.push({ text: "We solve the equation for time:", tex: mode === "charge" ? `t = -\\tau\\ln\\left(1 - ${ntex(pct / 100)}\\right) = ${ntex(tp, 6)}\\ s` : `t = -\\tau\\ln(${ntex(pct / 100)}) = ${ntex(tp, 6)}\\ s` });
  }
  if (!isFinite(tau) || tau <= 0) fail("Time constant is not valid.", "R");
  return {
    results, steps, copy: results.map((r) => r.text ?? `${r.label}: ${r.value}`).join("\n"),
    blocks: [{ type: "plot", title: type === "RC" ? "Capacitor voltage" : "Inductor current", xLabel: "t (s)", yLabel: `${qty} (${unit})`, includeZero: true, series: [{ name: qty, points: sampleFunction(x, 0, 6 * tau, 400) }], vlines: [{ x: tau }] }]
  };
}
