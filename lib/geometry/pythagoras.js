import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, deg, tex as ntex } from "../core/format.js";

const LABEL = { a: "الساق الأولى a", b: "الساق الثانية b", c: "الوتر c" };

const blank = { mode: "", unit: "cm", a: "", b: "", c: "" };

function gcd(x, y) {
  return y === 0 ? Math.abs(x) : gcd(y, x % y);
}

function isInt(v) {
  return Math.abs(v - Math.round(v)) < 1e-9;
}

export const meta = {
  description: "احسب الضلع المجهول في المثلث القائم من ضلعين معلومين بنظرية فيثاغورس، مع الزوايا والمساحة والمحيط والارتفاع على الوتر، أو صنّف مثلثاً بأضلاعه الثلاثة إلى قائم أو حاد أو منفرج، وتعرّف على الثلاثيات الفيثاغورية.",
  keywords: ["فيثاغورس", "مثلث قائم", "الوتر", "ثلاثية فيثاغورية", "حاد منفرج", "pythagoras", "right triangle", "hypotenuse"],
  formulas: [
    { label: "نظرية فيثاغورس", tex: "c^2 = a^2 + b^2" },
    { label: "المساحة والارتفاع على الوتر", tex: "A = \\frac{ab}{2},\\qquad h = \\frac{ab}{c}" },
    { label: "تصنيف المثلث", tex: "c^2 = a^2+b^2 \\Rightarrow \\text{قائم}, \\quad c^2 < a^2+b^2 \\Rightarrow \\text{حاد}, \\quad c^2 > a^2+b^2 \\Rightarrow \\text{منفرج}" }
  ],
  inputs: [
    { id: "mode", label: "الوضع", type: "select", default: "solve", options: [["solve", "إيجاد الضلع المجهول في المثلث القائم"], ["check", "تصنيف مثلث بأضلاعه الثلاثة"]] },
    { id: "unit", label: "وحدة الطول", type: "text", default: "cm" },
    { id: "a", label: "الساق الأولى a", type: "number", default: "3", help: "في وضع الإيجاد: أدخل اثنين فقط من a وb وc." },
    { id: "b", label: "الساق الثانية b", type: "number", default: "4" },
    { id: "c", label: "الوتر c (أو الضلع الثالث في وضع التصنيف)", type: "number", help: "في وضع الإيجاد يجب أن يكون الوتر أطول من الساق المعلومة." }
  ],
  example: { values: { ...blank, mode: "solve", unit: "cm", a: "3", b: "4" }, expect: ["الوتر c = 5 cm", "6 cm²"], note: "مثال: ساقان 3 و4 cm، فالوتر 5 cm وهي الثلاثية 3-4-5." },
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
  return d === 1 ? `نعم، ثلاثية أولية (${x}، ${y}، ${z})` : `نعم، مضاعف لثلاثية أولية (${x}، ${y}، ${z})`;
}

function solveRight(input, c) {
  const vals = {};
  for (const k of ["a", "b", "c"]) vals[k] = num(input, k, LABEL[k], { positive: true, optional: true });
  const keys = ["a", "b", "c"];
  const given = keys.filter((k) => vals[k] !== null);
  if (given.length !== 2) {
    const field = given.length > 2 ? given[2] : keys.find((k) => vals[k] === null);
    fail(`أدخل ضلعين فقط من الأضلاع الثلاثة (أدخلت ${given.length}).`, field);
  }
  let a = vals.a, b = vals.b, hyp = vals.c;
  const steps = [];
  if (a !== null && b !== null) {
    hyp = Math.hypot(a, b);
    steps.push({ text: "الوتر من نظرية فيثاغورس:", tex: `c = \\sqrt{a^2+b^2} = \\sqrt{${c.T(a * a)}+${c.T(b * b)}} = ${c.T(hyp)}\\ ${c.U}` });
  } else if (a !== null) {
    if (hyp <= a) fail("الوتر c يجب أن يكون أطول من الساق a.", "c");
    b = Math.sqrt(hyp * hyp - a * a);
    steps.push({ text: "الساق المجهولة b:", tex: `b = \\sqrt{c^2-a^2} = \\sqrt{${c.T(hyp * hyp)}-${c.T(a * a)}} = ${c.T(b)}\\ ${c.U}` });
  } else {
    if (hyp <= b) fail("الوتر c يجب أن يكون أطول من الساق b.", "c");
    a = Math.sqrt(hyp * hyp - b * b);
    steps.push({ text: "الساق المجهولة a:", tex: `a = \\sqrt{c^2-b^2} = \\sqrt{${c.T(hyp * hyp)}-${c.T(b * b)}} = ${c.T(a)}\\ ${c.U}` });
  }
  const angA = deg(Math.atan2(a, b)), angB = 90 - angA;
  const area = (a * b) / 2, perimeter = a + b + hyp, alt = (a * b) / hyp;
  steps.push({ text: "المساحة والمحيط:", tex: `A = \\frac{ab}{2} = ${c.T(area)}\\ ${c.U}^2,\\qquad P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` });
  steps.push({ text: "الزاويتان الحادتان (A المقابلة لـ a):", tex: `\\tan A = \\frac{a}{b} \\Rightarrow A = ${fmt(angA, 4)}^\\circ,\\quad B = ${fmt(angB, 4)}^\\circ` });
  steps.push({ text: "الارتفاع على الوتر:", tex: `h = \\frac{ab}{c} = ${c.T(alt)}\\ ${c.U}` });
  const results = [
    { label: "الساق a", value: c.L(a) },
    { label: "الساق b", value: c.L(b) },
    { label: "الوتر c", value: c.L(hyp) },
    { label: "الزاوية A (المقابلة لـ a)", value: `${fmt(angA, 4)}°` },
    { label: "الزاوية B", value: `${fmt(angB, 4)}°` },
    { label: "المساحة", value: c.A(area), text: c.A(area) },
    { label: "المحيط", value: c.L(perimeter), text: c.L(perimeter) },
    { label: "الارتفاع على الوتر", value: c.L(alt) }
  ];
  if ([a, b, hyp].every(isInt)) results.push({ label: "ثلاثية فيثاغورس", value: tripleLabel(Math.round(a), Math.round(b), Math.round(hyp)) });
  return {
    results,
    steps,
    series: [{ name: "المثلث القائم", points: [[0, 0], [a, 0], [0, b], [0, 0]], line: true }],
    copy: `الوتر c = ${c.L(hyp)}، المساحة = ${c.A(area)}، المحيط = ${c.L(perimeter)}`
  };
}

