import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { balance, equationText, equationTex, molarMass, cleanFormula, formulaHtmlText, formulaTex, FormulaError } from "./formula.js";

export const meta = {
  description: "محاسبات واکنش شیمیایی: معادله به‌طور خودکار موازنه می‌شود، سپس مقادیر واکنش‌دهنده‌ها به مول تبدیل می‌شوند، ماده محدودکننده و ماده مازاد تعیین می‌شوند، و بازده نظری و درصد بازده محاسبه می‌شود.",
  keywords: ["محاسبات شیمیایی", "استوکیومتری", "stoichiometry", "ماده محدودکننده", "limiting reagent", "بازده نظری", "درصد بازده", "percent yield", "ماده مازاد"],
  formulas: [
    { label: "ماده محدودکننده: کوچک‌ترین نسبت", tex: "\\min_j \\frac{n_j}{a_j}" },
    { label: "بازده نظری و درصد بازده", tex: "n_P = \\frac{b_P}{a_L}\\, n_L,\\qquad \\%\\,\\text{yield} = \\frac{m_{\\text{actual}}}{m_{\\text{theoretical}}}\\times 100" }
  ],
  inputs: [
    { id: "equation", label: "معادله (به‌طور خودکار موازنه می‌شود)", type: "text", default: "N2 + H2 -> NH3", wide: true },
    { id: "amounts", label: "مقادیر معلوم واکنش‌دهنده‌ها", type: "textarea", default: "N2 = 28 g\nH2 = 10 g", wide: true, help: "برای هر ماده یک سطر: فرمول = مقدار و سپس g یا mol، مانند Fe = 10 g یا O2 = 0.5 mol. حداقل یک واکنش‌دهنده وارد کنید." },
    { id: "product", label: "فراورده مطلوب", type: "text", default: "", help: "خالی بگذارید تا اولین فراورده معادله استفاده شود." },
    { id: "actual", label: "بازده واقعی (اختیاری)", unit: "g", type: "number", default: "" }
  ],
  example: { values: { equation: "Fe + O2 -> Fe2O3", amounts: "Fe = 11.17 g\nO2 = 6 g", product: "Fe2O3", actual: "12" }, expect: ["ماده محدودکننده: Fe", "m = 15.97 g", "75.14%"], note: "مثال: سوختن 11.17 g آهن با 6 g اکسیژن که در عمل 12 g به دست آوردیم." },
  invalid: { values: { equation: "H2 + O2 -> H2O", amounts: "H2O = 5 g", product: "", actual: "" } },
  related: ["equation-balancer", "molar-mass", "solutions", "empirical-formula"]
};

const key = (s) => cleanFormula(s).replace(/[·•*.]/g, "·");

