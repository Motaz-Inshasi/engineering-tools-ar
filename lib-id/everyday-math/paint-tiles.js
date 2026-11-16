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
  if (p.big > 0) parts.push(`${p.big} × ${BIG} liter`);
  if (p.small > 0) parts.push(`${p.small} × ${SMALL} liter`);
  return parts.join(" + ");
};

const paint = (input) => {
  const L = num(input, "roomL", "Panjang ruangan", { positive: true, max: 1000 });
  const W = num(input, "roomW", "Lebar ruangan", { positive: true, max: 1000 });
  const H = num(input, "roomH", "Tinggi ruangan", { positive: true, max: 100 });
  const doors = num(input, "doors", "Jumlah pintu", { integer: true, nonNegative: true, max: 1000, default: 0 });
  const windows = num(input, "windows", "Jumlah jendela", { integer: true, nonNegative: true, max: 1000, default: 0 });
  const doorArea = num(input, "doorArea", "Luas pintu", { positive: true, max: 100, default: 2 });
  const windowArea = num(input, "windowArea", "Luas jendela", { positive: true, max: 100, default: 1.5 });
  const coats = num(input, "coats", "Jumlah lapisan", { integer: true, min: 1, max: 5, default: 2 });
  const coverage = num(input, "coverage", "Cakupan per liter", { positive: true, max: 100, default: 10 });
  const ceiling = !isBlank(input.ceiling) && String(input.ceiling) !== "0";

  const gross = 2 * (L + W) * H;
  const openings = doors * doorArea + windows * windowArea;
  if (openings >= gross) fail("Luas pintu dan jendela sama dengan atau melebihi luas dinding, periksa kembali ukuran atau jumlah bukaan.", "doors");
  const walls = gross - openings;
  const ceilingArea = ceiling ? L * W : 0;
  const area = walls + ceilingArea;
  const liters = (area * coats) / coverage;
  const pack = packs(liters);
  const surplus = Math.max(0, Math.round((pack.total - liters) * 1e4) / 1e4);

  return {
    results: [
      { label: "Luas dinding bersih", value: `${fmt(walls, 6)} m²` },
      { label: "Luas langit-langit", value: `${fmt(ceilingArea, 6)} m²` },
      { label: "Total luas cat untuk satu lapisan", value: `${fmt(area, 6)} m²` },
      { label: "Jumlah cat yang dibutuhkan", value: `${fmt(liters, 4)} liter` },
      { label: "Kemasan yang disarankan", value: packText(pack) },
      { label: "Total jumlah yang dibeli", value: `${fmt(pack.total, 4)} liter` },
      { label: "Sisa lebih", value: `${fmt(surplus, 4)} liter` }
    ],
    steps: [
      { text: "Luas dinding bersih setelah dikurangi bukaan:", tex: `A_w = 2(${ntex(L)} + ${ntex(W)}) \\times ${ntex(H)} - (${doors} \\times ${ntex(doorArea)} + ${windows} \\times ${ntex(windowArea)}) = ${ntex(walls, 6)}\\ \\text{m}^2` },
      { text: "Luas cat untuk satu lapisan:", tex: `A = A_w${ceiling ? ` + ${ntex(L)} \\times ${ntex(W)}` : ""} = ${ntex(area, 6)}\\ \\text{m}^2` },
      { text: "Jumlah cat untuk semua lapisan:", tex: `V = \\frac{A \\times ${coats}}{${ntex(coverage)}} = ${ntex(liters, 6)}\\ \\text{L}` },
      { text: "Pilih kombinasi kemasan (18 liter dan 3.6 liter) yang meminimalkan sisa, lalu jumlah kemasannya:", tex: `${ntex(pack.total, 6)}\\ \\text{L} \\ge ${ntex(liters, 6)}\\ \\text{L}` }
    ],
    copy: `Luas cat: ${fmt(area, 6)} m², jumlah yang dibutuhkan: ${fmt(liters, 4)} liter, kemasan: ${packText(pack)} (total ${fmt(pack.total, 4)} liter)`
  };
};

const tiles = (input) => {
  const floorL = num(input, "floorL", "Panjang lantai", { positive: true, max: 1000 });
  const floorW = num(input, "floorW", "Lebar lantai", { positive: true, max: 1000 });
  const tileL = num(input, "tileL", "Panjang ubin", { positive: true, max: 500 });
  const tileW = num(input, "tileW", "Lebar ubin", { positive: true, max: 500 });
  const waste = num(input, "waste", "Persentase sisa potongan", { min: 0, max: 100, default: 10 });
  const perBox = num(input, "perBox", "Jumlah ubin per dus", { integer: true, min: 1, max: 10000, optional: true });

  const area = floorL * floorW;
  const tileArea = (tileL / 100) * (tileW / 100);
  const withWaste = area * (1 + waste / 100);
  const count = Math.ceil(withWaste / tileArea - 1e-9);
  const boxes = perBox === null ? null : Math.ceil(count / perBox - 1e-9);

  const results = [
    { label: "Luas lantai", value: `${fmt(area, 6)} m²` },
    { label: "Luas satu ubin", value: `${fmt(tileArea, 6)} m²` },
    { label: "Luas dengan sisa potongan", value: `${fmt(withWaste, 6)} m²` },
    { label: "Jumlah ubin yang dibutuhkan", value: `${count} ubin` }
  ];
  let copy = `Jumlah ubin: ${count} ubin (luas lantai ${fmt(area, 6)} m² dengan sisa ${fmt(waste)}%)`;
  if (boxes !== null) {
    results.push({ label: "Jumlah dus", value: `${boxes} dus` });
    copy += `, jumlah dus: ${boxes} dus`;
  }

  return {
    results,
    steps: [
      { text: "Luas lantai dan luas satu ubin:", tex: `A = ${ntex(floorL)} \\times ${ntex(floorW)} = ${ntex(area, 6)}\\ \\text{m}^2,\\qquad a = \\frac{${ntex(tileL)}}{100} \\times \\frac{${ntex(tileW)}}{100} = ${ntex(tileArea, 6)}\\ \\text{m}^2` },
      { text: "Tambahkan persentase sisa potongan lalu bulatkan jumlah ubin ke atas:", tex: `N = \\left\\lceil \\frac{A(1 + ${ntex(waste / 100, 6)})}{a} \\right\\rceil = \\left\\lceil \\frac{${ntex(withWaste, 6)}}{${ntex(tileArea, 6)}} \\right\\rceil = ${count}` }
    ],
    copy
  };
};

