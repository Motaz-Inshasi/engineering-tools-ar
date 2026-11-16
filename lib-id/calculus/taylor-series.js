import { simplify, diff, fromPoly } from "../core/symbolic.js";
import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, niceTex, nice, toFraction } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "Tulis deret Taylor atau Maclaurin untuk fungsi apa pun hingga orde 10: turunan berurutan beserta nilainya di pusat dan koefisiennya, dengan grafik yang membandingkan fungsi dengan polinom hampirannya.",
  keywords: ["Taylor", "Maclaurin", "taylor", "maclaurin", "deret", "hampiran", "polinom Taylor"],
  formulas: [
    { label: "Deret Taylor di sekitar titik a (Maclaurin jika a = 0)", tex: "f(x) \\approx \\sum_{k=0}^{n} \\frac{f^{(k)}(a)}{k!}(x-a)^k" }
  ],
  inputs: [
    { id: "f", label: "Fungsi", type: "expr", placeholder: "e^x" },
    { id: "v", label: "Variabel", type: "text", default: "x" },
    { id: "a", label: "Pusat ekspansi a", type: "number", default: "0", help: "0 menghasilkan deret Maclaurin." },
    { id: "n", label: "Orde n", type: "number", default: "5", help: "dari 1 sampai 10" },
    { id: "x0", label: "Titik uji hampiran (opsional)", type: "number" }
  ],
  example: { values: { f: "e^x", v: "x", a: "0", n: "4", x0: "0.5" }, expect: ["x^4/24"], note: "Contoh: deret Maclaurin untuk $e^x$ hingga orde 4." },
  invalid: { values: { f: "cos(x)", n: "50" } },
  related: ["derivative", "limit", "function-plotter"]
};

function fact(k) {
  let r = 1;
  for (let i = 2; i <= k; i++) r *= i;
  return r;
}

function shiftedTex(coeffs, v, a) {
  const base = a === 0 ? v : `\\left(${v} ${a < 0 ? "+" : "-"} ${niceTex(Math.abs(a))}\\right)`;
  let s = "";
  coeffs.forEach((c, k) => {
    if (Math.abs(c) < 1e-14) return;
    const sign = c < 0 ? (s ? " - " : "-") : s ? " + " : "";
    const ac = Math.abs(c);
    const fr = toFraction(ac, 100000, 1e-10);
    let coef;
    if (k === 0) coef = niceTex(ac, 8);
    else if (fr && fr[0] === 1 && fr[1] !== 1) coef = `\\frac{1}{${fr[1]}}`;
    else coef = Math.abs(ac - 1) < 1e-12 ? "" : fr && fr[1] <= 100000 ? (fr[1] === 1 ? String(fr[0]) : `\\frac{${fr[0]}}{${fr[1]}}`) : ntex(ac, 8);
    const pw = k === 0 ? "" : k === 1 ? base : `${base}^{${k}}`;
    s += `${sign}${coef}${coef && pw && !coef.startsWith("\\frac") ? " " : ""}${pw}`;
  });
  return s || "0";
}

function shiftedText(coeffs, v, a) {
  const base = a === 0 ? v : `(${v} ${a < 0 ? "+" : "-"} ${fmt(Math.abs(a))})`;
  const parts = [];
  coeffs.forEach((c, k) => {
    if (Math.abs(c) < 1e-14) return;
    const ac = Math.abs(c);
    const fr = toFraction(ac, 100000, 1e-10);
    let t;
    if (k === 0) t = nice(ac, 8);
    else {
      const pw = k === 1 ? base : `${base}^${k}`;
      if (fr && fr[0] === 1 && fr[1] !== 1) t = `${pw}/${fr[1]}`;
      else if (Math.abs(ac - 1) < 1e-12) t = pw;
      else t = `${fr ? (fr[1] === 1 ? fr[0] : `${fr[0]}/${fr[1]}`) : fmt(ac, 8)}*${pw}`;
    }
    parts.push(`${c < 0 ? "- " : parts.length ? "+ " : ""}${t}`);
  });
  return parts.join(" ") || "0";
}

