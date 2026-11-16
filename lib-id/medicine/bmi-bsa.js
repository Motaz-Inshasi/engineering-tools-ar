import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "Hanya untuk edukasi dan pelatihan, dan tidak menggantikan dokter, apoteker, atau protokol resmi di institusi Anda." };

const CATEGORIES = [
  [18.5, "Berat kurang", "Kurang dari 18.5"],
  [25, "Berat normal", "18.5 – 24.9"],
  [30, "Kelebihan berat badan", "25 – 29.9"],
  [35, "Obesitas derajat pertama", "30 – 34.9"],
  [40, "Obesitas derajat kedua", "35 – 39.9"],
  [Infinity, "Obesitas derajat ketiga", "40 atau lebih"]
];

function category(bmi) {
  return CATEGORIES.find(([max]) => bmi < max)[1];
}

export const meta = {
  description: "Hitung indeks massa tubuh dan kategorinya menurut WHO, luas permukaan tubuh dengan rumus Mosteller dan Du Bois, berat ideal dengan rumus Devine, serta rentang berat badan sehat.",
  keywords: ["indeks massa tubuh", "BMI", "luas permukaan tubuh", "BSA", "Mosteller", "Du Bois", "berat ideal", "Devine", "obesitas"],
  formulas: [
    { label: "indeks massa tubuh", tex: "BMI = \\frac{W}{H^2}\\ (H\\ \\text{dalam meter})" },
    { label: "Luas permukaan (Mosteller)", tex: "BSA = \\sqrt{\\frac{H \\cdot W}{3600}}" },
    { label: "Luas permukaan (Du Bois)", tex: "BSA = 0.007184\\, W^{0.425} H^{0.725}" },
    { label: "Berat ideal (Devine)", tex: "IBW = 50 + 2.3(\\text{inch} - 60)\\ \\text{untuk pria}" }
  ],
  inputs: [
    { id: "weight", label: "Berat", unit: "kg", type: "number", default: "70" },
    { id: "height", label: "Tinggi", unit: "cm", type: "number", default: "175" },
    { id: "sex", label: "Jenis kelamin", type: "select", default: "male", options: [["male", "Pria"], ["female", "Wanita"]], help: "Hanya digunakan untuk menghitung berat ideal." }
  ],
  example: { values: { weight: "70", height: "175", sex: "male" }, expect: ["22.86", "1.845 m²"], note: "Contoh: orang dengan berat 70 kg dan tinggi 175 cm." },
  invalid: { values: { weight: "0", height: "175", sex: "male" } },
  related: ["drug-dosage", "creatinine-clearance", "fluid-requirements", "unit-converter", "iv-drip-rate"]
};

export function solve(input) {
  const w = num(input, "weight", "Berat", { positive: true, max: 500 });
  const h = num(input, "height", "Tinggi", { positive: true, min: 120, max: 250 });
  const sex = choice(input, "sex", "Jenis kelamin", ["male", "female"], "male");
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
    { text: "Indeks massa tubuh:", tex: `BMI = \\frac{${ntex(w)}}{(${ntex(hm, 6)})^2} = ${ntex(bmi, 6)}\\ kg/m^2` },
    { text: "Kategori menurut WHO:", tex: `\\text{${cat}}` },
    { text: "Luas permukaan dengan rumus Mosteller:", tex: `BSA = \\sqrt{\\frac{${ntex(h)} \\times ${ntex(w)}}{3600}} = ${ntex(mosteller, 6)}\\ m^2` },
    { text: "Luas permukaan dengan rumus Du Bois:", tex: `BSA = 0.007184 \\times ${ntex(w)}^{0.425} \\times ${ntex(h)}^{0.725} = ${ntex(dubois, 6)}\\ m^2` },
    { text: "Tinggi dalam inci lalu berat ideal dengan rumus Devine:", tex: `\\text{inch} = \\frac{${ntex(h)}}{2.54} = ${ntex(inches, 6)},\\quad IBW = ${base} + 2.3(${ntex(inches, 6)} - 60) = ${ntex(ibw, 6)}\\ kg` },
    { text: "Rentang berat sehat untuk IMT 18.5 hingga 24.9:", tex: `18.5 \\times ${ntex(hm, 6)}^2 \\text{ hingga } 24.9 \\times ${ntex(hm, 6)}^2 = ${ntex(low, 6)} - ${ntex(high, 6)}\\ kg` }
  ];
  return {
    results: [
      { label: "indeks massa tubuh", value: `${fmt(bmi, 4)} kg/m²`, text: `BMI = ${fmt(bmi, 4)} kg/m²` },
      { label: "Kategori menurut WHO", value: cat },
      { label: "Luas permukaan (Mosteller)", value: `${fmt(mosteller, 4)} m²`, text: `${fmt(mosteller, 4)} m²` },
      { label: "Luas permukaan (Du Bois)", value: `${fmt(dubois, 4)} m²` },
      { label: "Berat ideal (Devine)", value: `${fmt(ibw, 4)} kg` },
      { label: "Rentang berat badan sehat", value: `${fmt(low, 4)} – ${fmt(high, 4)} kg` }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "Kategori indeks massa tubuh", head: ["Rentang", "Kategori"], rows: CATEGORIES.map(([, name, range]) => [range, name]) }
    ],
    copy: `IMT = ${fmt(bmi, 4)} kg/m² (${cat}), luas permukaan (Mosteller) = ${fmt(mosteller, 4)} m²`
  };
}
