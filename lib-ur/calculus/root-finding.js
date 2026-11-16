import { simplify, diff } from "../core/symbolic.js";
import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { bisection, newton, secant, sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "مساوات f(x) = 0 کی جڑ عددی طریقے سے نکالیں: تنصیف، نیوٹن-رافسن یا قاطع، ہر تکرار کے مکمل جدول اور جڑ کی جگہ دکھانے والے گراف کے ساتھ۔",
  keywords: ["جڑ", "مساوات حل کریں", "نیوٹن", "نیوٹن رافسن", "تنصیف", "bisection", "newton", "secant", "قاطع", "عددی طریقے"],
  formulas: [
    { label: "نیوٹن-رافسن", tex: "x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}" },
    { label: "قاطع", tex: "x_{n+1} = x_n - f(x_n)\\frac{x_n - x_{n-1}}{f(x_n) - f(x_{n-1})}" },
    { label: "تنصیف", tex: "m = \\frac{a+b}{2},\\quad f(a)\\,f(b) < 0" }
  ],
  inputs: [
    { id: "f", label: "تفاعل f(x)", type: "expr", placeholder: "x^3 - 2x - 5" },
    { id: "v", label: "متغیر", type: "text", default: "x" },
    { id: "method", label: "طریقہ", type: "select", default: "newton", options: [["newton", "نیوٹن-رافسن"], ["bisection", "تنصیف"], ["secant", "قاطع"]] },
    { id: "x0", label: "ابتدائی قدر x₀", type: "number", default: "2", when: { method: ["newton", "secant"] } },
    { id: "x1", label: "دوسری قدر x₁", type: "number", default: "3", when: { method: ["secant"] } },
    { id: "a", label: "وقفے کا آغاز a", type: "number", default: "2", when: { method: ["bisection"] } },
    { id: "b", label: "وقفے کا اختتام b", type: "number", default: "3", when: { method: ["bisection"] } },
    { id: "tol", label: "مطلوبہ درستگی", type: "number", default: "1e-10" }
  ],
  example: { values: { f: "x^3 - 2x - 5", v: "x", method: "newton", x0: "2", tol: "1e-10" }, expect: ["2.0945514815"], note: "نیوٹن کی مشہور مثال: $x^3 - 2x - 5 = 0$ کی جڑ 2 کے قریب۔" },
  invalid: { values: { f: "x^2 + 1", method: "bisection", a: "0", b: "1" } },
  related: ["polynomial-roots", "quadratic", "function-plotter", "derivative"]
};

