import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Temel metabolizma hızını Mifflin–St Jeor ve Harris–Benedict denklemleriyle hesaplayın, ardından kilo verme, koruma veya kilo alma hedefine göre günlük kalori ihtiyacını bulun; protein, yağ, karbonhidrat ve su dağılımını gösterin.",
  keywords: ["kalori", "BMR", "TDEE", "metabolizma hızı", "Mifflin", "Harris-Benedict", "makro", "su ihtiyacı", "calories"],
  formulas: [
    { label: "Mifflin–St Jeor", tex: "BMR = 10w + 6.25h - 5a + \\begin{cases} 5 & \\text{erkek} \\\\ -161 & \\text{kadın} \\end{cases}" },
    { label: "Düzeltilmiş Harris–Benedict", tex: "BMR_{m} = 88.362 + 13.397w + 4.799h - 5.677a,\\quad BMR_{f} = 447.593 + 9.247w + 3.098h - 4.330a" },
    { label: "Günlük ihtiyaç ve hedef", tex: "TDEE = BMR \\times k_{activity},\\qquad \\text{Target} = TDEE + \\Delta" }
  ],
  inputs: [
    { id: "sex", label: "Cinsiyet", type: "select", default: "male", options: [["male", "Erkek"], ["female", "Kadın"]] },
    { id: "age", label: "Yaş", unit: "yıl", type: "number", default: "25", help: "15 ile 100 yıl arası." },
    { id: "weight", label: "Kilo", unit: "kg", type: "number", default: "70" },
    { id: "height", label: "Boy", unit: "cm", type: "number", default: "175" },
    { id: "activity", label: "Aktivite düzeyi", type: "select", default: "1.55", options: [["1.2", "Hareketsiz (1.2)"], ["1.375", "Hafif aktivite (1.375)"], ["1.55", "Orta aktivite (1.55)"], ["1.725", "Yüksek aktivite (1.725)"], ["1.9", "Çok yüksek aktivite (1.9)"]] },
    { id: "goal", label: "Hedef", type: "select", default: "0", options: [["-500", "Kilo verme (−500 kcal)"], ["0", "Kilo koruma"], ["300", "Kilo alma (+300 kcal)"]] }
  ],
  example: { values: { sex: "male", age: "25", weight: "70", height: "175", activity: "1.55", goal: "0" }, expect: ["1673.75"], note: "Örnek: 25 yaşında erkek, 70 kg, 175 cm, orta aktivite." },
  invalid: { values: { sex: "male", age: "10", weight: "70", height: "175", activity: "1.55", goal: "0" } },
  related: ["fertilizer-npk", "irrigation"]
};

export function solve(input) {
  const sex = choice(input, "sex", "Cinsiyet", ["male", "female"], "male");
  const male = sex === "male";
  const age = num(input, "age", "Yaş", { min: 15, max: 100 });
  const w = num(input, "weight", "Kilo", { positive: true });
  const h = num(input, "height", "Boy", { positive: true });
  const act = Number(choice(input, "activity", "Aktivite düzeyi", ["1.2", "1.375", "1.55", "1.725", "1.9"], "1.55"));
  const goal = Number(choice(input, "goal", "Hedef", ["-500", "0", "300"], "0"));
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
    { text: "Mifflin–St Jeor denklemi:", tex: `BMR = 10w + 6.25h - 5a ${sign}` },
    { text: "Yerine koyarak:", tex: `BMR = 10 \\times ${ntex(w)} + 6.25 \\times ${ntex(h)} - 5 \\times ${ntex(age)} ${sign} = ${ntex(mifflin, 6)}\\ kcal` },
    { text: "Aktiviteyle günlük ihtiyaç:", tex: `TDEE = ${ntex(mifflin, 6)} \\times ${ntex(act)} = ${ntex(tdee, 6)}\\ kcal` },
    { text: "Hedef kalori:", tex: `${ntex(tdee, 6)} ${goal < 0 ? "-" : "+"} ${ntex(Math.abs(goal))} = ${ntex(target, 6)}\\ kcal` },
    { text: "Hedef kaloriye göre makro dağılımı (protein 4, yağ 9, karbonhidrat 4 kcal her gram için):", tex: `P = \\frac{${ntex(target, 6)} \\times 0.25}{4} = ${ntex(protein, 6)}\\ g,\\quad F = \\frac{${ntex(target, 6)} \\times 0.30}{9} = ${ntex(fat, 6)}\\ g,\\quad C = \\frac{${ntex(target, 6)} \\times 0.45}{4} = ${ntex(carbs, 6)}\\ g` },
    { text: "Su (kg başına 35 mL):", tex: `${ntex(w)} \\times 35 = ${ntex(water, 6)}\\ mL` }
  ];
  return {
    results: [
      { label: "Temel metabolizma hızı (Mifflin–St Jeor)", value: `${fmt(mifflin, 6)} kcal/gün`, text: `BMR (Mifflin) = ${fmt(mifflin, 6)} kcal` },
      { label: "Temel metabolizma hızı (Harris–Benedict)", value: `${fmt(hb, 6)} kcal/gün` },
      { label: "Günlük ihtiyaç TDEE (Mifflin)", value: `${fmt(tdee, 6)} kcal/gün` },
      { label: "Hedef kalori (Mifflin)", value: `${fmt(target, 6)} kcal/gün`, text: `Hedef = ${fmt(target, 6)} kcal` },
      { label: "Hedef kalori (Harris–Benedict)", value: `${fmt(targetHb, 6)} kcal/gün` },
      { label: "su ihtiyacı", value: `${fmt(water, 4)} mL (${fmt(water / 1000, 3)} litre)` }
    ],
    steps,
    copy: `BMR (Mifflin) = ${fmt(mifflin, 6)} kcal, günlük hedef = ${fmt(target, 6)} kcal, su ${fmt(water / 1000, 3)} litre`,
    blocks: [
      {
        type: "table",
        caption: "Hedef kaloriye göre makro dağılımı",
        head: ["Öğe", "Oran", "Kalori (kcal)", "Günlük gram"],
        rows: [
          ["Protein", "25 %", fmt(target * 0.25, 5), fmt(protein, 5) + " g"],
          ["Yağ", "30 %", fmt(target * 0.30, 5), fmt(fat, 5) + " g"],
          ["Karbonhidrat", "45 %", fmt(target * 0.45, 5), fmt(carbs, 5) + " g"]
        ]
      }
    ],
    values: { mifflin, hb, tdee, target, tdeeHb, targetHb, protein, fat, carbs, water }
  };
}
