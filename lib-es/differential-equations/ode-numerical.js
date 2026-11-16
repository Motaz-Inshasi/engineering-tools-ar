import { parse, evaluate, toTex } from "../core/parser.js";
import { fail, str, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Resuelve numéricamente cualquier ecuación diferencial de primer orden y′ = f(x, y) con los métodos de Euler, Heun (Euler mejorado) y Runge-Kutta de cuarto orden, con tabla de pasos, comparación de métodos, solución exacta si existe y gráfica.",
  keywords: ["Solución numérica", "método de Euler", "Runge-Kutta", "Runge-Kutta", "RK4", "Euler method", "Heun", "ecuación diferencial", "numerical ode", "y'"],
  formulas: [
    { label: "Euler", tex: "y_{n+1} = y_n + h\\,f(x_n, y_n)" },
    { label: "Runge-Kutta de cuarto orden", tex: "y_{n+1} = y_n + \\frac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4)" }
  ],
  inputs: [
    { id: "f", label: "y′ = f(x, y)", type: "text", default: "x + y", wide: true, help: "Use x e y, por ejemplo x*y o -2*y + sin(x) o y*(1 - y)." },
    { id: "x0", label: "x₀", type: "number", default: "0" },
    { id: "y0", label: "y(x₀)", type: "number", default: "1" },
    { id: "xEnd", label: "x final", type: "number", default: "1" },
    { id: "h", label: "tamaño de paso h", type: "number", default: "0.1" },
    { id: "method", label: "Método", type: "select", default: "all", options: [["all", "Comparar los tres métodos"], ["euler", "Euler"], ["heun", "Heun (Euler mejorado)"], ["rk4", "Runge-Kutta de cuarto orden"]] },
    { id: "exact", label: "Solución exacta para comparar (opcional)", type: "text", default: "2*exp(x) - x - 1", wide: true, help: "Función solo de x, para calcular el error." }
  ],
  example: { values: { f: "x + y", x0: "0", y0: "1", xEnd: "1", h: "0.1", method: "all", exact: "2*exp(x) - x - 1" }, expect: ["RK4: y(1) ≈ 3.43656", "Euler: y(1) ≈ 3.18748"], note: "Ejemplo: y′ = x + y con y(0) = 1; su solución exacta es 2eˣ − x − 1." },
  invalid: { values: { f: "x + y", x0: "0", y0: "1", xEnd: "1", h: "0", method: "all", exact: "" } },
  related: ["ode-first-order", "ode-second-order", "integral", "root-finding", "population-growth"]
};

const NAMES = { euler: "Euler", heun: "Heun", rk4: "RK4" };

function step(m, f, x, y, h) {
  if (m === "euler") return y + h * f(x, y);
  if (m === "heun") { const k1 = f(x, y), k2 = f(x + h, y + h * k1); return y + (h / 2) * (k1 + k2); }
  const k1 = f(x, y), k2 = f(x + h / 2, y + (h / 2) * k1), k3 = f(x + h / 2, y + (h / 2) * k2), k4 = f(x + h, y + h * k3);
  return y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
}

