import { fail, str, choice } from "../core/validate.js";
import { fmt, tex as ntex } from "../core/format.js";
import { CODONS, AMINO } from "./codons.js";

export const meta = {
  description: "DNA veya RNA dizisini analiz edin: tamamlayıcı ve ters tamamlayıcı zincir, mRNA'ya transkripsiyon, genetik kod tablosuyla proteine translasyon, GC oranı ve yaklaşık erime sıcaklığı.",
  keywords: ["DNA", "RNA", "mRNA", "transkripsiyon", "translasyon", "genetik kod", "kodon", "codon", "protein", "amino asitler", "tamamlayıcı zincir", "reverse complement", "GC content", "erime sıcaklığı"],
  formulas: [
    { label: "GC oranı", tex: "\\%GC = \\frac{G + C}{N} \\times 100" },
    { label: "Yaklaşık erime sıcaklığı", tex: "T_m = 2(A+T) + 4(G+C)\\ \\ (N < 14),\\qquad T_m = 64.9 + 41\\,\\frac{G + C - 16.4}{N}" }
  ],
  inputs: [
    { id: "seq", label: "Dizi", type: "textarea", default: "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG", wide: true, help: "Yalnızca A, T (veya U), G ve C harfleri. Boşluklar, rakamlar ve satırlar yok sayılır." },
    { id: "strand", label: "Girilen zincir türü", type: "select", default: "coding", options: [["coding", "DNA kodlayan zincir (5′→3′)"], ["template", "DNA şablon zincir (3′→5′)"], ["rna", "mRNA (5′→3′)"]] },
    { id: "frame", label: "Translasyon başlangıcı", type: "select", default: "aug", options: [["aug", "AUG başlangıç kodonundan itibaren"], ["1", "Okuma çerçevesi 1"], ["2", "Okuma çerçevesi 2"], ["3", "Okuma çerçevesi 3"]] }
  ],
  example: { values: { seq: "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG", strand: "coding", frame: "aug" }, expect: ["MAIVMGR*", "GC = 56.41%"], note: "Örnek: ATG ile başlayan ve bir durdurma kodonuyla biten kısa gen." },
  invalid: { values: { seq: "ATGXYZ", strand: "coding", frame: "aug" } },
  related: ["punnett-square", "hardy-weinberg", "molar-mass"]
};

const COMP = { A: "T", T: "A", G: "C", C: "G", U: "A" };

