import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { balance, equationText, equationTex, molarMass, cleanFormula, formulaHtmlText, formulaTex, FormulaError } from "./formula.js";

export const meta = {
  description: "حسابات التفاعل الكيميائي: توازن المعادلة تلقائياً، ثم تحوّل كميات المتفاعلات إلى مولات، وتحدد المادة المحددة للتفاعل والمادة الفائضة، وتحسب الناتج النظري ونسبة المردود المئوية.",
  keywords: ["الحسابات الكيميائية", "ستوكيومتري", "stoichiometry", "المادة المحددة", "limiting reagent", "المردود النظري", "نسبة المردود", "percent yield", "المادة الفائضة"],
  formulas: [
    { label: "المادة المحددة: أصغر نسبة", tex: "\\min_j \\frac{n_j}{a_j}" },
    { label: "الناتج النظري ونسبة المردود", tex: "n_P = \\frac{b_P}{a_L}\\, n_L,\\qquad \\%\\,\\text{yield} = \\frac{m_{\\text{actual}}}{m_{\\text{theoretical}}}\\times 100" }
  ],
  inputs: [
    { id: "equation", label: "المعادلة (تُوازن تلقائياً)", type: "text", default: "N2 + H2 -> NH3", wide: true },
    { id: "amounts", label: "كميات المتفاعلات المعلومة", type: "textarea", default: "N2 = 28 g\nH2 = 10 g", wide: true, help: "سطر لكل مادة: الصيغة = القيمة ثم g أو mol، مثل Fe = 10 g أو O2 = 0.5 mol. أدخل متفاعلاً واحداً على الأقل." },
    { id: "product", label: "الناتج المطلوب", type: "text", default: "", help: "اتركه فارغاً لاستخدام أول ناتج في المعادلة." },
    { id: "actual", label: "المردود الفعلي (اختياري)", unit: "g", type: "number", default: "" }
  ],
  example: { values: { equation: "Fe + O2 -> Fe2O3", amounts: "Fe = 11.17 g\nO2 = 6 g", product: "Fe2O3", actual: "12" }, expect: ["المادة المحددة: Fe", "m = 15.97 g", "75.14%"], note: "مثال: احتراق 11.17 g من الحديد مع 6 g من الأكسجين وحصلنا فعلياً على 12 g." },
  invalid: { values: { equation: "H2 + O2 -> H2O", amounts: "H2O = 5 g", product: "", actual: "" } },
  related: ["equation-balancer", "molar-mass", "solutions", "empirical-formula"]
};

const key = (s) => cleanFormula(s).replace(/[·•*.]/g, "·");

