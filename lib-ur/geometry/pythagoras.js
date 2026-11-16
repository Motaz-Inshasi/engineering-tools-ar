import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, deg, tex as ntex } from "../core/format.js";

const LABEL = { a: "پہلی قائمہ ساق a", b: "دوسری قائمہ ساق b", c: "وتر c" };

const blank = { mode: "", unit: "cm", a: "", b: "", c: "" };

function gcd(x, y) {
  return y === 0 ? Math.abs(x) : gcd(y, x % y);
}

function isInt(v) {
  return Math.abs(v - Math.round(v)) < 1e-9;
}

export const meta = {
  description: "دو معلوم اضلاع سے فیثاغورس کے نظریے کے ذریعے قائمہ الزاویہ مثلث کا نامعلوم ضلع حساب کریں، ساتھ زاویے، رقبہ، محیط اور وتر پر اونچائی؛ یا تین اضلاع سے مثلث کو قائمہ، حادہ یا منفرجہ میں درجہ بند کریں، اور فیثاغورسی ثلاثیوں کے بارے میں جانیں۔",
  keywords: ["فیثاغورس", "قائمہ مثلث", "وتر", "فیثاغورسی ثلاثی", "حادہ یا منفرجہ", "pythagoras", "right triangle", "hypotenuse"],
  formulas: [
    { label: "فیثاغورس کا نظریہ", tex: "c^2 = a^2 + b^2" },
    { label: "رقبہ اور وتر پر اونچائی", tex: "A = \\frac{ab}{2},\\qquad h = \\frac{ab}{c}" },
    { label: "مثلث کی درجہ بندی", tex: "c^2 = a^2+b^2 \\Rightarrow \\text{قائمہ}, \\quad c^2 < a^2+b^2 \\Rightarrow \\text{حادہ}, \\quad c^2 > a^2+b^2 \\Rightarrow \\text{منفرجہ}" }
  ],
  inputs: [
    { id: "mode", label: "موڈ", type: "select", default: "solve", options: [["solve", "قائمہ مثلث کا نامعلوم ضلع معلوم کریں"], ["check", "تین اضلاع سے مثلث کی درجہ بندی کریں"]] },
    { id: "unit", label: "لمبائی کی اکائی", type: "text", default: "cm" },
    { id: "a", label: "پہلی قائمہ ساق a", type: "number", default: "3", help: "معلوم کرنے کے موڈ میں: a، b اور c میں سے صرف دو درج کریں۔" },
    { id: "b", label: "دوسری قائمہ ساق b", type: "number", default: "4" },
    { id: "c", label: "وتر c (یا درجہ بندی کے موڈ میں تیسرا ضلع)", type: "number", help: "معلوم کرنے کے موڈ میں وتر معلوم ساق سے لمبا ہونا چاہیے۔" }
  ],
  example: { values: { ...blank, mode: "solve", unit: "cm", a: "3", b: "4" }, expect: ["وتر c = 5 cm", "6 cm²"], note: "مثال: 3 اور 4 cm کی ساقیں وتر 5 cm دیتی ہیں، جو 3-4-5 ثلاثی ہے۔" },
  invalid: { values: { ...blank, mode: "solve", unit: "cm", a: "5", c: "3" } },
  related: ["triangle-solver", "plane-shapes", "solids", "circle-geometry", "coordinate-geometry", "trigonometry", "unit-converter"]
};

function ctxOf(unit) {
  return {
    L: (x) => `${fmt(x, 6)} ${unit}`,
    A: (x) => `${fmt(x, 6)} ${unit}²`,
    T: (x) => ntex(x, 6),
    U: `\\text{${unit}}`
  };
}

function tripleLabel(x, y, z) {
  const d = gcd(gcd(x, y), z);
  return d === 1 ? `ہاں، ابتدائی ثلاثی (${x}، ${y}، ${z})` : `ہاں، ابتدائی ثلاثی کا مضاعف (${x}، ${y}، ${z})`;
}

