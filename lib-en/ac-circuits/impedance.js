import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cfmt, ctex } from "../core/complex.js";
import { zR, zL, zC, deg, cabs } from "./common.js";
import { logspaceSafe } from "../dc-circuits/common.js";

export const meta = {
  description: "Calculate the impedance of a resistor, inductor and capacitor at any frequency: reactance, complex impedance with its magnitude and angle, and admittance, with a reactance-versus-frequency curve.",
  keywords: ["Impedance", "Reactance", "impedance", "reactance", "Inductive reactance", "Capacitive reactance", "Admittance", "admittance"],
  formulas: [
    { label: "Resistor, inductor and capacitor", tex: "Z_R = R,\\qquad Z_L = j\\omega L = jX_L,\\qquad Z_C = \\frac{1}{j\\omega C} = -jX_C" },
    { label: "Reactances", tex: "X_L = 2\\pi f L,\\qquad X_C = \\frac{1}{2\\pi f C},\\qquad Y = \\frac{1}{Z}" }
  ],
  inputs: [
    { id: "el", label: "Element", type: "select", default: "C", options: [["R", "Resistor R"], ["L", "Inductor L"], ["C", "Capacitor C"]] },
    { id: "val", label: "Value (Ω, H or F)", type: "number", default: "10u", help: "For example: 100, 10m, 4.7u or 22n." },
    { id: "f", label: "Frequency f", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { el: "C", val: "10u", f: "50" }, expect: ["Z = -318.31j"], note: "Example: 10 µF capacitor at 50 Hz." },
  invalid: { values: { el: "C", val: "10u", f: "0" } },
  related: ["rlc-circuit", "resonance", "passive-filter", "complex-numbers"]
};

export function solve(input) {
  const el = choice(input, "el", "Element", ["R", "L", "C"], "C");
  const val = num(input, "val", "Value", { positive: true });
  const f = num(input, "f", "Frequency", { positive: true });
  const w = 2 * Math.PI * f;
  const Z = el === "R" ? zR(val) : el === "L" ? zL(val, w) : zC(val, w);
  const X = Z.im;
  const steps = [{ text: "Angular frequency:", tex: `\\omega = 2\\pi f = 2\\pi \\times ${ntex(f)} = ${ntex(w, 6)}\\ \\text{rad/s}` }];
  if (el === "R") steps.push("An ideal resistor does not depend on frequency, and its angle is zero (voltage and current are in phase).");
  if (el === "L") steps.push({ text: "Inductor reactance increases linearly with frequency, and voltage leads current by 90°:", tex: `X_L = \\omega L = ${ntex(w, 6)} \\times ${ntex(val)} = ${ntex(X, 6)}\\ \\Omega,\\quad Z_L = j${ntex(X, 6)}\\ \\Omega` });
  if (el === "C") steps.push({ text: "Capacitor reactance decreases as frequency increases, and current leads voltage by 90°:", tex: `X_C = \\frac{1}{\\omega C} = \\frac{1}{${ntex(w, 6)} \\times ${ntex(val)}} = ${ntex(-X, 6)}\\ \\Omega,\\quad Z_C = -j${ntex(-X, 6)}\\ \\Omega` });
  const Y = { re: Z.re / (cabs(Z) ** 2), im: -Z.im / (cabs(Z) ** 2) };
  steps.push({ text: "Admittance is the reciprocal of impedance:", tex: `Y = \\frac{1}{Z} = ${ctex(Y, 6)}\\ S` });
  const unit = el === "R" ? "Ω" : el === "L" ? "H" : "F";
  const fs = logspaceSafe(f / 100, f * 100, 200);
  const curve = el === "R" ? fs.map((x) => [x, val]) : el === "L" ? fs.map((x) => [x, 2 * Math.PI * x * val]) : fs.map((x) => [x, 1 / (2 * Math.PI * x * val)]);
  return {
    results: [
      { label: "Complex impedance Z", tex: `${ctex(Z, 6)}\\ \\Omega`, text: `Z = ${cfmt(Z, 6)} Ω` },
      { label: "Magnitude |Z|", value: eng(cabs(Z), "Ω", 5) },
      { label: "Angle", value: deg(Z), unit: "°", sig: 4 },
      { label: el === "R" ? "Resistance" : "Reactance", value: eng(Math.abs(el === "R" ? Z.re : X), "Ω", 5) },
      { label: "Admittance Y", text: cfmt(Y, 5), tex: `${ctex(Y, 5)}\\ S` }
    ],
    blocks: [{ type: "plot", title: `${el === "R" ? "Resistance" : "Reactance"} versus frequency for the ${eng(val, unit)} element`, logX: true, xLabel: "f (Hz)", yLabel: "|X| (Ω)", series: [{ name: "|Z|", points: curve }], vlines: [{ x: f }] }],
    steps, copy: `Z = ${cfmt(Z, 6)} Ω (|Z| = ${eng(cabs(Z), "Ω", 5)}, ${fmt(deg(Z), 4)}°)`
  };
}
