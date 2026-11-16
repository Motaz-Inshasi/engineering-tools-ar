import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const n6 = (x) => ntex(x, 6);

const RATIOS = [
  {
    label: "نسبت جاری", need: ["CA", "CL"], den: "CL", pct: false,
    sym: "\\frac{CA}{CL}", sub: (v) => `\\frac{${n6(v.CA)}}{${n6(v.CL)}}`, f: (v) => v.CA / v.CL,
    interp: (x) => (x >= 2 ? "نقدینگی خوب است؛ دارایی‌های جاری بدهی‌های کوتاه‌مدت را دست‌کم دو برابر پوشش می‌دهند" : x >= 1 ? "نقدینگی قابل قبول است، اما حاشیهٔ آن محدود است" : "دارایی‌های جاری برای پوشش بدهی‌های کوتاه‌مدت کافی نیستند")
  },
  {
    label: "نسبت نقدینگی سریع", need: ["CA", "inv", "CL"], den: "CL", pct: false,
    sym: "\\frac{CA-\\text{Inv}}{CL}", sub: (v) => `\\frac{${n6(v.CA)}-${n6(v.inv)}}{${n6(v.CL)}}`, f: (v) => (v.CA - v.inv) / v.CL,
    interp: (x) => (x >= 1 ? "بدهی‌های کوتاه‌مدت را بدون تکیه بر فروش موجودی پوشش می‌دهد" : "برای پرداخت بدهی‌های کوتاه‌مدت به فروش موجودی وابسته است")
  },
  {
    label: "نسبت بدهی به دارایی", need: ["TL", "TA"], den: "TA", pct: true,
    sym: "\\frac{TL}{TA}", sub: (v) => `\\frac{${n6(v.TL)}}{${n6(v.TA)}}`, f: (v) => v.TL / v.TA,
    interp: (x) => (x < 0.5 ? "وابستگی کم به بدهی" : x <= 1 ? "وابستگی متوسط به بدهی" : "بدهی‌ها از دارایی‌ها بیشترند")
  },
  {
    label: "نسبت بدهی به حقوق صاحبان سهام", need: ["TL", "equity"], den: "equity", pct: false,
    sym: "\\frac{TL}{E}", sub: (v) => `\\frac{${n6(v.TL)}}{${n6(v.equity)}}`, f: (v) => v.TL / v.equity,
    interp: (x, v) => (v.equity < 0 ? "حقوق صاحبان سهام منفی است و این وضعیت مالی نیازمند احتیاط است" : x < 1 ? "تأمین مالی از طریق حقوق صاحبان سهام بیشتر از بدهی است" : "بدهی‌ها برابر یا بیشتر از حقوق صاحبان سهام هستند")
  },
  {
    label: "بازده دارایی‌ها", need: ["ni", "TA"], den: "TA", pct: true,
    sym: "\\frac{NI}{TA}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.TA)}}`, f: (v) => v.ni / v.TA,
    interp: (x) => (x < 0 ? "زیان نسبت به دارایی‌ها" : x < 0.05 ? "بازده پایین دارایی‌ها" : "بازده خوب دارایی‌ها")
  },
  {
    label: "بازده حقوق صاحبان سهام", need: ["ni", "equity"], den: "equity", pct: true,
    sym: "\\frac{NI}{E}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.equity)}}`, f: (v) => v.ni / v.equity,
    interp: (x, v) => (v.equity < 0 ? "حقوق صاحبان سهام منفی است و این نسبت نشان‌دهندهٔ سودآوری واقعی نیست" : x < 0 ? "زیان نسبت به حقوق صاحبان سهام" : x < 0.1 ? "بازده پایین حقوق صاحبان سهام" : "بازده خوب حقوق صاحبان سهام")
  },
  {
    label: "حاشیهٔ سود ناخالص", need: ["rev", "cogs"], den: "rev", pct: true,
    sym: "\\frac{Rev-COGS}{Rev}", sub: (v) => `\\frac{${n6(v.rev)}-${n6(v.cogs)}}{${n6(v.rev)}}`, f: (v) => (v.rev - v.cogs) / v.rev,
    interp: (x) => (x < 0 ? "بهای تمام‌شدهٔ کالای فروش‌رفته از درآمد بیشتر است" : "سهمی از هر واحد فروش که پس از کسر بهای تمام‌شدهٔ کالای فروش‌رفته باقی می‌ماند")
  },
  {
    label: "حاشیهٔ سود خالص", need: ["ni", "rev"], den: "rev", pct: true,
    sym: "\\frac{NI}{Rev}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.rev)}}`, f: (v) => v.ni / v.rev,
    interp: (x) => (x < 0 ? "زیان خالص از فروش" : "سهمی از هر واحد فروش که به سود خالص تبدیل می‌شود")
  },
  {
    label: "گردش دارایی‌ها", need: ["rev", "TA"], den: "TA", pct: false,
    sym: "\\frac{Rev}{TA}", sub: (v) => `\\frac{${n6(v.rev)}}{${n6(v.TA)}}`, f: (v) => v.rev / v.TA,
    interp: (x) => (x < 1 ? "دارایی‌ها درآمدی کمتر از ارزش خود تولید می‌کنند" : "دارایی‌ها درآمدی بیشتر از ارزش خود تولید می‌کنند")
  }
];

