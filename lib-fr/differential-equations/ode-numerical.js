import { parse, evaluate, toTex } from "../core/parser.js";
import { fail, str, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Résout numériquement toute équation différentielle du premier ordre y′ = f(x, y) par la méthode d'Euler, la méthode de Heun (Euler améliorée) et le Runge-Kutta d'ordre 4, avec un tableau des pas, une comparaison des méthodes, la solution exacte si elle existe, et un graphe.",
  keywords: ["Solution numérique", "Méthode d'Euler", "Runge-Kutta", "Runge-Kutta", "RK4", "Euler method", "Heun", "équation différentielle", "numerical ode", "y'"],
  formulas: [
    { label: "Euler", tex: "y_{n+1} = y_n + h\\,f(x_n, y_n)" },
    { label: "Runge-Kutta d'ordre 4", tex: "y_{n+1} = y_n + \\frac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4)" }
  ],
  inputs: [
    { id: "f", label: "y′ = f(x, y)", type: "text", default: "x + y", wide: true, help: "Utilisez x et y, par exemple x*y, -2*y + sin(x) ou y*(1 - y)." },
    { id: "x0", label: "x₀", type: "number", default: "0" },
    { id: "y0", label: "y(x₀)", type: "number", default: "1" },
    { id: "xEnd", label: "x finale", type: "number", default: "1" },
    { id: "h", label: "Longueur du pas h", type: "number", default: "0.1" },
    { id: "method", label: "Méthode", type: "select", default: "all", options: [["all", "Comparer les trois méthodes"], ["euler", "Euler"], ["heun", "Heun (Euler améliorée)"], ["rk4", "Runge-Kutta d'ordre 4"]] },
    { id: "exact", label: "Solution exacte pour comparaison (facultatif)", type: "text", default: "2*exp(x) - x - 1", wide: true, help: "Fonction de x uniquement, utilisée pour calculer l'erreur." }
  ],
  example: { values: { f: "x + y", x0: "0", y0: "1", xEnd: "1", h: "0.1", method: "all", exact: "2*exp(x) - x - 1" }, expect: ["RK4: y(1) ≈ 3.43656", "Euler : y(1) ≈ 3.18748"], note: "Exemple : y′ = x + y avec y(0) = 1, dont la solution exacte est 2eˣ − x − 1." },
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
  const src = str(input, "f", "Fonction f(x, y)");
  let node;
  try { node = parse(src, ["x", "y"]); } catch (e) { if (e.name === "InputError") fail(`f(x, y): ${e.message}`, "f"); throw e; }
  const f = (x, y) => evaluate(node, { x, y });
  const x0 = num(input, "x0", "x₀"), y0 = num(input, "y0", "y(x₀)"), xEnd = num(input, "xEnd", "x finale");
  if (xEnd === x0) fail("La valeur finale de x doit être différente de x₀.", "xEnd");
  const h0 = num(input, "h", "Longueur du pas", { positive: true });
  const n = Math.round(Math.abs(xEnd - x0) / h0);
  if (n < 1) fail("La longueur du pas est supérieure à l'intervalle ; réduisez-la.", "h");
  if (n > 100000) fail("Le nombre de pas est trop grand (plus de 100000) ; augmentez la longueur du pas.", "h");
  const h = (xEnd - x0) / n;
  const method = choice(input, "method", "Méthode", ["all", "euler", "heun", "rk4"], "all");
  const methods = method === "all" ? ["euler", "heun", "rk4"] : [method];
  let ex = null;
  if (!isBlank(input.exact)) {
    try { const en = parse(str(input, "exact", "Solution exacte"), ["x"]); ex = (x) => evaluate(en, { x }); } catch (e) { if (e.name === "InputError") fail(`Solution exacte : ${e.message}`, "exact"); throw e; }
    const e0 = ex(x0);
    if (!isFinite(e0) || Math.abs(e0 - y0) > 1e-6 * Math.max(1, Math.abs(y0))) fail(`La solution exacte ne vérifie pas la condition initiale : sa valeur en x₀ est ${fmt(e0, 6)} au lieu de ${fmt(y0)}.`, "exact");
  }
  const runs = {};
  for (const m of methods) {
    const pts = [[x0, y0]];
    let x = x0, y = y0;
    for (let i = 0; i < n; i++) {
      y = step(m, f, x, y, h);
      x = x0 + (i + 1) * h;
      if (!isFinite(y)) fail(`La solution a explosé ou est devenue indéfinie en x ≈ ${fmt(x, 5)} avec la méthode ${NAMES[m]}. Essayez un pas plus petit ou un intervalle plus court.`, "h");
      pts.push([x, y]);
    }
    runs[m] = pts;
  }
  try { f(x0, y0); } catch { fail("Impossible d'évaluer f au point initial.", "f"); }
  const k1 = f(x0, y0);
  const steps = [
    { text: "Équation :", tex: `y' = ${toTex(node)},\\quad y(${ntex(x0)}) = ${ntex(y0)},\\quad h = ${ntex(h, 6)},\\quad n = ${n}` },
    { text: "Premier pas avec la méthode d'Euler (à titre d'illustration) :", tex: `y_1 = ${ntex(y0)} + ${ntex(h, 6)} \\times f(${ntex(x0)}, ${ntex(y0)}) = ${ntex(y0)} + ${ntex(h, 6)} \\times ${ntex(k1, 6)} = ${ntex(y0 + h * k1, 6)}` }
  ];
  if (methods.includes("rk4")) {
    const a1 = k1, a2 = f(x0 + h / 2, y0 + (h / 2) * a1), a3 = f(x0 + h / 2, y0 + (h / 2) * a2), a4 = f(x0 + h, y0 + h * a3);
    steps.push({ text: "Premier pas avec le Runge-Kutta d'ordre 4 :", tex: `k_1 = ${ntex(a1, 6)},\\ k_2 = ${ntex(a2, 6)},\\ k_3 = ${ntex(a3, 6)},\\ k_4 = ${ntex(a4, 6)}\\ \\Rightarrow\\ y_1 = ${ntex(runs.rk4[1][1], 8)}` });
  }
  steps.push("On répète le même pas jusqu'à atteindre x finale. L'erreur d'Euler est proportionnelle à h, celle de Heun à h², et celle du Runge-Kutta d'ordre 4 à h⁴ ; ce dernier est donc nettement plus précis.");
  const results = methods.map((m) => {
    const yN = runs[m][n][1];
    return { label: `${NAMES[m]}: y(${fmt(xEnd)})`, value: fmt(yN, 10) + (ex ? ` (erreur ${fmt(Math.abs(yN - ex(xEnd)), 3)})` : ""), text: `${NAMES[m]}: y(${fmt(xEnd)}) ≈ ${fmt(yN, 6)}` };
  });
  if (ex) results.push({ label: `Solution exacte y(${fmt(xEnd)})`, value: fmt(ex(xEnd), 8) });
  const every = Math.max(1, Math.ceil(n / 50));
  const head = ["n", "x", ...methods.map((m) => NAMES[m]), ...(ex ? ["Exacte"] : [])];
  const rows = [];
  for (let i = 0; i <= n; i += every) rows.push([String(i), fmt(runs[methods[0]][i][0], 6), ...methods.map((m) => fmt(runs[m][i][1], 7)), ...(ex ? [fmt(ex(runs[methods[0]][i][0]), 7)] : [])]);
  if (n % every) rows.push([String(n), fmt(xEnd, 6), ...methods.map((m) => fmt(runs[m][n][1], 7)), ...(ex ? [fmt(ex(xEnd), 7)] : [])]);
  const series = methods.map((m) => ({ name: NAMES[m], points: runs[m], ...(n <= 30 ? { marker: "o", line: true } : {}) }));
  if (ex) {
    const pts = [];
    for (let i = 0; i <= 300; i++) { const x = x0 + ((xEnd - x0) * i) / 300; const y = ex(x); pts.push([x, isFinite(y) ? y : null]); }
    series.push({ name: "Exacte", points: pts, dashed: true });
  }
  return {
    results, steps,
    blocks: [{ type: "plot", title: "Solutions numériques", xLabel: "x", yLabel: "y", series }, { type: "table", caption: every > 1 ? `Tableau des valeurs (tous les ${every} pas)` : "Tableau des valeurs", head, rows }],
    copy: results.filter((r) => r.text).map((r) => r.text).join(" | ")
  };
}
