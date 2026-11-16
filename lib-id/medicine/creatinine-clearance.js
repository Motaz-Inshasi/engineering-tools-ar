import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "Hanya untuk edukasi dan pelatihan, dan tidak menggantikan dokter, apoteker, atau protokol resmi di institusi Anda." };

const STAGES = [
  [90, "G1", "Normal atau tinggi", "≥ 90"],
  [60, "G2", "Penurunan ringan", "60 – 89"],
  [45, "G3a", "Penurunan ringan hingga sedang", "45 – 59"],
  [30, "G3b", "Penurunan sedang hingga berat", "30 – 44"],
  [15, "G4", "Penurunan berat", "15 – 29"],
  [-Infinity, "G5", "Gagal ginjal", "< 15"]
];

function stage(egfr) {
  return STAGES.find(([min]) => egfr >= min);
}

export const meta = {
  description: "Hitung klirens kreatinin dengan rumus Cockcroft-Gault dalam mL/menit, dan laju filtrasi glomerulus dengan rumus CKD-EPI 2021 tanpa faktor ras, serta klasifikasikan stadium penyakit ginjal kronis.",
  keywords: ["klirens kreatinin", "Cockcroft-Gault", "CKD-EPI", "eGFR", "laju filtrasi glomerulus", "fungsi ginjal", "creatinine clearance", "stadium penyakit ginjal"],
  formulas: [
    { label: "Cockcroft-Gault", tex: "CrCl = \\frac{(140 - A) \\times W}{72 \\times S_{cr}} \\times 0.85\\ (\\text{untuk wanita})" },
    { label: "CKD-EPI 2021", tex: "eGFR = 142 \\min(S/\\kappa,1)^{\\alpha} \\max(S/\\kappa,1)^{-1.200} 0.9938^{A} \\times 1.012\\ (\\text{untuk wanita})" }
  ],
  inputs: [
    { id: "age", label: "Usia", unit: "tahun", type: "number", default: "60", help: "Dari 18 hingga 120 tahun." },
    { id: "weight", label: "Berat", unit: "kg", type: "number", default: "72" },
    { id: "sex", label: "Jenis kelamin", type: "select", default: "male", options: [["male", "Pria"], ["female", "Wanita"]] },
    { id: "scrUnit", label: "Satuan kreatinin", type: "select", default: "mgdl", options: [["mgdl", "mg/dL"], ["umol", "µmol/L"]] },
    { id: "scr", label: "Kreatinin serum", type: "number", default: "1.0" }
  ],
  example: { values: { age: "60", weight: "72", sex: "male", scrUnit: "mgdl", scr: "1.0" }, expect: ["80 mL/min", "G2"], note: "Contoh: pria berusia 60 tahun, berat 72 kg, dan kreatinin 1.0 mg/dL." },
  invalid: { values: { age: "10", weight: "72", sex: "male", scrUnit: "mgdl", scr: "1.0" } },
  related: ["drug-dosage", "lab-units", "bmi-bsa", "fluid-requirements", "unit-converter"]
};

export function solve(input) {
  const age = num(input, "age", "Usia", { integer: true, min: 18, max: 120 });
  const w = num(input, "weight", "Berat", { positive: true, max: 500 });
  const sex = choice(input, "sex", "Jenis kelamin", ["male", "female"], "male");
  const unit = choice(input, "scrUnit", "Satuan kreatinin", ["mgdl", "umol"], "mgdl");
  const raw = num(input, "scr", "Kreatinin serum", { positive: true });
  const scr = unit === "umol" ? raw / 88.4 : raw;
  if (scr > 30) fail("Nilai kreatinin sangat tinggi (lebih dari 30 mg/dL), periksa kembali pemilihan satuan.", "scr");
  const female = sex === "female";
  const cg = (140 - age) * w / (72 * scr) * (female ? 0.85 : 1);
  const kappa = female ? 0.7 : 0.9;
  const alpha = female ? -0.241 : -0.302;
  const egfr = 142 * Math.pow(Math.min(scr / kappa, 1), alpha) * Math.pow(Math.max(scr / kappa, 1), -1.2) * Math.pow(0.9938, age) * (female ? 1.012 : 1);
  const st = stage(egfr);
  const steps = [];
  if (unit === "umol") steps.push({ text: "Konversi kreatinin ke mg/dL (1 mg/dL = 88.4 µmol/L):", tex: `S_{cr} = \\frac{${ntex(raw)}}{88.4} = ${ntex(scr, 6)}\\ mg/dL` });
  steps.push({ text: "Klirens Cockcroft-Gault:", tex: `CrCl = \\frac{(140 - ${age}) \\times ${ntex(w)}}{72 \\times ${ntex(scr, 6)}}${female ? " \\times 0.85" : ""} = ${ntex(cg, 6)}\\ mL/min` });
  steps.push({ text: "Laju filtrasi CKD-EPI 2021:", tex: `eGFR = 142 \\times ${ntex(Math.min(scr / kappa, 1), 6)}^{${alpha}} \\times ${ntex(Math.max(scr / kappa, 1), 6)}^{-1.2} \\times 0.9938^{${age}}${female ? " \\times 1.012" : ""} = ${ntex(egfr, 6)}\\ mL/min/1.73m^2` });
  steps.push({ text: "Stadium penyakit ginjal kronis berdasarkan laju filtrasi:", tex: `\\text{${st[1]} - ${st[2]}}` });
  return {
    results: [
      { label: "Klirens kreatinin (Cockcroft-Gault)", value: `${fmt(cg, 4)} mL/min`, text: `${fmt(cg, 4)} mL/min` },
      { label: "Laju filtrasi (CKD-EPI 2021)", value: `${fmt(egfr, 4)} mL/min/1.73m²`, text: `${fmt(egfr, 4)} mL/min/1.73m²` },
      { label: "Stadium penyakit ginjal kronis", value: `${st[1]} - ${st[2]}`, text: `${st[1]} (${st[2]})` },
      { label: "Kreatinin dalam mg/dL", value: `${fmt(scr, 4)} mg/dL` }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "Stadium penyakit ginjal kronis", head: ["Stadium", "eGFR (mL/min/1.73m²)", "Deskripsi"], rows: STAGES.map(([, code, desc, range]) => [code, range, desc]) }
    ],
    copy: `Cockcroft-Gault = ${fmt(cg, 4)} mL/min، CKD-EPI 2021 = ${fmt(egfr, 4)} mL/min/1.73m² (${st[1]}: ${st[2]})`
  };
}
