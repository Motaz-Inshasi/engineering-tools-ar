import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "تایمر 555 در دو حالت نوسان‌ساز آزاد (astable) و تک‌پایدار (monostable): فرکانس و چرخهٔ کار، زمان‌های صعود و نزول، عرض پالس و شکل خروجی.",
  keywords: ["555", "تایمر 555", "timer", "astable", "monostable", "نوسان‌ساز", "پالس", "چرخهٔ کار", "duty cycle"],
  formulas: [
    { label: "نوسان‌ساز ناپایدار", tex: "t_H = \\ln 2\\,(R_1 + R_2)C,\\quad t_L = \\ln 2\\,R_2 C,\\quad f = \\frac{1}{t_H + t_L} \\approx \\frac{1.44}{(R_1 + 2R_2)C}" },
    { label: "تک‌پایدار", tex: "t = \\ln 3\\,RC \\approx 1.1\\,RC" }
  ],
  inputs: [
    { id: "mode", label: "حالت", type: "select", default: "astable", options: [["astable", "ناپایدار (نوسان‌ساز)"], ["mono", "تک‌پایدار (یک پالس)"]] },
    { id: "R1", label: "R1", unit: "Ω", type: "number", default: "1k", when: { mode: ["astable"] } },
    { id: "R2", label: "R2", unit: "Ω", type: "number", default: "10k", when: { mode: ["astable"] } },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "100k", when: { mode: ["mono"] } },
    { id: "C", label: "C", unit: "F", type: "number", default: "100n" }
  ],
  example: { values: { mode: "astable", R1: "1k", R2: "10k", C: "100n" }, expect: ["f = 687 Hz", "52.38%"], note: "مثال: R1 = 1 kΩ و R2 = 10 kΩ و C = 100 nF." },
  invalid: { values: { mode: "astable", R1: "1k", R2: "0", C: "100n" } },
  related: ["rc-rl-transient", "pwm-servo", "capacitor-inductor-combination"]
};

export function solve(input) {
  const mode = choice(input, "mode", "حالت", ["astable", "mono"], "astable");
  const C = num(input, "C", "C", { positive: true });
  const L2 = Math.LN2, L3 = Math.log(3);
  if (mode === "mono") {
    const R = num(input, "R", "R", { positive: true });
    const t = L3 * R * C;
    return {
      results: [{ label: "عرض پالس", value: eng(t, "s", 4), text: `t = ${eng(t, "s", 4)}` }],
      steps: [
        "در پالس تحریک، خروجی بالا می‌رود و خازن از طریق R شارژ می‌شود تا به 2/3 ولتاژ تغذیه برسد، سپس خروجی پایین می‌آید.",
        { text: "زمان شارژ از 0 تا ⅔Vcc:", tex: `t = RC\\ln 3 = ${ntex(R)} \\times ${ntex(C)} \\times 1.0986 = ${ntex(t, 5)}\\ s` },
        "نتیجه به ولتاژ تغذیه وابسته نیست، زیرا آستانه‌های مقایسه‌گر کسری از آن هستند."
      ],
      copy: `t = ${eng(t, "s", 4)}`
    };
  }
  const R1 = num(input, "R1", "R1", { positive: true }), R2 = num(input, "R2", "R2", { positive: true });
  if (R1 < 1) fail("R1 بسیار کوچک است و ممکن است پایهٔ تخلیه را آسیب بزند (حداقل 1 kΩ توصیه می‌شود).", "R1");
  const tH = L2 * (R1 + R2) * C, tL = L2 * R2 * C, T = tH + tL, f = 1 / T, D = tH / T;
  const steps = [
    "ولتاژ خازن بین ⅓Vcc و ⅔Vcc نوسان می‌کند: از طریق R1 + R2 شارژ می‌شود (خروجی بالا) و فقط از طریق R2 تخلیه می‌شود (خروجی پایین).",
    { text: "زمان صعود و نزول:", tex: `t_H = \\ln 2 (${ntex(R1)} + ${ntex(R2)})(${ntex(C)}) = ${ntex(tH, 5)}\\ s,\\quad t_L = \\ln 2 \\cdot ${ntex(R2)} \\cdot ${ntex(C)} = ${ntex(tL, 5)}\\ s` },
    { text: "فرکانس و چرخهٔ کار:", tex: `f = \\frac{1}{t_H + t_L} = ${ntex(f, 5)}\\ Hz,\\quad D = \\frac{t_H}{t_H + t_L} = ${ntex(100 * D, 4)}\\%` },
    "چرخهٔ کار در این مدار همیشه بیشتر از 50% است؛ برای کمتر از آن، یک دیود موازی با R2 افزوده می‌شود."
  ];
  const pts = [];
  for (let k = 0; k < 3; k++) {
    const t0 = k * T;
    pts.push([t0, 0], [t0, 1], [t0 + tH, 1], [t0 + tH, 0], [t0 + T, 0]);
  }
  return {
    results: [
      { label: "فرکانس", value: eng(f, "Hz", 4), text: `f = ${eng(f, "Hz", 4)}` },
      { label: "چرخهٔ کار", value: `${fmt(100 * D, 4)}%`, text: `D = ${fmt(100 * D, 4)}%` },
      { label: "زمان صعود tH", value: eng(tH, "s", 4) },
      { label: "زمان نزول tL", value: eng(tL, "s", 4) },
      { label: "دورهٔ T", value: eng(T, "s", 4) }
    ],
    blocks: [{ type: "plot", title: "شکل خروجی (سه سیکل)", xLabel: "t (s)", yLabel: "خروجی", yMin: -0.2, yMax: 1.3, series: [{ name: "خروجی", points: pts }] }],
    steps, copy: `f = ${eng(f, "Hz", 4)}, D = ${fmt(100 * D, 4)}%, tH = ${eng(tH, "s", 4)}, tL = ${eng(tL, "s", 4)}`
  };
}
