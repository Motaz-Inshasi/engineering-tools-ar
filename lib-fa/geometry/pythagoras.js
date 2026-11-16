import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, deg, tex as ntex } from "../core/format.js";

const LABEL = { a: "ساق اول a", b: "ساق دوم b", c: "وتر c" };

const blank = { mode: "", unit: "cm", a: "", b: "", c: "" };

function gcd(x, y) {
  return y === 0 ? Math.abs(x) : gcd(y, x % y);
}

function isInt(v) {
  return Math.abs(v - Math.round(v)) < 1e-9;
}

export const meta = {
  description: "ضلع مجهول مثلث قائم‌الزاویه را از دو ضلع معلوم با قضیهٔ فیثاغورس محاسبه کنید، همراه با زاویه‌ها، مساحت، محیط و ارتفاع وارد بر وتر، یا مثلثی را بر اساس سه ضلعش به قائم‌الزاویه، حاده‌الزاویه یا منفرجه‌الزاویه طبقه‌بندی کنید و سه‌تایی‌های فیثاغورسی را بشناسید.",
  keywords: ["فیثاغورس", "مثلث قائم‌الزاویه", "وتر", "سه‌تایی فیثاغورسی", "حاده یا منفرجه", "pythagoras", "right triangle", "hypotenuse"],
  formulas: [
    { label: "قضیهٔ فیثاغورس", tex: "c^2 = a^2 + b^2" },
    { label: "مساحت و ارتفاع وارد بر وتر", tex: "A = \\frac{ab}{2},\\qquad h = \\frac{ab}{c}" },
    { label: "طبقه‌بندی مثلث", tex: "c^2 = a^2+b^2 \\Rightarrow \\text{قائم}, \\quad c^2 < a^2+b^2 \\Rightarrow \\text{حاده}, \\quad c^2 > a^2+b^2 \\Rightarrow \\text{منفرجه}" }
  ],
  inputs: [
    { id: "mode", label: "حالت", type: "select", default: "solve", options: [["solve", "یافتن ضلع مجهول در مثلث قائم‌الزاویه"], ["check", "طبقه‌بندی مثلث بر اساس سه ضلعش"]] },
    { id: "unit", label: "واحد طول", type: "text", default: "cm" },
    { id: "a", label: "ساق اول a", type: "number", default: "3", help: "در حالت یافتن: فقط دو مورد از a و b و c را وارد کنید." },
    { id: "b", label: "ساق دوم b", type: "number", default: "4" },
    { id: "c", label: "وتر c (یا ضلع سوم در حالت طبقه‌بندی)", type: "number", help: "در حالت یافتن، وتر باید از ساق معلوم بلندتر باشد." }
  ],
  example: { values: { ...blank, mode: "solve", unit: "cm", a: "3", b: "4" }, expect: ["وتر c = 5 cm", "6 cm²"], note: "مثال: دو ساق 3 و 4 cm، وتر 5 cm است و این سه‌تایی 3-4-5 است." },
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
  return d === 1 ? `بله، سه‌تایی اولیه (${x}، ${y}، ${z})` : `بله، مضربی از یک سه‌تایی اولیه (${x}، ${y}، ${z})`;
}

function solveRight(input, c) {
  const vals = {};
  for (const k of ["a", "b", "c"]) vals[k] = num(input, k, LABEL[k], { positive: true, optional: true });
  const keys = ["a", "b", "c"];
  const given = keys.filter((k) => vals[k] !== null);
  if (given.length !== 2) {
    const field = given.length > 2 ? given[2] : keys.find((k) => vals[k] === null);
    fail(`فقط دو ضلع از سه ضلع را وارد کنید (شما ${given.length} ضلع وارد کرده‌اید).`, field);
  }
  let a = vals.a, b = vals.b, hyp = vals.c;
  const steps = [];
  if (a !== null && b !== null) {
    hyp = Math.hypot(a, b);
    steps.push({ text: "وتر از قضیهٔ فیثاغورس:", tex: `c = \\sqrt{a^2+b^2} = \\sqrt{${c.T(a * a)}+${c.T(b * b)}} = ${c.T(hyp)}\\ ${c.U}` });
  } else if (a !== null) {
    if (hyp <= a) fail("وتر c باید از ساق a بلندتر باشد.", "c");
    b = Math.sqrt(hyp * hyp - a * a);
    steps.push({ text: "ساق مجهول b:", tex: `b = \\sqrt{c^2-a^2} = \\sqrt{${c.T(hyp * hyp)}-${c.T(a * a)}} = ${c.T(b)}\\ ${c.U}` });
  } else {
    if (hyp <= b) fail("وتر c باید از ساق b بلندتر باشد.", "c");
    a = Math.sqrt(hyp * hyp - b * b);
    steps.push({ text: "ساق مجهول a:", tex: `a = \\sqrt{c^2-b^2} = \\sqrt{${c.T(hyp * hyp)}-${c.T(b * b)}} = ${c.T(a)}\\ ${c.U}` });
  }
  const angA = deg(Math.atan2(a, b)), angB = 90 - angA;
  const area = (a * b) / 2, perimeter = a + b + hyp, alt = (a * b) / hyp;
  steps.push({ text: "مساحت و محیط:", tex: `A = \\frac{ab}{2} = ${c.T(area)}\\ ${c.U}^2,\\qquad P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` });
  steps.push({ text: "دو زاویهٔ حاده (A روبه‌روی a):", tex: `\\tan A = \\frac{a}{b} \\Rightarrow A = ${fmt(angA, 4)}^\\circ,\\quad B = ${fmt(angB, 4)}^\\circ` });
  steps.push({ text: "ارتفاع وارد بر وتر:", tex: `h = \\frac{ab}{c} = ${c.T(alt)}\\ ${c.U}` });
  const results = [
    { label: "ساق a", value: c.L(a) },
    { label: "ساق b", value: c.L(b) },
    { label: "وتر c", value: c.L(hyp) },
    { label: "زاویهٔ A (روبه‌روی a)", value: `${fmt(angA, 4)}°` },
    { label: "زاویهٔ B", value: `${fmt(angB, 4)}°` },
    { label: "مساحت", value: c.A(area), text: c.A(area) },
    { label: "محیط", value: c.L(perimeter), text: c.L(perimeter) },
    { label: "ارتفاع وارد بر وتر", value: c.L(alt) }
  ];
  if ([a, b, hyp].every(isInt)) results.push({ label: "سه‌تایی فیثاغورسی", value: tripleLabel(Math.round(a), Math.round(b), Math.round(hyp)) });
  return {
    results,
    steps,
    series: [{ name: "مثلث قائم‌الزاویه", points: [[0, 0], [a, 0], [0, b], [0, 0]], line: true }],
    copy: `وتر c = ${c.L(hyp)}، مساحت = ${c.A(area)}، محیط = ${c.L(perimeter)}`
  };
}

