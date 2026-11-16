import { fail, str, choice } from "../core/validate.js";
import { fmt } from "../core/format.js";

export const meta = {
  description: "Herhangi iki ebeveyn arasındaki çaprazlama için Punnett karesi çizin (bir ila dört gen veya X kromozomuna bağlı özellik) ve genotip ile fenotip oranlarını ve olasılıkları adım adım hesaplayın.",
  keywords: ["Punnett karesi", "punnett square", "Mendel kalıtımı", "genotip", "fenotip", "baskın", "çekinik", "dihibrit", "9:3:3:1", "cinsiyete bağlı", "X-linked"],
  formulas: [
    { label: "Ebeveyn başına gamet sayısı", tex: "2^{h}\\ \\ (h = \\text{heterozigot gen sayısı})" },
    { label: "Bağımsız genler için çarpma kuralı", tex: "P(\\text{A\\_ bb}) = P(\\text{A\\_}) \\times P(\\text{bb})" }
  ],
  inputs: [
    { id: "mode", label: "Kalıtım türü", type: "select", default: "auto", options: [["auto", "Otozomal genler"], ["xlinked", "X kromozomuna bağlı"]] },
    { id: "p1", label: "Birinci ebeveynin genotipi", type: "text", default: "AaBb", help: "Her geni iki ardışık harfle yazın: büyük harf baskın, küçük harf çekinik için, örn. Aa veya AaBb. X'e bağlı kalıtımda anneyi XAXa gibi yazın." },
    { id: "p2", label: "İkinci ebeveynin genotipi", type: "text", default: "AaBb", help: "X'e bağlı kalıtımda babayı XAY veya XaY gibi yazın." },
    { id: "dominance", label: "Baskınlık türü", type: "select", default: "complete", options: [["complete", "Tam baskınlık"], ["incomplete", "Eksik baskınlık (heterozigot ara fenotip)"]], when: { mode: ["auto"] } }
  ],
  example: { values: { mode: "auto", p1: "AaBb", p2: "AaBb", dominance: "complete" }, expect: ["9:3:3:1"], note: "Örnek: Mendel deneyinde iki dihibrit çaprazlaması." },
  invalid: { values: { mode: "auto", p1: "AaB", p2: "AaBb", dominance: "complete" } },
  related: ["hardy-weinberg", "dna-tools", "probability-distributions"]
};

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const ratio = (counts) => { const g = counts.reduce(gcd); return counts.map((c) => c / g).join(":"); };
const pct = (c, t) => `${fmt((100 * c) / t, 4)}%`;

function parseAuto(raw, field) {
  const s = raw.replace(/\s+/g, "");
  if (!/^[A-Za-z]+$/.test(s)) fail("Yalnızca İngiliz harfleri kullanın, örn. AaBb.", field);
  if (s.length % 2) fail("Her gen iki harfle yazılır (iki alel); bu nedenle harf sayısı çift olmalıdır.", field);
  const genes = [];
  for (let i = 0; i < s.length; i += 2) {
    if (s[i].toLowerCase() !== s[i + 1].toLowerCase()) fail(`«${s[i]}${s[i + 1]}» harfleri aynı geni temsil etmiyor. Her geni aynı harfin iki harfiyle yazın, örn. Aa.`, field);
    genes.push([s[i], s[i + 1]]);
  }
  if (genes.length > 4) fail("En fazla dört gen.", field);
  const letters = genes.map((g) => g[0].toLowerCase());
  if (new Set(letters).size !== letters.length) fail("Her gen farklı bir harfle yazılmalıdır.", field);
  return genes;
}

const orderPair = (a, b) => (a === a.toUpperCase() && b !== b.toUpperCase() ? a + b : b === b.toUpperCase() && a !== a.toUpperCase() ? b + a : a <= b ? a + b : b + a);

function gametes(genes) {
  return genes.reduce((acc, g) => acc.flatMap((x) => [x + g[0], x + g[1]]), [""]);
}

