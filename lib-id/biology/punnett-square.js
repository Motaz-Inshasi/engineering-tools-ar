import { fail, str, choice } from "../core/validate.js";
import { fmt } from "../core/format.js";

export const meta = {
  description: "Gambar kotak Punnett untuk persilangan apa pun antara dua induk (satu hingga empat gen, atau sifat yang terkait kromosom X), dan hitung rasio genotipe serta fenotipe beserta peluang masing-masing langkah demi langkah.",
  keywords: ["Kotak Punnett", "punnett square", "Pewarisan Mendel", "Genotipe", "Fenotipe", "Dominan", "Resesif", "Dihibrid", "9:3:3:1", "Terkait jenis kelamin", "X-linked"],
  formulas: [
    { label: "Jumlah gamet per induk", tex: "2^{h}\\ \\ (h = \\text{jumlah gen heterozigot})" },
    { label: "Kaidah perkalian untuk gen yang bebas", tex: "P(\\text{A\\_ bb}) = P(\\text{A\\_}) \\times P(\\text{bb})" }
  ],
  inputs: [
    { id: "mode", label: "Jenis pewarisan", type: "select", default: "auto", options: [["auto", "Gen autosomal"], ["xlinked", "Terkait kromosom X"]] },
    { id: "p1", label: "Genotipe induk pertama", type: "text", default: "AaBb", help: "Tulis setiap gen dengan dua huruf berurutan: huruf kapital untuk alel dominan dan huruf kecil untuk alel resesif, misalnya Aa atau AaBb. Untuk pewarisan terkait X, tulis induk betina seperti XAXa." },
    { id: "p2", label: "Genotipe induk kedua", type: "text", default: "AaBb", help: "Untuk pewarisan terkait X, tulis induk jantan seperti XAY atau XaY." },
    { id: "dominance", label: "Jenis dominansi", type: "select", default: "complete", options: [["complete", "Dominansi penuh"], ["incomplete", "Dominansi tidak penuh (heterozigot memiliki fenotipe intermediet)"]], when: { mode: ["auto"] } }
  ],
  example: { values: { mode: "auto", p1: "AaBb", p2: "AaBb", dominance: "complete" }, expect: ["9:3:3:1"], note: "Contoh: persilangan dua tanaman dihibrid dalam percobaan Mendel." },
  invalid: { values: { mode: "auto", p1: "AaB", p2: "AaBb", dominance: "complete" } },
  related: ["hardy-weinberg", "dna-tools", "probability-distributions"]
};

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const ratio = (counts) => { const g = counts.reduce(gcd); return counts.map((c) => c / g).join(":"); };
const pct = (c, t) => `${fmt((100 * c) / t, 4)}%`;

function parseAuto(raw, field) {
  const s = raw.replace(/\s+/g, "");
  if (!/^[A-Za-z]+$/.test(s)) fail("Gunakan huruf Inggris saja, misalnya AaBb.", field);
  if (s.length % 2) fail("Setiap gen ditulis dengan dua huruf (dua alel), sehingga jumlah huruf harus genap.", field);
  const genes = [];
  for (let i = 0; i < s.length; i += 2) {
    if (s[i].toLowerCase() !== s[i + 1].toLowerCase()) fail(`Huruf «${s[i]}${s[i + 1]}» tidak mewakili gen yang sama. Tulis setiap gen dengan dua huruf yang sama, misalnya Aa.`, field);
    genes.push([s[i], s[i + 1]]);
  }
  if (genes.length > 4) fail("Jumlah maksimum adalah empat gen.", field);
  const letters = genes.map((g) => g[0].toLowerCase());
  if (new Set(letters).size !== letters.length) fail("Setiap gen harus ditulis dengan huruf yang berbeda.", field);
  return genes;
}

const orderPair = (a, b) => (a === a.toUpperCase() && b !== b.toUpperCase() ? a + b : b === b.toUpperCase() && a !== a.toUpperCase() ? b + a : a <= b ? a + b : b + a);

function gametes(genes) {
  return genes.reduce((acc, g) => acc.flatMap((x) => [x + g[0], x + g[1]]), [""]);
}

