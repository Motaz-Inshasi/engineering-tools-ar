import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const discount = (input) => {
  const price = num(input, "price", "السعر", { positive: true });
  const d1 = num(input, "discount1", "الخصم الأول", { min: 0, max: 100 });
  const d2 = num(input, "discount2", "الخصم الإضافي", { min: 0, max: 100, optional: true });
  const second = d2 === null ? 0 : d2;
  const afterFirst = price * (1 - d1 / 100);
  const finalPrice = afterFirst * (1 - second / 100);
  const saved = price - finalPrice;
  const effective = (saved / price) * 100;
  const steps = [{ text: "السعر بعد الخصم الأول:", tex: `P_1 = ${ntex(price)} \\times \\left(1 - ${ntex(d1 / 100, 6)}\\right) = ${ntex(afterFirst, 8)}` }];
  if (second > 0) steps.push({ text: "الخصم الإضافي يُطبّق على السعر بعد الخصم الأول، فالخصومات متتالية ولا تُجمع:", tex: `P_2 = ${ntex(afterFirst, 8)} \\times \\left(1 - ${ntex(second / 100, 6)}\\right) = ${ntex(finalPrice, 8)}` });
  steps.push({ text: "المبلغ الموفر ونسبة الخصم الفعلية:", tex: `S = ${ntex(price)} - ${ntex(finalPrice, 8)} = ${ntex(saved, 8)},\\qquad \\frac{S}{P} = ${ntex(effective / 100, 6)}` });
  return {
    results: [
      { label: "السعر النهائي", value: money(finalPrice) },
      { label: "المبلغ الموفر", value: money(saved) },
      { label: "إجمالي الخصم الفعلي", value: `${fmt(effective, 6)}%` }
    ],
    steps,
    copy: `السعر النهائي: ${money(finalPrice)}، المبلغ الموفر: ${money(saved)}، إجمالي الخصم الفعلي: ${fmt(effective, 6)}%`
  };
};

const vat = (input) => {
  const price = num(input, "vatPrice", "المبلغ", { positive: true });
  const rate = num(input, "vatRate", "نسبة الضريبة", { min: 0, max: 100, default: 15 });
  const dir = choice(input, "vatDir", "اتجاه الحساب", ["add", "remove"], "add");
  const r = rate / 100;
  const net = dir === "add" ? price : price / (1 + r);
  const total = dir === "add" ? price + price * r : price;
  const tax = total - net;
  const steps = dir === "add"
    ? [{ text: "الضريبة تُحسب على السعر قبل الضريبة وتُضاف إليه:", tex: `T = ${ntex(price)} \\times ${ntex(r, 6)} = ${ntex(tax, 8)},\\qquad \\text{total} = ${ntex(price)} + ${ntex(tax, 8)} = ${ntex(total, 8)}` }]
    : [{ text: "السعر شامل الضريبة، فنستخرج السعر قبلها:", tex: `\\text{net} = \\frac{${ntex(price)}}{1 + ${ntex(r, 6)}} = ${ntex(net, 8)},\\qquad T = ${ntex(price)} - ${ntex(net, 8)} = ${ntex(tax, 8)}` }];
  return {
    results: [
      { label: "المبلغ قبل الضريبة", value: money(net) },
      { label: "قيمة الضريبة", value: money(tax) },
      { label: "المبلغ شامل الضريبة", value: money(total) }
    ],
    steps,
    copy: `قبل الضريبة: ${money(net)}، قيمة الضريبة: ${money(tax)}، شامل الضريبة: ${money(total)}`
  };
};

