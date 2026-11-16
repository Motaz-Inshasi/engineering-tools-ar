import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calculates basal metabolic rate and daily calorie needs using the Mifflin–St Jeor and Harris–Benedict equations, then the target for weight loss, maintenance, or gain, with the distribution of protein, fat, carbohydrates, and water.",
  keywords: ["calories", "BMR", "TDEE", "metabolic rate", "Mifflin", "Harris-Benedict", "macros", "water needs", "calories"],
  formulas: [
    { label: "Mifflin–St Jeor", tex: "BMR = 10w + 6.25h - 5a + \\begin{cases} 5 & \\text{male} \\\\ -161 & \\text{female} \\end{cases}" },
    { label: "Revised Harris–Benedict", tex: "BMR_{m} = 88.362 + 13.397w + 4.799h - 5.677a,\\quad BMR_{f} = 447.593 + 9.247w + 3.098h - 4.330a" },
    { label: "Daily needs and target", tex: "TDEE = BMR \\times k_{activity},\\qquad \\text{Target} = TDEE + \\Delta" }
  ],
  inputs: [
    { id: "sex", label: "Sex", type: "select", default: "male", options: [["male", "Male"], ["female", "Female"]] },
    { id: "age", label: "Age", unit: "years", type: "number", default: "25", help: "From 15 to 100 years." },
    { id: "weight", label: "Weight", unit: "kg", type: "number", default: "70" },
    { id: "height", label: "Height", unit: "cm", type: "number", default: "175" },
    { id: "activity", label: "Activity level", type: "select", default: "1.55", options: [["1.2", "Sedentary (1.2)"], ["1.375", "Light activity (1.375)"], ["1.55", "Moderate activity (1.55)"], ["1.725", "High activity (1.725)"], ["1.9", "Very high activity (1.9)"]] },
    { id: "goal", label: "Goal", type: "select", default: "0", options: [["-500", "Weight loss (−500 kcal)"], ["0", "Weight maintenance"], ["300", "Weight gain (+300 kcal)"]] }
  ],
  example: { values: { sex: "male", age: "25", weight: "70", height: "175", activity: "1.55", goal: "0" }, expect: ["1673.75"], note: "Example: male, 25 years, 70 kg, 175 cm, moderate activity." },
  invalid: { values: { sex: "male", age: "10", weight: "70", height: "175", activity: "1.55", goal: "0" } },
  related: ["fertilizer-npk", "irrigation"]
};

export function solve(input) {
  const sex = choice(input, "sex", "Sex", ["male", "female"], "male");
  const male = sex === "male";
  const age = num(input, "age", "Age", { min: 15, max: 100 });
  const w = num(input, "weight", "Weight", { positive: true });
  const h = num(input, "height", "Height", { positive: true });
  const act = Number(choice(input, "activity", "Activity level", ["1.2", "1.375", "1.55", "1.725", "1.9"], "1.55"));
  const goal = Number(choice(input, "goal", "Goal", ["-500", "0", "300"], "0"));
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
    { text: "Mifflin–St Jeor equation:", tex: `BMR = 10w + 6.25h - 5a ${sign}` },
    { text: "Substituting:", tex: `BMR = 10 \\times ${ntex(w)} + 6.25 \\times ${ntex(h)} - 5 \\times ${ntex(age)} ${sign} = ${ntex(mifflin, 6)}\\ kcal` },
    { text: "Daily needs with activity:", tex: `TDEE = ${ntex(mifflin, 6)} \\times ${ntex(act)} = ${ntex(tdee, 6)}\\ kcal` },
    { text: "Target calories:", tex: `${ntex(tdee, 6)} ${goal < 0 ? "-" : "+"} ${ntex(Math.abs(goal))} = ${ntex(target, 6)}\\ kcal` },
    { text: "Distribution of macronutrients over the target calories (protein 4, fat 9, carbohydrates 4 kcal per gram):", tex: `P = \\frac{${ntex(target, 6)} \\times 0.25}{4} = ${ntex(protein, 6)}\\ g,\\quad F = \\frac{${ntex(target, 6)} \\times 0.30}{9} = ${ntex(fat, 6)}\\ g,\\quad C = \\frac{${ntex(target, 6)} \\times 0.45}{4} = ${ntex(carbs, 6)}\\ g` },
    { text: "Water (35 mL per kg):", tex: `${ntex(w)} \\times 35 = ${ntex(water, 6)}\\ mL` }
  ];
  return {
    results: [
      { label: "Basal metabolic rate (Mifflin–St Jeor)", value: `${fmt(mifflin, 6)} kcal/day`, text: `BMR (Mifflin) = ${fmt(mifflin, 6)} kcal` },
      { label: "Basal metabolic rate (Harris–Benedict)", value: `${fmt(hb, 6)} kcal/day` },
      { label: "Daily needs TDEE (Mifflin)", value: `${fmt(tdee, 6)} kcal/day` },
      { label: "Target calories (Mifflin)", value: `${fmt(target, 6)} kcal/day`, text: `Target = ${fmt(target, 6)} kcal` },
      { label: "Target calories (Harris–Benedict)", value: `${fmt(targetHb, 6)} kcal/day` },
      { label: "water needs", value: `${fmt(water, 4)} mL (${fmt(water / 1000, 3)} L)` }
    ],
    steps,
    copy: `BMR (Mifflin) = ${fmt(mifflin, 6)} kcal, daily target = ${fmt(target, 6)} kcal, water ${fmt(water / 1000, 3)} L`,
    blocks: [
      {
        type: "table",
        caption: "Macronutrient distribution for the target calories",
        head: ["Component", "Percentage", "Calories (kcal)", "Grams per day"],
        rows: [
          ["Protein", "25 %", fmt(target * 0.25, 5), fmt(protein, 5) + " g"],
          ["Fat", "30 %", fmt(target * 0.30, 5), fmt(fat, 5) + " g"],
          ["Carbohydrates", "45 %", fmt(target * 0.45, 5), fmt(carbs, 5) + " g"]
        ]
      }
    ],
    values: { mifflin, hb, tdee, target, tdeeHb, targetHb, protein, fat, carbs, water }
  };
}
