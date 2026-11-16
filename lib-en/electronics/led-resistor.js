import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "Calculate the resistor needed for an LED at any supply voltage and any number of LEDs in series, with the nearest safe standard value, the actual current through it, and the required resistor power rating.",
  keywords: ["LED resistor", "LED", "LED resistor", "Forward voltage", "LED current", "Current-limiting resistor"],
  formulas: [{ label: "Current-limiting resistor", tex: "R = \\frac{V_s - n V_F}{I_F},\\qquad P_R = I_F^2 R" }],
  inputs: [
    { id: "Vs", label: "Supply voltage Vs", unit: "V", type: "number", default: "5" },
    { id: "Vf", label: "Forward voltage per LED", unit: "V", type: "number", default: "2", help: "Approximately: red 2 V, green/blue/white 3 V." },
    { id: "If", label: "Required LED current", unit: "A", type: "number", default: "20m" },
    { id: "n", label: "Number of LEDs in series", type: "number", default: "1" },
    { id: "series", label: "Standard series", type: "select", default: "E12", options: [["E12", "E12"], ["E24", "E24"], ["E96", "E96"]] }
  ],
  example: { values: { Vs: "5", Vf: "2", If: "20m", n: "1", series: "E12" }, expect: ["R = 150 Ω", "150 Ω (E12)"], note: "Example: red LED from 5 V with 20 mA current." },
  invalid: { values: { Vs: "5", Vf: "3", If: "20m", n: "2" } },
  related: ["ohms-law", "resistor-color-code", "standard-resistor-values", "zener-regulator"]
};

export function solve(input) {
  const Vs = num(input, "Vs", "Supply voltage", { positive: true });
  const Vf = num(input, "Vf", "Forward voltage", { positive: true });
  const If = num(input, "If", "Current", { positive: true });
  const n = num(input, "n", "Number of LEDs", { integer: true, min: 1, max: 100 });
  const series = choice(input, "series", "Series", ["E12", "E24", "E96"], "E12");
  const Vr = Vs - n * Vf;
  if (Vr <= 0) fail(`The supply voltage (${fmt(Vs)} V) is not enough to drive ${n} LEDs in series (${fmt(n * Vf)} V). Reduce the number of LEDs or increase the voltage.`, "n");
  const R = Vr / If;
  const std = nearest(R, series);
  const Rstd = std.above;
  const Iact = Vr / Rstd, P = Iact * Iact * Rstd;
  const rating = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10].find((w) => w >= 2 * P) ?? 10;
  const steps = [
    { text: "Voltage remaining across the resistor:", tex: `V_R = V_s - nV_F = ${ntex(Vs)} - ${n} \\times ${ntex(Vf)} = ${ntex(Vr, 6)}\\ V` },
    { text: "Resistance from Ohm's law:", tex: `R = \\frac{V_R}{I_F} = \\frac{${ntex(Vr, 6)}}{${ntex(If)}} = ${ntex(R, 6)}\\ \\Omega` },
    `We choose the nearest larger standard value from the ${series} series so the current does not exceed the required value: ${eng(Rstd, "Ω")}.`,
    { text: "Actual current and power in the resistor:", tex: `I = \\frac{${ntex(Vr, 6)}}{${ntex(Rstd)}} = ${ntex(Iact, 5)}\\ A,\\quad P = I^2R = ${ntex(P, 5)}\\ W` },
    `For safety, we choose a resistor whose power rating is at least twice the calculated power: ${fmt(rating)} W.`
  ];
  return {
    results: [
      { label: "Calculated resistance", value: eng(R, "Ω", 4), text: `R = ${eng(R, "Ω", 4)}` },
      { label: `Nearest safe ${series} value`, value: eng(Rstd, "Ω"), text: `${series}: ${eng(Rstd, "Ω")}` },
      { label: "Actual current", value: eng(Iact, "A", 4) },
      { label: "Resistor power", value: eng(P, "W", 4) },
      { label: "Recommended resistor power rating", value: `${fmt(rating)} W` },
      { label: "Power per LED", value: eng(Vf * Iact, "W", 4) }
    ],
    steps, copy: `R = ${eng(R, "Ω", 4)} → ${eng(Rstd, "Ω")} (${series}), I = ${eng(Iact, "A", 4)}, P = ${eng(P, "W", 3)}`
  };
}
