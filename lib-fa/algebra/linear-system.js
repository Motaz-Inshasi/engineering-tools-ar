import { matrixInput, fail } from "../core/validate.js";
import { solveLinear, matTex, mvec } from "../core/matrix.js";
import { niceTex, nice, fmt } from "../core/format.js";

export const meta = {
  description: "حل دستگاه معادلات خطی با هر تعداد مجهول به روش حذفی گاوس-ژوردن، با نمایش هر عملیات روی سطرها و طبقه‌بندی دستگاه (جواب یکتا، بدون جواب، یا بی‌نهایت جواب).",
  keywords: ["معادلات خطی", "دستگاه معادلات", "گاوس", "گاوس", "gauss", "حذف", "ماتریس افزوده", "linear system"],
  formulas: [
    { label: "صورت ماتریسی و ماتریس افزوده", tex: "A\\mathbf{x} = \\mathbf{b} \\;\\Rightarrow\\; [A\\,|\\,\\mathbf{b}] \\xrightarrow{\\text{row ops}} [I\\,|\\,\\mathbf{x}]" },
    { label: "شرط وجود جواب (روشه-کاپلی)", tex: "\\operatorname{rank}(A) = \\operatorname{rank}([A|\\mathbf{b}]) = n \\Rightarrow \\text{unique solution}" }
  ],
  inputs: [
    { id: "aug", label: "ماتریس افزوده [A | b]", type: "textarea", rows: 4, placeholder: "2 1 -1 8\n-3 -1 2 -11\n-2 1 2 -3", help: "هر سطر یک معادله است: ضرایب مجهول‌ها و سپس عدد ثابت در پایان سطر. مقادیر را با فاصله یا ویرگول جدا کنید." }
  ],
  example: { values: { aug: "2 1 -1 8\n-3 -1 2 -11\n-2 1 2 -3" }, expect: ["x1 = 2", "x2 = 3", "x3 = -1"], note: "مثال: $2x_1 + x_2 - x_3 = 8$، $-3x_1 - x_2 + 2x_3 = -11$، $-2x_1 + x_2 + 2x_3 = -3$." },
  invalid: { values: { aug: "1 2\n3" } },
  related: ["matrix", "nodal-analysis", "mesh-analysis"]
};

export function solve(input) {
  const M = matrixInput(input, "aug", "ماتریس افزوده", { maxSize: 10 });
  if (M[0].length < 2) fail("هر سطر حداقل به یک ضریب و سپس عدد ثابت نیاز دارد.", "aug");
  const A = M.map((r) => r.slice(0, -1)), b = M.map((r) => r[r.length - 1]);
  const m = A[0].length;
  const res = solveLinear(A, b);
  const steps = [{ text: "ماتریس افزوده را می‌نویسیم:", tex: matTex(res.aug, m) }];
  const shown = res.steps.length > 40 ? [...res.steps.slice(0, 20), null, ...res.steps.slice(-15)] : res.steps;
  for (const s of shown) {
    if (!s) { steps.push("…(عملیات سطری بیشتر)…"); continue; }
    steps.push({ text: `عملیات $${s.op}$:`, tex: matTex(s.M, m) });
  }
  steps.push(`رتبه A = ${res.rankA} و رتبه ماتریس افزوده = ${res.rankAug}، و تعداد مجهول‌ها = ${m}.`);
  const names = Array.from({ length: m }, (_, i) => `x${i + 1}`);
  if (res.rankA < res.rankAug) {
    steps.push("سطری به شکل $[0 \\; 0 \\; \\cdots \\; 0 \\,|\\, c]$ با $c \\ne 0$ ظاهر شد که یک معادله غیرممکن است.");
    return { results: [{ label: "نوع دستگاه", value: "بدون جواب (دستگاه ناسازگار)" }], steps, copy: "بدون جواب" };
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
    steps.push(`تعداد مجهول‌ها بیشتر از رتبه است، پس متغیرهای آزاد عبارت‌اند از: ${free.join("، ")}، و بقیه بر حسب آن‌ها بیان می‌شوند.`);
    return {
      results: [{ label: "نوع دستگاه", value: "بی‌نهایت جواب" }, { label: "جواب کلی", value: [...lines, ...free.map((f) => `${f} آزاد`)].join("؛ ") }],
      steps, copy: `بی‌نهایت جواب: ${lines.join("; ")}`
    };
  }
  const x = res.R.slice(0, m).map((r) => r[m]);
  const resid = mvec(A, x).map((v, i) => v - b[i]);
  const maxRes = Math.max(...resid.map(Math.abs));
  steps.push({ text: "جواب از ستون آخر خوانده می‌شود:", tex: x.map((v, i) => `x_{${i + 1}} = ${niceTex(v, 10)}`).join(",\\quad ") });
  steps.push(`برای بررسی، جواب را در معادلات اصلی قرار دادیم و بیشترین اختلاف ${fmt(maxRes, 2)} بود.`);
  return {
    results: [{ label: "نوع دستگاه", value: "جواب یکتا" }, ...x.map((v, i) => ({ label: `$x_{${i + 1}}$`, value: v, display: nice(v, 10), text: `x${i + 1} = ${nice(v, 10)}` }))],
    steps,
    copy: x.map((v, i) => `x${i + 1} = ${nice(v, 10)}`).join("\n")
  };
}
