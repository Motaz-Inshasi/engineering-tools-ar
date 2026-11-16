import { matrixInput, choice, fail } from "../core/validate.js";
import { madd, mmul, det, inverse, rref, eigen, transpose, matTex, matText, identity, cleanMatrix, charPoly } from "../core/matrix.js";
import { niceTex, nice, fmt } from "../core/format.js";
import { toTex as polyTex } from "../core/polynomial.js";
import { ctex, cfmt } from "../core/complex.js";

const OPS = [["det", "Determinant"], ["inverse", "Ters matris"], ["rank", "Rank"], ["eigen", "Özdeğerler ve özvektörler"], ["multiply", "Çarpma A × B"], ["add", "Toplama A + B"], ["subtract", "Çıkarma A − B"], ["transpose", "Transpoz"]];

export const meta = {
  description: "Matris işlemleri adımlarıyla: toplama, çarpma, determinant, ters matris, rank, özdeğerler ve özvektörler ile transpoz; 8×8'e kadar matrisler için.",
  keywords: ["matris", "matrisler", "determinant", "ters", "rank", "özdeğer", "eigenvalues", "determinant", "inverse", "matrix"],
  formulas: [
    { label: "Ters matris ve determinant", tex: "A A^{-1} = I, \\qquad \\det(A) = \\prod_i u_{ii} \\cdot (-1)^{\\text{swaps}}" },
    { label: "Özdeğerler", tex: "\\det(\\lambda I - A) = 0, \\qquad (A - \\lambda I)\\mathbf{v} = \\mathbf{0}" }
  ],
  inputs: [
    { id: "op", label: "İşlem", type: "select", default: "det", options: OPS },
    { id: "A", label: "A matrisi", type: "textarea", rows: 4, placeholder: "4 7\n2 6", help: "Her satır bir matris satırıdır; elemanlar boşlukla veya virgülle ayrılır." },
    { id: "B", label: "B matrisi", type: "textarea", rows: 4, when: { op: ["multiply", "add", "subtract"] } }
  ],
  example: { values: { op: "inverse", A: "4 7\n2 6", B: "" }, expect: ["3/5\t-7/10", "-1/5\t2/5"], note: "Örnek: $\\begin{bmatrix}4&7\\\\2&6\\end{bmatrix}$ matrisinin tersi; determinantı 10." },
  invalid: { values: { op: "inverse", A: "1 2\n2 4" } },
  related: ["linear-system", "complex-numbers", "polynomial-roots"]
};

function rowStepList(steps, cols) {
  const out = [];
  const shown = steps.length > 30 ? [...steps.slice(0, 15), null, ...steps.slice(-10)] : steps;
  for (const s of shown) out.push(s ? { text: `İşlem $${s.op}$:`, tex: matTex(s.M, cols) } : "…(ek satır işlemleri)…");
  return out;
}

