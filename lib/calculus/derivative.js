import { derivative, simplify } from "../core/symbolic.js";
import { num, choice } from "../core/validate.js";
import { fmt, tex as ntex } from "../core/format.js";
import { derivNumeric } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "احسب مشتقة أي دالة رمزياً مع شرح كل قاعدة اشتقاق مستخدمة: القوة والضرب والقسمة والسلسلة والدوال المثلثية والأسية واللوغاريتمية.",
  intro: "اكتب الدالة واحصل على مشتقتها الأولى أو مشتقة أعلى، مع شرح القاعدة المستخدمة عند كل خطوة، وقيمة المشتقة عند نقطة إن أردت.",
  keywords: ["مشتقة", "اشتقاق", "تفاضل", "derivative", "قاعدة السلسلة", "قاعدة الضرب", "قاعدة القسمة"],
  formulas: [
    { label: "قاعدة القوة وقاعدة الضرب", tex: "\\frac{d}{dx}x^n = n x^{n-1}, \\qquad (uv)' = u'v + uv'" },
    { label: "قاعدة القسمة وقاعدة السلسلة", tex: "\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}, \\qquad \\frac{d}{dx}f(g(x)) = f'(g(x))\\,g'(x)" }
  ],
  inputs: [
    { id: "f", label: "الدالة f", type: "expr", placeholder: "x^2 sin(x)", help: "استخدم ^ للأس، و sin cos tan ln log sqrt exp abs، والثابتين pi و e. الضرب الضمني مسموح مثل 2x." },
    { id: "v", label: "المتغير", type: "text", default: "x" },
    { id: "order", label: "رتبة المشتقة", type: "select", default: "1", options: [["1", "الأولى"], ["2", "الثانية"], ["3", "الثالثة"], ["4", "الرابعة"], ["5", "الخامسة"]] },
    { id: "at", label: "قيمة المتغير لحساب المشتقة عندها (اختياري)", type: "number", placeholder: "مثل 1.5" }
  ],
  example: { values: { f: "x^2 sin(x)", v: "x", order: "1", at: "" }, expect: ["x^2*cos(x) + 2*x*sin(x)"], note: "مثال: مشتقة $x^2\\sin x$ بقاعدة الضرب." },
  invalid: { values: { f: "x^2 +* 3", v: "x", order: "1" } },
  related: ["integral", "limit", "taylor-series", "function-plotter"]
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const order = Number(choice(input, "order", "رتبة المشتقة", ["1", "2", "3", "4", "5"], "1"));
  const at = num(input, "at", "نقطة التقييم", { optional: true });
  const steps = [];
  steps.push({ text: "الدالة بعد التبسيط:", tex: `f(${v}) = ${toTex(f)}` });
  let cur = f;
  const all = [];
  for (let k = 1; k <= order; k++) {
    const r = derivative(cur, v, { maxSteps: k === 1 ? 40 : 12 });
    if (order > 1) steps.push({ text: `المشتقة رقم ${k}: نشتق ناتج الخطوة السابقة.` });
    for (const s of r.steps) steps.push({ text: s.rule, tex: s.tex });
    cur = r.result;
    all.push(cur);
  }
  const prime = order === 1 ? "'" : order === 2 ? "''" : `^{(${order})}`;
  const results = [{ label: `المشتقة $f${prime}(${v})$`, tex: `f${prime}(${v}) = ${toTex(cur)}`, text: toText(cur) }];
  const blocks = [];
  if (at !== null) {
    const val = f1(cur, v)(at);
    if (!isFinite(val)) {
      blocks.push({ type: "note", tone: "warn", text: `المشتقة غير معرّفة عند ${v} = ${fmt(at)}.` });
    } else {
      results.push({ label: `القيمة عند ${v} = ${fmt(at)}`, value: val, text: fmt(val, 10) });
      steps.push({ text: `نعوّض ${v} = ${fmt(at)} في المشتقة:`, tex: `f${prime}(${ntex(at)}) = ${ntex(val, 10)}` });
      if (order <= 2) {
        const nd = derivNumeric(f1(f, v), at, order);
        if (isFinite(nd)) steps.push(`للتحقق: التقريب العددي بالفروق المركزية يعطي ${fmt(nd, 8)}.`);
      }
    }
  }
  return { results, steps, blocks, copy: `f${order === 1 ? "'" : order === 2 ? "''" : `(${order})`}(${v}) = ${toText(cur)}${at !== null && isFinite(f1(cur, v)(at)) ? `\nعند ${v} = ${fmt(at)}: ${fmt(f1(cur, v)(at), 10)}` : ""}` };
}
