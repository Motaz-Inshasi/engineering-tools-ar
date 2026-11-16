import { simplify, diff } from "../core/symbolic.js";
import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { bisection, newton, secant, sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "ریشهٔ معادلهٔ f(x) = 0 را به‌صورت عددی با روش تنصیف، نیوتن-رافسون یا قاطع بیابید، همراه با جدول کامل برای هر تکرار و نموداری که موقعیت ریشه را نشان دهد.",
  keywords: ["ریشه", "حل معادله", "نیوتن", "نیوتن-رافسون", "تنصیف", "bisection", "newton", "secant", "قاطع", "روش‌های عددی"],
  formulas: [
    { label: "نیوتن-رافسون", tex: "x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}" },
    { label: "روش قاطع", tex: "x_{n+1} = x_n - f(x_n)\\frac{x_n - x_{n-1}}{f(x_n) - f(x_{n-1})}" },
    { label: "روش تنصیف", tex: "m = \\frac{a+b}{2},\\quad f(a)\\,f(b) < 0" }
  ],
  inputs: [
    { id: "f", label: "تابع f(x)", type: "expr", placeholder: "x^3 - 2x - 5" },
    { id: "v", label: "متغیر", type: "text", default: "x" },
    { id: "method", label: "روش", type: "select", default: "newton", options: [["newton", "نیوتن-رافسون"], ["bisection", "روش تنصیف"], ["secant", "روش قاطع"]] },
    { id: "x0", label: "مقدار اولیه x₀", type: "number", default: "2", when: { method: ["newton", "secant"] } },
    { id: "x1", label: "مقدار دوم x₁", type: "number", default: "3", when: { method: ["secant"] } },
    { id: "a", label: "ابتدای بازه a", type: "number", default: "2", when: { method: ["bisection"] } },
    { id: "b", label: "انتهای بازه b", type: "number", default: "3", when: { method: ["bisection"] } },
    { id: "tol", label: "دقت موردنظر", type: "number", default: "1e-10" }
  ],
  example: { values: { f: "x^3 - 2x - 5", v: "x", method: "newton", x0: "2", tol: "1e-10" }, expect: ["2.0945514815"], note: "مثال معروف نیوتن: ریشهٔ $x^3 - 2x - 5 = 0$ نزدیک 2." },
  invalid: { values: { f: "x^2 + 1", method: "bisection", a: "0", b: "1" } },
  related: ["polynomial-roots", "quadratic", "function-plotter", "derivative"]
};

