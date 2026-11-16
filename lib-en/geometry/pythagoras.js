import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, deg, tex as ntex } from "../core/format.js";

const LABEL = { a: "First leg a", b: "Second leg b", c: "Hypotenuse c" };

const blank = { mode: "", unit: "cm", a: "", b: "", c: "" };

function gcd(x, y) {
  return y === 0 ? Math.abs(x) : gcd(y, x % y);
}

function isInt(v) {
  return Math.abs(v - Math.round(v)) < 1e-9;
}

export const meta = {
  description: "Calculate the unknown side of a right triangle from two known sides using the Pythagorean theorem, together with the angles, area, perimeter and altitude to the hypotenuse, or classify a triangle from its three sides as right, acute or obtuse, and learn about Pythagorean triples.",
  keywords: ["Pythagoras", "Right triangle", "Hypotenuse", "Pythagorean triple", "Acute or obtuse", "pythagoras", "right triangle", "hypotenuse"],
  formulas: [
    { label: "Pythagorean theorem", tex: "c^2 = a^2 + b^2" },
    { label: "Area and altitude to the hypotenuse", tex: "A = \\frac{ab}{2},\\qquad h = \\frac{ab}{c}" },
    { label: "Triangle classification", tex: "c^2 = a^2+b^2 \\Rightarrow \\text{right}, \\quad c^2 < a^2+b^2 \\Rightarrow \\text{acute}, \\quad c^2 > a^2+b^2 \\Rightarrow \\text{obtuse}" }
  ],
  inputs: [
    { id: "mode", label: "Mode", type: "select", default: "solve", options: [["solve", "Find the unknown side of a right triangle"], ["check", "Classify a triangle from its three sides"]] },
    { id: "unit", label: "Length unit", type: "text", default: "cm" },
    { id: "a", label: "First leg a", type: "number", default: "3", help: "In find mode: enter only two of a, b and c." },
    { id: "b", label: "Second leg b", type: "number", default: "4" },
    { id: "c", label: "Hypotenuse c (or the third side in classification mode)", type: "number", help: "In find mode the hypotenuse must be longer than the known leg." }
  ],
  example: { values: { ...blank, mode: "solve", unit: "cm", a: "3", b: "4" }, expect: ["Hypotenuse c = 5 cm", "6 cm²"], note: "Example: legs of 3 and 4 cm give a hypotenuse of 5 cm, which is the 3-4-5 triple." },
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
  return d === 1 ? `Yes, primitive triple (${x}, ${y}, ${z})` : `Yes, multiple of a primitive triple (${x}, ${y}, ${z})`;
}

function solveRight(input, c) {
  const vals = {};
  for (const k of ["a", "b", "c"]) vals[k] = num(input, k, LABEL[k], { positive: true, optional: true });
  const keys = ["a", "b", "c"];
  const given = keys.filter((k) => vals[k] !== null);
  if (given.length !== 2) {
    const field = given.length > 2 ? given[2] : keys.find((k) => vals[k] === null);
    fail(`Enter only two of the three sides (you entered ${given.length}).`, field);
  }
  let a = vals.a, b = vals.b, hyp = vals.c;
  const steps = [];
  if (a !== null && b !== null) {
    hyp = Math.hypot(a, b);
    steps.push({ text: "Hypotenuse from the Pythagorean theorem:", tex: `c = \\sqrt{a^2+b^2} = \\sqrt{${c.T(a * a)}+${c.T(b * b)}} = ${c.T(hyp)}\\ ${c.U}` });
  } else if (a !== null) {
    if (hyp <= a) fail("The hypotenuse c must be longer than the leg a.", "c");
    b = Math.sqrt(hyp * hyp - a * a);
    steps.push({ text: "Unknown leg b:", tex: `b = \\sqrt{c^2-a^2} = \\sqrt{${c.T(hyp * hyp)}-${c.T(a * a)}} = ${c.T(b)}\\ ${c.U}` });
  } else {
    if (hyp <= b) fail("The hypotenuse c must be longer than the leg b.", "c");
    a = Math.sqrt(hyp * hyp - b * b);
    steps.push({ text: "Unknown leg a:", tex: `a = \\sqrt{c^2-b^2} = \\sqrt{${c.T(hyp * hyp)}-${c.T(b * b)}} = ${c.T(a)}\\ ${c.U}` });
  }
  const angA = deg(Math.atan2(a, b)), angB = 90 - angA;
  const area = (a * b) / 2, perimeter = a + b + hyp, alt = (a * b) / hyp;
  steps.push({ text: "Area and perimeter:", tex: `A = \\frac{ab}{2} = ${c.T(area)}\\ ${c.U}^2,\\qquad P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` });
  steps.push({ text: "The two acute angles (A is opposite a):", tex: `\\tan A = \\frac{a}{b} \\Rightarrow A = ${fmt(angA, 4)}^\\circ,\\quad B = ${fmt(angB, 4)}^\\circ` });
  steps.push({ text: "Altitude to the hypotenuse:", tex: `h = \\frac{ab}{c} = ${c.T(alt)}\\ ${c.U}` });
  const results = [
    { label: "Leg a", value: c.L(a) },
    { label: "Leg b", value: c.L(b) },
    { label: "Hypotenuse c", value: c.L(hyp) },
    { label: "Angle A (opposite a)", value: `${fmt(angA, 4)}°` },
    { label: "Angle B", value: `${fmt(angB, 4)}°` },
    { label: "Area", value: c.A(area), text: c.A(area) },
    { label: "Perimeter", value: c.L(perimeter), text: c.L(perimeter) },
    { label: "Altitude to the hypotenuse", value: c.L(alt) }
  ];
  if ([a, b, hyp].every(isInt)) results.push({ label: "Pythagorean triple", value: tripleLabel(Math.round(a), Math.round(b), Math.round(hyp)) });
  return {
    results,
    steps,
    series: [{ name: "Right triangle", points: [[0, 0], [a, 0], [0, b], [0, 0]], line: true }],
    copy: `Hypotenuse c = ${c.L(hyp)}, area = ${c.A(area)}, perimeter = ${c.L(perimeter)}`
  };
}

