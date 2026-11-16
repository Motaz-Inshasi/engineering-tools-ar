import { choice, str, fail, numList, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { parseBool, truthTable, quineMcCluskey, sopText, sopTex, termText, sopEval, bitsOf, covers } from "../core/boolean.js";
import { BOOL_HELP } from "./truth-table.js";

export const meta = {
  description: "Simplifiez toute fonction logique en somme de produits minimale par la méthode de Quine-McCluskey (jusqu'à 8 variables), avec le tableau de Karnaugh pour 2 à 4 variables, les implicants premiers et essentiels, et la prise en charge des cas indifférents (don't care).",
  keywords: ["Simplification", "Tableau de Karnaugh", "Karnaugh", "karnaugh", "K-map", "Quine-McCluskey", "quine mccluskey", "don't care", "Implicants premiers"],
  formulas: [
    { label: "Règle de regroupement (adjacence)", tex: "AB + A\\overline{B} = A" },
    { label: "Objectif", tex: "F = \\sum m(\\dots) + d(\\dots) \\;\\to\\; \\text{minimum SOP}" }
  ],
  inputs: [
    { id: "mode", label: "Mode de saisie", type: "select", default: "minterms", options: [["minterms", "Minterms"], ["expr", "Expression logique"]] },
    { id: "n", label: "Nombre de variables", type: "number", default: "4", when: { mode: ["minterms"] } },
    { id: "m", label: "Minterms", type: "text", default: "0, 1, 2, 5, 6, 7, 8, 9, 10, 14", when: { mode: ["minterms"] } },
    { id: "d", label: "Cas indifférents (facultatif)", type: "text", when: { mode: ["minterms"] } },
    { id: "expr", label: "Expression logique", type: "expr", default: "A'B'C' + A'B'C + AB'C' + AB'C", when: { mode: ["expr"] }, help: BOOL_HELP }
  ],
  example: { values: { mode: "minterms", n: "4", m: "0, 1, 2, 5, 6, 7, 8, 9, 10, 14", d: "" }, expect: ["F = A'BD + B'C' + CD'"], note: "Exemple classique à quatre variables." },
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
  return { type: "table", ltr: true, caption: `Tableau de Karnaugh (lignes ${vars.slice(0, rv).join("")}, colonnes ${vars.slice(rv).join("")}, codage de Gray)`, head: [`${vars.slice(0, rv).join("")} \\ ${vars.slice(rv).join("")}`, ...cOrder.map(colLab)], rows };
}

export function simplify(minterms, dcs, n) {
  return quineMcCluskey(minterms, dcs, n);
}

export function solve(input) {
  const mode = choice(input, "mode", "Mode de saisie", ["minterms", "expr"], "minterms");
  let n, ones, dcs = [], vars;
  if (mode === "expr") {
    let tree;
    try { tree = parseBool(str(input, "expr", "Expression")); } catch (e) { if (e.name === "InputError") fail(e.message, "expr"); throw e; }
    const t = truthTable(tree);
    if (!t.vars.length) fail("L'expression ne contient aucune variable.", "expr");
    if (t.vars.length > 8) fail("Nombre maximal de variables : 8.", "expr");
    n = t.vars.length; ones = t.minterms; vars = t.vars;
  } else {
    n = num(input, "n", "Nombre de variables", { integer: true, min: 1, max: 8 });
    vars = "ABCDEFGH".slice(0, n).split("");
    ones = isBlank(input.m) ? [] : numList(input, "m", "Minterms");
    dcs = isBlank(input.d) ? [] : numList(input, "d", "Cas indifférents");
    for (const [list, key] of [[ones, "m"], [dcs, "d"]]) for (const m of list) if (!Number.isInteger(m) || m < 0 || m >= 1 << n) fail(`Le minterm ${m} est hors de la plage de 0 à ${(1 << n) - 1} pour ${n} variables.`, key);
    ones = [...new Set(ones)].sort((a, b) => a - b);
    dcs = [...new Set(dcs)].filter((m) => !ones.includes(m)).sort((a, b) => a - b);
  }
  const q = simplify(ones, dcs, n);
  const firstLit = (t) => { const i = [...t].findIndex((c) => c !== "-"); return i < 0 ? n : i; };
  q.cover.sort((a, b) => firstLit(a) - firstLit(b) || (a < b ? 1 : a > b ? -1 : 0));
  const steps = [];
  steps.push(`Minterms : ${ones.join("، ") || "Aucun"}${dcs.length ? `, et indifférents : ${dcs.join("، ")}` : ""}. Les cas indifférents ne servent qu'au regroupement et n'ont pas besoin d'être couverts.`);
  if (q.stages && q.stages.length) {
    steps.push(`Quine-McCluskey : on regroupe les termes selon le nombre de 1, on fusionne chaque paire de termes qui ne diffèrent que d'un bit (noté «-») et on répète jusqu'à ce que la fusion soit impossible. Le processus a comporté ${q.stages.length} étapes.`);
    steps.push(`Implicants premiers (non fusionnés) : ${q.primes.map((p) => `${p} = ${termText(p, vars)}`).join("، ")}.`);
    steps.push(`Implicants premiers essentiels (couvrant un minterm que les autres ne couvrent pas) : ${q.essential.map((p) => termText(p, vars)).join("، ") || "Aucun"}.`);
  }
  steps.push(...q.log);
  const result = sopText(q.cover, vars);
  let ok = true;
  for (let m = 0; m < 1 << n; m++) {
    if (dcs.includes(m)) continue;
    if (sopEval(q.cover, n, m) !== ones.includes(m)) ok = false;
  }
  steps.push({ text: ok ? "Nous avons vérifié que l'expression simplifiée donne la même table de vérité pour toutes les combinaisons (hors cas indifférents) :" : "Attention : la vérification a échoué.", tex: `F = ${sopTex(q.cover, vars)}` });
  const blocks = [];
  if (n >= 2 && n <= 4) blocks.push(kmap(n, ones, dcs, vars));
  if (q.primeInfo && q.primeInfo.length && ones.length) {
    blocks.push({ type: "table", ltr: true, caption: "Tableau des implicants premiers (✓ = couvre le minterm)", head: ["Implicant premier", ...ones.map(String)], rows: q.primeInfo.map((p) => [{ text: `${termText(p.term, vars)}${q.essential.includes(p.term) ? " ★" : ""}`, th: true }, ...ones.map((m) => (covers(p.term, m, n) ? "✓" : ""))]) });
  }
  const lits = q.cover.reduce((s, t) => s + [...t].filter((c) => c !== "-").length, 0);
  return {
    results: [
      { label: "Forme simplifiée", tex: `F = ${sopTex(q.cover, vars)}`, text: `F = ${result}` },
      { label: "Nombre de termes", value: q.cover.length },
      { label: "Nombre de littéraux utilisés (literals)", value: lits }
    ],
    blocks, steps, copy: `F = ${result}`
  };
}

export { bitsOf };
