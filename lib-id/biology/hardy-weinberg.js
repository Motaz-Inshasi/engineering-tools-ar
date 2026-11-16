import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CHI_CRIT = 3.841;

export const meta = {
  description: "Terapkan keseimbangan Hardy-Weinberg untuk menghitung frekuensi alel dan genotipe dari frekuensi sifat resesif, atau uji apakah jumlah individu yang diamati sesuai dengan keseimbangan menggunakan uji chi-kuadrat.",
  keywords: ["Hardy-Weinberg", "Hardy-Weinberg", "Frekuensi alel", "Pembawa", "Pewarisan", "Chi-kuadrat", "chi-square", "Genetika populasi"],
  formulas: [
    { label: "Persamaan keseimbangan", tex: "p^2 + 2pq + q^2 = 1,\\qquad p + q = 1" },
    { label: "Uji chi-kuadrat (df = 1)", tex: "\\chi^2 = \\sum \\frac{(O - E)^2}{E}" }
  ],
  inputs: [
    { id: "mode", label: "Metode perhitungan", type: "select", default: "recessive", options: [["recessive", "Dari frekuensi sifat resesif"], ["counts", "Dari jumlah individu yang diamati"]] },
    { id: "pheno", label: "Frekuensi sifat resesif (aa)", type: "number", default: "0.04", when: { mode: ["recessive"] }, help: "Individu dengan sifat resesif hanya memiliki genotipe aa." },
    { id: "phenoUnit", label: "Satuan frekuensi", type: "select", default: "fraction", options: [["fraction", "Pecahan (dari 0 hingga 1)"], ["percent", "Persentase (%)"]], when: { mode: ["recessive"] } },
    { id: "nAA", label: "Jumlah individu AA", type: "number", default: "36", when: { mode: ["counts"] } },
    { id: "nAa", label: "Jumlah individu Aa", type: "number", default: "48", when: { mode: ["counts"] } },
    { id: "naa", label: "Jumlah individu aa", type: "number", default: "16", when: { mode: ["counts"] } }
  ],
  example: { values: { mode: "counts", pheno: "0.04", phenoUnit: "fraction", nAA: "36", nAa: "48", naa: "16" }, expect: ["p = 0.6", "χ² = 0"], note: "Contoh: 36 individu AA, 48 individu Aa, dan 16 individu aa sesuai dengan keseimbangan secara tepat." },
  invalid: { values: { mode: "recessive", pheno: "1.5", phenoUnit: "fraction", nAA: "0", nAa: "0", naa: "0" } },
  related: ["punnett-square", "dna-tools"]
};

function fromPheno(input) {
  const unit = choice(input, "phenoUnit", "Satuan frekuensi", ["fraction", "percent"], "fraction");
  const raw = num(input, "pheno", "Frekuensi sifat resesif", { nonNegative: true });
  const max = unit === "percent" ? 100 : 1;
  if (raw > max) fail(`Frekuensi sifat resesif tidak boleh melebihi ${max}${unit === "percent" ? "٪" : ""}.`, "pheno");
  const qq = unit === "percent" ? raw / 100 : raw;
  const q = Math.sqrt(qq);
  const p = 1 - q;
  const pp = p * p;
  const twopq = 2 * p * q;
  const carriers = twopq * 1000;
  return {
    results: [
      { label: "Frekuensi alel resesif q", value: fmt(q, 4) },
      { label: "Frekuensi alel dominan p", value: fmt(p, 4) },
      { label: "Genotipe AA (p²)", value: `${fmt(pp, 4)} ≈ ${fmt(pp * 1000, 4)} dari 1000` },
      { label: "Genotipe Aa (2pq)", value: `${fmt(twopq, 4)} ≈ ${fmt(carriers, 4)} dari 1000` },
      { label: "Genotipe aa (q²)", value: `${fmt(qq, 4)} ≈ ${fmt(qq * 1000, 4)} dari 1000` },
      { label: "Jumlah pembawa per 1000 individu", value: fmt(carriers, 4) }
    ],
    steps: [
      { text: "Frekuensi genotipe resesif aa adalah q²:", tex: `q^2 = ${ntex(qq)}` },
      { text: "Kita ambil akar kuadrat untuk mendapatkan q:", tex: `q = \\sqrt{${ntex(qq)}} = ${ntex(q, 6)}` },
      { text: "Dari hubungan p + q = 1:", tex: `p = 1 - q = ${ntex(p, 6)}` },
      { text: "Frekuensi pembawa Aa:", tex: `2pq = 2 \\times ${ntex(p, 6)} \\times ${ntex(q, 6)} = ${ntex(twopq, 6)}` }
    ],
    copy: `q = ${fmt(q, 4)}, p = ${fmt(p, 4)}, pembawa per 1000 = ${fmt(carriers, 4)}`,
    blocks: [
      { type: "table", caption: "Genotipe yang diharapkan", head: ["Genotipe", "Frekuensi yang diharapkan", "Per 1000 individu"], rows: [["AA (dominan)", fmt(pp, 4), fmt(pp * 1000, 4)], ["Aa (pembawa)", fmt(twopq, 4), fmt(carriers, 4)], ["aa (resesif)", fmt(qq, 4), fmt(qq * 1000, 4)]], ltr: true },
      { type: "note", text: "Keseimbangan mengasumsikan populasi besar, perkawinan acak, dan tidak adanya mutasi, migrasi, serta seleksi alam." }
    ]
  };
}

