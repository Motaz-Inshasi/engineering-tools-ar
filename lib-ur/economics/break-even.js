import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "اکائیوں اور آمدنی میں نقطۂ توازن، شراکتی مارجن اور اس کی شرح، اور مطلوبہ منافع حاصل کرنے کے لیے درکار اکائیوں کی تعداد کا حساب لگائیں، نیز نقطۂ توازن کے دوگنا تک آمدنی اور کل لاگت کا گراف بنائیں۔",
  keywords: ["نقطۂ توازن", "break-even", "شراکتی مارجن", "مقررہ اخراجات", "متغیر اخراجات", "مطلوبہ منافع"],
  formulas: [
    { label: "اکائیوں میں نقطۂ توازن", tex: "Q^* = \\frac{F}{p-v}" },
    { label: "مطلوبہ منافع حاصل کرنے کی اکائیاں", tex: "Q_T = \\frac{F+\\pi}{p-v}" }
  ],
  inputs: [
    { id: "F", label: "مقررہ اخراجات F", unit: "", type: "number", default: "10000" },
    { id: "p", label: "فی اکائی فروخت کی قیمت p", type: "number", default: "50" },
    { id: "v", label: "فی اکائی متغیر لاگت v", type: "number", default: "30" },
    { id: "target", label: "مطلوبہ منافع π (اختیاری)", type: "number", help: "اگر اس کی ضرورت نہ ہو تو اسے خالی چھوڑ دیں۔" }
  ],
  example: { values: { F: "10000", p: "50", v: "30", target: "" }, expect: ["500 اکائیاں", "25,000.00"], note: "مثال: مقررہ اخراجات 10,000، فی اکائی فروخت کی قیمت 50 اور فی اکائی متغیر لاگت 30۔" },
  invalid: { values: { F: "10000", p: "30", v: "30", target: "" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const F = num(input, "F", "مقررہ اخراجات", { nonNegative: true });
  const p = num(input, "p", "فی اکائی فروخت کی قیمت", { positive: true });
  const v = num(input, "v", "فی اکائی متغیر لاگت", { nonNegative: true });
  const target = num(input, "target", "مطلوبہ منافع", { optional: true });
  if (!(p > v)) fail("فروخت کی قیمت فی اکائی متغیر لاگت سے زیادہ ہونی چاہیے، ورنہ فروخت مقررہ اخراجات کا کوئی حصہ پورا نہیں کرے گی۔", "p");
  const cm = p - v;
  const units = F / cm;
  const revenue = units * p;
  const cost = F + v * units;
  const ratio = cm / p;
  const integerUnits = Math.ceil(units - 1e-9);
  let targetUnits = null;
  if (target !== null) {
    if (F + target < 0) fail("مطلوبہ نقصان مقررہ اخراجات سے زیادہ ہے، اس لیے اسے مثبت اکائیوں کی تعداد سے نہیں نکالا جا سکتا۔", "target");
    targetUnits = (F + target) / cm;
  }
  const xMax = units > 0 ? 2 * units : 1;
  const sample = (fn) => Array.from({ length: 21 }, (_, k) => {
    const x = (xMax * k) / 20;
    return [x, fn(x)];
  });
  const plot = {
    type: "plot",
    title: "اکائیوں کی تعداد کے لحاظ سے آمدنی اور کل لاگت",
    xLabel: "اکائیوں کی تعداد",
    yLabel: "رقم",
    includeZero: true,
    series: [
      { name: "کل آمدنی", points: sample((x) => p * x), line: true },
      { name: "کل لاگت", points: sample((x) => F + v * x), line: true }
    ]
  };
  if (units > 0) plot.vlines = [{ x: units }];
  const results = [
    { label: "اکائیوں میں نقطۂ توازن", value: `${fmt(units, 6)} اکائیاں`, text: `${fmt(units, 6)} اکائیاں` },
    { label: "اکائیوں کی کم از کم درست تعداد", value: `${fmt(integerUnits)} اکائیاں` },
    { label: "نقطۂ توازن پر آمدنی", value: money(revenue) },
    { label: "فی اکائی شراکتی مارجن", value: money(cm) },
    { label: "شراکتی مارجن کی شرح", value: `${fmt(ratio * 100, 4)}%` }
  ];
  const steps = [
    { text: "فی اکائی شراکتی مارجن:", tex: `p - v = ${ntex(p)} - ${ntex(v)} = ${ntex(cm)}` },
    { text: "اکائیوں میں نقطۂ توازن:", tex: `Q^* = \\frac{F}{p-v} = \\frac{${ntex(F)}}{${ntex(cm)}} = ${ntex(units, 6)}` },
    { text: "نقطۂ توازن پر آمدنی:", tex: `R^* = pQ^* = ${ntex(p)} \\times ${ntex(units, 6)} = ${ntex(revenue, 8)}` }
  ];
  let copy = `نقطۂ توازن: ${fmt(units, 6)} اکائیاں، اس نقطے پر آمدنی: ${money(revenue)}`;
  if (targetUnits !== null) {
    results.push({ label: "مطلوبہ منافع حاصل کرنے کی اکائیاں", value: `${fmt(targetUnits, 6)} اکائیاں` });
    steps.push({ text: "مطلوبہ منافع حاصل کرنے کی اکائیاں:", tex: `Q_T = \\frac{F+\\pi}{p-v} = \\frac{${ntex(F)} + ${ntex(target)}}{${ntex(cm)}} = ${ntex(targetUnits, 6)}` });
    copy += `، مطلوبہ منافع حاصل کرنے کی اکائیاں: ${fmt(targetUnits, 6)} اکائیاں`;
  }
  return { results, steps, copy, blocks: [plot] };
}
