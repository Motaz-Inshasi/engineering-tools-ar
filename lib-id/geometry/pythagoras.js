import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, deg, tex as ntex } from "../core/format.js";

const LABEL = { a: "Kaki pertama a", b: "Kaki kedua b", c: "Hipotenusa c" };

const blank = { mode: "", unit: "cm", a: "", b: "", c: "" };

function gcd(x, y) {
  return y === 0 ? Math.abs(x) : gcd(y, x % y);
}

function isInt(v) {
  return Math.abs(v - Math.round(v)) < 1e-9;
}

export const meta = {
  description: "Hitung sisi yang tidak diketahui pada segitiga siku-siku dari dua sisi yang diketahui dengan teorema Pythagoras, beserta sudut, luas, keliling, dan tinggi pada hipotenusa, atau klasifikasikan segitiga dengan ketiga sisinya menjadi siku-siku, lancip, atau tumpul, dan kenali tripel Pythagoras.",
  keywords: ["Pythagoras", "segitiga siku-siku", "hipotenusa", "tripel Pythagoras", "lancip atau tumpul", "pythagoras", "right triangle", "hypotenuse"],
  formulas: [
    { label: "Teorema Pythagoras", tex: "c^2 = a^2 + b^2" },
    { label: "Luas dan tinggi pada hipotenusa", tex: "A = \\frac{ab}{2},\\qquad h = \\frac{ab}{c}" },
    { label: "Klasifikasi segitiga", tex: "c^2 = a^2+b^2 \\Rightarrow \\text{siku-siku}, \\quad c^2 < a^2+b^2 \\Rightarrow \\text{lancip}, \\quad c^2 > a^2+b^2 \\Rightarrow \\text{tumpul}" }
  ],
  inputs: [
    { id: "mode", label: "Mode", type: "select", default: "solve", options: [["solve", "Mencari sisi yang tidak diketahui pada segitiga siku-siku"], ["check", "Klasifikasi segitiga dari ketiga sisinya"]] },
    { id: "unit", label: "Satuan panjang", type: "text", default: "cm" },
    { id: "a", label: "Kaki pertama a", type: "number", default: "3", help: "Pada mode mencari: masukkan hanya dua dari a, b, dan c." },
    { id: "b", label: "Kaki kedua b", type: "number", default: "4" },
    { id: "c", label: "Hipotenusa c (atau sisi ketiga pada mode klasifikasi)", type: "number", help: "Pada mode mencari, hipotenusa harus lebih panjang dari kaki yang diketahui." }
  ],
  example: { values: { ...blank, mode: "solve", unit: "cm", a: "3", b: "4" }, expect: ["Hipotenusa c = 5 cm", "6 cm²"], note: "Contoh: dua kaki 3 dan 4 cm, maka hipotenusa 5 cm dan itu tripel 3-4-5." },
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
  return d === 1 ? `Ya, tripel primitif (${x}, ${y}, ${z})` : `Ya, kelipatan tripel primitif (${x}, ${y}, ${z})`;
}

function solveRight(input, c) {
  const vals = {};
  for (const k of ["a", "b", "c"]) vals[k] = num(input, k, LABEL[k], { positive: true, optional: true });
  const keys = ["a", "b", "c"];
  const given = keys.filter((k) => vals[k] !== null);
  if (given.length !== 2) {
    const field = given.length > 2 ? given[2] : keys.find((k) => vals[k] === null);
    fail(`Masukkan hanya dua dari ketiga sisi (Anda memasukkan ${given.length}).`, field);
  }
  let a = vals.a, b = vals.b, hyp = vals.c;
  const steps = [];
  if (a !== null && b !== null) {
    hyp = Math.hypot(a, b);
    steps.push({ text: "Hipotenusa dari teorema Pythagoras:", tex: `c = \\sqrt{a^2+b^2} = \\sqrt{${c.T(a * a)}+${c.T(b * b)}} = ${c.T(hyp)}\\ ${c.U}` });
  } else if (a !== null) {
    if (hyp <= a) fail("Hipotenusa c harus lebih panjang dari kaki a.", "c");
    b = Math.sqrt(hyp * hyp - a * a);
    steps.push({ text: "Kaki yang tidak diketahui b:", tex: `b = \\sqrt{c^2-a^2} = \\sqrt{${c.T(hyp * hyp)}-${c.T(a * a)}} = ${c.T(b)}\\ ${c.U}` });
  } else {
    if (hyp <= b) fail("Hipotenusa c harus lebih panjang dari kaki b.", "c");
    a = Math.sqrt(hyp * hyp - b * b);
    steps.push({ text: "Kaki yang tidak diketahui a:", tex: `a = \\sqrt{c^2-b^2} = \\sqrt{${c.T(hyp * hyp)}-${c.T(b * b)}} = ${c.T(a)}\\ ${c.U}` });
  }
  const angA = deg(Math.atan2(a, b)), angB = 90 - angA;
  const area = (a * b) / 2, perimeter = a + b + hyp, alt = (a * b) / hyp;
  steps.push({ text: "Luas dan keliling:", tex: `A = \\frac{ab}{2} = ${c.T(area)}\\ ${c.U}^2,\\qquad P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` });
  steps.push({ text: "Dua sudut lancip (A di depan a):", tex: `\\tan A = \\frac{a}{b} \\Rightarrow A = ${fmt(angA, 4)}^\\circ,\\quad B = ${fmt(angB, 4)}^\\circ` });
  steps.push({ text: "Tinggi pada hipotenusa:", tex: `h = \\frac{ab}{c} = ${c.T(alt)}\\ ${c.U}` });
  const results = [
    { label: "Kaki a", value: c.L(a) },
    { label: "Kaki b", value: c.L(b) },
    { label: "Hipotenusa c", value: c.L(hyp) },
    { label: "Sudut A (di depan a)", value: `${fmt(angA, 4)}°` },
    { label: "Sudut B", value: `${fmt(angB, 4)}°` },
    { label: "Luas", value: c.A(area), text: c.A(area) },
    { label: "Keliling", value: c.L(perimeter), text: c.L(perimeter) },
    { label: "Tinggi pada hipotenusa", value: c.L(alt) }
  ];
  if ([a, b, hyp].every(isInt)) results.push({ label: "Tripel Pythagoras", value: tripleLabel(Math.round(a), Math.round(b), Math.round(hyp)) });
  return {
    results,
    steps,
    series: [{ name: "Segitiga siku-siku", points: [[0, 0], [a, 0], [0, b], [0, 0]], line: true }],
    copy: `Hipotenusa c = ${c.L(hyp)}, luas = ${c.A(area)}, keliling = ${c.L(perimeter)}`
  };
}

