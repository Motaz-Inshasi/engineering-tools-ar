import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const discount = (input) => {
  const price = num(input, "price", "قیمت", { positive: true });
  const d1 = num(input, "discount1", "پہلی رعایت", { min: 0, max: 100 });
  const d2 = num(input, "discount2", "اضافی رعایت", { min: 0, max: 100, optional: true });
  const second = d2 === null ? 0 : d2;
  const afterFirst = price * (1 - d1 / 100);
  const finalPrice = afterFirst * (1 - second / 100);
  const saved = price - finalPrice;
  const effective = (saved / price) * 100;
  const steps = [{ text: "پہلی رعایت کے بعد قیمت:", tex: `P_1 = ${ntex(price)} \\times \\left(1 - ${ntex(d1 / 100, 6)}\\right) = ${ntex(afterFirst, 8)}` }];
  if (second > 0) steps.push({ text: "اضافی رعایت پہلی رعایت کے بعد کی قیمت پر لگائی جاتی ہے، اس لیے رعایتیں یکے بعد دیگرے ہوتی ہیں اور انہیں جمع نہیں کیا جاتا:", tex: `P_2 = ${ntex(afterFirst, 8)} \\times \\left(1 - ${ntex(second / 100, 6)}\\right) = ${ntex(finalPrice, 8)}` });
  steps.push({ text: "بچت کی رقم اور مؤثر رعایت کی شرح:", tex: `S = ${ntex(price)} - ${ntex(finalPrice, 8)} = ${ntex(saved, 8)},\\qquad \\frac{S}{P} = ${ntex(effective / 100, 6)}` });
  return {
    results: [
      { label: "حتمی قیمت", value: money(finalPrice) },
      { label: "بچت کی رقم", value: money(saved) },
      { label: "کل مؤثر رعایت", value: `${fmt(effective, 6)}%` }
    ],
    steps,
    copy: `حتمی قیمت: ${money(finalPrice)}، بچت کی رقم: ${money(saved)}، کل مؤثر رعایت: ${fmt(effective, 6)}%`
  };
};

const vat = (input) => {
  const price = num(input, "vatPrice", "رقم", { positive: true });
  const rate = num(input, "vatRate", "ٹیکس کی شرح", { min: 0, max: 100, default: 15 });
  const dir = choice(input, "vatDir", "حساب کی سمت", ["add", "remove"], "add");
  const r = rate / 100;
  const net = dir === "add" ? price : price / (1 + r);
  const total = dir === "add" ? price + price * r : price;
  const tax = total - net;
  const steps = dir === "add"
    ? [{ text: "ٹیکس ٹیکس سے پہلے کی قیمت پر حساب کر کے اس میں شامل کیا جاتا ہے:", tex: `T = ${ntex(price)} \\times ${ntex(r, 6)} = ${ntex(tax, 8)},\\qquad \\text{total} = ${ntex(price)} + ${ntex(tax, 8)} = ${ntex(total, 8)}` }]
    : [{ text: "قیمت میں ٹیکس شامل ہے، اس لیے ہم ٹیکس سے پہلے کی قیمت نکالتے ہیں:", tex: `\\text{net} = \\frac{${ntex(price)}}{1 + ${ntex(r, 6)}} = ${ntex(net, 8)},\\qquad T = ${ntex(price)} - ${ntex(net, 8)} = ${ntex(tax, 8)}` }];
  return {
    results: [
      { label: "ٹیکس سے پہلے کی رقم", value: money(net) },
      { label: "ٹیکس کی رقم", value: money(tax) },
      { label: "ٹیکس سمیت رقم", value: money(total) }
    ],
    steps,
    copy: `ٹیکس سے پہلے: ${money(net)}، ٹیکس کی رقم: ${money(tax)}، ٹیکس سمیت: ${money(total)}`
  };
};

