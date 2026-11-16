import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { parseFormula, molarMass, formulaTex, formulaHtmlText, BY_SYMBOL, FormulaError } from "./formula.js";

const NA = 6.02214076e23;

export const meta = {
  description: "محاسبه جرم مولی هر ترکیب شیمیایی از فرمول آن، همراه با درصد جرمی هر عنصر، و تبدیل بین جرم و تعداد مول و تعداد ذرات.",
  keywords: ["جرم مولی", "وزن مولکولی", "molar mass", "molecular weight", "مول", "عدد آووگادرو", "درصد جرمی", "g/mol"],
  formulas: [
    { label: "جرم مولی", tex: "M = \\sum_i n_i \\, A_i" },
    { label: "مول‌ها و تعداد ذرات", tex: "n = \\frac{m}{M},\\qquad N = n\\,N_A" }
  ],
  inputs: [
    { id: "formula", label: "فرمول شیمیایی", type: "text", default: "C6H12O6", help: "نمادها را با حرف اول بزرگ بنویسید، مانند H2SO4 یا Ca(OH)2 یا CuSO4·5H2O یا K4[Fe(CN)6]." },
    { id: "mode", label: "تبدیل اضافی", type: "select", default: "none", options: [["none", "بدون"], ["mass", "جرم دارم (g)"], ["mol", "تعداد مول دارم"]] },
    { id: "mass", label: "جرم", unit: "g", type: "number", default: "90", when: { mode: ["mass"] } },
    { id: "moles", label: "تعداد مول", unit: "mol", type: "number", default: "0.5", when: { mode: ["mol"] } }
  ],
  example: { values: { formula: "H2SO4", mode: "mass", mass: "49", moles: "" }, expect: ["M(H2SO4) = 98.07 g/mol", "n = 0.4996 mol"], note: "مثال: جرم مولی اسید سولفوریک و تعداد مول در 49 g از آن." },
  invalid: { values: { formula: "Xy2", mode: "none" } },
  related: ["stoichiometry", "empirical-formula", "solutions", "periodic-table", "equation-balancer"]
};

export function solve(input) {
  const raw = str(input, "formula", "فرمول شیمیایی");
  let counts;
  try { counts = parseFormula(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "formula"); throw e; }
  const M = molarMass(counts);
  const shown = formulaHtmlText(raw);
  const rows = Object.entries(counts).map(([el, n]) => {
    const e = BY_SYMBOL[el], sub = e.mass * n;
    return [`${e.ar} (${el})`, String(n), fmt(e.mass, 6), fmt(sub, 6), `${fmt((100 * sub) / M, 4)}%`];
  });
  const steps = [
    `تعداد اتم‌های هر عنصر در فرمول ${shown} را می‌شماریم: ${Object.entries(counts).map(([el, n]) => `${el} = ${n}`).join("، ")}.`,
    { text: "تعداد اتم‌های هر عنصر را در جرم اتمی آن ضرب می‌کنیم و جمع می‌زنیم:", tex: `M = ${Object.entries(counts).map(([el, n]) => `${n}(${ntex(BY_SYMBOL[el].mass)})`).join(" + ")} = ${ntex(M, 6)}\\ \\text{g/mol}` },
    "درصد جرمی هر عنصر = (سهم آن ÷ جرم مولی) × 100%، که در جدول نشان داده شده است."
  ];
  const results = [
    { label: "جرم مولی", value: `${fmt(M, 6)} g/mol`, text: `M = ${fmt(M, 4)} g/mol`, tex: `M(\\mathrm{${formulaTex(raw)}}) = ${ntex(M, 6)}\\ \\text{g/mol}` },
    { label: "تعداد اتم‌ها در واحد فرمولی", value: String(Object.values(counts).reduce((a, b) => a + b, 0)) }
  ];
  let copy = `M(${shown}) = ${fmt(M, 4)} g/mol`;
  const mode = isBlank(input.mode) ? "none" : input.mode;
  if (mode === "mass") {
    const m = num(input, "mass", "جرم", { positive: true });
    const n = m / M;
    steps.push({ text: "تعداد مول و تعداد ذرات:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M, 6)}} = ${ntex(n, 4)}\\ \\text{mol},\\quad N = nN_A = ${ntex(n * NA, 4)}` });
    results.push({ label: "تعداد مول", value: `${fmt(n, 4)} mol` }, { label: "تعداد ذرات (واحدها)", value: fmt(n * NA, 4) });
    copy += `, n = ${fmt(n, 4)} mol`;
  } else if (mode === "mol") {
    const n = num(input, "moles", "تعداد مول", { positive: true });
    const m = n * M;
    steps.push({ text: "جرم و تعداد ذرات:", tex: `m = nM = ${ntex(n)} \\times ${ntex(M, 6)} = ${ntex(m, 4)}\\ \\text{g},\\quad N = ${ntex(n * NA, 4)}` });
    results.push({ label: "جرم", value: `${fmt(m, 4)} g` }, { label: "تعداد ذرات (واحدها)", value: fmt(n * NA, 4) });
    copy += `, m = ${fmt(m, 4)} g`;
  } else if (mode !== "none") fail("نوع تبدیل را انتخاب کنید.", "mode");
  return {
    results, steps, copy,
    blocks: [{ type: "table", caption: "ترکیب جرمی", head: ["عنصر", "تعداد اتم‌ها", "جرم اتمی", "سهم (g/mol)", "درصد جرمی"], rows }]
  };
}
