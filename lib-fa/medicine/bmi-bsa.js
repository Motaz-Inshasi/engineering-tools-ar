import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "صرفاً برای آموزش و تمرین است و جایگزین پزشک، داروساز یا پروتکل معتبر مؤسسهٔ شما نیست." };

const CATEGORIES = [
  [18.5, "کمبود وزن", "کمتر از 18.5"],
  [25, "وزن طبیعی", "18.5 – 24.9"],
  [30, "اضافه‌وزن", "25 – 29.9"],
  [35, "چاقی درجهٔ یک", "30 – 34.9"],
  [40, "چاقی درجهٔ دو", "35 – 39.9"],
  [Infinity, "چاقی درجهٔ سه", "40 یا بیشتر"]
];

function category(bmi) {
  return CATEGORIES.find(([max]) => bmi < max)[1];
}

export const meta = {
  description: "شاخص توده بدنی و دستهٔ آن را طبق سازمان جهانی بهداشت، مساحت سطح بدن را با معادلات Mosteller و Du Bois، وزن ایده‌آل را با معادلهٔ Devine و بازهٔ وزن سالم را محاسبه کنید.",
  keywords: ["شاخص توده بدنی", "BMI", "مساحت سطح بدن", "BSA", "Mosteller", "Du Bois", "وزن ایده‌آل", "Devine", "چاقی"],
  formulas: [
    { label: "شاخص توده بدنی", tex: "BMI = \\frac{W}{H^2}\\ (H\\ \\text{بر حسب متر})" },
    { label: "مساحت سطح (Mosteller)", tex: "BSA = \\sqrt{\\frac{H \\cdot W}{3600}}" },
    { label: "مساحت سطح (Du Bois)", tex: "BSA = 0.007184\\, W^{0.425} H^{0.725}" },
    { label: "وزن ایده‌آل (Devine)", tex: "IBW = 50 + 2.3(\\text{inch} - 60)\\ \\text{برای مرد}" }
  ],
  inputs: [
    { id: "weight", label: "وزن", unit: "kg", type: "number", default: "70" },
    { id: "height", label: "قد", unit: "cm", type: "number", default: "175" },
    { id: "sex", label: "جنسیت", type: "select", default: "male", options: [["male", "مرد"], ["female", "زن"]], help: "فقط برای محاسبهٔ وزن ایده‌آل استفاده می‌شود." }
  ],
  example: { values: { weight: "70", height: "175", sex: "male" }, expect: ["22.86", "1.845 m²"], note: "مثال: فردی به وزن 70 kg و قد 175 cm." },
  invalid: { values: { weight: "0", height: "175", sex: "male" } },
  related: ["drug-dosage", "creatinine-clearance", "fluid-requirements", "unit-converter", "iv-drip-rate"]
};

export function solve(input) {
  const w = num(input, "weight", "وزن", { positive: true, max: 500 });
  const h = num(input, "height", "قد", { positive: true, min: 120, max: 250 });
  const sex = choice(input, "sex", "جنسیت", ["male", "female"], "male");
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
    { text: "شاخص توده بدنی:", tex: `BMI = \\frac{${ntex(w)}}{(${ntex(hm, 6)})^2} = ${ntex(bmi, 6)}\\ kg/m^2` },
    { text: "دسته طبق سازمان جهانی بهداشت:", tex: `\\text{${cat}}` },
    { text: "مساحت سطح با معادلهٔ Mosteller:", tex: `BSA = \\sqrt{\\frac{${ntex(h)} \\times ${ntex(w)}}{3600}} = ${ntex(mosteller, 6)}\\ m^2` },
    { text: "مساحت سطح با معادلهٔ Du Bois:", tex: `BSA = 0.007184 \\times ${ntex(w)}^{0.425} \\times ${ntex(h)}^{0.725} = ${ntex(dubois, 6)}\\ m^2` },
    { text: "قد بر حسب اینچ، سپس وزن ایده‌آل با معادلهٔ Devine:", tex: `\\text{inch} = \\frac{${ntex(h)}}{2.54} = ${ntex(inches, 6)},\\quad IBW = ${base} + 2.3(${ntex(inches, 6)} - 60) = ${ntex(ibw, 6)}\\ kg` },
    { text: "بازهٔ وزن سالم برای BMI از 18.5 تا 24.9:", tex: `18.5 \\times ${ntex(hm, 6)}^2 \\text{ تا } 24.9 \\times ${ntex(hm, 6)}^2 = ${ntex(low, 6)} - ${ntex(high, 6)}\\ kg` }
  ];
  return {
    results: [
      { label: "شاخص توده بدنی", value: `${fmt(bmi, 4)} kg/m²`, text: `BMI = ${fmt(bmi, 4)} kg/m²` },
      { label: "دستهٔ سازمان جهانی بهداشت", value: cat },
      { label: "مساحت سطح (Mosteller)", value: `${fmt(mosteller, 4)} m²`, text: `${fmt(mosteller, 4)} m²` },
      { label: "مساحت سطح (Du Bois)", value: `${fmt(dubois, 4)} m²` },
      { label: "وزن ایده‌آل (Devine)", value: `${fmt(ibw, 4)} kg` },
      { label: "بازهٔ وزن سالم", value: `${fmt(low, 4)} – ${fmt(high, 4)} kg` }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "دسته‌های شاخص توده بدنی", head: ["بازه", "دسته"], rows: CATEGORIES.map(([, name, range]) => [range, name]) }
    ],
    copy: `BMI = ${fmt(bmi, 4)} kg/m² (${cat})، مساحت سطح (Mosteller) = ${fmt(mosteller, 4)} m²`
  };
}
