import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "احسب معدل الأيض الأساسي والاحتياج اليومي من السعرات بمعادلتي Mifflin–St Jeor وHarris–Benedict، ثم الهدف حسب التخسيس أو الحفاظ أو الزيادة، مع توزيع البروتين والدهون والكربوهيدرات والماء.",
  keywords: ["سعرات حرارية", "BMR", "TDEE", "معدل الأيض", "Mifflin", "Harris-Benedict", "ماكرو", "احتياج الماء", "calories"],
  formulas: [
    { label: "Mifflin–St Jeor", tex: "BMR = 10w + 6.25h - 5a + \\begin{cases} 5 & \\text{ذكر} \\\\ -161 & \\text{أنثى} \\end{cases}" },
    { label: "Harris–Benedict المعدلة", tex: "BMR_{m} = 88.362 + 13.397w + 4.799h - 5.677a,\\quad BMR_{f} = 447.593 + 9.247w + 3.098h - 4.330a" },
    { label: "الاحتياج اليومي والهدف", tex: "TDEE = BMR \\times k_{activity},\\qquad \\text{Target} = TDEE + \\Delta" }
  ],
  inputs: [
    { id: "sex", label: "الجنس", type: "select", default: "male", options: [["male", "ذكر"], ["female", "أنثى"]] },
    { id: "age", label: "العمر", unit: "سنة", type: "number", default: "25", help: "من 15 إلى 100 سنة." },
    { id: "weight", label: "الوزن", unit: "kg", type: "number", default: "70" },
    { id: "height", label: "الطول", unit: "cm", type: "number", default: "175" },
    { id: "activity", label: "مستوى النشاط", type: "select", default: "1.55", options: [["1.2", "خامل (1.2)"], ["1.375", "نشاط خفيف (1.375)"], ["1.55", "نشاط متوسط (1.55)"], ["1.725", "نشاط عالٍ (1.725)"], ["1.9", "نشاط عالٍ جداً (1.9)"]] },
    { id: "goal", label: "الهدف", type: "select", default: "0", options: [["-500", "تخسيس (−500 kcal)"], ["0", "الحفاظ على الوزن"], ["300", "زيادة الوزن (+300 kcal)"]] }
  ],
  example: { values: { sex: "male", age: "25", weight: "70", height: "175", activity: "1.55", goal: "0" }, expect: ["1673.75"], note: "مثال: ذكر 25 سنة، 70 kg، 175 cm، نشاط متوسط." },
  invalid: { values: { sex: "male", age: "10", weight: "70", height: "175", activity: "1.55", goal: "0" } },
  related: ["fertilizer-npk", "irrigation"]
};

export function solve(input) {
  const sex = choice(input, "sex", "الجنس", ["male", "female"], "male");
  const male = sex === "male";
  const age = num(input, "age", "العمر", { min: 15, max: 100 });
  const w = num(input, "weight", "الوزن", { positive: true });
  const h = num(input, "height", "الطول", { positive: true });
  const act = Number(choice(input, "activity", "مستوى النشاط", ["1.2", "1.375", "1.55", "1.725", "1.9"], "1.55"));
  const goal = Number(choice(input, "goal", "الهدف", ["-500", "0", "300"], "0"));
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
    { text: "معادلة Mifflin–St Jeor:", tex: `BMR = 10w + 6.25h - 5a ${sign}` },
    { text: "بالتعويض:", tex: `BMR = 10 \\times ${ntex(w)} + 6.25 \\times ${ntex(h)} - 5 \\times ${ntex(age)} ${sign} = ${ntex(mifflin, 6)}\\ kcal` },
    { text: "الاحتياج اليومي مع النشاط:", tex: `TDEE = ${ntex(mifflin, 6)} \\times ${ntex(act)} = ${ntex(tdee, 6)}\\ kcal` },
    { text: "السعرات المستهدفة:", tex: `${ntex(tdee, 6)} ${goal < 0 ? "-" : "+"} ${ntex(Math.abs(goal))} = ${ntex(target, 6)}\\ kcal` },
    { text: "توزيع الماكروز على السعرات المستهدفة (بروتين 4، دهون 9، كربوهيدرات 4 kcal لكل غرام):", tex: `P = \\frac{${ntex(target, 6)} \\times 0.25}{4} = ${ntex(protein, 6)}\\ g,\\quad F = \\frac{${ntex(target, 6)} \\times 0.30}{9} = ${ntex(fat, 6)}\\ g,\\quad C = \\frac{${ntex(target, 6)} \\times 0.45}{4} = ${ntex(carbs, 6)}\\ g` },
    { text: "الماء (35 mL لكل كغ):", tex: `${ntex(w)} \\times 35 = ${ntex(water, 6)}\\ mL` }
  ];
  return {
    results: [
      { label: "معدل الأيض الأساسي (Mifflin–St Jeor)", value: `${fmt(mifflin, 6)} kcal/يوم`, text: `BMR (Mifflin) = ${fmt(mifflin, 6)} kcal` },
      { label: "معدل الأيض الأساسي (Harris–Benedict)", value: `${fmt(hb, 6)} kcal/يوم` },
      { label: "الاحتياج اليومي TDEE (Mifflin)", value: `${fmt(tdee, 6)} kcal/يوم` },
      { label: "السعرات المستهدفة (Mifflin)", value: `${fmt(target, 6)} kcal/يوم`, text: `الهدف = ${fmt(target, 6)} kcal` },
      { label: "السعرات المستهدفة (Harris–Benedict)", value: `${fmt(targetHb, 6)} kcal/يوم` },
      { label: "احتياج الماء", value: `${fmt(water, 4)} مل (${fmt(water / 1000, 3)} لتر)` }
    ],
    steps,
    copy: `BMR (Mifflin) = ${fmt(mifflin, 6)} kcal، الهدف اليومي = ${fmt(target, 6)} kcal، الماء ${fmt(water / 1000, 3)} لتر`,
    blocks: [
      {
        type: "table",
        caption: "توزيع الماكروز للسعرات المستهدفة",
        head: ["العنصر", "النسبة", "السعرات (kcal)", "الجرامات يومياً"],
        rows: [
          ["البروتين", "25 %", fmt(target * 0.25, 5), fmt(protein, 5) + " g"],
          ["الدهون", "30 %", fmt(target * 0.30, 5), fmt(fat, 5) + " g"],
          ["الكربوهيدرات", "45 %", fmt(target * 0.45, 5), fmt(carbs, 5) + " g"]
        ]
      }
    ],
    values: { mifflin, hb, tdee, target, tdeeHb, targetHb, protein, fat, carbs, water }
  };
}
