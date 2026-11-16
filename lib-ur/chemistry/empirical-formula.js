import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { BY_SYMBOL, molarMass } from "./formula.js";

export const meta = {
  description: "کمیتی فیصد یا عناصر کی کمیتوں سے ابتدائی فارمولا (سادہ ترین تناسب) نکالیں، پھر اگر مولر کمیت معلوم ہو تو سالماتی فارمولا، ساتھ کم سے کم مولز کی تعداد سے تقسیم کا جدول۔",
  keywords: ["ابتدائی فارمولا", "سالماتی فارمولا", "empirical formula", "molecular formula", "عنصری تجزیہ", "فیصد", "سادہ ترین تناسب"],
  formulas: [
    { label: "ہر عنصر کے مولز، پھر سادہ ترین تناسب", tex: "n_i = \\frac{m_i}{A_i},\\qquad r_i = \\frac{n_i}{\\min_j n_j}" },
    { label: "سالماتی فارمولا", tex: "k = \\frac{M_{\\text{molecular}}}{M_{\\text{empirical}}}" }
  ],
  inputs: [
    { id: "data", label: "عناصر اور ان کے فیصد یا کمیتیں", type: "textarea", default: "C 40.0\nH 6.71\nO 53.29", wide: true, help: "ہر عنصر کے لیے ایک سطر: علامت، پھر فیصد یا گرام میں کمیت، جیسے C 40 یا Na: 2.3" },
    { id: "M", label: "مرکب کی مولر کمیت (اختیاری)", unit: "g/mol", type: "number", default: "180" }
  ],
  example: { values: { data: "C 40.0\nH 6.71\nO 53.29", M: "180.16" }, expect: ["CH2O", "C6H12O6"], note: "مثال: مرکب جس میں C 40%، H 6.71% اور O 53.29% ہے اور مولر کمیت 180.16 g/mol ہے۔" },
  invalid: { values: { data: "C 40\nXx 60", M: "" } },
  related: ["molar-mass", "stoichiometry", "equation-balancer", "periodic-table"]
};

const ORDER = (els) => {
  const hasC = els.includes("C");
  return [...els].sort((a, b) => {
    if (hasC) {
      const r = (x) => (x === "C" ? 0 : x === "H" ? 1 : 2);
      if (r(a) !== r(b)) return r(a) - r(b);
    }
    return a.localeCompare(b);
  });
};

const write = (counts) => ORDER(Object.keys(counts)).map((el) => `${el}${counts[el] === 1 ? "" : counts[el]}`).join("");

