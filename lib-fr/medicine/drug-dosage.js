import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "À des fins pédagogiques et de formation uniquement ; ne remplace pas le médecin, le pharmacien ni le protocole approuvé de votre établissement." };

export const meta = {
  description: "Calculez la dose unitaire et la dose journalière d'un médicament en milligrammes par kilogramme de poids, ainsi que le volume à prélever à partir de la concentration du stock, avec la possibilité de limiter la dose à un maximum.",
  keywords: ["dose de médicament", "mg/kg", "calcul des doses", "dose maximale", "drug dosage", "dose calculation", "concentration du stock"],
  formulas: [
    { label: "Dose unitaire", tex: "D = W \\times d_{kg}" },
    { label: "Dose journalière", tex: "D_{day} = D \\times f" },
    { label: "Volume de médicament par prise", tex: "V = \\frac{D}{C_{mg}} \\times V_{mL}" }
  ],
  inputs: [
    { id: "weight", label: "Poids du patient", unit: "kg", type: "number", default: "20" },
    { id: "dosePerKg", label: "Dose prescrite par kg", unit: "mg/kg", type: "number", default: "15" },
    { id: "basis", label: "Base de la dose prescrite", type: "select", default: "dose", options: [["dose", "par prise"], ["day", "par jour"]] },
    { id: "freq", label: "Nombre de prises par jour", type: "number", default: "4", help: "Entier de 1 à 24." },
    { id: "stockMg", label: "Quantité de médicament en stock", unit: "mg", type: "number", default: "250" },
    { id: "stockMl", label: "Volume du stock", unit: "mL", type: "number", default: "5", help: "Exemple : 250 mg dans 5 mL." },
    { id: "maxDose", label: "Dose maximale par prise (facultatif)", unit: "mg", type: "number", help: "Laissez vide s'il n'y a pas de maximum." }
  ],
  example: { values: { weight: "20", dosePerKg: "15", basis: "dose", freq: "4", stockMg: "250", stockMl: "5", maxDose: "" }, expect: ["300 mg", "6 mL"], note: "Exemple : enfant pesant 20 kg, dose de 15 mg/kg par prise, médicament 250 mg dans 5 mL." },
  invalid: { values: { weight: "0", dosePerKg: "15", basis: "dose", freq: "4", stockMg: "250", stockMl: "5", maxDose: "" } },
  related: ["iv-drip-rate", "bmi-bsa", "creatinine-clearance", "lab-units", "fluid-requirements"]
};

export function solve(input) {
  const w = num(input, "weight", "Poids", { positive: true, max: 500 });
  const mgkg = num(input, "dosePerKg", "Dose par kg", { positive: true });
  const basis = choice(input, "basis", "Base de la dose", ["dose", "day"], "dose");
  const freq = num(input, "freq", "Nombre de prises par jour", { integer: true, min: 1, max: 24 });
  const stockMg = num(input, "stockMg", "Quantité de médicament en stock", { positive: true });
  const stockMl = num(input, "stockMl", "Volume du stock", { positive: true });
  const maxDose = num(input, "maxDose", "dose maximale", { positive: true, optional: true });

  const rawDaily = basis === "dose" ? w * mgkg * freq : w * mgkg;
  const rawSingle = rawDaily / freq;
  const capped = maxDose !== null && rawSingle > maxDose;
  const single = capped ? maxDose : rawSingle;
  const daily = single * freq;
  const vol = (single / stockMg) * stockMl;

  const steps = [];
  if (basis === "dose") {
    steps.push({ text: "Dose unitaire = poids × dose par kg :", tex: `D = ${ntex(w)} \\times ${ntex(mgkg)} = ${ntex(rawSingle, 6)}\\ mg` });
  } else {
    steps.push({ text: "Dose journalière = poids × dose par kg :", tex: `D_{day} = ${ntex(w)} \\times ${ntex(mgkg)} = ${ntex(rawDaily, 6)}\\ mg` });
    steps.push({ text: "Dose unitaire = dose journalière ÷ nombre de prises :", tex: `D = \\frac{${ntex(rawDaily, 6)}}{${freq}} = ${ntex(rawSingle, 6)}\\ mg` });
  }
  if (capped) steps.push({ text: "La dose dépasse le maximum, on utilise donc le maximum :", tex: `D = ${ntex(maxDose)}\\ mg` });
  steps.push({ text: "Dose journalière = dose unitaire × nombre de prises :", tex: `D_{day} = ${ntex(single, 6)} \\times ${freq} = ${ntex(daily, 6)}\\ mg` });
  steps.push({ text: "Volume de médicament par prise :", tex: `V = \\frac{${ntex(single, 6)}}{${ntex(stockMg)}} \\times ${ntex(stockMl)} = ${ntex(vol, 6)}\\ mL` });

  const blocks = [NOTE];
  if (capped) blocks.unshift({ type: "note", tone: "warn", text: `La dose a été limitée au maximum de ${fmt(maxDose)} mg car le calcul le dépassait ; la dose journalière a donc aussi été réduite.` });

  return {
    results: [
      { label: "Dose unitaire", value: `${fmt(single, 6)} mg`, text: `${fmt(single, 6)} mg` },
      { label: "Dose journalière", value: `${fmt(daily, 6)} mg` },
      { label: "Volume de médicament par prise", value: `${fmt(vol, 4)} mL`, text: `${fmt(vol, 4)} mL` }
    ],
    steps,
    blocks,
    copy: `Dose unitaire ${fmt(single, 6)} mg, soit ${fmt(vol, 4)} mL par prise, et dose journalière ${fmt(daily, 6)} mg`
  };
}