function checkSides(input, c) {
  const a = num(input, "a", LABEL.a, { positive: true });
  const b = num(input, "b", LABEL.b, { positive: true });
  const k = num(input, "c", "Third side c", { positive: true });
  const [x, y, z] = [a, b, k].sort((p, q) => p - q);
  if (x + y <= z) fail("The three sides do not form a triangle: the sum of any two sides must be greater than the third side.", "c");
  const diff = x * x + y * y - z * z;
  const kind = Math.abs(diff) <= 1e-9 * z * z ? "Right-angled" : diff > 0 ? "Acute-angled" : "Obtuse-angled";
  const s = (a + b + k) / 2;
  const area = Math.sqrt(s * (s - a) * (s - b) * (s - k));
  const perimeter = a + b + k;
  const clampCos = (v) => Math.min(1, Math.max(-1, v));
  const angA = deg(Math.acos(clampCos((b * b + k * k - a * a) / (2 * b * k))));
  const angB = deg(Math.acos(clampCos((a * a + k * k - b * b) / (2 * a * k))));
  const angC = 180 - angA - angB;
  const px = (a * a + k * k - b * b) / (2 * a), py = Math.sqrt(k * k - px * px);
  const results = [
    { label: "Triangle type", value: kind },
    { label: "Comparing the square of the longest side with the sum of the squares of the other two", value: `${fmt(z * z, 6)} versus ${fmt(x * x + y * y, 6)}` },
    { label: "Area", value: c.A(area), text: c.A(area) },
    { label: "Perimeter", value: c.L(perimeter), text: c.L(perimeter) },
    { label: "Angles (A, B, C in degrees)", value: `${fmt(angA, 4)}°، ${fmt(angB, 4)}°، ${fmt(angC, 4)}°` }
  ];
  if ([a, b, k].every(isInt)) {
    const isTriple = diff === 0 && [a, b, k].every((v) => Math.round(v) === v);
    results.push({ label: "Pythagorean triple", value: isTriple ? tripleLabel(x, y, z) : "No" });
  }
  return {
    results,
    steps: [
      { text: "Comparing the squares of the sides:", tex: `${c.T(z)}^2 ${diff === 0 ? "=" : diff > 0 ? "<" : ">"} ${c.T(x)}^2+${c.T(y)}^2` },
      { text: "Semi-perimeter and Heron's area:", tex: `A = \\sqrt{s(s-a)(s-b)(s-c)} = ${c.T(area)}\\ ${c.U}^2` }
    ],
    series: [{ name: "Triangle", points: [[0, 0], [a, 0], [px, py], [0, 0]], line: true }],
    copy: `Triangle ${kind}, area = ${c.A(area)}, perimeter = ${c.L(perimeter)}`
  };
}

export function solve(input) {
  const unit = str(input, "unit", "Length unit", { default: "cm" });
  const mode = choice(input, "mode", "Mode", ["solve", "check"], "solve");
  const c = ctxOf(unit);
  const r = mode === "check" ? checkSides(input, c) : solveRight(input, c);
  const blocks = [{ type: "plot", title: "Triangle drawing", xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series: r.series }];
  return { results: r.results, steps: r.steps, blocks, copy: r.copy };
}
