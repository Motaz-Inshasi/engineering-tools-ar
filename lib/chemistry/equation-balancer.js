import { fail, str } from "../core/validate.js";
import { balance, equationText, equationTex, formulaHtmlText, FormulaError } from "./formula.js";

export const meta = {
  description: "وازن أي معادلة كيميائية تلقائياً بإيجاد أصغر معاملات صحيحة تحفظ عدد ذرات كل عنصر، مع جدول التحقق من الذرات في الطرفين وطريقة الحل الجبرية.",
  keywords: ["موازنة المعادلات", "وزن المعادلة الكيميائية", "balance equation", "معاملات", "حفظ الكتلة", "تفاعل كيميائي"],
  formulas: [{ label: "حفظ الذرات لكل عنصر", tex: "\\sum_{\\text{reactants}} a_j\\, n_{ij} = \\sum_{\\text{products}} b_k\\, n_{ik}" }],
  inputs: [
    { id: "equation", label: "المعادلة", type: "text", default: "C3H8 + O2 -> CO2 + H2O", wide: true, help: "افصل المواد بـ + والطرفين بسهم -> أو =، مثل Fe + O2 -> Fe2O3. المعاملات الموجودة تُتجاهل." }
  ],
  example: { values: { equation: "KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2" }, expect: ["2 KMnO4 + 16 HCl → 2 KCl + 2 MnCl2 + 8 H2O + 5 Cl2"], note: "مثال: تفاعل برمنغنات البوتاسيوم مع حمض الهيدروكلوريك." },
  invalid: { values: { equation: "Na + Cl2 -> KCl" } },
  related: ["stoichiometry", "molar-mass", "empirical-formula", "linear-system"]
};

export function solve(input) {
  const raw = str(input, "equation", "المعادلة");
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
    results: [{ label: "المعادلة الموزونة", value: text, tex: equationTex(b) }],
    steps: [
      `نضع معاملاً مجهولاً أمام كل مادة: ${b.species.map((sp, i) => `${letters[i]} أمام ${formulaHtmlText(sp)}`).join("، ")}.`,
      { text: "نكتب معادلة حفظ الذرات لكل عنصر:", tex: `\\begin{aligned}${eqs.join("\\\\")}\\end{aligned}` },
      { text: "نحل النظام الخطي ونختار أصغر أعداد صحيحة موجبة:", tex: assign },
      { text: "المعادلة الموزونة:", tex: equationTex(b) }
    ],
    blocks: [{ type: "table", caption: "التحقق: عدد الذرات في الطرفين", head: ["العنصر", "المتفاعلات", "النواتج", ""], rows }],
    copy: text
  };
}
