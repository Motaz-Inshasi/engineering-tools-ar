import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const KMH_FACTOR = { kmh: 1, ms: 3.6, mph: 1.609344 };
const provided = (v) => !isBlank(v);

const hourWord = (h) => (h === 1 ? "ساعة واحدة" : h === 2 ? "ساعتان" : h <= 10 ? `${h} ساعات` : `${h} ساعة`);
const minWord = (m) => (m === 1 ? "1 دقيقة" : m === 2 ? "دقيقتان" : m <= 10 ? `${m} دقائق` : `${m} دقيقة`);

const hm = (h) => {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  const parts = [];
  if (hh > 0) parts.push(hourWord(hh));
  if (mm > 0) parts.push(minWord(mm));
  return parts.length ? parts.join(" و") : "0 دقيقة";
};

const readTime = (input, timeMode) => {
  if (timeMode === "decimal") return num(input, "time", "الزمن", { positive: true });
  const h = num(input, "timeH", "الساعات", { integer: true, nonNegative: true, default: 0 });
  const m = num(input, "timeM", "الدقائق", { integer: true, min: 0, max: 59, default: 0 });
  const total = h + m / 60;
  if (!(total > 0)) fail("الزمن يجب أن يكون أكبر من صفر.", "timeH");
  return total;
};

const solveTriple = (input) => {
  const unit = choice(input, "speedUnit", "وحدة السرعة", ["kmh", "ms", "mph"], "kmh");
  const timeMode = choice(input, "timeMode", "صيغة الزمن", ["decimal", "hm"], "decimal");
  const hasSpeed = provided(input.speed);
  const hasDistance = provided(input.distance);
  const hasTime = timeMode === "decimal" ? provided(input.time) : provided(input.timeH) || provided(input.timeM);
  const count = [hasSpeed, hasDistance, hasTime].filter(Boolean).length;
  if (count !== 2) {
    const field = !hasSpeed ? "speed" : !hasDistance ? "distance" : "time";
    fail("أدخل قيمتين بالضبط من السرعة والمسافة والزمن، واترك الثالثة فارغة.", field);
  }
  const speed = hasSpeed ? num(input, "speed", "السرعة", { positive: true }) * KMH_FACTOR[unit] : null;
  const distance = hasDistance ? num(input, "distance", "المسافة", { positive: true }) : null;
  const time = hasTime ? readTime(input, timeMode) : null;

  let v = speed;
  let d = distance;
  let t = time;
  if (v === null) v = d / t;
  else if (d === null) d = v * t;
  else t = d / v;

  const steps = [];
  if (speed === null) steps.push({ text: "السرعة = المسافة ÷ الزمن:", tex: `v = \\frac{${ntex(d)}}{${ntex(t, 6)}} = ${ntex(v, 6)}\\ \\text{km/h}` });
  else if (distance === null) steps.push({ text: "المسافة = السرعة × الزمن:", tex: `d = ${ntex(v, 6)} \\times ${ntex(t, 6)} = ${ntex(d, 6)}\\ \\text{km}` });
  else steps.push({ text: "الزمن = المسافة ÷ السرعة:", tex: `t = \\frac{${ntex(d, 6)}}{${ntex(v, 6)}} = ${ntex(t, 6)}\\ \\text{h}` });
  steps.push({ text: "تحويل السرعة إلى الوحدات الثلاث:", tex: `${ntex(v, 6)}\\ \\text{km/h} = ${ntex(v / 3.6, 6)}\\ \\text{m/s} = ${ntex(v / KMH_FACTOR.mph, 6)}\\ \\text{mph}` });

  return {
    results: [
      { label: "السرعة بالكيلومتر/ساعة", value: `${fmt(v, 6)} كم/ساعة` },
      { label: "السرعة بالمتر/ثانية", value: `${fmt(v / 3.6, 6)} م/ث` },
      { label: "السرعة بالميل/ساعة", value: `${fmt(v / KMH_FACTOR.mph, 6)} ميل/ساعة` },
      { label: "المسافة", value: `${fmt(d, 6)} كم` },
      { label: "الزمن", value: hm(t) },
      { label: "الزمن بالساعات العشرية", value: `${fmt(t, 6)} ساعة` }
    ],
    steps,
    copy: `السرعة: ${fmt(v, 6)} كم/ساعة، المسافة: ${fmt(d, 6)} كم، الزمن: ${hm(t)}`
  };
};