function fromCounts(input) {
  const AA = num(input, "nAA", "Jumlah individu AA", { integer: true, nonNegative: true });
  const Aa = num(input, "nAa", "Jumlah individu Aa", { integer: true, nonNegative: true });
  const aa = num(input, "naa", "Jumlah individu aa", { integer: true, nonNegative: true });
  const N = AA + Aa + aa;
  if (N === 0) fail("Jumlah total individu harus lebih besar dari nol.", "nAA");
  const p = (2 * AA + Aa) / (2 * N);
  const q = 1 - p;
  const O = [AA, Aa, aa];
  const E = [p * p * N, 2 * p * q * N, q * q * N];
  let chi = 0;
  for (let i = 0; i < 3; i++) if (E[i] > 0) chi += ((O[i] - E[i]) ** 2) / E[i];
  if (chi < 1e-12) chi = 0;
  const significant = chi >= CHI_CRIT;
  const verdict = significant
    ? "Terdapat penyimpangan bermakna dari keseimbangan Hardy-Weinberg pada taraf 0.05."
    : "Tidak terdapat penyimpangan bermakna dari keseimbangan Hardy-Weinberg pada taraf 0.05.";
  const blocks = [{
    type: "table",
    caption: "Diamati dibandingkan harapan",
    head: ["Genotipe", "Diamati O", "Harapan E", "(O − E)² / E"],
    rows: [
      ["AA", String(AA), fmt(E[0], 4), fmt(E[0] > 0 ? ((AA - E[0]) ** 2) / E[0] : 0, 4)],
      ["Aa", String(Aa), fmt(E[1], 4), fmt(E[1] > 0 ? ((Aa - E[1]) ** 2) / E[1] : 0, 4)],
      ["aa", String(aa), fmt(E[2], 4), fmt(E[2] > 0 ? ((aa - E[2]) ** 2) / E[2] : 0, 4)]
    ],
    ltr: true
  }];
  if (E.some((e) => e < 5)) blocks.push({ type: "note", tone: "warn", text: "Beberapa frekuensi harapan kurang dari 5, sehingga uji χ² mungkin tidak akurat." });
  return {
    results: [
      { label: "Jumlah individu N", value: String(N) },
      { label: "Frekuensi alel A (p)", value: fmt(p, 4) },
      { label: "Frekuensi alel a (q)", value: fmt(q, 4) },
      { label: "Frekuensi harapan AA / Aa / aa", value: `${fmt(E[0], 4)} / ${fmt(E[1], 4)} / ${fmt(E[2], 4)}` },
      { label: "Nilai χ²", value: fmt(chi, 4) },
      { label: "Hasil statistik", value: significant ? "Penyimpangan bermakna" : "Tidak ada penyimpangan bermakna" , text: verdict }
    ],
    steps: [
      { text: "Frekuensi alel A dari alel yang diamati:", tex: `p = \\frac{2 \\times ${AA} + ${Aa}}{2 \\times ${N}} = ${ntex(p, 6)}` },
      { text: "Frekuensi alel a:", tex: `q = 1 - p = ${ntex(q, 6)}` },
      { text: "Frekuensi harapan pada keseimbangan:", tex: `E_{AA} = p^2 N,\\; E_{Aa} = 2pqN,\\; E_{aa} = q^2 N = ${fmt(E[0], 4)},\\ ${fmt(E[1], 4)},\\ ${fmt(E[2], 4)}` },
      { text: "Nilai chi-kuadrat (df = 1):", tex: `\\chi^2 = \\sum \\frac{(O-E)^2}{E} = ${ntex(chi, 6)}` },
      `Kesimpulan: jika χ² lebih besar atau sama dengan ${CHI_CRIT} (nilai kritis pada taraf 0.05 dan derajat bebas 1), keseimbangan ditolak.`
    ],
    copy: `p = ${fmt(p, 4)}، q = ${fmt(q, 4)}، χ² = ${fmt(chi, 4)} (df = 1) — ${significant ? "Penyimpangan bermakna" : "Sesuai dengan keseimbangan"}`,
    blocks
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Metode perhitungan", ["recessive", "counts"], "recessive");
  return mode === "counts" ? fromCounts(input) : fromPheno(input);
}
