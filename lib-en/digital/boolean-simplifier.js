import { choice, str, fail, numList, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { parseBool, truthTable, quineMcCluskey, sopText, sopTex, termText, sopEval, bitsOf, covers } from "../core/boolean.js";
import { BOOL_HELP } from "./truth-table.js";

export const meta = {
  description: "Simplify any logic function into a minimum sum of products using the Quine-McCluskey method (up to 8 variables), with a Karnaugh map for 2 to 4 variables, prime and essential implicants, and support for don't-care states.",
  keywords: ["simplification", "Karnaugh map", "Karnaugh", "karnaugh", "K-map", "Quine-McCluskey", "quine mccluskey", "don't care", "prime implicants"],
  formulas: [
    { label: "Combining (adjacency) rule", tex: "AB + A\\overline{B} = A" },
    { label: "Goal", tex: "F = \\sum m(\\dots) + d(\\dots) \\;\\to\\; \\text{minimum SOP}" }
  ],
  inputs: [
    { id: "mode", label: "Input method", type: "select", default: "minterms", options: [["minterms", "minterms"], ["expr", "logic expression"]] },
    { id: "n", label: "Number of variables", type: "number", default: "4", when: { mode: ["minterms"] } },
    { id: "m", label: "Minterms", type: "text", default: "0, 1, 2, 5, 6, 7, 8, 9, 10, 14", when: { mode: ["minterms"] } },
    { id: "d", label: "Don't-care states (optional)", type: "text", when: { mode: ["minterms"] } },
    { id: "expr", label: "Logic expression", type: "expr", default: "A'B'C' + A'B'C + AB'C' + AB'C", when: { mode: ["expr"] }, help: BOOL_HELP }
  ],
  example: { values: { mode: "minterms", n: "4", m: "0, 1, 2, 5, 6, 7, 8, 9, 10, 14", d: "" }, expect: ["F = A'BD + B'C' + CD'"], note: "A well-known textbook example with four variables." },
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
  return { type: "table", ltr: true, caption: `Karnaugh map (rows ${vars.slice(0, rv).join("")}, columns ${vars.slice(rv).join("")}, in Gray code order)`, head: [`${vars.slice(0, rv).join("")} \\ ${vars.slice(rv).join("")}`, ...cOrder.map(colLab)], rows };
}

export function simplify(minterms, dcs, n) {
  return quineMcCluskey(minterms, dcs, n);
}

export function solve(input) {
  const mode = choice(input, "mode", "Input method", ["minterms", "expr"], "minterms");
  let n, ones, dcs = [], vars;
  if (mode === "expr") {
    let tree;
    try { tree = parseBool(str(input, "expr", "Expression")); } catch (e) { if (e.name === "InputError") fail(e.message, "expr"); throw e; }
    const t = truthTable(tree);
    if (!t.vars.length) fail("The expression contains no variables.", "expr");
    if (t.vars.length > 8) fail("The maximum number of variables is 8.", "expr");
    n = t.vars.length; ones = t.minterms; vars = t.vars;
  } else {
    n = num(input, "n", "Number of variables", { integer: true, min: 1, max: 8 });
    vars = "ABCDEFGH".slice(0, n).split("");
    ones = isBlank(input.m) ? [] : numList(input, "m", "Minterms");
    dcs = isBlank(input.d) ? [] : numList(input, "d", "Don't-care states");
    for (const [list, key] of [[ones, "m"], [dcs, "d"]]) for (const m of list) if (!Number.isInteger(m) || m < 0 || m >= 1 << n) fail(`The term ${m} is outside the range 0 to ${(1 << n) - 1} for ${n} variables.`, key);
    ones = [...new Set(ones)].sort((a, b) => a - b);
    dcs = [...new Set(dcs)].filter((m) => !ones.includes(m)).sort((a, b) => a - b);
  }
  const q = simplify(ones, dcs, n);
  const firstLit = (t) => { const i = [...t].findIndex((c) => c !== "-"); return i < 0 ? n : i; };
  q.cover.sort((a, b) => firstLit(a) - firstLit(b) || (a < b ? 1 : a > b ? -1 : 0));
  const steps = [];
  steps.push(`Minterms: ${ones.join("، ") || "None"}${dcs.length ? `, don't-care: ${dcs.join("، ")}` : ""}. Don't-care states are used only for combining and do not need to be covered.`);
  if (q.stages && q.stages.length) {
    steps.push(`Quine-McCluskey: we group the terms by the number of ones, combine every two terms that differ in one bit (written as "-"), and repeat until no more combining is possible. The process went through ${q.stages.length} stages.`);
    steps.push(`Prime implicants (those not combined): ${q.primes.map((p) => `${p} = ${termText(p, vars)}`).join("، ")}.`);
    steps.push(`Essential prime implicants (they cover a minterm that no other implicant covers): ${q.essential.map((p) => termText(p, vars)).join("، ") || "None"}.`);
  }
  steps.push(...q.log);
  const result = sopText(q.cover, vars);
  let ok = true;
  for (let m = 0; m < 1 << n; m++) {
    if (dcs.includes(m)) continue;
    if (sopEval(q.cover, n, m) !== ones.includes(m)) ok = false;
  }
  steps.push({ text: ok ? "We verified that the simplified expression gives the same truth table for all combinations (except don't-care states):" : "Warning: verification failed.", tex: `F = ${sopTex(q.cover, vars)}` });
  const blocks = [];
  if (n >= 2 && n <= 4) blocks.push(kmap(n, ones, dcs, vars));
  if (q.primeInfo && q.primeInfo.length && ones.length) {
    blocks.push({ type: "table", ltr: true, caption: "Prime implicant table (✓ = covers the minterm)", head: ["Prime implicant", ...ones.map(String)], rows: q.primeInfo.map((p) => [{ text: `${termText(p.term, vars)}${q.essential.includes(p.term) ? " ★" : ""}`, th: true }, ...ones.map((m) => (covers(p.term, m, n) ? "✓" : ""))]) });
  }
  const lits = q.cover.reduce((s, t) => s + [...t].filter((c) => c !== "-").length, 0);
  return {
    results: [
      { label: "Simplified form", tex: `F = ${sopTex(q.cover, vars)}`, text: `F = ${result}` },
      { label: "Number of terms", value: q.cover.length },
      { label: "Number of variables used (literals)", value: lits }
    ],
    blocks, steps, copy: `F = ${result}`
  };
}

export { bitsOf };
