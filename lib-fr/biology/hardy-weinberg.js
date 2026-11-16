import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CHI_CRIT = 3.841;

export const meta = {
  description: "Appliquez l'équilibre de Hardy-Weinberg pour calculer les fréquences alléliques et génotypiques à partir de la fréquence du caractère récessif, ou testez par le khi-deux la conformité des effectifs observés à l'équilibre.",
  keywords: ["Hardy-Weinberg", "Hardy-Weinberg", "Fréquence allélique", "Porteurs", "Hérédité", "Khi-deux", "chi-square", "Génétique observée"],
  formulas: [
    { label: "Équation d'équilibre", tex: "p^2 + 2pq + q^2 = 1,\\qquad p + q = 1" },
    { label: "Test du khi-deux (ddl = 1)", tex: "\\chi^2 = \\sum \\frac{(O - E)^2}{E}" }
  ],
  inputs: [
    { id: "mode", label: "Méthode de calcul", type: "select", default: "recessive", options: [["recessive", "À partir de la fréquence du caractère récessif"], ["counts", "À partir des effectifs observés"]] },
    { id: "pheno", label: "Fréquence du caractère récessif (aa)", type: "number", default: "0.04", when: { mode: ["recessive"] }, help: "Les individus atteints du caractère récessif sont uniquement de génotype aa." },
    { id: "phenoUnit", label: "Unité de fréquence", type: "select", default: "fraction", options: [["fraction", "Fraction (de 0 à 1)"], ["percent", "Pourcentage (%)"]], when: { mode: ["recessive"] } },
    { id: "nAA", label: "Nombre d'individus AA", type: "number", default: "36", when: { mode: ["counts"] } },
    { id: "nAa", label: "Nombre d'individus Aa", type: "number", default: "48", when: { mode: ["counts"] } },
    { id: "naa", label: "Nombre d'individus aa", type: "number", default: "16", when: { mode: ["counts"] } }
  ],
  example: { values: { mode: "counts", pheno: "0.04", phenoUnit: "fraction", nAA: "36", nAa: "48", naa: "16" }, expect: ["p = 0.6", "χ² = 0"], note: "Exemple : 36 AA, 48 Aa et 16 aa correspondent exactement à l'équilibre." },
  invalid: { values: { mode: "recessive", pheno: "1.5", phenoUnit: "fraction", nAA: "0", nAa: "0", naa: "0" } },
  related: ["punnett-square", "dna-tools"]
};

function fromPheno(input) {
  const unit = choice(input, "phenoUnit", "Unité de fréquence", ["fraction", "percent"], "fraction");
  const raw = num(input, "pheno", "Fréquence du caractère récessif", { nonNegative: true });
  const max = unit === "percent" ? 100 : 1;
  if (raw > max) fail(`La fréquence du caractère récessif ne doit pas dépasser ${max}${unit === "percent" ? "٪" : ""}.`, "pheno");
  const qq = unit === "percent" ? raw / 100 : raw;
  const q = Math.sqrt(qq);
  const p = 1 - q;
  const pp = p * p;
  const twopq = 2 * p * q;
  const carriers = twopq * 1000;
  return {
    results: [
      { label: "Fréquence de l'allèle récessif q", value: fmt(q, 4) },
      { label: "Fréquence de l'allèle dominant p", value: fmt(p, 4) },
      { label: "Génotype AA (p²)", value: `${fmt(pp, 4)} ≈ ${fmt(pp * 1000, 4)} sur 1000` },
      { label: "Génotype Aa (2pq)", value: `${fmt(twopq, 4)} ≈ ${fmt(carriers, 4)} sur 1000` },
      { label: "Génotype aa (q²)", value: `${fmt(qq, 4)} ≈ ${fmt(qq * 1000, 4)} sur 1000` },
      { label: "Nombre de porteurs pour 1000 individus", value: fmt(carriers, 4) }
    ],
    steps: [
      { text: "La fréquence du génotype récessif aa est q² :", tex: `q^2 = ${ntex(qq)}` },
      { text: "On prend la racine carrée pour trouver q :", tex: `q = \\sqrt{${ntex(qq)}} = ${ntex(q, 6)}` },
      { text: "D'après la relation p + q = 1 :", tex: `p = 1 - q = ${ntex(p, 6)}` },
      { text: "Fréquence des porteurs Aa :", tex: `2pq = 2 \\times ${ntex(p, 6)} \\times ${ntex(q, 6)} = ${ntex(twopq, 6)}` }
    ],
    copy: `q = ${fmt(q, 4)}, p = ${fmt(p, 4)}, porteurs pour 1000 = ${fmt(carriers, 4)}`,
    blocks: [
      { type: "table", caption: "Génotypes attendus", head: ["Génotype", "Fréquence attendue", "Pour 1000 individus"], rows: [["AA (dominant)", fmt(pp, 4), fmt(pp * 1000, 4)], ["Aa (porteur)", fmt(twopq, 4), fmt(carriers, 4)], ["aa (récessif)", fmt(qq, 4), fmt(qq * 1000, 4)]], ltr: true },
      { type: "note", text: "L'équilibre suppose une grande population, des croisements aléatoires, et l'absence de mutation, de migration et de sélection naturelle." }
    ]
  };
}

