import { simplify, diff } from "../core/symbolic.js";
import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { bisection, newton, secant, sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "أوجد جذر المعادلة f(x) = 0 عددياً بطريقة التنصيف أو نيوتن-رافسون أو القاطع، مع جدول كامل لكل تكرار ورسم يوضح موقع الجذر.",
  keywords: ["جذر", "حل معادلة", "نيوتن", "نيوتن رافسون", "تنصيف", "bisection", "newton", "secant", "قاطع", "طرق عددية"],
  formulas: [
    { label: "نيوتن-رافسون", tex: "x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}" },
    { label: "القاطع", tex: "x_{n+1} = x_n - f(x_n)\\frac{x_n - x_{n-1}}{f(x_n) - f(x_{n-1})}" },
    { label: "التنصيف", tex: "m = \\frac{a+b}{2},\\quad f(a)\\,f(b) < 0" }
  ],
  inputs: [
    { id: "f", label: "الدالة f(x)", type: "expr", placeholder: "x^3 - 2x - 5" },
    { id: "v", label: "المتغير", type: "text", default: "x" },
    { id: "method", label: "الطريقة", type: "select", default: "newton", options: [["newton", "نيوتن-رافسون"], ["bisection", "التنصيف"], ["secant", "القاطع"]] },
    { id: "x0", label: "القيمة الابتدائية x₀", type: "number", default: "2", when: { method: ["newton", "secant"] } },
    { id: "x1", label: "القيمة الثانية x₁", type: "number", default: "3", when: { method: ["secant"] } },
    { id: "a", label: "بداية المجال a", type: "number", default: "2", when: { method: ["bisection"] } },
    { id: "b", label: "نهاية المجال b", type: "number", default: "3", when: { method: ["bisection"] } },
    { id: "tol", label: "الدقة المطلوبة", type: "number", default: "1e-10" }
  ],
  example: { values: { f: "x^3 - 2x - 5", v: "x", method: "newton", x0: "2", tol: "1e-10" }, expect: ["2.0945514815"], note: "مثال نيوتن الشهير: جذر $x^3 - 2x - 5 = 0$ قرب 2." },
  invalid: { values: { f: "x^2 + 1", method: "bisection", a: "0", b: "1" } },
  related: ["polynomial-roots", "quadratic", "function-plotter", "derivative"]
};

const REASONS = {
  sign: "إشارة f(a) و f(b) متماثلة، فلا يضمن التنصيف وجود جذر. اختر مجالاً تتغير فيه إشارة الدالة.",
  undefined: "الدالة غير معرّفة عند إحدى نقاط الحساب. جرّب قيمة ابتدائية أخرى.",
  zeroDerivative: "المشتقة تساوي صفراً عند إحدى النقاط فتوقفت طريقة نيوتن. جرّب قيمة ابتدائية أخرى.",
  diverged: "الطريقة تباعدت ولم تتقارب. جرّب قيمة ابتدائية أقرب للجذر.",
  maxIter: "لم تتقارب الطريقة خلال 100 تكرار. جرّب قيمة ابتدائية أخرى أو طريقة التنصيف.",
  flat: "قيمتا الدالة متساويتان في نقطتين متتاليتين فتوقفت طريقة القاطع."
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const method = choice(input, "method", "الطريقة", ["newton", "bisection", "secant"], "newton");
  const tol = num(input, "tol", "الدقة", { positive: true, default: 1e-10 });
  const F = f1(f, v);
  const steps = [{ text: "المعادلة المطلوب حلها:", tex: `${toTex(f)} = 0` }];
  let r, rows, head, start, field;
  if (method === "newton") {
    const x0 = num(input, "x0", "القيمة الابتدائية");
    const d = diff(f, v);
    steps.push({ text: "نحسب المشتقة رمزياً:", tex: `f'(${v}) = ${toTex(d)}` });
    steps.push(`نبدأ من ${v}₀ = ${fmt(x0)} ونكرر القانون حتى يصبح التغير أصغر من ${fmt(tol)}.`);
    r = newton(F, f1(d, v), x0, { tol });
    head = ["n", "xₙ", "f(xₙ)", "f'(xₙ)", "xₙ₊₁"];
    rows = r.rows.map((q) => [q.i, fmt(q.x, 12), fmt(q.fx, 4), fmt(q.dfx, 6), fmt(q.next, 12)]);
    start = [x0]; field = "x0";
  } else if (method === "secant") {
    const x0 = num(input, "x0", "القيمة الابتدائية"), x1 = num(input, "x1", "القيمة الثانية");
    if (x0 === x1) fail("القيمتان الابتدائيتان يجب أن تكونا مختلفتين.", "x1");
    steps.push(`نبدأ من ${v}₀ = ${fmt(x0)} و ${v}₁ = ${fmt(x1)} ونكرر قانون القاطع.`);
    r = secant(F, x0, x1, { tol });
    head = ["n", "xₙ₋₁", "xₙ", "f(xₙ)", "xₙ₊₁"];
    rows = r.rows.map((q) => [q.i, fmt(q.x0, 12), fmt(q.x1, 12), fmt(q.fx1, 4), fmt(q.next, 12)]);
    start = [x0, x1]; field = "x0";
  } else {
    const a = num(input, "a", "بداية المجال"), b = num(input, "b", "نهاية المجال");
    if (a >= b) fail("بداية المجال يجب أن تكون أصغر من نهايته.", "b");
    const fa = F(a), fb = F(b);
    steps.push(`نتحقق من تغير الإشارة: f(${fmt(a)}) = ${fmt(fa)} و f(${fmt(b)}) = ${fmt(fb)}.`);
    r = bisection(F, a, b, { tol });
    head = ["n", "a", "b", "m", "f(m)"];
    rows = r.rows.map((q) => [q.i, fmt(q.a, 12), fmt(q.b, 12), fmt(q.x, 12), fmt(q.fx, 4)]);
    if (rows.length > 60) rows.splice(30, rows.length - 60, ["…", "…", "…", "…", "…"]);
    start = [a, b]; field = r.reason === "sign" ? "b" : "a";
  }
  if (!r.ok) fail(REASONS[r.reason] || "تعذر إيجاد الجذر.", field);
  const root = r.root;
  const fr = F(root);
  steps.push(`تقاربت الطريقة بعد ${r.iterations} تكرار إلى ${v} ≈ ${fmt(root, 12)}.`);
  steps.push({ text: "للتحقق نعوّض الجذر في الدالة:", tex: `f(${ntex(root, 12)}) = ${ntex(fr, 3)}` });
  const lo = Math.min(root, ...start), hi = Math.max(root, ...start);
  const pad = Math.max(1, (hi - lo) * 0.6);
  return {
    results: [
      { label: "الجذر", value: root, sig: 12 },
      { label: "قيمة الدالة عند الجذر", value: fr, sig: 3 },
      { label: "عدد التكرارات", value: r.iterations }
    ],
    blocks: [
      { type: "table", caption: "جدول التكرارات", head, rows: rows.map((rw) => rw.map(String)) },
      { type: "plot", title: "الدالة وموقع الجذر", xLabel: v, yLabel: `f(${v})`, series: [{ name: `f(${v})`, points: sampleFunction(F, lo - pad, hi + pad, 400) }, { name: "الجذر", points: [[root, 0]], marker: "o" }] }
    ],
    steps,
    copy: `الجذر ${v} ≈ ${fmt(root, 12)} (f = ${fmt(fr, 3)}, ${r.iterations} تكرار)`
  };
}
