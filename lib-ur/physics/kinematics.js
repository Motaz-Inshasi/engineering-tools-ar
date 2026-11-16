import { fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const IDS = ["v0", "v", "a", "t", "x"];
const NAMES = { v0: "ابتدائی رفتار v0", v: "آخری رفتار v", a: "اسراع a", t: "وقت t", x: "نقل مکانی x" };
const UNITS = { v0: "m/s", v: "m/s", a: "m/s²", t: "s", x: "m" };
const T = (x) => ntex(x, 6);
const S = (x) => `(${T(x)})`;

function quadTex(A, B, C, t) {
  return `${T(A)}t^2 + ${S(B)}t + ${S(C)} = 0 \\Rightarrow t = ${T(t)}\\ s`;
}

function quadraticRoot(A, B, C, field) {
  const D = B * B - 4 * A * C;
  if (D < 0) fail("کوئی حقیقی حرکت ان معطیات کو پورا نہیں کرتی۔", field);
  const q = Math.sqrt(D);
  const roots = [(-B - q) / (2 * A), (-B + q) / (2 * A)].filter((r) => r > 0);
  if (roots.length === 0) fail("ان معطیات کے لیے کوئی مثبت وقت موجود نہیں۔", field);
  return Math.min(...roots);
}

export const meta = {
  description: "مستقل اسراع کے ساتھ حرکت کی مساواتیں حل کرتا ہے: v0، v، a، t اور x میں سے تین قدریں درج کریں، تو باقی دو مراحل کے ساتھ حساب ہوں گی، ساتھ v(t) اور x(t) کے گراف۔",
  keywords: ["حرکت کی مساواتیں", "سووات", "SUVAT", "مستقل اسراع", "رفتار", "نقل مکانی", "وقت", "kinematics"],
  formulas: [
    { label: "مستقل اسراع کے ساتھ حرکت کی مساواتیں", tex: "v = v_0 + at,\\qquad x = v_0 t + \\tfrac{1}{2}at^2,\\qquad v^2 = v_0^2 + 2ax" },
    { label: "اوسط رفتار", tex: "x = \\frac{v_0 + v}{2}\\,t" }
  ],
  inputs: [
    { id: "v0", label: "ابتدائی رفتار v0", unit: "m/s", type: "number", help: "پانچ قدروں میں سے ٹھیک تین درج کریں اور باقی خالی چھوڑ دیں۔" },
    { id: "v", label: "آخری رفتار v", unit: "m/s", type: "number" },
    { id: "a", label: "اسراع a", unit: "m/s²", type: "number", help: "مثبت اسراع اور منفی سست روی ہے۔" },
    { id: "t", label: "وقت t", unit: "s", type: "number" },
    { id: "x", label: "نقل مکانی x", unit: "m", type: "number" }
  ],
  example: { values: { v0: "0", v: "", a: "9.81", t: "3", x: "" }, expect: ["v = 29.43 m/s", "x = 44.145 m"], note: "مثال: جسم ساکن حالت سے 3 s تک 9.81 m/s² کے اسراع سے شروع ہوتا ہے۔" },
  invalid: { values: { v0: "5", v: "10", a: "2", t: "3", x: "" } },
  related: ["projectile-motion", "inclined-plane", "work-energy", "formulas-constants"]
};

export function solve(input) {
  const given = IDS.filter((k) => !isBlank(input[k]));
  if (given.length !== 3) {
    const field = given.length > 3 ? given[3] : IDS.find((k) => isBlank(input[k]));
    fail(`پانچ قدروں میں سے ٹھیک تین درج کریں (آپ نے ${given.length} درج کی ہیں)۔`, field);
  }
  const u = {};
  for (const k of given) u[k] = num(input, k, NAMES[k], k === "t" ? { positive: true } : {});
  let { v0, v, a, t, x } = u;
  const steps = [];
  switch (given.join("")) {
    case "v0va": {
      if (a === 0) {
        if (v !== v0) fail("جب a = 0 ہو تو v کو ابتدائی رفتار v0 کے برابر ہونا چاہیے۔", "v");
        fail("جب a = 0 اور v = v0 ہو تو ان معطیات سے وقت یا نقل مکانی متعین نہیں کی جا سکتی۔", "a");
      }
      t = (v - v0) / a;
      if (!(t > 0)) fail("حاصل وقت مثبت نہیں ہے، اس لیے یہ معطیات مستقبل کی حرکت بیان نہیں کرتیں۔", "a");
      x = (v * v - v0 * v0) / (2 * a);
      steps.push({ text: "رفتار کی مساوات v = v0 + at سے ہم وقت نکالتے ہیں:", tex: `t = \\frac{v - v_0}{a} = \\frac{${S(v)} - ${S(v0)}}{${S(a)}} = ${T(t)}\\ s` });
      steps.push({ text: "وقت سے آزاد مساوات v² = v0² + 2ax سے ہم نقل مکانی نکالتے ہیں:", tex: `x = \\frac{v^2 - v_0^2}{2a} = ${T(x)}\\ m` });
      break;
    }
    case "v0vt": {
      a = (v - v0) / t;
      x = ((v0 + v) / 2) * t;
      steps.push({ text: "رفتار کی مساوات v = v0 + at سے ہم اسراع نکالتے ہیں:", tex: `a = \\frac{v - v_0}{t} = \\frac{${S(v)} - ${S(v0)}}{${T(t)}} = ${T(a)}\\ m/s^2` });
      steps.push({ text: "مستقل اسراع کی حرکت میں اوسط رفتار نقل مکانی دیتی ہے:", tex: `x = \\frac{v_0 + v}{2}\\,t = ${T(x)}\\ m` });
      break;
    }
    case "v0vx": {
      if (v0 + v === 0) fail("v0 اور v کا مجموعہ صفر ہے، اس لیے نقل مکانی سے وقت متعین نہیں کیا جا سکتا۔", "x");
      t = (2 * x) / (v0 + v);
      if (!(t > 0)) fail("نقل مکانی دی گئی دو رفتاروں سے مطابقت نہیں رکھتی کیونکہ حاصل وقت مثبت نہیں ہے۔", "x");
      a = (v - v0) / t;
      steps.push({ text: "x = (v0 + v)t / 2 سے ہم وقت نکالتے ہیں:", tex: `t = \\frac{2x}{v_0 + v} = ${T(t)}\\ s` });
      steps.push({ text: "رفتار کی مساوات سے ہم اسراع نکالتے ہیں:", tex: `a = \\frac{v - v_0}{t} = ${T(a)}\\ m/s^2` });
      break;
    }
    case "v0at": {
      v = v0 + a * t;
      x = v0 * t + 0.5 * a * t * t;
      steps.push({ text: "رفتار کی مساوات:", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      steps.push({ text: "نقل مکانی کی مساوات:", tex: `x = v_0 t + \\frac{1}{2}at^2 = ${T(x)}\\ m` });
      break;
    }
    case "v0ax": {
      if (a === 0) {
        if (v0 === 0) fail("جب a = 0 اور v0 = 0 ہو تو جسم حرکت نہیں کرتا، اس لیے وقت متعین نہیں ہو سکتا۔", "v0");
        t = x / v0;
        if (!(t > 0)) fail("نقل مکانی اور ابتدائی رفتار کی علامتیں مختلف ہیں، اس لیے کوئی مثبت وقت موجود نہیں۔", "x");
        steps.push({ text: "جب a = 0 ہو تو نقل مکانی کی مساوات خطی ہو جاتی ہے: x = v0 t", tex: `t = \\frac{x}{v_0} = ${T(t)}\\ s` });
      } else {
        t = quadraticRoot(a / 2, v0, -x, "x");
        steps.push({ text: "ہم مساوات x = v0 t + ½at² حل کرتے ہیں اور سب سے چھوٹی مثبت جڑ لیتے ہیں:", tex: quadTex(a / 2, v0, -x, t) });
      }
      v = v0 + a * t;
      steps.push({ text: "رفتار کی مساوات:", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      break;
    }
    case "v0tx": {
      a = (2 * (x - v0 * t)) / (t * t);
      v = v0 + a * t;
      steps.push({ text: "x = v0 t + ½at² سے ہم اسراع نکالتے ہیں:", tex: `a = \\frac{2(x - v_0 t)}{t^2} = ${T(a)}\\ m/s^2` });
      steps.push({ text: "رفتار کی مساوات:", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      break;
    }
    case "vat": {
      v0 = v - a * t;
      x = v * t - 0.5 * a * t * t;
      steps.push({ text: "ابتدائی رفتار معلوم کرنے کے لیے رفتار کی مساوات کو الٹا کرنا:", tex: `v_0 = v - at = ${T(v0)}\\ m/s` });
      steps.push({ text: "آخری رفتار کے لحاظ سے نقل مکانی کی مساوات:", tex: `x = vt - \\frac{1}{2}at^2 = ${T(x)}\\ m` });
      break;
    }
    case "vax": {
      if (a === 0) {
        if (v === 0) fail("جب a = 0 اور v = 0 ہو تو وقت متعین نہیں کیا جا سکتا۔", "v");
        t = x / v;
        if (!(t > 0)) fail("نقل مکانی اور آخری رفتار کی علامتیں مختلف ہیں، اس لیے کوئی مثبت وقت موجود نہیں۔", "x");
        steps.push({ text: "جب a = 0 ہو تو نقل مکانی کی مساوات خطی ہو جاتی ہے: x = vt", tex: `t = \\frac{x}{v} = ${T(t)}\\ s` });
      } else {
        t = quadraticRoot(a / 2, -v, x, "x");
        steps.push({ text: "ہم مساوات x = vt - ½at² حل کرتے ہیں اور سب سے چھوٹی مثبت جڑ لیتے ہیں:", tex: quadTex(a / 2, -v, x, t) });
      }
      v0 = v - a * t;
      steps.push({ text: "ابتدائی رفتار معلوم کرنے کے لیے رفتار کی مساوات کو الٹا کرنا:", tex: `v_0 = v - at = ${T(v0)}\\ m/s` });
      break;
    }
    case "vtx": {
      v0 = (2 * x) / t - v;
      a = (v - v0) / t;
      steps.push({ text: "x = (v0 + v)t / 2 سے ہم ابتدائی رفتار نکالتے ہیں:", tex: `v_0 = \\frac{2x}{t} - v = ${T(v0)}\\ m/s` });
      steps.push({ text: "رفتار کی مساوات سے ہم اسراع نکالتے ہیں:", tex: `a = \\frac{v - v_0}{t} = ${T(a)}\\ m/s^2` });
      break;
    }
    case "atx": {
      v0 = (x - 0.5 * a * t * t) / t;
      v = v0 + a * t;
      steps.push({ text: "x = v0 t + ½at² سے ہم ابتدائی رفتار نکالتے ہیں:", tex: `v_0 = \\frac{x - \\frac{1}{2}at^2}{t} = ${T(v0)}\\ m/s` });
      steps.push({ text: "رفتار کی مساوات:", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      break;
    }
  }
  const vals = { v0, v, a, t, x };
  const results = IDS.map((k) => ({
    label: `${NAMES[k]} ${given.includes(k) ? "(دیا گیا)" : "(حساب شدہ)"}`,
    value: `${fmt(vals[k], 6)} ${UNITS[k]}`
  }));
  const copy = `v = ${fmt(v)} m/s، x = ${fmt(x)} m، t = ${fmt(t)} s، a = ${fmt(a)} m/s²`;
  const N = 60;
  const ts = Array.from({ length: N + 1 }, (_, i) => (t * i) / N);
  const blocks = [
    { type: "plot", title: "وقت کے مقابلے میں رفتار v(t)", xLabel: "t (s)", yLabel: "v (m/s)", includeZero: true, series: [{ name: "v(t)", points: ts.map((s) => [s, v0 + a * s]) }] },
    { type: "plot", title: "وقت کے مقابلے میں نقل مکانی x(t)", xLabel: "t (s)", yLabel: "x (m)", includeZero: true, series: [{ name: "x(t)", points: ts.map((s) => [s, v0 * s + 0.5 * a * s * s]) }] }
  ];
  return { results, steps, copy, blocks, values: vals };
}
