import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const n6 = (x) => ntex(x, 6);

const RATIOS = [
  {
    label: "موجودہ تناسب", need: ["CA", "CL"], den: "CL", pct: false,
    sym: "\\frac{CA}{CL}", sub: (v) => `\\frac{${n6(v.CA)}}{${n6(v.CL)}}`, f: (v) => v.CA / v.CL,
    interp: (x) => (x >= 2 ? "اچھی لیکویڈیٹی: موجودہ اثاثے قلیل مدتی واجبات کو کم از کم دو گنا پورا کرتے ہیں" : x >= 1 ? "قابلِ قبول لیکویڈیٹی، لیکن اس کا مارجن محدود ہے" : "موجودہ اثاثے قلیل مدتی واجبات کو پورا کرنے کے لیے کافی نہیں ہیں")
  },
  {
    label: "فوری تناسب", need: ["CA", "inv", "CL"], den: "CL", pct: false,
    sym: "\\frac{CA-\\text{Inv}}{CL}", sub: (v) => `\\frac{${n6(v.CA)}-${n6(v.inv)}}{${n6(v.CL)}}`, f: (v) => (v.CA - v.inv) / v.CL,
    interp: (x) => (x >= 1 ? "اسٹاک فروخت کیے بغیر قلیل مدتی واجبات پورے ہو جاتے ہیں" : "قلیل مدتی واجبات ادا کرنے کے لیے اسٹاک کی فروخت پر انحصار ہے")
  },
  {
    label: "قرض بمقابلہ اثاثے کا تناسب", need: ["TL", "TA"], den: "TA", pct: true,
    sym: "\\frac{TL}{TA}", sub: (v) => `\\frac{${n6(v.TL)}}{${n6(v.TA)}}`, f: (v) => v.TL / v.TA,
    interp: (x) => (x < 0.5 ? "قرض پر کم انحصار" : x <= 1 ? "قرض پر درمیانہ انحصار" : "واجبات اثاثوں سے زیادہ ہیں")
  },
  {
    label: "قرض بمقابلہ ملکیت کا تناسب", need: ["TL", "equity"], den: "equity", pct: false,
    sym: "\\frac{TL}{E}", sub: (v) => `\\frac{${n6(v.TL)}}{${n6(v.equity)}}`, f: (v) => v.TL / v.equity,
    interp: (x, v) => (v.equity < 0 ? "ملکیت منفی ہے، جو احتیاط کا متقاضی مالی صورتحال ہے" : x < 1 ? "ملکیتی سرمائے کی فنڈنگ قرض سے زیادہ ہے" : "قرض ملکیت کے برابر یا اس سے زیادہ ہے")
  },
  {
    label: "اثاثوں پر منافع", need: ["ni", "TA"], den: "TA", pct: true,
    sym: "\\frac{NI}{TA}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.TA)}}`, f: (v) => v.ni / v.TA,
    interp: (x) => (x < 0 ? "اثاثوں کے لحاظ سے نقصان" : x < 0.05 ? "اثاثوں پر کم منافع" : "اثاثوں پر اچھا منافع")
  },
  {
    label: "ملکیت پر منافع", need: ["ni", "equity"], den: "equity", pct: true,
    sym: "\\frac{NI}{E}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.equity)}}`, f: (v) => v.ni / v.equity,
    interp: (x, v) => (v.equity < 0 ? "ملکیت منفی ہے، اس لیے یہ تناسب حقیقی منافع کو ظاہر نہیں کرتا" : x < 0 ? "ملکیت کے لحاظ سے نقصان" : x < 0.1 ? "ملکیت پر کم منافع" : "ملکیت پر اچھا منافع")
  },
  {
    label: "مجموعی منافع کا مارجن", need: ["rev", "cogs"], den: "rev", pct: true,
    sym: "\\frac{Rev-COGS}{Rev}", sub: (v) => `\\frac{${n6(v.rev)}-${n6(v.cogs)}}{${n6(v.rev)}}`, f: (v) => (v.rev - v.cogs) / v.rev,
    interp: (x) => (x < 0 ? "فروخت شدہ مال کی لاگت آمدنی سے زیادہ ہے" : "فروخت شدہ مال کی لاگت نکالنے کے بعد ہر ایک روپے کی فروخت میں سے باقی حصہ")
  },
  {
    label: "خالص منافع کا مارجن", need: ["ni", "rev"], den: "rev", pct: true,
    sym: "\\frac{NI}{Rev}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.rev)}}`, f: (v) => v.ni / v.rev,
    interp: (x) => (x < 0 ? "فروخت پر خالص نقصان" : "ہر ایک روپے کی فروخت میں سے وہ حصہ جو خالص منافع بنتا ہے")
  },
  {
    label: "اثاثوں کا گردشی تناسب", need: ["rev", "TA"], den: "TA", pct: false,
    sym: "\\frac{Rev}{TA}", sub: (v) => `\\frac{${n6(v.rev)}}{${n6(v.TA)}}`, f: (v) => v.rev / v.TA,
    interp: (x) => (x < 1 ? "اثاثے اپنی قیمت سے کم آمدنی پیدا کرتے ہیں" : "اثاثے اپنی قیمت سے زیادہ آمدنی پیدا کرتے ہیں")
  }
];

