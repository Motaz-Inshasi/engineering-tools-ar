import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { balance, equationText, equationTex, molarMass, cleanFormula, formulaHtmlText, formulaTex, FormulaError } from "./formula.js";

export const meta = {
  description: "Chemical reaction calculations: the equation is balanced automatically, then the amounts of reactants are converted to moles, the limiting reactant and the excess reactant are determined, and the theoretical yield and percent yield are calculated.",
  keywords: ["Chemical calculations", "stoichiometry", "stoichiometry", "limiting reactant", "limiting reagent", "theoretical yield", "percent yield", "percent yield", "excess reactant"],
  formulas: [
    { label: "Limiting reactant: smallest ratio", tex: "\\min_j \\frac{n_j}{a_j}" },
    { label: "Theoretical yield and percent yield", tex: "n_P = \\frac{b_P}{a_L}\\, n_L,\\qquad \\%\\,\\text{yield} = \\frac{m_{\\text{actual}}}{m_{\\text{theoretical}}}\\times 100" }
  ],
  inputs: [
    { id: "equation", label: "Equation (balanced automatically)", type: "text", default: "N2 + H2 -> NH3", wide: true },
    { id: "amounts", label: "Known reactant amounts", type: "textarea", default: "N2 = 28 g\nH2 = 10 g", wide: true, help: "One line per substance: the formula = the value followed by g or mol, such as Fe = 10 g or O2 = 0.5 mol. Enter at least one reactant." },
    { id: "product", label: "Desired product", type: "text", default: "", help: "Leave empty to use the first product in the equation." },
    { id: "actual", label: "Actual yield (optional)", unit: "g", type: "number", default: "" }
  ],
  example: { values: { equation: "Fe + O2 -> Fe2O3", amounts: "Fe = 11.17 g\nO2 = 6 g", product: "Fe2O3", actual: "12" }, expect: ["Limiting reactant: Fe", "m = 15.97 g", "75.14%"], note: "Example: combustion of 11.17 g of iron with 6 g of oxygen, and we actually obtained 12 g." },
  invalid: { values: { equation: "H2 + O2 -> H2O", amounts: "H2O = 5 g", product: "", actual: "" } },
  related: ["equation-balancer", "molar-mass", "solutions", "empirical-formula"]
};

const key = (s) => cleanFormula(s).replace(/[·•*.]/g, "·");

export function solve(input) {
  const raw = str(input, "equation", "Equation");
  let b;
  try { b = balance(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "equation"); throw e; }
  const nL = b.reactants.length;
  const masses = b.parsed.map(molarMass);
  const idx = new Map(b.species.map((s, i) => [key(s), i]));
  const lines = str(input, "amounts", "Reactant amounts").split(/\r?\n|[;؛]/).map((l) => l.trim()).filter(Boolean);
  const given = new Map();
  lines.forEach((line, li) => {
    const m = line.match(/^(.+?)\s*[=:]\s*(.+?)\s*(g|mol|غ|غرام|مول)?\s*$/i);
    if (!m) fail(`Line ${li + 1} is not understood. Write it like: Fe = 10 g`, "amounts");
    const i = idx.get(key(m[1]));
    if (i === undefined) fail(`The substance «${m[1]}» on line ${li + 1} is not in the equation.`, "amounts");
    if (i >= nL) fail(`«${m[1]}» is a product, not a reactant. Enter the reactant amounts only.`, "amounts");
    const v = parseNumber(m[2]);
    if (!(v > 0) || !isFinite(v)) fail(`The amount on line ${li + 1} must be a positive number.`, "amounts");
    const unit = (m[3] || "g").toLowerCase();
    const mol = unit === "mol" || unit === "mole" ? v : v / masses[i];
    given.set(i, mol);
  });
  if (!given.size) fail("Enter the amount of at least one reactant.", "amounts");
  let target = nL;
  if (!isBlank(input.product)) {
    const t = idx.get(key(input.product));
    if (t === undefined || t < nL) fail("The desired product must be one of the products of the equation.", "product");
    target = t;
  }
  const ratios = [...given].map(([i, n]) => [i, n / b.coef[i]]);
  const [Li, ext] = ratios.reduce((a, r) => (r[1] < a[1] ? r : a));
  const nT = ext * b.coef[target], mT = nT * masses[target];
  const name = (i) => formulaHtmlText(b.species[i]);
  const steps = [
    { text: "We balance the equation first:", tex: equationTex(b) },
    { text: "We convert the amounts to moles and divide by the coefficient:", tex: `\\begin{aligned}${ratios.map(([i, r]) => `\\mathrm{${formulaTex(b.species[i])}}:&\\ n = ${ntex(given.get(i), 5)}\\ \\text{mol},\\quad \\tfrac{n}{${b.coef[i]}} = ${ntex(r, 5)}`).join("\\\\")}\\end{aligned}` },
    given.size > 1 ? `The smallest ratio belongs to ${name(Li)}, so it is the limiting reactant, and the rest are in excess.` : `Only one reactant was entered (${name(Li)}), so we take it as the limiting reactant and assume the others are available in large amounts.`,
    { text: `Theoretical yield from ${name(target)}:`, tex: `n = \\frac{${b.coef[target]}}{${b.coef[Li]}} \\times ${ntex(given.get(Li), 5)} = ${ntex(nT, 5)}\\ \\text{mol},\\quad m = nM = ${ntex(nT, 5)} \\times ${ntex(masses[target], 6)} = ${ntex(mT, 5)}\\ \\text{g}` }
  ];
  const rows = b.species.map((sp, i) => {
    const used = ext * b.coef[i];
    const left = i < nL && given.has(i) ? given.get(i) - used : null;
    return [name(i), String(b.coef[i]), fmt(masses[i], 6), i < nL ? (given.has(i) ? fmt(given.get(i), 5) : "—") : "—", `${fmt(used, 5)} mol = ${fmt(used * masses[i], 5)} g`, left === null ? "—" : `${fmt(Math.max(left, 0), 4)} mol = ${fmt(Math.max(left, 0) * masses[i], 4)} g`];
  });
  const results = [
    { label: "Balanced equation", value: equationText(b) },
    { label: "limiting reactant", value: name(Li), text: `Limiting reactant: ${name(Li)}` },
    { label: `Theoretical yield from ${name(target)}`, value: `${fmt(mT, 4)} g (${fmt(nT, 4)} mol)`, text: `m = ${fmt(mT, 4)} g` }
  ];
  let copy = `${equationText(b)} | Limiting reactant: ${name(Li)} | ${name(target)}: m = ${fmt(mT, 4)} g`;
  if (!isBlank(input.actual)) {
    const a = num(input, "actual", "Actual yield", { positive: true });
    const pct = (100 * a) / mT;
    steps.push({ text: "Percent yield:", tex: `\\frac{${ntex(a)}}{${ntex(mT, 5)}} \\times 100 = ${ntex(pct, 4)}\\%` });
    results.push({ label: "percent yield", value: `${fmt(pct, 4)}%` });
    copy += ` | ${fmt(pct, 4)}%`;
    if (pct > 100) steps.push("A percentage above 100% usually means the product is not dry or pure, or there is a measurement error.");
  }
  return { results, steps, copy, blocks: [{ type: "table", caption: "Quantitative table (what reacts or is produced when the limiting reactant runs out)", head: ["Substance", "Coefficient", "M (g/mol)", "Given (mol)", "Reactant/product", "Remaining"], rows }] };
}
