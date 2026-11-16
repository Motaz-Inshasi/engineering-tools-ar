import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { parseFormula, molarMass, formulaTex, formulaHtmlText, BY_SYMBOL, FormulaError } from "./formula.js";

const NA = 6.02214076e23;

export const meta = {
  description: "Hitung massa molar senyawa kimia apa pun dari rumusnya, dengan persen massa setiap unsur, dan konversi antara massa, jumlah mol, dan jumlah partikel.",
  keywords: ["massa molar", "berat molekul", "molar mass", "molecular weight", "mol", "bilangan Avogadro", "persen massa", "g/mol"],
  formulas: [
    { label: "massa molar", tex: "M = \\sum_i n_i \\, A_i" },
    { label: "Mol dan jumlah partikel", tex: "n = \\frac{m}{M},\\qquad N = n\\,N_A" }
  ],
  inputs: [
    { id: "formula", label: "Rumus kimia", type: "text", default: "C6H12O6", help: "Tulis lambang dengan huruf pertama kapital, misalnya H2SO4, Ca(OH)2, CuSO4·5H2O, atau K4[Fe(CN)6]." },
    { id: "mode", label: "Konversi tambahan", type: "select", default: "none", options: [["none", "Tidak ada"], ["mass", "Saya punya massa (g)"], ["mol", "Saya punya jumlah mol"]] },
    { id: "mass", label: "Massa", unit: "g", type: "number", default: "90", when: { mode: ["mass"] } },
    { id: "moles", label: "Jumlah mol", unit: "mol", type: "number", default: "0.5", when: { mode: ["mol"] } }
  ],
  example: { values: { formula: "H2SO4", mode: "mass", mass: "49", moles: "" }, expect: ["M(H2SO4) = 98.07 g/mol", "n = 0.4996 mol"], note: "Contoh: massa molar asam sulfat dan jumlah mol dalam 49 g darinya." },
  invalid: { values: { formula: "Xy2", mode: "none" } },
  related: ["stoichiometry", "empirical-formula", "solutions", "periodic-table", "equation-balancer"]
};

export function solve(input) {
  const raw = str(input, "formula", "Rumus kimia");
  let counts;
  try { counts = parseFormula(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "formula"); throw e; }
  const M = molarMass(counts);
  const shown = formulaHtmlText(raw);
  const rows = Object.entries(counts).map(([el, n]) => {
    const e = BY_SYMBOL[el], sub = e.mass * n;
    return [`${e.ar} (${el})`, String(n), fmt(e.mass, 6), fmt(sub, 6), `${fmt((100 * sub) / M, 4)}%`];
  });
  const steps = [
    `Kita hitung atom setiap unsur dalam rumus ${shown}: ${Object.entries(counts).map(([el, n]) => `${el} = ${n}`).join("، ")}.`,
    { text: "Kita kalikan jumlah atom setiap unsur dengan massa atomnya, lalu dijumlahkan:", tex: `M = ${Object.entries(counts).map(([el, n]) => `${n}(${ntex(BY_SYMBOL[el].mass)})`).join(" + ")} = ${ntex(M, 6)}\\ \\text{g/mol}` },
    "Persen massa setiap unsur = (kontribusinya ÷ massa molar) × 100%, ditampilkan dalam tabel."
  ];
  const results = [
    { label: "massa molar", value: `${fmt(M, 6)} g/mol`, text: `M = ${fmt(M, 4)} g/mol`, tex: `M(\\mathrm{${formulaTex(raw)}}) = ${ntex(M, 6)}\\ \\text{g/mol}` },
    { label: "Jumlah atom dalam satuan rumus", value: String(Object.values(counts).reduce((a, b) => a + b, 0)) }
  ];
  let copy = `M(${shown}) = ${fmt(M, 4)} g/mol`;
  const mode = isBlank(input.mode) ? "none" : input.mode;
  if (mode === "mass") {
    const m = num(input, "mass", "Massa", { positive: true });
    const n = m / M;
    steps.push({ text: "Jumlah mol dan jumlah partikel:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M, 6)}} = ${ntex(n, 4)}\\ \\text{mol},\\quad N = nN_A = ${ntex(n * NA, 4)}` });
    results.push({ label: "Jumlah mol", value: `${fmt(n, 4)} mol` }, { label: "Jumlah partikel (satuan)", value: fmt(n * NA, 4) });
    copy += `, n = ${fmt(n, 4)} mol`;
  } else if (mode === "mol") {
    const n = num(input, "moles", "Jumlah mol", { positive: true });
    const m = n * M;
    steps.push({ text: "Massa dan jumlah partikel:", tex: `m = nM = ${ntex(n)} \\times ${ntex(M, 6)} = ${ntex(m, 4)}\\ \\text{g},\\quad N = ${ntex(n * NA, 4)}` });
    results.push({ label: "Massa", value: `${fmt(m, 4)} g` }, { label: "Jumlah partikel (satuan)", value: fmt(n * NA, 4) });
    copy += `, m = ${fmt(m, 4)} g`;
  } else if (mode !== "none") fail("Pilih jenis konversi.", "mode");
  return {
    results, steps, copy,
    blocks: [{ type: "table", caption: "Komposisi massa", head: ["Unsur", "Jumlah atom", "Massa atom", "Kontribusi (g/mol)", "Persen massa"], rows }]
  };
}
