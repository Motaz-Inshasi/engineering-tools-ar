import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "À des fins pédagogiques et de formation uniquement ; ne remplace pas le médecin, le pharmacien ni le protocole approuvé de votre établissement." };

const STAGES = [
  [90, "G1", "normal ou élevé", "≥ 90"],
  [60, "G2", "légère diminution", "60 – 89"],
  [45, "G3a", "diminution légère à modérée", "45 – 59"],
  [30, "G3b", "diminution modérée à sévère", "30 – 44"],
  [15, "G4", "diminution sévère", "15 – 29"],
  [-Infinity, "G5", "insuffisance rénale", "< 15"]
];

function stage(egfr) {
  return STAGES.find(([min]) => egfr >= min);
}

export const meta = {
  description: "Calculez la clairance de la créatinine selon la formule de Cockcroft-Gault en millilitres par minute, et le débit de filtration glomérulaire selon la formule CKD-EPI 2021 sans facteur ethnique, avec la classification du stade de la maladie rénale chronique.",
  keywords: ["clairance de la créatinine", "Cockcroft-Gault", "CKD-EPI", "eGFR", "débit de filtration glomérulaire", "fonction rénale", "creatinine clearance", "stades de la maladie rénale"],
  formulas: [
    { label: "Cockcroft-Gault", tex: "CrCl = \\frac{(140 - A) \\times W}{72 \\times S_{cr}} \\times 0.85\\ (\\text{pour la femme})" },
    { label: "CKD-EPI 2021", tex: "eGFR = 142 \\min(S/\\kappa,1)^{\\alpha} \\max(S/\\kappa,1)^{-1.200} 0.9938^{A} \\times 1.012\\ (\\text{pour la femme})" }
  ],
  inputs: [
    { id: "age", label: "Âge", unit: "ans", type: "number", default: "60", help: "De 18 à 120 ans." },
    { id: "weight", label: "Poids", unit: "kg", type: "number", default: "72" },
    { id: "sex", label: "Sexe", type: "select", default: "male", options: [["male", "Homme"], ["female", "Femme"]] },
    { id: "scrUnit", label: "Unité de la créatinine", type: "select", default: "mgdl", options: [["mgdl", "mg/dL"], ["umol", "µmol/L"]] },
    { id: "scr", label: "Créatinine sérique", type: "number", default: "1.0" }
  ],
  example: { values: { age: "60", weight: "72", sex: "male", scrUnit: "mgdl", scr: "1.0" }, expect: ["80 mL/min", "G2"], note: "Exemple : homme de 60 ans, pesant 72 kg, avec une créatinine de 1.0 mg/dL." },
  invalid: { values: { age: "10", weight: "72", sex: "male", scrUnit: "mgdl", scr: "1.0" } },
  related: ["drug-dosage", "lab-units", "bmi-bsa", "fluid-requirements", "unit-converter"]
};

export function solve(input) {
  const age = num(input, "age", "Âge", { integer: true, min: 18, max: 120 });
  const w = num(input, "weight", "Poids", { positive: true, max: 500 });
  const sex = choice(input, "sex", "Sexe", ["male", "female"], "male");
  const unit = choice(input, "scrUnit", "Unité de la créatinine", ["mgdl", "umol"], "mgdl");
  const raw = num(input, "scr", "Créatinine sérique", { positive: true });
  const scr = unit === "umol" ? raw / 88.4 : raw;
  if (scr > 30) fail("La créatinine est très élevée (plus de 30 mg/dL) : vérifiez le choix de l'unité.", "scr");
  const female = sex === "female";
  const cg = (140 - age) * w / (72 * scr) * (female ? 0.85 : 1);
  const kappa = female ? 0.7 : 0.9;
  const alpha = female ? -0.241 : -0.302;
  const egfr = 142 * Math.pow(Math.min(scr / kappa, 1), alpha) * Math.pow(Math.max(scr / kappa, 1), -1.2) * Math.pow(0.9938, age) * (female ? 1.012 : 1);
  const st = stage(egfr);
  const steps = [];
  if (unit === "umol") steps.push({ text: "Conversion de la créatinine en mg/dL (1 mg/dL = 88.4 µmol/L) :", tex: `S_{cr} = \\frac{${ntex(raw)}}{88.4} = ${ntex(scr, 6)}\\ mg/dL` });
  steps.push({ text: "Clairance selon Cockcroft-Gault :", tex: `CrCl = \\frac{(140 - ${age}) \\times ${ntex(w)}}{72 \\times ${ntex(scr, 6)}}${female ? " \\times 0.85" : ""} = ${ntex(cg, 6)}\\ mL/min` });
  steps.push({ text: "Débit de filtration CKD-EPI 2021 :", tex: `eGFR = 142 \\times ${ntex(Math.min(scr / kappa, 1), 6)}^{${alpha}} \\times ${ntex(Math.max(scr / kappa, 1), 6)}^{-1.2} \\times 0.9938^{${age}}${female ? " \\times 1.012" : ""} = ${ntex(egfr, 6)}\\ mL/min/1.73m^2` });
  steps.push({ text: "Stade de la maladie rénale chronique selon le débit de filtration :", tex: `\\text{${st[1]} - ${st[2]}}` });
  return {
    results: [
      { label: "Clairance de la créatinine (Cockcroft-Gault)", value: `${fmt(cg, 4)} mL/min`, text: `${fmt(cg, 4)} mL/min` },
      { label: "Débit de filtration (CKD-EPI 2021)", value: `${fmt(egfr, 4)} mL/min/1.73m²`, text: `${fmt(egfr, 4)} mL/min/1.73m²` },
      { label: "Stade de la maladie rénale chronique", value: `${st[1]} - ${st[2]}`, text: `${st[1]} (${st[2]})` },
      { label: "Créatinine en mg/dL", value: `${fmt(scr, 4)} mg/dL` }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "Stades de la maladie rénale chronique", head: ["Stade", "eGFR (mL/min/1.73m²)", "Description"], rows: STAGES.map(([, code, desc, range]) => [code, range, desc]) }
    ],
    copy: `Cockcroft-Gault = ${fmt(cg, 4)} mL/min، CKD-EPI 2021 = ${fmt(egfr, 4)} mL/min/1.73m² (${st[1]}: ${st[2]})`
  };
}