function fromCounts(input) {
  const AA = num(input, "nAA", "Nombre d'individus AA", { integer: true, nonNegative: true });
  const Aa = num(input, "nAa", "Nombre d'individus Aa", { integer: true, nonNegative: true });
  const aa = num(input, "naa", "Nombre d'individus aa", { integer: true, nonNegative: true });
  const N = AA + Aa + aa;
  if (N === 0) fail("La somme des individus doit être supérieure à zéro.", "nAA");
  const p = (2 * AA + Aa) / (2 * N);
  const q = 1 - p;
  const O = [AA, Aa, aa];
  const E = [p * p * N, 2 * p * q * N, q * q * N];
  let chi = 0;
  for (let i = 0; i < 3; i++) if (E[i] > 0) chi += ((O[i] - E[i]) ** 2) / E[i];
  if (chi < 1e-12) chi = 0;
  const significant = chi >= CHI_CRIT;
  const verdict = significant
    ? "Il existe un écart significatif par rapport à l'équilibre de Hardy-Weinberg au seuil de 0.05."
    : "Il n'existe pas d'écart significatif par rapport à l'équilibre de Hardy-Weinberg au seuil de 0.05.";
  const blocks = [{
    type: "table",
    caption: "Observé et attendu",
    head: ["Génotype", "Observé O", "Attendu E", "(O − E)² / E"],
    rows: [
      ["AA", String(AA), fmt(E[0], 4), fmt(E[0] > 0 ? ((AA - E[0]) ** 2) / E[0] : 0, 4)],
      ["Aa", String(Aa), fmt(E[1], 4), fmt(E[1] > 0 ? ((Aa - E[1]) ** 2) / E[1] : 0, 4)],
      ["aa", String(aa), fmt(E[2], 4), fmt(E[2] > 0 ? ((aa - E[2]) ** 2) / E[2] : 0, 4)]
    ],
    ltr: true
  }];
  if (E.some((e) => e < 5)) blocks.push({ type: "note", tone: "warn", text: "Certaines fréquences attendues sont inférieures à 5 : le test du khi-deux peut donc être imprécis." });
  return {
    results: [
      { label: "Effectif N", value: String(N) },
      { label: "Fréquence de l'allèle A (p)", value: fmt(p, 4) },
      { label: "Fréquence de l'allèle a (q)", value: fmt(q, 4) },
      { label: "Effectifs attendus AA / Aa / aa", value: `${fmt(E[0], 4)} / ${fmt(E[1], 4)} / ${fmt(E[2], 4)}` },
      { label: "Valeur de χ²", value: fmt(chi, 4) },
      { label: "Verdict statistique", value: significant ? "Écart significatif" : "Pas d'écart significatif" , text: verdict }
    ],
    steps: [
      { text: "Fréquence de l'allèle A parmi les allèles observés :", tex: `p = \\frac{2 \\times ${AA} + ${Aa}}{2 \\times ${N}} = ${ntex(p, 6)}` },
      { text: "Fréquence de l'allèle a :", tex: `q = 1 - p = ${ntex(q, 6)}` },
      { text: "Effectifs attendus à l'équilibre :", tex: `E_{AA} = p^2 N,\\; E_{Aa} = 2pqN,\\; E_{aa} = q^2 N = ${fmt(E[0], 4)},\\ ${fmt(E[1], 4)},\\ ${fmt(E[2], 4)}` },
      { text: "Valeur du khi-deux (ddl = 1) :", tex: `\\chi^2 = \\sum \\frac{(O-E)^2}{E} = ${ntex(chi, 6)}` },
      `Décision : si χ² est supérieur ou égal à ${CHI_CRIT} (valeur critique au seuil de 0.05 et ddl = 1), l'équilibre est rejeté.`
    ],
    copy: `p = ${fmt(p, 4)}، q = ${fmt(q, 4)}، χ² = ${fmt(chi, 4)} (df = 1) — ${significant ? "Écart significatif" : "Compatible avec l'équilibre"}`,
    blocks
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Méthode de calcul", ["recessive", "counts"], "recessive");
  return mode === "counts" ? fromCounts(input) : fromPheno(input);
}
