import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Calcul du seuil de rentabilité en unités et en chiffre d'affaires, de la marge sur coûts variables et de son taux, et du nombre d'unités nécessaire pour atteindre un bénéfice visé, avec tracé du chiffre d'affaires et du coût total jusqu'au double du seuil.",
  keywords: ["seuil de rentabilité", "break-even", "marge sur coûts variables", "coûts fixes", "coûts variables", "bénéfice visé"],
  formulas: [
    { label: "Seuil de rentabilité en unités", tex: "Q^* = \\frac{F}{p-v}" },
    { label: "Unités pour atteindre un bénéfice visé", tex: "Q_T = \\frac{F+\\pi}{p-v}" }
  ],
  inputs: [
    { id: "F", label: "Coûts fixes F", unit: "", type: "number", default: "10000" },
    { id: "p", label: "Prix de vente unitaire p", type: "number", default: "50" },
    { id: "v", label: "Coût variable unitaire v", type: "number", default: "30" },
    { id: "target", label: "Bénéfice visé π (facultatif)", type: "number", help: "Laissez vide si vous n'en avez pas besoin." }
  ],
  example: { values: { F: "10000", p: "50", v: "30", target: "" }, expect: ["500 unités", "25,000.00"], note: "Exemple : coûts fixes de 10 000, prix de 50 et coût variable de 30 par unité." },
  invalid: { values: { F: "10000", p: "30", v: "30", target: "" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const F = num(input, "F", "coûts fixes", { nonNegative: true });
  const p = num(input, "p", "Prix de vente unitaire", { positive: true });
  const v = num(input, "v", "Coût variable unitaire", { nonNegative: true });
  const target = num(input, "target", "bénéfice visé", { optional: true });
  if (!(p > v)) fail("Le prix de vente doit être supérieur au coût variable unitaire, sinon les ventes ne couvriront aucune partie des coûts fixes.", "p");
  const cm = p - v;
  const units = F / cm;
  const revenue = units * p;
  const cost = F + v * units;
  const ratio = cm / p;
  const integerUnits = Math.ceil(units - 1e-9);
  let targetUnits = null;
  if (target !== null) {
    if (F + target < 0) fail("La perte visée dépasse les coûts fixes, elle ne peut donc pas être calculée avec un nombre d'unités positif.", "target");
    targetUnits = (F + target) / cm;
  }
  const xMax = units > 0 ? 2 * units : 1;
  const sample = (fn) => Array.from({ length: 21 }, (_, k) => {
    const x = (xMax * k) / 20;
    return [x, fn(x)];
  });
  const plot = {
    type: "plot",
    title: "Chiffre d'affaires et coût total selon le nombre d'unités",
    xLabel: "Nombre d'unités",
    yLabel: "Montant",
    includeZero: true,
    series: [
      { name: "Chiffre d'affaires total", points: sample((x) => p * x), line: true },
      { name: "Coût total", points: sample((x) => F + v * x), line: true }
    ]
  };
  if (units > 0) plot.vlines = [{ x: units }];
  const results = [
    { label: "Seuil de rentabilité en unités", value: `${fmt(units, 6)} unités`, text: `${fmt(units, 6)} unités` },
    { label: "Nombre entier minimal d'unités", value: `${fmt(integerUnits)} unités` },
    { label: "Chiffre d'affaires au seuil", value: money(revenue) },
    { label: "Marge sur coût variable par unité", value: money(cm) },
    { label: "Taux de marge sur coût variable", value: `${fmt(ratio * 100, 4)}%` }
  ];
  const steps = [
    { text: "Marge sur coût variable par unité :", tex: `p - v = ${ntex(p)} - ${ntex(v)} = ${ntex(cm)}` },
    { text: "Seuil de rentabilité en unités :", tex: `Q^* = \\frac{F}{p-v} = \\frac{${ntex(F)}}{${ntex(cm)}} = ${ntex(units, 6)}` },
    { text: "Chiffre d'affaires au seuil :", tex: `R^* = pQ^* = ${ntex(p)} \\times ${ntex(units, 6)} = ${ntex(revenue, 8)}` }
  ];
  let copy = `Seuil de rentabilité : ${fmt(units, 6)} unités, chiffre d'affaires à ce niveau : ${money(revenue)}`;
  if (targetUnits !== null) {
    results.push({ label: "Unités pour atteindre le bénéfice visé", value: `${fmt(targetUnits, 6)} unités` });
    steps.push({ text: "Unités pour atteindre le bénéfice visé :", tex: `Q_T = \\frac{F+\\pi}{p-v} = \\frac{${ntex(F)} + ${ntex(target)}}{${ntex(cm)}} = ${ntex(targetUnits, 6)}` });
    copy += `, unités pour atteindre le bénéfice visé : ${fmt(targetUnits, 6)} unités`;
  }
  return { results, steps, copy, blocks: [plot] };
}
