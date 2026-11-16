import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Design current sensing with a shunt resistor: the resistance for a specified voltage drop, the dissipated power and recommended power rating, the amplifier gain needed to fill the ADC range, and the measurement resolution in amperes per step.",
  keywords: ["Shunt", "shunt", "Current sensing", "current sense", "Small resistor", "Current amplifier", "INA", "ADC"],
  formulas: [
    { label: "Shunt resistance and power", tex: "R_{sh} = \\frac{V_{sh,max}}{I_{max}},\\qquad P = I_{max}^2 R_{sh}" },
    { label: "Gain and resolution", tex: "G = \\frac{V_{ref}}{V_{sh,max}},\\qquad \\Delta I = \\frac{V_{ref}}{2^N\\, G\\, R_{sh}}" }
  ],
  inputs: [
    { id: "Imax", label: "Maximum current", unit: "A", type: "number", default: "10" },
    { id: "Vsh", label: "Maximum drop across the shunt", unit: "V", type: "number", default: "100m", help: "Usually 50, 75 or 100 mV." },
    { id: "Vref", label: "ADC range", unit: "V", type: "number", default: "3.3" },
    { id: "N", label: "ADC resolution", unit: "bits", type: "number", default: "12" }
  ],
  example: { values: { Imax: "10", Vsh: "100m", Vref: "3.3", N: "12" }, expect: ["Rsh = 10 mΩ", "G = 33"], note: "Example: measuring up to 10 A with a 100 mV drop and a 12-bit ADC." },
  invalid: { values: { Imax: "10", Vsh: "0", Vref: "3.3", N: "12" } },
  related: ["ohms-law", "adc", "op-amp", "sample-rate-resolution"]
};

export function solve(input) {
  const Imax = num(input, "Imax", "Maximum current", { positive: true });
  const Vsh = num(input, "Vsh", "Shunt drop", { positive: true });
  const Vref = num(input, "Vref", "ADC range", { positive: true });
  const N = num(input, "N", "ADC resolution", { integer: true, min: 1, max: 32 });
  const R = Vsh / Imax, P = Imax * Imax * R;
  const rating = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10, 20, 50, 100].find((w) => w >= 2 * P) ?? 2 * P;
  const G = Vref / Vsh;
  const dI = Vref / Math.pow(2, N) / G / R;
  const steps = [
    { text: "Resistance value from Ohm's law at the maximum current:", tex: `R_{sh} = \\frac{${ntex(Vsh)}}{${ntex(Imax)}} = ${ntex(R, 5)}\\ \\Omega` },
    { text: "Dissipated power at the maximum current:", tex: `P = I^2 R = ${ntex(Imax)}^2 \\times ${ntex(R, 5)} = ${ntex(P, 5)}\\ W` },
    `Choose a resistor with at least twice that rating: ${fmt(rating)} W, with 1% tolerance or better and a low temperature coefficient, and connect it in a Kelvin (four-terminal) arrangement to avoid lead resistance.`,
    { text: "Amplifier gain so that the maximum drop equals the ADC range:", tex: `G = \\frac{${ntex(Vref)}}{${ntex(Vsh)}} = ${ntex(G, 5)}` },
    { text: "Smallest current change that can be distinguished:", tex: `\\Delta I = \\frac{${ntex(Vref)}}{2^{${N}} \\times ${ntex(G, 5)} \\times ${ntex(R, 5)}} = ${ntex(dI, 5)}\\ A` }
  ];
  return {
    results: [
      { label: "Shunt resistance", value: eng(R, "Ω", 4), text: `Rsh = ${eng(R, "Ω", 4)}` },
      { label: "Dissipated power", value: eng(P, "W", 4) },
      { label: "Recommended power rating", value: `${fmt(rating)} W` },
      { label: "Amplifier gain", value: G, sig: 5, text: `G = ${fmt(G, 5)}` },
      { label: "Measurement resolution per step", value: eng(dI, "A", 4) }
    ],
    steps, copy: `Rsh = ${eng(R, "Ω", 4)}, P = ${eng(P, "W", 4)}, G = ${fmt(G, 5)}, ΔI = ${eng(dI, "A", 4)}`
  };
}
