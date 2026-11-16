import { choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Calcule la quantité de carburant nécessaire pour un trajet à partir de sa distance et de la consommation du véhicule, en litres aux 100 km ou en km par litre, avec l'option aller-retour, ainsi que le coût du trajet et son coût par passager et par kilomètre.",
  keywords: ["carburant", "consommation du véhicule", "coût du trajet", "litres aux 100 km", "km par litre", "essence", "fuel cost"],
  formulas: [
    { label: "Quantité de carburant (litres aux 100 km)", tex: "V = \\frac{D \\times C}{100}" },
    { label: "Quantité de carburant (km par litre)", tex: "V = \\frac{D}{C}" },
    { label: "Coût total et coût par personne", tex: "\\text{Cost} = V \\times P,\\qquad \\text{per person} = \\frac{\\text{Cost}}{n}" }
  ],
  inputs: [
    { id: "distance", label: "Distance aller simple", unit: "km", type: "number", default: "300" },
    { id: "roundTrip", label: "Aller-retour", type: "checkbox", default: "" },
    { id: "method", label: "Mode de mesure de la consommation", type: "select", default: "per100", options: [["per100", "litres aux 100 km"], ["kmpl", "km par litre"]] },
    { id: "consumption", label: "Valeur de la consommation", type: "number", default: "8", help: "Selon le mode choisi : 8 litres aux 100 km, ou 12.5 km par litre." },
    { id: "price", label: "Prix du litre de carburant", type: "number", default: "2" },
    { id: "passengers", label: "Nombre de passagers partageant le coût", type: "number", default: "1", help: "Inclut le conducteur si vous partagez le coût." }
  ],
  example: { values: { distance: "300", roundTrip: "", method: "per100", consumption: "8", price: "2", passengers: "1" }, expect: ["24 litres", "48.00"], note: "Exemple : trajet de 300 km avec une consommation de 8 litres aux 100 km et un prix du litre de 2." },
  invalid: { values: { distance: "300", roundTrip: "", method: "per100", consumption: "8", price: "2", passengers: "0" } },
  related: ["unit-converter", "discount-tax", "speed-distance-time"]
};

export function solve(input) {
  const distance = num(input, "distance", "Distance", { positive: true, max: 100000 });
  const roundTrip = !isBlank(input.roundTrip) && String(input.roundTrip) !== "0";
  const method = choice(input, "method", "Mode de mesure de la consommation", ["per100", "kmpl"], "per100");
  const consumption = num(input, "consumption", "Consommation", { positive: true, max: 1000 });
  const price = num(input, "price", "Prix du litre", { positive: true, max: 1000 });
  const passengers = num(input, "passengers", "Nombre de passagers", { integer: true, min: 1, max: 100, default: 1 });

  const total = roundTrip ? distance * 2 : distance;
  const per100 = method === "per100";
  const liters = per100 ? (total * consumption) / 100 : total / consumption;
  const cost = liters * price;
  const perPerson = cost / passengers;
  const perKm = cost / total;
  const equivalent = per100 ? consumption : (100 / consumption);

  return {
    results: [
      { label: "Distance totale", value: `${fmt(total, 6)} km` },
      { label: "Consommation équivalente", value: `${fmt(equivalent, 4)} litres / 100 km` },
      { label: "Carburant nécessaire", value: `${fmt(liters, 4)} litres` },
      { label: "Coût total", value: money(cost) },
      { label: "Coût par personne", value: money(perPerson) },
      { label: "Coût du kilomètre", value: fmt(perKm, 4) }
    ],
    steps: [
      { text: "Distance totale du trajet :", tex: `D = ${ntex(distance)}${roundTrip ? " \\times 2" : ""} = ${ntex(total)}\\ \\text{km}` },
      per100
        ? { text: "Quantité de carburant avec la formule de consommation aux 100 km :", tex: `V = \\frac{D \\times C}{100} = \\frac{${ntex(total)} \\times ${ntex(consumption)}}{100} = ${ntex(liters, 6)}\\ \\text{L}` }
        : { text: "Quantité de carburant avec la formule en km par litre :", tex: `V = \\frac{D}{C} = \\frac{${ntex(total)}}{${ntex(consumption)}} = ${ntex(liters, 6)}\\ \\text{L}` },
      { text: "Coût total :", tex: `\\text{Cost} = V \\times P = ${ntex(liters, 6)} \\times ${ntex(price)} = ${ntex(cost, 8)}` },
      { text: "Coût par personne :", tex: `\\frac{${ntex(cost, 8)}}{${passengers}} = ${ntex(perPerson, 8)}` }
    ],
    copy: `Carburant nécessaire : ${fmt(liters, 4)} litres, coût total : ${money(cost)}, coût par personne : ${money(perPerson)}, coût du kilomètre : ${fmt(perKm, 4)}`
  };
}
