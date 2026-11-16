import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "For education and training only. It does not replace your physician, pharmacist or the approved protocol of your institution." };

const STAGES = [
  [90, "G1", "Normal or high", "≥ 90"],
  [60, "G2", "Mildly decreased", "60 – 89"],
  [45, "G3a", "Mildly to moderately decreased", "45 – 59"],
  [30, "G3b", "Moderately to severely decreased", "30 – 44"],
  [15, "G4", "Severely decreased", "15 – 29"],
  [-Infinity, "G5", "Kidney failure", "< 15"]
];

function stage(egfr) {
  return STAGES.find(([min]) => egfr >= min);
}

export const meta = {
  description: "Calculate creatinine clearance in mL/min by the Cockcroft-Gault equation, and the glomerular filtration rate by the CKD-EPI 2021 equation without the race factor, with a classification of the chronic kidney disease stage.",
  keywords: ["creatinine clearance", "Cockcroft-Gault", "CKD-EPI", "eGFR", "glomerular filtration rate", "kidney function", "creatinine clearance", "stages of kidney disease"],
  formulas: [
    { label: "Cockcroft-Gault", tex: "CrCl = \\frac{(140 - A) \\times W}{72 \\times S_{cr}} \\times 0.85\\ (\\text{for females})" },
    { label: "CKD-EPI 2021", tex: "eGFR = 142 \\min(S/\\kappa,1)^{\\alpha} \\max(S/\\kappa,1)^{-1.200} 0.9938^{A} \\times 1.012\\ (\\text{for females})" }
  ],
  inputs: [
    { id: "age", label: "Age", unit: "years", type: "number", default: "60", help: "From 18 to 120 years." },
    { id: "weight", label: "Weight", unit: "kg", type: "number", default: "72" },
    { id: "sex", label: "Sex", type: "select", default: "male", options: [["male", "Male"], ["female", "Female"]] },
    { id: "scrUnit", label: "Creatinine unit", type: "select", default: "mgdl", options: [["mgdl", "mg/dL"], ["umol", "µmol/L"]] },
    { id: "scr", label: "Serum creatinine", type: "number", default: "1.0" }
  ],
  example: { values: { age: "60", weight: "72", sex: "male", scrUnit: "mgdl", scr: "1.0" }, expect: ["80 mL/min", "G2"], note: "Example: a 60-year-old man weighing 72 kg with creatinine 1.0 mg/dL." },
  invalid: { values: { age: "10", weight: "72", sex: "male", scrUnit: "mgdl", scr: "1.0" } },
  related: ["drug-dosage", "lab-units", "bmi-bsa", "fluid-requirements", "unit-converter"]
};

export function solve(input) {
  const age = num(input, "age", "Age", { integer: true, min: 18, max: 120 });
  const w = num(input, "weight", "Weight", { positive: true, max: 500 });
  const sex = choice(input, "sex", "Sex", ["male", "female"], "male");
  const unit = choice(input, "scrUnit", "Creatinine unit", ["mgdl", "umol"], "mgdl");
  const raw = num(input, "scr", "Serum creatinine", { positive: true });
  const scr = unit === "umol" ? raw / 88.4 : raw;
  if (scr > 30) fail("The creatinine value is very high (more than 30 mg/dL); check the selected unit.", "scr");
  const female = sex === "female";
  const cg = (140 - age) * w / (72 * scr) * (female ? 0.85 : 1);
  const kappa = female ? 0.7 : 0.9;
  const alpha = female ? -0.241 : -0.302;
  const egfr = 142 * Math.pow(Math.min(scr / kappa, 1), alpha) * Math.pow(Math.max(scr / kappa, 1), -1.2) * Math.pow(0.9938, age) * (female ? 1.012 : 1);
  const st = stage(egfr);
  const steps = [];
  if (unit === "umol") steps.push({ text: "Converting creatinine to mg/dL (1 mg/dL = 88.4 µmol/L):", tex: `S_{cr} = \\frac{${ntex(raw)}}{88.4} = ${ntex(scr, 6)}\\ mg/dL` });
  steps.push({ text: "Cockcroft-Gault clearance:", tex: `CrCl = \\frac{(140 - ${age}) \\times ${ntex(w)}}{72 \\times ${ntex(scr, 6)}}${female ? " \\times 0.85" : ""} = ${ntex(cg, 6)}\\ mL/min` });
  steps.push({ text: "CKD-EPI 2021 filtration rate:", tex: `eGFR = 142 \\times ${ntex(Math.min(scr / kappa, 1), 6)}^{${alpha}} \\times ${ntex(Math.max(scr / kappa, 1), 6)}^{-1.2} \\times 0.9938^{${age}}${female ? " \\times 1.012" : ""} = ${ntex(egfr, 6)}\\ mL/min/1.73m^2` });
  steps.push({ text: "Chronic kidney disease stage according to the filtration rate:", tex: `\\text{${st[1]} - ${st[2]}}` });
  return {
    results: [
      { label: "Creatinine clearance (Cockcroft-Gault)", value: `${fmt(cg, 4)} mL/min`, text: `${fmt(cg, 4)} mL/min` },
      { label: "Filtration rate (CKD-EPI 2021)", value: `${fmt(egfr, 4)} mL/min/1.73m²`, text: `${fmt(egfr, 4)} mL/min/1.73m²` },
      { label: "Chronic kidney disease stage", value: `${st[1]} - ${st[2]}`, text: `${st[1]} (${st[2]})` },
      { label: "Creatinine in mg/dL", value: `${fmt(scr, 4)} mg/dL` }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "Chronic kidney disease stages", head: ["Stage", "eGFR (mL/min/1.73m²)", "Description"], rows: STAGES.map(([, code, desc, range]) => [code, range, desc]) }
    ],
    copy: `Cockcroft-Gault = ${fmt(cg, 4)} mL/min، CKD-EPI 2021 = ${fmt(egfr, 4)} mL/min/1.73m² (${st[1]}: ${st[2]})`
  };
}
