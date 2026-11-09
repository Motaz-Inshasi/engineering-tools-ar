import { str, fail } from "../core/validate.js";
import { parseBool, truthTable, sopText, termTex } from "../core/boolean.js";

export const BOOL_HELP = "المتغيرات حروف إنجليزية مفردة. AND: AB أو A·B أو A&B. OR: A+B. NOT: A' أو !A. XOR: A^B. يمكن كتابة AND و OR و NOT و XOR كلمات.";

export const meta = {
  description: "ولّد جدول الحقيقة لأي تعبير منطقي حتى 8 متغيرات، مع الحدود الصغرى والكبرى والصيغة القانونية مجموع الضرب (SOP) وضرب المجموع (POS).",
  keywords: ["جدول الحقيقة", "truth table", "جبر بول", "منطق", "minterms", "maxterms", "SOP", "POS", "حدود صغرى"],
  formulas: [
    { label: "الصيغتان القانونيتان", tex: "F = \\sum m(i : F_i = 1) = \\prod M(i : F_i = 0)" },
    { label: "أولوية العمليات", tex: "\\overline{A} \\;>\\; A\\cdot B \\;>\\; A \\oplus B \\;>\\; A + B" }
  ],
  inputs: [{ id: "expr", label: "التعبير المنطقي", type: "expr", default: "AB + A'C", help: BOOL_HELP }],
  example: { values: { expr: "AB + A'C" }, expect: ["Σm(1, 3, 6, 7)"], note: "مثال: $F = AB + \\overline{A}C$." },
  invalid: { values: { expr: "A + (B" } },
  related: ["boolean-simplifier", "logic-gates", "binary-twos-complement"]
};

export function solve(input) {
  let tree;
  try { tree = parseBool(str(input, "expr", "التعبير")); } catch (e) { if (e.name === "InputError") fail(e.message, "expr"); throw e; }
  const t = truthTable(tree);
  if (t.vars.length > 8) fail("أقصى عدد للمتغيرات 8.", "expr");
  const n = t.vars.length;
  const bits = (m) => m.toString(2).padStart(n, "0");
  const sop = t.minterms.map((m) => bits(m));
  const posTex = t.maxterms.length ? t.maxterms.map((m) => `(${[...bits(m)].map((b, i) => (b === "0" ? t.vars[i] : `\\overline{${t.vars[i]}}`)).join(" + ")})`).join("") : "1";
  const steps = [
    `المتغيرات: ${t.vars.join("، ") || "لا يوجد (تعبير ثابت)"}، فعدد الصفوف $2^{${n}} = ${1 << n}$.`,
    "نقيّم التعبير لكل تركيبة بالأولوية: NOT ثم AND ثم XOR ثم OR (انظر الجدول).",
    { text: "الصفوف التي خرجها 1 تعطي الحدود الصغرى، وكل حد صغير ضرب لكل المتغيرات (المتغير 0 يُنفى):", tex: `F = ${t.minterms.length ? sop.map((b) => termTex(b, t.vars)).join(" + ") : "0"}` },
    { text: "والصفوف التي خرجها 0 تعطي الحدود الكبرى (المتغير 1 يُنفى في المجموع):", tex: `F = ${posTex}` }
  ];
  const rows = t.rows.map((r) => [String(r.m), ...r.bits.map(String), { text: String(r.out), color: r.out ? "var(--accent-soft)" : "", fg: "var(--text)" }]);
  const mText = `Σm(${t.minterms.join(", ")})`, MText = `ΠM(${t.maxterms.join(", ")})`;
  return {
    results: [
      { label: "الحدود الصغرى", value: mText, text: mText },
      { label: "الحدود الكبرى", value: MText },
      { label: "مجموع الضرب القانوني", value: sopText(sop, t.vars) }
    ],
    blocks: [{ type: "table", ltr: true, caption: "جدول الحقيقة", head: ["#", ...t.vars, "F"], rows }],
    steps, copy: `${mText}\n${MText}`
  };
}
