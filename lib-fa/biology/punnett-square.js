import { fail, str, choice } from "../core/validate.js";
import { fmt } from "../core/format.js";

export const meta = {
  description: "رسم مربع پانت برای هر آمیزش میان دو والد (یک ژن تا چهار ژن، یا صفت وابسته به کروموزوم X) و محاسبه گام‌به‌گام نسبت ژنوتیپ‌ها و فنوتیپ‌ها و احتمال هر یک.",
  keywords: ["مربع پانت", "punnett square", "وراثت مندلی", "ژنوتیپ", "فنوتیپ", "غالب", "مغلوب", "دوهیبرید", "9:3:3:1", "وابسته به جنس", "X-linked"],
  formulas: [
    { label: "تعداد گامت‌ها برای هر والد", tex: "2^{h}\\ \\ (h = \\text{تعداد ژن‌های هتروزیگوت})" },
    { label: "قاعده ضرب برای ژن‌های مستقل", tex: "P(\\text{A\\_ bb}) = P(\\text{A\\_}) \\times P(\\text{bb})" }
  ],
  inputs: [
    { id: "mode", label: "نوع وراثت", type: "select", default: "auto", options: [["auto", "ژن‌های جسمی"], ["xlinked", "وابسته به کروموزوم X"]] },
    { id: "p1", label: "ژنوتیپ والد اول", type: "text", default: "AaBb", help: "هر ژن را با دو حرف متوالی بنویسید: حرف بزرگ برای آلل غالب و حرف کوچک برای آلل مغلوب، مانند Aa یا AaBb. در وراثت وابسته به X، مادر را مانند XAXa بنویسید." },
    { id: "p2", label: "ژنوتیپ والد دوم", type: "text", default: "AaBb", help: "در وراثت وابسته به X، پدر را مانند XAY یا XaY بنویسید." },
    { id: "dominance", label: "نوع غالبیت", type: "select", default: "complete", options: [["complete", "غالبیت کامل"], ["incomplete", "غالبیت ناقص (هتروزیگوت فنوتیپ میانی دارد)"]], when: { mode: ["auto"] } }
  ],
  example: { values: { mode: "auto", p1: "AaBb", p2: "AaBb", dominance: "complete" }, expect: ["9:3:3:1"], note: "مثال: آمیزش دو گیاه دوهیبرید در آزمایش مندل." },
  invalid: { values: { mode: "auto", p1: "AaB", p2: "AaBb", dominance: "complete" } },
  related: ["hardy-weinberg", "dna-tools", "probability-distributions"]
};

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const ratio = (counts) => { const g = counts.reduce(gcd); return counts.map((c) => c / g).join(":"); };
const pct = (c, t) => `${fmt((100 * c) / t, 4)}%`;

function parseAuto(raw, field) {
  const s = raw.replace(/\s+/g, "");
  if (!/^[A-Za-z]+$/.test(s)) fail("فقط از حروف انگلیسی استفاده کنید، مانند AaBb.", field);
  if (s.length % 2) fail("هر ژن با دو حرف (دو آلل) نوشته می‌شود، پس تعداد حروف باید زوج باشد.", field);
  const genes = [];
  for (let i = 0; i < s.length; i += 2) {
    if (s[i].toLowerCase() !== s[i + 1].toLowerCase()) fail(`حروف «${s[i]}${s[i + 1]}» یک ژن را نشان نمی‌دهند. هر ژن را با دو حرف یکسان بنویسید، مانند Aa.`, field);
    genes.push([s[i], s[i + 1]]);
  }
  if (genes.length > 4) fail("حداکثر چهار ژن مجاز است.", field);
  const letters = genes.map((g) => g[0].toLowerCase());
  if (new Set(letters).size !== letters.length) fail("هر ژن باید با حرف متفاوتی نوشته شود.", field);
  return genes;
}

const orderPair = (a, b) => (a === a.toUpperCase() && b !== b.toUpperCase() ? a + b : b === b.toUpperCase() && a !== a.toUpperCase() ? b + a : a <= b ? a + b : b + a);

function gametes(genes) {
  return genes.reduce((acc, g) => acc.flatMap((x) => [x + g[0], x + g[1]]), [""]);
}

