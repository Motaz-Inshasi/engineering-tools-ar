import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { logspaceSafe } from "./common.js";

export const meta = {
  description: "Teorema de máxima transferencia de potencia: carga óptima, potencia máxima y eficiencia en ese punto, potencia y eficiencia para cualquier carga que elija, con la curva de potencia frente a la resistencia de carga.",
  keywords: ["Máxima transferencia de potencia", "maximum power transfer", "Resistencia de carga", "Thévenin", "Eficiencia", "Adaptación de impedancias"],
  formulas: [
    { label: "Potencia en la carga", tex: "P_L = \\frac{V_{th}^2 R_L}{(R_{th} + R_L)^2}" },
    { label: "Condición y valor máximo", tex: "R_L = R_{th} \\Rightarrow P_{max} = \\frac{V_{th}^2}{4R_{th}},\\quad \\eta = 50\\%" }
  ],
  inputs: [
    { id: "Vth", label: "Tensión de Thévenin Vth", unit: "V", type: "number", default: "12" },
    { id: "Rth", label: "Resistencia de Thévenin Rth", unit: "Ω", type: "number", default: "8" },
    { id: "RL", label: "Resistencia de carga para comparar (opcional)", unit: "Ω", type: "number", default: "4" }
  ],
  example: { values: { Vth: "12", Rth: "8", RL: "4" }, expect: ["Pmax = 4.5 W"], note: "Ejemplo: fuente de 12 V con resistencia interna de 8 Ω." },
  invalid: { values: { Vth: "12", Rth: "0" } },
  related: ["thevenin-norton", "ohms-law", "transformer"]
};

export function power(Vth, Rth, RL) {
  return (Vth * Vth * RL) / Math.pow(Rth + RL, 2);
}

export function solve(input) {
  const Vth = num(input, "Vth", "Tensión de Thévenin", { nonZero: true });
  const Rth = num(input, "Rth", "Resistencia de Thévenin", { positive: true });
  const RL = num(input, "RL", "Resistencia de carga", { optional: true, nonNegative: true });
  const Pmax = (Vth * Vth) / (4 * Rth);
  const steps = [
    "Derivamos $P_L$ respecto a $R_L$ y la igualamos a cero: la potencia es máxima cuando la resistencia de carga es igual a la resistencia de Thévenin.",
    { tex: `R_L = R_{th} = ${ntex(Rth)}\\ \\Omega,\\qquad P_{max} = \\frac{${ntex(Vth)}^2}{4 \\times ${ntex(Rth)}} = ${ntex(Pmax, 6)}\\ W` },
    "En ese punto la fuente disipa en su interior una potencia igual, por lo que la eficiencia es solo del 50%. Los sistemas de potencia elevada trabajan con más eficiencia con una carga mayor que Rth."
  ];
  const results = [{ label: "Resistencia de carga óptima", value: eng(Rth, "Ω", 4) }, { label: "Potencia máxima", value: eng(Pmax, "W", 4), text: `Pmax = ${eng(Pmax, "W", 4)}` }, { label: "Eficiencia en ese punto", value: "50%" }];
  if (RL !== null) {
    const P = power(Vth, Rth, RL), eff = RL / (Rth + RL);
    results.push({ label: `Potencia en la carga ${eng(RL, "Ω")}`, value: eng(P, "W", 4) }, { label: "Eficiencia para esta carga", value: `${fmt(100 * eff, 4)}%` }, { label: "Porcentaje de la potencia máxima", value: `${fmt((100 * P) / Pmax, 4)}%` });
    steps.push({ text: `Para la carga ${eng(RL, "Ω")}:`, tex: `P_L = \\frac{${ntex(Vth)}^2 \\times ${ntex(RL)}}{(${ntex(Rth)} + ${ntex(RL)})^2} = ${ntex(P, 6)}\\ W,\\quad \\eta = \\frac{R_L}{R_{th} + R_L} = ${ntex(100 * eff, 4)}\\%` });
  }
  const xs = logspaceSafe(Rth / 100, Rth * 100, 300);
  return {
    results, steps, copy: `RL = ${eng(Rth, "Ω")}, Pmax = ${eng(Pmax, "W", 4)}`,
    blocks: [{ type: "plot", title: "Potencia en la carga frente a su resistencia", logX: true, xLabel: "RL (Ω)", yLabel: "P (W)", series: [{ name: "P(RL)", points: xs.map((x) => [x, power(Vth, Rth, x)]) }], vlines: [{ x: Rth }] }]
  };
}
