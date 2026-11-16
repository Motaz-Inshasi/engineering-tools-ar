import { matrixInput, fail } from "../core/validate.js";
import { solveLinear, matTex, mvec } from "../core/matrix.js";
import { niceTex, nice, fmt } from "../core/format.js";

export const meta = {
  description: "Resuelve sistemas de ecuaciones lineales con cualquier número de incógnitas mediante eliminación de Gauss-Jordan, mostrando cada operación por filas y clasificando el sistema (solución única, sin solución o infinitas soluciones).",
  keywords: ["ecuaciones lineales", "sistema de ecuaciones", "Gauss", "Gauss", "gauss", "eliminación", "matriz ampliada", "linear system"],
  formulas: [
    { label: "Forma matricial y matriz ampliada", tex: "A\\mathbf{x} = \\mathbf{b} \\;\\Rightarrow\\; [A\\,|\\,\\mathbf{b}] \\xrightarrow{\\text{row ops}} [I\\,|\\,\\mathbf{x}]" },
    { label: "Condición de solución (Rouché-Capelli)", tex: "\\operatorname{rank}(A) = \\operatorname{rank}([A|\\mathbf{b}]) = n \\Rightarrow \\text{unique solution}" }
  ],
  inputs: [
    { id: "aug", label: "Matriz ampliada [A | b]", type: "textarea", rows: 4, placeholder: "2 1 -1 8\n-3 -1 2 -11\n-2 1 2 -3", help: "Cada línea es una ecuación: los coeficientes de las incógnitas y, al final de la línea, el término independiente. Separa los valores con un espacio o una coma." }
  ],
  example: { values: { aug: "2 1 -1 8\n-3 -1 2 -11\n-2 1 2 -3" }, expect: ["x1 = 2", "x2 = 3", "x3 = -1"], note: "Ejemplo: $2x_1 + x_2 - x_3 = 8$, $-3x_1 - x_2 + 2x_3 = -11$, $-2x_1 + x_2 + 2x_3 = -3$." },
  invalid: { values: { aug: "1 2\n3" } },
  related: ["matrix", "nodal-analysis", "mesh-analysis"]
};

export function solve(input) {
  const M = matrixInput(input, "aug", "Matriz ampliada", { maxSize: 10 });
  if (M[0].length < 2) fail("Cada línea necesita al menos un coeficiente y luego el término independiente.", "aug");
  const A = M.map((r) => r.slice(0, -1)), b = M.map((r) => r[r.length - 1]);
  const m = A[0].length;
  const res = solveLinear(A, b);
  const steps = [{ text: "Escribimos la matriz ampliada:", tex: matTex(res.aug, m) }];
  const shown = res.steps.length > 40 ? [...res.steps.slice(0, 20), null, ...res.steps.slice(-15)] : res.steps;
  for (const s of shown) {
    if (!s) { steps.push("…(operaciones de filas adicionales)…"); continue; }
    steps.push({ text: `Operación $${s.op}$:`, tex: matTex(s.M, m) });
  }
  steps.push(`Rango de A = ${res.rankA}, rango de la matriz ampliada = ${res.rankAug} y número de incógnitas = ${m}.`);
  const names = Array.from({ length: m }, (_, i) => `x${i + 1}`);
  if (res.rankA < res.rankAug) {
    steps.push("Apareció una fila de la forma $[0 \\; 0 \\; \\cdots \\; 0 \\,|\\, c]$ con $c \\ne 0$, es decir, una ecuación imposible.");
    return { results: [{ label: "Tipo de sistema", value: "No tiene solución (sistema incompatible)" }], steps, copy: "No tiene solución" };
  }
  if (res.rankA < m) {
    const free = names.filter((_, j) => !res.pivots.includes(j));
    const lines = res.pivots.map((pc, i) => {
      const row = res.R[i];
      let t = nice(row[m], 8);
      for (let j = 0; j < m; j++) {
        if (j === pc || res.pivots.includes(j) || Math.abs(row[j]) < 1e-12) continue;
        t += ` ${row[j] > 0 ? "-" : "+"} ${Math.abs(row[j]) === 1 ? "" : nice(Math.abs(row[j]), 8) + "·"}${names[j]}`;
      }
      return `${names[pc]} = ${t}`;
    });
    steps.push(`El número de incógnitas es mayor que el rango, así que las variables libres son: ${free.join("، ")}, y el resto se expresa en función de ellas.`);
    return {
      results: [{ label: "Tipo de sistema", value: "Infinitas soluciones" }, { label: "Solución general", value: [...lines, ...free.map((f) => `${f} libre`)].join("؛ ") }],
      steps, copy: `Infinitas soluciones: ${lines.join("; ")}`
    };
  }
  const x = res.R.slice(0, m).map((r) => r[m]);
  const resid = mvec(A, x).map((v, i) => v - b[i]);
  const maxRes = Math.max(...resid.map(Math.abs));
  steps.push({ text: "La solución se lee de la última columna:", tex: x.map((v, i) => `x_{${i + 1}} = ${niceTex(v, 10)}`).join(",\\quad ") });
  steps.push(`Para comprobar, sustituimos la solución en las ecuaciones originales; la mayor diferencia fue ${fmt(maxRes, 2)}.`);
  return {
    results: [{ label: "Tipo de sistema", value: "Solución única" }, ...x.map((v, i) => ({ label: `$x_{${i + 1}}$`, value: v, display: nice(v, 10), text: `x${i + 1} = ${nice(v, 10)}` }))],
    steps,
    copy: x.map((v, i) => `x${i + 1} = ${nice(v, 10)}`).join("\n")
  };
}
