import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, deg, toFraction, tex as ntex } from "../core/format.js";

const blank = { mode: "", unit: "cm", x1: "", y1: "", x2: "", y2: "", x3: "", y3: "", a1: "", b1: "", c1: "", a2: "", b2: "", c2: "" };

const minus = (s) => s.replace(/-/g, "−");

function gcd(x, y) {
  return y === 0 ? Math.abs(x) : gcd(y, x % y);
}

function frac(x) {
  const f = toFraction(x, 1000);
  if (!f) return minus(fmt(x, 6));
  return minus(f[1] === 1 ? String(f[0]) : `${f[0]}/${f[1]}`);
}

function isFractional(x) {
  const f = toFraction(x, 1000);
  return f !== null && f[1] !== 1;
}

function slopeForm(m, b) {
  let body = "";
  if (m !== 0) {
    const mt = isFractional(m) ? `(${frac(m)})` : frac(m);
    body = (m === 1 ? "" : m === -1 ? "−" : mt) + "x";
  }
  if (b !== 0) {
    const bt = minus(fmt(Math.abs(b), 6));
    body = body === "" ? (b < 0 ? "−" : "") + bt : body + (b < 0 ? " − " : " + ") + bt;
  }
  return `y = ${body === "" ? "0" : body}`;
}

function generalForm(A, B, C) {
  const terms = [[A, "x"], [B, "y"], [C, ""]].filter(([k]) => k !== 0);
  let s = "";
  terms.forEach(([k, v], i) => {
    const mag = Math.abs(k);
    const coef = Number.isInteger(mag) ? String(mag) : minus(fmt(mag, 6));
    const term = v === "" ? coef : (mag === 1 ? "" : coef) + v;
    const sign = i === 0 ? (k < 0 ? "−" : "") : (k < 0 ? " − " : " + ");
    s += sign + term;
  });
  return `${s === "" ? "0" : s} = 0`;
}

function normalizeInts(A, B, C) {
  const g = gcd(gcd(Math.abs(A), Math.abs(B)), Math.abs(C));
  let a = A / g, b = B / g, c = C / g;
  if (a < 0 || (a === 0 && b < 0)) { a = -a; b = -b; c = -c; }
  return [a, b, c];
}

function near(v, scale) {
  return Math.abs(v) <= 1e-9 * (1 + scale);
}

export const meta = {
  description: "Hitung jarak, titik tengah, gradien, sudut kemiringan, dan persamaan garis antara dua titik pada bidang, serta apakah titik ketiga terletak padanya, atau cari titik potong dua garis dan sudut di antaranya dengan deteksi sejajar dan tegak lurus.",
  keywords: ["geometri analitik", "jarak dua titik", "titik tengah", "gradien", "persamaan garis", "titik potong dua garis", "sejajar", "tegak lurus", "coordinate geometry", "slope", "line equation"],
  formulas: [
    { label: "Jarak dan titik tengah", tex: "d = \\sqrt{(x_2-x_1)^2+(y_2-y_1)^2},\\qquad M = \\left(\\tfrac{x_1+x_2}{2},\\tfrac{y_1+y_2}{2}\\right)" },
    { label: "Gradien dan persamaan garis", tex: "m = \\frac{y_2-y_1}{x_2-x_1},\\qquad y = mx+b,\\qquad Ax+By+C=0" },
    { label: "titik potong dua garis", tex: "x = \\frac{c_1b_2-c_2b_1}{a_1b_2-a_2b_1},\\qquad y = \\frac{a_1c_2-a_2c_1}{a_1b_2-a_2b_1}" }
  ],
  inputs: [
    { id: "mode", label: "Mode", type: "select", default: "points", options: [["points", "Dua titik pada bidang"], ["lines", "Dua garis dengan persamaan umumnya"]] },
    { id: "unit", label: "Satuan panjang", type: "text", default: "cm" },
    { id: "x1", label: "Titik pertama x1", type: "number", default: "0", when: { mode: ["points"] } },
    { id: "y1", label: "Titik pertama y1", type: "number", default: "0", when: { mode: ["points"] } },
    { id: "x2", label: "Titik kedua x2", type: "number", default: "4", when: { mode: ["points"] } },
    { id: "y2", label: "Titik kedua y2", type: "number", default: "6", when: { mode: ["points"] } },
    { id: "x3", label: "Titik ketiga x3 (opsional)", type: "number", when: { mode: ["points"] }, help: "Masukkan koordinat titik ketiga bersama-sama untuk mengetahui jaraknya dari garis dan apakah titik itu terletak padanya." },
    { id: "y3", label: "Titik ketiga y3 (opsional)", type: "number", when: { mode: ["points"] } },
    { id: "a1", label: "Koefisien a1 pada persamaan pertama", type: "number", default: "2", when: { mode: ["lines"] }, help: "Persamaan dalam bentuk a x + b y = c." },
    { id: "b1", label: "Koefisien b1", type: "number", default: "1", when: { mode: ["lines"] } },
    { id: "c1", label: "Ruas kanan c1", type: "number", default: "5", when: { mode: ["lines"] } },
    { id: "a2", label: "Koefisien a2 pada persamaan kedua", type: "number", default: "1", when: { mode: ["lines"] } },
    { id: "b2", label: "Koefisien b2", type: "number", default: "-1", when: { mode: ["lines"] } },
    { id: "c2", label: "Ruas kanan c2", type: "number", default: "1", when: { mode: ["lines"] } }
  ],
  example: { values: { ...blank, mode: "points", unit: "cm", x1: "0", y1: "0", x2: "4", y2: "6", x3: "2", y3: "3" }, expect: ["7.2111 cm", "3x − 2y = 0"], note: "Contoh: garis melalui (0,0) dan (4,6) adalah 3x − 2y = 0, dan titik (2,3) terletak padanya." },
  invalid: { values: { ...blank, mode: "points", unit: "cm", x1: "1", y1: "1", x2: "1", y2: "1" } },
  related: ["circle-geometry", "pythagoras", "plane-shapes", "solids", "triangle-solver", "polygon-area", "trigonometry", "unit-converter"]
};

