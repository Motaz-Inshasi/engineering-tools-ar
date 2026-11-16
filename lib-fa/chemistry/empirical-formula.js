import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { BY_SYMBOL, molarMass } from "./formula.js";

export const meta = {
  description: "استخراج فرمول تجربی (ساده‌ترین نسبت) از درصدهای جرمی یا جرم عناصر، سپس فرمول مولکولی اگر جرم مولی معلوم باشد، همراه با جدول تقسیم بر کوچک‌ترین تعداد مول.",
  keywords: ["فرمول تجربی", "فرمول مولکولی", "empirical formula", "molecular formula", "تحلیل عنصری", "درصد", "ساده‌ترین نسبت"],
  formulas: [
    { label: "مول هر عنصر، سپس ساده‌ترین نسبت", tex: "n_i = \\frac{m_i}{A_i},\\qquad r_i = \\frac{n_i}{\\min_j n_j}" },
    { label: "فرمول مولکولی", tex: "k = \\frac{M_{\\text{molecular}}}{M_{\\text{empirical}}}" }
  ],
  inputs: [
    { id: "data", label: "عناصر و درصد یا جرم آن‌ها", type: "textarea", default: "C 40.0\nH 6.71\nO 53.29", wide: true, help: "برای هر عنصر یک سطر: نماد و سپس درصد یا جرم بر حسب گرم، مانند C 40 یا Na: 2.3" },
    { id: "M", label: "جرم مولی ترکیب (اختیاری)", unit: "g/mol", type: "number", default: "180" }
  ],
  example: { values: { data: "C 40.0\nH 6.71\nO 53.29", M: "180.16" }, expect: ["CH2O", "C6H12O6"], note: "مثال: ترکیبی با C 40% و H 6.71% و O 53.29% و جرم مولی 180.16 g/mol." },
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
    if (!m) fail(`سطر ${i + 1} نامفهوم است. مثلاً این‌گونه بنویسید: C 40`, "data");
    const sym = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    if (!BY_SYMBOL[sym]) fail(`«${m[1]}» نماد شناخته‌شده یک عنصر نیست.`, "data");
    if (items.some((x) => x.sym === sym)) fail(`عنصر ${sym} تکراری است.`, "data");
    const v = parseNumber(m[2]);
    if (!(v > 0) || !isFinite(v)) fail(`مقدار ${sym} باید عددی مثبت باشد.`, "data");
    items.push({ sym, v });
  });
  if (items.length < 2) fail("حداقل دو عنصر وارد کنید.", "data");
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
    Math.abs(total - 100) < 1.5 ? "مجموع نزدیک 100 است، پس مقادیر را درصد در نظر می‌گیریم و نمونه‌ای به جرم 100 g فرض می‌کنیم." : `مقادیر را جرم بر حسب گرم در نظر می‌گیریم (مجموع آن‌ها ${fmt(total, 5)} g است).`,
    { text: "هر جرم را با تقسیم بر جرم اتمی به مول تبدیل می‌کنیم:", tex: `\\begin{aligned}${items.map((x) => `\\text{${x.sym}}:&\\ \\frac{${ntex(x.v)}}{${ntex(BY_SYMBOL[x.sym].mass)}} = ${ntex(x.n, 5)}`).join("\\\\")}\\end{aligned}` },
    `بر کوچک‌ترین تعداد مول (${fmt(min, 5)}) تقسیم می‌کنیم: ${items.map((x) => `${x.sym} = ${fmt(x.r, 4)}`).join("، ")}.`,
    mult > 1 ? `نسبت‌ها عدد صحیح نیستند، پس آن‌ها را در ${mult} ضرب می‌کنیم: ${items.map((x) => `${x.sym} = ${fmt(x.r * mult, 4)}`).join("، ")}، سپس گرد می‌کنیم.` : "نسبت‌ها نزدیک به اعداد صحیح‌اند، پس آن‌ها را گرد می‌کنیم.",
    { text: "فرمول تجربی (با ترتیب هیل) و جرم آن:", tex: `\\mathrm{${emp.replace(/(\d+)/g, "_{$1}")}},\\quad M_e = ${ntex(Me, 6)}\\ \\text{g/mol}` }
  ];
  const results = [{ label: "فرمول تجربی", value: emp }, { label: "جرم فرمول تجربی", value: `${fmt(Me, 6)} g/mol` }];
  let copy = `فرمول تجربی: ${emp}`;
  const blocks = [{ type: "table", caption: "محاسبه ساده‌ترین نسبت", head: ["عنصر", "مقدار", "مول‌ها", "÷ کوچک‌ترین", `× ${mult}`, "عدد"], rows: items.map((x) => [x.sym, fmt(x.v, 5), fmt(x.n, 5), fmt(x.r, 4), fmt(x.r * mult, 4), String(counts[x.sym])]) }];
  if (warn) blocks.push({ type: "note", tone: "warn", text: "نسبت‌ها به‌وضوح نزدیک اعداد صحیح نیستند؛ دقت داده‌ها را بررسی کنید. نزدیک‌ترین گرد کردن ممکن انتخاب شد." });
  if (!isBlank(input.M)) {
    const M = num(input, "M", "جرم مولی", { positive: true });
    const kk = M / Me, k = Math.round(kk);
    if (k < 1 || Math.abs(kk - k) > 0.1) fail(`جرم مولی ${fmt(M)} مضرب صحیحی از جرم فرمول تجربی (${fmt(Me, 5)}) نیست. نسبت ${fmt(kk, 4)}.`, "M");
    const mol = Object.fromEntries(Object.entries(counts).map(([el, n]) => [el, n * k]));
    const mf = write(mol);
    steps.push({ text: "فرمول مولکولی:", tex: `k = \\frac{${ntex(M)}}{${ntex(Me, 6)}} = ${ntex(kk, 4)} \\approx ${k} \\Rightarrow \\mathrm{${mf.replace(/(\d+)/g, "_{$1}")}}` });
    results.push({ label: "فرمول مولکولی", value: mf });
    copy += ` | فرمول مولکولی: ${mf}`;
  }
  return { results, steps, copy, blocks };
}
