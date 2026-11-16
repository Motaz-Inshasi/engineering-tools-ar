import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, deg, tex as ntex } from "../core/format.js";

const LABEL = { a: "Cateto a", b: "Cateto b", c: "Hipotenusa c" };

const blank = { mode: "", unit: "cm", a: "", b: "", c: "" };

function gcd(x, y) {
  return y === 0 ? Math.abs(x) : gcd(y, x % y);
}

function isInt(v) {
  return Math.abs(v - Math.round(v)) < 1e-9;
}

export const meta = {
  description: "Calcula el cateto o la hipotenusa desconocidos con el teorema de Pitágoras, junto con los ángulos, el área, el perímetro y la altura sobre la hipotenusa; o clasifica un triángulo por sus lados como rectángulo, acutángulo u obtusángulo, y reconoce las ternas pitagóricas.",
  keywords: ["Pitágoras", "Triángulo rectángulo", "Hipotenusa", "Terna pitagórica", "Acutángulo u obtusángulo", "pythagoras", "right triangle", "hypotenuse"],
  formulas: [
    { label: "Teorema de Pitágoras", tex: "c^2 = a^2 + b^2" },
    { label: "Área y altura sobre la hipotenusa", tex: "A = \\frac{ab}{2},\\qquad h = \\frac{ab}{c}" },
    { label: "Clasificación del triángulo", tex: "c^2 = a^2+b^2 \\Rightarrow \\text{rectángulo}, \\quad c^2 < a^2+b^2 \\Rightarrow \\text{acutángulo}, \\quad c^2 > a^2+b^2 \\Rightarrow \\text{obtusángulo}" }
  ],
  inputs: [
    { id: "mode", label: "Modo", type: "select", default: "solve", options: [["solve", "Hallar el lado desconocido del triángulo rectángulo"], ["check", "Clasificar un triángulo por sus tres lados"]] },
    { id: "unit", label: "Unidad de longitud", type: "text", default: "cm" },
    { id: "a", label: "Cateto a", type: "number", default: "3", help: "En el modo de cálculo, introduzca solo dos de a, b y c." },
    { id: "b", label: "Cateto b", type: "number", default: "4" },
    { id: "c", label: "Hipotenusa c (o tercer lado en el modo de clasificación)", type: "number", help: "En el modo de cálculo, la hipotenusa debe ser más larga que el cateto conocido." }
  ],
  example: { values: { ...blank, mode: "solve", unit: "cm", a: "3", b: "4" }, expect: ["Hipotenusa c = 5 cm", "6 cm²"], note: "Ejemplo: catetos de 3 y 4 cm; la hipotenusa es 5 cm, y la terna es 3-4-5." },
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
  return d === 1 ? `Sí, terna primitiva (${x}, ${y}, ${z})` : `Sí, múltiplo de una terna primitiva (${x}, ${y}, ${z})`;
}

function solveRight(input, c) {
  const vals = {};
  for (const k of ["a", "b", "c"]) vals[k] = num(input, k, LABEL[k], { positive: true, optional: true });
  const keys = ["a", "b", "c"];
  const given = keys.filter((k) => vals[k] !== null);
  if (given.length !== 2) {
    const field = given.length > 2 ? given[2] : keys.find((k) => vals[k] === null);
    fail(`Introduzca solo dos de los tres lados (ha introducido ${given.length}).`, field);
  }
  let a = vals.a, b = vals.b, hyp = vals.c;
  const steps = [];
  if (a !== null && b !== null) {
    hyp = Math.hypot(a, b);
    steps.push({ text: "Hipotenusa según el teorema de Pitágoras:", tex: `c = \\sqrt{a^2+b^2} = \\sqrt{${c.T(a * a)}+${c.T(b * b)}} = ${c.T(hyp)}\\ ${c.U}` });
  } else if (a !== null) {
    if (hyp <= a) fail("La hipotenusa c debe ser más larga que el cateto a.", "c");
    b = Math.sqrt(hyp * hyp - a * a);
    steps.push({ text: "Cateto desconocido b:", tex: `b = \\sqrt{c^2-a^2} = \\sqrt{${c.T(hyp * hyp)}-${c.T(a * a)}} = ${c.T(b)}\\ ${c.U}` });
  } else {
    if (hyp <= b) fail("La hipotenusa c debe ser más larga que el cateto b.", "c");
    a = Math.sqrt(hyp * hyp - b * b);
    steps.push({ text: "Cateto desconocido a:", tex: `a = \\sqrt{c^2-b^2} = \\sqrt{${c.T(hyp * hyp)}-${c.T(b * b)}} = ${c.T(a)}\\ ${c.U}` });
  }
  const angA = deg(Math.atan2(a, b)), angB = 90 - angA;
  const area = (a * b) / 2, perimeter = a + b + hyp, alt = (a * b) / hyp;
  steps.push({ text: "Área y perímetro:", tex: `A = \\frac{ab}{2} = ${c.T(area)}\\ ${c.U}^2,\\qquad P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` });
  steps.push({ text: "Ángulos agudos (A opuesto a a):", tex: `\\tan A = \\frac{a}{b} \\Rightarrow A = ${fmt(angA, 4)}^\\circ,\\quad B = ${fmt(angB, 4)}^\\circ` });
  steps.push({ text: "Altura sobre la hipotenusa:", tex: `h = \\frac{ab}{c} = ${c.T(alt)}\\ ${c.U}` });
  const results = [
    { label: "Cateto a", value: c.L(a) },
    { label: "Cateto b", value: c.L(b) },
    { label: "Hipotenusa c", value: c.L(hyp) },
    { label: "Ángulo A (opuesto a a)", value: `${fmt(angA, 4)}°` },
    { label: "Ángulo B", value: `${fmt(angB, 4)}°` },
    { label: "Área", value: c.A(area), text: c.A(area) },
    { label: "Perímetro", value: c.L(perimeter), text: c.L(perimeter) },
    { label: "Altura sobre la hipotenusa", value: c.L(alt) }
  ];
  if ([a, b, hyp].every(isInt)) results.push({ label: "Terna pitagórica", value: tripleLabel(Math.round(a), Math.round(b), Math.round(hyp)) });
  return {
    results,
    steps,
    series: [{ name: "Triángulo rectángulo", points: [[0, 0], [a, 0], [0, b], [0, 0]], line: true }],
    copy: `Hipotenusa c = ${c.L(hyp)}, área = ${c.A(area)}, perímetro = ${c.L(perimeter)}`
  };
}

