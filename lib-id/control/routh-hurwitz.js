import { readTF } from "../signals/common.js";
import { roots, toTex as ptex, toDescending } from "../core/polynomial.js";
import { fmt, niceTex } from "../core/format.js";
import { fail } from "../core/validate.js";

export const meta = {
  description: "Uji kestabilan sistem dengan kriteria Routh-Hurwitz: tabel Routh lengkap dengan dua kasus khusus (nol pada kolom pertama, dan satu baris penuh nol), jumlah akar di setengah bidang kanan, serta verifikasi dengan menghitung akar secara langsung.",
  keywords: ["Routh", "Hurwitz", "routh", "hurwitz", "tabel Routh", "kestabilan", "stability", "persamaan karakteristik"],
  formulas: [
    { label: "Setiap baris dibangun dengan perkalian silang dua baris di atasnya", tex: "b_i = \\frac{a_{1}\\,a_{2i} - a_{0}\\,a_{2i+1}}{a_{1}}" },
    { label: "Jumlah akar di setengah bidang kanan = jumlah perubahan tanda pada kolom pertama", tex: "N_{RHP} = N_{\\text{sign}}" }
  ],
  inputs: [
    { id: "p", label: "Polinomial karakteristik dalam s", type: "expr", default: "s^4 + 2s^3 + 3s^2 + 4s + 5", help: "Misalnya $s^3 + 6s^2 + 11s + 6$ (masukkan sisi kiri persamaan saja)." }
  ],
  example: { values: { p: "s^4 + 2s^3 + 3s^2 + 4s + 5" }, expect: ["RHP = 2"], note: "Contoh klasik dari buku teks: $s^4 + 2s^3 + 3s^2 + 4s + 5$ memiliki dua perubahan tanda, yaitu dua akar tidak stabil." },
  invalid: { values: { p: "5" } },
  related: ["transfer-function", "step-response", "bode-plot", "steady-state-error"]
};

export function routhTable(desc) {
  const n = desc.length - 1;
  const width = Math.ceil((n + 1) / 2);
  const scale = Math.max(...desc.map(Math.abs));
  const eps = 1e-9 * scale;
  const rows = [desc.filter((_, i) => i % 2 === 0), desc.filter((_, i) => i % 2 === 1)].map((r) => [...r, ...Array(width - r.length + 1).fill(0)]);
  const notes = [];
  let usedEps = false, auxRow = null;
  const isZero = (x) => Math.abs(x) <= 1e-10 * scale;
  for (let i = 2; i <= n; i++) {
    const prev = rows[i - 1], prev2 = rows[i - 2];
    if (prev.every(isZero)) {
      const order = n - (i - 2);
      const aux = prev2.map((c, k) => c * (order - 2 * k));
      rows[i - 1] = aux.map((c, k) => (order - 2 * k > 0 ? c : 0));
      notes.push({ row: i - 1, kind: "zeroRow", aux: prev2.slice(0, Math.floor(order / 2) + 1), order });
      auxRow = { order, coeffs: prev2.slice(0, Math.floor(order / 2) + 1) };
    } else if (isZero(prev[0])) {
      prev[0] = eps;
      usedEps = true;
      notes.push({ row: i - 1, kind: "eps" });
    }
    const a = rows[i - 1], b = rows[i - 2];
    const row = [];
    for (let k = 0; k < width; k++) row.push((a[0] * (b[k + 1] || 0) - b[0] * (a[k + 1] || 0)) / a[0]);
    row.push(0);
    rows.push(row.map((x) => (isZero(x) ? 0 : x)));
  }
  if (rows.length > n + 1) rows.length = n + 1;
  const first = rows.map((r) => r[0]);
  let changes = 0;
  for (let i = 1; i < first.length; i++) if (Math.sign(first[i]) !== Math.sign(first[i - 1]) && first[i] !== 0 && first[i - 1] !== 0) changes++;
  return { rows: rows.map((r) => r.slice(0, width)), first, changes, notes, usedEps, auxRow, n };
}

