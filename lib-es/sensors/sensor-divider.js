import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";
import { logspaceSafe } from "../dc-circuits/common.js";

export const meta = {
  description: "Diseñe un divisor de tensión para un sensor resistivo (termistor, LDR, potenciómetro): mejor resistencia fija para el mayor rango de salida, rango de tensión y sensibilidad, con la curva de salida frente a la resistencia del sensor.",
  keywords: ["Divisor de tensión del sensor", "LDR", "Termistor", "Sensor resistivo", "Resistencia fija", "Rango de salida", "sensor divider"],
  formulas: [
    { label: "Sensor en la parte inferior", tex: "V_{out} = V_{cc}\\frac{R_s}{R_s + R}" },
    { label: "Resistencia óptima para el mayor rango", tex: "R_{opt} = \\sqrt{R_{s,min} R_{s,max}}" }
  ],
  inputs: [
    { id: "Rmin", label: "Resistencia mínima del sensor", unit: "Ω", type: "number", default: "1k" },
    { id: "Rmax", label: "Resistencia máxima del sensor", unit: "Ω", type: "number", default: "100k" },
    { id: "Vcc", label: "Tensión de alimentación", unit: "V", type: "number", default: "5" },
    { id: "pos", label: "Posición del sensor", type: "select", default: "bottom", options: [["bottom", "Abajo (entre la salida y tierra)"], ["top", "Arriba (entre la alimentación y la salida)"]] },
    { id: "R", label: "Resistencia fija (opcional; si no, se calcula la óptima)", unit: "Ω", type: "number" }
  ],
  example: { values: { Rmin: "1k", Rmax: "100k", Vcc: "5", pos: "bottom", R: "" }, expect: ["Ropt = 10 kΩ", "V(Rmax) = 4.545 V"], note: "Ejemplo: LDR que varía de 1 kΩ a 100 kΩ." },
  invalid: { values: { Rmin: "100k", Rmax: "1k", Vcc: "5", pos: "bottom" } },
  related: ["voltage-current-divider", "thermistor", "adc", "level-shifter"]
};

export function vout(Vcc, Rs, R, pos) {
  return pos === "bottom" ? (Vcc * Rs) / (Rs + R) : (Vcc * R) / (Rs + R);
}

export function solve(input) {
  const Rmin = num(input, "Rmin", "Resistencia mínima", { positive: true });
  const Rmax = num(input, "Rmax", "Resistencia máxima", { positive: true });
  const Vcc = num(input, "Vcc", "Tensión de alimentación", { positive: true });
  const pos = choice(input, "pos", "Posición", ["bottom", "top"], "bottom");
  if (Rmax <= Rmin) fail("La resistencia máxima debe ser mayor que la mínima.", "Rmax");
  const Ropt = Math.sqrt(Rmin * Rmax);
  const Rin = num(input, "R", "Resistencia fija", { optional: true, positive: true });
  const R = Rin ?? nearest(Ropt, "E24").closest;
  const v1 = vout(Vcc, Rmin, R, pos), v2 = vout(Vcc, Rmax, R, pos);
  const span = Math.abs(v2 - v1);
  const steps = [
    { text: "Derivando, el rango de salida es máximo cuando la resistencia fija iguala la media geométrica de los extremos del sensor:", tex: `R_{opt} = \\sqrt{${ntex(Rmin)} \\times ${ntex(Rmax)}} = ${ntex(Ropt, 5)}\\ \\Omega` },
    Rin === null ? `Elegimos el valor normalizado E24 más próximo: ${eng(R, "Ω")}.` : `Usamos la resistencia introducida ${eng(R, "Ω")}.`,
    { text: "Salida en los extremos del rango del sensor:", tex: `V(R_{min}) = ${ntex(v1, 5)}\\ V,\\quad V(R_{max}) = ${ntex(v2, 5)}\\ V` },
    `Rango de salida ${fmt(span, 4)} V de ${fmt(Vcc)} V (${fmt((100 * span) / Vcc, 3)}%). Corriente máxima del divisor ${eng(Vcc / (Rmin + R), "A", 3)}; tenga en cuenta el autocalentamiento del sensor.`
  ];
  const xs = logspaceSafe(Rmin / 2, Rmax * 2, 200);
  return {
    results: [
      { label: "Resistencia óptima", value: eng(Ropt, "Ω", 4), text: `Ropt = ${eng(Ropt, "Ω", 4)}` },
      { label: "Resistencia utilizada", value: eng(R, "Ω") },
      { label: "Salida con la resistencia mínima", value: eng(v1, "V", 4), text: `V(Rmin) = ${eng(v1, "V", 4)}` },
      { label: "Salida con la resistencia máxima", value: eng(v2, "V", 4), text: `V(Rmax) = ${eng(v2, "V", 4)}` },
      { label: "Rango de salida", value: eng(span, "V", 4) }
    ],
    blocks: [{ type: "plot", title: "Tensión de salida frente a la resistencia del sensor", logX: true, xLabel: "Rs (Ω)", yLabel: "Vout (V)", series: [{ name: "Vout", points: xs.map((x) => [x, vout(Vcc, x, R, pos)]) }], vlines: [{ x: Rmin }, { x: Rmax }] }],
    steps, copy: `Ropt = ${eng(Ropt, "Ω", 4)}, R = ${eng(R, "Ω")}, V(Rmin) = ${eng(v1, "V", 4)}, V(Rmax) = ${eng(v2, "V", 4)}`
  };
}
