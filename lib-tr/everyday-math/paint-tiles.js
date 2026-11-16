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
  if (p.big > 0) parts.push(`${p.big} × ${BIG} litre`);
  if (p.small > 0) parts.push(`${p.small} × ${SMALL} litre`);
  return parts.join(" + ");
};

const paint = (input) => {
  const L = num(input, "roomL", "Oda uzunluğu", { positive: true, max: 1000 });
  const W = num(input, "roomW", "Oda genişliği", { positive: true, max: 1000 });
  const H = num(input, "roomH", "Oda yüksekliği", { positive: true, max: 100 });
  const doors = num(input, "doors", "Kapı sayısı", { integer: true, nonNegative: true, max: 1000, default: 0 });
  const windows = num(input, "windows", "Pencere sayısı", { integer: true, nonNegative: true, max: 1000, default: 0 });
  const doorArea = num(input, "doorArea", "Kapı alanı", { positive: true, max: 100, default: 2 });
  const windowArea = num(input, "windowArea", "Pencere alanı", { positive: true, max: 100, default: 1.5 });
  const coats = num(input, "coats", "Kat sayısı", { integer: true, min: 1, max: 5, default: 2 });
  const coverage = num(input, "coverage", "Litre başına kaplama", { positive: true, max: 100, default: 10 });
  const ceiling = !isBlank(input.ceiling) && String(input.ceiling) !== "0";

  const gross = 2 * (L + W) * H;
  const openings = doors * doorArea + windows * windowArea;
  if (openings >= gross) fail("Kapı ve pencere alanları duvar alanına eşit veya ondan büyük; boyutları veya açıklık sayısını kontrol edin.", "doors");
  const walls = gross - openings;
  const ceilingArea = ceiling ? L * W : 0;
  const area = walls + ceilingArea;
  const liters = (area * coats) / coverage;
  const pack = packs(liters);
  const surplus = Math.max(0, Math.round((pack.total - liters) * 1e4) / 1e4);

  return {
    results: [
      { label: "Net duvar alanı", value: `${fmt(walls, 6)} m²` },
      { label: "Tavan alanı", value: `${fmt(ceilingArea, 6)} m²` },
      { label: "Bir kat için toplam boya alanı", value: `${fmt(area, 6)} m²` },
      { label: "Gerekli boya miktarı", value: `${fmt(liters, 4)} litre` },
      { label: "Önerilen kutular", value: packText(pack) },
      { label: "Satın alınacak toplam miktar", value: `${fmt(pack.total, 4)} litre` },
      { label: "Fazla", value: `${fmt(surplus, 4)} litre` }
    ],
    steps: [
      { text: "Açıklıklar çıkarıldıktan sonra net duvar alanı:", tex: `A_w = 2(${ntex(L)} + ${ntex(W)}) \\times ${ntex(H)} - (${doors} \\times ${ntex(doorArea)} + ${windows} \\times ${ntex(windowArea)}) = ${ntex(walls, 6)}\\ \\text{m}^2` },
      { text: "Bir kat için boya alanı:", tex: `A = A_w${ceiling ? ` + ${ntex(L)} \\times ${ntex(W)}` : ""} = ${ntex(area, 6)}\\ \\text{m}^2` },
      { text: "Tüm katlar için boya miktarı:", tex: `V = \\frac{A \\times ${coats}}{${ntex(coverage)}} = ${ntex(liters, 6)}\\ \\text{L}` },
      { text: "İsrafı en aza indiren kutu kombinasyonunu (18 litre ve 3,6 litre) seçin, ardından kutu sayısı:", tex: `${ntex(pack.total, 6)}\\ \\text{L} \\ge ${ntex(liters, 6)}\\ \\text{L}` }
    ],
    copy: `Boya alanı: ${fmt(area, 6)} m², gereken miktar: ${fmt(liters, 4)} litre, kutular: ${packText(pack)} (toplam ${fmt(pack.total, 4)} litre)`
  };
};

const tiles = (input) => {
  const floorL = num(input, "floorL", "Zemin uzunluğu", { positive: true, max: 1000 });
  const floorW = num(input, "floorW", "Zemin genişliği", { positive: true, max: 1000 });
  const tileL = num(input, "tileL", "Karo uzunluğu", { positive: true, max: 500 });
  const tileW = num(input, "tileW", "Karo genişliği", { positive: true, max: 500 });
  const waste = num(input, "waste", "Fire oranı", { min: 0, max: 100, default: 10 });
  const perBox = num(input, "perBox", "Kutudaki karo sayısı", { integer: true, min: 1, max: 10000, optional: true });

  const area = floorL * floorW;
  const tileArea = (tileL / 100) * (tileW / 100);
  const withWaste = area * (1 + waste / 100);
  const count = Math.ceil(withWaste / tileArea - 1e-9);
  const boxes = perBox === null ? null : Math.ceil(count / perBox - 1e-9);

  const results = [
    { label: "Zemin alanı", value: `${fmt(area, 6)} m²` },
    { label: "Tek karonun alanı", value: `${fmt(tileArea, 6)} m²` },
    { label: "Fire dahil alan", value: `${fmt(withWaste, 6)} m²` },
    { label: "Gerekli karo sayısı", value: `${count} karo` }
  ];
  let copy = `Karo sayısı: ${count} karo (zemin alanı ${fmt(area, 6)} m², fire %${fmt(waste)})`;
  if (boxes !== null) {
    results.push({ label: "Kutu sayısı", value: `${boxes} kutu` });
    copy += `, kutu sayısı: ${boxes} kutu`;
  }

  return {
    results,
    steps: [
      { text: "Zemin alanı ve tek karonun alanı:", tex: `A = ${ntex(floorL)} \\times ${ntex(floorW)} = ${ntex(area, 6)}\\ \\text{m}^2,\\qquad a = \\frac{${ntex(tileL)}}{100} \\times \\frac{${ntex(tileW)}}{100} = ${ntex(tileArea, 6)}\\ \\text{m}^2` },
      { text: "Fire oranı eklenir ve karo sayısı yukarı yuvarlanır:", tex: `N = \\left\\lceil \\frac{A(1 + ${ntex(waste / 100, 6)})}{a} \\right\\rceil = \\left\\lceil \\frac{${ntex(withWaste, 6)}}{${ntex(tileArea, 6)}} \\right\\rceil = ${count}` }
    ],
    copy
  };
};

