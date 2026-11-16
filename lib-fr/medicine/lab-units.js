import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "À des fins pédagogiques et de formation uniquement ; ne remplace pas le médecin, le pharmacien ni le protocole approuvé de votre établissement." };

const ANALYTES = [
  { id: "glucose", label: "Glucose", conv: "mg/dL", si: "mmol/L", op: "div", f: 18.016 },
  { id: "cholesterol", label: "Cholestérol total", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "hdl", label: "Cholestérol HDL", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "ldl", label: "Cholestérol LDL", conv: "mg/dL", si: "mmol/L", op: "div", f: 38.67 },
  { id: "triglycerides", label: "Triglycérides", conv: "mg/dL", si: "mmol/L", op: "div", f: 88.57 },
  { id: "creatinine", label: "Créatinine", conv: "mg/dL", si: "µmol/L", op: "mul", f: 88.4 },
  { id: "bun", label: "Azote uréique sanguin (BUN)", conv: "mg/dL", si: "mmol/L", op: "mul", f: 0.357 },
  { id: "uric", label: "Acide urique", conv: "mg/dL", si: "µmol/L", op: "mul", f: 59.48 },
  { id: "calcium", label: "Calcium", conv: "mg/dL", si: "mmol/L", op: "mul", f: 0.2495 },
  { id: "hemoglobin", label: "Hémoglobine", conv: "g/dL", si: "g/L", op: "mul", f: 10 },
  { id: "bilirubin", label: "Bilirubine totale", conv: "mg/dL", si: "µmol/L", op: "mul", f: 17.1 }
];

function factorText(a, dir) {
  const divide = (a.op === "div") !== (dir === "fromSi");
  return `${divide ? "÷" : "×"} ${fmt(a.f)}`;
}

export const meta = {
  description: "Convertissez les résultats d'analyses de laboratoire entre les unités conventionnelles et les unités SI pour plusieurs analyses courantes, telles que le glucose, le cholestérol, la créatinine, l'urée, l'acide urique, le calcium, l'hémoglobine et la bilirubine.",
  keywords: ["unités de laboratoire", "SI", "conversion des unités d'analyses", "glucose mmol/L", "cholestérol", "créatinine µmol/L", "lab units conversion"],
  formulas: [
    { label: "Conversion des unités conventionnelles vers SI", tex: "C_{SI} = C_{conv} \\times F" },
    { label: "Conversion des unités SI vers conventionnelles", tex: "C_{conv} = \\frac{C_{SI}}{F}" }
  ],
  inputs: [
    { id: "analyte", label: "Analyse", type: "select", default: "glucose", options: ANALYTES.map((a) => [a.id, a.label]) },
    { id: "direction", label: "Sens de la conversion", type: "select", default: "toSi", options: [["toSi", "De conventionnelle vers SI"], ["fromSi", "De SI vers conventionnelle"]] },
    { id: "value", label: "Valeur", type: "number", default: "100" }
  ],
  example: { values: { analyte: "glucose", direction: "toSi", value: "100" }, expect: ["5.55", "mmol/L"], note: "Exemple : une glycémie de 100 mg/dL équivaut à environ 5.55 mmol/L." },
  invalid: { values: { analyte: "glucose", direction: "toSi", value: "-5" } },
  related: ["creatinine-clearance", "drug-dosage", "bmi-bsa", "unit-converter", "fluid-requirements"]
};

export function solve(input) {
  const id = choice(input, "analyte", "Analyse", ANALYTES.map((a) => a.id), "glucose");
  const dir = choice(input, "direction", "Sens de la conversion", ["toSi", "fromSi"], "toSi");
  const v = num(input, "value", "Valeur", { nonNegative: true });
  const a = ANALYTES.find((x) => x.id === id);
  const toSi = a.op === "div" ? v / a.f : v * a.f;
  const fromSi = a.op === "div" ? v * a.f : v / a.f;
  const from = dir === "toSi" ? a.conv : a.si;
  const to = dir === "toSi" ? a.si : a.conv;
  const out = dir === "toSi" ? toSi : fromSi;
  const divide = (a.op === "div") !== (dir === "fromSi");
  const steps = [
    { text: `Facteur de conversion pour ${a.label} :`, tex: `\\text{${to}} = \\text{${from}} ${divide ? "\\div" : "\\times"} ${ntex(a.f)}` },
    { text: "Valeur convertie :", tex: `${ntex(v)}\\ \\text{${from}} ${divide ? "\\div" : "\\times"} ${ntex(a.f)} = ${ntex(out, 6)}\\ \\text{${to}}` }
  ];
  return {
    results: [
      { label: "Valeur convertie", value: `${fmt(out, 4)} ${to}`, text: `${fmt(out, 4)} ${to}` },
      { label: "Valeur d'origine", value: `${fmt(v)} ${from}` },
      { label: "Facteur de conversion", value: factorText(a, dir) }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "Facteurs de conversion des unités conventionnelles vers SI", head: ["Analyse", "Conventionnelle", "SI", "Facteur"], rows: ANALYTES.map((x) => [x.label, x.conv, x.si, factorText(x, "toSi")]), ltr: true }
    ],
    copy: `${a.label}: ${fmt(v)} ${from} = ${fmt(out, 4)} ${to}`
  };
}
