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
  if (p.big > 0) parts.push(`${p.big} × ${BIG} لتر`);
  if (p.small > 0) parts.push(`${p.small} × ${SMALL} لتر`);
  return parts.join(" + ");
};

const paint = (input) => {
  const L = num(input, "roomL", "طول الغرفة", { positive: true, max: 1000 });
  const W = num(input, "roomW", "عرض الغرفة", { positive: true, max: 1000 });
  const H = num(input, "roomH", "ارتفاع الغرفة", { positive: true, max: 100 });
  const doors = num(input, "doors", "عدد الأبواب", { integer: true, nonNegative: true, max: 1000, default: 0 });
  const windows = num(input, "windows", "عدد النوافذ", { integer: true, nonNegative: true, max: 1000, default: 0 });
  const doorArea = num(input, "doorArea", "مساحة الباب", { positive: true, max: 100, default: 2 });
  const windowArea = num(input, "windowArea", "مساحة النافذة", { positive: true, max: 100, default: 1.5 });
  const coats = num(input, "coats", "عدد الطبقات", { integer: true, min: 1, max: 5, default: 2 });
  const coverage = num(input, "coverage", "التغطية لكل لتر", { positive: true, max: 100, default: 10 });
  const ceiling = !isBlank(input.ceiling) && String(input.ceiling) !== "0";

  const gross = 2 * (L + W) * H;
  const openings = doors * doorArea + windows * windowArea;
  if (openings >= gross) fail("مساحة الأبواب والنوافذ تساوي أو تتجاوز مساحة الجدران، راجع الأبعاد أو عدد الفتحات.", "doors");
  const walls = gross - openings;
  const ceilingArea = ceiling ? L * W : 0;
  const area = walls + ceilingArea;
  const liters = (area * coats) / coverage;
  const pack = packs(liters);
  const surplus = Math.max(0, Math.round((pack.total - liters) * 1e4) / 1e4);

  return {
    results: [
      { label: "مساحة الجدران الصافية", value: `${fmt(walls, 6)} م²` },
      { label: "مساحة السقف", value: `${fmt(ceilingArea, 6)} م²` },
      { label: "مساحة الدهان الإجمالية للطبقة الواحدة", value: `${fmt(area, 6)} م²` },
      { label: "كمية الدهان المطلوبة", value: `${fmt(liters, 4)} لتر` },
      { label: "العبوات المقترحة", value: packText(pack) },
      { label: "إجمالي الكمية المشتراة", value: `${fmt(pack.total, 4)} لتر` },
      { label: "الفائض", value: `${fmt(surplus, 4)} لتر` }
    ],
    steps: [
      { text: "مساحة الجدران الصافية بعد طرح الفتحات:", tex: `A_w = 2(${ntex(L)} + ${ntex(W)}) \\times ${ntex(H)} - (${doors} \\times ${ntex(doorArea)} + ${windows} \\times ${ntex(windowArea)}) = ${ntex(walls, 6)}\\ \\text{m}^2` },
      { text: "مساحة الدهان للطبقة الواحدة:", tex: `A = A_w${ceiling ? ` + ${ntex(L)} \\times ${ntex(W)}` : ""} = ${ntex(area, 6)}\\ \\text{m}^2` },
      { text: "كمية الدهان لكل الطبقات:", tex: `V = \\frac{A \\times ${coats}}{${ntex(coverage)}} = ${ntex(liters, 6)}\\ \\text{L}` },
      { text: "اختيار مزيج العبوات (18 لتر و3.6 لتر) الذي يقلل الهدر ثم عدد العبوات:", tex: `${ntex(pack.total, 6)}\\ \\text{L} \\ge ${ntex(liters, 6)}\\ \\text{L}` }
    ],
    copy: `مساحة الدهان: ${fmt(area, 6)} م²، الكمية المحتاجة: ${fmt(liters, 4)} لتر، العبوات: ${packText(pack)} (إجمالي ${fmt(pack.total, 4)} لتر)`
  };
};

const tiles = (input) => {
  const floorL = num(input, "floorL", "طول الأرضية", { positive: true, max: 1000 });
  const floorW = num(input, "floorW", "عرض الأرضية", { positive: true, max: 1000 });
  const tileL = num(input, "tileL", "طول البلاطة", { positive: true, max: 500 });
  const tileW = num(input, "tileW", "عرض البلاطة", { positive: true, max: 500 });
  const waste = num(input, "waste", "نسبة الهالك", { min: 0, max: 100, default: 10 });
  const perBox = num(input, "perBox", "عدد البلاط في العلبة", { integer: true, min: 1, max: 10000, optional: true });

  const area = floorL * floorW;
  const tileArea = (tileL / 100) * (tileW / 100);
  const withWaste = area * (1 + waste / 100);
  const count = Math.ceil(withWaste / tileArea - 1e-9);
  const boxes = perBox === null ? null : Math.ceil(count / perBox - 1e-9);

  const results = [
    { label: "مساحة الأرضية", value: `${fmt(area, 6)} م²` },
    { label: "مساحة البلاطة الواحدة", value: `${fmt(tileArea, 6)} م²` },
    { label: "المساحة مع الهالك", value: `${fmt(withWaste, 6)} م²` },
    { label: "عدد البلاط المطلوب", value: `${count} بلاطة` }
  ];
  let copy = `عدد البلاط: ${count} بلاطة (مساحة الأرضية ${fmt(area, 6)} م² مع هالك ${fmt(waste)}%)`;
  if (boxes !== null) {
    results.push({ label: "عدد العلب", value: `${boxes} علبة` });
    copy += `، عدد العلب: ${boxes} علبة`;
  }

  return {
    results,
    steps: [
      { text: "مساحة الأرضية ومساحة البلاطة الواحدة:", tex: `A = ${ntex(floorL)} \\times ${ntex(floorW)} = ${ntex(area, 6)}\\ \\text{m}^2,\\qquad a = \\frac{${ntex(tileL)}}{100} \\times \\frac{${ntex(tileW)}}{100} = ${ntex(tileArea, 6)}\\ \\text{m}^2` },
      { text: "إضافة نسبة الهالك وتقريب عدد البلاط للأعلى:", tex: `N = \\left\\lceil \\frac{A(1 + ${ntex(waste / 100, 6)})}{a} \\right\\rceil = \\left\\lceil \\frac{${ntex(withWaste, 6)}}{${ntex(tileArea, 6)}} \\right\\rceil = ${count}` }
    ],
    copy
  };
};

