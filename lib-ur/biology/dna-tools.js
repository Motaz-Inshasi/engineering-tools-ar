import { fail, str, choice } from "../core/validate.js";
import { fmt, tex as ntex } from "../core/format.js";
import { CODONS, AMINO } from "./codons.js";

export const meta = {
  description: "DNA یا RNA کے سلسلے کا تجزیہ کریں: مکمل اور الٹ مکمل سلسلہ، mRNA میں نقل (ٹرانسکرپشن)، جینیاتی کوڈ کے جدول سے پروٹین میں ترجمہ (ٹرانسلیشن)، GC فیصد اور تقریبی میلٹنگ ٹمپریچر۔",
  keywords: ["DNA", "RNA", "mRNA", "نقل (ٹرانسکرپشن)", "ترجمہ (ٹرانسلیشن)", "جینیاتی کوڈ", "کوڈون", "codon", "پروٹین", "امینو ایسڈز", "مکمل سلسلہ", "reverse complement", "GC content", "میلٹنگ ٹمپریچر"],
  formulas: [
    { label: "GC فیصد", tex: "\\%GC = \\frac{G + C}{N} \\times 100" },
    { label: "تقریبی میلٹنگ ٹمپریچر", tex: "T_m = 2(A+T) + 4(G+C)\\ \\ (N < 14),\\qquad T_m = 64.9 + 41\\,\\frac{G + C - 16.4}{N}" }
  ],
  inputs: [
    { id: "seq", label: "سلسلہ", type: "textarea", default: "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG", wide: true, help: "صرف حروف A، T (یا U)، G اور C۔ خالی جگہیں، ہندسے اور لائنیں نظر انداز کی جاتی ہیں۔" },
    { id: "strand", label: "درج شدہ سلسلے کی قسم", type: "select", default: "coding", options: [["coding", "DNA کوڈنگ سٹرینڈ (5′→3′)"], ["template", "DNA ٹیمپلیٹ سٹرینڈ (3′→5′)"], ["rna", "mRNA (5′→3′)"]] },
    { id: "frame", label: "ترجمے کا آغاز", type: "select", default: "aug", options: [["aug", "پہلے AUG آغازی کوڈون سے"], ["1", "ریڈنگ فریم 1"], ["2", "ریڈنگ فریم 2"], ["3", "ریڈنگ فریم 3"]] }
  ],
  example: { values: { seq: "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG", strand: "coding", frame: "aug" }, expect: ["MAIVMGR*", "GC = 56.41%"], note: "مثال: ایک مختصر جین جو ATG سے شروع ہو اور اسٹاپ کوڈون پر ختم ہو۔" },
  invalid: { values: { seq: "ATGXYZ", strand: "coding", frame: "aug" } },
  related: ["punnett-square", "hardy-weinberg", "molar-mass"]
};

const COMP = { A: "T", T: "A", G: "C", C: "G", U: "A" };

