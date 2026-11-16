import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { balance, equationText, equationTex, molarMass, cleanFormula, formulaHtmlText, formulaTex, FormulaError } from "./formula.js";

export const meta = {
  description: "Calculs de réaction chimique : équilibre automatiquement l'équation, convertit les quantités des réactifs en moles, détermine le réactif limitant et le réactif en excès, puis calcule le produit théorique et le rendement en pourcentage.",
  keywords: ["calculs chimiques", "stœchiométrie", "stoichiometry", "réactif limitant", "limiting reagent", "rendement théorique", "rendement en pourcentage", "percent yield", "réactif en excès"],
  formulas: [
    { label: "Réactif limitant : rapport minimal", tex: "\\min_j \\frac{n_j}{a_j}" },
    { label: "Produit théorique et rendement en pourcentage", tex: "n_P = \\frac{b_P}{a_L}\\, n_L,\\qquad \\%\\,\\text{yield} = \\frac{m_{\\text{actual}}}{m_{\\text{theoretical}}}\\times 100" }
  ],
  inputs: [
    { id: "equation", label: "Équation (équilibrée automatiquement)", type: "text", default: "N2 + H2 -> NH3", wide: true },
    { id: "amounts", label: "Quantités connues des réactifs", type: "textarea", default: "N2 = 28 g\nH2 = 10 g", wide: true, help: "Une ligne par substance : formule = valeur puis g ou mol, par exemple Fe = 10 g ou O2 = 0.5 mol. Saisissez au moins un réactif." },
    { id: "product", label: "Produit demandé", type: "text", default: "", help: "Laissez vide pour utiliser le premier produit de l'équation." },
    { id: "actual", label: "Rendement réel (facultatif)", unit: "g", type: "number", default: "" }
  ],
  example: { values: { equation: "Fe + O2 -> Fe2O3", amounts: "Fe = 11.17 g\nO2 = 6 g", product: "Fe2O3", actual: "12" }, expect: ["Réactif limitant : Fe", "m = 15.97 g", "75.14%"], note: "Exemple : combustion de 11.17 g de fer avec 6 g d'oxygène, avec 12 g obtenus réellement." },
  invalid: { values: { equation: "H2 + O2 -> H2O", amounts: "H2O = 5 g", product: "", actual: "" } },
  related: ["equation-balancer", "molar-mass", "solutions", "empirical-formula"]
};

const key = (s) => cleanFormula(s).replace(/[·•*.]/g, "·");

