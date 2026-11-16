import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const G = 6.674e-11;

export const meta = {
  description: "احسب الحركة الدائرية المنتظمة من نصف القطر والسرعة أو الزمن الدوري، وقوة الجذب بين جسمين، وسرعة المدار وزمن الدورة وسرعة الإفلات والجاذبية على ارتفاع معيّن فوق سطح الكوكب.",
  keywords: ["حركة دائرية", "قوة مركزية", "تسارع مركزي", "الجذب العام", "نيوتن", "مدار", "قمر صناعي", "سرعة الإفلات", "circular motion", "gravitation", "orbit"],
  formulas: [
    { label: "الحركة الدائرية", tex: "a_c = \\frac{v^2}{r} = \\omega^2 r,\\qquad F_c = \\frac{m v^2}{r}" },
    { label: "قانون الجذب العام", tex: "F = G\\frac{m_1 m_2}{r^2},\\qquad G = 6.674\\times10^{-11}\\ \\frac{N\\,m^2}{kg^2}" },
    { label: "المدار الدائري", tex: "v = \\sqrt{\\frac{GM}{r}},\\quad T = \\frac{2\\pi r}{v},\\quad v_{esc} = \\sqrt{\\frac{2GM}{r}},\\quad g = \\frac{GM}{r^2}" }
  ],
  inputs: [
    { id: "mode", label: "نوع الحساب", type: "select", default: "circular", options: [["circular", "حركة دائرية منتظمة"], ["gravity", "قوة الجذب بين جسمين"], ["orbit", "المدار والقمر الصناعي"]] },
    { id: "speedBy", label: "المعطى مع نصف القطر", type: "select", default: "v", options: [["v", "السرعة الخطية v"], ["T", "الزمن الدوري T"]], when: { mode: ["circular"] } },
    { id: "rc", label: "نصف القطر r", unit: "m", type: "number", default: "2", when: { mode: ["circular"] } },
    { id: "vc", label: "السرعة الخطية v", unit: "m/s", type: "number", default: "3", when: { mode: ["circular"], speedBy: ["v"] } },
    { id: "Tc", label: "الزمن الدوري T", unit: "s", type: "number", default: "4.19", when: { mode: ["circular"], speedBy: ["T"] } },
    { id: "mc", label: "الكتلة m", unit: "kg", type: "number", default: "0.5", when: { mode: ["circular"] } },
    { id: "m1", label: "الكتلة الأولى m1", unit: "kg", type: "number", default: "5.972e24", when: { mode: ["gravity"] }, help: "افتراضياً كتلة الأرض." },
    { id: "m2", label: "الكتلة الثانية m2", unit: "kg", type: "number", default: "7.348e22", when: { mode: ["gravity"] }, help: "افتراضياً كتلة القمر." },
    { id: "rg", label: "المسافة بين المركزين r", unit: "m", type: "number", default: "3.844e8", when: { mode: ["gravity"] }, help: "افتراضياً المسافة بين مركزي الأرض والقمر." },
    { id: "M", label: "كتلة الجرم المركزي M", unit: "kg", type: "number", default: "5.972e24", when: { mode: ["orbit"] }, help: "افتراضياً كتلة الأرض." },
    { id: "R", label: "نصف قطر الجرم R", unit: "m", type: "number", default: "6.371e6", when: { mode: ["orbit"] }, help: "افتراضياً نصف قطر الأرض." },
    { id: "orbBy", label: "المعطى للمدار", type: "select", default: "h", options: [["h", "الارتفاع فوق السطح h"], ["r", "نصف القطر من المركز r"]], when: { mode: ["orbit"] } },
    { id: "ro", label: "نصف القطر من المركز r", unit: "m", type: "number", default: "6.771e6", when: { mode: ["orbit"], orbBy: ["r"] } },
    { id: "ho", label: "الارتفاع فوق السطح h", unit: "m", type: "number", default: "400k", when: { mode: ["orbit"], orbBy: ["h"] }, help: "مثال: ارتفاع محطة الفضاء الدولية حوالي 400 km." }
  ],
  example: {
    values: { mode: "circular", speedBy: "v", rc: "2", vc: "3", Tc: "", mc: "0.5", m1: "5.972e24", m2: "7.348e22", rg: "3.844e8", M: "5.972e24", R: "6.371e6", orbBy: "h", ro: "6.771e6", ho: "400k" },
    expect: ["Fc = 2.25 N", "ac = 4.5 m/s²"],
    note: "مثال: جسم كتلته 0.5 kg يدور على نصف قطر 2 m بسرعة 3 m/s."
  },
  invalid: { values: { mode: "circular", speedBy: "v", rc: "0", vc: "3", Tc: "", mc: "0.5", m1: "5.972e24", m2: "7.348e22", rg: "3.844e8", M: "5.972e24", R: "6.371e6", orbBy: "h", ro: "6.771e6", ho: "400k" } },
  related: ["kinematics", "projectile-motion", "work-energy", "formulas-constants"]
};

