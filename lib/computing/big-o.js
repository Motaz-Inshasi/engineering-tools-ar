import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const LN10 = Math.LN10;
const YEAR_S = 365.25 * 86400;
const UNIVERSE_S = 4.35e17;
const PLOT_CAP = 1000;

const CLASSES = [
  { id: "const", label: "O(1)", tex: "1" },
  { id: "log", label: "O(log n)", tex: "\\log_2 n" },
  { id: "lin", label: "O(n)", tex: "n" },
  { id: "nlogn", label: "O(n log n)", tex: "n\\log_2 n" },
  { id: "quad", label: "O(n²)", tex: "n^2" },
  { id: "cubic", label: "O(n³)", tex: "n^3" },
  { id: "exp", label: "O(2ⁿ)", tex: "2^n" },
  { id: "fact", label: "O(n!)", tex: "n!" }
];

export const meta = {
  description: "قارن عدد العمليات والزمن التقريبي لأصناف التعقيد O(1) وO(log n) وO(n) وO(n log n) وO(n²) وO(n³) وO(2ⁿ) وO(n!) لحجم مدخلات وسرعة تنفيذ معيّنين، مع رسم بياني لمقارنة النمو.",
  keywords: ["تعقيد", "Big-O", "O(n)", "O(n^2)", "خوارزمية", "زمن التنفيذ", "عمليات", "factorial", "log n", "complexity"],
  formulas: [
    { label: "زمن التنفيذ", tex: "t = \\frac{f(n)}{S}" },
    { label: "لوغاريتم العاملي (تقريب ستيرلنغ للقيم الكبيرة)", tex: "\\log_{10} n! \\approx \\frac{1}{\\ln 10}\\left(n\\ln n - n + \\tfrac{1}{2}\\ln(2\\pi n)\\right)" }
  ],
  inputs: [
    { id: "n", label: "حجم المدخلات n", type: "number", default: "1000000", help: "عدد صحيح من 1 إلى 10^12." },
    { id: "cls", label: "صنف التعقيد المختار", type: "select", default: "quad", options: CLASSES.map((c) => [c.id, c.label]) },
    { id: "ops", label: "سرعة التنفيذ", unit: "عملية/ث", type: "number", default: "1e9", help: "مثلاً 1e9 تعني مليار عملية في الثانية." }
  ],
  example: { values: { n: "1000000", cls: "quad", ops: "1e9" }, expect: ["10^12", "1000 s"], note: "مثال: n = 10^6 ومعالجة 10^9 عملية في الثانية لصنف O(n²)." },
  invalid: { values: { n: "0", cls: "quad", ops: "1e9" } },
  related: ["ieee754", "data-transfer"]
};

export function log10Factorial(n) {
  if (n < 20) {
    let s = 0;
    for (let k = 2; k <= n; k++) s += Math.log10(k);
    return s;
  }
  return (n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n) + 1 / (12 * n)) / LN10;
}

export function log10Ops(cls, n) {
  const L = Math.log10(n);
  const Lg = Math.log10(Math.log2(n));
  switch (cls) {
    case "const": return 0;
    case "log": return Lg;
    case "lin": return L;
    case "nlogn": return L + Lg;
    case "quad": return 2 * L;
    case "cubic": return 3 * L;
    case "exp": return n * Math.log10(2);
    default: return log10Factorial(n);
  }
}

export function humanize(T) {
  const t = Number(T.toPrecision(9));
  if (t === 0) return "0 ثانية";
  if (t < 1e-6) return `${fmt(t * 1e9, 3)} ns`;
  if (t < 1e-3) return `${fmt(t * 1e6, 3)} µs`;
  if (t < 1) return `${fmt(t * 1e3, 3)} ms`;
  if (t < 60) return `${fmt(t, 3)} ثانية`;
  if (t < 3600) {
    const m = Math.floor(t / 60);
    return `${m} دقيقة و${fmt(t - m * 60, 3)} ثانية`;
  }
  if (t < 86400) {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t - h * 3600) / 60);
    return `${h} ساعة و${m} دقيقة`;
  }
  if (t < YEAR_S) {
    const d = Math.floor(t / 86400);
    const h = Math.floor((t - d * 86400) / 3600);
    return `${d} يوم و${h} ساعة`;
  }
  if (t > UNIVERSE_S) return "أطول من عمر الكون";
  const y = Math.floor(t / YEAR_S);
  const d = Math.floor((t - y * YEAR_S) / 86400);
  return `${y} سنة و${d} يوم`;
}