const split = (input) => {
  const bill = num(input, "bill", "إجمالي الفاتورة", { positive: true });
  const tip = num(input, "tip", "نسبة الإكرامية", { min: 0, max: 100, default: 0 });
  const people = num(input, "people", "عدد الأشخاص", { integer: true, min: 1, max: 1000 });
  const total = bill * (1 + tip / 100);
  const share = Math.ceil(Math.round((total / people) * 1e6) / 1e4) / 100;
  const collected = Math.round(share * people * 100) / 100;
  const surplus = Math.round((collected - total) * 100) / 100;
  return {
    results: [
      { label: "إجمالي الفاتورة مع الإكرامية", value: money(total) },
      { label: "نصيب كل شخص", value: money(share) },
      { label: "المجموع المدفوع بعد التقريب", value: money(collected) },
      { label: "فرق التقريب", value: money(surplus) }
    ],
    steps: [
      { text: "إجمالي الفاتورة مع الإكرامية أو الخدمة:", tex: `T = ${ntex(bill)} \\times \\left(1 + ${ntex(tip / 100, 6)}\\right) = ${ntex(total, 8)}` },
      { text: "نصيب الفرد قبل التقريب:", tex: `\\frac{${ntex(total, 8)}}{${people}} = ${ntex(total / people, 8)}` },
      { text: "نقرب نصيب الفرد للأعلى إلى أقرب سنت:", tex: `\\lceil ${ntex(total / people, 8)} \\rceil_{0.01} = ${ntex(share)}` }
    ],
    copy: `إجمالي الفاتورة مع الإكرامية: ${money(total)}، نصيب كل شخص: ${money(share)}، فرق التقريب: ${money(surplus)}`,
    blocks: [
      { type: "note", text: "التقريب للأعلى يجعل المجموع أكبر من الفاتورة بفرق لا يتجاوز سنتاً لكل شخص؛ هذا الفرق يُعدّ بقشيشاً أو يُترك للمطعم." }
    ]
  };
};

export const meta = {
  description: "احسب السعر بعد الخصم أو الخصمين المتتاليين والمبلغ الموفر، أو الضريبة المضافة وإخراجها من سعر شامل الضريبة، أو قسّم فاتورة مع الإكرامية على عدد من الأشخاص.",
  keywords: ["خصم", "ضريبة", "VAT", "القيمة المضافة", "تقسيم الفاتورة", "إكرامية", "تخفيض", "discount"],
  formulas: [
    { label: "السعر بعد خصمين متتاليين", tex: "P_{final} = P\\left(1-\\frac{d_1}{100}\\right)\\left(1-\\frac{d_2}{100}\\right)" },
    { label: "الضريبة المضافة", tex: "T = P \\times \\frac{r}{100},\\qquad \\text{total} = P + T" },
    { label: "استخراج الضريبة من السعر الشامل", tex: "\\text{net} = \\frac{P}{1 + r/100}" },
    { label: "نصيب الفرد", tex: "\\text{share} = \\left\\lceil \\frac{T}{n} \\right\\rceil_{0.01}" }
  ],
  inputs: [
    { id: "mode", label: "نوع الحساب", type: "select", default: "discount", options: [["discount", "الخصم"], ["vat", "ضريبة القيمة المضافة"], ["split", "تقسيم الفاتورة"]] },
    { id: "price", label: "السعر قبل الخصم", type: "number", default: "200", when: { mode: ["discount"] } },
    { id: "discount1", label: "الخصم الأول", unit: "%", type: "number", default: "20", when: { mode: ["discount"] } },
    { id: "discount2", label: "خصم إضافي (اختياري)", unit: "%", type: "number", when: { mode: ["discount"] }, help: "يُطبّق على السعر بعد الخصم الأول." },
    { id: "vatPrice", label: "المبلغ", type: "number", default: "100", when: { mode: ["vat"] } },
    { id: "vatRate", label: "نسبة الضريبة", unit: "%", type: "number", default: "15", when: { mode: ["vat"] } },
    { id: "vatDir", label: "اتجاه الحساب", type: "select", default: "add", options: [["add", "المبلغ قبل الضريبة، أضفها"], ["remove", "المبلغ شامل الضريبة، استخرجها"]], when: { mode: ["vat"] } },
    { id: "bill", label: "إجمالي الفاتورة", type: "number", default: "300", when: { mode: ["split"] } },
    { id: "tip", label: "نسبة الإكرامية أو الخدمة", unit: "%", type: "number", default: "10", when: { mode: ["split"] } },
    { id: "people", label: "عدد الأشخاص", type: "number", default: "3", when: { mode: ["split"] } }
  ],
  example: { values: { mode: "discount", price: "200", discount1: "20", discount2: "10", vatPrice: "100", vatRate: "15", vatDir: "add", bill: "300", tip: "10", people: "3" }, expect: ["144.00", "56.00"], note: "مثال: سعر 200 مع خصم 20% ثم خصم إضافي 10%." },
  invalid: { values: { mode: "split", price: "200", discount1: "20", discount2: "", vatPrice: "100", vatRate: "15", vatDir: "add", bill: "300", tip: "10", people: "0" } },
  related: ["percentage", "unit-converter"]
};

export function solve(input) {
  const mode = choice(input, "mode", "نوع الحساب", ["discount", "vat", "split"], "discount");
  if (mode === "vat") return vat(input);
  if (mode === "split") return split(input);
  return discount(input);
}
