import { fail, str, choice } from "../core/validate.js";
import { fmt } from "../core/format.js";

export const meta = {
  description: "Draw a Punnett square for any cross between two parents (one gene up to four genes, or a trait linked to the X chromosome), and calculate the genotype and phenotype ratios and the probability of each, step by step.",
  keywords: ["Punnett square", "punnett square", "Mendelian inheritance", "Genotype", "Phenotype", "Dominant", "Recessive", "Dihybrid", "9:3:3:1", "Sex-linked", "X-linked"],
  formulas: [
    { label: "Number of gametes per parent", tex: "2^{h}\\ \\ (h = \\text{number of heterozygous genes})" },
    { label: "Product rule for independent genes", tex: "P(\\text{A\\_ bb}) = P(\\text{A\\_}) \\times P(\\text{bb})" }
  ],
  inputs: [
    { id: "mode", label: "Inheritance type", type: "select", default: "auto", options: [["auto", "Autosomal genes"], ["xlinked", "X-linked"]] },
    { id: "p1", label: "Genotype of the first parent", type: "text", default: "AaBb", help: "Write each gene as two consecutive letters: a capital letter for the dominant allele and a small letter for the recessive allele, such as Aa or AaBb. For X-linked inheritance, write the mother like XAXa." },
    { id: "p2", label: "Genotype of the second parent", type: "text", default: "AaBb", help: "For X-linked inheritance, write the father like XAY or XaY." },
    { id: "dominance", label: "Dominance type", type: "select", default: "complete", options: [["complete", "Complete dominance"], ["incomplete", "Incomplete dominance (heterozygote has an intermediate phenotype)"]], when: { mode: ["auto"] } }
  ],
  example: { values: { mode: "auto", p1: "AaBb", p2: "AaBb", dominance: "complete" }, expect: ["9:3:3:1"], note: "Example: a cross between two dihybrid plants in Mendel's experiment." },
  invalid: { values: { mode: "auto", p1: "AaB", p2: "AaBb", dominance: "complete" } },
  related: ["hardy-weinberg", "dna-tools", "probability-distributions"]
};

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const ratio = (counts) => { const g = counts.reduce(gcd); return counts.map((c) => c / g).join(":"); };
const pct = (c, t) => `${fmt((100 * c) / t, 4)}%`;

function parseAuto(raw, field) {
  const s = raw.replace(/\s+/g, "");
  if (!/^[A-Za-z]+$/.test(s)) fail("Use English letters only, such as AaBb.", field);
  if (s.length % 2) fail("Each gene is written with two letters (two alleles), so the number of letters must be even.", field);
  const genes = [];
  for (let i = 0; i < s.length; i += 2) {
    if (s[i].toLowerCase() !== s[i + 1].toLowerCase()) fail(`The letters «${s[i]}${s[i + 1]}» do not represent the same gene. Write each gene with two of the same letter, such as Aa.`, field);
    genes.push([s[i], s[i + 1]]);
  }
  if (genes.length > 4) fail("The maximum is four genes.", field);
  const letters = genes.map((g) => g[0].toLowerCase());
  if (new Set(letters).size !== letters.length) fail("Each gene must be written with a different letter.", field);
  return genes;
}

const orderPair = (a, b) => (a === a.toUpperCase() && b !== b.toUpperCase() ? a + b : b === b.toUpperCase() && a !== a.toUpperCase() ? b + a : a <= b ? a + b : b + a);

function gametes(genes) {
  return genes.reduce((acc, g) => acc.flatMap((x) => [x + g[0], x + g[1]]), [""]);
}

