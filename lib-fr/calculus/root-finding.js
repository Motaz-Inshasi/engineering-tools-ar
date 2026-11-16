import { simplify, diff } from "../core/symbolic.js";
import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { bisection, newton, secant, sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "Trouve numériquement la racine de l'équation f(x) = 0 par la méthode de dichotomie, de Newton-Raphson ou de la sécante, avec un tableau complet pour chaque itération et un graphique montrant la position de la racine.",
  keywords: ["Racine", "Résolution d'équation", "Newton", "Newton-Raphson", "Dichotomie", "bisection", "newton", "secant", "Sécante", "Méthodes numériques"],
  formulas: [
    { label: "Newton-Raphson", tex: "x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}" },
    { label: "Sécante", tex: "x_{n+1} = x_n - f(x_n)\\frac{x_n - x_{n-1}}{f(x_n) - f(x_{n-1})}" },
    { label: "Dichotomie", tex: "m = \\frac{a+b}{2},\\quad f(a)\\,f(b) < 0" }
  ],
  inputs: [
    { id: "f", label: "Fonction f(x)", type: "expr", placeholder: "x^3 - 2x - 5" },
    { id: "v", label: "Variable", type: "text", default: "x" },
    { id: "method", label: "Méthode", type: "select", default: "newton", options: [["newton", "Newton-Raphson"], ["bisection", "Dichotomie"], ["secant", "Sécante"]] },
    { id: "x0", label: "Valeur initiale x₀", type: "number", default: "2", when: { method: ["newton", "secant"] } },
    { id: "x1", label: "Deuxième valeur x₁", type: "number", default: "3", when: { method: ["secant"] } },
    { id: "a", label: "Début de l'intervalle a", type: "number", default: "2", when: { method: ["bisection"] } },
    { id: "b", label: "Fin de l'intervalle b", type: "number", default: "3", when: { method: ["bisection"] } },
    { id: "tol", label: "Précision requise", type: "number", default: "1e-10" }
  ],
  example: { values: { f: "x^3 - 2x - 5", v: "x", method: "newton", x0: "2", tol: "1e-10" }, expect: ["2.0945514815"], note: "Exemple classique de Newton : racine de $x^3 - 2x - 5 = 0$ près de 2." },
  invalid: { values: { f: "x^2 + 1", method: "bisection", a: "0", b: "1" } },
  related: ["polynomial-roots", "quadratic", "function-plotter", "derivative"]
};

const REASONS = {
  sign: "f(a) et f(b) ont le même signe, donc la dichotomie ne garantit pas l'existence d'une racine. Choisissez un intervalle où la fonction change de signe.",
  undefined: "La fonction n'est pas définie en l'un des points de calcul. Essayez une autre valeur initiale.",
  zeroDerivative: "La dérivée est nulle en l'un des points, la méthode de Newton s'est donc arrêtée. Essayez une autre valeur initiale.",
  diverged: "La méthode diverge et ne converge pas. Essayez une valeur initiale plus proche de la racine.",
  maxIter: "La méthode n'a pas convergé en 100 itérations. Essayez une autre valeur initiale ou la méthode de dichotomie.",
  flat: "Les valeurs de la fonction sont identiques en deux points successifs, la méthode de la sécante s'est donc arrêtée."
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const method = choice(input, "method", "Méthode", ["newton", "bisection", "secant"], "newton");
  const tol = num(input, "tol", "Précision", { positive: true, default: 1e-10 });
  const F = f1(f, v);
  const steps = [{ text: "Équation à résoudre :", tex: `${toTex(f)} = 0` }];
  let r, rows, head, start, field;
  if (method === "newton") {
    const x0 = num(input, "x0", "Valeur initiale");
    const d = diff(f, v);
    steps.push({ text: "Calcul de la dérivée symboliquement :", tex: `f'(${v}) = ${toTex(d)}` });
    steps.push(`On part de ${v}₀ = ${fmt(x0)} et on répète la formule jusqu'à ce que la variation devienne inférieure à ${fmt(tol)}.`);
    r = newton(F, f1(d, v), x0, { tol });
    head = ["n", "xₙ", "f(xₙ)", "f'(xₙ)", "xₙ₊₁"];
    rows = r.rows.map((q) => [q.i, fmt(q.x, 12), fmt(q.fx, 4), fmt(q.dfx, 6), fmt(q.next, 12)]);
    start = [x0]; field = "x0";
  } else if (method === "secant") {
    const x0 = num(input, "x0", "Valeur initiale"), x1 = num(input, "x1", "Deuxième valeur");
    if (x0 === x1) fail("Les deux valeurs initiales doivent être différentes.", "x1");
    steps.push(`On part de ${v}₀ = ${fmt(x0)} et ${v}₁ = ${fmt(x1)}, et on répète la formule de la sécante.`);
    r = secant(F, x0, x1, { tol });
    head = ["n", "xₙ₋₁", "xₙ", "f(xₙ)", "xₙ₊₁"];
    rows = r.rows.map((q) => [q.i, fmt(q.x0, 12), fmt(q.x1, 12), fmt(q.fx1, 4), fmt(q.next, 12)]);
    start = [x0, x1]; field = "x0";
  } else {
    const a = num(input, "a", "Début de l'intervalle"), b = num(input, "b", "Fin de l'intervalle");
    if (a >= b) fail("Le début de l'intervalle doit être inférieur à sa fin.", "b");
    const fa = F(a), fb = F(b);
    steps.push(`Vérification du changement de signe : f(${fmt(a)}) = ${fmt(fa)} et f(${fmt(b)}) = ${fmt(fb)}.`);
    r = bisection(F, a, b, { tol });
    head = ["n", "a", "b", "m", "f(m)"];
    rows = r.rows.map((q) => [q.i, fmt(q.a, 12), fmt(q.b, 12), fmt(q.x, 12), fmt(q.fx, 4)]);
    if (rows.length > 60) rows.splice(30, rows.length - 60, ["…", "…", "…", "…", "…"]);
    start = [a, b]; field = r.reason === "sign" ? "b" : "a";
  }
  if (!r.ok) fail(REASONS[r.reason] || "Impossible de trouver la racine.", field);
  const root = r.root;
  const fr = F(root);
  steps.push(`La méthode a convergé après ${r.iterations} itérations vers ${v} ≈ ${fmt(root, 12)}.`);
  steps.push({ text: "Pour vérifier, on remplace la racine dans la fonction :", tex: `f(${ntex(root, 12)}) = ${ntex(fr, 3)}` });
  const lo = Math.min(root, ...start), hi = Math.max(root, ...start);
  const pad = Math.max(1, (hi - lo) * 0.6);
  return {
    results: [
      { label: "Racine", value: root, sig: 12 },
      { label: "Valeur de la fonction à la racine", value: fr, sig: 3 },
      { label: "Nombre d'itérations", value: r.iterations }
    ],
    blocks: [
      { type: "table", caption: "Tableau des itérations", head, rows: rows.map((rw) => rw.map(String)) },
      { type: "plot", title: "La fonction et la position de la racine", xLabel: v, yLabel: `f(${v})`, series: [{ name: `f(${v})`, points: sampleFunction(F, lo - pad, hi + pad, 400) }, { name: "Racine", points: [[root, 0]], marker: "o" }] }
    ],
    steps,
    copy: `Racine ${v} ≈ ${fmt(root, 12)} (f = ${fmt(fr, 3)}, ${r.iterations} itérations)`
  };
}
