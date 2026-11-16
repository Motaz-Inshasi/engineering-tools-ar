import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const G = 6.674e-11;

export const meta = {
  description: "نصف قطر اور رفتار یا دوری وقت سے یکساں دائری حرکت، دو اجسام کے درمیان کشش کی قوت، مداری رفتار، مداری دورانیہ، اخراجی رفتار، اور کسی سیارے کی سطح سے مخصوص بلندی پر کششِ ثقل کا حساب لگائیں۔",
  keywords: ["دائری حرکت", "مرکزی قوت", "مرکزی اسراع", "عمومی کششِ ثقل", "نیوٹن", "مدار", "مصنوعی سیارہ", "اخراجی رفتار", "circular motion", "gravitation", "orbit"],
  formulas: [
    { label: "دائری حرکت", tex: "a_c = \\frac{v^2}{r} = \\omega^2 r,\\qquad F_c = \\frac{m v^2}{r}" },
    { label: "عمومی کششِ ثقل کا قانون", tex: "F = G\\frac{m_1 m_2}{r^2},\\qquad G = 6.674\\times10^{-11}\\ \\frac{N\\,m^2}{kg^2}" },
    { label: "دائری مدار", tex: "v = \\sqrt{\\frac{GM}{r}},\\quad T = \\frac{2\\pi r}{v},\\quad v_{esc} = \\sqrt{\\frac{2GM}{r}},\\quad g = \\frac{GM}{r^2}" }
  ],
  inputs: [
    { id: "mode", label: "حساب کی قسم", type: "select", default: "circular", options: [["circular", "یکساں دائری حرکت"], ["gravity", "دو اجسام کے درمیان کششِ ثقل کی قوت"], ["orbit", "مدار اور مصنوعی سیارہ"]] },
    { id: "speedBy", label: "نصف قطر کے ساتھ دیا گیا", type: "select", default: "v", options: [["v", "خطی رفتار v"], ["T", "دوری وقت T"]], when: { mode: ["circular"] } },
    { id: "rc", label: "نصف قطر r", unit: "m", type: "number", default: "2", when: { mode: ["circular"] } },
    { id: "vc", label: "خطی رفتار v", unit: "m/s", type: "number", default: "3", when: { mode: ["circular"], speedBy: ["v"] } },
    { id: "Tc", label: "دوری وقت T", unit: "s", type: "number", default: "4.19", when: { mode: ["circular"], speedBy: ["T"] } },
    { id: "mc", label: "کمیت m", unit: "kg", type: "number", default: "0.5", when: { mode: ["circular"] } },
    { id: "m1", label: "پہلی کمیت m1", unit: "kg", type: "number", default: "5.972e24", when: { mode: ["gravity"] }, help: "پہلے سے زمین کی کمیت۔" },
    { id: "m2", label: "دوسری کمیت m2", unit: "kg", type: "number", default: "7.348e22", when: { mode: ["gravity"] }, help: "پہلے سے چاند کی کمیت۔" },
    { id: "rg", label: "مرکزوں کے درمیان فاصلہ r", unit: "m", type: "number", default: "3.844e8", when: { mode: ["gravity"] }, help: "پہلے سے زمین اور چاند کے مرکزوں کے درمیان فاصلہ۔" },
    { id: "M", label: "مرکزی جسم کی کمیت M", unit: "kg", type: "number", default: "5.972e24", when: { mode: ["orbit"] }, help: "پہلے سے زمین کی کمیت۔" },
    { id: "R", label: "جسم کا نصف قطر R", unit: "m", type: "number", default: "6.371e6", when: { mode: ["orbit"] }, help: "پہلے سے زمین کا نصف قطر۔" },
    { id: "orbBy", label: "مدار کے لیے دیا گیا", type: "select", default: "h", options: [["h", "سطح سے بلندی h"], ["r", "مرکز سے نصف قطر r"]], when: { mode: ["orbit"] } },
    { id: "ro", label: "مرکز سے نصف قطر r", unit: "m", type: "number", default: "6.771e6", when: { mode: ["orbit"], orbBy: ["r"] } },
    { id: "ho", label: "سطح سے بلندی h", unit: "m", type: "number", default: "400k", when: { mode: ["orbit"], orbBy: ["h"] }, help: "مثال: بین الاقوامی خلائی اسٹیشن کی بلندی تقریباً 400 km ہے۔" }
  ],
  example: {
    values: { mode: "circular", speedBy: "v", rc: "2", vc: "3", Tc: "", mc: "0.5", m1: "5.972e24", m2: "7.348e22", rg: "3.844e8", M: "5.972e24", R: "6.371e6", orbBy: "h", ro: "6.771e6", ho: "400k" },
    expect: ["Fc = 2.25 N", "ac = 4.5 m/s²"],
    note: "مثال: 0.5 kg کمیت کا جسم 2 m نصف قطر پر 3 m/s کی رفتار سے گھومتا ہے۔"
  },
  invalid: { values: { mode: "circular", speedBy: "v", rc: "0", vc: "3", Tc: "", mc: "0.5", m1: "5.972e24", m2: "7.348e22", rg: "3.844e8", M: "5.972e24", R: "6.371e6", orbBy: "h", ro: "6.771e6", ho: "400k" } },
  related: ["kinematics", "projectile-motion", "work-energy", "formulas-constants"]
};

