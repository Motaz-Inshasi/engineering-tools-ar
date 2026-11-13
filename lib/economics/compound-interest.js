import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isInt = (x) => Math.abs(x - Math.round(x)) < 1e-9;

const FREQ = [["1", "سنوياً (1)"], ["2", "نصف سنوي (2)"], ["4", "ربع سنوي (4)"], ["12", "شهرياً (12)"], ["365", "يومياً (365)"], ["continuous", "مستمرة"]];

export const meta = {
  description: "احسب القيمة المستقبلية لمبلغ بالفائدة البسيطة أو المركبة أو المستمرة، مع مساهمات دورية اختيارية، وإجمالي الفائدة ومعدل الفائدة الفعلي السنوي وجدول الرصيد السنوي ورسماً بيانياً.",
  keywords: ["فائدة مركبة", "فائدة بسيطة", "compound interest", "القيمة المستقبلية", "FV", "استثمار", "فائدة مستمرة"],
  formulas: [
    { label: "الفائدة البسيطة", tex: "FV = P(1 + rt)" },
    { label: "الفائدة المركبة مع مساهمات دورية", tex: "FV = P\\left(1+\\frac{r}{n}\\right)^{nt} + PMT\\cdot\\frac{\\left(1+\\frac{r}{n}\\right)^{nt}-1}{r/n}" },
    { label: "الفائدة المستمرة", tex: "FV = Pe^{rt}" }
  ],
  inputs: [
    { id: "P", label: "المبلغ الأولي P", type: "number", default: "1000" },
    { id: "r", label: "معدل الفائدة السنوي", unit: "%", type: "number", default: "5" },
    { id: "t", label: "المدة", unit: "سنة", type: "number", default: "10", help: "يمكن أن تكون كسرية، بحد أقصى 100 سنة." },
    { id: "mode", label: "نوع الفائدة", type: "select", default: "compound", options: [["simple", "بسيطة"], ["compound", "مركبة"]] },
    { id: "freq", label: "عدد مرات الاستحقاق في السنة", type: "select", default: "12", options: FREQ, when: { mode: ["compound"] } },
    { id: "pmt", label: "مساهمة دورية PMT", type: "number", default: "0", when: { mode: ["compound"] }, help: "تُضاف في نهاية كل فترة استحقاق. غير متاحة مع الفائدة المستمرة، ومع المدة الكسرية يجب أن ينتج عدد فترات صحيح." }
  ],
  example: { values: { P: "1000", r: "5", t: "10", mode: "compound", freq: "12", pmt: "0" }, expect: ["1,647.01"], note: "مثال: 1000 بمعدل 5% لمدة 10 سنوات مع استحقاق شهري." },
  invalid: { values: { P: "1000", r: "5", t: "10", mode: "compound", freq: "continuous", pmt: "100" } },
  related: ["loan-amortization", "npv-irr", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const P = num(input, "P", "المبلغ الأولي", { nonNegative: true });
  const r = num(input, "r", "معدل الفائدة", { nonNegative: true, max: 1000 });
  const t = num(input, "t", "المدة", { positive: true, max: 100 });
  const mode = choice(input, "mode", "نوع الفائدة", ["simple", "compound"], "compound");
  const freq = choice(input, "freq", "عدد مرات الاستحقاق", ["1", "2", "4", "12", "365", "continuous"], "12");
  const pmt = num(input, "pmt", "المساهمة الدورية", { nonNegative: true, default: 0 });
  const rate = r / 100;
  const simple = mode === "simple";
  const continuous = !simple && freq === "continuous";
  const n = simple || continuous ? 1 : Number(freq);
  const contributing = !simple && !continuous && pmt > 0;
  if (continuous && pmt > 0) fail("المساهمة الدورية غير مدعومة مع الفائدة المستمرة. اجعل المساهمة صفراً أو اختر عدداً محدداً من مرات الاستحقاق.", "pmt");
  const N = n * t;
  if (contributing && !isInt(N)) fail(`عدد الفترات n × t = ${fmt(N)} يجب أن يكون عدداً صحيحاً عند وجود مساهمة دورية.`, "t");
  const i = rate / n;
  const balance = (y) => {
    if (simple) return P * (1 + rate * y);
    if (continuous) return P * Math.exp(rate * y);
    const k = n * y;
    const g = Math.pow(1 + i, k);
    return P * g + (i === 0 ? pmt * k : (pmt * (g - 1)) / i);
  };
  const FV = balance(t);
  const contributed = contributing ? pmt * N : 0;
  const totalContrib = P + contributed;
  const interest = FV - totalContrib;
  const ear = simple ? rate : continuous ? Math.exp(rate) - 1 : Math.pow(1 + i, n) - 1;
  const whole = Math.floor(t + 1e-9);
  const ys = [];
  for (let y = 1; y <= whole; y++) ys.push(y);
  if (t - whole > 1e-9) ys.push(t);
  const rows = ys.map((y) => {
    const b = balance(y);
    const contribY = contributing ? pmt * n * y : 0;
    return [fmt(y, 6), money(b), money(b - P - contribY)];
  });
  const points = [[0, P], ...ys.map((y) => [y, balance(y)])];
  const steps = [];
  if (simple) {
    steps.push({ text: "الفائدة البسيطة تُحسب على المبلغ الأولي فقط:", tex: `FV = P(1 + rt) = ${ntex(P)} \\times (1 + ${ntex(rate, 6)} \\times ${ntex(t)}) = ${ntex(FV, 8)}` });
  } else if (continuous) {
    steps.push({ text: "الاستحقاق المستمر:", tex: `FV = Pe^{rt} = ${ntex(P)} \\times e^{${ntex(rate, 6)} \\times ${ntex(t)}} = ${ntex(FV, 8)}` });
  } else {
    const contribTex = !contributing ? "" : i === 0 ? ` + ${ntex(pmt)} \\times ${ntex(N)}` : ` + ${ntex(pmt)} \\times \\frac{(1+${ntex(i, 6)})^{${ntex(N)}}-1}{${ntex(i, 6)}}`;
    steps.push({ text: "معدل الفائدة لكل فترة وعدد الفترات:", tex: `i = \\frac{r}{n} = \\frac{${ntex(rate, 6)}}{${n}} = ${ntex(i, 6)},\\qquad N = nt = ${n} \\times ${ntex(t)} = ${ntex(N)}` });
    steps.push({ text: "القيمة المستقبلية:", tex: `FV = P(1+i)^N${contributing ? " + PMT\\frac{(1+i)^N-1}{i}" : ""} = ${ntex(P)} \\times (1+${ntex(i, 6)})^{${ntex(N)}}${contribTex} = ${ntex(FV, 8)}` });
  }
  steps.push({ text: "إجمالي الفائدة = القيمة المستقبلية − إجمالي ما وُضع:", tex: `${ntex(FV, 8)} - ${ntex(totalContrib, 8)} = ${ntex(interest, 8)}` });
  return {
    results: [
      { label: "القيمة المستقبلية FV", value: money(FV), text: `FV = ${money(FV)}` },
      { label: "إجمالي ما وُضع", value: money(totalContrib) },
      { label: "إجمالي الفائدة", value: money(interest) },
      { label: "معدل الفائدة الفعلي السنوي", value: `${fmt(ear * 100, 5)}%` }
    ],
    steps,
    copy: `القيمة المستقبلية: ${money(FV)}، إجمالي الفائدة: ${money(interest)}، معدل الفائدة الفعلي السنوي: ${fmt(ear * 100, 5)}%`,
    blocks: [
      { type: "table", caption: "الرصيد في نهاية كل سنة", head: ["السنة", "الرصيد", "إجمالي الفائدة حتى الآن"], rows },
      { type: "plot", title: "نمو الرصيد عبر الزمن", xLabel: "السنوات", yLabel: "الرصيد", includeZero: true, series: [{ name: "الرصيد", points, line: true }] }
    ]
  };
}
