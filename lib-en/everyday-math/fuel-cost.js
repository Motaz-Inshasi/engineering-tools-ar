import { choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Calculate the fuel needed for a trip from its distance and the car's consumption, either in liters per 100 km or in km per liter, with the option of a round trip, and the trip cost and its cost per passenger and per kilometer.",
  keywords: ["fuel", "Car consumption", "Trip cost", "liters per 100 km", "km per liter", "gasoline", "fuel cost"],
  formulas: [
    { label: "Fuel quantity (liters per 100 km)", tex: "V = \\frac{D \\times C}{100}" },
    { label: "Fuel quantity (km per liter)", tex: "V = \\frac{D}{C}" },
    { label: "Total cost and cost per person", tex: "\\text{Cost} = V \\times P,\\qquad \\text{per person} = \\frac{\\text{Cost}}{n}" }
  ],
  inputs: [
    { id: "distance", label: "Distance one way", unit: "km", type: "number", default: "300" },
    { id: "roundTrip", label: "Round trip", type: "checkbox", default: "" },
    { id: "method", label: "Consumption measurement method", type: "select", default: "per100", options: [["per100", "liters per 100 km"], ["kmpl", "km per liter"]] },
    { id: "consumption", label: "Consumption value", type: "number", default: "8", help: "Depending on the selected method: 8 liters per 100 km, or 12.5 km per liter." },
    { id: "price", label: "Fuel price per liter", type: "number", default: "2" },
    { id: "passengers", label: "Number of passengers sharing the cost", type: "number", default: "1", help: "Includes the driver if you are sharing the cost." }
  ],
  example: { values: { distance: "300", roundTrip: "", method: "per100", consumption: "8", price: "2", passengers: "1" }, expect: ["24 L", "48.00"], note: "Example: a 300 km trip with a consumption of 8 liters per 100 km and a fuel price of 2 per liter." },
  invalid: { values: { distance: "300", roundTrip: "", method: "per100", consumption: "8", price: "2", passengers: "0" } },
  related: ["unit-converter", "discount-tax", "speed-distance-time"]
};

export function solve(input) {
  const distance = num(input, "distance", "Distance", { positive: true, max: 100000 });
  const roundTrip = !isBlank(input.roundTrip) && String(input.roundTrip) !== "0";
  const method = choice(input, "method", "Consumption measurement method", ["per100", "kmpl"], "per100");
  const consumption = num(input, "consumption", "Consumption", { positive: true, max: 1000 });
  const price = num(input, "price", "Price per liter", { positive: true, max: 1000 });
  const passengers = num(input, "passengers", "Number of passengers", { integer: true, min: 1, max: 100, default: 1 });

  const total = roundTrip ? distance * 2 : distance;
  const per100 = method === "per100";
  const liters = per100 ? (total * consumption) / 100 : total / consumption;
  const cost = liters * price;
  const perPerson = cost / passengers;
  const perKm = cost / total;
  const equivalent = per100 ? consumption : (100 / consumption);

  return {
    results: [
      { label: "Total distance", value: `${fmt(total, 6)} km` },
      { label: "Equivalent consumption", value: `${fmt(equivalent, 4)} L / 100 km` },
      { label: "Fuel required", value: `${fmt(liters, 4)} L` },
      { label: "Total cost", value: money(cost) },
      { label: "Cost per person", value: money(perPerson) },
      { label: "Cost per kilometer", value: fmt(perKm, 4) }
    ],
    steps: [
      { text: "Total trip distance:", tex: `D = ${ntex(distance)}${roundTrip ? " \\times 2" : ""} = ${ntex(total)}\\ \\text{km}` },
      per100
        ? { text: "Fuel quantity using the consumption-per-100-km formula:", tex: `V = \\frac{D \\times C}{100} = \\frac{${ntex(total)} \\times ${ntex(consumption)}}{100} = ${ntex(liters, 6)}\\ \\text{L}` }
        : { text: "Fuel quantity using the kilometers-per-liter formula:", tex: `V = \\frac{D}{C} = \\frac{${ntex(total)}}{${ntex(consumption)}} = ${ntex(liters, 6)}\\ \\text{L}` },
      { text: "Total cost:", tex: `\\text{Cost} = V \\times P = ${ntex(liters, 6)} \\times ${ntex(price)} = ${ntex(cost, 8)}` },
      { text: "Cost per person:", tex: `\\frac{${ntex(cost, 8)}}{${passengers}} = ${ntex(perPerson, 8)}` }
    ],
    copy: `Fuel required: ${fmt(liters, 4)} L, total cost: ${money(cost)}, cost per person: ${money(perPerson)}, cost per kilometer: ${fmt(perKm, 4)}`
  };
}
