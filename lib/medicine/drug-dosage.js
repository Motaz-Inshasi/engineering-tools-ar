import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "للتعليم والتدريب فقط، ولا يغني عن الطبيب أو الصيدلي أو البروتوكول المعتمد في مؤسستك." };

export const meta = {
  description: "احسب الجرعة الواحدة واليومية لدواء بالمليغرام لكل كيلوغرام من الوزن، وحجم الدواء الواجب سحبه من تركيز المخزون، مع إمكانية تقييد الجرعة بحد أقصى.",
  keywords: ["جرعة الدواء", "mg/kg", "حساب الجرعات", "الحد الأقصى للجرعة", "drug dosage", "dose calculation", "تركيز المخزون"],
  formulas: [
    { label: "الجرعة الواحدة", tex: "D = W \\times d_{kg}" },
    { label: "الجرعة اليومية", tex: "D_{day} = D \\times f" },
    { label: "حجم الدواء لكل جرعة", tex: "V = \\frac{D}{C_{mg}} \\times V_{mL}" }
  ],
  inputs: [
    { id: "weight", label: "وزن المريض", unit: "kg", type: "number", default: "20" },
    { id: "dosePerKg", label: "الجرعة المقررة لكل كغ", unit: "mg/kg", type: "number", default: "15" },
    { id: "basis", label: "أساس الجرعة المقررة", type: "select", default: "dose", options: [["dose", "لكل جرعة"], ["day", "لكل يوم"]] },
    { id: "freq", label: "عدد الجرعات في اليوم", type: "number", default: "4", help: "عدد صحيح من 1 إلى 24." },
    { id: "stockMg", label: "كمية الدواء في المخزون", unit: "mg", type: "number", default: "250" },
    { id: "stockMl", label: "حجم المخزون", unit: "mL", type: "number", default: "5", help: "مثال: 250 mg في 5 mL." },
    { id: "maxDose", label: "الحد الأقصى للجرعة الواحدة (اختياري)", unit: "mg", type: "number", help: "اتركه فارغاً إن لم يوجد حد أقصى." }
  ],
  example: { values: { weight: "20", dosePerKg: "15", basis: "dose", freq: "4", stockMg: "250", stockMl: "5", maxDose: "" }, expect: ["300 mg", "6 mL"], note: "مثال: طفل وزنه 20 كغ، جرعة 15 mg/kg لكل جرعة، والدواء 250 mg في 5 mL." },
  invalid: { values: { weight: "0", dosePerKg: "15", basis: "dose", freq: "4", stockMg: "250", stockMl: "5", maxDose: "" } },
  related: ["iv-drip-rate", "bmi-bsa", "creatinine-clearance", "lab-units", "fluid-requirements"]
};

export function solve(input) {
  const w = num(input, "weight", "الوزن", { positive: true, max: 500 });
  const mgkg = num(input, "dosePerKg", "الجرعة لكل كغ", { positive: true });
  const basis = choice(input, "basis", "أساس الجرعة", ["dose", "day"], "dose");
  const freq = num(input, "freq", "عدد الجرعات في اليوم", { integer: true, min: 1, max: 24 });
  const stockMg = num(input, "stockMg", "كمية الدواء في المخزون", { positive: true });
  const stockMl = num(input, "stockMl", "حجم المخزون", { positive: true });
  const maxDose = num(input, "maxDose", "الحد الأقصى للجرعة", { positive: true, optional: true });

  const rawDaily = basis === "dose" ? w * mgkg * freq : w * mgkg;
  const rawSingle = rawDaily / freq;
  const capped = maxDose !== null && rawSingle > maxDose;
  const single = capped ? maxDose : rawSingle;
  const daily = single * freq;
  const vol = (single / stockMg) * stockMl;

  const steps = [];
  if (basis === "dose") {
    steps.push({ text: "الجرعة الواحدة = الوزن × الجرعة لكل كغ:", tex: `D = ${ntex(w)} \\times ${ntex(mgkg)} = ${ntex(rawSingle, 6)}\\ mg` });
  } else {
    steps.push({ text: "الجرعة اليومية = الوزن × الجرعة لكل كغ:", tex: `D_{day} = ${ntex(w)} \\times ${ntex(mgkg)} = ${ntex(rawDaily, 6)}\\ mg` });
    steps.push({ text: "الجرعة الواحدة = الجرعة اليومية ÷ عدد الجرعات:", tex: `D = \\frac{${ntex(rawDaily, 6)}}{${freq}} = ${ntex(rawSingle, 6)}\\ mg` });
  }
  if (capped) steps.push({ text: "الجرعة تتجاوز الحد الأقصى، فنستخدم الحد الأقصى:", tex: `D = ${ntex(maxDose)}\\ mg` });
  steps.push({ text: "الجرعة اليومية = الجرعة الواحدة × عدد الجرعات:", tex: `D_{day} = ${ntex(single, 6)} \\times ${freq} = ${ntex(daily, 6)}\\ mg` });
  steps.push({ text: "حجم الدواء لكل جرعة:", tex: `V = \\frac{${ntex(single, 6)}}{${ntex(stockMg)}} \\times ${ntex(stockMl)} = ${ntex(vol, 6)}\\ mL` });

  const blocks = [NOTE];
  if (capped) blocks.unshift({ type: "note", tone: "warn", text: `تم تقييد الجرعة عند الحد الأقصى ${fmt(maxDose)} mg لأن الحساب تجاوزه، لذلك خُفّضت الجرعة اليومية أيضاً.` });

  return {
    results: [
      { label: "الجرعة الواحدة", value: `${fmt(single, 6)} mg`, text: `${fmt(single, 6)} mg` },
      { label: "الجرعة اليومية", value: `${fmt(daily, 6)} mg` },
      { label: "حجم الدواء لكل جرعة", value: `${fmt(vol, 4)} mL`, text: `${fmt(vol, 4)} mL` }
    ],
    steps,
    blocks,
    copy: `الجرعة الواحدة ${fmt(single, 6)} mg، أي ${fmt(vol, 4)} mL لكل جرعة، والجرعة اليومية ${fmt(daily, 6)} mg`
  };
}
