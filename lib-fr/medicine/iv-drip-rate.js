import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "À des fins pédagogiques et de formation uniquement ; ne remplace pas le médecin, le pharmacien ni le protocole approuvé de votre établissement." };

export const meta = {
  description: "Calculez le débit de perfusion intraveineuse en millilitres par heure et le nombre de gouttes par minute selon le facteur de la tubulure, avec la valeur exacte et la valeur arrondie à la goutte entière.",
  keywords: ["perfusion intraveineuse", "nombre de gouttes", "gtt/min", "débit de perfusion", "IV drip rate", "drop factor", "mL/h"],
  formulas: [
    { label: "Débit d'écoulement", tex: "R = \\frac{V}{T}" },
    { label: "Gouttes par minute", tex: "N = \\frac{R \\times DF}{60}" }
  ],
  inputs: [
    { id: "volume", label: "Volume de solution", unit: "mL", type: "number", default: "1000" },
    { id: "hours", label: "Durée en heures", unit: "h", type: "number", default: "8", help: "Entier de 0 à 999." },
    { id: "minutes", label: "Durée en minutes", unit: "min", type: "number", default: "0", help: "Entier de 0 à 59." },
    { id: "dropFactor", label: "Facteur de la tubulure", unit: "gtt/mL", type: "select", default: "20", options: [["10", "10 gouttes/mL"], ["15", "15 gouttes/mL"], ["20", "20 gouttes/mL"], ["60", "60 gouttes/mL (microgouttes)"]] }
  ],
  example: { values: { volume: "1000", hours: "8", minutes: "0", dropFactor: "15" }, expect: ["125 mL/h", "31 gtt/min"], note: "Exemple : 1000 mL administrés en 8 heures avec une tubulure de 15 gouttes/mL." },
  invalid: { values: { volume: "1000", hours: "0", minutes: "0", dropFactor: "15" } },
  related: ["drug-dosage", "fluid-requirements", "bmi-bsa", "creatinine-clearance", "lab-units"]
};

export function solve(input) {
  const V = num(input, "volume", "Volume de solution", { positive: true });
  const hours = num(input, "hours", "Durée en heures", { integer: true, min: 0, max: 999 });
  const minutes = num(input, "minutes", "Durée en minutes", { integer: true, min: 0, max: 59 });
  const DF = Number(choice(input, "dropFactor", "Facteur de la tubulure", ["10", "15", "20", "60"], "20"));
  const T = hours * 60 + minutes;
  if (T <= 0) fail("Saisissez une durée supérieure à zéro (heures ou minutes).", "hours");
  const rate = V * 60 / T;
  const exactDrops = rate * DF / 60;
  const drops = Math.round(exactDrops);
  const steps = [
    { text: "Durée totale en minutes :", tex: `T = ${ntex(hours)} \\times 60 + ${ntex(minutes)} = ${ntex(T)}\\ min` },
    { text: "Débit d'écoulement en millilitres par heure :", tex: `R = \\frac{${ntex(V)}}{${ntex(T / 60, 6)}} = ${ntex(rate, 6)}\\ mL/h` },
    { text: "Nombre de gouttes par minute (valeur exacte) :", tex: `N = \\frac{${ntex(rate, 6)} \\times ${DF}}{60} = ${ntex(exactDrops, 6)}\\ gtt/min` },
    { text: "On arrondit à la goutte entière la plus proche :", tex: `N \\approx ${drops}\\ gtt/min` }
  ];
  const blocks = [NOTE];
  if (drops === 0) blocks.unshift({ type: "note", tone: "warn", text: "Le débit est inférieur à une goutte par minute après arrondi : il ne peut pas être réglé avec cette tubulure. Utilisez une tubulure à facteur plus élevé ou une pompe de perfusion." });
  return {
    results: [
      { label: "Débit d'écoulement", value: `${fmt(rate, 6)} mL/h`, text: `${fmt(rate, 6)} mL/h` },
      { label: "Gouttes par minute (exact)", value: `${fmt(exactDrops, 6)} gtt/min` },
      { label: "Gouttes par minute (arrondi)", value: `${drops} gtt/min`, text: `${drops} gtt/min` }
    ],
    steps,
    blocks,
    copy: `Débit ${fmt(rate, 6)} mL/h, gouttes ${fmt(exactDrops, 6)} arrondies à ${drops} gtt/min`
  };
}
