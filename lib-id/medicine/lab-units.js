import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "Hanya untuk edukasi dan pelatihan, dan tidak menggantikan dokter, apoteker, atau protokol resmi di institusi Anda." };

const ANALYTES = [
  { id: "glucose", label: "Glukosa", conv: "mg/dL", si: "mmol/L", op: "div", f: 18.016 },
  { id: "cholesterol", label: "Kolesterol total", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "hdl", label: "Kolesterol HDL", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "ldl", label: "Kolesterol LDL", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "triglycerides", label: "Trigliserida", conv: "mg/dL", si: "mmol/L", op: "div", f: 88.57 },
  { id: "creatinine", label: "Kreatinin", conv: "mg/dL", si: "µmol/L", op: "mul", f: 88.4 },
  { id: "bun", label: "Nitrogen urea darah (BUN)", conv: "mg/dL", si: "mmol/L", op: "mul", f: 0.357 },
  { id: "uric", label: "Asam urat", conv: "mg/dL", si: "µmol/L", op: "mul", f: 59.48 },
  { id: "calcium", label: "Kalsium", conv: "mg/dL", si: "mmol/L", op: "mul", f: 0.2495 },
  { id: "hemoglobin", label: "Hemoglobin", conv: "g/dL", si: "g/L", op: "mul", f: 10 },
  { id: "bilirubin", label: "Bilirubin total", conv: "mg/dL", si: "µmol/L", op: "mul", f: 17.1 }
];

function factorText(a, dir) {
  const divide = (a.op === "div") !== (dir === "fromSi");
  return `${divide ? "÷" : "×"} ${fmt(a.f)}`;
}

export const meta = {
  description: "Konversi hasil laboratorium antara satuan konvensional dan satuan SI untuk beberapa pemeriksaan umum seperti gula, kolesterol, kreatinin, urea, asam urat, kalsium, hemoglobin, dan bilirubin.",
  keywords: ["satuan laboratorium", "SI", "konversi satuan pemeriksaan", "glukosa mmol/L", "kolesterol", "kreatinin µmol/L", "lab units conversion"],
  formulas: [
    { label: "Dari konvensional ke SI", tex: "C_{SI} = C_{conv} \\times F" },
    { label: "Dari SI ke konvensional", tex: "C_{conv} = \\frac{C_{SI}}{F}" }
  ],
  inputs: [
    { id: "analyte", label: "Pemeriksaan", type: "select", default: "glucose", options: ANALYTES.map((a) => [a.id, a.label]) },
    { id: "direction", label: "Arah konversi", type: "select", default: "toSi", options: [["toSi", "Dari konvensional ke SI"], ["fromSi", "Dari SI ke konvensional"]] },
    { id: "value", label: "Nilai", type: "number", default: "100" }
  ],
  example: { values: { analyte: "glucose", direction: "toSi", value: "100" }, expect: ["5.55", "mmol/L"], note: "Contoh: gula darah 100 mg/dL setara dengan sekitar 5.55 mmol/L." },
  invalid: { values: { analyte: "glucose", direction: "toSi", value: "-5" } },
  related: ["creatinine-clearance", "drug-dosage", "bmi-bsa", "unit-converter", "fluid-requirements"]
};

export function solve(input) {
  const id = choice(input, "analyte", "Pemeriksaan", ANALYTES.map((a) => a.id), "glucose");
  const dir = choice(input, "direction", "Arah konversi", ["toSi", "fromSi"], "toSi");
  const v = num(input, "value", "Nilai", { nonNegative: true });
  const a = ANALYTES.find((x) => x.id === id);
  const toSi = a.op === "div" ? v / a.f : v * a.f;
  const fromSi = a.op === "div" ? v * a.f : v / a.f;
  const from = dir === "toSi" ? a.conv : a.si;
  const to = dir === "toSi" ? a.si : a.conv;
  const out = dir === "toSi" ? toSi : fromSi;
  const divide = (a.op === "div") !== (dir === "fromSi");
  const steps = [
    { text: `Faktor konversi untuk ${a.label}:`, tex: `\\text{${to}} = \\text{${from}} ${divide ? "\\div" : "\\times"} ${ntex(a.f)}` },
    { text: "Nilai hasil konversi:", tex: `${ntex(v)}\\ \\text{${from}} ${divide ? "\\div" : "\\times"} ${ntex(a.f)} = ${ntex(out, 6)}\\ \\text{${to}}` }
  ];
  return {
    results: [
      { label: "Nilai hasil konversi", value: `${fmt(out, 4)} ${to}`, text: `${fmt(out, 4)} ${to}` },
      { label: "Nilai awal", value: `${fmt(v)} ${from}` },
      { label: "Faktor konversi", value: factorText(a, dir) }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "Faktor konversi dari satuan konvensional ke SI", head: ["Pemeriksaan", "Konvensional", "SI", "Faktor"], rows: ANALYTES.map((x) => [x.label, x.conv, x.si, factorText(x, "toSi")]), ltr: true }
    ],
    copy: `${a.label}: ${fmt(v)} ${from} = ${fmt(out, 4)} ${to}`
  };
}
