import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calcule le métabolisme de base et les besoins quotidiens en calories avec les équations de Mifflin–St Jeor et de Harris–Benedict, puis l'objectif selon la perte de poids, le maintien ou la prise de poids, avec la répartition des protéines, des lipides, des glucides et de l'eau.",
  keywords: ["calories", "BMR", "TDEE", "métabolisme", "Mifflin", "Harris-Benedict", "macronutriments", "besoins en eau", "calories"],
  formulas: [
    { label: "Mifflin–St Jeor", tex: "BMR = 10w + 6.25h - 5a + \\begin{cases} 5 & \\text{homme} \\\\ -161 & \\text{femme} \\end{cases}" },
    { label: "Harris–Benedict révisée", tex: "BMR_{m} = 88.362 + 13.397w + 4.799h - 5.677a,\\quad BMR_{f} = 447.593 + 9.247w + 3.098h - 4.330a" },
    { label: "Besoin quotidien et objectif", tex: "TDEE = BMR \\times k_{activity},\\qquad \\text{Target} = TDEE + \\Delta" }
  ],
  inputs: [
    { id: "sex", label: "Sexe", type: "select", default: "male", options: [["male", "Homme"], ["female", "Femme"]] },
    { id: "age", label: "Âge", unit: "ans", type: "number", default: "25", help: "De 15 à 100 ans." },
    { id: "weight", label: "Poids", unit: "kg", type: "number", default: "70" },
    { id: "height", label: "Taille", unit: "cm", type: "number", default: "175" },
    { id: "activity", label: "Niveau d'activité", type: "select", default: "1.55", options: [["1.2", "Sédentaire (1.2)"], ["1.375", "Activité légère (1.375)"], ["1.55", "Activité modérée (1.55)"], ["1.725", "Activité élevée (1.725)"], ["1.9", "Activité très élevée (1.9)"]] },
    { id: "goal", label: "Objectif", type: "select", default: "0", options: [["-500", "Perte de poids (−500 kcal)"], ["0", "Maintien du poids"], ["300", "Prise de poids (+300 kcal)"]] }
  ],
  example: { values: { sex: "male", age: "25", weight: "70", height: "175", activity: "1.55", goal: "0" }, expect: ["1673.75"], note: "Exemple : homme de 25 ans, 70 kg, 175 cm, activité modérée." },
  invalid: { values: { sex: "male", age: "10", weight: "70", height: "175", activity: "1.55", goal: "0" } },
  related: ["fertilizer-npk", "irrigation"]
};

export function solve(input) {
  const sex = choice(input, "sex", "Sexe", ["male", "female"], "male");
  const male = sex === "male";
  const age = num(input, "age", "Âge", { min: 15, max: 100 });
  const w = num(input, "weight", "Poids", { positive: true });
  const h = num(input, "height", "Taille", { positive: true });
  const act = Number(choice(input, "activity", "Niveau d'activité", ["1.2", "1.375", "1.55", "1.725", "1.9"], "1.55"));
  const goal = Number(choice(input, "goal", "Objectif", ["-500", "0", "300"], "0"));
  const mifflin = 10 * w + 6.25 * h - 5 * age + (male ? 5 : -161);
  const hb = male
    ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * age
    : 447.593 + 9.247 * w + 3.098 * h - 4.330 * age;
  const tdee = mifflin * act;
  const target = tdee + goal;
  const tdeeHb = hb * act;
  const targetHb = tdeeHb + goal;
  const protein = target * 0.25 / 4;
  const fat = target * 0.30 / 9;
  const carbs = target * 0.45 / 4;
  const water = w * 35;
  const sign = male ? "+ 5" : "- 161";
  const steps = [
    { text: "Équation de Mifflin–St Jeor :", tex: `BMR = 10w + 6.25h - 5a ${sign}` },
    { text: "En remplaçant :", tex: `BMR = 10 \\times ${ntex(w)} + 6.25 \\times ${ntex(h)} - 5 \\times ${ntex(age)} ${sign} = ${ntex(mifflin, 6)}\\ kcal` },
    { text: "Besoin quotidien avec l'activité :", tex: `TDEE = ${ntex(mifflin, 6)} \\times ${ntex(act)} = ${ntex(tdee, 6)}\\ kcal` },
    { text: "Calories cibles :", tex: `${ntex(tdee, 6)} ${goal < 0 ? "-" : "+"} ${ntex(Math.abs(goal))} = ${ntex(target, 6)}\\ kcal` },
    { text: "Répartition des macronutriments sur les calories cibles (protéines 4, lipides 9, glucides 4 kcal par gramme) :", tex: `P = \\frac{${ntex(target, 6)} \\times 0.25}{4} = ${ntex(protein, 6)}\\ g,\\quad F = \\frac{${ntex(target, 6)} \\times 0.30}{9} = ${ntex(fat, 6)}\\ g,\\quad C = \\frac{${ntex(target, 6)} \\times 0.45}{4} = ${ntex(carbs, 6)}\\ g` },
    { text: "Eau (35 mL par kg) :", tex: `${ntex(w)} \\times 35 = ${ntex(water, 6)}\\ mL` }
  ];
  return {
    results: [
      { label: "Métabolisme de base (Mifflin–St Jeor)", value: `${fmt(mifflin, 6)} kcal/jour`, text: `BMR (Mifflin) = ${fmt(mifflin, 6)} kcal` },
      { label: "Métabolisme de base (Harris–Benedict)", value: `${fmt(hb, 6)} kcal/jour` },
      { label: "Besoin quotidien TDEE (Mifflin)", value: `${fmt(tdee, 6)} kcal/jour` },
      { label: "Calories cibles (Mifflin)", value: `${fmt(target, 6)} kcal/jour`, text: `Objectif = ${fmt(target, 6)} kcal` },
      { label: "Calories cibles (Harris–Benedict)", value: `${fmt(targetHb, 6)} kcal/jour` },
      { label: "besoins en eau", value: `${fmt(water, 4)} mL (${fmt(water / 1000, 3)} L)` }
    ],
    steps,
    copy: `BMR (Mifflin) = ${fmt(mifflin, 6)} kcal, objectif quotidien = ${fmt(target, 6)} kcal, eau ${fmt(water / 1000, 3)} L`,
    blocks: [
      {
        type: "table",
        caption: "Répartition des macronutriments pour les calories cibles",
        head: ["Composant", "Pourcentage", "Calories (kcal)", "Grammes par jour"],
        rows: [
          ["Protéines", "25 %", fmt(target * 0.25, 5), fmt(protein, 5) + " g"],
          ["Lipides", "30 %", fmt(target * 0.30, 5), fmt(fat, 5) + " g"],
          ["Glucides", "45 %", fmt(target * 0.45, 5), fmt(carbs, 5) + " g"]
        ]
      }
    ],
    values: { mifflin, hb, tdee, target, tdeeHb, targetHb, protein, fat, carbs, water }
  };
}
