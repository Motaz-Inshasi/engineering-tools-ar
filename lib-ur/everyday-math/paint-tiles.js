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
  if (p.big > 0) parts.push(`${p.big} × ${BIG} لیٹر`);
  if (p.small > 0) parts.push(`${p.small} × ${SMALL} لیٹر`);
  return parts.join(" + ");
};

const paint = (input) => {
  const L = num(input, "roomL", "کمرے کی لمبائی", { positive: true, max: 1000 });
  const W = num(input, "roomW", "کمرے کی چوڑائی", { positive: true, max: 1000 });
  const H = num(input, "roomH", "کمرے کی اونچائی", { positive: true, max: 100 });
  const doors = num(input, "doors", "دروازوں کی تعداد", { integer: true, nonNegative: true, max: 1000, default: 0 });
  const windows = num(input, "windows", "کھڑکیوں کی تعداد", { integer: true, nonNegative: true, max: 1000, default: 0 });
  const doorArea = num(input, "doorArea", "دروازے کا رقبہ", { positive: true, max: 100, default: 2 });
  const windowArea = num(input, "windowArea", "کھڑکی کا رقبہ", { positive: true, max: 100, default: 1.5 });
  const coats = num(input, "coats", "کوٹوں کی تعداد", { integer: true, min: 1, max: 5, default: 2 });
  const coverage = num(input, "coverage", "فی لیٹر کوریج", { positive: true, max: 100, default: 10 });
  const ceiling = !isBlank(input.ceiling) && String(input.ceiling) !== "0";

  const gross = 2 * (L + W) * H;
  const openings = doors * doorArea + windows * windowArea;
  if (openings >= gross) fail("دروازوں اور کھڑکیوں کا رقبہ دیواروں کے رقبے کے برابر یا اس سے زیادہ ہے۔ طول و عرض یا کھلی جگہوں کی تعداد دوبارہ جانچیں۔", "doors");
  const walls = gross - openings;
  const ceilingArea = ceiling ? L * W : 0;
  const area = walls + ceilingArea;
  const liters = (area * coats) / coverage;
  const pack = packs(liters);
  const surplus = Math.max(0, Math.round((pack.total - liters) * 1e4) / 1e4);

  return {
    results: [
      { label: "خالص دیواروں کا رقبہ", value: `${fmt(walls, 6)} مربع میٹر` },
      { label: "چھت کا رقبہ", value: `${fmt(ceilingArea, 6)} مربع میٹر` },
      { label: "ایک کوٹ کا کل پینٹ رقبہ", value: `${fmt(area, 6)} مربع میٹر` },
      { label: "درکار پینٹ کی مقدار", value: `${fmt(liters, 4)} لیٹر` },
      { label: "تجویز کردہ ڈبے", value: packText(pack) },
      { label: "خریدی گئی کل مقدار", value: `${fmt(pack.total, 4)} لیٹر` },
      { label: "بچی ہوئی مقدار", value: `${fmt(surplus, 4)} لیٹر` }
    ],
    steps: [
      { text: "کھلی جگہیں منہا کرنے کے بعد خالص دیواروں کا رقبہ:", tex: `A_w = 2(${ntex(L)} + ${ntex(W)}) \\times ${ntex(H)} - (${doors} \\times ${ntex(doorArea)} + ${windows} \\times ${ntex(windowArea)}) = ${ntex(walls, 6)}\\ \\text{m}^2` },
      { text: "ایک کوٹ کا پینٹ رقبہ:", tex: `A = A_w${ceiling ? ` + ${ntex(L)} \\times ${ntex(W)}` : ""} = ${ntex(area, 6)}\\ \\text{m}^2` },
      { text: "تمام کوٹس کے لیے پینٹ کی مقدار:", tex: `V = \\frac{A \\times ${coats}}{${ntex(coverage)}} = ${ntex(liters, 6)}\\ \\text{L}` },
      { text: "وہ ڈبوں کا مجموعہ (18 لیٹر اور 3.6 لیٹر) منتخب کریں جو ضیاع کم کرے، پھر ڈبوں کی تعداد:", tex: `${ntex(pack.total, 6)}\\ \\text{L} \\ge ${ntex(liters, 6)}\\ \\text{L}` }
    ],
    copy: `پینٹ کا رقبہ: ${fmt(area, 6)} مربع میٹر، درکار مقدار: ${fmt(liters, 4)} لیٹر، ڈبے: ${packText(pack)} (کل ${fmt(pack.total, 4)} لیٹر)`
  };
};

