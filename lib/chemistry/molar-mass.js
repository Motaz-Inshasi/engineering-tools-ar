import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { parseFormula, molarMass, formulaTex, formulaHtmlText, BY_SYMBOL, FormulaError } from "./formula.js";

const NA = 6.02214076e23;

export const meta = {
  description: "احسب الكتلة المولية لأي مركب كيميائي من صيغته، مع النسبة المئوية الكتلية لكل عنصر، وحوّل بين الكتلة وعدد المولات وعدد الجزيئات.",
  keywords: ["الكتلة المولية", "الوزن الجزيئي", "molar mass", "molecular weight", "مول", "عدد أفوجادرو", "النسبة المئوية الكتلية", "g/mol"],
  formulas: [
    { label: "الكتلة المولية", tex: "M = \\sum_i n_i \\, A_i" },
    { label: "المولات وعدد الجسيمات", tex: "n = \\frac{m}{M},\\qquad N = n\\,N_A" }
  ],
  inputs: [
    { id: "formula", label: "الصيغة الكيميائية", type: "text", default: "C6H12O6", help: "اكتب الرموز بحرف أول كبير، مثل H2SO4 أو Ca(OH)2 أو CuSO4·5H2O أو K4[Fe(CN)6]." },
    { id: "mode", label: "تحويل إضافي", type: "select", default: "none", options: [["none", "بدون"], ["mass", "لدي كتلة (g)"], ["mol", "لدي عدد مولات"]] },
    { id: "mass", label: "الكتلة", unit: "g", type: "number", default: "90", when: { mode: ["mass"] } },
    { id: "moles", label: "عدد المولات", unit: "mol", type: "number", default: "0.5", when: { mode: ["mol"] } }
  ],
  example: { values: { formula: "H2SO4", mode: "mass", mass: "49", moles: "" }, expect: ["M(H2SO4) = 98.07 g/mol", "n = 0.4996 mol"], note: "مثال: الكتلة المولية لحمض الكبريتيك وعدد مولات 49 g منه." },
  invalid: { values: { formula: "Xy2", mode: "none" } },
  related: ["stoichiometry", "empirical-formula", "solutions", "periodic-table", "equation-balancer"]
};

export function solve(input) {
  const raw = str(input, "formula", "الصيغة الكيميائية");
  let counts;
  try { counts = parseFormula(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "formula"); throw e; }
  const M = molarMass(counts);
  const shown = formulaHtmlText(raw);
  const rows = Object.entries(counts).map(([el, n]) => {
    const e = BY_SYMBOL[el], sub = e.mass * n;
    return [`${e.ar} (${el})`, String(n), fmt(e.mass, 6), fmt(sub, 6), `${fmt((100 * sub) / M, 4)}%`];
  });
  const steps = [
    `نعدّ ذرات كل عنصر في الصيغة ${shown}: ${Object.entries(counts).map(([el, n]) => `${el} = ${n}`).join("، ")}.`,
    { text: "نضرب عدد ذرات كل عنصر في كتلته الذرية ونجمع:", tex: `M = ${Object.entries(counts).map(([el, n]) => `${n}(${ntex(BY_SYMBOL[el].mass)})`).join(" + ")} = ${ntex(M, 6)}\\ \\text{g/mol}` },
    "النسبة الكتلية لكل عنصر = (مساهمته ÷ الكتلة المولية) × 100%، وتظهر في الجدول."
  ];
  const results = [
    { label: "الكتلة المولية", value: `${fmt(M, 6)} g/mol`, text: `M = ${fmt(M, 4)} g/mol`, tex: `M(\\mathrm{${formulaTex(raw)}}) = ${ntex(M, 6)}\\ \\text{g/mol}` },
    { label: "عدد الذرات في الوحدة الصيغية", value: String(Object.values(counts).reduce((a, b) => a + b, 0)) }
  ];
  let copy = `M(${shown}) = ${fmt(M, 4)} g/mol`;
  const mode = isBlank(input.mode) ? "none" : input.mode;
  if (mode === "mass") {
    const m = num(input, "mass", "الكتلة", { positive: true });
    const n = m / M;
    steps.push({ text: "عدد المولات وعدد الجزيئات:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M, 6)}} = ${ntex(n, 4)}\\ \\text{mol},\\quad N = nN_A = ${ntex(n * NA, 4)}` });
    results.push({ label: "عدد المولات", value: `${fmt(n, 4)} mol` }, { label: "عدد الجزيئات (الوحدات)", value: fmt(n * NA, 4) });
    copy += `, n = ${fmt(n, 4)} mol`;
  } else if (mode === "mol") {
    const n = num(input, "moles", "عدد المولات", { positive: true });
    const m = n * M;
    steps.push({ text: "الكتلة وعدد الجزيئات:", tex: `m = nM = ${ntex(n)} \\times ${ntex(M, 6)} = ${ntex(m, 4)}\\ \\text{g},\\quad N = ${ntex(n * NA, 4)}` });
    results.push({ label: "الكتلة", value: `${fmt(m, 4)} g` }, { label: "عدد الجزيئات (الوحدات)", value: fmt(n * NA, 4) });
    copy += `, m = ${fmt(m, 4)} g`;
  } else if (mode !== "none") fail("اختر نوع التحويل.", "mode");
  return {
    results, steps, copy,
    blocks: [{ type: "table", caption: "التركيب الكتلي", head: ["العنصر", "عدد الذرات", "الكتلة الذرية", "المساهمة (g/mol)", "النسبة الكتلية"], rows }]
  };
}
