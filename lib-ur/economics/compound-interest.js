import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isInt = (x) => Math.abs(x - Math.round(x)) < 1e-9;

const FREQ = [["1", "سالانہ (1)"], ["2", "ششماہی (2)"], ["4", "سہ ماہی (4)"], ["12", "ماہانہ (12)"], ["365", "روزانہ (365)"], ["continuous", "مسلسل"]];

export const meta = {
  description: "کسی رقم کی مستقبل کی قیمت سادہ، مرکب یا مسلسل سود کے تحت حساب کریں، اختیاری وقفہ وار شراکتوں کے ساتھ، نیز کل سود، سالانہ مؤثر شرح سود، سالانہ بقایا جات کا جدول اور گراف حاصل کریں۔",
  keywords: ["مرکب سود", "سادہ سود", "compound interest", "مستقبل کی قیمت", "FV", "سرمایہ کاری", "مسلسل سود"],
  formulas: [
    { label: "سادہ سود", tex: "FV = P(1 + rt)" },
    { label: "وقفہ وار شراکتوں کے ساتھ مرکب سود", tex: "FV = P\\left(1+\\frac{r}{n}\\right)^{nt} + PMT\\cdot\\frac{\\left(1+\\frac{r}{n}\\right)^{nt}-1}{r/n}" },
    { label: "مسلسل سود", tex: "FV = Pe^{rt}" }
  ],
  inputs: [
    { id: "P", label: "اصل زر P", type: "number", default: "1000" },
    { id: "r", label: "سالانہ شرح سود", unit: "%", type: "number", default: "5" },
    { id: "t", label: "مدت", unit: "سال", type: "number", default: "10", help: "کسری ہو سکتی ہے، زیادہ سے زیادہ 100 سال۔" },
    { id: "mode", label: "سود کی قسم", type: "select", default: "compound", options: [["simple", "سادہ"], ["compound", "مرکب"]] },
    { id: "freq", label: "سال میں سود کی ادائیگی کے مواقع", type: "select", default: "12", options: FREQ, when: { mode: ["compound"] } },
    { id: "pmt", label: "وقفہ وار شراکت PMT", type: "number", default: "0", when: { mode: ["compound"] }, help: "ہر سود کے دورانیے کے آخر میں شامل کی جاتی ہے۔ مسلسل سود کے ساتھ دستیاب نہیں؛ کسری مدت کی صورت میں دورانیوں کی تعداد صحیح عدد ہونی چاہیے۔" }
  ],
  example: { values: { P: "1000", r: "5", t: "10", mode: "compound", freq: "12", pmt: "0" }, expect: ["1,647.01"], note: "مثال: 5% شرح پر 10 سال کے لیے 1000، ماہانہ سود کے ساتھ۔" },
  invalid: { values: { P: "1000", r: "5", t: "10", mode: "compound", freq: "continuous", pmt: "100" } },
  related: ["loan-amortization", "npv-irr", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const P = num(input, "P", "اصل زر", { nonNegative: true });
  const r = num(input, "r", "شرح سود", { nonNegative: true, max: 1000 });
  const t = num(input, "t", "مدت", { positive: true, max: 100 });
  const mode = choice(input, "mode", "سود کی قسم", ["simple", "compound"], "compound");
  const freq = choice(input, "freq", "سود کے دورانیے", ["1", "2", "4", "12", "365", "continuous"], "12");
  const pmt = num(input, "pmt", "وقفہ وار شراکت", { nonNegative: true, default: 0 });
  const rate = r / 100;
  const simple = mode === "simple";
  const continuous = !simple && freq === "continuous";
  const n = simple || continuous ? 1 : Number(freq);
  const contributing = !simple && !continuous && pmt > 0;
  if (continuous && pmt > 0) fail("مسلسل سود کے ساتھ وقفہ وار شراکتیں معاون نہیں ہیں۔ شراکت صفر رکھیں یا سود کے دورانیوں کی مخصوص تعداد منتخب کریں۔", "pmt");
  const N = n * t;
  if (contributing && !isInt(N)) fail(`جب وقفہ وار شراکت ہو تو دورانیوں کی تعداد n × t = ${fmt(N)} صحیح عدد ہونی چاہیے۔`, "t");
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
    steps.push({ text: "سادہ سود صرف اصل زر پر حساب کیا جاتا ہے:", tex: `FV = P(1 + rt) = ${ntex(P)} \\times (1 + ${ntex(rate, 6)} \\times ${ntex(t)}) = ${ntex(FV, 8)}` });
  } else if (continuous) {
    steps.push({ text: "مسلسل مرکب سود:", tex: `FV = Pe^{rt} = ${ntex(P)} \\times e^{${ntex(rate, 6)} \\times ${ntex(t)}} = ${ntex(FV, 8)}` });
  } else {
    const contribTex = !contributing ? "" : i === 0 ? ` + ${ntex(pmt)} \\times ${ntex(N)}` : ` + ${ntex(pmt)} \\times \\frac{(1+${ntex(i, 6)})^{${ntex(N)}}-1}{${ntex(i, 6)}}`;
    steps.push({ text: "فی دورانیہ شرح سود اور دورانیوں کی تعداد:", tex: `i = \\frac{r}{n} = \\frac{${ntex(rate, 6)}}{${n}} = ${ntex(i, 6)},\\qquad N = nt = ${n} \\times ${ntex(t)} = ${ntex(N)}` });
    steps.push({ text: "مستقبل کی قیمت:", tex: `FV = P(1+i)^N${contributing ? " + PMT\\frac{(1+i)^N-1}{i}" : ""} = ${ntex(P)} \\times (1+${ntex(i, 6)})^{${ntex(N)}}${contribTex} = ${ntex(FV, 8)}` });
  }
  steps.push({ text: "کل سود = مستقبل کی قیمت − کل جمع شدہ رقم:", tex: `${ntex(FV, 8)} - ${ntex(totalContrib, 8)} = ${ntex(interest, 8)}` });
  return {
    results: [
      { label: "مستقبل کی قیمت FV", value: money(FV), text: `FV = ${money(FV)}` },
      { label: "کل جمع شدہ رقم", value: money(totalContrib) },
      { label: "کل سود", value: money(interest) },
      { label: "سالانہ مؤثر شرح سود", value: `${fmt(ear * 100, 5)}%` }
    ],
    steps,
    copy: `مستقبل کی قیمت: ${money(FV)}، کل سود: ${money(interest)}، سالانہ مؤثر شرح سود: ${fmt(ear * 100, 5)}%`,
    blocks: [
      { type: "table", caption: "ہر سال کے آخر میں بقایا رقم", head: ["سال", "بقایا رقم", "اب تک کل سود"], rows },
      { type: "plot", title: "وقت کے ساتھ بقایا رقم میں اضافہ", xLabel: "سال", yLabel: "بقایا رقم", includeZero: true, series: [{ name: "بقایا رقم", points, line: true }] }
    ]
  };
}
