import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const n6 = (x) => ntex(x, 6);

const RATIOS = [
  {
    label: "النسبة الجارية", need: ["CA", "CL"], den: "CL", pct: false,
    sym: "\\frac{CA}{CL}", sub: (v) => `\\frac{${n6(v.CA)}}{${n6(v.CL)}}`, f: (v) => v.CA / v.CL,
    interp: (x) => (x >= 2 ? "سيولة جيدة، فالأصول المتداولة تغطي الالتزامات القصيرة مرتين على الأقل" : x >= 1 ? "سيولة مقبولة لكن هامشها محدود" : "الأصول المتداولة لا تكفي لتغطية الالتزامات القصيرة")
  },
  {
    label: "نسبة السيولة السريعة", need: ["CA", "inv", "CL"], den: "CL", pct: false,
    sym: "\\frac{CA-\\text{Inv}}{CL}", sub: (v) => `\\frac{${n6(v.CA)}-${n6(v.inv)}}{${n6(v.CL)}}`, f: (v) => (v.CA - v.inv) / v.CL,
    interp: (x) => (x >= 1 ? "تغطي الالتزامات القصيرة دون الاعتماد على بيع المخزون" : "تعتمد على بيع المخزون لسداد الالتزامات القصيرة")
  },
  {
    label: "نسبة الدين إلى الأصول", need: ["TL", "TA"], den: "TA", pct: true,
    sym: "\\frac{TL}{TA}", sub: (v) => `\\frac{${n6(v.TL)}}{${n6(v.TA)}}`, f: (v) => v.TL / v.TA,
    interp: (x) => (x < 0.5 ? "اعتماد منخفض على الديون" : x <= 1 ? "اعتماد متوسط على الديون" : "الالتزامات تفوق الأصول")
  },
  {
    label: "نسبة الدين إلى حقوق الملكية", need: ["TL", "equity"], den: "equity", pct: false,
    sym: "\\frac{TL}{E}", sub: (v) => `\\frac{${n6(v.TL)}}{${n6(v.equity)}}`, f: (v) => v.TL / v.equity,
    interp: (x, v) => (v.equity < 0 ? "حقوق الملكية سالبة، وهذا وضع مالي يستدعي الحذر" : x < 1 ? "التمويل بحقوق الملكية أكبر من الديون" : "الديون تفوق أو تساوي حقوق الملكية")
  },
  {
    label: "العائد على الأصول", need: ["ni", "TA"], den: "TA", pct: true,
    sym: "\\frac{NI}{TA}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.TA)}}`, f: (v) => v.ni / v.TA,
    interp: (x) => (x < 0 ? "خسارة بالنسبة إلى الأصول" : x < 0.05 ? "عائد منخفض على الأصول" : "عائد جيد على الأصول")
  },
  {
    label: "العائد على حقوق الملكية", need: ["ni", "equity"], den: "equity", pct: true,
    sym: "\\frac{NI}{E}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.equity)}}`, f: (v) => v.ni / v.equity,
    interp: (x, v) => (v.equity < 0 ? "حقوق الملكية سالبة، والنسبة غير دالة على ربحية حقيقية" : x < 0 ? "خسارة بالنسبة إلى حقوق الملكية" : x < 0.1 ? "عائد منخفض على حقوق الملكية" : "عائد جيد على حقوق الملكية")
  },
  {
    label: "هامش الربح الإجمالي", need: ["rev", "cogs"], den: "rev", pct: true,
    sym: "\\frac{Rev-COGS}{Rev}", sub: (v) => `\\frac{${n6(v.rev)}-${n6(v.cogs)}}{${n6(v.rev)}}`, f: (v) => (v.rev - v.cogs) / v.rev,
    interp: (x) => (x < 0 ? "تكلفة البضاعة المباعة أكبر من الإيراد" : "الجزء من كل ريال مبيعات المتبقي بعد تكلفة البضاعة المباعة")
  },
  {
    label: "هامش صافي الربح", need: ["ni", "rev"], den: "rev", pct: true,
    sym: "\\frac{NI}{Rev}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.rev)}}`, f: (v) => v.ni / v.rev,
    interp: (x) => (x < 0 ? "خسارة صافية من المبيعات" : "الجزء من كل ريال مبيعات الذي يتحول إلى ربح صافي")
  },
  {
    label: "معدل دوران الأصول", need: ["rev", "TA"], den: "TA", pct: false,
    sym: "\\frac{Rev}{TA}", sub: (v) => `\\frac{${n6(v.rev)}}{${n6(v.TA)}}`, f: (v) => v.rev / v.TA,
    interp: (x) => (x < 1 ? "الأصول تولّد إيراداً أقل من قيمتها" : "الأصول تولّد إيراداً يفوق قيمتها")
  }
];