export function solve(input) {
  const raw = str(input, "equation", "Équation");
  let b;
  try { b = balance(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "equation"); throw e; }
  const nL = b.reactants.length;
  const masses = b.parsed.map(molarMass);
  const idx = new Map(b.species.map((s, i) => [key(s), i]));
  const lines = str(input, "amounts", "Quantités des réactifs").split(/\r?\n|[;؛]/).map((l) => l.trim()).filter(Boolean);
  const given = new Map();
  lines.forEach((line, li) => {
    const m = line.match(/^(.+?)\s*[=:]\s*(.+?)\s*(g|mol|غ|غرام|مول)?\s*$/i);
    if (!m) fail(`La ligne ${li + 1} n'est pas compréhensible. Écrivez-la par exemple : Fe = 10 g`, "amounts");
    const i = idx.get(key(m[1]));
    if (i === undefined) fail(`La substance «${m[1]}» de la ligne ${li + 1} ne figure pas dans l'équation.`, "amounts");
    if (i >= nL) fail(`«${m[1]}» est un produit et non un réactif. Saisissez uniquement les quantités des réactifs.`, "amounts");
    const v = parseNumber(m[2]);
    if (!(v > 0) || !isFinite(v)) fail(`La quantité de la ligne ${li + 1} doit être un nombre positif.`, "amounts");
    const unit = (m[3] || "g").toLowerCase();
    const mol = unit === "mol" || unit === "mol" ? v : v / masses[i];
    given.set(i, mol);
  });
  if (!given.size) fail("Saisissez la quantité d'au moins un réactif.", "amounts");
  let target = nL;
  if (!isBlank(input.product)) {
    const t = idx.get(key(input.product));
    if (t === undefined || t < nL) fail("Le produit demandé doit être un des produits de l'équation.", "product");
    target = t;
  }
  const ratios = [...given].map(([i, n]) => [i, n / b.coef[i]]);
  const [Li, ext] = ratios.reduce((a, r) => (r[1] < a[1] ? r : a));
  const nT = ext * b.coef[target], mT = nT * masses[target];
  const name = (i) => formulaHtmlText(b.species[i]);
  const steps = [
    { text: "On équilibre d'abord l'équation :", tex: equationTex(b) },
    { text: "On convertit les quantités en moles et on divise par le coefficient :", tex: `\\begin{aligned}${ratios.map(([i, r]) => `\\mathrm{${formulaTex(b.species[i])}}:&\\ n = ${ntex(given.get(i), 5)}\\ \\text{mol},\\quad \\tfrac{n}{${b.coef[i]}} = ${ntex(r, 5)}`).join("\\\\")}\\end{aligned}` },
    given.size > 1 ? `Le plus petit rapport correspond à ${name(Li)} : c'est donc le réactif limitant, les autres sont en excès.` : `Un seul réactif a été saisi (${name(Li)}) : on le considère comme limitant et on suppose que les autres sont disponibles en grande quantité.`,
    { text: `Produit théorique à partir de ${name(target)} :`, tex: `n = \\frac{${b.coef[target]}}{${b.coef[Li]}} \\times ${ntex(given.get(Li), 5)} = ${ntex(nT, 5)}\\ \\text{mol},\\quad m = nM = ${ntex(nT, 5)} \\times ${ntex(masses[target], 6)} = ${ntex(mT, 5)}\\ \\text{g}` }
  ];
  const rows = b.species.map((sp, i) => {
    const used = ext * b.coef[i];
    const left = i < nL && given.has(i) ? given.get(i) - used : null;
    return [name(i), String(b.coef[i]), fmt(masses[i], 6), i < nL ? (given.has(i) ? fmt(given.get(i), 5) : "—") : "—", `${fmt(used, 5)} mol = ${fmt(used * masses[i], 5)} g`, left === null ? "—" : `${fmt(Math.max(left, 0), 4)} mol = ${fmt(Math.max(left, 0) * masses[i], 4)} g`];
  });
  const results = [
    { label: "Équation équilibrée", value: equationText(b) },
    { label: "réactif limitant", value: name(Li), text: `Réactif limitant : ${name(Li)}` },
    { label: `Produit théorique à partir de ${name(target)}`, value: `${fmt(mT, 4)} g (${fmt(nT, 4)} mol)`, text: `m = ${fmt(mT, 4)} g` }
  ];
  let copy = `${equationText(b)} | Réactif limitant : ${name(Li)} | ${name(target)} : m = ${fmt(mT, 4)} g`;
  if (!isBlank(input.actual)) {
    const a = num(input, "actual", "Rendement réel", { positive: true });
    const pct = (100 * a) / mT;
    steps.push({ text: "Rendement en pourcentage :", tex: `\\frac{${ntex(a)}}{${ntex(mT, 5)}} \\times 100 = ${ntex(pct, 4)}\\%` });
    results.push({ label: "rendement en pourcentage", value: `${fmt(pct, 4)}%` });
    copy += ` | ${fmt(pct, 4)}%`;
    if (pct > 100) steps.push("Un rendement supérieur à 100 % signifie généralement que le produit n'est pas sec ou pas pur, ou qu'il y a une erreur de mesure.");
  }
  return { results, steps, copy, blocks: [{ type: "table", caption: "Tableau quantitatif (ce qui réagit ou se forme à la fin du réactif limitant)", head: ["Substance", "Coefficient", "M (g/mol)", "Donné (mol)", "Réactif/produit", "Restant"], rows }] };
}
