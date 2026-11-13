import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "للتعليم والتدريب فقط، ولا يغني عن الطبيب أو الصيدلي أو البروتوكول المعتمد في مؤسستك." };

const CATEGORIES = [
  [18.5, "نقص في الوزن", "أقل من 18.5"],
  [25, "وزن طبيعي", "18.5 – 24.9"],
  [30, "زيادة في الوزن", "25 – 29.9"],
  [35, "سمنة من الدرجة الأولى", "30 – 34.9"],
  [40, "سمنة من الدرجة الثانية", "35 – 39.9"],
  [Infinity, "سمنة من الدرجة الثالثة", "40 فأكثر"]
];

function category(bmi) {
  return CATEGORIES.find(([max]) => bmi < max)[1];
}

export const meta = {
  description: "احسب مؤشر كتلة الجسم وفئته حسب منظمة الصحة العالمية، ومساحة سطح الجسم بمعادلتي Mosteller وDu Bois، والوزن المثالي بمعادلة Devine ونطاق الوزن الصحي.",
  keywords: ["مؤشر كتلة الجسم", "BMI", "مساحة سطح الجسم", "BSA", "Mosteller", "Du Bois", "الوزن المثالي", "Devine", "سمنة"],
  formulas: [
    { label: "مؤشر كتلة الجسم", tex: "BMI = \\frac{W}{H^2}\\ (H\\ \\text{بالمتر})" },
    { label: "مساحة السطح (Mosteller)", tex: "BSA = \\sqrt{\\frac{H \\cdot W}{3600}}" },
    { label: "مساحة السطح (Du Bois)", tex: "BSA = 0.007184\\, W^{0.425} H^{0.725}" },
    { label: "الوزن المثالي (Devine)", tex: "IBW = 50 + 2.3(\\text{inch} - 60)\\ \\text{للذكر}" }
  ],
  inputs: [
    { id: "weight", label: "الوزن", unit: "kg", type: "number", default: "70" },
    { id: "height", label: "الطول", unit: "cm", type: "number", default: "175" },
    { id: "sex", label: "الجنس", type: "select", default: "male", options: [["male", "ذكر"], ["female", "أنثى"]], help: "يُستخدم لحساب الوزن المثالي فقط." }
  ],
  example: { values: { weight: "70", height: "175", sex: "male" }, expect: ["22.86", "1.845 m²"], note: "مثال: شخص وزنه 70 kg وطوله 175 cm." },
  invalid: { values: { weight: "0", height: "175", sex: "male" } },
  related: ["drug-dosage", "creatinine-clearance", "fluid-requirements", "unit-converter", "iv-drip-rate"]
};

export function solve(input) {
  const w = num(input, "weight", "الوزن", { positive: true, max: 500 });
  const h = num(input, "height", "الطول", { positive: true, min: 120, max: 250 });
  const sex = choice(input, "sex", "الجنس", ["male", "female"], "male");
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
    { text: "مؤشر كتلة الجسم:", tex: `BMI = \\frac{${ntex(w)}}{(${ntex(hm, 6)})^2} = ${ntex(bmi, 6)}\\ kg/m^2` },
    { text: "الفئة حسب منظمة الصحة العالمية:", tex: `\\text{${cat}}` },
    { text: "مساحة السطح بمعادلة Mosteller:", tex: `BSA = \\sqrt{\\frac{${ntex(h)} \\times ${ntex(w)}}{3600}} = ${ntex(mosteller, 6)}\\ m^2` },
    { text: "مساحة السطح بمعادلة Du Bois:", tex: `BSA = 0.007184 \\times ${ntex(w)}^{0.425} \\times ${ntex(h)}^{0.725} = ${ntex(dubois, 6)}\\ m^2` },
    { text: "الطول بالإنش ثم الوزن المثالي بمعادلة Devine:", tex: `\\text{inch} = \\frac{${ntex(h)}}{2.54} = ${ntex(inches, 6)},\\quad IBW = ${base} + 2.3(${ntex(inches, 6)} - 60) = ${ntex(ibw, 6)}\\ kg` },
    { text: "نطاق الوزن الصحي لمؤشر 18.5 إلى 24.9:", tex: `18.5 \\times ${ntex(hm, 6)}^2 \\text{ إلى } 24.9 \\times ${ntex(hm, 6)}^2 = ${ntex(low, 6)} - ${ntex(high, 6)}\\ kg` }
  ];
  return {
    results: [
      { label: "مؤشر كتلة الجسم", value: `${fmt(bmi, 4)} kg/m²`, text: `BMI = ${fmt(bmi, 4)} kg/m²` },
      { label: "الفئة حسب منظمة الصحة العالمية", value: cat },
      { label: "مساحة السطح (Mosteller)", value: `${fmt(mosteller, 4)} m²`, text: `${fmt(mosteller, 4)} m²` },
      { label: "مساحة السطح (Du Bois)", value: `${fmt(dubois, 4)} m²` },
      { label: "الوزن المثالي (Devine)", value: `${fmt(ibw, 4)} kg` },
      { label: "نطاق الوزن الصحي", value: `${fmt(low, 4)} – ${fmt(high, 4)} kg` }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "فئات مؤشر كتلة الجسم", head: ["المدى", "الفئة"], rows: CATEGORIES.map(([, name, range]) => [range, name]) }
    ],
    copy: `BMI = ${fmt(bmi, 4)} kg/m² (${cat})، مساحة السطح (Mosteller) = ${fmt(mosteller, 4)} m²`
  };
}