export const meta = {
  description: "احسب كمية الدهان اللازمة لغرفة بعد طرح الأبواب والنوافذ مع عدد الطبقات والتغطية، واقترح مزيج عبوات 18 لتر و3.6 لتر بأقل هدر، أو احسب عدد بلاطات الأرضية مع نسبة الهالك وعدد العلب.",
  keywords: ["دهان", "طلاء", "بلاط", "سيراميك", "كمية الدهان", "عدد البلاط", "paint", "tiles"],
  formulas: [
    { label: "مساحة الجدران الصافية", tex: "A_w = 2(L + W) H - \\sum A_{\\text{openings}}" },
    { label: "كمية الدهان", tex: "V = \\frac{A \\times \\text{coats}}{\\text{coverage}}" },
    { label: "عدد البلاط مع الهالك", tex: "N = \\left\\lceil \\frac{A (1 + w)}{a} \\right\\rceil" }
  ],
  inputs: [
    { id: "mode", label: "نوع الحساب", type: "select", default: "paint", options: [["paint", "كمية الدهان للغرفة"], ["tiles", "عدد البلاط للأرضية"]] },
    { id: "roomL", label: "طول الغرفة", unit: "م", type: "number", default: "4", when: { mode: ["paint"] } },
    { id: "roomW", label: "عرض الغرفة", unit: "م", type: "number", default: "3", when: { mode: ["paint"] } },
    { id: "roomH", label: "ارتفاع الجدران", unit: "م", type: "number", default: "2.7", when: { mode: ["paint"] } },
    { id: "doors", label: "عدد الأبواب", type: "number", default: "1", when: { mode: ["paint"] } },
    { id: "doorArea", label: "مساحة الباب الواحد", unit: "م²", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "windows", label: "عدد النوافذ", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "windowArea", label: "مساحة النافذة الواحدة", unit: "م²", type: "number", default: "1.5", when: { mode: ["paint"] } },
    { id: "ceiling", label: "طلاء السقف أيضاً", type: "checkbox", default: "1", when: { mode: ["paint"] } },
    { id: "coats", label: "عدد الطبقات", type: "number", default: "2", when: { mode: ["paint"] } },
    { id: "coverage", label: "التغطية لكل لتر", unit: "م²/لتر", type: "number", default: "10", when: { mode: ["paint"] }, help: "تختلف حسب نوع الدهان، وغالباً بين 8 و12 م²/لتر." },
    { id: "floorL", label: "طول الأرضية", unit: "م", type: "number", default: "4", when: { mode: ["tiles"] } },
    { id: "floorW", label: "عرض الأرضية", unit: "م", type: "number", default: "3", when: { mode: ["tiles"] } },
    { id: "tileL", label: "طول البلاطة", unit: "سم", type: "number", default: "60", when: { mode: ["tiles"] } },
    { id: "tileW", label: "عرض البلاطة", unit: "سم", type: "number", default: "60", when: { mode: ["tiles"] } },
    { id: "waste", label: "نسبة الهالك", unit: "%", type: "number", default: "10", when: { mode: ["tiles"] }, help: "للقص والكسر، عادة من 5% إلى 10%." },
    { id: "perBox", label: "عدد البلاط في العلبة", type: "number", when: { mode: ["tiles"] }, help: "اختياري: لحساب عدد العلب." }
  ],
  example: {
    values: { mode: "paint", roomL: "4", roomW: "3", roomH: "2.7", doors: "1", doorArea: "2", windows: "2", windowArea: "1.5", ceiling: "1", coats: "2", coverage: "10", floorL: "4", floorW: "3", tileL: "60", tileW: "60", waste: "10", perBox: "" },
    expect: ["3 × 3.6 لتر"],
    note: "مثال: غرفة 4×3 وارتفاع 2.7 م بباب ونافذتين وسقف وطبقتين."
  },
  invalid: { values: { mode: "tiles", roomL: "4", roomW: "3", roomH: "2.7", doors: "1", doorArea: "2", windows: "2", windowArea: "1.5", ceiling: "1", coats: "2", coverage: "10", floorL: "4", floorW: "3", tileL: "0", tileW: "60", waste: "10", perBox: "" } },
  related: ["unit-converter", "percentage", "discount-tax"]
};

export function solve(input) {
  const mode = choice(input, "mode", "نوع الحساب", ["paint", "tiles"], "paint");
  return mode === "tiles" ? tiles(input) : paint(input);
}
