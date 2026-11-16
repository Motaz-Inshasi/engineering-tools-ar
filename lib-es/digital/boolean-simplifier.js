import { choice, str, fail, numList, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { parseBool, truthTable, quineMcCluskey, sopText, sopTex, termText, sopEval, bitsOf, covers } from "../core/boolean.js";
import { BOOL_HELP } from "./truth-table.js";

export const meta = {
  description: "Simplifica cualquier función booleana a la suma de productos mínima mediante Quine-McCluskey (hasta 8 variables), con mapa de Karnaugh para 2 a 4 variables, implicantes primos y esenciales, y soporte para estados no especificados (don't care).",
  keywords: ["Simplificación", "Mapa de Karnaugh", "Karnaugh", "karnaugh", "K-map", "Quine-McCluskey", "quine mccluskey", "don't care", "Implicantes primos"],
  formulas: [
    { label: "Regla de combinación (adyacencia)", tex: "AB + A\\overline{B} = A" },
    { label: "Objetivo", tex: "F = \\sum m(\\dots) + d(\\dots) \\;\\to\\; \\text{minimum SOP}" }
  ],
  inputs: [
    { id: "mode", label: "Modo de entrada", type: "select", default: "minterms", options: [["minterms", "Minitérminos"], ["expr", "Expresión booleana"]] },
    { id: "n", label: "Número de variables", type: "number", default: "4", when: { mode: ["minterms"] } },
    { id: "m", label: "Minitérminos", type: "text", default: "0, 1, 2, 5, 6, 7, 8, 9, 10, 14", when: { mode: ["minterms"] } },
    { id: "d", label: "Estados no especificados (opcional)", type: "text", when: { mode: ["minterms"] } },
    { id: "expr", label: "Expresión booleana", type: "expr", default: "A'B'C' + A'B'C + AB'C' + AB'C", when: { mode: ["expr"] }, help: BOOL_HELP }
  ],
  example: { values: { mode: "minterms", n: "4", m: "0, 1, 2, 5, 6, 7, 8, 9, 10, 14", d: "" }, expect: ["F = A'BD + B'C' + CD'"], note: "Ejemplo clásico de cuatro variables." },
  invalid: { values: { mode: "minterms", n: "3", m: "1, 9", d: "" } },
  related: ["truth-table", "logic-gates", "flip-flops"]
};

const GRAY2 = [0, 1, 3, 2];

function kmap(n, ones, dcs, vars) {
  const rv = n === 2 ? 1 : n === 3 ? 1 : 2, cv = n - rv;
  const rOrder = rv === 1 ? [0, 1] : GRAY2, cOrder = cv === 1 ? [0, 1] : GRAY2;
  const rowLab = (r) => r.toString(2).padStart(rv, "0"), colLab = (c) => c.toString(2).padStart(cv, "0");
  const rows = rOrder.map((r) => [{ text: rowLab(r), th: true }, ...cOrder.map((c) => {
    const m = (r << cv) | c;
    const v = ones.includes(m) ? "1" : dcs.includes(m) ? "X" : "0";
    return { text: `${v}`, color: v === "1" ? "var(--accent-soft)" : v === "X" ? "var(--warn-soft)" : "", fg: "var(--text)" };
  })]);
  return { type: "table", ltr: true, caption: `Mapa de Karnaugh (filas ${vars.slice(0, rv).join("")}, columnas ${vars.slice(rv).join("")}, en orden Gray)`, head: [`${vars.slice(0, rv).join("")} \\ ${vars.slice(rv).join("")}`, ...cOrder.map(colLab)], rows };
}

export function simplify(minterms, dcs, n) {
  return quineMcCluskey(minterms, dcs, n);
}

export function solve(input) {
  const mode = choice(input, "mode", "Modo de entrada", ["minterms", "expr"], "minterms");
  let n, ones, dcs = [], vars;
  if (mode === "expr") {
    let tree;
    try { tree = parseBool(str(input, "expr", "Expresión")); } catch (e) { if (e.name === "InputError") fail(e.message, "expr"); throw e; }
    const t = truthTable(tree);
    if (!t.vars.length) fail("La expresión no contiene variables.", "expr");
    if (t.vars.length > 8) fail("El número máximo de variables es 8.", "expr");
    n = t.vars.length; ones = t.minterms; vars = t.vars;
  } else {
    n = num(input, "n", "Número de variables", { integer: true, min: 1, max: 8 });
    vars = "ABCDEFGH".slice(0, n).split("");
    ones = isBlank(input.m) ? [] : numList(input, "m", "Minitérminos");
    dcs = isBlank(input.d) ? [] : numList(input, "d", "Estados no especificados");
    for (const [list, key] of [[ones, "m"], [dcs, "d"]]) for (const m of list) if (!Number.isInteger(m) || m < 0 || m >= 1 << n) fail(`El minitérmino ${m} está fuera del rango 0 a ${(1 << n) - 1} para ${n} variables.`, key);
    ones = [...new Set(ones)].sort((a, b) => a - b);
    dcs = [...new Set(dcs)].filter((m) => !ones.includes(m)).sort((a, b) => a - b);
  }
  const q = simplify(ones, dcs, n);
  const firstLit = (t) => { const i = [...t].findIndex((c) => c !== "-"); return i < 0 ? n : i; };
  q.cover.sort((a, b) => firstLit(a) - firstLit(b) || (a < b ? 1 : a > b ? -1 : 0));
  const steps = [];
  steps.push(`Minitérminos: ${ones.join("، ") || "Ninguno"}${dcs.length ? `, y no especificados: ${dcs.join("، ")}` : ""}. Los no especificados se usan solo para combinar y no es necesario cubrirlos.`);
  if (q.stages && q.stages.length) {
    steps.push(`Quine-McCluskey: agrupamos los términos según el número de unos, combinamos cada par que difiere en un bit (se escribe "-") y repetimos hasta que no se pueda combinar. El proceso pasó por ${q.stages.length} etapas.`);
    steps.push(`Implicantes primos (que no se combinaron): ${q.primes.map((p) => `${p} = ${termText(p, vars)}`).join("، ")}.`);
    steps.push(`Implicantes primos esenciales (cubren un minitérmino que ningún otro cubre): ${q.essential.map((p) => termText(p, vars)).join("، ") || "Ninguno"}.`);
  }
  steps.push(...q.log);
  const result = sopText(q.cover, vars);
  let ok = true;
  for (let m = 0; m < 1 << n; m++) {
    if (dcs.includes(m)) continue;
    if (sopEval(q.cover, n, m) !== ones.includes(m)) ok = false;
  }
  steps.push({ text: ok ? "Comprobamos que la expresión simplificada da la misma tabla de verdad para todas las combinaciones (excepto las no especificadas):" : "Advertencia: la comprobación ha fallado.", tex: `F = ${sopTex(q.cover, vars)}` });
  const blocks = [];
  if (n >= 2 && n <= 4) blocks.push(kmap(n, ones, dcs, vars));
  if (q.primeInfo && q.primeInfo.length && ones.length) {
    blocks.push({ type: "table", ltr: true, caption: "Tabla de implicantes primos (✓ = cubre el minitérmino)", head: ["Implicante primo", ...ones.map(String)], rows: q.primeInfo.map((p) => [{ text: `${termText(p.term, vars)}${q.essential.includes(p.term) ? " ★" : ""}`, th: true }, ...ones.map((m) => (covers(p.term, m, n) ? "✓" : ""))]) });
  }
  const lits = q.cover.reduce((s, t) => s + [...t].filter((c) => c !== "-").length, 0);
  return {
    results: [
      { label: "Forma simplificada", tex: `F = ${sopTex(q.cover, vars)}`, text: `F = ${result}` },
      { label: "Número de términos", value: q.cover.length },
      { label: "Número de literales", value: lits }
    ],
    blocks, steps, copy: `F = ${result}`
  };
}

export { bitsOf };
