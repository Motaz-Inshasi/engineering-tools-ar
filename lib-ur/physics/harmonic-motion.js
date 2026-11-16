import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const DEG = Math.PI / 180;

export const meta = {
  description: "اسپرنگ کی سادہ ہارمونک حرکت (تعدد، دوری وقت، زیادہ سے زیادہ رفتار اور اسراع، اور توانائی) اور سادہ پنڈولم (دوری وقت اور تعدد، بڑے زاویوں کے لیے درست دوری وقت کے ساتھ) کا حساب لگائیں، ساتھ دو سائیکلوں کے لیے بے گھراؤ یا زاویے کا گراف۔",
  keywords: ["سادہ ہارمونک حرکت", "اسپرنگ", "پنڈولم", "اسپرنگ کا مستقل", "طول", "دوری وقت", "تعدد", "simple harmonic motion", "spring", "pendulum"],
  formulas: [
    { label: "اسپرنگ", tex: "\\omega = \\sqrt{\\frac{k}{m}},\\quad T = \\frac{2\\pi}{\\omega},\\quad v_{max} = A\\omega,\\quad a_{max} = A\\omega^2,\\quad E = \\frac{1}{2}kA^2" },
    { label: "سادہ پنڈولم", tex: "T = 2\\pi\\sqrt{\\frac{L}{g}}\\quad (\\theta_0 \\text{ چھوٹا}),\\qquad T_{exact} = \\frac{T}{\\mathrm{AGM}\\left(1,\\cos\\frac{\\theta_0}{2}\\right)}" }
  ],
  inputs: [
    { id: "mode", label: "نظام کی قسم", type: "select", default: "spring", options: [["spring", "اسپرنگ اور کمیت"], ["pendulum", "سادہ پنڈولم"]] },
    { id: "k", label: "اسپرنگ کا مستقل k", unit: "N/m", type: "number", default: "200", when: { mode: ["spring"] } },
    { id: "ms", label: "کمیت m", unit: "kg", type: "number", default: "0.5", when: { mode: ["spring"] } },
    { id: "A", label: "طول A", unit: "m", type: "number", default: "0.1", when: { mode: ["spring"] }, help: "توازنی حالت سے زیادہ سے زیادہ بے گھراؤ۔" },
    { id: "L", label: "دھاگے کی لمبائی L", unit: "m", type: "number", default: "1", when: { mode: ["pendulum"] } },
    { id: "g", label: "ثقلی اسراع g", unit: "m/s²", type: "number", default: "9.81", when: { mode: ["pendulum"] } },
    { id: "th", label: "طول کا زاویہ θ0", unit: "°", type: "number", default: "5", when: { mode: ["pendulum"] }, help: "چھوٹے زاویے کے تقریب کی درستگی کے لیے ترجیحاً 15° سے کم ہو۔" }
  ],
  example: {
    values: { mode: "spring", k: "200", ms: "0.5", A: "0.1", L: "1", g: "9.81", th: "5" },
    expect: ["ω = 20 rad/s", "vmax = 2 m/s"],
    note: "مثال: 200 N/m مستقل والا اسپرنگ جس پر 0.5 kg کمیت ہو اور طول 0.1 m ہو۔"
  },
  invalid: { values: { mode: "spring", k: "0", ms: "0.5", A: "0.1", L: "1", g: "9.81", th: "5" } },
  related: ["waves-doppler", "work-energy", "kinematics", "formulas-constants"]
};

function agm(a, b) {
  let x = a, y = b;
  for (let i = 0; i < 100 && Math.abs(x - y) > 1e-15 * x; i++) {
    const nx = (x + y) / 2;
    y = Math.sqrt(x * y);
    x = nx;
  }
  return x;
}

function samples(span, fn) {
  const N = 240;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = span * i / N;
    pts.push([t, fn(t)]);
  }
  return pts;
}

