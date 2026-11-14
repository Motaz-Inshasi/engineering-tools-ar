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

const safe = (F) => (x) => { let y; try { y = F(x); } catch { y = NaN; } return Number.isFinite(y) ? y : NaN; };

function minimize(g, a, b) {
  const R = (Math.sqrt(5) - 1) / 2;
  let c = b - R * (b - a), d = a + R * (b - a), gc = g(c), gd = g(d);
  for (let i = 0; i < 200 && b - a > 1e-15 * Math.max(1, Math.abs(a) + Math.abs(b)); i++) {
    if (!(gd < gc)) { b = d; d = c; gd = gc; c = b - R * (b - a); gc = g(c); }
    else { a = c; c = d; gc = gd; d = a + R * (b - a); gd = g(d); }
  }
  return gc < gd ? c : d;
}

function snap(F, r) {
  const fr = Math.abs(F(r));
  for (let k = 0; k <= 9; k++) {
    const p = 10 ** k, c = Math.round(r * p) / p;
    if (Math.abs(c - r) < 1e-7 * Math.max(1, Math.abs(r)) && Math.abs(F(c)) <= fr) return c === 0 ? 0 : c;
  }
  return r;
}

export function rootSamples(a, b) {
  return Math.min(200000, Math.max(4000, Math.ceil((b - a) * 40)));
}

export function findRoots(F0, a, b, n = rootSamples(a, b)) {
  const F = safe(F0);
  const xs = new Float64Array(n + 1), ys = new Float64Array(n + 1);
  for (let i = 0; i <= n; i++) { xs[i] = i === n ? b : a + ((b - a) * i) / n; ys[i] = F(xs[i]); }
  const found = [];
  const accept = (r, scale) => { const y = F(r); if (isFinite(y) && Math.abs(y) <= 1e-7 * Math.max(1, scale)) found.push(r); };
  const cross = (x0, x1, scale) => { const r = bisection(F, x0, x1, { tol: 1e-14 }); if (r.ok) accept(r.root, scale); };
  for (let i = 0; i <= n; i++) {
    const y = ys[i];
    if (y === 0) {
      found.push(xs[i]);
      for (const j of [i - 1, i + 1]) {
        if (j < 0 || j > n || !isFinite(ys[j]) || ys[j] === 0) continue;
        const s = Math.sign(ys[j]), g = (x) => { const w = F(x); return isFinite(w) ? s * w : Infinity; };
        const lo = Math.min(xs[i], xs[j]), hi = Math.max(xs[i], xs[j]);
        const m = minimize(g, lo, hi);
        if (g(m) < 0) cross(xs[j] < m ? xs[j] : m, xs[j] < m ? m : xs[j], Math.abs(ys[j]));
      }
      continue;
    }
    if (i < n && isFinite(y) && isFinite(ys[i + 1]) && ys[i + 1] !== 0 && y * ys[i + 1] < 0) cross(xs[i], xs[i + 1], Math.max(Math.abs(y), Math.abs(ys[i + 1])));
    if (i === 0 || i === n || !isFinite(y)) continue;
    const yl = ys[i - 1], yr = ys[i + 1];
    if (!isFinite(yl) || !isFinite(yr) || yl * y <= 0 || yr * y <= 0) continue;
    if (Math.abs(y) > Math.abs(yl) || Math.abs(y) > Math.abs(yr)) continue;
    const s = Math.sign(y), g = (x) => { const v = F(x); return isFinite(v) ? s * v : Infinity; };
    const m = minimize(g, xs[i - 1], xs[i + 1]), gm = g(m), scale = Math.max(Math.abs(yl), Math.abs(yr));
    if (gm < 0) { cross(xs[i - 1], m, scale); cross(m, xs[i + 1], scale); }
    else if (gm <= 1e-10 * Math.max(1, scale)) found.push(m);
  }
  found.sort((p, q) => p - q);
  const out = [];
  for (const r of found) {
    const v = snap(F, r);
    if (!out.length || Math.abs(v - out[out.length - 1]) > 1e-7 * Math.max(1, Math.abs(v))) out.push(v);
  }
  return out;
}

const PI_DEN = [1, 2, 3, 4, 5, 6, 8, 10, 12];

function piText(d) {
  for (const q of PI_DEN) {
    const p = Math.round((d * q) / Math.PI);
    if (p > 0 && Math.abs(d - (p * Math.PI) / q) < 1e-7 * d) return (p === 1 ? "" : p) + "π" + (q === 1 ? "" : "/" + q);
  }
  return fmt(d, 8);
}

