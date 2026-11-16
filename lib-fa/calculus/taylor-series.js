import { simplify, diff, fromPoly } from "../core/symbolic.js";
import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, niceTex, nice, toFraction } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "سری تیلور یا مک‌لورن هر تابع را تا مرتبهٔ 10 بنویسید: مشتق‌های متوالی و مقادیر آن‌ها در مرکز و ضرایب، همراه با نموداری که تابع را با چندجمله‌ای تقریبی مقایسه کند.",
  keywords: ["تیلور", "مک‌لورن", "taylor", "maclaurin", "سری", "تقریب", "چندجمله‌ای تیلور"],
  formulas: [
    { label: "سری تیلور حول نقطهٔ a (مک‌لورن وقتی a = 0)", tex: "f(x) \\approx \\sum_{k=0}^{n} \\frac{f^{(k)}(a)}{k!}(x-a)^k" }
  ],
  inputs: [
    { id: "f", label: "تابع", type: "expr", placeholder: "e^x" },
    { id: "v", label: "متغیر", type: "text", default: "x" },
    { id: "a", label: "مرکز بسط a", type: "number", default: "0", help: "0 سری مک‌لورن می‌دهد." },
    { id: "n", label: "مرتبهٔ n", type: "number", default: "5", help: "از 1 تا 10" },
    { id: "x0", label: "نقطهٔ آزمون تقریب (اختیاری)", type: "number" }
  ],
  example: { values: { f: "e^x", v: "x", a: "0", n: "4", x0: "0.5" }, expect: ["x^4/24"], note: "مثال: سری مک‌لورن برای $e^x$ تا مرتبهٔ 4." },
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
      if (toText(cur).length > 4000) fail("مشتق‌ها برای این مرتبه بسیار طولانی شده‌اند. مرتبهٔ کوچک‌تری امتحان کنید.", "n");
      derivs.push(cur);
    }
    const val = f1(cur, v)(a);
    if (!isFinite(val)) fail(`تابع یا مشتق شمارهٔ ${k} در ${v} = ${fmt(a)} تعریف‌نشده است، پس سری تیلور حول این نقطه وجود ندارد.`, "a");
    values.push(Math.abs(val) < 1e-13 ? 0 : val);
  }
  return { derivs, values, coeffs: values.map((x, k) => x / fact(k)) };
}

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const a = num(input, "a", "مرکز بسط");
  const n = num(input, "n", "مرتبه", { integer: true, min: 1, max: 10 });
  const x0 = num(input, "x0", "نقطهٔ آزمون", { optional: true });
  const { derivs, values, coeffs } = taylorCoefficients(f, v, a, n);
  const rows = derivs.map((d, k) => [String(k), { tex: k === 0 ? `f(${v}) = ${toTex(d)}` : `f^{(${k})}(${v}) = ${toTex(d)}` }, { tex: niceTex(values[k], 8) }, { tex: niceTex(coeffs[k], 8) }]);
  const steps = [
    `مشتق‌های متوالی را تا مرتبهٔ ${n} محاسبه می‌کنیم، سپس ${v} = ${fmt(a)} را در هر کدام قرار می‌دهیم (جدول را ببینید).`,
    { text: "هر مقدار را بر $k!$ تقسیم می‌کنیم تا ضریب به دست آید، سپس جمله‌ها را جمع می‌کنیم:", tex: `${a === 0 ? "\\text{Maclaurin}" : "\\text{Taylor}"}:\\; f(${v}) \\approx ${shiftedTex(coeffs, v, a)}` }
  ];
  const P = (x) => coeffs.reduce((s, c, k) => s + c * Math.pow(x - a, k), 0);
  const F = f1(f, v);
  const results = [{ label: `چندجمله‌ای تیلور از مرتبهٔ ${n}`, tex: `P_{${n}}(${v}) = ${shiftedTex(coeffs, v, a)}`, text: shiftedText(coeffs, v, a) }];
  if (x0 !== null) {
    const px = P(x0), fx = F(x0);
    results.push({ label: `تقریب در ${v} = ${fmt(x0)}`, value: px, sig: 10 });
    if (isFinite(fx)) {
      results.push({ label: "مقدار واقعی", value: fx, sig: 10 });
      results.push({ label: "خطای مطلق", value: Math.abs(fx - px), sig: 3 });
      steps.push({ text: `تقریب را در ${v} = ${fmt(x0)} آزمایش می‌کنیم:`, tex: `P_{${n}}(${ntex(x0)}) = ${ntex(px, 10)},\\quad f(${ntex(x0)}) = ${ntex(fx, 10)}` });
    }
  }
  const span = Math.max(3, Math.abs((x0 ?? a) - a) * 1.5);
  const blocks = [
    { type: "table", caption: "مشتق‌ها و مقادیر آن‌ها در مرکز", head: ["k", "مشتق", `مقدار در ${fmt(a)}`, "ضریب $f^{(k)}(a)/k!$"], rows },
    { type: "plot", title: "تابع اصلی در برابر چندجمله‌ای تیلور", xLabel: v, yLabel: "y", series: [{ name: "f", points: sampleFunction(F, a - span, a + span, 400) }, { name: `P${n}`, points: sampleFunction(P, a - span, a + span, 400), dashed: true }] }
  ];
  return { results, steps, blocks, copy: `P${n}(${v}) = ${shiftedText(coeffs, v, a)}` };
}
