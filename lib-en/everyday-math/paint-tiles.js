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
  if (p.big > 0) parts.push(`${p.big} × ${BIG} L`);
  if (p.small > 0) parts.push(`${p.small} × ${SMALL} L`);
  return parts.join(" + ");
};

const paint = (input) => {
  const L = num(input, "roomL", "Room length", { positive: true, max: 1000 });
  const W = num(input, "roomW", "Room width", { positive: true, max: 1000 });
  const H = num(input, "roomH", "Room height", { positive: true, max: 100 });
  const doors = num(input, "doors", "Number of doors", { integer: true, nonNegative: true, max: 1000, default: 0 });
  const windows = num(input, "windows", "Number of windows", { integer: true, nonNegative: true, max: 1000, default: 0 });
  const doorArea = num(input, "doorArea", "Door area", { positive: true, max: 100, default: 2 });
  const windowArea = num(input, "windowArea", "Window area", { positive: true, max: 100, default: 1.5 });
  const coats = num(input, "coats", "Number of coats", { integer: true, min: 1, max: 5, default: 2 });
  const coverage = num(input, "coverage", "Coverage per liter", { positive: true, max: 100, default: 10 });
  const ceiling = !isBlank(input.ceiling) && String(input.ceiling) !== "0";

  const gross = 2 * (L + W) * H;
  const openings = doors * doorArea + windows * windowArea;
  if (openings >= gross) fail("The area of the doors and windows equals or exceeds the wall area. Check the dimensions or the number of openings.", "doors");
  const walls = gross - openings;
  const ceilingArea = ceiling ? L * W : 0;
  const area = walls + ceilingArea;
  const liters = (area * coats) / coverage;
  const pack = packs(liters);
  const surplus = Math.max(0, Math.round((pack.total - liters) * 1e4) / 1e4);

  return {
    results: [
      { label: "Net wall area", value: `${fmt(walls, 6)} m²` },
      { label: "Ceiling area", value: `${fmt(ceilingArea, 6)} m²` },
      { label: "Total paint area per coat", value: `${fmt(area, 6)} m²` },
      { label: "Paint quantity required", value: `${fmt(liters, 4)} L` },
      { label: "Suggested containers", value: packText(pack) },
      { label: "Total quantity purchased", value: `${fmt(pack.total, 4)} L` },
      { label: "Surplus", value: `${fmt(surplus, 4)} L` }
    ],
    steps: [
      { text: "Net wall area after subtracting openings:", tex: `A_w = 2(${ntex(L)} + ${ntex(W)}) \\times ${ntex(H)} - (${doors} \\times ${ntex(doorArea)} + ${windows} \\times ${ntex(windowArea)}) = ${ntex(walls, 6)}\\ \\text{m}^2` },
      { text: "Paint area per coat:", tex: `A = A_w${ceiling ? ` + ${ntex(L)} \\times ${ntex(W)}` : ""} = ${ntex(area, 6)}\\ \\text{m}^2` },
      { text: "Paint quantity for all coats:", tex: `V = \\frac{A \\times ${coats}}{${ntex(coverage)}} = ${ntex(liters, 6)}\\ \\text{L}` },
      { text: "Choose the combination of containers (18 L and 3.6 L) that minimizes waste, then the number of containers:", tex: `${ntex(pack.total, 6)}\\ \\text{L} \\ge ${ntex(liters, 6)}\\ \\text{L}` }
    ],
    copy: `Paint area: ${fmt(area, 6)} m², quantity needed: ${fmt(liters, 4)} L, containers: ${packText(pack)} (total ${fmt(pack.total, 4)} L)`
  };
};

const tiles = (input) => {
  const floorL = num(input, "floorL", "Floor length", { positive: true, max: 1000 });
  const floorW = num(input, "floorW", "Floor width", { positive: true, max: 1000 });
  const tileL = num(input, "tileL", "Tile length", { positive: true, max: 500 });
  const tileW = num(input, "tileW", "Tile width", { positive: true, max: 500 });
  const waste = num(input, "waste", "Waste rate", { min: 0, max: 100, default: 10 });
  const perBox = num(input, "perBox", "Number of tiles per box", { integer: true, min: 1, max: 10000, optional: true });

  const area = floorL * floorW;
  const tileArea = (tileL / 100) * (tileW / 100);
  const withWaste = area * (1 + waste / 100);
  const count = Math.ceil(withWaste / tileArea - 1e-9);
  const boxes = perBox === null ? null : Math.ceil(count / perBox - 1e-9);

  const results = [
    { label: "Floor area", value: `${fmt(area, 6)} m²` },
    { label: "Area of one tile", value: `${fmt(tileArea, 6)} m²` },
    { label: "Area including waste", value: `${fmt(withWaste, 6)} m²` },
    { label: "Number of tiles required", value: `${count} tiles` }
  ];
  let copy = `Number of tiles: ${count} tiles (floor area ${fmt(area, 6)} m², with ${fmt(waste)}% waste)`;
  if (boxes !== null) {
    results.push({ label: "Number of boxes", value: `${boxes} boxes` });
    copy += `, number of boxes: ${boxes} boxes`;
  }

  return {
    results,
    steps: [
      { text: "Floor area and area of one tile:", tex: `A = ${ntex(floorL)} \\times ${ntex(floorW)} = ${ntex(area, 6)}\\ \\text{m}^2,\\qquad a = \\frac{${ntex(tileL)}}{100} \\times \\frac{${ntex(tileW)}}{100} = ${ntex(tileArea, 6)}\\ \\text{m}^2` },
      { text: "Add the waste rate and round the number of tiles up:", tex: `N = \\left\\lceil \\frac{A(1 + ${ntex(waste / 100, 6)})}{a} \\right\\rceil = \\left\\lceil \\frac{${ntex(withWaste, 6)}}{${ntex(tileArea, 6)}} \\right\\rceil = ${count}` }
    ],
    copy
  };
};

