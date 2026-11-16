import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["molarity", "dilution", "percent", "molality", "ppm"];
const DIL = ["C1", "V1", "C2", "V2"];
const DIL_LABEL = { C1: "Initial concentration C1", V1: "Initial volume V1", C2: "Final concentration C2", V2: "Final volume V2" };
const EMPTY = { mass: "", molarMass: "", volume: "", solutionMass: "", solventKg: "", massMg: "", C1: "", V1: "", C2: "", V2: "" };
const sub = (k) => `${k[0]}_${k[1]}`;

export const meta = {
  description: "Calculates the concentration of a solution in several ways: molar concentration from the mass, molar mass and volume; dilution C1V1 = C2V2 by finding the unknown from three values; or mass percentage, molality, or ppm.",
  keywords: ["concentration", "molar concentration", "molarity", "molarity", "dilution", "dilution", "C1V1 = C2V2", "mass percentage", "molality", "molality", "ppm", "parts per million", "solution"],
  formulas: [
    { label: "Molar concentration", tex: "C = \\frac{n}{V} = \\frac{m}{MV}" },
    { label: "Dilution", tex: "C_1V_1 = C_2V_2" },
    { label: "Mass percentage", tex: "\\% = \\frac{m_{solute}}{m_{solution}} \\times 100" },
    { label: "Molality", tex: "b = \\frac{n}{m_{solvent}}" },
    { label: "parts per million", tex: "\\text{ppm} = \\frac{\\text{mg}}{\\text{L}}" }
  ],
  inputs: [
    { id: "mode", label: "Calculation method", type: "select", default: "molarity", options: [["molarity", "Molar concentration M"], ["dilution", "Dilution C1V1 = C2V2"], ["percent", "Mass percentage"], ["molality", "Molality mol/kg"], ["ppm", "ppm (mg/L)"]] },
    { id: "mass", label: "Mass of solute", unit: "g", type: "number", default: "58.44", when: { mode: ["molarity", "percent", "molality"] } },
    { id: "molarMass", label: "Molar mass of solute M", unit: "g/mol", type: "number", default: "58.44", when: { mode: ["molarity", "molality"] } },
    { id: "volume", label: "Solution volume", unit: "L", type: "number", default: "1", when: { mode: ["molarity", "ppm"] } },
    { id: "solutionMass", label: "Total solution mass", unit: "g", type: "number", when: { mode: ["percent"] }, help: "Mass of solute + mass of solvent." },
    { id: "solventKg", label: "Solvent mass", unit: "kg", type: "number", when: { mode: ["molality"] } },
    { id: "massMg", label: "Mass of solute", unit: "mg", type: "number", when: { mode: ["ppm"] } },
    { id: "C1", label: "Initial concentration C1", unit: "M", type: "number", when: { mode: ["dilution"] }, help: "Enter three values of C1, V1, C2 and V2 and leave the fourth empty." },
    { id: "V1", label: "Initial volume V1", type: "number", when: { mode: ["dilution"] }, help: "Any volume unit, provided the same unit is used for V1 and V2." },
    { id: "C2", label: "Final concentration C2", unit: "M", type: "number", when: { mode: ["dilution"] } },
    { id: "V2", label: "Final volume V2", type: "number", when: { mode: ["dilution"] } }
  ],
  example: { values: { ...EMPTY, mode: "molarity", mass: "58.44", molarMass: "58.44", volume: "1" }, expect: ["1 M"], note: "Example: 58.44 g of NaCl (M = 58.44 g/mol) in 1 L." },
  invalid: { values: { ...EMPTY, mode: "dilution", C1: "1", V1: "1" } },
  related: ["ph-calculator", "reaction-kinetics", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function molarity(input) {
  const m = num(input, "mass", "Mass of solute", { nonNegative: true });
  const M = num(input, "molarMass", "molar mass", { positive: true });
  const V = num(input, "volume", "Solution volume", { positive: true });
  const n = m / M;
  const c = n / V;
  return {
    results: [
      { label: "Number of moles n", value: `${fmt(n, 5)} mol` },
      { label: "Molar concentration", value: `${fmt(c, 5)} M` }
    ],
    steps: [
      { text: "Number of moles from the mass and the molar mass:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M)}} = ${ntex(n, 6)}\\ \\text{mol}` },
      { text: "Molar concentration = moles / volume in liters:", tex: `C = \\frac{n}{V} = \\frac{${ntex(n, 6)}}{${ntex(V)}} = ${ntex(c, 6)}\\ \\text{M}` }
    ],
    copy: `Molar concentration = ${fmt(c, 5)} M`
  };
}

function dilution(input) {
  const blanks = DIL.filter((k) => isBlank(input[k]));
  const filled = DIL.length - blanks.length;
  if (filled !== 3) fail(`Enter exactly three values and leave the fourth empty (you entered ${filled}).`, filled < 3 ? blanks[0] : DIL.find((k) => !isBlank(input[k])));
  const unknown = blanks[0];
  const v = {};
  for (const k of DIL) if (k !== unknown) v[k] = num(input, k, DIL_LABEL[k], { positive: true });
  const [[a, b], d] = { C1: [["C2", "V2"], "V1"], V1: [["C2", "V2"], "C1"], C2: [["C1", "V1"], "V2"], V2: [["C1", "V1"], "C2"] }[unknown];
  const x = (v[a] * v[b]) / v[d];
  const unit = unknown[0] === "C" ? " M" : "";
  return {
    results: [{ label: `${DIL_LABEL[unknown]} calculated`, value: `${fmt(x, 5)}${unit}` }],
    steps: [
      { text: "Dilution law: the number of moles of solute does not change:", tex: "C_1V_1 = C_2V_2" },
      { text: `We calculate the unknown ${unknown}:`, tex: `${sub(unknown)} = \\frac{${sub(a)}\\,${sub(b)}}{${sub(d)}} = \\frac{${ntex(v[a])} \\times ${ntex(v[b])}}{${ntex(v[d])}} = ${ntex(x, 6)}` }
    ],
    copy: `${unknown} = ${fmt(x, 5)}${unit}`
  };
}

function percent(input) {
  const m = num(input, "mass", "Mass of solute", { nonNegative: true });
  const S = num(input, "solutionMass", "Solution mass", { positive: true });
  if (m > S) fail("The mass of solute cannot exceed the mass of the solution.", "mass");
  const p = (100 * m) / S;
  return {
    results: [{ label: "Mass percentage", value: `${fmt(p, 5)} %` }],
    steps: [{ text: "Mass percentage:", tex: `\\% = \\frac{m_{solute}}{m_{solution}} \\times 100 = \\frac{${ntex(m)}}{${ntex(S)}} \\times 100 = ${ntex(p, 6)}\\ \\%` }],
    copy: `Mass percentage = ${fmt(p, 5)} %`
  };
}

function molality(input) {
  const m = num(input, "mass", "Mass of solute", { nonNegative: true });
  const M = num(input, "molarMass", "molar mass", { positive: true });
  const kg = num(input, "solventKg", "Solvent mass", { positive: true });
  const n = m / M;
  const b = n / kg;
  return {
    results: [
      { label: "Number of moles n", value: `${fmt(n, 5)} mol` },
      { label: "Molality", value: `${fmt(b, 5)} mol/kg` }
    ],
    steps: [
      { text: "Number of moles:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M)}} = ${ntex(n, 6)}\\ \\text{mol}` },
      { text: "Molality = moles / mass of solvent in kilograms:", tex: `b = \\frac{n}{m_{solvent}} = \\frac{${ntex(n, 6)}}{${ntex(kg)}} = ${ntex(b, 6)}\\ \\text{mol/kg}` }
    ],
    copy: `Molality = ${fmt(b, 5)} mol/kg`
  };
}

function ppm(input) {
  const mg = num(input, "massMg", "Mass of solute in mg", { nonNegative: true });
  const V = num(input, "volume", "Solution volume", { positive: true });
  const p = mg / V;
  return {
    results: [{ label: "Concentration in ppm", value: `${fmt(p, 5)} ppm (mg/L)` }],
    steps: [{ text: "ppm = mg of solute / L of solution:", tex: `\\text{ppm} = \\frac{${ntex(mg)}\\ \\text{mg}}{${ntex(V)}\\ \\text{L}} = ${ntex(p, 6)}` }],
    copy: `Concentration = ${fmt(p, 5)} ppm (mg/L)`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Calculation method", MODES, "molarity");
  if (mode === "molarity") return molarity(input);
  if (mode === "dilution") return dilution(input);
  if (mode === "percent") return percent(input);
  if (mode === "molality") return molality(input);
  return ppm(input);
}
