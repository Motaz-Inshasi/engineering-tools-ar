import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { logspaceSafe } from "./common.js";

export const meta = {
  description: "Maximum power transfer theorem: the optimal load, the maximum power and the efficiency at that point, and the power and efficiency for any load you choose, with a plot of power versus load resistance.",
  keywords: ["Maximum power transfer", "maximum power transfer", "Load resistance", "Thevenin", "Efficiency", "Impedance matching"],
  formulas: [
    { label: "Power in the load", tex: "P_L = \\frac{V_{th}^2 R_L}{(R_{th} + R_L)^2}" },
    { label: "Condition and maximum value", tex: "R_L = R_{th} \\Rightarrow P_{max} = \\frac{V_{th}^2}{4R_{th}},\\quad \\eta = 50\\%" }
  ],
  inputs: [
    { id: "Vth", label: "Thevenin voltage Vth", unit: "V", type: "number", default: "12" },
    { id: "Rth", label: "Thevenin resistance Rth", unit: "Ω", type: "number", default: "8" },
    { id: "RL", label: "Comparison load resistance (optional)", unit: "Ω", type: "number", default: "4" }
  ],
  example: { values: { Vth: "12", Rth: "8", RL: "4" }, expect: ["Pmax = 4.5 W"], note: "Example: 12 V source with 8 Ω internal resistance." },
  invalid: { values: { Vth: "12", Rth: "0" } },
  related: ["thevenin-norton", "ohms-law", "transformer"]
};

export function power(Vth, Rth, RL) {
  return (Vth * Vth * RL) / Math.pow(Rth + RL, 2);
}

export function solve(input) {
  const Vth = num(input, "Vth", "Thevenin voltage", { nonZero: true });
  const Rth = num(input, "Rth", "Thevenin resistance", { positive: true });
  const RL = num(input, "RL", "Load resistance", { optional: true, nonNegative: true });
  const Pmax = (Vth * Vth) / (4 * Rth);
  const steps = [
    "We differentiate $P_L$ with respect to $R_L$ and set it to zero. The power is maximum when the load resistance equals the Thevenin resistance.",
    { tex: `R_L = R_{th} = ${ntex(Rth)}\\ \\Omega,\\qquad P_{max} = \\frac{${ntex(Vth)}^2}{4 \\times ${ntex(Rth)}} = ${ntex(Pmax, 6)}\\ W` },
    "At this point an equal amount of power is dissipated inside the source, so the efficiency is only 50%. High-power systems operate at higher efficiency with a load larger than Rth."
  ];
  const results = [{ label: "Optimal load resistance", value: eng(Rth, "Ω", 4) }, { label: "Maximum power", value: eng(Pmax, "W", 4), text: `Pmax = ${eng(Pmax, "W", 4)}` }, { label: "Efficiency at that point", value: "50%" }];
  if (RL !== null) {
    const P = power(Vth, Rth, RL), eff = RL / (Rth + RL);
    results.push({ label: `Power in the load ${eng(RL, "Ω")}`, value: eng(P, "W", 4) }, { label: "Efficiency for this load", value: `${fmt(100 * eff, 4)}%` }, { label: "Percentage of maximum power", value: `${fmt((100 * P) / Pmax, 4)}%` });
    steps.push({ text: `For the load ${eng(RL, "Ω")}:`, tex: `P_L = \\frac{${ntex(Vth)}^2 \\times ${ntex(RL)}}{(${ntex(Rth)} + ${ntex(RL)})^2} = ${ntex(P, 6)}\\ W,\\quad \\eta = \\frac{R_L}{R_{th} + R_L} = ${ntex(100 * eff, 4)}\\%` });
  }
  const xs = logspaceSafe(Rth / 100, Rth * 100, 300);
  return {
    results, steps, copy: `RL = ${eng(Rth, "Ω")}, Pmax = ${eng(Pmax, "W", 4)}`,
    blocks: [{ type: "plot", title: "Power in the load versus its resistance", logX: true, xLabel: "RL (Ω)", yLabel: "P (W)", series: [{ name: "P(RL)", points: xs.map((x) => [x, power(Vth, Rth, x)]) }], vlines: [{ x: Rth }] }]
  };
}
