import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["molarity", "dilution", "percent", "molality", "ppm"];
const DIL = ["C1", "V1", "C2", "V2"];
const DIL_LABEL = { C1: "Concentración inicial C1", V1: "Volumen inicial V1", C2: "Concentración final C2", V2: "Volumen final V2" };
const EMPTY = { mass: "", molarMass: "", volume: "", solutionMass: "", solventKg: "", massMg: "", C1: "", V1: "", C2: "", V2: "" };
const sub = (k) => `${k[0]}_${k[1]}`;

export const meta = {
  description: "Calcula la concentración de una disolución de varias formas: molaridad a partir de la masa, la masa molar y el volumen; dilución C1V1 = C2V2 hallando la incógnita con tres valores; porcentaje en masa; molalidad o ppm.",
  keywords: ["Concentración", "Concentración molar", "Molaridad", "molarity", "Dilución", "dilution", "C1V1 = C2V2", "Porcentaje en masa", "Molalidad", "molality", "ppm", "Partes por millón", "Disolución"],
  formulas: [
    { label: "Concentración molar", tex: "C = \\frac{n}{V} = \\frac{m}{MV}" },
    { label: "Dilución", tex: "C_1V_1 = C_2V_2" },
    { label: "Porcentaje en masa", tex: "\\% = \\frac{m_{solute}}{m_{solution}} \\times 100" },
    { label: "Molalidad", tex: "b = \\frac{n}{m_{solvent}}" },
    { label: "Partes por millón", tex: "\\text{ppm} = \\frac{\\text{mg}}{\\text{L}}" }
  ],
  inputs: [
    { id: "mode", label: "Método de cálculo", type: "select", default: "molarity", options: [["molarity", "Concentración molar M"], ["dilution", "Dilución C1V1 = C2V2"], ["percent", "Porcentaje en masa"], ["molality", "Molalidad mol/kg"], ["ppm", "ppm (mg/L)"]] },
    { id: "mass", label: "Masa del soluto", unit: "g", type: "number", default: "58.44", when: { mode: ["molarity", "percent", "molality"] } },
    { id: "molarMass", label: "Masa molar del soluto M", unit: "g/mol", type: "number", default: "58.44", when: { mode: ["molarity", "molality"] } },
    { id: "volume", label: "Volumen de la disolución", unit: "L", type: "number", default: "1", when: { mode: ["molarity", "ppm"] } },
    { id: "solutionMass", label: "Masa total de la disolución", unit: "g", type: "number", when: { mode: ["percent"] }, help: "Masa del soluto + masa del disolvente." },
    { id: "solventKg", label: "Masa del disolvente", unit: "kg", type: "number", when: { mode: ["molality"] } },
    { id: "massMg", label: "Masa del soluto", unit: "mg", type: "number", when: { mode: ["ppm"] } },
    { id: "C1", label: "Concentración inicial C1", unit: "M", type: "number", when: { mode: ["dilution"] }, help: "Introduce tres valores de C1, V1, C2 y V2 y deja vacío el cuarto." },
    { id: "V1", label: "Volumen inicial V1", type: "number", when: { mode: ["dilution"] }, help: "Cualquier unidad de volumen, siempre que se use la misma en V1 y V2." },
    { id: "C2", label: "Concentración final C2", unit: "M", type: "number", when: { mode: ["dilution"] } },
    { id: "V2", label: "Volumen final V2", type: "number", when: { mode: ["dilution"] } }
  ],
  example: { values: { ...EMPTY, mode: "molarity", mass: "58.44", molarMass: "58.44", volume: "1" }, expect: ["1 M"], note: "Ejemplo: 58.44 g de NaCl (M = 58.44 g/mol) en 1 L." },
  invalid: { values: { ...EMPTY, mode: "dilution", C1: "1", V1: "1" } },
  related: ["ph-calculator", "reaction-kinetics", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function molarity(input) {
  const m = num(input, "mass", "Masa del soluto", { nonNegative: true });
  const M = num(input, "molarMass", "Masa molar", { positive: true });
  const V = num(input, "volume", "Volumen de la disolución", { positive: true });
  const n = m / M;
  const c = n / V;
  return {
    results: [
      { label: "Número de moles n", value: `${fmt(n, 5)} mol` },
      { label: "Concentración molar", value: `${fmt(c, 5)} M` }
    ],
    steps: [
      { text: "Número de moles a partir de la masa y la masa molar:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M)}} = ${ntex(n, 6)}\\ \\text{mol}` },
      { text: "Concentración molar = moles / volumen en litros:", tex: `C = \\frac{n}{V} = \\frac{${ntex(n, 6)}}{${ntex(V)}} = ${ntex(c, 6)}\\ \\text{M}` }
    ],
    copy: `Concentración molar = ${fmt(c, 5)} M`
  };
}

function dilution(input) {
  const blanks = DIL.filter((k) => isBlank(input[k]));
  const filled = DIL.length - blanks.length;
  if (filled !== 3) fail(`Introduce exactamente tres valores y deja vacío el cuarto (introdujiste ${filled}).`, filled < 3 ? blanks[0] : DIL.find((k) => !isBlank(input[k])));
  const unknown = blanks[0];
  const v = {};
  for (const k of DIL) if (k !== unknown) v[k] = num(input, k, DIL_LABEL[k], { positive: true });
  const [[a, b], d] = { C1: [["C2", "V2"], "V1"], V1: [["C2", "V2"], "C1"], C2: [["C1", "V1"], "V2"], V2: [["C1", "V1"], "C2"] }[unknown];
  const x = (v[a] * v[b]) / v[d];
  const unit = unknown[0] === "C" ? " M" : "";
  return {
    results: [{ label: `${DIL_LABEL[unknown]} calculado`, value: `${fmt(x, 5)}${unit}` }],
    steps: [
      { text: "Ley de la dilución: la cantidad de moles del soluto no cambia:", tex: "C_1V_1 = C_2V_2" },
      { text: `Calculamos ${unknown} desconocido:`, tex: `${sub(unknown)} = \\frac{${sub(a)}\\,${sub(b)}}{${sub(d)}} = \\frac{${ntex(v[a])} \\times ${ntex(v[b])}}{${ntex(v[d])}} = ${ntex(x, 6)}` }
    ],
    copy: `${unknown} = ${fmt(x, 5)}${unit}`
  };
}

function percent(input) {
  const m = num(input, "mass", "Masa del soluto", { nonNegative: true });
  const S = num(input, "solutionMass", "Masa de la disolución", { positive: true });
  if (m > S) fail("La masa del soluto no puede superar la masa de la disolución.", "mass");
  const p = (100 * m) / S;
  return {
    results: [{ label: "Porcentaje en masa", value: `${fmt(p, 5)} %` }],
    steps: [{ text: "Porcentaje en masa:", tex: `\\% = \\frac{m_{solute}}{m_{solution}} \\times 100 = \\frac{${ntex(m)}}{${ntex(S)}} \\times 100 = ${ntex(p, 6)}\\ \\%` }],
    copy: `Porcentaje en masa = ${fmt(p, 5)} %`
  };
}

function molality(input) {
  const m = num(input, "mass", "Masa del soluto", { nonNegative: true });
  const M = num(input, "molarMass", "Masa molar", { positive: true });
  const kg = num(input, "solventKg", "Masa del disolvente", { positive: true });
  const n = m / M;
  const b = n / kg;
  return {
    results: [
      { label: "Número de moles n", value: `${fmt(n, 5)} mol` },
      { label: "Molalidad", value: `${fmt(b, 5)} mol/kg` }
    ],
    steps: [
      { text: "Número de moles:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M)}} = ${ntex(n, 6)}\\ \\text{mol}` },
      { text: "Molalidad = moles / masa del disolvente en kilogramos:", tex: `b = \\frac{n}{m_{solvent}} = \\frac{${ntex(n, 6)}}{${ntex(kg)}} = ${ntex(b, 6)}\\ \\text{mol/kg}` }
    ],
    copy: `Molalidad = ${fmt(b, 5)} mol/kg`
  };
}

function ppm(input) {
  const mg = num(input, "massMg", "Masa del soluto en mg", { nonNegative: true });
  const V = num(input, "volume", "Volumen de la disolución", { positive: true });
  const p = mg / V;
  return {
    results: [{ label: "Concentración en ppm", value: `${fmt(p, 5)} ppm (mg/L)` }],
    steps: [{ text: "ppm = mg de soluto / litros de disolución:", tex: `\\text{ppm} = \\frac{${ntex(mg)}\\ \\text{mg}}{${ntex(V)}\\ \\text{L}} = ${ntex(p, 6)}` }],
    copy: `Concentración = ${fmt(p, 5)} ppm (mg/L)`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Método de cálculo", MODES, "molarity");
  if (mode === "molarity") return molarity(input);
  if (mode === "dilution") return dilution(input);
  if (mode === "percent") return percent(input);
  if (mode === "molality") return molality(input);
  return ppm(input);
}
