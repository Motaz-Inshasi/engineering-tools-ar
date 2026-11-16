import { matrixInput, choice, fail } from "../core/validate.js";
import { madd, mmul, det, inverse, rref, eigen, transpose, matTex, matText, identity, cleanMatrix, charPoly } from "../core/matrix.js";
import { niceTex, nice, fmt } from "../core/format.js";
import { toTex as polyTex } from "../core/polynomial.js";
import { ctex, cfmt } from "../core/complex.js";

const OPS = [["det", "Déterminant"], ["inverse", "Inverse"], ["rank", "Rang"], ["eigen", "Valeurs et vecteurs propres"], ["multiply", "Produit A × B"], ["add", "Somme A + B"], ["subtract", "Différence A − B"], ["transpose", "Transposée"]];

export const meta = {
  description: "Opérations sur les matrices avec étapes : somme, produit, déterminant, inverse, rang, valeurs et vecteurs propres et transposée, pour des matrices allant jusqu'à 8×8.",
  keywords: ["matrice", "matrices", "déterminant", "inverse", "rang", "valeurs propres", "eigenvalues", "determinant", "inverse", "matrix"],
  formulas: [
    { label: "Inverse et déterminant", tex: "A A^{-1} = I, \\qquad \\det(A) = \\prod_i u_{ii} \\cdot (-1)^{\\text{swaps}}" },
    { label: "Valeurs propres", tex: "\\det(\\lambda I - A) = 0, \\qquad (A - \\lambda I)\\mathbf{v} = \\mathbf{0}" }
  ],
  inputs: [
    { id: "op", label: "Opération", type: "select", default: "det", options: OPS },
    { id: "A", label: "Matrice A", type: "textarea", rows: 4, placeholder: "4 7\n2 6", help: "Chaque ligne est une rangée ; les éléments sont séparés par un espace ou une virgule." },
    { id: "B", label: "Matrice B", type: "textarea", rows: 4, when: { op: ["multiply", "add", "subtract"] } }
  ],
  example: { values: { op: "inverse", A: "4 7\n2 6", B: "" }, expect: ["3/5\t-7/10", "-1/5\t2/5"], note: "Exemple : inverse de la matrice $\\begin{bmatrix}4&7\\\\2&6\\end{bmatrix}$ et son déterminant 10." },
  invalid: { values: { op: "inverse", A: "1 2\n2 4" } },
  related: ["linear-system", "complex-numbers", "polynomial-roots"]
};

function rowStepList(steps, cols) {
  const out = [];
  const shown = steps.length > 30 ? [...steps.slice(0, 15), null, ...steps.slice(-10)] : steps;
  for (const s of shown) out.push(s ? { text: `Opération $${s.op}$ :`, tex: matTex(s.M, cols) } : "…(opérations sur lignes supplémentaires)…");
  return out;
}