function checkSides(input, c) {
  const a = num(input, "a", LABEL.a, { positive: true });
  const b = num(input, "b", LABEL.b, { positive: true });
  const k = num(input, "c", "Tercer lado c", { positive: true });
  const [x, y, z] = [a, b, k].sort((p, q) => p - q);
  if (x + y <= z) fail("Los tres lados no forman un triángulo: la suma de cualesquiera dos lados debe ser mayor que el tercero.", "c");
  const diff = x * x + y * y - z * z;
  const kind = Math.abs(diff) <= 1e-9 * z * z ? "Rectángulo" : diff > 0 ? "Acutángulo" : "Obtusángulo";
  const s = (a + b + k) / 2;
  const area = Math.sqrt(s * (s - a) * (s - b) * (s - k));
  const perimeter = a + b + k;
  const clampCos = (v) => Math.min(1, Math.max(-1, v));
  const angA = deg(Math.acos(clampCos((b * b + k * k - a * a) / (2 * b * k))));
  const angB = deg(Math.acos(clampCos((a * a + k * k - b * b) / (2 * a * k))));
  const angC = 180 - angA - angB;
  const px = (a * a + k * k - b * b) / (2 * a), py = Math.sqrt(k * k - px * px);
  const results = [
    { label: "Tipo de triángulo", value: kind },
    { label: "Comparación del cuadrado del lado mayor con la suma de los cuadrados de los otros", value: `${fmt(z * z, 6)} frente a ${fmt(x * x + y * y, 6)}` },
    { label: "Área", value: c.A(area), text: c.A(area) },
    { label: "Perímetro", value: c.L(perimeter), text: c.L(perimeter) },
    { label: "Ángulos (A, B, C en grados)", value: `${fmt(angA, 4)}°، ${fmt(angB, 4)}°، ${fmt(angC, 4)}°` }
  ];
  if ([a, b, k].every(isInt)) {
    const isTriple = diff === 0 && [a, b, k].every((v) => Math.round(v) === v);
    results.push({ label: "Terna pitagórica", value: isTriple ? tripleLabel(x, y, z) : "No" });
  }
  return {
    results,
    steps: [
      { text: "Comparación de los cuadrados de los lados:", tex: `${c.T(z)}^2 ${diff === 0 ? "=" : diff > 0 ? "<" : ">"} ${c.T(x)}^2+${c.T(y)}^2` },
      { text: "Semiperímetro y área de Herón:", tex: `A = \\sqrt{s(s-a)(s-b)(s-c)} = ${c.T(area)}\\ ${c.U}^2` }
    ],
    series: [{ name: "Triángulo", points: [[0, 0], [a, 0], [px, py], [0, 0]], line: true }],
    copy: `Triángulo ${kind}, área = ${c.A(area)}, perímetro = ${c.L(perimeter)}`
  };
}

export function solve(input) {
  const unit = str(input, "unit", "Unidad de longitud", { default: "cm" });
  const mode = choice(input, "mode", "Modo", ["solve", "check"], "solve");
  const c = ctxOf(unit);
  const r = mode === "check" ? checkSides(input, c) : solveRight(input, c);
  const blocks = [{ type: "plot", title: "Gráfico del triángulo", xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series: r.series }];
  return { results: r.results, steps: r.steps, blocks, copy: r.copy };
}