const average = (input) => {
  const legMode = choice(input, "legMode", "معطيات المرحلتين", ["speeds", "times"], "speeds");
  const d1 = num(input, "d1", "مسافة المرحلة الأولى", { positive: true });
  const d2 = num(input, "d2", "مسافة المرحلة الثانية", { positive: true });
  let t1, t2, v1 = null, v2 = null;
  if (legMode === "speeds") {
    v1 = num(input, "v1", "سرعة المرحلة الأولى", { positive: true });
    v2 = num(input, "v2", "سرعة المرحلة الثانية", { positive: true });
    t1 = d1 / v1;
    t2 = d2 / v2;
  } else {
    t1 = num(input, "t1", "زمن المرحلة الأولى", { positive: true });
    t2 = num(input, "t2", "زمن المرحلة الثانية", { positive: true });
  }
  const D = d1 + d2;
  const T = t1 + t2;
  const avg = D / T;
  const equalLegs = legMode === "speeds" && Math.abs(d1 - d2) < 1e-12;
  const harmonic = equalLegs ? (2 * v1 * v2) / (v1 + v2) : null;

  const steps = [];
  if (legMode === "speeds") {
    steps.push({ text: "زمن كل مرحلة = المسافة ÷ السرعة:", tex: `t_1 = \\frac{${ntex(d1)}}{${ntex(v1)}} = ${ntex(t1, 6)},\\qquad t_2 = \\frac{${ntex(d2)}}{${ntex(v2)}} = ${ntex(t2, 6)}` });
  }
  steps.push({ text: "متوسط السرعة = إجمالي المسافة ÷ إجمالي الزمن (وليس متوسط السرعتين):", tex: `\\bar{v} = \\frac{d_1 + d_2}{t_1 + t_2} = \\frac{${ntex(D)}}{${ntex(T, 6)}} = ${ntex(avg, 6)}\\ \\text{km/h}` });
  if (equalLegs) steps.push({ text: "لمسافتين متساويتين يكون المتوسط هو المتوسط التوافقي للسرعتين:", tex: `\\bar{v} = \\frac{2 v_1 v_2}{v_1 + v_2} = ${ntex(harmonic, 6)}\\ \\text{km/h}` });

  const results = [
    { label: "متوسط السرعة", value: `${fmt(avg, 6)} كم/ساعة` },
    { label: "إجمالي المسافة", value: `${fmt(D, 6)} كم` },
    { label: "إجمالي الزمن", value: hm(T) }
  ];
  if (harmonic !== null) results.push({ label: "المتوسط التوافقي للسرعتين", value: `${fmt(harmonic, 6)} كم/ساعة` });

  const blocks = [];
  if (legMode === "speeds") {
    blocks.push({ type: "note", text: "عند قطع مسافتين بسرعتين مختلفتين، المتوسط الصحيح هو المتوسط التوافقي (أو المرجح بالمسافة) وليس المتوسط الحسابي (v1 + v2) / 2." });
  }

  return {
    results,
    steps,
    copy: `متوسط السرعة: ${fmt(avg, 6)} كم/ساعة، إجمالي المسافة: ${fmt(D, 6)} كم، إجمالي الزمن: ${hm(T)}`,
    blocks
  };
};

