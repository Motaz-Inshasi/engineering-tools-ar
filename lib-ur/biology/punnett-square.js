import { fail, str, choice } from "../core/validate.js";
import { fmt } from "../core/format.js";

export const meta = {
  description: "کسی بھی دو والدین کے ملاپ کے لیے پنیٹ اسکوائر بنائیں (ایک جین سے چار جینز تک، یا X کروموسوم سے منسلک صفت)، اور جینوٹائپ و فینوٹائپ کے تناسب اور ہر ایک کا امکان مرحلہ وار حساب کریں۔",
  keywords: ["پنیٹ اسکوائر", "punnett square", "مینڈیلین وراثت", "جینوٹائپ", "فینوٹائپ", "غالب", "مغلوب", "ڈائی ہائبرڈ", "9:3:3:1", "جنس سے منسلک", "X-linked"],
  formulas: [
    { label: "ہر والد کے گیمیٹس کی تعداد", tex: "2^{h}\\ \\ (h = \\text{ہیٹروزائگس جینز کی تعداد})" },
    { label: "آزاد جینز کے لیے ضرب کا اصول", tex: "P(\\text{A\\_ bb}) = P(\\text{A\\_}) \\times P(\\text{bb})" }
  ],
  inputs: [
    { id: "mode", label: "وراثت کی قسم", type: "select", default: "auto", options: [["auto", "جسمانی (آٹوسومل) جینز"], ["xlinked", "X کروموسوم سے منسلک"]] },
    { id: "p1", label: "پہلے والد کا جینوٹائپ", type: "text", default: "AaBb", help: "ہر جین کو دو لگاتار حروف میں لکھیں: بڑا حرف غالب الیل کے لیے اور چھوٹا حرف مغلوب کے لیے، جیسے Aa یا AaBb۔ X سے منسلک وراثت میں ماں کو XAXa جیسے لکھیں۔" },
    { id: "p2", label: "دوسرے والد کا جینوٹائپ", type: "text", default: "AaBb", help: "X سے منسلک وراثت میں باپ کو XAY یا XaY جیسے لکھیں۔" },
    { id: "dominance", label: "غلبے کی قسم", type: "select", default: "complete", options: [["complete", "مکمل غلبہ"], ["incomplete", "نامکمل غلبہ (ہیٹروزائگس میں درمیانی فینوٹائپ)"]], when: { mode: ["auto"] } }
  ],
  example: { values: { mode: "auto", p1: "AaBb", p2: "AaBb", dominance: "complete" }, expect: ["9:3:3:1"], note: "مثال: مینڈل کے تجربے میں دو ڈائی ہائبرڈ پودوں کا ملاپ۔" },
  invalid: { values: { mode: "auto", p1: "AaB", p2: "AaBb", dominance: "complete" } },
  related: ["hardy-weinberg", "dna-tools", "probability-distributions"]
};

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const ratio = (counts) => { const g = counts.reduce(gcd); return counts.map((c) => c / g).join(":"); };
const pct = (c, t) => `${fmt((100 * c) / t, 4)}%`;

function parseAuto(raw, field) {
  const s = raw.replace(/\s+/g, "");
  if (!/^[A-Za-z]+$/.test(s)) fail("صرف انگریزی حروف استعمال کریں، جیسے AaBb۔", field);
  if (s.length % 2) fail("ہر جین دو حروف (دو الیلز) سے لکھا جاتا ہے، اس لیے حروف کی تعداد جفت ہونی چاہیے۔", field);
  const genes = [];
  for (let i = 0; i < s.length; i += 2) {
    if (s[i].toLowerCase() !== s[i + 1].toLowerCase()) fail(`حروف “${s[i]}${s[i + 1]}” ایک ہی جین کی نمائندگی نہیں کرتے۔ ہر جین کو ایک ہی حرف کے دو حروف سے لکھیں، جیسے Aa۔`, field);
    genes.push([s[i], s[i + 1]]);
  }
  if (genes.length > 4) fail("زیادہ سے زیادہ چار جینز ہو سکتے ہیں۔", field);
  const letters = genes.map((g) => g[0].toLowerCase());
  if (new Set(letters).size !== letters.length) fail("ہر جین ایک مختلف حرف سے لکھا جانا چاہیے۔", field);
  return genes;
}

const orderPair = (a, b) => (a === a.toUpperCase() && b !== b.toUpperCase() ? a + b : b === b.toUpperCase() && a !== a.toUpperCase() ? b + a : a <= b ? a + b : b + a);

function gametes(genes) {
  return genes.reduce((acc, g) => acc.flatMap((x) => [x + g[0], x + g[1]]), [""]);
}

