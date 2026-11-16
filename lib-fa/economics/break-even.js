import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "نقطهٔ سربه‌سر را بر حسب واحد و درآمد، حاشیهٔ مشارکت و نسبت آن، و تعداد واحدهای لازم برای رسیدن به سود هدف را محاسبه کنید، همراه با رسم درآمد و هزینهٔ کل تا دو برابر نقطهٔ سربه‌سر.",
  keywords: ["نقطه سربه‌سر", "break-even", "حاشیه مشارکت", "هزینه‌های ثابت", "هزینه‌های متغیر", "سود هدف"],
  formulas: [
    { label: "نقطه سربه‌سر بر حسب واحد", tex: "Q^* = \\frac{F}{p-v}" },
    { label: "واحدهای لازم برای رسیدن به سود هدف", tex: "Q_T = \\frac{F+\\pi}{p-v}" }
  ],
  inputs: [
    { id: "F", label: "هزینه‌های ثابت F", unit: "", type: "number", default: "10000" },
    { id: "p", label: "قیمت فروش هر واحد p", type: "number", default: "50" },
    { id: "v", label: "هزینه متغیر هر واحد v", type: "number", default: "30" },
    { id: "target", label: "سود هدف π (اختیاری)", type: "number", help: "اگر به آن نیاز ندارید، خالی بگذارید." }
  ],
  example: { values: { F: "10000", p: "50", v: "30", target: "" }, expect: ["500 واحد", "25,000.00"], note: "مثال: هزینه‌های ثابت 10,000، قیمت 50 و هزینه متغیر 30 برای هر واحد." },
  invalid: { values: { F: "10000", p: "30", v: "30", target: "" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const F = num(input, "F", "هزینه‌های ثابت", { nonNegative: true });
  const p = num(input, "p", "قیمت فروش هر واحد", { positive: true });
  const v = num(input, "v", "هزینه متغیر هر واحد", { nonNegative: true });
  const target = num(input, "target", "سود هدف", { optional: true });
  if (!(p > v)) fail("قیمت فروش باید بیشتر از هزینه متغیر هر واحد باشد، وگرنه فروش هیچ بخشی از هزینه‌های ثابت را پوشش نمی‌دهد.", "p");
  const cm = p - v;
  const units = F / cm;
  const revenue = units * p;
  const cost = F + v * units;
  const ratio = cm / p;
  const integerUnits = Math.ceil(units - 1e-9);
  let targetUnits = null;
  if (target !== null) {
    if (F + target < 0) fail("زیان هدف از هزینه‌های ثابت بیشتر است، بنابراین با تعداد واحد مثبت قابل محاسبه نیست.", "target");
    targetUnits = (F + target) / cm;
  }
  const xMax = units > 0 ? 2 * units : 1;
  const sample = (fn) => Array.from({ length: 21 }, (_, k) => {
    const x = (xMax * k) / 20;
    return [x, fn(x)];
  });
  const plot = {
    type: "plot",
    title: "درآمد و هزینهٔ کل بر حسب تعداد واحد",
    xLabel: "تعداد واحد",
    yLabel: "مبلغ",
    includeZero: true,
    series: [
      { name: "درآمد کل", points: sample((x) => p * x), line: true },
      { name: "هزینهٔ کل", points: sample((x) => F + v * x), line: true }
    ]
  };
  if (units > 0) plot.vlines = [{ x: units }];
  const results = [
    { label: "نقطه سربه‌سر بر حسب واحد", value: `${fmt(units, 6)} واحد`, text: `${fmt(units, 6)} واحد` },
    { label: "کمترین تعداد صحیح واحد", value: `${fmt(integerUnits)} واحد` },
    { label: "درآمد نقطه سربه‌سر", value: money(revenue) },
    { label: "حاشیه مشارکت هر واحد", value: money(cm) },
    { label: "نسبت حاشیه مشارکت", value: `${fmt(ratio * 100, 4)}%` }
  ];
  const steps = [
    { text: "حاشیه مشارکت هر واحد:", tex: `p - v = ${ntex(p)} - ${ntex(v)} = ${ntex(cm)}` },
    { text: "نقطه سربه‌سر بر حسب واحد:", tex: `Q^* = \\frac{F}{p-v} = \\frac{${ntex(F)}}{${ntex(cm)}} = ${ntex(units, 6)}` },
    { text: "درآمد نقطه سربه‌سر:", tex: `R^* = pQ^* = ${ntex(p)} \\times ${ntex(units, 6)} = ${ntex(revenue, 8)}` }
  ];
  let copy = `نقطه سربه‌سر: ${fmt(units, 6)} واحد، درآمد در این نقطه: ${money(revenue)}`;
  if (targetUnits !== null) {
    results.push({ label: "واحدهای لازم برای رسیدن به سود هدف", value: `${fmt(targetUnits, 6)} واحد` });
    steps.push({ text: "واحدهای لازم برای رسیدن به سود هدف:", tex: `Q_T = \\frac{F+\\pi}{p-v} = \\frac{${ntex(F)} + ${ntex(target)}}{${ntex(cm)}} = ${ntex(targetUnits, 6)}` });
    copy += `، واحدهای لازم برای رسیدن به سود هدف: ${fmt(targetUnits, 6)} واحد`;
  }
  return { results, steps, copy, blocks: [plot] };
}
