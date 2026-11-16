import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "صرف تعلیم اور تربیت کے لیے ہے، یہ آپ کے معالج، فارماسسٹ یا آپ کے ادارے کے منظور شدہ پروٹوکول کا متبادل نہیں ہے۔" };

const ANALYTES = [
  { id: "glucose", label: "گلوکوز", conv: "mg/dL", si: "mmol/L", op: "div", f: 18.016 },
  { id: "cholesterol", label: "کل کولیسٹرول", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "hdl", label: "HDL کولیسٹرول", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "ldl", label: "LDL کولیسٹرول", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "triglycerides", label: "ٹرائگلیسرائیڈز", conv: "mg/dL", si: "mmol/L", op: "div", f: 88.57 },
  { id: "creatinine", label: "کریٹینین", conv: "mg/dL", si: "µmol/L", op: "mul", f: 88.4 },
  { id: "bun", label: "خون میں یوریا نائٹروجن (BUN)", conv: "mg/dL", si: "mmol/L", op: "mul", f: 0.357 },
  { id: "uric", label: "یورک ایسڈ", conv: "mg/dL", si: "µmol/L", op: "mul", f: 59.48 },
  { id: "calcium", label: "کیلشیم", conv: "mg/dL", si: "mmol/L", op: "mul", f: 0.2495 },
  { id: "hemoglobin", label: "ہیموگلوبن", conv: "g/dL", si: "g/L", op: "mul", f: 10 },
  { id: "bilirubin", label: "کل بلی روبن", conv: "mg/dL", si: "µmol/L", op: "mul", f: 17.1 }
];

function factorText(a, dir) {
  const divide = (a.op === "div") !== (dir === "fromSi");
  return `${divide ? "÷" : "×"} ${fmt(a.f)}`;
}

export const meta = {
  description: "روایتی اکائیوں اور SI اکائیوں کے درمیان لیبارٹری ٹیسٹ کے نتائج تبدیل کریں، جیسے گلوکوز، کولیسٹرول، کریٹینین، یوریا، یورک ایسڈ، کیلشیم، ہیموگلوبن اور بلی روبن کے لیے۔",
  keywords: ["لیبارٹری اکائیاں", "SI", "لیبارٹری اکائیوں کی تبدیلی", "گلوکوز mmol/L", "کولیسٹرول", "کریٹینین µmol/L", "lab units conversion"],
  formulas: [
    { label: "روایتی سے SI میں", tex: "C_{SI} = C_{conv} \\times F" },
    { label: "SI سے روایتی میں", tex: "C_{conv} = \\frac{C_{SI}}{F}" }
  ],
  inputs: [
    { id: "analyte", label: "ٹیسٹ", type: "select", default: "glucose", options: ANALYTES.map((a) => [a.id, a.label]) },
    { id: "direction", label: "تبدیلی کی سمت", type: "select", default: "toSi", options: [["toSi", "روایتی سے SI میں"], ["fromSi", "SI سے روایتی میں"]] },
    { id: "value", label: "قدر", type: "number", default: "100" }
  ],
  example: { values: { analyte: "glucose", direction: "toSi", value: "100" }, expect: ["5.55", "mmol/L"], note: "مثال: خون میں گلوکوز 100 mg/dL تقریباً 5.55 mmol/L کے برابر ہے۔" },
  invalid: { values: { analyte: "glucose", direction: "toSi", value: "-5" } },
  related: ["creatinine-clearance", "drug-dosage", "bmi-bsa", "unit-converter", "fluid-requirements"]
};

export function solve(input) {
  const id = choice(input, "analyte", "ٹیسٹ", ANALYTES.map((a) => a.id), "glucose");
  const dir = choice(input, "direction", "تبدیلی کی سمت", ["toSi", "fromSi"], "toSi");
  const v = num(input, "value", "قدر", { nonNegative: true });
  const a = ANALYTES.find((x) => x.id === id);
  const toSi = a.op === "div" ? v / a.f : v * a.f;
  const fromSi = a.op === "div" ? v * a.f : v / a.f;
  const from = dir === "toSi" ? a.conv : a.si;
  const to = dir === "toSi" ? a.si : a.conv;
  const out = dir === "toSi" ? toSi : fromSi;
  const divide = (a.op === "div") !== (dir === "fromSi");
  const steps = [
    { text: `${a.label} کا تبدیلی عامل:`, tex: `\\text{${to}} = \\text{${from}} ${divide ? "\\div" : "\\times"} ${ntex(a.f)}` },
    { text: "تبدیل شدہ قدر:", tex: `${ntex(v)}\\ \\text{${from}} ${divide ? "\\div" : "\\times"} ${ntex(a.f)} = ${ntex(out, 6)}\\ \\text{${to}}` }
  ];
  return {
    results: [
      { label: "تبدیل شدہ قدر", value: `${fmt(out, 4)} ${to}`, text: `${fmt(out, 4)} ${to}` },
      { label: "اصل قدر", value: `${fmt(v)} ${from}` },
      { label: "تبدیلی کا عامل", value: factorText(a, dir) }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "روایتی اکائیوں سے SI اکائیوں کے تبدیلی کے عوامل", head: ["ٹیسٹ", "روایتی", "SI", "عامل"], rows: ANALYTES.map((x) => [x.label, x.conv, x.si, factorText(x, "toSi")]), ltr: true }
    ],
    copy: `${a.label}: ${fmt(v)} ${from} = ${fmt(out, 4)} ${to}`
  };
}
