import { readTF, tfTex, polesZeros } from "../signals/common.js";
import { numx as num } from "../core/numexpr.js";
import { fail } from "../core/validate.js";
import { padd, peval, roots, trim } from "../core/polynomial.js";
import { cabs } from "../core/complex.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "محاسبه خطای حالت پایدار یک سیستم با بازخورد واحد: نوع سیستم و ثابت‌های خطای Kp وKv وKa و خطا برای ورودی پله و شیب و سهمی، پس از بررسی پایداری حلقه بسته.",
  keywords: ["خطای حالت پایدار", "steady state error", "نوع سیستم", "ثابت خطا", "Kp", "Kv", "Ka", "بازخورد"],
  formulas: [
    { label: "ثابت‌های خطا", tex: "K_p = \\lim_{s\\to0}G(s),\\quad K_v = \\lim_{s\\to0}sG(s),\\quad K_a = \\lim_{s\\to0}s^2G(s)" },
    { label: "خطا برای ورودی با دامنه A", tex: "e_{step} = \\frac{A}{1+K_p},\\quad e_{ramp} = \\frac{A}{K_v},\\quad e_{parabola} = \\frac{A}{K_a}" }
  ],
  inputs: [
    { id: "G", label: "تابع انتقال حلقه باز G(s)", type: "expr", default: "10(s + 2)/(s(s + 1)(s + 5))", help: "با بازخورد واحد: T(s) = G/(1+G)." },
    { id: "A", label: "دامنه ورودی A", type: "number", default: "1" }
  ],
  example: { values: { G: "10(s + 2)/(s(s + 1)(s + 5))", A: "1" }, expect: ["e_ramp = 0.25"], note: "مثال: سیستم نوع 1، پس خطای پله صفر و خطای شیب $1/K_v$ است." },
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
  const tf = readTF(input, "G", "تابع انتقال حلقه باز");
  const A = num(input, "A", "دامنه ورودی", { nonZero: true });
  const charPoly = padd(tf.den, tf.num);
  const cl = roots(charPoly);
  const unstable = cl.filter((r) => r.re >= -1e-9);
  const steps = [
    { text: "تابع انتقال حلقه باز:", tex: `G(s) = ${tfTex(tf)}` },
    { text: "ابتدا پایداری حلقه بسته را با یافتن ریشه‌های معادله مشخصه $1 + G(s) = 0$ بررسی می‌کنیم:", tex: `D(s) + N(s) = 0` }
  ];
  if (unstable.length) {
    fail(`حلقه بسته ناپایدار است (${unstable.length} ریشه روی محور موهومی یا در سمت راست آن)، پس خطای حالت پایدار معنایی ندارد.`, "G");
  }
  steps.push(`همه ریشه‌های حلقه بسته در نیم‌صفحه چپ‌اند (کندترین آن‌ها در Re = ${fmt(Math.max(...cl.map((r) => r.re)), 5)} است)، پس سیستم پایدار است و ادامه می‌دهیم.`);
  const c = errorConstants(tf);
  steps.push(`تعداد قطب‌ها در مبدأ = ${c.type}، پس سیستم از نوع ${c.type} است.`);
  const kTex = (v) => (v === Infinity ? "\\infty" : ntex(v, 6));
  steps.push({ text: "ثابت‌های خطا:", tex: `K_p = ${kTex(c.Kp)},\\quad K_v = ${kTex(c.Kv)},\\quad K_a = ${kTex(c.Ka)}` });
  const e = (k, kind) => (kind === "step" ? A / (1 + k) : k === Infinity ? 0 : k === 0 ? Infinity : A / k);
  const es = e(c.Kp, "step"), er = e(c.Kv, "ramp"), ep = e(c.Ka, "par");
  steps.push({ text: `با A = ${fmt(A)} در فرمول‌ها جایگذاری می‌کنیم:`, tex: `e_{step} = ${kTex(es)},\\quad e_{ramp} = ${kTex(er)},\\quad e_{parabola} = ${kTex(ep)}` });
  steps.push("خطای ∞ یعنی خروجی نمی‌تواند ورودی را دنبال کند و اختلاف با زمان افزایش می‌یابد.");
  const show = (v) => (v === Infinity ? "∞" : fmt(v, 6));
  return {
    results: [
      { label: "نوع سیستم", value: c.type },
      { label: "Kp", value: show(c.Kp) },
      { label: "Kv", value: show(c.Kv) },
      { label: "Ka", value: show(c.Ka) },
      { label: "خطای پله", value: show(es), text: `e_step = ${show(es)}` },
      { label: "خطای شیب", value: show(er), text: `e_ramp = ${show(er)}` },
      { label: "خطای سهمی", value: show(ep), text: `e_parabola = ${show(ep)}` }
    ],
    steps,
    copy: `type ${c.type}: e_step = ${show(es)}, e_ramp = ${show(er)}, e_parabola = ${show(ep)}`
  };
}

export { cabs };
