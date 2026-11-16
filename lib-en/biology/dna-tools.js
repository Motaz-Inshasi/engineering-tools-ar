import { fail, str, choice } from "../core/validate.js";
import { fmt, tex as ntex } from "../core/format.js";
import { CODONS, AMINO } from "./codons.js";

export const meta = {
  description: "Analyze a DNA or RNA sequence: the complementary and reverse complementary strands, transcription into mRNA, translation into protein using the genetic code, GC content and an approximate melting temperature.",
  keywords: ["DNA", "RNA", "mRNA", "Transcription", "Translation", "Genetic code", "Codon", "codon", "Protein", "Amino acids", "Complementary strand", "reverse complement", "GC content", "Melting temperature"],
  formulas: [
    { label: "GC content", tex: "\\%GC = \\frac{G + C}{N} \\times 100" },
    { label: "Approximate melting temperature", tex: "T_m = 2(A+T) + 4(G+C)\\ \\ (N < 14),\\qquad T_m = 64.9 + 41\\,\\frac{G + C - 16.4}{N}" }
  ],
  inputs: [
    { id: "seq", label: "Sequence", type: "textarea", default: "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG", wide: true, help: "Only the letters A, T (or U), G and C. Spaces, digits and line breaks are ignored." },
    { id: "strand", label: "Input strand type", type: "select", default: "coding", options: [["coding", "DNA coding strand (5′→3′)"], ["template", "DNA template strand (3′→5′)"], ["rna", "mRNA (5′→3′)"]] },
    { id: "frame", label: "Translation start", type: "select", default: "aug", options: [["aug", "From the first AUG start codon"], ["1", "Reading frame 1"], ["2", "Reading frame 2"], ["3", "Reading frame 3"]] }
  ],
  example: { values: { seq: "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG", strand: "coding", frame: "aug" }, expect: ["MAIVMGR*", "GC = 56.41%"], note: "Example: a short gene that starts with ATG and ends with a stop codon." },
  invalid: { values: { seq: "ATGXYZ", strand: "coding", frame: "aug" } },
  related: ["punnett-square", "hardy-weinberg", "molar-mass"]
};

const COMP = { A: "T", T: "A", G: "C", C: "G", U: "A" };

export function solve(input) {
  const raw = str(input, "seq", "Sequence").toUpperCase().replace(/[\s\d\-'′5]/g, "").replace(/^5|3$/g, "");
  const strand = choice(input, "strand", "Strand type", ["coding", "template", "rna"], "coding");
  const frame = choice(input, "frame", "Translation start", ["aug", "1", "2", "3"], "aug");
  const bad = raw.match(/[^ACGTU]/);
  if (bad) fail(`The character «${bad[0]}» is not a nucleotide base. Use only A, C, G, T or U.`, "seq");
  if (!raw.length) fail("Enter the sequence.", "seq");
  if (raw.includes("T") && raw.includes("U")) fail("The sequence contains both T and U. DNA uses T and RNA uses U.", "seq");
  if (strand === "rna" && raw.includes("T")) fail("You selected mRNA but the sequence contains T. Change the type to DNA or replace T with U.", "strand");
  if (strand !== "rna" && raw.includes("U")) fail("You selected DNA but the sequence contains U. Change the type to mRNA.", "strand");
  const steps = [];
  let coding;
  if (strand === "coding") { coding = raw; steps.push("The coding strand has the same sequence as the mRNA, with T replaced by U."); }
  else if (strand === "template") { coding = [...raw].map((b) => COMP[b]).join(""); steps.push("The template strand is read 3′→5′, so we take its complement (A↔T and G↔C) to get the coding strand 5′→3′."); }
  else { coding = raw.replace(/U/g, "T"); steps.push("The mRNA was entered directly, so the DNA coding strand is the same sequence with U replaced by T."); }
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
    if (start < 0) fail("There is no AUG start codon in the sequence. Choose a specific reading frame instead.", "frame");
  } else start = Number(frame) - 1;
  const codons = [];
  for (let i = start; i + 3 <= mrna.length; i += 3) {
    const c = mrna.slice(i, i + 3);
    codons.push(c);
    if (CODONS[c] === "*") break;
  }
  if (!codons.length) fail("The sequence is shorter than one codon in this frame.", "seq");
  const prot = codons.map((c) => CODONS[c]).join("");
  const three = codons.map((c) => AMINO[CODONS[c]].three).join("-");
  const stopped = prot.endsWith("*");
  steps.push(
    { text: "Transcription: the mRNA is identical to the coding strand, with U in place of T:", tex: `\\texttt{5'-${mrna.slice(0, 60)}${mrna.length > 60 ? "\\ldots" : ""}-3'}` },
    frame === "aug" ? `Translation starts at the first AUG at position ${start + 1}. We read three bases at a time until the stop codon.` : `Translation starts at position ${start + 1} (reading frame ${frame}).`,
    `Translation: ${codons.length} codons → ${prot}${stopped ? " (the asterisk marks a stop codon)" : " (no stop codon was found)"}.`,
    { text: "GC content and approximate melting temperature:", tex: `\\%GC = \\frac{${G} + ${C}}{${N}} \\times 100 = ${ntex(gc, 4)}\\%,\\quad T_m \\approx ${ntex(tm, 3)}\\,^{\\circ}C` }
  );
  const rows = codons.map((c, i) => {
    const a = AMINO[CODONS[c]];
    return [String(i + 1), c, CODONS[c], a.three, a.ar];
  });
  const blocks = [{ type: "table", ltr: false, caption: "Codons and amino acids", head: ["#", "Codon", "Symbol", "Three-letter code", "Amino acid"], rows }];
  if (!stopped) blocks.push({ type: "note", tone: "warn", text: "The sequence ended before a stop codon was reached, so the protein may be incomplete." });
  if (frame === "aug" && start > 0) blocks.push({ type: "note", text: `The bases before position ${start + 1} are an untranslated region (5′ UTR).` });
  return {
    results: [
      { label: "Length", value: `${N} bases` },
      { label: "Complementary strand (3′→5′)", value: comp },
      { label: "Reverse complement (5′→3′)", value: rc },
      { label: "mRNA (5′→3′)", value: mrna },
      { label: "Protein (one-letter code)", value: prot },
      { label: "Protein (three-letter code)", value: three },
      { label: "GC content", value: `${fmt(gc, 4)}%` },
      { label: "Approximate melting temperature", value: `${fmt(tm, 3)} °C` },
      { label: "Base count", value: `A ${A}، ${strand === "rna" ? "U" : "T"} ${T}، G ${G}، C ${C}` }
    ],
    steps, blocks,
    copy: `mRNA: ${mrna} | Protein: ${prot} | GC = ${fmt(gc, 4)}% | Reverse complement: ${rc}`
  };
}
