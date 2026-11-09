import { simplify } from "../core/symbolic.js";
import { fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt } from "../core/format.js";
import { bisection, sampleFunction } from "../core/numeric.js";
import { readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "ارسم حتى ثلاث دوال معاً على مجال تختاره، مع إيجاد تقاطعات الدالة الأولى مع المحورين تلقائياً.",
  keywords: ["رسم دالة", "رسم بياني", "plot", "graph", "منحنى", "رسم الدوال"],
  formulas: [{ label: "الجذور تُحسب من تغير الإشارة ثم بالتنصيف", tex: "f(x_i)\\,f(x_{i+1}) < 0 \\Rightarrow \\exists\\, r \\in (x_i, x_{i+1}): f(r) = 0" }],
  inputs: [
    { id: "f1", label: "الدالة الأولى f(x)", type: "expr", placeholder: "sin(x)" },
    { id: "f2", label: "الدالة الثانية g(x) (اختياري)", type: "expr", placeholder: "cos(x)" },
    { id: "f3", label: "الدالة الثالثة h(x) (اختياري)", type: "expr" },
    { id: "xmin", label: "أصغر x", type: "number", default: "-10" },
    { id: "xmax", label: "أكبر x", type: "number", default: "10" },
    { id: "ymin", label: "أصغر y (اختياري)", type: "number" },
    { id: "ymax", label: "أكبر y (اختياري)", type: "number" }
  ],
  example: { values: { f1: "x^2 - 4", f2: "2x + 1", f3: "", xmin: "-5", xmax: "5", ymin: "", ymax: "" }, expect: ["x = -2", "x = 2"], note: "مثال: القطع المكافئ $x^2-4$ مع المستقيم $2x+1$." },
  invalid: { values: { f1: "x^2", xmin: "5", xmax: "1" } },
  related: ["root-finding", "derivative", "integral", "trigonometry"]
};

export function findRoots(F, a, b, n = 2000) {
  const roots = [];
  let px = a, py = F(a);
  if (py === 0) roots.push(a);
  for (let i = 1; i <= n; i++) {
    const x = a + ((b - a) * i) / n, y = F(x);
    if (isFinite(py) && isFinite(y)) {
      if (y === 0) roots.push(x);
      else if (py * y < 0) {
        const r = bisection(F, px, x, { tol: 1e-13 });
        const mid = F(r.root);
        if (r.ok && isFinite(mid) && Math.abs(mid) < 1e-6 * Math.max(1, Math.abs(py), Math.abs(y))) roots.push(r.root);
      }
    }
    px = x; py = y;
  }
  return roots.filter((r, i) => i === 0 || Math.abs(r - roots[i - 1]) > 1e-9).map((r) => (Math.abs(r - Math.round(r)) < 1e-9 ? Math.round(r) : r));
}

export function solve(input) {
  const v = "x";
  const exprs = [];
  for (const [k, name] of [["f1", "f"], ["f2", "g"], ["f3", "h"]]) {
    if (k !== "f1" && isBlank(input[k])) continue;
    exprs.push({ name, node: simplify(readExpr(input, k, v, `الدالة ${name}`)) });
  }
  const xmin = num(input, "xmin", "أصغر x"), xmax = num(input, "xmax", "أكبر x");
  if (xmin >= xmax) fail("أصغر x يجب أن يكون أقل من أكبر x.", "xmax");
  if (xmax - xmin > 1e6) fail("المجال واسع جداً للرسم.", "xmax");
  const ymin = num(input, "ymin", "أصغر y", { optional: true }), ymax = num(input, "ymax", "أكبر y", { optional: true });
  if (ymin !== null && ymax !== null && ymin >= ymax) fail("أصغر y يجب أن يكون أقل من أكبر y.", "ymax");
  const series = exprs.map((e) => ({ name: `${e.name}(x) = ${toText(e.node)}`, points: sampleFunction(f1(e.node, v), xmin, xmax, 800) }));
  const F = f1(exprs[0].node, v);
  const roots = findRoots(F, xmin, xmax);
  const y0 = xmin <= 0 && xmax >= 0 ? F(0) : NaN;
  const steps = exprs.map((e) => ({ text: `الدالة ${e.name} بعد التبسيط:`, tex: `${e.name}(x) = ${toTex(e.node)}` }));
  steps.push(`قيّمنا كل دالة عند 800 نقطة متساوية البعد بين ${fmt(xmin)} و ${fmt(xmax)}، وتُركت فجوة عند النقاط غير المعرّفة.`);
  const rootsTex = roots.map((r) => "$x = " + fmt(r, 8) + "$").join("، ");
  steps.push(roots.length ? "بحثنا عن تغير إشارة f بين النقاط المتجاورة، ثم حسّنّا كل جذر بالتنصيف: " + rootsTex + "." : "لم نجد تغير إشارة للدالة f في هذا المجال، أي لا جذور بسيطة فيه.");
  if (isFinite(y0)) steps.push("نقطة التقاطع مع محور y هي $f(0) = " + fmt(y0, 8) + "$.");
  const results = [
    { label: "جذور f في المجال", value: roots.length ? roots.map((r) => `x = ${fmt(r, 8)}`).join("، ") : "لا توجد" },
    { label: "التقاطع مع محور y", value: isFinite(y0) ? `f(0) = ${fmt(y0, 8)}` : "غير معرّف أو خارج المجال" }
  ];
  const block = { type: "plot", title: "رسم الدوال", xLabel: "x", yLabel: "y", series, xMin: xmin, xMax: xmax };
  if (ymin !== null) block.yMin = ymin;
  if (ymax !== null) block.yMax = ymax;
  if (roots.length) series.push({ name: "جذور f", points: roots.map((r) => [r, 0]), marker: "o" });
  return { results, steps, blocks: [block], copy: `جذور f: ${roots.length ? roots.map((r) => `x = ${fmt(r, 8)}`).join(", ") : "لا توجد"}` };
}
