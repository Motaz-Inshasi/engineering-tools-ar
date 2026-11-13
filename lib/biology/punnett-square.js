import { fail, str, choice } from "../core/validate.js";
import { fmt } from "../core/format.js";

export const meta = {
  description: "ارسم مربع بانيت لأي تزاوج بين أبوين (جين واحد حتى أربعة جينات، أو صفة مرتبطة بالكروموسوم X)، واحسب نسب الطرز الجينية والمظهرية واحتمال كل منها خطوة بخطوة.",
  keywords: ["مربع بانيت", "punnett square", "الوراثة المندلية", "طراز جيني", "طراز مظهري", "سائد", "متنحي", "هجين ثنائي", "9:3:3:1", "مرتبط بالجنس", "X-linked"],
  formulas: [
    { label: "عدد الأمشاج لكل أب", tex: "2^{h}\\ \\ (h = \\text{عدد الجينات الهجينة})" },
    { label: "قاعدة الضرب للجينات المستقلة", tex: "P(\\text{A\\_ bb}) = P(\\text{A\\_}) \\times P(\\text{bb})" }
  ],
  inputs: [
    { id: "mode", label: "نوع الوراثة", type: "select", default: "auto", options: [["auto", "جينات جسمية"], ["xlinked", "مرتبطة بالكروموسوم X"]] },
    { id: "p1", label: "الطراز الجيني للأب الأول", type: "text", default: "AaBb", help: "اكتب كل جين بحرفين متتاليين: الكبير للسائد والصغير للمتنحي، مثل Aa أو AaBb. وفي الوراثة المرتبطة بـ X اكتب الأم مثل XAXa." },
    { id: "p2", label: "الطراز الجيني للأب الثاني", type: "text", default: "AaBb", help: "في الوراثة المرتبطة بـ X اكتب الأب مثل XAY أو XaY." },
    { id: "dominance", label: "نوع السيادة", type: "select", default: "complete", options: [["complete", "سيادة تامة"], ["incomplete", "سيادة غير تامة (الهجين طراز ثالث)"]], when: { mode: ["auto"] } }
  ],
  example: { values: { mode: "auto", p1: "AaBb", p2: "AaBb", dominance: "complete" }, expect: ["9:3:3:1"], note: "مثال: تزاوج هجينين ثنائيين في تجربة مندل." },
  invalid: { values: { mode: "auto", p1: "AaB", p2: "AaBb", dominance: "complete" } },
  related: ["hardy-weinberg", "dna-tools", "probability-distributions"]
};

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const ratio = (counts) => { const g = counts.reduce(gcd); return counts.map((c) => c / g).join(":"); };
const pct = (c, t) => `${fmt((100 * c) / t, 4)}%`;

function parseAuto(raw, field) {
  const s = raw.replace(/\s+/g, "");
  if (!/^[A-Za-z]+$/.test(s)) fail("استخدم الحروف الإنجليزية فقط، مثل AaBb.", field);
  if (s.length % 2) fail("كل جين يُكتب بحرفين (أليلين)، فعدد الحروف يجب أن يكون زوجياً.", field);
  const genes = [];
  for (let i = 0; i < s.length; i += 2) {
    if (s[i].toLowerCase() !== s[i + 1].toLowerCase()) fail(`الحرفان «${s[i]}${s[i + 1]}» لا يمثلان الجين نفسه. اكتب كل جين بحرفين من الحرف نفسه مثل Aa.`, field);
    genes.push([s[i], s[i + 1]]);
  }
  if (genes.length > 4) fail("الحد الأقصى أربعة جينات.", field);
  const letters = genes.map((g) => g[0].toLowerCase());
  if (new Set(letters).size !== letters.length) fail("كل جين يجب أن يُكتب بحرف مختلف.", field);
  return genes;
}

const orderPair = (a, b) => (a === a.toUpperCase() && b !== b.toUpperCase() ? a + b : b === b.toUpperCase() && a !== a.toUpperCase() ? b + a : a <= b ? a + b : b + a);

function gametes(genes) {
  return genes.reduce((acc, g) => acc.flatMap((x) => [x + g[0], x + g[1]]), [""]);
}

