import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CHI_CRIT = 3.841;

export const meta = {
  description: "Apply Hardy-Weinberg equilibrium to calculate allele and genotype frequencies from the frequency of the recessive trait, or test whether observed individual counts fit equilibrium using a chi-square test.",
  keywords: ["Hardy-Weinberg", "Hardy-Weinberg", "Allele frequency", "Carriers", "Inheritance", "Chi-square", "chi-square", "Population genetics"],
  formulas: [
    { label: "Equilibrium equation", tex: "p^2 + 2pq + q^2 = 1,\\qquad p + q = 1" },
    { label: "Chi-square test (df = 1)", tex: "\\chi^2 = \\sum \\frac{(O - E)^2}{E}" }
  ],
  inputs: [
    { id: "mode", label: "Calculation method", type: "select", default: "recessive", options: [["recessive", "From the frequency of the recessive trait"], ["counts", "From observed individual counts"]] },
    { id: "pheno", label: "Frequency of the recessive trait (aa)", type: "number", default: "0.04", when: { mode: ["recessive"] }, help: "Individuals with the recessive trait have only the aa genotype." },
    { id: "phenoUnit", label: "Frequency unit", type: "select", default: "fraction", options: [["fraction", "Fraction (from 0 to 1)"], ["percent", "Percentage (%)"]], when: { mode: ["recessive"] } },
    { id: "nAA", label: "Number of AA individuals", type: "number", default: "36", when: { mode: ["counts"] } },
    { id: "nAa", label: "Number of Aa individuals", type: "number", default: "48", when: { mode: ["counts"] } },
    { id: "naa", label: "Number of aa individuals", type: "number", default: "16", when: { mode: ["counts"] } }
  ],
  example: { values: { mode: "counts", pheno: "0.04", phenoUnit: "fraction", nAA: "36", nAa: "48", naa: "16" }, expect: ["p = 0.6", "χ² = 0"], note: "Example: 36 AA, 48 Aa and 16 aa individuals match equilibrium exactly." },
  invalid: { values: { mode: "recessive", pheno: "1.5", phenoUnit: "fraction", nAA: "0", nAa: "0", naa: "0" } },
  related: ["punnett-square", "dna-tools"]
};

function fromPheno(input) {
  const unit = choice(input, "phenoUnit", "Frequency unit", ["fraction", "percent"], "fraction");
  const raw = num(input, "pheno", "Frequency of the recessive trait", { nonNegative: true });
  const max = unit === "percent" ? 100 : 1;
  if (raw > max) fail(`The frequency of the recessive trait must not exceed ${max}${unit === "percent" ? "٪" : ""}.`, "pheno");
  const qq = unit === "percent" ? raw / 100 : raw;
  const q = Math.sqrt(qq);
  const p = 1 - q;
  const pp = p * p;
  const twopq = 2 * p * q;
  const carriers = twopq * 1000;
  return {
    results: [
      { label: "Recessive allele frequency q", value: fmt(q, 4) },
      { label: "Dominant allele frequency p", value: fmt(p, 4) },
      { label: "AA genotype (p²)", value: `${fmt(pp, 4)} ≈ ${fmt(pp * 1000, 4)} out of 1000` },
      { label: "Aa genotype (2pq)", value: `${fmt(twopq, 4)} ≈ ${fmt(carriers, 4)} out of 1000` },
      { label: "aa genotype (q²)", value: `${fmt(qq, 4)} ≈ ${fmt(qq * 1000, 4)} out of 1000` },
      { label: "Number of carriers per 1000 individuals", value: fmt(carriers, 4) }
    ],
    steps: [
      { text: "The frequency of the recessive genotype aa is q²:", tex: `q^2 = ${ntex(qq)}` },
      { text: "Take the square root to find q:", tex: `q = \\sqrt{${ntex(qq)}} = ${ntex(q, 6)}` },
      { text: "From the relation p + q = 1:", tex: `p = 1 - q = ${ntex(p, 6)}` },
      { text: "Frequency of carriers Aa:", tex: `2pq = 2 \\times ${ntex(p, 6)} \\times ${ntex(q, 6)} = ${ntex(twopq, 6)}` }
    ],
    copy: `q = ${fmt(q, 4)}, p = ${fmt(p, 4)}, carriers per 1000 = ${fmt(carriers, 4)}`,
    blocks: [
      { type: "table", caption: "Expected genotypes", head: ["Genotype", "Expected frequency", "Per 1000 individuals"], rows: [["AA (dominant)", fmt(pp, 4), fmt(pp * 1000, 4)], ["Aa (carrier)", fmt(twopq, 4), fmt(carriers, 4)], ["aa (recessive)", fmt(qq, 4), fmt(qq * 1000, 4)]], ltr: true },
      { type: "note", text: "Equilibrium assumes a large population, random mating, and no mutation, migration or natural selection." }
    ]
  };
}

