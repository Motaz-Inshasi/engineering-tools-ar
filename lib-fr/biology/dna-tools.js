import { fail, str, choice } from "../core/validate.js";
import { fmt, tex as ntex } from "../core/format.js";
import { CODONS, AMINO } from "./codons.js";

export const meta = {
  description: "Analysez une séquence d'ADN ou d'ARN : brin complémentaire et complément inverse, transcription en ARNm, traduction en protéine selon le code génétique, pourcentage de GC et température de fusion approximative.",
  keywords: ["DNA", "RNA", "mRNA", "Transcription", "Traduction", "Code génétique", "Codon", "codon", "Protéine", "Acides aminés", "Brin complémentaire", "reverse complement", "GC content", "Température de fusion"],
  formulas: [
    { label: "Teneur en GC", tex: "\\%GC = \\frac{G + C}{N} \\times 100" },
    { label: "Température de fusion approximative", tex: "T_m = 2(A+T) + 4(G+C)\\ \\ (N < 14),\\qquad T_m = 64.9 + 41\\,\\frac{G + C - 16.4}{N}" }
  ],
  inputs: [
    { id: "seq", label: "Séquence", type: "textarea", default: "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG", wide: true, help: "Lettres A, T (ou U), G et C uniquement. Les espaces, les chiffres et les retours à la ligne sont ignorés." },
    { id: "strand", label: "Type de brin saisi", type: "select", default: "coding", options: [["coding", "ADN brin codant (5′→3′)"], ["template", "ADN brin matrice (3′→5′)"], ["rna", "mRNA (5′→3′)"]] },
    { id: "frame", label: "Début de la traduction", type: "select", default: "aug", options: [["aug", "À partir du premier codon d'initiation AUG"], ["1", "Cadre de lecture 1"], ["2", "Cadre de lecture 2"], ["3", "Cadre de lecture 3"]] }
  ],
  example: { values: { seq: "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG", strand: "coding", frame: "aug" }, expect: ["MAIVMGR*", "GC = 56.41%"], note: "Exemple : un court gène qui commence par ATG et se termine par un codon stop." },
  invalid: { values: { seq: "ATGXYZ", strand: "coding", frame: "aug" } },
  related: ["punnett-square", "hardy-weinberg", "molar-mass"]
};

const COMP = { A: "T", T: "A", G: "C", C: "G", U: "A" };

export function solve(input) {
  const raw = str(input, "seq", "Séquence").toUpperCase().replace(/[\s\d\-'′5]/g, "").replace(/^5|3$/g, "");
  const strand = choice(input, "strand", "Type de brin", ["coding", "template", "rna"], "coding");
  const frame = choice(input, "frame", "Début de la traduction", ["aug", "1", "2", "3"], "aug");
  const bad = raw.match(/[^ACGTU]/);
  if (bad) fail(`Le caractère «${bad[0]}» n'est pas une base azotée. Utilisez uniquement A, C, G, T ou U.`, "seq");
  if (!raw.length) fail("Saisissez la séquence.", "seq");
  if (raw.includes("T") && raw.includes("U")) fail("La séquence contient à la fois T et U ; l'ADN utilise T et l'ARN utilise U.", "seq");
  if (strand === "rna" && raw.includes("T")) fail("Vous avez choisi l'ARNm, mais la séquence contient T. Changez le type en ADN ou remplacez T par U.", "strand");
  if (strand !== "rna" && raw.includes("U")) fail("Vous avez choisi l'ADN, mais la séquence contient U. Changez le type en ARNm.", "strand");
  const steps = [];
  let coding;
  if (strand === "coding") { coding = raw; steps.push("Le brin codant a la même séquence que l'ARNm, avec T remplacé par U."); }
  else if (strand === "template") { coding = [...raw].map((b) => COMP[b]).join(""); steps.push("Le brin matrice se lit de 3′ vers 5′ ; on prend son complémentaire (A↔T et G↔C) pour obtenir le brin codant 5′→3′."); }
  else { coding = raw.replace(/U/g, "T"); steps.push("L'ARNm a été saisi directement ; le brin codant d'ADN est identique, avec U remplacé par T."); }
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
    if (start < 0) fail("Aucun codon d'initiation AUG dans la séquence. Choisissez plutôt un cadre de lecture précis.", "frame");
  } else start = Number(frame) - 1;
  const codons = [];
  for (let i = start; i + 3 <= mrna.length; i += 3) {
    const c = mrna.slice(i, i + 3);
    codons.push(c);
    if (CODONS[c] === "*") break;
  }
  if (!codons.length) fail("La séquence est plus courte qu'un codon dans ce cadre.", "seq");
  const prot = codons.map((c) => CODONS[c]).join("");
  const three = codons.map((c) => AMINO[CODONS[c]].three).join("-");
  const stopped = prot.endsWith("*");
  steps.push(
    { text: "Transcription : l'ARNm est identique au brin codant, avec U à la place de T :", tex: `\\texttt{5'-${mrna.slice(0, 60)}${mrna.length > 60 ? "\\ldots" : ""}-3'}` },
    frame === "aug" ? `On commence la traduction au premier AUG en position ${start + 1} et l'on lit trois bases à la fois jusqu'au codon stop.` : `On commence la traduction à la position ${start + 1} (cadre de lecture ${frame}).`,
    `Traduction : ${codons.length} codons ← ${prot}${stopped ? " (l'astérisque indique un codon stop)" : " (aucun codon stop rencontré)"}.`,
    { text: "Teneur en GC et température de fusion approximative :", tex: `\\%GC = \\frac{${G} + ${C}}{${N}} \\times 100 = ${ntex(gc, 4)}\\%,\\quad T_m \\approx ${ntex(tm, 3)}\\,^{\\circ}C` }
  );
  const rows = codons.map((c, i) => {
    const a = AMINO[CODONS[c]];
    return [String(i + 1), c, CODONS[c], a.three, a.ar];
  });
  const blocks = [{ type: "table", ltr: false, caption: "Codons et acides aminés", head: ["#", "Codon", "Symbole", "Symbole à trois lettres", "Acide aminé"], rows }];
  if (!stopped) blocks.push({ type: "note", tone: "warn", text: "La séquence s'est terminée avant un codon stop ; la protéine est peut-être incomplète." });
  if (frame === "aug" && start > 0) blocks.push({ type: "note", text: `Les bases situées avant la position ${start + 1} forment une région non traduite en 5′ (5′ UTR).` });
  return {
    results: [
      { label: "Longueur", value: `${N} bases` },
      { label: "Brin complémentaire (3′→5′)", value: comp },
      { label: "Complément inverse (5′→3′)", value: rc },
      { label: "mRNA (5′→3′)", value: mrna },
      { label: "Protéine (code à une lettre)", value: prot },
      { label: "Protéine (code à trois lettres)", value: three },
      { label: "Teneur en GC", value: `${fmt(gc, 4)}%` },
      { label: "Température de fusion approximative", value: `${fmt(tm, 3)} °C` },
      { label: "Composition en bases", value: `A ${A}، ${strand === "rna" ? "U" : "T"} ${T}، G ${G}، C ${C}` }
    ],
    steps, blocks,
    copy: `ARNm : ${mrna} | Protéine : ${prot} | GC = ${fmt(gc, 4)}% | Complément inverse : ${rc}`
  };
}
