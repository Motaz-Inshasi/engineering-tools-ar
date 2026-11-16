import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "Solo con fines educativos y de formación. No sustituye al médico, al farmacéutico ni al protocolo aprobado de su institución." };

const ANALYTES = [
  { id: "glucose", label: "Glucosa", conv: "mg/dL", si: "mmol/L", op: "div", f: 18.016 },
  { id: "cholesterol", label: "Colesterol total", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "hdl", label: "Colesterol HDL", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "ldl", label: "Colesterol LDL", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "triglycerides", label: "Triglicéridos", conv: "mg/dL", si: "mmol/L", op: "div", f: 88.57 },
  { id: "creatinine", label: "Creatinina", conv: "mg/dL", si: "µmol/L", op: "mul", f: 88.4 },
  { id: "bun", label: "Nitrógeno ureico en sangre (BUN)", conv: "mg/dL", si: "mmol/L", op: "mul", f: 0.357 },
  { id: "uric", label: "Ácido úrico", conv: "mg/dL", si: "µmol/L", op: "mul", f: 59.48 },
  { id: "calcium", label: "Calcio", conv: "mg/dL", si: "mmol/L", op: "mul", f: 0.2495 },
  { id: "hemoglobin", label: "Hemoglobina", conv: "g/dL", si: "g/L", op: "mul", f: 10 },
  { id: "bilirubin", label: "Bilirrubina total", conv: "mg/dL", si: "µmol/L", op: "mul", f: 17.1 }
];

function factorText(a, dir) {
  const divide = (a.op === "div") !== (dir === "fromSi");
  return `${divide ? "÷" : "×"} ${fmt(a.f)}`;
}

export const meta = {
  description: "Convierte los resultados de análisis de laboratorio entre unidades convencionales y unidades SI para varios análisis habituales, como glucosa, colesterol, creatinina, urea, ácido úrico, calcio, hemoglobina y bilirrubina.",
  keywords: ["unidades de laboratorio", "SI", "conversión de unidades de análisis", "glucosa mmol/L", "colesterol", "creatinina µmol/L", "lab units conversion"],
  formulas: [
    { label: "De convencional a SI", tex: "C_{SI} = C_{conv} \\times F" },
    { label: "De SI a convencional", tex: "C_{conv} = \\frac{C_{SI}}{F}" }
  ],
  inputs: [
    { id: "analyte", label: "Análisis", type: "select", default: "glucose", options: ANALYTES.map((a) => [a.id, a.label]) },
    { id: "direction", label: "Sentido de la conversión", type: "select", default: "toSi", options: [["toSi", "De convencional a SI"], ["fromSi", "De SI a convencional"]] },
    { id: "value", label: "Valor", type: "number", default: "100" }
  ],
  example: { values: { analyte: "glucose", direction: "toSi", value: "100" }, expect: ["5.55", "mmol/L"], note: "Ejemplo: una glucemia de 100 mg/dL equivale a unos 5.55 mmol/L." },
  invalid: { values: { analyte: "glucose", direction: "toSi", value: "-5" } },
  related: ["creatinine-clearance", "drug-dosage", "bmi-bsa", "unit-converter", "fluid-requirements"]
};

export function solve(input) {
  const id = choice(input, "analyte", "Análisis", ANALYTES.map((a) => a.id), "glucose");
  const dir = choice(input, "direction", "Sentido de la conversión", ["toSi", "fromSi"], "toSi");
  const v = num(input, "value", "Valor", { nonNegative: true });
  const a = ANALYTES.find((x) => x.id === id);
  const toSi = a.op === "div" ? v / a.f : v * a.f;
  const fromSi = a.op === "div" ? v * a.f : v / a.f;
  const from = dir === "toSi" ? a.conv : a.si;
  const to = dir === "toSi" ? a.si : a.conv;
  const out = dir === "toSi" ? toSi : fromSi;
  const divide = (a.op === "div") !== (dir === "fromSi");
  const steps = [
    { text: `Factor de conversión para ${a.label}:`, tex: `\\text{${to}} = \\text{${from}} ${divide ? "\\div" : "\\times"} ${ntex(a.f)}` },
    { text: "Valor convertido:", tex: `${ntex(v)}\\ \\text{${from}} ${divide ? "\\div" : "\\times"} ${ntex(a.f)} = ${ntex(out, 6)}\\ \\text{${to}}` }
  ];
  return {
    results: [
      { label: "Valor convertido", value: `${fmt(out, 4)} ${to}`, text: `${fmt(out, 4)} ${to}` },
      { label: "Valor original", value: `${fmt(v)} ${from}` },
      { label: "Factor de conversión", value: factorText(a, dir) }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "Factores de conversión de unidades convencionales a SI", head: ["Análisis", "Convencional", "SI", "Factor"], rows: ANALYTES.map((x) => [x.label, x.conv, x.si, factorText(x, "toSi")]), ltr: true }
    ],
    copy: `${a.label}: ${fmt(v)} ${from} = ${fmt(out, 4)} ${to}`
  };
}
