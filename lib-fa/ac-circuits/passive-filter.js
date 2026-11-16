import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { C, cdiv, cabs, carg } from "../core/complex.js";
import { zR, zL, zC, zsum } from "./common.js";
import { logspaceSafe } from "../dc-circuits/common.js";

const TYPES = [["rc-lp", "RC پایین‌گذر"], ["rc-hp", "RC بالاگذر"], ["rl-lp", "RL پایین‌گذر"], ["rl-hp", "RL بالاگذر"], ["rlc-bp", "RLC میان‌گذر (خروجی روی R)"]];

export const meta = {
  description: "فیلترهای غیرفعال RC و RL مرتبه اول و فیلتر RLC میان‌گذر: فرکانس قطع، بهره و فاز در هر فرکانس، همراه با نمودار بود برای اندازه و فاز.",
  keywords: ["فیلتر", "فیلتر", "filter", "فرکانس قطع", "cutoff", "پایین‌گذر", "بالاگذر", "low pass", "high pass", "band pass", "RC"],
  formulas: [
    { label: "فرکانس‌های قطع", tex: "f_c^{RC} = \\frac{1}{2\\pi RC},\\qquad f_c^{RL} = \\frac{R}{2\\pi L},\\qquad f_0^{RLC} = \\frac{1}{2\\pi\\sqrt{LC}}" },
    { label: "تابع انتقال RC پایین‌گذر", tex: "H(j\\omega) = \\frac{1}{1 + j\\omega RC},\\quad |H(f_c)| = \\frac{1}{\\sqrt{2}} \\;(-3\\,dB)" }
  ],
  inputs: [
    { id: "type", label: "نوع فیلتر", type: "select", default: "rc-lp", options: TYPES },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "1.6k" },
    { id: "C", label: "C", unit: "F", type: "number", default: "100n", when: { type: ["rc-lp", "rc-hp", "rlc-bp"] } },
    { id: "L", label: "L", unit: "H", type: "number", default: "10m", when: { type: ["rl-lp", "rl-hp", "rlc-bp"] } },
    { id: "f", label: "فرکانس محاسبه بهره (اختیاری)", unit: "Hz", type: "number", default: "5k" }
  ],
  example: { values: { type: "rc-lp", R: "1.6k", C: "100n", f: "5k" }, expect: ["fc = 994.7 Hz"], note: "مثال: فیلتر پایین‌گذر با 1.6 کیلواهم و 100 نانوفاراد." },
  invalid: { values: { type: "rc-lp", R: "0", C: "100n" } },
  related: ["resonance", "bode-plot", "impedance", "rc-rl-transient"]
};

export function H(type, p, f) {
  const w = 2 * Math.PI * f;
  const R = zR(p.R);
  switch (type) {
    case "rc-lp": return cdiv(zC(p.C, w), zsum(R, zC(p.C, w)));
    case "rc-hp": return cdiv(R, zsum(R, zC(p.C, w)));
    case "rl-lp": return cdiv(R, zsum(R, zL(p.L, w)));
    case "rl-hp": return cdiv(zL(p.L, w), zsum(R, zL(p.L, w)));
    case "rlc-bp": return cdiv(R, zsum(R, zL(p.L, w), zC(p.C, w)));
  }
  return C(NaN);
}