const FIELDS = [
  ["CA", "موجودہ اثاثے", { nonNegative: true }],
  ["CL", "موجودہ واجبات", { nonNegative: true }],
  ["inv", "اسٹاک", { nonNegative: true }],
  ["TA", "کل اثاثے", { nonNegative: true }],
  ["TL", "کل واجبات", { nonNegative: true }],
  ["equity", "ملکیت", {}],
  ["rev", "آمدنی", { nonNegative: true }],
  ["cogs", "فروخت شدہ مال کی لاگت", { nonNegative: true }],
  ["ni", "خالص آمدنی", {}]
];

export const meta = {
  description: "صرف دستیاب ڈیٹا سے بنیادی مالی تناسب (لیکویڈیٹی، قرض، منافع بخشی اور اثاثوں کی کارکردگی) کا حساب لگائیں، ساتھ ایک جدول جس میں ہر تناسب، اس کا فارمولا اور مختصر تشریح ہو۔",
  keywords: ["مالی تناسب", "financial ratios", "موجودہ تناسب", "لیکویڈیٹی", "ROA", "ROE", "منافع کا مارجن", "قرض کا بوجھ"],
  formulas: [
    { label: "موجودہ تناسب", tex: "\\frac{\\text{موجودہ اثاثے}}{\\text{موجودہ واجبات}}" },
    { label: "ملکیت پر منافع", tex: "ROE = \\frac{NI}{E}" },
    { label: "اثاثوں پر منافع", tex: "ROA = \\frac{NI}{TA}" }
  ],
  inputs: [
    { id: "CA", label: "موجودہ اثاثے", type: "number" },
    { id: "CL", label: "موجودہ واجبات", type: "number" },
    { id: "inv", label: "اسٹاک", type: "number" },
    { id: "TA", label: "کل اثاثے", type: "number" },
    { id: "TL", label: "کل واجبات", type: "number" },
    { id: "equity", label: "ملکیت", type: "number" },
    { id: "rev", label: "آمدنی", type: "number" },
    { id: "cogs", label: "فروخت شدہ مال کی لاگت", type: "number" },
    { id: "ni", label: "خالص آمدنی", type: "number", help: "تمام خانے اختیاری ہیں، اور ہر تناسب صرف اسی وقت حساب ہوتا ہے جب اس کا ڈیٹا دستیاب ہو۔" }
  ],
  example: {
    values: { CA: "500000", CL: "250000", inv: "100000", TA: "1000000", TL: "600000", equity: "400000", rev: "800000", cogs: "500000", ni: "80000" },
    expect: ["موجودہ تناسب = 2", "قرض بمقابلہ اثاثوں کا تناسب = 60%"],
    note: "مثال: ایک کمپنی جس کے موجودہ اثاثے 500,000، موجودہ واجبات 250,000 ہیں، اور اوپر بیان کردہ اثاثوں اور آمدنی کا ڈیٹا۔"
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
      skipped.push(`${d.label} (ناکافی ڈیٹا)`);
      continue;
    }
    if (v[d.den] === 0) {
      skipped.push(`${d.label} (مخرج صفر)`);
      continue;
    }
    computed.push({ d, x: d.f(v) });
  }
  if (computed.length === 0) fail("کم از کم ایک مالی تناسب کے حساب کے لیے کافی ڈیٹا درج کریں، جیسے موجودہ اثاثے اور موجودہ واجبات۔", "CA");
  const disp = (d, x) => (d.pct ? `${fmt(x * 100, 4)}%` : fmt(x, 4));
  const results = computed.map(({ d, x }) => ({ label: d.label, value: disp(d, x), text: `${d.label} = ${disp(d, x)}` }));
  const steps = computed.map(({ d, x }) => ({ text: `${d.label}:`, tex: `${d.sym} = ${d.sub(v)} = ${d.pct ? `${ntex(x * 100, 6)}\\%` : ntex(x, 6)}` }));
  const rows = computed.map(({ d, x }) => [d.label, disp(d, x), { tex: d.sym }, d.interp(x, v)]);
  const blocks = [{ type: "table", caption: "حساب شدہ تناسب", head: ["تناسب", "قدر", "فارمولا", "تشریح"], rows }];
  if (skipped.length > 0) blocks.push({ type: "note", text: `حساب نہیں ہوا: ${skipped.join("، ")}۔`, tone: "warn" });
  return {
    results,
    steps,
    copy: results.map((r) => `${r.label} = ${r.value}`).join("، "),
    blocks
  };
}
