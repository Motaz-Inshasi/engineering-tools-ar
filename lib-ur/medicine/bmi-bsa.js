import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "صرف تعلیم اور تربیت کے لیے ہے، یہ آپ کے معالج، فارماسسٹ یا آپ کے ادارے کے منظور شدہ پروٹوکول کا متبادل نہیں ہے۔" };

const CATEGORIES = [
  [18.5, "کم وزن", "18.5 سے کم"],
  [25, "نارمل وزن", "18.5 – 24.9"],
  [30, "زیادہ وزن", "25 – 29.9"],
  [35, "موٹاپا، درجہ اول", "30 – 34.9"],
  [40, "موٹاپا، درجہ دوم", "35 – 39.9"],
  [Infinity, "موٹاپا، درجہ سوم", "40 یا زیادہ"]
];

function category(bmi) {
  return CATEGORIES.find(([max]) => bmi < max)[1];
}

export const meta = {
  description: "عالمی ادارہ صحت کے مطابق باڈی ماس انڈیکس (BMI) اور اس کا زمرہ، موسٹیلر اور ڈو بوئیز کے فارمولوں سے جسمانی سطح کا رقبہ، ڈیوائن کے فارمولے سے مثالی وزن، اور صحت مند وزن کی حد حساب کریں۔",
  keywords: ["باڈی ماس انڈیکس", "BMI", "جسمانی سطح کا رقبہ", "BSA", "Mosteller", "Du Bois", "مثالی وزن", "Devine", "موٹاپا"],
  formulas: [
    { label: "باڈی ماس انڈیکس", tex: "BMI = \\frac{W}{H^2}\\ (H\\ \\text{میٹر میں})" },
    { label: "سطح کا رقبہ (موسٹیلر)", tex: "BSA = \\sqrt{\\frac{H \\cdot W}{3600}}" },
    { label: "سطح کا رقبہ (ڈو بوئیز)", tex: "BSA = 0.007184\\, W^{0.425} H^{0.725}" },
    { label: "مثالی وزن (ڈیوائن)", tex: "IBW = 50 + 2.3(\\text{انچ} - 60)\\ \\text{مرد کے لیے}" }
  ],
  inputs: [
    { id: "weight", label: "وزن", unit: "kg", type: "number", default: "70" },
    { id: "height", label: "قد", unit: "cm", type: "number", default: "175" },
    { id: "sex", label: "جنس", type: "select", default: "male", options: [["male", "مرد"], ["female", "عورت"]], help: "یہ صرف مثالی وزن کے حساب کے لیے استعمال ہوتا ہے۔" }
  ],
  example: { values: { weight: "70", height: "175", sex: "male" }, expect: ["22.86", "1.845 m²"], note: "مثال: 70 kg وزن اور 175 cm قد والا شخص۔" },
  invalid: { values: { weight: "0", height: "175", sex: "male" } },
  related: ["drug-dosage", "creatinine-clearance", "fluid-requirements", "unit-converter", "iv-drip-rate"]
};

export function solve(input) {
  const w = num(input, "weight", "وزن", { positive: true, max: 500 });
  const h = num(input, "height", "قد", { positive: true, min: 120, max: 250 });
  const sex = choice(input, "sex", "جنس", ["male", "female"], "male");
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
    { text: "باڈی ماس انڈیکس:", tex: `BMI = \\frac{${ntex(w)}}{(${ntex(hm, 6)})^2} = ${ntex(bmi, 6)}\\ kg/m^2` },
    { text: "عالمی ادارہ صحت کے مطابق زمرہ:", tex: `\\text{${cat}}` },
    { text: "موسٹیلر فارمولے سے جسمانی سطح کا رقبہ:", tex: `BSA = \\sqrt{\\frac{${ntex(h)} \\times ${ntex(w)}}{3600}} = ${ntex(mosteller, 6)}\\ m^2` },
    { text: "ڈو بوئیز فارمولے سے جسمانی سطح کا رقبہ:", tex: `BSA = 0.007184 \\times ${ntex(w)}^{0.425} \\times ${ntex(h)}^{0.725} = ${ntex(dubois, 6)}\\ m^2` },
    { text: "قد انچ میں، پھر ڈیوائن فارمولے سے مثالی وزن:", tex: `\\text{inch} = \\frac{${ntex(h)}}{2.54} = ${ntex(inches, 6)},\\quad IBW = ${base} + 2.3(${ntex(inches, 6)} - 60) = ${ntex(ibw, 6)}\\ kg` },
    { text: "18.5 سے 24.9 تک BMI کے لیے صحت مند وزن کی حد:", tex: `18.5 \\times ${ntex(hm, 6)}^2 \\text{ تک } 24.9 \\times ${ntex(hm, 6)}^2 = ${ntex(low, 6)} - ${ntex(high, 6)}\\ kg` }
  ];
  return {
    results: [
      { label: "باڈی ماس انڈیکس", value: `${fmt(bmi, 4)} kg/m²`, text: `BMI = ${fmt(bmi, 4)} kg/m²` },
      { label: "عالمی ادارہ صحت کا زمرہ", value: cat },
      { label: "سطح کا رقبہ (موسٹیلر)", value: `${fmt(mosteller, 4)} m²`, text: `${fmt(mosteller, 4)} m²` },
      { label: "سطح کا رقبہ (ڈو بوئیز)", value: `${fmt(dubois, 4)} m²` },
      { label: "مثالی وزن (ڈیوائن)", value: `${fmt(ibw, 4)} kg` },
      { label: "صحت مند وزن کی حد", value: `${fmt(low, 4)} – ${fmt(high, 4)} kg` }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "BMI کے زمرے", head: ["حد", "زمرہ"], rows: CATEGORIES.map(([, name, range]) => [range, name]) }
    ],
    copy: `BMI = ${fmt(bmi, 4)} kg/m² (${cat})، جسمانی سطح کا رقبہ (موسٹیلر) = ${fmt(mosteller, 4)} m²`
  };
}
