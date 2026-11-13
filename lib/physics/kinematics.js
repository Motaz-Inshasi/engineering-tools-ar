import { fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const IDS = ["v0", "v", "a", "t", "x"];
const NAMES = { v0: "السرعة الابتدائية v0", v: "السرعة النهائية v", a: "التسارع a", t: "الزمن t", x: "الإزاحة x" };
const UNITS = { v0: "m/s", v: "m/s", a: "m/s²", t: "s", x: "m" };
const T = (x) => ntex(x, 6);
const S = (x) => `(${T(x)})`;

function quadTex(A, B, C, t) {
  return `${T(A)}t^2 + ${S(B)}t + ${S(C)} = 0 \\Rightarrow t = ${T(t)}\\ s`;
}

function quadraticRoot(A, B, C, field) {
  const D = B * B - 4 * A * C;
  if (D < 0) fail("لا توجد حركة حقيقية تحقق هذه المعطيات.", field);
  const q = Math.sqrt(D);
  const roots = [(-B - q) / (2 * A), (-B + q) / (2 * A)].filter((r) => r > 0);
  if (roots.length === 0) fail("لا يوجد زمن موجب يحقق هذه المعطيات.", field);
  return Math.min(...roots);
}

export const meta = {
  description: "حل معادلات الحركة بتسارع ثابت: أدخل ثلاث قيم من v0 وv وa وt وx فتُحسب القيمتان الباقيتان مع الخطوات ورسم v(t) وx(t).",
  keywords: ["معادلات الحركة", "سوفات", "SUVAT", "تسارع ثابت", "سرعة", "إزاحة", "زمن", "kinematics"],
  formulas: [
    { label: "معادلات الحركة بتسارع ثابت", tex: "v = v_0 + at,\\qquad x = v_0 t + \\tfrac{1}{2}at^2,\\qquad v^2 = v_0^2 + 2ax" },
    { label: "متوسط السرعة", tex: "x = \\frac{v_0 + v}{2}\\,t" }
  ],
  inputs: [
    { id: "v0", label: "السرعة الابتدائية v0", unit: "m/s", type: "number", help: "أدخل ثلاث قيم بالضبط من الخمس واترك الباقي فارغاً." },
    { id: "v", label: "السرعة النهائية v", unit: "m/s", type: "number" },
    { id: "a", label: "التسارع a", unit: "m/s²", type: "number", help: "الموجب تسارع والسالب تباطؤ." },
    { id: "t", label: "الزمن t", unit: "s", type: "number" },
    { id: "x", label: "الإزاحة x", unit: "m", type: "number" }
  ],
  example: { values: { v0: "0", v: "", a: "9.81", t: "3", x: "" }, expect: ["v = 29.43 m/s", "x = 44.145 m"], note: "مثال: جسم يبدأ من السكون بتسارع 9.81 m/s² لمدة 3 s." },
  invalid: { values: { v0: "5", v: "10", a: "2", t: "3", x: "" } },
  related: ["projectile-motion", "inclined-plane", "work-energy", "formulas-constants"]
};

export function solve(input) {
  const given = IDS.filter((k) => !isBlank(input[k]));
  if (given.length !== 3) {
    const field = given.length > 3 ? given[3] : IDS.find((k) => isBlank(input[k]));
    fail(`أدخل ثلاث قيم بالضبط من الخمس (أدخلت ${given.length}).`, field);
  }
  const u = {};
  for (const k of given) u[k] = num(input, k, NAMES[k], k === "t" ? { positive: true } : {});
  let { v0, v, a, t, x } = u;
  const steps = [];
  switch (given.join("")) {
    case "v0va": {
      if (a === 0) {
        if (v !== v0) fail("عند a = 0 يجب أن تساوي v السرعة الابتدائية v0.", "v");
        fail("عند a = 0 و v = v0 لا يمكن تحديد الزمن أو الإزاحة من هذه المعطيات.", "a");
      }
      t = (v - v0) / a;
      if (!(t > 0)) fail("الزمن الناتج غير موجب، فالمعطيات لا تصف حركة في المستقبل.", "a");
      x = (v * v - v0 * v0) / (2 * a);
      steps.push({ text: "من معادلة السرعة v = v0 + at نحسب الزمن:", tex: `t = \\frac{v - v_0}{a} = \\frac{${S(v)} - ${S(v0)}}{${S(a)}} = ${T(t)}\\ s` });
      steps.push({ text: "من المعادلة الخالية من الزمن v² = v0² + 2ax نحسب الإزاحة:", tex: `x = \\frac{v^2 - v_0^2}{2a} = ${T(x)}\\ m` });
      break;
    }
    case "v0vt": {
      a = (v - v0) / t;
      x = ((v0 + v) / 2) * t;
      steps.push({ text: "من معادلة السرعة v = v0 + at نحسب التسارع:", tex: `a = \\frac{v - v_0}{t} = \\frac{${S(v)} - ${S(v0)}}{${T(t)}} = ${T(a)}\\ m/s^2` });
      steps.push({ text: "متوسط السرعة في الحركة بتسارع ثابت يعطي الإزاحة:", tex: `x = \\frac{v_0 + v}{2}\\,t = ${T(x)}\\ m` });
      break;
    }
    case "v0vx": {
      if (v0 + v === 0) fail("مجموع v0 و v يساوي صفراً، فلا يمكن تحديد الزمن من الإزاحة.", "x");
      t = (2 * x) / (v0 + v);
      if (!(t > 0)) fail("الإزاحة لا تتفق مع السرعتين المعطاتين لأن الزمن الناتج غير موجب.", "x");
      a = (v - v0) / t;
      steps.push({ text: "من x = (v0 + v)t / 2 نحسب الزمن:", tex: `t = \\frac{2x}{v_0 + v} = ${T(t)}\\ s` });
      steps.push({ text: "من معادلة السرعة نحسب التسارع:", tex: `a = \\frac{v - v_0}{t} = ${T(a)}\\ m/s^2` });
      break;
    }
    case "v0at": {
      v = v0 + a * t;
      x = v0 * t + 0.5 * a * t * t;
      steps.push({ text: "معادلة السرعة:", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      steps.push({ text: "معادلة الإزاحة:", tex: `x = v_0 t + \\frac{1}{2}at^2 = ${T(x)}\\ m` });
      break;
    }
    case "v0ax": {
      if (a === 0) {
        if (v0 === 0) fail("عند a = 0 و v0 = 0 لا يتحرك الجسم، فلا يمكن تحديد الزمن.", "v0");
        t = x / v0;
        if (!(t > 0)) fail("الإزاحة والسرعة الابتدائية بإشارتين مختلفتين، فلا يوجد زمن موجب.", "x");
        steps.push({ text: "عند a = 0 تصبح معادلة الإزاحة خطية: x = v0 t", tex: `t = \\frac{x}{v_0} = ${T(t)}\\ s` });
      } else {
        t = quadraticRoot(a / 2, v0, -x, "x");
        steps.push({ text: "نحل المعادلة x = v0 t + ½at² ونأخذ أصغر جذر موجب:", tex: quadTex(a / 2, v0, -x, t) });
      }
      v = v0 + a * t;
      steps.push({ text: "معادلة السرعة:", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      break;
    }
    case "v0tx": {
      a = (2 * (x - v0 * t)) / (t * t);
      v = v0 + a * t;
      steps.push({ text: "من x = v0 t + ½at² نحسب التسارع:", tex: `a = \\frac{2(x - v_0 t)}{t^2} = ${T(a)}\\ m/s^2` });
      steps.push({ text: "معادلة السرعة:", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      break;
    }
    case "vat": {
      v0 = v - a * t;
      x = v * t - 0.5 * a * t * t;
      steps.push({ text: "معادلة السرعة مقلوبة لإيجاد السرعة الابتدائية:", tex: `v_0 = v - at = ${T(v0)}\\ m/s` });
      steps.push({ text: "معادلة الإزاحة بدلالة السرعة النهائية:", tex: `x = vt - \\frac{1}{2}at^2 = ${T(x)}\\ m` });
      break;
    }
    case "vax": {
      if (a === 0) {
        if (v === 0) fail("عند a = 0 و v = 0 لا يمكن تحديد الزمن.", "v");
        t = x / v;
        if (!(t > 0)) fail("الإزاحة والسرعة النهائية بإشارتين مختلفتين، فلا يوجد زمن موجب.", "x");
        steps.push({ text: "عند a = 0 تصبح معادلة الإزاحة خطية: x = vt", tex: `t = \\frac{x}{v} = ${T(t)}\\ s` });
      } else {
        t = quadraticRoot(a / 2, -v, x, "x");
        steps.push({ text: "نحل المعادلة x = vt - ½at² ونأخذ أصغر جذر موجب:", tex: quadTex(a / 2, -v, x, t) });
      }
      v0 = v - a * t;
      steps.push({ text: "معادلة السرعة مقلوبة لإيجاد السرعة الابتدائية:", tex: `v_0 = v - at = ${T(v0)}\\ m/s` });
      break;
    }
    case "vtx": {
      v0 = (2 * x) / t - v;
      a = (v - v0) / t;
      steps.push({ text: "من x = (v0 + v)t / 2 نحسب السرعة الابتدائية:", tex: `v_0 = \\frac{2x}{t} - v = ${T(v0)}\\ m/s` });
      steps.push({ text: "من معادلة السرعة نحسب التسارع:", tex: `a = \\frac{v - v_0}{t} = ${T(a)}\\ m/s^2` });
      break;
    }
    case "atx": {
      v0 = (x - 0.5 * a * t * t) / t;
      v = v0 + a * t;
      steps.push({ text: "من x = v0 t + ½at² نحسب السرعة الابتدائية:", tex: `v_0 = \\frac{x - \\frac{1}{2}at^2}{t} = ${T(v0)}\\ m/s` });
      steps.push({ text: "معادلة السرعة:", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      break;
    }
  }
  const vals = { v0, v, a, t, x };
  const results = IDS.map((k) => ({
    label: `${NAMES[k]} ${given.includes(k) ? "(معطى)" : "(محسوب)"}`,
    value: `${fmt(vals[k], 6)} ${UNITS[k]}`
  }));
  const copy = `v = ${fmt(v)} m/s، x = ${fmt(x)} m، t = ${fmt(t)} s، a = ${fmt(a)} m/s²`;
  const N = 60;
  const ts = Array.from({ length: N + 1 }, (_, i) => (t * i) / N);
  const blocks = [
    { type: "plot", title: "السرعة مقابل الزمن v(t)", xLabel: "t (s)", yLabel: "v (m/s)", includeZero: true, series: [{ name: "v(t)", points: ts.map((s) => [s, v0 + a * s]) }] },
    { type: "plot", title: "الإزاحة مقابل الزمن x(t)", xLabel: "t (s)", yLabel: "x (m)", includeZero: true, series: [{ name: "x(t)", points: ts.map((s) => [s, v0 * s + 0.5 * a * s * s]) }] }
  ];
  return { results, steps, copy, blocks, values: vals };
}