function checkSides(input, c) {
  const a = num(input, "a", LABEL.a, { positive: true });
  const b = num(input, "b", LABEL.b, { positive: true });
  const k = num(input, "c", "الضلع الثالث c", { positive: true });
  const [x, y, z] = [a, b, k].sort((p, q) => p - q);
  if (x + y <= z) fail("الأضلاع الثلاثة لا تُكوّن مثلثاً: مجموع أي ضلعين يجب أن يزيد عن الضلع الثالث.", "c");
  const diff = x * x + y * y - z * z;
  const kind = Math.abs(diff) <= 1e-9 * z * z ? "قائم الزاوية" : diff > 0 ? "حاد الزوايا" : "منفرج الزاوية";
  const s = (a + b + k) / 2;
  const area = Math.sqrt(s * (s - a) * (s - b) * (s - k));
  const perimeter = a + b + k;
  const clampCos = (v) => Math.min(1, Math.max(-1, v));
  const angA = deg(Math.acos(clampCos((b * b + k * k - a * a) / (2 * b * k))));
  const angB = deg(Math.acos(clampCos((a * a + k * k - b * b) / (2 * a * k))));
  const angC = 180 - angA - angB;
  const px = (a * a + k * k - b * b) / (2 * a), py = Math.sqrt(k * k - px * px);
  const results = [
    { label: "نوع المثلث", value: kind },
    { label: "مقارنة الضلع الأكبر² بمجموع مربعي الآخرين", value: `${fmt(z * z, 6)} مقابل ${fmt(x * x + y * y, 6)}` },
    { label: "المساحة", value: c.A(area), text: c.A(area) },
    { label: "المحيط", value: c.L(perimeter), text: c.L(perimeter) },
    { label: "الزوايا (A، B، C بالدرجات)", value: `${fmt(angA, 4)}°، ${fmt(angB, 4)}°، ${fmt(angC, 4)}°` }
  ];
  if ([a, b, k].every(isInt)) {
    const isTriple = diff === 0 && [a, b, k].every((v) => Math.round(v) === v);
    results.push({ label: "ثلاثية فيثاغورس", value: isTriple ? tripleLabel(x, y, z) : "لا" });
  }
  return {
    results,
    steps: [
      { text: "مقارنة مربعات الأضلاع:", tex: `${c.T(z)}^2 ${diff === 0 ? "=" : diff > 0 ? "<" : ">"} ${c.T(x)}^2+${c.T(y)}^2` },
      { text: "نصف المحيط ومساحة هيرون:", tex: `A = \\sqrt{s(s-a)(s-b)(s-c)} = ${c.T(area)}\\ ${c.U}^2` }
    ],
    series: [{ name: "المثلث", points: [[0, 0], [a, 0], [px, py], [0, 0]], line: true }],
    copy: `المثلث ${kind}، المساحة = ${c.A(area)}، المحيط = ${c.L(perimeter)}`
  };
}

export function solve(input) {
  const unit = str(input, "unit", "وحدة الطول", { default: "cm" });
  const mode = choice(input, "mode", "الوضع", ["solve", "check"], "solve");
  const c = ctxOf(unit);
  const r = mode === "check" ? checkSides(input, c) : solveRight(input, c);
  const blocks = [{ type: "plot", title: "رسم المثلث", xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series: r.series }];
  return { results: r.results, steps: r.steps, blocks, copy: r.copy };
}
