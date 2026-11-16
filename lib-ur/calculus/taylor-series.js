import { simplify, diff, fromPoly } from "../core/symbolic.js";
import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, niceTex, nice, toFraction } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "کسی بھی تفاعل کا ٹیلر یا میکلورن سلسلہ رتبہ 10 تک لکھیں: متوالی مشتقات، ان کی مرکز پر قدریں اور عوامل، اس کے ساتھ ایک گراف جو تفاعل کا تقریبی کثیر رکنی سے موازنہ کرے۔",
  keywords: ["ٹیلر", "میکلورن", "taylor", "maclaurin", "سلسلہ", "تقریب", "ٹیلر کثیر رکنی"],
  formulas: [
    { label: "نقطہ a کے گرد ٹیلر سلسلہ (جب a = 0 ہو تو میکلورن)", tex: "f(x) \\approx \\sum_{k=0}^{n} \\frac{f^{(k)}(a)}{k!}(x-a)^k" }
  ],
  inputs: [
    { id: "f", label: "تفاعل", type: "expr", placeholder: "e^x" },
    { id: "v", label: "متغیر", type: "text", default: "x" },
    { id: "a", label: "پھیلاؤ کا مرکز a", type: "number", default: "0", help: "0 میکلورن سلسلہ دیتا ہے۔" },
    { id: "n", label: "رتبہ n", type: "number", default: "5", help: "1 سے 10 تک" },
    { id: "x0", label: "تقریب جانچنے کا نقطہ (اختیاری)", type: "number" }
  ],
  example: { values: { f: "e^x", v: "x", a: "0", n: "4", x0: "0.5" }, expect: ["x^4/24"], note: "مثال: $e^x$ کا میکلورن سلسلہ رتبہ 4 تک۔" },
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
      if (toText(cur).length > 4000) fail("اس رتبے کے لیے مشتقات بہت طویل ہو گئے ہیں۔ کوئی چھوٹا رتبہ آزمائیں۔", "n");
      derivs.push(cur);
    }
    const val = f1(cur, v)(a);
    if (!isFinite(val)) fail(`تفاعل یا اس کا مشتق نمبر ${k} نقطہ ${v} = ${fmt(a)} پر غیر متعین ہے، اس لیے اس نقطے کے گرد ٹیلر سلسلہ موجود نہیں۔`, "a");
    values.push(Math.abs(val) < 1e-13 ? 0 : val);
  }
  return { derivs, values, coeffs: values.map((x, k) => x / fact(k)) };
}

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const a = num(input, "a", "پھیلاؤ کا مرکز");
  const n = num(input, "n", "رتبہ", { integer: true, min: 1, max: 10 });
  const x0 = num(input, "x0", "جانچ کا نقطہ", { optional: true });
  const { derivs, values, coeffs } = taylorCoefficients(f, v, a, n);
  const rows = derivs.map((d, k) => [String(k), { tex: k === 0 ? `f(${v}) = ${toTex(d)}` : `f^{(${k})}(${v}) = ${toTex(d)}` }, { tex: niceTex(values[k], 8) }, { tex: niceTex(coeffs[k], 8) }]);
  const steps = [
    `ہم رتبہ ${n} تک متوالی مشتقات نکالتے ہیں، پھر ہر ایک میں ${v} = ${fmt(a)} رکھتے ہیں (جدول دیکھیں)۔`,
    { text: "ہم ہر قدر کو $k!$ سے تقسیم کرتے ہیں تاکہ عامل حاصل ہو، پھر رکن جمع کرتے ہیں:", tex: `${a === 0 ? "\\text{Maclaurin}" : "\\text{Taylor}"}:\\; f(${v}) \\approx ${shiftedTex(coeffs, v, a)}` }
  ];
  const P = (x) => coeffs.reduce((s, c, k) => s + c * Math.pow(x - a, k), 0);
  const F = f1(f, v);
  const results = [{ label: `رتبہ ${n} کی ٹیلر کثیر رکنی`, tex: `P_{${n}}(${v}) = ${shiftedTex(coeffs, v, a)}`, text: shiftedText(coeffs, v, a) }];
  if (x0 !== null) {
    const px = P(x0), fx = F(x0);
    results.push({ label: `${v} = ${fmt(x0)} پر تقریب`, value: px, sig: 10 });
    if (isFinite(fx)) {
      results.push({ label: "اصل قدر", value: fx, sig: 10 });
      results.push({ label: "مطلق خرابی", value: Math.abs(fx - px), sig: 3 });
      steps.push({ text: `ہم ${v} = ${fmt(x0)} پر تقریب جانچتے ہیں:`, tex: `P_{${n}}(${ntex(x0)}) = ${ntex(px, 10)},\\quad f(${ntex(x0)}) = ${ntex(fx, 10)}` });
    }
  }
  const span = Math.max(3, Math.abs((x0 ?? a) - a) * 1.5);
  const blocks = [
    { type: "table", caption: "مشتقات اور مرکز پر ان کی قدریں", head: ["k", "مشتق", `${fmt(a)} پر قدر`, "عامل $f^{(k)}(a)/k!$"], rows },
    { type: "plot", title: "اصل تفاعل بمقابلہ ٹیلر کثیر رکنی", xLabel: v, yLabel: "y", series: [{ name: "f", points: sampleFunction(F, a - span, a + span, 400) }, { name: `P${n}`, points: sampleFunction(P, a - span, a + span, 400), dashed: true }] }
  ];
  return { results, steps, blocks, copy: `P${n}(${v}) = ${shiftedText(coeffs, v, a)}` };
}
