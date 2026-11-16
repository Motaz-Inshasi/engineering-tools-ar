import { fail, str, choice } from "../core/validate.js";
import { fmt } from "../core/format.js";

export const meta = {
  description: "Dibuje el cuadro de Punnett para cualquier cruce entre dos progenitores (de uno a cuatro genes, o un carácter ligado al cromosoma X) y calcule paso a paso las proporciones de genotipos y fenotipos y la probabilidad de cada uno.",
  keywords: ["Cuadro de Punnett", "punnett square", "Herencia mendeliana", "Genotipo", "Fenotipo", "Dominante", "Recesivo", "Dihíbrido", "9:3:3:1", "Ligado al sexo", "X-linked"],
  formulas: [
    { label: "Número de gametos por progenitor", tex: "2^{h}\\ \\ (h = \\text{número de genes heterocigotos})" },
    { label: "Regla del producto para genes independientes", tex: "P(\\text{A\\_ bb}) = P(\\text{A\\_}) \\times P(\\text{bb})" }
  ],
  inputs: [
    { id: "mode", label: "Tipo de herencia", type: "select", default: "auto", options: [["auto", "Genes autosómicos"], ["xlinked", "Ligada al cromosoma X"]] },
    { id: "p1", label: "Genotipo del primer progenitor", type: "text", default: "AaBb", help: "Escriba cada gen con dos letras seguidas: la mayúscula para el dominante y la minúscula para el recesivo, como Aa o AaBb. En la herencia ligada al X, escriba la madre como XAXa." },
    { id: "p2", label: "Genotipo del segundo progenitor", type: "text", default: "AaBb", help: "En la herencia ligada al X, escriba el padre como XAY o XaY." },
    { id: "dominance", label: "Tipo de dominancia", type: "select", default: "complete", options: [["complete", "Dominancia completa"], ["incomplete", "Dominancia incompleta (el heterocigoto tiene un tercer fenotipo)"]], when: { mode: ["auto"] } }
  ],
  example: { values: { mode: "auto", p1: "AaBb", p2: "AaBb", dominance: "complete" }, expect: ["9:3:3:1"], note: "Ejemplo: cruce de dos dihíbridos en el experimento de Mendel." },
  invalid: { values: { mode: "auto", p1: "AaB", p2: "AaBb", dominance: "complete" } },
  related: ["hardy-weinberg", "dna-tools", "probability-distributions"]
};

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const ratio = (counts) => { const g = counts.reduce(gcd); return counts.map((c) => c / g).join(":"); };
const pct = (c, t) => `${fmt((100 * c) / t, 4)}%`;

function parseAuto(raw, field) {
  const s = raw.replace(/\s+/g, "");
  if (!/^[A-Za-z]+$/.test(s)) fail("Use solo letras del alfabeto latino, como AaBb.", field);
  if (s.length % 2) fail("Cada gen se escribe con dos letras (dos alelos), por lo que el número de letras debe ser par.", field);
  const genes = [];
  for (let i = 0; i < s.length; i += 2) {
    if (s[i].toLowerCase() !== s[i + 1].toLowerCase()) fail(`Las letras «${s[i]}${s[i + 1]}» no representan el mismo gen. Escriba cada gen con dos letras iguales, como Aa.`, field);
    genes.push([s[i], s[i + 1]]);
  }
  if (genes.length > 4) fail("El máximo es de cuatro genes.", field);
  const letters = genes.map((g) => g[0].toLowerCase());
  if (new Set(letters).size !== letters.length) fail("Cada gen debe escribirse con una letra distinta.", field);
  return genes;
}

const orderPair = (a, b) => (a === a.toUpperCase() && b !== b.toUpperCase() ? a + b : b === b.toUpperCase() && a !== a.toUpperCase() ? b + a : a <= b ? a + b : b + a);

function gametes(genes) {
  return genes.reduce((acc, g) => acc.flatMap((x) => [x + g[0], x + g[1]]), [""]);
}

