import { fail, str } from "../core/validate.js";
import { balance, equationText, equationTex, formulaHtmlText, FormulaError } from "./formula.js";

export const meta = {
  description: "Balances any chemical equation automatically by finding the smallest whole-number coefficients that conserve the number of atoms of each element, with an atom-check table for both sides and the algebraic solution method.",
  keywords: ["Balancing equations", "balancing a chemical equation", "balance equation", "coefficients", "conservation of mass", "chemical reaction"],
  formulas: [{ label: "Conservation of atoms for each element", tex: "\\sum_{\\text{reactants}} a_j\\, n_{ij} = \\sum_{\\text{products}} b_k\\, n_{ik}" }],
  inputs: [
    { id: "equation", label: "Equation", type: "text", default: "C3H8 + O2 -> CO2 + H2O", wide: true, help: "Separate the substances with + and the two sides with an arrow -> or =, such as Fe + O2 -> Fe2O3. Existing coefficients are ignored." }
  ],
  example: { values: { equation: "KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2" }, expect: ["2 KMnO4 + 16 HCl → 2 KCl + 2 MnCl2 + 8 H2O + 5 Cl2"], note: "Example: the reaction of potassium permanganate with hydrochloric acid." },
  invalid: { values: { equation: "Na + Cl2 -> KCl" } },
  related: ["stoichiometry", "molar-mass", "empirical-formula", "linear-system"]
};

export function solve(input) {
  const raw = str(input, "equation", "Equation");
  let b;
  try { b = balance(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "equation"); throw e; }
  const nL = b.reactants.length;
  const letters = b.species.map((_, i) => String.fromCharCode(97 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : ""));
  const eqs = b.elements.map((el) => {
    const side = (from, to) => b.species.slice(from, to).map((_, k) => {
      const j = from + k, n = b.parsed[j][el] || 0;
      return n ? `${n === 1 ? "" : n}${letters[j]}` : null;
    }).filter(Boolean).join(" + ");
    return `\\text{${el}}:\\ ${side(0, nL)} = ${side(nL, b.species.length)}`;
  });
  const assign = b.species.map((sp, i) => `${letters[i]} = ${b.coef[i]}`).join(",\\ ");
  const rows = b.elements.map((el) => {
    const l = b.species.slice(0, nL).reduce((a, _, j) => a + (b.parsed[j][el] || 0) * b.coef[j], 0);
    const r = b.species.slice(nL).reduce((a, _, k) => a + (b.parsed[nL + k][el] || 0) * b.coef[nL + k], 0);
    return [el, String(l), String(r), l === r ? "✓" : "✗"];
  });
  const text = equationText(b);
  return {
    results: [{ label: "Balanced equation", value: text, tex: equationTex(b) }],
    steps: [
      `We put an unknown coefficient in front of each substance: ${b.species.map((sp, i) => `${letters[i]} in front of ${formulaHtmlText(sp)}`).join("، ")}.`,
      { text: "We write the atom conservation equation for each element:", tex: `\\begin{aligned}${eqs.join("\\\\")}\\end{aligned}` },
      { text: "We solve the linear system and choose the smallest positive whole numbers:", tex: assign },
      { text: "Balanced equation:", tex: equationTex(b) }
    ],
    blocks: [{ type: "table", caption: "Check: number of atoms on both sides", head: ["Element", "Reactants", "Products", ""], rows }],
    copy: text
  };
}
