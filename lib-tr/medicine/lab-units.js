import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "Yalnızca eğitim ve öğretim amaçlıdır; doktorunuzun, eczacınızın veya kurumunuzda onaylı protokolün yerini tutmaz." };

const ANALYTES = [
  { id: "glucose", label: "Glikoz", conv: "mg/dL", si: "mmol/L", op: "div", f: 18.016 },
  { id: "cholesterol", label: "Total kolesterol", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "hdl", label: "HDL kolesterol", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "ldl", label: "LDL kolesterol", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "triglycerides", label: "Trigliserit", conv: "mg/dL", si: "mmol/L", op: "div", f: 88.57 },
  { id: "creatinine", label: "Kreatinin", conv: "mg/dL", si: "µmol/L", op: "mul", f: 88.4 },
  { id: "bun", label: "Kanda üre azotu (BUN)", conv: "mg/dL", si: "mmol/L", op: "mul", f: 0.357 },
  { id: "uric", label: "Ürik asit", conv: "mg/dL", si: "µmol/L", op: "mul", f: 59.48 },
  { id: "calcium", label: "Kalsiyum", conv: "mg/dL", si: "mmol/L", op: "mul", f: 0.2495 },
  { id: "hemoglobin", label: "Hemoglobin", conv: "g/dL", si: "g/L", op: "mul", f: 10 },
  { id: "bilirubin", label: "Total bilirubin", conv: "mg/dL", si: "µmol/L", op: "mul", f: 17.1 }
];

function factorText(a, dir) {
  const divide = (a.op === "div") !== (dir === "fromSi");
  return `${divide ? "÷" : "×"} ${fmt(a.f)}`;
}

export const meta = {
  description: "Glikoz, kolesterol, kreatinin, üre, ürik asit, kalsiyum, hemoglobin ve bilirubin gibi yaygın tetkiklerin sonuçlarını geleneksel birimler ile SI birimleri arasında çevirin.",
  keywords: ["Laboratuvar birimleri", "SI", "Tetkik birimlerini çevirme", "Glikoz mmol/L", "Kolesterol", "Kreatinin µmol/L", "lab units conversion"],
  formulas: [
    { label: "Geleneksel birimden SI'ye", tex: "C_{SI} = C_{conv} \\times F" },
    { label: "SI'den geleneksel birime", tex: "C_{conv} = \\frac{C_{SI}}{F}" }
  ],
  inputs: [
    { id: "analyte", label: "Tetkik", type: "select", default: "glucose", options: ANALYTES.map((a) => [a.id, a.label]) },
    { id: "direction", label: "Çevirme yönü", type: "select", default: "toSi", options: [["toSi", "Geleneksel birimden SI'ye"], ["fromSi", "SI'den geleneksel birime"]] },
    { id: "value", label: "Değer", type: "number", default: "100" }
  ],
  example: { values: { analyte: "glucose", direction: "toSi", value: "100" }, expect: ["5.55", "mmol/L"], note: "Örnek: kan şekeri 100 mg/dL, yaklaşık 5,55 mmol/L'ye eşittir." },
  invalid: { values: { analyte: "glucose", direction: "toSi", value: "-5" } },
  related: ["creatinine-clearance", "drug-dosage", "bmi-bsa", "unit-converter", "fluid-requirements"]
};

export function solve(input) {
  const id = choice(input, "analyte", "Tetkik", ANALYTES.map((a) => a.id), "glucose");
  const dir = choice(input, "direction", "Çevirme yönü", ["toSi", "fromSi"], "toSi");
  const v = num(input, "value", "Değer", { nonNegative: true });
  const a = ANALYTES.find((x) => x.id === id);
  const toSi = a.op === "div" ? v / a.f : v * a.f;
  const fromSi = a.op === "div" ? v * a.f : v / a.f;
  const from = dir === "toSi" ? a.conv : a.si;
  const to = dir === "toSi" ? a.si : a.conv;
  const out = dir === "toSi" ? toSi : fromSi;
  const divide = (a.op === "div") !== (dir === "fromSi");
  const steps = [
    { text: `${a.label} için çevrim katsayısı:`, tex: `\\text{${to}} = \\text{${from}} ${divide ? "\\div" : "\\times"} ${ntex(a.f)}` },
    { text: "Çevrilmiş değer:", tex: `${ntex(v)}\\ \\text{${from}} ${divide ? "\\div" : "\\times"} ${ntex(a.f)} = ${ntex(out, 6)}\\ \\text{${to}}` }
  ];
  return {
    results: [
      { label: "Çevrilmiş değer", value: `${fmt(out, 4)} ${to}`, text: `${fmt(out, 4)} ${to}` },
      { label: "Orijinal değer", value: `${fmt(v)} ${from}` },
      { label: "Çevrim katsayısı", value: factorText(a, dir) }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "Geleneksel birimden SI birimine çevrim katsayıları", head: ["Tetkik", "Geleneksel", "SI", "Katsayı"], rows: ANALYTES.map((x) => [x.label, x.conv, x.si, factorText(x, "toSi")]), ltr: true }
    ],
    copy: `${a.label}: ${fmt(v)} ${from} = ${fmt(out, 4)} ${to}`
  };
}
