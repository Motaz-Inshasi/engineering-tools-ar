import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { parseFormula, molarMass, formulaTex, formulaHtmlText, BY_SYMBOL, FormulaError } from "./formula.js";

const NA = 6.02214076e23;

export const meta = {
  description: "Calcule la masse molaire de tout composé chimique à partir de sa formule, avec le pourcentage massique de chaque élément, et convertit entre la masse, le nombre de moles et le nombre d'entités.",
  keywords: ["Masse molaire", "masse moléculaire", "molar mass", "molecular weight", "mole", "nombre d'Avogadro", "pourcentage massique", "g/mol"],
  formulas: [
    { label: "Masse molaire", tex: "M = \\sum_i n_i \\, A_i" },
    { label: "Moles et nombre d'entités", tex: "n = \\frac{m}{M},\\qquad N = n\\,N_A" }
  ],
  inputs: [
    { id: "formula", label: "Formule chimique", type: "text", default: "C6H12O6", help: "Écrivez les symboles avec une majuscule initiale, par exemple H2SO4, Ca(OH)2, CuSO4·5H2O ou K4[Fe(CN)6]." },
    { id: "mode", label: "Conversion supplémentaire", type: "select", default: "none", options: [["none", "Aucune"], ["mass", "J'ai une masse (g)"], ["mol", "J'ai un nombre de moles"]] },
    { id: "mass", label: "Masse", unit: "g", type: "number", default: "90", when: { mode: ["mass"] } },
    { id: "moles", label: "Nombre de moles", unit: "mol", type: "number", default: "0.5", when: { mode: ["mol"] } }
  ],
  example: { values: { formula: "H2SO4", mode: "mass", mass: "49", moles: "" }, expect: ["M(H2SO4) = 98.07 g/mol", "n = 0.4996 mol"], note: "Exemple : masse molaire de l'acide sulfurique et nombre de moles contenues dans 49 g de celui-ci." },
  invalid: { values: { formula: "Xy2", mode: "none" } },
  related: ["stoichiometry", "empirical-formula", "solutions", "periodic-table", "equation-balancer"]
};

export function solve(input) {
  const raw = str(input, "formula", "Formule chimique");
  let counts;
  try { counts = parseFormula(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "formula"); throw e; }
  const M = molarMass(counts);
  const shown = formulaHtmlText(raw);
  const rows = Object.entries(counts).map(([el, n]) => {
    const e = BY_SYMBOL[el], sub = e.mass * n;
    return [`${e.ar} (${el})`, String(n), fmt(e.mass, 6), fmt(sub, 6), `${fmt((100 * sub) / M, 4)}%`];
  });
  const steps = [
    `On compte les atomes de chaque élément dans la formule ${shown} : ${Object.entries(counts).map(([el, n]) => `${el} = ${n}`).join("، ")}.`,
    { text: "On multiplie le nombre d'atomes de chaque élément par sa masse atomique, puis on additionne :", tex: `M = ${Object.entries(counts).map(([el, n]) => `${n}(${ntex(BY_SYMBOL[el].mass)})`).join(" + ")} = ${ntex(M, 6)}\\ \\text{g/mol}` },
    "Pourcentage massique de chaque élément = (sa contribution ÷ masse molaire) × 100 %, affiché dans le tableau."
  ];
  const results = [
    { label: "Masse molaire", value: `${fmt(M, 6)} g/mol`, text: `M = ${fmt(M, 4)} g/mol`, tex: `M(\\mathrm{${formulaTex(raw)}}) = ${ntex(M, 6)}\\ \\text{g/mol}` },
    { label: "Nombre d'atomes dans l'unité formulaire", value: String(Object.values(counts).reduce((a, b) => a + b, 0)) }
  ];
  let copy = `M(${shown}) = ${fmt(M, 4)} g/mol`;
  const mode = isBlank(input.mode) ? "none" : input.mode;
  if (mode === "mass") {
    const m = num(input, "mass", "Masse", { positive: true });
    const n = m / M;
    steps.push({ text: "Nombre de moles et nombre d'entités :", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M, 6)}} = ${ntex(n, 4)}\\ \\text{mol},\\quad N = nN_A = ${ntex(n * NA, 4)}` });
    results.push({ label: "Nombre de moles", value: `${fmt(n, 4)} mol` }, { label: "Nombre d'entités (unités)", value: fmt(n * NA, 4) });
    copy += `, n = ${fmt(n, 4)} mol`;
  } else if (mode === "mol") {
    const n = num(input, "moles", "Nombre de moles", { positive: true });
    const m = n * M;
    steps.push({ text: "Masse et nombre d'entités :", tex: `m = nM = ${ntex(n)} \\times ${ntex(M, 6)} = ${ntex(m, 4)}\\ \\text{g},\\quad N = ${ntex(n * NA, 4)}` });
    results.push({ label: "Masse", value: `${fmt(m, 4)} g` }, { label: "Nombre d'entités (unités)", value: fmt(n * NA, 4) });
    copy += `, m = ${fmt(m, 4)} g`;
  } else if (mode !== "none") fail("Choisissez le type de conversion.", "mode");
  return {
    results, steps, copy,
    blocks: [{ type: "table", caption: "Composition massique", head: ["Élément", "Nombre d'atomes", "Masse atomique", "Contribution (g/mol)", "Pourcentage massique"], rows }]
  };
}
