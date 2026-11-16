import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { balance, equationText, equationTex, molarMass, cleanFormula, formulaHtmlText, formulaTex, FormulaError } from "./formula.js";

export const meta = {
  description: "Cálculos de reacción química: equilibra la ecuación automáticamente, convierte las cantidades de reactivos en moles, determina el reactivo limitante y el exceso, y calcula el rendimiento teórico y el porcentaje de rendimiento.",
  keywords: ["Cálculos químicos", "Estequiometría", "stoichiometry", "Reactivo limitante", "limiting reagent", "Rendimiento teórico", "Porcentaje de rendimiento", "percent yield", "Reactivo en exceso"],
  formulas: [
    { label: "Reactivo limitante: menor cociente", tex: "\\min_j \\frac{n_j}{a_j}" },
    { label: "Rendimiento teórico y porcentaje de rendimiento", tex: "n_P = \\frac{b_P}{a_L}\\, n_L,\\qquad \\%\\,\\text{yield} = \\frac{m_{\\text{actual}}}{m_{\\text{theoretical}}}\\times 100" }
  ],
  inputs: [
    { id: "equation", label: "Ecuación (se equilibra automáticamente)", type: "text", default: "N2 + H2 -> NH3", wide: true },
    { id: "amounts", label: "Cantidades de reactivos conocidas", type: "textarea", default: "N2 = 28 g\nH2 = 10 g", wide: true, help: "Una línea por sustancia: la fórmula = valor seguido de g o mol, como Fe = 10 g u O2 = 0.5 mol. Introduce al menos un reactivo." },
    { id: "product", label: "Producto deseado", type: "text", default: "", help: "Déjalo vacío para usar el primer producto de la ecuación." },
    { id: "actual", label: "Rendimiento real (opcional)", unit: "g", type: "number", default: "" }
  ],
  example: { values: { equation: "Fe + O2 -> Fe2O3", amounts: "Fe = 11.17 g\nO2 = 6 g", product: "Fe2O3", actual: "12" }, expect: ["Reactivo limitante: Fe", "m = 15.97 g", "75.14%"], note: "Ejemplo: combustión de 11.17 g de hierro con 6 g de oxígeno, y se obtuvieron 12 g en la práctica." },
  invalid: { values: { equation: "H2 + O2 -> H2O", amounts: "H2O = 5 g", product: "", actual: "" } },
  related: ["equation-balancer", "molar-mass", "solutions", "empirical-formula"]
};

const key = (s) => cleanFormula(s).replace(/[·•*.]/g, "·");

