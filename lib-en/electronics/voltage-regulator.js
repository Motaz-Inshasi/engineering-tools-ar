import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Check a linear voltage regulator (such as a 7805 or LDO): dropout voltage margin, dissipated power, efficiency, junction temperature, and the thermal resistance required for the heatsink.",
  keywords: ["Voltage regulator", "voltage regulator", "LDO", "7805", "Dropout voltage", "dropout", "Heatsink", "heatsink", "Junction temperature"],
  formulas: [
    { label: "Power and efficiency", tex: "P_D = (V_{in} - V_{out})I_L + V_{in}I_Q,\\qquad \\eta = \\frac{V_{out}I_L}{V_{in}(I_L + I_Q)}" },
    { label: "Temperature", tex: "T_J = T_A + P_D\\,\\theta_{JA},\\qquad \\theta_{SA,max} = \\frac{T_{J,max} - T_A}{P_D} - \\theta_{JC} - \\theta_{CS}" }
  ],
  inputs: [
    { id: "Vin", label: "Input voltage (maximum)", unit: "V", type: "number", default: "12" },
    { id: "Vout", label: "Output voltage", unit: "V", type: "number", default: "5" },
    { id: "IL", label: "Load current", unit: "A", type: "number", default: "500m" },
    { id: "Vdo", label: "Dropout voltage (Dropout)", unit: "V", type: "number", default: "2" },
    { id: "Iq", label: "Quiescent current Iq", unit: "A", type: "number", default: "5m" },
    { id: "Ta", label: "Ambient temperature", unit: "°C", type: "number", default: "40" },
    { id: "Tj", label: "Maximum junction temperature", unit: "°C", type: "number", default: "125" },
    { id: "tja", label: "θJA without heatsink", unit: "°C/W", type: "number", default: "50" },
    { id: "tjc", label: "θJC", unit: "°C/W", type: "number", default: "5" },
    { id: "tcs", label: "θCS (thermal paste)", unit: "°C/W", type: "number", default: "0.5" }
  ],
  example: { values: { Vin: "12", Vout: "5", IL: "500m", Vdo: "2", Iq: "5m", Ta: "40", Tj: "125", tja: "50", tjc: "5", tcs: "0.5" }, expect: ["PD = 3.56 W", "θSA ≤ 18.38 °C/W"], note: "Example: 7805 from 12 V with 500 mA current." },
  invalid: { values: { Vin: "6", Vout: "5", IL: "500m", Vdo: "2", Iq: "5m", Ta: "40", Tj: "125", tja: "50", tjc: "5", tcs: "0.5" } },
  related: ["zener-regulator", "rectifier-ripple", "led-resistor"]
};

export function solve(input) {
  const Vin = num(input, "Vin", "Input voltage", { positive: true });
  const Vout = num(input, "Vout", "Output voltage", { positive: true });
  const IL = num(input, "IL", "Load current", { nonNegative: true });
  const Vdo = num(input, "Vdo", "Dropout voltage", { nonNegative: true });
  const Iq = num(input, "Iq", "Quiescent current", { nonNegative: true, default: 0 });
  const Ta = num(input, "Ta", "Ambient temperature", { min: -60, max: 150 });
  const Tjmax = num(input, "Tj", "Maximum junction temperature", { min: 50, max: 200 });
  const tja = num(input, "tja", "θJA", { positive: true });
  const tjc = num(input, "tjc", "θJC", { nonNegative: true, default: 0 });
  const tcs = num(input, "tcs", "θCS", { nonNegative: true, default: 0 });
  if (Vin < Vout + Vdo) fail(`Input voltage ${fmt(Vin)} V is below the minimum ${fmt(Vout + Vdo)} V (output + dropout voltage), so the regulator will not regulate.`, "Vin");
  if (Tjmax <= Ta) fail("The maximum junction temperature must be higher than the ambient temperature.", "Tj");
  const PD = (Vin - Vout) * IL + Vin * Iq;
  const eff = IL > 0 ? (Vout * IL) / (Vin * (IL + Iq)) : 0;
  const TjNoHs = Ta + PD * tja;
  const PDmax = (Tjmax - Ta) / tja;
  const steps = [
    `Voltage margin of ${fmt(Vin - Vout - Vdo, 4)} V above the dropout voltage, so the regulator works.`,
    { text: "Dissipated power (voltage difference × current + regulator consumption):", tex: `P_D = (${ntex(Vin)} - ${ntex(Vout)}) \\times ${ntex(IL)} + ${ntex(Vin)} \\times ${ntex(Iq)} = ${ntex(PD, 4)}\\ W` },
    { text: "Efficiency:", tex: `\\eta = \\frac{${ntex(Vout)} \\times ${ntex(IL)}}{${ntex(Vin)} \\times (${ntex(IL)} + ${ntex(Iq)})} = ${ntex(100 * eff, 4)}\\%` },
    { text: "Junction temperature without heatsink:", tex: `T_J = ${ntex(Ta)} + ${ntex(PD, 4)} \\times ${ntex(tja)} = ${ntex(TjNoHs, 4)}^\\circ C` }
  ];
  const results = [
    { label: "Dissipated power", value: eng(PD, "W", 3), text: `PD = ${eng(PD, "W", 3)}` },
    { label: "Efficiency", value: `${fmt(100 * eff, 4)}%` },
    { label: "Junction temperature without heatsink", value: `${fmt(TjNoHs, 4)} °C` },
    { label: "Maximum power without heatsink", value: eng(PDmax, "W", 3) }
  ];
  let copy = `PD = ${eng(PD, "W", 3)}, η = ${fmt(100 * eff, 4)}%, Tj = ${fmt(TjNoHs, 4)} °C`;
  if (TjNoHs > Tjmax) {
    const tsa = (Tjmax - Ta) / PD - tjc - tcs;
    if (tsa <= 0) {
      steps.push("Even with an ideal heatsink this power cannot be dissipated safely; use a switching (buck) regulator or reduce the input voltage.");
      results.push({ label: "Verdict", value: "Not possible with a linear regulator: use a switching regulator" });
    } else {
      steps.push({ text: "The temperature exceeds the limit, so we need a heatsink with a thermal resistance not greater than:", tex: `\\theta_{SA} \\le \\frac{${ntex(Tjmax)} - ${ntex(Ta)}}{${ntex(PD, 4)}} - ${ntex(tjc)} - ${ntex(tcs)} = ${ntex(tsa, 4)}^\\circ C/W` });
      results.push({ label: "Verdict", value: "Heatsink needed" }, { label: "Maximum θSA of heatsink", value: `${fmt(tsa, 4)} °C/W`, text: `θSA ≤ ${fmt(tsa, 4)} °C/W` });
      copy += `\nθSA ≤ ${fmt(tsa, 4)} °C/W`;
    }
  } else {
    steps.push("The temperature is within the limit, so no heatsink is needed (a safety margin of at least 20 °C is recommended).");
    results.push({ label: "Verdict", value: TjNoHs > Tjmax - 20 ? "Acceptable but close to the limit" : "No heatsink needed" });
  }
  return { results, steps, copy };
}
