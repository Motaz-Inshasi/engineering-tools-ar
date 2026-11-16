import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const TYPES = [["half", "ہاف ویو"], ["center", "سینٹر ٹیپڈ ٹرانسفارمر کے ساتھ فل ویو"], ["bridge", "برج کے ساتھ فل ویو"]];

export const meta = {
  description: "سمتھنگ کپیسیٹر کے ساتھ ریکٹیفائر: ہاف ویو، فل ویو یا برج ریکٹیفائر کے لیے چوٹی کا وولٹیج، DC وولٹیج، ریپل وولٹیج، ریپل فیکٹر اور ڈائیوڈ پر زیادہ سے زیادہ ریورس وولٹیج۔",
  keywords: ["ریکٹیفائر", "ریکٹیفکیشن", "rectifier", "ریپل", "ripple", "برج", "bridge", "سمتھنگ کپیسیٹر", "PIV", "ڈائیوڈ"],
  formulas: [
    { label: "ریپل وولٹیج (لکیری ڈسچارج کا تخمینہ)", tex: "V_{r(pp)} \\approx \\frac{I_{L}}{f_r C},\\quad f_r = f\\ \\text{(half)},\\; 2f\\ \\text{(full)}" },
    { label: "DC وولٹیج", tex: "V_{DC} \\approx V_p - \\frac{V_{r(pp)}}{2},\\qquad V_p = \\sqrt{2}V_{rms} - n_D V_D" }
  ],
  inputs: [
    { id: "type", label: "ریکٹیفائر کی قسم", type: "select", default: "bridge", options: TYPES },
    { id: "Vrms", label: "ثانوی وولٹیج (RMS)", unit: "V", type: "number", default: "12", help: "سینٹر ٹیپڈ ٹرانسفارمر کے لیے: آدھی وائنڈنگ کا وولٹیج۔" },
    { id: "f", label: "مین فریکوئنسی", unit: "Hz", type: "number", default: "50" },
    { id: "C", label: "سمتھنگ کپیسیٹر", unit: "F", type: "number", default: "2200u" },
    { id: "RL", label: "لوڈ ریزسٹنس", unit: "Ω", type: "number", default: "100" },
    { id: "Vd", label: "ڈائیوڈ وولٹیج ڈراپ", unit: "V", type: "number", default: "0.7" }
  ],
  example: { values: { type: "bridge", Vrms: "12", f: "50", C: "2200u", RL: "100", Vd: "0.7" }, expect: ["Vp = 15.57 V"], note: "مثال: 12 V ٹرانسفارمر، 2200 µF کپیسیٹر اور 100 Ω لوڈ کے ساتھ برج ریکٹیفائر۔" },
  invalid: { values: { type: "bridge", Vrms: "0.9", f: "50", C: "100u", RL: "100", Vd: "0.7" } },
  related: ["transformer", "zener-regulator", "voltage-regulator", "fourier-series"]
};

