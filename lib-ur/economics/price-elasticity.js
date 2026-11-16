import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "دو قیمتوں اور دو مقداروں سے طلب کی قیمتی لچک کا عنصر درمیانی نقطے یا سادہ فیصد کے طریقے سے حساب کریں، لچک کی درجہ بندی کریں، اور دکھائیں کہ قیمت کی تبدیلی کُل آمدنی پر کیسے اثر انداز ہوتی ہے۔",
  keywords: ["قیمتی لچک", "price elasticity", "طلب کی لچک", "کل آمدنی", "لچکدار", "غیر لچکدار", "elasticity"],
  formulas: [
    { label: "لچک کا عنصر", tex: "E = \\frac{\\%\\Delta Q}{\\%\\Delta P}" },
    { label: "درمیانی نقطہ", tex: "\\%\\Delta Q = \\frac{Q_2-Q_1}{(Q_1+Q_2)/2},\\qquad \\%\\Delta P = \\frac{P_2-P_1}{(P_1+P_2)/2}" }
  ],
  inputs: [
    { id: "P1", label: "پہلی قیمت P1", type: "number", default: "10" },
    { id: "Q1", label: "پہلی مقدار Q1", type: "number", default: "100" },
    { id: "P2", label: "دوسری قیمت P2", type: "number", default: "12" },
    { id: "Q2", label: "دوسری مقدار Q2", type: "number", default: "80" },
    { id: "method", label: "حساب کا طریقہ", type: "select", default: "mid", options: [["mid", "درمیانی نقطہ (آرک)"], ["simple", "سادہ فیصد"]], help: "درمیانی نقطے کا طریقہ تبدیلی کی سمت سے قطع نظر ایک ہی نتیجہ دیتا ہے۔" }
  ],
  example: { values: { P1: "10", Q1: "100", P2: "12", Q2: "80", method: "mid" }, expect: ["-1.222", "لچکدار"], note: "مثال: قیمت 10 سے بڑھا کر 12 کرنے سے مقدار 100 سے کم ہو کر 80 رہ گئی۔" },
  invalid: { values: { P1: "10", Q1: "100", P2: "10", Q2: "80", method: "mid" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "depreciation", "financial-ratios"]
};

