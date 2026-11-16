import { fail, str } from "../core/validate.js";
import { balance, equationText, equationTex, formulaHtmlText, FormulaError } from "./formula.js";

export const meta = {
  description: "موازنه خودکار هر معادله شیمیایی با یافتن کوچک‌ترین ضرایب صحیحی که تعداد اتم هر عنصر را پایسته نگه می‌دارند، همراه با جدول بررسی اتم‌ها در دو طرف و روش جبری حل.",
  keywords: ["موازنه معادلات", "موازنه معادله شیمیایی", "balance equation", "ضرایب", "پایستگی جرم", "واکنش شیمیایی"],
  formulas: [{ label: "پایستگی اتم‌ها برای هر عنصر", tex: "\\sum_{\\text{reactants}} a_j\\, n_{ij} = \\sum_{\\text{products}} b_k\\, n_{ik}" }],
  inputs: [
    { id: "equation", label: "معادله", type: "text", default: "C3H8 + O2 -> CO2 + H2O", wide: true, help: "مواد را با + و دو طرف را با فلش -> یا = جدا کنید، مانند Fe + O2 -> Fe2O3. ضرایب موجود نادیده گرفته می‌شوند." }
  ],
  example: { values: { equation: "KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2" }, expect: ["2 KMnO4 + 16 HCl → 2 KCl + 2 MnCl2 + 8 H2O + 5 Cl2"], note: "مثال: واکنش پرمنگنات پتاسیم با اسید کلریدریک." },
  invalid: { values: { equation: "Na + Cl2 -> KCl" } },
  related: ["stoichiometry", "molar-mass", "empirical-formula", "linear-system"]
};

export function solve(input) {
  const raw = str(input, "equation", "معادله");
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
    results: [{ label: "معادله موازنه‌شده", value: text, tex: equationTex(b) }],
    steps: [
      `برای هر ماده یک ضریب مجهول در نظر می‌گیریم: ${b.species.map((sp, i) => `${letters[i]} پیش از ${formulaHtmlText(sp)}`).join("، ")}.`,
      { text: "معادله پایستگی اتم‌ها را برای هر عنصر می‌نویسیم:", tex: `\\begin{aligned}${eqs.join("\\\\")}\\end{aligned}` },
      { text: "دستگاه خطی را حل می‌کنیم و کوچک‌ترین اعداد صحیح مثبت را انتخاب می‌کنیم:", tex: assign },
      { text: "معادله موازنه‌شده:", tex: equationTex(b) }
    ],
    blocks: [{ type: "table", caption: "بررسی: تعداد اتم‌ها در دو طرف", head: ["عنصر", "واکنش‌دهنده‌ها", "فراورده‌ها", ""], rows }],
    copy: text
  };
}
