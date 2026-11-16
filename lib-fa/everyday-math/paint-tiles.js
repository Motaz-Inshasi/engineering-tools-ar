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
  if (p.big > 0) parts.push(`${p.big} × ${BIG} لیتر`);
  if (p.small > 0) parts.push(`${p.small} × ${SMALL} لیتر`);
  return parts.join(" + ");
};

const paint = (input) => {
  const L = num(input, "roomL", "طول اتاق", { positive: true, max: 1000 });
  const W = num(input, "roomW", "عرض اتاق", { positive: true, max: 1000 });
  const H = num(input, "roomH", "ارتفاع اتاق", { positive: true, max: 100 });
  const doors = num(input, "doors", "تعداد درها", { integer: true, nonNegative: true, max: 1000, default: 0 });
  const windows = num(input, "windows", "تعداد پنجره‌ها", { integer: true, nonNegative: true, max: 1000, default: 0 });
  const doorArea = num(input, "doorArea", "مساحت در", { positive: true, max: 100, default: 2 });
  const windowArea = num(input, "windowArea", "مساحت پنجره", { positive: true, max: 100, default: 1.5 });
  const coats = num(input, "coats", "تعداد لایه‌ها", { integer: true, min: 1, max: 5, default: 2 });
  const coverage = num(input, "coverage", "پوشش هر لیتر", { positive: true, max: 100, default: 10 });
  const ceiling = !isBlank(input.ceiling) && String(input.ceiling) !== "0";

  const gross = 2 * (L + W) * H;
  const openings = doors * doorArea + windows * windowArea;
  if (openings >= gross) fail("مساحت درها و پنجره‌ها برابر یا بیشتر از مساحت دیوارها است؛ ابعاد یا تعداد بازشوها را بررسی کنید.", "doors");
  const walls = gross - openings;
  const ceilingArea = ceiling ? L * W : 0;
  const area = walls + ceilingArea;
  const liters = (area * coats) / coverage;
  const pack = packs(liters);
  const surplus = Math.max(0, Math.round((pack.total - liters) * 1e4) / 1e4);

  return {
    results: [
      { label: "مساحت خالص دیوارها", value: `${fmt(walls, 6)} متر مربع` },
      { label: "مساحت سقف", value: `${fmt(ceilingArea, 6)} متر مربع` },
      { label: "کل مساحت رنگ برای هر لایه", value: `${fmt(area, 6)} متر مربع` },
      { label: "مقدار رنگ موردنیاز", value: `${fmt(liters, 4)} لیتر` },
      { label: "قوطی‌های پیشنهادی", value: packText(pack) },
      { label: "کل مقدار خریداری‌شده", value: `${fmt(pack.total, 4)} لیتر` },
      { label: "مازاد", value: `${fmt(surplus, 4)} لیتر` }
    ],
    steps: [
      { text: "مساحت خالص دیوارها پس از کم کردن بازشوها:", tex: `A_w = 2(${ntex(L)} + ${ntex(W)}) \\times ${ntex(H)} - (${doors} \\times ${ntex(doorArea)} + ${windows} \\times ${ntex(windowArea)}) = ${ntex(walls, 6)}\\ \\text{m}^2` },
      { text: "مساحت رنگ برای هر لایه:", tex: `A = A_w${ceiling ? ` + ${ntex(L)} \\times ${ntex(W)}` : ""} = ${ntex(area, 6)}\\ \\text{m}^2` },
      { text: "مقدار رنگ برای همهٔ لایه‌ها:", tex: `V = \\frac{A \\times ${coats}}{${ntex(coverage)}} = ${ntex(liters, 6)}\\ \\text{L}` },
      { text: "ترکیبی از قوطی‌ها (18 لیتری و 3.6 لیتری) را که کمترین هدر را دارد انتخاب کنید، سپس تعداد قوطی‌ها:", tex: `${ntex(pack.total, 6)}\\ \\text{L} \\ge ${ntex(liters, 6)}\\ \\text{L}` }
    ],
    copy: `مساحت رنگ: ${fmt(area, 6)} متر مربع، مقدار موردنیاز: ${fmt(liters, 4)} لیتر، قوطی‌ها: ${packText(pack)} (جمعاً ${fmt(pack.total, 4)} لیتر)`
  };
};

const tiles = (input) => {
  const floorL = num(input, "floorL", "طول کف", { positive: true, max: 1000 });
  const floorW = num(input, "floorW", "عرض کف", { positive: true, max: 1000 });
  const tileL = num(input, "tileL", "طول کاشی", { positive: true, max: 500 });
  const tileW = num(input, "tileW", "عرض کاشی", { positive: true, max: 500 });
  const waste = num(input, "waste", "نرخ ضایعات", { min: 0, max: 100, default: 10 });
  const perBox = num(input, "perBox", "تعداد کاشی در هر جعبه", { integer: true, min: 1, max: 10000, optional: true });

  const area = floorL * floorW;
  const tileArea = (tileL / 100) * (tileW / 100);
  const withWaste = area * (1 + waste / 100);
  const count = Math.ceil(withWaste / tileArea - 1e-9);
  const boxes = perBox === null ? null : Math.ceil(count / perBox - 1e-9);

  const results = [
    { label: "مساحت کف", value: `${fmt(area, 6)} متر مربع` },
    { label: "مساحت یک کاشی", value: `${fmt(tileArea, 6)} متر مربع` },
    { label: "مساحت با ضایعات", value: `${fmt(withWaste, 6)} متر مربع` },
    { label: "تعداد کاشی موردنیاز", value: `${count} کاشی` }
  ];
  let copy = `تعداد کاشی: ${count} کاشی (مساحت کف ${fmt(area, 6)} متر مربع با ${fmt(waste)}% ضایعات)`;
  if (boxes !== null) {
    results.push({ label: "تعداد جعبه‌ها", value: `${boxes} جعبه` });
    copy += `، تعداد جعبه‌ها: ${boxes} جعبه`;
  }

  return {
    results,
    steps: [
      { text: "مساحت کف و مساحت یک کاشی:", tex: `A = ${ntex(floorL)} \\times ${ntex(floorW)} = ${ntex(area, 6)}\\ \\text{m}^2,\\qquad a = \\frac{${ntex(tileL)}}{100} \\times \\frac{${ntex(tileW)}}{100} = ${ntex(tileArea, 6)}\\ \\text{m}^2` },
      { text: "اضافه کردن نرخ ضایعات و گرد کردن تعداد کاشی به بالا:", tex: `N = \\left\\lceil \\frac{A(1 + ${ntex(waste / 100, 6)})}{a} \\right\\rceil = \\left\\lceil \\frac{${ntex(withWaste, 6)}}{${ntex(tileArea, 6)}} \\right\\rceil = ${count}` }
    ],
    copy
  };
};

