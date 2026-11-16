import { matrixInput, choice, fail } from "../core/validate.js";
import { madd, mmul, det, inverse, rref, eigen, transpose, matTex, matText, identity, cleanMatrix, charPoly } from "../core/matrix.js";
import { niceTex, nice, fmt } from "../core/format.js";
import { toTex as polyTex } from "../core/polynomial.js";
import { ctex, cfmt } from "../core/complex.js";

const OPS = [["det", "محدد"], ["inverse", "معکوس"], ["rank", "رینک"], ["eigen", "ایجن ویلیوز اور ایجن ویکٹرز"], ["multiply", "ضرب A × B"], ["add", "جمع A + B"], ["subtract", "تفریق A − B"], ["transpose", "ٹرانسپوز"]];

export const meta = {
  description: "میٹرکسز کی عملیات مرحلہ وار: جمع، ضرب، محدد، معکوس، رینک، ایجن ویلیوز اور ایجن ویکٹرز، اور ٹرانسپوز، 8×8 تک کے میٹرکسز کے لیے۔",
  keywords: ["میٹرکس", "میٹرکسز", "محدد", "معکوس", "رینک", "ایجن ویلیوز", "eigenvalues", "determinant", "inverse", "matrix"],
  formulas: [
    { label: "معکوس اور محدد", tex: "A A^{-1} = I, \\qquad \\det(A) = \\prod_i u_{ii} \\cdot (-1)^{\\text{swaps}}" },
    { label: "ایجن ویلیوز", tex: "\\det(\\lambda I - A) = 0, \\qquad (A - \\lambda I)\\mathbf{v} = \\mathbf{0}" }
  ],
  inputs: [
    { id: "op", label: "عمل", type: "select", default: "det", options: OPS },
    { id: "A", label: "میٹرکس A", type: "textarea", rows: 4, placeholder: "4 7\n2 6", help: "ہر سطر ایک قطار ہے، اور عناصر خالی جگہ یا کاما سے الگ کیے جاتے ہیں۔" },
    { id: "B", label: "میٹرکس B", type: "textarea", rows: 4, when: { op: ["multiply", "add", "subtract"] } }
  ],
  example: { values: { op: "inverse", A: "4 7\n2 6", B: "" }, expect: ["3/5\t-7/10", "-1/5\t2/5"], note: "مثال: میٹرکس $\\begin{bmatrix}4&7\\\\2&6\\end{bmatrix}$ کا معکوس، جس کا محدد 10 ہے۔" },
  invalid: { values: { op: "inverse", A: "1 2\n2 4" } },
  related: ["linear-system", "complex-numbers", "polynomial-roots"]
};

function rowStepList(steps, cols) {
  const out = [];
  const shown = steps.length > 30 ? [...steps.slice(0, 15), null, ...steps.slice(-10)] : steps;
  for (const s of shown) out.push(s ? { text: `عملیات $${s.op}$:`, tex: matTex(s.M, cols) } : "…(اضافی قطار کی عملیات)…");
  return out;
}

