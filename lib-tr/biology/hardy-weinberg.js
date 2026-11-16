import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CHI_CRIT = 3.841;

export const meta = {
  description: "Hardy-Weinberg dengesini uygulayarak çekinik özelliğin sıklığından alel ve genotip frekanslarını hesaplayın; ya da gözlenen birey sayılarının dengeye uygunluğunu ki-kare ile test edin.",
  keywords: ["Hardy-Weinberg", "Hardy-Weinberg", "alel frekansı", "taşıyıcılar", "kalıtım", "ki-kare", "chi-square", "gerçek popülasyon genetiği"],
  formulas: [
    { label: "Denge denklemi", tex: "p^2 + 2pq + q^2 = 1,\\qquad p + q = 1" },
    { label: "Ki-kare testi (sd = 1)", tex: "\\chi^2 = \\sum \\frac{(O - E)^2}{E}" }
  ],
  inputs: [
    { id: "mode", label: "Hesaplama yöntemi", type: "select", default: "recessive", options: [["recessive", "Çekinik özelliğin sıklığından"], ["counts", "Gözlenen birey sayılarından"]] },
    { id: "pheno", label: "Çekinik özelliğin sıklığı (aa)", type: "number", default: "0.04", when: { mode: ["recessive"] }, help: "Çekinik özelliğe sahip bireyler yalnızca aa genotipindedir." },
    { id: "phenoUnit", label: "Sıklık birimi", type: "select", default: "fraction", options: [["fraction", "Kesir (0 ile 1 arası)"], ["percent", "Yüzde (%)"]], when: { mode: ["recessive"] } },
    { id: "nAA", label: "AA birey sayısı", type: "number", default: "36", when: { mode: ["counts"] } },
    { id: "nAa", label: "Aa birey sayısı", type: "number", default: "48", when: { mode: ["counts"] } },
    { id: "naa", label: "aa birey sayısı", type: "number", default: "16", when: { mode: ["counts"] } }
  ],
  example: { values: { mode: "counts", pheno: "0.04", phenoUnit: "fraction", nAA: "36", nAa: "48", naa: "16" }, expect: ["p = 0.6", "χ² = 0"], note: "Örnek: 36 AA, 48 Aa ve 16 aa birey dengeye tam uyuyor." },
  invalid: { values: { mode: "recessive", pheno: "1.5", phenoUnit: "fraction", nAA: "0", nAa: "0", naa: "0" } },
  related: ["punnett-square", "dna-tools"]
};

function fromPheno(input) {
  const unit = choice(input, "phenoUnit", "Sıklık birimi", ["fraction", "percent"], "fraction");
  const raw = num(input, "pheno", "Çekinik özelliğin sıklığı", { nonNegative: true });
  const max = unit === "percent" ? 100 : 1;
  if (raw > max) fail(`Çekinik özelliğin sıklığı ${max}${unit === "percent" ? "٪" : ""} değerini geçmemelidir.`, "pheno");
  const qq = unit === "percent" ? raw / 100 : raw;
  const q = Math.sqrt(qq);
  const p = 1 - q;
  const pp = p * p;
  const twopq = 2 * p * q;
  const carriers = twopq * 1000;
  return {
    results: [
      { label: "Çekinik alel sıklığı q", value: fmt(q, 4) },
      { label: "Baskın alel sıklığı p", value: fmt(p, 4) },
      { label: "AA genotipi (p²)", value: `${fmt(pp, 4)} ≈ 1000 içinden ${fmt(pp * 1000, 4)}` },
      { label: "Aa genotipi (2pq)", value: `${fmt(twopq, 4)} ≈ 1000 içinden ${fmt(carriers, 4)}` },
      { label: "aa genotipi (q²)", value: `${fmt(qq, 4)} ≈ 1000 içinden ${fmt(qq * 1000, 4)}` },
      { label: "1000 bireyde taşıyıcı sayısı", value: fmt(carriers, 4) }
    ],
    steps: [
      { text: "Çekinik aa genotipinin sıklığı q²:", tex: `q^2 = ${ntex(qq)}` },
      { text: "q'yu bulmak için karekök alırız:", tex: `q = \\sqrt{${ntex(qq)}} = ${ntex(q, 6)}` },
      { text: "p + q = 1 ilişkisinden:", tex: `p = 1 - q = ${ntex(p, 6)}` },
      { text: "Taşıyıcı Aa sıklığı:", tex: `2pq = 2 \\times ${ntex(p, 6)} \\times ${ntex(q, 6)} = ${ntex(twopq, 6)}` }
    ],
    copy: `q = ${fmt(q, 4)}, p = ${fmt(p, 4)}, 1000 başına taşıyıcı = ${fmt(carriers, 4)}`,
    blocks: [
      { type: "table", caption: "Beklenen genotipler", head: ["Genotip", "Beklenen sıklık", "1000 birey başına"], rows: [["AA (baskın)", fmt(pp, 4), fmt(pp * 1000, 4)], ["Aa (taşıyıcı)", fmt(twopq, 4), fmt(carriers, 4)], ["aa (çekinik)", fmt(qq, 4), fmt(qq * 1000, 4)]], ltr: true },
      { type: "note", text: "Denge varsayımı: büyük popülasyon, rastgele eşleşme, mutasyon, göç ve doğal seçilim olmaması." }
    ]
  };
}

