import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "Solo con fines educativos y de formación. No sustituye al médico, al farmacéutico ni al protocolo aprobado de su institución." };

const STAGES = [
  [90, "G1", "Normal o alta", "≥ 90"],
  [60, "G2", "Disminución leve", "60 – 89"],
  [45, "G3a", "Disminución de leve a moderada", "45 – 59"],
  [30, "G3b", "Disminución de moderada a grave", "30 – 44"],
  [15, "G4", "Disminución grave", "15 – 29"],
  [-Infinity, "G5", "Insuficiencia renal", "< 15"]
];

function stage(egfr) {
  return STAGES.find(([min]) => egfr >= min);
}

export const meta = {
  description: "Calcula el aclaramiento de creatinina en mL/min con la ecuación de Cockcroft-Gault y la tasa de filtrado glomerular con la ecuación CKD-EPI 2021 sin factor de raza, con la clasificación de la etapa de la enfermedad renal crónica.",
  keywords: ["aclaramiento de creatinina", "Cockcroft-Gault", "CKD-EPI", "eGFR", "tasa de filtrado glomerular", "función renal", "creatinine clearance", "etapas de la enfermedad renal"],
  formulas: [
    { label: "Cockcroft-Gault", tex: "CrCl = \\frac{(140 - A) \\times W}{72 \\times S_{cr}} \\times 0.85\\ (\\text{para mujeres})" },
    { label: "CKD-EPI 2021", tex: "eGFR = 142 \\min(S/\\kappa,1)^{\\alpha} \\max(S/\\kappa,1)^{-1.200} 0.9938^{A} \\times 1.012\\ (\\text{para mujeres})" }
  ],
  inputs: [
    { id: "age", label: "Edad", unit: "años", type: "number", default: "60", help: "De 18 a 120 años." },
    { id: "weight", label: "Peso", unit: "kg", type: "number", default: "72" },
    { id: "sex", label: "Sexo", type: "select", default: "male", options: [["male", "Hombre"], ["female", "Mujer"]] },
    { id: "scrUnit", label: "Unidad de creatinina", type: "select", default: "mgdl", options: [["mgdl", "mg/dL"], ["umol", "µmol/L"]] },
    { id: "scr", label: "Creatinina sérica", type: "number", default: "1.0" }
  ],
  example: { values: { age: "60", weight: "72", sex: "male", scrUnit: "mgdl", scr: "1.0" }, expect: ["80 mL/min", "G2"], note: "Ejemplo: hombre de 60 años, de 72 kg y creatinina de 1.0 mg/dL." },
  invalid: { values: { age: "10", weight: "72", sex: "male", scrUnit: "mgdl", scr: "1.0" } },
  related: ["drug-dosage", "lab-units", "bmi-bsa", "fluid-requirements", "unit-converter"]
};

export function solve(input) {
  const age = num(input, "age", "Edad", { integer: true, min: 18, max: 120 });
  const w = num(input, "weight", "Peso", { positive: true, max: 500 });
  const sex = choice(input, "sex", "Sexo", ["male", "female"], "male");
  const unit = choice(input, "scrUnit", "Unidad de creatinina", ["mgdl", "umol"], "mgdl");
  const raw = num(input, "scr", "Creatinina sérica", { positive: true });
  const scr = unit === "umol" ? raw / 88.4 : raw;
  if (scr > 30) fail("El valor de creatinina es muy alto (más de 30 mg/dL); revisa la unidad seleccionada.", "scr");
  const female = sex === "female";
  const cg = (140 - age) * w / (72 * scr) * (female ? 0.85 : 1);
  const kappa = female ? 0.7 : 0.9;
  const alpha = female ? -0.241 : -0.302;
  const egfr = 142 * Math.pow(Math.min(scr / kappa, 1), alpha) * Math.pow(Math.max(scr / kappa, 1), -1.2) * Math.pow(0.9938, age) * (female ? 1.012 : 1);
  const st = stage(egfr);
  const steps = [];
  if (unit === "umol") steps.push({ text: "Conversión de creatinina a mg/dL (1 mg/dL = 88.4 µmol/L):", tex: `S_{cr} = \\frac{${ntex(raw)}}{88.4} = ${ntex(scr, 6)}\\ mg/dL` });
  steps.push({ text: "Aclaramiento de Cockcroft-Gault:", tex: `CrCl = \\frac{(140 - ${age}) \\times ${ntex(w)}}{72 \\times ${ntex(scr, 6)}}${female ? " \\times 0.85" : ""} = ${ntex(cg, 6)}\\ mL/min` });
  steps.push({ text: "Tasa de filtrado CKD-EPI 2021:", tex: `eGFR = 142 \\times ${ntex(Math.min(scr / kappa, 1), 6)}^{${alpha}} \\times ${ntex(Math.max(scr / kappa, 1), 6)}^{-1.2} \\times 0.9938^{${age}}${female ? " \\times 1.012" : ""} = ${ntex(egfr, 6)}\\ mL/min/1.73m^2` });
  steps.push({ text: "Etapa de la enfermedad renal crónica según la tasa de filtrado:", tex: `\\text{${st[1]} - ${st[2]}}` });
  return {
    results: [
      { label: "Aclaramiento de creatinina (Cockcroft-Gault)", value: `${fmt(cg, 4)} mL/min`, text: `${fmt(cg, 4)} mL/min` },
      { label: "Tasa de filtrado (CKD-EPI 2021)", value: `${fmt(egfr, 4)} mL/min/1.73m²`, text: `${fmt(egfr, 4)} mL/min/1.73m²` },
      { label: "Etapa de la enfermedad renal crónica", value: `${st[1]} - ${st[2]}`, text: `${st[1]} (${st[2]})` },
      { label: "Creatinina en mg/dL", value: `${fmt(scr, 4)} mg/dL` }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "Etapas de la enfermedad renal crónica", head: ["Etapa", "eGFR (mL/min/1.73m²)", "Descripción"], rows: STAGES.map(([, code, desc, range]) => [code, range, desc]) }
    ],
    copy: `Cockcroft-Gault = ${fmt(cg, 4)} mL/min، CKD-EPI 2021 = ${fmt(egfr, 4)} mL/min/1.73m² (${st[1]}: ${st[2]})`
  };
}