function autosomal(input) {
  const g1 = parseAuto(str(input, "p1", "Genotipe induk pertama"), "p1");
  const g2 = parseAuto(str(input, "p2", "Genotipe induk kedua"), "p2");
  const L1 = g1.map((g) => g[0].toLowerCase()).join(""), L2 = g2.map((g) => g[0].toLowerCase()).join("");
  if (L1 !== L2) fail(`Kedua induk harus membawa gen yang sama dengan urutan yang sama (${L1} berbanding ${L2}).`, "p2");
  const dom = choice(input, "dominance", "Jenis dominansi", ["complete", "incomplete"], "complete");
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
    blocks.push({ type: "table", ltr: true, caption: "Kotak Punnett (gamet induk pertama di bagian atas dan gamet induk kedua di sisi)", head: [{ text: "♂ \\ ♀", th: true }, ...u1.map((g) => ({ text: g, th: true }))], rowHeaders: true, rows: u2.map((b) => [b, ...u1.map((a) => child(a, b))]) });
  }
  blocks.push({ type: "table", caption: "Fenotipe", head: ["Fenotipe", "Jumlah", "Peluang"], rows: phenos.map(([p, c]) => [p, `${c}/${total}`, pct(c, total)]) });
  blocks.push({ type: "table", caption: "Genotipe", head: ["Genotipe", "Jumlah", "Peluang"], rows: genos.map(([g, c]) => [g, `${c}/${total}`, pct(c, total)]) });
  const steps = [
    `Gamet induk pertama (${u1.length}): ${u1.join("، ")}.`,
    `Gamet induk kedua (${u2.length}): ${u2.join("، ")}.`,
    `Menggabungkan setiap gamet dari induk pertama dengan setiap gamet dari induk kedua menghasilkan ${total} kombinasi yang sama peluangnya.`,
    dom === "complete" ? "Pada dominansi penuh, fenotipe dominan (A_) muncul jika terdapat setidaknya satu alel dominan, dan fenotipe resesif hanya muncul dengan dua alel resesif." : "Pada dominansi tidak penuh, heterozigot menunjukkan fenotipe intermediet, sehingga setiap genotipe merupakan fenotipe tersendiri.",
    `Rasio fenotipe ${pr}, dan rasio genotipe ${gr}.`
  ];
  return {
    results: [
      { label: "Rasio fenotipe", value: pr },
      { label: "Rasio genotipe", value: gr },
      { label: "Jumlah fenotipe / genotipe", value: `${phenos.length} / ${genos.length}` }
    ],
    steps, blocks,
    copy: `${g1.flat().join("")} × ${g2.flat().join("")}: fenotipe ${pr} (${phenos.map(([p, c]) => `${p} ${pct(c, total)}`).join("، ")}), genotipe ${gr}`
  };
}

function xlinked(input) {
  const m = str(input, "p1", "Genotipe induk betina").replace(/\s+/g, "").match(/^X\^?([A-Za-z])X\^?([A-Za-z])$/);
  if (!m) fail("Tulis genotipe induk betina dalam bentuk XAXa atau XaXa (kromosom X dengan alel masing-masing).", "p1");
  const f = str(input, "p2", "Genotipe induk jantan").replace(/\s+/g, "").match(/^X\^?([A-Za-z])Y$/);
  if (!f) fail("Tulis genotipe induk jantan dalam bentuk XAY atau XaY.", "p2");
  if (new Set([m[1], m[2], f[1]].map((c) => c.toLowerCase())).size !== 1) fail("Gunakan huruf yang sama untuk alel pada kedua induk.", "p2");
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
      { label: "Peluang jantan terkena sifat", value: p(affS) },
      { label: "Peluang betina terkena sifat", value: p(affD) },
      { label: "Peluang betina menjadi pembawa", value: p(carD) },
      { label: "Peluang setiap keturunan terkena sifat", value: p(affAll) }
    ],
    steps: [
      `Gamet induk betina: X${mom[0]} dan X${mom[1]}. Gamet induk jantan: ${dad[0]} dan Y.`,
      "Anak jantan menerima X dari induk betina dan Y dari induk jantan, sehingga alel induk betina langsung tampak pada mereka.",
      "Anak perempuan menerima X dari setiap induk, sehingga seorang anak perempuan terkena sifat resesif hanya jika ia membawa dua alel resesif.",
      `Hasil: jantan terkena sifat ${p(affS)}, betina terkena sifat ${p(affD)}, betina pembawa ${p(carD)}.`
    ],
    blocks: [{ type: "table", ltr: true, caption: "Kotak Punnett untuk pewarisan terkait X", head: [{ text: "♂ \\ ♀", th: true }, ...mom.map((a) => ({ text: `X${a}`, th: true }))], rowHeaders: true, rows: dad.map((d, i) => [d, ...cells.slice(2 * i, 2 * i + 2).map((c) => `${c.g}${c.aff ? " (terkena)" : c.carrier ? " (pembawa)" : ""}`)]) }],
    copy: `X${mom.join("X")} × ${dad[0]}Y: jantan terkena ${p(affS)}, betina terkena ${p(affD)}, betina pembawa ${p(carD)}`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Jenis pewarisan", ["auto", "xlinked"], "auto");
  return mode === "auto" ? autosomal(input) : xlinked(input);
}
