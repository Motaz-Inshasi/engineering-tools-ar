import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["molarity", "dilution", "percent", "molality", "ppm"];
const DIL = ["C1", "V1", "C2", "V2"];
const DIL_LABEL = { C1: "Concentration initiale C1", V1: "Volume initial V1", C2: "Concentration finale C2", V2: "Volume final V2" };
const EMPTY = { mass: "", molarMass: "", volume: "", solutionMass: "", solventKg: "", massMg: "", C1: "", V1: "", C2: "", V2: "" };
const sub = (k) => `${k[0]}_${k[1]}`;

export const meta = {
  description: "Calcule la concentration d'une solution de plusieurs façons : concentration molaire à partir de la masse, de la masse molaire et du volume, ou dilution C1V1 = C2V2 en déterminant l'inconnue à partir de trois valeurs, ou pourcentage massique, molalité ou ppm.",
  keywords: ["concentration", "concentration molaire", "molarité", "molarity", "dilution", "dilution", "C1V1 = C2V2", "pourcentage massique", "molalité", "molality", "ppm", "partie par million", "solution"],
  formulas: [
    { label: "Concentration molaire", tex: "C = \\frac{n}{V} = \\frac{m}{MV}" },
    { label: "Dilution", tex: "C_1V_1 = C_2V_2" },
    { label: "Pourcentage massique", tex: "\\% = \\frac{m_{solute}}{m_{solution}} \\times 100" },
    { label: "Molalité", tex: "b = \\frac{n}{m_{solvent}}" },
    { label: "partie par million", tex: "\\text{ppm} = \\frac{\\text{mg}}{\\text{L}}" }
  ],
  inputs: [
    { id: "mode", label: "Méthode de calcul", type: "select", default: "molarity", options: [["molarity", "Concentration molaire M"], ["dilution", "Dilution C1V1 = C2V2"], ["percent", "Pourcentage massique"], ["molality", "Molalité mol/kg"], ["ppm", "ppm (mg/L)"]] },
    { id: "mass", label: "Masse du soluté", unit: "g", type: "number", default: "58.44", when: { mode: ["molarity", "percent", "molality"] } },
    { id: "molarMass", label: "Masse molaire du soluté M", unit: "g/mol", type: "number", default: "58.44", when: { mode: ["molarity", "molality"] } },
    { id: "volume", label: "Volume de la solution", unit: "L", type: "number", default: "1", when: { mode: ["molarity", "ppm"] } },
    { id: "solutionMass", label: "Masse totale de la solution", unit: "g", type: "number", when: { mode: ["percent"] }, help: "Masse du soluté + masse du solvant." },
    { id: "solventKg", label: "Masse du solvant", unit: "kg", type: "number", when: { mode: ["molality"] } },
    { id: "massMg", label: "Masse du soluté", unit: "mg", type: "number", when: { mode: ["ppm"] } },
    { id: "C1", label: "Concentration initiale C1", unit: "M", type: "number", when: { mode: ["dilution"] }, help: "Saisissez trois valeurs parmi C1, V1, C2 et V2, et laissez la quatrième vide." },
    { id: "V1", label: "Volume initial V1", type: "number", when: { mode: ["dilution"] }, help: "Toute unité de volume convient, à condition d'utiliser la même pour V1 et V2." },
    { id: "C2", label: "Concentration finale C2", unit: "M", type: "number", when: { mode: ["dilution"] } },
    { id: "V2", label: "Volume final V2", type: "number", when: { mode: ["dilution"] } }
  ],
  example: { values: { ...EMPTY, mode: "molarity", mass: "58.44", molarMass: "58.44", volume: "1" }, expect: ["1 M"], note: "Exemple : 58.44 g de NaCl (M = 58.44 g/mol) dans 1 L." },
  invalid: { values: { ...EMPTY, mode: "dilution", C1: "1", V1: "1" } },
  related: ["ph-calculator", "reaction-kinetics", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function molarity(input) {
  const m = num(input, "mass", "Masse du soluté", { nonNegative: true });
  const M = num(input, "molarMass", "Masse molaire", { positive: true });
  const V = num(input, "volume", "Volume de la solution", { positive: true });
  const n = m / M;
  const c = n / V;
  return {
    results: [
      { label: "Nombre de moles n", value: `${fmt(n, 5)} mol` },
      { label: "Concentration molaire", value: `${fmt(c, 5)} M` }
    ],
    steps: [
      { text: "Nombre de moles à partir de la masse et de la masse molaire :", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M)}} = ${ntex(n, 6)}\\ \\text{mol}` },
      { text: "Concentration molaire = moles / volume en litres :", tex: `C = \\frac{n}{V} = \\frac{${ntex(n, 6)}}{${ntex(V)}} = ${ntex(c, 6)}\\ \\text{M}` }
    ],
    copy: `Concentration molaire = ${fmt(c, 5)} M`
  };
}

function dilution(input) {
  const blanks = DIL.filter((k) => isBlank(input[k]));
  const filled = DIL.length - blanks.length;
  if (filled !== 3) fail(`Saisissez exactement trois valeurs et laissez la quatrième vide (vous en avez saisi ${filled}).`, filled < 3 ? blanks[0] : DIL.find((k) => !isBlank(input[k])));
  const unknown = blanks[0];
  const v = {};
  for (const k of DIL) if (k !== unknown) v[k] = num(input, k, DIL_LABEL[k], { positive: true });
  const [[a, b], d] = { C1: [["C2", "V2"], "V1"], V1: [["C2", "V2"], "C1"], C2: [["C1", "V1"], "V2"], V2: [["C1", "V1"], "C2"] }[unknown];
  const x = (v[a] * v[b]) / v[d];
  const unit = unknown[0] === "C" ? " M" : "";
  return {
    results: [{ label: `${DIL_LABEL[unknown]} calculé`, value: `${fmt(x, 5)}${unit}` }],
    steps: [
      { text: "Loi de la dilution : la quantité de matière de soluté ne change pas :", tex: "C_1V_1 = C_2V_2" },
      { text: `On calcule ${unknown} inconnu :`, tex: `${sub(unknown)} = \\frac{${sub(a)}\\,${sub(b)}}{${sub(d)}} = \\frac{${ntex(v[a])} \\times ${ntex(v[b])}}{${ntex(v[d])}} = ${ntex(x, 6)}` }
    ],
    copy: `${unknown} = ${fmt(x, 5)}${unit}`
  };
}

function percent(input) {
  const m = num(input, "mass", "Masse du soluté", { nonNegative: true });
  const S = num(input, "solutionMass", "Masse de la solution", { positive: true });
  if (m > S) fail("La masse du soluté ne peut pas dépasser la masse de la solution.", "mass");
  const p = (100 * m) / S;
  return {
    results: [{ label: "Pourcentage massique", value: `${fmt(p, 5)} %` }],
    steps: [{ text: "Pourcentage massique :", tex: `\\% = \\frac{m_{solute}}{m_{solution}} \\times 100 = \\frac{${ntex(m)}}{${ntex(S)}} \\times 100 = ${ntex(p, 6)}\\ \\%` }],
    copy: `Pourcentage massique = ${fmt(p, 5)} %`
  };
}

function molality(input) {
  const m = num(input, "mass", "Masse du soluté", { nonNegative: true });
  const M = num(input, "molarMass", "Masse molaire", { positive: true });
  const kg = num(input, "solventKg", "Masse du solvant", { positive: true });
  const n = m / M;
  const b = n / kg;
  return {
    results: [
      { label: "Nombre de moles n", value: `${fmt(n, 5)} mol` },
      { label: "Molalité", value: `${fmt(b, 5)} mol/kg` }
    ],
    steps: [
      { text: "Nombre de moles :", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M)}} = ${ntex(n, 6)}\\ \\text{mol}` },
      { text: "Molalité = moles / masse du solvant en kilogrammes :", tex: `b = \\frac{n}{m_{solvent}} = \\frac{${ntex(n, 6)}}{${ntex(kg)}} = ${ntex(b, 6)}\\ \\text{mol/kg}` }
    ],
    copy: `Molalité = ${fmt(b, 5)} mol/kg`
  };
}

function ppm(input) {
  const mg = num(input, "massMg", "Masse du soluté en mg", { nonNegative: true });
  const V = num(input, "volume", "Volume de la solution", { positive: true });
  const p = mg / V;
  return {
    results: [{ label: "Concentration en ppm", value: `${fmt(p, 5)} ppm (mg/L)` }],
    steps: [{ text: "ppm = mg de soluté / litres de solution :", tex: `\\text{ppm} = \\frac{${ntex(mg)}\\ \\text{mg}}{${ntex(V)}\\ \\text{L}} = ${ntex(p, 6)}` }],
    copy: `Concentration = ${fmt(p, 5)} ppm (mg/L)`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Méthode de calcul", MODES, "molarity");
  if (mode === "molarity") return molarity(input);
  if (mode === "dilution") return dilution(input);
  if (mode === "percent") return percent(input);
  if (mode === "molality") return molality(input);
  return ppm(input);
}