function autosomal(input) {
  const g1 = parseAuto(str(input, "p1", "ژنوتیپ والد اول"), "p1");
  const g2 = parseAuto(str(input, "p2", "ژنوتیپ والد دوم"), "p2");
  const L1 = g1.map((g) => g[0].toLowerCase()).join(""), L2 = g2.map((g) => g[0].toLowerCase()).join("");
  if (L1 !== L2) fail(`هر دو والد باید ژن‌های یکسان را به ترتیب یکسان داشته باشند (${L1} در برابر ${L2}).`, "p2");
  const dom = choice(input, "dominance", "نوع غالبیت", ["complete", "incomplete"], "complete");
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
    blocks.push({ type: "table", ltr: true, caption: "مربع پانت (گامت‌های والد اول به صورت افقی و والد دوم به صورت عمودی)", head: [{ text: "♂ \\ ♀", th: true }, ...u1.map((g) => ({ text: g, th: true }))], rowHeaders: true, rows: u2.map((b) => [b, ...u1.map((a) => child(a, b))]) });
  }
  blocks.push({ type: "table", caption: "فنوتیپ‌ها", head: ["فنوتیپ", "تعداد", "احتمال"], rows: phenos.map(([p, c]) => [p, `${c}/${total}`, pct(c, total)]) });
  blocks.push({ type: "table", caption: "ژنوتیپ‌ها", head: ["ژنوتیپ", "تعداد", "احتمال"], rows: genos.map(([g, c]) => [g, `${c}/${total}`, pct(c, total)]) });
  const steps = [
    `گامت‌های والد اول (${u1.length}): ${u1.join("، ")}.`,
    `گامت‌های والد دوم (${u2.length}): ${u2.join("، ")}.`,
    `با ترکیب هر گامت از والد اول با هر گامت از والد دوم، ${total} ترکیب با احتمال یکسان به دست می‌آید.`,
    dom === "complete" ? "در غالبیت کامل، فنوتیپ غالب (A_) ظاهر می‌شود اگر حداقل یک آلل غالب وجود داشته باشد، و فنوتیپ مغلوب فقط با دو آلل مغلوب ظاهر می‌شود." : "در غالبیت ناقص هتروزیگوت فنوتیپ میانی نشان می‌دهد، پس هر ژنوتیپ یک فنوتیپ مستقل است.",
    `نسبت فنوتیپ‌ها ${pr} و نسبت ژنوتیپ‌ها ${gr} است.`
  ];
  return {
    results: [
      { label: "نسبت فنوتیپ‌ها", value: pr },
      { label: "نسبت ژنوتیپ‌ها", value: gr },
      { label: "تعداد فنوتیپ‌ها / ژنوتیپ‌ها", value: `${phenos.length} / ${genos.length}` }
    ],
    steps, blocks,
    copy: `${g1.flat().join("")} × ${g2.flat().join("")}: فنوتیپ‌ها ${pr} (${phenos.map(([p, c]) => `${p} ${pct(c, total)}`).join("، ")})، ژنوتیپ‌ها ${gr}`
  };
}

function xlinked(input) {
  const m = str(input, "p1", "ژنوتیپ مادر").replace(/\s+/g, "").match(/^X\^?([A-Za-z])X\^?([A-Za-z])$/);
  if (!m) fail("ژنوتیپ مادر را به صورت XAXa یا XaXa بنویسید (یک کروموزوم X با آلل هر کدام).", "p1");
  const f = str(input, "p2", "ژنوتیپ پدر").replace(/\s+/g, "").match(/^X\^?([A-Za-z])Y$/);
  if (!f) fail("ژنوتیپ پدر را به صورت XAY یا XaY بنویسید.", "p2");
  if (new Set([m[1], m[2], f[1]].map((c) => c.toLowerCase())).size !== 1) fail("برای آلل‌ها در هر دو والد از حرف یکسان استفاده کنید.", "p2");
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
      { label: "احتمال ابتلای پسران", value: p(affS) },
      { label: "احتمال ابتلای دختران", value: p(affD) },
      { label: "احتمال حامل بودن دختر", value: p(carD) },
      { label: "احتمال ابتلای هر فرزند", value: p(affAll) }
    ],
    steps: [
      `گامت‌های مادر: X${mom[0]} و X${mom[1]}. گامت‌های پدر: ${dad[0]} و Y.`,
      "پسران X را از مادر و Y را از پدر می‌گیرند، پس آلل مادر مستقیماً در آن‌ها ظاهر می‌شود.",
      "دختران از هر والد یک X می‌گیرند، پس دختر فقط در صورتی به صفت مغلوب مبتلا می‌شود که دو آلل مغلوب داشته باشد.",
      `نتیجه: پسران مبتلا ${p(affS)}، دختران مبتلا ${p(affD)}، دختران حامل ${p(carD)}.`
    ],
    blocks: [{ type: "table", ltr: true, caption: "مربع پانت برای وراثت وابسته به X", head: [{ text: "♂ \\ ♀", th: true }, ...mom.map((a) => ({ text: `X${a}`, th: true }))], rowHeaders: true, rows: dad.map((d, i) => [d, ...cells.slice(2 * i, 2 * i + 2).map((c) => `${c.g}${c.aff ? " (مبتلا)" : c.carrier ? " (حامل)" : ""}`)]) }],
    copy: `X${mom.join("X")} × ${dad[0]}Y: پسران مبتلا ${p(affS)}، دختران مبتلا ${p(affD)}، دختران حامل ${p(carD)}`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "نوع وراثت", ["auto", "xlinked"], "auto");
  return mode === "auto" ? autosomal(input) : xlinked(input);
}
