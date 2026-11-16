import { choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "مقدار سوخت لازم برای یک سفر را از مسافت و مصرف خودرو محاسبه کنید، چه مصرف به لیتر در هر 100 کیلومتر باشد چه کیلومتر در هر لیتر، با گزینهٔ رفت‌وبرگشت، و هزینهٔ سفر، سهم هر سرنشین و هزینه به ازای هر کیلومتر را بیابید.",
  keywords: ["سوخت", "مصرف خودرو", "هزینهٔ سفر", "لیتر در هر 100 کیلومتر", "کیلومتر در لیتر", "بنزین", "fuel cost"],
  formulas: [
    { label: "مقدار سوخت (لیتر در هر 100 کیلومتر)", tex: "V = \\frac{D \\times C}{100}" },
    { label: "مقدار سوخت (کیلومتر در لیتر)", tex: "V = \\frac{D}{C}" },
    { label: "هزینهٔ کل و هزینهٔ هر نفر", tex: "\\text{Cost} = V \\times P,\\qquad \\text{per person} = \\frac{\\text{Cost}}{n}" }
  ],
  inputs: [
    { id: "distance", label: "مسافت یک طرف", unit: "کیلومتر", type: "number", default: "300" },
    { id: "roundTrip", label: "رفت و برگشت", type: "checkbox", default: "" },
    { id: "method", label: "روش اندازه‌گیری مصرف", type: "select", default: "per100", options: [["per100", "لیتر در هر 100 کیلومتر"], ["kmpl", "کیلومتر در لیتر"]] },
    { id: "consumption", label: "مقدار مصرف", type: "number", default: "8", help: "بسته به روش انتخاب‌شده: 8 لیتر در هر 100 کیلومتر، یا 12.5 کیلومتر در هر لیتر." },
    { id: "price", label: "قیمت هر لیتر سوخت", type: "number", default: "2" },
    { id: "passengers", label: "تعداد سرنشینان برای تقسیم هزینه", type: "number", default: "1", help: "اگر هزینه را بین خود تقسیم می‌کنید، راننده را هم حساب کنید." }
  ],
  example: { values: { distance: "300", roundTrip: "", method: "per100", consumption: "8", price: "2", passengers: "1" }, expect: ["24 لیتر", "48.00"], note: "مثال: سفر 300 کیلومتری با مصرف 8 لیتر در هر 100 کیلومتر و قیمت هر لیتر 2." },
  invalid: { values: { distance: "300", roundTrip: "", method: "per100", consumption: "8", price: "2", passengers: "0" } },
  related: ["unit-converter", "discount-tax", "speed-distance-time"]
};

export function solve(input) {
  const distance = num(input, "distance", "مسافت", { positive: true, max: 100000 });
  const roundTrip = !isBlank(input.roundTrip) && String(input.roundTrip) !== "0";
  const method = choice(input, "method", "روش اندازه‌گیری مصرف", ["per100", "kmpl"], "per100");
  const consumption = num(input, "consumption", "مصرف", { positive: true, max: 1000 });
  const price = num(input, "price", "قیمت لیتر", { positive: true, max: 1000 });
  const passengers = num(input, "passengers", "تعداد سرنشینان", { integer: true, min: 1, max: 100, default: 1 });

  const total = roundTrip ? distance * 2 : distance;
  const per100 = method === "per100";
  const liters = per100 ? (total * consumption) / 100 : total / consumption;
  const cost = liters * price;
  const perPerson = cost / passengers;
  const perKm = cost / total;
  const equivalent = per100 ? consumption : (100 / consumption);

  return {
    results: [
      { label: "کل مسافت", value: `${fmt(total, 6)} کیلومتر` },
      { label: "مصرف معادل", value: `${fmt(equivalent, 4)} لیتر / 100 کیلومتر` },
      { label: "سوخت موردنیاز", value: `${fmt(liters, 4)} لیتر` },
      { label: "هزینهٔ کل", value: money(cost) },
      { label: "هزینهٔ هر نفر", value: money(perPerson) },
      { label: "هزینهٔ هر کیلومتر", value: fmt(perKm, 4) }
    ],
    steps: [
      { text: "کل مسافت سفر:", tex: `D = ${ntex(distance)}${roundTrip ? " \\times 2" : ""} = ${ntex(total)}\\ \\text{km}` },
      per100
        ? { text: "مقدار سوخت با فرمول مصرف در هر 100 کیلومتر:", tex: `V = \\frac{D \\times C}{100} = \\frac{${ntex(total)} \\times ${ntex(consumption)}}{100} = ${ntex(liters, 6)}\\ \\text{L}` }
        : { text: "مقدار سوخت با فرمول کیلومتر در لیتر:", tex: `V = \\frac{D}{C} = \\frac{${ntex(total)}}{${ntex(consumption)}} = ${ntex(liters, 6)}\\ \\text{L}` },
      { text: "هزینهٔ کل:", tex: `\\text{Cost} = V \\times P = ${ntex(liters, 6)} \\times ${ntex(price)} = ${ntex(cost, 8)}` },
      { text: "هزینهٔ هر نفر:", tex: `\\frac{${ntex(cost, 8)}}{${passengers}} = ${ntex(perPerson, 8)}` }
    ],
    copy: `سوخت موردنیاز: ${fmt(liters, 4)} لیتر، هزینهٔ کل: ${money(cost)}، هزینهٔ هر نفر: ${money(perPerson)}، هزینهٔ هر کیلومتر: ${fmt(perKm, 4)}`
  };
}
