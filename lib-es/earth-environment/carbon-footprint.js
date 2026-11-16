import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const FUEL = { gasoline: 2.31, diesel: 2.68 };
const LPG = 2.98;
const FLIGHT = 0.15;
const TREE = 21;

export const meta = {
  description: "Calcule la huella de carbono anual por electricidad, automóvil, gas butano y vuelos, con la proporción de cada fuente y el número de árboles necesarios para absorber las emisiones. Los factores son aproximados.",
  keywords: ["Huella de carbono", "Dióxido de carbono", "CO2", "carbon footprint", "Electricidad", "Automóvil", "Vuelos", "Árboles"],
  formulas: [
    { label: "Emisión anual de electricidad", tex: "E_{el} = 12\\,k\\,f_{el}" },
    { label: "Emisión anual del automóvil", tex: "E_{car} = 12\\,d\\,\\frac{c}{100}\\,f_{fuel}" },
    { label: "Emisión del gas y de los vuelos", tex: "E_{LPG} = 12\\,m\\cdot 2.98,\\qquad E_{fl} = 0.15\\,D" },
    { label: "Número de árboles", tex: "N = \\left\\lceil \\frac{E_{total}}{21} \\right\\rceil" }
  ],
  inputs: [
    { id: "elec", label: "Consumo mensual de electricidad", unit: "kWh", type: "number", default: "0" },
    { id: "elecF", label: "Factor de emisión de la electricidad", unit: "kg CO2/kWh", type: "number", default: "0.5", help: "El factor varía entre países y fuentes de electricidad; el valor por defecto es un promedio aproximado." },
    { id: "km", label: "Distancia mensual en automóvil", unit: "km", type: "number", default: "0" },
    { id: "cons", label: "Consumo del automóvil", unit: "L/100 km", type: "number", default: "7" },
    { id: "fuel", label: "Tipo de combustible", type: "select", default: "gasoline", options: [["gasoline", "Gasolina (2.31 kg/L)"], ["diesel", "Diésel (2.68 kg/L)"]] },
    { id: "lpg", label: "Gas butano o propano mensual", unit: "kg", type: "number", default: "0" },
    { id: "flights", label: "Distancia anual de vuelos", unit: "km", type: "number", default: "0", help: "Suma de kilómetros de vuelo por persona." }
  ],
  example: { values: { elec: "300", elecF: "0.5", km: "1000", cons: "7", fuel: "gasoline", lpg: "0", flights: "0" }, expect: ["3.74 t", "179 árboles"], note: "Ejemplo: 300 kWh de electricidad y 1000 km en automóvil al mes." },
  invalid: { values: { elec: "0", elecF: "0.5", km: "0", cons: "7", fuel: "gasoline", lpg: "0", flights: "0" } },
  related: ["air-quality-index", "unit-converter"]
};

export function solve(input) {
  const elec = num(input, "elec", "Consumo de electricidad", { nonNegative: true, default: 0 });
  const elecF = num(input, "elecF", "Factor de emisión de la electricidad", { nonNegative: true, default: 0.5 });
  const km = num(input, "km", "Distancia en automóvil", { nonNegative: true, default: 0 });
  const cons = num(input, "cons", "Consumo del automóvil", { nonNegative: true, default: 0 });
  const fuel = choice(input, "fuel", "Tipo de combustible", ["gasoline", "diesel"], "gasoline");
  const lpg = num(input, "lpg", "Gas butano", { nonNegative: true, default: 0 });
  const flights = num(input, "flights", "Distancia de vuelos", { nonNegative: true, default: 0 });
  const litres = km * 12 * cons / 100;
  const eEl = elec * 12 * elecF;
  const eCar = litres * FUEL[fuel];
  const eLpg = lpg * 12 * LPG;
  const eFl = flights * FLIGHT;
  const total = eEl + eCar + eLpg + eFl;
  if (!(total > 0)) fail("Introduzca un valor positivo para al menos una fuente.", "elec");
  const tonnes = total / 1000;
  const trees = Math.ceil(total / TREE);
  const share = (x) => fmt(x / total * 100, 3) + " %";
  const steps = [
    { text: "Emisión anual de electricidad:", tex: `E_{el} = 12 \\times ${ntex(elec)} \\times ${ntex(elecF)} = ${ntex(eEl, 6)}\\ kg` },
    { text: "Volumen anual de combustible del automóvil:", tex: `V = 12 \\times ${ntex(km)} \\times \\frac{${ntex(cons)}}{100} = ${ntex(litres, 6)}\\ L` },
    { text: "Emisión anual del automóvil:", tex: `E_{car} = ${ntex(litres, 6)} \\times ${ntex(FUEL[fuel])} = ${ntex(eCar, 6)}\\ kg` },
    { text: "Emisión anual de gas butano:", tex: `E_{LPG} = 12 \\times ${ntex(lpg)} \\times 2.98 = ${ntex(eLpg, 6)}\\ kg` },
    { text: "Emisión de los vuelos:", tex: `E_{fl} = ${ntex(flights)} \\times 0.15 = ${ntex(eFl, 6)}\\ kg` },
    { text: "Total y número de árboles (21 kg por árbol al año):", tex: `E = ${ntex(total, 6)}\\ kg = ${ntex(tonnes, 6)}\\ t,\\qquad N = \\left\\lceil \\frac{${ntex(total, 6)}}{21} \\right\\rceil = ${trees}` }
  ];
  return {
    results: [
      { label: "Emisión anual de electricidad", value: `${fmt(eEl, 4)} kg CO2` },
      { label: "Emisión anual del automóvil", value: `${fmt(eCar, 4)} kg CO2` },
      { label: "Emisión anual de gas butano", value: `${fmt(eLpg, 4)} kg CO2` },
      { label: "Emisión anual de vuelos", value: `${fmt(eFl, 4)} kg CO2` },
      { label: "Total anual", value: `${fmt(tonnes, 4)} t CO2`, text: `${fmt(tonnes, 4)} t CO2` },
      { label: "Número de árboles necesarios para absorberla anualmente", value: `${trees} árboles` }
    ],
    steps,
    copy: `La huella anual de ${fmt(tonnes, 4)} t CO2 equivale a ${trees} árboles`,
    blocks: [
      {
        type: "table",
        caption: "Distribución de las emisiones anuales",
        head: ["Fuente", "Emisión anual (kg CO2)", "Proporción"],
        rows: [
          ["Electricidad", fmt(eEl, 4), share(eEl)],
          ["Automóvil", fmt(eCar, 4), share(eCar)],
          ["Gas butano", fmt(eLpg, 4), share(eLpg)],
          ["Vuelos", fmt(eFl, 4), share(eFl)],
          ["Total", fmt(total, 4), "100 %"]
        ]
      },
      { type: "note", text: "Los factores de emisión son aproximados: son promedios generales que varían según su país, el tipo de combustible y la forma de operación, así que el resultado es solo una estimación." }
    ],
    values: { eEl, eCar, eLpg, eFl, total, tonnes, trees }
  };
}
