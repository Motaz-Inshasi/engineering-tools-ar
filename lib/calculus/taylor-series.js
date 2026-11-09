import { simplify, diff, fromPoly } from "../core/symbolic.js";
import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, niceTex, nice, toFraction } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "اكتب متسلسلة تايلور أو ماكلورين لأي دالة حتى الرتبة 10: المشتقات المتتالية وقيمها عند المركز والمعاملات، مع رسم يقارن الدالة بكثيرة الحدود التقريبية.",
  keywords: ["تايلور", "ماكلورين", "taylor", "maclaurin", "متسلسلة", "تقريب", "كثيرة حدود تايلور"],
  formulas: [
    { label: "متسلسلة تايلور حول النقطة a (ماكلورين عندما a = 0)", tex: "f(x) \\approx \\sum_{k=0}^{n} \\frac{f^{(k)}(a)}{k!}(x-a)^k" }
  ],
  inputs: [
    { id: "f", label: "الدالة", type: "expr", placeholder: "e^x" },
    { id: "v", label: "المتغير", type: "text", default: "x" },
    { id: "a", label: "مركز التوسيع a", type: "number", default: "0", help: "0 يعطي متسلسلة ماكلورين." },
    { id: "n", label: "الرتبة n", type: "number", default: "5", help: "من 1 إلى 10" },
    { id: "x0", label: "نقطة لاختبار التقريب (اختياري)", type: "number" }
  ],
  example: { values: { f: "e^x", v: "x", a: "0", n: "4", x0: "0.5" }, expect: ["x^4/24"], note: "مثال: متسلسلة ماكلورين لـ $e^x$ حتى الرتبة 4." },
  invalid: { values: { f: "cos(x)", n: "50" } },
  related: ["derivative", "limit", "function-plotter"]
};

function fact(k) {
  let r = 1;
  for (let i = 2; i <= k; i++) r *= i;
  return r;
}

function shiftedTex(coeffs, v, a) {
  const base = a === 0 ? v : `\\left(${v} ${a < 0 ? "+" : "-"} ${niceTex(Math.abs(a))}\\right)`;
  let s = "";
  coeffs.forEach((c, k) => {
    if (Math.abs(c) < 1e-14) return;
    const sign = c < 0 ? (s ? " - " : "-") : s ? " + " : "";
    const ac = Math.abs(c);
    const fr = toFraction(ac, 100000, 1e-10);
    let coef;
    if (k === 0) coef = niceTex(ac, 8);
    else if (fr && fr[0] === 1 && fr[1] !== 1) coef = `\\frac{1}{${fr[1]}}`;
    else coef = Math.abs(ac - 1) < 1e-12 ? "" : fr && fr[1] <= 100000 ? (fr[1] === 1 ? String(fr[0]) : `\\frac{${fr[0]}}{${fr[1]}}`) : ntex(ac, 8);
    const pw = k === 0 ? "" : k === 1 ? base : `${base}^{${k}}`;
    s += `${sign}${coef}${coef && pw && !coef.startsWith("\\frac") ? " " : ""}${pw}`;
  });
  return s || "0";
}

function shiftedText(coeffs, v, a) {
  const base = a === 0 ? v : `(${v} ${a < 0 ? "+" : "-"} ${fmt(Math.abs(a))})`;
  const parts = [];
  coeffs.forEach((c, k) => {
    if (Math.abs(c) < 1e-14) return;
    const ac = Math.abs(c);
    const fr = toFraction(ac, 100000, 1e-10);
    let t;
    if (k === 0) t = nice(ac, 8);
    else {
      const pw = k === 1 ? base : `${base}^${k}`;
      if (fr && fr[0] === 1 && fr[1] !== 1) t = `${pw}/${fr[1]}`;
      else if (Math.abs(ac - 1) < 1e-12) t = pw;
      else t = `${fr ? (fr[1] === 1 ? fr[0] : `${fr[0]}/${fr[1]}`) : fmt(ac, 8)}*${pw}`;
    }
    parts.push(`${c < 0 ? "- " : parts.length ? "+ " : ""}${t}`);
  });
  return parts.join(" ") || "0";
}

