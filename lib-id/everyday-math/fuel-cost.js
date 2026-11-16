import { choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Hitung jumlah bahan bakar yang diperlukan untuk perjalanan dari jaraknya dan konsumsi mobil, baik dalam liter per 100 km maupun km per liter, dengan opsi pulang-pergi, serta biaya perjalanan dan biayanya per penumpang dan per kilometer.",
  keywords: ["bahan bakar", "konsumsi mobil", "biaya perjalanan", "liter per 100 km", "km per liter", "bensin", "fuel cost"],
  formulas: [
    { label: "Jumlah bahan bakar (liter per 100 km)", tex: "V = \\frac{D \\times C}{100}" },
    { label: "Jumlah bahan bakar (km per liter)", tex: "V = \\frac{D}{C}" },
    { label: "Biaya total dan biaya per orang", tex: "\\text{Cost} = V \\times P,\\qquad \\text{per person} = \\frac{\\text{Cost}}{n}" }
  ],
  inputs: [
    { id: "distance", label: "Jarak satu arah", unit: "km", type: "number", default: "300" },
    { id: "roundTrip", label: "Pulang-pergi", type: "checkbox", default: "" },
    { id: "method", label: "Cara mengukur konsumsi", type: "select", default: "per100", options: [["per100", "liter per 100 km"], ["kmpl", "km per liter"]] },
    { id: "consumption", label: "Nilai konsumsi", type: "number", default: "8", help: "Sesuai metode yang dipilih: 8 liter per 100 km, atau 12.5 km per liter." },
    { id: "price", label: "Harga per liter bahan bakar", type: "number", default: "2" },
    { id: "passengers", label: "Jumlah penumpang untuk pembagian biaya", type: "number", default: "1", help: "Termasuk pengemudi jika biaya dibagi bersama." }
  ],
  example: { values: { distance: "300", roundTrip: "", method: "per100", consumption: "8", price: "2", passengers: "1" }, expect: ["24 liter", "48.00"], note: "Contoh: perjalanan 300 km dengan konsumsi 8 liter per 100 km dan harga per liter 2." },
  invalid: { values: { distance: "300", roundTrip: "", method: "per100", consumption: "8", price: "2", passengers: "0" } },
  related: ["unit-converter", "discount-tax", "speed-distance-time"]
};

export function solve(input) {
  const distance = num(input, "distance", "Jarak", { positive: true, max: 100000 });
  const roundTrip = !isBlank(input.roundTrip) && String(input.roundTrip) !== "0";
  const method = choice(input, "method", "Cara mengukur konsumsi", ["per100", "kmpl"], "per100");
  const consumption = num(input, "consumption", "Konsumsi", { positive: true, max: 1000 });
  const price = num(input, "price", "Harga per liter", { positive: true, max: 1000 });
  const passengers = num(input, "passengers", "Jumlah penumpang", { integer: true, min: 1, max: 100, default: 1 });

  const total = roundTrip ? distance * 2 : distance;
  const per100 = method === "per100";
  const liters = per100 ? (total * consumption) / 100 : total / consumption;
  const cost = liters * price;
  const perPerson = cost / passengers;
  const perKm = cost / total;
  const equivalent = per100 ? consumption : (100 / consumption);

  return {
    results: [
      { label: "Total jarak", value: `${fmt(total, 6)} km` },
      { label: "Konsumsi ekivalen", value: `${fmt(equivalent, 4)} liter / 100 km` },
      { label: "Bahan bakar yang dibutuhkan", value: `${fmt(liters, 4)} liter` },
      { label: "Biaya total", value: money(cost) },
      { label: "Biaya per orang", value: money(perPerson) },
      { label: "Biaya per kilometer", value: fmt(perKm, 4) }
    ],
    steps: [
      { text: "Total jarak perjalanan:", tex: `D = ${ntex(distance)}${roundTrip ? " \\times 2" : ""} = ${ntex(total)}\\ \\text{km}` },
      per100
        ? { text: "Jumlah bahan bakar dengan rumus konsumsi per 100 km:", tex: `V = \\frac{D \\times C}{100} = \\frac{${ntex(total)} \\times ${ntex(consumption)}}{100} = ${ntex(liters, 6)}\\ \\text{L}` }
        : { text: "Jumlah bahan bakar dengan rumus kilometer per liter:", tex: `V = \\frac{D}{C} = \\frac{${ntex(total)}}{${ntex(consumption)}} = ${ntex(liters, 6)}\\ \\text{L}` },
      { text: "Biaya total:", tex: `\\text{Cost} = V \\times P = ${ntex(liters, 6)} \\times ${ntex(price)} = ${ntex(cost, 8)}` },
      { text: "Biaya per orang:", tex: `\\frac{${ntex(cost, 8)}}{${passengers}} = ${ntex(perPerson, 8)}` }
    ],
    copy: `Bahan bakar yang dibutuhkan: ${fmt(liters, 4)} liter, biaya total: ${money(cost)}, biaya per orang: ${money(perPerson)}, biaya per kilometer: ${fmt(perKm, 4)}`
  };
}
