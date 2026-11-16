import { matrixInput, fail } from "../core/validate.js";
import { solveLinear, matTex, mvec } from "../core/matrix.js";
import { niceTex, nice, fmt } from "../core/format.js";

export const meta = {
  description: "Solve a system of linear equations with any number of unknowns by Gauss-Jordan elimination, showing each row operation and classifying the system (unique solution, no solution, or infinitely many solutions).",
  keywords: ["linear equations", "system of equations", "Gauss", "Gauss", "gauss", "elimination", "augmented matrix", "linear system"],
  formulas: [
    { label: "Matrix form and augmented matrix", tex: "A\\mathbf{x} = \\mathbf{b} \\;\\Rightarrow\\; [A\\,|\\,\\mathbf{b}] \\xrightarrow{\\text{row ops}} [I\\,|\\,\\mathbf{x}]" },
    { label: "Solvability condition (Rouché–Capelli)", tex: "\\operatorname{rank}(A) = \\operatorname{rank}([A|\\mathbf{b}]) = n \\Rightarrow \\text{unique solution}" }
  ],
  inputs: [
    { id: "aug", label: "Augmented matrix [A | b]", type: "textarea", rows: 4, placeholder: "2 1 -1 8\n-3 -1 2 -11\n-2 1 2 -3", help: "Each line is one equation: the coefficients of the unknowns, followed by the constant at the end of the line. Separate the values with a space or a comma." }
  ],
  example: { values: { aug: "2 1 -1 8\n-3 -1 2 -11\n-2 1 2 -3" }, expect: ["x1 = 2", "x2 = 3", "x3 = -1"], note: "Example: $2x_1 + x_2 - x_3 = 8$, $-3x_1 - x_2 + 2x_3 = -11$, $-2x_1 + x_2 + 2x_3 = -3$." },
  invalid: { values: { aug: "1 2\n3" } },
  related: ["matrix", "nodal-analysis", "mesh-analysis"]
};

export function solve(input) {
  const M = matrixInput(input, "aug", "Augmented matrix", { maxSize: 10 });
  if (M[0].length < 2) fail("Each line needs at least one coefficient, followed by the constant.", "aug");
  const A = M.map((r) => r.slice(0, -1)), b = M.map((r) => r[r.length - 1]);
  const m = A[0].length;
  const res = solveLinear(A, b);
  const steps = [{ text: "Write the augmented matrix:", tex: matTex(res.aug, m) }];
  const shown = res.steps.length > 40 ? [...res.steps.slice(0, 20), null, ...res.steps.slice(-15)] : res.steps;
  for (const s of shown) {
    if (!s) { steps.push("…(additional row operations)…"); continue; }
    steps.push({ text: `Operation $${s.op}$:`, tex: matTex(s.M, m) });
  }
  steps.push(`Rank of A = ${res.rankA}, rank of the augmented matrix = ${res.rankAug}, and number of unknowns = ${m}.`);
  const names = Array.from({ length: m }, (_, i) => `x${i + 1}`);
  if (res.rankA < res.rankAug) {
    steps.push("A row of the form $[0 \\; 0 \\; \\cdots \\; 0 \\,|\\, c]$ with $c \\ne 0$ appeared, which is an impossible equation.");
    return { results: [{ label: "System type", value: "No solution (inconsistent system)" }], steps, copy: "No solution" };
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
    steps.push(`The number of unknowns exceeds the rank, so the free variables are: ${free.join("، ")}, and the rest are expressed in terms of them.`);
    return {
      results: [{ label: "System type", value: "Infinitely many solutions" }, { label: "General solution", value: [...lines, ...free.map((f) => `${f} free`)].join("؛ ") }],
      steps, copy: `Infinitely many solutions: ${lines.join("; ")}`
    };
  }
  const x = res.R.slice(0, m).map((r) => r[m]);
  const resid = mvec(A, x).map((v, i) => v - b[i]);
  const maxRes = Math.max(...resid.map(Math.abs));
  steps.push({ text: "The solution is read from the last column:", tex: x.map((v, i) => `x_{${i + 1}} = ${niceTex(v, 10)}`).join(",\\quad ") });
  steps.push(`To verify, we substituted the solution into the original equations; the largest difference was ${fmt(maxRes, 2)}.`);
  return {
    results: [{ label: "System type", value: "Unique solution" }, ...x.map((v, i) => ({ label: `$x_{${i + 1}}$`, value: v, display: nice(v, 10), text: `x${i + 1} = ${nice(v, 10)}` }))],
    steps,
    copy: x.map((v, i) => `x${i + 1} = ${nice(v, 10)}`).join("\n")
  };
}