export const meta = {
  description: "مقدار رنگ موردنیاز یک اتاق را پس از کم کردن درها و پنجره‌ها، با تعداد لایه‌ها و پوشش محاسبه کنید، و ترکیب قوطی‌های 18 لیتری و 3.6 لیتری با کمترین هدر را پیشنهاد دهید، یا تعداد کاشی‌های کف را با نرخ ضایعات و تعداد جعبه‌ها محاسبه کنید.",
  keywords: ["رنگ", "پوشش", "کاشی", "سرامیک", "مقدار رنگ", "تعداد کاشی", "paint", "tiles"],
  formulas: [
    { label: "مساحت خالص دیوارها", tex: "A_w = 2(L + W) H - \\sum A_{\\text{openings}}" },
    { label: "مقدار رنگ", tex: "V = \\frac{A \\times \\text{coats}}{\\text{coverage}}" },
    { label: "تعداد کاشی با ضایعات", tex: "N = \\left\\lceil \\frac{A (1 + w)}{a} \\right\\rceil" }
  ],
  inputs: [
    { id: "mode", label: "نوع محاسبه", type: "select", default: "paint", options: [["paint", "مقدار رنگ برای اتاق"], ["tiles", "تعداد کاشی برای کف"]] },
    { id: "roomL", label: "طول اتاق", unit: "متر", type: "number", default: "4", when: { mode: ["paint"] } },
    { id: "roomW", label: "عرض اتاق", unit: "متر", type: "number", default: "3", when: { mode: ["paint"] } },
    { id: "roomH", label: "ارتفاع دیوارها", unit: "متر", type: "number", default: "2.7", when: { mode: ["paint"] } },
    { id: "doors", label: "تعداد درها", type: "number", default: "1", when: { mode: ["paint"] } },
    { id: "doorArea", label: "مساحت یک در", unit: "متر مربع", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "windows", label: "تعداد پنجره‌ها", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "windowArea", label: "مساحت یک پنجره", unit: "متر مربع", type: "number", default: "1.5", when: { mode: ["paint"] } },
    { id: "ceiling", label: "سقف را هم رنگ کنید", type: "checkbox", default: "1", when: { mode: ["paint"] } },
    { id: "coats", label: "تعداد لایه‌ها", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "coverage", label: "پوشش هر لیتر", unit: "متر مربع/لیتر", type: "number", default: "10", when: { mode: ["paint"] }, help: "بسته به نوع رنگ متفاوت است و معمولاً بین 8 تا 12 متر مربع/لیتر است." },
    { id: "floorL", label: "طول کف", unit: "متر", type: "number", default: "4", when: { mode: ["tiles"] } },
    { id: "floorW", label: "عرض کف", unit: "متر", type: "number", default: "3", when: { mode: ["tiles"] } },
    { id: "tileL", label: "طول کاشی", unit: "سانتی‌متر", type: "number", default: "60", when: { mode: ["tiles"] } },
    { id: "tileW", label: "عرض کاشی", unit: "سانتی‌متر", type: "number", default: "60", when: { mode: ["tiles"] } },
    { id: "waste", label: "نرخ ضایعات", unit: "%", type: "number", default: "10", when: { mode: ["tiles"] }, help: "برای برش و شکستگی، معمولاً از 5% تا 10%." },
    { id: "perBox", label: "تعداد کاشی در هر جعبه", type: "number", when: { mode: ["tiles"] }, help: "اختیاری: برای محاسبهٔ تعداد جعبه‌ها." }
  ],
  example: {
    values: { mode: "paint", roomL: "4", roomW: "3", roomH: "2.7", doors: "1", doorArea: "2", windows: "2", windowArea: "1.5", ceiling: "1", coats: "2", coverage: "10", floorL: "4", floorW: "3", tileL: "60", tileW: "60", waste: "10", perBox: "" },
    expect: ["3 × 3.6 لیتر"],
    note: "مثال: اتاق 4×3 با ارتفاع 2.7 متر، یک در، دو پنجره، سقف و دو لایه."
  },
  invalid: { values: { mode: "tiles", roomL: "4", roomW: "3", roomH: "2.7", doors: "1", doorArea: "2", windows: "2", windowArea: "1.5", ceiling: "1", coats: "2", coverage: "10", floorL: "4", floorW: "3", tileL: "0", tileW: "60", waste: "10", perBox: "" } },
  related: ["unit-converter", "percentage", "discount-tax"]
};

export function solve(input) {
  const mode = choice(input, "mode", "نوع محاسبه", ["paint", "tiles"], "paint");
  return mode === "tiles" ? tiles(input) : paint(input);
}