const split = (input) => {
  const bill = num(input, "bill", "بل کی کل رقم", { positive: true });
  const tip = num(input, "tip", "انعام کی شرح", { min: 0, max: 100, default: 0 });
  const people = num(input, "people", "افراد کی تعداد", { integer: true, min: 1, max: 1000 });
  const total = bill * (1 + tip / 100);
  const share = Math.ceil(Math.round((total / people) * 1e6) / 1e4) / 100;
  const collected = Math.round(share * people * 100) / 100;
  const surplus = Math.round((collected - total) * 100) / 100;
  return {
    results: [
      { label: "انعام سمیت بل کی کل رقم", value: money(total) },
      { label: "ہر فرد کا حصہ", value: money(share) },
      { label: "گول کرنے کے بعد کل ادا شدہ رقم", value: money(collected) },
      { label: "گول کرنے کا فرق", value: money(surplus) }
    ],
    steps: [
      { text: "انعام یا سروس چارج سمیت بل کی کل رقم:", tex: `T = ${ntex(bill)} \\times \\left(1 + ${ntex(tip / 100, 6)}\\right) = ${ntex(total, 8)}` },
      { text: "گول کرنے سے پہلے ہر فرد کا حصہ:", tex: `\\frac{${ntex(total, 8)}}{${people}} = ${ntex(total / people, 8)}` },
      { text: "ہر فرد کا حصہ قریب ترین سینٹ تک اوپر گول کریں:", tex: `\\lceil ${ntex(total / people, 8)} \\rceil_{0.01} = ${ntex(share)}` }
    ],
    copy: `انعام سمیت بل کی کل رقم: ${money(total)}، ہر فرد کا حصہ: ${money(share)}، گول کرنے کا فرق: ${money(surplus)}`,
    blocks: [
      { type: "note", text: "اوپر گول کرنے سے کل رقم بل سے فی فرد ایک سینٹ سے زیادہ نہیں ہوتی؛ یہ فرق انعام شمار ہوتا ہے یا ریستوراں کے پاس رہتا ہے۔" }
    ]
  };
};

export const meta = {
  description: "ایک یا دو یکے بعد دیگرے رعایتوں کے بعد قیمت اور بچت کی رقم حساب کریں، یا شامل کیا گیا ویلیو ایڈڈ ٹیکس اور قیمت سے نکالا گیا ٹیکس، یا انعام سمیت بل کو افراد کی تعداد میں تقسیم کریں۔",
  keywords: ["رعایت", "ٹیکس", "VAT", "ویلیو ایڈڈ ٹیکس", "بل کی تقسیم", "انعام", "کمی", "discount"],
  formulas: [
    { label: "یکے بعد دیگرے دو رعایتوں کے بعد قیمت", tex: "P_{final} = P\\left(1-\\frac{d_1}{100}\\right)\\left(1-\\frac{d_2}{100}\\right)" },
    { label: "ویلیو ایڈڈ ٹیکس", tex: "T = P \\times \\frac{r}{100},\\qquad \\text{total} = P + T" },
    { label: "ٹیکس سمیت قیمت سے ٹیکس نکالنا", tex: "\\text{net} = \\frac{P}{1 + r/100}" },
    { label: "ہر فرد کا حصہ", tex: "\\text{share} = \\left\\lceil \\frac{T}{n} \\right\\rceil_{0.01}" }
  ],
  inputs: [
    { id: "mode", label: "حساب کی قسم", type: "select", default: "discount", options: [["discount", "رعایت"], ["vat", "ویلیو ایڈڈ ٹیکس"], ["split", "بل کی تقسیم"]] },
    { id: "price", label: "رعایت سے پہلے قیمت", type: "number", default: "200", when: { mode: ["discount"] } },
    { id: "discount1", label: "پہلی رعایت", unit: "%", type: "number", default: "20", when: { mode: ["discount"] } },
    { id: "discount2", label: "اضافی رعایت (اختیاری)", unit: "%", type: "number", when: { mode: ["discount"] }, help: "پہلی رعایت کے بعد کی قیمت پر لاگو ہوتی ہے۔" },
    { id: "vatPrice", label: "رقم", type: "number", default: "100", when: { mode: ["vat"] } },
    { id: "vatRate", label: "ٹیکس کی شرح", unit: "%", type: "number", default: "15", when: { mode: ["vat"] } },
    { id: "vatDir", label: "حساب کی سمت", type: "select", default: "add", options: [["add", "ٹیکس سے پہلے کی رقم، ٹیکس شامل کریں"], ["remove", "ٹیکس سمیت رقم، ٹیکس نکالیں"]], when: { mode: ["vat"] } },
    { id: "bill", label: "بل کی کل رقم", type: "number", default: "300", when: { mode: ["split"] } },
    { id: "tip", label: "انعام یا سروس چارج کی شرح", unit: "%", type: "number", default: "10", when: { mode: ["split"] } },
    { id: "people", label: "افراد کی تعداد", type: "number", default: "3", when: { mode: ["split"] } }
  ],
  example: { values: { mode: "discount", price: "200", discount1: "20", discount2: "10", vatPrice: "100", vatRate: "15", vatDir: "add", bill: "300", tip: "10", people: "3" }, expect: ["144.00", "56.00"], note: "مثال: 200 کی قیمت پر 20% رعایت، پھر 10% اضافی رعایت۔" },
  invalid: { values: { mode: "split", price: "200", discount1: "20", discount2: "", vatPrice: "100", vatRate: "15", vatDir: "add", bill: "300", tip: "10", people: "0" } },
  related: ["percentage", "unit-converter"]
};

export function solve(input) {
  const mode = choice(input, "mode", "حساب کی قسم", ["discount", "vat", "split"], "discount");
  if (mode === "vat") return vat(input);
  if (mode === "split") return split(input);
  return discount(input);
}
