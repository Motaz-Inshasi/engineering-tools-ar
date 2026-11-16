import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const KMH_FACTOR = { kmh: 1, ms: 3.6, mph: 1.609344 };
const provided = (v) => !isBlank(v);

const hourWord = (h) => (h === 1 ? "یک ساعت" : h === 2 ? "دو ساعت" : h <= 10 ? `${h} ساعت` : `${h} ساعت`);
const minWord = (m) => (m === 1 ? "1 دقیقه" : m === 2 ? "دو دقیقه" : m <= 10 ? `${m} دقیقه` : `${m} دقیقه`);

const hm = (h) => {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  const parts = [];
  if (hh > 0) parts.push(hourWord(hh));
  if (mm > 0) parts.push(minWord(mm));
  return parts.length ? parts.join(" و ") : "0 دقیقه";
};

const readTime = (input, timeMode) => {
  if (timeMode === "decimal") return num(input, "time", "زمان", { positive: true });
  const h = num(input, "timeH", "ساعت‌ها", { integer: true, nonNegative: true, default: 0 });
  const m = num(input, "timeM", "دقیقه‌ها", { integer: true, min: 0, max: 59, default: 0 });
  const total = h + m / 60;
  if (!(total > 0)) fail("زمان باید بزرگ‌تر از صفر باشد.", "timeH");
  return total;
};

const solveTriple = (input) => {
  const unit = choice(input, "speedUnit", "واحد سرعت", ["kmh", "ms", "mph"], "kmh");
  const timeMode = choice(input, "timeMode", "قالب زمان", ["decimal", "hm"], "decimal");
  const hasSpeed = provided(input.speed);
  const hasDistance = provided(input.distance);
  const hasTime = timeMode === "decimal" ? provided(input.time) : provided(input.timeH) || provided(input.timeM);
  const count = [hasSpeed, hasDistance, hasTime].filter(Boolean).length;
  if (count !== 2) {
    const field = !hasSpeed ? "speed" : !hasDistance ? "distance" : "time";
    fail("دقیقاً دو مقدار از سرعت، مسافت و زمان را وارد کنید و مقدار سوم را خالی بگذارید.", field);
  }
  const speed = hasSpeed ? num(input, "speed", "سرعت", { positive: true }) * KMH_FACTOR[unit] : null;
  const distance = hasDistance ? num(input, "distance", "مسافت", { positive: true }) : null;
  const time = hasTime ? readTime(input, timeMode) : null;

  let v = speed;
  let d = distance;
  let t = time;
  if (v === null) v = d / t;
  else if (d === null) d = v * t;
  else t = d / v;

  const steps = [];
  if (speed === null) steps.push({ text: "سرعت = مسافت ÷ زمان:", tex: `v = \\frac{${ntex(d)}}{${ntex(t, 6)}} = ${ntex(v, 6)}\\ \\text{km/h}` });
  else if (distance === null) steps.push({ text: "مسافت = سرعت × زمان:", tex: `d = ${ntex(v, 6)} \\times ${ntex(t, 6)} = ${ntex(d, 6)}\\ \\text{km}` });
  else steps.push({ text: "زمان = مسافت ÷ سرعت:", tex: `t = \\frac{${ntex(d, 6)}}{${ntex(v, 6)}} = ${ntex(t, 6)}\\ \\text{h}` });
  steps.push({ text: "تبدیل سرعت به هر سه واحد:", tex: `${ntex(v, 6)}\\ \\text{km/h} = ${ntex(v / 3.6, 6)}\\ \\text{m/s} = ${ntex(v / KMH_FACTOR.mph, 6)}\\ \\text{mph}` });

  return {
    results: [
      { label: "سرعت بر حسب کیلومتر بر ساعت", value: `${fmt(v, 6)} کیلومتر بر ساعت` },
      { label: "سرعت بر حسب متر بر ثانیه", value: `${fmt(v / 3.6, 6)} متر بر ثانیه` },
      { label: "سرعت بر حسب مایل بر ساعت", value: `${fmt(v / KMH_FACTOR.mph, 6)} مایل بر ساعت` },
      { label: "مسافت", value: `${fmt(d, 6)} کیلومتر` },
      { label: "زمان", value: hm(t) },
      { label: "زمان بر حسب ساعت اعشاری", value: `${fmt(t, 6)} ساعت` }
    ],
    steps,
    copy: `سرعت: ${fmt(v, 6)} کیلومتر بر ساعت، مسافت: ${fmt(d, 6)} کیلومتر، زمان: ${hm(t)}`
  };
};

