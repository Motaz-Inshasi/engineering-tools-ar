import { fail, str, choice } from "../core/validate.js";
import { fmt, tex as ntex } from "../core/format.js";
import { CODONS, AMINO } from "./codons.js";

export const meta = {
  description: "Analiza una secuencia de ADN o ARN: la cadena complementaria y la complementaria inversa, la transcripción a ARNm, la traducción a proteína con el código genético, el porcentaje de GC y la temperatura de fusión aproximada.",
  keywords: ["DNA", "RNA", "mRNA", "Transcripción", "Traducción", "Código genético", "Codón", "codon", "Proteína", "Aminoácidos", "Cadena complementaria", "reverse complement", "GC content", "Temperatura de fusión"],
  formulas: [
    { label: "Porcentaje GC", tex: "\\%GC = \\frac{G + C}{N} \\times 100" },
    { label: "Temperatura de fusión aproximada", tex: "T_m = 2(A+T) + 4(G+C)\\ \\ (N < 14),\\qquad T_m = 64.9 + 41\\,\\frac{G + C - 16.4}{N}" }
  ],
  inputs: [
    { id: "seq", label: "Secuencia", type: "textarea", default: "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG", wide: true, help: "Solo letras A, T (o U), G y C. Los espacios, los números y los saltos de línea se ignoran." },
    { id: "strand", label: "Tipo de cadena introducida", type: "select", default: "coding", options: [["coding", "ADN, cadena codificante (5′→3′)"], ["template", "ADN, cadena molde (3′→5′)"], ["rna", "mRNA (5′→3′)"]] },
    { id: "frame", label: "Inicio de la traducción", type: "select", default: "aug", options: [["aug", "Desde el primer codón de inicio AUG"], ["1", "Marco de lectura 1"], ["2", "Marco de lectura 2"], ["3", "Marco de lectura 3"]] }
  ],
  example: { values: { seq: "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG", strand: "coding", frame: "aug" }, expect: ["MAIVMGR*", "GC = 56.41%"], note: "Ejemplo: gen corto que empieza con ATG y termina en un codón de parada." },
  invalid: { values: { seq: "ATGXYZ", strand: "coding", frame: "aug" } },
  related: ["punnett-square", "hardy-weinberg", "molar-mass"]
};

const COMP = { A: "T", T: "A", G: "C", C: "G", U: "A" };

export function solve(input) {
  const raw = str(input, "seq", "Secuencia").toUpperCase().replace(/[\s\d\-'′5]/g, "").replace(/^5|3$/g, "");
  const strand = choice(input, "strand", "Tipo de cadena", ["coding", "template", "rna"], "coding");
  const frame = choice(input, "frame", "Inicio de la traducción", ["aug", "1", "2", "3"], "aug");
  const bad = raw.match(/[^ACGTU]/);
  if (bad) fail(`La letra «${bad[0]}» no es una base nitrogenada. Use solo A, C, G, T o U.`, "seq");
  if (!raw.length) fail("Introduzca la secuencia.", "seq");
  if (raw.includes("T") && raw.includes("U")) fail("La secuencia contiene T y U a la vez; el ADN usa T y el ARN usa U.", "seq");
  if (strand === "rna" && raw.includes("T")) fail("Ha elegido ARNm, pero la secuencia contiene T. Cambie el tipo a ADN o reemplace T por U.", "strand");
  if (strand !== "rna" && raw.includes("U")) fail("Ha elegido ADN, pero la secuencia contiene U. Cambie el tipo a ARNm.", "strand");
  const steps = [];
  let coding;
  if (strand === "coding") { coding = raw; steps.push("La cadena codificante tiene la misma secuencia que el ARNm, con U en lugar de T."); }
  else if (strand === "template") { coding = [...raw].map((b) => COMP[b]).join(""); steps.push("La cadena molde se lee 3′→5′, así que tomamos su complementaria (A↔T y G↔C) para obtener la cadena codificante 5′→3′."); }
  else { coding = raw.replace(/U/g, "T"); steps.push("Se introduce ARNm directamente, así que la cadena codificante de ADN es la misma con T en lugar de U."); }
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
    if (start < 0) fail("No hay codón de inicio AUG en la secuencia. Elija un marco de lectura específico en su lugar.", "frame");
  } else start = Number(frame) - 1;
  const codons = [];
  for (let i = start; i + 3 <= mrna.length; i += 3) {
    const c = mrna.slice(i, i + 3);
    codons.push(c);
    if (CODONS[c] === "*") break;
  }
  if (!codons.length) fail("La secuencia es más corta que un codón en este marco.", "seq");
  const prot = codons.map((c) => CODONS[c]).join("");
  const three = codons.map((c) => AMINO[CODONS[c]].three).join("-");
  const stopped = prot.endsWith("*");
  steps.push(
    { text: "Transcripción: ARNm idéntico a la cadena codificante con U en lugar de T:", tex: `\\texttt{5'-${mrna.slice(0, 60)}${mrna.length > 60 ? "\\ldots" : ""}-3'}` },
    frame === "aug" ? `Iniciamos la traducción en el primer AUG, en la posición ${start + 1}, y leemos tres bases cada vez hasta el codón de parada.` : `Iniciamos la traducción en la posición ${start + 1} (marco de lectura ${frame}).`,
    `Traducción: ${codons.length} codones → ${prot}${stopped ? " (el asterisco indica un codón de parada)" : " (no se encontró ningún codón de parada)"}.`,
    { text: "Proporción GC y temperatura de fusión aproximada:", tex: `\\%GC = \\frac{${G} + ${C}}{${N}} \\times 100 = ${ntex(gc, 4)}\\%,\\quad T_m \\approx ${ntex(tm, 3)}\\,^{\\circ}C` }
  );
  const rows = codons.map((c, i) => {
    const a = AMINO[CODONS[c]];
    return [String(i + 1), c, CODONS[c], a.three, a.ar];
  });
  const blocks = [{ type: "table", ltr: false, caption: "Codones y aminoácidos", head: ["#", "Codón", "Símbolo", "Abreviatura de tres letras", "Aminoácido"], rows }];
  if (!stopped) blocks.push({ type: "note", tone: "warn", text: "La secuencia terminó antes de llegar a un codón de parada, por lo que la proteína podría estar incompleta." });
  if (frame === "aug" && start > 0) blocks.push({ type: "note", text: `Las bases antes de la posición ${start + 1} forman una región no traducida (5′ UTR).` });
  return {
    results: [
      { label: "Longitud", value: `${N} bases` },
      { label: "Cadena complementaria (3′→5′)", value: comp },
      { label: "Complementaria inversa (5′→3′)", value: rc },
      { label: "mRNA (5′→3′)", value: mrna },
      { label: "Proteína (código de una letra)", value: prot },
      { label: "Proteína (código de tres letras)", value: three },
      { label: "Porcentaje GC", value: `${fmt(gc, 4)}%` },
      { label: "Temperatura de fusión aproximada", value: `${fmt(tm, 3)} °C` },
      { label: "Frecuencia de bases", value: `A ${A}، ${strand === "rna" ? "U" : "T"} ${T}، G ${G}، C ${C}` }
    ],
    steps, blocks,
    copy: `ARNm: ${mrna} | Proteína: ${prot} | GC = ${fmt(gc, 4)}% | Complementaria inversa: ${rc}`
  };
}
