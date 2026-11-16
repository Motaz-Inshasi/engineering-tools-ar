import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";
import { logspaceSafe } from "../dc-circuits/common.js";

export const meta = {
  description: "Design a voltage divider for a resistive sensor (thermistor, LDR, potentiometer): the best fixed resistor for the largest output range, the output voltage range and the sensitivity, with a plot of output versus sensor resistance.",
  keywords: ["Sensor voltage divider", "LDR", "Thermistor", "Resistive sensor", "Fixed resistor", "Output range", "sensor divider"],
  formulas: [
    { label: "Sensor at the bottom", tex: "V_{out} = V_{cc}\\frac{R_s}{R_s + R}" },
    { label: "Optimal resistance for the largest range", tex: "R_{opt} = \\sqrt{R_{s,min} R_{s,max}}" }
  ],
  inputs: [
    { id: "Rmin", label: "Minimum sensor resistance", unit: "Ω", type: "number", default: "1k" },
    { id: "Rmax", label: "Maximum sensor resistance", unit: "Ω", type: "number", default: "100k" },
    { id: "Vcc", label: "Supply voltage", unit: "V", type: "number", default: "5" },
    { id: "pos", label: "Sensor position", type: "select", default: "bottom", options: [["bottom", "Bottom (between output and ground)"], ["top", "Top (between supply and output)"]] },
    { id: "R", label: "Fixed resistor (optional; otherwise the optimal value is calculated)", unit: "Ω", type: "number" }
  ],
  example: { values: { Rmin: "1k", Rmax: "100k", Vcc: "5", pos: "bottom", R: "" }, expect: ["Ropt = 10 kΩ", "V(Rmax) = 4.545 V"], note: "Example: LDR varying from 1 kΩ to 100 kΩ." },
  invalid: { values: { Rmin: "100k", Rmax: "1k", Vcc: "5", pos: "bottom" } },
  related: ["voltage-current-divider", "thermistor", "adc", "level-shifter"]
};

export function vout(Vcc, Rs, R, pos) {
  return pos === "bottom" ? (Vcc * Rs) / (Rs + R) : (Vcc * R) / (Rs + R);
}

export function solve(input) {
  const Rmin = num(input, "Rmin", "Minimum resistance", { positive: true });
  const Rmax = num(input, "Rmax", "Maximum resistance", { positive: true });
  const Vcc = num(input, "Vcc", "Supply voltage", { positive: true });
  const pos = choice(input, "pos", "Position", ["bottom", "top"], "bottom");
  if (Rmax <= Rmin) fail("The maximum resistance must be greater than the minimum.", "Rmax");
  const Ropt = Math.sqrt(Rmin * Rmax);
  const Rin = num(input, "R", "Fixed resistor", { optional: true, positive: true });
  const R = Rin ?? nearest(Ropt, "E24").closest;
  const v1 = vout(Vcc, Rmin, R, pos), v2 = vout(Vcc, Rmax, R, pos);
  const span = Math.abs(v2 - v1);
  const steps = [
    { text: "By differentiation we find that the output range is largest when the fixed resistor equals the geometric mean of the sensor's two end values:", tex: `R_{opt} = \\sqrt{${ntex(Rmin)} \\times ${ntex(Rmax)}} = ${ntex(Ropt, 5)}\\ \\Omega` },
    Rin === null ? `We choose the nearest standard E24 value: ${eng(R, "Ω")}.` : `We use the entered resistor ${eng(R, "Ω")}.`,
    { text: "The output at the ends of the sensor range:", tex: `V(R_{min}) = ${ntex(v1, 5)}\\ V,\\quad V(R_{max}) = ${ntex(v2, 5)}\\ V` },
    `Output range ${fmt(span, 4)} V out of ${fmt(Vcc)} V (${fmt((100 * span) / Vcc, 3)}%). Maximum divider current ${eng(Vcc / (Rmin + R), "A", 3)}, so watch for self-heating of the sensor.`
  ];
  const xs = logspaceSafe(Rmin / 2, Rmax * 2, 200);
  return {
    results: [
      { label: "Optimal resistance", value: eng(Ropt, "Ω", 4), text: `Ropt = ${eng(Ropt, "Ω", 4)}` },
      { label: "Resistance used", value: eng(R, "Ω") },
      { label: "Output at minimum resistance", value: eng(v1, "V", 4), text: `V(Rmin) = ${eng(v1, "V", 4)}` },
      { label: "Output at maximum resistance", value: eng(v2, "V", 4), text: `V(Rmax) = ${eng(v2, "V", 4)}` },
      { label: "Output range", value: eng(span, "V", 4) }
    ],
    blocks: [{ type: "plot", title: "Output voltage versus sensor resistance", logX: true, xLabel: "Rs (Ω)", yLabel: "Vout (V)", series: [{ name: "Vout", points: xs.map((x) => [x, vout(Vcc, x, R, pos)]) }], vlines: [{ x: Rmin }, { x: Rmax }] }],
    steps, copy: `Ropt = ${eng(Ropt, "Ω", 4)}, R = ${eng(R, "Ω")}, V(Rmin) = ${eng(v1, "V", 4)}, V(Rmax) = ${eng(v2, "V", 4)}`
  };
}
