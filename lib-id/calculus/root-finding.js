import { simplify, diff } from "../core/symbolic.js";
import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { bisection, newton, secant, sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "Cari akar persamaan f(x) = 0 secara numerik dengan metode bagi dua, Newton-Raphson, atau secant, disertai tabel lengkap setiap iterasi dan grafik yang menunjukkan lokasi akar.",
  keywords: ["akar", "penyelesaian persamaan", "Newton", "Newton-Raphson", "bagi dua", "bisection", "newton", "secant", "secant", "metode numerik"],
  formulas: [
    { label: "Newton-Raphson", tex: "x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}" },
    { label: "Secant", tex: "x_{n+1} = x_n - f(x_n)\\frac{x_n - x_{n-1}}{f(x_n) - f(x_{n-1})}" },
    { label: "Bagi dua", tex: "m = \\frac{a+b}{2},\\quad f(a)\\,f(b) < 0" }
  ],
  inputs: [
    { id: "f", label: "Fungsi f(x)", type: "expr", placeholder: "x^3 - 2x - 5" },
    { id: "v", label: "Variabel", type: "text", default: "x" },
    { id: "method", label: "Metode", type: "select", default: "newton", options: [["newton", "Newton-Raphson"], ["bisection", "Bagi dua"], ["secant", "Secant"]] },
    { id: "x0", label: "Nilai awal x₀", type: "number", default: "2", when: { method: ["newton", "secant"] } },
    { id: "x1", label: "Nilai kedua x₁", type: "number", default: "3", when: { method: ["secant"] } },
    { id: "a", label: "Batas awal a", type: "number", default: "2", when: { method: ["bisection"] } },
    { id: "b", label: "Batas akhir b", type: "number", default: "3", when: { method: ["bisection"] } },
    { id: "tol", label: "Ketelitian yang diinginkan", type: "number", default: "1e-10" }
  ],
  example: { values: { f: "x^3 - 2x - 5", v: "x", method: "newton", x0: "2", tol: "1e-10" }, expect: ["2.0945514815"], note: "Contoh terkenal Newton: akar $x^3 - 2x - 5 = 0$ dekat 2." },
  invalid: { values: { f: "x^2 + 1", method: "bisection", a: "0", b: "1" } },
  related: ["polynomial-roots", "quadratic", "function-plotter", "derivative"]
};

const REASONS = {
  sign: "Tanda f(a) dan f(b) sama, sehingga metode bagi dua tidak menjamin adanya akar. Pilih interval tempat tanda fungsinya berubah.",
  undefined: "Fungsi tidak terdefinisi di salah satu titik perhitungan. Coba nilai awal lain.",
  zeroDerivative: "Turunan bernilai nol di salah satu titik sehingga metode Newton berhenti. Coba nilai awal lain.",
  diverged: "Metode menyimpang dan tidak konvergen. Coba nilai awal yang lebih dekat dengan akar.",
  maxIter: "Metode tidak konvergen dalam 100 iterasi. Coba nilai awal lain atau metode bagi dua.",
  flat: "Nilai fungsi sama pada dua titik berurutan sehingga metode secant berhenti."
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const method = choice(input, "method", "Metode", ["newton", "bisection", "secant"], "newton");
  const tol = num(input, "tol", "Ketelitian", { positive: true, default: 1e-10 });
  const F = f1(f, v);
  const steps = [{ text: "Persamaan yang akan diselesaikan:", tex: `${toTex(f)} = 0` }];
  let r, rows, head, start, field;
  if (method === "newton") {
    const x0 = num(input, "x0", "Nilai awal");
    const d = diff(f, v);
    steps.push({ text: "Kita hitung turunan secara simbolik:", tex: `f'(${v}) = ${toTex(d)}` });
    steps.push(`Kita mulai dari ${v}₀ = ${fmt(x0)} dan mengulang rumus hingga perubahannya lebih kecil dari ${fmt(tol)}.`);
    r = newton(F, f1(d, v), x0, { tol });
    head = ["n", "xₙ", "f(xₙ)", "f'(xₙ)", "xₙ₊₁"];
    rows = r.rows.map((q) => [q.i, fmt(q.x, 12), fmt(q.fx, 4), fmt(q.dfx, 6), fmt(q.next, 12)]);
    start = [x0]; field = "x0";
  } else if (method === "secant") {
    const x0 = num(input, "x0", "Nilai awal"), x1 = num(input, "x1", "Nilai kedua");
    if (x0 === x1) fail("Kedua nilai awal harus berbeda.", "x1");
    steps.push(`Kita mulai dari ${v}₀ = ${fmt(x0)} dan ${v}₁ = ${fmt(x1)} lalu mengulang rumus secant.`);
    r = secant(F, x0, x1, { tol });
    head = ["n", "xₙ₋₁", "xₙ", "f(xₙ)", "xₙ₊₁"];
    rows = r.rows.map((q) => [q.i, fmt(q.x0, 12), fmt(q.x1, 12), fmt(q.fx1, 4), fmt(q.next, 12)]);
    start = [x0, x1]; field = "x0";
  } else {
    const a = num(input, "a", "Batas awal"), b = num(input, "b", "Batas akhir");
    if (a >= b) fail("Batas awal harus lebih kecil dari batas akhir.", "b");
    const fa = F(a), fb = F(b);
    steps.push(`Kita periksa perubahan tanda: f(${fmt(a)}) = ${fmt(fa)} dan f(${fmt(b)}) = ${fmt(fb)}.`);
    r = bisection(F, a, b, { tol });
    head = ["n", "a", "b", "m", "f(m)"];
    rows = r.rows.map((q) => [q.i, fmt(q.a, 12), fmt(q.b, 12), fmt(q.x, 12), fmt(q.fx, 4)]);
    if (rows.length > 60) rows.splice(30, rows.length - 60, ["…", "…", "…", "…", "…"]);
    start = [a, b]; field = r.reason === "sign" ? "b" : "a";
  }
  if (!r.ok) fail(REASONS[r.reason] || "Akar tidak dapat ditemukan.", field);
  const root = r.root;
  const fr = F(root);
  steps.push(`Metode konvergen setelah ${r.iterations} iterasi ke ${v} ≈ ${fmt(root, 12)}.`);
  steps.push({ text: "Untuk memeriksa, kita substitusi akar ke dalam fungsi:", tex: `f(${ntex(root, 12)}) = ${ntex(fr, 3)}` });
  const lo = Math.min(root, ...start), hi = Math.max(root, ...start);
  const pad = Math.max(1, (hi - lo) * 0.6);
  return {
    results: [
      { label: "Akar", value: root, sig: 12 },
      { label: "Nilai fungsi di akar", value: fr, sig: 3 },
      { label: "Jumlah iterasi", value: r.iterations }
    ],
    blocks: [
      { type: "table", caption: "Tabel iterasi", head, rows: rows.map((rw) => rw.map(String)) },
      { type: "plot", title: "Fungsi dan lokasi akar", xLabel: v, yLabel: `f(${v})`, series: [{ name: `f(${v})`, points: sampleFunction(F, lo - pad, hi + pad, 400) }, { name: "Akar", points: [[root, 0]], marker: "o" }] }
    ],
    steps,
    copy: `Akar ${v} ≈ ${fmt(root, 12)} (f = ${fmt(fr, 3)}, ${r.iterations} iterasi)`
  };
}
