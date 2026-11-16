import { matrixInput, choice, fail } from "../core/validate.js";
import { madd, mmul, det, inverse, rref, eigen, transpose, matTex, matText, identity, cleanMatrix, charPoly } from "../core/matrix.js";
import { niceTex, nice, fmt } from "../core/format.js";
import { toTex as polyTex } from "../core/polynomial.js";
import { ctex, cfmt } from "../core/complex.js";

const OPS = [["det", "Determinante"], ["inverse", "Inversa"], ["rank", "Rango"], ["eigen", "Valores y vectores propios"], ["multiply", "Producto A × B"], ["add", "Suma A + B"], ["subtract", "Resta A − B"], ["transpose", "Traspuesta"]];

export const meta = {
  description: "Operaciones con matrices paso a paso: suma, producto, determinante, inversa, rango, valores y vectores propios y traspuesta, para matrices de hasta 8×8.",
  keywords: ["matriz", "matrices", "determinante", "inversa", "rango", "valores propios", "eigenvalues", "determinant", "inverse", "matrix"],
  formulas: [
    { label: "Inversa y determinante", tex: "A A^{-1} = I, \\qquad \\det(A) = \\prod_i u_{ii} \\cdot (-1)^{\\text{swaps}}" },
    { label: "Valores propios", tex: "\\det(\\lambda I - A) = 0, \\qquad (A - \\lambda I)\\mathbf{v} = \\mathbf{0}" }
  ],
  inputs: [
    { id: "op", label: "Operación", type: "select", default: "det", options: OPS },
    { id: "A", label: "Matriz A", type: "textarea", rows: 4, placeholder: "4 7\n2 6", help: "Cada línea es una fila; los elementos se separan con un espacio o una coma." },
    { id: "B", label: "Matriz B", type: "textarea", rows: 4, when: { op: ["multiply", "add", "subtract"] } }
  ],
  example: { values: { op: "inverse", A: "4 7\n2 6", B: "" }, expect: ["3/5\t-7/10", "-1/5\t2/5"], note: "Ejemplo: inversa de la matriz $\\begin{bmatrix}4&7\\\\2&6\\end{bmatrix}$ y su determinante, 10." },
  invalid: { values: { op: "inverse", A: "1 2\n2 4" } },
  related: ["linear-system", "complex-numbers", "polynomial-roots"]
};

function rowStepList(steps, cols) {
  const out = [];
  const shown = steps.length > 30 ? [...steps.slice(0, 15), null, ...steps.slice(-10)] : steps;
  for (const s of shown) out.push(s ? { text: `Operación $${s.op}$:`, tex: matTex(s.M, cols) } : "…(operaciones de filas adicionales)…");
  return out;
}

