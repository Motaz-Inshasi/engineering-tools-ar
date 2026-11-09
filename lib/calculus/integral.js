import { integrate, simplify } from "../core/symbolic.js";
import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, niceTex, nice } from "../core/format.js";
import { integrateNumeric, sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "احسب التكامل غير المحدد والمحدد لأي دالة: حل رمزي مع الخطوات عندما يكون موثوقاً، وقيمة عددية دقيقة واضحة التسمية عندما لا يتوفر حل رمزي.",
  intro: "التكامل الرمزي يدعم القوة والدوال المثلثية والأسية واللوغاريتمية والتعويض والتجزئة والكسور الجزئية. كل نتيجة رمزية تُفحص عددياً قبل عرضها.",
  keywords: ["تكامل", "integral", "تكامل محدد", "تكامل غير محدد", "مساحة تحت المنحنى", "تكامل بالتجزئة", "تعويض"],
  formulas: [
    { label: "التكامل غير المحدد والمحدد", tex: "\\int f(x)\\,dx = F(x) + C, \\qquad \\int_a^b f(x)\\,dx = F(b) - F(a)" },
    { label: "قاعدة القوة والتجزئة", tex: "\\int x^n dx = \\frac{x^{n+1}}{n+1} + C,\\qquad \\int u\\,dv = uv - \\int v\\,du" }
  ],
  inputs: [
    { id: "f", label: "الدالة المراد تكاملها", type: "expr", placeholder: "x e^x", help: "مثل: x^2 sin(x)، 1/(x^2+1)، e^(2x)، ln(x)" },
    { id: "v", label: "المتغير", type: "text", default: "x" },
    { id: "mode", label: "نوع التكامل", type: "select", default: "indefinite", options: [["indefinite", "غير محدد"], ["definite", "محدد"]] },
    { id: "a", label: "الحد الأدنى a", type: "number", when: { mode: ["definite"] }, help: "يمكن كتابة inf أو -inf" },
    { id: "b", label: "الحد الأعلى b", type: "number", when: { mode: ["definite"] } }
  ],
  example: { values: { f: "x e^x", v: "x", mode: "definite", a: "0", b: "1" }, expect: ["= 1"], note: "مثال: $\\int_0^1 x e^x\\,dx$ بالتجزئة، والناتج 1." },
  invalid: { values: { f: "sin(x", mode: "indefinite" } },
  related: ["derivative", "function-plotter", "laplace", "partial-fractions"]
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const mode = choice(input, "mode", "نوع التكامل", ["indefinite", "definite"], "indefinite");
  const steps = [{ text: "الدالة بعد التبسيط:", tex: `f(${v}) = ${toTex(f)}` }];
  const blocks = [];
  const sym = integrate(f, v);
  if (sym) {
    for (const s of sym.steps) steps.push({ text: s.rule, tex: s.tex });
    steps.push(`تحقّقنا من صحة الناتج باشتقاقه عددياً ومقارنته بالدالة الأصلية عند عدة نقاط.`);
  }
  if (mode === "indefinite") {
    if (!sym) {
      blocks.push({ type: "note", tone: "warn", text: "لم نجد تكاملاً رمزياً موثوقاً لهذه الدالة بالقواعد المدعومة. قد لا يكون لها تكامل بدوال أولية (مثل $e^{x^2}$). جرّب التكامل المحدد للحصول على قيمة عددية." });
      return { results: [{ label: "التكامل غير المحدد", value: "غير متاح رمزياً" }], steps, blocks, copy: "التكامل غير المحدد غير متاح رمزياً" };
    }
    return {
      results: [{ label: "التكامل غير المحدد", tex: `\\int ${toTex(f)}\\,d${v} = ${toTex(sym.result)} + C`, text: `${toText(sym.result)} + C` }],
      steps, blocks, copy: `∫ ${toText(f)} d${v} = ${toText(sym.result)} + C`
    };
  }
  const a = num(input, "a", "الحد الأدنى", { allowInfinity: true });
  const b = num(input, "b", "الحد الأعلى", { allowInfinity: true });
  if (a === b) fail("الحدان متساويان، والتكامل يساوي صفراً. أدخل حدين مختلفين.", "b");
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
      steps.push({ text: `نطبق النظرية الأساسية للتفاضل والتكامل: $F(b) - F(a)$`, tex: `F(${ntex(b)}) - F(${ntex(a)}) = ${ntex(Fb, 10)} - (${ntex(Fa, 10)}) = ${ntex(val, 10)}` });
    } else if (!continuous) {
      blocks.push({ type: "note", tone: "warn", text: "الدالة غير معرّفة عند نقطة داخل مجال التكامل، لذلك لا يصح تطبيق $F(b)-F(a)$ مباشرة." });
    }
  }
  const results = [];
  if (exact !== null) {
    const shown = Math.abs(exact - Math.round(exact)) < 1e-10 ? Math.round(exact) : exact;
    results.push({ label: "قيمة التكامل المحدد", tex: `\\int_{${ntex(a)}}^{${ntex(b)}} ${toTex(f)}\\,d${v} = ${niceTex(shown, 10)}`, text: `= ${nice(shown, 10)}` });
    results.push({ label: "القيمة العشرية", value: exact, sig: 12 });
  } else {
    if (!numeric.ok || !isFinite(numeric.value)) {
      blocks.push({ type: "note", tone: "warn", text: "التكامل لا يتقارب أو الدالة غير محدودة في المجال، فلا يمكن إعطاء قيمة موثوقة." });
      return { results: [{ label: "قيمة التكامل المحدد", value: "غير متقارب أو غير محدد" }], steps, blocks, copy: "التكامل غير متقارب" };
    }
    results.push({ label: "قيمة التكامل المحدد (تقريب عددي)", value: numeric.value, sig: 10, text: `≈ ${fmt(numeric.value, 10)}` });
    results.push({ label: "تقدير الخطأ العددي", value: numeric.error, sig: 2 });
    steps.push(`حسبنا القيمة عددياً بطريقة غاوس-كرونرود التكيفية (15 نقطة) بتقسيم المجال إلى ${numeric.intervals} جزءاً.`);
    if (!isFinite(a) || !isFinite(b)) steps.push("للحدود اللانهائية استخدمنا تحويل متغير يجعل المجال محدوداً قبل التكامل العددي.");
    blocks.push({ type: "note", text: "هذه قيمة عددية تقريبية وليست ناتجاً رمزياً." });
  }
  if (isFinite(a) && isFinite(b)) {
    const lo = Math.min(a, b), hi = Math.max(a, b), pad = (hi - lo) * 0.25;
    blocks.push({ type: "plot", title: `منحنى الدالة مع حدود التكامل`, xLabel: v, yLabel: `f(${v})`, series: [{ name: `f(${v})`, points: sampleFunction(F, lo - pad, hi + pad, 400) }], vlines: [{ x: lo }, { x: hi }] });
  }
  const copyVal = exact !== null ? nice(exact, 10) : `≈ ${fmt(numeric.value, 10)}`;
  return { results, steps, blocks, copy: `∫ من ${fmt(a)} إلى ${fmt(b)} لـ ${toText(f)} d${v} = ${copyVal}` };
}
