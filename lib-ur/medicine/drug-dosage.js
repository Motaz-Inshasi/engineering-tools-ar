import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "صرف تعلیم اور تربیت کے لیے ہے، یہ آپ کے معالج، فارماسسٹ یا آپ کے ادارے کے منظور شدہ پروٹوکول کا متبادل نہیں ہے۔" };

export const meta = {
  description: "کسی دوا کی فی جسمانی وزن کلوگرام ملی گرام کے حساب سے ایک خوراک اور یومیہ خوراک حساب کریں، اور اسٹاک کے ارتکاز سے نکالی جانے والی دوا کی مقدار معلوم کریں، ساتھ خوراک کو زیادہ سے زیادہ حد تک محدود کرنے کا اختیار۔",
  keywords: ["دوا کی خوراک", "mg/kg", "خوراک کا حساب", "زیادہ سے زیادہ خوراک", "drug dosage", "dose calculation", "اسٹاک کا ارتکاز"],
  formulas: [
    { label: "ایک خوراک", tex: "D = W \\times d_{kg}" },
    { label: "یومیہ خوراک", tex: "D_{day} = D \\times f" },
    { label: "فی خوراک دوا کی مقدار", tex: "V = \\frac{D}{C_{mg}} \\times V_{mL}" }
  ],
  inputs: [
    { id: "weight", label: "مریض کا وزن", unit: "kg", type: "number", default: "20" },
    { id: "dosePerKg", label: "فی کلوگرام تجویز کردہ خوراک", unit: "mg/kg", type: "number", default: "15" },
    { id: "basis", label: "تجویز کردہ خوراک کی بنیاد", type: "select", default: "dose", options: [["dose", "فی خوراک"], ["day", "فی دن"]] },
    { id: "freq", label: "یومیہ خوراکوں کی تعداد", type: "number", default: "4", help: "1 سے 24 تک صحیح عدد۔" },
    { id: "stockMg", label: "اسٹاک میں دوا کی مقدار", unit: "mg", type: "number", default: "250" },
    { id: "stockMl", label: "اسٹاک کا حجم", unit: "mL", type: "number", default: "5", help: "مثال: 5 mL میں 250 mg۔" },
    { id: "maxDose", label: "ایک خوراک کی زیادہ سے زیادہ حد (اختیاری)", unit: "mg", type: "number", help: "اگر کوئی زیادہ سے زیادہ حد نہ ہو تو خالی چھوڑ دیں۔" }
  ],
  example: { values: { weight: "20", dosePerKg: "15", basis: "dose", freq: "4", stockMg: "250", stockMl: "5", maxDose: "" }, expect: ["300 mg", "6 mL"], note: "مثال: 20 kg وزن والا بچہ، فی خوراک 15 mg/kg، اور 5 mL میں 250 mg والی دوا۔" },
  invalid: { values: { weight: "0", dosePerKg: "15", basis: "dose", freq: "4", stockMg: "250", stockMl: "5", maxDose: "" } },
  related: ["iv-drip-rate", "bmi-bsa", "creatinine-clearance", "lab-units", "fluid-requirements"]
};

export function solve(input) {
  const w = num(input, "weight", "وزن", { positive: true, max: 500 });
  const mgkg = num(input, "dosePerKg", "فی کلوگرام خوراک", { positive: true });
  const basis = choice(input, "basis", "خوراک کی بنیاد", ["dose", "day"], "dose");
  const freq = num(input, "freq", "یومیہ خوراکوں کی تعداد", { integer: true, min: 1, max: 24 });
  const stockMg = num(input, "stockMg", "اسٹاک میں دوا کی مقدار", { positive: true });
  const stockMl = num(input, "stockMl", "اسٹاک کا حجم", { positive: true });
  const maxDose = num(input, "maxDose", "زیادہ سے زیادہ خوراک", { positive: true, optional: true });

  const rawDaily = basis === "dose" ? w * mgkg * freq : w * mgkg;
  const rawSingle = rawDaily / freq;
  const capped = maxDose !== null && rawSingle > maxDose;
  const single = capped ? maxDose : rawSingle;
  const daily = single * freq;
  const vol = (single / stockMg) * stockMl;

  const steps = [];
  if (basis === "dose") {
    steps.push({ text: "ایک خوراک = وزن × فی کلوگرام خوراک:", tex: `D = ${ntex(w)} \\times ${ntex(mgkg)} = ${ntex(rawSingle, 6)}\\ mg` });
  } else {
    steps.push({ text: "یومیہ خوراک = وزن × فی کلوگرام خوراک:", tex: `D_{day} = ${ntex(w)} \\times ${ntex(mgkg)} = ${ntex(rawDaily, 6)}\\ mg` });
    steps.push({ text: "ایک خوراک = یومیہ خوراک ÷ خوراکوں کی تعداد:", tex: `D = \\frac{${ntex(rawDaily, 6)}}{${freq}} = ${ntex(rawSingle, 6)}\\ mg` });
  }
  if (capped) steps.push({ text: "خوراک زیادہ سے زیادہ حد سے بڑھ گئی ہے، اس لیے ہم زیادہ سے زیادہ حد استعمال کرتے ہیں:", tex: `D = ${ntex(maxDose)}\\ mg` });
  steps.push({ text: "یومیہ خوراک = ایک خوراک × خوراکوں کی تعداد:", tex: `D_{day} = ${ntex(single, 6)} \\times ${freq} = ${ntex(daily, 6)}\\ mg` });
  steps.push({ text: "فی خوراک دوا کی مقدار:", tex: `V = \\frac{${ntex(single, 6)}}{${ntex(stockMg)}} \\times ${ntex(stockMl)} = ${ntex(vol, 6)}\\ mL` });

  const blocks = [NOTE];
  if (capped) blocks.unshift({ type: "note", tone: "warn", text: `حساب زیادہ سے زیادہ حد ${fmt(maxDose)} mg سے بڑھ گیا تھا، اس لیے خوراک اس حد تک محدود کر دی گئی اور یومیہ خوراک بھی کم کر دی گئی۔` });

  return {
    results: [
      { label: "ایک خوراک", value: `${fmt(single, 6)} mg`, text: `${fmt(single, 6)} mg` },
      { label: "یومیہ خوراک", value: `${fmt(daily, 6)} mg` },
      { label: "فی خوراک دوا کی مقدار", value: `${fmt(vol, 4)} mL`, text: `${fmt(vol, 4)} mL` }
    ],
    steps,
    blocks,
    copy: `ایک خوراک ${fmt(single, 6)} mg، یعنی فی خوراک ${fmt(vol, 4)} mL، اور یومیہ خوراک ${fmt(daily, 6)} mg`
  };
}
