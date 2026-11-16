import { matrixInput, choice, fail } from "../core/validate.js";
import { madd, mmul, det, inverse, rref, eigen, transpose, matTex, matText, identity, cleanMatrix, charPoly } from "../core/matrix.js";
import { niceTex, nice, fmt } from "../core/format.js";
import { toTex as polyTex } from "../core/polynomial.js";
import { ctex, cfmt } from "../core/complex.js";

const OPS = [["det", "دترمینان"], ["inverse", "وارون"], ["rank", "رتبه"], ["eigen", "مقادیر و بردارهای ویژه"], ["multiply", "ضرب A × B"], ["add", "جمع A + B"], ["subtract", "تفریق A − B"], ["transpose", "ترانهاده"]];

export const meta = {
  description: "عملیات ماتریس‌ها همراه با مراحل: جمع، ضرب، دترمینان، وارون، رتبه، مقادیر و بردارهای ویژه و ترانهاده، برای ماتریس‌های تا ابعاد 8×8.",
  keywords: ["ماتریس", "ماتریس‌ها", "دترمینان", "وارون", "رتبه", "مقادیر ویژه", "eigenvalues", "determinant", "inverse", "matrix"],
  formulas: [
    { label: "وارون و دترمینان", tex: "A A^{-1} = I, \\qquad \\det(A) = \\prod_i u_{ii} \\cdot (-1)^{\\text{swaps}}" },
    { label: "مقادیر ویژه", tex: "\\det(\\lambda I - A) = 0, \\qquad (A - \\lambda I)\\mathbf{v} = \\mathbf{0}" }
  ],
  inputs: [
    { id: "op", label: "عملیات", type: "select", default: "det", options: OPS },
    { id: "A", label: "ماتریس A", type: "textarea", rows: 4, placeholder: "4 7\n2 6", help: "هر سطر یک ردیف است؛ عناصر با فاصله یا ویرگول جدا می‌شوند." },
    { id: "B", label: "ماتریس B", type: "textarea", rows: 4, when: { op: ["multiply", "add", "subtract"] } }
  ],
  example: { values: { op: "inverse", A: "4 7\n2 6", B: "" }, expect: ["3/5\t-7/10", "-1/5\t2/5"], note: "مثال: وارون ماتریس $\\begin{bmatrix}4&7\\\\2&6\\end{bmatrix}$ و دترمینان آن 10 است." },
  invalid: { values: { op: "inverse", A: "1 2\n2 4" } },
  related: ["linear-system", "complex-numbers", "polynomial-roots"]
};

function rowStepList(steps, cols) {
  const out = [];
  const shown = steps.length > 30 ? [...steps.slice(0, 15), null, ...steps.slice(-10)] : steps;
  for (const s of shown) out.push(s ? { text: `عملیات $${s.op}$:`, tex: matTex(s.M, cols) } : "…(عملیات سطری بیشتر)…");
  return out;
}

