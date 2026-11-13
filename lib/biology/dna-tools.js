import { fail, str, choice } from "../core/validate.js";
import { fmt, tex as ntex } from "../core/format.js";
import { CODONS, AMINO } from "./codons.js";

export const meta = {
  description: "حلّل تسلسل DNA أو RNA: السلسلة المتممة والمتممة المعكوسة، والنسخ إلى mRNA، والترجمة إلى بروتين بجدول الشيفرة الوراثية، ونسبة GC ودرجة الانصهار التقريبية.",
  keywords: ["DNA", "RNA", "mRNA", "النسخ", "الترجمة", "الشيفرة الوراثية", "كودون", "codon", "بروتين", "أحماض أمينية", "السلسلة المتممة", "reverse complement", "GC content", "درجة الانصهار"],
  formulas: [
    { label: "نسبة GC", tex: "\\%GC = \\frac{G + C}{N} \\times 100" },
    { label: "درجة الانصهار التقريبية", tex: "T_m = 2(A+T) + 4(G+C)\\ \\ (N < 14),\\qquad T_m = 64.9 + 41\\,\\frac{G + C - 16.4}{N}" }
  ],
  inputs: [
    { id: "seq", label: "التسلسل", type: "textarea", default: "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG", wide: true, help: "حروف A و T (أو U) و G و C فقط. المسافات والأرقام والأسطر تُتجاهل." },
    { id: "strand", label: "نوع السلسلة المُدخلة", type: "select", default: "coding", options: [["coding", "DNA السلسلة المشفِّرة (5′→3′)"], ["template", "DNA السلسلة القالب (3′→5′)"], ["rna", "mRNA (5′→3′)"]] },
    { id: "frame", label: "بداية الترجمة", type: "select", default: "aug", options: [["aug", "من أول كودون بدء AUG"], ["1", "إطار القراءة 1"], ["2", "إطار القراءة 2"], ["3", "إطار القراءة 3"]] }
  ],
  example: { values: { seq: "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG", strand: "coding", frame: "aug" }, expect: ["MAIVMGR*", "GC = 56.41%"], note: "مثال: جين قصير يبدأ بـ ATG وينتهي بكودون توقف." },
  invalid: { values: { seq: "ATGXYZ", strand: "coding", frame: "aug" } },
  related: ["punnett-square", "hardy-weinberg", "molar-mass"]
};

const COMP = { A: "T", T: "A", G: "C", C: "G", U: "A" };

