import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Wheatstone bridge: output voltage and balance condition, calculation of the unknown resistance at balance, and the galvanometer current using the Thevenin equivalent when its resistance is entered.",
  keywords: ["Wheatstone bridge", "wheatstone", "bridge", "Bridge balance", "Unknown resistance", "Galvanometer"],
  formulas: [
    { label: "Output voltage (R1 above R2 on the left, R3 above R4 on the right)", tex: "V_{out} = V_s\\left(\\frac{R_2}{R_1 + R_2} - \\frac{R_4}{R_3 + R_4}\\right)" },
    { label: "Balance condition", tex: "\\frac{R_1}{R_2} = \\frac{R_3}{R_4} \\;\\Rightarrow\\; R_4 = R_3\\frac{R_2}{R_1}" }
  ],
  inputs: [
    { id: "mode", label: "Required result", type: "select", default: "vout", options: [["vout", "Output voltage"], ["balance", "Unknown R4 at balance"]] },
    { id: "Vs", label: "Supply voltage Vs", unit: "V", type: "number", default: "10", when: { mode: ["vout"] } },
    { id: "R1", label: "R1", unit: "Ω", type: "number", default: "1k" },
    { id: "R2", label: "R2", unit: "Ω", type: "number", default: "1k" },
    { id: "R3", label: "R3", unit: "Ω", type: "number", default: "1k" },
    { id: "R4", label: "R4", unit: "Ω", type: "number", default: "1.1k", when: { mode: ["vout"] } },
    { id: "Rg", label: "Galvanometer resistance Rg (optional)", unit: "Ω", type: "number", when: { mode: ["vout"] } }
  ],
  example: { values: { mode: "vout", Vs: "10", R1: "1k", R2: "1k", R3: "1k", R4: "1.1k", Rg: "" }, expect: ["Vout = -238.1 mV"], note: "Example: an almost balanced bridge, with R4 10% larger." },
  invalid: { values: { mode: "vout", Vs: "10", R1: "1k", R2: "-1k", R3: "1k", R4: "1k" } },
  related: ["strain-gauge-bridge", "voltage-current-divider", "thevenin-norton", "rtd"]
};

export function bridge(Vs, R1, R2, R3, R4) {
  return Vs * (R2 / (R1 + R2) - R4 / (R3 + R4));
}

export function solve(input) {
  const mode = choice(input, "mode", "Required result", ["vout", "balance"], "vout");
  const R1 = num(input, "R1", "R1", { positive: true }), R2 = num(input, "R2", "R2", { positive: true }), R3 = num(input, "R3", "R3", { positive: true });
  if (mode === "balance") {
    const R4 = (R3 * R2) / R1;
    return {
      results: [{ label: "R4 at balance", value: eng(R4, "Ω", 5), text: `R4 = ${eng(R4, "Ω", 5)}` }],
      steps: [
        "At balance the voltages of the two midpoints are equal, so no current flows through the galvanometer; this does not depend on the supply voltage.",
        { tex: `\\frac{R_1}{R_2} = \\frac{R_3}{R_4} \\Rightarrow R_4 = R_3\\frac{R_2}{R_1} = ${ntex(R3)} \\times \\frac{${ntex(R2)}}{${ntex(R1)}} = ${ntex(R4, 6)}\\ \\Omega` }
      ],
      copy: `R4 = ${eng(R4, "Ω", 5)}`
    };
  }
  const Vs = num(input, "Vs", "Supply voltage");
  const R4 = num(input, "R4", "R4", { positive: true });
  const Rg = num(input, "Rg", "Galvanometer resistance", { optional: true, positive: true });
  const Va = (Vs * R2) / (R1 + R2), Vb = (Vs * R4) / (R3 + R4), Vout = Va - Vb;
  const balanced = Math.abs(R1 * R4 - R2 * R3) <= 1e-12 * R1 * R4;
  const steps = [
    { text: "Voltage of the left midpoint (divider R1-R2):", tex: `V_a = ${ntex(Vs)}\\frac{${ntex(R2)}}{${ntex(R1)} + ${ntex(R2)}} = ${ntex(Va, 6)}\\ V` },
    { text: "Voltage of the right midpoint (divider R3-R4):", tex: `V_b = ${ntex(Vs)}\\frac{${ntex(R4)}}{${ntex(R3)} + ${ntex(R4)}} = ${ntex(Vb, 6)}\\ V` },
    { text: "The output voltage is the difference between them:", tex: `V_{out} = V_a - V_b = ${ntex(Vout, 6)}\\ V` },
    balanced ? "The two ratios are equal, so the bridge is balanced." : `The bridge is unbalanced: $R_1 R_4 = ${ntex(R1 * R4, 6)}$ while $R_2 R_3 = ${ntex(R2 * R3, 6)}$.`
  ];
  const results = [{ label: "Output voltage Vout", value: eng(Vout, "V", 4), text: `Vout = ${eng(Vout, "V", 4)}` }, { label: "Va", value: eng(Va, "V", 5) }, { label: "Vb", value: eng(Vb, "V", 5) }, { label: "Status", value: balanced ? "balanced" : "unbalanced" }];
  if (Rg !== null) {
    const Rth = (R1 * R2) / (R1 + R2) + (R3 * R4) / (R3 + R4);
    const Ig = Vout / (Rth + Rg);
    steps.push({ text: "Using the Thevenin equivalent between the midpoints (source shorted):", tex: `R_{th} = R_1 \\parallel R_2 + R_3 \\parallel R_4 = ${ntex(Rth, 6)}\\ \\Omega,\\quad I_g = \\frac{V_{out}}{R_{th} + R_g} = ${ntex(Ig, 6)}\\ A` });
    results.push({ label: "Thevenin resistance of the bridge", value: eng(Rth, "Ω", 4) }, { label: "Galvanometer current", value: eng(Ig, "A", 4) });
  }
  return { results, steps, copy: `Vout = ${eng(Vout, "V", 4)}` };
}
