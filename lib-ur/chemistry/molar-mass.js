import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { parseFormula, molarMass, formulaTex, formulaHtmlText, BY_SYMBOL, FormulaError } from "./formula.js";

const NA = 6.02214076e23;

export const meta = {
  description: "کسی بھی کیمیائی مرکب کی مولر کمیت اس کے فارمولے سے حساب کریں، ہر عنصر کا کمیتی فیصد دیکھیں، اور کمیت، مولز کی تعداد اور ذرات کی تعداد کے درمیان تبدیلی کریں۔",
  keywords: ["مولر کمیت", "مالیکیولر ویٹ", "molar mass", "molecular weight", "مول", "ایووگیڈرو عدد", "کمیتی فیصد", "g/mol"],
  formulas: [
    { label: "مولر کمیت", tex: "M = \\sum_i n_i \\, A_i" },
    { label: "مولز اور ذرات کی تعداد", tex: "n = \\frac{m}{M},\\qquad N = n\\,N_A" }
  ],
  inputs: [
    { id: "formula", label: "کیمیائی فارمولا", type: "text", default: "C6H12O6", help: "علامات کا پہلا حرف بڑا لکھیں، جیسے H2SO4، Ca(OH)2، CuSO4·5H2O یا K4[Fe(CN)6]۔" },
    { id: "mode", label: "اضافی تبدیلی", type: "select", default: "none", options: [["none", "کچھ نہیں"], ["mass", "میرے پاس کمیت (g) ہے"], ["mol", "میرے پاس مولز کی تعداد ہے"]] },
    { id: "mass", label: "کمیت", unit: "g", type: "number", default: "90", when: { mode: ["mass"] } },
    { id: "moles", label: "مولز کی تعداد", unit: "mol", type: "number", default: "0.5", when: { mode: ["mol"] } }
  ],
  example: { values: { formula: "H2SO4", mode: "mass", mass: "49", moles: "" }, expect: ["M(H2SO4) = 98.07 g/mol", "n = 0.4996 mol"], note: "مثال: سلفیورک ایسڈ کی مولر کمیت اور اس کے 49 g میں مولز کی تعداد۔" },
  invalid: { values: { formula: "Xy2", mode: "none" } },
  related: ["stoichiometry", "empirical-formula", "solutions", "periodic-table", "equation-balancer"]
};

export function solve(input) {
  const raw = str(input, "formula", "کیمیائی فارمولا");
  let counts;
  try { counts = parseFormula(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "formula"); throw e; }
  const M = molarMass(counts);
  const shown = formulaHtmlText(raw);
  const rows = Object.entries(counts).map(([el, n]) => {
    const e = BY_SYMBOL[el], sub = e.mass * n;
    return [`${e.ar} (${el})`, String(n), fmt(e.mass, 6), fmt(sub, 6), `${fmt((100 * sub) / M, 4)}%`];
  });
  const steps = [
    `فارمولے ${shown} میں ہر عنصر کے ایٹم گنیں: ${Object.entries(counts).map(([el, n]) => `${el} = ${n}`).join("، ")}۔`,
    { text: "ہم ہر عنصر کے ایٹموں کی تعداد کو اس کی ایٹمی کمیت سے ضرب دے کر جمع کرتے ہیں:", tex: `M = ${Object.entries(counts).map(([el, n]) => `${n}(${ntex(BY_SYMBOL[el].mass)})`).join(" + ")} = ${ntex(M, 6)}\\ \\text{g/mol}` },
    "ہر عنصر کا کمیتی فیصد = (اس کا حصہ ÷ مولر کمیت) × 100%، جو جدول میں دکھایا گیا ہے۔"
  ];
  const results = [
    { label: "مولر کمیت", value: `${fmt(M, 6)} g/mol`, text: `M = ${fmt(M, 4)} g/mol`, tex: `M(\\mathrm{${formulaTex(raw)}}) = ${ntex(M, 6)}\\ \\text{g/mol}` },
    { label: "فارمولا یونٹ میں ایٹموں کی تعداد", value: String(Object.values(counts).reduce((a, b) => a + b, 0)) }
  ];
  let copy = `M(${shown}) = ${fmt(M, 4)} g/mol`;
  const mode = isBlank(input.mode) ? "none" : input.mode;
  if (mode === "mass") {
    const m = num(input, "mass", "کمیت", { positive: true });
    const n = m / M;
    steps.push({ text: "مولز کی تعداد اور ذرات کی تعداد:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M, 6)}} = ${ntex(n, 4)}\\ \\text{mol},\\quad N = nN_A = ${ntex(n * NA, 4)}` });
    results.push({ label: "مولز کی تعداد", value: `${fmt(n, 4)} mol` }, { label: "ذرات کی تعداد (یونٹس)", value: fmt(n * NA, 4) });
    copy += `, n = ${fmt(n, 4)} mol`;
  } else if (mode === "mol") {
    const n = num(input, "moles", "مولز کی تعداد", { positive: true });
    const m = n * M;
    steps.push({ text: "کمیت اور ذرات کی تعداد:", tex: `m = nM = ${ntex(n)} \\times ${ntex(M, 6)} = ${ntex(m, 4)}\\ \\text{g},\\quad N = ${ntex(n * NA, 4)}` });
    results.push({ label: "کمیت", value: `${fmt(m, 4)} g` }, { label: "ذرات کی تعداد (یونٹس)", value: fmt(n * NA, 4) });
    copy += `, m = ${fmt(m, 4)} g`;
  } else if (mode !== "none") fail("تبدیلی کی قسم منتخب کریں۔", "mode");
  return {
    results, steps, copy,
    blocks: [{ type: "table", caption: "کمیتی ترکیب", head: ["عنصر", "ایٹموں کی تعداد", "ایٹمی کمیت", "حصہ (g/mol)", "کمیتی فیصد"], rows }]
  };
}