export function solve(input) {
  const src = str(input, "f", "función f(x, y)");
  let node;
  try { node = parse(src, ["x", "y"]); } catch (e) { if (e.name === "InputError") fail(`f(x, y): ${e.message}`, "f"); throw e; }
  const f = (x, y) => evaluate(node, { x, y });
  const x0 = num(input, "x0", "x₀"), y0 = num(input, "y0", "y(x₀)"), xEnd = num(input, "xEnd", "x final");
  if (xEnd === x0) fail("x final debe ser distinta de x₀.", "xEnd");
  const h0 = num(input, "h", "tamaño de paso", { positive: true });
  const n = Math.round(Math.abs(xEnd - x0) / h0);
  if (n < 1) fail("El tamaño de paso es mayor que el intervalo; redúzcalo.", "h");
  if (n > 100000) fail("El número de pasos es muy grande (más de 100000); aumente el tamaño de paso.", "h");
  const h = (xEnd - x0) / n;
  const method = choice(input, "method", "Método", ["all", "euler", "heun", "rk4"], "all");
  const methods = method === "all" ? ["euler", "heun", "rk4"] : [method];
  let ex = null;
  if (!isBlank(input.exact)) {
    try { const en = parse(str(input, "exact", "Solución exacta"), ["x"]); ex = (x) => evaluate(en, { x }); } catch (e) { if (e.name === "InputError") fail(`Solución exacta: ${e.message}`, "exact"); throw e; }
    const e0 = ex(x0);
    if (!isFinite(e0) || Math.abs(e0 - y0) > 1e-6 * Math.max(1, Math.abs(y0))) fail(`La solución exacta no cumple la condición inicial: su valor en x₀ es ${fmt(e0, 6)} y no ${fmt(y0)}.`, "exact");
  }
  const runs = {};
  for (const m of methods) {
    const pts = [[x0, y0]];
    let x = x0, y = y0;
    for (let i = 0; i < n; i++) {
      y = step(m, f, x, y, h);
      x = x0 + (i + 1) * h;
      if (!isFinite(y)) fail(`La solución diverge o deja de estar definida en x ≈ ${fmt(x, 5)} con el método ${NAMES[m]}. Pruebe con un paso menor o un intervalo más corto.`, "h");
      pts.push([x, y]);
    }
    runs[m] = pts;
  }
  try { f(x0, y0); } catch { fail("No se pudo calcular f en el punto inicial.", "f"); }
  const k1 = f(x0, y0);
  const steps = [
    { text: "Ecuación:", tex: `y' = ${toTex(node)},\\quad y(${ntex(x0)}) = ${ntex(y0)},\\quad h = ${ntex(h, 6)},\\quad n = ${n}` },
    { text: "Primer paso con el método de Euler (a modo de ejemplo):", tex: `y_1 = ${ntex(y0)} + ${ntex(h, 6)} \\times f(${ntex(x0)}, ${ntex(y0)}) = ${ntex(y0)} + ${ntex(h, 6)} \\times ${ntex(k1, 6)} = ${ntex(y0 + h * k1, 6)}` }
  ];
  if (methods.includes("rk4")) {
    const a1 = k1, a2 = f(x0 + h / 2, y0 + (h / 2) * a1), a3 = f(x0 + h / 2, y0 + (h / 2) * a2), a4 = f(x0 + h, y0 + h * a3);
    steps.push({ text: "Primer paso con Runge-Kutta de cuarto orden:", tex: `k_1 = ${ntex(a1, 6)},\\ k_2 = ${ntex(a2, 6)},\\ k_3 = ${ntex(a3, 6)},\\ k_4 = ${ntex(a4, 6)}\\ \\Rightarrow\\ y_1 = ${ntex(runs.rk4[1][1], 8)}` });
  }
  steps.push("Repetimos el mismo paso hasta x final. El error de Euler es proporcional a h, el de Heun a h² y el de Runge-Kutta de cuarto orden a h⁴, por lo que este último es claramente más preciso.");
  const results = methods.map((m) => {
    const yN = runs[m][n][1];
    return { label: `${NAMES[m]}: y(${fmt(xEnd)})`, value: fmt(yN, 10) + (ex ? ` (error ${fmt(Math.abs(yN - ex(xEnd)), 3)})` : ""), text: `${NAMES[m]}: y(${fmt(xEnd)}) ≈ ${fmt(yN, 6)}` };
  });
  if (ex) results.push({ label: `Solución exacta y(${fmt(xEnd)})`, value: fmt(ex(xEnd), 8) });
  const every = Math.max(1, Math.ceil(n / 50));
  const head = ["n", "x", ...methods.map((m) => NAMES[m]), ...(ex ? ["Exacta"] : [])];
  const rows = [];
  for (let i = 0; i <= n; i += every) rows.push([String(i), fmt(runs[methods[0]][i][0], 6), ...methods.map((m) => fmt(runs[m][i][1], 7)), ...(ex ? [fmt(ex(runs[methods[0]][i][0]), 7)] : [])]);
  if (n % every) rows.push([String(n), fmt(xEnd, 6), ...methods.map((m) => fmt(runs[m][n][1], 7)), ...(ex ? [fmt(ex(xEnd), 7)] : [])]);
  const series = methods.map((m) => ({ name: NAMES[m], points: runs[m], ...(n <= 30 ? { marker: "o", line: true } : {}) }));
  if (ex) {
    const pts = [];
    for (let i = 0; i <= 300; i++) { const x = x0 + ((xEnd - x0) * i) / 300; const y = ex(x); pts.push([x, isFinite(y) ? y : null]); }
    series.push({ name: "Exacta", points: pts, dashed: true });
  }
  return {
    results, steps,
    blocks: [{ type: "plot", title: "Soluciones numéricas", xLabel: "x", yLabel: "y", series }, { type: "table", caption: every > 1 ? `Tabla de valores (cada ${every} pasos)` : "Tabla de valores", head, rows }],
    copy: results.filter((r) => r.text).map((r) => r.text).join(" | ")
  };
}
