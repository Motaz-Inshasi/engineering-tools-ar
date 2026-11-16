import { fail, str, choice } from "../core/validate.js";
import { fmt, tex as ntex } from "../core/format.js";
import { CODONS, AMINO } from "./codons.js";

export const meta = {
  description: "تحلیل توالی DNA یا RNA: رشته مکمل و مکمل معکوس، رونویسی به mRNA، ترجمه به پروتئین با جدول رمز ژنتیکی، درصد GC و دمای ذوب تقریبی.",
  keywords: ["DNA", "RNA", "mRNA", "رونویسی", "ترجمه", "رمز ژنتیکی", "کدون", "codon", "پروتئین", "اسیدهای آمینه", "رشته مکمل", "reverse complement", "GC content", "دمای ذوب"],
  formulas: [
    { label: "درصد GC", tex: "\\%GC = \\frac{G + C}{N} \\times 100" },
    { label: "دمای ذوب تقریبی", tex: "T_m = 2(A+T) + 4(G+C)\\ \\ (N < 14),\\qquad T_m = 64.9 + 41\\,\\frac{G + C - 16.4}{N}" }
  ],
  inputs: [
    { id: "seq", label: "توالی", type: "textarea", default: "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG", wide: true, help: "فقط حروف A و T (یا U) و G و C. فاصله‌ها، ارقام و خط‌های جدید نادیده گرفته می‌شوند." },
    { id: "strand", label: "نوع رشته وارد شده", type: "select", default: "coding", options: [["coding", "DNA رشته رمزکننده (5′→3′)"], ["template", "DNA رشته الگو (3′→5′)"], ["rna", "mRNA (5′→3′)"]] },
    { id: "frame", label: "شروع ترجمه", type: "select", default: "aug", options: [["aug", "از اولین کدون شروع AUG"], ["1", "چارچوب خواندن 1"], ["2", "چارچوب خواندن 2"], ["3", "چارچوب خواندن 3"]] }
  ],
  example: { values: { seq: "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG", strand: "coding", frame: "aug" }, expect: ["MAIVMGR*", "GC = 56.41%"], note: "مثال: ژن کوتاهی که با ATG شروع و با کدون پایان می‌شود." },
  invalid: { values: { seq: "ATGXYZ", strand: "coding", frame: "aug" } },
  related: ["punnett-square", "hardy-weinberg", "molar-mass"]
};

const COMP = { A: "T", T: "A", G: "C", C: "G", U: "A" };

