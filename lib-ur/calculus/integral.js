import { integrate, simplify } from "../core/symbolic.js";
import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, niceTex, nice } from "../core/format.js";
import { integrateNumeric, sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "کسی بھی تفاعل کا غیر معین اور معین تکمل نکالیں: جہاں علامتی حل قابلِ اعتماد ہو وہاں اقدام کے ساتھ حل، اور جہاں علامتی حل دستیاب نہ ہو وہاں واضح نام والی درست عددی قدر۔",
  intro: "علامتی تکمل طاقت، مثلثاتی، قوت نما اور لوگاریتمی تفاعل، تبدیلی متغیر، جز بہ جز اور جزوی کسور کو سپورٹ کرتا ہے۔ ہر علامتی نتیجہ دکھانے سے پہلے عددی طور پر جانچا جاتا ہے۔",
  keywords: ["تکمل", "integral", "معین تکمل", "غیر معین تکمل", "منحنی کے نیچے کا رقبہ", "جز بہ جز تکمل", "تبدیلی متغیر"],
  formulas: [
    { label: "غیر معین اور معین تکمل", tex: "\\int f(x)\\,dx = F(x) + C, \\qquad \\int_a^b f(x)\\,dx = F(b) - F(a)" },
    { label: "طاقت کا قاعدہ اور جز بہ جز", tex: "\\int x^n dx = \\frac{x^{n+1}}{n+1} + C,\\qquad \\int u\\,dv = uv - \\int v\\,du" }
  ],
  inputs: [
    { id: "f", label: "تکمل کیا جانے والا تفاعل", type: "expr", placeholder: "x e^x", help: "مثلاً: x^2 sin(x)، 1/(x^2+1)، e^(2x)، ln(x)" },
    { id: "v", label: "متغیر", type: "text", default: "x" },
    { id: "mode", label: "تکمل کی قسم", type: "select", default: "indefinite", options: [["indefinite", "غیر معین"], ["definite", "معین"]] },
    { id: "a", label: "کم سے کم حد a", type: "number", when: { mode: ["definite"] }, help: "inf یا -inf لکھا جا سکتا ہے" },
    { id: "b", label: "زیادہ سے زیادہ حد b", type: "number", when: { mode: ["definite"] } }
  ],
  example: { values: { f: "x e^x", v: "x", mode: "definite", a: "0", b: "1" }, expect: ["= 1"], note: "مثال: $\\int_0^1 x e^x\\,dx$ جز بہ جز کے ذریعے، نتیجہ 1۔" },
  invalid: { values: { f: "sin(x", mode: "indefinite" } },
  related: ["derivative", "function-plotter", "laplace", "partial-fractions"]
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const mode = choice(input, "mode", "تکمل کی قسم", ["indefinite", "definite"], "indefinite");
  const steps = [{ text: "تفاعل سادہ کرنے کے بعد:", tex: `f(${v}) = ${toTex(f)}` }];
  const blocks = [];
  const sym = integrate(f, v);
  if (sym) {
    for (const s of sym.steps) steps.push({ text: s.rule, tex: s.tex });
    steps.push(`ہم نے نتیجے کو عددی طور پر اشتقاق کر کے اور کئی نقاط پر اصل تفاعل سے موازنہ کر کے تصدیق کی۔`);
  }
  if (mode === "indefinite") {
    if (!sym) {
      blocks.push({ type: "note", tone: "warn", text: "ان معاون قواعد کے ساتھ اس تفاعل کا قابلِ اعتماد علامتی تکمل نہیں ملا۔ ممکن ہے اس کا ابتدائی تفاعلات میں تکمل موجود نہ ہو (مثلاً $e^{x^2}$)۔ عددی قدر کے لیے معین تکمل آزمائیں۔" });
      return { results: [{ label: "غیر معین تکمل", value: "علامتی طور پر دستیاب نہیں" }], steps, blocks, copy: "غیر معین تکمل علامتی طور پر دستیاب نہیں ہے" };
    }
    return {
      results: [{ label: "غیر معین تکمل", tex: `\\int ${toTex(f)}\\,d${v} = ${toTex(sym.result)} + C`, text: `${toText(sym.result)} + C` }],
      steps, blocks, copy: `∫ ${toText(f)} d${v} = ${toText(sym.result)} + C`
    };
  }
  const a = num(input, "a", "کم سے کم حد", { allowInfinity: true });
  const b = num(input, "b", "زیادہ سے زیادہ حد", { allowInfinity: true });
  if (a === b) fail("دونوں حدیں برابر ہیں، اس لیے تکمل صفر ہے۔ دو مختلف حدیں درج کریں۔", "b");
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
      steps.push({ text: `ہم حسابی تفاضل و تکمل کا بنیادی نظریہ لاگو کرتے ہیں: $F(b) - F(a)$`, tex: `F(${ntex(b)}) - F(${ntex(a)}) = ${ntex(Fb, 10)} - (${ntex(Fa, 10)}) = ${ntex(val, 10)}` });
    } else if (!continuous) {
      blocks.push({ type: "note", tone: "warn", text: "تفاعل تکمل کے وقفے کے اندر کسی نقطے پر غیر متعین ہے، اس لیے $F(b)-F(a)$ کا براہِ راست اطلاق درست نہیں۔" });
    }
  }
  const results = [];
  if (exact !== null) {
    const shown = Math.abs(exact - Math.round(exact)) < 1e-10 ? Math.round(exact) : exact;
    results.push({ label: "معین تکمل کی قدر", tex: `\\int_{${ntex(a)}}^{${ntex(b)}} ${toTex(f)}\\,d${v} = ${niceTex(shown, 10)}`, text: `= ${nice(shown, 10)}` });
    results.push({ label: "اعشاری قدر", value: exact, sig: 12 });
  } else {
    if (!numeric.ok || !isFinite(numeric.value)) {
      blocks.push({ type: "note", tone: "warn", text: "تکمل متقارب نہیں ہے یا تفاعل وقفے میں غیر محدود ہے، اس لیے قابلِ اعتماد قدر نہیں دی جا سکتی۔" });
      return { results: [{ label: "معین تکمل کی قدر", value: "غیر متقارب یا غیر متعین" }], steps, blocks, copy: "تکمل غیر متقارب ہے" };
    }
    results.push({ label: "معین تکمل کی قدر (عددی تقریب)", value: numeric.value, sig: 10, text: `≈ ${fmt(numeric.value, 10)}` });
    results.push({ label: "عددی خرابی کا تخمینہ", value: numeric.error, sig: 2 });
    steps.push(`ہم نے قدر کو عددی طور پر گاؤس-کرونروڈ تطبیقی طریقے (15 نقاط) سے نکالا، وقفے کو ${numeric.intervals} حصوں میں تقسیم کر کے۔`);
    if (!isFinite(a) || !isFinite(b)) steps.push("لامحدود حدوں کے لیے ہم نے عددی تکمل سے پہلے متغیر کی ایسی تبدیلی استعمال کی جو وقفے کو محدود بنا دیتی ہے۔");
    blocks.push({ type: "note", text: "یہ ایک تقریبی عددی قدر ہے، علامتی نتیجہ نہیں۔" });
  }
  if (isFinite(a) && isFinite(b)) {
    const lo = Math.min(a, b), hi = Math.max(a, b), pad = (hi - lo) * 0.25;
    blocks.push({ type: "plot", title: `تکمل کی حدوں کے ساتھ تفاعل کا گراف`, xLabel: v, yLabel: `f(${v})`, series: [{ name: `f(${v})`, points: sampleFunction(F, lo - pad, hi + pad, 400) }], vlines: [{ x: lo }, { x: hi }] });
  }
  const copyVal = exact !== null ? nice(exact, 10) : `≈ ${fmt(numeric.value, 10)}`;
  return { results, steps, blocks, copy: `∫ ${fmt(a)} سے ${fmt(b)} تک، ${toText(f)} کا d${v} = ${copyVal}` };
}