export function solve(input) {
  const P1 = num(input, "P1", "پہلی قیمت", { positive: true });
  const Q1 = num(input, "Q1", "پہلی مقدار", { nonNegative: true });
  const P2 = num(input, "P2", "دوسری قیمت", { positive: true });
  const Q2 = num(input, "Q2", "دوسری مقدار", { nonNegative: true });
  const method = choice(input, "method", "حساب کا طریقہ", ["mid", "simple"], "mid");
  if (P1 === P2) fail("قیمت تبدیل نہیں ہوئی، اس لیے لچک کا حساب نہیں لگایا جا سکتا کیونکہ تقسیم صفر سے ہوگی۔", "P2");
  if (method === "simple" && Q1 === 0) fail("پہلی مقدار صفر ہے، اور سادہ فیصد پہلی مقدار پر حساب کیا جاتا ہے۔", "Q1");
  if (method === "mid" && Q1 + Q2 === 0) fail("دونوں مقداریں صفر ہیں، اس لیے مقدار میں درمیانی نقطے کے مطابق فیصد تبدیلی کا حساب نہیں لگایا جا سکتا۔", "Q2");
  const mid = method === "mid";
  const dP = P2 - P1;
  const dQ = Q2 - Q1;
  const baseP = mid ? (P1 + P2) / 2 : P1;
  const baseQ = mid ? (Q1 + Q2) / 2 : Q1;
  const pctP = dP / baseP;
  const pctQ = dQ / baseQ;
  const E = pctQ / pctP;
  const a = Math.abs(E);
  let cls;
  if (a < 1e-12) cls = "مکمل غیر لچکدار";
  else if (Math.abs(a - 1) < 1e-9) cls = "اکائی لچک";
  else if (a > 1) cls = "لچکدار";
  else cls = "غیر لچکدار";
  const R1 = P1 * Q1;
  const R2 = P2 * Q2;
  const dR = R2 - R1;
  const effect = Math.abs(dR) < 1e-9
    ? "کل آمدنی تبدیل نہیں ہوتی"
    : dR > 0 ? `کل آمدنی ${money(dR)} بڑھ گئی` : `کل آمدنی ${money(-dR)} کم ہو گئی`;
  let note;
  if (a < 1e-12) note = "مقدار قیمت کے ساتھ تبدیل نہیں ہوتی، اس لیے آمدنی اتنے ہی فیصد تبدیل ہوتی ہے جتنی قیمت تبدیل ہوئی۔";
  else if (Math.abs(a - 1) < 1e-9) note = "لچک ایک کے برابر ہے، اس لیے قیمت تبدیل ہونے پر کل آمدنی تقریباً مستقل رہتی ہے۔";
  else if (a > 1) note = "طلب لچکدار ہے: مقدار میں فیصد تبدیلی قیمت میں فیصد تبدیلی سے زیادہ ہے، اس لیے قیمت کم کرنے پر آمدنی بڑھتی ہے اور بڑھانے پر کم ہوتی ہے۔";
  else note = "طلب غیر لچکدار ہے: مقدار میں فیصد تبدیلی قیمت میں فیصد تبدیلی سے کم ہے، اس لیے قیمت بڑھانے پر آمدنی بڑھتی ہے اور کم کرنے پر کم ہوتی ہے۔";
  const steps = [
    {
      text: mid ? "مقدار میں فیصد تبدیلی (درمیانی نقطہ):" : "مقدار میں فیصد تبدیلی:",
      tex: mid
        ? `\\%\\Delta Q = \\frac{Q_2-Q_1}{(Q_1+Q_2)/2} = \\frac{${ntex(dQ)}}{${ntex(baseQ)}} = ${ntex(pctQ, 6)}`
        : `\\%\\Delta Q = \\frac{Q_2-Q_1}{Q_1} = \\frac{${ntex(dQ)}}{${ntex(Q1)}} = ${ntex(pctQ, 6)}`
    },
    {
      text: mid ? "قیمت میں فیصد تبدیلی (درمیانی نقطہ):" : "قیمت میں فیصد تبدیلی:",
      tex: mid
        ? `\\%\\Delta P = \\frac{P_2-P_1}{(P_1+P_2)/2} = \\frac{${ntex(dP)}}{${ntex(baseP)}} = ${ntex(pctP, 6)}`
        : `\\%\\Delta P = \\frac{P_2-P_1}{P_1} = \\frac{${ntex(dP)}}{${ntex(P1)}} = ${ntex(pctP, 6)}`
    },
    { text: "لچک کا عنصر:", tex: `E = \\frac{\\%\\Delta Q}{\\%\\Delta P} = \\frac{${ntex(pctQ, 6)}}{${ntex(pctP, 6)}} = ${ntex(E, 6)}` },
    { text: "تبدیلی سے پہلے اور بعد کی کل آمدنی:", tex: `R_1 = P_1Q_1 = ${ntex(R1)},\\qquad R_2 = P_2Q_2 = ${ntex(R2)}` }
  ];
  return {
    results: [
      { label: "مقدار میں فیصد تبدیلی", value: `${fmt(pctQ * 100, 4)}%` },
      { label: "قیمت میں فیصد تبدیلی", value: `${fmt(pctP * 100, 4)}%` },
      { label: "لچک کا عنصر E", value: fmt(E, 4), text: `E = ${fmt(E, 4)}` },
      { label: "لچک کی درجہ بندی", value: cls },
      { label: "تبدیلی سے پہلے کل آمدنی", value: money(R1) },
      { label: "تبدیلی کے بعد کل آمدنی", value: money(R2) },
      { label: "آمدنی پر تبدیلی کا اثر", value: effect }
    ],
    steps,
    copy: `E = ${fmt(E, 4)} (${cls})، آمدنی ${money(R1)} سے ${money(R2)} تک، ${effect}`,
    blocks: [
      { type: "table", caption: "تبدیلی سے پہلے اور بعد کا موازنہ", head: ["شے", "پہلے", "بعد میں"], rows: [["قیمت", fmt(P1, 6), fmt(P2, 6)], ["مقدار", fmt(Q1, 6), fmt(Q2, 6)], ["کل آمدنی", money(R1), money(R2)]] },
      { type: "note", text: note }
    ]
  };
}
