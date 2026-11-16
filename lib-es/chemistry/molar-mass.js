import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { parseFormula, molarMass, formulaTex, formulaHtmlText, BY_SYMBOL, FormulaError } from "./formula.js";

const NA = 6.02214076e23;

export const meta = {
  description: "Calcula la masa molar de cualquier compuesto químico a partir de su fórmula, con el porcentaje en masa de cada elemento, y convierte entre masa, número de moles y número de partículas.",
  keywords: ["masa molar", "peso molecular", "molar mass", "molecular weight", "mol", "número de Avogadro", "porcentaje en masa", "g/mol"],
  formulas: [
    { label: "masa molar", tex: "M = \\sum_i n_i \\, A_i" },
    { label: "Moles y número de partículas", tex: "n = \\frac{m}{M},\\qquad N = n\\,N_A" }
  ],
  inputs: [
    { id: "formula", label: "Fórmula química", type: "text", default: "C6H12O6", help: "Escribe los símbolos con la primera letra en mayúscula, como H2SO4, Ca(OH)2, CuSO4·5H2O o K4[Fe(CN)6]." },
    { id: "mode", label: "Conversión adicional", type: "select", default: "none", options: [["none", "Ninguna"], ["mass", "Tengo una masa (g)"], ["mol", "Tengo un número de moles"]] },
    { id: "mass", label: "Masa", unit: "g", type: "number", default: "90", when: { mode: ["mass"] } },
    { id: "moles", label: "Número de moles", unit: "mol", type: "number", default: "0.5", when: { mode: ["mol"] } }
  ],
  example: { values: { formula: "H2SO4", mode: "mass", mass: "49", moles: "" }, expect: ["M(H2SO4) = 98.07 g/mol", "n = 0.4996 mol"], note: "Ejemplo: la masa molar del ácido sulfúrico y el número de moles en 49 g de él." },
  invalid: { values: { formula: "Xy2", mode: "none" } },
  related: ["stoichiometry", "empirical-formula", "solutions", "periodic-table", "equation-balancer"]
};

export function solve(input) {
  const raw = str(input, "formula", "Fórmula química");
  let counts;
  try { counts = parseFormula(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "formula"); throw e; }
  const M = molarMass(counts);
  const shown = formulaHtmlText(raw);
  const rows = Object.entries(counts).map(([el, n]) => {
    const e = BY_SYMBOL[el], sub = e.mass * n;
    return [`${e.ar} (${el})`, String(n), fmt(e.mass, 6), fmt(sub, 6), `${fmt((100 * sub) / M, 4)}%`];
  });
  const steps = [
    `Contamos los átomos de cada elemento en la fórmula ${shown}: ${Object.entries(counts).map(([el, n]) => `${el} = ${n}`).join("، ")}.`,
    { text: "Multiplicamos el número de átomos de cada elemento por su masa atómica y sumamos:", tex: `M = ${Object.entries(counts).map(([el, n]) => `${n}(${ntex(BY_SYMBOL[el].mass)})`).join(" + ")} = ${ntex(M, 6)}\\ \\text{g/mol}` },
    "El porcentaje en masa de cada elemento = (su contribución ÷ masa molar) × 100 %, que se muestra en la tabla."
  ];
  const results = [
    { label: "masa molar", value: `${fmt(M, 6)} g/mol`, text: `M = ${fmt(M, 4)} g/mol`, tex: `M(\\mathrm{${formulaTex(raw)}}) = ${ntex(M, 6)}\\ \\text{g/mol}` },
    { label: "Número de átomos en la unidad fórmula", value: String(Object.values(counts).reduce((a, b) => a + b, 0)) }
  ];
  let copy = `M(${shown}) = ${fmt(M, 4)} g/mol`;
  const mode = isBlank(input.mode) ? "none" : input.mode;
  if (mode === "mass") {
    const m = num(input, "mass", "Masa", { positive: true });
    const n = m / M;
    steps.push({ text: "Número de moles y número de partículas:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M, 6)}} = ${ntex(n, 4)}\\ \\text{mol},\\quad N = nN_A = ${ntex(n * NA, 4)}` });
    results.push({ label: "Número de moles", value: `${fmt(n, 4)} mol` }, { label: "Número de partículas (unidades)", value: fmt(n * NA, 4) });
    copy += `, n = ${fmt(n, 4)} mol`;
  } else if (mode === "mol") {
    const n = num(input, "moles", "Número de moles", { positive: true });
    const m = n * M;
    steps.push({ text: "Masa y número de partículas:", tex: `m = nM = ${ntex(n)} \\times ${ntex(M, 6)} = ${ntex(m, 4)}\\ \\text{g},\\quad N = ${ntex(n * NA, 4)}` });
    results.push({ label: "Masa", value: `${fmt(m, 4)} g` }, { label: "Número de partículas (unidades)", value: fmt(n * NA, 4) });
    copy += `, m = ${fmt(m, 4)} g`;
  } else if (mode !== "none") fail("Elige el tipo de conversión.", "mode");
  return {
    results, steps, copy,
    blocks: [{ type: "table", caption: "Composición másica", head: ["Elemento", "Número de átomos", "Masa atómica", "Contribución (g/mol)", "Porcentaje en masa"], rows }]
  };
}
