import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cabs } from "../core/complex.js";
import { zR, zL, zC, zsum, zpar } from "./common.js";
import { logspaceSafe } from "../dc-circuits/common.js";

export const meta = {
  description: "سیریز یا متوازی RLC سرکٹ کی ریزونینٹ فریکوئنسی، کوالٹی فیکٹر Q، بینڈوتھ اور ہاف پاور فریکوئنسیاں، ساتھ ریزونینس کے گرد رسپانس کا گراف۔",
  keywords: ["ریزونینس", "resonance", "ریزونینٹ فریکوئنسی", "کوالٹی فیکٹر", "quality factor", "Q", "بینڈوتھ", "bandwidth"],
  formulas: [
    { label: "ریزونینٹ فریکوئنسی", tex: "f_0 = \\frac{1}{2\\pi\\sqrt{LC}},\\qquad \\omega_0 = \\frac{1}{\\sqrt{LC}}" },
    { label: "کوالٹی فیکٹر اور بینڈوتھ", tex: "Q_s = \\frac{1}{R}\\sqrt{\\frac{L}{C}},\\quad Q_p = R\\sqrt{\\frac{C}{L}},\\quad BW = \\frac{f_0}{Q}" }
  ],
  inputs: [
    { id: "conn", label: "کنکشن", type: "select", default: "series", options: [["series", "سیریز"], ["parallel", "متوازی"]] },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10" },
    { id: "L", label: "L", unit: "H", type: "number", default: "1m" },
    { id: "C", label: "C", unit: "F", type: "number", default: "100n" }
  ],
  example: { values: { conn: "series", R: "10", L: "1m", C: "100n" }, expect: ["f0 = 15.92 kHz", "Q = 10"], note: "مثال: 10 Ω، 1 mH اور 100 nF کا سیریز سرکٹ۔" },
  invalid: { values: { conn: "series", R: "10", L: "-1m", C: "100n" } },
  related: ["rlc-circuit", "passive-filter", "impedance"]
};

export function solve(input) {
  const conn = choice(input, "conn", "کنکشن", ["series", "parallel"], "series");
  const R = num(input, "R", "R", { positive: true }), L = num(input, "L", "L", { positive: true }), Cap = num(input, "C", "C", { positive: true });
  const w0 = 1 / Math.sqrt(L * Cap), f0 = w0 / (2 * Math.PI);
  const Q = conn === "series" ? Math.sqrt(L / Cap) / R : R * Math.sqrt(Cap / L);
  const a = conn === "series" ? R / (2 * L) : 1 / (2 * R * Cap);
  const w1 = -a + Math.sqrt(a * a + w0 * w0), w2 = a + Math.sqrt(a * a + w0 * w0);
  const f1 = w1 / (2 * Math.PI), f2 = w2 / (2 * Math.PI), BW = f2 - f1;
  const steps = [
    { text: "ریزونینس پر دونوں ری ایکٹنسز برابر ہوتے ہیں، اس لیے ہر ایک دوسرے کو منسوخ کرتا ہے:", tex: `\\omega_0 L = \\frac{1}{\\omega_0 C} \\Rightarrow f_0 = \\frac{1}{2\\pi\\sqrt{${ntex(L)} \\times ${ntex(Cap)}}} = ${ntex(f0, 6)}\\ \\text{Hz}` },
    { text: "کوالٹی فیکٹر:", tex: conn === "series" ? `Q = \\frac{1}{R}\\sqrt{\\frac{L}{C}} = \\frac{1}{${ntex(R)}}\\sqrt{\\frac{${ntex(L)}}{${ntex(Cap)}}} = ${ntex(Q, 6)}` : `Q = R\\sqrt{\\frac{C}{L}} = ${ntex(R)}\\sqrt{\\frac{${ntex(Cap)}}{${ntex(L)}}} = ${ntex(Q, 6)}` },
    { text: "ہاف پاور فریکوئنسیاں (درست حل، اعلیٰ Q کا تخمینہ نہیں):", tex: `\\omega_{1,2} = \\mp\\alpha + \\sqrt{\\alpha^2 + \\omega_0^2},\\; \\alpha = ${ntex(a, 6)} \\Rightarrow f_1 = ${ntex(f1, 6)},\\; f_2 = ${ntex(f2, 6)}\\ \\text{Hz}` },
    { text: "بینڈوتھ:", tex: `BW = f_2 - f_1 = ${ntex(BW, 6)}\\ \\text{Hz} = \\frac{f_0}{Q}` },
    conn === "series" ? `ریزونینس پر امپیڈنس کم سے کم ہوتا ہے اور R کے برابر ہوتا ہے، اور کرنٹ زیادہ سے زیادہ ہوتا ہے۔ انڈکٹر اور کیپیسٹر پر وولٹیج سورس وولٹیج کا Q گنا ہوتا ہے۔` : "ریزونینس پر امپیڈنس زیادہ سے زیادہ ہوتا ہے اور R کے برابر ہوتا ہے، اور کل کرنٹ کم سے کم ہوتا ہے، جبکہ L اور C کے درمیان Q گنا بڑا کرنٹ گردش کرتا ہے۔"
  ];
  const fs = logspaceSafe(f0 / 10, f0 * 10, 400);
  const resp = fs.map((f) => {
    const w = 2 * Math.PI * f;
    const Z = conn === "series" ? zsum(zR(R), zL(L, w), zC(Cap, w)) : zpar(zR(R), zL(L, w), zC(Cap, w));
    return [f, conn === "series" ? R / cabs(Z) : cabs(Z) / R];
  });
  return {
    results: [
      { label: "ریزونینٹ فریکوئنسی f0", value: eng(f0, "Hz", 4), text: `f0 = ${eng(f0, "Hz", 4)}` },
      { label: "اینگولر فریکوئنسی ω0", value: eng(w0, "rad/s", 5) },
      { label: "کوالٹی فیکٹر Q", value: Q, sig: 5, text: `Q = ${fmt(Q, 5)}` },
      { label: "بینڈوتھ BW", value: eng(BW, "Hz", 5) },
      { label: "نچلی کٹ آف فریکوئنسی f1", value: eng(f1, "Hz", 5) },
      { label: "اوپری کٹ آف فریکوئنسی f2", value: eng(f2, "Hz", 5) },
      { label: "ریزونینس پر امپیڈنس", value: eng(R, "Ω", 5) }
    ],
    blocks: [{ type: "plot", title: conn === "series" ? "ریلیٹو کرنٹ I/I₀ بمقابلہ فریکوئنسی" : "ریلیٹو امپیڈنس |Z|/R بمقابلہ فریکوئنسی", logX: true, xLabel: "f (Hz)", yLabel: conn === "series" ? "I/I₀" : "|Z|/R", series: [{ name: "رسپانس", points: resp }], hlines: [{ y: Math.SQRT1_2 }], vlines: [{ x: f1 }, { x: f2 }] }],
    steps, copy: `f0 = ${eng(f0, "Hz", 4)}, Q = ${fmt(Q, 5)}, BW = ${eng(BW, "Hz", 5)}`
  };
}
