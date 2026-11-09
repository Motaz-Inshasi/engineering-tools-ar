import { readTF, tfTex, polesZeros } from "../signals/common.js";
import { numx as num } from "../core/numexpr.js";
import { fail } from "../core/validate.js";
import { padd, peval, roots, trim } from "../core/polynomial.js";
import { cabs } from "../core/complex.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "احسب خطأ الحالة المستقرة لنظام تغذية راجعة أحادية: نوع النظام وثوابت الخطأ Kp و Kv و Ka والخطأ لدخل الخطوة والمنحدر والقطع المكافئ، مع التحقق من استقرار الحلقة المغلقة أولاً.",
  keywords: ["خطأ الحالة المستقرة", "steady state error", "نوع النظام", "ثابت الخطأ", "Kp", "Kv", "Ka", "تغذية راجعة"],
  formulas: [
    { label: "ثوابت الخطأ", tex: "K_p = \\lim_{s\\to0}G(s),\\quad K_v = \\lim_{s\\to0}sG(s),\\quad K_a = \\lim_{s\\to0}s^2G(s)" },
    { label: "الخطأ لكل دخل بسعة A", tex: "e_{step} = \\frac{A}{1+K_p},\\quad e_{ramp} = \\frac{A}{K_v},\\quad e_{parabola} = \\frac{A}{K_a}" }
  ],
  inputs: [
    { id: "G", label: "دالة الحلقة المفتوحة G(s)", type: "expr", default: "10(s + 2)/(s(s + 1)(s + 5))", help: "مع تغذية راجعة أحادية: T(s) = G/(1+G)." },
    { id: "A", label: "سعة الدخل A", type: "number", default: "1" }
  ],
  example: { values: { G: "10(s + 2)/(s(s + 1)(s + 5))", A: "1" }, expect: ["e_ramp = 0.25"], note: "مثال: نظام من النوع 1، فخطأ الخطوة صفر وخطأ المنحدر $1/K_v$." },
  invalid: { values: { G: "1/(s - 1)", A: "1" } },
  related: ["bode-plot", "routh-hurwitz", "transfer-function", "step-response"]
};

export function errorConstants(tf) {
  let den = trim(tf.den), N = 0;
  while (den.length > 1 && Math.abs(den[0]) < 1e-12 * Math.max(...den.map(Math.abs))) { den = den.slice(1); N++; }
  const g0 = peval(tf.num, 0) / den[0];
  const K = [0, 1, 2].map((k) => (N > k ? Infinity : N === k ? g0 : 0));
  return { type: N, Kp: K[0], Kv: K[1], Ka: K[2], g0 };
}

export function solve(input) {
  const tf = readTF(input, "G", "دالة الحلقة المفتوحة");
  const A = num(input, "A", "سعة الدخل", { nonZero: true });
  const charPoly = padd(tf.den, tf.num);
  const cl = roots(charPoly);
  const unstable = cl.filter((r) => r.re >= -1e-9);
  const steps = [
    { text: "دالة الحلقة المفتوحة:", tex: `G(s) = ${tfTex(tf)}` },
    { text: "نتحقق أولاً من استقرار الحلقة المغلقة بإيجاد جذور المعادلة المميزة $1 + G(s) = 0$:", tex: `D(s) + N(s) = 0` }
  ];
  if (unstable.length) {
    fail(`الحلقة المغلقة غير مستقرة (${unstable.length} جذر على المحور التخيلي أو يمينه)، فلا معنى لخطأ الحالة المستقرة.`, "G");
  }
  steps.push(`كل جذور الحلقة المغلقة في النصف الأيسر (أبطؤها عند Re = ${fmt(Math.max(...cl.map((r) => r.re)), 5)})، فالنظام مستقر ونكمل.`);
  const c = errorConstants(tf);
  steps.push(`عدد الأقطاب عند الأصل = ${c.type}، فالنظام من النوع ${c.type}.`);
  const kTex = (v) => (v === Infinity ? "\\infty" : ntex(v, 6));
  steps.push({ text: "ثوابت الخطأ:", tex: `K_p = ${kTex(c.Kp)},\\quad K_v = ${kTex(c.Kv)},\\quad K_a = ${kTex(c.Ka)}` });
  const e = (k, kind) => (kind === "step" ? A / (1 + k) : k === Infinity ? 0 : k === 0 ? Infinity : A / k);
  const es = e(c.Kp, "step"), er = e(c.Kv, "ramp"), ep = e(c.Ka, "par");
  steps.push({ text: `نعوّض في القوانين مع A = ${fmt(A)}:`, tex: `e_{step} = ${kTex(es)},\\quad e_{ramp} = ${kTex(er)},\\quad e_{parabola} = ${kTex(ep)}` });
  steps.push("الخطأ ∞ يعني أن المخرج لا يستطيع ملاحقة الدخل ويتزايد الفرق مع الزمن.");
  const show = (v) => (v === Infinity ? "∞" : fmt(v, 6));
  return {
    results: [
      { label: "نوع النظام", value: c.type },
      { label: "Kp", value: show(c.Kp) },
      { label: "Kv", value: show(c.Kv) },
      { label: "Ka", value: show(c.Ka) },
      { label: "خطأ الخطوة", value: show(es), text: `e_step = ${show(es)}` },
      { label: "خطأ المنحدر", value: show(er), text: `e_ramp = ${show(er)}` },
      { label: "خطأ القطع المكافئ", value: show(ep), text: `e_parabola = ${show(ep)}` }
    ],
    steps,
    copy: `type ${c.type}: e_step = ${show(es)}, e_ramp = ${show(er)}, e_parabola = ${show(ep)}`
  };
}

export { cabs };