function fromCounts(input) {
  const AA = num(input, "nAA", "Number of AA individuals", { integer: true, nonNegative: true });
  const Aa = num(input, "nAa", "Number of Aa individuals", { integer: true, nonNegative: true });
  const aa = num(input, "naa", "Number of aa individuals", { integer: true, nonNegative: true });
  const N = AA + Aa + aa;
  if (N === 0) fail("The total number of individuals must be greater than zero.", "nAA");
  const p = (2 * AA + Aa) / (2 * N);
  const q = 1 - p;
  const O = [AA, Aa, aa];
  const E = [p * p * N, 2 * p * q * N, q * q * N];
  let chi = 0;
  for (let i = 0; i < 3; i++) if (E[i] > 0) chi += ((O[i] - E[i]) ** 2) / E[i];
  if (chi < 1e-12) chi = 0;
  const significant = chi >= CHI_CRIT;
  const verdict = significant
    ? "There is a significant deviation from Hardy-Weinberg equilibrium at the 0.05 level."
    : "There is no significant deviation from Hardy-Weinberg equilibrium at the 0.05 level.";
  const blocks = [{
    type: "table",
    caption: "Observed vs. expected",
    head: ["Genotype", "Observed O", "Expected E", "(O − E)² / E"],
    rows: [
      ["AA", String(AA), fmt(E[0], 4), fmt(E[0] > 0 ? ((AA - E[0]) ** 2) / E[0] : 0, 4)],
      ["Aa", String(Aa), fmt(E[1], 4), fmt(E[1] > 0 ? ((Aa - E[1]) ** 2) / E[1] : 0, 4)],
      ["aa", String(aa), fmt(E[2], 4), fmt(E[2] > 0 ? ((aa - E[2]) ** 2) / E[2] : 0, 4)]
    ],
    ltr: true
  }];
  if (E.some((e) => e < 5)) blocks.push({ type: "note", tone: "warn", text: "Some expected counts are less than 5, so the χ² test may be inaccurate." });
  return {
    results: [
      { label: "Number of individuals N", value: String(N) },
      { label: "Allele A frequency (p)", value: fmt(p, 4) },
      { label: "Allele a frequency (q)", value: fmt(q, 4) },
      { label: "Expected counts AA / Aa / aa", value: `${fmt(E[0], 4)} / ${fmt(E[1], 4)} / ${fmt(E[2], 4)}` },
      { label: "χ² value", value: fmt(chi, 4) },
      { label: "Statistical result", value: significant ? "Significant deviation" : "No significant deviation" , text: verdict }
    ],
    steps: [
      { text: "Frequency of allele A among the observed alleles:", tex: `p = \\frac{2 \\times ${AA} + ${Aa}}{2 \\times ${N}} = ${ntex(p, 6)}` },
      { text: "Frequency of allele a:", tex: `q = 1 - p = ${ntex(q, 6)}` },
      { text: "Expected counts at equilibrium:", tex: `E_{AA} = p^2 N,\\; E_{Aa} = 2pqN,\\; E_{aa} = q^2 N = ${fmt(E[0], 4)},\\ ${fmt(E[1], 4)},\\ ${fmt(E[2], 4)}` },
      { text: "Chi-square value (df = 1):", tex: `\\chi^2 = \\sum \\frac{(O-E)^2}{E} = ${ntex(chi, 6)}` },
      `Conclusion: if χ² is greater than or equal to ${CHI_CRIT} (the critical value at 0.05 with 1 degree of freedom), equilibrium is rejected.`
    ],
    copy: `p = ${fmt(p, 4)}، q = ${fmt(q, 4)}، χ² = ${fmt(chi, 4)} (df = 1) — ${significant ? "Significant deviation" : "Consistent with equilibrium"}`,
    blocks
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Calculation method", ["recessive", "counts"], "recessive");
  return mode === "counts" ? fromCounts(input) : fromPheno(input);
}