function circular(input) {
  const speedBy = choice(input, "speedBy", "دیا گیا", ["v", "T"], "v");
  const r = num(input, "rc", "نصف قطر r", { positive: true });
  const m = num(input, "mc", "کمیت m", { positive: true });
  const steps = [];
  let v, T;
  if (speedBy === "v") {
    v = num(input, "vc", "خطی رفتار v", { positive: true });
    T = 2 * Math.PI * r / v;
    steps.push({ text: "خطی رفتار سے دوری وقت:", tex: `T = \\frac{2\\pi r}{v} = \\frac{2\\pi \\times ${ntex(r)}}{${ntex(v)}} = ${ntex(T, 6)}\\ s` });
  } else {
    T = num(input, "Tc", "دوری وقت T", { positive: true });
    v = 2 * Math.PI * r / T;
    steps.push({ text: "دوری وقت سے خطی رفتار:", tex: `v = \\frac{2\\pi r}{T} = \\frac{2\\pi \\times ${ntex(r)}}{${ntex(T)}} = ${ntex(v, 6)}\\ m/s` });
  }
  const w = v / r;
  const f = 1 / T;
  const ac = v * v / r;
  const Fc = m * ac;
  steps.push({ text: "زاویائی رفتار:", tex: `\\omega = \\frac{v}{r} = ${ntex(w, 6)}\\ rad/s` });
  steps.push({ text: "مرکزی اسراع:", tex: `a_c = \\frac{v^2}{r} = ${ntex(ac, 6)}\\ m/s^2` });
  steps.push({ text: "مرکزی قوت:", tex: `F_c = m\\,a_c = ${ntex(m)} \\times ${ntex(ac, 6)} = ${ntex(Fc, 6)}\\ N` });
  return {
    results: [
      { label: "زاویائی رفتار ω", value: `${fmt(w, 4)} rad/s` },
      { label: "مرکزی اسراع a_c", value: `${fmt(ac, 4)} m/s²` },
      { label: "مرکزی قوت F_c", value: `${fmt(Fc, 4)} N` },
      { label: "خطی رفتار v", value: `${fmt(v, 4)} m/s` },
      { label: "تعدد f", value: `${fmt(f, 4)} Hz` },
      { label: "دوری وقت T", value: `${fmt(T, 4)} s` }
    ],
    steps,
    copy: `ω = ${fmt(w, 4)} rad/s, ac = ${fmt(ac, 4)} m/s², Fc = ${fmt(Fc, 4)} N, f = ${fmt(f, 4)} Hz, T = ${fmt(T, 4)} s`
  };
}