function checkSides(input, c) {
  const a = num(input, "a", LABEL.a, { positive: true });
  const b = num(input, "b", LABEL.b, { positive: true });
  const k = num(input, "c", "ضلع سوم c", { positive: true });
  const [x, y, z] = [a, b, k].sort((p, q) => p - q);
  if (x + y <= z) fail("این سه ضلع مثلث نمی‌سازند: مجموع هر دو ضلع باید از ضلع سوم بیشتر باشد.", "c");
  const diff = x * x + y * y - z * z;
  const kind = Math.abs(diff) <= 1e-9 * z * z ? "قائم‌الزاویه" : diff > 0 ? "حاده‌الزاویه" : "منفرجه‌الزاویه";
  const s = (a + b + k) / 2;
  const area = Math.sqrt(s * (s - a) * (s - b) * (s - k));
  const perimeter = a + b + k;
  const clampCos = (v) => Math.min(1, Math.max(-1, v));
  const angA = deg(Math.acos(clampCos((b * b + k * k - a * a) / (2 * b * k))));
  const angB = deg(Math.acos(clampCos((a * a + k * k - b * b) / (2 * a * k))));
  const angC = 180 - angA - angB;
  const px = (a * a + k * k - b * b) / (2 * a), py = Math.sqrt(k * k - px * px);
  const results = [
    { label: "نوع مثلث", value: kind },
    { label: "مقایسهٔ مربع بزرگ‌ترین ضلع با مجموع مربعات دو ضلع دیگر", value: `${fmt(z * z, 6)} در مقابل ${fmt(x * x + y * y, 6)}` },
    { label: "مساحت", value: c.A(area), text: c.A(area) },
    { label: "محیط", value: c.L(perimeter), text: c.L(perimeter) },
    { label: "زاویه‌ها (A، B، C بر حسب درجه)", value: `${fmt(angA, 4)}°، ${fmt(angB, 4)}°، ${fmt(angC, 4)}°` }
  ];
  if ([a, b, k].every(isInt)) {
    const isTriple = diff === 0 && [a, b, k].every((v) => Math.round(v) === v);
    results.push({ label: "سه‌تایی فیثاغورسی", value: isTriple ? tripleLabel(x, y, z) : "خیر" });
  }
  return {
    results,
    steps: [
      { text: "مقایسهٔ مربع ضلع‌ها:", tex: `${c.T(z)}^2 ${diff === 0 ? "=" : diff > 0 ? "<" : ">"} ${c.T(x)}^2+${c.T(y)}^2` },
      { text: "نیم‌محیط و مساحت هرون:", tex: `A = \\sqrt{s(s-a)(s-b)(s-c)} = ${c.T(area)}\\ ${c.U}^2` }
    ],
    series: [{ name: "مثلث", points: [[0, 0], [a, 0], [px, py], [0, 0]], line: true }],
    copy: `مثلث ${kind}، مساحت = ${c.A(area)}، محیط = ${c.L(perimeter)}`
  };
}

export function solve(input) {
  const unit = str(input, "unit", "واحد طول", { default: "cm" });
  const mode = choice(input, "mode", "حالت", ["solve", "check"], "solve");
  const c = ctxOf(unit);
  const r = mode === "check" ? checkSides(input, c) : solveRight(input, c);
  const blocks = [{ type: "plot", title: "رسم مثلث", xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series: r.series }];
  return { results: r.results, steps: r.steps, blocks, copy: r.copy };
}
