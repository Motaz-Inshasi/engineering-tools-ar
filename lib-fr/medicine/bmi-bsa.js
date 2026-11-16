import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "À des fins pédagogiques et de formation uniquement ; ne remplace pas le médecin, le pharmacien ni le protocole approuvé de votre établissement." };

const CATEGORIES = [
  [18.5, "Insuffisance pondérale", "inférieur à 18.5"],
  [25, "Poids normal", "18.5 – 24.9"],
  [30, "Surpoids", "25 – 29.9"],
  [35, "Obésité de classe I", "30 – 34.9"],
  [40, "Obésité de classe II", "35 – 39.9"],
  [Infinity, "Obésité de classe III", "40 et plus"]
];

function category(bmi) {
  return CATEGORIES.find(([max]) => bmi < max)[1];
}

export const meta = {
  description: "Calculez l'indice de masse corporelle et sa catégorie selon l'OMS, la surface corporelle selon les formules de Mosteller et de Du Bois, le poids idéal selon la formule de Devine et la fourchette de poids sain.",
  keywords: ["IMC", "BMI", "surface corporelle", "BSA", "Mosteller", "Du Bois", "poids idéal", "Devine", "obésité"],
  formulas: [
    { label: "IMC", tex: "BMI = \\frac{W}{H^2}\\ (H\\ \\text{en mètres})" },
    { label: "Surface corporelle (Mosteller)", tex: "BSA = \\sqrt{\\frac{H \\cdot W}{3600}}" },
    { label: "Surface corporelle (Du Bois)", tex: "BSA = 0.007184\\, W^{0.425} H^{0.725}" },
    { label: "Poids idéal (Devine)", tex: "IBW = 50 + 2.3(\\text{inch} - 60)\\ \\text{pour l'homme}" }
  ],
  inputs: [
    { id: "weight", label: "Poids", unit: "kg", type: "number", default: "70" },
    { id: "height", label: "Taille", unit: "cm", type: "number", default: "175" },
    { id: "sex", label: "Sexe", type: "select", default: "male", options: [["male", "Homme"], ["female", "Femme"]], help: "Utilisé uniquement pour calculer le poids idéal." }
  ],
  example: { values: { weight: "70", height: "175", sex: "male" }, expect: ["22.86", "1.845 m²"], note: "Exemple : personne pesant 70 kg et mesurant 175 cm." },
  invalid: { values: { weight: "0", height: "175", sex: "male" } },
  related: ["drug-dosage", "creatinine-clearance", "fluid-requirements", "unit-converter", "iv-drip-rate"]
};

export function solve(input) {
  const w = num(input, "weight", "Poids", { positive: true, max: 500 });
  const h = num(input, "height", "Taille", { positive: true, min: 120, max: 250 });
  const sex = choice(input, "sex", "Sexe", ["male", "female"], "male");
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
    { text: "Indice de masse corporelle :", tex: `BMI = \\frac{${ntex(w)}}{(${ntex(hm, 6)})^2} = ${ntex(bmi, 6)}\\ kg/m^2` },
    { text: "Catégorie selon l'OMS :", tex: `\\text{${cat}}` },
    { text: "Surface corporelle selon la formule de Mosteller :", tex: `BSA = \\sqrt{\\frac{${ntex(h)} \\times ${ntex(w)}}{3600}} = ${ntex(mosteller, 6)}\\ m^2` },
    { text: "Surface corporelle selon la formule de Du Bois :", tex: `BSA = 0.007184 \\times ${ntex(w)}^{0.425} \\times ${ntex(h)}^{0.725} = ${ntex(dubois, 6)}\\ m^2` },
    { text: "On convertit la taille en pouces, puis on calcule le poids idéal avec la formule de Devine :", tex: `\\text{inch} = \\frac{${ntex(h)}}{2.54} = ${ntex(inches, 6)},\\quad IBW = ${base} + 2.3(${ntex(inches, 6)} - 60) = ${ntex(ibw, 6)}\\ kg` },
    { text: "Fourchette de poids sain pour un IMC de 18.5 à 24.9 :", tex: `18.5 \\times ${ntex(hm, 6)}^2 \\text{ à } 24.9 \\times ${ntex(hm, 6)}^2 = ${ntex(low, 6)} - ${ntex(high, 6)}\\ kg` }
  ];
  return {
    results: [
      { label: "IMC", value: `${fmt(bmi, 4)} kg/m²`, text: `BMI = ${fmt(bmi, 4)} kg/m²` },
      { label: "Catégorie selon l'OMS", value: cat },
      { label: "Surface corporelle (Mosteller)", value: `${fmt(mosteller, 4)} m²`, text: `${fmt(mosteller, 4)} m²` },
      { label: "Surface corporelle (Du Bois)", value: `${fmt(dubois, 4)} m²` },
      { label: "Poids idéal (Devine)", value: `${fmt(ibw, 4)} kg` },
      { label: "Fourchette de poids sain", value: `${fmt(low, 4)} – ${fmt(high, 4)} kg` }
    ],
    steps,
    blocks: [
      NOTE,
      { type: "table", caption: "Catégories de l'indice de masse corporelle", head: ["Intervalle", "Catégorie"], rows: CATEGORIES.map(([, name, range]) => [range, name]) }
    ],
    copy: `IMC = ${fmt(bmi, 4)} kg/m² (${cat}), surface corporelle (Mosteller) = ${fmt(mosteller, 4)} m²`
  };
}
