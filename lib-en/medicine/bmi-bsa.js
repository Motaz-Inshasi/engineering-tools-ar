import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "For education and training only. It does not replace your physician, pharmacist or the approved protocol of your institution." };

const CATEGORIES = [
  [18.5, "Underweight", "Below 18.5"],
  [25, "Normal weight", "18.5 – 24.9"],
  [30, "Overweight", "25 – 29.9"],
  [35, "Obesity class I", "30 – 34.9"],
  [40, "Obesity class II", "35 – 39.9"],
  [Infinity, "Obesity class III", "40 or more"]
];

function category(bmi) {
  return CATEGORIES.find(([max]) => bmi < max)[1];
}

export const meta = {
  description: "Calculate the body mass index (BMI) and its category according to the World Health Organization, the body surface area by the Mosteller and Du Bois formulas, the ideal body weight by the Devine formula, and the healthy weight range.",
  keywords: ["body mass index", "BMI", "body surface area", "BSA", "Mosteller", "Du Bois", "ideal body weight", "Devine", "obesity"],
  formulas: [
    { label: "body mass index", tex: "BMI = \\frac{W}{H^2}\\ (H\\ \\text{in meters})" },
    { label: "Body surface area (Mosteller)", tex: "BSA = \\sqrt{\\frac{H \\cdot W}{3600}}" },
    { label: "Body surface area (Du Bois)", tex: "BSA = 0.007184\\, W^{0.425} H^{0.725}" },
    { label: "Ideal body weight (Devine)", tex: "IBW = 50 + 2.3(\\text{inch} - 60)\\ \\text{for males}" }
  ],
  inputs: [
    { id: "weight", label: "Weight", unit: "kg", type: "number", default: "70" },
    { id: "height", label: "Height", unit: "cm", type: "number", default: "175" },
    { id: "sex", label: "Sex", type: "select", default: "male", options: [["male", "Male"], ["female", "Female"]], help: "Used only to calculate the ideal body weight." }
  ],
  example: { values: { weight: "70", height: "175", sex: "male" }, expect: ["22.86", "1.845 m²"], note: "Example: a person weighing 70 kg and 175 cm tall." },
  invalid: { values: { weight: "0", height: "175", sex: "male" } },
  related: ["drug-dosage", "creatinine-clearance", "fluid-requirements", "unit-converter", "iv-drip-rate"]
};

export function solve(input) {
  const w = num(input, "weight", "Weight", { positive: true, max: 500 });
  const h = num(input, "height", "Height", { positive: true, min: 120, max: 250 });
  const sex = choice(input, "sex", "Sex", ["male", "female"], "male");
  const hm = h / 100;
  const bmi = w / (hm * hm);
  const cat = category(bmi);
  const mosteller = Math.sqrt(h * w / 3600);
  const dubois = 0.007184 * Math.pow(w, 0.425) * Math.pow(h, 0.725);
  const inches = h / 2.54;
  const base = sex === "male" ? 50 : 45.5;
  const ibw = base + 2.3 * (inches - 60);
  const low = 18.5 * hm * hm;
  const high = 24.9 * hm * hm;
  const steps = [
    { text: "Body mass index:", tex: `BMI = \\frac{${ntex(w)}}{(${ntex(hm, 6)})^2} = ${ntex(bmi, 6)}\\ kg/m^2` },
    { text: "Category according to the World Health Organization:", tex: `\\text{${cat}}` },
    { text: "Body surface area by the Mosteller formula:", tex: `BSA = \\sqrt{\\frac{${ntex(h)} \\times ${ntex(w)}}{3600}} = ${ntex(mosteller, 6)}\\ m^2` },
    { text: "Body surface area by the Du Bois formula:", tex: `BSA = 0.007184 \\times ${ntex(w)}^{0.425} \\times ${ntex(h)}^{0.725} = ${ntex(dubois, 6)}\\ m^2` },
    { text: "Height in inches, then the ideal body weight by the Devine formula:", tex: `\\text{inch} = \\frac{${ntex(h)}}{2.54} = ${ntex(inches, 6)},\\quad IBW = ${base} + 2.3(${ntex(inches, 6)} - 60) = ${ntex(ibw, 6)}\\ kg` },
    { text: "Healthy weight range for a BMI from 18.5 to 24.9:", tex: `18.5 \\times ${ntex(hm, 6)}^2 \\text{ to } 24.9 \\times ${ntex(hm, 6)}^2 = ${ntex(low, 6)} - ${ntex(high, 6)}\\ kg` }
  ];
  return {
    results: [
      { label: "body mass index", value: `${fmt(bmi, 4)} kg/m²`, text: `BMI = ${fmt(bmi, 4)} kg/m²` },
      { label: "WHO category", value: cat },
      { label: "Body surface area (Mosteller)", value: `${fmt(mosteller, 4)} m²`, text: `${fmt(mosteller, 4)} m²` },
      { label: "Body surface area (Du Bois)", value: `${fmt(dubois, 4)} m²` },
      { label: "Ideal body weight (Devine)", value: `${fmt(ibw, 4)} kg` },
      { label: "Healthy weight range", value: `${fmt(low, 4)} – ${fmt(high, 4)} kg` }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "BMI categories", head: ["Range", "Category"], rows: CATEGORIES.map(([, name, range]) => [range, name]) }
    ],
    copy: `BMI = ${fmt(bmi, 4)} kg/m² (${cat}), body surface area (Mosteller) = ${fmt(mosteller, 4)} m²`
  };
}
