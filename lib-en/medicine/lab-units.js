import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "For education and training only. It does not replace your physician, pharmacist or the approved protocol of your institution." };

const ANALYTES = [
  { id: "glucose", label: "Glucose", conv: "mg/dL", si: "mmol/L", op: "div", f: 18.016 },
  { id: "cholesterol", label: "Total cholesterol", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "hdl", label: "HDL cholesterol", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "ldl", label: "LDL cholesterol", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "triglycerides", label: "Triglycerides", conv: "mg/dL", si: "mmol/L", op: "div", f: 88.57 },
  { id: "creatinine", label: "Creatinine", conv: "mg/dL", si: "µmol/L", op: "mul", f: 88.4 },
  { id: "bun", label: "Blood urea nitrogen (BUN)", conv: "mg/dL", si: "mmol/L", op: "mul", f: 0.357 },
  { id: "uric", label: "Uric acid", conv: "mg/dL", si: "µmol/L", op: "mul", f: 59.48 },
  { id: "calcium", label: "Calcium", conv: "mg/dL", si: "mmol/L", op: "mul", f: 0.2495 },
  { id: "hemoglobin", label: "Hemoglobin", conv: "g/dL", si: "g/L", op: "mul", f: 10 },
  { id: "bilirubin", label: "Total bilirubin", conv: "mg/dL", si: "µmol/L", op: "mul", f: 17.1 }
];

function factorText(a, dir) {
  const divide = (a.op === "div") !== (dir === "fromSi");
  return `${divide ? "÷" : "×"} ${fmt(a.f)}`;
}

export const meta = {
  description: "Convert laboratory test results between conventional units and SI units for a number of common tests, such as glucose, cholesterol, creatinine, urea, uric acid, calcium, hemoglobin and bilirubin.",
  keywords: ["laboratory units", "SI", "lab unit conversion", "glucose mmol/L", "cholesterol", "creatinine µmol/L", "lab units conversion"],
  formulas: [
    { label: "Conventional to SI", tex: "C_{SI} = C_{conv} \\times F" },
    { label: "SI to conventional", tex: "C_{conv} = \\frac{C_{SI}}{F}" }
  ],
  inputs: [
    { id: "analyte", label: "Test", type: "select", default: "glucose", options: ANALYTES.map((a) => [a.id, a.label]) },
    { id: "direction", label: "Conversion direction", type: "select", default: "toSi", options: [["toSi", "From conventional to SI"], ["fromSi", "From SI to conventional"]] },
    { id: "value", label: "Value", type: "number", default: "100" }
  ],
  example: { values: { analyte: "glucose", direction: "toSi", value: "100" }, expect: ["5.55", "mmol/L"], note: "Example: blood glucose of 100 mg/dL equals about 5.55 mmol/L." },
  invalid: { values: { analyte: "glucose", direction: "toSi", value: "-5" } },
  related: ["creatinine-clearance", "drug-dosage", "bmi-bsa", "unit-converter", "fluid-requirements"]
};

export function solve(input) {
  const id = choice(input, "analyte", "Test", ANALYTES.map((a) => a.id), "glucose");
  const dir = choice(input, "direction", "Conversion direction", ["toSi", "fromSi"], "toSi");
  const v = num(input, "value", "Value", { nonNegative: true });
  const a = ANALYTES.find((x) => x.id === id);
  const toSi = a.op === "div" ? v / a.f : v * a.f;
  const fromSi = a.op === "div" ? v * a.f : v / a.f;
  const from = dir === "toSi" ? a.conv : a.si;
  const to = dir === "toSi" ? a.si : a.conv;
  const out = dir === "toSi" ? toSi : fromSi;
  const divide = (a.op === "div") !== (dir === "fromSi");
  const steps = [
    { text: `Conversion factor for ${a.label}:`, tex: `\\text{${to}} = \\text{${from}} ${divide ? "\\div" : "\\times"} ${ntex(a.f)}` },
    { text: "Converted value:", tex: `${ntex(v)}\\ \\text{${from}} ${divide ? "\\div" : "\\times"} ${ntex(a.f)} = ${ntex(out, 6)}\\ \\text{${to}}` }
  ];
  return {
    results: [
      { label: "Converted value", value: `${fmt(out, 4)} ${to}`, text: `${fmt(out, 4)} ${to}` },
      { label: "Original value", value: `${fmt(v)} ${from}` },
      { label: "Conversion factor", value: factorText(a, dir) }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "Conversion factors from conventional units to SI", head: ["Test", "Conventional", "SI", "Factor"], rows: ANALYTES.map((x) => [x.label, x.conv, x.si, factorText(x, "toSi")]), ltr: true }
    ],
    copy: `${a.label}: ${fmt(v)} ${from} = ${fmt(out, 4)} ${to}`
  };
}
