import { integrate, simplify } from "../core/symbolic.js";
import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, niceTex, nice } from "../core/format.js";
import { integrateNumeric, sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "Hitung integral tak tentu dan tentu dari fungsi apa pun: penyelesaian simbolik dengan langkah-langkah bila dapat dipercaya, dan nilai numerik yang tepat serta diberi label jelas bila penyelesaian simbolik tidak tersedia.",
  intro: "Integral simbolik mendukung pangkat, fungsi trigonometri, eksponen, logaritma, substitusi, integrasi parsial, dan pecahan parsial. Setiap hasil simbolik diperiksa secara numerik sebelum ditampilkan.",
  keywords: ["integral", "integral", "integral tentu", "integral tak tentu", "luas di bawah kurva", "integrasi parsial", "substitusi"],
  formulas: [
    { label: "Integral tak tentu dan tentu", tex: "\\int f(x)\\,dx = F(x) + C, \\qquad \\int_a^b f(x)\\,dx = F(b) - F(a)" },
    { label: "Aturan pangkat dan integrasi parsial", tex: "\\int x^n dx = \\frac{x^{n+1}}{n+1} + C,\\qquad \\int u\\,dv = uv - \\int v\\,du" }
  ],
  inputs: [
    { id: "f", label: "Fungsi yang akan diintegralkan", type: "expr", placeholder: "x e^x", help: "contoh: x^2 sin(x), 1/(x^2+1), e^(2x), ln(x)" },
    { id: "v", label: "Variabel", type: "text", default: "x" },
    { id: "mode", label: "Jenis integral", type: "select", default: "indefinite", options: [["indefinite", "Tak tentu"], ["definite", "Tentu"]] },
    { id: "a", label: "Batas bawah a", type: "number", when: { mode: ["definite"] }, help: "Dapat ditulis inf atau -inf" },
    { id: "b", label: "Batas atas b", type: "number", when: { mode: ["definite"] } }
  ],
  example: { values: { f: "x e^x", v: "x", mode: "definite", a: "0", b: "1" }, expect: ["= 1"], note: "Contoh: $\\int_0^1 x e^x\\,dx$ dengan integrasi parsial, hasilnya 1." },
  invalid: { values: { f: "sin(x", mode: "indefinite" } },
  related: ["derivative", "function-plotter", "laplace", "partial-fractions"]
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const mode = choice(input, "mode", "Jenis integral", ["indefinite", "definite"], "indefinite");
  const steps = [{ text: "Fungsi setelah disederhanakan:", tex: `f(${v}) = ${toTex(f)}` }];
  const blocks = [];
  const sym = integrate(f, v);
  if (sym) {
    for (const s of sym.steps) steps.push({ text: s.rule, tex: s.tex });
    steps.push(`Kami memeriksa kebenaran hasil dengan menurunkannya secara numerik dan membandingkannya dengan fungsi asal pada beberapa titik.`);
  }
  if (mode === "indefinite") {
    if (!sym) {
      blocks.push({ type: "note", tone: "warn", text: "Kami tidak menemukan integral simbolik yang dapat dipercaya untuk fungsi ini dengan aturan yang didukung. Mungkin fungsi ini tidak memiliki integral dalam fungsi elementer (seperti $e^{x^2}$). Coba integral tentu untuk mendapatkan nilai numerik." });
      return { results: [{ label: "Integral tak tentu", value: "tidak tersedia secara simbolik" }], steps, blocks, copy: "Integral tak tentu tidak tersedia secara simbolik" };
    }
    return {
      results: [{ label: "Integral tak tentu", tex: `\\int ${toTex(f)}\\,d${v} = ${toTex(sym.result)} + C`, text: `${toText(sym.result)} + C` }],
      steps, blocks, copy: `∫ ${toText(f)} d${v} = ${toText(sym.result)} + C`
    };
  }
  const a = num(input, "a", "Batas bawah", { allowInfinity: true });
  const b = num(input, "b", "Batas atas", { allowInfinity: true });
  if (a === b) fail("Kedua batas sama, sehingga integralnya nol. Masukkan dua batas yang berbeda.", "b");
  const F = f1(f, v);
  const numeric = integrateNumeric(F, a, b, { tol: 1e-11 });
  let exact = null;
  if (sym && isFinite(a) && isFinite(b)) {
    const G = f1(sym.result, v);
    const Fa = G(a), Fb = G(b);
    const pts = sampleFunction(F, Math.min(a, b), Math.max(a, b), 401);
    const continuous = pts.every(([, y]) => y !== null);
    const val = Fb - Fa;
    if (continuous && isFinite(val) && numeric.ok && Math.abs(val - numeric.value) <= 1e-6 * Math.max(1, Math.abs(val))) {
      exact = val;
      steps.push({ text: `Kita terapkan teorema dasar kalkulus: $F(b) - F(a)$`, tex: `F(${ntex(b)}) - F(${ntex(a)}) = ${ntex(Fb, 10)} - (${ntex(Fa, 10)}) = ${ntex(val, 10)}` });
    } else if (!continuous) {
      blocks.push({ type: "note", tone: "warn", text: "Fungsi tidak terdefinisi di suatu titik dalam interval integrasi, sehingga $F(b)-F(a)$ tidak dapat langsung diterapkan." });
    }
  }
  const results = [];
  if (exact !== null) {
    const shown = Math.abs(exact - Math.round(exact)) < 1e-10 ? Math.round(exact) : exact;
    results.push({ label: "Nilai integral tentu", tex: `\\int_{${ntex(a)}}^{${ntex(b)}} ${toTex(f)}\\,d${v} = ${niceTex(shown, 10)}`, text: `= ${nice(shown, 10)}` });
    results.push({ label: "Nilai desimal", value: exact, sig: 12 });
  } else {
    if (!numeric.ok || !isFinite(numeric.value)) {
      blocks.push({ type: "note", tone: "warn", text: "Integral tidak konvergen atau fungsi tidak terbatas pada interval, sehingga nilai yang dapat dipercaya tidak dapat diberikan." });
      return { results: [{ label: "Nilai integral tentu", value: "tidak konvergen atau tidak terdefinisi" }], steps, blocks, copy: "integral tidak konvergen" };
    }
    results.push({ label: "Nilai integral tentu (perkiraan numerik)", value: numeric.value, sig: 10, text: `≈ ${fmt(numeric.value, 10)}` });
    results.push({ label: "Estimasi galat numerik", value: numeric.error, sig: 2 });
    steps.push(`Kami menghitung nilainya secara numerik dengan metode adaptif Gauss-Kronrod (15 titik) dengan membagi interval menjadi ${numeric.intervals} bagian.`);
    if (!isFinite(a) || !isFinite(b)) steps.push("Untuk batas tak hingga, kami menggunakan substitusi variabel yang membuat domain terbatas sebelum integrasi numerik.");
    blocks.push({ type: "note", text: "Ini adalah nilai numerik perkiraan, bukan hasil simbolik." });
  }
  if (isFinite(a) && isFinite(b)) {
    const lo = Math.min(a, b), hi = Math.max(a, b), pad = (hi - lo) * 0.25;
    blocks.push({ type: "plot", title: `Grafik fungsi dengan batas integral`, xLabel: v, yLabel: `f(${v})`, series: [{ name: `f(${v})`, points: sampleFunction(F, lo - pad, hi + pad, 400) }], vlines: [{ x: lo }, { x: hi }] });
  }
  const copyVal = exact !== null ? nice(exact, 10) : `≈ ${fmt(numeric.value, 10)}`;
  return { results, steps, blocks, copy: `∫ dari ${fmt(a)} sampai ${fmt(b)} untuk ${toText(f)} d${v} = ${copyVal}` };
}
