import { fail, str, choice } from "../core/validate.js";
import { fmt } from "../core/format.js";

export const meta = {
  description: "Tracez l'échiquier de Punnett pour tout croisement entre deux parents (un gène jusqu'à quatre gènes, ou un caractère lié au chromosome X), et calculez pas à pas les proportions des génotypes et des phénotypes ainsi que la probabilité de chacun.",
  keywords: ["Échiquier de Punnett", "punnett square", "Hérédité mendélienne", "Génotype", "Phénotype", "Dominant", "Récessif", "Dihybride", "9:3:3:1", "Lié au sexe", "X-linked"],
  formulas: [
    { label: "Nombre de gamètes par parent", tex: "2^{h}\\ \\ (h = \\text{nombre de gènes hétérozygotes})" },
    { label: "Règle du produit pour les gènes indépendants", tex: "P(\\text{A\\_ bb}) = P(\\text{A\\_}) \\times P(\\text{bb})" }
  ],
  inputs: [
    { id: "mode", label: "Type d'hérédité", type: "select", default: "auto", options: [["auto", "Gènes autosomiques"], ["xlinked", "Lié au chromosome X"]] },
    { id: "p1", label: "Génotype du premier parent", type: "text", default: "AaBb", help: "Écrivez chaque gène avec deux lettres consécutives : la majuscule pour le dominant et la minuscule pour le récessif, par exemple Aa ou AaBb. En hérédité liée à l'X, écrivez la mère sous la forme XAXa." },
    { id: "p2", label: "Génotype du second parent", type: "text", default: "AaBb", help: "En hérédité liée à l'X, écrivez le père sous la forme XAY ou XaY." },
    { id: "dominance", label: "Type de dominance", type: "select", default: "complete", options: [["complete", "Dominance complète"], ["incomplete", "Dominance incomplète (l'hétérozygote forme un troisième phénotype)"]], when: { mode: ["auto"] } }
  ],
  example: { values: { mode: "auto", p1: "AaBb", p2: "AaBb", dominance: "complete" }, expect: ["9:3:3:1"], note: "Exemple : croisement de deux dihybrides dans l'expérience de Mendel." },
  invalid: { values: { mode: "auto", p1: "AaB", p2: "AaBb", dominance: "complete" } },
  related: ["hardy-weinberg", "dna-tools", "probability-distributions"]
};

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const ratio = (counts) => { const g = counts.reduce(gcd); return counts.map((c) => c / g).join(":"); };
const pct = (c, t) => `${fmt((100 * c) / t, 4)}%`;

function parseAuto(raw, field) {
  const s = raw.replace(/\s+/g, "");
  if (!/^[A-Za-z]+$/.test(s)) fail("Utilisez uniquement des lettres latines, par exemple AaBb.", field);
  if (s.length % 2) fail("Chaque gène s'écrit avec deux lettres (deux allèles) ; le nombre de lettres doit donc être pair.", field);
  const genes = [];
  for (let i = 0; i < s.length; i += 2) {
    if (s[i].toLowerCase() !== s[i + 1].toLowerCase()) fail(`Les lettres «${s[i]}${s[i + 1]}» ne représentent pas le même gène. Écrivez chaque gène avec deux fois la même lettre, par exemple Aa.`, field);
    genes.push([s[i], s[i + 1]]);
  }
  if (genes.length > 4) fail("Le maximum est de quatre gènes.", field);
  const letters = genes.map((g) => g[0].toLowerCase());
  if (new Set(letters).size !== letters.length) fail("Chaque gène doit être désigné par une lettre différente.", field);
  return genes;
}

const orderPair = (a, b) => (a === a.toUpperCase() && b !== b.toUpperCase() ? a + b : b === b.toUpperCase() && a !== a.toUpperCase() ? b + a : a <= b ? a + b : b + a);

function gametes(genes) {
  return genes.reduce((acc, g) => acc.flatMap((x) => [x + g[0], x + g[1]]), [""]);
}

