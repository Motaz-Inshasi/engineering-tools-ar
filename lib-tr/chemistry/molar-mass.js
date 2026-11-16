import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { parseFormula, molarMass, formulaTex, formulaHtmlText, BY_SYMBOL, FormulaError } from "./formula.js";

const NA = 6.02214076e23;

export const meta = {
  description: "Herhangi bir kimyasal bileşiğin molar kütlesini formülünden hesaplayın; her elementin kütlece yüzdesini gösterin ve kütle, mol sayısı ile molekül sayısı arasında dönüşüm yapın.",
  keywords: ["Molar kütle", "molekül kütlesi", "molar mass", "molecular weight", "mol", "Avogadro sayısı", "kütlece yüzde", "g/mol"],
  formulas: [
    { label: "Molar kütle", tex: "M = \\sum_i n_i \\, A_i" },
    { label: "Mol sayısı ve parçacık sayısı", tex: "n = \\frac{m}{M},\\qquad N = n\\,N_A" }
  ],
  inputs: [
    { id: "formula", label: "Kimyasal formül", type: "text", default: "C6H12O6", help: "Sembolleri büyük harfle başlayarak yazın, örn. H2SO4, Ca(OH)2, CuSO4·5H2O veya K4[Fe(CN)6]." },
    { id: "mode", label: "Ek dönüşüm", type: "select", default: "none", options: [["none", "Yok"], ["mass", "Kütlem var (g)"], ["mol", "Mol sayım var"]] },
    { id: "mass", label: "Kütle", unit: "g", type: "number", default: "90", when: { mode: ["mass"] } },
    { id: "moles", label: "Mol sayısı", unit: "mol", type: "number", default: "0.5", when: { mode: ["mol"] } }
  ],
  example: { values: { formula: "H2SO4", mode: "mass", mass: "49", moles: "" }, expect: ["M(H2SO4) = 98.07 g/mol", "n = 0.4996 mol"], note: "Örnek: sülfürik asidin molar kütlesi ve ondan 49 g'lık mol sayısı." },
  invalid: { values: { formula: "Xy2", mode: "none" } },
  related: ["stoichiometry", "empirical-formula", "solutions", "periodic-table", "equation-balancer"]
};

export function solve(input) {
  const raw = str(input, "formula", "Kimyasal formül");
  let counts;
  try { counts = parseFormula(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "formula"); throw e; }
  const M = molarMass(counts);
  const shown = formulaHtmlText(raw);
  const rows = Object.entries(counts).map(([el, n]) => {
    const e = BY_SYMBOL[el], sub = e.mass * n;
    return [`${e.ar} (${el})`, String(n), fmt(e.mass, 6), fmt(sub, 6), `${fmt((100 * sub) / M, 4)}%`];
  });
  const steps = [
    `Formül ${shown} içinde her elementin atom sayısını sayarız: ${Object.entries(counts).map(([el, n]) => `${el} = ${n}`).join("، ")}.`,
    { text: "Her elementin atom sayısını atom kütlesiyle çarpıp toplarız:", tex: `M = ${Object.entries(counts).map(([el, n]) => `${n}(${ntex(BY_SYMBOL[el].mass)})`).join(" + ")} = ${ntex(M, 6)}\\ \\text{g/mol}` },
    "Her elementin kütlece oranı = (katkısı ÷ molar kütle) × 100%, tabloda gösterilir."
  ];
  const results = [
    { label: "Molar kütle", value: `${fmt(M, 6)} g/mol`, text: `M = ${fmt(M, 4)} g/mol`, tex: `M(\\mathrm{${formulaTex(raw)}}) = ${ntex(M, 6)}\\ \\text{g/mol}` },
    { label: "Formül birimindeki atom sayısı", value: String(Object.values(counts).reduce((a, b) => a + b, 0)) }
  ];
  let copy = `M(${shown}) = ${fmt(M, 4)} g/mol`;
  const mode = isBlank(input.mode) ? "none" : input.mode;
  if (mode === "mass") {
    const m = num(input, "mass", "Kütle", { positive: true });
    const n = m / M;
    steps.push({ text: "Mol sayısı ve molekül sayısı:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M, 6)}} = ${ntex(n, 4)}\\ \\text{mol},\\quad N = nN_A = ${ntex(n * NA, 4)}` });
    results.push({ label: "Mol sayısı", value: `${fmt(n, 4)} mol` }, { label: "Molekül sayısı (birim)", value: fmt(n * NA, 4) });
    copy += `, n = ${fmt(n, 4)} mol`;
  } else if (mode === "mol") {
    const n = num(input, "moles", "Mol sayısı", { positive: true });
    const m = n * M;
    steps.push({ text: "Kütle ve molekül sayısı:", tex: `m = nM = ${ntex(n)} \\times ${ntex(M, 6)} = ${ntex(m, 4)}\\ \\text{g},\\quad N = ${ntex(n * NA, 4)}` });
    results.push({ label: "Kütle", value: `${fmt(m, 4)} g` }, { label: "Molekül sayısı (birim)", value: fmt(n * NA, 4) });
    copy += `, m = ${fmt(m, 4)} g`;
  } else if (mode !== "none") fail("Dönüşüm türünü seçin.", "mode");
  return {
    results, steps, copy,
    blocks: [{ type: "table", caption: "Kütlece bileşim", head: ["Element", "Atom sayısı", "Atom kütlesi", "Katkı (g/mol)", "Kütlece oran"], rows }]
  };
}
