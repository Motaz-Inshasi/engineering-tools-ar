import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "For education and training only. It does not replace your physician, pharmacist or the approved protocol of your institution." };

export const meta = {
  description: "Calculate the single and daily dose of a drug in milligrams per kilogram of body weight, and the volume of drug to draw from the stock concentration, with the option of limiting the dose to a maximum.",
  keywords: ["drug dose", "mg/kg", "dose calculation", "maximum dose", "drug dosage", "dose calculation", "stock concentration"],
  formulas: [
    { label: "Single dose", tex: "D = W \\times d_{kg}" },
    { label: "Daily dose", tex: "D_{day} = D \\times f" },
    { label: "Drug volume per dose", tex: "V = \\frac{D}{C_{mg}} \\times V_{mL}" }
  ],
  inputs: [
    { id: "weight", label: "Patient weight", unit: "kg", type: "number", default: "20" },
    { id: "dosePerKg", label: "Prescribed dose per kg", unit: "mg/kg", type: "number", default: "15" },
    { id: "basis", label: "Basis of the prescribed dose", type: "select", default: "dose", options: [["dose", "Per dose"], ["day", "Per day"]] },
    { id: "freq", label: "Number of doses per day", type: "number", default: "4", help: "Integer from 1 to 24." },
    { id: "stockMg", label: "Amount of drug in stock", unit: "mg", type: "number", default: "250" },
    { id: "stockMl", label: "Stock volume", unit: "mL", type: "number", default: "5", help: "Example: 250 mg in 5 mL." },
    { id: "maxDose", label: "Maximum single dose (optional)", unit: "mg", type: "number", help: "Leave empty if there is no maximum." }
  ],
  example: { values: { weight: "20", dosePerKg: "15", basis: "dose", freq: "4", stockMg: "250", stockMl: "5", maxDose: "" }, expect: ["300 mg", "6 mL"], note: "Example: a child weighing 20 kg, a dose of 15 mg/kg per dose, and a drug of 250 mg in 5 mL." },
  invalid: { values: { weight: "0", dosePerKg: "15", basis: "dose", freq: "4", stockMg: "250", stockMl: "5", maxDose: "" } },
  related: ["iv-drip-rate", "bmi-bsa", "creatinine-clearance", "lab-units", "fluid-requirements"]
};

export function solve(input) {
  const w = num(input, "weight", "Weight", { positive: true, max: 500 });
  const mgkg = num(input, "dosePerKg", "Dose per kg", { positive: true });
  const basis = choice(input, "basis", "Dose basis", ["dose", "day"], "dose");
  const freq = num(input, "freq", "Number of doses per day", { integer: true, min: 1, max: 24 });
  const stockMg = num(input, "stockMg", "Amount of drug in stock", { positive: true });
  const stockMl = num(input, "stockMl", "Stock volume", { positive: true });
  const maxDose = num(input, "maxDose", "maximum dose", { positive: true, optional: true });

  const rawDaily = basis === "dose" ? w * mgkg * freq : w * mgkg;
  const rawSingle = rawDaily / freq;
  const capped = maxDose !== null && rawSingle > maxDose;
  const single = capped ? maxDose : rawSingle;
  const daily = single * freq;
  const vol = (single / stockMg) * stockMl;

  const steps = [];
  if (basis === "dose") {
    steps.push({ text: "Single dose = weight × dose per kg:", tex: `D = ${ntex(w)} \\times ${ntex(mgkg)} = ${ntex(rawSingle, 6)}\\ mg` });
  } else {
    steps.push({ text: "Daily dose = weight × dose per kg:", tex: `D_{day} = ${ntex(w)} \\times ${ntex(mgkg)} = ${ntex(rawDaily, 6)}\\ mg` });
    steps.push({ text: "Single dose = daily dose ÷ number of doses:", tex: `D = \\frac{${ntex(rawDaily, 6)}}{${freq}} = ${ntex(rawSingle, 6)}\\ mg` });
  }
  if (capped) steps.push({ text: "The dose exceeds the maximum, so we use the maximum:", tex: `D = ${ntex(maxDose)}\\ mg` });
  steps.push({ text: "Daily dose = single dose × number of doses:", tex: `D_{day} = ${ntex(single, 6)} \\times ${freq} = ${ntex(daily, 6)}\\ mg` });
  steps.push({ text: "Drug volume per dose:", tex: `V = \\frac{${ntex(single, 6)}}{${ntex(stockMg)}} \\times ${ntex(stockMl)} = ${ntex(vol, 6)}\\ mL` });

  const blocks = [NOTE];
  if (capped) blocks.unshift({ type: "note", tone: "warn", text: `The dose was capped at the maximum of ${fmt(maxDose)} mg because the calculation exceeded it, so the daily dose was also reduced.` });

  return {
    results: [
      { label: "Single dose", value: `${fmt(single, 6)} mg`, text: `${fmt(single, 6)} mg` },
      { label: "Daily dose", value: `${fmt(daily, 6)} mg` },
      { label: "Drug volume per dose", value: `${fmt(vol, 4)} mL`, text: `${fmt(vol, 4)} mL` }
    ],
    steps,
    blocks,
    copy: `Single dose ${fmt(single, 6)} mg, i.e. ${fmt(vol, 4)} mL per dose, and daily dose ${fmt(daily, 6)} mg`
  };
}