export function solve(input) {
  const raw = str(input, "seq", "سلسلہ").toUpperCase().replace(/[\s\d\-'′5]/g, "").replace(/^5|3$/g, "");
  const strand = choice(input, "strand", "سٹرینڈ کی قسم", ["coding", "template", "rna"], "coding");
  const frame = choice(input, "frame", "ترجمے کا آغاز", ["aug", "1", "2", "3"], "aug");
  const bad = raw.match(/[^ACGTU]/);
  if (bad) fail(`حرف “${bad[0]}” نائٹروجن بیس نہیں ہے۔ صرف A، C، G، T یا U استعمال کریں۔`, "seq");
  if (!raw.length) fail("سلسلہ درج کریں۔", "seq");
  if (raw.includes("T") && raw.includes("U")) fail("سلسلے میں T اور U دونوں موجود ہیں؛ DNA میں T اور RNA میں U استعمال ہوتا ہے۔", "seq");
  if (strand === "rna" && raw.includes("T")) fail("آپ نے mRNA منتخب کیا ہے لیکن سلسلے میں T ہے۔ قسم DNA میں بدلیں یا T کی جگہ U لکھیں۔", "strand");
  if (strand !== "rna" && raw.includes("U")) fail("آپ نے DNA منتخب کیا ہے لیکن سلسلے میں U ہے۔ قسم mRNA میں بدلیں۔", "strand");
  const steps = [];
  let coding;
  if (strand === "coding") { coding = raw; steps.push("کوڈنگ سٹرینڈ کا سلسلہ mRNA جیسا ہے، جہاں T کی جگہ U ہے۔"); }
  else if (strand === "template") { coding = [...raw].map((b) => COMP[b]).join(""); steps.push("ٹیمپلیٹ سٹرینڈ 3′→5′ پڑھا جاتا ہے، اس لیے ہم اس کا مکمل سلسلہ (A↔T اور G↔C) لیتے ہیں تاکہ کوڈنگ سٹرینڈ 5′→3′ حاصل ہو۔"); }
  else { coding = raw.replace(/U/g, "T"); steps.push("mRNA براہِ راست درج کیا گیا، اس لیے DNA کا کوڈنگ سٹرینڈ وہی ہے جہاں U کی جگہ T ہے۔"); }
  const mrna = coding.replace(/T/g, "U");
  const comp = [...coding].map((b) => COMP[b]).join("");
  const rc = [...comp].reverse().join("");
  const N = coding.length;
  const cnt = (b) => [...coding].filter((x) => x === b).length;
  const A = cnt("A"), T = cnt("T"), G = cnt("G"), C = cnt("C");
  const gc = (100 * (G + C)) / N;
  const tm = N < 14 ? 2 * (A + T) + 4 * (G + C) : 64.9 + (41 * (G + C - 16.4)) / N;
  let start;
  if (frame === "aug") {
    start = mrna.indexOf("AUG");
    if (start < 0) fail("سلسلے میں کوئی آغازی کوڈون AUG نہیں ہے۔ اس کے بجائے کوئی مخصوص ریڈنگ فریم منتخب کریں۔", "frame");
  } else start = Number(frame) - 1;
  const codons = [];
  for (let i = start; i + 3 <= mrna.length; i += 3) {
    const c = mrna.slice(i, i + 3);
    codons.push(c);
    if (CODONS[c] === "*") break;
  }
  if (!codons.length) fail("اس فریم میں سلسلہ ایک کوڈون سے بھی چھوٹا ہے۔", "seq");
  const prot = codons.map((c) => CODONS[c]).join("");
  const three = codons.map((c) => AMINO[CODONS[c]].three).join("-");
  const stopped = prot.endsWith("*");
  steps.push(
    { text: "نقل: mRNA کوڈنگ سٹرینڈ کے مطابق ہے، جہاں T کی جگہ U ہے:", tex: `\\texttt{5'-${mrna.slice(0, 60)}${mrna.length > 60 ? "\\ldots" : ""}-3'}` },
    frame === "aug" ? `ترجمہ پہلے AUG سے پوزیشن ${start + 1} پر شروع ہوتا ہے، اور ہر بار تین بیسز پڑھتے ہیں یہاں تک کہ اسٹاپ کوڈون آئے۔` : `ترجمہ پوزیشن ${start + 1} سے شروع ہوتا ہے (ریڈنگ فریم ${frame})۔`,
    `ترجمہ: ${codons.length} کوڈون ← ${prot}${stopped ? " (ستارہ اسٹاپ کوڈون کو ظاہر کرتا ہے)" : " (کوئی اسٹاپ کوڈون نہیں ملا)"}۔`,
    { text: "GC فیصد اور تقریبی میلٹنگ ٹمپریچر:", tex: `\\%GC = \\frac{${G} + ${C}}{${N}} \\times 100 = ${ntex(gc, 4)}\\%,\\quad T_m \\approx ${ntex(tm, 3)}\\,^{\\circ}C` }
  );
  const rows = codons.map((c, i) => {
    const a = AMINO[CODONS[c]];
    return [String(i + 1), c, CODONS[c], a.three, a.ar];
  });
  const blocks = [{ type: "table", ltr: false, caption: "کوڈونز اور امینو ایسڈز", head: ["#", "کوڈون", "علامت", "تین حرفی علامت", "امینو ایسڈ"], rows }];
  if (!stopped) blocks.push({ type: "note", tone: "warn", text: "سلسلہ اسٹاپ کوڈون تک پہنچنے سے پہلے ختم ہو گیا، اس لیے پروٹین نامکمل ہو سکتا ہے۔" });
  if (frame === "aug" && start > 0) blocks.push({ type: "note", text: `پوزیشن ${start + 1} سے پہلے کے بیسز غیر ترجمہ شدہ علاقہ (5′ UTR) ہیں۔` });
  return {
    results: [
      { label: "لمبائی", value: `${N} بیس` },
      { label: "مکمل سلسلہ (3′→5′)", value: comp },
      { label: "الٹ مکمل سلسلہ (5′→3′)", value: rc },
      { label: "mRNA (5′→3′)", value: mrna },
      { label: "پروٹین (ایک حرفی کوڈ)", value: prot },
      { label: "پروٹین (تین حرفی کوڈ)", value: three },
      { label: "GC فیصد", value: `${fmt(gc, 4)}%` },
      { label: "تقریبی میلٹنگ ٹمپریچر", value: `${fmt(tm, 3)} °C` },
      { label: "بیسز کی گنتی", value: `A ${A}، ${strand === "rna" ? "U" : "T"} ${T}، G ${G}، C ${C}` }
    ],
    steps, blocks,
    copy: `mRNA: ${mrna} | پروٹین: ${prot} | GC = ${fmt(gc, 4)}% | الٹ مکمل سلسلہ: ${rc}`
  };
}
