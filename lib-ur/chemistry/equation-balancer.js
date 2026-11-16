import { fail, str } from "../core/validate.js";
import { balance, equationText, equationTex, formulaHtmlText, FormulaError } from "./formula.js";

export const meta = {
  description: "کسی بھی کیمیائی مساوات کو خودکار طور پر متوازن کریں: ہر عنصر کے ایٹموں کی تعداد محفوظ رکھنے والے کم سے کم مکمل عددی کوئفیشنٹس تلاش کر کے، ساتھ دونوں اطراف کے ایٹموں کی جانچ کا جدول اور الجبرائی حل کا طریقہ۔",
  keywords: ["مساوات کو متوازن کرنا", "کیمیائی مساوات کو متوازن کرنا", "balance equation", "کوئفیشنٹس", "کمیت کی بقا", "کیمیائی تعامل"],
  formulas: [{ label: "ہر عنصر کے ایٹموں کی بقا", tex: "\\sum_{\\text{reactants}} a_j\\, n_{ij} = \\sum_{\\text{products}} b_k\\, n_{ik}" }],
  inputs: [
    { id: "equation", label: "مساوات", type: "text", default: "C3H8 + O2 -> CO2 + H2O", wide: true, help: "مادوں کو + سے اور دونوں اطراف کو -> یا = تیر سے الگ کریں، جیسے Fe + O2 -> Fe2O3۔ موجودہ کوئفیشنٹس نظر انداز ہوتے ہیں۔" }
  ],
  example: { values: { equation: "KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2" }, expect: ["2 KMnO4 + 16 HCl → 2 KCl + 2 MnCl2 + 8 H2O + 5 Cl2"], note: "مثال: پوٹاشیم پرمینگنیٹ کا ہائیڈروکلورک ایسڈ کے ساتھ تعامل۔" },
  invalid: { values: { equation: "Na + Cl2 -> KCl" } },
  related: ["stoichiometry", "molar-mass", "empirical-formula", "linear-system"]
};

export function solve(input) {
  const raw = str(input, "equation", "مساوات");
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
    results: [{ label: "متوازن مساوات", value: text, tex: equationTex(b) }],
    steps: [
      `ہم ہر مادے کے سامنے ایک نامعلوم کوئفیشنٹ رکھتے ہیں: ${b.species.map((sp, i) => `${letters[i]} کے سامنے ${formulaHtmlText(sp)}`).join("، ")}۔`,
      { text: "ہم ہر عنصر کے لیے ایٹموں کی بقا کی مساوات لکھتے ہیں:", tex: `\\begin{aligned}${eqs.join("\\\\")}\\end{aligned}` },
      { text: "ہم خطی نظام حل کرتے ہیں اور کم سے کم مثبت صحیح اعداد منتخب کرتے ہیں:", tex: assign },
      { text: "متوازن مساوات:", tex: equationTex(b) }
    ],
    blocks: [{ type: "table", caption: "جانچ: دونوں اطراف میں ایٹموں کی تعداد", head: ["عنصر", "ری ایکٹنٹس", "پروڈکٹس", ""], rows }],
    copy: text
  };
}
