import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "بنیادی میٹابولک ریٹ (BMR) اور روزانہ کیلوریز کی ضرورت Mifflin–St Jeor اور Harris–Benedict مساوات سے حساب کریں، پھر وزن کم کرنے، برقرار رکھنے یا بڑھانے کا ہدف، ساتھ پروٹین، چکنائی، کاربوہائیڈریٹس اور پانی کی تقسیم۔",
  keywords: ["کیلوریز", "BMR", "TDEE", "میٹابولک ریٹ", "Mifflin", "Harris-Benedict", "میکروز", "پانی کی ضرورت", "calories"],
  formulas: [
    { label: "Mifflin–St Jeor", tex: "BMR = 10w + 6.25h - 5a + \\begin{cases} 5 & \\text{مرد} \\\\ -161 & \\text{عورت} \\end{cases}" },
    { label: "ترمیم شدہ Harris–Benedict", tex: "BMR_{m} = 88.362 + 13.397w + 4.799h - 5.677a,\\quad BMR_{f} = 447.593 + 9.247w + 3.098h - 4.330a" },
    { label: "روزانہ کی ضرورت اور ہدف", tex: "TDEE = BMR \\times k_{activity},\\qquad \\text{Target} = TDEE + \\Delta" }
  ],
  inputs: [
    { id: "sex", label: "جنس", type: "select", default: "male", options: [["male", "مرد"], ["female", "عورت"]] },
    { id: "age", label: "عمر", unit: "سال", type: "number", default: "25", help: "15 سے 100 سال تک۔" },
    { id: "weight", label: "وزن", unit: "kg", type: "number", default: "70" },
    { id: "height", label: "قد", unit: "cm", type: "number", default: "175" },
    { id: "activity", label: "جسمانی سرگرمی کی سطح", type: "select", default: "1.55", options: [["1.2", "کم متحرک (1.2)"], ["1.375", "ہلکی سرگرمی (1.375)"], ["1.55", "معتدل سرگرمی (1.55)"], ["1.725", "زیادہ سرگرمی (1.725)"], ["1.9", "بہت زیادہ سرگرمی (1.9)"]] },
    { id: "goal", label: "ہدف", type: "select", default: "0", options: [["-500", "وزن کم کرنا (−500 kcal)"], ["0", "وزن برقرار رکھنا"], ["300", "وزن بڑھانا (+300 kcal)"]] }
  ],
  example: { values: { sex: "male", age: "25", weight: "70", height: "175", activity: "1.55", goal: "0" }, expect: ["1673.75"], note: "مثال: مرد، 25 سال، 70 kg، 175 cm، معتدل سرگرمی۔" },
  invalid: { values: { sex: "male", age: "10", weight: "70", height: "175", activity: "1.55", goal: "0" } },
  related: ["fertilizer-npk", "irrigation"]
};

export function solve(input) {
  const sex = choice(input, "sex", "جنس", ["male", "female"], "male");
  const male = sex === "male";
  const age = num(input, "age", "عمر", { min: 15, max: 100 });
  const w = num(input, "weight", "وزن", { positive: true });
  const h = num(input, "height", "قد", { positive: true });
  const act = Number(choice(input, "activity", "جسمانی سرگرمی کی سطح", ["1.2", "1.375", "1.55", "1.725", "1.9"], "1.55"));
  const goal = Number(choice(input, "goal", "ہدف", ["-500", "0", "300"], "0"));
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
    { text: "Mifflin–St Jeor مساوات:", tex: `BMR = 10w + 6.25h - 5a ${sign}` },
    { text: "قدریں رکھنے سے:", tex: `BMR = 10 \\times ${ntex(w)} + 6.25 \\times ${ntex(h)} - 5 \\times ${ntex(age)} ${sign} = ${ntex(mifflin, 6)}\\ kcal` },
    { text: "سرگرمی کے ساتھ روزانہ کی ضرورت:", tex: `TDEE = ${ntex(mifflin, 6)} \\times ${ntex(act)} = ${ntex(tdee, 6)}\\ kcal` },
    { text: "مطلوبہ کیلوریز:", tex: `${ntex(tdee, 6)} ${goal < 0 ? "-" : "+"} ${ntex(Math.abs(goal))} = ${ntex(target, 6)}\\ kcal` },
    { text: "مطلوبہ کیلوریز پر میکروز کی تقسیم (پروٹین 4، چکنائی 9، کاربوہائیڈریٹس 4 kcal فی گرام):", tex: `P = \\frac{${ntex(target, 6)} \\times 0.25}{4} = ${ntex(protein, 6)}\\ g,\\quad F = \\frac{${ntex(target, 6)} \\times 0.30}{9} = ${ntex(fat, 6)}\\ g,\\quad C = \\frac{${ntex(target, 6)} \\times 0.45}{4} = ${ntex(carbs, 6)}\\ g` },
    { text: "پانی (35 mL فی kg):", tex: `${ntex(w)} \\times 35 = ${ntex(water, 6)}\\ mL` }
  ];
  return {
    results: [
      { label: "بنیادی میٹابولک ریٹ (Mifflin–St Jeor)", value: `${fmt(mifflin, 6)} kcal/دن`, text: `BMR (Mifflin) = ${fmt(mifflin, 6)} kcal` },
      { label: "بنیادی میٹابولک ریٹ (Harris–Benedict)", value: `${fmt(hb, 6)} kcal/دن` },
      { label: "روزانہ کی ضرورت TDEE (Mifflin)", value: `${fmt(tdee, 6)} kcal/دن` },
      { label: "مطلوبہ کیلوریز (Mifflin)", value: `${fmt(target, 6)} kcal/دن`, text: `ہدف = ${fmt(target, 6)} kcal` },
      { label: "مطلوبہ کیلوریز (Harris–Benedict)", value: `${fmt(targetHb, 6)} kcal/دن` },
      { label: "پانی کی ضرورت", value: `${fmt(water, 4)} mL (${fmt(water / 1000, 3)} L)` }
    ],
    steps,
    copy: `BMR (Mifflin) = ${fmt(mifflin, 6)} kcal، روزانہ ہدف = ${fmt(target, 6)} kcal، پانی ${fmt(water / 1000, 3)} لیٹر`,
    blocks: [
      {
        type: "table",
        caption: "مطلوبہ کیلوریز کے لیے میکروز کی تقسیم",
        head: ["جزو", "فیصد", "کیلوریز (kcal)", "یومیہ گرام"],
        rows: [
          ["پروٹین", "25 %", fmt(target * 0.25, 5), fmt(protein, 5) + " g"],
          ["چکنائی", "30 %", fmt(target * 0.30, 5), fmt(fat, 5) + " g"],
          ["کاربوہائیڈریٹس", "45 %", fmt(target * 0.45, 5), fmt(carbs, 5) + " g"]
        ]
      }
    ],
    values: { mifflin, hb, tdee, target, tdeeHb, targetHb, protein, fat, carbs, water }
  };
}