const average = (input) => {
  const legMode = choice(input, "legMode", "داده‌های دو مرحله", ["speeds", "times"], "speeds");
  const d1 = num(input, "d1", "مسافت مرحلهٔ اول", { positive: true });
  const d2 = num(input, "d2", "مسافت مرحلهٔ دوم", { positive: true });
  let t1, t2, v1 = null, v2 = null;
  if (legMode === "speeds") {
    v1 = num(input, "v1", "سرعت مرحلهٔ اول", { positive: true });
    v2 = num(input, "v2", "سرعت مرحلهٔ دوم", { positive: true });
    t1 = d1 / v1;
    t2 = d2 / v2;
  } else {
    t1 = num(input, "t1", "زمان مرحلهٔ اول", { positive: true });
    t2 = num(input, "t2", "زمان مرحلهٔ دوم", { positive: true });
  }
  const D = d1 + d2;
  const T = t1 + t2;
  const avg = D / T;
  const equalLegs = legMode === "speeds" && Math.abs(d1 - d2) < 1e-12;
  const harmonic = equalLegs ? (2 * v1 * v2) / (v1 + v2) : null;

  const steps = [];
  if (legMode === "speeds") {
    steps.push({ text: "زمان هر مرحله = مسافت ÷ سرعت:", tex: `t_1 = \\frac{${ntex(d1)}}{${ntex(v1)}} = ${ntex(t1, 6)},\\qquad t_2 = \\frac{${ntex(d2)}}{${ntex(v2)}} = ${ntex(t2, 6)}` });
  }
  steps.push({ text: "متوسط سرعت = کل مسافت ÷ کل زمان (نه میانگین دو سرعت):", tex: `\\bar{v} = \\frac{d_1 + d_2}{t_1 + t_2} = \\frac{${ntex(D)}}{${ntex(T, 6)}} = ${ntex(avg, 6)}\\ \\text{km/h}` });
  if (equalLegs) steps.push({ text: "برای دو مسافت برابر، متوسط برابر میانگین هارمونیک دو سرعت است:", tex: `\\bar{v} = \\frac{2 v_1 v_2}{v_1 + v_2} = ${ntex(harmonic, 6)}\\ \\text{km/h}` });

  const results = [
    { label: "متوسط سرعت", value: `${fmt(avg, 6)} کیلومتر بر ساعت` },
    { label: "کل مسافت", value: `${fmt(D, 6)} کیلومتر` },
    { label: "کل زمان", value: hm(T) }
  ];
  if (harmonic !== null) results.push({ label: "میانگین هارمونیک دو سرعت", value: `${fmt(harmonic, 6)} کیلومتر بر ساعت` });

  const blocks = [];
  if (legMode === "speeds") {
    blocks.push({ type: "note", text: "هنگام طی دو مسافت با دو سرعت متفاوت، متوسط درست میانگین هارمونیک (یا میانگین وزنی بر حسب مسافت) است، نه میانگین حسابی (v1 + v2) / 2." });
  }

  return {
    results,
    steps,
    copy: `متوسط سرعت: ${fmt(avg, 6)} کیلومتر بر ساعت، کل مسافت: ${fmt(D, 6)} کیلومتر، کل زمان: ${hm(T)}`,
    blocks
  };
};