export function solve(input) {
  const raw = str(input, "seq", "توالی").toUpperCase().replace(/[\s\d\-'′5]/g, "").replace(/^5|3$/g, "");
  const strand = choice(input, "strand", "نوع رشته", ["coding", "template", "rna"], "coding");
  const frame = choice(input, "frame", "شروع ترجمه", ["aug", "1", "2", "3"], "aug");
  const bad = raw.match(/[^ACGTU]/);
  if (bad) fail(`کاراکتر «${bad[0]}» یک باز نیتروژنی نیست. فقط A و C و G و T یا U مجازند.`, "seq");
  if (!raw.length) fail("توالی را وارد کنید.", "seq");
  if (raw.includes("T") && raw.includes("U")) fail("توالی هم T و هم U دارد؛ DNA از T و RNA از U استفاده می‌کند.", "seq");
  if (strand === "rna" && raw.includes("T")) fail("mRNA را انتخاب کرده‌اید اما توالی T دارد. نوع را به DNA تغییر دهید یا T را با U جایگزین کنید.", "strand");
  if (strand !== "rna" && raw.includes("U")) fail("DNA را انتخاب کرده‌اید اما توالی U دارد. نوع را به mRNA تغییر دهید.", "strand");
  const steps = [];
  let coding;
  if (strand === "coding") { coding = raw; steps.push("رشته رمزکننده همان توالی mRNA است که در آن T به جای U نوشته شده است."); }
  else if (strand === "template") { coding = [...raw].map((b) => COMP[b]).join(""); steps.push("رشته الگو از 3′ به 5′ خوانده می‌شود، پس مکمل آن را می‌گیریم (A↔T و G↔C) تا رشته رمزکننده 5′→3′ به دست آید."); }
  else { coding = raw.replace(/U/g, "T"); steps.push("mRNA مستقیماً وارد شده است، پس رشته رمزکننده DNA همان توالی است که در آن U با T جایگزین شده است."); }
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
    if (start < 0) fail("در توالی کدون شروع AUG وجود ندارد. در عوض یک چارچوب خواندن مشخص انتخاب کنید.", "frame");
  } else start = Number(frame) - 1;
  const codons = [];
  for (let i = start; i + 3 <= mrna.length; i += 3) {
    const c = mrna.slice(i, i + 3);
    codons.push(c);
    if (CODONS[c] === "*") break;
  }
  if (!codons.length) fail("توالی در این چارچوب کوتاه‌تر از یک کدون است.", "seq");
  const prot = codons.map((c) => CODONS[c]).join("");
  const three = codons.map((c) => AMINO[CODONS[c]].three).join("-");
  const stopped = prot.endsWith("*");
  steps.push(
    { text: "رونویسی: mRNA با رشته رمزکننده یکسان است و به جای T، U قرار دارد:", tex: `\\texttt{5'-${mrna.slice(0, 60)}${mrna.length > 60 ? "\\ldots" : ""}-3'}` },
    frame === "aug" ? `ترجمه را از اولین AUG در موقعیت ${start + 1} شروع می‌کنیم و هر بار سه باز می‌خوانیم تا به کدون پایان برسیم.` : `ترجمه را از موقعیت ${start + 1} شروع می‌کنیم (چارچوب خواندن ${frame}).`,
    `ترجمه: ${codons.length} کدون ← ${prot}${stopped ? " (ستاره نشان‌دهنده کدون پایان است)" : " (کدون پایان یافت نشد)"}.`,
    { text: "درصد GC و دمای ذوب تقریبی:", tex: `\\%GC = \\frac{${G} + ${C}}{${N}} \\times 100 = ${ntex(gc, 4)}\\%,\\quad T_m \\approx ${ntex(tm, 3)}\\,^{\\circ}C` }
  );
  const rows = codons.map((c, i) => {
    const a = AMINO[CODONS[c]];
    return [String(i + 1), c, CODONS[c], a.three, a.ar];
  });
  const blocks = [{ type: "table", ltr: false, caption: "کدون‌ها و اسیدهای آمینه", head: ["#", "کدون", "نماد", "کد سه‌حرفی", "اسید آمینه"], rows }];
  if (!stopped) blocks.push({ type: "note", tone: "warn", text: "توالی پیش از رسیدن به کدون پایان تمام شد، پس پروتئین ممکن است ناقص باشد." });
  if (frame === "aug" && start > 0) blocks.push({ type: "note", text: `بازهای پیش از موقعیت ${start + 1} ناحیه ترجمه‌نشده (5′ UTR) هستند.` });
  return {
    results: [
      { label: "طول", value: `${N} باز` },
      { label: "رشته مکمل (3′→5′)", value: comp },
      { label: "مکمل معکوس (5′→3′)", value: rc },
      { label: "mRNA (5′→3′)", value: mrna },
      { label: "پروتئین (کد تک‌حرفی)", value: prot },
      { label: "پروتئین (کد سه‌حرفی)", value: three },
      { label: "درصد GC", value: `${fmt(gc, 4)}%` },
      { label: "دمای ذوب تقریبی", value: `${fmt(tm, 3)} °C` },
      { label: "شمار بازها", value: `A ${A}، ${strand === "rna" ? "U" : "T"} ${T}، G ${G}، C ${C}` }
    ],
    steps, blocks,
    copy: `mRNA: ${mrna} | پروتئین: ${prot} | GC = ${fmt(gc, 4)}% | مکمل معکوس: ${rc}`
  };
}
