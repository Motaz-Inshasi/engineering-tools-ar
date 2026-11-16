import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isInt = (x) => Math.abs(x - Math.round(x)) < 1e-9;

const FREQ = [["1", "سالانه (1)"], ["2", "شش‌ماهه (2)"], ["4", "فصلی (4)"], ["12", "ماهانه (12)"], ["365", "روزانه (365)"], ["continuous", "پیوسته"]];

export const meta = {
  description: "ارزش آینده مبلغی را با بهرهٔ ساده، مرکب یا پیوسته محاسبه کنید، همراه با پرداخت‌های دورهٔ اختیاری، کل بهره، نرخ بهرهٔ مؤثر سالانه، جدول ماندهٔ سالانه و نمودار.",
  keywords: ["بهره مرکب", "بهره ساده", "compound interest", "ارزش آینده", "FV", "سرمایه‌گذاری", "بهره پیوسته"],
  formulas: [
    { label: "بهره ساده", tex: "FV = P(1 + rt)" },
    { label: "بهره مرکب با پرداخت‌های دوره‌ای", tex: "FV = P\\left(1+\\frac{r}{n}\\right)^{nt} + PMT\\cdot\\frac{\\left(1+\\frac{r}{n}\\right)^{nt}-1}{r/n}" },
    { label: "بهره پیوسته", tex: "FV = Pe^{rt}" }
  ],
  inputs: [
    { id: "P", label: "اصل پول P", type: "number", default: "1000" },
    { id: "r", label: "نرخ بهرهٔ سالانه", unit: "%", type: "number", default: "5" },
    { id: "t", label: "مدت", unit: "سال", type: "number", default: "10", help: "می‌تواند کسری باشد، تا حداکثر 100 سال." },
    { id: "mode", label: "نوع بهره", type: "select", default: "compound", options: [["simple", "ساده"], ["compound", "مرکب"]] },
    { id: "freq", label: "تعداد دفعات سررسید در سال", type: "select", default: "12", options: FREQ, when: { mode: ["compound"] } },
    { id: "pmt", label: "پرداخت دوره‌ای PMT", type: "number", default: "0", when: { mode: ["compound"] }, help: "در پایان هر دورهٔ سررسید افزوده می‌شود. با بهرهٔ پیوسته در دسترس نیست؛ با مدت کسری، تعداد دوره‌ها باید عدد صحیح باشد." }
  ],
  example: { values: { P: "1000", r: "5", t: "10", mode: "compound", freq: "12", pmt: "0" }, expect: ["1,647.01"], note: "مثال: 1000 با نرخ 5% برای 10 سال با سررسید ماهانه." },
  invalid: { values: { P: "1000", r: "5", t: "10", mode: "compound", freq: "continuous", pmt: "100" } },
  related: ["loan-amortization", "npv-irr", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const P = num(input, "P", "اصل پول", { nonNegative: true });
  const r = num(input, "r", "نرخ بهره", { nonNegative: true, max: 1000 });
  const t = num(input, "t", "مدت", { positive: true, max: 100 });
  const mode = choice(input, "mode", "نوع بهره", ["simple", "compound"], "compound");
  const freq = choice(input, "freq", "تعداد دفعات سررسید", ["1", "2", "4", "12", "365", "continuous"], "12");
  const pmt = num(input, "pmt", "پرداخت دوره‌ای", { nonNegative: true, default: 0 });
  const rate = r / 100;
  const simple = mode === "simple";
  const continuous = !simple && freq === "continuous";
  const n = simple || continuous ? 1 : Number(freq);
  const contributing = !simple && !continuous && pmt > 0;
  if (continuous && pmt > 0) fail("پرداخت دوره‌ای با بهرهٔ پیوسته پشتیبانی نمی‌شود. پرداخت را صفر قرار دهید یا تعداد مشخصی از دفعات سررسید را انتخاب کنید.", "pmt");
  const N = n * t;
  if (contributing && !isInt(N)) fail(`تعداد دوره‌ها n × t = ${fmt(N)} هنگام وجود پرداخت دوره‌ای باید عدد صحیح باشد.`, "t");
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
    steps.push({ text: "بهرهٔ ساده فقط روی اصل پول محاسبه می‌شود:", tex: `FV = P(1 + rt) = ${ntex(P)} \\times (1 + ${ntex(rate, 6)} \\times ${ntex(t)}) = ${ntex(FV, 8)}` });
  } else if (continuous) {
    steps.push({ text: "سررسید پیوسته:", tex: `FV = Pe^{rt} = ${ntex(P)} \\times e^{${ntex(rate, 6)} \\times ${ntex(t)}} = ${ntex(FV, 8)}` });
  } else {
    const contribTex = !contributing ? "" : i === 0 ? ` + ${ntex(pmt)} \\times ${ntex(N)}` : ` + ${ntex(pmt)} \\times \\frac{(1+${ntex(i, 6)})^{${ntex(N)}}-1}{${ntex(i, 6)}}`;
    steps.push({ text: "نرخ بهره در هر دوره و تعداد دوره‌ها:", tex: `i = \\frac{r}{n} = \\frac{${ntex(rate, 6)}}{${n}} = ${ntex(i, 6)},\\qquad N = nt = ${n} \\times ${ntex(t)} = ${ntex(N)}` });
    steps.push({ text: "ارزش آینده:", tex: `FV = P(1+i)^N${contributing ? " + PMT\\frac{(1+i)^N-1}{i}" : ""} = ${ntex(P)} \\times (1+${ntex(i, 6)})^{${ntex(N)}}${contribTex} = ${ntex(FV, 8)}` });
  }
  steps.push({ text: "کل بهره = ارزش آینده − کل مبلغ واریزشده:", tex: `${ntex(FV, 8)} - ${ntex(totalContrib, 8)} = ${ntex(interest, 8)}` });
  return {
    results: [
      { label: "ارزش آینده FV", value: money(FV), text: `FV = ${money(FV)}` },
      { label: "کل واریزی", value: money(totalContrib) },
      { label: "کل بهره", value: money(interest) },
      { label: "نرخ بهرهٔ مؤثر سالانه", value: `${fmt(ear * 100, 5)}%` }
    ],
    steps,
    copy: `ارزش آینده: ${money(FV)}، کل بهره: ${money(interest)}، نرخ بهرهٔ مؤثر سالانه: ${fmt(ear * 100, 5)}%`,
    blocks: [
      { type: "table", caption: "مانده در پایان هر سال", head: ["سال", "مانده", "کل بهره تا کنون"], rows },
      { type: "plot", title: "رشد مانده در طول زمان", xLabel: "سال‌ها", yLabel: "مانده", includeZero: true, series: [{ name: "مانده", points, line: true }] }
    ]
  };
}