function autosomal(input) {
  const g1 = parseAuto(str(input, "p1", "Genotype of the first parent"), "p1");
  const g2 = parseAuto(str(input, "p2", "Genotype of the second parent"), "p2");
  const L1 = g1.map((g) => g[0].toLowerCase()).join(""), L2 = g2.map((g) => g[0].toLowerCase()).join("");
  if (L1 !== L2) fail(`Both parents must carry the same genes in the same order (${L1} versus ${L2}).`, "p2");
  const dom = choice(input, "dominance", "Dominance type", ["complete", "incomplete"], "complete");
  const G1 = gametes(g1), G2 = gametes(g2);
  const n = g1.length;
  const child = (a, b) => Array.from({ length: n }, (_, k) => orderPair(a[k], b[k])).join("");
  const pheno = (geno) => Array.from({ length: n }, (_, k) => {
    const pair = geno.slice(2 * k, 2 * k + 2), up = pair[0].toUpperCase(), lo = pair[0].toLowerCase();
    if (dom === "incomplete") return pair;
    return pair.includes(up) ? `${up}_` : lo + lo;
  }).join(" ");
  const genoCount = new Map(), phenoCount = new Map();
  for (const a of G1) for (const b of G2) {
    const c = child(a, b);
    genoCount.set(c, (genoCount.get(c) || 0) + 1);
    const p = pheno(c);
    phenoCount.set(p, (phenoCount.get(p) || 0) + 1);
  }
  const total = G1.length * G2.length;
  const rank = (s) => [...s].map((ch) => (ch === "_" || ch === ch.toUpperCase() ? "0" : "1")).join("");
  const genos = [...genoCount].sort((x, y) => rank(x[0]).localeCompare(rank(y[0])) || y[1] - x[1]);
  const phenos = [...phenoCount].sort((x, y) => (dom === "incomplete" ? 0 : y[1] - x[1]) || rank(x[0]).localeCompare(rank(y[0])));
  const pr = ratio(phenos.map((p) => p[1])), gr = ratio(genos.map((g) => g[1]));
  const blocks = [];
  const u1 = [...new Set(G1)], u2 = [...new Set(G2)];
  if (u1.length * u2.length <= 256) {
    blocks.push({ type: "table", ltr: true, caption: "Punnett square (gametes of the first parent across the top and of the second parent down the side)", head: [{ text: "♂ \\ ♀", th: true }, ...u1.map((g) => ({ text: g, th: true }))], rowHeaders: true, rows: u2.map((b) => [b, ...u1.map((a) => child(a, b))]) });
  }
  blocks.push({ type: "table", caption: "Phenotypes", head: ["Phenotype", "Count", "Probability"], rows: phenos.map(([p, c]) => [p, `${c}/${total}`, pct(c, total)]) });
  blocks.push({ type: "table", caption: "Genotypes", head: ["Genotype", "Count", "Probability"], rows: genos.map(([g, c]) => [g, `${c}/${total}`, pct(c, total)]) });
  const steps = [
    `Gametes of the first parent (${u1.length}): ${u1.join("، ")}.`,
    `Gametes of the second parent (${u2.length}): ${u2.join("، ")}.`,
    `Combining each gamete from the first parent with each gamete from the second parent gives ${total} equally likely combinations.`,
    dom === "complete" ? "In complete dominance the dominant phenotype (A_) appears if at least one dominant allele is present, and the recessive phenotype appears only with two recessive alleles." : "In incomplete dominance the heterozygote shows an intermediate phenotype, so each genotype is a separate phenotype.",
    `The phenotype ratio is ${pr}, and the genotype ratio is ${gr}.`
  ];
  return {
    results: [
      { label: "Phenotype ratio", value: pr },
      { label: "Genotype ratio", value: gr },
      { label: "Number of phenotypes / genotypes", value: `${phenos.length} / ${genos.length}` }
    ],
    steps, blocks,
    copy: `${g1.flat().join("")} × ${g2.flat().join("")}: phenotypes ${pr} (${phenos.map(([p, c]) => `${p} ${pct(c, total)}`).join("، ")}), genotypes ${gr}`
  };
}

function xlinked(input) {
  const m = str(input, "p1", "Mother's genotype").replace(/\s+/g, "").match(/^X\^?([A-Za-z])X\^?([A-Za-z])$/);
  if (!m) fail("Write the mother's genotype as XAXa or XaXa (one X chromosome with the allele of each).", "p1");
  const f = str(input, "p2", "Father's genotype").replace(/\s+/g, "").match(/^X\^?([A-Za-z])Y$/);
  if (!f) fail("Write the father's genotype as XAY or XaY.", "p2");
  if (new Set([m[1], m[2], f[1]].map((c) => c.toLowerCase())).size !== 1) fail("Use the same letter for the alleles in both parents.", "p2");
  const up = m[1].toUpperCase(), lo = up.toLowerCase();
  const mom = [m[1], m[2]], dad = [`X${f[1]}`, "Y"];
  const cells = [];
  for (const d of dad) for (const a of mom) {
    if (d === "Y") cells.push({ g: `X${a}Y`, sex: "son", aff: a === lo, carrier: false });
    else {
      const pair = orderPair(a, f[1]);
      cells.push({ g: `X${pair[0]}X${pair[1]}`, sex: "daughter", aff: pair === lo + lo, carrier: pair === up + lo });
    }
  }
  const ds = cells.filter((c) => c.sex === "daughter"), ss = cells.filter((c) => c.sex === "son");
  const P = (arr, f) => arr.filter(f).length / arr.length;
  const affD = P(ds, (c) => c.aff), carD = P(ds, (c) => c.carrier), affS = P(ss, (c) => c.aff), affAll = P(cells, (c) => c.aff);
  const p = (x) => `${fmt(100 * x, 4)}%`;
  return {
    results: [
      { label: "Probability that males are affected", value: p(affS) },
      { label: "Probability that females are affected", value: p(affD) },
      { label: "Probability that a female is a carrier", value: p(carD) },
      { label: "Probability that any offspring is affected", value: p(affAll) }
    ],
    steps: [
      `Mother's gametes: X${mom[0]} and X${mom[1]}. Father's gametes: ${dad[0]} and Y.`,
      "Sons receive X from the mother and Y from the father, so they show the mother's allele directly.",
      "Daughters receive an X from each parent, so a daughter is affected by a recessive trait only if she carries two recessive alleles.",
      `Result: affected males ${p(affS)}, affected females ${p(affD)}, carrier females ${p(carD)}.`
    ],
    blocks: [{ type: "table", ltr: true, caption: "Punnett square for X-linked inheritance", head: [{ text: "♂ \\ ♀", th: true }, ...mom.map((a) => ({ text: `X${a}`, th: true }))], rowHeaders: true, rows: dad.map((d, i) => [d, ...cells.slice(2 * i, 2 * i + 2).map((c) => `${c.g}${c.aff ? " (affected)" : c.carrier ? " (carrier)" : ""}`)]) }],
    copy: `X${mom.join("X")} × ${dad[0]}Y: affected males ${p(affS)}, affected females ${p(affD)}, carrier females ${p(carD)}`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Inheritance type", ["auto", "xlinked"], "auto");
  return mode === "auto" ? autosomal(input) : xlinked(input);
}
