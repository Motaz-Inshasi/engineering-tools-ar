import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "احسب نقطة التعادل بالوحدات والإيرادات، وهامش المساهمة ونسبته، وعدد الوحدات اللازم لتحقيق ربح مستهدف، مع رسم الإيراد والتكلفة الكلية حتى ضعف نقطة التعادل.",
  keywords: ["نقطة التعادل", "break-even", "هامش المساهمة", "التكاليف الثابتة", "التكاليف المتغيرة", "الربح المستهدف"],
  formulas: [
    { label: "نقطة التعادل بالوحدات", tex: "Q^* = \\frac{F}{p-v}" },
    { label: "الوحدات لتحقيق ربح مستهدف", tex: "Q_T = \\frac{F+\\pi}{p-v}" }
  ],
  inputs: [
    { id: "F", label: "التكاليف الثابتة F", unit: "", type: "number", default: "10000" },
    { id: "p", label: "سعر بيع الوحدة p", type: "number", default: "50" },
    { id: "v", label: "التكلفة المتغيرة للوحدة v", type: "number", default: "30" },
    { id: "target", label: "الربح المستهدف π (اختياري)", type: "number", help: "اتركه فارغاً إن لم تحتج إليه." }
  ],
  example: { values: { F: "10000", p: "50", v: "30", target: "" }, expect: ["500 وحدة", "25,000.00"], note: "مثال: تكاليف ثابتة 10,000 وسعر 50 وتكلفة متغيرة 30 للوحدة." },
  invalid: { values: { F: "10000", p: "30", v: "30", target: "" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const F = num(input, "F", "التكاليف الثابتة", { nonNegative: true });
  const p = num(input, "p", "سعر بيع الوحدة", { positive: true });
  const v = num(input, "v", "التكلفة المتغيرة للوحدة", { nonNegative: true });
  const target = num(input, "target", "الربح المستهدف", { optional: true });
  if (!(p > v)) fail("سعر البيع يجب أن يكون أكبر من التكلفة المتغيرة للوحدة، وإلا فلن تغطي المبيعات أي جزء من التكاليف الثابتة.", "p");
  const cm = p - v;
  const units = F / cm;
  const revenue = units * p;
  const cost = F + v * units;
  const ratio = cm / p;
  const integerUnits = Math.ceil(units - 1e-9);
  let targetUnits = null;
  if (target !== null) {
    if (F + target < 0) fail("الخسارة المستهدفة تتجاوز التكاليف الثابتة، فلا يمكن حسابها بعدد وحدات موجب.", "target");
    targetUnits = (F + target) / cm;
  }
  const xMax = units > 0 ? 2 * units : 1;
  const sample = (fn) => Array.from({ length: 21 }, (_, k) => {
    const x = (xMax * k) / 20;
    return [x, fn(x)];
  });
  const plot = {
    type: "plot",
    title: "الإيراد والتكلفة الكلية حسب عدد الوحدات",
    xLabel: "عدد الوحدات",
    yLabel: "المبلغ",
    includeZero: true,
    series: [
      { name: "الإيراد الكلي", points: sample((x) => p * x), line: true },
      { name: "التكلفة الكلية", points: sample((x) => F + v * x), line: true }
    ]
  };
  if (units > 0) plot.vlines = [{ x: units }];
  const results = [
    { label: "نقطة التعادل بالوحدات", value: `${fmt(units, 6)} وحدة`, text: `${fmt(units, 6)} وحدة` },
    { label: "أقل عدد صحيح من الوحدات", value: `${fmt(integerUnits)} وحدة` },
    { label: "إيراد نقطة التعادل", value: money(revenue) },
    { label: "هامش المساهمة للوحدة", value: money(cm) },
    { label: "نسبة هامش المساهمة", value: `${fmt(ratio * 100, 4)}%` }
  ];
  const steps = [
    { text: "هامش المساهمة للوحدة:", tex: `p - v = ${ntex(p)} - ${ntex(v)} = ${ntex(cm)}` },
    { text: "نقطة التعادل بالوحدات:", tex: `Q^* = \\frac{F}{p-v} = \\frac{${ntex(F)}}{${ntex(cm)}} = ${ntex(units, 6)}` },
    { text: "إيراد نقطة التعادل:", tex: `R^* = pQ^* = ${ntex(p)} \\times ${ntex(units, 6)} = ${ntex(revenue, 8)}` }
  ];
  let copy = `نقطة التعادل: ${fmt(units, 6)} وحدة، الإيراد عندها: ${money(revenue)}`;
  if (targetUnits !== null) {
    results.push({ label: "الوحدات لتحقيق الربح المستهدف", value: `${fmt(targetUnits, 6)} وحدة` });
    steps.push({ text: "الوحدات لتحقيق الربح المستهدف:", tex: `Q_T = \\frac{F+\\pi}{p-v} = \\frac{${ntex(F)} + ${ntex(target)}}{${ntex(cm)}} = ${ntex(targetUnits, 6)}` });
    copy += `، الوحدات لتحقيق الربح المستهدف: ${fmt(targetUnits, 6)} وحدة`;
  }
  return { results, steps, copy, blocks: [plot] };
}
