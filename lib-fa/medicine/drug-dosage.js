import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "صرفاً برای آموزش و تمرین است و جایگزین پزشک، داروساز یا پروتکل معتبر مؤسسهٔ شما نیست." };

export const meta = {
  description: "دوز تکی و روزانهٔ یک دارو بر حسب میلی‌گرم به ازای هر کیلوگرم وزن، و حجم دارویی که باید از غلظت ذخیره کشیده شود را محاسبه کنید، با امکان محدود کردن دوز به سقف مشخص.",
  keywords: ["دوز دارو", "mg/kg", "محاسبهٔ دوز", "حداکثر دوز", "drug dosage", "dose calculation", "غلظت ذخیره"],
  formulas: [
    { label: "دوز تکی", tex: "D = W \\times d_{kg}" },
    { label: "دوز روزانه", tex: "D_{day} = D \\times f" },
    { label: "حجم دارو برای هر دوز", tex: "V = \\frac{D}{C_{mg}} \\times V_{mL}" }
  ],
  inputs: [
    { id: "weight", label: "وزن بیمار", unit: "kg", type: "number", default: "20" },
    { id: "dosePerKg", label: "دوز تجویزی به ازای هر کیلوگرم", unit: "mg/kg", type: "number", default: "15" },
    { id: "basis", label: "مبنای دوز تجویزی", type: "select", default: "dose", options: [["dose", "به ازای هر دوز"], ["day", "به ازای هر روز"]] },
    { id: "freq", label: "تعداد دوز در روز", type: "number", default: "4", help: "عدد صحیح از 1 تا 24." },
    { id: "stockMg", label: "مقدار دارو در ذخیره", unit: "mg", type: "number", default: "250" },
    { id: "stockMl", label: "حجم ذخیره", unit: "mL", type: "number", default: "5", help: "مثال: 250 mg در 5 mL." },
    { id: "maxDose", label: "حداکثر دوز تکی (اختیاری)", unit: "mg", type: "number", help: "اگر حداکثری وجود ندارد، خالی بگذارید." }
  ],
  example: { values: { weight: "20", dosePerKg: "15", basis: "dose", freq: "4", stockMg: "250", stockMl: "5", maxDose: "" }, expect: ["300 mg", "6 mL"], note: "مثال: کودکی 20 کیلوگرمی، دوز 15 mg/kg برای هر دوز، و دارویی 250 mg در 5 mL." },
  invalid: { values: { weight: "0", dosePerKg: "15", basis: "dose", freq: "4", stockMg: "250", stockMl: "5", maxDose: "" } },
  related: ["iv-drip-rate", "bmi-bsa", "creatinine-clearance", "lab-units", "fluid-requirements"]
};

export function solve(input) {
  const w = num(input, "weight", "وزن", { positive: true, max: 500 });
  const mgkg = num(input, "dosePerKg", "دوز به ازای هر کیلوگرم", { positive: true });
  const basis = choice(input, "basis", "مبنای دوز", ["dose", "day"], "dose");
  const freq = num(input, "freq", "تعداد دوز در روز", { integer: true, min: 1, max: 24 });
  const stockMg = num(input, "stockMg", "مقدار دارو در ذخیره", { positive: true });
  const stockMl = num(input, "stockMl", "حجم ذخیره", { positive: true });
  const maxDose = num(input, "maxDose", "حداکثر دوز", { positive: true, optional: true });

  const rawDaily = basis === "dose" ? w * mgkg * freq : w * mgkg;
  const rawSingle = rawDaily / freq;
  const capped = maxDose !== null && rawSingle > maxDose;
  const single = capped ? maxDose : rawSingle;
  const daily = single * freq;
  const vol = (single / stockMg) * stockMl;

  const steps = [];
  if (basis === "dose") {
    steps.push({ text: "دوز تکی = وزن × دوز به ازای هر کیلوگرم:", tex: `D = ${ntex(w)} \\times ${ntex(mgkg)} = ${ntex(rawSingle, 6)}\\ mg` });
  } else {
    steps.push({ text: "دوز روزانه = وزن × دوز به ازای هر کیلوگرم:", tex: `D_{day} = ${ntex(w)} \\times ${ntex(mgkg)} = ${ntex(rawDaily, 6)}\\ mg` });
    steps.push({ text: "دوز تکی = دوز روزانه ÷ تعداد دوزها:", tex: `D = \\frac{${ntex(rawDaily, 6)}}{${freq}} = ${ntex(rawSingle, 6)}\\ mg` });
  }
  if (capped) steps.push({ text: "دوز از حداکثر بیشتر است، پس از حداکثر استفاده می‌کنیم:", tex: `D = ${ntex(maxDose)}\\ mg` });
  steps.push({ text: "دوز روزانه = دوز تکی × تعداد دوزها:", tex: `D_{day} = ${ntex(single, 6)} \\times ${freq} = ${ntex(daily, 6)}\\ mg` });
  steps.push({ text: "حجم دارو برای هر دوز:", tex: `V = \\frac{${ntex(single, 6)}}{${ntex(stockMg)}} \\times ${ntex(stockMl)} = ${ntex(vol, 6)}\\ mL` });

  const blocks = [NOTE];
  if (capped) blocks.unshift({ type: "note", tone: "warn", text: `دوز در سقف ${fmt(maxDose)} mg محدود شد، زیرا محاسبه از آن بیشتر بود، بنابراین دوز روزانه هم کاهش یافت.` });

  return {
    results: [
      { label: "دوز تکی", value: `${fmt(single, 6)} mg`, text: `${fmt(single, 6)} mg` },
      { label: "دوز روزانه", value: `${fmt(daily, 6)} mg` },
      { label: "حجم دارو برای هر دوز", value: `${fmt(vol, 4)} mL`, text: `${fmt(vol, 4)} mL` }
    ],
    steps,
    blocks,
    copy: `دوز تکی ${fmt(single, 6)} mg، یعنی ${fmt(vol, 4)} mL برای هر دوز، و دوز روزانه ${fmt(daily, 6)} mg`
  };
}