export const meta = {
  description: "سرعت یا مسافت یا زمان را وقتی دو تا از آن‌ها معلوم‌اند محاسبه کنید، سرعت را بین کیلومتر بر ساعت، متر بر ثانیه و مایل بر ساعت تبدیل کنید، و متوسط سرعت دو مرحله را با میانگین هارمونیک یا با تقسیم کل مسافت بر کل زمان بیابید.",
  keywords: ["سرعت", "مسافت", "زمان", "متوسط سرعت", "میانگین هارمونیک", "speed distance time", "کیلومتر بر ساعت"],
  formulas: [
    { label: "رابطهٔ اساسی", tex: "d = v \\times t" },
    { label: "متوسط سرعت دو مرحله با مسافت‌های برابر", tex: "\\bar{v} = \\frac{2 v_1 v_2}{v_1 + v_2}" },
    { label: "متوسط سرعت کلی", tex: "\\bar{v} = \\frac{d_1 + d_2}{t_1 + t_2}" }
  ],
  inputs: [
    { id: "mode", label: "نوع محاسبه", type: "select", default: "solve", options: [["solve", "محاسبهٔ مجهول از دو مقدار"], ["average", "متوسط سرعت دو مرحله"]] },
    { id: "speed", label: "سرعت", type: "number", default: "80", when: { mode: ["solve"] }, help: "اگر این مقدار مجهول است، خالی بگذارید." },
    { id: "speedUnit", label: "واحد سرعت", type: "select", default: "kmh", options: [["kmh", "کیلومتر بر ساعت"], ["ms", "متر بر ثانیه"], ["mph", "مایل بر ساعت"]], when: { mode: ["solve"] } },
    { id: "distance", label: "مسافت", unit: "کیلومتر", type: "number", default: "120", when: { mode: ["solve"] }, help: "اگر این مقدار مجهول است، خالی بگذارید." },
    { id: "timeMode", label: "قالب زمان", type: "select", default: "decimal", options: [["decimal", "ساعت اعشاری"], ["hm", "ساعت و دقیقه"]], when: { mode: ["solve"] } },
    { id: "time", label: "زمان", unit: "ساعت", type: "number", default: "", when: { mode: ["solve"], timeMode: ["decimal"] } },
    { id: "timeH", label: "ساعت‌ها", type: "number", default: "", when: { mode: ["solve"], timeMode: ["hm"] } },
    { id: "timeM", label: "دقیقه‌ها", type: "number", default: "", when: { mode: ["solve"], timeMode: ["hm"] } },
    { id: "legMode", label: "داده‌های دو مرحله", type: "select", default: "speeds", options: [["speeds", "مسافت و سرعت برای هر مرحله"], ["times", "مسافت و زمان برای هر مرحله"]], when: { mode: ["average"] } },
    { id: "d1", label: "مسافت مرحلهٔ اول", unit: "کیلومتر", type: "number", default: "60", when: { mode: ["average"] } },
    { id: "v1", label: "سرعت مرحلهٔ اول", unit: "کیلومتر بر ساعت", type: "number", default: "60", when: { mode: ["average"], legMode: ["speeds"] } },
    { id: "t1", label: "زمان مرحلهٔ اول", unit: "ساعت", type: "number", default: "1", when: { mode: ["average"], legMode: ["times"] } },
    { id: "d2", label: "مسافت مرحلهٔ دوم", unit: "کیلومتر", type: "number", default: "60", when: { mode: ["average"] } },
    { id: "v2", label: "سرعت مرحلهٔ دوم", unit: "کیلومتر بر ساعت", type: "number", default: "30", when: { mode: ["average"], legMode: ["speeds"] } },
    { id: "t2", label: "زمان مرحلهٔ دوم", unit: "ساعت", type: "number", default: "2", when: { mode: ["average"], legMode: ["times"] } }
  ],
  example: {
    values: { mode: "solve", speed: "80", speedUnit: "kmh", distance: "120", timeMode: "decimal", time: "", timeH: "", timeM: "", legMode: "speeds", d1: "60", v1: "60", t1: "1", d2: "60", v2: "30", t2: "2" },
    expect: ["یک ساعت و 30 دقیقه"],
    note: "مثال: مسافت 120 کیلومتر با سرعت 80 کیلومتر بر ساعت، یک ساعت و 30 دقیقه طول می‌کشد."
  },
  invalid: { values: { mode: "solve", speed: "80", speedUnit: "kmh", distance: "120", timeMode: "decimal", time: "1.5", timeH: "", timeM: "", legMode: "speeds", d1: "60", v1: "60", t1: "1", d2: "60", v2: "30", t2: "2" } },
  related: ["unit-converter", "fuel-cost", "discount-tax"]
};

export function solve(input) {
  const mode = choice(input, "mode", "نوع محاسبه", ["solve", "average"], "solve");
  return mode === "average" ? average(input) : solveTriple(input);
}