const tiles = (input) => {
  const floorL = num(input, "floorL", "فرش کی لمبائی", { positive: true, max: 1000 });
  const floorW = num(input, "floorW", "فرش کی چوڑائی", { positive: true, max: 1000 });
  const tileL = num(input, "tileL", "ٹائل کی لمبائی", { positive: true, max: 500 });
  const tileW = num(input, "tileW", "ٹائل کی چوڑائی", { positive: true, max: 500 });
  const waste = num(input, "waste", "ضیاع کی شرح", { min: 0, max: 100, default: 10 });
  const perBox = num(input, "perBox", "ایک ڈبے میں ٹائلوں کی تعداد", { integer: true, min: 1, max: 10000, optional: true });

  const area = floorL * floorW;
  const tileArea = (tileL / 100) * (tileW / 100);
  const withWaste = area * (1 + waste / 100);
  const count = Math.ceil(withWaste / tileArea - 1e-9);
  const boxes = perBox === null ? null : Math.ceil(count / perBox - 1e-9);

  const results = [
    { label: "فرش کا رقبہ", value: `${fmt(area, 6)} مربع میٹر` },
    { label: "ایک ٹائل کا رقبہ", value: `${fmt(tileArea, 6)} مربع میٹر` },
    { label: "ضیاع سمیت رقبہ", value: `${fmt(withWaste, 6)} مربع میٹر` },
    { label: "درکار ٹائلوں کی تعداد", value: `${count} ٹائلیں` }
  ];
  let copy = `ٹائلوں کی تعداد: ${count} ٹائلیں (فرش کا رقبہ ${fmt(area, 6)} مربع میٹر، ${fmt(waste)}% ضیاع کے ساتھ)`;
  if (boxes !== null) {
    results.push({ label: "ڈبوں کی تعداد", value: `${boxes} ڈبہ` });
    copy += `، ڈبوں کی تعداد: ${boxes} ڈبہ`;
  }

  return {
    results,
    steps: [
      { text: "فرش کا رقبہ اور ایک ٹائل کا رقبہ:", tex: `A = ${ntex(floorL)} \\times ${ntex(floorW)} = ${ntex(area, 6)}\\ \\text{m}^2,\\qquad a = \\frac{${ntex(tileL)}}{100} \\times \\frac{${ntex(tileW)}}{100} = ${ntex(tileArea, 6)}\\ \\text{m}^2` },
      { text: "ضیاع کی شرح شامل کریں اور ٹائلوں کی تعداد اوپر گول کریں:", tex: `N = \\left\\lceil \\frac{A(1 + ${ntex(waste / 100, 6)})}{a} \\right\\rceil = \\left\\lceil \\frac{${ntex(withWaste, 6)}}{${ntex(tileArea, 6)}} \\right\\rceil = ${count}` }
    ],
    copy
  };
};