function gravity(input) {
  const m1 = num(input, "m1", "پہلی کمیت m1", { positive: true });
  const m2 = num(input, "m2", "دوسری کمیت m2", { positive: true });
  const r = num(input, "rg", "مرکزوں کے درمیان فاصلہ r", { positive: true });
  const F = G * m1 * m2 / (r * r);
  return {
    results: [{ label: "باہمی کشش کی قوت F", value: `${fmt(F, 4)} N` }],
    steps: [
      { text: "نیوٹن کا عمومی کششِ ثقل کا قانون:", tex: `F = G\\frac{m_1 m_2}{r^2} = 6.674\\times10^{-11} \\times \\frac{${ntex(m1)} \\times ${ntex(m2)}}{(${ntex(r)})^2} = ${ntex(F, 6)}\\ N` }
    ],
    copy: `F = ${fmt(F, 4)} N`
  };
}

function orbit(input) {
  const M = num(input, "M", "مرکزی جسم کی کمیت M", { positive: true });
  const R = num(input, "R", "جسم کا نصف قطر R", { positive: true });
  const orbBy = choice(input, "orbBy", "دیا گیا", ["h", "r"], "h");
  const steps = [];
  let r;
  if (orbBy === "h") {
    const h = num(input, "ho", "بلندی h", { nonNegative: true });
    r = R + h;
    steps.push({ text: "جسم کے مرکز سے نصف قطر:", tex: `r = R + h = ${ntex(R)} + ${ntex(h)} = ${ntex(r, 6)}\\ m` });
  } else {
    r = num(input, "ro", "مرکز سے نصف قطر r", { positive: true });
    if (r < R) fail("مدار کا نصف قطر جسم کے نصف قطر سے چھوٹا ہے، اس لیے مدار جسم کے اندر سے گزرتا ہے۔", "ro");
  }
  const GM = G * M;
  const v = Math.sqrt(GM / r);
  const T = 2 * Math.PI * r / v;
  const vEsc = Math.sqrt(2 * GM / r);
  const g = GM / (r * r);
  steps.push({ text: "دائری مدار کی رفتار:", tex: `v = \\sqrt{\\frac{GM}{r}} = \\sqrt{\\frac{6.674\\times10^{-11} \\times ${ntex(M)}}{${ntex(r)}}} = ${ntex(v, 6)}\\ m/s` });
  steps.push({ text: "مدار کا دورانیہ:", tex: `T = \\frac{2\\pi r}{v} = ${ntex(T, 6)}\\ s` });
  steps.push({ text: "اخراجی رفتار:", tex: `v_{esc} = \\sqrt{2}\\,v = ${ntex(vEsc, 6)}\\ m/s` });
  steps.push({ text: "اس مدار پر مقامی کششِ ثقل:", tex: `g = \\frac{GM}{r^2} = ${ntex(g, 6)}\\ m/s^2` });
  return {
    results: [
      { label: "مرکز سے نصف قطر r", value: `${fmt(r, 4)} m` },
      { label: "مداری رفتار v", value: `${fmt(v, 4)} m/s` },
      { label: "مداری دورانیہ T", value: `${fmt(T, 4)} s` },
      { label: "منٹوں میں مداری دورانیہ", value: `${fmt(T / 60, 4)} min` },
      { label: "اخراجی رفتار", value: `${fmt(vEsc, 4)} m/s` },
      { label: "مقامی کششِ ثقل g", value: `${fmt(g, 4)} m/s²` }
    ],
    steps,
    copy: `v = ${fmt(v, 4)} m/s, T = ${fmt(T / 60, 4)} min, v_esc = ${fmt(vEsc, 4)} m/s, g = ${fmt(g, 4)} m/s²`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "حساب کی قسم", ["circular", "gravity", "orbit"], "circular");
  if (mode === "gravity") return gravity(input);
  if (mode === "orbit") return orbit(input);
  return circular(input);
}
