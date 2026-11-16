import { matrixInput, fail } from "../core/validate.js";
import { solveLinear, matTex, mvec } from "../core/matrix.js";
import { niceTex, nice, fmt } from "../core/format.js";

export const meta = {
  description: "کسی بھی تعداد کے نامعلوم متغیرات والے خطی مساواتوں کے نظام کو گاؤس-جورڈن ایلیمنیشن سے حل کریں، ہر قطار کی عملیات دکھاتے ہوئے اور نظام کی درجہ بندی کریں (واحد حل، کوئی حل نہیں، یا لاتعداد حل)۔",
  keywords: ["خطی مساوات", "مساواتوں کا نظام", "گاؤس", "گاؤس", "gauss", "ایلیمنیشن", "توسیعی میٹرکس", "linear system"],
  formulas: [
    { label: "میٹرکس شکل اور توسیعی میٹرکس", tex: "A\\mathbf{x} = \\mathbf{b} \\;\\Rightarrow\\; [A\\,|\\,\\mathbf{b}] \\xrightarrow{\\text{row ops}} [I\\,|\\,\\mathbf{x}]" },
    { label: "حل ہونے کی شرط (Rouché–Capelli)", tex: "\\operatorname{rank}(A) = \\operatorname{rank}([A|\\mathbf{b}]) = n \\Rightarrow \\text{unique solution}" }
  ],
  inputs: [
    { id: "aug", label: "توسیعی میٹرکس [A | b]", type: "textarea", rows: 4, placeholder: "2 1 -1 8\n-3 -1 2 -11\n-2 1 2 -3", help: "ہر سطر ایک مساوات ہے: متغیرات کے کوئفیشنٹس، پھر سطر کے آخر میں مستقل۔ قدروں کو خالی جگہ یا کاما سے الگ کریں۔" }
  ],
  example: { values: { aug: "2 1 -1 8\n-3 -1 2 -11\n-2 1 2 -3" }, expect: ["x1 = 2", "x2 = 3", "x3 = -1"], note: "مثال: $2x_1 + x_2 - x_3 = 8$، $-3x_1 - x_2 + 2x_3 = -11$، $-2x_1 + x_2 + 2x_3 = -3$۔" },
  invalid: { values: { aug: "1 2\n3" } },
  related: ["matrix", "nodal-analysis", "mesh-analysis"]
};

export function solve(input) {
  const M = matrixInput(input, "aug", "توسیعی میٹرکس", { maxSize: 10 });
  if (M[0].length < 2) fail("ہر سطر میں کم از کم ایک کوئفیشنٹ ہونا چاہیے، پھر مستقل۔", "aug");
  const A = M.map((r) => r.slice(0, -1)), b = M.map((r) => r[r.length - 1]);
  const m = A[0].length;
  const res = solveLinear(A, b);
  const steps = [{ text: "ہم توسیعی میٹرکس لکھتے ہیں:", tex: matTex(res.aug, m) }];
  const shown = res.steps.length > 40 ? [...res.steps.slice(0, 20), null, ...res.steps.slice(-15)] : res.steps;
  for (const s of shown) {
    if (!s) { steps.push("…(اضافی قطار کی عملیات)…"); continue; }
    steps.push({ text: `عملیات $${s.op}$:`, tex: matTex(s.M, m) });
  }
  steps.push(`A کی رینک = ${res.rankA}، توسیعی میٹرکس کی رینک = ${res.rankAug}، اور متغیرات کی تعداد = ${m}۔`);
  const names = Array.from({ length: m }, (_, i) => `x${i + 1}`);
  if (res.rankA < res.rankAug) {
    steps.push("$[0 \\; 0 \\; \\cdots \\; 0 \\,|\\, c]$ کی شکل کی ایک قطار ظاہر ہوئی جہاں $c \\ne 0$، یعنی ناممکن مساوات۔");
    return { results: [{ label: "نظام کی قسم", value: "کوئی حل نہیں (غیر متسق نظام)" }], steps, copy: "کوئی حل نہیں" };
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
    steps.push(`متغیرات کی تعداد رینک سے زیادہ ہے، اس لیے آزاد متغیرات یہ ہیں: ${free.join("، ")}، اور باقی کو ان کے ذریعے ظاہر کیا جاتا ہے۔`);
    return {
      results: [{ label: "نظام کی قسم", value: "لاتعداد حل" }, { label: "عمومی حل", value: [...lines, ...free.map((f) => `${f} آزاد`)].join("؛ ") }],
      steps, copy: `لاتعداد حل: ${lines.join("; ")}`
    };
  }
  const x = res.R.slice(0, m).map((r) => r[m]);
  const resid = mvec(A, x).map((v, i) => v - b[i]);
  const maxRes = Math.max(...resid.map(Math.abs));
  steps.push({ text: "حل آخری کالم سے پڑھا جاتا ہے:", tex: x.map((v, i) => `x_{${i + 1}} = ${niceTex(v, 10)}`).join(",\\quad ") });
  steps.push(`تصدیق کے لیے ہم نے حل کو اصل مساواتوں میں رکھا، اور سب سے بڑا فرق ${fmt(maxRes, 2)} تھا۔`);
  return {
    results: [{ label: "نظام کی قسم", value: "واحد حل" }, ...x.map((v, i) => ({ label: `$x_{${i + 1}}$`, value: v, display: nice(v, 10), text: `x${i + 1} = ${nice(v, 10)}` }))],
    steps,
    copy: x.map((v, i) => `x${i + 1} = ${nice(v, 10)}`).join("\n")
  };
}
