import { choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Calcule la cantidad de combustible necesaria para un viaje según su distancia y el consumo del vehículo, en litros cada 100 km o en km por litro, con opción de ida y vuelta, y el coste del viaje, por persona y por kilómetro.",
  keywords: ["combustible", "consumo del vehículo", "coste del viaje", "litros cada 100 km", "km por litro", "gasolina", "fuel cost"],
  formulas: [
    { label: "Cantidad de combustible (litros cada 100 km)", tex: "V = \\frac{D \\times C}{100}" },
    { label: "Cantidad de combustible (km por litro)", tex: "V = \\frac{D}{C}" },
    { label: "Coste total y coste por persona", tex: "\\text{Cost} = V \\times P,\\qquad \\text{per person} = \\frac{\\text{Cost}}{n}" }
  ],
  inputs: [
    { id: "distance", label: "Distancia de un trayecto", unit: "km", type: "number", default: "300" },
    { id: "roundTrip", label: "Ida y vuelta", type: "checkbox", default: "" },
    { id: "method", label: "Forma de medir el consumo", type: "select", default: "per100", options: [["per100", "litros cada 100 km"], ["kmpl", "km por litro"]] },
    { id: "consumption", label: "Valor del consumo", type: "number", default: "8", help: "Según el método elegido: 8 litros cada 100 km, o 12.5 km por litro." },
    { id: "price", label: "Precio del litro de combustible", type: "number", default: "2" },
    { id: "passengers", label: "Número de pasajeros para dividir el coste", type: "number", default: "1", help: "Incluya al conductor si comparten el coste." }
  ],
  example: { values: { distance: "300", roundTrip: "", method: "per100", consumption: "8", price: "2", passengers: "1" }, expect: ["24 litros", "48.00"], note: "Ejemplo: viaje de 300 km con un consumo de 8 litros cada 100 km y un precio de 2 por litro." },
  invalid: { values: { distance: "300", roundTrip: "", method: "per100", consumption: "8", price: "2", passengers: "0" } },
  related: ["unit-converter", "discount-tax", "speed-distance-time"]
};

export function solve(input) {
  const distance = num(input, "distance", "distancia", { positive: true, max: 100000 });
  const roundTrip = !isBlank(input.roundTrip) && String(input.roundTrip) !== "0";
  const method = choice(input, "method", "Forma de medir el consumo", ["per100", "kmpl"], "per100");
  const consumption = num(input, "consumption", "consumo", { positive: true, max: 1000 });
  const price = num(input, "price", "precio del litro", { positive: true, max: 1000 });
  const passengers = num(input, "passengers", "número de pasajeros", { integer: true, min: 1, max: 100, default: 1 });

  const total = roundTrip ? distance * 2 : distance;
  const per100 = method === "per100";
  const liters = per100 ? (total * consumption) / 100 : total / consumption;
  const cost = liters * price;
  const perPerson = cost / passengers;
  const perKm = cost / total;
  const equivalent = per100 ? consumption : (100 / consumption);

  return {
    results: [
      { label: "Distancia total", value: `${fmt(total, 6)} km` },
      { label: "Consumo equivalente", value: `${fmt(equivalent, 4)} litros / 100 km` },
      { label: "Combustible necesario", value: `${fmt(liters, 4)} litros` },
      { label: "Coste total", value: money(cost) },
      { label: "Coste por persona", value: money(perPerson) },
      { label: "Coste por kilómetro", value: fmt(perKm, 4) }
    ],
    steps: [
      { text: "Distancia total del viaje:", tex: `D = ${ntex(distance)}${roundTrip ? " \\times 2" : ""} = ${ntex(total)}\\ \\text{km}` },
      per100
        ? { text: "Cantidad de combustible según el consumo cada 100 km:", tex: `V = \\frac{D \\times C}{100} = \\frac{${ntex(total)} \\times ${ntex(consumption)}}{100} = ${ntex(liters, 6)}\\ \\text{L}` }
        : { text: "Cantidad de combustible según los km por litro:", tex: `V = \\frac{D}{C} = \\frac{${ntex(total)}}{${ntex(consumption)}} = ${ntex(liters, 6)}\\ \\text{L}` },
      { text: "Coste total:", tex: `\\text{Cost} = V \\times P = ${ntex(liters, 6)} \\times ${ntex(price)} = ${ntex(cost, 8)}` },
      { text: "Coste por persona:", tex: `\\frac{${ntex(cost, 8)}}{${passengers}} = ${ntex(perPerson, 8)}` }
    ],
    copy: `Combustible necesario: ${fmt(liters, 4)} litros; coste total: ${money(cost)}; coste por persona: ${money(perPerson)}; coste por kilómetro: ${fmt(perKm, 4)}`
  };
}
