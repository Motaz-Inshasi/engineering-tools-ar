import { parse, evaluate, toTex } from "../core/parser.js";
import { fail, str, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Numerically solves any first-order differential equation y′ = f(x, y) using Euler's method, Heun's method (improved Euler), and fourth-order Runge-Kutta, with a step table, a comparison of methods, the exact solution if available, and a graph.",
  keywords: ["Numerical solution", "Euler method", "Runge-Kutta", "Runge-Kutta", "RK4", "Euler method", "Heun", "differential equation", "numerical ode", "y'"],
  formulas: [
    { label: "Euler", tex: "y_{n+1} = y_n + h\\,f(x_n, y_n)" },
    { label: "Fourth-order Runge-Kutta", tex: "y_{n+1} = y_n + \\frac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4)" }
  ],
  inputs: [
    { id: "f", label: "y′ = f(x, y)", type: "text", default: "x + y", wide: true, help: "Use x and y, such as x*y, -2*y + sin(x), or y*(1 - y)." },
    { id: "x0", label: "x₀", type: "number", default: "0" },
    { id: "y0", label: "y(x₀)", type: "number", default: "1" },
    { id: "xEnd", label: "Final x", type: "number", default: "1" },
    { id: "h", label: "Step size h", type: "number", default: "0.1" },
    { id: "method", label: "Method", type: "select", default: "all", options: [["all", "Compare the three methods"], ["euler", "Euler"], ["heun", "Heun (improved Euler)"], ["rk4", "Fourth-order Runge-Kutta"]] },
    { id: "exact", label: "Exact solution for comparison (optional)", type: "text", default: "2*exp(x) - x - 1", wide: true, help: "A function of x only, used to calculate the error." }
  ],
  example: { values: { f: "x + y", x0: "0", y0: "1", xEnd: "1", h: "0.1", method: "all", exact: "2*exp(x) - x - 1" }, expect: ["RK4: y(1) ≈ 3.43656", "Euler: y(1) ≈ 3.18748"], note: "Example: y′ = x + y with y(0) = 1, whose exact solution is 2eˣ − x − 1." },
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
  const src = str(input, "f", "Function f(x, y)");
  let node;
  try { node = parse(src, ["x", "y"]); } catch (e) { if (e.name === "InputError") fail(`f(x, y): ${e.message}`, "f"); throw e; }
  const f = (x, y) => evaluate(node, { x, y });
  const x0 = num(input, "x0", "x₀"), y0 = num(input, "y0", "y(x₀)"), xEnd = num(input, "xEnd", "Final x");
  if (xEnd === x0) fail("The final x must differ from x₀.", "xEnd");
  const h0 = num(input, "h", "Step size", { positive: true });
  const n = Math.round(Math.abs(xEnd - x0) / h0);
  if (n < 1) fail("The step size is larger than the interval; reduce it.", "h");
  if (n > 100000) fail("The number of steps is too large (more than 100000); increase the step size.", "h");
  const h = (xEnd - x0) / n;
  const method = choice(input, "method", "Method", ["all", "euler", "heun", "rk4"], "all");
  const methods = method === "all" ? ["euler", "heun", "rk4"] : [method];
  let ex = null;
  if (!isBlank(input.exact)) {
    try { const en = parse(str(input, "exact", "Exact solution"), ["x"]); ex = (x) => evaluate(en, { x }); } catch (e) { if (e.name === "InputError") fail(`Exact solution: ${e.message}`, "exact"); throw e; }
    const e0 = ex(x0);
    if (!isFinite(e0) || Math.abs(e0 - y0) > 1e-6 * Math.max(1, Math.abs(y0))) fail(`The exact solution does not satisfy the initial condition: its value at x₀ is ${fmt(e0, 6)} instead of ${fmt(y0)}.`, "exact");
  }
  const runs = {};
  for (const m of methods) {
    const pts = [[x0, y0]];
    let x = x0, y = y0;
    for (let i = 0; i < n; i++) {
      y = step(m, f, x, y, h);
      x = x0 + (i + 1) * h;
      if (!isFinite(y)) fail(`The solution blew up or became undefined at x ≈ ${fmt(x, 5)} using the ${NAMES[m]} method. Try a smaller step or a shorter interval.`, "h");
      pts.push([x, y]);
    }
    runs[m] = pts;
  }
  try { f(x0, y0); } catch { fail("Could not evaluate f at the initial point.", "f"); }
  const k1 = f(x0, y0);
  const steps = [
    { text: "Equation:", tex: `y' = ${toTex(node)},\\quad y(${ntex(x0)}) = ${ntex(y0)},\\quad h = ${ntex(h, 6)},\\quad n = ${n}` },
    { text: "First step using Euler's method (illustration):", tex: `y_1 = ${ntex(y0)} + ${ntex(h, 6)} \\times f(${ntex(x0)}, ${ntex(y0)}) = ${ntex(y0)} + ${ntex(h, 6)} \\times ${ntex(k1, 6)} = ${ntex(y0 + h * k1, 6)}` }
  ];
  if (methods.includes("rk4")) {
    const a1 = k1, a2 = f(x0 + h / 2, y0 + (h / 2) * a1), a3 = f(x0 + h / 2, y0 + (h / 2) * a2), a4 = f(x0 + h, y0 + h * a3);
    steps.push({ text: "First step using fourth-order Runge-Kutta:", tex: `k_1 = ${ntex(a1, 6)},\\ k_2 = ${ntex(a2, 6)},\\ k_3 = ${ntex(a3, 6)},\\ k_4 = ${ntex(a4, 6)}\\ \\Rightarrow\\ y_1 = ${ntex(runs.rk4[1][1], 8)}` });
  }
  steps.push("Repeat the same step until the final x is reached. The Euler error is proportional to h, Heun's to h², and fourth-order Runge-Kutta's to h⁴, so the latter is clearly more accurate.");
  const results = methods.map((m) => {
    const yN = runs[m][n][1];
    return { label: `${NAMES[m]}: y(${fmt(xEnd)})`, value: fmt(yN, 10) + (ex ? ` (error ${fmt(Math.abs(yN - ex(xEnd)), 3)})` : ""), text: `${NAMES[m]}: y(${fmt(xEnd)}) ≈ ${fmt(yN, 6)}` };
  });
  if (ex) results.push({ label: `Exact solution y(${fmt(xEnd)})`, value: fmt(ex(xEnd), 8) });
  const every = Math.max(1, Math.ceil(n / 50));
  const head = ["n", "x", ...methods.map((m) => NAMES[m]), ...(ex ? ["Exact"] : [])];
  const rows = [];
  for (let i = 0; i <= n; i += every) rows.push([String(i), fmt(runs[methods[0]][i][0], 6), ...methods.map((m) => fmt(runs[m][i][1], 7)), ...(ex ? [fmt(ex(runs[methods[0]][i][0]), 7)] : [])]);
  if (n % every) rows.push([String(n), fmt(xEnd, 6), ...methods.map((m) => fmt(runs[m][n][1], 7)), ...(ex ? [fmt(ex(xEnd), 7)] : [])]);
  const series = methods.map((m) => ({ name: NAMES[m], points: runs[m], ...(n <= 30 ? { marker: "o", line: true } : {}) }));
  if (ex) {
    const pts = [];
    for (let i = 0; i <= 300; i++) { const x = x0 + ((xEnd - x0) * i) / 300; const y = ex(x); pts.push([x, isFinite(y) ? y : null]); }
    series.push({ name: "Exact", points: pts, dashed: true });
  }
  return {
    results, steps,
    blocks: [{ type: "plot", title: "Numerical solutions", xLabel: "x", yLabel: "y", series }, { type: "table", caption: every > 1 ? `Value table (every ${every} steps)` : "Value table", head, rows }],
    copy: results.filter((r) => r.text).map((r) => r.text).join(" | ")
  };
}