export function taylorCoefficients(f, v, a, n) {
  const derivs = [f];
  const values = [];
  let cur = f;
  for (let k = 0; k <= n; k++) {
    if (k > 0) {
      cur = diff(cur, v);
      if (toText(cur).length > 4000) fail("المشتقات أصبحت طويلة جداً لهذه الرتبة. جرّب رتبة أصغر.", "n");
      derivs.push(cur);
    }
    const val = f1(cur, v)(a);
    if (!isFinite(val)) fail(`الدالة أو مشتقتها رقم ${k} غير معرّفة عند ${v} = ${fmt(a)}، فلا توجد متسلسلة تايلور حول هذه النقطة.`, "a");
    values.push(Math.abs(val) < 1e-13 ? 0 : val);
  }
  return { derivs, values, coeffs: values.map((x, k) => x / fact(k)) };
}

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const a = num(input, "a", "مركز التوسيع");
  const n = num(input, "n", "الرتبة", { integer: true, min: 1, max: 10 });
  const x0 = num(input, "x0", "نقطة الاختبار", { optional: true });
  const { derivs, values, coeffs } = taylorCoefficients(f, v, a, n);
  const rows = derivs.map((d, k) => [String(k), { tex: k === 0 ? `f(${v}) = ${toTex(d)}` : `f^{(${k})}(${v}) = ${toTex(d)}` }, { tex: niceTex(values[k], 8) }, { tex: niceTex(coeffs[k], 8) }]);
  const steps = [
    `نحسب المشتقات المتتالية حتى الرتبة ${n}، ثم نعوّض ${v} = ${fmt(a)} في كل منها (انظر الجدول).`,
    { text: "نقسم كل قيمة على $k!$ لنحصل على المعامل، ثم نجمع الحدود:", tex: `${a === 0 ? "\\text{Maclaurin}" : "\\text{Taylor}"}:\\; f(${v}) \\approx ${shiftedTex(coeffs, v, a)}` }
  ];
  const P = (x) => coeffs.reduce((s, c, k) => s + c * Math.pow(x - a, k), 0);
  const F = f1(f, v);
  const results = [{ label: `كثيرة حدود تايلور من الرتبة ${n}`, tex: `P_{${n}}(${v}) = ${shiftedTex(coeffs, v, a)}`, text: shiftedText(coeffs, v, a) }];
  if (x0 !== null) {
    const px = P(x0), fx = F(x0);
    results.push({ label: `التقريب عند ${v} = ${fmt(x0)}`, value: px, sig: 10 });
    if (isFinite(fx)) {
      results.push({ label: "القيمة الفعلية", value: fx, sig: 10 });
      results.push({ label: "الخطأ المطلق", value: Math.abs(fx - px), sig: 3 });
      steps.push({ text: `نختبر التقريب عند ${v} = ${fmt(x0)}:`, tex: `P_{${n}}(${ntex(x0)}) = ${ntex(px, 10)},\\quad f(${ntex(x0)}) = ${ntex(fx, 10)}` });
    }
  }
  const span = Math.max(3, Math.abs((x0 ?? a) - a) * 1.5);
  const blocks = [
    { type: "table", caption: "المشتقات وقيمها عند المركز", head: ["k", "المشتقة", `القيمة عند ${fmt(a)}`, "المعامل $f^{(k)}(a)/k!$"], rows },
    { type: "plot", title: "الدالة الأصلية مقابل كثيرة حدود تايلور", xLabel: v, yLabel: "y", series: [{ name: "f", points: sampleFunction(F, a - span, a + span, 400) }, { name: `P${n}`, points: sampleFunction(P, a - span, a + span, 400), dashed: true }] }
  ];
  return { results, steps, blocks, copy: `P${n}(${v}) = ${shiftedText(coeffs, v, a)}` };
}
