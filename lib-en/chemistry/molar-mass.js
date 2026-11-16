import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { parseFormula, molarMass, formulaTex, formulaHtmlText, BY_SYMBOL, FormulaError } from "./formula.js";

const NA = 6.02214076e23;

export const meta = {
  description: "Calculates the molar mass of any chemical compound from its formula, with the mass percentage of each element, and converts between mass, number of moles and number of particles.",
  keywords: ["molar mass", "molecular weight", "molar mass", "molecular weight", "mole", "Avogadro's number", "mass percentage", "g/mol"],
  formulas: [
    { label: "molar mass", tex: "M = \\sum_i n_i \\, A_i" },
    { label: "Moles and number of particles", tex: "n = \\frac{m}{M},\\qquad N = n\\,N_A" }
  ],
  inputs: [
    { id: "formula", label: "Chemical formula", type: "text", default: "C6H12O6", help: "Write the symbols with a capital first letter, such as H2SO4, Ca(OH)2, CuSO4·5H2O or K4[Fe(CN)6]." },
    { id: "mode", label: "Additional conversion", type: "select", default: "none", options: [["none", "None"], ["mass", "I have a mass (g)"], ["mol", "I have a number of moles"]] },
    { id: "mass", label: "Mass", unit: "g", type: "number", default: "90", when: { mode: ["mass"] } },
    { id: "moles", label: "Number of moles", unit: "mol", type: "number", default: "0.5", when: { mode: ["mol"] } }
  ],
  example: { values: { formula: "H2SO4", mode: "mass", mass: "49", moles: "" }, expect: ["M(H2SO4) = 98.07 g/mol", "n = 0.4996 mol"], note: "Example: the molar mass of sulfuric acid and the number of moles in 49 g of it." },
  invalid: { values: { formula: "Xy2", mode: "none" } },
  related: ["stoichiometry", "empirical-formula", "solutions", "periodic-table", "equation-balancer"]
};

export function solve(input) {
  const raw = str(input, "formula", "Chemical formula");
  let counts;
  try { counts = parseFormula(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "formula"); throw e; }
  const M = molarMass(counts);
  const shown = formulaHtmlText(raw);
  const rows = Object.entries(counts).map(([el, n]) => {
    const e = BY_SYMBOL[el], sub = e.mass * n;
    return [`${e.ar} (${el})`, String(n), fmt(e.mass, 6), fmt(sub, 6), `${fmt((100 * sub) / M, 4)}%`];
  });
  const steps = [
    `We count the atoms of each element in the formula ${shown}: ${Object.entries(counts).map(([el, n]) => `${el} = ${n}`).join("، ")}.`,
    { text: "We multiply the number of atoms of each element by its atomic mass and add:", tex: `M = ${Object.entries(counts).map(([el, n]) => `${n}(${ntex(BY_SYMBOL[el].mass)})`).join(" + ")} = ${ntex(M, 6)}\\ \\text{g/mol}` },
    "The mass percentage of each element = (its contribution ÷ molar mass) × 100%, shown in the table."
  ];
  const results = [
    { label: "molar mass", value: `${fmt(M, 6)} g/mol`, text: `M = ${fmt(M, 4)} g/mol`, tex: `M(\\mathrm{${formulaTex(raw)}}) = ${ntex(M, 6)}\\ \\text{g/mol}` },
    { label: "Number of atoms in the formula unit", value: String(Object.values(counts).reduce((a, b) => a + b, 0)) }
  ];
  let copy = `M(${shown}) = ${fmt(M, 4)} g/mol`;
  const mode = isBlank(input.mode) ? "none" : input.mode;
  if (mode === "mass") {
    const m = num(input, "mass", "Mass", { positive: true });
    const n = m / M;
    steps.push({ text: "Number of moles and number of particles:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M, 6)}} = ${ntex(n, 4)}\\ \\text{mol},\\quad N = nN_A = ${ntex(n * NA, 4)}` });
    results.push({ label: "Number of moles", value: `${fmt(n, 4)} mol` }, { label: "Number of particles (units)", value: fmt(n * NA, 4) });
    copy += `, n = ${fmt(n, 4)} mol`;
  } else if (mode === "mol") {
    const n = num(input, "moles", "Number of moles", { positive: true });
    const m = n * M;
    steps.push({ text: "Mass and number of particles:", tex: `m = nM = ${ntex(n)} \\times ${ntex(M, 6)} = ${ntex(m, 4)}\\ \\text{g},\\quad N = ${ntex(n * NA, 4)}` });
    results.push({ label: "Mass", value: `${fmt(m, 4)} g` }, { label: "Number of particles (units)", value: fmt(n * NA, 4) });
    copy += `, m = ${fmt(m, 4)} g`;
  } else if (mode !== "none") fail("Choose the conversion type.", "mode");
  return {
    results, steps, copy,
    blocks: [{ type: "table", caption: "Mass composition", head: ["Element", "Number of atoms", "Atomic mass", "Contribution (g/mol)", "Mass percentage"], rows }]
  };
}