export function solve(input) {
  const type = choice(input, "type", "قسم", TYPES.map((t) => t[0]), "bridge");
  const Vrms = num(input, "Vrms", "وولٹیج", { positive: true });
  const f = num(input, "f", "فریکوئنسی", { positive: true });
  const C = num(input, "C", "کپیسیٹر", { positive: true });
  const RL = num(input, "RL", "لوڈ", { positive: true });
  const Vd = num(input, "Vd", "ڈائیوڈ ڈراپ", { nonNegative: true, max: 5 });
  const nD = type === "bridge" ? 2 : 1;
  const fr = type === "half" ? f : 2 * f;
  const Vm = Math.SQRT2 * Vrms;
  const Vp = Vm - nD * Vd;
  if (Vp <= 0) fail("چوٹی کا وولٹیج ڈائیوڈ ڈراپس سے کم ہے، اس لیے کوئی آؤٹ پٹ نہیں ہے۔", "Vrms");
  let Vr = Vp / (fr * RL * C);
  const clipped = Vr > Vp;
  if (clipped) Vr = Vp;
  const Vdc = Vp - Vr / 2, IL = Vdc / RL;
  const PIV = type === "bridge" ? Vm - Vd : type === "center" ? 2 * Vm - Vd : Vm;
  const rf = Vr / (2 * Math.sqrt(3)) / Vdc;
  const steps = [
    { text: "ثانوی کی چوٹی کا وولٹیج، پھر چالو ڈائیوڈز کا ڈراپ منہا کرنے کے بعد:", tex: `V_m = \\sqrt{2} \\times ${ntex(Vrms)} = ${ntex(Vm, 5)}\\ V,\\quad V_p = V_m - ${nD} \\times ${ntex(Vd)} = ${ntex(Vp, 5)}\\ V` },
    `ریپل فریکوئنسی ${fmt(fr)} Hz کیونکہ ${type === "half" ? "ہاف ویو ریکٹیفائر ہر سائیکل میں ایک بار کپیسیٹر کو چارج کرتا ہے" : "فل ویو ریکٹیفائر ہر سائیکل میں دو بار کپیسیٹر کو چارج کرتا ہے"}۔`,
    { text: "چارج کی نبضوں کے درمیان کپیسیٹر لوڈ میں ڈسچارج ہوتا ہے، اس لیے پیک ٹو پیک ریپل وولٹیج یہ ہے:", tex: `V_r \\approx \\frac{V_p}{f_r R_L C} = \\frac{${ntex(Vp, 5)}}{${ntex(fr)} \\times ${ntex(RL)} \\times ${ntex(C)}} = ${ntex(Vr, 5)}\\ V` },
    { text: "اوسط DC وولٹیج اور کرنٹ:", tex: `V_{DC} \\approx V_p - \\frac{V_r}{2} = ${ntex(Vdc, 5)}\\ V,\\quad I_L = ${ntex(IL, 5)}\\ A` },
    { text: "ہر ڈائیوڈ پر زیادہ سے زیادہ ریورس وولٹیج:", tex: `PIV = ${ntex(PIV, 5)}\\ V` }
  ];
  if (clipped) steps.push("وارننگ: کپیسیٹر لوڈ کے لحاظ سے بہت چھوٹا ہے، اس لیے ریپل خود وولٹیج سے بڑا ہے اور تخمینہ درست نہیں۔ کپیسیٹنس بڑھائیں۔");
  else if (Vr / Vp > 0.2) steps.push("ریپل بڑا ہے (20% سے زیادہ)، اس لیے یہاں لکیری تخمینہ کم درست ہے؛ کپیسیٹنس بڑھانے کی سفارش ہے۔");
  const T = 1 / f, pts = [];
  for (let i = 0; i <= 600; i++) {
    const t = (3 * T * i) / 600;
    const s = Math.sin(2 * Math.PI * f * t);
    const rect = Math.max(0, (type === "half" ? s : Math.abs(s)) * Vm - nD * Vd);
    pts.push([t, rect]);
  }
  const out = [];
  let v = Vp;
  for (let i = 0; i <= 600; i++) {
    const t = (3 * T * i) / 600, dt = (3 * T) / 600;
    v = v * Math.exp(-dt / (RL * C));
    v = Math.max(v, pts[i][1]);
    out.push([t, v]);
  }
  return {
    results: [
      { label: "ڈائیوڈز کے بعد چوٹی کا وولٹیج", value: eng(Vp, "V", 4), text: `Vp = ${eng(Vp, "V", 4)}` },
      { label: "ریپل وولٹیج (پیک ٹو پیک)", value: eng(Vr, "V", 4) },
      { label: "تقریبی DC وولٹیج", value: eng(Vdc, "V", 4) },
      { label: "لوڈ کرنٹ", value: eng(IL, "A", 4) },
      { label: "ریپل فیکٹر", value: `${fmt(100 * rf, 3)}%` },
      { label: "زیادہ سے زیادہ ریورس وولٹیج PIV", value: eng(PIV, "V", 4) }
    ],
    blocks: [{ type: "plot", title: "ریکٹیفائیڈ وولٹیج اور کپیسیٹر کا وولٹیج (سمولیشن)", xLabel: "t (s)", yLabel: "V", includeZero: true, series: [{ name: "ریکٹیفکیشن کے بعد", points: pts, dashed: true }, { name: "لوڈ وولٹیج", points: out }] }],
    steps, copy: `Vp = ${eng(Vp, "V", 4)}, Vr = ${eng(Vr, "V", 4)}, Vdc = ${eng(Vdc, "V", 4)}, PIV = ${eng(PIV, "V", 4)}`
  };
}
