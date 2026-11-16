import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { balance, equationText, equationTex, molarMass, cleanFormula, formulaHtmlText, formulaTex, FormulaError } from "./formula.js";

export const meta = {
  description: "کیمیائی تعامل کے حسابات: مساوات خودکار طور پر متوازن کی جاتی ہے، پھر ری ایکٹنٹس کی مقداریں مولز میں بدلی جاتی ہیں، لمیٹنگ ری ایکٹنٹ اور اضافی ری ایکٹنٹ معلوم کیے جاتے ہیں، اور نظری پیداوار اور فیصد یلڈ حساب کی جاتی ہے۔",
  keywords: ["کیمیائی حسابات", "اسٹوئیکیومیٹری", "stoichiometry", "لمیٹنگ ری ایکٹنٹ", "limiting reagent", "نظری پیداوار", "فیصد یلڈ", "percent yield", "اضافی ری ایکٹنٹ"],
  formulas: [
    { label: "لمیٹنگ ری ایکٹنٹ: سب سے کم تناسب", tex: "\\min_j \\frac{n_j}{a_j}" },
    { label: "نظری پیداوار اور فیصد یلڈ", tex: "n_P = \\frac{b_P}{a_L}\\, n_L,\\qquad \\%\\,\\text{yield} = \\frac{m_{\\text{actual}}}{m_{\\text{theoretical}}}\\times 100" }
  ],
  inputs: [
    { id: "equation", label: "مساوات (خودکار طور پر متوازن)", type: "text", default: "N2 + H2 -> NH3", wide: true },
    { id: "amounts", label: "معلوم ری ایکٹنٹس کی مقداریں", type: "textarea", default: "N2 = 28 g\nH2 = 10 g", wide: true, help: "ہر مادے کے لیے ایک سطر: فارمولا = قدر پھر g یا mol، جیسے Fe = 10 g یا O2 = 0.5 mol۔ کم از کم ایک ری ایکٹنٹ درج کریں۔" },
    { id: "product", label: "مطلوبہ پروڈکٹ", type: "text", default: "", help: "مساوات کا پہلا پروڈکٹ استعمال کرنے کے لیے خالی چھوڑ دیں۔" },
    { id: "actual", label: "اصل پیداوار (اختیاری)", unit: "g", type: "number", default: "" }
  ],
  example: { values: { equation: "Fe + O2 -> Fe2O3", amounts: "Fe = 11.17 g\nO2 = 6 g", product: "Fe2O3", actual: "12" }, expect: ["لمیٹنگ ری ایکٹنٹ: Fe", "m = 15.97 g", "75.14%"], note: "مثال: 11.17 g آئرن کو 6 g آکسیجن کے ساتھ جلانا، اور ہمیں عملی طور پر 12 g حاصل ہوا۔" },
  invalid: { values: { equation: "H2 + O2 -> H2O", amounts: "H2O = 5 g", product: "", actual: "" } },
  related: ["equation-balancer", "molar-mass", "solutions", "empirical-formula"]
};

const key = (s) => cleanFormula(s).replace(/[·•*.]/g, "·");