const REASONS = {
  sign: "علامت f(a) و f(b) یکسان است، پس روش تنصیف وجود ریشه را تضمین نمی‌کند. بازه‌ای انتخاب کنید که علامت تابع در آن تغییر کند.",
  undefined: "تابع در یکی از نقاط محاسبه تعریف‌نشده است. مقدار اولیهٔ دیگری امتحان کنید.",
  zeroDerivative: "مشتق در یکی از نقاط برابر صفر شد و روش نیوتن متوقف شد. مقدار اولیهٔ دیگری امتحان کنید.",
  diverged: "روش واگرا شد و همگرا نشد. مقدار اولیه‌ای نزدیک‌تر به ریشه امتحان کنید.",
  maxIter: "روش طی 100 تکرار همگرا نشد. مقدار اولیهٔ دیگری یا روش تنصیف را امتحان کنید.",
  flat: "مقادیر تابع در دو نقطهٔ متوالی برابر شد و روش قاطع متوقف شد."
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const method = choice(input, "method", "روش", ["newton", "bisection", "secant"], "newton");
  const tol = num(input, "tol", "دقت", { positive: true, default: 1e-10 });
  const F = f1(f, v);
  const steps = [{ text: "معادلهٔ موردنظر برای حل:", tex: `${toTex(f)} = 0` }];
  let r, rows, head, start, field;
  if (method === "newton") {
    const x0 = num(input, "x0", "مقدار اولیه");
    const d = diff(f, v);
    steps.push({ text: "مشتق را به‌صورت نمادین محاسبه می‌کنیم:", tex: `f'(${v}) = ${toTex(d)}` });
    steps.push(`از ${v}₀ = ${fmt(x0)} شروع می‌کنیم و فرمول را تکرار می‌کنیم تا تغییرات از ${fmt(tol)} کوچک‌تر شود.`);
    r = newton(F, f1(d, v), x0, { tol });
    head = ["n", "xₙ", "f(xₙ)", "f'(xₙ)", "xₙ₊₁"];
    rows = r.rows.map((q) => [q.i, fmt(q.x, 12), fmt(q.fx, 4), fmt(q.dfx, 6), fmt(q.next, 12)]);
    start = [x0]; field = "x0";
  } else if (method === "secant") {
    const x0 = num(input, "x0", "مقدار اولیه"), x1 = num(input, "x1", "مقدار دوم");
    if (x0 === x1) fail("دو مقدار اولیه باید متفاوت باشند.", "x1");
    steps.push(`از ${v}₀ = ${fmt(x0)} و ${v}₁ = ${fmt(x1)} شروع می‌کنیم و فرمول روش قاطع را تکرار می‌کنیم.`);
    r = secant(F, x0, x1, { tol });
    head = ["n", "xₙ₋₁", "xₙ", "f(xₙ)", "xₙ₊₁"];
    rows = r.rows.map((q) => [q.i, fmt(q.x0, 12), fmt(q.x1, 12), fmt(q.fx1, 4), fmt(q.next, 12)]);
    start = [x0, x1]; field = "x0";
  } else {
    const a = num(input, "a", "ابتدای بازه"), b = num(input, "b", "انتهای بازه");
    if (a >= b) fail("ابتدای بازه باید از انتهای آن کوچک‌تر باشد.", "b");
    const fa = F(a), fb = F(b);
    steps.push(`تغییر علامت را بررسی می‌کنیم: f(${fmt(a)}) = ${fmt(fa)} و f(${fmt(b)}) = ${fmt(fb)}.`);
    r = bisection(F, a, b, { tol });
    head = ["n", "a", "b", "m", "f(m)"];
    rows = r.rows.map((q) => [q.i, fmt(q.a, 12), fmt(q.b, 12), fmt(q.x, 12), fmt(q.fx, 4)]);
    if (rows.length > 60) rows.splice(30, rows.length - 60, ["…", "…", "…", "…", "…"]);
    start = [a, b]; field = r.reason === "sign" ? "b" : "a";
  }
  if (!r.ok) fail(REASONS[r.reason] || "یافتن ریشه ممکن نشد.", field);
  const root = r.root;
  const fr = F(root);
  steps.push(`روش پس از ${r.iterations} تکرار به ${v} ≈ ${fmt(root, 12)} همگرا شد.`);
  steps.push({ text: "برای بررسی، ریشه را در تابع قرار می‌دهیم:", tex: `f(${ntex(root, 12)}) = ${ntex(fr, 3)}` });
  const lo = Math.min(root, ...start), hi = Math.max(root, ...start);
  const pad = Math.max(1, (hi - lo) * 0.6);
  return {
    results: [
      { label: "ریشه", value: root, sig: 12 },
      { label: "مقدار تابع در ریشه", value: fr, sig: 3 },
      { label: "تعداد تکرارها", value: r.iterations }
    ],
    blocks: [
      { type: "table", caption: "جدول تکرارها", head, rows: rows.map((rw) => rw.map(String)) },
      { type: "plot", title: "تابع و موقعیت ریشه", xLabel: v, yLabel: `f(${v})`, series: [{ name: `f(${v})`, points: sampleFunction(F, lo - pad, hi + pad, 400) }, { name: "ریشه", points: [[root, 0]], marker: "o" }] }
    ],
    steps,
    copy: `ریشه ${v} ≈ ${fmt(root, 12)} (f = ${fmt(fr, 3)}، ${r.iterations} تکرار)`
  };
}