export const meta = {
  description: "Hitung jumlah cat yang dibutuhkan untuk satu ruangan setelah dikurangi pintu dan jendela, dengan jumlah lapisan dan cakupan, serta sarankan kombinasi kemasan 18 liter dan 3.6 liter dengan sisa paling sedikit, atau hitung jumlah ubin lantai dengan persentase sisa potongan dan jumlah dus.",
  keywords: ["cat", "pelapis", "ubin", "keramik", "jumlah cat", "jumlah ubin", "paint", "tiles"],
  formulas: [
    { label: "Luas dinding bersih", tex: "A_w = 2(L + W) H - \\sum A_{\\text{openings}}" },
    { label: "jumlah cat", tex: "V = \\frac{A \\times \\text{coats}}{\\text{coverage}}" },
    { label: "Jumlah ubin dengan sisa potongan", tex: "N = \\left\\lceil \\frac{A (1 + w)}{a} \\right\\rceil" }
  ],
  inputs: [
    { id: "mode", label: "Jenis perhitungan", type: "select", default: "paint", options: [["paint", "Jumlah cat untuk ruangan"], ["tiles", "Jumlah ubin untuk lantai"]] },
    { id: "roomL", label: "Panjang ruangan", unit: "m", type: "number", default: "4", when: { mode: ["paint"] } },
    { id: "roomW", label: "Lebar ruangan", unit: "m", type: "number", default: "3", when: { mode: ["paint"] } },
    { id: "roomH", label: "Tinggi dinding", unit: "m", type: "number", default: "2.7", when: { mode: ["paint"] } },
    { id: "doors", label: "Jumlah pintu", type: "number", default: "1", when: { mode: ["paint"] } },
    { id: "doorArea", label: "Luas satu pintu", unit: "m²", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "windows", label: "Jumlah jendela", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "windowArea", label: "Luas satu jendela", unit: "m²", type: "number", default: "1.5", when: { mode: ["paint"] } },
    { id: "ceiling", label: "Cat langit-langit juga", type: "checkbox", default: "1", when: { mode: ["paint"] } },
    { id: "coats", label: "Jumlah lapisan", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "coverage", label: "Cakupan per liter", unit: "m²/liter", type: "number", default: "10", when: { mode: ["paint"] }, help: "Bergantung pada jenis cat, umumnya antara 8 dan 12 m²/liter." },
    { id: "floorL", label: "Panjang lantai", unit: "m", type: "number", default: "4", when: { mode: ["tiles"] } },
    { id: "floorW", label: "Lebar lantai", unit: "m", type: "number", default: "3", when: { mode: ["tiles"] } },
    { id: "tileL", label: "Panjang ubin", unit: "cm", type: "number", default: "60", when: { mode: ["tiles"] } },
    { id: "tileW", label: "Lebar ubin", unit: "cm", type: "number", default: "60", when: { mode: ["tiles"] } },
    { id: "waste", label: "Persentase sisa potongan", unit: "%", type: "number", default: "10", when: { mode: ["tiles"] }, help: "Untuk potongan dan pecahan, biasanya 5% hingga 10%." },
    { id: "perBox", label: "Jumlah ubin per dus", type: "number", when: { mode: ["tiles"] }, help: "Opsional: untuk menghitung jumlah dus." }
  ],
  example: {
    values: { mode: "paint", roomL: "4", roomW: "3", roomH: "2.7", doors: "1", doorArea: "2", windows: "2", windowArea: "1.5", ceiling: "1", coats: "2", coverage: "10", floorL: "4", floorW: "3", tileL: "60", tileW: "60", waste: "10", perBox: "" },
    expect: ["3 × 3.6 liter"],
    note: "Contoh: ruangan 4×3 dengan tinggi 2.7 m, satu pintu, dua jendela, langit-langit, dan dua lapisan."
  },
  invalid: { values: { mode: "tiles", roomL: "4", roomW: "3", roomH: "2.7", doors: "1", doorArea: "2", windows: "2", windowArea: "1.5", ceiling: "1", coats: "2", coverage: "10", floorL: "4", floorW: "3", tileL: "0", tileW: "60", waste: "10", perBox: "" } },
  related: ["unit-converter", "percentage", "discount-tax"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Jenis perhitungan", ["paint", "tiles"], "paint");
  return mode === "tiles" ? tiles(input) : paint(input);
}