function autosomal(input) {
  const g1 = parseAuto(str(input, "p1", "پہلے والد کا جینوٹائپ"), "p1");
  const g2 = parseAuto(str(input, "p2", "دوسرے والد کا جینوٹائپ"), "p2");
  const L1 = g1.map((g) => g[0].toLowerCase()).join(""), L2 = g2.map((g) => g[0].toLowerCase()).join("");
  if (L1 !== L2) fail(`دونوں والدین میں وہی جینز اسی ترتیب میں ہونی چاہئیں (${L1} بمقابلہ ${L2})۔`, "p2");
  const dom = choice(input, "dominance", "غلبے کی قسم", ["complete", "incomplete"], "complete");
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
    blocks.push({ type: "table", ltr: true, caption: "پنیٹ اسکوائر (پہلے والد کے گیمیٹس اوپر اور دوسرے والد کے گیمیٹس بائیں جانب)", head: [{ text: "♂ \\ ♀", th: true }, ...u1.map((g) => ({ text: g, th: true }))], rowHeaders: true, rows: u2.map((b) => [b, ...u1.map((a) => child(a, b))]) });
  }
  blocks.push({ type: "table", caption: "فینوٹائپس", head: ["فینوٹائپ", "تعداد", "امکان"], rows: phenos.map(([p, c]) => [p, `${c}/${total}`, pct(c, total)]) });
  blocks.push({ type: "table", caption: "جینوٹائپس", head: ["جینوٹائپ", "تعداد", "امکان"], rows: genos.map(([g, c]) => [g, `${c}/${total}`, pct(c, total)]) });
  const steps = [
    `پہلے والد کے گیمیٹس (${u1.length}): ${u1.join("، ")}۔`,
    `دوسرے والد کے گیمیٹس (${u2.length}): ${u2.join("، ")}۔`,
    `پہلے والد کے ہر گیمیٹ کو دوسرے والد کے ہر گیمیٹ کے ساتھ ملانے سے ${total} برابر امکان والے مجموعے بنتے ہیں۔`,
    dom === "complete" ? "مکمل غلبے میں غالب فینوٹائپ (A_) اس وقت ظاہر ہوتا ہے جب کم از کم ایک غالب الیل موجود ہو، اور مغلوب فینوٹائپ صرف دو مغلوب الیلز کے ساتھ ظاہر ہوتا ہے۔" : "نامکمل غلبے میں ہیٹروزائگس درمیانی فینوٹائپ دکھاتا ہے، اس لیے ہر جینوٹائپ ایک الگ فینوٹائپ ہے۔",
    `فینوٹائپ کا تناسب ${pr} ہے، اور جینوٹائپ کا تناسب ${gr} ہے۔`
  ];
  return {
    results: [
      { label: "فینوٹائپ کا تناسب", value: pr },
      { label: "جینوٹائپ کا تناسب", value: gr },
      { label: "فینوٹائپس / جینوٹائپس کی تعداد", value: `${phenos.length} / ${genos.length}` }
    ],
    steps, blocks,
    copy: `${g1.flat().join("")} × ${g2.flat().join("")}: فینوٹائپس ${pr} (${phenos.map(([p, c]) => `${p} ${pct(c, total)}`).join("، ")})، جینوٹائپس ${gr}`
  };
}

function xlinked(input) {
  const m = str(input, "p1", "ماں کا جینوٹائپ").replace(/\s+/g, "").match(/^X\^?([A-Za-z])X\^?([A-Za-z])$/);
  if (!m) fail("ماں کا جینوٹائپ XAXa یا XaXa جیسی شکل میں لکھیں (ہر X کروموسوم پر الیل)۔", "p1");
  const f = str(input, "p2", "باپ کا جینوٹائپ").replace(/\s+/g, "").match(/^X\^?([A-Za-z])Y$/);
  if (!f) fail("باپ کا جینوٹائپ XAY یا XaY جیسی شکل میں لکھیں۔", "p2");
  if (new Set([m[1], m[2], f[1]].map((c) => c.toLowerCase())).size !== 1) fail("دونوں والدین کے الیلز کے لیے ایک ہی حرف استعمال کریں۔", "p2");
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
      { label: "نر متاثر ہونے کا امکان", value: p(affS) },
      { label: "مادہ متاثر ہونے کا امکان", value: p(affD) },
      { label: "مادہ کے کیریئر ہونے کا امکان", value: p(carD) },
      { label: "کسی بھی بچے کے متاثر ہونے کا امکان", value: p(affAll) }
    ],
    steps: [
      `ماں کے گیمیٹس: X${mom[0]} اور X${mom[1]}۔ باپ کے گیمیٹس: ${dad[0]} اور Y۔`,
      "بیٹے ماں سے X اور باپ سے Y لیتے ہیں، اس لیے وہ ماں کا الیل براہِ راست ظاہر کرتے ہیں۔",
      "بیٹیاں ہر والد سے ایک X لیتی ہیں، اس لیے بیٹی مغلوب صفت سے متاثر تبھی ہوتی ہے جب وہ دو مغلوب الیلز رکھتی ہو۔",
      `نتیجہ: متاثر نر ${p(affS)}، متاثر مادہ ${p(affD)}، اور مادہ کیریئرز ${p(carD)}۔`
    ],
    blocks: [{ type: "table", ltr: true, caption: "X سے منسلک وراثت کے لیے پنیٹ اسکوائر", head: [{ text: "♂ \\ ♀", th: true }, ...mom.map((a) => ({ text: `X${a}`, th: true }))], rowHeaders: true, rows: dad.map((d, i) => [d, ...cells.slice(2 * i, 2 * i + 2).map((c) => `${c.g}${c.aff ? " (متاثر)" : c.carrier ? " (کیریئر)" : ""}`)]) }],
    copy: `X${mom.join("X")} × ${dad[0]}Y: متاثر نر ${p(affS)}، متاثر مادہ ${p(affD)}، مادہ کیریئرز ${p(carD)}`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "وراثت کی قسم", ["auto", "xlinked"], "auto");
  return mode === "auto" ? autosomal(input) : xlinked(input);
}