export function solve(input) {
  const raw = str(input, "equation", "مساوات");
  let b;
  try { b = balance(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "equation"); throw e; }
  const nL = b.reactants.length;
  const masses = b.parsed.map(molarMass);
  const idx = new Map(b.species.map((s, i) => [key(s), i]));
  const lines = str(input, "amounts", "ری ایکٹنٹ کی مقداریں").split(/\r?\n|[;؛]/).map((l) => l.trim()).filter(Boolean);
  const given = new Map();
  lines.forEach((line, li) => {
    const m = line.match(/^(.+?)\s*[=:]\s*(.+?)\s*(g|mol|غ|غرام|مول)?\s*$/i);
    if (!m) fail(`سطر ${li + 1} سمجھ میں نہیں آئی۔ اسے اس طرح لکھیں: Fe = 10 g`, "amounts");
    const i = idx.get(key(m[1]));
    if (i === undefined) fail(`سطر ${li + 1} میں مادہ “${m[1]}” مساوات میں موجود نہیں ہے۔`, "amounts");
    if (i >= nL) fail(`“${m[1]}” ایک پروڈکٹ ہے، ری ایکٹنٹ نہیں۔ صرف ری ایکٹنٹس کی مقداریں درج کریں۔`, "amounts");
    const v = parseNumber(m[2]);
    if (!(v > 0) || !isFinite(v)) fail(`سطر ${li + 1} میں مقدار ایک مثبت عدد ہونی چاہیے۔`, "amounts");
    const unit = (m[3] || "g").toLowerCase();
    const mol = unit === "mol" || unit === "مول" ? v : v / masses[i];
    given.set(i, mol);
  });
  if (!given.size) fail("کم از کم ایک ری ایکٹنٹ کی مقدار درج کریں۔", "amounts");
  let target = nL;
  if (!isBlank(input.product)) {
    const t = idx.get(key(input.product));
    if (t === undefined || t < nL) fail("مطلوبہ پروڈکٹ مساوات کے پروڈکٹس میں سے ایک ہونا چاہیے۔", "product");
    target = t;
  }
  const ratios = [...given].map(([i, n]) => [i, n / b.coef[i]]);
  const [Li, ext] = ratios.reduce((a, r) => (r[1] < a[1] ? r : a));
  const nT = ext * b.coef[target], mT = nT * masses[target];
  const name = (i) => formulaHtmlText(b.species[i]);
  const steps = [
    { text: "ہم پہلے مساوات متوازن کرتے ہیں:", tex: equationTex(b) },
    { text: "ہم مقداروں کو مولز میں بدل کر کوئفیشنٹ سے تقسیم کرتے ہیں:", tex: `\\begin{aligned}${ratios.map(([i, r]) => `\\mathrm{${formulaTex(b.species[i])}}:&\\ n = ${ntex(given.get(i), 5)}\\ \\text{mol},\\quad \\tfrac{n}{${b.coef[i]}} = ${ntex(r, 5)}`).join("\\\\")}\\end{aligned}` },
    given.size > 1 ? `سب سے کم تناسب ${name(Li)} کا ہے، اس لیے یہ لمیٹنگ ری ایکٹنٹ ہے، اور باقی اضافی ہیں۔` : `صرف ایک ری ایکٹنٹ (${name(Li)}) درج ہوا ہے، اس لیے ہم اسے لمیٹنگ ری ایکٹنٹ لیتے ہیں اور باقی کو وافر فرض کرتے ہیں۔`,
    { text: `${name(target)} سے نظری پیداوار:`, tex: `n = \\frac{${b.coef[target]}}{${b.coef[Li]}} \\times ${ntex(given.get(Li), 5)} = ${ntex(nT, 5)}\\ \\text{mol},\\quad m = nM = ${ntex(nT, 5)} \\times ${ntex(masses[target], 6)} = ${ntex(mT, 5)}\\ \\text{g}` }
  ];
  const rows = b.species.map((sp, i) => {
    const used = ext * b.coef[i];
    const left = i < nL && given.has(i) ? given.get(i) - used : null;
    return [name(i), String(b.coef[i]), fmt(masses[i], 6), i < nL ? (given.has(i) ? fmt(given.get(i), 5) : "—") : "—", `${fmt(used, 5)} mol = ${fmt(used * masses[i], 5)} g`, left === null ? "—" : `${fmt(Math.max(left, 0), 4)} mol = ${fmt(Math.max(left, 0) * masses[i], 4)} g`];
  });
  const results = [
    { label: "متوازن مساوات", value: equationText(b) },
    { label: "لمیٹنگ ری ایکٹنٹ", value: name(Li), text: `لمیٹنگ ری ایکٹنٹ: ${name(Li)}` },
    { label: `${name(target)} سے نظری پیداوار`, value: `${fmt(mT, 4)} g (${fmt(nT, 4)} mol)`, text: `m = ${fmt(mT, 4)} g` }
  ];
  let copy = `${equationText(b)} | لمیٹنگ ری ایکٹنٹ: ${name(Li)} | ${name(target)}: m = ${fmt(mT, 4)} g`;
  if (!isBlank(input.actual)) {
    const a = num(input, "actual", "اصل پیداوار", { positive: true });
    const pct = (100 * a) / mT;
    steps.push({ text: "فیصد یلڈ:", tex: `\\frac{${ntex(a)}}{${ntex(mT, 5)}} \\times 100 = ${ntex(pct, 4)}\\%` });
    results.push({ label: "فیصد یلڈ", value: `${fmt(pct, 4)}%` });
    copy += ` | ${fmt(pct, 4)}%`;
    if (pct > 100) steps.push("100% سے زیادہ نسبت عموماً مطلب ہے کہ پروڈکٹ خشک یا خالص نہیں، یا پیمائش میں غلطی ہے۔");
  }
  return { results, steps, copy, blocks: [{ type: "table", caption: "مقداری جدول (لمیٹنگ ری ایکٹنٹ ختم ہونے پر کیا خرچ یا پیدا ہوتا ہے)", head: ["مادہ", "کوئفیشنٹ", "M (g/mol)", "دیا گیا (mol)", "ری ایکٹنٹ/پروڈکٹ", "باقی"], rows }] };
}