export function taylorCoefficients(f, v, a, n) {
  const derivs = [f];
  const values = [];
  let cur = f;
  for (let k = 0; k <= n; k++) {
    if (k > 0) {
      cur = diff(cur, v);
      if (toText(cur).length > 4000) fail("Turunannya menjadi sangat panjang untuk orde ini. Coba orde yang lebih kecil.", "n");
      derivs.push(cur);
    }
    const val = f1(cur, v)(a);
    if (!isFinite(val)) fail(`Fungsi atau turunannya ke-${k} tidak terdefinisi di ${v} = ${fmt(a)}, sehingga deret Taylor di sekitar titik ini tidak ada.`, "a");
    values.push(Math.abs(val) < 1e-13 ? 0 : val);
  }
  return { derivs, values, coeffs: values.map((x, k) => x / fact(k)) };
}

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const a = num(input, "a", "Pusat ekspansi");
  const n = num(input, "n", "Orde", { integer: true, min: 1, max: 10 });
  const x0 = num(input, "x0", "Titik uji", { optional: true });
  const { derivs, values, coeffs } = taylorCoefficients(f, v, a, n);
  const rows = derivs.map((d, k) => [String(k), { tex: k === 0 ? `f(${v}) = ${toTex(d)}` : `f^{(${k})}(${v}) = ${toTex(d)}` }, { tex: niceTex(values[k], 8) }, { tex: niceTex(coeffs[k], 8) }]);
  const steps = [
    `Kita hitung turunan berurutan hingga orde ${n}, lalu substitusi ${v} = ${fmt(a)} ke masing-masing (lihat tabel).`,
    { text: "Kita bagi setiap nilai dengan $k!$ untuk memperoleh koefisien, lalu menjumlahkan suku-sukunya:", tex: `${a === 0 ? "\\text{Maclaurin}" : "\\text{Taylor}"}:\\; f(${v}) \\approx ${shiftedTex(coeffs, v, a)}` }
  ];
  const P = (x) => coeffs.reduce((s, c, k) => s + c * Math.pow(x - a, k), 0);
  const F = f1(f, v);
  const results = [{ label: `Polinom Taylor orde ${n}`, tex: `P_{${n}}(${v}) = ${shiftedTex(coeffs, v, a)}`, text: shiftedText(coeffs, v, a) }];
  if (x0 !== null) {
    const px = P(x0), fx = F(x0);
    results.push({ label: `Hampiran di ${v} = ${fmt(x0)}`, value: px, sig: 10 });
    if (isFinite(fx)) {
      results.push({ label: "Nilai sebenarnya", value: fx, sig: 10 });
      results.push({ label: "Galat mutlak", value: Math.abs(fx - px), sig: 3 });
      steps.push({ text: `Kita uji hampiran di ${v} = ${fmt(x0)}:`, tex: `P_{${n}}(${ntex(x0)}) = ${ntex(px, 10)},\\quad f(${ntex(x0)}) = ${ntex(fx, 10)}` });
    }
  }
  const span = Math.max(3, Math.abs((x0 ?? a) - a) * 1.5);
  const blocks = [
    { type: "table", caption: "Turunan dan nilainya di pusat", head: ["k", "Turunan", `Nilai di ${fmt(a)}`, "Koefisien $f^{(k)}(a)/k!$"], rows },
    { type: "plot", title: "Fungsi asli dibandingkan dengan polinom Taylor", xLabel: v, yLabel: "y", series: [{ name: "f", points: sampleFunction(F, a - span, a + span, 400) }, { name: `P${n}`, points: sampleFunction(P, a - span, a + span, 400), dashed: true }] }
  ];
  return { results, steps, blocks, copy: `P${n}(${v}) = ${shiftedText(coeffs, v, a)}` };
}
