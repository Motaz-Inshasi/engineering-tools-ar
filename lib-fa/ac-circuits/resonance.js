import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cabs } from "../core/complex.js";
import { zR, zL, zC, zsum, zpar } from "./common.js";
import { logspaceSafe } from "../dc-circuits/common.js";

export const meta = {
  description: "فرکانس تشدید، ضریب کیفیت Q، پهنای باند و فرکانس‌های نیم‌توان یک مدار RLC سری یا موازی، همراه با منحنی پاسخ حول تشدید.",
  keywords: ["تشدید", "resonance", "فرکانس تشدید", "ضریب کیفیت", "quality factor", "Q", "پهنای باند", "bandwidth"],
  formulas: [
    { label: "فرکانس تشدید", tex: "f_0 = \\frac{1}{2\\pi\\sqrt{LC}},\\qquad \\omega_0 = \\frac{1}{\\sqrt{LC}}" },
    { label: "ضریب کیفیت و پهنای باند", tex: "Q_s = \\frac{1}{R}\\sqrt{\\frac{L}{C}},\\quad Q_p = R\\sqrt{\\frac{C}{L}},\\quad BW = \\frac{f_0}{Q}" }
  ],
  inputs: [
    { id: "conn", label: "اتصال", type: "select", default: "series", options: [["series", "سری"], ["parallel", "موازی"]] },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10" },
    { id: "L", label: "L", unit: "H", type: "number", default: "1m" },
    { id: "C", label: "C", unit: "F", type: "number", default: "100n" }
  ],
  example: { values: { conn: "series", R: "10", L: "1m", C: "100n" }, expect: ["f0 = 15.92 kHz", "Q = 10"], note: "مثال: مدار سری با 10 اهم، 1 میلی‌هنری و 100 نانوفاراد." },
  invalid: { values: { conn: "series", R: "10", L: "-1m", C: "100n" } },
  related: ["rlc-circuit", "passive-filter", "impedance"]
};

export function solve(input) {
  const conn = choice(input, "conn", "اتصال", ["series", "parallel"], "series");
  const R = num(input, "R", "R", { positive: true }), L = num(input, "L", "L", { positive: true }), Cap = num(input, "C", "C", { positive: true });
  const w0 = 1 / Math.sqrt(L * Cap), f0 = w0 / (2 * Math.PI);
  const Q = conn === "series" ? Math.sqrt(L / Cap) / R : R * Math.sqrt(Cap / L);
  const a = conn === "series" ? R / (2 * L) : 1 / (2 * R * Cap);
  const w1 = -a + Math.sqrt(a * a + w0 * w0), w2 = a + Math.sqrt(a * a + w0 * w0);
  const f1 = w1 / (2 * Math.PI), f2 = w2 / (2 * Math.PI), BW = f2 - f1;
  const steps = [
    { text: "در تشدید دو راکتانس برابر می‌شوند و یکدیگر را خنثی می‌کنند:", tex: `\\omega_0 L = \\frac{1}{\\omega_0 C} \\Rightarrow f_0 = \\frac{1}{2\\pi\\sqrt{${ntex(L)} \\times ${ntex(Cap)}}} = ${ntex(f0, 6)}\\ \\text{Hz}` },
    { text: "ضریب کیفیت:", tex: conn === "series" ? `Q = \\frac{1}{R}\\sqrt{\\frac{L}{C}} = \\frac{1}{${ntex(R)}}\\sqrt{\\frac{${ntex(L)}}{${ntex(Cap)}}} = ${ntex(Q, 6)}` : `Q = R\\sqrt{\\frac{C}{L}} = ${ntex(R)}\\sqrt{\\frac{${ntex(Cap)}}{${ntex(L)}}} = ${ntex(Q, 6)}` },
    { text: "فرکانس‌های نیم‌توان (حل دقیق، نه تقریب Q بالا):", tex: `\\omega_{1,2} = \\mp\\alpha + \\sqrt{\\alpha^2 + \\omega_0^2},\\; \\alpha = ${ntex(a, 6)} \\Rightarrow f_1 = ${ntex(f1, 6)},\\; f_2 = ${ntex(f2, 6)}\\ \\text{Hz}` },
    { text: "پهنای باند:", tex: `BW = f_2 - f_1 = ${ntex(BW, 6)}\\ \\text{Hz} = \\frac{f_0}{Q}` },
    conn === "series" ? `در تشدید امپدانس کمترین مقدار و برابر R است و جریان بیشترین مقدار را دارد. ولتاژ سلف و خازن برابر Q برابر ولتاژ منبع است.` : "در تشدید امپدانس بیشترین مقدار و برابر R است و جریان کل کمترین مقدار را دارد، در حالی که جریانی Q برابر بزرگ‌تر بین L و C می‌چرخد."
  ];
  const fs = logspaceSafe(f0 / 10, f0 * 10, 400);
  const resp = fs.map((f) => {
    const w = 2 * Math.PI * f;
    const Z = conn === "series" ? zsum(zR(R), zL(L, w), zC(Cap, w)) : zpar(zR(R), zL(L, w), zC(Cap, w));
    return [f, conn === "series" ? R / cabs(Z) : cabs(Z) / R];
  });
  return {
    results: [
      { label: "فرکانس تشدید f0", value: eng(f0, "Hz", 4), text: `f0 = ${eng(f0, "Hz", 4)}` },
      { label: "فرکانس زاویه‌ای ω0", value: eng(w0, "rad/s", 5) },
      { label: "ضریب کیفیت Q", value: Q, sig: 5, text: `Q = ${fmt(Q, 5)}` },
      { label: "پهنای باند BW", value: eng(BW, "Hz", 5) },
      { label: "فرکانس قطع پایین f1", value: eng(f1, "Hz", 5) },
      { label: "فرکانس قطع بالا f2", value: eng(f2, "Hz", 5) },
      { label: "امپدانس در تشدید", value: eng(R, "Ω", 5) }
    ],
    blocks: [{ type: "plot", title: conn === "series" ? "جریان نسبی I/I₀ بر حسب فرکانس" : "امپدانس نسبی |Z|/R بر حسب فرکانس", logX: true, xLabel: "f (Hz)", yLabel: conn === "series" ? "I/I₀" : "|Z|/R", series: [{ name: "پاسخ", points: resp }], hlines: [{ y: Math.SQRT1_2 }], vlines: [{ x: f1 }, { x: f2 }] }],
    steps, copy: `f0 = ${eng(f0, "Hz", 4)}, Q = ${fmt(Q, 5)}, BW = ${eng(BW, "Hz", 5)}`
  };
}