export function solve(input) {
  const raw = str(input, "equation", "معادله");
  let b;
  try { b = balance(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "equation"); throw e; }
  const nL = b.reactants.length;
  const masses = b.parsed.map(molarMass);
  const idx = new Map(b.species.map((s, i) => [key(s), i]));
  const lines = str(input, "amounts", "مقادیر واکنش‌دهنده‌ها").split(/\r?\n|[;؛]/).map((l) => l.trim()).filter(Boolean);
  const given = new Map();
  lines.forEach((line, li) => {
    const m = line.match(/^(.+?)\s*[=:]\s*(.+?)\s*(g|mol|غ|غرام|مول)?\s*$/i);
    if (!m) fail(`سطر ${li + 1} نامفهوم است. مثلاً این‌گونه بنویسید: Fe = 10 g`, "amounts");
    const i = idx.get(key(m[1]));
    if (i === undefined) fail(`ماده «${m[1]}» در سطر ${li + 1} در معادله وجود ندارد.`, "amounts");
    if (i >= nL) fail(`«${m[1]}» فراورده است نه واکنش‌دهنده. فقط مقادیر واکنش‌دهنده‌ها را وارد کنید.`, "amounts");
    const v = parseNumber(m[2]);
    if (!(v > 0) || !isFinite(v)) fail(`مقدار سطر ${li + 1} باید عددی مثبت باشد.`, "amounts");
    const unit = (m[3] || "g").toLowerCase();
    const mol = unit === "mol" || unit === "مول" ? v : v / masses[i];
    given.set(i, mol);
  });
  if (!given.size) fail("مقدار حداقل یک واکنش‌دهنده را وارد کنید.", "amounts");
  let target = nL;
  if (!isBlank(input.product)) {
    const t = idx.get(key(input.product));
    if (t === undefined || t < nL) fail("فراورده مطلوب باید یکی از فراورده‌های معادله باشد.", "product");
    target = t;
  }
  const ratios = [...given].map(([i, n]) => [i, n / b.coef[i]]);
  const [Li, ext] = ratios.reduce((a, r) => (r[1] < a[1] ? r : a));
  const nT = ext * b.coef[target], mT = nT * masses[target];
  const name = (i) => formulaHtmlText(b.species[i]);
  const steps = [
    { text: "ابتدا معادله را موازنه می‌کنیم:", tex: equationTex(b) },
    { text: "مقادیر را به مول تبدیل می‌کنیم و بر ضریب تقسیم می‌کنیم:", tex: `\\begin{aligned}${ratios.map(([i, r]) => `\\mathrm{${formulaTex(b.species[i])}}:&\\ n = ${ntex(given.get(i), 5)}\\ \\text{mol},\\quad \\tfrac{n}{${b.coef[i]}} = ${ntex(r, 5)}`).join("\\\\")}\\end{aligned}` },
    given.size > 1 ? `کوچک‌ترین نسبت مربوط به ${name(Li)} است، پس آن ماده محدودکننده است و بقیه مازادند.` : `فقط یک واکنش‌دهنده وارد شده است (${name(Li)})، پس آن را محدودکننده در نظر می‌گیریم و فرض می‌کنیم بقیه به مقدار زیاد موجودند.`,
    { text: `بازده نظری از ${name(target)}:`, tex: `n = \\frac{${b.coef[target]}}{${b.coef[Li]}} \\times ${ntex(given.get(Li), 5)} = ${ntex(nT, 5)}\\ \\text{mol},\\quad m = nM = ${ntex(nT, 5)} \\times ${ntex(masses[target], 6)} = ${ntex(mT, 5)}\\ \\text{g}` }
  ];
  const rows = b.species.map((sp, i) => {
    const used = ext * b.coef[i];
    const left = i < nL && given.has(i) ? given.get(i) - used : null;
    return [name(i), String(b.coef[i]), fmt(masses[i], 6), i < nL ? (given.has(i) ? fmt(given.get(i), 5) : "—") : "—", `${fmt(used, 5)} mol = ${fmt(used * masses[i], 5)} g`, left === null ? "—" : `${fmt(Math.max(left, 0), 4)} mol = ${fmt(Math.max(left, 0) * masses[i], 4)} g`];
  });
  const results = [
    { label: "معادله موازنه‌شده", value: equationText(b) },
    { label: "ماده محدودکننده", value: name(Li), text: `ماده محدودکننده: ${name(Li)}` },
    { label: `بازده نظری از ${name(target)}`, value: `${fmt(mT, 4)} g (${fmt(nT, 4)} mol)`, text: `m = ${fmt(mT, 4)} g` }
  ];
  let copy = `${equationText(b)} | ماده محدودکننده: ${name(Li)} | ${name(target)}: m = ${fmt(mT, 4)} g`;
  if (!isBlank(input.actual)) {
    const a = num(input, "actual", "بازده واقعی", { positive: true });
    const pct = (100 * a) / mT;
    steps.push({ text: "درصد بازده:", tex: `\\frac{${ntex(a)}}{${ntex(mT, 5)}} \\times 100 = ${ntex(pct, 4)}\\%` });
    results.push({ label: "درصد بازده", value: `${fmt(pct, 4)}%` });
    copy += ` | ${fmt(pct, 4)}%`;
    if (pct > 100) steps.push("درصد بیشتر از 100% معمولاً به این معناست که فراورده خشک یا خالص نیست، یا خطایی در اندازه‌گیری وجود دارد.");
  }
  return { results, steps, copy, blocks: [{ type: "table", caption: "جدول کمّی (آنچه واکنش می‌دهد یا تولید می‌شود وقتی ماده محدودکننده تمام شود)", head: ["ماده", "ضریب", "M (g/mol)", "داده (mol)", "واکنش‌دهنده/فراورده", "باقی‌مانده"], rows }] };
}