export function solve(input) {
  const op = choice(input, "op", "İşlem", OPS.map((o) => o[0]), "det");
  const A = matrixInput(input, "A", "A matrisi", { maxSize: 8 });
  const steps = [{ text: "A matrisi:", tex: `A = ${matTex(A)}` }];
  const square = A.length === A[0].length;
  const needSquare = () => { if (!square) fail("Bu işlem kare matris gerektirir.", "A"); };
  if (op === "add" || op === "subtract" || op === "multiply") {
    const B = matrixInput(input, "B", "B matrisi", { maxSize: 8 });
    steps.push({ text: "B matrisi:", tex: `B = ${matTex(B)}` });
    let C;
    try {
      C = op === "multiply" ? mmul(A, B) : madd(A, B, op === "add" ? 1 : -1);
    } catch (e) { fail(e.message, "B"); }
    C = cleanMatrix(C);
    if (op === "multiply") steps.push(`Her $c_{ij}$ elemanı, A'nın i. satırı ile B'nin j. sütununun çarpımlarının toplamıdır: $c_{ij} = \\sum_k a_{ik} b_{kj}$.`);
    else steps.push(`Karşılıklı elemanları toplarız veya çıkarırız: $c_{ij} = a_{ij} ${op === "add" ? "+" : "-"} b_{ij}$.`);
    const sym = op === "multiply" ? "AB" : op === "add" ? "A + B" : "A - B";
    return { results: [{ label: "Sonuç", tex: `${sym} = ${matTex(C)}`, text: matText(C) }], steps, copy: matText(C) };
  }
  if (op === "transpose") {
    const T = transpose(A);
    steps.push("Satırları sütunlarla değiştiririz: $a^T_{ij} = a_{ji}$.");
    return { results: [{ label: "Transpoz", tex: `A^T = ${matTex(T)}`, text: matText(T) }], steps, copy: matText(T) };
  }
  if (op === "rank") {
    const r = rref(A);
    steps.push("Matrisi satır işlemleriyle indirgenmiş satır basamak biçimine getiririz:");
    steps.push(...rowStepList(r.steps));
    steps.push(`Sıfır olmayan satır sayısı (pivot) = ${r.rank}.`);
    return { results: [{ label: "Rank", value: r.rank }, { label: "İndirgenmiş satır basamak biçimi", tex: matTex(r.R), text: matText(r.R) }], steps, copy: `rank = ${r.rank}` };
  }
  if (op === "det") {
    needSquare();
    const d = det(A);
    if (A.length === 2) steps.push({ text: "2×2 matris için:", tex: `\\det A = (${niceTex(A[0][0])})(${niceTex(A[1][1])}) - (${niceTex(A[0][1])})(${niceTex(A[1][0])}) = ${niceTex(d.value, 10)}` });
    else {
      steps.push("Matrisi eliminasyonla üst üçgen biçime getiririz; determinant, köşegen elemanlarının çarpımıdır ve her satır değiş tokuşunda işaret değişir.");
      steps.push(...rowStepList(d.steps));
      const swaps = d.steps.filter((s) => s.op.includes("leftrightarrow")).length;
      if (d.diag) steps.push({ text: `Satır değiş tokuş sayısı = ${swaps}.`, tex: `\\det A = ${swaps % 2 ? "-" : ""}${d.diag.map((x) => `(${niceTex(x, 6)})`).join("")} = ${niceTex(d.value, 10)}` });
      else steps.push("Köşegenin altında tamamı sıfır olan bir sütun çıktı, bu nedenle determinant = 0.");
    }
    return { results: [{ label: "Determinant", value: d.value, display: nice(d.value, 10), text: `det = ${nice(d.value, 10)}` }], steps, copy: `det(A) = ${nice(d.value, 10)}` };
  }
  if (op === "inverse") {
    needSquare();
    const d = det(A);
    steps.push(`Determinant = ${nice(d.value, 10)}.`);
    const r = inverse(A);
    if (!r || d.value === 0) fail("Matris tekil (determinantı sıfır), bu nedenle tersi yoktur.", "A");
    steps.push({ text: "Genişletilmiş matrisi $[A\\,|\\,I]$ yazar ve $[I\\,|\\,A^{-1}]$ elde edene kadar Gauss-Jordan uygularız:", tex: matTex(r.aug, A.length) });
    steps.push(...rowStepList(r.steps, A.length));
    const check = cleanMatrix(mmul(A, r.inv));
    const okI = check.every((row, i) => row.every((x, j) => Math.abs(x - (i === j ? 1 : 0)) < 1e-9));
    steps.push(okI ? "Doğrulama: $A \\cdot A^{-1} = I$ tam olarak sağlanır." : "Uyarı: matrisin kötü koşullu olması nedeniyle $A A^{-1}$ kontrolü I'yi yeterli hassasiyetle vermedi.");
    return { results: [{ label: "Ters matris", tex: `A^{-1} = ${matTex(r.inv)}`, text: matText(r.inv) }, { label: "Determinant", value: d.value, display: nice(d.value, 10) }], steps, copy: matText(r.inv) };
  }
  needSquare();
  const e = eigen(A);
  steps.push({ text: "Karakteristik polinomu (Faddeev-LeVerrier yöntemiyle) oluştururuz:", tex: `\\det(\\lambda I - A) = ${polyTex(e.poly, "\\lambda")}` });
  steps.push("Kökleri özdeğerlerdir. Her gerçek değer için $(A - \\lambda I)\\mathbf{v} = 0$ çözülerek özvektörler bulunur.");
  const rows = e.values.map((ev) => [
    { tex: ctex(ev.value, 8) },
    String(ev.mult),
    ev.vectors.length ? { tex: ev.vectors.map((v) => `\\begin{bmatrix}${v.map((x) => niceTex(x, 6)).join("\\\\")}\\end{bmatrix}`).join(",\\;") } : ev.value.im !== 0 ? "Karmaşık değer" : "—"
  ]);
  const text = e.values.map((ev) => `λ = ${cfmt(ev.value, 8)}${ev.mult > 1 ? ` (×${ev.mult})` : ""}`).join("، ");
  return {
    results: [{ label: "Özdeğerler", value: text, text }],
    blocks: [{ type: "table", caption: "Özdeğerler ve özvektörler", head: ["λ", "Katlılık", "Özvektörler"], rows }],
    steps, copy: text
  };
}

export { identity, charPoly };
