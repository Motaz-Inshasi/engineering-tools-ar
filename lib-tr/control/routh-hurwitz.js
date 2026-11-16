import { readTF } from "../signals/common.js";
import { roots, toTex as ptex, toDescending } from "../core/polynomial.js";
import { fmt, niceTex } from "../core/format.js";
import { fail } from "../core/validate.js";

export const meta = {
  description: "Bir sistemin kararlılığını Routh-Hurwitz ölçütüyle test edin: tam Routh tablosu, iki özel durum (ilk sütunda sıfır ve tamamen sıfır satır), sağ yarı düzlemdeki kök sayısı; kökleri doğrudan hesaplayarak doğrulayın.",
  keywords: ["Routh", "Hurwitz", "routh", "hurwitz", "Routh tablosu", "kararlılık", "stability", "karakteristik denklem"],
  formulas: [
    { label: "Her satır, üstündeki iki satırın çapraz çarpımıyla oluşturulur", tex: "b_i = \\frac{a_{1}\\,a_{2i} - a_{0}\\,a_{2i+1}}{a_{1}}" },
    { label: "Sağ yarı düzlemdeki kök sayısı = ilk sütundaki işaret değişimi sayısı", tex: "N_{RHP} = N_{\\text{sign}}" }
  ],
  inputs: [
    { id: "p", label: "s cinsinden karakteristik polinom", type: "expr", default: "s^4 + 2s^3 + 3s^2 + 4s + 5", help: "Örneğin $s^3 + 6s^2 + 11s + 6$ (yalnızca denklemin sol tarafını yazın)." }
  ],
  example: { values: { p: "s^4 + 2s^3 + 3s^2 + 4s + 5" }, expect: ["RHP = 2"], note: "Ünlü bir örnek: $s^4 + 2s^3 + 3s^2 + 4s + 5$ iki işaret değişimine sahiptir, yani iki kararsız kök vardır." },
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
  const tf = readTF(input, "p", "Polinom", { polynomial: true });
  const asc = tf.num.map((c) => c / tf.den[0]);
  let desc = toDescending(asc);
  const n = desc.length - 1;
  if (n < 1) fail("Polinom en az birinci dereceden olmalıdır.", "p");
  if (desc[0] < 0) desc = desc.map((c) => -c);
  const steps = [{ text: "Karakteristik denklem:", tex: `${ptex(asc, "s")} = 0` }];
  const missing = desc.some((c) => c === 0), negative = desc.some((c) => c < 0);
  if (missing || negative) steps.push(`Gerekli koşul sağlanmıyor: ${negative ? "Negatif katsayı var" : "Sıfır katsayı var"}; sistem tam olarak kararlı değil. Kararsız kök sayısını bulmak için tabloyu tamamlıyoruz.`);
  else steps.push("Gerekli koşul sağlanıyor: tüm katsayılar mevcut ve pozitif. Doğrulamak için tabloyu oluşturuyoruz.");
  const T = routhTable(desc);
  steps.push("İlk iki satır polinomun katsayılarını sırayla içerir; her sonraki satır, üstündeki iki satırın çapraz çarpımıyla hesaplanır ve önceki satırın ilk elemanına bölünür.");
  for (const note of T.notes) {
    if (note.kind === "eps") steps.push(`$s^{${n - note.row}}$ satırında ilk sütunda sıfır çıktı; onu çok küçük pozitif bir sayı $\\varepsilon$ ile değiştirip devam ettik.`);
    else steps.push({ text: `$s^{${n - note.row}}$ satırının tamamı sıfır; önceki satırdan yardımcı polinom oluşturup sıfır satırın yerine türevinin katsayılarını koyuyoruz. Bu, orijine göre simetrik kökler olduğu anlamına gelir (sanal eksen üzerinde olabilir):`, tex: `A(s) = ${note.aux.map((c, k) => `${niceTex(c, 6)}s^{${note.order - 2 * k}}`).join(" + ")}` });
  }
  const rs = roots(asc);
  const rhp = rs.filter((r) => r.re > 1e-10 * Math.max(1, Math.hypot(r.re, r.im))).length;
  const jw = rs.filter((r) => Math.abs(r.re) <= 1e-10 * Math.max(1, Math.hypot(r.re, r.im))).length;
  steps.push(`İlk sütundaki işaret değişimi sayısı = ${T.changes}; bu, sağ yarı düzlemdeki kök sayısıdır.`);
  steps.push(`Doğrulamak için kökleri sayısal olarak hesapladık: sağ yarı düzlemde ${rhp}, sanal eksen üzerinde ${jw}.`);
  const verdict = rhp > 0 ? "Kararsız" : jw > 0 ? "Sınırda kararlı (sanal eksende kökler)" : "Kararlı";
  const rows = T.rows.map((r, i) => [{ tex: `s^{${n - i}}`, th: true }, ...r.map((x, k) => (k === 0 && T.notes.some((q) => q.kind === "eps" && q.row === i) ? { tex: "\\varepsilon" } : fmt(x, 6)))]);
  return {
    results: [
      { label: "Karar", value: verdict },
      { label: "İlk sütundaki işaret değişimleri", value: T.changes },
      { label: "Sağ yarı düzlemdeki kökler (RHP)", value: rhp, text: `RHP = ${rhp}` },
      { label: "Sanal eksendeki kökler", value: jw }
    ],
    blocks: [{ type: "table", caption: "Routh tablosu", head: ["", ...Array.from({ length: T.rows[0].length }, (_, k) => `Sütun ${k + 1}`)], rows }],
    steps, copy: `${verdict}, RHP = ${rhp}, sign changes = ${T.changes}`
  };
}
