import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "555 ٹائمر کے اسٹیبل (خود مختار اوسلیٹر) اور مونو اسٹیبل (ایک شاٹ) طریقے: فریکوئنسی، ڈیوٹی سائیکل، رائز اور فال ٹائمز اور پلس کی چوڑائی، آؤٹ پٹ ویو فارم کے ساتھ۔",
  keywords: ["555", "555 ٹائمر", "timer", "astable", "monostable", "اوسلیٹر", "پلس", "ڈیوٹی سائیکل", "duty cycle"],
  formulas: [
    { label: "اسٹیبل اوسلیٹر", tex: "t_H = \\ln 2\\,(R_1 + R_2)C,\\quad t_L = \\ln 2\\,R_2 C,\\quad f = \\frac{1}{t_H + t_L} \\approx \\frac{1.44}{(R_1 + 2R_2)C}" },
    { label: "مونو اسٹیبل", tex: "t = \\ln 3\\,RC \\approx 1.1\\,RC" }
  ],
  inputs: [
    { id: "mode", label: "موڈ", type: "select", default: "astable", options: [["astable", "اسٹیبل (اوسلیٹر)"], ["mono", "مونو اسٹیبل (ایک پلس)"]] },
    { id: "R1", label: "R1", unit: "Ω", type: "number", default: "1k", when: { mode: ["astable"] } },
    { id: "R2", label: "R2", unit: "Ω", type: "number", default: "10k", when: { mode: ["astable"] } },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "100k", when: { mode: ["mono"] } },
    { id: "C", label: "C", unit: "F", type: "number", default: "100n" }
  ],
  example: { values: { mode: "astable", R1: "1k", R2: "10k", C: "100n" }, expect: ["f = 687 Hz", "52.38%"], note: "مثال: R1 = 1 kΩ، R2 = 10 kΩ اور C = 100 nF۔" },
  invalid: { values: { mode: "astable", R1: "1k", R2: "0", C: "100n" } },
  related: ["rc-rl-transient", "pwm-servo", "capacitor-inductor-combination"]
};

export function solve(input) {
  const mode = choice(input, "mode", "موڈ", ["astable", "mono"], "astable");
  const C = num(input, "C", "C", { positive: true });
  const L2 = Math.LN2, L3 = Math.log(3);
  if (mode === "mono") {
    const R = num(input, "R", "R", { positive: true });
    const t = L3 * R * C;
    return {
      results: [{ label: "پلس کی چوڑائی", value: eng(t, "s", 4), text: `t = ${eng(t, "s", 4)}` }],
      steps: [
        "ٹرگر پلس پر آؤٹ پٹ بلند ہوتا ہے اور کپیسیٹر R کے ذریعے چارج ہوتا ہے یہاں تک کہ سپلائی وولٹیج کے ⅔ تک پہنچ جائے، تب آؤٹ پٹ کم ہو جاتا ہے۔",
        { text: "0 سے ⅔Vcc تک چارج ہونے کا وقت:", tex: `t = RC\\ln 3 = ${ntex(R)} \\times ${ntex(C)} \\times 1.0986 = ${ntex(t, 5)}\\ s` },
        "نتیجہ سپلائی وولٹیج پر منحصر نہیں ہے، کیونکہ کمپیریٹر کی حدیں اس کا کسر ہیں۔"
      ],
      copy: `t = ${eng(t, "s", 4)}`
    };
  }
  const R1 = num(input, "R1", "R1", { positive: true }), R2 = num(input, "R2", "R2", { positive: true });
  if (R1 < 1) fail("R1 بہت چھوٹا ہے اور ڈسچارج پن کو نقصان پہنچا سکتا ہے (کم از کم 1 kΩ تجویز کیا جاتا ہے)۔", "R1");
  const tH = L2 * (R1 + R2) * C, tL = L2 * R2 * C, T = tH + tL, f = 1 / T, D = tH / T;
  const steps = [
    "کپیسیٹر کا وولٹیج ⅓Vcc اور ⅔Vcc کے درمیان جھولتا ہے: یہ R1 + R2 کے ذریعے چارج ہوتا ہے (آؤٹ پٹ بلند) اور صرف R2 کے ذریعے ڈسچارج ہوتا ہے (آؤٹ پٹ کم)۔",
    { text: "رائز اور فال ٹائمز:", tex: `t_H = \\ln 2 (${ntex(R1)} + ${ntex(R2)})(${ntex(C)}) = ${ntex(tH, 5)}\\ s,\\quad t_L = \\ln 2 \\cdot ${ntex(R2)} \\cdot ${ntex(C)} = ${ntex(tL, 5)}\\ s` },
    { text: "فریکوئنسی اور ڈیوٹی سائیکل:", tex: `f = \\frac{1}{t_H + t_L} = ${ntex(f, 5)}\\ Hz,\\quad D = \\frac{t_H}{t_H + t_L} = ${ntex(100 * D, 4)}\\%` },
    "اس سرکٹ میں ڈیوٹی سائیکل ہمیشہ 50% سے زیادہ ہوتا ہے؛ اس سے کم حاصل کرنے کے لیے R2 کے متوازی ایک ڈائیوڈ شامل کیا جاتا ہے۔"
  ];
  const pts = [];
  for (let k = 0; k < 3; k++) {
    const t0 = k * T;
    pts.push([t0, 0], [t0, 1], [t0 + tH, 1], [t0 + tH, 0], [t0 + T, 0]);
  }
  return {
    results: [
      { label: "فریکوئنسی", value: eng(f, "Hz", 4), text: `f = ${eng(f, "Hz", 4)}` },
      { label: "ڈیوٹی سائیکل", value: `${fmt(100 * D, 4)}%`, text: `D = ${fmt(100 * D, 4)}%` },
      { label: "رائز ٹائم tH", value: eng(tH, "s", 4) },
      { label: "فال ٹائم tL", value: eng(tL, "s", 4) },
      { label: "پیریڈ T", value: eng(T, "s", 4) }
    ],
    blocks: [{ type: "plot", title: "آؤٹ پٹ ویو فارم (تین سائیکل)", xLabel: "t (s)", yLabel: "آؤٹ پٹ", yMin: -0.2, yMax: 1.3, series: [{ name: "آؤٹ پٹ", points: pts }] }],
    steps, copy: `f = ${eng(f, "Hz", 4)}, D = ${fmt(100 * D, 4)}%, tH = ${eng(tH, "s", 4)}, tL = ${eng(tL, "s", 4)}`
  };
}
