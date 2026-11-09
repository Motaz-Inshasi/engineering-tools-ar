import { choice, str, fail, numList, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { parseBool, truthTable, quineMcCluskey, sopText, sopTex, termText, sopEval, bitsOf, covers } from "../core/boolean.js";
import { BOOL_HELP } from "./truth-table.js";

export const meta = {
  description: "بسّط أي دالة منطقية إلى أقل مجموع ضرب بطريقة كواين-ماكلاسكي (حتى 8 متغيرات) مع خريطة كارنو لـ 2 إلى 4 متغيرات، والحدود الأولية والأساسية، ودعم الحالات المهملة (don't care).",
  keywords: ["تبسيط", "خريطة كارنو", "كارنو", "karnaugh", "K-map", "كواين ماكلاسكي", "quine mccluskey", "don't care", "حدود أولية"],
  formulas: [
    { label: "قاعدة الدمج (التجاور)", tex: "AB + A\\overline{B} = A" },
    { label: "الهدف", tex: "F = \\sum m(\\dots) + d(\\dots) \\;\\to\\; \\text{minimum SOP}" }
  ],
  inputs: [
    { id: "mode", label: "طريقة الإدخال", type: "select", default: "minterms", options: [["minterms", "حدود صغرى"], ["expr", "تعبير منطقي"]] },
    { id: "n", label: "عدد المتغيرات", type: "number", default: "4", when: { mode: ["minterms"] } },
    { id: "m", label: "الحدود الصغرى", type: "text", default: "0, 1, 2, 5, 6, 7, 8, 9, 10, 14", when: { mode: ["minterms"] } },
    { id: "d", label: "الحالات المهملة (اختياري)", type: "text", when: { mode: ["minterms"] } },
    { id: "expr", label: "التعبير المنطقي", type: "expr", default: "A'B'C' + A'B'C + AB'C' + AB'C", when: { mode: ["expr"] }, help: BOOL_HELP }
  ],
  example: { values: { mode: "minterms", n: "4", m: "0, 1, 2, 5, 6, 7, 8, 9, 10, 14", d: "" }, expect: ["F = A'BD + B'C' + CD'"], note: "مثال كتابي شهير بأربعة متغيرات." },
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
  return { type: "table", ltr: true, caption: `خريطة كارنو (الصفوف ${vars.slice(0, rv).join("")}، الأعمدة ${vars.slice(rv).join("")}، بترتيب غراي)`, head: [`${vars.slice(0, rv).join("")} \\ ${vars.slice(rv).join("")}`, ...cOrder.map(colLab)], rows };
}

export function simplify(minterms, dcs, n) {
  return quineMcCluskey(minterms, dcs, n);
}

export function solve(input) {
  const mode = choice(input, "mode", "طريقة الإدخال", ["minterms", "expr"], "minterms");
  let n, ones, dcs = [], vars;
  if (mode === "expr") {
    let tree;
    try { tree = parseBool(str(input, "expr", "التعبير")); } catch (e) { if (e.name === "InputError") fail(e.message, "expr"); throw e; }
    const t = truthTable(tree);
    if (!t.vars.length) fail("التعبير لا يحتوي متغيرات.", "expr");
    if (t.vars.length > 8) fail("أقصى عدد للمتغيرات 8.", "expr");
    n = t.vars.length; ones = t.minterms; vars = t.vars;
  } else {
    n = num(input, "n", "عدد المتغيرات", { integer: true, min: 1, max: 8 });
    vars = "ABCDEFGH".slice(0, n).split("");
    ones = isBlank(input.m) ? [] : numList(input, "m", "الحدود الصغرى");
    dcs = isBlank(input.d) ? [] : numList(input, "d", "الحالات المهملة");
    for (const [list, key] of [[ones, "m"], [dcs, "d"]]) for (const m of list) if (!Number.isInteger(m) || m < 0 || m >= 1 << n) fail(`الحد ${m} خارج المدى 0 إلى ${(1 << n) - 1} لـ ${n} متغيرات.`, key);
    ones = [...new Set(ones)].sort((a, b) => a - b);
    dcs = [...new Set(dcs)].filter((m) => !ones.includes(m)).sort((a, b) => a - b);
  }
  const q = simplify(ones, dcs, n);
  const firstLit = (t) => { const i = [...t].findIndex((c) => c !== "-"); return i < 0 ? n : i; };
  q.cover.sort((a, b) => firstLit(a) - firstLit(b) || (a < b ? 1 : a > b ? -1 : 0));
  const steps = [];
  steps.push(`الحدود الصغرى: ${ones.join("، ") || "لا يوجد"}${dcs.length ? `، والمهملة: ${dcs.join("، ")}` : ""}. المهملة تُستخدم في الدمج فقط ولا يلزم تغطيتها.`);
  if (q.stages && q.stages.length) {
    steps.push(`كواين-ماكلاسكي: نجمّع الحدود حسب عدد الآحاد، وندمج كل حدين يختلفان في بت واحد (يُكتب "-") ونكرر حتى لا يمكن الدمج. مرّت العملية بـ ${q.stages.length} مراحل.`);
    steps.push(`الحدود الأولية (التي لم تُدمج): ${q.primes.map((p) => `${p} = ${termText(p, vars)}`).join("، ")}.`);
    steps.push(`الحدود الأولية الأساسية (تغطي حداً صغيراً لا يغطيه غيرها): ${q.essential.map((p) => termText(p, vars)).join("، ") || "لا يوجد"}.`);
  }
  steps.push(...q.log);
  const result = sopText(q.cover, vars);
  let ok = true;
  for (let m = 0; m < 1 << n; m++) {
    if (dcs.includes(m)) continue;
    if (sopEval(q.cover, n, m) !== ones.includes(m)) ok = false;
  }
  steps.push({ text: ok ? "تحققنا من أن التعبير المبسّط يعطي جدول الحقيقة نفسه لكل التركيبات (عدا المهملة):" : "تحذير: التحقق فشل.", tex: `F = ${sopTex(q.cover, vars)}` });
  const blocks = [];
  if (n >= 2 && n <= 4) blocks.push(kmap(n, ones, dcs, vars));
  if (q.primeInfo && q.primeInfo.length && ones.length) {
    blocks.push({ type: "table", ltr: true, caption: "جدول الحدود الأولية (✓ = يغطي الحد الصغير)", head: ["الحد الأولي", ...ones.map(String)], rows: q.primeInfo.map((p) => [{ text: `${termText(p.term, vars)}${q.essential.includes(p.term) ? " ★" : ""}`, th: true }, ...ones.map((m) => (covers(p.term, m, n) ? "✓" : ""))]) });
  }
  const lits = q.cover.reduce((s, t) => s + [...t].filter((c) => c !== "-").length, 0);
  return {
    results: [
      { label: "الصيغة المبسطة", tex: `F = ${sopTex(q.cover, vars)}`, text: `F = ${result}` },
      { label: "عدد الحدود", value: q.cover.length },
      { label: "عدد المتغيرات المستخدمة (literals)", value: lits }
    ],
    blocks, steps, copy: `F = ${result}`
  };
}

export { bitsOf };
