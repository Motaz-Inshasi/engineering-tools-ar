import { fail, str, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { tCdf, tInv, pFormat, pText } from "./dist.js";

export const meta = {
  description: "أوجد خط أفضل مطابقة بطريقة المربعات الصغرى لبيانات (x, y)، مع معامل الارتباط r ومعامل التحديد R² واختبار دلالة الميل والتنبؤ، ونماذج أسية وقوى ولوغاريتمية، والرسم.",
  keywords: ["الانحدار الخطي", "المربعات الصغرى", "معامل الارتباط", "بيرسون", "R²", "linear regression", "least squares", "correlation", "خط أفضل مطابقة", "trendline", "انحدار أسي"],
  formulas: [
    { label: "الميل والمقطع", tex: "b = \\frac{S_{xy}}{S_{xx}},\\quad a = \\bar y - b\\bar x,\\qquad S_{xy} = \\sum (x_i-\\bar x)(y_i-\\bar y)" },
    { label: "معامل الارتباط", tex: "r = \\frac{S_{xy}}{\\sqrt{S_{xx} S_{yy}}},\\qquad t = \\frac{b}{SE_b},\\ \\ df = n - 2" }
  ],
  inputs: [
    { id: "data", label: "أزواج البيانات (x y)", type: "textarea", default: "1 2.1\n2 3.9\n3 6.2\n4 7.8\n5 10.1\n6 12.2", wide: true, help: "سطر لكل نقطة: x ثم y بينهما مسافة أو فاصلة." },
    { id: "model", label: "النموذج", type: "select", default: "linear", options: [["linear", "خطي y = a + bx"], ["exponential", "أسي y = a·e^(bx)"], ["power", "قوى y = a·x^b"], ["logarithmic", "لوغاريتمي y = a + b·ln x"]] },
    { id: "x0", label: "تنبؤ عند x (اختياري)", type: "number", default: "" }
  ],
  example: { values: { data: "1 2\n2 4\n3 5\n4 4\n5 5", model: "linear", x0: "6" }, expect: ["y = 2.2 + 0.6x", "r = 0.7746"], note: "مثال من كتب الإحصاء: خمس نقاط ونتنبأ بقيمة y عند x = 6." },
  invalid: { values: { data: "1 2\n1 3\n1 4", model: "linear", x0: "" } },
  related: ["descriptive-stats", "hypothesis-tests", "probability-distributions", "function-plotter"]
};

const sig = (v) => fmt(v, 4);

export function solve(input) {
  const model = choice(input, "model", "النموذج", ["linear", "exponential", "power", "logarithmic"], "linear");
  const lines = str(input, "data", "البيانات").split(/\r?\n|;|؛/).map((l) => l.trim()).filter(Boolean);
  const X = [], Y = [];
  lines.forEach((l, i) => {
    const p = l.split(/[\s,،\t]+/).filter(Boolean);
    if (p.length !== 2) fail(`السطر ${i + 1} يجب أن يحتوي قيمتين: x و y.`, "data");
    const x = parseNumber(p[0]), y = parseNumber(p[1]);
    if (!isFinite(x) || !isFinite(y)) fail(`السطر ${i + 1} يحتوي قيمة غير رقمية.`, "data");
    X.push(x); Y.push(y);
  });
  const n = X.length;
  if (n < 3) fail("أدخل ثلاث نقاط على الأقل.", "data");
  if ((model === "power" || model === "logarithmic") && X.some((x) => x <= 0)) fail("هذا النموذج يحتاج قيم x موجبة (لأخذ اللوغاريتم).", "data");
  if ((model === "exponential" || model === "power") && Y.some((y) => y <= 0)) fail("هذا النموذج يحتاج قيم y موجبة (لأخذ اللوغاريتم).", "data");
  const u = X.map((x) => (model === "power" || model === "logarithmic" ? Math.log(x) : x));
  const v = Y.map((y) => (model === "exponential" || model === "power" ? Math.log(y) : y));
  const mu = u.reduce((a, b) => a + b, 0) / n, mv = v.reduce((a, b) => a + b, 0) / n;
  let Sxx = 0, Syy = 0, Sxy = 0;
  for (let i = 0; i < n; i++) { Sxx += (u[i] - mu) ** 2; Syy += (v[i] - mv) ** 2; Sxy += (u[i] - mu) * (v[i] - mv); }
  if (Sxx === 0) fail("كل قيم x متساوية، فلا يمكن إيجاد خط انحدار.", "data");
  if (Syy === 0) fail("كل قيم y متساوية، فالعلاقة خط أفقي ولا معنى لمعامل الارتباط.", "data");
  const b = Sxy / Sxx, a0 = mv - b * mu;
  const r = Sxy / Math.sqrt(Sxx * Syy);
  const sse = Math.max(0, Syy - b * Sxy);
  const se = n > 2 ? Math.sqrt(sse / (n - 2)) : NaN;
  const seb = se / Math.sqrt(Sxx);
  const tstat = seb > 0 ? b / seb : Infinity;
  const p = seb > 0 ? 2 * (1 - tCdf(Math.abs(tstat), n - 2)) : 0;
  const tc = tInv(0.975, n - 2);
  const a = model === "exponential" || model === "power" ? Math.exp(a0) : a0;
  const f = (x) => {
    if (model === "linear") return a + b * x;
    if (model === "exponential") return a * Math.exp(b * x);
    if (model === "power") return a * Math.pow(x, b);
    return a + b * Math.log(x);
  };
  const sgn = (k) => (k < 0 ? "-" : "+");
  const eqText = {
    linear: `y = ${sig(a)} ${sgn(b)} ${sig(Math.abs(b))}x`,
    exponential: `y = ${sig(a)}·e^(${sig(b)}x)`,
    power: `y = ${sig(a)}·x^${sig(b)}`,
    logarithmic: `y = ${sig(a)} ${sgn(b)} ${sig(Math.abs(b))}·ln x`
  }[model];
  const eqTex = {
    linear: `\\hat y = ${ntex(a, 4)} ${sgn(b)} ${ntex(Math.abs(b), 4)}\\,x`,
    exponential: `\\hat y = ${ntex(a, 4)}\\,e^{${ntex(b, 4)}x}`,
    power: `\\hat y = ${ntex(a, 4)}\\,x^{${ntex(b, 4)}}`,
    logarithmic: `\\hat y = ${ntex(a, 4)} ${sgn(b)} ${ntex(Math.abs(b), 4)}\\ln x`
  }[model];
  const steps = [];
  if (model !== "linear") steps.push({ exponential: "نحوّل النموذج إلى خطي بأخذ ln y، فيصبح ln y = ln a + bx.", power: "نأخذ اللوغاريتم للطرفين: ln y = ln a + b·ln x، ثم ننفّذ انحداراً خطياً على (ln x, ln y).", logarithmic: "نستبدل x بـ ln x ثم ننفّذ انحداراً خطياً عادياً." }[model]);
  steps.push(
    { text: "المتوسطات ومجاميع المربعات:", tex: `\\bar u = ${ntex(mu, 6)},\\ \\bar v = ${ntex(mv, 6)},\\ S_{xx} = ${ntex(Sxx, 6)},\\ S_{yy} = ${ntex(Syy, 6)},\\ S_{xy} = ${ntex(Sxy, 6)}` },
    { text: "الميل والمقطع:", tex: `b = \\frac{${ntex(Sxy, 6)}}{${ntex(Sxx, 6)}} = ${ntex(b, 6)},\\quad ${model === "exponential" || model === "power" ? `\\ln a = ${ntex(a0, 6)} \\Rightarrow a = ${ntex(a, 6)}` : `a = ${ntex(mv, 6)} - (${ntex(b, 6)})(${ntex(mu, 6)}) = ${ntex(a, 6)}`}` },
    { text: "معادلة الانحدار:", tex: eqTex },
    { text: "معامل الارتباط ومعامل التحديد:", tex: `r = \\frac{${ntex(Sxy, 6)}}{\\sqrt{${ntex(Sxx, 6)} \\times ${ntex(Syy, 6)}}} = ${ntex(r, 5)},\\quad R^2 = ${ntex(r * r, 5)}` },
    { text: "اختبار دلالة الميل (H₀: b = 0):", tex: `SE_b = ${ntex(seb, 5)},\\quad t = ${isFinite(tstat) ? ntex(tstat, 5) : "\\infty"},\\quad df = ${n - 2},\\quad p = ${pFormat(p)}` }
  );
  const absr = Math.abs(r);
  const strength = absr >= 0.9 ? "قوي جداً" : absr >= 0.7 ? "قوي" : absr >= 0.5 ? "متوسط" : absr >= 0.3 ? "ضعيف" : "ضعيف جداً أو معدوم";
  const results = [
    { label: "معادلة الانحدار", value: eqText, tex: eqTex },
    { label: "الميل b", value: `${fmt(b, 6)} ± ${fmt(tc * seb, 4)} (95%)` },
    { label: model === "exponential" || model === "power" ? "المعامل a" : "المقطع a", value: fmt(a, 6) },
    { label: "معامل الارتباط r", value: fmt(r, 4), text: `r = ${fmt(r, 4)}` },
    { label: "معامل التحديد R²", value: fmt(r * r, 4) },
    { label: "قوة العلاقة واتجاهها", value: `${strength}، ${r > 0 ? "طردية" : r < 0 ? "عكسية" : "لا اتجاه"}` },
    { label: "الخطأ المعياري للتقدير", value: fmt(se, 4) },
    { label: "قيمة p للميل", value: `${pFormat(p)} ${p < 0.05 ? "(دال إحصائياً عند 0.05)" : "(غير دال عند 0.05)"}` }
  ];
  let copy = `${eqText}, r = ${fmt(r, 4)}, R² = ${fmt(r * r, 4)}, ${pText(p)}`;
  if (!isBlank(input.x0)) {
    const x0 = num(input, "x0", "قيمة التنبؤ x");
    if ((model === "power" || model === "logarithmic") && x0 <= 0) fail("التنبؤ في هذا النموذج يحتاج x موجبة.", "x0");
    const y0 = f(x0);
    results.push({ label: `التنبؤ عند x = ${fmt(x0)}`, value: fmt(y0, 6) });
    steps.push({ text: "التنبؤ:", tex: `\\hat y(${ntex(x0)}) = ${ntex(y0, 6)}` });
    copy += `, ŷ(${fmt(x0)}) = ${fmt(y0, 6)}`;
    const xmin = Math.min(...X), xmax = Math.max(...X);
    if (x0 < xmin || x0 > xmax) steps.push("تنبيه: قيمة x خارج مدى البيانات (استقراء)، فالتنبؤ أقل موثوقية.");
  }
  const xmin = Math.min(...X), xmax = Math.max(...X), pad = (xmax - xmin) * 0.05;
  const lo = model === "power" || model === "logarithmic" ? Math.max(xmin - pad, xmin / 2) : xmin - pad;
  const line = Array.from({ length: 201 }, (_, i) => { const x = lo + ((xmax + pad - lo) * i) / 200; return [x, f(x)]; });
  const rows = X.map((x, i) => [fmt(x, 6), fmt(Y[i], 6), fmt(f(x), 6), fmt(Y[i] - f(x), 4)]);
  return {
    results, steps, copy,
    blocks: [
      { type: "plot", title: "البيانات وخط الانحدار", xLabel: "x", yLabel: "y", series: [{ name: "البيانات", points: X.map((x, i) => [x, Y[i]]), marker: "o" }, { name: eqText, points: line }] },
      { type: "table", caption: "القيم المتوقعة والبواقي", head: ["x", "y", "ŷ", "الباقي y − ŷ"], rows: rows.slice(0, 200) }
    ]
  };
}