export function solve(input) {
  const raw = str(input, "equation", "Ecuación");
  let b;
  try { b = balance(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "equation"); throw e; }
  const nL = b.reactants.length;
  const masses = b.parsed.map(molarMass);
  const idx = new Map(b.species.map((s, i) => [key(s), i]));
  const lines = str(input, "amounts", "Cantidades de reactivos").split(/\r?\n|[;؛]/).map((l) => l.trim()).filter(Boolean);
  const given = new Map();
  lines.forEach((line, li) => {
    const m = line.match(/^(.+?)\s*[=:]\s*(.+?)\s*(g|mol|غ|غرام|مول)?\s*$/i);
    if (!m) fail(`La línea ${li + 1} no se entiende. Escríbela como: Fe = 10 g`, "amounts");
    const i = idx.get(key(m[1]));
    if (i === undefined) fail(`La sustancia «${m[1]}» de la línea ${li + 1} no está en la ecuación.`, "amounts");
    if (i >= nL) fail(`«${m[1]}» es un producto, no un reactivo. Introduce solo las cantidades de los reactivos.`, "amounts");
    const v = parseNumber(m[2]);
    if (!(v > 0) || !isFinite(v)) fail(`La cantidad de la línea ${li + 1} debe ser un número positivo.`, "amounts");
    const unit = (m[3] || "g").toLowerCase();
    const mol = unit === "mol" || unit === "Mol" ? v : v / masses[i];
    given.set(i, mol);
  });
  if (!given.size) fail("Introduce la cantidad de al menos un reactivo.", "amounts");
  let target = nL;
  if (!isBlank(input.product)) {
    const t = idx.get(key(input.product));
    if (t === undefined || t < nL) fail("El producto deseado debe ser uno de los productos de la ecuación.", "product");
    target = t;
  }
  const ratios = [...given].map(([i, n]) => [i, n / b.coef[i]]);
  const [Li, ext] = ratios.reduce((a, r) => (r[1] < a[1] ? r : a));
  const nT = ext * b.coef[target], mT = nT * masses[target];
  const name = (i) => formulaHtmlText(b.species[i]);
  const steps = [
    { text: "Primero equilibramos la ecuación:", tex: equationTex(b) },
    { text: "Convertimos las cantidades a moles y dividimos entre el coeficiente:", tex: `\\begin{aligned}${ratios.map(([i, r]) => `\\mathrm{${formulaTex(b.species[i])}}:&\\ n = ${ntex(given.get(i), 5)}\\ \\text{mol},\\quad \\tfrac{n}{${b.coef[i]}} = ${ntex(r, 5)}`).join("\\\\")}\\end{aligned}` },
    given.size > 1 ? `El menor cociente corresponde a ${name(Li)}, así que es el reactivo limitante, y el resto está en exceso.` : `Solo se introdujo un reactivo (${name(Li)}), así que lo tomamos como reactivo limitante y suponemos que el resto está disponible en abundancia.`,
    { text: `Rendimiento teórico de ${name(target)}:`, tex: `n = \\frac{${b.coef[target]}}{${b.coef[Li]}} \\times ${ntex(given.get(Li), 5)} = ${ntex(nT, 5)}\\ \\text{mol},\\quad m = nM = ${ntex(nT, 5)} \\times ${ntex(masses[target], 6)} = ${ntex(mT, 5)}\\ \\text{g}` }
  ];
  const rows = b.species.map((sp, i) => {
    const used = ext * b.coef[i];
    const left = i < nL && given.has(i) ? given.get(i) - used : null;
    return [name(i), String(b.coef[i]), fmt(masses[i], 6), i < nL ? (given.has(i) ? fmt(given.get(i), 5) : "—") : "—", `${fmt(used, 5)} mol = ${fmt(used * masses[i], 5)} g`, left === null ? "—" : `${fmt(Math.max(left, 0), 4)} mol = ${fmt(Math.max(left, 0) * masses[i], 4)} g`];
  });
  const results = [
    { label: "Ecuación balanceada", value: equationText(b) },
    { label: "Reactivo limitante", value: name(Li), text: `Reactivo limitante: ${name(Li)}` },
    { label: `Rendimiento teórico de ${name(target)}`, value: `${fmt(mT, 4)} g (${fmt(nT, 4)} mol)`, text: `m = ${fmt(mT, 4)} g` }
  ];
  let copy = `${equationText(b)} | Reactivo limitante: ${name(Li)} | ${name(target)}: m = ${fmt(mT, 4)} g`;
  if (!isBlank(input.actual)) {
    const a = num(input, "actual", "Rendimiento real", { positive: true });
    const pct = (100 * a) / mT;
    steps.push({ text: "Porcentaje de rendimiento:", tex: `\\frac{${ntex(a)}}{${ntex(mT, 5)}} \\times 100 = ${ntex(pct, 4)}\\%` });
    results.push({ label: "Porcentaje de rendimiento", value: `${fmt(pct, 4)}%` });
    copy += ` | ${fmt(pct, 4)}%`;
    if (pct > 100) steps.push("Un porcentaje mayor que 100 % suele indicar que el producto no está seco o no es puro, o un error de medición.");
  }
  return { results, steps, copy, blocks: [{ type: "table", caption: "Tabla cuantitativa (lo que reacciona o se produce al agotarse el reactivo limitante)", head: ["Sustancia", "Coeficiente", "M (g/mol)", "Dado (mol)", "Reactivo/producto", "Restante"], rows }] };
}
