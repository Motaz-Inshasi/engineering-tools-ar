import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const KMH_FACTOR = { kmh: 1, ms: 3.6, mph: 1.609344 };
const provided = (v) => !isBlank(v);

const hourWord = (h) => (h === 1 ? "ایک گھنٹہ" : h === 2 ? "دو گھنٹے" : h <= 10 ? `${h} گھنٹے` : `${h} گھنٹہ`);
const minWord = (m) => (m === 1 ? "1 منٹ" : m === 2 ? "دو منٹ" : m <= 10 ? `${m} منٹ` : `${m} منٹ`);

const hm = (h) => {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  const parts = [];
  if (hh > 0) parts.push(hourWord(hh));
  if (mm > 0) parts.push(minWord(mm));
  return parts.length ? parts.join(" اور") : "0 منٹ";
};

const readTime = (input, timeMode) => {
  if (timeMode === "decimal") return num(input, "time", "وقت", { positive: true });
  const h = num(input, "timeH", "گھنٹے", { integer: true, nonNegative: true, default: 0 });
  const m = num(input, "timeM", "منٹ", { integer: true, min: 0, max: 59, default: 0 });
  const total = h + m / 60;
  if (!(total > 0)) fail("وقت صفر سے زیادہ ہونا چاہیے۔", "timeH");
  return total;
};

const solveTriple = (input) => {
  const unit = choice(input, "speedUnit", "رفتار کی اکائی", ["kmh", "ms", "mph"], "kmh");
  const timeMode = choice(input, "timeMode", "وقت کی شکل", ["decimal", "hm"], "decimal");
  const hasSpeed = provided(input.speed);
  const hasDistance = provided(input.distance);
  const hasTime = timeMode === "decimal" ? provided(input.time) : provided(input.timeH) || provided(input.timeM);
  const count = [hasSpeed, hasDistance, hasTime].filter(Boolean).length;
  if (count !== 2) {
    const field = !hasSpeed ? "speed" : !hasDistance ? "distance" : "time";
    fail("رفتار، فاصلے اور وقت میں سے ٹھیک دو قدریں درج کریں، اور تیسری خالی چھوڑ دیں۔", field);
  }
  const speed = hasSpeed ? num(input, "speed", "رفتار", { positive: true }) * KMH_FACTOR[unit] : null;
  const distance = hasDistance ? num(input, "distance", "فاصلہ", { positive: true }) : null;
  const time = hasTime ? readTime(input, timeMode) : null;

  let v = speed;
  let d = distance;
  let t = time;
  if (v === null) v = d / t;
  else if (d === null) d = v * t;
  else t = d / v;

  const steps = [];
  if (speed === null) steps.push({ text: "رفتار = فاصلہ ÷ وقت:", tex: `v = \\frac{${ntex(d)}}{${ntex(t, 6)}} = ${ntex(v, 6)}\\ \\text{km/h}` });
  else if (distance === null) steps.push({ text: "فاصلہ = رفتار × وقت:", tex: `d = ${ntex(v, 6)} \\times ${ntex(t, 6)} = ${ntex(d, 6)}\\ \\text{km}` });
  else steps.push({ text: "وقت = فاصلہ ÷ رفتار:", tex: `t = \\frac{${ntex(d, 6)}}{${ntex(v, 6)}} = ${ntex(t, 6)}\\ \\text{h}` });
  steps.push({ text: "رفتار کو تینوں اکائیوں میں تبدیل کریں:", tex: `${ntex(v, 6)}\\ \\text{km/h} = ${ntex(v / 3.6, 6)}\\ \\text{m/s} = ${ntex(v / KMH_FACTOR.mph, 6)}\\ \\text{mph}` });

  return {
    results: [
      { label: "کلومیٹر فی گھنٹہ میں رفتار", value: `${fmt(v, 6)} کلومیٹر/گھنٹہ` },
      { label: "میٹر فی سیکنڈ میں رفتار", value: `${fmt(v / 3.6, 6)} میٹر/سیکنڈ` },
      { label: "میل فی گھنٹہ میں رفتار", value: `${fmt(v / KMH_FACTOR.mph, 6)} میل/گھنٹہ` },
      { label: "فاصلہ", value: `${fmt(d, 6)} کلومیٹر` },
      { label: "وقت", value: hm(t) },
      { label: "اعشاری گھنٹوں میں وقت", value: `${fmt(t, 6)} گھنٹہ` }
    ],
    steps,
    copy: `رفتار: ${fmt(v, 6)} کلومیٹر/گھنٹہ، فاصلہ: ${fmt(d, 6)} کلومیٹر، وقت: ${hm(t)}`
  };
};