export function solve(input) {
  const tf = readTF(input, "p", "Polinomial", { polynomial: true });
  const asc = tf.num.map((c) => c / tf.den[0]);
  let desc = toDescending(asc);
  const n = desc.length - 1;
  if (n < 1) fail("Polinomial harus berderajat minimal satu.", "p");
  if (desc[0] < 0) desc = desc.map((c) => -c);
  const steps = [{ text: "Persamaan karakteristik:", tex: `${ptex(asc, "s")} = 0` }];
  const missing = desc.some((c) => c === 0), negative = desc.some((c) => c < 0);
  if (missing || negative) steps.push(`Syarat perlu tidak terpenuhi: ${negative ? "terdapat koefisien negatif" : "terdapat koefisien nol"}, sehingga sistem tidak stabil mutlak. Kita lanjutkan tabel untuk mengetahui jumlah akar yang tidak stabil.`);
  else steps.push("Syarat perlu terpenuhi: semua koefisien ada dan positif. Kita bangun tabel untuk memastikan.");
  const T = routhTable(desc);
  steps.push("Dua baris pertama adalah koefisien polinomial secara bergantian, dan setiap baris setelahnya dihitung dengan perkalian silang dua baris di atasnya, dibagi elemen pertama baris sebelumnya.");
  for (const note of T.notes) {
    if (note.kind === "eps") steps.push(`Pada baris $s^{${n - note.row}}$ muncul nol di kolom pertama, sehingga kita gantikan dengan bilangan positif yang sangat kecil $\\varepsilon$ dan melanjutkan.`);
    else steps.push({ text: `Baris $s^{${n - note.row}}$ seluruhnya nol, sehingga kita bentuk polinomial bantu dari baris sebelumnya dan mengganti baris nol dengan koefisien turunannya. Ini berarti ada akar yang simetris terhadap titik asal (mungkin berada pada sumbu imajiner):`, tex: `A(s) = ${note.aux.map((c, k) => `${niceTex(c, 6)}s^{${note.order - 2 * k}}`).join(" + ")}` });
  }
  const rs = roots(asc);
  const rhp = rs.filter((r) => r.re > 1e-10 * Math.max(1, Math.hypot(r.re, r.im))).length;
  const jw = rs.filter((r) => Math.abs(r.re) <= 1e-10 * Math.max(1, Math.hypot(r.re, r.im))).length;
  steps.push(`Jumlah perubahan tanda pada kolom pertama = ${T.changes}, yaitu jumlah akar di setengah bidang kanan.`);
  steps.push(`Untuk verifikasi, kita hitung akar secara numerik: ${rhp} di setengah bidang kanan dan ${jw} pada sumbu imajiner.`);
  const verdict = rhp > 0 ? "Tidak stabil" : jw > 0 ? "Stabil marginal (akar pada sumbu imajiner)" : "Stabil";
  const rows = T.rows.map((r, i) => [{ tex: `s^{${n - i}}`, th: true }, ...r.map((x, k) => (k === 0 && T.notes.some((q) => q.kind === "eps" && q.row === i) ? { tex: "\\varepsilon" } : fmt(x, 6)))]);
  return {
    results: [
      { label: "Putusan", value: verdict },
      { label: "Perubahan tanda pada kolom pertama", value: T.changes },
      { label: "Akar di setengah bidang kanan (RHP)", value: rhp, text: `RHP = ${rhp}` },
      { label: "Akar pada sumbu imajiner", value: jw }
    ],
    blocks: [{ type: "table", caption: "tabel Routh", head: ["", ...Array.from({ length: T.rows[0].length }, (_, k) => `Kolom ${k + 1}`)], rows }],
    steps, copy: `${verdict}, RHP = ${rhp}, sign changes = ${T.changes}`
  };
}