export function solve(input) {
  const op = choice(input, "op", "Operación", OPS.map((o) => o[0]), "det");
  const A = matrixInput(input, "A", "Matriz A", { maxSize: 8 });
  const steps = [{ text: "Matriz A:", tex: `A = ${matTex(A)}` }];
  const square = A.length === A[0].length;
  const needSquare = () => { if (!square) fail("Esta operación requiere una matriz cuadrada.", "A"); };
  if (op === "add" || op === "subtract" || op === "multiply") {
    const B = matrixInput(input, "B", "Matriz B", { maxSize: 8 });
    steps.push({ text: "Matriz B:", tex: `B = ${matTex(B)}` });
    let C;
    try {
      C = op === "multiply" ? mmul(A, B) : madd(A, B, op === "add" ? 1 : -1);
    } catch (e) { fail(e.message, "B"); }
    C = cleanMatrix(C);
    if (op === "multiply") steps.push(`Cada elemento $c_{ij}$ es el producto de la fila i de A por la columna j de B: $c_{ij} = \\sum_k a_{ik} b_{kj}$.`);
    else steps.push(`Sumamos o restamos los elementos correspondientes: $c_{ij} = a_{ij} ${op === "add" ? "+" : "-"} b_{ij}$.`);
    const sym = op === "multiply" ? "AB" : op === "add" ? "A + B" : "A - B";
    return { results: [{ label: "Resultado", tex: `${sym} = ${matTex(C)}`, text: matText(C) }], steps, copy: matText(C) };
  }
  if (op === "transpose") {
    const T = transpose(A);
    steps.push("Intercambiamos filas por columnas: $a^T_{ij} = a_{ji}$.");
    return { results: [{ label: "Traspuesta", tex: `A^T = ${matTex(T)}`, text: matText(T) }], steps, copy: matText(T) };
  }
  if (op === "rank") {
    const r = rref(A);
    steps.push("Transformamos la matriz en su forma escalonada reducida mediante operaciones por filas:");
    steps.push(...rowStepList(r.steps));
    steps.push(`Número de filas no nulas (pivotes) = ${r.rank}.`);
    return { results: [{ label: "Rango", value: r.rank }, { label: "Forma escalonada reducida", tex: matTex(r.R), text: matText(r.R) }], steps, copy: `rank = ${r.rank}` };
  }
  if (op === "det") {
    needSquare();
    const d = det(A);
    if (A.length === 2) steps.push({ text: "Para la matriz 2×2:", tex: `\\det A = (${niceTex(A[0][0])})(${niceTex(A[1][1])}) - (${niceTex(A[0][1])})(${niceTex(A[1][0])}) = ${niceTex(d.value, 10)}` });
    else {
      steps.push("Transformamos la matriz en una forma triangular superior por eliminación; luego el determinante es el producto de los elementos de la diagonal, cambiando el signo en cada intercambio de dos filas.");
      steps.push(...rowStepList(d.steps));
      const swaps = d.steps.filter((s) => s.op.includes("leftrightarrow")).length;
      if (d.diag) steps.push({ text: `Número de intercambios de filas = ${swaps}.`, tex: `\\det A = ${swaps % 2 ? "-" : ""}${d.diag.map((x) => `(${niceTex(x, 6)})`).join("")} = ${niceTex(d.value, 10)}` });
      else steps.push("Apareció una columna con solo ceros bajo la diagonal, así que el determinante = 0.");
    }
    return { results: [{ label: "Determinante", value: d.value, display: nice(d.value, 10), text: `det = ${nice(d.value, 10)}` }], steps, copy: `det(A) = ${nice(d.value, 10)}` };
  }
  if (op === "inverse") {
    needSquare();
    const d = det(A);
    steps.push(`Determinante = ${nice(d.value, 10)}.`);
    const r = inverse(A);
    if (!r || d.value === 0) fail("La matriz es singular (determinante cero), por lo que no tiene inversa.", "A");
    steps.push({ text: "Escribimos la matriz ampliada $[A\\,|\\,I]$ y aplicamos Gauss-Jordan hasta obtener $[I\\,|\\,A^{-1}]$:", tex: matTex(r.aug, A.length) });
    steps.push(...rowStepList(r.steps, A.length));
    const check = cleanMatrix(mmul(A, r.inv));
    const okI = check.every((row, i) => row.every((x, j) => Math.abs(x - (i === j ? 1 : 0)) < 1e-9));
    steps.push(okI ? "Para comprobar: $A \\cdot A^{-1} = I$ exactamente." : "Advertencia: la comprobación $A A^{-1}$ no dio I con suficiente precisión debido al mal condicionamiento de la matriz.");
    return { results: [{ label: "Inversa", tex: `A^{-1} = ${matTex(r.inv)}`, text: matText(r.inv) }, { label: "Determinante", value: d.value, display: nice(d.value, 10) }], steps, copy: matText(r.inv) };
  }
  needSquare();
  const e = eigen(A);
  steps.push({ text: "Construimos el polinomio característico (método de Faddeev-LeVerrier):", tex: `\\det(\\lambda I - A) = ${polyTex(e.poly, "\\lambda")}` });
  steps.push("Sus raíces son los valores propios. Para cada valor real resolvemos $(A - \\lambda I)\\mathbf{v} = 0$ para hallar los vectores propios.");
  const rows = e.values.map((ev) => [
    { tex: ctex(ev.value, 8) },
    String(ev.mult),
    ev.vectors.length ? { tex: ev.vectors.map((v) => `\\begin{bmatrix}${v.map((x) => niceTex(x, 6)).join("\\\\")}\\end{bmatrix}`).join(",\\;") } : ev.value.im !== 0 ? "Valor complejo" : "—"
  ]);
  const text = e.values.map((ev) => `λ = ${cfmt(ev.value, 8)}${ev.mult > 1 ? ` (×${ev.mult})` : ""}`).join("، ");
  return {
    results: [{ label: "Valores propios", value: text, text }],
    blocks: [{ type: "table", caption: "Valores y vectores propios", head: ["λ", "Multiplicidad", "Vectores propios"], rows }],
    steps, copy: text
  };
}

export { identity, charPoly };