const average = (input) => {
  const legMode = choice(input, "legMode", "دونوں مرحلوں کا ڈیٹا", ["speeds", "times"], "speeds");
  const d1 = num(input, "d1", "پہلے مرحلے کا فاصلہ", { positive: true });
  const d2 = num(input, "d2", "دوسرے مرحلے کا فاصلہ", { positive: true });
  let t1, t2, v1 = null, v2 = null;
  if (legMode === "speeds") {
    v1 = num(input, "v1", "پہلے مرحلے کی رفتار", { positive: true });
    v2 = num(input, "v2", "دوسرے مرحلے کی رفتار", { positive: true });
    t1 = d1 / v1;
    t2 = d2 / v2;
  } else {
    t1 = num(input, "t1", "پہلے مرحلے کا وقت", { positive: true });
    t2 = num(input, "t2", "دوسرے مرحلے کا وقت", { positive: true });
  }
  const D = d1 + d2;
  const T = t1 + t2;
  const avg = D / T;
  const equalLegs = legMode === "speeds" && Math.abs(d1 - d2) < 1e-12;
  const harmonic = equalLegs ? (2 * v1 * v2) / (v1 + v2) : null;

  const steps = [];
  if (legMode === "speeds") {
    steps.push({ text: "ہر مرحلے کا وقت = فاصلہ ÷ رفتار:", tex: `t_1 = \\frac{${ntex(d1)}}{${ntex(v1)}} = ${ntex(t1, 6)},\\qquad t_2 = \\frac{${ntex(d2)}}{${ntex(v2)}} = ${ntex(t2, 6)}` });
  }
  steps.push({ text: "اوسط رفتار = کل فاصلہ ÷ کل وقت (دونوں رفتاروں کا اوسط نہیں):", tex: `\\bar{v} = \\frac{d_1 + d_2}{t_1 + t_2} = \\frac{${ntex(D)}}{${ntex(T, 6)}} = ${ntex(avg, 6)}\\ \\text{km/h}` });
  if (equalLegs) steps.push({ text: "دو برابر فاصلوں کے لیے اوسط دونوں رفتاروں کا ہم آہنگ اوسط ہوتا ہے:", tex: `\\bar{v} = \\frac{2 v_1 v_2}{v_1 + v_2} = ${ntex(harmonic, 6)}\\ \\text{km/h}` });

  const results = [
    { label: "اوسط رفتار", value: `${fmt(avg, 6)} کلومیٹر/گھنٹہ` },
    { label: "کل فاصلہ", value: `${fmt(D, 6)} کلومیٹر` },
    { label: "کل وقت", value: hm(T) }
  ];
  if (harmonic !== null) results.push({ label: "دونوں رفتاروں کا ہم آہنگ اوسط", value: `${fmt(harmonic, 6)} کلومیٹر/گھنٹہ` });

  const blocks = [];
  if (legMode === "speeds") {
    blocks.push({ type: "note", text: "دو مختلف رفتاروں سے دو فاصلے طے کرتے وقت درست اوسط ہم آہنگ اوسط (یا فاصلے کے وزن سے اوسط) ہے، حسابی اوسط (v1 + v2) / 2 نہیں۔" });
  }

  return {
    results,
    steps,
    copy: `اوسط رفتار: ${fmt(avg, 6)} کلومیٹر/گھنٹہ، کل فاصلہ: ${fmt(D, 6)} کلومیٹر، کل وقت: ${hm(T)}`,
    blocks
  };
};

