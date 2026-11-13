import { choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "احسب كمية الوقود اللازمة لرحلة من مسافتها واستهلاك السيارة، سواء بالتر لكل 100 كم أو بالكم لكل لتر، مع خيار الذهاب والعودة، وتكلفة الرحلة وتكلفتها على كل راكب وعلى الكيلومتر.",
  keywords: ["وقود", "استهلاك السيارة", "تكلفة الرحلة", "لتر لكل 100 كم", "كم لكل لتر", "بنزين", "fuel cost"],
  formulas: [
    { label: "كمية الوقود (لتر لكل 100 كم)", tex: "V = \\frac{D \\times C}{100}" },
    { label: "كمية الوقود (كم لكل لتر)", tex: "V = \\frac{D}{C}" },
    { label: "التكلفة الإجمالية وتكلفة الفرد", tex: "\\text{Cost} = V \\times P,\\qquad \\text{per person} = \\frac{\\text{Cost}}{n}" }
  ],
  inputs: [
    { id: "distance", label: "المسافة للطرف الواحد", unit: "كم", type: "number", default: "300" },
    { id: "roundTrip", label: "ذهاب وعودة", type: "checkbox", default: "" },
    { id: "method", label: "طريقة قياس الاستهلاك", type: "select", default: "per100", options: [["per100", "لتر لكل 100 كم"], ["kmpl", "كم لكل لتر"]] },
    { id: "consumption", label: "قيمة الاستهلاك", type: "number", default: "8", help: "حسب الطريقة المختارة: 8 لتر لكل 100 كم، أو 12.5 كم لكل لتر." },
    { id: "price", label: "سعر لتر الوقود", type: "number", default: "2" },
    { id: "passengers", label: "عدد الركاب لتقسيم التكلفة", type: "number", default: "1", help: "يشمل السائق إن كنتم تتقاسمون التكلفة." }
  ],
  example: { values: { distance: "300", roundTrip: "", method: "per100", consumption: "8", price: "2", passengers: "1" }, expect: ["24 لتر", "48.00"], note: "مثال: رحلة 300 كم باستهلاك 8 لتر لكل 100 كم وسعر اللتر 2." },
  invalid: { values: { distance: "300", roundTrip: "", method: "per100", consumption: "8", price: "2", passengers: "0" } },
  related: ["unit-converter", "discount-tax", "speed-distance-time"]
};

export function solve(input) {
  const distance = num(input, "distance", "المسافة", { positive: true, max: 100000 });
  const roundTrip = !isBlank(input.roundTrip) && String(input.roundTrip) !== "0";
  const method = choice(input, "method", "طريقة قياس الاستهلاك", ["per100", "kmpl"], "per100");
  const consumption = num(input, "consumption", "الاستهلاك", { positive: true, max: 1000 });
  const price = num(input, "price", "سعر اللتر", { positive: true, max: 1000 });
  const passengers = num(input, "passengers", "عدد الركاب", { integer: true, min: 1, max: 100, default: 1 });

  const total = roundTrip ? distance * 2 : distance;
  const per100 = method === "per100";
  const liters = per100 ? (total * consumption) / 100 : total / consumption;
  const cost = liters * price;
  const perPerson = cost / passengers;
  const perKm = cost / total;
  const equivalent = per100 ? consumption : (100 / consumption);

  return {
    results: [
      { label: "المسافة الإجمالية", value: `${fmt(total, 6)} كم` },
      { label: "الاستهلاك المكافئ", value: `${fmt(equivalent, 4)} لتر / 100 كم` },
      { label: "الوقود المطلوب", value: `${fmt(liters, 4)} لتر` },
      { label: "التكلفة الإجمالية", value: money(cost) },
      { label: "تكلفة الفرد", value: money(perPerson) },
      { label: "تكلفة الكيلومتر", value: fmt(perKm, 4) }
    ],
    steps: [
      { text: "المسافة الإجمالية للرحلة:", tex: `D = ${ntex(distance)}${roundTrip ? " \\times 2" : ""} = ${ntex(total)}\\ \\text{km}` },
      per100
        ? { text: "كمية الوقود بقانون الاستهلاك لكل 100 كم:", tex: `V = \\frac{D \\times C}{100} = \\frac{${ntex(total)} \\times ${ntex(consumption)}}{100} = ${ntex(liters, 6)}\\ \\text{L}` }
        : { text: "كمية الوقود بقانون الكيلومترات لكل لتر:", tex: `V = \\frac{D}{C} = \\frac{${ntex(total)}}{${ntex(consumption)}} = ${ntex(liters, 6)}\\ \\text{L}` },
      { text: "التكلفة الإجمالية:", tex: `\\text{Cost} = V \\times P = ${ntex(liters, 6)} \\times ${ntex(price)} = ${ntex(cost, 8)}` },
      { text: "تكلفة الفرد:", tex: `\\frac{${ntex(cost, 8)}}{${passengers}} = ${ntex(perPerson, 8)}` }
    ],
    copy: `الوقود المطلوب: ${fmt(liters, 4)} لتر، التكلفة الإجمالية: ${money(cost)}، تكلفة الفرد: ${money(perPerson)}، تكلفة الكيلومتر: ${fmt(perKm, 4)}`
  };
}
