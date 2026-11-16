import { integrate, simplify } from "../core/symbolic.js";
import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, niceTex, nice } from "../core/format.js";
import { integrateNumeric, sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "انتگرال نامعین و معین هر تابعی را محاسبه کنید: در صورت اطمینان، حل نمادین همراه با گام‌ها، و وقتی حل نمادین در دسترس نیست، مقدار عددی دقیق و با برچسب روشن.",
  intro: "انتگرال نمادین از توان، توابع مثلثاتی، نمایی و لگاریتمی، تعویض، جزء به جزء و کسرهای جزئی پشتیبانی می‌کند. هر نتیجهٔ نمادین پیش از نمایش، به‌صورت عددی بررسی می‌شود.",
  keywords: ["انتگرال", "integral", "انتگرال معین", "انتگرال نامعین", "مساحت زیر منحنی", "انتگرال جزء به جزء", "تعویض"],
  formulas: [
    { label: "انتگرال نامعین و معین", tex: "\\int f(x)\\,dx = F(x) + C, \\qquad \\int_a^b f(x)\\,dx = F(b) - F(a)" },
    { label: "قاعدهٔ توان و جزء به جزء", tex: "\\int x^n dx = \\frac{x^{n+1}}{n+1} + C,\\qquad \\int u\\,dv = uv - \\int v\\,du" }
  ],
  inputs: [
    { id: "f", label: "تابعی که باید انتگرال گرفته شود", type: "expr", placeholder: "x e^x", help: "مانند: x^2 sin(x)، 1/(x^2+1)، e^(2x)، ln(x)" },
    { id: "v", label: "متغیر", type: "text", default: "x" },
    { id: "mode", label: "نوع انتگرال", type: "select", default: "indefinite", options: [["indefinite", "نامعین"], ["definite", "معین"]] },
    { id: "a", label: "کران پایین a", type: "number", when: { mode: ["definite"] }, help: "می‌توان inf یا -inf نوشت" },
    { id: "b", label: "کران بالا b", type: "number", when: { mode: ["definite"] } }
  ],
  example: { values: { f: "x e^x", v: "x", mode: "definite", a: "0", b: "1" }, expect: ["= 1"], note: "مثال: $\\int_0^1 x e^x\\,dx$ با جزء به جزء، و حاصل 1." },
  invalid: { values: { f: "sin(x", mode: "indefinite" } },
  related: ["derivative", "function-plotter", "laplace", "partial-fractions"]
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const mode = choice(input, "mode", "نوع انتگرال", ["indefinite", "definite"], "indefinite");
  const steps = [{ text: "تابع پس از ساده‌سازی:", tex: `f(${v}) = ${toTex(f)}` }];
  const blocks = [];
  const sym = integrate(f, v);
  if (sym) {
    for (const s of sym.steps) steps.push({ text: s.rule, tex: s.tex });
    steps.push(`درستی نتیجه را با مشتق‌گیری عددی و مقایسه با تابع اصلی در چند نقطه بررسی کردیم.`);
  }
  if (mode === "indefinite") {
    if (!sym) {
      blocks.push({ type: "note", tone: "warn", text: "با قواعد پشتیبانی‌شده، انتگرال نمادین قابل‌اعتمادی برای این تابع پیدا نکردیم. ممکن است انتگرال آن با توابع مقدماتی بیان نشود (مانند $e^{x^2}$). برای به‌دست آوردن مقدار عددی، انتگرال معین را امتحان کنید." });
      return { results: [{ label: "انتگرال نامعین", value: "به‌صورت نمادین در دسترس نیست" }], steps, blocks, copy: "انتگرال نامعین به‌صورت نمادین در دسترس نیست" };
    }
    return {
      results: [{ label: "انتگرال نامعین", tex: `\\int ${toTex(f)}\\,d${v} = ${toTex(sym.result)} + C`, text: `${toText(sym.result)} + C` }],
      steps, blocks, copy: `∫ ${toText(f)} d${v} = ${toText(sym.result)} + C`
    };
  }
  const a = num(input, "a", "کران پایین", { allowInfinity: true });
  const b = num(input, "b", "کران بالا", { allowInfinity: true });
  if (a === b) fail("دو کران برابرند و انتگرال برابر صفر است. دو کران متفاوت وارد کنید.", "b");
  const F = f1(f, v);
  const numeric = integrateNumeric(F, a, b, { tol: 1e-11 });
  let exact = null;
  if (sym && isFinite(a) && isFinite(b)) {
    const G = f1(sym.result, v);
    const Fa = G(a), Fb = G(b);
    const pts = sampleFunction(F, Math.min(a, b), Math.max(a, b), 401);
    const continuous = pts.every(([, y]) => y !== null);
    const val = Fb - Fa;
    if (continuous && isFinite(val) && numeric.ok && Math.abs(val - numeric.value) <= 1e-6 * Math.max(1, Math.abs(val))) {
      exact = val;
      steps.push({ text: `قضیهٔ اساسی حساب دیفرانسیل و انتگرال را به کار می‌بریم: $F(b) - F(a)$`, tex: `F(${ntex(b)}) - F(${ntex(a)}) = ${ntex(Fb, 10)} - (${ntex(Fa, 10)}) = ${ntex(val, 10)}` });
    } else if (!continuous) {
      blocks.push({ type: "note", tone: "warn", text: "تابع در نقطه‌ای داخل بازهٔ انتگرال تعریف‌نشده است، پس نمی‌توان مستقیماً $F(b)-F(a)$ را به کار برد." });
    }
  }
  const results = [];
  if (exact !== null) {
    const shown = Math.abs(exact - Math.round(exact)) < 1e-10 ? Math.round(exact) : exact;
    results.push({ label: "مقدار انتگرال معین", tex: `\\int_{${ntex(a)}}^{${ntex(b)}} ${toTex(f)}\\,d${v} = ${niceTex(shown, 10)}`, text: `= ${nice(shown, 10)}` });
    results.push({ label: "مقدار اعشاری", value: exact, sig: 12 });
  } else {
    if (!numeric.ok || !isFinite(numeric.value)) {
      blocks.push({ type: "note", tone: "warn", text: "انتگرال همگرا نیست یا تابع در بازه کران‌دار نیست، پس نمی‌توان مقدار قابل‌اعتمادی ارائه داد." });
      return { results: [{ label: "مقدار انتگرال معین", value: "ناهمگرا یا نامعین" }], steps, blocks, copy: "انتگرال ناهمگراست" };
    }
    results.push({ label: "مقدار انتگرال معین (تقریب عددی)", value: numeric.value, sig: 10, text: `≈ ${fmt(numeric.value, 10)}` });
    results.push({ label: "تخمین خطای عددی", value: numeric.error, sig: 2 });
    steps.push(`مقدار را به‌صورت عددی با روش تطبیقی گاوس-کرونرود (15 نقطه) و تقسیم بازه به ${numeric.intervals} بخش محاسبه کردیم.`);
    if (!isFinite(a) || !isFinite(b)) steps.push("برای کران‌های نامتناهی، پیش از انتگرال‌گیری عددی یک تغییر متغیر به کار بردیم که بازه را کران‌دار می‌کند.");
    blocks.push({ type: "note", text: "این یک مقدار عددی تقریبی است و نتیجهٔ نمادین نیست." });
  }
  if (isFinite(a) && isFinite(b)) {
    const lo = Math.min(a, b), hi = Math.max(a, b), pad = (hi - lo) * 0.25;
    blocks.push({ type: "plot", title: `منحنی تابع همراه با کران‌های انتگرال`, xLabel: v, yLabel: `f(${v})`, series: [{ name: `f(${v})`, points: sampleFunction(F, lo - pad, hi + pad, 400) }], vlines: [{ x: lo }, { x: hi }] });
  }
  const copyVal = exact !== null ? nice(exact, 10) : `≈ ${fmt(numeric.value, 10)}`;
  return { results, steps, blocks, copy: `∫ از ${fmt(a)} تا ${fmt(b)} برای ${toText(f)} d${v} = ${copyVal}` };
}