function autosomal(input) {
  const g1 = parseAuto(str(input, "p1", "Génotype du premier parent"), "p1");
  const g2 = parseAuto(str(input, "p2", "Génotype du second parent"), "p2");
  const L1 = g1.map((g) => g[0].toLowerCase()).join(""), L2 = g2.map((g) => g[0].toLowerCase()).join("");
  if (L1 !== L2) fail(`Les deux parents doivent porter les mêmes gènes, dans le même ordre (${L1} contre ${L2}).`, "p2");
  const dom = choice(input, "dominance", "Type de dominance", ["complete", "incomplete"], "complete");
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
    blocks.push({ type: "table", ltr: true, caption: "Échiquier de Punnett (gamètes du premier parent en horizontal et du second en vertical)", head: [{ text: "♂ \\ ♀", th: true }, ...u1.map((g) => ({ text: g, th: true }))], rowHeaders: true, rows: u2.map((b) => [b, ...u1.map((a) => child(a, b))]) });
  }
  blocks.push({ type: "table", caption: "Phénotypes", head: ["Phénotype", "Nombre", "Probabilité"], rows: phenos.map(([p, c]) => [p, `${c}/${total}`, pct(c, total)]) });
  blocks.push({ type: "table", caption: "Génotypes", head: ["Génotype", "Nombre", "Probabilité"], rows: genos.map(([g, c]) => [g, `${c}/${total}`, pct(c, total)]) });
  const steps = [
    `Gamètes du premier parent (${u1.length}) : ${u1.join("، ")}.`,
    `Gamètes du second parent (${u2.length}) : ${u2.join("، ")}.`,
    `On associe chaque gamète du premier parent à chaque gamète du second, ce qui donne ${total} combinaisons de même probabilité.`,
    dom === "complete" ? "En dominance complète, le phénotype dominant (A_) apparaît dès qu'au moins un allèle dominant est présent ; le phénotype récessif n'apparaît qu'avec deux allèles récessifs." : "En dominance incomplète, l'hétérozygote présente un phénotype intermédiaire : chaque génotype correspond alors à un phénotype distinct.",
    `Proportions des phénotypes : ${pr} ; proportions des génotypes : ${gr}.`
  ];
  return {
    results: [
      { label: "Proportion des phénotypes", value: pr },
      { label: "Proportion des génotypes", value: gr },
      { label: "Nombre de phénotypes / génotypes", value: `${phenos.length} / ${genos.length}` }
    ],
    steps, blocks,
    copy: `${g1.flat().join("")} × ${g2.flat().join("")} : phénotypes ${pr} (${phenos.map(([p, c]) => `${p} ${pct(c, total)}`).join("، ")}), génotypes ${gr}`
  };
}

function xlinked(input) {
  const m = str(input, "p1", "Génotype de la mère").replace(/\s+/g, "").match(/^X\^?([A-Za-z])X\^?([A-Za-z])$/);
  if (!m) fail("Écrivez le génotype de la mère sous la forme XAXa ou XaXa (le chromosome X avec l'allèle de chacun).", "p1");
  const f = str(input, "p2", "Génotype du père").replace(/\s+/g, "").match(/^X\^?([A-Za-z])Y$/);
  if (!f) fail("Écrivez le génotype du père sous la forme XAY ou XaY.", "p2");
  if (new Set([m[1], m[2], f[1]].map((c) => c.toLowerCase())).size !== 1) fail("Utilisez la même lettre pour les allèles des deux parents.", "p2");
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
      { label: "Probabilité qu'un garçon soit atteint", value: p(affS) },
      { label: "Probabilité qu'une fille soit atteinte", value: p(affD) },
      { label: "Probabilité qu'une fille soit porteuse", value: p(carD) },
      { label: "Probabilité qu'un enfant soit atteint", value: p(affAll) }
    ],
    steps: [
      `Gamètes de la mère : X${mom[0]} et X${mom[1]}. Gamètes du père : ${dad[0]} et Y.`,
      "Les garçons reçoivent X de la mère et Y du père ; ils présentent donc directement l'allèle de la mère.",
      "Les filles reçoivent un X de chaque parent ; une fille n'est atteinte que si elle porte deux allèles récessifs.",
      `Résultat : garçons atteints ${p(affS)}, filles atteintes ${p(affD)}, filles porteuses ${p(carD)}.`
    ],
    blocks: [{ type: "table", ltr: true, caption: "Échiquier de Punnett pour l'hérédité liée à l'X", head: [{ text: "♂ \\ ♀", th: true }, ...mom.map((a) => ({ text: `X${a}`, th: true }))], rowHeaders: true, rows: dad.map((d, i) => [d, ...cells.slice(2 * i, 2 * i + 2).map((c) => `${c.g}${c.aff ? " (atteint)" : c.carrier ? " (porteuse)" : ""}`)]) }],
    copy: `X${mom.join("X")} × ${dad[0]}Y : garçons atteints ${p(affS)}, filles atteintes ${p(affD)}, filles porteuses ${p(carD)}`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Type d'hérédité", ["auto", "xlinked"], "auto");
  return mode === "auto" ? autosomal(input) : xlinked(input);
}
