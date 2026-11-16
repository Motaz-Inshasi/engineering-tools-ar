import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calcule la tasa metabólica basal y las necesidades calóricas diarias con las ecuaciones de Mifflin–St Jeor y Harris–Benedict, y después el objetivo según pérdida, mantenimiento o aumento de peso, con reparto de proteínas, grasas, carbohidratos y agua.",
  keywords: ["calorías", "BMR", "TDEE", "metabolismo basal", "Mifflin", "Harris-Benedict", "macronutrientes", "necesidad de agua", "calories"],
  formulas: [
    { label: "Mifflin–St Jeor", tex: "BMR = 10w + 6.25h - 5a + \\begin{cases} 5 & \\text{hombre} \\\\ -161 & \\text{mujer} \\end{cases}" },
    { label: "Harris–Benedict revisada", tex: "BMR_{m} = 88.362 + 13.397w + 4.799h - 5.677a,\\quad BMR_{f} = 447.593 + 9.247w + 3.098h - 4.330a" },
    { label: "Necesidad diaria y objetivo", tex: "TDEE = BMR \\times k_{activity},\\qquad \\text{Target} = TDEE + \\Delta" }
  ],
  inputs: [
    { id: "sex", label: "Sexo", type: "select", default: "male", options: [["male", "Hombre"], ["female", "Mujer"]] },
    { id: "age", label: "Edad", unit: "años", type: "number", default: "25", help: "De 15 a 100 años." },
    { id: "weight", label: "Peso", unit: "kg", type: "number", default: "70" },
    { id: "height", label: "Altura", unit: "cm", type: "number", default: "175" },
    { id: "activity", label: "Nivel de actividad", type: "select", default: "1.55", options: [["1.2", "Sedentario (1.2)"], ["1.375", "Actividad ligera (1.375)"], ["1.55", "Actividad moderada (1.55)"], ["1.725", "Actividad alta (1.725)"], ["1.9", "Actividad muy alta (1.9)"]] },
    { id: "goal", label: "Objetivo", type: "select", default: "0", options: [["-500", "Adelgazar (−500 kcal)"], ["0", "Mantener el peso"], ["300", "Aumentar de peso (+300 kcal)"]] }
  ],
  example: { values: { sex: "male", age: "25", weight: "70", height: "175", activity: "1.55", goal: "0" }, expect: ["1673.75"], note: "Ejemplo: hombre de 25 años, 70 kg, 175 cm, actividad moderada." },
  invalid: { values: { sex: "male", age: "10", weight: "70", height: "175", activity: "1.55", goal: "0" } },
  related: ["fertilizer-npk", "irrigation"]
};

export function solve(input) {
  const sex = choice(input, "sex", "Sexo", ["male", "female"], "male");
  const male = sex === "male";
  const age = num(input, "age", "Edad", { min: 15, max: 100 });
  const w = num(input, "weight", "Peso", { positive: true });
  const h = num(input, "height", "Altura", { positive: true });
  const act = Number(choice(input, "activity", "Nivel de actividad", ["1.2", "1.375", "1.55", "1.725", "1.9"], "1.55"));
  const goal = Number(choice(input, "goal", "Objetivo", ["-500", "0", "300"], "0"));
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
    { text: "Ecuación de Mifflin–St Jeor:", tex: `BMR = 10w + 6.25h - 5a ${sign}` },
    { text: "Sustituyendo:", tex: `BMR = 10 \\times ${ntex(w)} + 6.25 \\times ${ntex(h)} - 5 \\times ${ntex(age)} ${sign} = ${ntex(mifflin, 6)}\\ kcal` },
    { text: "Necesidad diaria con la actividad:", tex: `TDEE = ${ntex(mifflin, 6)} \\times ${ntex(act)} = ${ntex(tdee, 6)}\\ kcal` },
    { text: "Calorías objetivo:", tex: `${ntex(tdee, 6)} ${goal < 0 ? "-" : "+"} ${ntex(Math.abs(goal))} = ${ntex(target, 6)}\\ kcal` },
    { text: "Reparto de macronutrientes sobre las calorías objetivo (proteína 4, grasa 9, carbohidratos 4 kcal por gramo):", tex: `P = \\frac{${ntex(target, 6)} \\times 0.25}{4} = ${ntex(protein, 6)}\\ g,\\quad F = \\frac{${ntex(target, 6)} \\times 0.30}{9} = ${ntex(fat, 6)}\\ g,\\quad C = \\frac{${ntex(target, 6)} \\times 0.45}{4} = ${ntex(carbs, 6)}\\ g` },
    { text: "Agua (35 mL por kg):", tex: `${ntex(w)} \\times 35 = ${ntex(water, 6)}\\ mL` }
  ];
  return {
    results: [
      { label: "Metabolismo basal (Mifflin–St Jeor)", value: `${fmt(mifflin, 6)} kcal/día`, text: `BMR (Mifflin) = ${fmt(mifflin, 6)} kcal` },
      { label: "Metabolismo basal (Harris–Benedict)", value: `${fmt(hb, 6)} kcal/día` },
      { label: "Gasto energético diario TDEE (Mifflin)", value: `${fmt(tdee, 6)} kcal/día` },
      { label: "Calorías objetivo (Mifflin)", value: `${fmt(target, 6)} kcal/día`, text: `Objetivo = ${fmt(target, 6)} kcal` },
      { label: "Calorías objetivo (Harris–Benedict)", value: `${fmt(targetHb, 6)} kcal/día` },
      { label: "necesidad de agua", value: `${fmt(water, 4)} mL (${fmt(water / 1000, 3)} litros)` }
    ],
    steps,
    copy: `BMR (Mifflin) = ${fmt(mifflin, 6)} kcal, objetivo diario = ${fmt(target, 6)} kcal, agua ${fmt(water / 1000, 3)} litros`,
    blocks: [
      {
        type: "table",
        caption: "Reparto de macronutrientes para las calorías objetivo",
        head: ["Componente", "Porcentaje", "Calorías (kcal)", "Gramos diarios"],
        rows: [
          ["Proteína", "25 %", fmt(target * 0.25, 5), fmt(protein, 5) + " g"],
          ["Grasas", "30 %", fmt(target * 0.30, 5), fmt(fat, 5) + " g"],
          ["Carbohidratos", "45 %", fmt(target * 0.45, 5), fmt(carbs, 5) + " g"]
        ]
      }
    ],
    values: { mifflin, hb, tdee, target, tdeeHb, targetHb, protein, fat, carbs, water }
  };
}
