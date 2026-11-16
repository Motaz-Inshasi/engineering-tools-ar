import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const BIG = 18;
const SMALL = 3.6;

const packs = (need) => {
  let best = null;
  const maxBig = Math.ceil(need / BIG - 1e-9);
  for (let a = 0; a <= maxBig; a++) {
    const rest = Math.max(0, need - a * BIG);
    const b = Math.ceil(rest / SMALL - 1e-9);
    const total = Math.round((a * BIG + b * SMALL) * 100) / 100;
    const count = a + b;
    if (!best || total < best.total - 1e-9 || (Math.abs(total - best.total) < 1e-9 && count < best.count)) {
      best = { big: a, small: b, total, count };
    }
  }
  return best;
};

const packText = (p) => {
  const parts = [];
  if (p.big > 0) parts.push(`${p.big} × ${BIG} litres`);
  if (p.small > 0) parts.push(`${p.small} × ${SMALL} litres`);
  return parts.join(" + ");
};

const paint = (input) => {
  const L = num(input, "roomL", "Longueur de la pièce", { positive: true, max: 1000 });
  const W = num(input, "roomW", "Largeur de la pièce", { positive: true, max: 1000 });
  const H = num(input, "roomH", "Hauteur de la pièce", { positive: true, max: 100 });
  const doors = num(input, "doors", "Nombre de portes", { integer: true, nonNegative: true, max: 1000, default: 0 });
  const windows = num(input, "windows", "Nombre de fenêtres", { integer: true, nonNegative: true, max: 1000, default: 0 });
  const doorArea = num(input, "doorArea", "Surface d'une porte", { positive: true, max: 100, default: 2 });
  const windowArea = num(input, "windowArea", "Surface d'une fenêtre", { positive: true, max: 100, default: 1.5 });
  const coats = num(input, "coats", "Nombre de couches", { integer: true, min: 1, max: 5, default: 2 });
  const coverage = num(input, "coverage", "Rendement par litre", { positive: true, max: 100, default: 10 });
  const ceiling = !isBlank(input.ceiling) && String(input.ceiling) !== "0";

  const gross = 2 * (L + W) * H;
  const openings = doors * doorArea + windows * windowArea;
  if (openings >= gross) fail("La surface des portes et des fenêtres égale ou dépasse la surface des murs ; vérifiez les dimensions ou le nombre d'ouvertures.", "doors");
  const walls = gross - openings;
  const ceilingArea = ceiling ? L * W : 0;
  const area = walls + ceilingArea;
  const liters = (area * coats) / coverage;
  const pack = packs(liters);
  const surplus = Math.max(0, Math.round((pack.total - liters) * 1e4) / 1e4);

  return {
    results: [
      { label: "Surface nette des murs", value: `${fmt(walls, 6)} m²` },
      { label: "Surface du plafond", value: `${fmt(ceilingArea, 6)} m²` },
      { label: "Surface totale de peinture par couche", value: `${fmt(area, 6)} m²` },
      { label: "Quantité de peinture nécessaire", value: `${fmt(liters, 4)} litres` },
      { label: "Pots suggérés", value: packText(pack) },
      { label: "Quantité totale achetée", value: `${fmt(pack.total, 4)} litres` },
      { label: "Surplus", value: `${fmt(surplus, 4)} litres` }
    ],
    steps: [
      { text: "Surface nette des murs après déduction des ouvertures :", tex: `A_w = 2(${ntex(L)} + ${ntex(W)}) \\times ${ntex(H)} - (${doors} \\times ${ntex(doorArea)} + ${windows} \\times ${ntex(windowArea)}) = ${ntex(walls, 6)}\\ \\text{m}^2` },
      { text: "Surface de peinture par couche :", tex: `A = A_w${ceiling ? ` + ${ntex(L)} \\times ${ntex(W)}` : ""} = ${ntex(area, 6)}\\ \\text{m}^2` },
      { text: "Quantité de peinture pour toutes les couches :", tex: `V = \\frac{A \\times ${coats}}{${ntex(coverage)}} = ${ntex(liters, 6)}\\ \\text{L}` },
      { text: "Choix de la combinaison de pots (18 litres et 3.6 litres) qui minimise le gaspillage, puis nombre de pots :", tex: `${ntex(pack.total, 6)}\\ \\text{L} \\ge ${ntex(liters, 6)}\\ \\text{L}` }
    ],
    copy: `Surface à peindre : ${fmt(area, 6)} m², quantité nécessaire : ${fmt(liters, 4)} litres, pots : ${packText(pack)} (total ${fmt(pack.total, 4)} litres)`
  };
};

