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
  if (p.big > 0) parts.push(`${p.big} × ${BIG} litros`);
  if (p.small > 0) parts.push(`${p.small} × ${SMALL} litros`);
  return parts.join(" + ");
};

const paint = (input) => {
  const L = num(input, "roomL", "Largo de la habitación", { positive: true, max: 1000 });
  const W = num(input, "roomW", "Ancho de la habitación", { positive: true, max: 1000 });
  const H = num(input, "roomH", "Altura de la habitación", { positive: true, max: 100 });
  const doors = num(input, "doors", "Número de puertas", { integer: true, nonNegative: true, max: 1000, default: 0 });
  const windows = num(input, "windows", "Número de ventanas", { integer: true, nonNegative: true, max: 1000, default: 0 });
  const doorArea = num(input, "doorArea", "Superficie de la puerta", { positive: true, max: 100, default: 2 });
  const windowArea = num(input, "windowArea", "Superficie de la ventana", { positive: true, max: 100, default: 1.5 });
  const coats = num(input, "coats", "Número de capas", { integer: true, min: 1, max: 5, default: 2 });
  const coverage = num(input, "coverage", "Cobertura por litro", { positive: true, max: 100, default: 10 });
  const ceiling = !isBlank(input.ceiling) && String(input.ceiling) !== "0";

  const gross = 2 * (L + W) * H;
  const openings = doors * doorArea + windows * windowArea;
  if (openings >= gross) fail("La superficie de puertas y ventanas iguala o supera la de las paredes; revise las dimensiones o el número de huecos.", "doors");
  const walls = gross - openings;
  const ceilingArea = ceiling ? L * W : 0;
  const area = walls + ceilingArea;
  const liters = (area * coats) / coverage;
  const pack = packs(liters);
  const surplus = Math.max(0, Math.round((pack.total - liters) * 1e4) / 1e4);

  return {
    results: [
      { label: "Superficie neta de las paredes", value: `${fmt(walls, 6)} m²` },
      { label: "Superficie del techo", value: `${fmt(ceilingArea, 6)} m²` },
      { label: "Superficie total de pintura por capa", value: `${fmt(area, 6)} m²` },
      { label: "Cantidad de pintura necesaria", value: `${fmt(liters, 4)} litros` },
      { label: "Envases sugeridos", value: packText(pack) },
      { label: "Cantidad total comprada", value: `${fmt(pack.total, 4)} litros` },
      { label: "Sobrante", value: `${fmt(surplus, 4)} litros` }
    ],
    steps: [
      { text: "Superficie neta de paredes tras restar los huecos:", tex: `A_w = 2(${ntex(L)} + ${ntex(W)}) \\times ${ntex(H)} - (${doors} \\times ${ntex(doorArea)} + ${windows} \\times ${ntex(windowArea)}) = ${ntex(walls, 6)}\\ \\text{m}^2` },
      { text: "Superficie de pintura por capa:", tex: `A = A_w${ceiling ? ` + ${ntex(L)} \\times ${ntex(W)}` : ""} = ${ntex(area, 6)}\\ \\text{m}^2` },
      { text: "Cantidad de pintura para todas las capas:", tex: `V = \\frac{A \\times ${coats}}{${ntex(coverage)}} = ${ntex(liters, 6)}\\ \\text{L}` },
      { text: "Selección de la combinación de envases (18 litros y 3.6 litros) que reduce el desperdicio y número de envases:", tex: `${ntex(pack.total, 6)}\\ \\text{L} \\ge ${ntex(liters, 6)}\\ \\text{L}` }
    ],
    copy: `Superficie de pintura: ${fmt(area, 6)} m²; cantidad necesaria: ${fmt(liters, 4)} litros; envases: ${packText(pack)} (total ${fmt(pack.total, 4)} litros)`
  };
};

const tiles = (input) => {
  const floorL = num(input, "floorL", "Largo del suelo", { positive: true, max: 1000 });
  const floorW = num(input, "floorW", "Ancho del suelo", { positive: true, max: 1000 });
  const tileL = num(input, "tileL", "Largo de la baldosa", { positive: true, max: 500 });
  const tileW = num(input, "tileW", "Ancho de la baldosa", { positive: true, max: 500 });
  const waste = num(input, "waste", "Porcentaje de desperdicio", { min: 0, max: 100, default: 10 });
  const perBox = num(input, "perBox", "Número de baldosas por caja", { integer: true, min: 1, max: 10000, optional: true });

  const area = floorL * floorW;
  const tileArea = (tileL / 100) * (tileW / 100);
  const withWaste = area * (1 + waste / 100);
  const count = Math.ceil(withWaste / tileArea - 1e-9);
  const boxes = perBox === null ? null : Math.ceil(count / perBox - 1e-9);

  const results = [
    { label: "Superficie del suelo", value: `${fmt(area, 6)} m²` },
    { label: "Superficie de una baldosa", value: `${fmt(tileArea, 6)} m²` },
    { label: "Superficie con desperdicio", value: `${fmt(withWaste, 6)} m²` },
    { label: "Número de baldosas necesarias", value: `${count} baldosas` }
  ];
  let copy = `Número de baldosas: ${count} (superficie del suelo ${fmt(area, 6)} m² con desperdicio del ${fmt(waste)}%)`;
  if (boxes !== null) {
    results.push({ label: "Número de cajas", value: `${boxes} cajas` });
    copy += `; número de cajas: ${boxes} cajas`;
  }

  return {
    results,
    steps: [
      { text: "Superficie del suelo y de una baldosa:", tex: `A = ${ntex(floorL)} \\times ${ntex(floorW)} = ${ntex(area, 6)}\\ \\text{m}^2,\\qquad a = \\frac{${ntex(tileL)}}{100} \\times \\frac{${ntex(tileW)}}{100} = ${ntex(tileArea, 6)}\\ \\text{m}^2` },
      { text: "Añadir el porcentaje de desperdicio y redondear el número de baldosas hacia arriba:", tex: `N = \\left\\lceil \\frac{A(1 + ${ntex(waste / 100, 6)})}{a} \\right\\rceil = \\left\\lceil \\frac{${ntex(withWaste, 6)}}{${ntex(tileArea, 6)}} \\right\\rceil = ${count}` }
    ],
    copy
  };
};

