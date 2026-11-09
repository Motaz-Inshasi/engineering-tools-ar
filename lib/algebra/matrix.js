import { matrixInput, choice, fail } from "../core/validate.js";
import { madd, mmul, det, inverse, rref, eigen, transpose, matTex, matText, identity, cleanMatrix, charPoly } from "../core/matrix.js";
import { niceTex, nice, fmt } from "../core/format.js";
import { toTex as polyTex } from "../core/polynomial.js";
import { ctex, cfmt } from "../core/complex.js";

const OPS = [["det", "المحدد"], ["inverse", "المعكوس"], ["rank", "الرتبة"], ["eigen", "القيم والمتجهات الذاتية"], ["multiply", "ضرب A × B"], ["add", "جمع A + B"], ["subtract", "طرح A − B"], ["transpose", "المنقول"]];

export const meta = {
  description: "عمليات المصفوفات مع الخطوات: الجمع والضرب والمحدد والمعكوس والرتبة والقيم والمتجهات الذاتية والمنقول، لمصفوفات حتى 8×8.",
  keywords: ["مصفوفة", "مصفوفات", "محدد", "معكوس", "رتبة", "قيم ذاتية", "eigenvalues", "determinant", "inverse", "matrix"],
  formulas: [
    { label: "المعكوس والمحدد", tex: "A A^{-1} = I, \\qquad \\det(A) = \\prod_i u_{ii} \\cdot (-1)^{\\text{swaps}}" },
    { label: "القيم الذاتية", tex: "\\det(\\lambda I - A) = 0, \\qquad (A - \\lambda I)\\mathbf{v} = \\mathbf{0}" }
  ],
  inputs: [
    { id: "op", label: "العملية", type: "select", default: "det", options: OPS },
    { id: "A", label: "المصفوفة A", type: "textarea", rows: 4, placeholder: "4 7\n2 6", help: "كل سطر صف، والعناصر مفصولة بمسافة أو فاصلة." },
    { id: "B", label: "المصفوفة B", type: "textarea", rows: 4, when: { op: ["multiply", "add", "subtract"] } }
  ],
  example: { values: { op: "inverse", A: "4 7\n2 6", B: "" }, expect: ["3/5\t-7/10", "-1/5\t2/5"], note: "مثال: معكوس المصفوفة $\\begin{bmatrix}4&7\\\\2&6\\end{bmatrix}$ ومحددها 10." },
  invalid: { values: { op: "inverse", A: "1 2\n2 4" } },
  related: ["linear-system", "complex-numbers", "polynomial-roots"]
};

function rowStepList(steps, cols) {
  const out = [];
  const shown = steps.length > 30 ? [...steps.slice(0, 15), null, ...steps.slice(-10)] : steps;
  for (const s of shown) out.push(s ? { text: `العملية $${s.op}$:`, tex: matTex(s.M, cols) } : "…(عمليات صفوف إضافية)…");
  return out;
}