function autosomal(input) {
  const g1 = parseAuto(str(input, "p1", "Birinci ebeveynin genotipi"), "p1");
  const g2 = parseAuto(str(input, "p2", "İkinci ebeveynin genotipi"), "p2");
  const L1 = g1.map((g) => g[0].toLowerCase()).join(""), L2 = g2.map((g) => g[0].toLowerCase()).join("");
  if (L1 !== L2) fail(`Ebeveynler aynı genleri aynı sırada taşımalıdır (${L1} ile ${L2} karşılaştırması).`, "p2");
  const dom = choice(input, "dominance", "Baskınlık türü", ["complete", "incomplete"], "complete");
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
    blocks.push({ type: "table", ltr: true, caption: "Punnett karesi (birinci ebeveynin gametleri yatay, ikincisinin dikey)", head: [{ text: "♂ \\ ♀", th: true }, ...u1.map((g) => ({ text: g, th: true }))], rowHeaders: true, rows: u2.map((b) => [b, ...u1.map((a) => child(a, b))]) });
  }
  blocks.push({ type: "table", caption: "Fenotipler", head: ["Fenotip", "Sayı", "Olasılık"], rows: phenos.map(([p, c]) => [p, `${c}/${total}`, pct(c, total)]) });
  blocks.push({ type: "table", caption: "Genotipler", head: ["Genotip", "Sayı", "Olasılık"], rows: genos.map(([g, c]) => [g, `${c}/${total}`, pct(c, total)]) });
  const steps = [
    `Birinci ebeveynin gametleri (${u1.length}): ${u1.join("، ")}.`,
    `İkinci ebeveynin gametleri (${u2.length}): ${u2.join("، ")}.`,
    `Birinci ebeveynin her gameti ile ikinci ebeveynin her gametini eşleştirerek eşit olasılıklı ${total} kombinasyon elde ederiz.`,
    dom === "complete" ? "Tam baskınlıkta baskın alel (A_) en az bir kez varsa baskın fenotip görünür; çekinik fenotip yalnızca iki çekinik alelle ortaya çıkar." : "Eksik baskınlıkta heterozigot ara bir fenotip gösterir; bu nedenle her genotip ayrı bir fenotiptir.",
    `Fenotip oranları ${pr}, genotip oranları ${gr}.`
  ];
  return {
    results: [
      { label: "Fenotip oranları", value: pr },
      { label: "Genotip oranları", value: gr },
      { label: "Fenotip / genotip sayısı", value: `${phenos.length} / ${genos.length}` }
    ],
    steps, blocks,
    copy: `${g1.flat().join("")} × ${g2.flat().join("")}: fenotipler ${pr} (${phenos.map(([p, c]) => `${p} ${pct(c, total)}`).join("، ")}), genotipler ${gr}`
  };
}

function xlinked(input) {
  const m = str(input, "p1", "Anne genotipi").replace(/\s+/g, "").match(/^X\^?([A-Za-z])X\^?([A-Za-z])$/);
  if (!m) fail("Anne genotipini XAXa veya XaXa biçiminde yazın (her iki X kromozomu ve her birinin alelleri).", "p1");
  const f = str(input, "p2", "Baba genotipi").replace(/\s+/g, "").match(/^X\^?([A-Za-z])Y$/);
  if (!f) fail("Baba genotipini XAY veya XaY biçiminde yazın.", "p2");
  if (new Set([m[1], m[2], f[1]].map((c) => c.toLowerCase())).size !== 1) fail("Ebeveynlerdeki alleller için aynı harfi kullanın.", "p2");
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
      { label: "Erkeklerin etkilenme olasılığı", value: p(affS) },
      { label: "Kızların etkilenme olasılığı", value: p(affD) },
      { label: "Kız çocuğun taşıyıcı olma olasılığı", value: p(carD) },
      { label: "Herhangi bir çocuğun etkilenmiş olma olasılığı", value: p(affAll) }
    ],
    steps: [
      `Anne gametleri: X${mom[0]} ve X${mom[1]}. Baba gametleri: ${dad[0]} ve Y.`,
      "Erkek çocuklar anneden X, babadan Y alır; bu nedenle annenin alleli doğrudan ortaya çıkar.",
      "Kız çocuklar her babadan X alır; bu nedenle kız, ancak iki çekinik alel taşırsa çekinik özelliğe sahip olur.",
      `Sonuç: erkeklerin etkilenmesi ${p(affS)}, kızların etkilenmesi ${p(affD)}, taşıyıcı kızlar ${p(carD)}.`
    ],
    blocks: [{ type: "table", ltr: true, caption: "X'e bağlı kalıtım için Punnett karesi", head: [{ text: "♂ \\ ♀", th: true }, ...mom.map((a) => ({ text: `X${a}`, th: true }))], rowHeaders: true, rows: dad.map((d, i) => [d, ...cells.slice(2 * i, 2 * i + 2).map((c) => `${c.g}${c.aff ? " (etkilenmiş)" : c.carrier ? " (taşıyıcı)" : ""}`)]) }],
    copy: `X${mom.join("X")} × ${dad[0]}Y: etkilenmiş erkekler ${p(affS)}, etkilenmiş kızlar ${p(affD)}, taşıyıcı kızlar ${p(carD)}`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Kalıtım türü", ["auto", "xlinked"], "auto");
  return mode === "auto" ? autosomal(input) : xlinked(input);
}
