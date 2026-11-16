import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "صرف تعلیم اور تربیت کے لیے ہے، یہ آپ کے معالج، فارماسسٹ یا آپ کے ادارے کے منظور شدہ پروٹوکول کا متبادل نہیں ہے۔" };

const STAGES = [
  [90, "G1", "نارمل یا بلند", "≥ 90"],
  [60, "G2", "معمولی کمی", "60 – 89"],
  [45, "G3a", "معمولی سے درمیانی کمی", "45 – 59"],
  [30, "G3b", "درمیانی سے شدید کمی", "30 – 44"],
  [15, "G4", "شدید کمی", "15 – 29"],
  [-Infinity, "G5", "گردے کا فیل ہونا", "< 15"]
];

function stage(egfr) {
  return STAGES.find(([min]) => egfr >= min);
}

export const meta = {
  description: "کوب-گالٹ مساوات سے کریٹینین کلیئرنس ملی لیٹر فی منٹ میں، اور CKD-EPI 2021 مساوات سے نسل کے عنصر کے بغیر گلومیرولر فلٹریشن ریٹ حساب کریں، ساتھ دائمی گردے کی بیماری کے مرحلے کی درجہ بندی۔",
  keywords: ["کریٹینین کلیئرنس", "Cockcroft-Gault", "CKD-EPI", "eGFR", "گلومیرولر فلٹریشن ریٹ", "گردوں کا کام", "creatinine clearance", "گردے کی بیماری کے مراحل"],
  formulas: [
    { label: "Cockcroft-Gault", tex: "CrCl = \\frac{(140 - A) \\times W}{72 \\times S_{cr}} \\times 0.85\\ (\\text{خواتین کے لیے})" },
    { label: "CKD-EPI 2021", tex: "eGFR = 142 \\min(S/\\kappa,1)^{\\alpha} \\max(S/\\kappa,1)^{-1.200} 0.9938^{A} \\times 1.012\\ (\\text{خواتین کے لیے})" }
  ],
  inputs: [
    { id: "age", label: "عمر", unit: "سال", type: "number", default: "60", help: "18 سے 120 سال تک۔" },
    { id: "weight", label: "وزن", unit: "kg", type: "number", default: "72" },
    { id: "sex", label: "جنس", type: "select", default: "male", options: [["male", "مرد"], ["female", "عورت"]] },
    { id: "scrUnit", label: "کریٹینین کی اکائی", type: "select", default: "mgdl", options: [["mgdl", "mg/dL"], ["umol", "µmol/L"]] },
    { id: "scr", label: "سیرم کریٹینین", type: "number", default: "1.0" }
  ],
  example: { values: { age: "60", weight: "72", sex: "male", scrUnit: "mgdl", scr: "1.0" }, expect: ["80 mL/min", "G2"], note: "مثال: 60 سالہ مرد، وزن 72 kg اور کریٹینین 1.0 mg/dL۔" },
  invalid: { values: { age: "10", weight: "72", sex: "male", scrUnit: "mgdl", scr: "1.0" } },
  related: ["drug-dosage", "lab-units", "bmi-bsa", "fluid-requirements", "unit-converter"]
};

export function solve(input) {
  const age = num(input, "age", "عمر", { integer: true, min: 18, max: 120 });
  const w = num(input, "weight", "وزن", { positive: true, max: 500 });
  const sex = choice(input, "sex", "جنس", ["male", "female"], "male");
  const unit = choice(input, "scrUnit", "کریٹینین کی اکائی", ["mgdl", "umol"], "mgdl");
  const raw = num(input, "scr", "سیرم کریٹینین", { positive: true });
  const scr = unit === "umol" ? raw / 88.4 : raw;
  if (scr > 30) fail("کریٹینین کی قدر بہت زیادہ ہے (30 mg/dL سے زیادہ)؛ منتخب اکائی کی جانچ کریں۔", "scr");
  const female = sex === "female";
  const cg = (140 - age) * w / (72 * scr) * (female ? 0.85 : 1);
  const kappa = female ? 0.7 : 0.9;
  const alpha = female ? -0.241 : -0.302;
  const egfr = 142 * Math.pow(Math.min(scr / kappa, 1), alpha) * Math.pow(Math.max(scr / kappa, 1), -1.2) * Math.pow(0.9938, age) * (female ? 1.012 : 1);
  const st = stage(egfr);
  const steps = [];
  if (unit === "umol") steps.push({ text: "کریٹینین کو mg/dL میں تبدیل کرنا (1 mg/dL = 88.4 µmol/L):", tex: `S_{cr} = \\frac{${ntex(raw)}}{88.4} = ${ntex(scr, 6)}\\ mg/dL` });
  steps.push({ text: "کوب-گالٹ کلیئرنس:", tex: `CrCl = \\frac{(140 - ${age}) \\times ${ntex(w)}}{72 \\times ${ntex(scr, 6)}}${female ? " \\times 0.85" : ""} = ${ntex(cg, 6)}\\ mL/min` });
  steps.push({ text: "CKD-EPI 2021 فلٹریشن ریٹ:", tex: `eGFR = 142 \\times ${ntex(Math.min(scr / kappa, 1), 6)}^{${alpha}} \\times ${ntex(Math.max(scr / kappa, 1), 6)}^{-1.2} \\times 0.9938^{${age}}${female ? " \\times 1.012" : ""} = ${ntex(egfr, 6)}\\ mL/min/1.73m^2` });
  steps.push({ text: "فلٹریشن ریٹ کے مطابق دائمی گردے کی بیماری کا مرحلہ:", tex: `\\text{${st[1]} - ${st[2]}}` });
  return {
    results: [
      { label: "کریٹینین کلیئرنس (کوب-گالٹ)", value: `${fmt(cg, 4)} mL/min`, text: `${fmt(cg, 4)} mL/min` },
      { label: "فلٹریشن ریٹ (CKD-EPI 2021)", value: `${fmt(egfr, 4)} mL/min/1.73m²`, text: `${fmt(egfr, 4)} mL/min/1.73m²` },
      { label: "دائمی گردے کی بیماری کا مرحلہ", value: `${st[1]} - ${st[2]}`, text: `${st[1]} (${st[2]})` },
      { label: "کریٹینین mg/dL میں", value: `${fmt(scr, 4)} mg/dL` }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "دائمی گردے کی بیماری کے مراحل", head: ["مرحلہ", "eGFR (mL/min/1.73m²)", "تفصیل"], rows: STAGES.map(([, code, desc, range]) => [code, range, desc]) }
    ],
    copy: `Cockcroft-Gault = ${fmt(cg, 4)} mL/min، CKD-EPI 2021 = ${fmt(egfr, 4)} mL/min/1.73m² (${st[1]}: ${st[2]})`
  };
}