export const meta = {
  description: "دروازے اور کھڑکیاں منہا کر کے کمرے کے لیے درکار پینٹ حساب کریں، کوٹس کی تعداد اور کوریج کے ساتھ، اور 18 لیٹر اور 3.6 لیٹر ڈبوں کا کم ترین ضیاع والا مجموعہ تجویز کریں، یا ضیاع کی شرح اور ڈبوں کی تعداد کے ساتھ فرش کی ٹائلوں کی تعداد حساب کریں۔",
  keywords: ["پینٹ", "رنگ و روغن", "ٹائلیں", "سیرامک", "پینٹ کی مقدار", "ٹائلوں کی تعداد", "paint", "tiles"],
  formulas: [
    { label: "خالص دیواروں کا رقبہ", tex: "A_w = 2(L + W) H - \\sum A_{\\text{openings}}" },
    { label: "پینٹ کی مقدار", tex: "V = \\frac{A \\times \\text{coats}}{\\text{coverage}}" },
    { label: "ضیاع سمیت ٹائلوں کی تعداد", tex: "N = \\left\\lceil \\frac{A (1 + w)}{a} \\right\\rceil" }
  ],
  inputs: [
    { id: "mode", label: "حساب کی قسم", type: "select", default: "paint", options: [["paint", "کمرے کے لیے پینٹ کی مقدار"], ["tiles", "فرش کے لیے ٹائلوں کی تعداد"]] },
    { id: "roomL", label: "کمرے کی لمبائی", unit: "میٹر", type: "number", default: "4", when: { mode: ["paint"] } },
    { id: "roomW", label: "کمرے کی چوڑائی", unit: "میٹر", type: "number", default: "3", when: { mode: ["paint"] } },
    { id: "roomH", label: "دیواروں کی اونچائی", unit: "میٹر", type: "number", default: "2.7", when: { mode: ["paint"] } },
    { id: "doors", label: "دروازوں کی تعداد", type: "number", default: "1", when: { mode: ["paint"] } },
    { id: "doorArea", label: "ایک دروازے کا رقبہ", unit: "مربع میٹر", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "windows", label: "کھڑکیوں کی تعداد", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "windowArea", label: "ایک کھڑکی کا رقبہ", unit: "مربع میٹر", type: "number", default: "1.5", when: { mode: ["paint"] } },
    { id: "ceiling", label: "چھت پر بھی پینٹ کریں", type: "checkbox", default: "1", when: { mode: ["paint"] } },
    { id: "coats", label: "کوٹوں کی تعداد", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "coverage", label: "فی لیٹر کوریج", unit: "مربع میٹر/لیٹر", type: "number", default: "10", when: { mode: ["paint"] }, help: "یہ پینٹ کی قسم کے مطابق بدلتا ہے، اور عموماً 8 سے 12 مربع میٹر/لیٹر کے درمیان ہوتا ہے۔" },
    { id: "floorL", label: "فرش کی لمبائی", unit: "میٹر", type: "number", default: "4", when: { mode: ["tiles"] } },
    { id: "floorW", label: "فرش کی چوڑائی", unit: "میٹر", type: "number", default: "3", when: { mode: ["tiles"] } },
    { id: "tileL", label: "ٹائل کی لمبائی", unit: "سینٹی میٹر", type: "number", default: "60", when: { mode: ["tiles"] } },
    { id: "tileW", label: "ٹائل کی چوڑائی", unit: "سینٹی میٹر", type: "number", default: "60", when: { mode: ["tiles"] } },
    { id: "waste", label: "ضیاع کی شرح", unit: "%", type: "number", default: "10", when: { mode: ["tiles"] }, help: "کاٹنے اور ٹوٹنے کے لیے، عموماً 5% سے 10%۔" },
    { id: "perBox", label: "ایک ڈبے میں ٹائلوں کی تعداد", type: "number", when: { mode: ["tiles"] }, help: "اختیاری: ڈبوں کی تعداد معلوم کرنے کے لیے۔" }
  ],
  example: {
    values: { mode: "paint", roomL: "4", roomW: "3", roomH: "2.7", doors: "1", doorArea: "2", windows: "2", windowArea: "1.5", ceiling: "1", coats: "2", coverage: "10", floorL: "4", floorW: "3", tileL: "60", tileW: "60", waste: "10", perBox: "" },
    expect: ["3 × 3.6 لیٹر"],
    note: "مثال: 4×3 کا کمرہ، 2.7 میٹر اونچائی، ایک دروازہ، دو کھڑکیاں، چھت اور دو کوٹس۔"
  },
  invalid: { values: { mode: "tiles", roomL: "4", roomW: "3", roomH: "2.7", doors: "1", doorArea: "2", windows: "2", windowArea: "1.5", ceiling: "1", coats: "2", coverage: "10", floorL: "4", floorW: "3", tileL: "0", tileW: "60", waste: "10", perBox: "" } },
  related: ["unit-converter", "percentage", "discount-tax"]
};

export function solve(input) {
  const mode = choice(input, "mode", "حساب کی قسم", ["paint", "tiles"], "paint");
  return mode === "tiles" ? tiles(input) : paint(input);
}
