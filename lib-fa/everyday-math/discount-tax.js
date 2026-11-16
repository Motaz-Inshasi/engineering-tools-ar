import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const discount = (input) => {
  const price = num(input, "price", "قیمت", { positive: true });
  const d1 = num(input, "discount1", "تخفیف اول", { min: 0, max: 100 });
  const d2 = num(input, "discount2", "تخفیف اضافی", { min: 0, max: 100, optional: true });
  const second = d2 === null ? 0 : d2;
  const afterFirst = price * (1 - d1 / 100);
  const finalPrice = afterFirst * (1 - second / 100);
  const saved = price - finalPrice;
  const effective = (saved / price) * 100;
  const steps = [{ text: "قیمت پس از تخفیف اول:", tex: `P_1 = ${ntex(price)} \\times \\left(1 - ${ntex(d1 / 100, 6)}\\right) = ${ntex(afterFirst, 8)}` }];
  if (second > 0) steps.push({ text: "تخفیف اضافی روی قیمت پس از تخفیف اول اعمال می‌شود، بنابراین تخفیف‌ها متوالی هستند و با هم جمع نمی‌شوند:", tex: `P_2 = ${ntex(afterFirst, 8)} \\times \\left(1 - ${ntex(second / 100, 6)}\\right) = ${ntex(finalPrice, 8)}` });
  steps.push({ text: "مبلغ صرفه‌جویی و درصد تخفیف واقعی:", tex: `S = ${ntex(price)} - ${ntex(finalPrice, 8)} = ${ntex(saved, 8)},\\qquad \\frac{S}{P} = ${ntex(effective / 100, 6)}` });
  return {
    results: [
      { label: "قیمت نهایی", value: money(finalPrice) },
      { label: "مبلغ صرفه‌جویی", value: money(saved) },
      { label: "کل تخفیف واقعی", value: `${fmt(effective, 6)}%` }
    ],
    steps,
    copy: `قیمت نهایی: ${money(finalPrice)}، مبلغ صرفه‌جویی: ${money(saved)}، کل تخفیف واقعی: ${fmt(effective, 6)}%`
  };
};

const vat = (input) => {
  const price = num(input, "vatPrice", "مبلغ", { positive: true });
  const rate = num(input, "vatRate", "نرخ مالیات", { min: 0, max: 100, default: 15 });
  const dir = choice(input, "vatDir", "جهت محاسبه", ["add", "remove"], "add");
  const r = rate / 100;
  const net = dir === "add" ? price : price / (1 + r);
  const total = dir === "add" ? price + price * r : price;
  const tax = total - net;
  const steps = dir === "add"
    ? [{ text: "مالیات بر مبلغ قبل از مالیات محاسبه و به آن افزوده می‌شود:", tex: `T = ${ntex(price)} \\times ${ntex(r, 6)} = ${ntex(tax, 8)},\\qquad \\text{total} = ${ntex(price)} + ${ntex(tax, 8)} = ${ntex(total, 8)}` }]
    : [{ text: "مبلغ شامل مالیات است، پس مبلغ قبل از مالیات را استخراج می‌کنیم:", tex: `\\text{net} = \\frac{${ntex(price)}}{1 + ${ntex(r, 6)}} = ${ntex(net, 8)},\\qquad T = ${ntex(price)} - ${ntex(net, 8)} = ${ntex(tax, 8)}` }];
  return {
    results: [
      { label: "مبلغ قبل از مالیات", value: money(net) },
      { label: "مبلغ مالیات", value: money(tax) },
      { label: "مبلغ شامل مالیات", value: money(total) }
    ],
    steps,
    copy: `قبل از مالیات: ${money(net)}، مبلغ مالیات: ${money(tax)}، شامل مالیات: ${money(total)}`
  };
};