function fromCounts(input) {
  const AA = num(input, "nAA", "AA birey sayısı", { integer: true, nonNegative: true });
  const Aa = num(input, "nAa", "Aa birey sayısı", { integer: true, nonNegative: true });
  const aa = num(input, "naa", "aa birey sayısı", { integer: true, nonNegative: true });
  const N = AA + Aa + aa;
  if (N === 0) fail("Bireylerin toplamı sıfırdan büyük olmalıdır.", "nAA");
  const p = (2 * AA + Aa) / (2 * N);
  const q = 1 - p;
  const O = [AA, Aa, aa];
  const E = [p * p * N, 2 * p * q * N, q * q * N];
  let chi = 0;
  for (let i = 0; i < 3; i++) if (E[i] > 0) chi += ((O[i] - E[i]) ** 2) / E[i];
  if (chi < 1e-12) chi = 0;
  const significant = chi >= CHI_CRIT;
  const verdict = significant
    ? "0.05 düzeyinde Hardy-Weinberg dengesinden anlamlı bir sapma var."
    : "0.05 düzeyinde Hardy-Weinberg dengesinden anlamlı bir sapma yok.";
  const blocks = [{
    type: "table",
    caption: "Gözlenen ve beklenen",
    head: ["Genotip", "Gözlenen O", "Beklenen E", "(O − E)² / E"],
    rows: [
      ["AA", String(AA), fmt(E[0], 4), fmt(E[0] > 0 ? ((AA - E[0]) ** 2) / E[0] : 0, 4)],
      ["Aa", String(Aa), fmt(E[1], 4), fmt(E[1] > 0 ? ((Aa - E[1]) ** 2) / E[1] : 0, 4)],
      ["aa", String(aa), fmt(E[2], 4), fmt(E[2] > 0 ? ((aa - E[2]) ** 2) / E[2] : 0, 4)]
    ],
    ltr: true
  }];
  if (E.some((e) => e < 5)) blocks.push({ type: "note", tone: "warn", text: "Beklenen sayıların bazıları 5'ten küçük; bu nedenle χ² testi kesin olmayabilir." });
  return {
    results: [
      { label: "Birey sayısı N", value: String(N) },
      { label: "A alel sıklığı (p)", value: fmt(p, 4) },
      { label: "a alel sıklığı (q)", value: fmt(q, 4) },
      { label: "Beklenen sayılar AA / Aa / aa", value: `${fmt(E[0], 4)} / ${fmt(E[1], 4)} / ${fmt(E[2], 4)}` },
      { label: "χ² değeri", value: fmt(chi, 4) },
      { label: "İstatistiksel karar", value: significant ? "Anlamlı sapma" : "Anlamlı sapma yok" , text: verdict }
    ],
    steps: [
      { text: "Gözlenen alellerden A alel sıklığı:", tex: `p = \\frac{2 \\times ${AA} + ${Aa}}{2 \\times ${N}} = ${ntex(p, 6)}` },
      { text: "a alel sıklığı:", tex: `q = 1 - p = ${ntex(q, 6)}` },
      { text: "Denge için beklenen sayılar:", tex: `E_{AA} = p^2 N,\\; E_{Aa} = 2pqN,\\; E_{aa} = q^2 N = ${fmt(E[0], 4)},\\ ${fmt(E[1], 4)},\\ ${fmt(E[2], 4)}` },
      { text: "Ki-kare değeri (sd = 1):", tex: `\\chi^2 = \\sum \\frac{(O-E)^2}{E} = ${ntex(chi, 6)}` },
      `Karar: χ² ${CHI_CRIT} değerine (0.05 düzeyi ve serbestlik derecesi 1 için kritik değer) eşit veya büyükse denge reddedilir.`
    ],
    copy: `p = ${fmt(p, 4)}، q = ${fmt(q, 4)}، χ² = ${fmt(chi, 4)} (df = 1) — ${significant ? "Anlamlı sapma" : "Dengeyle uyumlu"}`,
    blocks
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Hesaplama yöntemi", ["recessive", "counts"], "recessive");
  return mode === "counts" ? fromCounts(input) : fromPheno(input);
}
