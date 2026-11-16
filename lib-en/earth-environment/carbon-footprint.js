import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const FUEL = { gasoline: 2.31, diesel: 2.68 };
const LPG = 2.98;
const FLIGHT = 0.15;
const TREE = 21;

export const meta = {
  description: "Calculate the annual carbon footprint from electricity, car, butane gas and flights, with the share of each source and the number of trees needed to absorb the emissions. The coefficients are approximate.",
  keywords: ["Carbon footprint", "Carbon dioxide", "CO2", "carbon footprint", "Electricity", "Car", "Air travel", "Trees"],
  formulas: [
    { label: "Annual electricity emissions", tex: "E_{el} = 12\\,k\\,f_{el}" },
    { label: "Annual car emissions", tex: "E_{car} = 12\\,d\\,\\frac{c}{100}\\,f_{fuel}" },
    { label: "Gas and flights", tex: "E_{LPG} = 12\\,m\\cdot 2.98,\\qquad E_{fl} = 0.15\\,D" },
    { label: "Number of trees", tex: "N = \\left\\lceil \\frac{E_{total}}{21} \\right\\rceil" }
  ],
  inputs: [
    { id: "elec", label: "Monthly electricity consumption", unit: "kWh", type: "number", default: "0" },
    { id: "elecF", label: "Electricity emission factor", unit: "kg CO2/kWh", type: "number", default: "0.5", help: "The factor varies between countries and electricity sources; the default value is an approximate average." },
    { id: "km", label: "Monthly car distance", unit: "km", type: "number", default: "0" },
    { id: "cons", label: "Car fuel consumption", unit: "L/100 km", type: "number", default: "7" },
    { id: "fuel", label: "Fuel type", type: "select", default: "gasoline", options: [["gasoline", "Gasoline (2.31 kg/L)"], ["diesel", "Diesel (2.68 kg/L)"]] },
    { id: "lpg", label: "Monthly butane or propane gas", unit: "kg", type: "number", default: "0" },
    { id: "flights", label: "Annual flight distance", unit: "km", type: "number", default: "0", help: "Total flight kilometers per person." }
  ],
  example: { values: { elec: "300", elecF: "0.5", km: "1000", cons: "7", fuel: "gasoline", lpg: "0", flights: "0" }, expect: ["3.74 tonnes", "179 trees"], note: "Example: 300 kWh of electricity and 1000 km by car per month." },
  invalid: { values: { elec: "0", elecF: "0.5", km: "0", cons: "7", fuel: "gasoline", lpg: "0", flights: "0" } },
  related: ["air-quality-index", "unit-converter"]
};

export function solve(input) {
  const elec = num(input, "elec", "Electricity consumption", { nonNegative: true, default: 0 });
  const elecF = num(input, "elecF", "Electricity emission factor", { nonNegative: true, default: 0.5 });
  const km = num(input, "km", "Car distance", { nonNegative: true, default: 0 });
  const cons = num(input, "cons", "Car fuel consumption", { nonNegative: true, default: 0 });
  const fuel = choice(input, "fuel", "Fuel type", ["gasoline", "diesel"], "gasoline");
  const lpg = num(input, "lpg", "Butane gas", { nonNegative: true, default: 0 });
  const flights = num(input, "flights", "Flight distance", { nonNegative: true, default: 0 });
  const litres = km * 12 * cons / 100;
  const eEl = elec * 12 * elecF;
  const eCar = litres * FUEL[fuel];
  const eLpg = lpg * 12 * LPG;
  const eFl = flights * FLIGHT;
  const total = eEl + eCar + eLpg + eFl;
  if (!(total > 0)) fail("Enter a positive value for at least one source.", "elec");
  const tonnes = total / 1000;
  const trees = Math.ceil(total / TREE);
  const share = (x) => fmt(x / total * 100, 3) + " %";
  const steps = [
    { text: "Annual electricity emissions:", tex: `E_{el} = 12 \\times ${ntex(elec)} \\times ${ntex(elecF)} = ${ntex(eEl, 6)}\\ kg` },
    { text: "Annual car fuel volume:", tex: `V = 12 \\times ${ntex(km)} \\times \\frac{${ntex(cons)}}{100} = ${ntex(litres, 6)}\\ L` },
    { text: "Annual car emissions:", tex: `E_{car} = ${ntex(litres, 6)} \\times ${ntex(FUEL[fuel])} = ${ntex(eCar, 6)}\\ kg` },
    { text: "Annual butane gas emissions:", tex: `E_{LPG} = 12 \\times ${ntex(lpg)} \\times 2.98 = ${ntex(eLpg, 6)}\\ kg` },
    { text: "Flight emissions:", tex: `E_{fl} = ${ntex(flights)} \\times 0.15 = ${ntex(eFl, 6)}\\ kg` },
    { text: "Total and number of trees (21 kg per tree per year):", tex: `E = ${ntex(total, 6)}\\ kg = ${ntex(tonnes, 6)}\\ t,\\qquad N = \\left\\lceil \\frac{${ntex(total, 6)}}{21} \\right\\rceil = ${trees}` }
  ];
  return {
    results: [
      { label: "Annual electricity emissions", value: `${fmt(eEl, 4)} kg CO2` },
      { label: "Annual car emissions", value: `${fmt(eCar, 4)} kg CO2` },
      { label: "Annual butane gas emissions", value: `${fmt(eLpg, 4)} kg CO2` },
      { label: "Annual flight emissions", value: `${fmt(eFl, 4)} kg CO2` },
      { label: "Total annual", value: `${fmt(tonnes, 4)} t CO2`, text: `${fmt(tonnes, 4)} t CO2` },
      { label: "Number of trees needed to absorb it annually", value: `${trees} trees` }
    ],
    steps,
    copy: `Annual footprint ${fmt(tonnes, 4)} t CO2 (equivalent to ${trees} trees)`,
    blocks: [
      {
        type: "table",
        caption: "Distribution of annual emissions",
        head: ["Source", "Annual emissions (kg CO2)", "Share"],
        rows: [
          ["Electricity", fmt(eEl, 4), share(eEl)],
          ["Car", fmt(eCar, 4), share(eCar)],
          ["Butane gas", fmt(eLpg, 4), share(eLpg)],
          ["Flights", fmt(eFl, 4), share(eFl)],
          ["Total", fmt(total, 4), "100 %"]
        ]
      },
      { type: "note", text: "The emission factors are approximate general averages that vary by country, fuel type and operating method; the result is an estimate only." }
    ],
    values: { eEl, eCar, eLpg, eFl, total, tonnes, trees }
  };
}
