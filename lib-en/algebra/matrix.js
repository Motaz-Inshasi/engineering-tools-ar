import { matrixInput, choice, fail } from "../core/validate.js";
import { madd, mmul, det, inverse, rref, eigen, transpose, matTex, matText, identity, cleanMatrix, charPoly } from "../core/matrix.js";
import { niceTex, nice, fmt } from "../core/format.js";
import { toTex as polyTex } from "../core/polynomial.js";
import { ctex, cfmt } from "../core/complex.js";

const OPS = [["det", "Determinant"], ["inverse", "Inverse"], ["rank", "Rank"], ["eigen", "Eigenvalues and eigenvectors"], ["multiply", "Multiply A × B"], ["add", "Add A + B"], ["subtract", "Subtract A − B"], ["transpose", "Transpose"]];

export const meta = {
  description: "Matrix operations with steps: addition, multiplication, determinant, inverse, rank, eigenvalues and eigenvectors, and transpose, for matrices up to 8×8.",
  keywords: ["matrix", "matrices", "determinant", "inverse", "rank", "eigenvalues", "eigenvalues", "determinant", "inverse", "matrix"],
  formulas: [
    { label: "Inverse and determinant", tex: "A A^{-1} = I, \\qquad \\det(A) = \\prod_i u_{ii} \\cdot (-1)^{\\text{swaps}}" },
    { label: "Eigenvalues", tex: "\\det(\\lambda I - A) = 0, \\qquad (A - \\lambda I)\\mathbf{v} = \\mathbf{0}" }
  ],
  inputs: [
    { id: "op", label: "Operation", type: "select", default: "det", options: OPS },
    { id: "A", label: "Matrix A", type: "textarea", rows: 4, placeholder: "4 7\n2 6", help: "Each line is a row; the entries are separated by a space or a comma." },
    { id: "B", label: "Matrix B", type: "textarea", rows: 4, when: { op: ["multiply", "add", "subtract"] } }
  ],
  example: { values: { op: "inverse", A: "4 7\n2 6", B: "" }, expect: ["3/5\t-7/10", "-1/5\t2/5"], note: "Example: the inverse of the matrix $\\begin{bmatrix}4&7\\\\2&6\\end{bmatrix}$ has determinant 10." },
  invalid: { values: { op: "inverse", A: "1 2\n2 4" } },
  related: ["linear-system", "complex-numbers", "polynomial-roots"]
};

function rowStepList(steps, cols) {
  const out = [];
  const shown = steps.length > 30 ? [...steps.slice(0, 15), null, ...steps.slice(-10)] : steps;
  for (const s of shown) out.push(s ? { text: `Operation $${s.op}$:`, tex: matTex(s.M, cols) } : "…(additional row operations)…");
  return out;
}