export const meta = {
  description: "Calculate the paint needed for a room after subtracting doors and windows, with the number of coats and the coverage, and suggest a combination of 18 L and 3.6 L containers with the least waste, or calculate the number of floor tiles with the waste rate and the number of boxes.",
  keywords: ["paint", "coating", "tiles", "ceramic", "paint quantity", "number of tiles", "paint", "tiles"],
  formulas: [
    { label: "Net wall area", tex: "A_w = 2(L + W) H - \\sum A_{\\text{openings}}" },
    { label: "paint quantity", tex: "V = \\frac{A \\times \\text{coats}}{\\text{coverage}}" },
    { label: "Number of tiles with waste", tex: "N = \\left\\lceil \\frac{A (1 + w)}{a} \\right\\rceil" }
  ],
  inputs: [
    { id: "mode", label: "Calculation type", type: "select", default: "paint", options: [["paint", "Paint quantity for the room"], ["tiles", "Number of floor tiles"]] },
    { id: "roomL", label: "Room length", unit: "m", type: "number", default: "4", when: { mode: ["paint"] } },
    { id: "roomW", label: "Room width", unit: "m", type: "number", default: "3", when: { mode: ["paint"] } },
    { id: "roomH", label: "Wall height", unit: "m", type: "number", default: "2.7", when: { mode: ["paint"] } },
    { id: "doors", label: "Number of doors", type: "number", default: "1", when: { mode: ["paint"] } },
    { id: "doorArea", label: "Area of one door", unit: "m²", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "windows", label: "Number of windows", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "windowArea", label: "Area of one window", unit: "m²", type: "number", default: "1.5", when: { mode: ["paint"] } },
    { id: "ceiling", label: "Also paint the ceiling", type: "checkbox", default: "1", when: { mode: ["paint"] } },
    { id: "coats", label: "Number of coats", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "coverage", label: "Coverage per liter", unit: "m²/L", type: "number", default: "10", when: { mode: ["paint"] }, help: "This varies by paint type, and is usually between 8 and 12 m²/L." },
    { id: "floorL", label: "Floor length", unit: "m", type: "number", default: "4", when: { mode: ["tiles"] } },
    { id: "floorW", label: "Floor width", unit: "m", type: "number", default: "3", when: { mode: ["tiles"] } },
    { id: "tileL", label: "Tile length", unit: "cm", type: "number", default: "60", when: { mode: ["tiles"] } },
    { id: "tileW", label: "Tile width", unit: "cm", type: "number", default: "60", when: { mode: ["tiles"] } },
    { id: "waste", label: "Waste rate", unit: "%", type: "number", default: "10", when: { mode: ["tiles"] }, help: "For cutting and breakage, usually 5% to 10%." },
    { id: "perBox", label: "Number of tiles per box", type: "number", when: { mode: ["tiles"] }, help: "Optional: used to calculate the number of boxes." }
  ],
  example: {
    values: { mode: "paint", roomL: "4", roomW: "3", roomH: "2.7", doors: "1", doorArea: "2", windows: "2", windowArea: "1.5", ceiling: "1", coats: "2", coverage: "10", floorL: "4", floorW: "3", tileL: "60", tileW: "60", waste: "10", perBox: "" },
    expect: ["3 × 3.6 L"],
    note: "Example: a 4×3 room with a height of 2.7 m, one door, two windows, a ceiling, and two coats."
  },
  invalid: { values: { mode: "tiles", roomL: "4", roomW: "3", roomH: "2.7", doors: "1", doorArea: "2", windows: "2", windowArea: "1.5", ceiling: "1", coats: "2", coverage: "10", floorL: "4", floorW: "3", tileL: "0", tileW: "60", waste: "10", perBox: "" } },
  related: ["unit-converter", "percentage", "discount-tax"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Calculation type", ["paint", "tiles"], "paint");
  return mode === "tiles" ? tiles(input) : paint(input);
}
