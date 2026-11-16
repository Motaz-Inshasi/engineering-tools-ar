import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cabs } from "../core/complex.js";
import { zR, zL, zC, zsum, zpar } from "./common.js";
import { logspaceSafe } from "../dc-circuits/common.js";

export const meta = {
  description: "Seri veya paralel RLC devresinin rezonans frekansı, kalite faktörü Q, bant genişliği ve yarı güç frekansları; rezonans çevresindeki tepki eğrisiyle birlikte.",
  keywords: ["rezonans", "resonance", "rezonans frekansı", "kalite faktörü", "quality factor", "Q", "bant genişliği", "bandwidth"],
  formulas: [
    { label: "rezonans frekansı", tex: "f_0 = \\frac{1}{2\\pi\\sqrt{LC}},\\qquad \\omega_0 = \\frac{1}{\\sqrt{LC}}" },
    { label: "Kalite faktörü ve bant genişliği", tex: "Q_s = \\frac{1}{R}\\sqrt{\\frac{L}{C}},\\quad Q_p = R\\sqrt{\\frac{C}{L}},\\quad BW = \\frac{f_0}{Q}" }
  ],
  inputs: [
    { id: "conn", label: "Bağlantı", type: "select", default: "series", options: [["series", "Seri"], ["parallel", "Paralel"]] },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10" },
    { id: "L", label: "L", unit: "H", type: "number", default: "1m" },
    { id: "C", label: "C", unit: "F", type: "number", default: "100n" }
  ],
  example: { values: { conn: "series", R: "10", L: "1m", C: "100n" }, expect: ["f0 = 15.92 kHz", "Q = 10"], note: "Örnek: 10 Ω, 1 mH ve 100 nF değerlerinde seri devre." },
  invalid: { values: { conn: "series", R: "10", L: "-1m", C: "100n" } },
  related: ["rlc-circuit", "passive-filter", "impedance"]
};

export function solve(input) {
  const conn = choice(input, "conn", "Bağlantı", ["series", "parallel"], "series");
  const R = num(input, "R", "R", { positive: true }), L = num(input, "L", "L", { positive: true }), Cap = num(input, "C", "C", { positive: true });
  const w0 = 1 / Math.sqrt(L * Cap), f0 = w0 / (2 * Math.PI);
  const Q = conn === "series" ? Math.sqrt(L / Cap) / R : R * Math.sqrt(Cap / L);
  const a = conn === "series" ? R / (2 * L) : 1 / (2 * R * Cap);
  const w1 = -a + Math.sqrt(a * a + w0 * w0), w2 = a + Math.sqrt(a * a + w0 * w0);
  const f1 = w1 / (2 * Math.PI), f2 = w2 / (2 * Math.PI), BW = f2 - f1;
  const steps = [
    { text: "Rezonansta iki reaktans birbirine eşit olur ve birbirini götürür:", tex: `\\omega_0 L = \\frac{1}{\\omega_0 C} \\Rightarrow f_0 = \\frac{1}{2\\pi\\sqrt{${ntex(L)} \\times ${ntex(Cap)}}} = ${ntex(f0, 6)}\\ \\text{Hz}` },
    { text: "Kalite faktörü:", tex: conn === "series" ? `Q = \\frac{1}{R}\\sqrt{\\frac{L}{C}} = \\frac{1}{${ntex(R)}}\\sqrt{\\frac{${ntex(L)}}{${ntex(Cap)}}} = ${ntex(Q, 6)}` : `Q = R\\sqrt{\\frac{C}{L}} = ${ntex(R)}\\sqrt{\\frac{${ntex(Cap)}}{${ntex(L)}}} = ${ntex(Q, 6)}` },
    { text: "Yarı güç frekansları (kesin çözüm, yüksek Q yaklaşımı değil):", tex: `\\omega_{1,2} = \\mp\\alpha + \\sqrt{\\alpha^2 + \\omega_0^2},\\; \\alpha = ${ntex(a, 6)} \\Rightarrow f_1 = ${ntex(f1, 6)},\\; f_2 = ${ntex(f2, 6)}\\ \\text{Hz}` },
    { text: "Bant genişliği:", tex: `BW = f_2 - f_1 = ${ntex(BW, 6)}\\ \\text{Hz} = \\frac{f_0}{Q}` },
    conn === "series" ? `Rezonansta empedans en küçük değerine iner ve R'ye eşit olur; akım en büyük değerine ulaşır. Bobin ve kondansatör gerilimi, kaynak geriliminin Q katına eşit olur.` : "Paralel devrede rezonansta empedans en büyük değerine ulaşır ve R'ye eşit olur; toplam akım en küçük değerine iner, L ile C arasında ise akım Q kat büyüklükte döner."
  ];
  const fs = logspaceSafe(f0 / 10, f0 * 10, 400);
  const resp = fs.map((f) => {
    const w = 2 * Math.PI * f;
    const Z = conn === "series" ? zsum(zR(R), zL(L, w), zC(Cap, w)) : zpar(zR(R), zL(L, w), zC(Cap, w));
    return [f, conn === "series" ? R / cabs(Z) : cabs(Z) / R];
  });
  return {
    results: [
      { label: "Rezonans frekansı f0", value: eng(f0, "Hz", 4), text: `f0 = ${eng(f0, "Hz", 4)}` },
      { label: "Açısal frekans ω0", value: eng(w0, "rad/s", 5) },
      { label: "Kalite faktörü Q", value: Q, sig: 5, text: `Q = ${fmt(Q, 5)}` },
      { label: "Bant genişliği BW", value: eng(BW, "Hz", 5) },
      { label: "Alt kesim frekansı f1", value: eng(f1, "Hz", 5) },
      { label: "Üst kesim frekansı f2", value: eng(f2, "Hz", 5) },
      { label: "Rezonanstaki empedans", value: eng(R, "Ω", 5) }
    ],
    blocks: [{ type: "plot", title: conn === "series" ? "Bağıl akım I/I₀ – frekans" : "Bağıl empedans |Z|/R – frekans", logX: true, xLabel: "f (Hz)", yLabel: conn === "series" ? "I/I₀" : "|Z|/R", series: [{ name: "Tepki", points: resp }], hlines: [{ y: Math.SQRT1_2 }], vlines: [{ x: f1 }, { x: f2 }] }],
    steps, copy: `f0 = ${eng(f0, "Hz", 4)}, Q = ${fmt(Q, 5)}, BW = ${eng(BW, "Hz", 5)}`
  };
}
