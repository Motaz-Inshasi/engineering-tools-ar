import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Puente de Wheatstone: tensión de salida y condición de equilibrio, cálculo de la resistencia desconocida en equilibrio y corriente del galvanómetro mediante el equivalente de Thévenin al introducir su resistencia.",
  keywords: ["Puente de Wheatstone", "wheatstone", "bridge", "Equilibrio del puente", "Resistencia desconocida", "Galvanómetro"],
  formulas: [
    { label: "Tensión de salida (R1 sobre R2 a la izquierda, R3 sobre R4 a la derecha)", tex: "V_{out} = V_s\\left(\\frac{R_2}{R_1 + R_2} - \\frac{R_4}{R_3 + R_4}\\right)" },
    { label: "Condición de equilibrio", tex: "\\frac{R_1}{R_2} = \\frac{R_3}{R_4} \\;\\Rightarrow\\; R_4 = R_3\\frac{R_2}{R_1}" }
  ],
  inputs: [
    { id: "mode", label: "Se pide", type: "select", default: "vout", options: [["vout", "Tensión de salida"], ["balance", "R4 desconocida en el equilibrio"]] },
    { id: "Vs", label: "Tensión de alimentación Vs", unit: "V", type: "number", default: "10", when: { mode: ["vout"] } },
    { id: "R1", label: "R1", unit: "Ω", type: "number", default: "1k" },
    { id: "R2", label: "R2", unit: "Ω", type: "number", default: "1k" },
    { id: "R3", label: "R3", unit: "Ω", type: "number", default: "1k" },
    { id: "R4", label: "R4", unit: "Ω", type: "number", default: "1.1k", when: { mode: ["vout"] } },
    { id: "Rg", label: "Resistencia del galvanómetro Rg (opcional)", unit: "Ω", type: "number", when: { mode: ["vout"] } }
  ],
  example: { values: { mode: "vout", Vs: "10", R1: "1k", R2: "1k", R3: "1k", R4: "1.1k", Rg: "" }, expect: ["Vout = -238.1 mV"], note: "Ejemplo: puente casi equilibrado, con R4 un 10% mayor." },
  invalid: { values: { mode: "vout", Vs: "10", R1: "1k", R2: "-1k", R3: "1k", R4: "1k" } },
  related: ["strain-gauge-bridge", "voltage-current-divider", "thevenin-norton", "rtd"]
};

export function bridge(Vs, R1, R2, R3, R4) {
  return Vs * (R2 / (R1 + R2) - R4 / (R3 + R4));
}

export function solve(input) {
  const mode = choice(input, "mode", "Se pide", ["vout", "balance"], "vout");
  const R1 = num(input, "R1", "R1", { positive: true }), R2 = num(input, "R2", "R2", { positive: true }), R3 = num(input, "R3", "R3", { positive: true });
  if (mode === "balance") {
    const R4 = (R3 * R2) / R1;
    return {
      results: [{ label: "R4 en el equilibrio", value: eng(R4, "Ω", 5), text: `R4 = ${eng(R4, "Ω", 5)}` }],
      steps: [
        "En el equilibrio las tensiones de los dos puntos medios son iguales y no circula corriente por el galvanómetro; esto no depende de la tensión de alimentación.",
        { tex: `\\frac{R_1}{R_2} = \\frac{R_3}{R_4} \\Rightarrow R_4 = R_3\\frac{R_2}{R_1} = ${ntex(R3)} \\times \\frac{${ntex(R2)}}{${ntex(R1)}} = ${ntex(R4, 6)}\\ \\Omega` }
      ],
      copy: `R4 = ${eng(R4, "Ω", 5)}`
    };
  }
  const Vs = num(input, "Vs", "Tensión de alimentación");
  const R4 = num(input, "R4", "R4", { positive: true });
  const Rg = num(input, "Rg", "Resistencia del galvanómetro", { optional: true, positive: true });
  const Va = (Vs * R2) / (R1 + R2), Vb = (Vs * R4) / (R3 + R4), Vout = Va - Vb;
  const balanced = Math.abs(R1 * R4 - R2 * R3) <= 1e-12 * R1 * R4;
  const steps = [
    { text: "Tensión del punto medio izquierdo (divisor R1-R2):", tex: `V_a = ${ntex(Vs)}\\frac{${ntex(R2)}}{${ntex(R1)} + ${ntex(R2)}} = ${ntex(Va, 6)}\\ V` },
    { text: "Tensión del punto medio derecho (divisor R3-R4):", tex: `V_b = ${ntex(Vs)}\\frac{${ntex(R4)}}{${ntex(R3)} + ${ntex(R4)}} = ${ntex(Vb, 6)}\\ V` },
    { text: "La tensión de salida es la diferencia entre ellas:", tex: `V_{out} = V_a - V_b = ${ntex(Vout, 6)}\\ V` },
    balanced ? "Las dos razones son iguales, por lo que el puente está equilibrado." : `El puente no está equilibrado: $R_1 R_4 = ${ntex(R1 * R4, 6)}$, mientras que $R_2 R_3 = ${ntex(R2 * R3, 6)}$.`
  ];
  const results = [{ label: "Tensión de salida Vout", value: eng(Vout, "V", 4), text: `Vout = ${eng(Vout, "V", 4)}` }, { label: "Va", value: eng(Va, "V", 5) }, { label: "Vb", value: eng(Vb, "V", 5) }, { label: "Estado", value: balanced ? "Equilibrado" : "Desequilibrado" }];
  if (Rg !== null) {
    const Rth = (R1 * R2) / (R1 + R2) + (R3 * R4) / (R3 + R4);
    const Ig = Vout / (Rth + Rg);
    steps.push({ text: "Con el equivalente de Thévenin entre los puntos medios (fuente en cortocircuito):", tex: `R_{th} = R_1 \\parallel R_2 + R_3 \\parallel R_4 = ${ntex(Rth, 6)}\\ \\Omega,\\quad I_g = \\frac{V_{out}}{R_{th} + R_g} = ${ntex(Ig, 6)}\\ A` });
    results.push({ label: "Resistencia de Thévenin del puente", value: eng(Rth, "Ω", 4) }, { label: "Corriente del galvanómetro", value: eng(Ig, "A", 4) });
  }
  return { results, steps, copy: `Vout = ${eng(Vout, "V", 4)}` };
}