export const meta = {
  description: "Bir oda için kapı ve pencereler çıkarıldıktan sonra kat sayısı ve kaplama oranıyla gereken boya miktarını hesaplayın ve 18 litre ile 3,6 litrelik kutu kombinasyonunu en az israfla önerin; ya da zemin karo sayısını fire oranı ve kutu sayısıyla birlikte hesaplayın.",
  keywords: ["Boya", "Boya", "Karo", "Seramik", "Boya miktarı", "Karo sayısı", "paint", "tiles"],
  formulas: [
    { label: "Net duvar alanı", tex: "A_w = 2(L + W) H - \\sum A_{\\text{openings}}" },
    { label: "Boya miktarı", tex: "V = \\frac{A \\times \\text{coats}}{\\text{coverage}}" },
    { label: "Fire ile karo sayısı", tex: "N = \\left\\lceil \\frac{A (1 + w)}{a} \\right\\rceil" }
  ],
  inputs: [
    { id: "mode", label: "Hesaplama türü", type: "select", default: "paint", options: [["paint", "Oda için boya miktarı"], ["tiles", "Zemin için karo sayısı"]] },
    { id: "roomL", label: "Oda uzunluğu", unit: "m", type: "number", default: "4", when: { mode: ["paint"] } },
    { id: "roomW", label: "Oda genişliği", unit: "m", type: "number", default: "3", when: { mode: ["paint"] } },
    { id: "roomH", label: "Duvar yüksekliği", unit: "m", type: "number", default: "2.7", when: { mode: ["paint"] } },
    { id: "doors", label: "Kapı sayısı", type: "number", default: "1", when: { mode: ["paint"] } },
    { id: "doorArea", label: "Tek kapının alanı", unit: "m²", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "windows", label: "Pencere sayısı", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "windowArea", label: "Tek pencerenin alanı", unit: "m²", type: "number", default: "1.5", when: { mode: ["paint"] } },
    { id: "ceiling", label: "Tavanı da boya", type: "checkbox", default: "1", when: { mode: ["paint"] } },
    { id: "coats", label: "Kat sayısı", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "coverage", label: "Litre başına kaplama", unit: "m²/litre", type: "number", default: "10", when: { mode: ["paint"] }, help: "Boya türüne göre değişir; genellikle litre başına 8 ile 12 m²." },
    { id: "floorL", label: "Zemin uzunluğu", unit: "m", type: "number", default: "4", when: { mode: ["tiles"] } },
    { id: "floorW", label: "Zemin genişliği", unit: "m", type: "number", default: "3", when: { mode: ["tiles"] } },
    { id: "tileL", label: "Karo uzunluğu", unit: "cm", type: "number", default: "60", when: { mode: ["tiles"] } },
    { id: "tileW", label: "Karo genişliği", unit: "cm", type: "number", default: "60", when: { mode: ["tiles"] } },
    { id: "waste", label: "Fire oranı", unit: "%", type: "number", default: "10", when: { mode: ["tiles"] }, help: "Kesme ve kırılma payı; genellikle %5 ile %10." },
    { id: "perBox", label: "Kutudaki karo sayısı", type: "number", when: { mode: ["tiles"] }, help: "İsteğe bağlı: kutu sayısını hesaplamak için." }
  ],
  example: {
    values: { mode: "paint", roomL: "4", roomW: "3", roomH: "2.7", doors: "1", doorArea: "2", windows: "2", windowArea: "1.5", ceiling: "1", coats: "2", coverage: "10", floorL: "4", floorW: "3", tileL: "60", tileW: "60", waste: "10", perBox: "" },
    expect: ["3 × 3,6 litre"],
    note: "Örnek: 4 × 3 oda, 2,7 m yükseklik, bir kapı, iki pencere, tavan ve iki kat."
  },
  invalid: { values: { mode: "tiles", roomL: "4", roomW: "3", roomH: "2.7", doors: "1", doorArea: "2", windows: "2", windowArea: "1.5", ceiling: "1", coats: "2", coverage: "10", floorL: "4", floorW: "3", tileL: "0", tileW: "60", waste: "10", perBox: "" } },
  related: ["unit-converter", "percentage", "discount-tax"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Hesaplama türü", ["paint", "tiles"], "paint");
  return mode === "tiles" ? tiles(input) : paint(input);
}
