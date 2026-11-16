import { str, fail } from "../core/validate.js";
import { parseBool, truthTable, sopText, termTex } from "../core/boolean.js";

export const BOOL_HELP = "Les variables sont des lettres latines isolées. AND : AB, A·B ou A&B. OR : A+B. NOT : A' ou !A. XOR : A^B. AND, OR, NOT et XOR peuvent aussi s'écrire en toutes lettres.";

export const meta = {
  description: "Générez la table de vérité de toute expression logique jusqu'à 8 variables, avec les minterms, les maxterms et les formes canoniques en somme de produits (SOP) et produit de sommes (POS).",
  keywords: ["Table de vérité", "truth table", "Algèbre de Boole", "Logique", "minterms", "maxterms", "SOP", "POS", "Minterms"],
  formulas: [
    { label: "Les deux formes canoniques", tex: "F = \\sum m(i : F_i = 1) = \\prod M(i : F_i = 0)" },
    { label: "Priorité des opérations", tex: "\\overline{A} \\;>\\; A\\cdot B \\;>\\; A \\oplus B \\;>\\; A + B" }
  ],
  inputs: [{ id: "expr", label: "Expression logique", type: "expr", default: "AB + A'C", help: BOOL_HELP }],
  example: { values: { expr: "AB + A'C" }, expect: ["Σm(1, 3, 6, 7)"], note: "Exemple : $F = AB + \\overline{A}C$." },
  invalid: { values: { expr: "A + (B" } },
  related: ["boolean-simplifier", "logic-gates", "binary-twos-complement"]
};

export function solve(input) {
  let tree;
  try { tree = parseBool(str(input, "expr", "Expression")); } catch (e) { if (e.name === "InputError") fail(e.message, "expr"); throw e; }
  const t = truthTable(tree);
  if (t.vars.length > 8) fail("Nombre maximal de variables : 8.", "expr");
  const n = t.vars.length;
  const bits = (m) => m.toString(2).padStart(n, "0");
  const sop = t.minterms.map((m) => bits(m));
  const posTex = t.maxterms.length ? t.maxterms.map((m) => `(${[...bits(m)].map((b, i) => (b === "0" ? t.vars[i] : `\\overline{${t.vars[i]}}`)).join(" + ")})`).join("") : "1";
  const steps = [
    `Variables : ${t.vars.join("، ") || "Aucune (expression constante)"}, donc le nombre de lignes est $2^{${n}} = ${1 << n}$.`,
    "On évalue l'expression pour chaque combinaison selon la priorité : NOT, puis AND, puis XOR, puis OR (voir le tableau).",
    { text: "Les lignes dont la sortie vaut 1 donnent les minterms ; chaque minterm est un produit de toutes les variables (la variable à 0 est niée) :", tex: `F = ${t.minterms.length ? sop.map((b) => termTex(b, t.vars)).join(" + ") : "0"}` },
    { text: "Les lignes dont la sortie vaut 0 donnent les maxterms (la variable à 1 est niée dans la somme) :", tex: `F = ${posTex}` }
  ];
  const rows = t.rows.map((r) => [String(r.m), ...r.bits.map(String), { text: String(r.out), color: r.out ? "var(--accent-soft)" : "", fg: "var(--text)" }]);
  const mText = `Σm(${t.minterms.join(", ")})`, MText = `ΠM(${t.maxterms.join(", ")})`;
  return {
    results: [
      { label: "Minterms", value: mText, text: mText },
      { label: "Maxterms", value: MText },
      { label: "Somme de produits canonique", value: sopText(sop, t.vars) }
    ],
    blocks: [{ type: "table", ltr: true, caption: "Table de vérité", head: ["#", ...t.vars, "F"], rows }],
    steps, copy: `${mText}\n${MText}`
  };
}
