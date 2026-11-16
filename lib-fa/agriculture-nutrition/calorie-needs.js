import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "محاسبه نرخ متابولیسم پایه و نیاز روزانه کالری با معادلات Mifflin–St Jeor و Harris–Benedict، سپس هدف برای کاهش وزن یا حفظ یا افزایش وزن، همراه با توزیع پروتئین و چربی و کربوهیدرات و آب.",
  keywords: ["کالری", "BMR", "TDEE", "نرخ متابولیسم", "Mifflin", "Harris-Benedict", "ماکرو", "نیاز آبی", "calories"],
  formulas: [
    { label: "Mifflin–St Jeor", tex: "BMR = 10w + 6.25h - 5a + \\begin{cases} 5 & \\text{مرد} \\\\ -161 & \\text{زن} \\end{cases}" },
    { label: "Harris–Benedict اصلاح‌شده", tex: "BMR_{m} = 88.362 + 13.397w + 4.799h - 5.677a,\\quad BMR_{f} = 447.593 + 9.247w + 3.098h - 4.330a" },
    { label: "نیاز روزانه و هدف", tex: "TDEE = BMR \\times k_{activity},\\qquad \\text{Target} = TDEE + \\Delta" }
  ],
  inputs: [
    { id: "sex", label: "جنسیت", type: "select", default: "male", options: [["male", "مرد"], ["female", "زن"]] },
    { id: "age", label: "سن", unit: "سال", type: "number", default: "25", help: "از 15 تا 100 سال." },
    { id: "weight", label: "وزن", unit: "kg", type: "number", default: "70" },
    { id: "height", label: "قد", unit: "cm", type: "number", default: "175" },
    { id: "activity", label: "سطح فعالیت", type: "select", default: "1.55", options: [["1.2", "کم‌تحرک (1.2)"], ["1.375", "فعالیت سبک (1.375)"], ["1.55", "فعالیت متوسط (1.55)"], ["1.725", "فعالیت زیاد (1.725)"], ["1.9", "فعالیت خیلی زیاد (1.9)"]] },
    { id: "goal", label: "هدف", type: "select", default: "0", options: [["-500", "کاهش وزن (−500 kcal)"], ["0", "حفظ وزن"], ["300", "افزایش وزن (+300 kcal)"]] }
  ],
  example: { values: { sex: "male", age: "25", weight: "70", height: "175", activity: "1.55", goal: "0" }, expect: ["1673.75"], note: "مثال: مرد 25 ساله، 70 کیلوگرم، 175 سانتی‌متر، فعالیت متوسط." },
  invalid: { values: { sex: "male", age: "10", weight: "70", height: "175", activity: "1.55", goal: "0" } },
  related: ["fertilizer-npk", "irrigation"]
};

export function solve(input) {
  const sex = choice(input, "sex", "جنسیت", ["male", "female"], "male");
  const male = sex === "male";
  const age = num(input, "age", "سن", { min: 15, max: 100 });
  const w = num(input, "weight", "وزن", { positive: true });
  const h = num(input, "height", "قد", { positive: true });
  const act = Number(choice(input, "activity", "سطح فعالیت", ["1.2", "1.375", "1.55", "1.725", "1.9"], "1.55"));
  const goal = Number(choice(input, "goal", "هدف", ["-500", "0", "300"], "0"));
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
    { text: "معادله Mifflin–St Jeor:", tex: `BMR = 10w + 6.25h - 5a ${sign}` },
    { text: "با جایگذاری:", tex: `BMR = 10 \\times ${ntex(w)} + 6.25 \\times ${ntex(h)} - 5 \\times ${ntex(age)} ${sign} = ${ntex(mifflin, 6)}\\ kcal` },
    { text: "نیاز روزانه با فعالیت:", tex: `TDEE = ${ntex(mifflin, 6)} \\times ${ntex(act)} = ${ntex(tdee, 6)}\\ kcal` },
    { text: "کالری هدف:", tex: `${ntex(tdee, 6)} ${goal < 0 ? "-" : "+"} ${ntex(Math.abs(goal))} = ${ntex(target, 6)}\\ kcal` },
    { text: "توزیع ماکروها در کالری هدف (پروتئین 4، چربی 9، کربوهیدرات 4 کیلوکالری به ازای هر گرم):", tex: `P = \\frac{${ntex(target, 6)} \\times 0.25}{4} = ${ntex(protein, 6)}\\ g,\\quad F = \\frac{${ntex(target, 6)} \\times 0.30}{9} = ${ntex(fat, 6)}\\ g,\\quad C = \\frac{${ntex(target, 6)} \\times 0.45}{4} = ${ntex(carbs, 6)}\\ g` },
    { text: "آب (35 میلی‌لیتر به ازای هر کیلوگرم):", tex: `${ntex(w)} \\times 35 = ${ntex(water, 6)}\\ mL` }
  ];
  return {
    results: [
      { label: "نرخ متابولیسم پایه (Mifflin–St Jeor)", value: `${fmt(mifflin, 6)} kcal/day`, text: `BMR (Mifflin) = ${fmt(mifflin, 6)} kcal` },
      { label: "نرخ متابولیسم پایه (Harris–Benedict)", value: `${fmt(hb, 6)} kcal/day` },
      { label: "نیاز روزانه TDEE (Mifflin)", value: `${fmt(tdee, 6)} kcal/day` },
      { label: "کالری هدف (Mifflin)", value: `${fmt(target, 6)} kcal/day`, text: `هدف = ${fmt(target, 6)} kcal` },
      { label: "کالری هدف (Harris–Benedict)", value: `${fmt(targetHb, 6)} kcal/day` },
      { label: "نیاز آبی", value: `${fmt(water, 4)} میلی‌لیتر (${fmt(water / 1000, 3)} لیتر)` }
    ],
    steps,
    copy: `BMR (Mifflin) = ${fmt(mifflin, 6)} kcal، هدف روزانه = ${fmt(target, 6)} kcal، آب ${fmt(water / 1000, 3)} لیتر`,
    blocks: [
      {
        type: "table",
        caption: "توزیع ماکروها برای کالری هدف",
        head: ["مؤلفه", "درصد", "کالری (kcal)", "گرم در روز"],
        rows: [
          ["پروتئین", "25 %", fmt(target * 0.25, 5), fmt(protein, 5) + " g"],
          ["چربی", "30 %", fmt(target * 0.30, 5), fmt(fat, 5) + " g"],
          ["کربوهیدرات", "45 %", fmt(target * 0.45, 5), fmt(carbs, 5) + " g"]
        ]
      }
    ],
    values: { mifflin, hb, tdee, target, tdeeHb, targetHb, protein, fat, carbs, water }
  };
}