export function solve(input) {
  const op = choice(input, "op", "عملیات", OPS.map((o) => o[0]), "det");
  const A = matrixInput(input, "A", "ماتریس A", { maxSize: 8 });
  const steps = [{ text: "ماتریس A:", tex: `A = ${matTex(A)}` }];
  const square = A.length === A[0].length;
  const needSquare = () => { if (!square) fail("این عملیات به ماتریس مربعی نیاز دارد.", "A"); };
  if (op === "add" || op === "subtract" || op === "multiply") {
    const B = matrixInput(input, "B", "ماتریس B", { maxSize: 8 });
    steps.push({ text: "ماتریس B:", tex: `B = ${matTex(B)}` });
    let C;
    try {
      C = op === "multiply" ? mmul(A, B) : madd(A, B, op === "add" ? 1 : -1);
    } catch (e) { fail(e.message, "B"); }
    C = cleanMatrix(C);
    if (op === "multiply") steps.push(`هر عنصر $c_{ij}$ حاصل ضرب سطر i از A در ستون j از B است: $c_{ij} = \\sum_k a_{ik} b_{kj}$.`);
    else steps.push(`عناصر متناظر را جمع یا تفریق می‌کنیم: $c_{ij} = a_{ij} ${op === "add" ? "+" : "-"} b_{ij}$.`);
    const sym = op === "multiply" ? "AB" : op === "add" ? "A + B" : "A - B";
    return { results: [{ label: "نتیجه", tex: `${sym} = ${matTex(C)}`, text: matText(C) }], steps, copy: matText(C) };
  }
  if (op === "transpose") {
    const T = transpose(A);
    steps.push("سطرها و ستون‌ها را جابه‌جا می‌کنیم: $a^T_{ij} = a_{ji}$.");
    return { results: [{ label: "ترانهاده", tex: `A^T = ${matTex(T)}`, text: matText(T) }], steps, copy: matText(T) };
  }
  if (op === "rank") {
    const r = rref(A);
    steps.push("ماتریس را با عملیات سطری به فرم پلکانی سطری کاهش‌یافته تبدیل می‌کنیم:");
    steps.push(...rowStepList(r.steps));
    steps.push(`تعداد سطرهای غیرصفر (محورها) = ${r.rank}.`);
    return { results: [{ label: "رتبه", value: r.rank }, { label: "فرم پلکانی سطری کاهش‌یافته", tex: matTex(r.R), text: matText(r.R) }], steps, copy: `rank = ${r.rank}` };
  }
  if (op === "det") {
    needSquare();
    const d = det(A);
    if (A.length === 2) steps.push({ text: "برای ماتریس 2×2:", tex: `\\det A = (${niceTex(A[0][0])})(${niceTex(A[1][1])}) - (${niceTex(A[0][1])})(${niceTex(A[1][0])}) = ${niceTex(d.value, 10)}` });
    else {
      steps.push("ماتریس را با حذف به فرم بالامثلثی تبدیل می‌کنیم؛ سپس دترمینان برابر حاصل ضرب عناصر قطر است که با هر تعویض دو سطر علامت آن عوض می‌شود.");
      steps.push(...rowStepList(d.steps));
      const swaps = d.steps.filter((s) => s.op.includes("leftrightarrow")).length;
      if (d.diag) steps.push({ text: `تعداد تعویض سطرها = ${swaps}.`, tex: `\\det A = ${swaps % 2 ? "-" : ""}${d.diag.map((x) => `(${niceTex(x, 6)})`).join("")} = ${niceTex(d.value, 10)}` });
      else steps.push("ستونی با همه صفر زیر قطر ظاهر شد، پس دترمینان = 0.");
    }
    return { results: [{ label: "دترمینان", value: d.value, display: nice(d.value, 10), text: `det = ${nice(d.value, 10)}` }], steps, copy: `det(A) = ${nice(d.value, 10)}` };
  }
  if (op === "inverse") {
    needSquare();
    const d = det(A);
    steps.push(`دترمینان = ${nice(d.value, 10)}.`);
    const r = inverse(A);
    if (!r || d.value === 0) fail("ماتریس تکین است (دترمینانش صفر است)، پس وارون ندارد.", "A");
    steps.push({ text: "ماتریس افزوده $[A\\,|\\,I]$ را می‌نویسیم و حذف گاوس-ژوردن را اعمال می‌کنیم تا به $[I\\,|\\,A^{-1}]$ برسیم:", tex: matTex(r.aug, A.length) });
    steps.push(...rowStepList(r.steps, A.length));
    const check = cleanMatrix(mmul(A, r.inv));
    const okI = check.every((row, i) => row.every((x, j) => Math.abs(x - (i === j ? 1 : 0)) < 1e-9));
    steps.push(okI ? "بررسی: $A \\cdot A^{-1} = I$ دقیقاً." : "هشدار: بررسی $A A^{-1}$ به دلیل بد وضع بودن ماتریس، I را با دقت کافی نداد.");
    return { results: [{ label: "وارون", tex: `A^{-1} = ${matTex(r.inv)}`, text: matText(r.inv) }, { label: "دترمینان", value: d.value, display: nice(d.value, 10) }], steps, copy: matText(r.inv) };
  }
  needSquare();
  const e = eigen(A);
  steps.push({ text: "چندجمله‌ای مشخصه را با روش فادیف-لوورییه می‌سازیم:", tex: `\\det(\\lambda I - A) = ${polyTex(e.poly, "\\lambda")}` });
  steps.push("ریشه‌های آن مقادیر ویژه‌اند. برای هر مقدار حقیقی، $(A - \\lambda I)\\mathbf{v} = 0$ را حل می‌کنیم تا بردارهای ویژه به دست آیند.");
  const rows = e.values.map((ev) => [
    { tex: ctex(ev.value, 8) },
    String(ev.mult),
    ev.vectors.length ? { tex: ev.vectors.map((v) => `\\begin{bmatrix}${v.map((x) => niceTex(x, 6)).join("\\\\")}\\end{bmatrix}`).join(",\\;") } : ev.value.im !== 0 ? "مقدار مختلط" : "—"
  ]);
  const text = e.values.map((ev) => `λ = ${cfmt(ev.value, 8)}${ev.mult > 1 ? ` (×${ev.mult})` : ""}`).join("، ");
  return {
    results: [{ label: "مقادیر ویژه", value: text, text }],
    blocks: [{ type: "table", caption: "مقادیر و بردارهای ویژه", head: ["λ", "تکرار", "بردارهای ویژه"], rows }],
    steps, copy: text
  };
}

export { identity, charPoly };
