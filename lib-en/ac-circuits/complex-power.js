import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Complex power in AC circuits: real, reactive and apparent power, power factor and power triangle, and calculating a correction capacitor for any target power factor.",
  keywords: ["Complex power", "Power factor", "power factor", "Power factor correction", "Power triangle", "Real power", "Reactive power", "kVAR", "Correction capacitor"],
  formulas: [
    { label: "Power triangle", tex: "S = V I^* = P + jQ,\\quad P = VI\\cos\\theta,\\quad Q = VI\\sin\\theta,\\quad |S|^2 = P^2 + Q^2" },
    { label: "Correction capacitor", tex: "Q_C = P(\\tan\\theta_1 - \\tan\\theta_2),\\qquad C = \\frac{Q_C}{\\omega V^2}" }
  ],
  inputs: [
    { id: "mode", label: "Input data", type: "select", default: "ppf", options: [["ppf", "Real power and power factor"], ["vi", "Voltage, current and phase angle"]] },
    { id: "V", label: "Voltage (RMS)", unit: "V", type: "number", default: "400" },
    { id: "P", label: "Real power P", unit: "W", type: "number", default: "50k", when: { mode: ["ppf"] } },
    { id: "pf", label: "Present power factor", type: "number", default: "0.7", when: { mode: ["ppf"] } },
    { id: "I", label: "Current (RMS)", unit: "A", type: "number", default: "10", when: { mode: ["vi"] } },
    { id: "theta", label: "Angle θ = θv − θi", unit: "°", type: "number", default: "36.87", when: { mode: ["vi"] }, help: "Positive for an inductive load (current lags)." },
    { id: "nature", label: "Load type", type: "select", default: "lag", options: [["lag", "Inductive (lagging)"], ["lead", "Capacitive (leading)"]], when: { mode: ["ppf"] } },
    { id: "target", label: "Target power factor (optional)", type: "number", default: "0.95" },
    { id: "f", label: "Grid frequency", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { mode: "ppf", V: "400", P: "50k", pf: "0.7", nature: "lag", target: "0.95", f: "50" }, expect: ["Qc = 34.58 kVAR"], note: "Example: a 50 kW load at 0.7 lagging power factor, corrected to 0.95." },
  invalid: { values: { mode: "ppf", V: "400", P: "50k", pf: "1.3", target: "" } },
  related: ["rlc-circuit", "three-phase", "phasor", "transformer"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Input data", ["ppf", "vi"], "ppf");
  const V = num(input, "V", "Voltage", { positive: true });
  let P, Q, th;
  const steps = [];
  if (mode === "ppf") {
    P = num(input, "P", "Real power", { positive: true });
    const pf = num(input, "pf", "Power factor", { positive: true, max: 1 });
    const lag = choice(input, "nature", "Load type", ["lag", "lead"], "lag") === "lag";
    th = (lag ? 1 : -1) * Math.acos(pf);
    Q = P * Math.tan(th);
    steps.push({ text: "Power angle from the power factor:", tex: `\\theta = ${lag ? "" : "-"}\\cos^{-1}(${ntex(pf)}) = ${ntex((th * 180) / Math.PI, 5)}^\\circ` });
    steps.push({ text: "Reactive and apparent power:", tex: `Q = P\\tan\\theta = ${ntex(Q, 6)}\\ VAR,\\quad |S| = \\frac{P}{PF} = ${ntex(P / pf, 6)}\\ VA` });
  } else {
    const I = num(input, "I", "Current", { positive: true });
    const deg = num(input, "theta", "Angle", { min: -90, max: 90 });
    th = (deg * Math.PI) / 180;
    P = V * I * Math.cos(th);
    Q = V * I * Math.sin(th);
    steps.push({ text: "From voltage, current and angle:", tex: `P = VI\\cos\\theta = ${ntex(P, 6)}\\ W,\\quad Q = VI\\sin\\theta = ${ntex(Q, 6)}\\ VAR` });
  }
  const S = Math.hypot(P, Q), pf = P / S, I = S / V;
  const nature = Math.abs(Q) < 1e-12 * S ? "Resistive" : Q > 0 ? "Inductive (lagging)" : "Capacitive (leading)";
  const results = [
    { label: "Real power P", value: eng(P, "W", 5) },
    { label: "Reactive power Q", value: eng(Q, "VAR", 5) },
    { label: "Apparent power |S|", value: eng(S, "VA", 5) },
    { label: "Power factor", value: `${fmt(pf, 5)} ${nature}` },
    { label: "Current", value: eng(I, "A", 5) }
  ];
  const target = num(input, "target", "Target power factor", { optional: true, positive: true, max: 1 });
  let copy = `P = ${eng(P, "W", 5)}, Q = ${eng(Q, "VAR", 5)}, S = ${eng(S, "VA", 5)}, PF = ${fmt(pf, 5)}`;
  const tri = [[0, 0], [P, 0], [P, Q], [0, 0]];
  const series = [{ name: "Power triangle", points: tri }];
  if (target !== null) {
    if (Q <= 0) fail("The load is not inductive, so capacitor correction does not apply.", "target");
    if (target <= pf) fail(`The target power factor must be greater than the present one (${fmt(pf, 4)}).`, "target");
    const f = num(input, "f", "Frequency", { positive: true });
    const th2 = Math.acos(target);
    const Q2 = P * Math.tan(th2), Qc = Q - Q2;
    const w = 2 * Math.PI * f;
    const Cap = Qc / (w * V * V);
    const I2 = P / target / V;
    steps.push({ text: "Reactive power required after correction:", tex: `Q_2 = P\\tan(\\cos^{-1}${ntex(target)}) = ${ntex(Q2, 6)}\\ VAR` });
    steps.push({ text: "The capacitor must supply the difference:", tex: `Q_C = Q - Q_2 = ${ntex(Qc, 6)}\\ VAR,\\quad C = \\frac{Q_C}{\\omega V^2} = \\frac{${ntex(Qc, 6)}}{${ntex(w, 6)} \\times ${ntex(V)}^2} = ${ntex(Cap, 6)}\\ F` });
    steps.push(`After correction the current drops from ${eng(I, "A", 4)} to ${eng(I2, "A", 4)} for the same real power. The value is for a single capacitor on the input voltage (single-phase).`);
    results.push({ label: "Required capacitor power", value: eng(Qc, "VAR", 4), text: `Qc = ${eng(Qc, "VAR", 4)}` }, { label: "Capacitor size", value: eng(Cap, "F", 4) }, { label: "Current after correction", value: eng(I2, "A", 4) });
    copy += `\nQc = ${eng(Qc, "VAR", 4)}, C = ${eng(Cap, "F", 4)}`;
    series.push({ name: "After correction", points: [[0, 0], [P, Q2]], dashed: true });
  }
  return { results, steps, copy, blocks: [{ type: "plot", title: "Power triangle (P horizontal, Q vertical)", xLabel: "P (W)", yLabel: "Q (VAR)", includeZero: true, series }] };
}
