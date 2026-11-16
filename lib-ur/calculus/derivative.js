import { derivative, simplify } from "../core/symbolic.js";
import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { derivNumeric } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "کسی بھی تفاعل کا علامتی طور پر مشتق نکالیں، استعمال ہونے والے ہر اشتقاقی قاعدے کی وضاحت کے ساتھ: طاقت، ضرب، تقسیم، زنجیری، مثلثاتی، قوت نما اور لوگاریتمی تفاعل۔",
  intro: "تفاعل لکھیں اور اس کا پہلا یا اعلیٰ مشتق حاصل کریں، ہر مرحلے پر استعمال شدہ قاعدے کی وضاحت کے ساتھ، اور اگر چاہیں تو کسی نقطے پر مشتق کی قدر بھی۔",
  keywords: ["مشتق", "اشتقاق", "تفاضل", "derivative", "زنجیری قاعدہ", "ضرب کا قاعدہ", "تقسیم کا قاعدہ"],
  formulas: [
    { label: "طاقت کا قاعدہ اور ضرب کا قاعدہ", tex: "\\frac{d}{dx}x^n = n x^{n-1}, \\qquad (uv)' = u'v + uv'" },
    { label: "تقسیم کا قاعدہ اور زنجیری قاعدہ", tex: "\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}, \\qquad \\frac{d}{dx}f(g(x)) = f'(g(x))\\,g'(x)" }
  ],
  inputs: [
    { id: "f", label: "تفاعل f", type: "expr", placeholder: "x^2 sin(x)", help: "طاقت کے لیے ^ استعمال کریں، اور sin cos tan ln log sqrt exp abs، اور مستقل pi اور e۔ 2x جیسی ضمنی ضرب کی اجازت ہے۔" },
    { id: "v", label: "متغیر", type: "text", default: "x" },
    { id: "order", label: "مشتق کی ترتیب", type: "select", default: "1", options: [["1", "پہلا"], ["2", "دوسرا"], ["3", "تیسرا"], ["4", "چوتھا"], ["5", "پانچواں"]] },
    { id: "at", label: "متغیر کی وہ قدر جس پر مشتق نکالنا ہے (اختیاری)", type: "number", placeholder: "مثلاً 1.5" }
  ],
  example: { values: { f: "x^2 sin(x)", v: "x", order: "1", at: "" }, expect: ["x^2*cos(x) + 2*x*sin(x)"], note: "مثال: $x^2\\sin x$ کا مشتق ضرب کے قاعدے سے۔" },
  invalid: { values: { f: "x^2 +* 3", v: "x", order: "1" } },
  related: ["integral", "limit", "taylor-series", "function-plotter"]
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const order = Number(choice(input, "order", "مشتق کی ترتیب", ["1", "2", "3", "4", "5"], "1"));
  const at = num(input, "at", "جانچ کا نقطہ", { optional: true });
  const steps = [];
  steps.push({ text: "تفاعل سادہ کرنے کے بعد:", tex: `f(${v}) = ${toTex(f)}` });
  let cur = f;
  const all = [];
  for (let k = 1; k <= order; k++) {
    const r = derivative(cur, v, { maxSteps: k === 1 ? 40 : 12 });
    if (order > 1) steps.push({ text: `مشتق نمبر ${k}: ہم پچھلے مرحلے کے نتیجے کا مشتق لیتے ہیں۔` });
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
      blocks.push({ type: "note", tone: "warn", text: `${v} = ${fmt(at)} پر مشتق غیر متعین ہے۔` });
    } else {
      results.push({ label: `${v} = ${fmt(at)} پر قدر`, value: val, text: fmt(val, 10) });
      steps.push({ text: `مشتق میں ${v} = ${fmt(at)} رکھتے ہیں:`, tex: `f${prime}(${ntex(at)}) = ${ntex(val, 10)}` });
      if (order <= 2) {
        const nd = derivNumeric(f1(f, v), at, order);
        if (isFinite(nd)) steps.push(`تصدیق کے لیے: مرکزی فرقوں کے ساتھ عددی تقریب ${fmt(nd, 8)} دیتی ہے۔`);
      }
    }
  }
  return { results, steps, blocks, copy: `f${order === 1 ? "'" : order === 2 ? "''" : `(${order})`}(${v}) = ${toText(cur)}${at !== null && isFinite(f1(cur, v)(at)) ? `
${v} = ${fmt(at)} پر: ${fmt(f1(cur, v)(at), 10)}` : ""}` };
}
