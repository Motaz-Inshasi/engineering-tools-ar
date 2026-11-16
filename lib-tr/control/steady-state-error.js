import { readTF, tfTex, polesZeros } from "../signals/common.js";
import { numx as num } from "../core/numexpr.js";
import { fail } from "../core/validate.js";
import { padd, peval, roots, trim } from "../core/polynomial.js";
import { cabs } from "../core/complex.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Tek geri beslemeli bir sistemin kararlı hal hatasını hesaplayın: sistem tipi, hata sabitleri Kp, Kv, Ka ve basamak girişi, eğim ve parabol için hata; önce kapalı çevrimin kararlılığını doğrulayarak.",
  keywords: ["kararlı hal hatası", "steady state error", "Sistem türü", "Hata sabiti", "Kp", "Kv", "Ka", "geri besleme"],
  formulas: [
    { label: "Hata sabitleri", tex: "K_p = \\lim_{s\\to0}G(s),\\quad K_v = \\lim_{s\\to0}sG(s),\\quad K_a = \\lim_{s\\to0}s^2G(s)" },
    { label: "A genlikli giriş için hata", tex: "e_{step} = \\frac{A}{1+K_p},\\quad e_{ramp} = \\frac{A}{K_v},\\quad e_{parabola} = \\frac{A}{K_a}" }
  ],
  inputs: [
    { id: "G", label: "Açık çevrim transfer fonksiyonu G(s)", type: "expr", default: "10(s + 2)/(s(s + 1)(s + 5))", help: "Tek geri beslemede: T(s) = G/(1+G)." },
    { id: "A", label: "Giriş genliği A", type: "number", default: "1" }
  ],
  example: { values: { G: "10(s + 2)/(s(s + 1)(s + 5))", A: "1" }, expect: ["e_ramp = 0.25"], note: "Örnek: tip 1 sistem; basamak hatası sıfır, eğim hatası $1/K_v$." },
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
  const tf = readTF(input, "G", "Açık çevrim transfer fonksiyonu");
  const A = num(input, "A", "Giriş genliği", { nonZero: true });
  const charPoly = padd(tf.den, tf.num);
  const cl = roots(charPoly);
  const unstable = cl.filter((r) => r.re >= -1e-9);
  const steps = [
    { text: "Açık çevrim transfer fonksiyonu:", tex: `G(s) = ${tfTex(tf)}` },
    { text: "Önce $1 + G(s) = 0$ karakteristik denkleminin köklerini bularak kapalı çevrimin kararlılığını kontrol ederiz:", tex: `D(s) + N(s) = 0` }
  ];
  if (unstable.length) {
    fail(`Kapalı çevrim kararsız (${unstable.length} kök sanal eksende veya sağında), bu nedenle kararlı hal hatasının bir anlamı yok.`, "G");
  }
  steps.push(`Kapalı çevrimin tüm kökleri sol yarı düzlemde (en yavaş olanın Re = ${fmt(Math.max(...cl.map((r) => r.re)), 5)}), sistem kararlı; devam ediyoruz.`);
  const c = errorConstants(tf);
  steps.push(`Orijindeki kutup sayısı = ${c.type}; sistem tip ${c.type}.`);
  const kTex = (v) => (v === Infinity ? "\\infty" : ntex(v, 6));
  steps.push({ text: "Hata sabitleri:", tex: `K_p = ${kTex(c.Kp)},\\quad K_v = ${kTex(c.Kv)},\\quad K_a = ${kTex(c.Ka)}` });
  const e = (k, kind) => (kind === "step" ? A / (1 + k) : k === Infinity ? 0 : k === 0 ? Infinity : A / k);
  const es = e(c.Kp, "step"), er = e(c.Kv, "ramp"), ep = e(c.Ka, "par");
  steps.push({ text: `A = ${fmt(A)} ile formüllere yerine koyarız:`, tex: `e_{step} = ${kTex(es)},\\quad e_{ramp} = ${kTex(er)},\\quad e_{parabola} = ${kTex(ep)}` });
  steps.push("∞ hatası, çıkışın girişi izleyemediğini ve farkın zamanla arttığını gösterir.");
  const show = (v) => (v === Infinity ? "∞" : fmt(v, 6));
  return {
    results: [
      { label: "Sistem türü", value: c.type },
      { label: "Kp", value: show(c.Kp) },
      { label: "Kv", value: show(c.Kv) },
      { label: "Ka", value: show(c.Ka) },
      { label: "Basamak hatası", value: show(es), text: `e_step = ${show(es)}` },
      { label: "Eğim hatası", value: show(er), text: `e_ramp = ${show(er)}` },
      { label: "Parabol hatası", value: show(ep), text: `e_parabola = ${show(ep)}` }
    ],
    steps,
    copy: `type ${c.type}: e_step = ${show(es)}, e_ramp = ${show(er)}, e_parabola = ${show(ep)}`
  };
}

export { cabs };