export function rootPattern(roots) {
  if (roots.length < 4) return null;
  const d = roots[1] - roots[0];
  if (!(d > 0)) return null;
  for (let i = 2; i < roots.length; i++) if (Math.abs(roots[i] - roots[i - 1] - d) > 1e-6 * Math.max(1, d)) return null;
  const k = Math.round(-roots[0] / d), base = roots[0] + k * d;
  return { step: d, base: Math.abs(base) < 1e-9 ? 0 : base, text: piText(d) };
}

function summarize(roots) {
  const SHOW = 6;
  if (roots.length <= 8) return { list: roots, more: 0 };
  const near = [...roots].sort((p, q) => Math.abs(p) - Math.abs(q) || p - q).slice(0, SHOW).sort((p, q) => p - q);
  return { list: near, more: roots.length - SHOW };
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
  const PLOT_N = 2000;
  const series = exprs.map((e) => ({ name: `${e.name}(x) = ${toText(e.node)}`, points: sampleFunction(f1(e.node, v), xmin, xmax, PLOT_N) }));
  const F = f1(exprs[0].node, v);
  const n = rootSamples(xmin, xmax);
  let roots = findRoots(F, xmin, xmax, n);
  const dense = roots.length > n / 6;
  let lo = xmin, hi = xmax;
  if (dense) {
    const c = Math.min(Math.max(0, xmin), xmax);
    let w = xmax - xmin;
    for (let k = 0; k < 6; k++) {
      w /= 20;
      lo = Math.max(xmin, c - w / 2); hi = Math.min(xmax, c + w / 2);
      roots = findRoots(F, lo, hi);
      if (roots.length <= rootSamples(lo, hi) / 6) break;
    }
  }
  let y0 = NaN;
  if (xmin <= 0 && xmax >= 0) { try { y0 = F(0); } catch { y0 = NaN; } }
  const pattern = rootPattern(roots);
  const { list, more } = dense ? { ...summarize(roots), more: 0 } : summarize(roots);
  const listText = list.map((r) => `x = ${fmt(r, 8)}`).join("، ") + (more ? `، … (و ${more} جذراً آخر)` : "");
  const steps = exprs.map((e) => ({ text: `الدالة ${e.name} بعد التبسيط:`, tex: `${e.name}(x) = ${toTex(e.node)}` }));
  steps.push(`قيّمنا f عند ${n + 1} نقطة بين ${fmt(xmin)} و ${fmt(xmax)}، وبحثنا عن تغيّر الإشارة بين كل نقطتين متجاورتين، ثم حسّنّا كل جذر بالتنصيف.`);
  steps.push("وعند كل نقطة تقترب فيها f من الصفر دون تغيّر إشارة بحثنا بدقة أكبر، لنلتقط الجذور المتقاربة والجذور التي يلمس فيها المنحنى المحور دون أن يقطعه.");
  if (dense) steps.push(`تنبيه: الدالة تتذبذب بسرعة كبيرة في هذا المجال الواسع، فلا يمكن حصر كل جذورها. لذلك بحثنا بدقة في الجزء [${fmt(lo, 8)}، ${fmt(hi, 8)}] حول الصفر. صغّر المجال لنتيجة كاملة.`);
  if (roots.length) steps.push(more || dense ? `أقرب الجذور إلى الصفر: ${listText}.` : `الجذور: ${listText}.`);
  else steps.push("لم نجد جذوراً للدالة f في هذا المجال.");
  if (pattern) steps.push(`الجذور متباعدة بانتظام: الفرق بين كل جذرين متتاليين ${pattern.text}.`);
  if (!dense && roots.length > PLOT_N / 8) steps.push("تنبيه: المجال واسع، فلا يستطيع الرسم إظهار كل تذبذبات الدالة. صغّر المجال لرؤيتها بوضوح.");
  if (isFinite(y0)) steps.push("نقطة التقاطع مع محور y هي $f(0) = " + fmt(y0, 8) + "$.");
  const results = [{ label: "عدد جذور f في المجال", value: dense ? "كثيرة جداً (الدالة تتذبذب بسرعة)" : String(roots.length) }];
  if (roots.length) results.push({ label: more || dense ? "أقرب الجذور إلى الصفر" : "جذور f", value: listText });
  if (pattern) results.push({ label: "نمط الجذور", value: `تتكرر كل ${pattern.text}` });
  results.push({ label: "التقاطع مع محور y", value: isFinite(y0) ? `f(0) = ${fmt(y0, 8)}` : "غير معرّف أو خارج المجال" });
  const block = { type: "plot", title: "رسم الدوال", xLabel: "x", yLabel: "y", series, xMin: xmin, xMax: xmax };
  if (ymin !== null) block.yMin = ymin;
  if (ymax !== null) block.yMax = ymax;
  if (roots.length) series.push({ name: "جذور f", points: roots.map((r) => [r, 0]), marker: "o" });
  return { results, steps, blocks: [block], copy: `جذور f (${results[0].value}): ${roots.length ? listText : "لا توجد"}` };
}
