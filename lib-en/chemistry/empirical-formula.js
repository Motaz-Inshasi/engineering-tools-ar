import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { BY_SYMBOL, molarMass } from "./formula.js";

export const meta = {
  description: "Derives the empirical formula (simplest ratio) from mass percentages or element masses, then the molecular formula if the molar mass is known, with a table of division by the smallest number of moles.",
  keywords: ["Empirical formula", "Molecular formula", "empirical formula", "molecular formula", "elemental analysis", "percentage", "simplest ratio"],
  formulas: [
    { label: "Moles of each element, then the simplest ratio", tex: "n_i = \\frac{m_i}{A_i},\\qquad r_i = \\frac{n_i}{\\min_j n_j}" },
    { label: "Molecular formula", tex: "k = \\frac{M_{\\text{molecular}}}{M_{\\text{empirical}}}" }
  ],
  inputs: [
    { id: "data", label: "Elements and their percentages or masses", type: "textarea", default: "C 40.0\nH 6.71\nO 53.29", wide: true, help: "One line per element: the symbol followed by the percentage or the mass in grams, such as C 40 or Na: 2.3" },
    { id: "M", label: "Molar mass of the compound (optional)", unit: "g/mol", type: "number", default: "180" }
  ],
  example: { values: { data: "C 40.0\nH 6.71\nO 53.29", M: "180.16" }, expect: ["CH2O", "C6H12O6"], note: "Example: a compound with C 40%, H 6.71% and O 53.29%, and molar mass 180.16 g/mol." },
  invalid: { values: { data: "C 40\nXx 60", M: "" } },
  related: ["molar-mass", "stoichiometry", "equation-balancer", "periodic-table"]
};

const ORDER = (els) => {
  const hasC = els.includes("C");
  return [...els].sort((a, b) => {
    if (hasC) {
      const r = (x) => (x === "C" ? 0 : x === "H" ? 1 : 2);
      if (r(a) !== r(b)) return r(a) - r(b);
    }
    return a.localeCompare(b);
  });
};

const write = (counts) => ORDER(Object.keys(counts)).map((el) => `${el}${counts[el] === 1 ? "" : counts[el]}`).join("");

export function solve(input) {
  const lines = str(input, "data", "Elements").split(/\r?\n|[;؛,،]/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  lines.forEach((line, i) => {
    const m = line.match(/^([A-Za-z]{1,2})\s*[:=]?\s*(\S+?)\s*%?$/);
    if (!m) fail(`Line ${i + 1} is not understood. Write it like: C 40`, "data");
    const sym = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    if (!BY_SYMBOL[sym]) fail(`«${m[1]}» is not a known element symbol.`, "data");
    if (items.some((x) => x.sym === sym)) fail(`Element ${sym} is repeated.`, "data");
    const v = parseNumber(m[2]);
    if (!(v > 0) || !isFinite(v)) fail(`The value of ${sym} must be a positive number.`, "data");
    items.push({ sym, v });
  });
  if (items.length < 2) fail("Enter at least two elements.", "data");
  for (const it of items) it.n = it.v / BY_SYMBOL[it.sym].mass;
  const min = Math.min(...items.map((x) => x.n));
  for (const it of items) it.r = it.n / min;
  let mult = 0, best = null;
  for (let k = 1; k <= 12; k++) {
    const err = Math.max(...items.map((x) => Math.abs(x.r * k - Math.round(x.r * k)) / Math.max(1, Math.round(x.r * k))));
    if (err < 0.04) { mult = k; break; }
    if (!best || err < best.err) best = { k, err };
  }
  const warn = !mult;
  if (!mult) mult = best.k;
  const counts = Object.fromEntries(items.map((x) => [x.sym, Math.round(x.r * mult)]));
  const emp = write(counts), Me = molarMass(counts);
  const total = items.reduce((a, x) => a + x.v, 0);
  const steps = [
    Math.abs(total - 100) < 1.5 ? "The total is close to 100, so we treat the values as percentages and assume a sample of mass 100 g." : `We treat the values as masses in grams (their total is ${fmt(total, 5)} g).`,
    { text: "We convert each mass to moles by dividing by the atomic mass:", tex: `\\begin{aligned}${items.map((x) => `\\text{${x.sym}}:&\\ \\frac{${ntex(x.v)}}{${ntex(BY_SYMBOL[x.sym].mass)}} = ${ntex(x.n, 5)}`).join("\\\\")}\\end{aligned}` },
    `We divide by the smallest number of moles (${fmt(min, 5)}): ${items.map((x) => `${x.sym} = ${fmt(x.r, 4)}`).join("، ")}.`,
    mult > 1 ? `The ratios are not whole numbers, so we multiply them by ${mult}: ${items.map((x) => `${x.sym} = ${fmt(x.r * mult, 4)}`).join("، ")}, then round.` : "The ratios are close to whole numbers, so we round them.",
    { text: "The empirical formula (in Hill order) and its mass:", tex: `\\mathrm{${emp.replace(/(\d+)/g, "_{$1}")}},\\quad M_e = ${ntex(Me, 6)}\\ \\text{g/mol}` }
  ];
  const results = [{ label: "Empirical formula", value: emp }, { label: "Mass of the empirical formula", value: `${fmt(Me, 6)} g/mol` }];
  let copy = `Empirical formula: ${emp}`;
  const blocks = [{ type: "table", caption: "Calculating the simplest ratio", head: ["Element", "Value", "Moles", "÷ smallest", `× ${mult}`, "Number"], rows: items.map((x) => [x.sym, fmt(x.v, 5), fmt(x.n, 5), fmt(x.r, 4), fmt(x.r * mult, 4), String(counts[x.sym])]) }];
  if (warn) blocks.push({ type: "note", tone: "warn", text: "The ratios are not clearly close to whole numbers; check the accuracy of the data. We chose the closest possible rounding." });
  if (!isBlank(input.M)) {
    const M = num(input, "M", "molar mass", { positive: true });
    const kk = M / Me, k = Math.round(kk);
    if (k < 1 || Math.abs(kk - k) > 0.1) fail(`The molar mass ${fmt(M)} is not a whole multiple of the empirical formula mass (${fmt(Me, 5)}). Ratio: ${fmt(kk, 4)}.`, "M");
    const mol = Object.fromEntries(Object.entries(counts).map(([el, n]) => [el, n * k]));
    const mf = write(mol);
    steps.push({ text: "Molecular formula:", tex: `k = \\frac{${ntex(M)}}{${ntex(Me, 6)}} = ${ntex(kk, 4)} \\approx ${k} \\Rightarrow \\mathrm{${mf.replace(/(\d+)/g, "_{$1}")}}` });
    results.push({ label: "Molecular formula", value: mf });
    copy += ` | Molecular formula: ${mf}`;
  }
  return { results, steps, copy, blocks };
}