export function timeOf(Lt) {
  if (Lt === -Infinity) return { seconds: 0, text: "0 ثانية" };
  if (Lt > Math.log10(UNIVERSE_S)) return { seconds: null, text: "أطول من عمر الكون" };
  const seconds = Math.pow(10, Lt);
  return { seconds, text: humanize(seconds) };
}

export function sciOps(L) {
  if (L === -Infinity) return "0";
  if (L < 6) return fmt(Math.pow(10, L), 4);
  const e = Math.floor(L);
  return `${fmt(Math.pow(10, L - e), 3)} × 10^${e}`;
}

function texOps(L) {
  if (L === -Infinity) return "0";
  if (L < 6) return ntex(Math.pow(10, L), 4);
  const e = Math.floor(L);
  return `${ntex(Math.pow(10, L - e), 3)} \\times 10^{${e}}`;
}

export function solve(input) {
  const n = num(input, "n", "حجم المدخلات n", { integer: true, min: 1, max: 1e12 });
  const S = num(input, "ops", "سرعة التنفيذ", { positive: true });
  const cls = choice(input, "cls", "صنف التعقيد", CLASSES.map((c) => c.id), "quad");
  const info = CLASSES.find((c) => c.id === cls);
  const L = log10Ops(cls, n);
  const time = timeOf(L - Math.log10(S));
  const rows = CLASSES.map((c) => {
    const Lc = log10Ops(c.id, n);
    return [c.label, sciOps(Lc), timeOf(Lc - Math.log10(S)).text];
  });
  const blocks = [{ type: "table", caption: `أصناف التعقيد لـ n = ${fmt(n, 6)} وسرعة ${fmt(S, 4)} عملية/ث`, head: ["الصنف", "عدد العمليات", "الزمن التقريبي"], rows, ltr: true }];
  const plotN = Math.min(n, PLOT_CAP);
  if (n > PLOT_CAP) blocks.push({ type: "note", text: `الرسم يعرض n من 1 إلى ${PLOT_CAP} فقط لوضوح المنحنيات.` });
  if (plotN >= 2) {
    const step = Math.max(1, Math.floor(plotN / 200));
    const xs = [];
    for (let x = 1; x <= plotN; x += step) xs.push(x);
    if (xs[xs.length - 1] !== plotN) xs.push(plotN);
    const series = ["lin", "nlogn", "quad", "cubic"].map((id) => ({
      name: CLASSES.find((c) => c.id === id).label,
      points: xs.map((x) => [x, log10Ops(id, x)]).filter((p) => Number.isFinite(p[1]))
    }));
    blocks.push({ type: "plot", title: "log10(عدد العمليات) مقابل n", xLabel: "n", yLabel: "log10(ops)", includeZero: true, series });
  }
  const secText = time.seconds === null ? "أكبر من 4.35 × 10^17 s" : `${fmt(time.seconds, 4)} s`;
  const secTex = time.seconds === null ? "> 4.35 \\times 10^{17}\\ s" : `${ntex(time.seconds, 4)}\\ s`;
  return {
    results: [
      { label: `عدد العمليات لـ ${info.label}`, value: sciOps(L) },
      { label: "الزمن التقريبي", value: time.text },
      { label: "الزمن بالثواني", value: secText }
    ],
    steps: [
      { text: `عدد العمليات لصنف ${info.label}:`, tex: `f(n) = ${info.tex} = ${texOps(L)}` },
      { text: "زمن التنفيذ بالثواني:", tex: `t = \\frac{f(n)}{S} = \\frac{${texOps(L)}}{${ntex(S)}} = ${secTex}` },
      `التحويل إلى وحدة مفهومة: ${time.text}.`
    ],
    copy: `${info.label} لـ n = ${fmt(n, 6)}: ${sciOps(L)} عملية ≈ ${time.text}${time.seconds === null ? "" : ` (${secText})`}`,
    blocks
  };
}
