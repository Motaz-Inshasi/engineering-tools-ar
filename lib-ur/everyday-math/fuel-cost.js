import { choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "کسی سفر کے فاصلے اور گاڑی کی کھپت سے درکار ایندھن کا حساب لگائیں، چاہے کھپت لیٹر فی 100 کلومیٹر میں ہو یا کلومیٹر فی لیٹر میں، ساتھ آنے جانے کا اختیار، سفر کی لاگت، اور فی مسافر و فی کلومیٹر لاگت۔",
  keywords: ["ایندھن", "گاڑی کی کھپت", "سفر کی لاگت", "لیٹر فی 100 کلومیٹر", "کلومیٹر فی لیٹر", "پیٹرول", "fuel cost"],
  formulas: [
    { label: "ایندھن کی مقدار (لیٹر فی 100 کلومیٹر)", tex: "V = \\frac{D \\times C}{100}" },
    { label: "ایندھن کی مقدار (کلومیٹر فی لیٹر)", tex: "V = \\frac{D}{C}" },
    { label: "کل لاگت اور فی فرد لاگت", tex: "\\text{Cost} = V \\times P,\\qquad \\text{per person} = \\frac{\\text{Cost}}{n}" }
  ],
  inputs: [
    { id: "distance", label: "ایک طرف کا فاصلہ", unit: "کلومیٹر", type: "number", default: "300" },
    { id: "roundTrip", label: "آنا اور جانا", type: "checkbox", default: "" },
    { id: "method", label: "کھپت ناپنے کا طریقہ", type: "select", default: "per100", options: [["per100", "لیٹر فی 100 کلومیٹر"], ["kmpl", "کلومیٹر فی لیٹر"]] },
    { id: "consumption", label: "کھپت کی قدر", type: "number", default: "8", help: "منتخب طریقے کے مطابق: 8 لیٹر فی 100 کلومیٹر، یا 12.5 کلومیٹر فی لیٹر۔" },
    { id: "price", label: "ایندھن کی فی لیٹر قیمت", type: "number", default: "2" },
    { id: "passengers", label: "لاگت بانٹنے والے مسافروں کی تعداد", type: "number", default: "1", help: "اگر آپ لاگت بانٹ رہے ہیں تو ڈرائیور بھی شامل کریں۔" }
  ],
  example: { values: { distance: "300", roundTrip: "", method: "per100", consumption: "8", price: "2", passengers: "1" }, expect: ["24 لیٹر", "48.00"], note: "مثال: 300 کلومیٹر کا سفر، 8 لیٹر فی 100 کلومیٹر کی کھپت اور فی لیٹر قیمت 2۔" },
  invalid: { values: { distance: "300", roundTrip: "", method: "per100", consumption: "8", price: "2", passengers: "0" } },
  related: ["unit-converter", "discount-tax", "speed-distance-time"]
};

export function solve(input) {
  const distance = num(input, "distance", "فاصلہ", { positive: true, max: 100000 });
  const roundTrip = !isBlank(input.roundTrip) && String(input.roundTrip) !== "0";
  const method = choice(input, "method", "کھپت ناپنے کا طریقہ", ["per100", "kmpl"], "per100");
  const consumption = num(input, "consumption", "کھپت", { positive: true, max: 1000 });
  const price = num(input, "price", "فی لیٹر قیمت", { positive: true, max: 1000 });
  const passengers = num(input, "passengers", "مسافروں کی تعداد", { integer: true, min: 1, max: 100, default: 1 });

  const total = roundTrip ? distance * 2 : distance;
  const per100 = method === "per100";
  const liters = per100 ? (total * consumption) / 100 : total / consumption;
  const cost = liters * price;
  const perPerson = cost / passengers;
  const perKm = cost / total;
  const equivalent = per100 ? consumption : (100 / consumption);

  return {
    results: [
      { label: "کل فاصلہ", value: `${fmt(total, 6)} کلومیٹر` },
      { label: "مساوی کھپت", value: `${fmt(equivalent, 4)} لیٹر / 100 کلومیٹر` },
      { label: "درکار ایندھن", value: `${fmt(liters, 4)} لیٹر` },
      { label: "کل لاگت", value: money(cost) },
      { label: "فی فرد لاگت", value: money(perPerson) },
      { label: "فی کلومیٹر لاگت", value: fmt(perKm, 4) }
    ],
    steps: [
      { text: "سفر کا کل فاصلہ:", tex: `D = ${ntex(distance)}${roundTrip ? " \\times 2" : ""} = ${ntex(total)}\\ \\text{km}` },
      per100
        ? { text: "100 کلومیٹر فی کھپت کے فارمولے سے ایندھن کی مقدار:", tex: `V = \\frac{D \\times C}{100} = \\frac{${ntex(total)} \\times ${ntex(consumption)}}{100} = ${ntex(liters, 6)}\\ \\text{L}` }
        : { text: "کلومیٹر فی لیٹر کے فارمولے سے ایندھن کی مقدار:", tex: `V = \\frac{D}{C} = \\frac{${ntex(total)}}{${ntex(consumption)}} = ${ntex(liters, 6)}\\ \\text{L}` },
      { text: "کل لاگت:", tex: `\\text{Cost} = V \\times P = ${ntex(liters, 6)} \\times ${ntex(price)} = ${ntex(cost, 8)}` },
      { text: "فی فرد لاگت:", tex: `\\frac{${ntex(cost, 8)}}{${passengers}} = ${ntex(perPerson, 8)}` }
    ],
    copy: `درکار ایندھن: ${fmt(liters, 4)} لیٹر، کل لاگت: ${money(cost)}، فی فرد لاگت: ${money(perPerson)}، فی کلومیٹر لاگت: ${fmt(perKm, 4)}`
  };
}
