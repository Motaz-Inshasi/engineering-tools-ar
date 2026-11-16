import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Ideal transformer: turns ratio, secondary and primary voltage and current, and reflected impedance, with power and an optional efficiency to calculate input power and losses.",
  keywords: ["Transformer", "transformer", "Turns ratio", "Number of turns", "Primary", "Secondary", "Reflected impedance", "Step-up", "Step-down"],
  formulas: [
    { label: "Ideal transformer", tex: "a = \\frac{N_1}{N_2} = \\frac{V_1}{V_2} = \\frac{I_2}{I_1}" },
    { label: "Reflected impedance", tex: "Z_1' = a^2 Z_L" }
  ],
  inputs: [
    { id: "N1", label: "Primary turns N1", type: "number", default: "1000" },
    { id: "N2", label: "Secondary turns N2", type: "number", default: "50" },
    { id: "V1", label: "Primary voltage V1", unit: "V", type: "number", default: "230" },
    { id: "RL", label: "Load resistance on the secondary", unit: "Ω", type: "number", default: "5" },
    { id: "eff", label: "Efficiency (optional)", unit: "%", type: "number" }
  ],
  example: { values: { N1: "1000", N2: "50", V1: "230", RL: "5", eff: "" }, expect: ["V2 = 11.5 V", "I1 = 115 mA"], note: "Example: 20:1 step-down transformer from 230 V into a 5 Ω load." },
  invalid: { values: { N1: "1000", N2: "0", V1: "230", RL: "5" } },
  related: ["three-phase", "complex-power", "max-power-transfer", "rectifier-ripple"]
};

export function solve(input) {
  const N1 = num(input, "N1", "Primary turns", { positive: true });
  const N2 = num(input, "N2", "Secondary turns", { positive: true });
  const V1 = num(input, "V1", "Primary voltage", { positive: true });
  const RL = num(input, "RL", "Load resistance", { positive: true });
  const eff = num(input, "eff", "Efficiency", { optional: true, positive: true, max: 100 });
  const a = N1 / N2;
  const V2 = V1 / a, I2 = V2 / RL, I1 = I2 / a, Zin = a * a * RL, P = V2 * I2;
  const kind = a > 1 ? "step-down" : a < 1 ? "step-up" : "isolation (1:1)";
  const steps = [
    { text: `Turns ratio (the ${kind} transformer):`, tex: `a = \\frac{N_1}{N_2} = \\frac{${ntex(N1)}}{${ntex(N2)}} = ${ntex(a, 6)}` },
    { text: "Secondary voltage:", tex: `V_2 = \\frac{V_1}{a} = \\frac{${ntex(V1)}}{${ntex(a, 6)}} = ${ntex(V2, 6)}\\ V` },
    { text: "Load current, then primary current (current is inversely proportional to voltage):", tex: `I_2 = \\frac{V_2}{R_L} = ${ntex(I2, 6)}\\ A,\\quad I_1 = \\frac{I_2}{a} = ${ntex(I1, 6)}\\ A` },
    { text: "Impedance seen by the source:", tex: `Z_{in} = a^2 R_L = ${ntex(a, 6)}^2 \\times ${ntex(RL)} = ${ntex(Zin, 6)}\\ \\Omega` },
    `In an ideal transformer power is conserved: $V_1 I_1 = ${fmt(V1 * I1, 6)}$ W = $V_2 I_2 = ${fmt(P, 6)}$ W.`
  ];
  const results = [
    { label: "Turns ratio a", value: a, sig: 6 },
    { label: "Type", value: kind },
    { label: "Secondary voltage V2", value: eng(V2, "V", 4), text: `V2 = ${eng(V2, "V", 4)}` },
    { label: "Secondary current I2", value: eng(I2, "A", 4) },
    { label: "Primary current I1", value: eng(I1, "A", 4), text: `I1 = ${eng(I1, "A", 4)}` },
    { label: "Reflected impedance", value: eng(Zin, "Ω", 4) },
    { label: "Load power", value: eng(P, "W", 4) }
  ];
  if (eff !== null) {
    const Pin = P / (eff / 100);
    results.push({ label: "Input power", value: eng(Pin, "W", 4) }, { label: "Losses", value: eng(Pin - P, "W", 4) }, { label: "Actual primary current", value: eng(Pin / V1, "A", 4) });
    steps.push({ text: `With efficiency ${fmt(eff)}%:`, tex: `P_{in} = \\frac{P_{out}}{\\eta} = ${ntex(Pin, 6)}\\ W,\\quad P_{loss} = ${ntex(Pin - P, 6)}\\ W` });
  }
  if (!isFinite(V2)) fail("Invalid values.", "N2");
  return { results, steps, copy: `V2 = ${eng(V2, "V", 4)}, I2 = ${eng(I2, "A", 4)}, I1 = ${eng(I1, "A", 4)}` };
}