export const meta = {
  description: "احسب السرعة أو المسافة أو الزمن عند معرفة اثنين منها، مع تحويل السرعة بين كم/ساعة ومتر/ثانية وميل/ساعة، ومتوسط السرعة لمرحلتين بالمتوسط التوافقي أو بإجمالي المسافة على إجمالي الزمن.",
  keywords: ["سرعة", "مسافة", "زمن", "متوسط السرعة", "المتوسط التوافقي", "speed distance time", "كم/ساعة"],
  formulas: [
    { label: "العلاقة الأساسية", tex: "d = v \\times t" },
    { label: "متوسط السرعة لمرحلتين بمسافتين متساويتين", tex: "\\bar{v} = \\frac{2 v_1 v_2}{v_1 + v_2}" },
    { label: "متوسط السرعة العام", tex: "\\bar{v} = \\frac{d_1 + d_2}{t_1 + t_2}" }
  ],
  inputs: [
    { id: "mode", label: "نوع الحساب", type: "select", default: "solve", options: [["solve", "حساب المجهول من قيمتين"], ["average", "متوسط السرعة لمرحلتين"]] },
    { id: "speed", label: "السرعة", type: "number", default: "80", when: { mode: ["solve"] }, help: "اتركها فارغة إن كانت هي المجهولة." },
    { id: "speedUnit", label: "وحدة السرعة", type: "select", default: "kmh", options: [["kmh", "كم/ساعة"], ["ms", "متر/ثانية"], ["mph", "ميل/ساعة"]], when: { mode: ["solve"] } },
    { id: "distance", label: "المسافة", unit: "كم", type: "number", default: "120", when: { mode: ["solve"] }, help: "اتركها فارغة إن كانت هي المجهولة." },
    { id: "timeMode", label: "صيغة الزمن", type: "select", default: "decimal", options: [["decimal", "ساعات عشرية"], ["hm", "ساعات ودقائق"]], when: { mode: ["solve"] } },
    { id: "time", label: "الزمن", unit: "ساعة", type: "number", default: "", when: { mode: ["solve"], timeMode: ["decimal"] } },
    { id: "timeH", label: "الساعات", type: "number", default: "", when: { mode: ["solve"], timeMode: ["hm"] } },
    { id: "timeM", label: "الدقائق", type: "number", default: "", when: { mode: ["solve"], timeMode: ["hm"] } },
    { id: "legMode", label: "معطيات المرحلتين", type: "select", default: "speeds", options: [["speeds", "مسافة وسرعة لكل مرحلة"], ["times", "مسافة وزمن لكل مرحلة"]], when: { mode: ["average"] } },
    { id: "d1", label: "مسافة المرحلة الأولى", unit: "كم", type: "number", default: "60", when: { mode: ["average"] } },
    { id: "v1", label: "سرعة المرحلة الأولى", unit: "كم/ساعة", type: "number", default: "60", when: { mode: ["average"], legMode: ["speeds"] } },
    { id: "t1", label: "زمن المرحلة الأولى", unit: "ساعة", type: "number", default: "1", when: { mode: ["average"], legMode: ["times"] } },
    { id: "d2", label: "مسافة المرحلة الثانية", unit: "كم", type: "number", default: "60", when: { mode: ["average"] } },
    { id: "v2", label: "سرعة المرحلة الثانية", unit: "كم/ساعة", type: "number", default: "30", when: { mode: ["average"], legMode: ["speeds"] } },
    { id: "t2", label: "زمن المرحلة الثانية", unit: "ساعة", type: "number", default: "2", when: { mode: ["average"], legMode: ["times"] } }
  ],
  example: {
    values: { mode: "solve", speed: "80", speedUnit: "kmh", distance: "120", timeMode: "decimal", time: "", timeH: "", timeM: "", legMode: "speeds", d1: "60", v1: "60", t1: "1", d2: "60", v2: "30", t2: "2" },
    expect: ["ساعة واحدة و30 دقيقة"],
    note: "مثال: مسافة 120 كم بسرعة 80 كم/ساعة تستغرق ساعة و30 دقيقة."
  },
  invalid: { values: { mode: "solve", speed: "80", speedUnit: "kmh", distance: "120", timeMode: "decimal", time: "1.5", timeH: "", timeM: "", legMode: "speeds", d1: "60", v1: "60", t1: "1", d2: "60", v2: "30", t2: "2" } },
  related: ["unit-converter", "fuel-cost", "discount-tax"]
};

export function solve(input) {
  const mode = choice(input, "mode", "نوع الحساب", ["solve", "average"], "solve");
  return mode === "average" ? average(input) : solveTriple(input);
}