export function solve(input) {
  const raw = str(input, "seq", "Dizi").toUpperCase().replace(/[\s\d\-'′5]/g, "").replace(/^5|3$/g, "");
  const strand = choice(input, "strand", "Zincir türü", ["coding", "template", "rna"], "coding");
  const frame = choice(input, "frame", "Translasyon başlangıcı", ["aug", "1", "2", "3"], "aug");
  const bad = raw.match(/[^ACGTU]/);
  if (bad) fail(`«${bad[0]}» harfi bir azot bazı değildir. Yalnızca A, C, G, T veya U kullanın.`, "seq");
  if (!raw.length) fail("Diziyi girin.", "seq");
  if (raw.includes("T") && raw.includes("U")) fail("Dizi hem T hem U içeriyor; DNA T, RNA ise U kullanır.", "seq");
  if (strand === "rna" && raw.includes("T")) fail("mRNA seçtiniz ama dizide T var. Türü DNA olarak değiştirin veya T yerine U yazın.", "strand");
  if (strand !== "rna" && raw.includes("U")) fail("DNA seçtiniz ama dizide U var. Türü mRNA olarak değiştirin.", "strand");
  const steps = [];
  let coding;
  if (strand === "coding") { coding = raw; steps.push("Kodlayan zincirin dizisi, T yerine U yazılmış mRNA ile aynıdır."); }
  else if (strand === "template") { coding = [...raw].map((b) => COMP[b]).join(""); steps.push("Şablon zincir 3′→5′ okunur; tamamlayıcısını (A↔T ve G↔C) alarak 5′→3′ kodlayan zinciri elde ederiz."); }
  else { coding = raw.replace(/U/g, "T"); steps.push("Doğrudan mRNA girdiniz; DNA kodlayan zincir, U yerine T yazılmış aynı dizidir."); }
  const mrna = coding.replace(/T/g, "U");
  const comp = [...coding].map((b) => COMP[b]).join("");
  const rc = [...comp].reverse().join("");
  const N = coding.length;
  const cnt = (b) => [...coding].filter((x) => x === b).length;
  const A = cnt("A"), T = cnt("T"), G = cnt("G"), C = cnt("C");
  const gc = (100 * (G + C)) / N;
  const tm = N < 14 ? 2 * (A + T) + 4 * (G + C) : 64.9 + (41 * (G + C - 16.4)) / N;
  let start;
  if (frame === "aug") {
    start = mrna.indexOf("AUG");
    if (start < 0) fail("Dizide AUG başlangıç kodonu yok. Bunun yerine belirli bir okuma çerçevesi seçin.", "frame");
  } else start = Number(frame) - 1;
  const codons = [];
  for (let i = start; i + 3 <= mrna.length; i += 3) {
    const c = mrna.slice(i, i + 3);
    codons.push(c);
    if (CODONS[c] === "*") break;
  }
  if (!codons.length) fail("Dizi bu çerçevede tek bir kodondan kısa.", "seq");
  const prot = codons.map((c) => CODONS[c]).join("");
  const three = codons.map((c) => AMINO[CODONS[c]].three).join("-");
  const stopped = prot.endsWith("*");
  steps.push(
    { text: "Transkripsiyon: mRNA, kodlayan zincirle aynıdır; T yerine U bulunur:", tex: `\\texttt{5'-${mrna.slice(0, 60)}${mrna.length > 60 ? "\\ldots" : ""}-3'}` },
    frame === "aug" ? `Translasyonu ${start + 1} konumundaki ilk AUG'dan başlatıyoruz; durdurma kodonuna kadar her seferinde üç baz okuyoruz.` : `Translasyonu ${start + 1} konumundan başlatıyoruz (okuma çerçevesi ${frame}).`,
    `Translasyon: ${codons.length} kodon ← ${prot}${stopped ? " (yıldız durdurma kodonu anlamına gelir)" : " (durdurma kodonuna rastlanmadı)"}.`,
    { text: "GC oranı ve yaklaşık erime sıcaklığı:", tex: `\\%GC = \\frac{${G} + ${C}}{${N}} \\times 100 = ${ntex(gc, 4)}\\%,\\quad T_m \\approx ${ntex(tm, 3)}\\,^{\\circ}C` }
  );
  const rows = codons.map((c, i) => {
    const a = AMINO[CODONS[c]];
    return [String(i + 1), c, CODONS[c], a.three, a.ar];
  });
  const blocks = [{ type: "table", ltr: false, caption: "Kodonlar ve amino asitler", head: ["#", "Kodon", "Sembol", "Üç harfli kod", "Amino asit"], rows }];
  if (!stopped) blocks.push({ type: "note", tone: "warn", text: "Dizi bir durdurma kodonuna ulaşmadan bitti; protein eksik olabilir." });
  if (frame === "aug" && start > 0) blocks.push({ type: "note", text: `${start + 1} konumundan önceki bazlar çevrilmeyen bölgedir (5′ UTR).` });
  return {
    results: [
      { label: "Uzunluk", value: `${N} baz` },
      { label: "Tamamlayıcı zincir (3′→5′)", value: comp },
      { label: "Ters tamamlayıcı (5′→3′)", value: rc },
      { label: "mRNA (5′→3′)", value: mrna },
      { label: "Protein (tek harfli kod)", value: prot },
      { label: "Protein (üç harfli kod)", value: three },
      { label: "GC oranı", value: `${fmt(gc, 4)}%` },
      { label: "Yaklaşık erime sıcaklığı", value: `${fmt(tm, 3)} °C` },
      { label: "Baz sayıları", value: `A ${A}، ${strand === "rna" ? "U" : "T"} ${T}، G ${G}، C ${C}` }
    ],
    steps, blocks,
    copy: `mRNA: ${mrna} | protein: ${prot} | GC = ${fmt(gc, 4)}% | ters tamamlayıcı: ${rc}`
  };
}
