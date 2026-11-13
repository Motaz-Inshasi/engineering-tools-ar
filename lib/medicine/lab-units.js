import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "للتعليم والتدريب فقط، ولا يغني عن الطبيب أو الصيدلي أو البروتوكول المعتمد في مؤسستك." };

const ANALYTES = [
  { id: "glucose", label: "الجلوكوز", conv: "mg/dL", si: "mmol/L", op: "div", f: 18.016 },
  { id: "cholesterol", label: "الكوليسترول الكلي", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "hdl", label: "كوليسترول HDL", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "ldl", label: "كوليسترول LDL", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "triglycerides", label: "الدهون الثلاثية", conv: "mg/dL", si: "mmol/L", op: "div", f: 88.57 },
  { id: "creatinine", label: "الكرياتينين", conv: "mg/dL", si: "µmol/L", op: "mul", f: 88.4 },
  { id: "bun", label: "نيتروجين اليوريا في الدم (BUN)", conv: "mg/dL", si: "mmol/L", op: "mul", f: 0.357 },
  { id: "uric", label: "حمض البوليك (اليوريك)", conv: "mg/dL", si: "µmol/L", op: "mul", f: 59.48 },
  { id: "calcium", label: "الكالسيوم", conv: "mg/dL", si: "mmol/L", op: "mul", f: 0.2495 },
  { id: "hemoglobin", label: "الهيموغلوبين", conv: "g/dL", si: "g/L", op: "mul", f: 10 },
  { id: "bilirubin", label: "البيليروبين الكلي", conv: "mg/dL", si: "µmol/L", op: "mul", f: 17.1 }
];

function factorText(a, dir) {
  const divide = (a.op === "div") !== (dir === "fromSi");
  return `${divide ? "÷" : "×"} ${fmt(a.f)}`;
}

export const meta = {
  description: "حوّل نتائج التحاليل المخبرية بين الوحدات التقليدية ووحدات SI لعدد من التحاليل الشائعة مثل السكر والكوليسترول والكرياتينين واليوريا وحمض البوليك والكالسيوم والهيموغلوبين والبيليروبين.",
  keywords: ["وحدات المختبر", "SI", "تحويل وحدات التحاليل", "الجلوكوز mmol/L", "الكوليسترول", "الكرياتينين µmol/L", "lab units conversion"],
  formulas: [
    { label: "التحويل من التقليدية إلى SI", tex: "C_{SI} = C_{conv} \\times F" },
    { label: "التحويل من SI إلى التقليدية", tex: "C_{conv} = \\frac{C_{SI}}{F}" }
  ],
  inputs: [
    { id: "analyte", label: "التحليل", type: "select", default: "glucose", options: ANALYTES.map((a) => [a.id, a.label]) },
    { id: "direction", label: "اتجاه التحويل", type: "select", default: "toSi", options: [["toSi", "من التقليدية إلى SI"], ["fromSi", "من SI إلى التقليدية"]] },
    { id: "value", label: "القيمة", type: "number", default: "100" }
  ],
  example: { values: { analyte: "glucose", direction: "toSi", value: "100" }, expect: ["5.55", "mmol/L"], note: "مثال: سكر الدم 100 mg/dL يساوي نحو 5.55 mmol/L." },
  invalid: { values: { analyte: "glucose", direction: "toSi", value: "-5" } },
  related: ["creatinine-clearance", "drug-dosage", "bmi-bsa", "unit-converter", "fluid-requirements"]
};

export function solve(input) {
  const id = choice(input, "analyte", "التحليل", ANALYTES.map((a) => a.id), "glucose");
  const dir = choice(input, "direction", "اتجاه التحويل", ["toSi", "fromSi"], "toSi");
  const v = num(input, "value", "القيمة", { nonNegative: true });
  const a = ANALYTES.find((x) => x.id === id);
  const toSi = a.op === "div" ? v / a.f : v * a.f;
  const fromSi = a.op === "div" ? v * a.f : v / a.f;
  const from = dir === "toSi" ? a.conv : a.si;
  const to = dir === "toSi" ? a.si : a.conv;
  const out = dir === "toSi" ? toSi : fromSi;
  const divide = (a.op === "div") !== (dir === "fromSi");
  const steps = [
    { text: `معامل التحويل لـ ${a.label}:`, tex: `\\text{${to}} = \\text{${from}} ${divide ? "\\div" : "\\times"} ${ntex(a.f)}` },
    { text: "القيمة المحوّلة:", tex: `${ntex(v)}\\ \\text{${from}} ${divide ? "\\div" : "\\times"} ${ntex(a.f)} = ${ntex(out, 6)}\\ \\text{${to}}` }
  ];
  return {
    results: [
      { label: "القيمة المحوّلة", value: `${fmt(out, 4)} ${to}`, text: `${fmt(out, 4)} ${to}` },
      { label: "القيمة الأصلية", value: `${fmt(v)} ${from}` },
      { label: "عامل التحويل", value: factorText(a, dir) }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "عوامل التحويل من الوحدة التقليدية إلى SI", head: ["التحليل", "التقليدية", "SI", "العامل"], rows: ANALYTES.map((x) => [x.label, x.conv, x.si, factorText(x, "toSi")]), ltr: true }
    ],
    copy: `${a.label}: ${fmt(v)} ${from} = ${fmt(out, 4)} ${to}`
  };
}