function ctxOf(unit) {
  return {
    L: (x) => `${fmt(x, 6)} ${unit}`,
    P: (x, y) => `(${minus(fmt(x, 6))}, ${minus(fmt(y, 6))}) ${unit}`,
    T: (x) => ntex(x, 6),
    U: `\\text{${unit}}`
  };
}

function linePoints(a, b, c, L, center) {
  const n2 = a * a + b * b;
  const px = (a * c) / n2, py = (b * c) / n2;
  const len = Math.hypot(a, b);
  const dx = -b / len, dy = a / len;
  const s = L * (1 + Math.hypot(px, py) + (center ? Math.hypot(center[0], center[1]) : 0));
  return [[px - s * dx, py - s * dy], [px + s * dx, py + s * dy]];
}

function pointsMode(input, c) {
  const x1 = num(input, "x1", "x1"), y1 = num(input, "y1", "y1");
  const x2 = num(input, "x2", "x2"), y2 = num(input, "y2", "y2");
  const x3 = num(input, "x3", "x3", { optional: true });
  const y3 = num(input, "y3", "y3", { optional: true });
  if ((x3 === null) !== (y3 === null)) fail("Masukkan koordinat titik ketiga bersama-sama, atau biarkan kosong.", x3 === null ? "x3" : "y3");
  const dx = x2 - x1, dy = y2 - y1;
  const d = Math.hypot(dx, dy);
  if (d === 0) fail("Kedua titik berimpit, sehingga tidak ada garis yang ditentukan di antaranya.", "x2");
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const vertical = dx === 0;
  const m = vertical ? null : dy / dx;
  const b = vertical ? null : y1 - m * x1;
  let ang = deg(Math.atan2(dy, dx));
  if (ang < 0) ang += 180;
  if (ang >= 180) ang -= 180;
  const A0 = dy, B0 = -dx, C0 = dx * y1 - dy * x1;
  const integers = [x1, y1, x2, y2].every((v) => Number.isInteger(v));
  const [A, B, C] = integers ? normalizeInts(A0, B0, C0) : [A0, B0, C0];
  const slopeText = vertical ? "Tidak terdefinisi" : isFractional(m) ? `${frac(m)} ≈ ${minus(fmt(m, 6))}` : minus(fmt(m, 6));
  const lineEq = vertical ? `x = ${minus(fmt(x1, 6))}` : slopeForm(m, b);
  const results = [
    { label: "Jarak antara dua titik", value: c.L(d), text: c.L(d) },
    { label: "titik tengah", value: c.P(mx, my), text: c.P(mx, my) },
    { label: "Gradien m", value: slopeText },
    { label: "Sudut kemiringan (dalam derajat)", value: `${fmt(ang, 6)}°` },
    { label: "Persamaan dengan gradien dan perpotongan", value: lineEq },
    { label: "Bentuk umum Ax + By + C = 0", value: generalForm(A, B, C) }
  ];
  const steps = [
    { text: "Jarak:", tex: `d = \\sqrt{(${ntex(x2 - x1)})^2+(${ntex(y2 - y1)})^2} = ${c.T(d)}\\ ${c.U}` },
    { text: "Titik tengah:", tex: `M = \\left(\\frac{x_1+x_2}{2},\\frac{y_1+y_2}{2}\\right) = (${c.T(mx)},\\ ${c.T(my)})` },
    { text: "Gradien:", tex: vertical ? `m \\text{ tidak terdefinisi (garis vertikal)}` : `m = \\frac{y_2-y_1}{x_2-x_1} = ${c.T(m)}` }
  ];
  const series = [{ name: "Garis", points: [[x1 - dx, y1 - dy], [x2 + dx, y2 + dy]], line: true }, { name: "Kedua titik", points: [[x1, y1], [x2, y2]], marker: "o", line: false }];
  if (x3 !== null) {
    const cross = dx * (y3 - y1) - dy * (x3 - x1);
    const dist = Math.abs(cross) / d;
    const collinear = Math.abs(cross) <= 1e-9 * d * (1 + Math.hypot(x3 - x1, y3 - y1));
    results.push({ label: "Jarak titik ketiga dari garis", value: c.L(dist), text: c.L(dist) });
    results.push({ label: "Ketiga titik segaris", value: collinear ? "Ya" : "Tidak" });
    steps.push({ text: "Jarak titik ketiga dari garis:", tex: `\\delta = \\frac{|(x_2-x_1)(y_3-y_1)-(y_2-y_1)(x_3-x_1)|}{d} = ${c.T(dist)}\\ ${c.U}` });
    series.push({ name: "Titik ketiga", points: [[x3, y3]], marker: "x", line: false });
  }
  return {
    results,
    steps,
    series,
    copy: `Jarak = ${c.L(d)}, titik tengah = ${c.P(mx, my)}, gradien = ${slopeText}, persamaan: ${generalForm(A, B, C)}`
  };
}

