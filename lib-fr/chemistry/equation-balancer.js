import { fail, str } from "../core/validate.js";
import { balance, equationText, equationTex, formulaHtmlText, FormulaError } from "./formula.js";

export const meta = {
  description: "Équilibre automatiquement toute équation chimique en trouvant les plus petits coefficients entiers qui conservent le nombre d'atomes de chaque élément, avec le tableau de vérification des atomes des deux côtés et la méthode algébrique de résolution.",
  keywords: ["équilibrage des équations", "équilibrer l'équation chimique", "balance equation", "coefficients", "conservation de la masse", "réaction chimique"],
  formulas: [{ label: "Conservation des atomes de chaque élément", tex: "\\sum_{\\text{reactants}} a_j\\, n_{ij} = \\sum_{\\text{products}} b_k\\, n_{ik}" }],
  inputs: [
    { id: "equation", label: "Équation", type: "text", default: "C3H8 + O2 -> CO2 + H2O", wide: true, help: "Séparez les substances par +, et les deux membres par une flèche -> ou =, par exemple Fe + O2 -> Fe2O3. Les coefficients existants sont ignorés." }
  ],
  example: { values: { equation: "KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2" }, expect: ["2 KMnO4 + 16 HCl → 2 KCl + 2 MnCl2 + 8 H2O + 5 Cl2"], note: "Exemple : réaction du permanganate de potassium avec l'acide chlorhydrique." },
  invalid: { values: { equation: "Na + Cl2 -> KCl" } },
  related: ["stoichiometry", "molar-mass", "empirical-formula", "linear-system"]
};

export function solve(input) {
  const raw = str(input, "equation", "Équation");
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
    results: [{ label: "Équation équilibrée", value: text, tex: equationTex(b) }],
    steps: [
      `On place un coefficient inconnu devant chaque substance : ${b.species.map((sp, i) => `${letters[i]} devant ${formulaHtmlText(sp)}`).join("، ")}.`,
      { text: "On écrit l'équation de conservation des atomes pour chaque élément :", tex: `\\begin{aligned}${eqs.join("\\\\")}\\end{aligned}` },
      { text: "On résout le système linéaire et on retient les plus petits entiers positifs :", tex: assign },
      { text: "Équation équilibrée :", tex: equationTex(b) }
    ],
    blocks: [{ type: "table", caption: "Vérification : nombre d'atomes des deux côtés", head: ["Élément", "Réactifs", "Produits", ""], rows }],
    copy: text
  };
}