function solveRight(input, c) {
  const vals = {};
  for (const k of ["a", "b", "c"]) vals[k] = num(input, k, LABEL[k], { positive: true, optional: true });
  const keys = ["a", "b", "c"];
  const given = keys.filter((k) => vals[k] !== null);
  if (given.length !== 2) {
    const field = given.length > 2 ? given[2] : keys.find((k) => vals[k] === null);
    fail(`تینوں اضلاع میں سے صرف دو اضلاع درج کریں (آپ نے ${given.length} درج کیے ہیں)۔`, field);
  }
  let a = vals.a, b = vals.b, hyp = vals.c;
  const steps = [];
  if (a !== null && b !== null) {
    hyp = Math.hypot(a, b);
    steps.push({ text: "فیثاغورس کے نظریے سے وتر:", tex: `c = \\sqrt{a^2+b^2} = \\sqrt{${c.T(a * a)}+${c.T(b * b)}} = ${c.T(hyp)}\\ ${c.U}` });
  } else if (a !== null) {
    if (hyp <= a) fail("وتر c ساق a سے لمبا ہونا چاہیے۔", "c");
    b = Math.sqrt(hyp * hyp - a * a);
    steps.push({ text: "نامعلوم ساق b:", tex: `b = \\sqrt{c^2-a^2} = \\sqrt{${c.T(hyp * hyp)}-${c.T(a * a)}} = ${c.T(b)}\\ ${c.U}` });
  } else {
    if (hyp <= b) fail("وتر c ساق b سے لمبا ہونا چاہیے۔", "c");
    a = Math.sqrt(hyp * hyp - b * b);
    steps.push({ text: "نامعلوم ساق a:", tex: `a = \\sqrt{c^2-b^2} = \\sqrt{${c.T(hyp * hyp)}-${c.T(b * b)}} = ${c.T(a)}\\ ${c.U}` });
  }
  const angA = deg(Math.atan2(a, b)), angB = 90 - angA;
  const area = (a * b) / 2, perimeter = a + b + hyp, alt = (a * b) / hyp;
  steps.push({ text: "رقبہ اور محیط:", tex: `A = \\frac{ab}{2} = ${c.T(area)}\\ ${c.U}^2,\\qquad P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` });
  steps.push({ text: "دونوں حادہ زاویے (A، ضلع a کے مقابل):", tex: `\\tan A = \\frac{a}{b} \\Rightarrow A = ${fmt(angA, 4)}^\\circ,\\quad B = ${fmt(angB, 4)}^\\circ` });
  steps.push({ text: "وتر پر اونچائی:", tex: `h = \\frac{ab}{c} = ${c.T(alt)}\\ ${c.U}` });
  const results = [
    { label: "ساق a", value: c.L(a) },
    { label: "ساق b", value: c.L(b) },
    { label: "وتر c", value: c.L(hyp) },
    { label: "زاویہ A (a کے مقابل)", value: `${fmt(angA, 4)}°` },
    { label: "زاویہ B", value: `${fmt(angB, 4)}°` },
    { label: "رقبہ", value: c.A(area), text: c.A(area) },
    { label: "محیط", value: c.L(perimeter), text: c.L(perimeter) },
    { label: "وتر پر اونچائی", value: c.L(alt) }
  ];
  if ([a, b, hyp].every(isInt)) results.push({ label: "فیثاغورسی ثلاثی", value: tripleLabel(Math.round(a), Math.round(b), Math.round(hyp)) });
  return {
    results,
    steps,
    series: [{ name: "قائمہ مثلث", points: [[0, 0], [a, 0], [0, b], [0, 0]], line: true }],
    copy: `وتر c = ${c.L(hyp)}، رقبہ = ${c.A(area)}، محیط = ${c.L(perimeter)}`
  };
}

function checkSides(input, c) {
  const a = num(input, "a", LABEL.a, { positive: true });
  const b = num(input, "b", LABEL.b, { positive: true });
  const k = num(input, "c", "تیسرا ضلع c", { positive: true });
  const [x, y, z] = [a, b, k].sort((p, q) => p - q);
  if (x + y <= z) fail("تینوں اضلاع مثلث نہیں بناتے: کوئی بھی دو اضلاع کا مجموعہ تیسرے ضلع سے زیادہ ہونا چاہیے۔", "c");
  const diff = x * x + y * y - z * z;
  const kind = Math.abs(diff) <= 1e-9 * z * z ? "قائمہ الزاویہ" : diff > 0 ? "حادہ الزاویہ" : "منفرجہ الزاویہ";
  const s = (a + b + k) / 2;
  const area = Math.sqrt(s * (s - a) * (s - b) * (s - k));
  const perimeter = a + b + k;
  const clampCos = (v) => Math.min(1, Math.max(-1, v));
  const angA = deg(Math.acos(clampCos((b * b + k * k - a * a) / (2 * b * k))));
  const angB = deg(Math.acos(clampCos((a * a + k * k - b * b) / (2 * a * k))));
  const angC = 180 - angA - angB;
  const px = (a * a + k * k - b * b) / (2 * a), py = Math.sqrt(k * k - px * px);
  const results = [
    { label: "مثلث کی قسم", value: kind },
    { label: "سب سے لمبے ضلع کے مربع کا باقی دو اضلاع کے مربعوں کے مجموعے سے موازنہ", value: `${fmt(z * z, 6)} کے مقابل ${fmt(x * x + y * y, 6)}` },
    { label: "رقبہ", value: c.A(area), text: c.A(area) },
    { label: "محیط", value: c.L(perimeter), text: c.L(perimeter) },
    { label: "زاویے (A، B، C ڈگری میں)", value: `${fmt(angA, 4)}°، ${fmt(angB, 4)}°، ${fmt(angC, 4)}°` }
  ];
  if ([a, b, k].every(isInt)) {
    const isTriple = diff === 0 && [a, b, k].every((v) => Math.round(v) === v);
    results.push({ label: "فیثاغورسی ثلاثی", value: isTriple ? tripleLabel(x, y, z) : "نہیں" });
  }
  return {
    results,
    steps: [
      { text: "اضلاع کے مربعوں کا موازنہ:", tex: `${c.T(z)}^2 ${diff === 0 ? "=" : diff > 0 ? "<" : ">"} ${c.T(x)}^2+${c.T(y)}^2` },
      { text: "نصف محیط اور ہیرون کا رقبہ:", tex: `A = \\sqrt{s(s-a)(s-b)(s-c)} = ${c.T(area)}\\ ${c.U}^2` }
    ],
    series: [{ name: "مثلث", points: [[0, 0], [a, 0], [px, py], [0, 0]], line: true }],
    copy: `مثلث ${kind}، رقبہ = ${c.A(area)}، محیط = ${c.L(perimeter)}`
  };
}

export function solve(input) {
  const unit = str(input, "unit", "لمبائی کی اکائی", { default: "cm" });
  const mode = choice(input, "mode", "موڈ", ["solve", "check"], "solve");
  const c = ctxOf(unit);
  const r = mode === "check" ? checkSides(input, c) : solveRight(input, c);
  const blocks = [{ type: "plot", title: "مثلث کا خاکہ", xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series: r.series }];
  return { results: r.results, steps: r.steps, blocks, copy: r.copy };
}
