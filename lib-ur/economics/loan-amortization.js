import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "قرض کی مقررہ دورانیہ وار قسط، کل ادائیگی اور کل سود کا حساب لگائیں، ساتھ ایک سالانہ جدول جس میں ادا شدہ سود، ادا شدہ اصل رقم اور بقایا رقم دکھائی جائے، اور بقایا رقم میں کمی کا گراف بنائیں۔",
  keywords: ["قرض", "ادائیگی کا جدول", "amortization", "ماہانہ قسط", "قرض پر سود", "قرض کی ادائیگی", "رہن قرض"],
  formulas: [
    { label: "مقررہ قسط", tex: "PMT = \\frac{P\\,i}{1-(1+i)^{-N}},\\qquad i=\\frac{r}{m},\\quad N=mt" },
    { label: "قسط k کے بعد بقایا رقم", tex: "B_k = B_{k-1}(1+i) - PMT" }
  ],
  inputs: [
    { id: "P", label: "قرض کی اصل رقم P", type: "number", default: "100000" },
    { id: "r", label: "سالانہ شرح سود", unit: "%", type: "number", default: "6" },
    { id: "t", label: "قرض کی مدت", unit: "سال", type: "number", default: "30", help: "مدت × سال میں اقساط کی تعداد سے اقساط کی صحیح تعداد حاصل ہونی چاہیے، زیادہ سے زیادہ 100 سال۔" },
    { id: "freq", label: "سال میں اقساط کی تعداد", type: "select", default: "12", options: [["12", "ماہانہ (12)"], ["4", "سہ ماہی (4)"], ["2", "ششماہی (2)"], ["1", "سالانہ (1)"]] }
  ],
  example: { values: { P: "100000", r: "6", t: "30", freq: "12" }, expect: ["599.55"], note: "مثال: 6% شرح پر 30 سال کے لیے 100,000 کا رہن قرض، ماہانہ اقساط کے ساتھ۔" },
  invalid: { values: { P: "100000", r: "6", t: "1.01", freq: "12" } },
  related: ["compound-interest", "npv-irr", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const P = num(input, "P", "قرض کی اصل رقم", { positive: true });
  const r = num(input, "r", "شرح سود", { nonNegative: true, max: 1000 });
  const t = num(input, "t", "قرض کی مدت", { positive: true, max: 100 });
  const m = Number(choice(input, "freq", "سال میں اقساط کی تعداد", ["12", "4", "2", "1"], "12"));
  const Nraw = t * m;
  if (Math.abs(Nraw - Math.round(Nraw)) > 1e-9) fail(`اقساط کی تعداد (${fmt(Nraw)}) صحیح عدد ہونی چاہیے، لہٰذا مدت سالوں میں درست کریں۔`, "t");
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
    { text: "فی قسط شرح سود:", tex: `i = \\frac{r}{m} = \\frac{${ntex(r / 100, 6)}}{${m}} = ${ntex(i, 6)}` },
    { text: "اقساط کی کل تعداد:", tex: `N = mt = ${m} \\times ${ntex(t)} = ${N}` },
    i === 0
      ? { text: "سود کے بغیر قرض کی اصل رقم کو اقساط کی تعداد پر تقسیم کیا جاتا ہے:", tex: `PMT = \\frac{P}{N} = \\frac{${ntex(P)}}{${N}} = ${ntex(pmt, 8)}` }
      : { text: "مقررہ قسط:", tex: `PMT = \\frac{P\\,i}{1-(1+i)^{-N}} = \\frac{${ntex(P)} \\times ${ntex(i, 6)}}{1-(1+${ntex(i, 6)})^{-${N}}} = ${ntex(pmt, 8)}` },
    { text: "کل ادائیگی اور کل سود:", tex: `${ntex(pmt, 8)} \\times ${N} = ${ntex(total, 8)},\\qquad ${ntex(total, 8)} - ${ntex(P)} = ${ntex(interest, 8)}` }
  ];
  return {
    results: [
      { label: "دورانیہ وار قسط", value: money(pmt), text: `قسط ${money(pmt)}` },
      { label: "کل ادائیگی", value: money(total) },
      { label: "کل سود", value: money(interest) },
      { label: "اقساط کی تعداد", value: String(N) }
    ],
    steps,
    copy: `قسط: ہر دورانیے کے لیے ${money(pmt)}، کل ادائیگی: ${money(total)}، کل سود: ${money(interest)}`,
    blocks: [
      { type: "table", caption: "سالانہ ادائیگی کا جدول", head: ["سال", "ادا شدہ سود", "ادا شدہ اصل رقم", "بقایا رقم"], rows: [...rows, ["کل", money(interest), money(P), "0.00"]] },
      { type: "note", text: "قسط پوری مدت کے لیے مقررہ رہتی ہے، اس لیے ابتدا میں سود کا حصہ زیادہ ہوتا ہے اور وقت کے ساتھ اصل رقم کا حصہ بڑھتا ہے۔ اعداد دو اعشاری مقامات تک گول کیے گئے ہیں۔" },
      { type: "plot", title: "وقت کے ساتھ بقایا رقم", xLabel: "سال", yLabel: "بقایا رقم", includeZero: true, series: [{ name: "بقایا رقم", points, line: true }] }
    ]
  };
}
