import { matrixInput, choice, fail } from "../core/validate.js";
import { madd, mmul, det, inverse, rref, eigen, transpose, matTex, matText, identity, cleanMatrix, charPoly } from "../core/matrix.js";
import { niceTex, nice, fmt } from "../core/format.js";
import { toTex as polyTex } from "../core/polynomial.js";
import { ctex, cfmt } from "../core/complex.js";

const OPS = [["det", "Determinan"], ["inverse", "Invers"], ["rank", "Rank"], ["eigen", "Nilai dan vektor eigen"], ["multiply", "Kali A × B"], ["add", "Jumlah A + B"], ["subtract", "Selisih A − B"], ["transpose", "Transpos"]];

export const meta = {
  description: "Operasi matriks dengan langkah-langkah: penjumlahan, perkalian, determinan, invers, rank, nilai dan vektor eigen, serta transpos, untuk matriks hingga 8×8.",
  keywords: ["matriks", "matriks", "determinan", "invers", "rank", "nilai eigen", "eigenvalues", "determinant", "inverse", "matrix"],
  formulas: [
    { label: "Invers dan determinan", tex: "A A^{-1} = I, \\qquad \\det(A) = \\prod_i u_{ii} \\cdot (-1)^{\\text{swaps}}" },
    { label: "Nilai eigen", tex: "\\det(\\lambda I - A) = 0, \\qquad (A - \\lambda I)\\mathbf{v} = \\mathbf{0}" }
  ],
  inputs: [
    { id: "op", label: "Operasi", type: "select", default: "det", options: OPS },
    { id: "A", label: "Matriks A", type: "textarea", rows: 4, placeholder: "4 7\n2 6", help: "Setiap baris adalah satu baris matriks; elemen dipisahkan dengan spasi atau koma." },
    { id: "B", label: "Matriks B", type: "textarea", rows: 4, when: { op: ["multiply", "add", "subtract"] } }
  ],
  example: { values: { op: "inverse", A: "4 7\n2 6", B: "" }, expect: ["3/5\t-7/10", "-1/5\t2/5"], note: "Contoh: invers matriks $\\begin{bmatrix}4&7\\\\2&6\\end{bmatrix}$ dan determinannya 10." },
  invalid: { values: { op: "inverse", A: "1 2\n2 4" } },
  related: ["linear-system", "complex-numbers", "polynomial-roots"]
};

function rowStepList(steps, cols) {
  const out = [];
  const shown = steps.length > 30 ? [...steps.slice(0, 15), null, ...steps.slice(-10)] : steps;
  for (const s of shown) out.push(s ? { text: `Operasi $${s.op}$:`, tex: matTex(s.M, cols) } : "…(operasi baris tambahan)…");
  return out;
}

