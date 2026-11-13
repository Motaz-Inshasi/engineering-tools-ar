import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "للتعليم والتدريب فقط، ولا يغني عن الطبيب أو الصيدلي أو البروتوكول المعتمد في مؤسستك." };

const STAGES = [
  [90, "G1", "طبيعي أو مرتفع", "≥ 90"],
  [60, "G2", "انخفاض طفيف", "60 – 89"],
  [45, "G3a", "انخفاض طفيف إلى متوسط", "45 – 59"],
  [30, "G3b", "انخفاض متوسط إلى شديد", "30 – 44"],
  [15, "G4", "انخفاض شديد", "15 – 29"],
  [-Infinity, "G5", "فشل كلوي", "< 15"]
];

function stage(egfr) {
  return STAGES.find(([min]) => egfr >= min);
}

export const meta = {
  description: "احسب تصفية الكرياتينين بمعادلة Cockcroft-Gault بالمليلتر في الدقيقة، ومعدل الترشيح الكبيبي بمعادلة CKD-EPI 2021 بدون عامل العرق، مع تصنيف مرحلة مرض الكلى المزمن.",
  keywords: ["تصفية الكرياتينين", "Cockcroft-Gault", "CKD-EPI", "eGFR", "معدل الترشيح الكبيبي", "وظائف الكلى", "creatinine clearance", "مراحل مرض الكلى"],
  formulas: [
    { label: "Cockcroft-Gault", tex: "CrCl = \\frac{(140 - A) \\times W}{72 \\times S_{cr}} \\times 0.85\\ (\\text{للأنثى})" },
    { label: "CKD-EPI 2021", tex: "eGFR = 142 \\min(S/\\kappa,1)^{\\alpha} \\max(S/\\kappa,1)^{-1.200} 0.9938^{A} \\times 1.012\\ (\\text{للأنثى})" }
  ],
  inputs: [
    { id: "age", label: "العمر", unit: "سنة", type: "number", default: "60", help: "من 18 إلى 120 سنة." },
    { id: "weight", label: "الوزن", unit: "kg", type: "number", default: "72" },
    { id: "sex", label: "الجنس", type: "select", default: "male", options: [["male", "ذكر"], ["female", "أنثى"]] },
    { id: "scrUnit", label: "وحدة الكرياتينين", type: "select", default: "mgdl", options: [["mgdl", "mg/dL"], ["umol", "µmol/L"]] },
    { id: "scr", label: "الكرياتينين في المصل", type: "number", default: "1.0" }
  ],
  example: { values: { age: "60", weight: "72", sex: "male", scrUnit: "mgdl", scr: "1.0" }, expect: ["80 mL/min", "G2"], note: "مثال: رجل عمره 60 سنة ووزنه 72 kg وكرياتينين 1.0 mg/dL." },
  invalid: { values: { age: "10", weight: "72", sex: "male", scrUnit: "mgdl", scr: "1.0" } },
  related: ["drug-dosage", "lab-units", "bmi-bsa", "fluid-requirements", "unit-converter"]
};

export function solve(input) {
  const age = num(input, "age", "العمر", { integer: true, min: 18, max: 120 });
  const w = num(input, "weight", "الوزن", { positive: true, max: 500 });
  const sex = choice(input, "sex", "الجنس", ["male", "female"], "male");
  const unit = choice(input, "scrUnit", "وحدة الكرياتينين", ["mgdl", "umol"], "mgdl");
  const raw = num(input, "scr", "الكرياتينين في المصل", { positive: true });
  const scr = unit === "umol" ? raw / 88.4 : raw;
  if (scr > 30) fail("قيمة الكرياتينين مرتفعة جداً (أكثر من 30 mg/dL)، تحقق من اختيار الوحدة.", "scr");
  const female = sex === "female";
  const cg = (140 - age) * w / (72 * scr) * (female ? 0.85 : 1);
  const kappa = female ? 0.7 : 0.9;
  const alpha = female ? -0.241 : -0.302;
  const egfr = 142 * Math.pow(Math.min(scr / kappa, 1), alpha) * Math.pow(Math.max(scr / kappa, 1), -1.2) * Math.pow(0.9938, age) * (female ? 1.012 : 1);
  const st = stage(egfr);
  const steps = [];
  if (unit === "umol") steps.push({ text: "تحويل الكرياتينين إلى mg/dL (1 mg/dL = 88.4 µmol/L):", tex: `S_{cr} = \\frac{${ntex(raw)}}{88.4} = ${ntex(scr, 6)}\\ mg/dL` });
  steps.push({ text: "تصفية Cockcroft-Gault:", tex: `CrCl = \\frac{(140 - ${age}) \\times ${ntex(w)}}{72 \\times ${ntex(scr, 6)}}${female ? " \\times 0.85" : ""} = ${ntex(cg, 6)}\\ mL/min` });
  steps.push({ text: "معدل الترشيح CKD-EPI 2021:", tex: `eGFR = 142 \\times ${ntex(Math.min(scr / kappa, 1), 6)}^{${alpha}} \\times ${ntex(Math.max(scr / kappa, 1), 6)}^{-1.2} \\times 0.9938^{${age}}${female ? " \\times 1.012" : ""} = ${ntex(egfr, 6)}\\ mL/min/1.73m^2` });
  steps.push({ text: "مرحلة مرض الكلى المزمن حسب معدل الترشيح:", tex: `\\text{${st[1]} - ${st[2]}}` });
  return {
    results: [
      { label: "تصفية الكرياتينين (Cockcroft-Gault)", value: `${fmt(cg, 4)} mL/min`, text: `${fmt(cg, 4)} mL/min` },
      { label: "معدل الترشيح (CKD-EPI 2021)", value: `${fmt(egfr, 4)} mL/min/1.73m²`, text: `${fmt(egfr, 4)} mL/min/1.73m²` },
      { label: "مرحلة مرض الكلى المزمن", value: `${st[1]} - ${st[2]}`, text: `${st[1]} (${st[2]})` },
      { label: "الكرياتينين بوحدة mg/dL", value: `${fmt(scr, 4)} mg/dL` }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "مراحل مرض الكلى المزمن", head: ["المرحلة", "eGFR (mL/min/1.73m²)", "الوصف"], rows: STAGES.map(([, code, desc, range]) => [code, range, desc]) }
    ],
    copy: `Cockcroft-Gault = ${fmt(cg, 4)} mL/min، CKD-EPI 2021 = ${fmt(egfr, 4)} mL/min/1.73m² (${st[1]}: ${st[2]})`
  };
}
