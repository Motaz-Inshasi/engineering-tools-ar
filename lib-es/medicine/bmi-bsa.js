import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "Solo con fines educativos y de formación. No sustituye al médico, al farmacéutico ni al protocolo aprobado de su institución." };

const CATEGORIES = [
  [18.5, "Bajo peso", "Menos de 18.5"],
  [25, "Peso normal", "18.5 – 24.9"],
  [30, "Sobrepeso", "25 – 29.9"],
  [35, "Obesidad grado I", "30 – 34.9"],
  [40, "Obesidad grado II", "35 – 39.9"],
  [Infinity, "Obesidad grado III", "40 o más"]
];

function category(bmi) {
  return CATEGORIES.find(([max]) => bmi < max)[1];
}

export const meta = {
  description: "Calcula el índice de masa corporal (IMC) y su categoría según la Organización Mundial de la Salud, la superficie corporal con las fórmulas de Mosteller y Du Bois, el peso ideal con la fórmula de Devine y el rango de peso saludable.",
  keywords: ["índice de masa corporal", "BMI", "superficie corporal", "BSA", "Mosteller", "Du Bois", "peso ideal", "Devine", "obesidad"],
  formulas: [
    { label: "índice de masa corporal", tex: "IMC = \\frac{W}{H^2}\\ (H\\ \\text{en metros})" },
    { label: "Superficie corporal (Mosteller)", tex: "BSA = \\sqrt{\\frac{H \\cdot W}{3600}}" },
    { label: "Superficie corporal (Du Bois)", tex: "BSA = 0.007184\\, W^{0.425} H^{0.725}" },
    { label: "Peso ideal (Devine)", tex: "IBW = 50 + 2.3(\\text{inch} - 60)\\ \\text{para hombres}" }
  ],
  inputs: [
    { id: "weight", label: "Peso", unit: "kg", type: "number", default: "70" },
    { id: "height", label: "Altura", unit: "cm", type: "number", default: "175" },
    { id: "sex", label: "Sexo", type: "select", default: "male", options: [["male", "Hombre"], ["female", "Mujer"]], help: "Se usa solo para calcular el peso ideal." }
  ],
  example: { values: { weight: "70", height: "175", sex: "male" }, expect: ["22.86", "1.845 m²"], note: "Ejemplo: una persona de 70 kg y 175 cm de altura." },
  invalid: { values: { weight: "0", height: "175", sex: "male" } },
  related: ["drug-dosage", "creatinine-clearance", "fluid-requirements", "unit-converter", "iv-drip-rate"]
};

export function solve(input) {
  const w = num(input, "weight", "Peso", { positive: true, max: 500 });
  const h = num(input, "height", "Altura", { positive: true, min: 120, max: 250 });
  const sex = choice(input, "sex", "Sexo", ["male", "female"], "male");
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
    { text: "Índice de masa corporal:", tex: `BMI = \\frac{${ntex(w)}}{(${ntex(hm, 6)})^2} = ${ntex(bmi, 6)}\\ kg/m^2` },
    { text: "Categoría según la Organización Mundial de la Salud:", tex: `\\text{${cat}}` },
    { text: "Superficie corporal con la fórmula de Mosteller:", tex: `BSA = \\sqrt{\\frac{${ntex(h)} \\times ${ntex(w)}}{3600}} = ${ntex(mosteller, 6)}\\ m^2` },
    { text: "Superficie corporal con la fórmula de Du Bois:", tex: `BSA = 0.007184 \\times ${ntex(w)}^{0.425} \\times ${ntex(h)}^{0.725} = ${ntex(dubois, 6)}\\ m^2` },
    { text: "Altura en pulgadas y después peso ideal con la fórmula de Devine:", tex: `\\text{inch} = \\frac{${ntex(h)}}{2.54} = ${ntex(inches, 6)},\\quad IBW = ${base} + 2.3(${ntex(inches, 6)} - 60) = ${ntex(ibw, 6)}\\ kg` },
    { text: "Rango de peso saludable para un IMC de 18.5 a 24.9:", tex: `18.5 \\times ${ntex(hm, 6)}^2 \\text{ a } 24.9 \\times ${ntex(hm, 6)}^2 = ${ntex(low, 6)} - ${ntex(high, 6)}\\ kg` }
  ];
  return {
    results: [
      { label: "índice de masa corporal", value: `${fmt(bmi, 4)} kg/m²`, text: `BMI = ${fmt(bmi, 4)} kg/m²` },
      { label: "Categoría según la OMS", value: cat },
      { label: "Superficie corporal (Mosteller)", value: `${fmt(mosteller, 4)} m²`, text: `${fmt(mosteller, 4)} m²` },
      { label: "Superficie corporal (Du Bois)", value: `${fmt(dubois, 4)} m²` },
      { label: "Peso ideal (Devine)", value: `${fmt(ibw, 4)} kg` },
      { label: "Rango de peso saludable", value: `${fmt(low, 4)} – ${fmt(high, 4)} kg` }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "Categorías del índice de masa corporal", head: ["Rango", "Categoría"], rows: CATEGORIES.map(([, name, range]) => [range, name]) }
    ],
    copy: `IMC = ${fmt(bmi, 4)} kg/m² (${cat}), superficie corporal (Mosteller) = ${fmt(mosteller, 4)} m²`
  };
}