export function solve(input) {
  const raw = str(input, "equation", "المعادلة");
  let b;
  try { b = balance(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "equation"); throw e; }
  const nL = b.reactants.length;
  const masses = b.parsed.map(molarMass);
  const idx = new Map(b.species.map((s, i) => [key(s), i]));
  const lines = str(input, "amounts", "كميات المتفاعلات").split(/\r?\n|[;؛]/).map((l) => l.trim()).filter(Boolean);
  const given = new Map();
  lines.forEach((line, li) => {
    const m = line.match(/^(.+?)\s*[=:]\s*(.+?)\s*(g|mol|غ|غرام|مول)?\s*$/i);
    if (!m) fail(`السطر ${li + 1} غير مفهوم. اكتبه مثل: Fe = 10 g`, "amounts");
    const i = idx.get(key(m[1]));
    if (i === undefined) fail(`المادة «${m[1]}» في السطر ${li + 1} غير موجودة في المعادلة.`, "amounts");
    if (i >= nL) fail(`«${m[1]}» ناتج وليس متفاعلاً. أدخل كميات المتفاعلات فقط.`, "amounts");
    const v = parseNumber(m[2]);
    if (!(v > 0) || !isFinite(v)) fail(`الكمية في السطر ${li + 1} يجب أن تكون رقماً موجباً.`, "amounts");
    const unit = (m[3] || "g").toLowerCase();
    const mol = unit === "mol" || unit === "مول" ? v : v / masses[i];
    given.set(i, mol);
  });
  if (!given.size) fail("أدخل كمية متفاعل واحد على الأقل.", "amounts");
  let target = nL;
  if (!isBlank(input.product)) {
    const t = idx.get(key(input.product));
    if (t === undefined || t < nL) fail("الناتج المطلوب يجب أن يكون أحد نواتج المعادلة.", "product");
    target = t;
  }
  const ratios = [...given].map(([i, n]) => [i, n / b.coef[i]]);
  const [Li, ext] = ratios.reduce((a, r) => (r[1] < a[1] ? r : a));
  const nT = ext * b.coef[target], mT = nT * masses[target];
  const name = (i) => formulaHtmlText(b.species[i]);
  const steps = [
    { text: "نوازن المعادلة أولاً:", tex: equationTex(b) },
    { text: "نحوّل الكميات إلى مولات ونقسم على المعامل:", tex: `\\begin{aligned}${ratios.map(([i, r]) => `\\mathrm{${formulaTex(b.species[i])}}:&\\ n = ${ntex(given.get(i), 5)}\\ \\text{mol},\\quad \\tfrac{n}{${b.coef[i]}} = ${ntex(r, 5)}`).join("\\\\")}\\end{aligned}` },
    given.size > 1 ? `أصغر نسبة تعود إلى ${name(Li)}، فهي المادة المحددة للتفاعل، والبقية فائضة.` : `أُدخل متفاعل واحد فقط (${name(Li)})، فنعدّه المادة المحددة ونفترض أن البقية متوفرة بكثرة.`,
    { text: `الناتج النظري من ${name(target)}:`, tex: `n = \\frac{${b.coef[target]}}{${b.coef[Li]}} \\times ${ntex(given.get(Li), 5)} = ${ntex(nT, 5)}\\ \\text{mol},\\quad m = nM = ${ntex(nT, 5)} \\times ${ntex(masses[target], 6)} = ${ntex(mT, 5)}\\ \\text{g}` }
  ];
  const rows = b.species.map((sp, i) => {
    const used = ext * b.coef[i];
    const left = i < nL && given.has(i) ? given.get(i) - used : null;
    return [name(i), String(b.coef[i]), fmt(masses[i], 6), i < nL ? (given.has(i) ? fmt(given.get(i), 5) : "—") : "—", `${fmt(used, 5)} mol = ${fmt(used * masses[i], 5)} g`, left === null ? "—" : `${fmt(Math.max(left, 0), 4)} mol = ${fmt(Math.max(left, 0) * masses[i], 4)} g`];
  });
  const results = [
    { label: "المعادلة الموزونة", value: equationText(b) },
    { label: "المادة المحددة", value: name(Li), text: `المادة المحددة: ${name(Li)}` },
    { label: `الناتج النظري من ${name(target)}`, value: `${fmt(mT, 4)} g (${fmt(nT, 4)} mol)`, text: `m = ${fmt(mT, 4)} g` }
  ];
  let copy = `${equationText(b)} | المادة المحددة: ${name(Li)} | ${name(target)}: m = ${fmt(mT, 4)} g`;
  if (!isBlank(input.actual)) {
    const a = num(input, "actual", "المردود الفعلي", { positive: true });
    const pct = (100 * a) / mT;
    steps.push({ text: "نسبة المردود المئوية:", tex: `\\frac{${ntex(a)}}{${ntex(mT, 5)}} \\times 100 = ${ntex(pct, 4)}\\%` });
    results.push({ label: "نسبة المردود", value: `${fmt(pct, 4)}%` });
    copy += ` | ${fmt(pct, 4)}%`;
    if (pct > 100) steps.push("نسبة أكبر من 100% تعني عادةً أن الناتج غير جاف أو غير نقي، أو خطأ في القياس.");
  }
  return { results, steps, copy, blocks: [{ type: "table", caption: "الجدول الكمّي (ما يتفاعل أو ينتج عند انتهاء المادة المحددة)", head: ["المادة", "المعامل", "M (g/mol)", "المعطى (mol)", "المتفاعل/الناتج", "المتبقي"], rows }] };
}