export function solve(input) {
  const lines = str(input, "data", "عناصر").split(/\r?\n|[;؛,،]/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  lines.forEach((line, i) => {
    const m = line.match(/^([A-Za-z]{1,2})\s*[:=]?\s*(\S+?)\s*%?$/);
    if (!m) fail(`سطر ${i + 1} سمجھ میں نہیں آئی۔ اسے اس طرح لکھیں: C 40`, "data");
    const sym = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    if (!BY_SYMBOL[sym]) fail(`“${m[1]}” کوئی معلوم عنصر کی علامت نہیں ہے۔`, "data");
    if (items.some((x) => x.sym === sym)) fail(`عنصر ${sym} دوبارہ آیا ہے۔`, "data");
    const v = parseNumber(m[2]);
    if (!(v > 0) || !isFinite(v)) fail(`${sym} کی قدر ایک مثبت عدد ہونی چاہیے۔`, "data");
    items.push({ sym, v });
  });
  if (items.length < 2) fail("کم از کم دو عناصر درج کریں۔", "data");
  for (const it of items) it.n = it.v / BY_SYMBOL[it.sym].mass;
  const min = Math.min(...items.map((x) => x.n));
  for (const it of items) it.r = it.n / min;
  let mult = 0, best = null;
  for (let k = 1; k <= 12; k++) {
    const err = Math.max(...items.map((x) => Math.abs(x.r * k - Math.round(x.r * k)) / Math.max(1, Math.round(x.r * k))));
    if (err < 0.04) { mult = k; break; }
    if (!best || err < best.err) best = { k, err };
  }
  const warn = !mult;
  if (!mult) mult = best.k;
  const counts = Object.fromEntries(items.map((x) => [x.sym, Math.round(x.r * mult)]));
  const emp = write(counts), Me = molarMass(counts);
  const total = items.reduce((a, x) => a + x.v, 0);
  const steps = [
    Math.abs(total - 100) < 1.5 ? "کل مجموعہ تقریباً 100 ہے، اس لیے ہم قدروں کو فیصد لیتے ہیں اور 100 g کا نمونہ فرض کرتے ہیں۔" : `ہم قدروں کو گرام میں کمیتیں لیتے ہیں (ان کا مجموعہ ${fmt(total, 5)} g ہے)۔`,
    { text: "ہم ہر کمیت کو ایٹمی کمیت سے تقسیم کر کے مولز میں بدلتے ہیں:", tex: `\\begin{aligned}${items.map((x) => `\\text{${x.sym}}:&\\ \\frac{${ntex(x.v)}}{${ntex(BY_SYMBOL[x.sym].mass)}} = ${ntex(x.n, 5)}`).join("\\\\")}\\end{aligned}` },
    `کم سے کم مولز کی تعداد (${fmt(min, 5)}) سے تقسیم کرتے ہیں: ${items.map((x) => `${x.sym} = ${fmt(x.r, 4)}`).join("، ")}۔`,
    mult > 1 ? `تناسب مکمل عدد نہیں ہیں، اس لیے انہیں ${mult} سے ضرب دیتے ہیں: ${items.map((x) => `${x.sym} = ${fmt(x.r * mult, 4)}`).join("، ")}، پھر راؤنڈ کرتے ہیں۔` : "تناسب مکمل اعداد کے قریب ہیں، اس لیے انہیں راؤنڈ کرتے ہیں۔",
    { text: "ابتدائی فارمولا (Hill ترتیب میں) اور اس کی کمیت:", tex: `\\mathrm{${emp.replace(/(\d+)/g, "_{$1}")}},\\quad M_e = ${ntex(Me, 6)}\\ \\text{g/mol}` }
  ];
  const results = [{ label: "ابتدائی فارمولا", value: emp }, { label: "ابتدائی فارمولے کی کمیت", value: `${fmt(Me, 6)} g/mol` }];
  let copy = `ابتدائی فارمولا: ${emp}`;
  const blocks = [{ type: "table", caption: "سادہ ترین تناسب کا حساب", head: ["عنصر", "قدر", "مولز", "÷ کم سے کم", `× ${mult}`, "تعداد"], rows: items.map((x) => [x.sym, fmt(x.v, 5), fmt(x.n, 5), fmt(x.r, 4), fmt(x.r * mult, 4), String(counts[x.sym])]) }];
  if (warn) blocks.push({ type: "note", tone: "warn", text: "تناسب واضح طور پر مکمل اعداد کے قریب نہیں ہیں؛ ڈیٹا کی درستگی چیک کریں۔ ہم نے ممکنہ قریب ترین راؤنڈنگ منتخب کی۔" });
  if (!isBlank(input.M)) {
    const M = num(input, "M", "مولر کمیت", { positive: true });
    const kk = M / Me, k = Math.round(kk);
    if (k < 1 || Math.abs(kk - k) > 0.1) fail(`مولر کمیت ${fmt(M)} ابتدائی فارمولے کی کمیت (${fmt(Me, 5)}) کا صحیح مضرب نہیں ہے۔ تناسب ${fmt(kk, 4)}۔`, "M");
    const mol = Object.fromEntries(Object.entries(counts).map(([el, n]) => [el, n * k]));
    const mf = write(mol);
    steps.push({ text: "سالماتی فارمولا:", tex: `k = \\frac{${ntex(M)}}{${ntex(Me, 6)}} = ${ntex(kk, 4)} \\approx ${k} \\Rightarrow \\mathrm{${mf.replace(/(\d+)/g, "_{$1}")}}` });
    results.push({ label: "سالماتی فارمولا", value: mf });
    copy += ` | سالماتی فارمولا: ${mf}`;
  }
  return { results, steps, copy, blocks };
}