const FIELDS = [
  ["CA", "الأصول المتداولة", { nonNegative: true }],
  ["CL", "الخصوم المتداولة", { nonNegative: true }],
  ["inv", "المخزون", { nonNegative: true }],
  ["TA", "إجمالي الأصول", { nonNegative: true }],
  ["TL", "إجمالي الخصوم", { nonNegative: true }],
  ["equity", "حقوق الملكية", {}],
  ["rev", "الإيرادات", { nonNegative: true }],
  ["cogs", "تكلفة البضاعة المباعة", { nonNegative: true }],
  ["ni", "صافي الدخل", {}]
];

export const meta = {
  description: "احسب النسب المالية الأساسية (السيولة والمديونية والربحية وكفاءة الأصول) من البيانات المتوفرة فقط، مع جدول يوضح كل نسبة وصيغتها وتفسيرها المختصر.",
  keywords: ["النسب المالية", "financial ratios", "النسبة الجارية", "السيولة", "ROA", "ROE", "هامش الربح", "المديونية"],
  formulas: [
    { label: "النسبة الجارية", tex: "\\frac{\\text{الأصول المتداولة}}{\\text{الخصوم المتداولة}}" },
    { label: "العائد على حقوق الملكية", tex: "ROE = \\frac{NI}{E}" },
    { label: "العائد على الأصول", tex: "ROA = \\frac{NI}{TA}" }
  ],
  inputs: [
    { id: "CA", label: "الأصول المتداولة", type: "number" },
    { id: "CL", label: "الخصوم المتداولة", type: "number" },
    { id: "inv", label: "المخزون", type: "number" },
    { id: "TA", label: "إجمالي الأصول", type: "number" },
    { id: "TL", label: "إجمالي الخصوم", type: "number" },
    { id: "equity", label: "حقوق الملكية", type: "number" },
    { id: "rev", label: "الإيرادات", type: "number" },
    { id: "cogs", label: "تكلفة البضاعة المباعة", type: "number" },
    { id: "ni", label: "صافي الدخل", type: "number", help: "جميع الحقول اختيارية، وتُحسب كل نسبة تتوفر بياناتها فقط." }
  ],
  example: {
    values: { CA: "500000", CL: "250000", inv: "100000", TA: "1000000", TL: "600000", equity: "400000", rev: "800000", cogs: "500000", ni: "80000" },
    expect: ["النسبة الجارية = 2", "نسبة الدين إلى الأصول = 60%"],
    note: "مثال: شركة بأصول متداولة 500,000 وخصوم متداولة 250,000 وبيانات الأصول والإيرادات المذكورة."
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
      skipped.push(`${d.label} (بيانات ناقصة)`);
      continue;
    }
    if (v[d.den] === 0) {
      skipped.push(`${d.label} (المقام صفر)`);
      continue;
    }
    computed.push({ d, x: d.f(v) });
  }
  if (computed.length === 0) fail("أدخل بيانات كافية لحساب نسبة مالية واحدة على الأقل، مثل الأصول المتداولة والخصوم المتداولة.", "CA");
  const disp = (d, x) => (d.pct ? `${fmt(x * 100, 4)}%` : fmt(x, 4));
  const results = computed.map(({ d, x }) => ({ label: d.label, value: disp(d, x), text: `${d.label} = ${disp(d, x)}` }));
  const steps = computed.map(({ d, x }) => ({ text: `${d.label}:`, tex: `${d.sym} = ${d.sub(v)} = ${d.pct ? `${ntex(x * 100, 6)}\\%` : ntex(x, 6)}` }));
  const rows = computed.map(({ d, x }) => [d.label, disp(d, x), { tex: d.sym }, d.interp(x, v)]);
  const blocks = [{ type: "table", caption: "النسب المحسوبة", head: ["النسبة", "القيمة", "الصيغة", "التفسير"], rows }];
  if (skipped.length > 0) blocks.push({ type: "note", text: `لم تُحسب: ${skipped.join("، ")}.`, tone: "warn" });
  return {
    results,
    steps,
    copy: results.map((r) => `${r.label} = ${r.value}`).join("، "),
    blocks
  };
}
