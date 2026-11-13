import { parse, evaluate, toTex } from "../core/parser.js";
import { fail, str, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "حل أي معادلة تفاضلية من الرتبة الأولى y′ = f(x, y) عددياً بطرق أويلر وهيون (أويلر المحسّنة) ورونغ-كوتا الرابعة، مع جدول الخطوات والمقارنة بين الطرق والحل الدقيق إن وُجد، والرسم.",
  keywords: ["الحل العددي", "طريقة أويلر", "رونغ كوتا", "Runge-Kutta", "RK4", "Euler method", "Heun", "معادلة تفاضلية", "numerical ode", "y'"],
  formulas: [
    { label: "أويلر", tex: "y_{n+1} = y_n + h\\,f(x_n, y_n)" },
    { label: "رونغ-كوتا الرابعة", tex: "y_{n+1} = y_n + \\frac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4)" }
  ],
  inputs: [
    { id: "f", label: "y′ = f(x, y)", type: "text", default: "x + y", wide: true, help: "استخدم x و y، مثل x*y أو -2*y + sin(x) أو y*(1 - y)." },
    { id: "x0", label: "x₀", type: "number", default: "0" },
    { id: "y0", label: "y(x₀)", type: "number", default: "1" },
    { id: "xEnd", label: "x النهائية", type: "number", default: "1" },
    { id: "h", label: "طول الخطوة h", type: "number", default: "0.1" },
    { id: "method", label: "الطريقة", type: "select", default: "all", options: [["all", "مقارنة الطرق الثلاث"], ["euler", "أويلر"], ["heun", "هيون (أويلر المحسّنة)"], ["rk4", "رونغ-كوتا الرابعة"]] },
    { id: "exact", label: "الحل الدقيق للمقارنة (اختياري)", type: "text", default: "2*exp(x) - x - 1", wide: true, help: "دالة في x فقط، لحساب الخطأ." }
  ],
  example: { values: { f: "x + y", x0: "0", y0: "1", xEnd: "1", h: "0.1", method: "all", exact: "2*exp(x) - x - 1" }, expect: ["RK4: y(1) ≈ 3.43656", "أويلر: y(1) ≈ 3.18748"], note: "مثال: y′ = x + y مع y(0) = 1، وحلها الدقيق 2eˣ − x − 1." },
  invalid: { values: { f: "x + y", x0: "0", y0: "1", xEnd: "1", h: "0", method: "all", exact: "" } },
  related: ["ode-first-order", "ode-second-order", "integral", "root-finding", "population-growth"]
};

const NAMES = { euler: "أويلر", heun: "هيون", rk4: "RK4" };

function step(m, f, x, y, h) {
  if (m === "euler") return y + h * f(x, y);
  if (m === "heun") { const k1 = f(x, y), k2 = f(x + h, y + h * k1); return y + (h / 2) * (k1 + k2); }
  const k1 = f(x, y), k2 = f(x + h / 2, y + (h / 2) * k1), k3 = f(x + h / 2, y + (h / 2) * k2), k4 = f(x + h, y + h * k3);
  return y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
}