function checkSides(input, c) {
  const a = num(input, "a", LABEL.a, { positive: true });
  const b = num(input, "b", LABEL.b, { positive: true });
  const k = num(input, "c", "Sisi ketiga c", { positive: true });
  const [x, y, z] = [a, b, k].sort((p, q) => p - q);
  if (x + y <= z) fail("Ketiga sisi tidak membentuk segitiga: jumlah dua sisi mana pun harus lebih besar dari sisi ketiga.", "c");
  const diff = x * x + y * y - z * z;
  const kind = Math.abs(diff) <= 1e-9 * z * z ? "siku-siku" : diff > 0 ? "lancip" : "tumpul";
  const s = (a + b + k) / 2;
  const area = Math.sqrt(s * (s - a) * (s - b) * (s - k));
  const perimeter = a + b + k;
  const clampCos = (v) => Math.min(1, Math.max(-1, v));
  const angA = deg(Math.acos(clampCos((b * b + k * k - a * a) / (2 * b * k))));
  const angB = deg(Math.acos(clampCos((a * a + k * k - b * b) / (2 * a * k))));
  const angC = 180 - angA - angB;
  const px = (a * a + k * k - b * b) / (2 * a), py = Math.sqrt(k * k - px * px);
  const results = [
    { label: "Jenis segitiga", value: kind },
    { label: "Perbandingan kuadrat sisi terpanjang dengan jumlah kuadrat dua sisi lainnya", value: `${fmt(z * z, 6)} dibanding ${fmt(x * x + y * y, 6)}` },
    { label: "Luas", value: c.A(area), text: c.A(area) },
    { label: "Keliling", value: c.L(perimeter), text: c.L(perimeter) },
    { label: "Sudut (A, B, C dalam derajat)", value: `${fmt(angA, 4)}°، ${fmt(angB, 4)}°، ${fmt(angC, 4)}°` }
  ];
  if ([a, b, k].every(isInt)) {
    const isTriple = diff === 0 && [a, b, k].every((v) => Math.round(v) === v);
    results.push({ label: "Tripel Pythagoras", value: isTriple ? tripleLabel(x, y, z) : "Tidak" });
  }
  return {
    results,
    steps: [
      { text: "Perbandingan kuadrat sisi:", tex: `${c.T(z)}^2 ${diff === 0 ? "=" : diff > 0 ? "<" : ">"} ${c.T(x)}^2+${c.T(y)}^2` },
      { text: "Setengah keliling dan luas Heron:", tex: `A = \\sqrt{s(s-a)(s-b)(s-c)} = ${c.T(area)}\\ ${c.U}^2` }
    ],
    series: [{ name: "Segitiga", points: [[0, 0], [a, 0], [px, py], [0, 0]], line: true }],
    copy: `Segitiga ${kind}, luas = ${c.A(area)}, keliling = ${c.L(perimeter)}`
  };
}

export function solve(input) {
  const unit = str(input, "unit", "Satuan panjang", { default: "cm" });
  const mode = choice(input, "mode", "Mode", ["solve", "check"], "solve");
  const c = ctxOf(unit);
  const r = mode === "check" ? checkSides(input, c) : solveRight(input, c);
  const blocks = [{ type: "plot", title: "Gambar segitiga", xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series: r.series }];
  return { results: r.results, steps: r.steps, blocks, copy: r.copy };
}
