import { fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { mean, quantile, tInv } from "./dist.js";

export const meta = {
  description: "أدخل مجموعة بيانات واحصل على كل مقاييسها الوصفية: الوسط والوسيط والمنوال والتباين والانحراف المعياري والربيعات والقيم الشاذة والالتواء وفترة الثقة للوسط، مع مدرج تكراري.",
  keywords: ["إحصاء وصفي", "الوسط الحسابي", "المتوسط", "الوسيط", "المنوال", "الانحراف المعياري", "التباين", "الربيعات", "IQR", "القيم الشاذة", "descriptive statistics", "mean", "median", "standard deviation", "مدرج تكراري"],
  formulas: [
    { label: "الوسط والانحراف المعياري للعينة", tex: "\\bar x = \\frac{1}{n}\\sum x_i,\\qquad s = \\sqrt{\\frac{\\sum (x_i - \\bar x)^2}{n-1}}" },
    { label: "فترة الثقة للوسط", tex: "\\bar x \\pm t_{\\alpha/2,\\,n-1}\\,\\frac{s}{\\sqrt n}" }
  ],
  inputs: [
    { id: "data", label: "البيانات", type: "textarea", default: "12 15 11 18 15 20 14 15 16 13 22 9", wide: true, help: "افصل القيم بمسافات أو فواصل أو أسطر جديدة." },
    { id: "conf", label: "مستوى الثقة", unit: "%", type: "number", default: "95" }
  ],
  example: { values: { data: "2 4 4 4 5 5 7 9", conf: "95" }, expect: ["x̄ = 5", "s = 2.138", "الوسيط = 4.5"], note: "مثال: ثماني قيم مشهورة في كتب الإحصاء." },
  invalid: { values: { data: "5", conf: "95" } },
  related: ["probability-distributions", "hypothesis-tests", "linear-regression", "significant-figures"]
};

export function solve(input) {
  const x = numList(input, "data", "البيانات", { min: 2, max: 100000 });
  const conf = num(input, "conf", "مستوى الثقة", { min: 50, below: 100 });
  const n = x.length, s = [...x].sort((a, b) => a - b);
  const m = mean(x), sum = x.reduce((a, b) => a + b, 0);
  const ss = x.reduce((a, v) => a + (v - m) ** 2, 0);
  const vs = ss / (n - 1), vp = ss / n, sd = Math.sqrt(vs), sdp = Math.sqrt(vp);
  const med = quantile(s, 0.5), q1 = quantile(s, 0.25), q3 = quantile(s, 0.75), iqr = q3 - q1;
  const freq = new Map();
  for (const v of x) freq.set(v, (freq.get(v) || 0) + 1);
  const maxF = Math.max(...freq.values());
  const modes = maxF > 1 ? [...freq].filter(([, c]) => c === maxF).map(([v]) => v).sort((a, b) => a - b) : [];
  const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
  const out = s.filter((v) => v < lo || v > hi);
  const se = sd / Math.sqrt(n);
  const tc = tInv(1 - (1 - conf / 100) / 2, n - 1);
  const m3 = x.reduce((a, v) => a + (v - m) ** 3, 0) / n, m4 = x.reduce((a, v) => a + (v - m) ** 4, 0) / n;
  const skew = n > 2 && vp > 0 ? (Math.sqrt(n * (n - 1)) / (n - 2)) * (m3 / vp ** 1.5) : NaN;
  const kurt = n > 3 && vp > 0 ? ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * (m4 / (vp * vp) - 3) + 6) : NaN;
  const f = (v) => fmt(v, 6);
  const results = [
    { label: "عدد القيم n", value: String(n) },
    { label: "الوسط الحسابي", value: f(m), text: `x̄ = ${f(m)}` },
    { label: "الوسيط", value: f(med), text: `الوسيط = ${f(med)}` },
    { label: "المنوال", value: modes.length ? modes.map(f).join("، ") : "لا يوجد (كل قيمة مرة واحدة)" },
    { label: "الانحراف المعياري للعينة s", value: f(sd), text: `s = ${fmt(sd, 4)}` },
    { label: "التباين للعينة s²", value: f(vs) },
    { label: "الانحراف المعياري للمجتمع σ", value: f(sdp) },
    { label: "أصغر / أكبر قيمة", value: `${f(s[0])} / ${f(s[n - 1])}` },
    { label: "المدى", value: f(s[n - 1] - s[0]) },
    { label: "الربيع الأول Q1 / الثالث Q3", value: `${f(q1)} / ${f(q3)}` },
    { label: "المدى الربيعي IQR", value: f(iqr) },
    { label: "المجموع", value: f(sum) },
    { label: "الخطأ المعياري للوسط", value: f(se) },
    { label: `فترة ثقة ${fmt(conf)}% للوسط`, value: `[${f(m - tc * se)} ، ${f(m + tc * se)}]` },
    { label: "معامل الاختلاف CV", value: m !== 0 ? `${fmt((100 * sd) / Math.abs(m), 4)}%` : "غير معرّف (الوسط صفر)" },
    { label: "الالتواء", value: isFinite(skew) ? fmt(skew, 4) : "غير معرّف" },
    { label: "التفرطح الزائد", value: isFinite(kurt) ? fmt(kurt, 4) : "غير معرّف" },
    { label: "القيم الشاذة (قاعدة 1.5×IQR)", value: out.length ? out.map(f).join("، ") : "لا يوجد" }
  ];
  const steps = [
    { text: "الوسط الحسابي:", tex: `\\bar x = \\frac{${ntex(sum, 8)}}{${n}} = ${ntex(m, 6)}` },
    `نرتب البيانات تصاعدياً: ${s.length <= 40 ? s.map(f).join("، ") : s.slice(0, 40).map(f).join("، ") + " …"}.`,
    n % 2 ? `عدد القيم فردي، فالوسيط هو القيمة رقم ${(n + 1) / 2}: ${f(med)}.` : `عدد القيم زوجي، فالوسيط متوسط القيمتين ${n / 2} و ${n / 2 + 1}: ${f(med)}.`,
    { text: "مجموع مربعات الانحرافات والانحراف المعياري للعينة:", tex: `\\sum (x_i - \\bar x)^2 = ${ntex(ss, 6)},\\quad s = \\sqrt{\\frac{${ntex(ss, 6)}}{${n - 1}}} = ${ntex(sd, 6)}` },
    "الربيعات محسوبة بالاستيفاء الخطي (طريقة Excel ودالة R الافتراضية).",
    { text: `فترة الثقة (${fmt(conf)}%) باستخدام توزيع t بدرجات حرية ${n - 1}:`, tex: `${ntex(m, 6)} \\pm ${ntex(tc, 5)} \\times \\frac{${ntex(sd, 5)}}{\\sqrt{${n}}} = ${ntex(m, 6)} \\pm ${ntex(tc * se, 5)}` }
  ];
  const blocks = [];
  if (s[n - 1] > s[0]) {
    const k = Math.min(30, Math.max(5, Math.ceil(Math.log2(n) + 1)));
    const w = (s[n - 1] - s[0]) / k;
    const counts = Array(k).fill(0);
    for (const v of s) counts[Math.min(k - 1, Math.floor((v - s[0]) / w))]++;
    const pts = [[s[0], 0]];
    counts.forEach((c, i) => { const a = s[0] + i * w; pts.push([a, c], [a + w, c]); });
    pts.push([s[n - 1], 0]);
    blocks.push({ type: "plot", title: `المدرج التكراري (${k} فئات)`, xLabel: "القيمة", yLabel: "التكرار", includeZero: true, series: [{ name: "التكرار", points: pts }], vlines: [{ x: m }] });
    blocks.push({ type: "table", caption: "جدول التوزيع التكراري", head: ["الفئة", "التكرار", "النسبي"], rows: counts.map((c, i) => [`${fmt(s[0] + i * w, 4)} – ${fmt(s[0] + (i + 1) * w, 4)}`, String(c), `${fmt((100 * c) / n, 3)}%`]) });
  } else blocks.push({ type: "note", text: "كل القيم متساوية، فالتشتت صفر." });
  return { results, steps, blocks, copy: `n = ${n}, x̄ = ${f(m)}, الوسيط = ${f(med)}, s = ${fmt(sd, 4)}, σ = ${fmt(sdp, 4)}, Q1 = ${f(q1)}, Q3 = ${f(q3)}` };
}