export function solve(input) {
  const op = choice(input, "op", "العملية", OPS.map((o) => o[0]), "det");
  const A = matrixInput(input, "A", "المصفوفة A", { maxSize: 8 });
  const steps = [{ text: "المصفوفة A:", tex: `A = ${matTex(A)}` }];
  const square = A.length === A[0].length;
  const needSquare = () => { if (!square) fail("هذه العملية تحتاج مصفوفة مربعة.", "A"); };
  if (op === "add" || op === "subtract" || op === "multiply") {
    const B = matrixInput(input, "B", "المصفوفة B", { maxSize: 8 });
    steps.push({ text: "المصفوفة B:", tex: `B = ${matTex(B)}` });
    let C;
    try {
      C = op === "multiply" ? mmul(A, B) : madd(A, B, op === "add" ? 1 : -1);
    } catch (e) { fail(e.message, "B"); }
    C = cleanMatrix(C);
    if (op === "multiply") steps.push(`كل عنصر $c_{ij}$ هو حاصل ضرب الصف i من A في العمود j من B: $c_{ij} = \\sum_k a_{ik} b_{kj}$.`);
    else steps.push(`نجمع أو نطرح العناصر المتقابلة: $c_{ij} = a_{ij} ${op === "add" ? "+" : "-"} b_{ij}$.`);
    const sym = op === "multiply" ? "AB" : op === "add" ? "A + B" : "A - B";
    return { results: [{ label: "الناتج", tex: `${sym} = ${matTex(C)}`, text: matText(C) }], steps, copy: matText(C) };
  }
  if (op === "transpose") {
    const T = transpose(A);
    steps.push("نبدّل الصفوف بالأعمدة: $a^T_{ij} = a_{ji}$.");
    return { results: [{ label: "المنقول", tex: `A^T = ${matTex(T)}`, text: matText(T) }], steps, copy: matText(T) };
  }
  if (op === "rank") {
    const r = rref(A);
    steps.push("نحوّل المصفوفة إلى الشكل الصفي المختزل بعمليات الصفوف:");
    steps.push(...rowStepList(r.steps));
    steps.push(`عدد الصفوف غير الصفرية (المحاور) = ${r.rank}.`);
    return { results: [{ label: "الرتبة", value: r.rank }, { label: "الشكل الصفي المختزل", tex: matTex(r.R), text: matText(r.R) }], steps, copy: `rank = ${r.rank}` };
  }
  if (op === "det") {
    needSquare();
    const d = det(A);
    if (A.length === 2) steps.push({ text: "للمصفوفة 2×2:", tex: `\\det A = (${niceTex(A[0][0])})(${niceTex(A[1][1])}) - (${niceTex(A[0][1])})(${niceTex(A[1][0])}) = ${niceTex(d.value, 10)}` });
    else {
      steps.push("نحوّل المصفوفة إلى شكل مثلثي علوي بالحذف، ثم المحدد = حاصل ضرب عناصر القطر مع تغيير الإشارة عند كل تبديل صفين.");
      steps.push(...rowStepList(d.steps));
      const swaps = d.steps.filter((s) => s.op.includes("leftrightarrow")).length;
      if (d.diag) steps.push({ text: `عدد تبديلات الصفوف = ${swaps}.`, tex: `\\det A = ${swaps % 2 ? "-" : ""}${d.diag.map((x) => `(${niceTex(x, 6)})`).join("")} = ${niceTex(d.value, 10)}` });
      else steps.push("ظهر عمود كله أصفار تحت القطر، فالمحدد = 0.");
    }
    return { results: [{ label: "المحدد", value: d.value, display: nice(d.value, 10), text: `det = ${nice(d.value, 10)}` }], steps, copy: `det(A) = ${nice(d.value, 10)}` };
  }
  if (op === "inverse") {
    needSquare();
    const d = det(A);
    steps.push(`المحدد = ${nice(d.value, 10)}.`);
    const r = inverse(A);
    if (!r || d.value === 0) fail("المصفوفة منفردة (محددها صفر)، لذلك ليس لها معكوس.", "A");
    steps.push({ text: "نكتب المصفوفة الموسعة $[A\\,|\\,I]$ ونطبق غاوس-جوردان حتى نحصل على $[I\\,|\\,A^{-1}]$:", tex: matTex(r.aug, A.length) });
    steps.push(...rowStepList(r.steps, A.length));
    const check = cleanMatrix(mmul(A, r.inv));
    const okI = check.every((row, i) => row.every((x, j) => Math.abs(x - (i === j ? 1 : 0)) < 1e-9));
    steps.push(okI ? "للتحقق: $A \\cdot A^{-1} = I$ تماماً." : "تحذير: التحقق $A A^{-1}$ لم يعطِ I بدقة كافية بسبب سوء حالة المصفوفة.");
    return { results: [{ label: "المعكوس", tex: `A^{-1} = ${matTex(r.inv)}`, text: matText(r.inv) }, { label: "المحدد", value: d.value, display: nice(d.value, 10) }], steps, copy: matText(r.inv) };
  }
  needSquare();
  const e = eigen(A);
  steps.push({ text: "نكوّن كثيرة الحدود المميزة (بطريقة فاديف-ليفيرييه):", tex: `\\det(\\lambda I - A) = ${polyTex(e.poly, "\\lambda")}` });
  steps.push("جذورها هي القيم الذاتية. لكل قيمة حقيقية نحل $(A - \\lambda I)\\mathbf{v} = 0$ لإيجاد المتجهات الذاتية.");
  const rows = e.values.map((ev) => [
    { tex: ctex(ev.value, 8) },
    String(ev.mult),
    ev.vectors.length ? { tex: ev.vectors.map((v) => `\\begin{bmatrix}${v.map((x) => niceTex(x, 6)).join("\\\\")}\\end{bmatrix}`).join(",\\;") } : ev.value.im !== 0 ? "قيمة مركبة" : "—"
  ]);
  const text = e.values.map((ev) => `λ = ${cfmt(ev.value, 8)}${ev.mult > 1 ? ` (×${ev.mult})` : ""}`).join("، ");
  return {
    results: [{ label: "القيم الذاتية", value: text, text }],
    blocks: [{ type: "table", caption: "القيم والمتجهات الذاتية", head: ["λ", "التكرار", "المتجهات الذاتية"], rows }],
    steps, copy: text
  };
}

export { identity, charPoly };
