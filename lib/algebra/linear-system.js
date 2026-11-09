import { matrixInput, fail } from "../core/validate.js";
import { solveLinear, matTex, mvec } from "../core/matrix.js";
import { niceTex, nice, fmt } from "../core/format.js";

export const meta = {
  description: "حل نظام معادلات خطية بأي عدد من المجاهيل بطريقة حذف غاوس-جوردان، مع عرض كل عملية على الصفوف وتصنيف النظام (حل وحيد، لا حل، عدد لا نهائي من الحلول).",
  keywords: ["معادلات خطية", "نظام معادلات", "غاوس", "جاوس", "gauss", "حذف", "مصفوفة موسعة", "linear system"],
  formulas: [
    { label: "الصيغة المصفوفية والمصفوفة الموسعة", tex: "A\\mathbf{x} = \\mathbf{b} \\;\\Rightarrow\\; [A\\,|\\,\\mathbf{b}] \\xrightarrow{\\text{row ops}} [I\\,|\\,\\mathbf{x}]" },
    { label: "شرط الحل (روشيه-كابيلي)", tex: "\\operatorname{rank}(A) = \\operatorname{rank}([A|\\mathbf{b}]) = n \\Rightarrow \\text{unique solution}" }
  ],
  inputs: [
    { id: "aug", label: "المصفوفة الموسعة [A | b]", type: "textarea", rows: 4, placeholder: "2 1 -1 8\n-3 -1 2 -11\n-2 1 2 -3", help: "كل سطر معادلة واحدة: معاملات المجاهيل ثم الثابت في آخر السطر. افصل بمسافة أو فاصلة." }
  ],
  example: { values: { aug: "2 1 -1 8\n-3 -1 2 -11\n-2 1 2 -3" }, expect: ["x1 = 2", "x2 = 3", "x3 = -1"], note: "مثال: $2x_1 + x_2 - x_3 = 8$، $-3x_1 - x_2 + 2x_3 = -11$، $-2x_1 + x_2 + 2x_3 = -3$." },
  invalid: { values: { aug: "1 2\n3" } },
  related: ["matrix", "nodal-analysis", "mesh-analysis"]
};

export function solve(input) {
  const M = matrixInput(input, "aug", "المصفوفة الموسعة", { maxSize: 10 });
  if (M[0].length < 2) fail("كل سطر يحتاج معاملاً واحداً على الأقل ثم الثابت.", "aug");
  const A = M.map((r) => r.slice(0, -1)), b = M.map((r) => r[r.length - 1]);
  const m = A[0].length;
  const res = solveLinear(A, b);
  const steps = [{ text: "نكتب المصفوفة الموسعة:", tex: matTex(res.aug, m) }];
  const shown = res.steps.length > 40 ? [...res.steps.slice(0, 20), null, ...res.steps.slice(-15)] : res.steps;
  for (const s of shown) {
    if (!s) { steps.push("…(عمليات صفوف إضافية)…"); continue; }
    steps.push({ text: `العملية $${s.op}$:`, tex: matTex(s.M, m) });
  }
  steps.push(`رتبة A = ${res.rankA} ورتبة المصفوفة الموسعة = ${res.rankAug}، وعدد المجاهيل = ${m}.`);
  const names = Array.from({ length: m }, (_, i) => `x${i + 1}`);
  if (res.rankA < res.rankAug) {
    steps.push("ظهر صف من الشكل $[0 \\; 0 \\; \\cdots \\; 0 \\,|\\, c]$ مع $c \\ne 0$، أي معادلة مستحيلة.");
    return { results: [{ label: "نوع النظام", value: "لا يوجد حل (نظام غير متسق)" }], steps, copy: "لا يوجد حل" };
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
    steps.push(`عدد المجاهيل أكبر من الرتبة، فالمتغيرات الحرة هي: ${free.join("، ")}، ويُعبّر عن الباقي بدلالتها.`);
    return {
      results: [{ label: "نوع النظام", value: "عدد لا نهائي من الحلول" }, { label: "الحل العام", value: [...lines, ...free.map((f) => `${f} حر`)].join("؛ ") }],
      steps, copy: `عدد لا نهائي من الحلول: ${lines.join("; ")}`
    };
  }
  const x = res.R.slice(0, m).map((r) => r[m]);
  const resid = mvec(A, x).map((v, i) => v - b[i]);
  const maxRes = Math.max(...resid.map(Math.abs));
  steps.push({ text: "الحل يُقرأ من العمود الأخير:", tex: x.map((v, i) => `x_{${i + 1}} = ${niceTex(v, 10)}`).join(",\\quad ") });
  steps.push(`للتحقق عوّضنا الحل في المعادلات الأصلية فكان أكبر فرق ${fmt(maxRes, 2)}.`);
  return {
    results: [{ label: "نوع النظام", value: "حل وحيد" }, ...x.map((v, i) => ({ label: `$x_{${i + 1}}$`, value: v, display: nice(v, 10), text: `x${i + 1} = ${nice(v, 10)}` }))],
    steps,
    copy: x.map((v, i) => `x${i + 1} = ${nice(v, 10)}`).join("\n")
  };
}
