import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "سیدھی لکیر، گھٹتا توازن یا سالوں کے ہندسوں کے مجموعے کے طریقے سے اثاثے کی سالانہ فرسودگی کا حساب لگائیں، ساتھ ایک جدول جس میں فرسودگی، جمع شدہ فرسودگی اور دفتری قیمت دکھائی جائے، اور ردی قیمت سے نیچے نہ جائیں۔",
  keywords: ["فرسودگی", "فرسودگی", "depreciation", "سیدھی لکیر", "گھٹتا توازن", "سالوں کے ہندسوں کا مجموعہ", "دفتری قیمت", "ردی قیمت"],
  formulas: [
    { label: "سیدھی لکیر", tex: "D = \\frac{C-S}{n}" },
    { label: "سالوں کے ہندسوں کا مجموعہ", tex: "D_y = \\frac{n-y+1}{n(n+1)/2}\\,(C-S)" },
    { label: "گھٹتا توازن", tex: "D_y = \\max\\left(B_{y-1}\\frac{k}{n},\\ \\frac{B_{y-1}-S}{n-y+1}\\right)" }
  ],
  inputs: [
    { id: "cost", label: "اثاثے کی لاگت C", type: "number", default: "10000" },
    { id: "salvage", label: "ردی قیمت S", type: "number", default: "1000" },
    { id: "life", label: "کارآمد عمر n", unit: "سال", type: "number", default: "5", help: "1 سے 100 تک صحیح عدد۔" },
    { id: "method", label: "فرسودگی کا طریقہ", type: "select", default: "sl", options: [["sl", "سیدھی لکیر"], ["db", "گھٹتا توازن"], ["syd", "سالوں کے ہندسوں کا مجموعہ"]] },
    { id: "factor", label: "گھٹتے توازن کا عنصر k", type: "select", default: "2", options: [["2", "دوگنا (2)"], ["1.5", "1.5"]], when: { method: ["db"] } }
  ],
  example: { values: { cost: "10000", salvage: "1000", life: "5", method: "sl", factor: "2" }, expect: ["1,800.00"], note: "مثال: 10,000 لاگت، 1,000 ردی قیمت اور 5 سال کی کارآمد عمر والا اثاثہ سیدھی لکیر کے طریقے سے۔" },
  invalid: { values: { cost: "1000", salvage: "2000", life: "5", method: "sl", factor: "2" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const cost = num(input, "cost", "اثاثے کی لاگت", { positive: true });
  const salvage = num(input, "salvage", "ردی قیمت", { nonNegative: true });
  const n = num(input, "life", "کارآمد عمر", { integer: true, min: 1, max: 100 });
  const method = choice(input, "method", "فرسودگی کا طریقہ", ["sl", "db", "syd"], "sl");
  const factor = Number(choice(input, "factor", "گھٹتے توازن کا عنصر", ["2", "1.5"], "2"));
  if (salvage > cost) fail("ردی قیمت اثاثے کی لاگت سے زیادہ نہیں ہو سکتی۔", "salvage");
  const base = cost - salvage;
  const sumYears = (n * (n + 1)) / 2;
  let bv = cost;
  let acc = 0;
  let switchYear = null;
  const schedule = [];
  for (let y = 1; y <= n; y++) {
    let d;
    let kind = "";
    if (method === "sl") d = base / n;
    else if (method === "syd") d = (base * (n - y + 1)) / sumYears;
    else {
      const dbAmt = (bv * factor) / n;
      const slAmt = (bv - salvage) / (n - y + 1);
      const useSl = slAmt > dbAmt;
      if (useSl && switchYear === null) switchYear = y;
      d = Math.min(Math.max(dbAmt, slAmt), bv - salvage);
      kind = useSl ? "سیدھی لکیر" : "گھٹتا توازن";
    }
    bv = Math.max(bv - d, salvage);
    acc += d;
    schedule.push({ y, d, acc, bv, kind });
  }
  const withKind = method === "db";
  const rows = schedule.map((s) => (withKind ? [fmt(s.y), money(s.d), money(s.acc), money(s.bv), s.kind] : [fmt(s.y), money(s.d), money(s.acc), money(s.bv)]));
  const head = ["سال", "فرسودگی", "جمع شدہ", "دفتری قیمت"];
  if (withKind) head.push("طریقہ");
  const first = schedule[0].d;
  const last = schedule[n - 1].bv;
  const results = [
    { label: "پہلے سال کی فرسودگی", value: money(first) },
    { label: "کل فرسودگی", value: money(base) },
    { label: "کارآمد عمر کے اختتام پر دفتری قیمت", value: money(last) }
  ];
  if (method === "sl") results.unshift({ label: "سالانہ سیدھی لکیر فرسودگی", value: money(base / n) });
  const steps = [];
  if (method === "sl") {
    steps.push({ text: "سیدھی لکیر:", tex: `D = \\frac{C-S}{n} = \\frac{${ntex(cost)} - ${ntex(salvage)}}{${n}} = ${ntex(base / n, 8)}` });
  } else if (method === "syd") {
    steps.push({ text: "سالوں کے ہندسوں کا مجموعہ:", tex: `\\sum = \\frac{n(n+1)}{2} = \\frac{${n}(${n}+1)}{2} = ${ntex(sumYears)}` });
    steps.push({ text: "پہلے سال کی فرسودگی:", tex: `D_1 = \\frac{n}{\\sum}(C-S) = \\frac{${n}}{${ntex(sumYears)}} \\times ${ntex(base)} = ${ntex(first, 8)}` });
  } else {
    steps.push({ text: "گھٹتے توازن کی شرح:", tex: `\\text{rate} = \\frac{k}{n} = \\frac{${factor}}{${n}} = ${ntex(factor / n, 6)}` });
    steps.push({ text: "پہلے سال کی فرسودگی:", tex: `D_1 = C \\times \\text{rate} = ${ntex(cost)} \\times ${ntex(factor / n, 6)} = ${ntex(first, 8)}` });
    steps.push("ہر سال ہم باقی قدر پر گھٹتے توازن اور سیدھی لکیر کی فرسودگی میں سے بڑی رقم لیتے ہیں، اور ردی قیمت سے نیچے نہیں جاتے۔");
  }
  const copy = method === "sl"
    ? `سالانہ سیدھی لکیر فرسودگی: ${money(base / n)}، کارآمد عمر کے اختتام پر دفتری قیمت: ${money(last)}`
    : `پہلے سال کی فرسودگی: ${money(first)}، کارآمد عمر کے اختتام پر دفتری قیمت: ${money(last)}`;
  const blocks = [{ type: "table", caption: "سالانہ فرسودگی کا جدول", head, rows }];
  if (method === "db") {
    blocks.push(switchYear === null
      ? { type: "note", text: "حساب کو سیدھی لکیر پر منتقل ہونے کی ضرورت نہیں پڑی، اور دفتری قیمت ردی قیمت سے نیچے نہیں گئی۔" }
      : { type: "note", text: `حساب ${switchYear} سال سے سیدھی لکیر پر منتقل ہو جاتا ہے، کیونکہ باقی قدر پر سیدھی لکیر کی فرسودگی زیادہ ہے؛ اس طرح کارآمد عمر کے اختتام پر دفتری قیمت ردی قیمت تک پہنچ جاتی ہے اور اس سے نیچے نہیں جاتی۔` });
  }
  return { results, steps, copy, blocks };
}