const REASONS = {
  sign: "f(a) اور f(b) کے اشارے یکساں ہیں، اس لیے تنصیف جڑ کے موجود ہونے کی ضمانت نہیں دیتی۔ ایسا وقفہ چنیں جس میں تفاعل کا اشارہ بدلتا ہو۔",
  undefined: "تفاعل حساب کے ایک نقطے پر غیر متعین ہے۔ کوئی اور ابتدائی قدر آزمائیں۔",
  zeroDerivative: "ایک نقطے پر مشتق صفر ہے، اس لیے نیوٹن کا طریقہ رک گیا۔ کوئی اور ابتدائی قدر آزمائیں۔",
  diverged: "طریقہ منتشر ہو گیا اور متقارب نہیں ہوا۔ جڑ کے زیادہ قریب ابتدائی قدر آزمائیں۔",
  maxIter: "طریقہ 100 تکرارات میں متقارب نہیں ہوا۔ کوئی اور ابتدائی قدر یا تنصیف کا طریقہ آزمائیں۔",
  flat: "تفاعل کی دو متوالی نقاط پر قدریں برابر ہیں، اس لیے قاطع کا طریقہ رک گیا۔"
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const method = choice(input, "method", "طریقہ", ["newton", "bisection", "secant"], "newton");
  const tol = num(input, "tol", "درستگی", { positive: true, default: 1e-10 });
  const F = f1(f, v);
  const steps = [{ text: "حل کی جانے والی مساوات:", tex: `${toTex(f)} = 0` }];
  let r, rows, head, start, field;
  if (method === "newton") {
    const x0 = num(input, "x0", "ابتدائی قدر");
    const d = diff(f, v);
    steps.push({ text: "ہم مشتق رمزی طور پر نکالتے ہیں:", tex: `f'(${v}) = ${toTex(d)}` });
    steps.push(`${v}₀ = ${fmt(x0)} سے شروع کرتے ہیں اور فارمولا اس وقت تک دہراتے ہیں جب تک تبدیلی ${fmt(tol)} سے چھوٹی نہ ہو جائے۔`);
    r = newton(F, f1(d, v), x0, { tol });
    head = ["n", "xₙ", "f(xₙ)", "f'(xₙ)", "xₙ₊₁"];
    rows = r.rows.map((q) => [q.i, fmt(q.x, 12), fmt(q.fx, 4), fmt(q.dfx, 6), fmt(q.next, 12)]);
    start = [x0]; field = "x0";
  } else if (method === "secant") {
    const x0 = num(input, "x0", "ابتدائی قدر"), x1 = num(input, "x1", "دوسری قدر");
    if (x0 === x1) fail("دونوں ابتدائی قدریں مختلف ہونی چاہئیں۔", "x1");
    steps.push(`${v}₀ = ${fmt(x0)} اور ${v}₁ = ${fmt(x1)} سے شروع کرتے ہیں اور قاطع کا قاعدہ دہراتے ہیں۔`);
    r = secant(F, x0, x1, { tol });
    head = ["n", "xₙ₋₁", "xₙ", "f(xₙ)", "xₙ₊₁"];
    rows = r.rows.map((q) => [q.i, fmt(q.x0, 12), fmt(q.x1, 12), fmt(q.fx1, 4), fmt(q.next, 12)]);
    start = [x0, x1]; field = "x0";
  } else {
    const a = num(input, "a", "وقفے کا آغاز"), b = num(input, "b", "وقفے کا اختتام");
    if (a >= b) fail("وقفے کا آغاز اس کے اختتام سے چھوٹا ہونا چاہیے۔", "b");
    const fa = F(a), fb = F(b);
    steps.push(`اشارے کی تبدیلی جانچتے ہیں: f(${fmt(a)}) = ${fmt(fa)} اور f(${fmt(b)}) = ${fmt(fb)}۔`);
    r = bisection(F, a, b, { tol });
    head = ["n", "a", "b", "m", "f(m)"];
    rows = r.rows.map((q) => [q.i, fmt(q.a, 12), fmt(q.b, 12), fmt(q.x, 12), fmt(q.fx, 4)]);
    if (rows.length > 60) rows.splice(30, rows.length - 60, ["…", "…", "…", "…", "…"]);
    start = [a, b]; field = r.reason === "sign" ? "b" : "a";
  }
  if (!r.ok) fail(REASONS[r.reason] || "جڑ نہیں ملی۔", field);
  const root = r.root;
  const fr = F(root);
  steps.push(`طریقہ ${r.iterations} تکرار کے بعد ${v} ≈ ${fmt(root, 12)} پر متقارب ہو گیا۔`);
  steps.push({ text: "تصدیق کے لیے ہم جڑ کو تفاعل میں رکھتے ہیں:", tex: `f(${ntex(root, 12)}) = ${ntex(fr, 3)}` });
  const lo = Math.min(root, ...start), hi = Math.max(root, ...start);
  const pad = Math.max(1, (hi - lo) * 0.6);
  return {
    results: [
      { label: "جڑ", value: root, sig: 12 },
      { label: "جڑ پر تفاعل کی قدر", value: fr, sig: 3 },
      { label: "تکرارات کی تعداد", value: r.iterations }
    ],
    blocks: [
      { type: "table", caption: "تکرارات کا جدول", head, rows: rows.map((rw) => rw.map(String)) },
      { type: "plot", title: "تفاعل اور جڑ کی جگہ", xLabel: v, yLabel: `f(${v})`, series: [{ name: `f(${v})`, points: sampleFunction(F, lo - pad, hi + pad, 400) }, { name: "جڑ", points: [[root, 0]], marker: "o" }] }
    ],
    steps,
    copy: `جڑ ${v} ≈ ${fmt(root, 12)} (f = ${fmt(fr, 3)}، ${r.iterations} تکرار)`
  };
}