const split = (input) => {
  const bill = num(input, "bill", "مبلغ کل صورت‌حساب", { positive: true });
  const tip = num(input, "tip", "نرخ انعام", { min: 0, max: 100, default: 0 });
  const people = num(input, "people", "تعداد نفرات", { integer: true, min: 1, max: 1000 });
  const total = bill * (1 + tip / 100);
  const share = Math.ceil(Math.round((total / people) * 1e6) / 1e4) / 100;
  const collected = Math.round(share * people * 100) / 100;
  const surplus = Math.round((collected - total) * 100) / 100;
  return {
    results: [
      { label: "مبلغ کل صورت‌حساب با انعام", value: money(total) },
      { label: "سهم هر نفر", value: money(share) },
      { label: "مجموع پرداختی پس از گرد کردن", value: money(collected) },
      { label: "اختلاف گرد کردن", value: money(surplus) }
    ],
    steps: [
      { text: "مبلغ کل صورت‌حساب با انعام یا خدمات:", tex: `T = ${ntex(bill)} \\times \\left(1 + ${ntex(tip / 100, 6)}\\right) = ${ntex(total, 8)}` },
      { text: "سهم هر نفر پیش از گرد کردن:", tex: `\\frac{${ntex(total, 8)}}{${people}} = ${ntex(total / people, 8)}` },
      { text: "سهم هر نفر را به نزدیک‌ترین سنت به بالا گرد می‌کنیم:", tex: `\\lceil ${ntex(total / people, 8)} \\rceil_{0.01} = ${ntex(share)}` }
    ],
    copy: `مبلغ کل با انعام: ${money(total)}، سهم هر نفر: ${money(share)}، اختلاف گرد کردن: ${money(surplus)}`,
    blocks: [
      { type: "note", text: "گرد کردن به بالا باعث می‌شود مجموع از صورت‌حساب بیشتر شود، با اختلافی که از یک سنت برای هر نفر فراتر نمی‌رود؛ این اختلاف انعام محسوب می‌شود یا به رستوران واگذار می‌شود." }
    ]
  };
};

export const meta = {
  description: "قیمت پس از یک یا دو تخفیف متوالی و مبلغ صرفه‌جویی را محاسبه کنید، یا مالیات افزوده را محاسبه کنید و آن را از قیمت شامل مالیات استخراج کنید، یا صورت‌حساب همراه با انعام را میان چند نفر تقسیم کنید.",
  keywords: ["تخفیف", "مالیات", "VAT", "مالیات بر ارزش افزوده", "تقسیم صورت‌حساب", "انعام", "کاهش قیمت", "discount"],
  formulas: [
    { label: "قیمت پس از دو تخفیف متوالی", tex: "P_{final} = P\\left(1-\\frac{d_1}{100}\\right)\\left(1-\\frac{d_2}{100}\\right)" },
    { label: "مالیات افزوده", tex: "T = P \\times \\frac{r}{100},\\qquad \\text{total} = P + T" },
    { label: "استخراج مالیات از قیمت شامل مالیات", tex: "\\text{net} = \\frac{P}{1 + r/100}" },
    { label: "سهم هر نفر", tex: "\\text{share} = \\left\\lceil \\frac{T}{n} \\right\\rceil_{0.01}" }
  ],
  inputs: [
    { id: "mode", label: "نوع محاسبه", type: "select", default: "discount", options: [["discount", "تخفیف"], ["vat", "مالیات بر ارزش افزوده"], ["split", "تقسیم صورت‌حساب"]] },
    { id: "price", label: "قیمت پیش از تخفیف", type: "number", default: "200", when: { mode: ["discount"] } },
    { id: "discount1", label: "تخفیف اول", unit: "%", type: "number", default: "20", when: { mode: ["discount"] } },
    { id: "discount2", label: "تخفیف اضافی (اختیاری)", unit: "%", type: "number", when: { mode: ["discount"] }, help: "روی قیمت پس از تخفیف اول اعمال می‌شود." },
    { id: "vatPrice", label: "مبلغ", type: "number", default: "100", when: { mode: ["vat"] } },
    { id: "vatRate", label: "نرخ مالیات", unit: "%", type: "number", default: "15", when: { mode: ["vat"] } },
    { id: "vatDir", label: "جهت محاسبه", type: "select", default: "add", options: [["add", "مبلغ قبل از مالیات، مالیات را اضافه کن"], ["remove", "مبلغ شامل مالیات، مالیات را استخراج کن"]], when: { mode: ["vat"] } },
    { id: "bill", label: "مبلغ کل صورت‌حساب", type: "number", default: "300", when: { mode: ["split"] } },
    { id: "tip", label: "نرخ انعام یا خدمات", unit: "%", type: "number", default: "10", when: { mode: ["split"] } },
    { id: "people", label: "تعداد نفرات", type: "number", default: "3", when: { mode: ["split"] } }
  ],
  example: { values: { mode: "discount", price: "200", discount1: "20", discount2: "10", vatPrice: "100", vatRate: "15", vatDir: "add", bill: "300", tip: "10", people: "3" }, expect: ["144.00", "56.00"], note: "مثال: قیمت 200 با تخفیف 20% و سپس تخفیف اضافی 10%." },
  invalid: { values: { mode: "split", price: "200", discount1: "20", discount2: "", vatPrice: "100", vatRate: "15", vatDir: "add", bill: "300", tip: "10", people: "0" } },
  related: ["percentage", "unit-converter"]
};

export function solve(input) {
  const mode = choice(input, "mode", "نوع محاسبه", ["discount", "vat", "split"], "discount");
  if (mode === "vat") return vat(input);
  if (mode === "split") return split(input);
  return discount(input);
}