export function solve(input) {
  const op = choice(input, "op", "Operasi", OPS.map((o) => o[0]), "det");
  const A = matrixInput(input, "A", "Matriks A", { maxSize: 8 });
  const steps = [{ text: "Matriks A:", tex: `A = ${matTex(A)}` }];
  const square = A.length === A[0].length;
  const needSquare = () => { if (!square) fail("Operasi ini memerlukan matriks persegi.", "A"); };
  if (op === "add" || op === "subtract" || op === "multiply") {
    const B = matrixInput(input, "B", "Matriks B", { maxSize: 8 });
    steps.push({ text: "Matriks B:", tex: `B = ${matTex(B)}` });
    let C;
    try {
      C = op === "multiply" ? mmul(A, B) : madd(A, B, op === "add" ? 1 : -1);
    } catch (e) { fail(e.message, "B"); }
    C = cleanMatrix(C);
    if (op === "multiply") steps.push(`Setiap elemen $c_{ij}$ adalah hasil kali baris ke-i dari A dan kolom ke-j dari B: $c_{ij} = \\sum_k a_{ik} b_{kj}$.`);
    else steps.push(`Kita jumlahkan atau kurangkan elemen yang bersesuaian: $c_{ij} = a_{ij} ${op === "add" ? "+" : "-"} b_{ij}$.`);
    const sym = op === "multiply" ? "AB" : op === "add" ? "A + B" : "A - B";
    return { results: [{ label: "Hasil", tex: `${sym} = ${matTex(C)}`, text: matText(C) }], steps, copy: matText(C) };
  }
  if (op === "transpose") {
    const T = transpose(A);
    steps.push("Kita tukar baris dengan kolom: $a^T_{ij} = a_{ji}$.");
    return { results: [{ label: "Transpos", tex: `A^T = ${matTex(T)}`, text: matText(T) }], steps, copy: matText(T) };
  }
  if (op === "rank") {
    const r = rref(A);
    steps.push("Kita ubah matriks ke bentuk eselon baris tereduksi dengan operasi baris:");
    steps.push(...rowStepList(r.steps));
    steps.push(`Jumlah baris tidak nol (pivot) = ${r.rank}.`);
    return { results: [{ label: "Rank", value: r.rank }, { label: "Bentuk eselon baris tereduksi", tex: matTex(r.R), text: matText(r.R) }], steps, copy: `rank = ${r.rank}` };
  }
  if (op === "det") {
    needSquare();
    const d = det(A);
    if (A.length === 2) steps.push({ text: "Untuk matriks 2×2:", tex: `\\det A = (${niceTex(A[0][0])})(${niceTex(A[1][1])}) - (${niceTex(A[0][1])})(${niceTex(A[1][0])}) = ${niceTex(d.value, 10)}` });
    else {
      steps.push("Kita ubah matriks ke bentuk segitiga atas dengan eliminasi; determinan kemudian adalah hasil kali elemen diagonal, dengan tanda dibalik setiap kali dua baris ditukar.");
      steps.push(...rowStepList(d.steps));
      const swaps = d.steps.filter((s) => s.op.includes("leftrightarrow")).length;
      if (d.diag) steps.push({ text: `Jumlah pertukaran baris = ${swaps}.`, tex: `\\det A = ${swaps % 2 ? "-" : ""}${d.diag.map((x) => `(${niceTex(x, 6)})`).join("")} = ${niceTex(d.value, 10)}` });
      else steps.push("Muncul kolom yang seluruhnya nol di bawah diagonal, sehingga determinan = 0.");
    }
    return { results: [{ label: "Determinan", value: d.value, display: nice(d.value, 10), text: `det = ${nice(d.value, 10)}` }], steps, copy: `det(A) = ${nice(d.value, 10)}` };
  }
  if (op === "inverse") {
    needSquare();
    const d = det(A);
    steps.push(`Determinan = ${nice(d.value, 10)}.`);
    const r = inverse(A);
    if (!r || d.value === 0) fail("Matriks singular (determinannya nol), sehingga tidak memiliki invers.", "A");
    steps.push({ text: "Kita tulis matriks augmentasi $[A\\,|\\,I]$ dan terapkan eliminasi Gauss-Jordan hingga diperoleh $[I\\,|\\,A^{-1}]$:", tex: matTex(r.aug, A.length) });
    steps.push(...rowStepList(r.steps, A.length));
    const check = cleanMatrix(mmul(A, r.inv));
    const okI = check.every((row, i) => row.every((x, j) => Math.abs(x - (i === j ? 1 : 0)) < 1e-9));
    steps.push(okI ? "Untuk verifikasi: $A \\cdot A^{-1} = I$ secara tepat." : "Peringatan: pemeriksaan $A A^{-1}$ tidak menghasilkan I dengan ketelitian yang cukup karena matriks berkondisi buruk.");
    return { results: [{ label: "Invers", tex: `A^{-1} = ${matTex(r.inv)}`, text: matText(r.inv) }, { label: "Determinan", value: d.value, display: nice(d.value, 10) }], steps, copy: matText(r.inv) };
  }
  needSquare();
  const e = eigen(A);
  steps.push({ text: "Kita bentuk polinomial karakteristik (dengan metode Faddeev–LeVerrier):", tex: `\\det(\\lambda I - A) = ${polyTex(e.poly, "\\lambda")}` });
  steps.push("Akarnya adalah nilai eigen. Untuk setiap nilai real kita selesaikan $(A - \\lambda I)\\mathbf{v} = 0$ untuk mencari vektor eigen.");
  const rows = e.values.map((ev) => [
    { tex: ctex(ev.value, 8) },
    String(ev.mult),
    ev.vectors.length ? { tex: ev.vectors.map((v) => `\\begin{bmatrix}${v.map((x) => niceTex(x, 6)).join("\\\\")}\\end{bmatrix}`).join(",\\;") } : ev.value.im !== 0 ? "Nilai kompleks" : "—"
  ]);
  const text = e.values.map((ev) => `λ = ${cfmt(ev.value, 8)}${ev.mult > 1 ? ` (×${ev.mult})` : ""}`).join("، ");
  return {
    results: [{ label: "Nilai eigen", value: text, text }],
    blocks: [{ type: "table", caption: "Nilai dan vektor eigen", head: ["λ", "Multiplisitas", "Vektor eigen"], rows }],
    steps, copy: text
  };
}

export { identity, charPoly };