export function solve(input) {
  const op = choice(input, "op", "عمل", OPS.map((o) => o[0]), "det");
  const A = matrixInput(input, "A", "میٹرکس A", { maxSize: 8 });
  const steps = [{ text: "میٹرکس A:", tex: `A = ${matTex(A)}` }];
  const square = A.length === A[0].length;
  const needSquare = () => { if (!square) fail("اس عمل کے لیے مربع میٹرکس درکار ہے۔", "A"); };
  if (op === "add" || op === "subtract" || op === "multiply") {
    const B = matrixInput(input, "B", "میٹرکس B", { maxSize: 8 });
    steps.push({ text: "میٹرکس B:", tex: `B = ${matTex(B)}` });
    let C;
    try {
      C = op === "multiply" ? mmul(A, B) : madd(A, B, op === "add" ? 1 : -1);
    } catch (e) { fail(e.message, "B"); }
    C = cleanMatrix(C);
    if (op === "multiply") steps.push(`ہر عنصر $c_{ij}$ میٹرکس A کی i-ویں قطار اور B کے j-ویں کالم کا حاصل ضرب ہے: $c_{ij} = \\sum_k a_{ik} b_{kj}$۔`);
    else steps.push(`ہم متناظر عناصر کو جمع یا تفریق کرتے ہیں: $c_{ij} = a_{ij} ${op === "add" ? "+" : "-"} b_{ij}$۔`);
    const sym = op === "multiply" ? "AB" : op === "add" ? "A + B" : "A - B";
    return { results: [{ label: "نتیجہ", tex: `${sym} = ${matTex(C)}`, text: matText(C) }], steps, copy: matText(C) };
  }
  if (op === "transpose") {
    const T = transpose(A);
    steps.push("ہم قطاروں اور کالموں کی جگہ بدلتے ہیں: $a^T_{ij} = a_{ji}$۔");
    return { results: [{ label: "ٹرانسپوز", tex: `A^T = ${matTex(T)}`, text: matText(T) }], steps, copy: matText(T) };
  }
  if (op === "rank") {
    const r = rref(A);
    steps.push("ہم قطار کی عملیات سے میٹرکس کو ریڈیوسڈ رو ایکیلون فارم میں لاتے ہیں:");
    steps.push(...rowStepList(r.steps));
    steps.push(`غیر صفر قطاروں (پیووٹس) کی تعداد = ${r.rank}۔`);
    return { results: [{ label: "رینک", value: r.rank }, { label: "ریڈیوسڈ رو ایکیلون فارم", tex: matTex(r.R), text: matText(r.R) }], steps, copy: `rank = ${r.rank}` };
  }
  if (op === "det") {
    needSquare();
    const d = det(A);
    if (A.length === 2) steps.push({ text: "2×2 میٹرکس کے لیے:", tex: `\\det A = (${niceTex(A[0][0])})(${niceTex(A[1][1])}) - (${niceTex(A[0][1])})(${niceTex(A[1][0])}) = ${niceTex(d.value, 10)}` });
    else {
      steps.push("ہم حذف کے ذریعے میٹرکس کو اوپری تکونی شکل میں لاتے ہیں، پھر محدد = وِکرن کے عناصر کا حاصل ضرب، ہر دو قطاروں کی جگہ بدلنے پر علامت بدلتے ہوئے۔");
      steps.push(...rowStepList(d.steps));
      const swaps = d.steps.filter((s) => s.op.includes("leftrightarrow")).length;
      if (d.diag) steps.push({ text: `قطاروں کی جگہ بدلنے کی تعداد = ${swaps}۔`, tex: `\\det A = ${swaps % 2 ? "-" : ""}${d.diag.map((x) => `(${niceTex(x, 6)})`).join("")} = ${niceTex(d.value, 10)}` });
      else steps.push("وِکرن کے نیچے صفروں کا پورا کالم ظاہر ہوا، لہٰذا محدد = 0۔");
    }
    return { results: [{ label: "محدد", value: d.value, display: nice(d.value, 10), text: `det = ${nice(d.value, 10)}` }], steps, copy: `det(A) = ${nice(d.value, 10)}` };
  }
  if (op === "inverse") {
    needSquare();
    const d = det(A);
    steps.push(`محدد = ${nice(d.value, 10)}۔`);
    const r = inverse(A);
    if (!r || d.value === 0) fail("میٹرکس سنگولر ہے (اس کا محدد صفر ہے)، اس لیے اس کا معکوس نہیں ہے۔", "A");
    steps.push({ text: "ہم توسیعی میٹرکس $[A\\,|\\,I]$ لکھتے ہیں اور گاؤس-جورڈن ایلیمنیشن لگاتے ہیں یہاں تک کہ $[I\\,|\\,A^{-1}]$ حاصل ہو:", tex: matTex(r.aug, A.length) });
    steps.push(...rowStepList(r.steps, A.length));
    const check = cleanMatrix(mmul(A, r.inv));
    const okI = check.every((row, i) => row.every((x, j) => Math.abs(x - (i === j ? 1 : 0)) < 1e-9));
    steps.push(okI ? "تصدیق: $A \\cdot A^{-1} = I$ بالکل درست ہے۔" : "انتباہ: تصدیق $A A^{-1}$ نے میٹرکس کی خراب حالت کی وجہ سے I کو کافی درستگی سے نہیں دیا۔");
    return { results: [{ label: "معکوس", tex: `A^{-1} = ${matTex(r.inv)}`, text: matText(r.inv) }, { label: "محدد", value: d.value, display: nice(d.value, 10) }], steps, copy: matText(r.inv) };
  }
  needSquare();
  const e = eigen(A);
  steps.push({ text: "ہم خاصیتی کثیر رکنی بناتے ہیں (Faddeev–LeVerrier طریقے سے):", tex: `\\det(\\lambda I - A) = ${polyTex(e.poly, "\\lambda")}` });
  steps.push("اس کے جذر ایجن ویلیوز ہیں۔ ہر حقیقی قیمت کے لیے ہم $(A - \\lambda I)\\mathbf{v} = 0$ حل کر کے ایجن ویکٹرز تلاش کرتے ہیں۔");
  const rows = e.values.map((ev) => [
    { tex: ctex(ev.value, 8) },
    String(ev.mult),
    ev.vectors.length ? { tex: ev.vectors.map((v) => `\\begin{bmatrix}${v.map((x) => niceTex(x, 6)).join("\\\\")}\\end{bmatrix}`).join(",\\;") } : ev.value.im !== 0 ? "کمپلیکس ویلیو" : "—"
  ]);
  const text = e.values.map((ev) => `λ = ${cfmt(ev.value, 8)}${ev.mult > 1 ? ` (×${ev.mult})` : ""}`).join("، ");
  return {
    results: [{ label: "ایجن ویلیوز", value: text, text }],
    blocks: [{ type: "table", caption: "ایجن ویلیوز اور ایجن ویکٹرز", head: ["λ", "تکرار", "ایجن ویکٹرز"], rows }],
    steps, copy: text
  };
}

export { identity, charPoly };