export function solve(input) {
  const op = choice(input, "op", "Opération", OPS.map((o) => o[0]), "det");
  const A = matrixInput(input, "A", "Matrice A", { maxSize: 8 });
  const steps = [{ text: "Matrice A :", tex: `A = ${matTex(A)}` }];
  const square = A.length === A[0].length;
  const needSquare = () => { if (!square) fail("Cette opération nécessite une matrice carrée.", "A"); };
  if (op === "add" || op === "subtract" || op === "multiply") {
    const B = matrixInput(input, "B", "Matrice B", { maxSize: 8 });
    steps.push({ text: "Matrice B :", tex: `B = ${matTex(B)}` });
    let C;
    try {
      C = op === "multiply" ? mmul(A, B) : madd(A, B, op === "add" ? 1 : -1);
    } catch (e) { fail(e.message, "B"); }
    C = cleanMatrix(C);
    if (op === "multiply") steps.push(`Chaque élément $c_{ij}$ est le produit scalaire de la ligne i de A par la colonne j de B : $c_{ij} = \\sum_k a_{ik} b_{kj}$.`);
    else steps.push(`On additionne ou soustrait les éléments correspondants : $c_{ij} = a_{ij} ${op === "add" ? "+" : "-"} b_{ij}$.`);
    const sym = op === "multiply" ? "AB" : op === "add" ? "A + B" : "A - B";
    return { results: [{ label: "Résultat", tex: `${sym} = ${matTex(C)}`, text: matText(C) }], steps, copy: matText(C) };
  }
  if (op === "transpose") {
    const T = transpose(A);
    steps.push("On échange les lignes et les colonnes : $a^T_{ij} = a_{ji}$.");
    return { results: [{ label: "Transposée", tex: `A^T = ${matTex(T)}`, text: matText(T) }], steps, copy: matText(T) };
  }
  if (op === "rank") {
    const r = rref(A);
    steps.push("On transforme la matrice en forme échelonnée réduite par opérations sur les lignes :");
    steps.push(...rowStepList(r.steps));
    steps.push(`Nombre de lignes non nulles (pivots) = ${r.rank}.`);
    return { results: [{ label: "Rang", value: r.rank }, { label: "Forme échelonnée réduite", tex: matTex(r.R), text: matText(r.R) }], steps, copy: `rank = ${r.rank}` };
  }
  if (op === "det") {
    needSquare();
    const d = det(A);
    if (A.length === 2) steps.push({ text: "Pour une matrice 2×2 :", tex: `\\det A = (${niceTex(A[0][0])})(${niceTex(A[1][1])}) - (${niceTex(A[0][1])})(${niceTex(A[1][0])}) = ${niceTex(d.value, 10)}` });
    else {
      steps.push("On transforme la matrice en forme triangulaire supérieure par élimination ; le déterminant est le produit des éléments de la diagonale, avec changement de signe à chaque échange de deux lignes.");
      steps.push(...rowStepList(d.steps));
      const swaps = d.steps.filter((s) => s.op.includes("leftrightarrow")).length;
      if (d.diag) steps.push({ text: `Nombre d'échanges de lignes = ${swaps}.`, tex: `\\det A = ${swaps % 2 ? "-" : ""}${d.diag.map((x) => `(${niceTex(x, 6)})`).join("")} = ${niceTex(d.value, 10)}` });
      else steps.push("Une colonne entièrement nulle sous la diagonale apparaît, donc le déterminant est 0.");
    }
    return { results: [{ label: "Déterminant", value: d.value, display: nice(d.value, 10), text: `det = ${nice(d.value, 10)}` }], steps, copy: `det(A) = ${nice(d.value, 10)}` };
  }
  if (op === "inverse") {
    needSquare();
    const d = det(A);
    steps.push(`Déterminant = ${nice(d.value, 10)}.`);
    const r = inverse(A);
    if (!r || d.value === 0) fail("La matrice est singulière (déterminant nul), elle n'a donc pas d'inverse.", "A");
    steps.push({ text: "On écrit la matrice augmentée $[A\\,|\\,I]$ et on applique Gauss-Jordan jusqu'à obtenir $[I\\,|\\,A^{-1}]$ :", tex: matTex(r.aug, A.length) });
    steps.push(...rowStepList(r.steps, A.length));
    const check = cleanMatrix(mmul(A, r.inv));
    const okI = check.every((row, i) => row.every((x, j) => Math.abs(x - (i === j ? 1 : 0)) < 1e-9));
    steps.push(okI ? "Vérification : $A \\cdot A^{-1} = I$ exactement." : "Avertissement : la vérification $A A^{-1}$ ne donne pas I avec une précision suffisante, à cause du mauvais conditionnement de la matrice.");
    return { results: [{ label: "Inverse", tex: `A^{-1} = ${matTex(r.inv)}`, text: matText(r.inv) }, { label: "Déterminant", value: d.value, display: nice(d.value, 10) }], steps, copy: matText(r.inv) };
  }
  needSquare();
  const e = eigen(A);
  steps.push({ text: "On construit le polynôme caractéristique (méthode de Faddeev-LeVerrier) :", tex: `\\det(\\lambda I - A) = ${polyTex(e.poly, "\\lambda")}` });
  steps.push("Ses racines sont les valeurs propres. Pour chaque valeur réelle, on résout $(A - \\lambda I)\\mathbf{v} = 0$ afin de trouver les vecteurs propres.");
  const rows = e.values.map((ev) => [
    { tex: ctex(ev.value, 8) },
    String(ev.mult),
    ev.vectors.length ? { tex: ev.vectors.map((v) => `\\begin{bmatrix}${v.map((x) => niceTex(x, 6)).join("\\\\")}\\end{bmatrix}`).join(",\\;") } : ev.value.im !== 0 ? "Valeur complexe" : "—"
  ]);
  const text = e.values.map((ev) => `λ = ${cfmt(ev.value, 8)}${ev.mult > 1 ? ` (×${ev.mult})` : ""}`).join("، ");
  return {
    results: [{ label: "Valeurs propres", value: text, text }],
    blocks: [{ type: "table", caption: "Valeurs et vecteurs propres", head: ["λ", "Multiplicité", "Vecteurs propres"], rows }],
    steps, copy: text
  };
}

export { identity, charPoly };
