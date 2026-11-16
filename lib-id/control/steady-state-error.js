import { readTF, tfTex, polesZeros } from "../signals/common.js";
import { numx as num } from "../core/numexpr.js";
import { fail } from "../core/validate.js";
import { padd, peval, roots, trim } from "../core/polynomial.js";
import { cabs } from "../core/complex.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Hitung galat keadaan tunak sistem umpan balik satuan: tipe sistem, konstanta galat Kp, Kv, dan Ka, serta galat untuk masukan tangga, ramp, dan parabola, setelah terlebih dahulu memeriksa kestabilan loop tertutup.",
  keywords: ["galat keadaan tunak", "steady state error", "Jenis sistem", "konstanta galat", "Kp", "Kv", "Ka", "umpan balik"],
  formulas: [
    { label: "Konstanta galat", tex: "K_p = \\lim_{s\\to0}G(s),\\quad K_v = \\lim_{s\\to0}sG(s),\\quad K_a = \\lim_{s\\to0}s^2G(s)" },
    { label: "Galat untuk masukan dengan amplitudo A", tex: "e_{step} = \\frac{A}{1+K_p},\\quad e_{ramp} = \\frac{A}{K_v},\\quad e_{parabola} = \\frac{A}{K_a}" }
  ],
  inputs: [
    { id: "G", label: "Fungsi transfer loop terbuka G(s)", type: "expr", default: "10(s + 2)/(s(s + 1)(s + 5))", help: "Dengan umpan balik satuan: T(s) = G/(1+G)." },
    { id: "A", label: "Amplitudo masukan A", type: "number", default: "1" }
  ],
  example: { values: { G: "10(s + 2)/(s(s + 1)(s + 5))", A: "1" }, expect: ["e_ramp = 0.25"], note: "Contoh: sistem tipe 1, sehingga galat tangga nol dan galat ramp $1/K_v$." },
  invalid: { values: { G: "1/(s - 1)", A: "1" } },
  related: ["bode-plot", "routh-hurwitz", "transfer-function", "step-response"]
};

export function errorConstants(tf) {
  let den = trim(tf.den), N = 0;
  while (den.length > 1 && Math.abs(den[0]) < 1e-12 * Math.max(...den.map(Math.abs))) { den = den.slice(1); N++; }
  const g0 = peval(tf.num, 0) / den[0];
  const K = [0, 1, 2].map((k) => (N > k ? Infinity : N === k ? g0 : 0));
  return { type: N, Kp: K[0], Kv: K[1], Ka: K[2], g0 };
}

export function solve(input) {
  const tf = readTF(input, "G", "Fungsi transfer loop terbuka");
  const A = num(input, "A", "Amplitudo masukan", { nonZero: true });
  const charPoly = padd(tf.den, tf.num);
  const cl = roots(charPoly);
  const unstable = cl.filter((r) => r.re >= -1e-9);
  const steps = [
    { text: "Fungsi transfer loop terbuka:", tex: `G(s) = ${tfTex(tf)}` },
    { text: "Pertama kita periksa kestabilan loop tertutup dengan mencari akar persamaan karakteristik $1 + G(s) = 0$:", tex: `D(s) + N(s) = 0` }
  ];
  if (unstable.length) {
    fail(`Loop tertutup tidak stabil (${unstable.length} akar pada atau di kanan sumbu imajiner), sehingga galat keadaan tunak tidak bermakna.`, "G");
  }
  steps.push(`Semua akar loop tertutup berada di setengah bidang kiri (yang paling lambat pada Re = ${fmt(Math.max(...cl.map((r) => r.re)), 5)}), sehingga sistem stabil dan kita lanjutkan.`);
  const c = errorConstants(tf);
  steps.push(`Jumlah kutub di titik asal = ${c.type}, sehingga sistem bertipe ${c.type}.`);
  const kTex = (v) => (v === Infinity ? "\\infty" : ntex(v, 6));
  steps.push({ text: "Konstanta galat:", tex: `K_p = ${kTex(c.Kp)},\\quad K_v = ${kTex(c.Kv)},\\quad K_a = ${kTex(c.Ka)}` });
  const e = (k, kind) => (kind === "step" ? A / (1 + k) : k === Infinity ? 0 : k === 0 ? Infinity : A / k);
  const es = e(c.Kp, "step"), er = e(c.Kv, "ramp"), ep = e(c.Ka, "par");
  steps.push({ text: `Kita substitusikan ke rumus dengan A = ${fmt(A)}:`, tex: `e_{step} = ${kTex(es)},\\quad e_{ramp} = ${kTex(er)},\\quad e_{parabola} = ${kTex(ep)}` });
  steps.push("Galat ∞ berarti keluaran tidak dapat mengikuti masukan dan selisihnya bertambah seiring waktu.");
  const show = (v) => (v === Infinity ? "∞" : fmt(v, 6));
  return {
    results: [
      { label: "Jenis sistem", value: c.type },
      { label: "Kp", value: show(c.Kp) },
      { label: "Kv", value: show(c.Kv) },
      { label: "Ka", value: show(c.Ka) },
      { label: "Galat tangga", value: show(es), text: `e_step = ${show(es)}` },
      { label: "Galat ramp", value: show(er), text: `e_ramp = ${show(er)}` },
      { label: "Galat parabola", value: show(ep), text: `e_parabola = ${show(ep)}` }
    ],
    steps,
    copy: `type ${c.type}: e_step = ${show(es)}, e_ramp = ${show(er)}, e_parabola = ${show(ep)}`
  };
}

export { cabs };