function autosomal(input) {
  const g1 = parseAuto(str(input, "p1", "Genotipo del primer progenitor"), "p1");
  const g2 = parseAuto(str(input, "p2", "Genotipo del segundo progenitor"), "p2");
  const L1 = g1.map((g) => g[0].toLowerCase()).join(""), L2 = g2.map((g) => g[0].toLowerCase()).join("");
  if (L1 !== L2) fail(`Ambos progenitores deben tener los mismos genes en el mismo orden (${L1} frente a ${L2}).`, "p2");
  const dom = choice(input, "dominance", "Tipo de dominancia", ["complete", "incomplete"], "complete");
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
    blocks.push({ type: "table", ltr: true, caption: "Cuadro de Punnett (gametos del primer progenitor en horizontal y del segundo en vertical)", head: [{ text: "♂ \\ ♀", th: true }, ...u1.map((g) => ({ text: g, th: true }))], rowHeaders: true, rows: u2.map((b) => [b, ...u1.map((a) => child(a, b))]) });
  }
  blocks.push({ type: "table", caption: "Fenotipos", head: ["Fenotipo", "Número", "Probabilidad"], rows: phenos.map(([p, c]) => [p, `${c}/${total}`, pct(c, total)]) });
  blocks.push({ type: "table", caption: "Genotipos", head: ["Genotipo", "Número", "Probabilidad"], rows: genos.map(([g, c]) => [g, `${c}/${total}`, pct(c, total)]) });
  const steps = [
    `Gametos del primer progenitor (${u1.length}): ${u1.join("، ")}.`,
    `Gametos del segundo progenitor (${u2.length}): ${u2.join("، ")}.`,
    `Combinamos cada gameto del primero con cada gameto del segundo y obtenemos ${total} combinaciones igualmente probables.`,
    dom === "complete" ? "En la dominancia completa se manifiesta el fenotipo dominante (A_) si existe al menos un alelo dominante; el recesivo solo aparece con dos alelos recesivos." : "En la dominancia incompleta el heterocigoto presenta un fenotipo intermedio, por lo que cada genotipo es un fenotipo independiente.",
    `Proporción de fenotipos ${pr}; proporción de genotipos ${gr}.`
  ];
  return {
    results: [
      { label: "Proporción de fenotipos", value: pr },
      { label: "Proporción de genotipos", value: gr },
      { label: "Número de fenotipos / genotipos", value: `${phenos.length} / ${genos.length}` }
    ],
    steps, blocks,
    copy: `${g1.flat().join("")} × ${g2.flat().join("")}: fenotipos ${pr} (${phenos.map(([p, c]) => `${p} ${pct(c, total)}`).join("، ")}), genotipos ${gr}`
  };
}

function xlinked(input) {
  const m = str(input, "p1", "Genotipo de la madre").replace(/\s+/g, "").match(/^X\^?([A-Za-z])X\^?([A-Za-z])$/);
  if (!m) fail("Escriba el genotipo de la madre como XAXa o XaXa (un cromosoma X con el alelo de cada uno).", "p1");
  const f = str(input, "p2", "Genotipo del padre").replace(/\s+/g, "").match(/^X\^?([A-Za-z])Y$/);
  if (!f) fail("Escriba el genotipo del padre como XAY o XaY.", "p2");
  if (new Set([m[1], m[2], f[1]].map((c) => c.toLowerCase())).size !== 1) fail("Use la misma letra para los alelos de ambos progenitores.", "p2");
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
      { label: "Probabilidad de que los varones estén afectados", value: p(affS) },
      { label: "Probabilidad de que las mujeres estén afectadas", value: p(affD) },
      { label: "Probabilidad de que la hembra sea portadora", value: p(carD) },
      { label: "Probabilidad de que cualquier descendiente esté afectado", value: p(affAll) }
    ],
    steps: [
      `Gametos de la madre: X${mom[0]} y X${mom[1]}. Gametos del padre: ${dad[0]} y Y.`,
      "Los hijos varones reciben el X de la madre y el Y del padre, por lo que manifiestan directamente el alelo materno.",
      "Las hijas reciben un X de cada progenitor, por lo que una hija solo se afecta por un carácter recesivo si tiene dos alelos recesivos.",
      `Resultado: varones afectados ${p(affS)}, mujeres afectadas ${p(affD)} y mujeres portadoras ${p(carD)}.`
    ],
    blocks: [{ type: "table", ltr: true, caption: "Cuadro de Punnett para la herencia ligada al X", head: [{ text: "♂ \\ ♀", th: true }, ...mom.map((a) => ({ text: `X${a}`, th: true }))], rowHeaders: true, rows: dad.map((d, i) => [d, ...cells.slice(2 * i, 2 * i + 2).map((c) => `${c.g}${c.aff ? " (afectado)" : c.carrier ? " (portadora)" : ""}`)]) }],
    copy: `X${mom.join("X")} × ${dad[0]}Y: varones afectados ${p(affS)}, mujeres afectadas ${p(affD)}, mujeres portadoras ${p(carD)}`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Tipo de herencia", ["auto", "xlinked"], "auto");
  return mode === "auto" ? autosomal(input) : xlinked(input);
}
