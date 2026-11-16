import { matrixInput, fail } from "../core/validate.js";
import { solveLinear, matTex, mvec } from "../core/matrix.js";
import { niceTex, nice, fmt } from "../core/format.js";

export const meta = {
  description: "Selesaikan sistem persamaan linear dengan sejumlah variabel berapa pun menggunakan eliminasi Gauss-Jordan, dengan menampilkan setiap operasi baris dan mengklasifikasikan sistem (solusi tunggal, tidak ada solusi, atau tak hingga banyak solusi).",
  keywords: ["persamaan linear", "sistem persamaan", "Gauss", "Gauss", "gauss", "eliminasi", "matriks augmentasi", "linear system"],
  formulas: [
    { label: "Bentuk matriks dan matriks augmentasi", tex: "A\\mathbf{x} = \\mathbf{b} \\;\\Rightarrow\\; [A\\,|\\,\\mathbf{b}] \\xrightarrow{\\text{row ops}} [I\\,|\\,\\mathbf{x}]" },
    { label: "Syarat penyelesaian (Rouché–Capelli)", tex: "\\operatorname{rank}(A) = \\operatorname{rank}([A|\\mathbf{b}]) = n \\Rightarrow \\text{unique solution}" }
  ],
  inputs: [
    { id: "aug", label: "Matriks augmentasi [A | b]", type: "textarea", rows: 4, placeholder: "2 1 -1 8\n-3 -1 2 -11\n-2 1 2 -3", help: "Setiap baris adalah satu persamaan: koefisien variabel, lalu konstanta di akhir baris. Pisahkan nilai dengan spasi atau koma." }
  ],
  example: { values: { aug: "2 1 -1 8\n-3 -1 2 -11\n-2 1 2 -3" }, expect: ["x1 = 2", "x2 = 3", "x3 = -1"], note: "Contoh: $2x_1 + x_2 - x_3 = 8$, $-3x_1 - x_2 + 2x_3 = -11$, $-2x_1 + x_2 + 2x_3 = -3$." },
  invalid: { values: { aug: "1 2\n3" } },
  related: ["matrix", "nodal-analysis", "mesh-analysis"]
};

export function solve(input) {
  const M = matrixInput(input, "aug", "Matriks augmentasi", { maxSize: 10 });
  if (M[0].length < 2) fail("Setiap baris memerlukan setidaknya satu koefisien, lalu konstanta.", "aug");
  const A = M.map((r) => r.slice(0, -1)), b = M.map((r) => r[r.length - 1]);
  const m = A[0].length;
  const res = solveLinear(A, b);
  const steps = [{ text: "Tulis matriks augmentasi:", tex: matTex(res.aug, m) }];
  const shown = res.steps.length > 40 ? [...res.steps.slice(0, 20), null, ...res.steps.slice(-15)] : res.steps;
  for (const s of shown) {
    if (!s) { steps.push("…(operasi baris tambahan)…"); continue; }
    steps.push({ text: `Operasi $${s.op}$:`, tex: matTex(s.M, m) });
  }
  steps.push(`Rank A = ${res.rankA}, rank matriks augmentasi = ${res.rankAug}, dan jumlah variabel = ${m}.`);
  const names = Array.from({ length: m }, (_, i) => `x${i + 1}`);
  if (res.rankA < res.rankAug) {
    steps.push("Muncul baris berbentuk $[0 \\; 0 \\; \\cdots \\; 0 \\,|\\, c]$ dengan $c \\ne 0$, yaitu persamaan yang mustahil.");
    return { results: [{ label: "Jenis sistem", value: "Tidak ada solusi (sistem tidak konsisten)" }], steps, copy: "Tidak ada solusi" };
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
    steps.push(`Jumlah variabel lebih besar dari rank, sehingga variabel bebasnya adalah ${free.join("، ")}, dan sisanya dinyatakan dalam variabel tersebut.`);
    return {
      results: [{ label: "Jenis sistem", value: "Tak hingga banyak solusi" }, { label: "Solusi umum", value: [...lines, ...free.map((f) => `${f} bebas`)].join("؛ ") }],
      steps, copy: `Tak hingga banyak solusi: ${lines.join("; ")}`
    };
  }
  const x = res.R.slice(0, m).map((r) => r[m]);
  const resid = mvec(A, x).map((v, i) => v - b[i]);
  const maxRes = Math.max(...resid.map(Math.abs));
  steps.push({ text: "Solusi dibaca dari kolom terakhir:", tex: x.map((v, i) => `x_{${i + 1}} = ${niceTex(v, 10)}`).join(",\\quad ") });
  steps.push(`Untuk verifikasi, kita substitusikan solusi ke persamaan asli; selisih terbesarnya adalah ${fmt(maxRes, 2)}.`);
  return {
    results: [{ label: "Jenis sistem", value: "Solusi tunggal" }, ...x.map((v, i) => ({ label: `$x_{${i + 1}}$`, value: v, display: nice(v, 10), text: `x${i + 1} = ${nice(v, 10)}` }))],
    steps,
    copy: x.map((v, i) => `x${i + 1} = ${nice(v, 10)}`).join("\n")
  };
}