const tiles = (input) => {
  const floorL = num(input, "floorL", "Longueur du sol", { positive: true, max: 1000 });
  const floorW = num(input, "floorW", "Largeur du sol", { positive: true, max: 1000 });
  const tileL = num(input, "tileL", "Longueur du carreau", { positive: true, max: 500 });
  const tileW = num(input, "tileW", "Largeur du carreau", { positive: true, max: 500 });
  const waste = num(input, "waste", "Taux de chutes", { min: 0, max: 100, default: 10 });
  const perBox = num(input, "perBox", "Nombre de carreaux par boîte", { integer: true, min: 1, max: 10000, optional: true });

  const area = floorL * floorW;
  const tileArea = (tileL / 100) * (tileW / 100);
  const withWaste = area * (1 + waste / 100);
  const count = Math.ceil(withWaste / tileArea - 1e-9);
  const boxes = perBox === null ? null : Math.ceil(count / perBox - 1e-9);

  const results = [
    { label: "Surface du sol", value: `${fmt(area, 6)} m²` },
    { label: "Surface d'un carreau", value: `${fmt(tileArea, 6)} m²` },
    { label: "Surface avec chutes", value: `${fmt(withWaste, 6)} m²` },
    { label: "Nombre de carreaux nécessaire", value: `${count} carreaux` }
  ];
  let copy = `Nombre de carreaux : ${count} carreaux (surface du sol ${fmt(area, 6)} m², avec ${fmt(waste)} % de chutes)`;
  if (boxes !== null) {
    results.push({ label: "Nombre de boîtes", value: `${boxes} boîtes` });
    copy += `, nombre de boîtes : ${boxes} boîtes`;
  }

  return {
    results,
    steps: [
      { text: "Surface du sol et surface d'un carreau :", tex: `A = ${ntex(floorL)} \\times ${ntex(floorW)} = ${ntex(area, 6)}\\ \\text{m}^2,\\qquad a = \\frac{${ntex(tileL)}}{100} \\times \\frac{${ntex(tileW)}}{100} = ${ntex(tileArea, 6)}\\ \\text{m}^2` },
      { text: "On ajoute le taux de chutes et on arrondit le nombre de carreaux à l'entier supérieur :", tex: `N = \\left\\lceil \\frac{A(1 + ${ntex(waste / 100, 6)})}{a} \\right\\rceil = \\left\\lceil \\frac{${ntex(withWaste, 6)}}{${ntex(tileArea, 6)}} \\right\\rceil = ${count}` }
    ],
    copy
  };
};

export const meta = {
  description: "Calcul de la peinture nécessaire pour une pièce après déduction des portes et fenêtres, selon le nombre de couches et le rendement, avec le mélange de pots de 18 L et 3.6 L au moindre gaspillage, ou nombre de carreaux au sol avec le taux de casse et le nombre de boîtes.",
  keywords: ["peinture", "enduit", "carrelage", "céramique", "quantité de peinture", "nombre de carreaux", "paint", "tiles"],
  formulas: [
    { label: "Surface nette des murs", tex: "A_w = 2(L + W) H - \\sum A_{\\text{openings}}" },
    { label: "quantité de peinture", tex: "V = \\frac{A \\times \\text{coats}}{\\text{coverage}}" },
    { label: "Nombre de carreaux avec chutes", tex: "N = \\left\\lceil \\frac{A (1 + w)}{a} \\right\\rceil" }
  ],
  inputs: [
    { id: "mode", label: "Type de calcul", type: "select", default: "paint", options: [["paint", "Quantité de peinture pour la pièce"], ["tiles", "Nombre de carreaux pour le sol"]] },
    { id: "roomL", label: "Longueur de la pièce", unit: "m", type: "number", default: "4", when: { mode: ["paint"] } },
    { id: "roomW", label: "Largeur de la pièce", unit: "m", type: "number", default: "3", when: { mode: ["paint"] } },
    { id: "roomH", label: "Hauteur des murs", unit: "m", type: "number", default: "2.7", when: { mode: ["paint"] } },
    { id: "doors", label: "Nombre de portes", type: "number", default: "1", when: { mode: ["paint"] } },
    { id: "doorArea", label: "Surface d'une porte", unit: "m²", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "windows", label: "Nombre de fenêtres", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "windowArea", label: "Surface d'une fenêtre", unit: "m²", type: "number", default: "1.5", when: { mode: ["paint"] } },
    { id: "ceiling", label: "Peindre aussi le plafond", type: "checkbox", default: "1", when: { mode: ["paint"] } },
    { id: "coats", label: "Nombre de couches", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "coverage", label: "Rendement par litre", unit: "m²/L", type: "number", default: "10", when: { mode: ["paint"] }, help: "Varie selon le type de peinture, généralement entre 8 et 12 m²/L." },
    { id: "floorL", label: "Longueur du sol", unit: "m", type: "number", default: "4", when: { mode: ["tiles"] } },
    { id: "floorW", label: "Largeur du sol", unit: "m", type: "number", default: "3", when: { mode: ["tiles"] } },
    { id: "tileL", label: "Longueur du carreau", unit: "cm", type: "number", default: "60", when: { mode: ["tiles"] } },
    { id: "tileW", label: "Largeur du carreau", unit: "cm", type: "number", default: "60", when: { mode: ["tiles"] } },
    { id: "waste", label: "Taux de chutes", unit: "%", type: "number", default: "10", when: { mode: ["tiles"] }, help: "Pour la découpe et la casse, en général de 5 % à 10 %." },
    { id: "perBox", label: "Nombre de carreaux par boîte", type: "number", when: { mode: ["tiles"] }, help: "Facultatif : permet de calculer le nombre de boîtes." }
  ],
  example: {
    values: { mode: "paint", roomL: "4", roomW: "3", roomH: "2.7", doors: "1", doorArea: "2", windows: "2", windowArea: "1.5", ceiling: "1", coats: "2", coverage: "10", floorL: "4", floorW: "3", tileL: "60", tileW: "60", waste: "10", perBox: "" },
    expect: ["3 × 3.6 litres"],
    note: "Exemple : pièce de 4×3 et de 2.7 m de hauteur, avec une porte, deux fenêtres, un plafond et deux couches."
  },
  invalid: { values: { mode: "tiles", roomL: "4", roomW: "3", roomH: "2.7", doors: "1", doorArea: "2", windows: "2", windowArea: "1.5", ceiling: "1", coats: "2", coverage: "10", floorL: "4", floorW: "3", tileL: "0", tileW: "60", waste: "10", perBox: "" } },
  related: ["unit-converter", "percentage", "discount-tax"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Type de calcul", ["paint", "tiles"], "paint");
  return mode === "tiles" ? tiles(input) : paint(input);
}