function spring(input) {
  const k = num(input, "k", "اسپرنگ کا مستقل k", { positive: true });
  const m = num(input, "ms", "کمیت m", { positive: true });
  const A = num(input, "A", "طول A", { nonNegative: true });
  const w = Math.sqrt(k / m);
  const f = w / (2 * Math.PI);
  const T = 1 / f;
  const vmax = A * w;
  const amax = A * w * w;
  const E = 0.5 * k * A * A;
  return {
    results: [
      { label: "زاویائی تعدد ω", value: `${fmt(w, 4)} rad/s` },
      { label: "تعدد f", value: `${fmt(f, 4)} Hz` },
      { label: "دوری وقت T", value: `${fmt(T, 4)} s` },
      { label: "زیادہ سے زیادہ رفتار vmax", value: `${fmt(vmax, 4)} m/s` },
      { label: "زیادہ سے زیادہ اسراع amax", value: `${fmt(amax, 4)} m/s²` },
      { label: "کل توانائی E", value: `${fmt(E, 4)} J` }
    ],
    steps: [
      { text: "اسپرنگ کی زاویائی تعدد:", tex: `\\omega = \\sqrt{\\frac{k}{m}} = \\sqrt{\\frac{${ntex(k)}}{${ntex(m)}}} = ${ntex(w, 6)}\\ rad/s` },
      { text: "تعدد اور دوری وقت:", tex: `f = \\frac{\\omega}{2\\pi} = ${ntex(f, 6)}\\ Hz,\\qquad T = \\frac{1}{f} = ${ntex(T, 6)}\\ s` },
      { text: "زیادہ سے زیادہ رفتار:", tex: `v_{max} = A\\omega = ${ntex(A)} \\times ${ntex(w, 6)} = ${ntex(vmax, 6)}\\ m/s` },
      { text: "زیادہ سے زیادہ اسراع:", tex: `a_{max} = A\\omega^2 = ${ntex(amax, 6)}\\ m/s^2` },
      { text: "کل توانائی:", tex: `E = \\frac{1}{2}kA^2 = ${ntex(E, 6)}\\ J` }
    ],
    blocks: [
      { type: "plot", title: "دو سائیکلوں کے لیے بے گھراؤ x(t)", xLabel: "t (s)", yLabel: "x (m)", includeZero: true, series: [{ name: "x(t)", points: samples(2 * T, (t) => A * Math.cos(w * t)), line: true }] }
    ],
    copy: `ω = ${fmt(w, 4)} rad/s, f = ${fmt(f, 4)} Hz, T = ${fmt(T, 4)} s, vmax = ${fmt(vmax, 4)} m/s, amax = ${fmt(amax, 4)} m/s², E = ${fmt(E, 4)} J`
  };
}

function pendulum(input) {
  const L = num(input, "L", "دھاگے کی لمبائی L", { positive: true });
  const g = num(input, "g", "ثقلی اسراع g", { positive: true });
  const th = num(input, "th", "طول کا زاویہ θ0", { positive: true, below: 180 });
  const T = 2 * Math.PI * Math.sqrt(L / g);
  const f = 1 / T;
  const w = 2 * Math.PI / T;
  const Tex = T / agm(1, Math.cos(th * DEG / 2));
  const blocks = [];
  if (th > 15) blocks.push({ type: "note", tone: "warn", text: "طول کا زاویہ 15° سے زیادہ ہے، اس لیے چھوٹے زاویے کا تقریب حقیقی دوری وقت سے کم دوری وقت دیتا ہے؛ نتائج میں درست دوری وقت دیکھیں۔" });
  blocks.push({ type: "plot", title: "دو سائیکلوں کے لیے زاویہ θ(t) (چھوٹے زاویے کا تقریب)", xLabel: "t (s)", yLabel: "θ (°)", includeZero: true, series: [{ name: "θ(t)", points: samples(2 * T, (t) => th * Math.cos(w * t)), line: true }] });
  return {
    results: [
      { label: "چھوٹے زاویے کے تقریب سے دوری وقت T", value: `${fmt(T, 4)} s` },
      { label: "درست دوری وقت", value: `${fmt(Tex, 4)} s` },
      { label: "تعدد f", value: `${fmt(f, 4)} Hz` },
      { label: "زاویائی تعدد ω", value: `${fmt(w, 4)} rad/s` }
    ],
    steps: [
      { text: "چھوٹے زاویے کے تقریب سے دوری وقت:", tex: `T = 2\\pi\\sqrt{\\frac{L}{g}} = 2\\pi\\sqrt{\\frac{${ntex(L)}}{${ntex(g)}}} = ${ntex(T, 6)}\\ s` },
      { text: "تعدد اور زاویائی تعدد:", tex: `f = \\frac{1}{T} = ${ntex(f, 6)}\\ Hz,\\qquad \\omega = \\frac{2\\pi}{T} = ${ntex(w, 6)}\\ rad/s` },
      { text: "طول کے زاویے کے لیے درست دوری وقت:", tex: `T_{exact} = \\frac{T}{\\mathrm{AGM}\\left(1,\\cos\\frac{\\theta_0}{2}\\right)} = ${ntex(Tex, 6)}\\ s` }
    ],
    blocks,
    copy: `T = ${fmt(T, 4)} s, T_exact = ${fmt(Tex, 4)} s, f = ${fmt(f, 4)} Hz, ω = ${fmt(w, 4)} rad/s`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "نظام کی قسم", ["spring", "pendulum"], "spring");
  return mode === "pendulum" ? pendulum(input) : spring(input);
}
