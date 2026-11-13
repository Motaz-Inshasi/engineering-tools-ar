import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { BY_SYMBOL, molarMass } from "./formula.js";

export const meta = {
  description: "استنتج الصيغة الأولية (أبسط نسبة) من النسب المئوية الكتلية أو كتل العناصر، ثم الصيغة الجزيئية إذا عُرفت الكتلة المولية، مع جدول القسمة على أصغر عدد مولات.",
  keywords: ["الصيغة الأولية", "الصيغة الجزيئية", "empirical formula", "molecular formula", "التحليل العنصري", "النسبة المئوية", "أبسط نسبة"],
  formulas: [
    { label: "مولات كل عنصر ثم أبسط نسبة", tex: "n_i = \\frac{m_i}{A_i},\\qquad r_i = \\frac{n_i}{\\min_j n_j}" },
    { label: "الصيغة الجزيئية", tex: "k = \\frac{M_{\\text{molecular}}}{M_{\\text{empirical}}}" }
  ],
  inputs: [
    { id: "data", label: "العناصر ونسبها أو كتلها", type: "textarea", default: "C 40.0\nH 6.71\nO 53.29", wide: true, help: "سطر لكل عنصر: الرمز ثم النسبة المئوية أو الكتلة بالغرام، مثل C 40 أو Na: 2.3" },
    { id: "M", label: "الكتلة المولية للمركب (اختياري)", unit: "g/mol", type: "number", default: "180" }
  ],
  example: { values: { data: "C 40.0\nH 6.71\nO 53.29", M: "180.16" }, expect: ["CH2O", "C6H12O6"], note: "مثال: مركب نسبه C 40% و H 6.71% و O 53.29% وكتلته المولية 180.16 g/mol." },
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
  const lines = str(input, "data", "العناصر").split(/\r?\n|[;؛,،]/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  lines.forEach((line, i) => {
    const m = line.match(/^([A-Za-z]{1,2})\s*[:=]?\s*(\S+?)\s*%?$/);
    if (!m) fail(`السطر ${i + 1} غير مفهوم. اكتبه مثل: C 40`, "data");
    const sym = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    if (!BY_SYMBOL[sym]) fail(`«${m[1]}» ليس رمز عنصر معروفاً.`, "data");
    if (items.some((x) => x.sym === sym)) fail(`العنصر ${sym} مكرر.`, "data");
    const v = parseNumber(m[2]);
    if (!(v > 0) || !isFinite(v)) fail(`قيمة ${sym} يجب أن تكون رقماً موجباً.`, "data");
    items.push({ sym, v });
  });
  if (items.length < 2) fail("أدخل عنصرين على الأقل.", "data");
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
    Math.abs(total - 100) < 1.5 ? "المجموع قرابة 100، فنعامل القيم كنسب مئوية ونفترض عينة كتلتها 100 g." : `نعامل القيم ككتل بالغرام (مجموعها ${fmt(total, 5)} g).`,
    { text: "نحوّل كل كتلة إلى مولات بالقسمة على الكتلة الذرية:", tex: `\\begin{aligned}${items.map((x) => `\\text{${x.sym}}:&\\ \\frac{${ntex(x.v)}}{${ntex(BY_SYMBOL[x.sym].mass)}} = ${ntex(x.n, 5)}`).join("\\\\")}\\end{aligned}` },
    `نقسم على أصغر عدد مولات (${fmt(min, 5)}): ${items.map((x) => `${x.sym} = ${fmt(x.r, 4)}`).join("، ")}.`,
    mult > 1 ? `النسب ليست أعداداً صحيحة، فنضربها في ${mult}: ${items.map((x) => `${x.sym} = ${fmt(x.r * mult, 4)}`).join("، ")}، ثم نقرّب.` : "النسب قريبة من أعداد صحيحة، فنقرّبها.",
    { text: "الصيغة الأولية (بترتيب هيل) وكتلتها:", tex: `\\mathrm{${emp.replace(/(\d+)/g, "_{$1}")}},\\quad M_e = ${ntex(Me, 6)}\\ \\text{g/mol}` }
  ];
  const results = [{ label: "الصيغة الأولية", value: emp }, { label: "كتلة الصيغة الأولية", value: `${fmt(Me, 6)} g/mol` }];
  let copy = `الصيغة الأولية: ${emp}`;
  const blocks = [{ type: "table", caption: "حساب أبسط نسبة", head: ["العنصر", "القيمة", "المولات", "÷ الأصغر", `× ${mult}`, "العدد"], rows: items.map((x) => [x.sym, fmt(x.v, 5), fmt(x.n, 5), fmt(x.r, 4), fmt(x.r * mult, 4), String(counts[x.sym])]) }];
  if (warn) blocks.push({ type: "note", tone: "warn", text: "النسب لا تقترب من أعداد صحيحة بوضوح؛ تحقق من دقة البيانات. اخترنا أقرب تقريب ممكن." });
  if (!isBlank(input.M)) {
    const M = num(input, "M", "الكتلة المولية", { positive: true });
    const kk = M / Me, k = Math.round(kk);
    if (k < 1 || Math.abs(kk - k) > 0.1) fail(`الكتلة المولية ${fmt(M)} ليست مضاعفاً صحيحاً لكتلة الصيغة الأولية (${fmt(Me, 5)}). النسبة ${fmt(kk, 4)}.`, "M");
    const mol = Object.fromEntries(Object.entries(counts).map(([el, n]) => [el, n * k]));
    const mf = write(mol);
    steps.push({ text: "الصيغة الجزيئية:", tex: `k = \\frac{${ntex(M)}}{${ntex(Me, 6)}} = ${ntex(kk, 4)} \\approx ${k} \\Rightarrow \\mathrm{${mf.replace(/(\d+)/g, "_{$1}")}}` });
    results.push({ label: "الصيغة الجزيئية", value: mf });
    copy += ` | الصيغة الجزيئية: ${mf}`;
  }
  return { results, steps, copy, blocks };
}
