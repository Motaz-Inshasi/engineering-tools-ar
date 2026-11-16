import { simplify, diff } from "../core/symbolic.js";
import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { bisection, newton, secant, sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "Encuentra la raíz de la ecuación f(x) = 0 numéricamente con el método de bisección, Newton-Raphson o la secante, con una tabla completa de cada iteración y una gráfica que muestre la ubicación de la raíz.",
  keywords: ["raíz", "resolver ecuación", "Newton", "Newton-Raphson", "bisección", "bisection", "newton", "secant", "secante", "métodos numéricos"],
  formulas: [
    { label: "Newton-Raphson", tex: "x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}" },
    { label: "Secante", tex: "x_{n+1} = x_n - f(x_n)\\frac{x_n - x_{n-1}}{f(x_n) - f(x_{n-1})}" },
    { label: "Bisección", tex: "m = \\frac{a+b}{2},\\quad f(a)\\,f(b) < 0" }
  ],
  inputs: [
    { id: "f", label: "Función f(x)", type: "expr", placeholder: "x^3 - 2x - 5" },
    { id: "v", label: "Variable", type: "text", default: "x" },
    { id: "method", label: "Método", type: "select", default: "newton", options: [["newton", "Newton-Raphson"], ["bisection", "Bisección"], ["secant", "Secante"]] },
    { id: "x0", label: "Valor inicial x₀", type: "number", default: "2", when: { method: ["newton", "secant"] } },
    { id: "x1", label: "Segundo valor x₁", type: "number", default: "3", when: { method: ["secant"] } },
    { id: "a", label: "Inicio del intervalo a", type: "number", default: "2", when: { method: ["bisection"] } },
    { id: "b", label: "Fin del intervalo b", type: "number", default: "3", when: { method: ["bisection"] } },
    { id: "tol", label: "Precisión requerida", type: "number", default: "1e-10" }
  ],
  example: { values: { f: "x^3 - 2x - 5", v: "x", method: "newton", x0: "2", tol: "1e-10" }, expect: ["2.0945514815"], note: "Ejemplo clásico de Newton: raíz de $x^3 - 2x - 5 = 0$ cerca de 2." },
  invalid: { values: { f: "x^2 + 1", method: "bisection", a: "0", b: "1" } },
  related: ["polynomial-roots", "quadratic", "function-plotter", "derivative"]
};

const REASONS = {
  sign: "f(a) y f(b) tienen el mismo signo, así que la bisección no garantiza que exista una raíz. Elige un intervalo en el que la función cambie de signo.",
  undefined: "La función no está definida en uno de los puntos de cálculo. Prueba con otro valor inicial.",
  zeroDerivative: "La derivada es cero en uno de los puntos, así que el método de Newton se detuvo. Prueba con otro valor inicial.",
  diverged: "El método divergió y no convergió. Prueba con un valor inicial más cercano a la raíz.",
  maxIter: "El método no convergió en 100 iteraciones. Prueba con otro valor inicial o con el método de bisección.",
  flat: "Los valores de la función son iguales en dos puntos consecutivos, así que el método de la secante se detuvo."
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const method = choice(input, "method", "Método", ["newton", "bisection", "secant"], "newton");
  const tol = num(input, "tol", "Precisión", { positive: true, default: 1e-10 });
  const F = f1(f, v);
  const steps = [{ text: "La ecuación que hay que resolver:", tex: `${toTex(f)} = 0` }];
  let r, rows, head, start, field;
  if (method === "newton") {
    const x0 = num(input, "x0", "Valor inicial");
    const d = diff(f, v);
    steps.push({ text: "Calculamos la derivada simbólicamente:", tex: `f'(${v}) = ${toTex(d)}` });
    steps.push(`Partimos de ${v}₀ = ${fmt(x0)} y repetimos la fórmula hasta que el cambio sea menor que ${fmt(tol)}.`);
    r = newton(F, f1(d, v), x0, { tol });
    head = ["n", "xₙ", "f(xₙ)", "f'(xₙ)", "xₙ₊₁"];
    rows = r.rows.map((q) => [q.i, fmt(q.x, 12), fmt(q.fx, 4), fmt(q.dfx, 6), fmt(q.next, 12)]);
    start = [x0]; field = "x0";
  } else if (method === "secant") {
    const x0 = num(input, "x0", "Valor inicial"), x1 = num(input, "x1", "Segundo valor");
    if (x0 === x1) fail("Los dos valores iniciales deben ser distintos.", "x1");
    steps.push(`Partimos de ${v}₀ = ${fmt(x0)} y ${v}₁ = ${fmt(x1)} y repetimos la fórmula de la secante.`);
    r = secant(F, x0, x1, { tol });
    head = ["n", "xₙ₋₁", "xₙ", "f(xₙ)", "xₙ₊₁"];
    rows = r.rows.map((q) => [q.i, fmt(q.x0, 12), fmt(q.x1, 12), fmt(q.fx1, 4), fmt(q.next, 12)]);
    start = [x0, x1]; field = "x0";
  } else {
    const a = num(input, "a", "Inicio del intervalo"), b = num(input, "b", "Fin del intervalo");
    if (a >= b) fail("El inicio del intervalo debe ser menor que su fin.", "b");
    const fa = F(a), fb = F(b);
    steps.push(`Comprobamos el cambio de signo: f(${fmt(a)}) = ${fmt(fa)} y f(${fmt(b)}) = ${fmt(fb)}.`);
    r = bisection(F, a, b, { tol });
    head = ["n", "a", "b", "m", "f(m)"];
    rows = r.rows.map((q) => [q.i, fmt(q.a, 12), fmt(q.b, 12), fmt(q.x, 12), fmt(q.fx, 4)]);
    if (rows.length > 60) rows.splice(30, rows.length - 60, ["…", "…", "…", "…", "…"]);
    start = [a, b]; field = r.reason === "sign" ? "b" : "a";
  }
  if (!r.ok) fail(REASONS[r.reason] || "No se pudo encontrar la raíz.", field);
  const root = r.root;
  const fr = F(root);
  steps.push(`El método convergió después de ${r.iterations} iteraciones a ${v} ≈ ${fmt(root, 12)}.`);
  steps.push({ text: "Para comprobar, sustituimos la raíz en la función:", tex: `f(${ntex(root, 12)}) = ${ntex(fr, 3)}` });
  const lo = Math.min(root, ...start), hi = Math.max(root, ...start);
  const pad = Math.max(1, (hi - lo) * 0.6);
  return {
    results: [
      { label: "Raíz", value: root, sig: 12 },
      { label: "Valor de la función en la raíz", value: fr, sig: 3 },
      { label: "Número de iteraciones", value: r.iterations }
    ],
    blocks: [
      { type: "table", caption: "Tabla de iteraciones", head, rows: rows.map((rw) => rw.map(String)) },
      { type: "plot", title: "Función y ubicación de la raíz", xLabel: v, yLabel: `f(${v})`, series: [{ name: `f(${v})`, points: sampleFunction(F, lo - pad, hi + pad, 400) }, { name: "Raíz", points: [[root, 0]], marker: "o" }] }
    ],
    steps,
    copy: `Raíz ${v} ≈ ${fmt(root, 12)} (f = ${fmt(fr, 3)}, ${r.iterations} iteraciones)`
  };
}
