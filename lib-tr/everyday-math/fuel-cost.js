import { choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Bir yolculuk için mesafeye ve araç tüketimine göre gereken yakıt miktarını hesaplayın; 100 km başına litre veya litre başına km cinsinden. Gidiş-dönüş seçeneği, yolculuğun maliyeti ile kişi başı ve kilometre başı maliyeti de dahildir.",
  keywords: ["Yakıt", "Araç tüketimi", "Yolculuk maliyeti", "100 km başına litre", "Litre başına km", "Benzin", "fuel cost"],
  formulas: [
    { label: "Yakıt miktarı (100 km başına litre)", tex: "V = \\frac{D \\times C}{100}" },
    { label: "Yakıt miktarı (litre başına km)", tex: "V = \\frac{D}{C}" },
    { label: "Toplam maliyet ve kişi başı maliyet", tex: "\\text{Cost} = V \\times P,\\qquad \\text{per person} = \\frac{\\text{Cost}}{n}" }
  ],
  inputs: [
    { id: "distance", label: "Tek yön mesafe", unit: "km", type: "number", default: "300" },
    { id: "roundTrip", label: "Gidiş-dönüş", type: "checkbox", default: "" },
    { id: "method", label: "Tüketim ölçüm yöntemi", type: "select", default: "per100", options: [["per100", "100 km başına litre"], ["kmpl", "Litre başına km"]] },
    { id: "consumption", label: "Tüketim değeri", type: "number", default: "8", help: "Seçilen yönteme göre: 100 km'de 8 litre veya litre başına 12,5 km." },
    { id: "price", label: "Litre yakıt fiyatı", type: "number", default: "2" },
    { id: "passengers", label: "Maliyeti bölüşmek için yolcu sayısı", type: "number", default: "1", help: "Maliyeti paylaşıyorsanız sürücü dahil edilir." }
  ],
  example: { values: { distance: "300", roundTrip: "", method: "per100", consumption: "8", price: "2", passengers: "1" }, expect: ["24 litre", "48.00"], note: "Örnek: 300 km yolculuk, 100 km'de 8 litre tüketim ve litre fiyatı 2." },
  invalid: { values: { distance: "300", roundTrip: "", method: "per100", consumption: "8", price: "2", passengers: "0" } },
  related: ["unit-converter", "discount-tax", "speed-distance-time"]
};

export function solve(input) {
  const distance = num(input, "distance", "Mesafe", { positive: true, max: 100000 });
  const roundTrip = !isBlank(input.roundTrip) && String(input.roundTrip) !== "0";
  const method = choice(input, "method", "Tüketim ölçüm yöntemi", ["per100", "kmpl"], "per100");
  const consumption = num(input, "consumption", "Tüketim", { positive: true, max: 1000 });
  const price = num(input, "price", "Litre fiyatı", { positive: true, max: 1000 });
  const passengers = num(input, "passengers", "Yolcu sayısı", { integer: true, min: 1, max: 100, default: 1 });

  const total = roundTrip ? distance * 2 : distance;
  const per100 = method === "per100";
  const liters = per100 ? (total * consumption) / 100 : total / consumption;
  const cost = liters * price;
  const perPerson = cost / passengers;
  const perKm = cost / total;
  const equivalent = per100 ? consumption : (100 / consumption);

  return {
    results: [
      { label: "Toplam mesafe", value: `${fmt(total, 6)} km` },
      { label: "Eşdeğer tüketim", value: `${fmt(equivalent, 4)} litre / 100 km` },
      { label: "Gerekli yakıt", value: `${fmt(liters, 4)} litre` },
      { label: "Toplam maliyet", value: money(cost) },
      { label: "Kişi başı maliyet", value: money(perPerson) },
      { label: "Kilometre başı maliyet", value: fmt(perKm, 4) }
    ],
    steps: [
      { text: "Yolculuğun toplam mesafesi:", tex: `D = ${ntex(distance)}${roundTrip ? " \\times 2" : ""} = ${ntex(total)}\\ \\text{km}` },
      per100
        ? { text: "100 km başına tüketim formülüyle yakıt miktarı:", tex: `V = \\frac{D \\times C}{100} = \\frac{${ntex(total)} \\times ${ntex(consumption)}}{100} = ${ntex(liters, 6)}\\ \\text{L}` }
        : { text: "Litre başına km formülüyle yakıt miktarı:", tex: `V = \\frac{D}{C} = \\frac{${ntex(total)}}{${ntex(consumption)}} = ${ntex(liters, 6)}\\ \\text{L}` },
      { text: "Toplam maliyet:", tex: `\\text{Cost} = V \\times P = ${ntex(liters, 6)} \\times ${ntex(price)} = ${ntex(cost, 8)}` },
      { text: "Kişi başı maliyet:", tex: `\\frac{${ntex(cost, 8)}}{${passengers}} = ${ntex(perPerson, 8)}` }
    ],
    copy: `Gerekli yakıt: ${fmt(liters, 4)} litre, toplam maliyet: ${money(cost)}, kişi başı maliyet: ${money(perPerson)}, kilometre başı maliyet: ${fmt(perKm, 4)}`
  };
}
