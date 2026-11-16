import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "صرفاً برای آموزش و تمرین است و جایگزین پزشک، داروساز یا پروتکل معتبر مؤسسهٔ شما نیست." };

const STAGES = [
  [90, "G1", "طبیعی یا بالا", "≥ 90"],
  [60, "G2", "کاهش خفیف", "60 – 89"],
  [45, "G3a", "کاهش خفیف تا متوسط", "45 – 59"],
  [30, "G3b", "کاهش متوسط تا شدید", "30 – 44"],
  [15, "G4", "کاهش شدید", "15 – 29"],
  [-Infinity, "G5", "نارسایی کلیه", "< 15"]
];

function stage(egfr) {
  return STAGES.find(([min]) => egfr >= min);
}

export const meta = {
  description: "تصفیهٔ کراتینین را بر حسب میلی‌لیتر در دقیقه با معادلهٔ Cockcroft-Gault، و نرخ فیلتراسیون گلومرولی را با معادلهٔ CKD-EPI 2021 بدون ضریب نژاد محاسبه کنید، همراه با طبقه‌بندی مرحلهٔ بیماری مزمن کلیه.",
  keywords: ["تصفیهٔ کراتینین", "Cockcroft-Gault", "CKD-EPI", "eGFR", "نرخ فیلتراسیون گلومرولی", "عملکرد کلیه", "creatinine clearance", "مراحل بیماری کلیه"],
  formulas: [
    { label: "Cockcroft-Gault", tex: "CrCl = \\frac{(140 - A) \\times W}{72 \\times S_{cr}} \\times 0.85\\ (\\text{برای زن})" },
    { label: "CKD-EPI 2021", tex: "eGFR = 142 \\min(S/\\kappa,1)^{\\alpha} \\max(S/\\kappa,1)^{-1.200} 0.9938^{A} \\times 1.012\\ (\\text{برای زن})" }
  ],
  inputs: [
    { id: "age", label: "سن", unit: "سال", type: "number", default: "60", help: "از 18 تا 120 سال." },
    { id: "weight", label: "وزن", unit: "kg", type: "number", default: "72" },
    { id: "sex", label: "جنسیت", type: "select", default: "male", options: [["male", "مرد"], ["female", "زن"]] },
    { id: "scrUnit", label: "واحد کراتینین", type: "select", default: "mgdl", options: [["mgdl", "mg/dL"], ["umol", "µmol/L"]] },
    { id: "scr", label: "کراتینین سرم", type: "number", default: "1.0" }
  ],
  example: { values: { age: "60", weight: "72", sex: "male", scrUnit: "mgdl", scr: "1.0" }, expect: ["80 mL/min", "G2"], note: "مثال: مردی 60 ساله با وزن 72 kg و کراتینین 1.0 mg/dL." },
  invalid: { values: { age: "10", weight: "72", sex: "male", scrUnit: "mgdl", scr: "1.0" } },
  related: ["drug-dosage", "lab-units", "bmi-bsa", "fluid-requirements", "unit-converter"]
};

export function solve(input) {
  const age = num(input, "age", "سن", { integer: true, min: 18, max: 120 });
  const w = num(input, "weight", "وزن", { positive: true, max: 500 });
  const sex = choice(input, "sex", "جنسیت", ["male", "female"], "male");
  const unit = choice(input, "scrUnit", "واحد کراتینین", ["mgdl", "umol"], "mgdl");
  const raw = num(input, "scr", "کراتینین سرم", { positive: true });
  const scr = unit === "umol" ? raw / 88.4 : raw;
  if (scr > 30) fail("مقدار کراتینین بسیار بالا است (بیش از 30 mg/dL)؛ واحد انتخاب‌شده را بررسی کنید.", "scr");
  const female = sex === "female";
  const cg = (140 - age) * w / (72 * scr) * (female ? 0.85 : 1);
  const kappa = female ? 0.7 : 0.9;
  const alpha = female ? -0.241 : -0.302;
  const egfr = 142 * Math.pow(Math.min(scr / kappa, 1), alpha) * Math.pow(Math.max(scr / kappa, 1), -1.2) * Math.pow(0.9938, age) * (female ? 1.012 : 1);
  const st = stage(egfr);
  const steps = [];
  if (unit === "umol") steps.push({ text: "تبدیل کراتینین به mg/dL (1 mg/dL = 88.4 µmol/L):", tex: `S_{cr} = \\frac{${ntex(raw)}}{88.4} = ${ntex(scr, 6)}\\ mg/dL` });
  steps.push({ text: "تصفیهٔ Cockcroft-Gault:", tex: `CrCl = \\frac{(140 - ${age}) \\times ${ntex(w)}}{72 \\times ${ntex(scr, 6)}}${female ? " \\times 0.85" : ""} = ${ntex(cg, 6)}\\ mL/min` });
  steps.push({ text: "نرخ فیلتراسیون CKD-EPI 2021:", tex: `eGFR = 142 \\times ${ntex(Math.min(scr / kappa, 1), 6)}^{${alpha}} \\times ${ntex(Math.max(scr / kappa, 1), 6)}^{-1.2} \\times 0.9938^{${age}}${female ? " \\times 1.012" : ""} = ${ntex(egfr, 6)}\\ mL/min/1.73m^2` });
  steps.push({ text: "مرحلهٔ بیماری مزمن کلیه بر اساس نرخ فیلتراسیون:", tex: `\\text{${st[1]} - ${st[2]}}` });
  return {
    results: [
      { label: "تصفیهٔ کراتینین (Cockcroft-Gault)", value: `${fmt(cg, 4)} mL/min`, text: `${fmt(cg, 4)} mL/min` },
      { label: "نرخ فیلتراسیون (CKD-EPI 2021)", value: `${fmt(egfr, 4)} mL/min/1.73m²`, text: `${fmt(egfr, 4)} mL/min/1.73m²` },
      { label: "مرحلهٔ بیماری مزمن کلیه", value: `${st[1]} - ${st[2]}`, text: `${st[1]} (${st[2]})` },
      { label: "کراتینین بر حسب mg/dL", value: `${fmt(scr, 4)} mg/dL` }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "مراحل بیماری مزمن کلیه", head: ["مرحله", "eGFR (mL/min/1.73m²)", "شرح"], rows: STAGES.map(([, code, desc, range]) => [code, range, desc]) }
    ],
    copy: `Cockcroft-Gault = ${fmt(cg, 4)} mL/min، CKD-EPI 2021 = ${fmt(egfr, 4)} mL/min/1.73m² (${st[1]}: ${st[2]})`
  };
}
