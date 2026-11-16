import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Diseñe la medida de corriente con resistencia shunt: valor de la resistencia para una caída de tensión dada, potencia disipada y potencia recomendada, ganancia del amplificador para llenar el rango del ADC y precisión de la medida en amperios por paso.",
  keywords: ["Shunt", "shunt", "Medida de corriente", "current sense", "Resistencia pequeña", "Amplificador de corriente", "INA", "ADC"],
  formulas: [
    { label: "Resistencia shunt y potencia", tex: "R_{sh} = \\frac{V_{sh,max}}{I_{max}},\\qquad P = I_{max}^2 R_{sh}" },
    { label: "Ganancia y precisión", tex: "G = \\frac{V_{ref}}{V_{sh,max}},\\qquad \\Delta I = \\frac{V_{ref}}{2^N\\, G\\, R_{sh}}" }
  ],
  inputs: [
    { id: "Imax", label: "Corriente máxima", unit: "A", type: "number", default: "10" },
    { id: "Vsh", label: "Caída máxima en el shunt", unit: "V", type: "number", default: "100m", help: "Normalmente 50, 75 o 100 mV." },
    { id: "Vref", label: "Rango del ADC", unit: "V", type: "number", default: "3.3" },
    { id: "N", label: "Resolución del ADC", unit: "bits", type: "number", default: "12" }
  ],
  example: { values: { Imax: "10", Vsh: "100m", Vref: "3.3", N: "12" }, expect: ["Rsh = 10 mΩ", "G = 33"], note: "Ejemplo: medida hasta 10 A con caída de 100 mV y ADC de 12 bits." },
  invalid: { values: { Imax: "10", Vsh: "0", Vref: "3.3", N: "12" } },
  related: ["ohms-law", "adc", "op-amp", "sample-rate-resolution"]
};

export function solve(input) {
  const Imax = num(input, "Imax", "Corriente máxima", { positive: true });
  const Vsh = num(input, "Vsh", "Caída en el shunt", { positive: true });
  const Vref = num(input, "Vref", "Rango del ADC", { positive: true });
  const N = num(input, "N", "Resolución del ADC", { integer: true, min: 1, max: 32 });
  const R = Vsh / Imax, P = Imax * Imax * R;
  const rating = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10, 20, 50, 100].find((w) => w >= 2 * P) ?? 2 * P;
  const G = Vref / Vsh;
  const dI = Vref / Math.pow(2, N) / G / R;
  const steps = [
    { text: "Valor de la resistencia por la ley de Ohm a la corriente máxima:", tex: `R_{sh} = \\frac{${ntex(Vsh)}}{${ntex(Imax)}} = ${ntex(R, 5)}\\ \\Omega` },
    { text: "Potencia disipada a la corriente máxima:", tex: `P = I^2 R = ${ntex(Imax)}^2 \\times ${ntex(R, 5)} = ${ntex(P, 5)}\\ W` },
    `Elegimos una resistencia con al menos el doble de esa potencia: ${fmt(rating)} W, con tolerancia de 1% o mejor y bajo coeficiente térmico, y la conectamos en configuración Kelvin (cuatro terminales) para evitar la resistencia de los cables.`,
    { text: "Ganancia del amplificador para que la caída máxima iguale el rango del ADC:", tex: `G = \\frac{${ntex(Vref)}}{${ntex(Vsh)}} = ${ntex(G, 5)}` },
    { text: "Menor cambio de corriente que se puede distinguir:", tex: `\\Delta I = \\frac{${ntex(Vref)}}{2^{${N}} \\times ${ntex(G, 5)} \\times ${ntex(R, 5)}} = ${ntex(dI, 5)}\\ A` }
  ];
  return {
    results: [
      { label: "Resistencia shunt", value: eng(R, "Ω", 4), text: `Rsh = ${eng(R, "Ω", 4)}` },
      { label: "Potencia disipada", value: eng(P, "W", 4) },
      { label: "Potencia recomendada", value: `${fmt(rating)} W` },
      { label: "Ganancia del amplificador", value: G, sig: 5, text: `G = ${fmt(G, 5)}` },
      { label: "Precisión de la medida por paso", value: eng(dI, "A", 4) }
    ],
    steps, copy: `Rsh = ${eng(R, "Ω", 4)}, P = ${eng(P, "W", 4)}, G = ${fmt(G, 5)}, ΔI = ${eng(dI, "A", 4)}`
  };
}
