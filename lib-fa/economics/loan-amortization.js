import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "قسط دورهٔ ثابت وام، کل پرداختی و کل بهره را محاسبه کنید، همراه با جدول سالانه که بهرهٔ پرداختی، اصل بدهی بازپرداخت‌شده و مانده را نشان می‌دهد، و نموداری از کاهش مانده.",
  keywords: ["وام", "جدول بازپرداخت", "amortization", "قسط ماهانه", "بهرهٔ وام", "بازپرداخت بدهی", "وام مسکن"],
  formulas: [
    { label: "پرداخت ثابت", tex: "PMT = \\frac{P\\,i}{1-(1+i)^{-N}},\\qquad i=\\frac{r}{m},\\quad N=mt" },
    { label: "مانده پس از پرداخت k", tex: "B_k = B_{k-1}(1+i) - PMT" }
  ],
  inputs: [
    { id: "P", label: "اصل وام P", type: "number", default: "100000" },
    { id: "r", label: "نرخ بهرهٔ سالانه", unit: "%", type: "number", default: "6" },
    { id: "t", label: "مدت وام", unit: "سال", type: "number", default: "30", help: "حاصل ضرب مدت در تعداد پرداخت‌ها در سال باید عدد صحیحی از پرداخت‌ها باشد، تا حداکثر 100 سال." },
    { id: "freq", label: "تعداد پرداخت در سال", type: "select", default: "12", options: [["12", "ماهانه (12)"], ["4", "فصلی (4)"], ["2", "شش‌ماهه (2)"], ["1", "سالانه (1)"]] }
  ],
  example: { values: { P: "100000", r: "6", t: "30", freq: "12" }, expect: ["599.55"], note: "مثال: وام مسکن 100,000 با بهرهٔ 6% برای 30 سال با اقساط ماهانه." },
  invalid: { values: { P: "100000", r: "6", t: "1.01", freq: "12" } },
  related: ["compound-interest", "npv-irr", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const P = num(input, "P", "اصل وام", { positive: true });
  const r = num(input, "r", "نرخ بهره", { nonNegative: true, max: 1000 });
  const t = num(input, "t", "مدت وام", { positive: true, max: 100 });
  const m = Number(choice(input, "freq", "تعداد پرداخت در سال", ["12", "4", "2", "1"], "12"));
  const Nraw = t * m;
  if (Math.abs(Nraw - Math.round(Nraw)) > 1e-9) fail(`تعداد پرداخت‌ها (${fmt(Nraw)}) باید عدد صحیح باشد، پس مدت را بر حسب سال تنظیم کنید.`, "t");
  const N = Math.round(Nraw);
  const i = r / 100 / m;
  const pmt = i === 0 ? P / N : (P * i) / (1 - Math.pow(1 + i, -N));
  const total = pmt * N;
  const interest = total - P;
  const rows = [];
  const points = [[0, P]];
  let bal = P;
  let yInt = 0;
  let yPri = 0;
  for (let k = 1; k <= N; k++) {
    const intr = bal * i;
    const pri = k === N ? bal : pmt - intr;
    bal -= pri;
    yInt += intr;
    yPri += pri;
    if (k % m === 0 || k === N) {
      rows.push([fmt(Math.ceil(k / m)), money(yInt), money(yPri), money(Math.max(0, bal))]);
      points.push([k / m, Math.max(0, bal)]);
      yInt = 0;
      yPri = 0;
    }
  }
  const steps = [
    { text: "نرخ بهره برای هر پرداخت:", tex: `i = \\frac{r}{m} = \\frac{${ntex(r / 100, 6)}}{${m}} = ${ntex(i, 6)}` },
    { text: "تعداد کل پرداخت‌ها:", tex: `N = mt = ${m} \\times ${ntex(t)} = ${N}` },
    i === 0
      ? { text: "بدون بهره، اصل وام بر تعداد پرداخت‌ها تقسیم می‌شود:", tex: `PMT = \\frac{P}{N} = \\frac{${ntex(P)}}{${N}} = ${ntex(pmt, 8)}` }
      : { text: "پرداخت ثابت:", tex: `PMT = \\frac{P\\,i}{1-(1+i)^{-N}} = \\frac{${ntex(P)} \\times ${ntex(i, 6)}}{1-(1+${ntex(i, 6)})^{-${N}}} = ${ntex(pmt, 8)}` },
    { text: "کل پرداختی و کل بهره:", tex: `${ntex(pmt, 8)} \\times ${N} = ${ntex(total, 8)},\\qquad ${ntex(total, 8)} - ${ntex(P)} = ${ntex(interest, 8)}` }
  ];
  return {
    results: [
      { label: "پرداخت دوره‌ای", value: money(pmt), text: `پرداخت ${money(pmt)}` },
      { label: "کل پرداختی", value: money(total) },
      { label: "کل بهره", value: money(interest) },
      { label: "تعداد پرداخت‌ها", value: String(N) }
    ],
    steps,
    copy: `قسط: ${money(pmt)} برای هر دوره، کل پرداختی: ${money(total)}، کل بهره: ${money(interest)}`,
    blocks: [
      { type: "table", caption: "جدول سالانهٔ بازپرداخت", head: ["سال", "بهرهٔ پرداخت‌شده", "اصل بدهی بازپرداخت‌شده", "مانده بدهی"], rows: [...rows, ["جمع", money(interest), money(P), "0.00"]] },
      { type: "note", text: "قسط در کل مدت ثابت است، بنابراین سهم بهره در ابتدا بیشتر است و سهم اصل بدهی با گذشت زمان افزایش می‌یابد. اعداد تا دو رقم اعشار گرد شده‌اند." },
      { type: "plot", title: "مانده بدهی در طول زمان", xLabel: "سال‌ها", yLabel: "مانده", includeZero: true, series: [{ name: "مانده بدهی", points, line: true }] }
    ]
  };
}
