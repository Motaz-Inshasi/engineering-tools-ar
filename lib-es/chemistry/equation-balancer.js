import { fail, str } from "../core/validate.js";
import { balance, equationText, equationTex, formulaHtmlText, FormulaError } from "./formula.js";

export const meta = {
  description: "Ajusta automáticamente cualquier ecuación química hallando los coeficientes enteros más pequeños que conservan el número de átomos de cada elemento, con una tabla de comprobación de átomos en ambos lados y el método de solución algebraica.",
  keywords: ["Ajuste de ecuaciones", "ajuste de una ecuación química", "balance equation", "coeficientes", "conservación de la masa", "reacción química"],
  formulas: [{ label: "Conservación de los átomos de cada elemento", tex: "\\sum_{\\text{reactants}} a_j\\, n_{ij} = \\sum_{\\text{products}} b_k\\, n_{ik}" }],
  inputs: [
    { id: "equation", label: "Ecuación", type: "text", default: "C3H8 + O2 -> CO2 + H2O", wide: true, help: "Separa las sustancias con + y los dos lados con una flecha -> o =, como Fe + O2 -> Fe2O3. Los coeficientes existentes se ignoran." }
  ],
  example: { values: { equation: "KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2" }, expect: ["2 KMnO4 + 16 HCl → 2 KCl + 2 MnCl2 + 8 H2O + 5 Cl2"], note: "Ejemplo: la reacción del permanganato de potasio con el ácido clorhídrico." },
  invalid: { values: { equation: "Na + Cl2 -> KCl" } },
  related: ["stoichiometry", "molar-mass", "empirical-formula", "linear-system"]
};

export function solve(input) {
  const raw = str(input, "equation", "Ecuación");
  let b;
  try { b = balance(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "equation"); throw e; }
  const nL = b.reactants.length;
  const letters = b.species.map((_, i) => String.fromCharCode(97 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : ""));
  const eqs = b.elements.map((el) => {
    const side = (from, to) => b.species.slice(from, to).map((_, k) => {
      const j = from + k, n = b.parsed[j][el] || 0;
      return n ? `${n === 1 ? "" : n}${letters[j]}` : null;
    }).filter(Boolean).join(" + ");
    return `\\text{${el}}:\\ ${side(0, nL)} = ${side(nL, b.species.length)}`;
  });
  const assign = b.species.map((sp, i) => `${letters[i]} = ${b.coef[i]}`).join(",\\ ");
  const rows = b.elements.map((el) => {
    const l = b.species.slice(0, nL).reduce((a, _, j) => a + (b.parsed[j][el] || 0) * b.coef[j], 0);
    const r = b.species.slice(nL).reduce((a, _, k) => a + (b.parsed[nL + k][el] || 0) * b.coef[nL + k], 0);
    return [el, String(l), String(r), l === r ? "✓" : "✗"];
  });
  const text = equationText(b);
  return {
    results: [{ label: "Ecuación ajustada", value: text, tex: equationTex(b) }],
    steps: [
      `Colocamos un coeficiente desconocido delante de cada sustancia: ${b.species.map((sp, i) => `${letters[i]} delante de ${formulaHtmlText(sp)}`).join("، ")}.`,
      { text: "Escribimos la ecuación de conservación de los átomos para cada elemento:", tex: `\\begin{aligned}${eqs.join("\\\\")}\\end{aligned}` },
      { text: "Resolvemos el sistema lineal y elegimos los enteros positivos más pequeños:", tex: assign },
      { text: "Ecuación ajustada:", tex: equationTex(b) }
    ],
    blocks: [{ type: "table", caption: "Comprobación: número de átomos en ambos lados", head: ["Elemento", "Reactivos", "Productos", ""], rows }],
    copy: text
  };
}
