import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "Design a Zener regulator with a series resistor: the allowed resistor range, the chosen standard value, and the Zener current and power in the worst cases when the input voltage and load change.",
  keywords: ["Zener", "zener", "Zener regulator", "Series resistor", "Voltage regulation", "Zener power"],
  formulas: [
    { label: "Maximum series resistor (worst case: lowest input and highest load)", tex: "R_{s,max} = \\frac{V_{in,min} - V_Z}{I_{L,max} + I_{Z,min}}" },
    { label: "Maximum Zener current and power (highest input and lowest load)", tex: "I_{Z,max} = \\frac{V_{in,max} - V_Z}{R_s} - I_{L,min},\\quad P_Z = V_Z I_{Z,max}" }
  ],
  inputs: [
    { id: "Vmin", label: "Minimum input voltage", unit: "V", type: "number", default: "10" },
    { id: "Vmax", label: "Maximum input voltage", unit: "V", type: "number", default: "14" },
    { id: "Vz", label: "Zener voltage Vz", unit: "V", type: "number", default: "5.1" },
    { id: "ILmax", label: "Maximum load current", unit: "A", type: "number", default: "50m" },
    { id: "ILmin", label: "Minimum load current", unit: "A", type: "number", default: "0" },
    { id: "Izmin", label: "Minimum Zener current for regulation", unit: "A", type: "number", default: "5m" },
    { id: "Pz", label: "Rated Zener power (optional)", unit: "W", type: "number", default: "1" }
  ],
  example: { values: { Vmin: "10", Vmax: "14", Vz: "5.1", ILmax: "50m", ILmin: "0", Izmin: "5m", Pz: "1" }, expect: ["Rs,max = 89.09 Ω", "Rs = 82 Ω"], note: "Example: regulate 5.1 V from a 10–14 V input for a load up to 50 mA." },
  invalid: { values: { Vmin: "4", Vmax: "14", Vz: "5.1", ILmax: "50m", Izmin: "5m" } },
  related: ["voltage-regulator", "rectifier-ripple", "led-resistor"]
};

export function solve(input) {
  const Vmin = num(input, "Vmin", "Minimum input voltage", { positive: true });
  const Vmax = num(input, "Vmax", "Maximum input voltage", { positive: true });
  const Vz = num(input, "Vz", "Zener voltage", { positive: true });
  const ILmax = num(input, "ILmax", "Maximum load current", { nonNegative: true });
  const ILmin = num(input, "ILmin", "Minimum load current", { nonNegative: true, default: 0 });
  const Izmin = num(input, "Izmin", "Minimum Zener current", { positive: true });
  const Pz = num(input, "Pz", "Zener power", { optional: true, positive: true });
  if (Vmax < Vmin) fail("The maximum input voltage must not be lower than the minimum input voltage.", "Vmax");
  if (ILmin > ILmax) fail("The minimum load current must not exceed the maximum load current.", "ILmin");
  if (Vmin <= Vz) fail(`The minimum input voltage must be greater than the Zener voltage (${fmt(Vz)} V) to stay in regulation.`, "Vmin");
  const RsMax = (Vmin - Vz) / (ILmax + Izmin);
  const Rs = nearest(RsMax, "E12").below;
  const IzMax = (Vmax - Vz) / Rs - ILmin;
  const PzMax = Vz * IzMax;
  const PRs = Math.pow(Vmax - Vz, 2) / Rs;
  const IzAtMin = (Vmin - Vz) / Rs - ILmax;
  const steps = [
    { text: "Worst case for regulation: lowest input voltage and highest load current; the Zener must still carry at least Iz,min:", tex: `R_{s,max} = \\frac{${ntex(Vmin)} - ${ntex(Vz)}}{${ntex(ILmax)} + ${ntex(Izmin)}} = ${ntex(RsMax, 5)}\\ \\Omega` },
    `We choose the next smaller E12 standard value: $R_s = ${ntex(Rs)}\\ \\Omega$, so that the worst-case Zener current is ${eng(IzAtMin, "A", 4)}.`,
    { text: "Worst case for power: highest input voltage and lowest load, so the highest current flows through the Zener:", tex: `I_{Z,max} = \\frac{${ntex(Vmax)} - ${ntex(Vz)}}{${ntex(Rs)}} - ${ntex(ILmin)} = ${ntex(IzMax, 5)}\\ A,\\quad P_Z = ${ntex(PzMax, 5)}\\ W` },
    { text: "Power in the series resistor (worst case):", tex: `P_{R} = \\frac{(${ntex(Vmax)} - ${ntex(Vz)})^2}{${ntex(Rs)}} = ${ntex(PRs, 5)}\\ W` }
  ];
  const results = [
    { label: "Maximum allowed series resistor", value: eng(RsMax, "Ω", 4), text: `Rs,max = ${eng(RsMax, "Ω", 4)}` },
    { label: "Chosen resistor (E12)", value: eng(Rs, "Ω"), text: `Rs = ${eng(Rs, "Ω")}` },
    { label: "Maximum Zener current", value: eng(IzMax, "A", 4) },
    { label: "Maximum Zener power", value: eng(PzMax, "W", 4) },
    { label: "Maximum resistor power", value: eng(PRs, "W", 4) }
  ];
  if (Pz !== null) {
    const ok = PzMax <= Pz;
    results.push({ label: "Verdict", value: ok ? `Suitable (${fmt((100 * PzMax) / Pz, 3)}% of the Zener power rating)` : "The Zener will burn out: choose a Zener with a higher power rating or reduce the input range" });
    steps.push(ok ? `Power ${fmt(PzMax, 4)} W is less than the rated power ${fmt(Pz)} W.` : `Power ${fmt(PzMax, 4)} W exceeds the rated power ${fmt(Pz)} W.`);
  }
  return { results, steps, copy: `Rs,max = ${eng(RsMax, "Ω", 4)}, Rs = ${eng(Rs, "Ω")}, Iz,max = ${eng(IzMax, "A", 4)}, Pz = ${eng(PzMax, "W", 4)}` };
}