function autosomal(input) {
  const g1 = parseAuto(str(input, "p1", "الطراز الجيني للأب الأول"), "p1");
  const g2 = parseAuto(str(input, "p2", "الطراز الجيني للأب الثاني"), "p2");
  const L1 = g1.map((g) => g[0].toLowerCase()).join(""), L2 = g2.map((g) => g[0].toLowerCase()).join("");
  if (L1 !== L2) fail(`الأبوان يجب أن يحملا الجينات نفسها بالترتيب نفسه (${L1} مقابل ${L2}).`, "p2");
  const dom = choice(input, "dominance", "نوع السيادة", ["complete", "incomplete"], "complete");
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
    blocks.push({ type: "table", ltr: true, caption: "مربع بانيت (أمشاج الأب الأول أفقياً والثاني رأسياً)", head: [{ text: "♂ \\ ♀", th: true }, ...u1.map((g) => ({ text: g, th: true }))], rowHeaders: true, rows: u2.map((b) => [b, ...u1.map((a) => child(a, b))]) });
  }
  blocks.push({ type: "table", caption: "الطرز المظهرية", head: ["الطراز المظهري", "العدد", "الاحتمال"], rows: phenos.map(([p, c]) => [p, `${c}/${total}`, pct(c, total)]) });
  blocks.push({ type: "table", caption: "الطرز الجينية", head: ["الطراز الجيني", "العدد", "الاحتمال"], rows: genos.map(([g, c]) => [g, `${c}/${total}`, pct(c, total)]) });
  const steps = [
    `أمشاج الأب الأول (${u1.length}): ${u1.join("، ")}.`,
    `أمشاج الأب الثاني (${u2.length}): ${u2.join("، ")}.`,
    `نجمع كل مشيج من الأول مع كل مشيج من الثاني فنحصل على ${total} تركيباً متساوية الاحتمال.`,
    dom === "complete" ? "في السيادة التامة يظهر الطراز السائد (A_) إذا وُجد أليل سائد واحد على الأقل، ولا يظهر المتنحي إلا مع أليلين متنحيين." : "في السيادة غير التامة يظهر الهجين بطراز وسطي، فكل طراز جيني طراز مظهري مستقل.",
    `نسبة الطرز المظهرية ${pr}، ونسبة الطرز الجينية ${gr}.`
  ];
  return {
    results: [
      { label: "نسبة الطرز المظهرية", value: pr },
      { label: "نسبة الطرز الجينية", value: gr },
      { label: "عدد الطرز المظهرية / الجينية", value: `${phenos.length} / ${genos.length}` }
    ],
    steps, blocks,
    copy: `${g1.flat().join("")} × ${g2.flat().join("")}: الطرز المظهرية ${pr} (${phenos.map(([p, c]) => `${p} ${pct(c, total)}`).join("، ")})، الطرز الجينية ${gr}`
  };
}

function xlinked(input) {
  const m = str(input, "p1", "طراز الأم").replace(/\s+/g, "").match(/^X\^?([A-Za-z])X\^?([A-Za-z])$/);
  if (!m) fail("اكتب طراز الأم بالشكل XAXa أو XaXa (كروموسوما X مع أليل كل منهما).", "p1");
  const f = str(input, "p2", "طراز الأب").replace(/\s+/g, "").match(/^X\^?([A-Za-z])Y$/);
  if (!f) fail("اكتب طراز الأب بالشكل XAY أو XaY.", "p2");
  if (new Set([m[1], m[2], f[1]].map((c) => c.toLowerCase())).size !== 1) fail("استخدم الحرف نفسه للأليلات في الأبوين.", "p2");
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
      { label: "احتمال إصابة الذكور", value: p(affS) },
      { label: "احتمال إصابة الإناث", value: p(affD) },
      { label: "احتمال أن تكون الأنثى حاملة", value: p(carD) },
      { label: "احتمال أن يكون أي مولود مصاباً", value: p(affAll) }
    ],
    steps: [
      `أمشاج الأم: X${mom[0]} و X${mom[1]}. أمشاج الأب: ${dad[0]} و Y.`,
      "الأبناء الذكور يأخذون X من الأم و Y من الأب، فيظهر عليهم أليل الأم مباشرة.",
      "البنات يأخذن X من كل أب، فلا تُصاب البنت بصفة متنحية إلا إذا حملت أليلين متنحيين.",
      `النتيجة: إصابة الذكور ${p(affS)}، وإصابة الإناث ${p(affD)}، والإناث الحاملات ${p(carD)}.`
    ],
    blocks: [{ type: "table", ltr: true, caption: "مربع بانيت للوراثة المرتبطة بـ X", head: [{ text: "♂ \\ ♀", th: true }, ...mom.map((a) => ({ text: `X${a}`, th: true }))], rowHeaders: true, rows: dad.map((d, i) => [d, ...cells.slice(2 * i, 2 * i + 2).map((c) => `${c.g}${c.aff ? " (مصاب)" : c.carrier ? " (حاملة)" : ""}`)]) }],
    copy: `X${mom.join("X")} × ${dad[0]}Y: ذكور مصابون ${p(affS)}، إناث مصابات ${p(affD)}، إناث حاملات ${p(carD)}`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "نوع الوراثة", ["auto", "xlinked"], "auto");
  return mode === "auto" ? autosomal(input) : xlinked(input);
}