function circular(input) {
  const speedBy = choice(input, "speedBy", "المعطى", ["v", "T"], "v");
  const r = num(input, "rc", "نصف القطر r", { positive: true });
  const m = num(input, "mc", "الكتلة m", { positive: true });
  const steps = [];
  let v, T;
  if (speedBy === "v") {
    v = num(input, "vc", "السرعة الخطية v", { positive: true });
    T = 2 * Math.PI * r / v;
    steps.push({ text: "الزمن الدوري من السرعة الخطية:", tex: `T = \\frac{2\\pi r}{v} = \\frac{2\\pi \\times ${ntex(r)}}{${ntex(v)}} = ${ntex(T, 6)}\\ s` });
  } else {
    T = num(input, "Tc", "الزمن الدوري T", { positive: true });
    v = 2 * Math.PI * r / T;
    steps.push({ text: "السرعة الخطية من الزمن الدوري:", tex: `v = \\frac{2\\pi r}{T} = \\frac{2\\pi \\times ${ntex(r)}}{${ntex(T)}} = ${ntex(v, 6)}\\ m/s` });
  }
  const w = v / r;
  const f = 1 / T;
  const ac = v * v / r;
  const Fc = m * ac;
  steps.push({ text: "السرعة الزاوية:", tex: `\\omega = \\frac{v}{r} = ${ntex(w, 6)}\\ rad/s` });
  steps.push({ text: "التسارع المركزي:", tex: `a_c = \\frac{v^2}{r} = ${ntex(ac, 6)}\\ m/s^2` });
  steps.push({ text: "قوة الجذب المركزية:", tex: `F_c = m\\,a_c = ${ntex(m)} \\times ${ntex(ac, 6)} = ${ntex(Fc, 6)}\\ N` });
  return {
    results: [
      { label: "السرعة الزاوية ω", value: `${fmt(w, 4)} rad/s` },
      { label: "التسارع المركزي a_c", value: `${fmt(ac, 4)} m/s²` },
      { label: "قوة الجذب المركزية F_c", value: `${fmt(Fc, 4)} N` },
      { label: "السرعة الخطية v", value: `${fmt(v, 4)} m/s` },
      { label: "التردد f", value: `${fmt(f, 4)} Hz` },
      { label: "الزمن الدوري T", value: `${fmt(T, 4)} s` }
    ],
    steps,
    copy: `ω = ${fmt(w, 4)} rad/s, ac = ${fmt(ac, 4)} m/s², Fc = ${fmt(Fc, 4)} N, f = ${fmt(f, 4)} Hz, T = ${fmt(T, 4)} s`
  };
}

function gravity(input) {
  const m1 = num(input, "m1", "الكتلة الأولى m1", { positive: true });
  const m2 = num(input, "m2", "الكتلة الثانية m2", { positive: true });
  const r = num(input, "rg", "المسافة بين المركزين r", { positive: true });
  const F = G * m1 * m2 / (r * r);
  return {
    results: [{ label: "قوة الجذب المتبادلة F", value: `${fmt(F, 4)} N` }],
    steps: [
      { text: "قانون الجذب العام لنيوتن:", tex: `F = G\\frac{m_1 m_2}{r^2} = 6.674\\times10^{-11} \\times \\frac{${ntex(m1)} \\times ${ntex(m2)}}{(${ntex(r)})^2} = ${ntex(F, 6)}\\ N` }
    ],
    copy: `F = ${fmt(F, 4)} N`
  };
}

function orbit(input) {
  const M = num(input, "M", "كتلة الجرم المركزي M", { positive: true });
  const R = num(input, "R", "نصف قطر الجرم R", { positive: true });
  const orbBy = choice(input, "orbBy", "المعطى", ["h", "r"], "h");
  const steps = [];
  let r;
  if (orbBy === "h") {
    const h = num(input, "ho", "الارتفاع h", { nonNegative: true });
    r = R + h;
    steps.push({ text: "نصف القطر من مركز الجرم:", tex: `r = R + h = ${ntex(R)} + ${ntex(h)} = ${ntex(r, 6)}\\ m` });
  } else {
    r = num(input, "ro", "نصف القطر من المركز r", { positive: true });
    if (r < R) fail("نصف قطر المدار أصغر من نصف قطر الجرم، فالمدار يمر داخله.", "ro");
  }
  const GM = G * M;
  const v = Math.sqrt(GM / r);
  const T = 2 * Math.PI * r / v;
  const vEsc = Math.sqrt(2 * GM / r);
  const g = GM / (r * r);
  steps.push({ text: "سرعة المدار الدائري:", tex: `v = \\sqrt{\\frac{GM}{r}} = \\sqrt{\\frac{6.674\\times10^{-11} \\times ${ntex(M)}}{${ntex(r)}}} = ${ntex(v, 6)}\\ m/s` });
  steps.push({ text: "زمن الدورة:", tex: `T = \\frac{2\\pi r}{v} = ${ntex(T, 6)}\\ s` });
  steps.push({ text: "سرعة الإفلات:", tex: `v_{esc} = \\sqrt{2}\\,v = ${ntex(vEsc, 6)}\\ m/s` });
  steps.push({ text: "الجاذبية المحلية على هذا المدار:", tex: `g = \\frac{GM}{r^2} = ${ntex(g, 6)}\\ m/s^2` });
  return {
    results: [
      { label: "نصف القطر من المركز r", value: `${fmt(r, 4)} m` },
      { label: "سرعة المدار v", value: `${fmt(v, 4)} m/s` },
      { label: "زمن الدورة T", value: `${fmt(T, 4)} s` },
      { label: "زمن الدورة بالدقائق", value: `${fmt(T / 60, 4)} min` },
      { label: "سرعة الإفلات", value: `${fmt(vEsc, 4)} m/s` },
      { label: "الجاذبية المحلية g", value: `${fmt(g, 4)} m/s²` }
    ],
    steps,
    copy: `v = ${fmt(v, 4)} m/s, T = ${fmt(T / 60, 4)} min, v_esc = ${fmt(vEsc, 4)} m/s, g = ${fmt(g, 4)} m/s²`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "نوع الحساب", ["circular", "gravity", "orbit"], "circular");
  if (mode === "gravity") return gravity(input);
  if (mode === "orbit") return orbit(input);
  return circular(input);
}
