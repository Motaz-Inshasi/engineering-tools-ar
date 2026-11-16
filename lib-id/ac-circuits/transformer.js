import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Transformator ideal: rasio belitan, tegangan dan arus sekunder serta primer, dan impedansi terpantul, dengan daya dan efisiensi opsional untuk menghitung daya masukan serta rugi-rugi.",
  keywords: ["Transformator", "transformer", "Rasio belitan", "Jumlah lilitan", "Primer", "Sekunder", "Impedansi terpantul", "Step-up", "Step-down"],
  formulas: [
    { label: "Transformator ideal", tex: "a = \\frac{N_1}{N_2} = \\frac{V_1}{V_2} = \\frac{I_2}{I_1}" },
    { label: "Impedansi terpantul", tex: "Z_1' = a^2 Z_L" }
  ],
  inputs: [
    { id: "N1", label: "Lilitan primer N1", type: "number", default: "1000" },
    { id: "N2", label: "Lilitan sekunder N2", type: "number", default: "50" },
    { id: "V1", label: "Tegangan primer V1", unit: "V", type: "number", default: "230" },
    { id: "RL", label: "Hambatan beban pada sekunder", unit: "Ω", type: "number", default: "5" },
    { id: "eff", label: "Efisiensi (opsional)", unit: "%", type: "number" }
  ],
  example: { values: { N1: "1000", N2: "50", V1: "230", RL: "5", eff: "" }, expect: ["V2 = 11.5 V", "I1 = 115 mA"], note: "Contoh: transformator step-down 20:1 dari 230 V ke beban 5 Ω." },
  invalid: { values: { N1: "1000", N2: "0", V1: "230", RL: "5" } },
  related: ["three-phase", "complex-power", "max-power-transfer", "rectifier-ripple"]
};

export function solve(input) {
  const N1 = num(input, "N1", "Lilitan primer", { positive: true });
  const N2 = num(input, "N2", "Lilitan sekunder", { positive: true });
  const V1 = num(input, "V1", "Tegangan primer", { positive: true });
  const RL = num(input, "RL", "Hambatan beban", { positive: true });
  const eff = num(input, "eff", "Efisiensi", { optional: true, positive: true, max: 100 });
  const a = N1 / N2;
  const V2 = V1 / a, I2 = V2 / RL, I1 = I2 / a, Zin = a * a * RL, P = V2 * I2;
  const kind = a > 1 ? "step-down (penurun tegangan)" : a < 1 ? "step-up (penaik tegangan)" : "isolasi (1:1)";
  const steps = [
    { text: `Rasio belitan (transformator ${kind}):`, tex: `a = \\frac{N_1}{N_2} = \\frac{${ntex(N1)}}{${ntex(N2)}} = ${ntex(a, 6)}` },
    { text: "Tegangan sekunder:", tex: `V_2 = \\frac{V_1}{a} = \\frac{${ntex(V1)}}{${ntex(a, 6)}} = ${ntex(V2, 6)}\\ V` },
    { text: "Arus beban, lalu arus primer (arus berbanding terbalik dengan tegangan):", tex: `I_2 = \\frac{V_2}{R_L} = ${ntex(I2, 6)}\\ A,\\quad I_1 = \\frac{I_2}{a} = ${ntex(I1, 6)}\\ A` },
    { text: "Impedansi yang dilihat oleh sumber:", tex: `Z_{in} = a^2 R_L = ${ntex(a, 6)}^2 \\times ${ntex(RL)} = ${ntex(Zin, 6)}\\ \\Omega` },
    `Pada transformator ideal daya kekal: $V_1 I_1 = ${fmt(V1 * I1, 6)}$ W = $V_2 I_2 = ${fmt(P, 6)}$ W.`
  ];
  const results = [
    { label: "Rasio belitan a", value: a, sig: 6 },
    { label: "Jenis", value: kind },
    { label: "Tegangan sekunder V2", value: eng(V2, "V", 4), text: `V2 = ${eng(V2, "V", 4)}` },
    { label: "Arus sekunder I2", value: eng(I2, "A", 4) },
    { label: "Arus primer I1", value: eng(I1, "A", 4), text: `I1 = ${eng(I1, "A", 4)}` },
    { label: "Impedansi terpantul", value: eng(Zin, "Ω", 4) },
    { label: "Daya beban", value: eng(P, "W", 4) }
  ];
  if (eff !== null) {
    const Pin = P / (eff / 100);
    results.push({ label: "Daya masukan", value: eng(Pin, "W", 4) }, { label: "Rugi-rugi", value: eng(Pin - P, "W", 4) }, { label: "Arus primer sebenarnya", value: eng(Pin / V1, "A", 4) });
    steps.push({ text: `Dengan efisiensi ${fmt(eff)}%:`, tex: `P_{in} = \\frac{P_{out}}{\\eta} = ${ntex(Pin, 6)}\\ W,\\quad P_{loss} = ${ntex(Pin - P, 6)}\\ W` });
  }
  if (!isFinite(V2)) fail("Nilai tidak valid.", "N2");
  return { results, steps, copy: `V2 = ${eng(V2, "V", 4)}, I2 = ${eng(I2, "A", 4)}, I1 = ${eng(I1, "A", 4)}` };
}