function linesMode(input, c) {
  const a1 = num(input, "a1", "Koefisien a1"), b1 = num(input, "b1", "Koefisien b1"), c1 = num(input, "c1", "Ruas kanan c1");
  const a2 = num(input, "a2", "Koefisien a2"), b2 = num(input, "b2", "Koefisien b2"), c2 = num(input, "c2", "Ruas kanan c2");
  if (a1 === 0 && b1 === 0) fail("Persamaan pertama bukan garis: a1 atau b1 harus tidak nol.", "a1");
  if (a2 === 0 && b2 === 0) fail("Persamaan kedua bukan garis: a2 atau b2 harus tidak nol.", "a2");
  const n1 = Math.hypot(a1, b1), n2 = Math.hypot(a2, b2);
  const det = a1 * b2 - a2 * b1;
  const dot = a1 * a2 + b1 * b2;
  const angle = deg(Math.acos(Math.min(1, Math.abs(dot) / (n1 * n2))));
  const parallel = near(det, Math.abs(a1 * b2) + Math.abs(a2 * b1));
  const coincident = parallel && near(a1 * c2 - a2 * c1, Math.abs(a1 * c2) + Math.abs(a2 * c1)) && near(b1 * c2 - b2 * c1, Math.abs(b1 * c2) + Math.abs(b2 * c1));
  const perpendicular = near(dot, n1 * n2);
  const yesNo = (v) => (v ? "Ya" : "Tidak");
  const results = [];
  const series = [];
  const steps = [];
  let inter = null;
  if (!parallel) {
    const x = (c1 * b2 - c2 * b1) / det, y = (a1 * c2 - a2 * c1) / det;
    inter = [x, y];
    results.push({ label: "Titik potong", value: c.P(x, y), text: c.P(x, y) });
    steps.push({ text: "Determinan sistem:", tex: `\\Delta = a_1b_2-a_2b_1 = ${c.T(det)}` });
    steps.push({ text: "Penyelesaian sistem dengan aturan Cramer:", tex: `x = \\frac{c_1b_2-c_2b_1}{\\Delta} = ${c.T(x)},\\qquad y = \\frac{a_1c_2-a_2c_1}{\\Delta} = ${c.T(y)}` });
    series.push({ name: "Titik potong", points: [[x, y]], marker: "x", line: false });
  } else {
    results.push({ label: "Titik potong", value: coincident ? "Kedua garis berimpit (semua titik bersama)" : "Tidak ada titik potong (sejajar)" });
    steps.push({ text: "Determinan sistem nol, sehingga kedua garis sejajar atau berimpit.", tex: `\\Delta = ${c.T(det)}` });
  }
  results.push({ label: "Sejajar", value: yesNo(parallel) });
  results.push({ label: "Saling tegak lurus", value: yesNo(perpendicular && !parallel) });
  results.push({ label: "Sudut lancip antara dua garis", value: `${fmt(angle, 6)}°` });
  const L = 3;
  series.unshift({ name: "Garis pertama", points: linePoints(a1, b1, c1, L, inter), line: true });
  series.splice(1, 0, { name: "Garis kedua", points: linePoints(a2, b2, c2, L, inter), line: true });
  return {
    results,
    steps,
    series,
    copy: parallel
      ? (coincident ? "Kedua garis berimpit" : "Kedua garis sejajar dan tidak berpotongan")
      : `Titik potong = ${c.P(inter[0], inter[1])}, sudut lancip = ${fmt(angle, 6)}°${perpendicular ? ", kedua garis saling tegak lurus" : ""}`
  };
}

export function solve(input) {
  const unit = str(input, "unit", "Satuan panjang", { default: "cm" });
  const mode = choice(input, "mode", "Mode", ["points", "lines"], "points");
  const c = ctxOf(unit);
  const r = mode === "lines" ? linesMode(input, c) : pointsMode(input, c);
  const blocks = [{ type: "plot", title: mode === "lines" ? "Kedua garis dan titik potongnya" : "Garis melalui dua titik", xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series: r.series }];
  return { results: r.results, steps: r.steps, blocks, copy: r.copy };
}
