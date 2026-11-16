import { numList, choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Voltage divider with two resistors including loading, and current divider for any number of parallel branches, with steps and a check using Kirchhoff's laws.",
  keywords: ["Voltage divider", "Current divider", "voltage divider", "current divider", "Loading effect", "loading"],
  formulas: [
    { label: "Voltage divider", tex: "V_{out} = V_{in}\\frac{R_2}{R_1 + R_2}" },
    { label: "Current divider", tex: "I_k = I_T \\frac{G_k}{\\sum G_i} = I_T\\frac{1/R_k}{\\sum 1/R_i}" }
  ],
  inputs: [
    { id: "mode", label: "Type", type: "select", default: "voltage", options: [["voltage", "Voltage divider"], ["current", "Current divider"]] },
    { id: "Vin", label: "Input voltage Vin", unit: "V", type: "number", default: "12", when: { mode: ["voltage"] } },
    { id: "R1", label: "R1 (top)", unit: "Ω", type: "number", default: "10k", when: { mode: ["voltage"] } },
    { id: "R2", label: "R2 (bottom)", unit: "Ω", type: "number", default: "4.7k", when: { mode: ["voltage"] } },
    { id: "RL", label: "Load resistance across R2 (optional)", unit: "Ω", type: "number", when: { mode: ["voltage"] } },
    { id: "IT", label: "Total current IT", unit: "A", type: "number", default: "10m", when: { mode: ["current"] } },
    { id: "list", label: "Resistances of the parallel branches", unit: "Ω", type: "text", default: "1k, 2.2k, 4.7k", when: { mode: ["current"] } }
  ],
  example: { values: { mode: "voltage", Vin: "12", R1: "10k", R2: "4.7k", RL: "10k" }, expect: ["Vout = 2.907 V"], note: "Example: divider of 10k and 4.7k from 12 V, with a 10k load that lowers the output." },
  invalid: { values: { mode: "voltage", Vin: "12", R1: "0", R2: "4.7k" } },
  related: ["series-parallel-resistors", "sensor-divider", "level-shifter", "wheatstone-bridge"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Type", ["voltage", "current"], "voltage");
  if (mode === "voltage") {
    const Vin = num(input, "Vin", "Input voltage");
    const R1 = num(input, "R1", "R1", { positive: true });
    const R2 = num(input, "R2", "R2", { positive: true });
    const RL = num(input, "RL", "Load resistance", { optional: true, positive: true });
    const unloaded = (Vin * R2) / (R1 + R2);
    const steps = [{ text: "Unloaded:", tex: `V_{out} = ${ntex(Vin)} \\times \\frac{${ntex(R2)}}{${ntex(R1)} + ${ntex(R2)}} = ${ntex(unloaded, 6)}\\ V` }];
    let Vout = unloaded, R2eff = R2;
    const results = [];
    if (RL !== null) {
      R2eff = (R2 * RL) / (R2 + RL);
      Vout = (Vin * R2eff) / (R1 + R2eff);
      steps.push({ text: "The load is in parallel with R2, which lowers its effective resistance:", tex: `R_2 \\parallel R_L = \\frac{${ntex(R2)} \\times ${ntex(RL)}}{${ntex(R2)} + ${ntex(RL)}} = ${ntex(R2eff, 6)}\\ \\Omega` });
      steps.push({ tex: `V_{out} = ${ntex(Vin)} \\times \\frac{${ntex(R2eff, 6)}}{${ntex(R1)} + ${ntex(R2eff, 6)}} = ${ntex(Vout, 6)}\\ V` });
      steps.push(`The output dropped by ${fmt((100 * (unloaded - Vout)) / (unloaded || 1), 4)}% due to the load. To reduce the effect, make the load at least ten times larger than R2.`);
      results.push({ label: "Unloaded voltage", value: eng(unloaded, "V", 4) });
    }
    const I = Vin / (R1 + R2eff);
    steps.push({ text: "Divider current and KVL check:", tex: `I = \\frac{V_{in}}{R_1 + R_{2,eff}} = ${ntex(I, 6)}\\ A,\\quad I R_1 + V_{out} = ${ntex(I * R1 + Vout, 8)}\\ V` });
    return {
      results: [{ label: "Output voltage Vout", value: eng(Vout, "V", 4), text: `Vout = ${eng(Vout, "V", 4)}` }, ...results, { label: "Division ratio", value: Vout / Vin, sig: 6 }, { label: "Divider current", value: eng(I, "A", 4) }, { label: "Power in R1", value: eng(I * I * R1, "W", 4) }],
      steps, copy: `Vout = ${eng(Vout, "V", 4)}`
    };
  }
  const IT = num(input, "IT", "Total current");
  const list = numList(input, "list", "Branch resistances", { positive: true, min: 2, max: 20 });
  const Gt = list.reduce((s, r) => s + 1 / r, 0);
  const V = IT / Gt;
  const currents = list.map((r) => V / r);
  const steps = [
    { text: "Sum of conductances:", tex: `G_T = ${list.map((r) => `\\frac{1}{${ntex(r)}}`).join(" + ")} = ${ntex(Gt, 6)}\\ S` },
    { text: "Common voltage across the branches:", tex: `V = \\frac{I_T}{G_T} = ${ntex(V, 6)}\\ V` },
    ...list.map((r, k) => ({ tex: `I_{${k + 1}} = I_T\\frac{1/${ntex(r)}}{G_T} = ${ntex(currents[k], 6)}\\ A` })),
    `KCL check: the sum of the branch currents = ${eng(currents.reduce((a, b) => a + b, 0), "A", 6)}, which equals the total current.`
  ];
  if (list.length === 2) steps.push(`For only two branches: $I_1 = I_T \\frac{R_2}{R_1 + R_2}$, meaning the branch with the smaller resistance takes the larger current.`);
  return {
    results: [...currents.map((c, k) => ({ label: `Branch ${k + 1} current (R = ${eng(list[k], "Ω")})`, value: eng(c, "A", 4), text: `I${k + 1} = ${eng(c, "A", 4)}` })), { label: "Common voltage", value: eng(V, "V", 4) }],
    steps, copy: currents.map((c, k) => `I${k + 1} = ${eng(c, "A", 4)}`).join("\n")
  };
}