export const meta = {
  description: "Calcule la pintura para una habitación descontando puertas y ventanas, con capas y cobertura, y sugiera envases de 18 y 3.6 litros con menos desperdicio; o calcule las baldosas del suelo con desperdicio y cajas.",
  keywords: ["pintura", "pintura", "baldosas", "cerámica", "cantidad de pintura", "número de baldosas", "paint", "tiles"],
  formulas: [
    { label: "Superficie neta de las paredes", tex: "A_w = 2(L + W) H - \\sum A_{\\text{openings}}" },
    { label: "cantidad de pintura", tex: "V = \\frac{A \\times \\text{coats}}{\\text{coverage}}" },
    { label: "Número de baldosas con desperdicio", tex: "N = \\left\\lceil \\frac{A (1 + w)}{a} \\right\\rceil" }
  ],
  inputs: [
    { id: "mode", label: "Tipo de cálculo", type: "select", default: "paint", options: [["paint", "Cantidad de pintura para la habitación"], ["tiles", "Número de baldosas para el suelo"]] },
    { id: "roomL", label: "Largo de la habitación", unit: "m", type: "number", default: "4", when: { mode: ["paint"] } },
    { id: "roomW", label: "Ancho de la habitación", unit: "m", type: "number", default: "3", when: { mode: ["paint"] } },
    { id: "roomH", label: "Altura de las paredes", unit: "m", type: "number", default: "2.7", when: { mode: ["paint"] } },
    { id: "doors", label: "Número de puertas", type: "number", default: "1", when: { mode: ["paint"] } },
    { id: "doorArea", label: "Superficie de una puerta", unit: "m²", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "windows", label: "Número de ventanas", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "windowArea", label: "Superficie de una ventana", unit: "m²", type: "number", default: "1.5", when: { mode: ["paint"] } },
    { id: "ceiling", label: "Pintar también el techo", type: "checkbox", default: "1", when: { mode: ["paint"] } },
    { id: "coats", label: "Número de capas", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "coverage", label: "Cobertura por litro", unit: "m²/litro", type: "number", default: "10", when: { mode: ["paint"] }, help: "Varía según el tipo de pintura, normalmente entre 8 y 12 m²/litro." },
    { id: "floorL", label: "Largo del suelo", unit: "m", type: "number", default: "4", when: { mode: ["tiles"] } },
    { id: "floorW", label: "Ancho del suelo", unit: "m", type: "number", default: "3", when: { mode: ["tiles"] } },
    { id: "tileL", label: "Largo de la baldosa", unit: "cm", type: "number", default: "60", when: { mode: ["tiles"] } },
    { id: "tileW", label: "Ancho de la baldosa", unit: "cm", type: "number", default: "60", when: { mode: ["tiles"] } },
    { id: "waste", label: "Porcentaje de desperdicio", unit: "%", type: "number", default: "10", when: { mode: ["tiles"] }, help: "Por cortes y roturas, normalmente del 5% al 10%." },
    { id: "perBox", label: "Número de baldosas por caja", type: "number", when: { mode: ["tiles"] }, help: "Opcional: para calcular el número de cajas." }
  ],
  example: {
    values: { mode: "paint", roomL: "4", roomW: "3", roomH: "2.7", doors: "1", doorArea: "2", windows: "2", windowArea: "1.5", ceiling: "1", coats: "2", coverage: "10", floorL: "4", floorW: "3", tileL: "60", tileW: "60", waste: "10", perBox: "" },
    expect: ["3 × 3.6 litros"],
    note: "Ejemplo: habitación de 4×3, altura de 2.7 m, con una puerta, dos ventanas, techo y dos capas."
  },
  invalid: { values: { mode: "tiles", roomL: "4", roomW: "3", roomH: "2.7", doors: "1", doorArea: "2", windows: "2", windowArea: "1.5", ceiling: "1", coats: "2", coverage: "10", floorL: "4", floorW: "3", tileL: "0", tileW: "60", waste: "10", perBox: "" } },
  related: ["unit-converter", "percentage", "discount-tax"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Tipo de cálculo", ["paint", "tiles"], "paint");
  return mode === "tiles" ? tiles(input) : paint(input);
}
