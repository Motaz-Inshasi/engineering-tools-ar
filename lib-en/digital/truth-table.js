import { str, fail } from "../core/validate.js";
import { parseBool, truthTable, sopText, termTex } from "../core/boolean.js";

export const BOOL_HELP = "Variables are single English letters. AND: AB, A·B, or A&B. OR: A+B. NOT: A' or !A. XOR: A^B. AND, OR, NOT, and XOR can also be written as words.";

export const meta = {
  description: "Generate the truth table for any logic expression with up to 8 variables, with the minterms, maxterms, and the canonical sum of products (SOP) and product of sums (POS) forms.",
  keywords: ["truth table", "truth table", "Boolean algebra", "logic", "minterms", "maxterms", "SOP", "POS", "minterms"],
  formulas: [
    { label: "Canonical forms", tex: "F = \\sum m(i : F_i = 1) = \\prod M(i : F_i = 0)" },
    { label: "Operator precedence", tex: "\\overline{A} \\;>\\; A\\cdot B \\;>\\; A \\oplus B \\;>\\; A + B" }
  ],
  inputs: [{ id: "expr", label: "Logic expression", type: "expr", default: "AB + A'C", help: BOOL_HELP }],
  example: { values: { expr: "AB + A'C" }, expect: ["Σm(1, 3, 6, 7)"], note: "Example: $F = AB + \\overline{A}C$." },
  invalid: { values: { expr: "A + (B" } },
  related: ["boolean-simplifier", "logic-gates", "binary-twos-complement"]
};

export function solve(input) {
  let tree;
  try { tree = parseBool(str(input, "expr", "Expression")); } catch (e) { if (e.name === "InputError") fail(e.message, "expr"); throw e; }
  const t = truthTable(tree);
  if (t.vars.length > 8) fail("The maximum number of variables is 8.", "expr");
  const n = t.vars.length;
  const bits = (m) => m.toString(2).padStart(n, "0");
  const sop = t.minterms.map((m) => bits(m));
  const posTex = t.maxterms.length ? t.maxterms.map((m) => `(${[...bits(m)].map((b, i) => (b === "0" ? t.vars[i] : `\\overline{${t.vars[i]}}`)).join(" + ")})`).join("") : "1";
  const steps = [
    `Variables: ${t.vars.join("، ") || "None (constant expression)"}, so the number of rows is $2^{${n}} = ${1 << n}$.`,
    "We evaluate the expression for each combination by precedence: NOT, then AND, then XOR, then OR (see the table).",
    { text: "The rows whose output is 1 give the minterms; each minterm is a product of all variables (a variable at 0 is negated):", tex: `F = ${t.minterms.length ? sop.map((b) => termTex(b, t.vars)).join(" + ") : "0"}` },
    { text: "The rows whose output is 0 give the maxterms (a variable at 1 is negated in the sum):", tex: `F = ${posTex}` }
  ];
  const rows = t.rows.map((r) => [String(r.m), ...r.bits.map(String), { text: String(r.out), color: r.out ? "var(--accent-soft)" : "", fg: "var(--text)" }]);
  const mText = `Σm(${t.minterms.join(", ")})`, MText = `ΠM(${t.maxterms.join(", ")})`;
  return {
    results: [
      { label: "Minterms", value: mText, text: mText },
      { label: "Maxterms", value: MText },
      { label: "Canonical sum of products", value: sopText(sop, t.vars) }
    ],
    blocks: [{ type: "table", ltr: true, caption: "truth table", head: ["#", ...t.vars, "F"], rows }],
    steps, copy: `${mText}\n${MText}`
  };
}
