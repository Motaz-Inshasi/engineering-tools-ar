import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "Yalnızca eğitim ve öğretim amaçlıdır; doktorunuzun, eczacınızın veya kurumunuzda onaylı protokolün yerini tutmaz." };

const CATEGORIES = [
  [18.5, "Zayıflık", "18,5'in altı"],
  [25, "Normal kilo", "18.5 – 24.9"],
  [30, "Fazla kilo", "25 – 29.9"],
  [35, "Birinci derece obezite", "30 – 34.9"],
  [40, "İkinci derece obezite", "35 – 39.9"],
  [Infinity, "Üçüncü derece obezite", "40 ve üzeri"]
];

function category(bmi) {
  return CATEGORIES.find(([max]) => bmi < max)[1];
}

export const meta = {
  description: "Dünya Sağlık Örgütü'ne göre vücut kitle indeksini ve kategorisini, Mosteller ve Du Bois formülleriyle vücut yüzey alanını, Devine formülüyle ideal kiloyu ve sağlıklı kilo aralığını hesaplayın.",
  keywords: ["Vücut kitle indeksi", "BMI", "Vücut yüzey alanı", "BSA", "Mosteller", "Du Bois", "İdeal kilo", "Devine", "Obezite"],
  formulas: [
    { label: "Vücut kitle indeksi", tex: "BMI = \\frac{W}{H^2}\\ (H\\ \\text{metre cinsinden})" },
    { label: "Yüzey alanı (Mosteller)", tex: "BSA = \\sqrt{\\frac{H \\cdot W}{3600}}" },
    { label: "Yüzey alanı (Du Bois)", tex: "BSA = 0.007184\\, W^{0.425} H^{0.725}" },
    { label: "İdeal kilo (Devine)", tex: "IBW = 50 + 2.3(\\text{inch} - 60)\\ \\text{erkek için}" }
  ],
  inputs: [
    { id: "weight", label: "Kilo", unit: "kg", type: "number", default: "70" },
    { id: "height", label: "Boy", unit: "cm", type: "number", default: "175" },
    { id: "sex", label: "Cinsiyet", type: "select", default: "male", options: [["male", "Erkek"], ["female", "Kadın"]], help: "Yalnızca ideal kilo hesabında kullanılır." }
  ],
  example: { values: { weight: "70", height: "175", sex: "male" }, expect: ["22.86", "1.845 m²"], note: "Örnek: kilosu 70 kg ve boyu 175 cm olan bir kişi." },
  invalid: { values: { weight: "0", height: "175", sex: "male" } },
  related: ["drug-dosage", "creatinine-clearance", "fluid-requirements", "unit-converter", "iv-drip-rate"]
};

export function solve(input) {
  const w = num(input, "weight", "Kilo", { positive: true, max: 500 });
  const h = num(input, "height", "Boy", { positive: true, min: 120, max: 250 });
  const sex = choice(input, "sex", "Cinsiyet", ["male", "female"], "male");
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
    { text: "Vücut kitle indeksi:", tex: `BMI = \\frac{${ntex(w)}}{(${ntex(hm, 6)})^2} = ${ntex(bmi, 6)}\\ kg/m^2` },
    { text: "Dünya Sağlık Örgütü'ne göre kategori:", tex: `\\text{${cat}}` },
    { text: "Mosteller formülüyle yüzey alanı:", tex: `BSA = \\sqrt{\\frac{${ntex(h)} \\times ${ntex(w)}}{3600}} = ${ntex(mosteller, 6)}\\ m^2` },
    { text: "Du Bois formülüyle yüzey alanı:", tex: `BSA = 0.007184 \\times ${ntex(w)}^{0.425} \\times ${ntex(h)}^{0.725} = ${ntex(dubois, 6)}\\ m^2` },
    { text: "Boyu inç cinsine çevirip Devine formülüyle ideal kilo:", tex: `\\text{inch} = \\frac{${ntex(h)}}{2.54} = ${ntex(inches, 6)},\\quad IBW = ${base} + 2.3(${ntex(inches, 6)} - 60) = ${ntex(ibw, 6)}\\ kg` },
    { text: "BMI 18,5 ile 24,9 arasındaki sağlıklı kilo aralığı:", tex: `18.5 \\times ${ntex(hm, 6)}^2 \\text{ ile } 24.9 \\times ${ntex(hm, 6)}^2 = ${ntex(low, 6)} - ${ntex(high, 6)}\\ kg` }
  ];
  return {
    results: [
      { label: "Vücut kitle indeksi", value: `${fmt(bmi, 4)} kg/m²`, text: `BMI = ${fmt(bmi, 4)} kg/m²` },
      { label: "Dünya Sağlık Örgütü'ne göre kategori", value: cat },
      { label: "Yüzey alanı (Mosteller)", value: `${fmt(mosteller, 4)} m²`, text: `${fmt(mosteller, 4)} m²` },
      { label: "Yüzey alanı (Du Bois)", value: `${fmt(dubois, 4)} m²` },
      { label: "İdeal kilo (Devine)", value: `${fmt(ibw, 4)} kg` },
      { label: "Sağlıklı kilo aralığı", value: `${fmt(low, 4)} – ${fmt(high, 4)} kg` }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "Vücut kitle indeksi kategorileri", head: ["Aralık", "Kategori"], rows: CATEGORIES.map(([, name, range]) => [range, name]) }
    ],
    copy: `BMI = ${fmt(bmi, 4)} kg/m² (${cat}), yüzey alanı (Mosteller) = ${fmt(mosteller, 4)} m²`
  };
}