export function solve(input) {
  const type = choice(input, "type", "نوع فیلتر", TYPES.map((t) => t[0]), "rc-lp");
  const p = { R: num(input, "R", "R", { positive: true }) };
  if (type.startsWith("rc") || type === "rlc-bp") p.C = num(input, "C", "C", { positive: true });
  if (type.startsWith("rl")) p.L = num(input, "L", "L", { positive: true });
  const f = num(input, "f", "فرکانس", { optional: true, positive: true });
  const steps = [];
  const results = [];
  let fc, copy;
  if (type === "rlc-bp") {
    fc = 1 / (2 * Math.PI * Math.sqrt(p.L * p.C));
    const Q = Math.sqrt(p.L / p.C) / p.R, BW = fc / Q;
    steps.push({ text: "فرکانس مرکزی (تشدید سری):", tex: `f_0 = \\frac{1}{2\\pi\\sqrt{${ntex(p.L)} \\times ${ntex(p.C)}}} = ${ntex(fc, 6)}\\ Hz` });
    steps.push({ text: "ضریب کیفیت و پهنای باند:", tex: `Q = \\frac{1}{R}\\sqrt{\\frac{L}{C}} = ${ntex(Q, 5)},\\quad BW = \\frac{f_0}{Q} = ${ntex(BW, 6)}\\ Hz` });
    steps.push("در f0 راکتانس‌های L و C یکدیگر را خنثی می‌کنند، پس کل ولتاژ به R می‌رسد (بهره 0 دسی‌بل) و با دور شدن از آن بهره کاهش می‌یابد.");
    results.push({ label: "فرکانس مرکزی f0", value: eng(fc, "Hz", 4), text: `f0 = ${eng(fc, "Hz", 4)}` }, { label: "ضریب کیفیت Q", value: Q, sig: 5 }, { label: "پهنای باند", value: eng(BW, "Hz", 4) });
    copy = `f0 = ${eng(fc, "Hz", 4)}, Q = ${fmt(Q, 5)}`;
  } else {
    fc = type.startsWith("rc") ? 1 / (2 * Math.PI * p.R * p.C) : p.R / (2 * Math.PI * p.L);
    steps.push({ text: "فرکانس قطع (جایی که بهره 3 دسی‌بل افت می‌کند و فاز ±45 درجه است):", tex: type.startsWith("rc") ? `f_c = \\frac{1}{2\\pi RC} = \\frac{1}{2\\pi \\times ${ntex(p.R)} \\times ${ntex(p.C)}} = ${ntex(fc, 6)}\\ Hz` : `f_c = \\frac{R}{2\\pi L} = \\frac{${ntex(p.R)}}{2\\pi \\times ${ntex(p.L)}} = ${ntex(fc, 6)}\\ Hz` });
    steps.push(type.endsWith("lp") ? "بالاتر از فرکانس قطع، بهره با نرخ 20 دسی‌بل بر دهه کاهش می‌یابد (فیلتر مرتبه اول)." : "پایین‌تر از فرکانس قطع بهره با نرخ 20 دسی‌بل بر دهه کاهش می‌یابد و بالاتر از آن سیگنال تقریباً کامل عبور می‌کند.");
    results.push({ label: "فرکانس قطع fc", value: eng(fc, "Hz", 4), text: `fc = ${eng(fc, "Hz", 4)}` }, { label: "ثابت زمانی τ", value: eng(1 / (2 * Math.PI * fc), "s", 4) });
    copy = `fc = ${eng(fc, "Hz", 4)}`;
  }
  if (f !== null) {
    const h = H(type, p, f);
    const db = 20 * Math.log10(cabs(h)), ph = (carg(h) * 180) / Math.PI;
    steps.push({ text: `در ${eng(f, "Hz")} در تابع انتقال جایگذاری می‌کنیم:`, tex: `|H| = ${ntex(cabs(h), 6)} = ${ntex(db, 5)}\\ dB,\\quad \\angle H = ${ntex(ph, 5)}^\\circ` });
    results.push({ label: `بهره در ${eng(f, "Hz")}`, value: `${fmt(cabs(h), 5)} (${fmt(db, 4)} dB)` }, { label: "فاز در آن نقطه", value: ph, unit: "°", sig: 4 });
    copy += `\n|H(${eng(f, "Hz")})| = ${fmt(db, 4)} dB`;
  }
  const fs = logspaceSafe(fc / 1000, fc * 1000, 400);
  const resp = fs.map((x) => H(type, p, x));
  return {
    results, steps, copy,
    blocks: [
      { type: "plot", title: "اندازه (دسی‌بل)", logX: true, xLabel: "f (Hz)", yLabel: "|H| (dB)", series: [{ name: "|H|", points: fs.map((x, i) => [x, 20 * Math.log10(cabs(resp[i]))]) }], hlines: [{ y: -3.0103 }], vlines: [{ x: fc }] },
      { type: "plot", title: "فاز (درجه)", logX: true, xLabel: "f (Hz)", yLabel: "∠H (°)", series: [{ name: "∠H", points: fs.map((x, i) => [x, (carg(resp[i]) * 180) / Math.PI]), color: "var(--plot-3)" }], vlines: [{ x: fc }] }
    ]
  };
}
