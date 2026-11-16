import { matrixInput, fail } from "../core/validate.js";
import { solveLinear, matTex, mvec } from "../core/matrix.js";
import { niceTex, nice, fmt } from "../core/format.js";

export const meta = {
  description: "Herhangi sayıda bilinmeyenli doğrusal denklem sistemini Gauss-Jordan yöntemiyle çözün; her satır işlemini gösterin ve sistemi sınıflandırın (tek çözüm, çözüm yok, sonsuz çözüm).",
  keywords: ["doğrusal denklemler", "denklem sistemi", "Gauss", "Gauss", "gauss", "eliminasyon", "genişletilmiş matris", "linear system"],
  formulas: [
    { label: "Matris biçimi ve genişletilmiş matris", tex: "A\\mathbf{x} = \\mathbf{b} \\;\\Rightarrow\\; [A\\,|\\,\\mathbf{b}] \\xrightarrow{\\text{row ops}} [I\\,|\\,\\mathbf{x}]" },
    { label: "Çözüm koşulu (Rouché–Capelli)", tex: "\\operatorname{rank}(A) = \\operatorname{rank}([A|\\mathbf{b}]) = n \\Rightarrow \\text{unique solution}" }
  ],
  inputs: [
    { id: "aug", label: "Genişletilmiş matris [A | b]", type: "textarea", rows: 4, placeholder: "2 1 -1 8\n-3 -1 2 -11\n-2 1 2 -3", help: "Her satır bir denklemdir: bilinmeyenlerin katsayıları, en sonda sabit terim. Boşlukla veya virgülle ayırın." }
  ],
  example: { values: { aug: "2 1 -1 8\n-3 -1 2 -11\n-2 1 2 -3" }, expect: ["x1 = 2", "x2 = 3", "x3 = -1"], note: "Örnek: $2x_1 + x_2 - x_3 = 8$, $-3x_1 - x_2 + 2x_3 = -11$, $-2x_1 + x_2 + 2x_3 = -3$." },
  invalid: { values: { aug: "1 2\n3" } },
  related: ["matrix", "nodal-analysis", "mesh-analysis"]
};

export function solve(input) {
  const M = matrixInput(input, "aug", "Genişletilmiş matris", { maxSize: 10 });
  if (M[0].length < 2) fail("Her satırda en az bir katsayı ve ardından sabit terim olmalıdır.", "aug");
  const A = M.map((r) => r.slice(0, -1)), b = M.map((r) => r[r.length - 1]);
  const m = A[0].length;
  const res = solveLinear(A, b);
  const steps = [{ text: "Genişletilmiş matrisi yazalım:", tex: matTex(res.aug, m) }];
  const shown = res.steps.length > 40 ? [...res.steps.slice(0, 20), null, ...res.steps.slice(-15)] : res.steps;
  for (const s of shown) {
    if (!s) { steps.push("…(ek satır işlemleri)…"); continue; }
    steps.push({ text: `İşlem $${s.op}$:`, tex: matTex(s.M, m) });
  }
  steps.push(`A'nın rankı = ${res.rankA}, genişletilmiş matrisin rankı = ${res.rankAug}, bilinmeyen sayısı = ${m}.`);
  const names = Array.from({ length: m }, (_, i) => `x${i + 1}`);
  if (res.rankA < res.rankAug) {
    steps.push("$[0 \\; 0 \\; \\cdots \\; 0 \\,|\\, c]$ biçiminde, $c \\ne 0$ olan bir satır çıktı; bu imkânsız bir denklemdir.");
    return { results: [{ label: "Sistem türü", value: "Çözüm yok (sistem tutarsız)" }], steps, copy: "Çözüm yok" };
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
    steps.push(`Bilinmeyen sayısı rütbeden büyük; serbest değişkenler: ${free.join("، ")}; diğerleri bunlara bağlı olarak ifade edilir.`);
    return {
      results: [{ label: "Sistem türü", value: "Sonsuz çözüm" }, { label: "Genel çözüm", value: [...lines, ...free.map((f) => `${f} serbest`)].join("؛ ") }],
      steps, copy: `Sonsuz çözüm: ${lines.join("; ")}`
    };
  }
  const x = res.R.slice(0, m).map((r) => r[m]);
  const resid = mvec(A, x).map((v, i) => v - b[i]);
  const maxRes = Math.max(...resid.map(Math.abs));
  steps.push({ text: "Çözüm son sütundan okunur:", tex: x.map((v, i) => `x_{${i + 1}} = ${niceTex(v, 10)}`).join(",\\quad ") });
  steps.push(`Doğrulama için çözümü özgün denklemlerde yerine koyduk; en büyük fark ${fmt(maxRes, 2)}.`);
  return {
    results: [{ label: "Sistem türü", value: "Tek çözüm" }, ...x.map((v, i) => ({ label: `$x_{${i + 1}}$`, value: v, display: nice(v, 10), text: `x${i + 1} = ${nice(v, 10)}` }))],
    steps,
    copy: x.map((v, i) => `x${i + 1} = ${nice(v, 10)}`).join("\n")
  };
}