const FIELDS = [
  ["CA", "دارایی‌های جاری", { nonNegative: true }],
  ["CL", "بدهی‌های جاری", { nonNegative: true }],
  ["inv", "موجودی کالا", { nonNegative: true }],
  ["TA", "کل دارایی‌ها", { nonNegative: true }],
  ["TL", "کل بدهی‌ها", { nonNegative: true }],
  ["equity", "حقوق صاحبان سهام", {}],
  ["rev", "درآمدها", { nonNegative: true }],
  ["cogs", "بهای تمام‌شدهٔ کالای فروش‌رفته", { nonNegative: true }],
  ["ni", "سود خالص", {}]
];

export const meta = {
  description: "نسبت‌های مالی پایه (نقدینگی، بدهی، سودآوری و کارایی دارایی‌ها) را فقط از داده‌های موجود محاسبه کنید، همراه با جدولی که هر نسبت، فرمول و تفسیر کوتاه آن را نشان می‌دهد.",
  keywords: ["نسبت‌های مالی", "financial ratios", "نسبت جاری", "نقدینگی", "ROA", "ROE", "حاشیهٔ سود", "اهرم مالی"],
  formulas: [
    { label: "نسبت جاری", tex: "\\frac{\\text{دارایی‌های جاری}}{\\text{بدهی‌های جاری}}" },
    { label: "بازده حقوق صاحبان سهام", tex: "ROE = \\frac{NI}{E}" },
    { label: "بازده دارایی‌ها", tex: "ROA = \\frac{NI}{TA}" }
  ],
  inputs: [
    { id: "CA", label: "دارایی‌های جاری", type: "number" },
    { id: "CL", label: "بدهی‌های جاری", type: "number" },
    { id: "inv", label: "موجودی کالا", type: "number" },
    { id: "TA", label: "کل دارایی‌ها", type: "number" },
    { id: "TL", label: "کل بدهی‌ها", type: "number" },
    { id: "equity", label: "حقوق صاحبان سهام", type: "number" },
    { id: "rev", label: "درآمدها", type: "number" },
    { id: "cogs", label: "بهای تمام‌شدهٔ کالای فروش‌رفته", type: "number" },
    { id: "ni", label: "سود خالص", type: "number", help: "همهٔ فیلدها اختیاری هستند و هر نسبتی که داده‌هایش موجود باشد محاسبه می‌شود." }
  ],
  example: {
    values: { CA: "500000", CL: "250000", inv: "100000", TA: "1000000", TL: "600000", equity: "400000", rev: "800000", cogs: "500000", ni: "80000" },
    expect: ["نسبت جاری = 2", "نسبت بدهی به دارایی = 60%"],
    note: "مثال: شرکتی با دارایی‌های جاری 500,000 و بدهی‌های جاری 250,000 و داده‌های دارایی و درآمد ذکرشده در بالا."
  },
  invalid: { values: { CA: "", CL: "", inv: "", TA: "", TL: "", equity: "", rev: "", cogs: "", ni: "" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "depreciation", "price-elasticity"]
};

export function solve(input) {
  const v = {};
  for (const [id, label, opts] of FIELDS) v[id] = num(input, id, label, { ...opts, optional: true });
  const computed = [];
  const skipped = [];
  for (const d of RATIOS) {
    if (d.need.some((k) => v[k] === null)) {
      skipped.push(`${d.label} (داده ناکافی)`);
      continue;
    }
    if (v[d.den] === 0) {
      skipped.push(`${d.label} (مخرج صفر)`);
      continue;
    }
    computed.push({ d, x: d.f(v) });
  }
  if (computed.length === 0) fail("داده کافی برای محاسبهٔ حداقل یک نسبت مالی وارد کنید، مانند دارایی‌های جاری و بدهی‌های جاری.", "CA");
  const disp = (d, x) => (d.pct ? `${fmt(x * 100, 4)}%` : fmt(x, 4));
  const results = computed.map(({ d, x }) => ({ label: d.label, value: disp(d, x), text: `${d.label} = ${disp(d, x)}` }));
  const steps = computed.map(({ d, x }) => ({ text: `${d.label}:`, tex: `${d.sym} = ${d.sub(v)} = ${d.pct ? `${ntex(x * 100, 6)}\\%` : ntex(x, 6)}` }));
  const rows = computed.map(({ d, x }) => [d.label, disp(d, x), { tex: d.sym }, d.interp(x, v)]);
  const blocks = [{ type: "table", caption: "نسبت‌های محاسبه‌شده", head: ["نسبت", "مقدار", "فرمول", "تفسیر"], rows }];
  if (skipped.length > 0) blocks.push({ type: "note", text: `محاسبه نشد: ${skipped.join("، ")}.`, tone: "warn" });
  return {
    results,
    steps,
    copy: results.map((r) => `${r.label} = ${r.value}`).join("، "),
    blocks
  };
}
