import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Transformador ideal: relación de transformación, tensión y corriente del primario y del secundario, e impedancia reflejada, con potencia y rendimiento opcional para calcular la potencia de entrada y las pérdidas.",
  keywords: ["Transformador", "transformer", "Relación de transformación", "Número de espiras", "Primario", "Secundario", "Impedancia reflejada", "Elevador", "Reductor"],
  formulas: [
    { label: "Transformador ideal", tex: "a = \\frac{N_1}{N_2} = \\frac{V_1}{V_2} = \\frac{I_2}{I_1}" },
    { label: "Impedancia reflejada", tex: "Z_1' = a^2 Z_L" }
  ],
  inputs: [
    { id: "N1", label: "Espiras del primario N1", type: "number", default: "1000" },
    { id: "N2", label: "Espiras del secundario N2", type: "number", default: "50" },
    { id: "V1", label: "Tensión del primario V1", unit: "V", type: "number", default: "230" },
    { id: "RL", label: "Resistencia de carga en el secundario", unit: "Ω", type: "number", default: "5" },
    { id: "eff", label: "Rendimiento (opcional)", unit: "%", type: "number" }
  ],
  example: { values: { N1: "1000", N2: "50", V1: "230", RL: "5", eff: "" }, expect: ["V2 = 11.5 V", "I1 = 115 mA"], note: "Ejemplo: transformador reductor 20:1 desde 230 V para una carga de 5 Ω." },
  invalid: { values: { N1: "1000", N2: "0", V1: "230", RL: "5" } },
  related: ["three-phase", "complex-power", "max-power-transfer", "rectifier-ripple"]
};

export function solve(input) {
  const N1 = num(input, "N1", "Espiras del primario", { positive: true });
  const N2 = num(input, "N2", "Espiras del secundario", { positive: true });
  const V1 = num(input, "V1", "Tensión del primario", { positive: true });
  const RL = num(input, "RL", "Resistencia de carga", { positive: true });
  const eff = num(input, "eff", "Rendimiento", { optional: true, positive: true, max: 100 });
  const a = N1 / N2;
  const V2 = V1 / a, I2 = V2 / RL, I1 = I2 / a, Zin = a * a * RL, P = V2 * I2;
  const kind = a > 1 ? "Reductor de tensión" : a < 1 ? "Elevador de tensión" : "Aislador (1:1)";
  const steps = [
    { text: `Relación de transformación (transformador ${kind}):`, tex: `a = \\frac{N_1}{N_2} = \\frac{${ntex(N1)}}{${ntex(N2)}} = ${ntex(a, 6)}` },
    { text: "Tensión del secundario:", tex: `V_2 = \\frac{V_1}{a} = \\frac{${ntex(V1)}}{${ntex(a, 6)}} = ${ntex(V2, 6)}\\ V` },
    { text: "Corriente de carga y luego corriente del primario (la corriente es inversamente proporcional a la tensión):", tex: `I_2 = \\frac{V_2}{R_L} = ${ntex(I2, 6)}\\ A,\\quad I_1 = \\frac{I_2}{a} = ${ntex(I1, 6)}\\ A` },
    { text: "Impedancia que ve la fuente:", tex: `Z_{in} = a^2 R_L = ${ntex(a, 6)}^2 \\times ${ntex(RL)} = ${ntex(Zin, 6)}\\ \\Omega` },
    `En el transformador ideal la potencia se conserva: $V_1 I_1 = ${fmt(V1 * I1, 6)}$ W = $V_2 I_2 = ${fmt(P, 6)}$ W.`
  ];
  const results = [
    { label: "Relación de transformación a", value: a, sig: 6 },
    { label: "Tipo", value: kind },
    { label: "Tensión del secundario V2", value: eng(V2, "V", 4), text: `V2 = ${eng(V2, "V", 4)}` },
    { label: "Corriente del secundario I2", value: eng(I2, "A", 4) },
    { label: "Corriente del primario I1", value: eng(I1, "A", 4), text: `I1 = ${eng(I1, "A", 4)}` },
    { label: "Impedancia reflejada", value: eng(Zin, "Ω", 4) },
    { label: "Potencia de la carga", value: eng(P, "W", 4) }
  ];
  if (eff !== null) {
    const Pin = P / (eff / 100);
    results.push({ label: "Potencia de entrada", value: eng(Pin, "W", 4) }, { label: "Pérdidas", value: eng(Pin - P, "W", 4) }, { label: "Corriente real del primario", value: eng(Pin / V1, "A", 4) });
    steps.push({ text: `Con rendimiento ${fmt(eff)}%:`, tex: `P_{in} = \\frac{P_{out}}{\\eta} = ${ntex(Pin, 6)}\\ W,\\quad P_{loss} = ${ntex(Pin - P, 6)}\\ W` });
  }
  if (!isFinite(V2)) fail("Valores no válidos.", "N2");
  return { results, steps, copy: `V2 = ${eng(V2, "V", 4)}, I2 = ${eng(I2, "A", 4)}, I1 = ${eng(I1, "A", 4)}` };
}
