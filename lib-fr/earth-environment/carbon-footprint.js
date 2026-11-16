import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const FUEL = { gasoline: 2.31, diesel: 2.68 };
const LPG = 2.98;
const FLIGHT = 0.15;
const TREE = 21;

export const meta = {
  description: "Calculez l'empreinte carbone annuelle à partir de l'électricité, de la voiture, du gaz butane et des vols aériens, avec la part de chaque source et le nombre d'arbres nécessaires pour absorber les émissions. Les coefficients sont approximatifs.",
  keywords: ["Empreinte carbone", "Dioxyde de carbone", "CO2", "carbon footprint", "Électricité", "Voiture", "Aviation", "Arbres"],
  formulas: [
    { label: "Émissions annuelles d'électricité", tex: "E_{el} = 12\\,k\\,f_{el}" },
    { label: "Émissions annuelles de la voiture", tex: "E_{car} = 12\\,d\\,\\frac{c}{100}\\,f_{fuel}" },
    { label: "Émissions du gaz et des vols", tex: "E_{LPG} = 12\\,m\\cdot 2.98,\\qquad E_{fl} = 0.15\\,D" },
    { label: "Nombre d'arbres", tex: "N = \\left\\lceil \\frac{E_{total}}{21} \\right\\rceil" }
  ],
  inputs: [
    { id: "elec", label: "Consommation d'électricité par mois", unit: "kWh", type: "number", default: "0" },
    { id: "elecF", label: "Facteur d'émission de l'électricité", unit: "kg CO2/kWh", type: "number", default: "0.5", help: "Le facteur varie selon les pays et les sources d'électricité ; la valeur par défaut est une moyenne approximative." },
    { id: "km", label: "Distance parcourue en voiture par mois", unit: "km", type: "number", default: "0" },
    { id: "cons", label: "Consommation de la voiture", unit: "L/100 km", type: "number", default: "7" },
    { id: "fuel", label: "Type de carburant", type: "select", default: "gasoline", options: [["gasoline", "Essence (2.31 kg/L)"], ["diesel", "Diesel (2.68 kg/L)"]] },
    { id: "lpg", label: "Gaz butane ou propane par mois", unit: "kg", type: "number", default: "0" },
    { id: "flights", label: "Distance des vols aériens par an", unit: "km", type: "number", default: "0", help: "Total des kilomètres de vol par personne." }
  ],
  example: { values: { elec: "300", elecF: "0.5", km: "1000", cons: "7", fuel: "gasoline", lpg: "0", flights: "0" }, expect: ["3.74 t", "179 arbres"], note: "Exemple : 300 kWh d'électricité et 1000 km en voiture par mois." },
  invalid: { values: { elec: "0", elecF: "0.5", km: "0", cons: "7", fuel: "gasoline", lpg: "0", flights: "0" } },
  related: ["air-quality-index", "unit-converter"]
};

export function solve(input) {
  const elec = num(input, "elec", "Consommation d'électricité", { nonNegative: true, default: 0 });
  const elecF = num(input, "elecF", "Facteur d'émission de l'électricité", { nonNegative: true, default: 0.5 });
  const km = num(input, "km", "Distance en voiture", { nonNegative: true, default: 0 });
  const cons = num(input, "cons", "Consommation de la voiture", { nonNegative: true, default: 0 });
  const fuel = choice(input, "fuel", "Type de carburant", ["gasoline", "diesel"], "gasoline");
  const lpg = num(input, "lpg", "Gaz butane", { nonNegative: true, default: 0 });
  const flights = num(input, "flights", "Distance des vols aériens", { nonNegative: true, default: 0 });
  const litres = km * 12 * cons / 100;
  const eEl = elec * 12 * elecF;
  const eCar = litres * FUEL[fuel];
  const eLpg = lpg * 12 * LPG;
  const eFl = flights * FLIGHT;
  const total = eEl + eCar + eLpg + eFl;
  if (!(total > 0)) fail("Saisissez une valeur positive pour au moins une source.", "elec");
  const tonnes = total / 1000;
  const trees = Math.ceil(total / TREE);
  const share = (x) => fmt(x / total * 100, 3) + " %";
  const steps = [
    { text: "Émissions annuelles d'électricité :", tex: `E_{el} = 12 \\times ${ntex(elec)} \\times ${ntex(elecF)} = ${ntex(eEl, 6)}\\ kg` },
    { text: "Volume annuel de carburant de la voiture :", tex: `V = 12 \\times ${ntex(km)} \\times \\frac{${ntex(cons)}}{100} = ${ntex(litres, 6)}\\ L` },
    { text: "Émissions annuelles de la voiture :", tex: `E_{car} = ${ntex(litres, 6)} \\times ${ntex(FUEL[fuel])} = ${ntex(eCar, 6)}\\ kg` },
    { text: "Émissions annuelles du gaz butane :", tex: `E_{LPG} = 12 \\times ${ntex(lpg)} \\times 2.98 = ${ntex(eLpg, 6)}\\ kg` },
    { text: "Émissions des vols aériens :", tex: `E_{fl} = ${ntex(flights)} \\times 0.15 = ${ntex(eFl, 6)}\\ kg` },
    { text: "Total et nombre d'arbres (21 kg par arbre et par an) :", tex: `E = ${ntex(total, 6)}\\ kg = ${ntex(tonnes, 6)}\\ t,\\qquad N = \\left\\lceil \\frac{${ntex(total, 6)}}{21} \\right\\rceil = ${trees}` }
  ];
  return {
    results: [
      { label: "Émissions annuelles d'électricité", value: `${fmt(eEl, 4)} kg CO2` },
      { label: "Émissions annuelles de la voiture", value: `${fmt(eCar, 4)} kg CO2` },
      { label: "Émissions annuelles du gaz butane", value: `${fmt(eLpg, 4)} kg CO2` },
      { label: "Émissions annuelles des vols aériens", value: `${fmt(eFl, 4)} kg CO2` },
      { label: "Total annuel", value: `${fmt(tonnes, 4)} t CO2`, text: `${fmt(tonnes, 4)} t CO2` },
      { label: "Nombre d'arbres nécessaires pour absorber ces émissions chaque année", value: `${trees} arbres` }
    ],
    steps,
    copy: `L'empreinte annuelle de ${fmt(tonnes, 4)} t CO2 équivaut à ${trees} arbres`,
    blocks: [
      {
        type: "table",
        caption: "Répartition des émissions annuelles",
        head: ["Source", "Émission annuelle (kg CO2)", "Part"],
        rows: [
          ["Électricité", fmt(eEl, 4), share(eEl)],
          ["Voiture", fmt(eCar, 4), share(eCar)],
          ["Gaz butane", fmt(eLpg, 4), share(eLpg)],
          ["Vols aériens", fmt(eFl, 4), share(eFl)],
          ["Total", fmt(total, 4), "100 %"]
        ]
      },
      { type: "note", text: "Les coefficients d'émission sont approximatifs : ce sont des moyennes générales qui varient selon votre pays, le type de carburant et le mode d'utilisation. Le résultat n'est qu'une estimation." }
    ],
    values: { eEl, eCar, eLpg, eFl, total, tonnes, trees }
  };
}