export function solve(input) {
  const src = str(input, "f", "الدالة f(x, y)");
  let node;
  try { node = parse(src, ["x", "y"]); } catch (e) { if (e.name === "InputError") fail(`f(x, y): ${e.message}`, "f"); throw e; }
  const f = (x, y) => evaluate(node, { x, y });
  const x0 = num(input, "x0", "x₀"), y0 = num(input, "y0", "y(x₀)"), xEnd = num(input, "xEnd", "x النهائية");
  if (xEnd === x0) fail("x النهائية يجب أن تختلف عن x₀.", "xEnd");
  const h0 = num(input, "h", "طول الخطوة", { positive: true });
  const n = Math.round(Math.abs(xEnd - x0) / h0);
  if (n < 1) fail("طول الخطوة أكبر من المجال؛ صغّره.", "h");
  if (n > 100000) fail("عدد الخطوات كبير جداً (أكثر من 100000)؛ كبّر طول الخطوة.", "h");
  const h = (xEnd - x0) / n;
  const method = choice(input, "method", "الطريقة", ["all", "euler", "heun", "rk4"], "all");
  const methods = method === "all" ? ["euler", "heun", "rk4"] : [method];
  let ex = null;
  if (!isBlank(input.exact)) {
    try { const en = parse(str(input, "exact", "الحل الدقيق"), ["x"]); ex = (x) => evaluate(en, { x }); } catch (e) { if (e.name === "InputError") fail(`الحل الدقيق: ${e.message}`, "exact"); throw e; }
    const e0 = ex(x0);
    if (!isFinite(e0) || Math.abs(e0 - y0) > 1e-6 * Math.max(1, Math.abs(y0))) fail(`الحل الدقيق لا يحقق الشرط الابتدائي: قيمته عند x₀ هي ${fmt(e0, 6)} وليست ${fmt(y0)}.`, "exact");
  }
  const runs = {};
  for (const m of methods) {
    const pts = [[x0, y0]];
    let x = x0, y = y0;
    for (let i = 0; i < n; i++) {
      y = step(m, f, x, y, h);
      x = x0 + (i + 1) * h;
      if (!isFinite(y)) fail(`الحل انفجر أو أصبح غير معرّف عند x ≈ ${fmt(x, 5)} بطريقة ${NAMES[m]}. جرّب خطوة أصغر أو مجالاً أقصر.`, "h");
      pts.push([x, y]);
    }
    runs[m] = pts;
  }
  try { f(x0, y0); } catch { fail("تعذر حساب f عند النقطة الابتدائية.", "f"); }
  const k1 = f(x0, y0);
  const steps = [
    { text: "المعادلة:", tex: `y' = ${toTex(node)},\\quad y(${ntex(x0)}) = ${ntex(y0)},\\quad h = ${ntex(h, 6)},\\quad n = ${n}` },
    { text: "الخطوة الأولى بطريقة أويلر (توضيحاً):", tex: `y_1 = ${ntex(y0)} + ${ntex(h, 6)} \\times f(${ntex(x0)}, ${ntex(y0)}) = ${ntex(y0)} + ${ntex(h, 6)} \\times ${ntex(k1, 6)} = ${ntex(y0 + h * k1, 6)}` }
  ];
  if (methods.includes("rk4")) {
    const a1 = k1, a2 = f(x0 + h / 2, y0 + (h / 2) * a1), a3 = f(x0 + h / 2, y0 + (h / 2) * a2), a4 = f(x0 + h, y0 + h * a3);
    steps.push({ text: "الخطوة الأولى بطريقة رونغ-كوتا الرابعة:", tex: `k_1 = ${ntex(a1, 6)},\\ k_2 = ${ntex(a2, 6)},\\ k_3 = ${ntex(a3, 6)},\\ k_4 = ${ntex(a4, 6)}\\ \\Rightarrow\\ y_1 = ${ntex(runs.rk4[1][1], 8)}` });
  }
  steps.push("نكرر الخطوة نفسها حتى x النهائية. خطأ أويلر يتناسب مع h، وهيون مع h²، ورونغ-كوتا الرابعة مع h⁴، لذلك تتفوق الأخيرة بوضوح.");
  const results = methods.map((m) => {
    const yN = runs[m][n][1];
    return { label: `${NAMES[m]}: y(${fmt(xEnd)})`, value: fmt(yN, 10) + (ex ? ` (الخطأ ${fmt(Math.abs(yN - ex(xEnd)), 3)})` : ""), text: `${NAMES[m]}: y(${fmt(xEnd)}) ≈ ${fmt(yN, 6)}` };
  });
  if (ex) results.push({ label: `الحل الدقيق y(${fmt(xEnd)})`, value: fmt(ex(xEnd), 8) });
  const every = Math.max(1, Math.ceil(n / 50));
  const head = ["n", "x", ...methods.map((m) => NAMES[m]), ...(ex ? ["الدقيق"] : [])];
  const rows = [];
  for (let i = 0; i <= n; i += every) rows.push([String(i), fmt(runs[methods[0]][i][0], 6), ...methods.map((m) => fmt(runs[m][i][1], 7)), ...(ex ? [fmt(ex(runs[methods[0]][i][0]), 7)] : [])]);
  if (n % every) rows.push([String(n), fmt(xEnd, 6), ...methods.map((m) => fmt(runs[m][n][1], 7)), ...(ex ? [fmt(ex(xEnd), 7)] : [])]);
  const series = methods.map((m) => ({ name: NAMES[m], points: runs[m], ...(n <= 30 ? { marker: "o", line: true } : {}) }));
  if (ex) {
    const pts = [];
    for (let i = 0; i <= 300; i++) { const x = x0 + ((xEnd - x0) * i) / 300; const y = ex(x); pts.push([x, isFinite(y) ? y : null]); }
    series.push({ name: "الدقيق", points: pts, dashed: true });
  }
  return {
    results, steps,
    blocks: [{ type: "plot", title: "الحلول العددية", xLabel: "x", yLabel: "y", series }, { type: "table", caption: every > 1 ? `جدول القيم (كل ${every} خطوات)` : "جدول القيم", head, rows }],
    copy: results.filter((r) => r.text).map((r) => r.text).join(" | ")
  };
}
