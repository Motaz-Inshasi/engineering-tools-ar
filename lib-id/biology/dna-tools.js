import { fail, str, choice } from "../core/validate.js";
import { fmt, tex as ntex } from "../core/format.js";
import { CODONS, AMINO } from "./codons.js";

export const meta = {
  description: "Analisis urutan DNA atau RNA: untai komplementer dan komplementer terbalik, transkripsi menjadi mRNA, translasi menjadi protein dengan kode genetik, kandungan GC, dan perkiraan suhu leleh.",
  keywords: ["DNA", "RNA", "mRNA", "Transkripsi", "Translasi", "Kode genetik", "Kodon", "codon", "Protein", "Asam amino", "Untai komplementer", "reverse complement", "GC content", "Suhu leleh"],
  formulas: [
    { label: "Kandungan GC", tex: "\\%GC = \\frac{G + C}{N} \\times 100" },
    { label: "Perkiraan suhu leleh", tex: "T_m = 2(A+T) + 4(G+C)\\ \\ (N < 14),\\qquad T_m = 64.9 + 41\\,\\frac{G + C - 16.4}{N}" }
  ],
  inputs: [
    { id: "seq", label: "Urutan", type: "textarea", default: "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG", wide: true, help: "Hanya huruf A, T (atau U), G, dan C. Spasi, angka, dan baris baru diabaikan." },
    { id: "strand", label: "Jenis untai yang dimasukkan", type: "select", default: "coding", options: [["coding", "Untai pengkode DNA (5′→3′)"], ["template", "Untai templat DNA (3′→5′)"], ["rna", "mRNA (5′→3′)"]] },
    { id: "frame", label: "Awal translasi", type: "select", default: "aug", options: [["aug", "Dari kodon awal AUG pertama"], ["1", "Bingkai baca 1"], ["2", "Bingkai baca 2"], ["3", "Bingkai baca 3"]] }
  ],
  example: { values: { seq: "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG", strand: "coding", frame: "aug" }, expect: ["MAIVMGR*", "GC = 56.41%"], note: "Contoh: gen pendek yang diawali ATG dan diakhiri kodon stop." },
  invalid: { values: { seq: "ATGXYZ", strand: "coding", frame: "aug" } },
  related: ["punnett-square", "hardy-weinberg", "molar-mass"]
};

const COMP = { A: "T", T: "A", G: "C", C: "G", U: "A" };

export function solve(input) {
  const raw = str(input, "seq", "Urutan").toUpperCase().replace(/[\s\d\-'′5]/g, "").replace(/^5|3$/g, "");
  const strand = choice(input, "strand", "Jenis untai", ["coding", "template", "rna"], "coding");
  const frame = choice(input, "frame", "Awal translasi", ["aug", "1", "2", "3"], "aug");
  const bad = raw.match(/[^ACGTU]/);
  if (bad) fail(`Karakter «${bad[0]}» bukan basa nukleotida. Gunakan hanya A, C, G, T, atau U.`, "seq");
  if (!raw.length) fail("Masukkan urutannya.", "seq");
  if (raw.includes("T") && raw.includes("U")) fail("Urutan mengandung T dan U sekaligus; DNA menggunakan T dan RNA menggunakan U.", "seq");
  if (strand === "rna" && raw.includes("T")) fail("Anda memilih mRNA tetapi urutannya mengandung T. Ubah jenis menjadi DNA atau ganti T dengan U.", "strand");
  if (strand !== "rna" && raw.includes("U")) fail("Anda memilih DNA tetapi urutannya mengandung U. Ubah jenis menjadi mRNA.", "strand");
  const steps = [];
  let coding;
  if (strand === "coding") { coding = raw; steps.push("Untai pengkode memiliki urutan yang sama dengan mRNA, dengan T diganti U."); }
  else if (strand === "template") { coding = [...raw].map((b) => COMP[b]).join(""); steps.push("Untai templat dibaca 3′→5′, sehingga kita ambil komplemennya (A↔T dan G↔C) untuk mendapatkan untai pengkode 5′→3′."); }
  else { coding = raw.replace(/U/g, "T"); steps.push("mRNA dimasukkan langsung, sehingga untai pengkode DNA-nya adalah urutan yang sama dengan U diganti T."); }
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
    if (start < 0) fail("Tidak ada kodon awal AUG dalam urutan. Pilih bingkai baca tertentu sebagai gantinya.", "frame");
  } else start = Number(frame) - 1;
  const codons = [];
  for (let i = start; i + 3 <= mrna.length; i += 3) {
    const c = mrna.slice(i, i + 3);
    codons.push(c);
    if (CODONS[c] === "*") break;
  }
  if (!codons.length) fail("Urutan lebih pendek dari satu kodon pada bingkai ini.", "seq");
  const prot = codons.map((c) => CODONS[c]).join("");
  const three = codons.map((c) => AMINO[CODONS[c]].three).join("-");
  const stopped = prot.endsWith("*");
  steps.push(
    { text: "Transkripsi: mRNA identik dengan untai pengkode, dengan U menggantikan T:", tex: `\\texttt{5'-${mrna.slice(0, 60)}${mrna.length > 60 ? "\\ldots" : ""}-3'}` },
    frame === "aug" ? `Translasi dimulai dari AUG pertama pada posisi ${start + 1}, lalu kita baca tiga basa sekaligus hingga kodon stop.` : `Translasi dimulai dari posisi ${start + 1} (bingkai baca ${frame}).`,
    `Translasi: ${codons.length} kodon → ${prot}${stopped ? " (tanda bintang menandakan kodon stop)" : " (tidak ditemukan kodon stop)"}.`,
    { text: "Kandungan GC dan perkiraan suhu leleh:", tex: `\\%GC = \\frac{${G} + ${C}}{${N}} \\times 100 = ${ntex(gc, 4)}\\%,\\quad T_m \\approx ${ntex(tm, 3)}\\,^{\\circ}C` }
  );
  const rows = codons.map((c, i) => {
    const a = AMINO[CODONS[c]];
    return [String(i + 1), c, CODONS[c], a.three, a.ar];
  });
  const blocks = [{ type: "table", ltr: false, caption: "Kodon dan asam amino", head: ["#", "Kodon", "Simbol", "Kode tiga huruf", "Asam amino"], rows }];
  if (!stopped) blocks.push({ type: "note", tone: "warn", text: "Urutan berakhir sebelum mencapai kodon stop, sehingga protein mungkin tidak lengkap." });
  if (frame === "aug" && start > 0) blocks.push({ type: "note", text: `Basa sebelum posisi ${start + 1} merupakan daerah yang tidak ditranslasi (5′ UTR).` });
  return {
    results: [
      { label: "Panjang", value: `${N} basa` },
      { label: "Untai komplementer (3′→5′)", value: comp },
      { label: "Komplemen terbalik (5′→3′)", value: rc },
      { label: "mRNA (5′→3′)", value: mrna },
      { label: "Protein (kode satu huruf)", value: prot },
      { label: "Protein (kode tiga huruf)", value: three },
      { label: "Kandungan GC", value: `${fmt(gc, 4)}%` },
      { label: "Perkiraan suhu leleh", value: `${fmt(tm, 3)} °C` },
      { label: "Jumlah basa", value: `A ${A}، ${strand === "rna" ? "U" : "T"} ${T}، G ${G}، C ${C}` }
    ],
    steps, blocks,
    copy: `mRNA: ${mrna} | Protein: ${prot} | GC = ${fmt(gc, 4)}% | Komplemen terbalik: ${rc}`
  };
}
