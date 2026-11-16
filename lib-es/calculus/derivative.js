import { derivative, simplify } from "../core/symbolic.js";
import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { derivNumeric } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "Calcula simbólicamente la derivada de cualquier función, con una explicación de cada regla de derivación utilizada: potencia, producto, cociente, cadena, y funciones trigonométricas, exponenciales y logarítmicas.",
  intro: "Escribe la función y obtén su primera derivada o una derivada de orden superior, con la regla usada en cada paso y, si lo deseas, el valor de la derivada en un punto.",
  keywords: ["derivada", "derivación", "diferenciación", "derivative", "regla de la cadena", "regla del producto", "regla del cociente"],
  formulas: [
    { label: "regla de la potencia y regla del producto", tex: "\\frac{d}{dx}x^n = n x^{n-1}, \\qquad (uv)' = u'v + uv'" },
    { label: "regla del cociente y regla de la cadena", tex: "\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}, \\qquad \\frac{d}{dx}f(g(x)) = f'(g(x))\\,g'(x)" }
  ],
  inputs: [
    { id: "f", label: "Función f", type: "expr", placeholder: "x^2 sin(x)", help: "Usa ^ para el exponente, y sin cos tan ln log sqrt exp abs, y las constantes pi y e. El producto implícito está permitido, como 2x." },
    { id: "v", label: "Variable", type: "text", default: "x" },
    { id: "order", label: "Orden de la derivada", type: "select", default: "1", options: [["1", "Primera"], ["2", "Segunda"], ["3", "Tercera"], ["4", "Cuarta"], ["5", "Quinta"]] },
    { id: "at", label: "Valor de la variable en el que se calcula la derivada (opcional)", type: "number", placeholder: "p. ej. 1.5" }
  ],
  example: { values: { f: "x^2 sin(x)", v: "x", order: "1", at: "" }, expect: ["x^2*cos(x) + 2*x*sin(x)"], note: "Ejemplo: derivada de $x^2\\sin x$ con la regla del producto." },
  invalid: { values: { f: "x^2 +* 3", v: "x", order: "1" } },
  related: ["integral", "limit", "taylor-series", "function-plotter"]
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const order = Number(choice(input, "order", "Orden de la derivada", ["1", "2", "3", "4", "5"], "1"));
  const at = num(input, "at", "Punto de evaluación", { optional: true });
  const steps = [];
  steps.push({ text: "Función tras simplificar:", tex: `f(${v}) = ${toTex(f)}` });
  let cur = f;
  const all = [];
  for (let k = 1; k <= order; k++) {
    const r = derivative(cur, v, { maxSteps: k === 1 ? 40 : 12 });
    if (order > 1) steps.push({ text: `Derivada n.º ${k}: derivamos el resultado del paso anterior.` });
    for (const s of r.steps) steps.push({ text: s.rule, tex: s.tex });
    cur = r.result;
    all.push(cur);
  }
  const prime = order === 1 ? "'" : order === 2 ? "''" : `^{(${order})}`;
  const results = [{ label: `Derivada $f${prime}(${v})$`, tex: `f${prime}(${v}) = ${toTex(cur)}`, text: toText(cur) }];
  const blocks = [];
  if (at !== null) {
    const val = f1(cur, v)(at);
    if (!isFinite(val)) {
      blocks.push({ type: "note", tone: "warn", text: `La derivada no está definida en ${v} = ${fmt(at)}.` });
    } else {
      results.push({ label: `Valor en ${v} = ${fmt(at)}`, value: val, text: fmt(val, 10) });
      steps.push({ text: `Sustituimos ${v} = ${fmt(at)} en la derivada:`, tex: `f${prime}(${ntex(at)}) = ${ntex(val, 10)}` });
      if (order <= 2) {
        const nd = derivNumeric(f1(f, v), at, order);
        if (isFinite(nd)) steps.push(`Para verificar: la aproximación numérica por diferencias centrales da ${fmt(nd, 8)}.`);
      }
    }
  }
  return { results, steps, blocks, copy: `f${order === 1 ? "'" : order === 2 ? "''" : `(${order})`}(${v}) = ${toText(cur)}${at !== null && isFinite(f1(cur, v)(at)) ? `
En ${v} = ${fmt(at)}: ${fmt(f1(cur, v)(at), 10)}` : ""}` };
}