export const meta = {
  description: "دو قدریں معلوم ہوں تو رفتار، فاصلہ یا وقت حساب کریں، رفتار کو کلومیٹر/گھنٹہ، میٹر/سیکنڈ اور میل/گھنٹہ کے درمیان تبدیل کریں، اور دو مرحلوں کی اوسط رفتار ہم آہنگ اوسط سے یا کل فاصلے کو کل وقت پر تقسیم کر کے نکالیں۔",
  keywords: ["رفتار", "فاصلہ", "وقت", "اوسط رفتار", "ہم آہنگ اوسط", "speed distance time", "کلومیٹر/گھنٹہ"],
  formulas: [
    { label: "بنیادی تعلق", tex: "d = v \\times t" },
    { label: "برابر فاصلوں والے دو مرحلوں کی اوسط رفتار", tex: "\\bar{v} = \\frac{2 v_1 v_2}{v_1 + v_2}" },
    { label: "مجموعی اوسط رفتار", tex: "\\bar{v} = \\frac{d_1 + d_2}{t_1 + t_2}" }
  ],
  inputs: [
    { id: "mode", label: "حساب کی قسم", type: "select", default: "solve", options: [["solve", "دو قدروں سے نامعلوم معلوم کریں"], ["average", "دو مرحلوں کی اوسط رفتار"]] },
    { id: "speed", label: "رفتار", type: "number", default: "80", when: { mode: ["solve"] }, help: "اگر یہی نامعلوم ہو تو خالی چھوڑ دیں۔" },
    { id: "speedUnit", label: "رفتار کی اکائی", type: "select", default: "kmh", options: [["kmh", "کلومیٹر/گھنٹہ"], ["ms", "میٹر/سیکنڈ"], ["mph", "میل/گھنٹہ"]], when: { mode: ["solve"] } },
    { id: "distance", label: "فاصلہ", unit: "کلومیٹر", type: "number", default: "120", when: { mode: ["solve"] }, help: "اگر یہی نامعلوم ہو تو خالی چھوڑ دیں۔" },
    { id: "timeMode", label: "وقت کی شکل", type: "select", default: "decimal", options: [["decimal", "اعشاری گھنٹے"], ["hm", "گھنٹے اور منٹ"]], when: { mode: ["solve"] } },
    { id: "time", label: "وقت", unit: "گھنٹہ", type: "number", default: "", when: { mode: ["solve"], timeMode: ["decimal"] } },
    { id: "timeH", label: "گھنٹے", type: "number", default: "", when: { mode: ["solve"], timeMode: ["hm"] } },
    { id: "timeM", label: "منٹ", type: "number", default: "", when: { mode: ["solve"], timeMode: ["hm"] } },
    { id: "legMode", label: "دونوں مرحلوں کا ڈیٹا", type: "select", default: "speeds", options: [["speeds", "ہر مرحلے کا فاصلہ اور رفتار"], ["times", "ہر مرحلے کا فاصلہ اور وقت"]], when: { mode: ["average"] } },
    { id: "d1", label: "پہلے مرحلے کا فاصلہ", unit: "کلومیٹر", type: "number", default: "60", when: { mode: ["average"] } },
    { id: "v1", label: "پہلے مرحلے کی رفتار", unit: "کلومیٹر/گھنٹہ", type: "number", default: "60", when: { mode: ["average"], legMode: ["speeds"] } },
    { id: "t1", label: "پہلے مرحلے کا وقت", unit: "گھنٹہ", type: "number", default: "1", when: { mode: ["average"], legMode: ["times"] } },
    { id: "d2", label: "دوسرے مرحلے کا فاصلہ", unit: "کلومیٹر", type: "number", default: "60", when: { mode: ["average"] } },
    { id: "v2", label: "دوسرے مرحلے کی رفتار", unit: "کلومیٹر/گھنٹہ", type: "number", default: "30", when: { mode: ["average"], legMode: ["speeds"] } },
    { id: "t2", label: "دوسرے مرحلے کا وقت", unit: "گھنٹہ", type: "number", default: "2", when: { mode: ["average"], legMode: ["times"] } }
  ],
  example: {
    values: { mode: "solve", speed: "80", speedUnit: "kmh", distance: "120", timeMode: "decimal", time: "", timeH: "", timeM: "", legMode: "speeds", d1: "60", v1: "60", t1: "1", d2: "60", v2: "30", t2: "2" },
    expect: ["1 گھنٹہ اور 30 منٹ"],
    note: "مثال: 80 کلومیٹر/گھنٹہ کی رفتار سے 120 کلومیٹر کا فاصلہ 1 گھنٹہ اور 30 منٹ میں طے ہوتا ہے۔"
  },
  invalid: { values: { mode: "solve", speed: "80", speedUnit: "kmh", distance: "120", timeMode: "decimal", time: "1.5", timeH: "", timeM: "", legMode: "speeds", d1: "60", v1: "60", t1: "1", d2: "60", v2: "30", t2: "2" } },
  related: ["unit-converter", "fuel-cost", "discount-tax"]
};

export function solve(input) {
  const mode = choice(input, "mode", "حساب کی قسم", ["solve", "average"], "solve");
  return mode === "average" ? average(input) : solveTriple(input);
}
