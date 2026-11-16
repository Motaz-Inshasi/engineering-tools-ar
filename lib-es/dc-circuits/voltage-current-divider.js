import { numList, choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Divisor de tensión con dos resistencias y el efecto de la carga, y divisor de corriente para cualquier número de ramas en paralelo, con los pasos y la comprobación con las leyes de Kirchhoff.",
  keywords: ["Divisor de tensión", "Divisor de corriente", "voltage divider", "current divider", "Efecto de la carga", "loading"],
  formulas: [
    { label: "Divisor de tensión", tex: "V_{out} = V_{in}\\frac{R_2}{R_1 + R_2}" },
    { label: "Divisor de corriente", tex: "I_k = I_T \\frac{G_k}{\\sum G_i} = I_T\\frac{1/R_k}{\\sum 1/R_i}" }
  ],
  inputs: [
    { id: "mode", label: "Tipo", type: "select", default: "voltage", options: [["voltage", "Divisor de tensión"], ["current", "Divisor de corriente"]] },
    { id: "Vin", label: "Tensión de entrada Vin", unit: "V", type: "number", default: "12", when: { mode: ["voltage"] } },
    { id: "R1", label: "R1 (superior)", unit: "Ω", type: "number", default: "10k", when: { mode: ["voltage"] } },
    { id: "R2", label: "R2 (inferior)", unit: "Ω", type: "number", default: "4.7k", when: { mode: ["voltage"] } },
    { id: "RL", label: "Resistencia de carga en R2 (opcional)", unit: "Ω", type: "number", when: { mode: ["voltage"] } },
    { id: "IT", label: "Corriente total IT", unit: "A", type: "number", default: "10m", when: { mode: ["current"] } },
    { id: "list", label: "Resistencias de las ramas en paralelo", unit: "Ω", type: "text", default: "1k, 2.2k, 4.7k", when: { mode: ["current"] } }
  ],
  example: { values: { mode: "voltage", Vin: "12", R1: "10k", R2: "4.7k", RL: "10k" }, expect: ["Vout = 2.907 V"], note: "Ejemplo: divisor de 10k y 4.7k a 12 V; una carga de 10k reduce la salida." },
  invalid: { values: { mode: "voltage", Vin: "12", R1: "0", R2: "4.7k" } },
  related: ["series-parallel-resistors", "sensor-divider", "level-shifter", "wheatstone-bridge"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Tipo", ["voltage", "current"], "voltage");
  if (mode === "voltage") {
    const Vin = num(input, "Vin", "Tensión de entrada");
    const R1 = num(input, "R1", "R1", { positive: true });
    const R2 = num(input, "R2", "R2", { positive: true });
    const RL = num(input, "RL", "Resistencia de carga", { optional: true, positive: true });
    const unloaded = (Vin * R2) / (R1 + R2);
    const steps = [{ text: "Sin carga:", tex: `V_{out} = ${ntex(Vin)} \\times \\frac{${ntex(R2)}}{${ntex(R1)} + ${ntex(R2)}} = ${ntex(unloaded, 6)}\\ V` }];
    let Vout = unloaded, R2eff = R2;
    const results = [];
    if (RL !== null) {
      R2eff = (R2 * RL) / (R2 + RL);
      Vout = (Vin * R2eff) / (R1 + R2eff);
      steps.push({ text: "La carga está en paralelo con R2 y reduce su resistencia efectiva:", tex: `R_2 \\parallel R_L = \\frac{${ntex(R2)} \\times ${ntex(RL)}}{${ntex(R2)} + ${ntex(RL)}} = ${ntex(R2eff, 6)}\\ \\Omega` });
      steps.push({ tex: `V_{out} = ${ntex(Vin)} \\times \\frac{${ntex(R2eff, 6)}}{${ntex(R1)} + ${ntex(R2eff, 6)}} = ${ntex(Vout, 6)}\\ V` });
      steps.push(`La salida bajó un ${fmt((100 * (unloaded - Vout)) / (unloaded || 1), 4)}% por la carga. Para reducir el efecto, haga la carga al menos diez veces mayor que R2.`);
      results.push({ label: "Tensión sin carga", value: eng(unloaded, "V", 4) });
    }
    const I = Vin / (R1 + R2eff);
    steps.push({ text: "Corriente del divisor y comprobación LVK:", tex: `I = \\frac{V_{in}}{R_1 + R_{2,eff}} = ${ntex(I, 6)}\\ A,\\quad I R_1 + V_{out} = ${ntex(I * R1 + Vout, 8)}\\ V` });
    return {
      results: [{ label: "Tensión de salida Vout", value: eng(Vout, "V", 4), text: `Vout = ${eng(Vout, "V", 4)}` }, ...results, { label: "Relación de división", value: Vout / Vin, sig: 6 }, { label: "Corriente del divisor", value: eng(I, "A", 4) }, { label: "Potencia en R1", value: eng(I * I * R1, "W", 4) }],
      steps, copy: `Vout = ${eng(Vout, "V", 4)}`
    };
  }
  const IT = num(input, "IT", "Corriente total");
  const list = numList(input, "list", "Resistencias de las ramas", { positive: true, min: 2, max: 20 });
  const Gt = list.reduce((s, r) => s + 1 / r, 0);
  const V = IT / Gt;
  const currents = list.map((r) => V / r);
  const steps = [
    { text: "Suma de las conductancias:", tex: `G_T = ${list.map((r) => `\\frac{1}{${ntex(r)}}`).join(" + ")} = ${ntex(Gt, 6)}\\ S` },
    { text: "Tensión común en las ramas:", tex: `V = \\frac{I_T}{G_T} = ${ntex(V, 6)}\\ V` },
    ...list.map((r, k) => ({ tex: `I_{${k + 1}} = I_T\\frac{1/${ntex(r)}}{G_T} = ${ntex(currents[k], 6)}\\ A` })),
    `Comprobación LCK: la suma de las corrientes de las ramas es ${eng(currents.reduce((a, b) => a + b, 0), "A", 6)}, que es igual a la corriente total.`
  ];
  if (list.length === 2) steps.push(`Para solo dos ramas: $I_1 = I_T \\frac{R_2}{R_1 + R_2}$; es decir, la rama de menor resistencia toma la mayor corriente.`);
  return {
    results: [...currents.map((c, k) => ({ label: `Corriente de la rama ${k + 1} (R = ${eng(list[k], "Ω")})`, value: eng(c, "A", 4), text: `I${k + 1} = ${eng(c, "A", 4)}` })), { label: "Tensión común", value: eng(V, "V", 4) }],
    steps, copy: currents.map((c, k) => `I${k + 1} = ${eng(c, "A", 4)}`).join("\n")
  };
}
