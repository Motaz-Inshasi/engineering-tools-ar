import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Menghitung laju metabolisme basal dan kebutuhan kalori harian dengan persamaan Mifflin–St Jeor dan Harris–Benedict, lalu target untuk penurunan, pemeliharaan, atau kenaikan berat badan, dengan pembagian protein, lemak, karbohidrat, dan air.",
  keywords: ["kalori", "BMR", "TDEE", "laju metabolisme", "Mifflin", "Harris-Benedict", "makronutrien", "kebutuhan air", "calories"],
  formulas: [
    { label: "Mifflin–St Jeor", tex: "BMR = 10w + 6.25h - 5a + \\begin{cases} 5 & \\text{pria} \\\\ -161 & \\text{wanita} \\end{cases}" },
    { label: "Harris–Benedict yang direvisi", tex: "BMR_{m} = 88.362 + 13.397w + 4.799h - 5.677a,\\quad BMR_{f} = 447.593 + 9.247w + 3.098h - 4.330a" },
    { label: "Kebutuhan harian dan target", tex: "TDEE = BMR \\times k_{activity},\\qquad \\text{Target} = TDEE + \\Delta" }
  ],
  inputs: [
    { id: "sex", label: "Jenis kelamin", type: "select", default: "male", options: [["male", "Pria"], ["female", "Wanita"]] },
    { id: "age", label: "Usia", unit: "tahun", type: "number", default: "25", help: "Dari 15 hingga 100 tahun." },
    { id: "weight", label: "Berat badan", unit: "kg", type: "number", default: "70" },
    { id: "height", label: "Tinggi badan", unit: "cm", type: "number", default: "175" },
    { id: "activity", label: "Tingkat aktivitas", type: "select", default: "1.55", options: [["1.2", "Tidak aktif (1.2)"], ["1.375", "Aktivitas ringan (1.375)"], ["1.55", "Aktivitas sedang (1.55)"], ["1.725", "Aktivitas tinggi (1.725)"], ["1.9", "Aktivitas sangat tinggi (1.9)"]] },
    { id: "goal", label: "Tujuan", type: "select", default: "0", options: [["-500", "Penurunan berat badan (−500 kcal)"], ["0", "Pemeliharaan berat badan"], ["300", "Kenaikan berat badan (+300 kcal)"]] }
  ],
  example: { values: { sex: "male", age: "25", weight: "70", height: "175", activity: "1.55", goal: "0" }, expect: ["1673.75"], note: "Contoh: pria 25 tahun, 70 kg, 175 cm, aktivitas sedang." },
  invalid: { values: { sex: "male", age: "10", weight: "70", height: "175", activity: "1.55", goal: "0" } },
  related: ["fertilizer-npk", "irrigation"]
};

export function solve(input) {
  const sex = choice(input, "sex", "Jenis kelamin", ["male", "female"], "male");
  const male = sex === "male";
  const age = num(input, "age", "Usia", { min: 15, max: 100 });
  const w = num(input, "weight", "Berat badan", { positive: true });
  const h = num(input, "height", "Tinggi badan", { positive: true });
  const act = Number(choice(input, "activity", "Tingkat aktivitas", ["1.2", "1.375", "1.55", "1.725", "1.9"], "1.55"));
  const goal = Number(choice(input, "goal", "Tujuan", ["-500", "0", "300"], "0"));
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
    { text: "Persamaan Mifflin–St Jeor:", tex: `BMR = 10w + 6.25h - 5a ${sign}` },
    { text: "Dengan substitusi:", tex: `BMR = 10 \\times ${ntex(w)} + 6.25 \\times ${ntex(h)} - 5 \\times ${ntex(age)} ${sign} = ${ntex(mifflin, 6)}\\ kcal` },
    { text: "Kebutuhan harian dengan aktivitas:", tex: `TDEE = ${ntex(mifflin, 6)} \\times ${ntex(act)} = ${ntex(tdee, 6)}\\ kcal` },
    { text: "Kalori target:", tex: `${ntex(tdee, 6)} ${goal < 0 ? "-" : "+"} ${ntex(Math.abs(goal))} = ${ntex(target, 6)}\\ kcal` },
    { text: "Pembagian makronutrien dari kalori target (protein 4, lemak 9, karbohidrat 4 kcal per gram):", tex: `P = \\frac{${ntex(target, 6)} \\times 0.25}{4} = ${ntex(protein, 6)}\\ g,\\quad F = \\frac{${ntex(target, 6)} \\times 0.30}{9} = ${ntex(fat, 6)}\\ g,\\quad C = \\frac{${ntex(target, 6)} \\times 0.45}{4} = ${ntex(carbs, 6)}\\ g` },
    { text: "Air (35 mL per kg):", tex: `${ntex(w)} \\times 35 = ${ntex(water, 6)}\\ mL` }
  ];
  return {
    results: [
      { label: "Laju metabolisme basal (Mifflin–St Jeor)", value: `${fmt(mifflin, 6)} kcal/hari`, text: `BMR (Mifflin) = ${fmt(mifflin, 6)} kcal` },
      { label: "Laju metabolisme basal (Harris–Benedict)", value: `${fmt(hb, 6)} kcal/hari` },
      { label: "Kebutuhan harian TDEE (Mifflin)", value: `${fmt(tdee, 6)} kcal/hari` },
      { label: "Kalori target (Mifflin)", value: `${fmt(target, 6)} kcal/hari`, text: `Target = ${fmt(target, 6)} kcal` },
      { label: "Kalori target (Harris–Benedict)", value: `${fmt(targetHb, 6)} kcal/hari` },
      { label: "kebutuhan air", value: `${fmt(water, 4)} mL (${fmt(water / 1000, 3)} L)` }
    ],
    steps,
    copy: `BMR (Mifflin) = ${fmt(mifflin, 6)} kcal, target harian = ${fmt(target, 6)} kcal, air ${fmt(water / 1000, 3)} L`,
    blocks: [
      {
        type: "table",
        caption: "Pembagian makronutrien untuk kalori target",
        head: ["Komponen", "Persentase", "Kalori (kcal)", "Gram per hari"],
        rows: [
          ["Protein", "25 %", fmt(target * 0.25, 5), fmt(protein, 5) + " g"],
          ["Lemak", "30 %", fmt(target * 0.30, 5), fmt(fat, 5) + " g"],
          ["Karbohidrat", "45 %", fmt(target * 0.45, 5), fmt(carbs, 5) + " g"]
        ]
      }
    ],
    values: { mifflin, hb, tdee, target, tdeeHb, targetHb, protein, fat, carbs, water }
  };
}
