import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "Yalnızca eğitim ve öğretim amaçlıdır; doktorunuzun, eczacınızın veya kurumunuzda onaylı protokolün yerini tutmaz." };

const STAGES = [
  [90, "G1", "Normal veya yüksek", "≥ 90"],
  [60, "G2", "Hafif azalma", "60 – 89"],
  [45, "G3a", "Hafif ila orta azalma", "45 – 59"],
  [30, "G3b", "Orta ila şiddetli azalma", "30 – 44"],
  [15, "G4", "Şiddetli azalma", "15 – 29"],
  [-Infinity, "G5", "Böbrek yetmezliği", "< 15"]
];

function stage(egfr) {
  return STAGES.find(([min]) => egfr >= min);
}

export const meta = {
  description: "Cockcroft-Gault formülüyle kreatinin klirensini dakika başına mililitre cinsinden, CKD-EPI 2021 formülüyle (ırk katsayısı olmadan) glomerüler filtrasyon hızını hesaplayın ve kronik böbrek hastalığı evresini sınıflandırın.",
  keywords: ["Kreatinin klirensi", "Cockcroft-Gault", "CKD-EPI", "eGFR", "Glomerüler filtrasyon hızı", "Böbrek fonksiyonu", "creatinine clearance", "Böbrek hastalığı evreleri"],
  formulas: [
    { label: "Cockcroft-Gault", tex: "CrCl = \\frac{(140 - A) \\times W}{72 \\times S_{cr}} \\times 0.85\\ (\\text{kadın için})" },
    { label: "CKD-EPI 2021", tex: "eGFR = 142 \\min(S/\\kappa,1)^{\\alpha} \\max(S/\\kappa,1)^{-1.200} 0.9938^{A} \\times 1.012\\ (\\text{kadın için})" }
  ],
  inputs: [
    { id: "age", label: "Yaş", unit: "yıl", type: "number", default: "60", help: "18 ile 120 yaş arası." },
    { id: "weight", label: "Kilo", unit: "kg", type: "number", default: "72" },
    { id: "sex", label: "Cinsiyet", type: "select", default: "male", options: [["male", "Erkek"], ["female", "Kadın"]] },
    { id: "scrUnit", label: "Kreatinin birimi", type: "select", default: "mgdl", options: [["mgdl", "mg/dL"], ["umol", "µmol/L"]] },
    { id: "scr", label: "Serum kreatinini", type: "number", default: "1.0" }
  ],
  example: { values: { age: "60", weight: "72", sex: "male", scrUnit: "mgdl", scr: "1.0" }, expect: ["80 mL/min", "G2"], note: "Örnek: 60 yaşında, 72 kg kilolu ve kreatinin değeri 1,0 mg/dL olan bir erkek." },
  invalid: { values: { age: "10", weight: "72", sex: "male", scrUnit: "mgdl", scr: "1.0" } },
  related: ["drug-dosage", "lab-units", "bmi-bsa", "fluid-requirements", "unit-converter"]
};

export function solve(input) {
  const age = num(input, "age", "Yaş", { integer: true, min: 18, max: 120 });
  const w = num(input, "weight", "Kilo", { positive: true, max: 500 });
  const sex = choice(input, "sex", "Cinsiyet", ["male", "female"], "male");
  const unit = choice(input, "scrUnit", "Kreatinin birimi", ["mgdl", "umol"], "mgdl");
  const raw = num(input, "scr", "Serum kreatinini", { positive: true });
  const scr = unit === "umol" ? raw / 88.4 : raw;
  if (scr > 30) fail("Kreatinin değeri çok yüksek (30 mg/dL'den fazla); birim seçimini kontrol edin.", "scr");
  const female = sex === "female";
  const cg = (140 - age) * w / (72 * scr) * (female ? 0.85 : 1);
  const kappa = female ? 0.7 : 0.9;
  const alpha = female ? -0.241 : -0.302;
  const egfr = 142 * Math.pow(Math.min(scr / kappa, 1), alpha) * Math.pow(Math.max(scr / kappa, 1), -1.2) * Math.pow(0.9938, age) * (female ? 1.012 : 1);
  const st = stage(egfr);
  const steps = [];
  if (unit === "umol") steps.push({ text: "Kreatinini mg/dL'ye çevirme (1 mg/dL = 88,4 µmol/L):", tex: `S_{cr} = \\frac{${ntex(raw)}}{88.4} = ${ntex(scr, 6)}\\ mg/dL` });
  steps.push({ text: "Cockcroft-Gault klirensi:", tex: `CrCl = \\frac{(140 - ${age}) \\times ${ntex(w)}}{72 \\times ${ntex(scr, 6)}}${female ? " \\times 0.85" : ""} = ${ntex(cg, 6)}\\ mL/min` });
  steps.push({ text: "CKD-EPI 2021 filtrasyon hızı:", tex: `eGFR = 142 \\times ${ntex(Math.min(scr / kappa, 1), 6)}^{${alpha}} \\times ${ntex(Math.max(scr / kappa, 1), 6)}^{-1.2} \\times 0.9938^{${age}}${female ? " \\times 1.012" : ""} = ${ntex(egfr, 6)}\\ mL/min/1.73m^2` });
  steps.push({ text: "Filtrasyon hızına göre kronik böbrek hastalığı evresi:", tex: `\\text{${st[1]} - ${st[2]}}` });
  return {
    results: [
      { label: "Kreatinin klirensi (Cockcroft-Gault)", value: `${fmt(cg, 4)} mL/min`, text: `${fmt(cg, 4)} mL/min` },
      { label: "Filtrasyon hızı (CKD-EPI 2021)", value: `${fmt(egfr, 4)} mL/min/1.73m²`, text: `${fmt(egfr, 4)} mL/min/1.73m²` },
      { label: "Kronik böbrek hastalığı evresi", value: `${st[1]} - ${st[2]}`, text: `${st[1]} (${st[2]})` },
      { label: "Kreatinin mg/dL biriminde", value: `${fmt(scr, 4)} mg/dL` }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "Kronik böbrek hastalığı evreleri", head: ["Evre", "eGFR (mL/min/1.73m²)", "Açıklama"], rows: STAGES.map(([, code, desc, range]) => [code, range, desc]) }
    ],
    copy: `Cockcroft-Gault = ${fmt(cg, 4)} mL/min، CKD-EPI 2021 = ${fmt(egfr, 4)} mL/min/1.73m² (${st[1]}: ${st[2]})`
  };
}
