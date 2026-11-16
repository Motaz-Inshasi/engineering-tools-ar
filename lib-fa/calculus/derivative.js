import { derivative, simplify } from "../core/symbolic.js";
import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { derivNumeric } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "مشتق هر تابعی را به‌صورت نمادین محاسبه کنید و هر قاعدهٔ مشتق‌گیری به‌کاررفته را توضیح دهید: توان، ضرب، تقسیم، زنجیره‌ای، توابع مثلثاتی، نمایی و لگاریتمی.",
  intro: "تابع را بنویسید و مشتق مرتبهٔ اول یا مرتبه‌های بالاتر آن را بگیرید، همراه با توضیح قاعدهٔ به‌کاررفته در هر گام، و در صورت تمایل مقدار مشتق در یک نقطه.",
  keywords: ["مشتق", "مشتق‌گیری", "دیفرانسیل", "derivative", "قاعدهٔ زنجیره‌ای", "قاعدهٔ ضرب", "قاعدهٔ تقسیم"],
  formulas: [
    { label: "قاعدهٔ توان و قاعدهٔ ضرب", tex: "\\frac{d}{dx}x^n = n x^{n-1}, \\qquad (uv)' = u'v + uv'" },
    { label: "قاعدهٔ تقسیم و قاعدهٔ زنجیره‌ای", tex: "\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}, \\qquad \\frac{d}{dx}f(g(x)) = f'(g(x))\\,g'(x)" }
  ],
  inputs: [
    { id: "f", label: "تابع f", type: "expr", placeholder: "x^2 sin(x)", help: "از ^ برای توان، و sin cos tan ln log sqrt exp abs، و ثابت‌های pi و e استفاده کنید. ضرب ضمنی مانند 2x مجاز است." },
    { id: "v", label: "متغیر", type: "text", default: "x" },
    { id: "order", label: "مرتبهٔ مشتق", type: "select", default: "1", options: [["1", "اول"], ["2", "دوم"], ["3", "سوم"], ["4", "چهارم"], ["5", "پنجم"]] },
    { id: "at", label: "مقدار متغیر برای محاسبهٔ مشتق در آن (اختیاری)", type: "number", placeholder: "مانند 1.5" }
  ],
  example: { values: { f: "x^2 sin(x)", v: "x", order: "1", at: "" }, expect: ["x^2*cos(x) + 2*x*sin(x)"], note: "مثال: مشتق $x^2\\sin x$ با قاعدهٔ ضرب." },
  invalid: { values: { f: "x^2 +* 3", v: "x", order: "1" } },
  related: ["integral", "limit", "taylor-series", "function-plotter"]
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const order = Number(choice(input, "order", "مرتبهٔ مشتق", ["1", "2", "3", "4", "5"], "1"));
  const at = num(input, "at", "نقطهٔ ارزیابی", { optional: true });
  const steps = [];
  steps.push({ text: "تابع پس از ساده‌سازی:", tex: `f(${v}) = ${toTex(f)}` });
  let cur = f;
  const all = [];
  for (let k = 1; k <= order; k++) {
    const r = derivative(cur, v, { maxSteps: k === 1 ? 40 : 12 });
    if (order > 1) steps.push({ text: `مشتق شمارهٔ ${k}: از خروجی گام قبل مشتق می‌گیریم.` });
    for (const s of r.steps) steps.push({ text: s.rule, tex: s.tex });
    cur = r.result;
    all.push(cur);
  }
  const prime = order === 1 ? "'" : order === 2 ? "''" : `^{(${order})}`;
  const results = [{ label: `مشتق $f${prime}(${v})$`, tex: `f${prime}(${v}) = ${toTex(cur)}`, text: toText(cur) }];
  const blocks = [];
  if (at !== null) {
    const val = f1(cur, v)(at);
    if (!isFinite(val)) {
      blocks.push({ type: "note", tone: "warn", text: `مشتق در ${v} = ${fmt(at)} تعریف‌نشده است.` });
    } else {
      results.push({ label: `مقدار در ${v} = ${fmt(at)}`, value: val, text: fmt(val, 10) });
      steps.push({ text: `${v} = ${fmt(at)} را در مشتق قرار می‌دهیم:`, tex: `f${prime}(${ntex(at)}) = ${ntex(val, 10)}` });
      if (order <= 2) {
        const nd = derivNumeric(f1(f, v), at, order);
        if (isFinite(nd)) steps.push(`برای بررسی: تقریب عددی با تفاضل‌های مرکزی برابر ${fmt(nd, 8)} می‌دهد.`);
      }
    }
  }
  return { results, steps, blocks, copy: `f${order === 1 ? "'" : order === 2 ? "''" : `(${order})`}(${v}) = ${toText(cur)}${at !== null && isFinite(f1(cur, v)(at)) ? `
در ${v} = ${fmt(at)}: ${fmt(f1(cur, v)(at), 10)}` : ""}` };
}