export function solve(input) {
  const op = choice(input, "op", "Operation", OPS.map((o) => o[0]), "det");
  const A = matrixInput(input, "A", "Matrix A", { maxSize: 8 });
  const steps = [{ text: "Matrix A:", tex: `A = ${matTex(A)}` }];
  const square = A.length === A[0].length;
  const needSquare = () => { if (!square) fail("This operation requires a square matrix.", "A"); };
  if (op === "add" || op === "subtract" || op === "multiply") {
    const B = matrixInput(input, "B", "Matrix B", { maxSize: 8 });
    steps.push({ text: "Matrix B:", tex: `B = ${matTex(B)}` });
    let C;
    try {
      C = op === "multiply" ? mmul(A, B) : madd(A, B, op === "add" ? 1 : -1);
    } catch (e) { fail(e.message, "B"); }
    C = cleanMatrix(C);
    if (op === "multiply") steps.push(`Each entry $c_{ij}$ is the product of row i of A and column j of B: $c_{ij} = \\sum_k a_{ik} b_{kj}$.`);
    else steps.push(`We add or subtract the corresponding entries: $c_{ij} = a_{ij} ${op === "add" ? "+" : "-"} b_{ij}$.`);
    const sym = op === "multiply" ? "AB" : op === "add" ? "A + B" : "A - B";
    return { results: [{ label: "Result", tex: `${sym} = ${matTex(C)}`, text: matText(C) }], steps, copy: matText(C) };
  }
  if (op === "transpose") {
    const T = transpose(A);
    steps.push("We swap rows and columns: $a^T_{ij} = a_{ji}$.");
    return { results: [{ label: "Transpose", tex: `A^T = ${matTex(T)}`, text: matText(T) }], steps, copy: matText(T) };
  }
  if (op === "rank") {
    const r = rref(A);
    steps.push("We convert the matrix to reduced row echelon form using row operations:");
    steps.push(...rowStepList(r.steps));
    steps.push(`Number of nonzero rows (pivots) = ${r.rank}.`);
    return { results: [{ label: "Rank", value: r.rank }, { label: "Reduced row echelon form", tex: matTex(r.R), text: matText(r.R) }], steps, copy: `rank = ${r.rank}` };
  }
  if (op === "det") {
    needSquare();
    const d = det(A);
    if (A.length === 2) steps.push({ text: "For a 2×2 matrix:", tex: `\\det A = (${niceTex(A[0][0])})(${niceTex(A[1][1])}) - (${niceTex(A[0][1])})(${niceTex(A[1][0])}) = ${niceTex(d.value, 10)}` });
    else {
      steps.push("We reduce the matrix to upper triangular form by elimination; the determinant is then the product of the diagonal entries, with the sign changed for each swap of two rows.");
      steps.push(...rowStepList(d.steps));
      const swaps = d.steps.filter((s) => s.op.includes("leftrightarrow")).length;
      if (d.diag) steps.push({ text: `Number of row swaps = ${swaps}.`, tex: `\\det A = ${swaps % 2 ? "-" : ""}${d.diag.map((x) => `(${niceTex(x, 6)})`).join("")} = ${niceTex(d.value, 10)}` });
      else steps.push("A column of zeros appeared below the diagonal, so the determinant = 0.");
    }
    return { results: [{ label: "Determinant", value: d.value, display: nice(d.value, 10), text: `det = ${nice(d.value, 10)}` }], steps, copy: `det(A) = ${nice(d.value, 10)}` };
  }
  if (op === "inverse") {
    needSquare();
    const d = det(A);
    steps.push(`Determinant = ${nice(d.value, 10)}.`);
    const r = inverse(A);
    if (!r || d.value === 0) fail("The matrix is singular (its determinant is zero), so it has no inverse.", "A");
    steps.push({ text: "We write the augmented matrix $[A\\,|\\,I]$ and apply Gauss-Jordan elimination until we obtain $[I\\,|\\,A^{-1}]$:", tex: matTex(r.aug, A.length) });
    steps.push(...rowStepList(r.steps, A.length));
    const check = cleanMatrix(mmul(A, r.inv));
    const okI = check.every((row, i) => row.every((x, j) => Math.abs(x - (i === j ? 1 : 0)) < 1e-9));
    steps.push(okI ? "Verification: $A \\cdot A^{-1} = I$ exactly." : "Warning: the check $A A^{-1}$ did not give I with sufficient accuracy because the matrix is ill-conditioned.");
    return { results: [{ label: "Inverse", tex: `A^{-1} = ${matTex(r.inv)}`, text: matText(r.inv) }, { label: "Determinant", value: d.value, display: nice(d.value, 10) }], steps, copy: matText(r.inv) };
  }
  needSquare();
  const e = eigen(A);
  steps.push({ text: "We form the characteristic polynomial (using the Faddeev–LeVerrier method):", tex: `\\det(\\lambda I - A) = ${polyTex(e.poly, "\\lambda")}` });
  steps.push("Its roots are the eigenvalues. For each real value we solve $(A - \\lambda I)\\mathbf{v} = 0$ to find the eigenvectors.");
  const rows = e.values.map((ev) => [
    { tex: ctex(ev.value, 8) },
    String(ev.mult),
    ev.vectors.length ? { tex: ev.vectors.map((v) => `\\begin{bmatrix}${v.map((x) => niceTex(x, 6)).join("\\\\")}\\end{bmatrix}`).join(",\\;") } : ev.value.im !== 0 ? "Complex value" : "—"
  ]);
  const text = e.values.map((ev) => `λ = ${cfmt(ev.value, 8)}${ev.mult > 1 ? ` (×${ev.mult})` : ""}`).join("، ");
  return {
    results: [{ label: "Eigenvalues", value: text, text }],
    blocks: [{ type: "table", caption: "Eigenvalues and eigenvectors", head: ["λ", "Multiplicity", "Eigenvectors"], rows }],
    steps, copy: text
  };
}

export { identity, charPoly };
