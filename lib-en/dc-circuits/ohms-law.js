import { fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calculate voltage, current, resistance or power from any two known values using Ohm's law and the power law, with steps and engineering units.",
  keywords: ["Ohm's law", "ohm", "Voltage", "Current", "Resistance", "Power", "Watt", "Volt", "Ampere"],
  formulas: [
    { label: "Ohm's law", tex: "V = I R" },
    { label: "Power", tex: "P = V I = I^2 R = \\frac{V^2}{R}" }
  ],
  inputs: [
    { id: "V", label: "Voltage V", unit: "V", type: "number", help: "Leave two fields empty and enter only two." },
    { id: "I", label: "Current I", unit: "A", type: "number", default: "20m", help: "Prefixes can be used: m for milli, u for micro, k for kilo." },
    { id: "R", label: "Resistance R", unit: "Ω", type: "number", default: "470" },
    { id: "P", label: "Power P", unit: "W", type: "number" }
  ],
  example: { values: { V: "", I: "20m", R: "470", P: "" }, expect: ["V = 9.4 V", "P = 188 mW"], note: "Example: a current of 20 mA through a 470 Ω resistor." },
  invalid: { values: { V: "5", I: "1", R: "5", P: "" } },
  related: ["series-parallel-resistors", "voltage-current-divider", "led-resistor", "shunt-resistor"]
};

export function solve(input) {
  const given = ["V", "I", "R", "P"].filter((k) => !isBlank(input[k]));
  if (given.length !== 2) fail(`Enter only two of the four values (you entered ${given.length}).`, given.length > 2 ? given[2] : ["V", "I", "R", "P"].find((k) => isBlank(input[k])));
  const v = {};
  for (const k of given) v[k] = num(input, k, { V: "Voltage", I: "Current", R: "Resistance", P: "Power" }[k], k === "R" ? { positive: true } : k === "P" ? { nonNegative: true } : {});
  const steps = [];
  const key = given.sort().join("");
  const T = (x) => ntex(x, 6);
  switch (key) {
    case "IV":
      if (v.I === 0) fail("The current is zero, so the resistance cannot be calculated.", "I");
      v.R = v.V / v.I; v.P = v.V * v.I;
      if (!(v.R > 0)) fail("Voltage and current must have the same sign for a positive resistance.", "I");
      steps.push({ text: "From Ohm's law:", tex: `R = \\frac{V}{I} = \\frac{${T(v.V)}}{${T(v.I)}} = ${T(v.R)}\\ \\Omega` });
      steps.push({ text: "Power:", tex: `P = VI = ${T(v.V)} \\times ${T(v.I)} = ${T(v.P)}\\ W` });
      break;
    case "RV":
      v.I = v.V / v.R; v.P = (v.V * v.V) / v.R;
      steps.push({ text: "From Ohm's law:", tex: `I = \\frac{V}{R} = \\frac{${T(v.V)}}{${T(v.R)}} = ${T(v.I)}\\ A` });
      steps.push({ text: "Power:", tex: `P = \\frac{V^2}{R} = ${T(v.P)}\\ W` });
      break;
    case "IR":
      v.V = v.I * v.R; v.P = v.I * v.I * v.R;
      steps.push({ text: "From Ohm's law:", tex: `V = IR = ${T(v.I)} \\times ${T(v.R)} = ${T(v.V)}\\ V` });
      steps.push({ text: "Power:", tex: `P = I^2 R = ${T(v.P)}\\ W` });
      break;
    case "PV":
      if (v.V === 0) fail("The voltage is zero, so the current cannot be calculated from the power.", "V");
      v.I = v.P / v.V; v.R = (v.V * v.V) / v.P;
      if (v.P === 0) fail("Zero power with a non-zero voltage means infinite resistance.", "P");
      steps.push({ text: "From the power law:", tex: `I = \\frac{P}{V} = ${T(v.I)}\\ A,\\qquad R = \\frac{V^2}{P} = ${T(v.R)}\\ \\Omega` });
      break;
    case "IP":
      if (v.I === 0) fail("The current is zero, so the voltage cannot be calculated from the power.", "I");
      if (v.P === 0) fail("Zero power with a non-zero current means zero resistance.", "P");
      v.V = v.P / v.I; v.R = v.P / (v.I * v.I);
      steps.push({ text: "From the power law:", tex: `V = \\frac{P}{I} = ${T(v.V)}\\ V,\\qquad R = \\frac{P}{I^2} = ${T(v.R)}\\ \\Omega` });
      break;
    case "PR":
      v.V = Math.sqrt(v.P * v.R); v.I = Math.sqrt(v.P / v.R);
      steps.push({ text: "From the power law (taking the positive root):", tex: `V = \\sqrt{PR} = ${T(v.V)}\\ V,\\qquad I = \\sqrt{\\frac{P}{R}} = ${T(v.I)}\\ A` });
      break;
  }
  steps.push({ text: "Check:", tex: `V - IR = ${T(v.V - v.I * v.R)},\\quad P - VI = ${T(v.P - v.V * v.I)}` });
  const out = { V: eng(v.V, "V"), I: eng(v.I, "A"), R: eng(v.R, "Ω"), P: eng(v.P, "W") };
  return {
    results: [
      { label: "Voltage V", value: out.V, text: `V = ${out.V}` },
      { label: "Current I", value: out.I, text: `I = ${out.I}` },
      { label: "Resistance R", value: out.R, text: `R = ${out.R}` },
      { label: "Power P", value: out.P, text: `P = ${out.P}` }
    ],
    steps, values: v
  };
}