export function solve(input) {
  const raw = str(input, "seq", "التسلسل").toUpperCase().replace(/[\s\d\-'′5]/g, "").replace(/^5|3$/g, "");
  const strand = choice(input, "strand", "نوع السلسلة", ["coding", "template", "rna"], "coding");
  const frame = choice(input, "frame", "بداية الترجمة", ["aug", "1", "2", "3"], "aug");
  const bad = raw.match(/[^ACGTU]/);
  if (bad) fail(`الحرف «${bad[0]}» ليس قاعدة نيتروجينية. استخدم A و C و G و T أو U فقط.`, "seq");
  if (!raw.length) fail("أدخل التسلسل.", "seq");
  if (raw.includes("T") && raw.includes("U")) fail("التسلسل يحتوي T و U معاً؛ DNA يستخدم T و RNA يستخدم U.", "seq");
  if (strand === "rna" && raw.includes("T")) fail("اخترت mRNA لكن التسلسل يحتوي T. غيّر النوع إلى DNA أو استبدل T بـ U.", "strand");
  if (strand !== "rna" && raw.includes("U")) fail("اخترت DNA لكن التسلسل يحتوي U. غيّر النوع إلى mRNA.", "strand");
  const steps = [];
  let coding;
  if (strand === "coding") { coding = raw; steps.push("السلسلة المشفِّرة لها تسلسل mRNA نفسه مع استبدال T بـ U."); }
  else if (strand === "template") { coding = [...raw].map((b) => COMP[b]).join(""); steps.push("السلسلة القالب تُقرأ 3′→5′، فنأخذ متممها (A↔T و G↔C) لنحصل على السلسلة المشفِّرة 5′→3′."); }
  else { coding = raw.replace(/U/g, "T"); steps.push("أُدخل mRNA مباشرة، فالسلسلة المشفِّرة في DNA هي نفسه مع استبدال U بـ T."); }
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
    if (start < 0) fail("لا يوجد كودون بدء AUG في التسلسل. اختر إطار قراءة محدداً بدلاً من ذلك.", "frame");
  } else start = Number(frame) - 1;
  const codons = [];
  for (let i = start; i + 3 <= mrna.length; i += 3) {
    const c = mrna.slice(i, i + 3);
    codons.push(c);
    if (CODONS[c] === "*") break;
  }
  if (!codons.length) fail("التسلسل أقصر من كودون واحد في هذا الإطار.", "seq");
  const prot = codons.map((c) => CODONS[c]).join("");
  const three = codons.map((c) => AMINO[CODONS[c]].three).join("-");
  const stopped = prot.endsWith("*");
  steps.push(
    { text: "النسخ: mRNA مطابق للسلسلة المشفِّرة مع U مكان T:", tex: `\\texttt{5'-${mrna.slice(0, 60)}${mrna.length > 60 ? "\\ldots" : ""}-3'}` },
    frame === "aug" ? `نبدأ الترجمة من أول AUG عند الموقع ${start + 1}، ونقرأ ثلاث قواعد في كل مرة حتى كودون التوقف.` : `نبدأ الترجمة من الموقع ${start + 1} (إطار القراءة ${frame}).`,
    `الترجمة: ${codons.length} كودون ← ${prot}${stopped ? " (النجمة تعني كودون توقف)" : " (لم يُصادف كودون توقف)"}.`,
    { text: "نسبة GC ودرجة الانصهار التقريبية:", tex: `\\%GC = \\frac{${G} + ${C}}{${N}} \\times 100 = ${ntex(gc, 4)}\\%,\\quad T_m \\approx ${ntex(tm, 3)}\\,^{\\circ}C` }
  );
  const rows = codons.map((c, i) => {
    const a = AMINO[CODONS[c]];
    return [String(i + 1), c, CODONS[c], a.three, a.ar];
  });
  const blocks = [{ type: "table", ltr: false, caption: "الكودونات والأحماض الأمينية", head: ["#", "الكودون", "الرمز", "الرمز الثلاثي", "الحمض الأميني"], rows }];
  if (!stopped) blocks.push({ type: "note", tone: "warn", text: "انتهى التسلسل قبل الوصول إلى كودون توقف، فالبروتين قد يكون غير مكتمل." });
  if (frame === "aug" && start > 0) blocks.push({ type: "note", text: `القواعد قبل الموقع ${start + 1} منطقة غير مترجمة (5′ UTR).` });
  return {
    results: [
      { label: "الطول", value: `${N} قاعدة` },
      { label: "السلسلة المتممة (3′→5′)", value: comp },
      { label: "المتممة المعكوسة (5′→3′)", value: rc },
      { label: "mRNA (5′→3′)", value: mrna },
      { label: "البروتين (رمز أحادي)", value: prot },
      { label: "البروتين (رمز ثلاثي)", value: three },
      { label: "نسبة GC", value: `${fmt(gc, 4)}%` },
      { label: "درجة الانصهار التقريبية", value: `${fmt(tm, 3)} °C` },
      { label: "تكرار القواعد", value: `A ${A}، ${strand === "rna" ? "U" : "T"} ${T}، G ${G}، C ${C}` }
    ],
    steps, blocks,
    copy: `mRNA: ${mrna} | البروتين: ${prot} | GC = ${fmt(gc, 4)}% | المتممة المعكوسة: ${rc}`
  };
}
