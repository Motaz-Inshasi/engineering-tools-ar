import { fail, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CHAR = (ch) => Array.from(ch);

function norm(w) {
  return w.replace(/[ً-ٰٟـ]/g, "").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
}

function clock(sec) {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export const meta = {
  description: "احسب عدد الكلمات والأحرف والجمل والفقرات والحروف العربية واللاتينية والأرقام، مع زمن القراءة وزمن الإلقاء وأكثر الكلمات تكراراً.",
  keywords: ["عداد الكلمات", "word counter", "عدد الأحرف", "زمن القراءة", "زمن الإلقاء", "تكرار الكلمات"],
  formulas: [
    { label: "زمن القراءة", tex: "t_r = \\frac{N_w}{v_r} \\times 60" },
    { label: "زمن الإلقاء", tex: "t_s = \\frac{N_w}{v_s} \\times 60" }
  ],
  inputs: [
    { id: "text", label: "النص", type: "textarea", rows: 6, placeholder: "اكتب أو الصق النص هنا", help: "يُحسب بالعربية والإنجليزية معاً." },
    { id: "readWpm", label: "سرعة القراءة", unit: "كلمة/دقيقة", type: "number", default: "200" },
    { id: "speakWpm", label: "سرعة الإلقاء", unit: "كلمة/دقيقة", type: "number", default: "130" }
  ],
  example: { values: { text: "العلم نور والجهل ظلام. اقرأ كل يوم صفحة واحدة على الأقل!", readWpm: "200", speakWpm: "130" }, expect: ["الكلمات: 11", "الأحرف: 56"], note: "مثال: جملتان عربيتان قصيرتان." },
  invalid: { values: { text: "   ", readWpm: "200", speakWpm: "130" } },
  related: ["citation-generator", "study-planner", "gpa-calculator"]
};

export function solve(input) {
  const t = str(input, "text", "النص").trim();
  if (t === "") fail("أدخل نصاً لعدّه.", "text");
  const readWpm = num(input, "readWpm", "سرعة القراءة", { positive: true, max: 2000 });
  const speakWpm = num(input, "speakWpm", "سرعة الإلقاء", { positive: true, max: 2000 });
  const words = t.split(/\s+/).filter(Boolean);
  const W = words.length;
  const chars = CHAR(t).length;
  const charsNoSpace = CHAR(t.replace(/\s/g, "")).length;
  const sentences = t.split(/[.!?؟\n]+/).filter((s) => /[\p{L}\p{N}]/u.test(s)).length;
  const paragraphs = t.split(/\n\s*\n/).filter((p) => p.trim() !== "").length;
  const all = CHAR(t);
  const arabic = all.filter((c) => /\p{L}/u.test(c) && /\p{Script=Arabic}/u.test(c)).length;
  const latin = all.filter((c) => /\p{L}/u.test(c) && /\p{Script=Latin}/u.test(c)).length;
  const digits = all.filter((c) => /\p{Nd}/u.test(c)).length;
  const readSec = (W / readWpm) * 60;
  const speakSec = (W / speakWpm) * 60;
  const lens = words.map(norm).filter((w) => w !== "").map((w) => CHAR(w).length);
  const avgLen = lens.length ? lens.reduce((s, n) => s + n, 0) / lens.length : 0;
  const tally = new Map();
  for (const w of words.map(norm)) {
    if (CHAR(w).length >= 3) tally.set(w, (tally.get(w) || 0) + 1);
  }
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).slice(0, 10);
  const rs = clock(readSec), ss = clock(speakSec);
  const steps = [
    { text: "عدد الكلمات (مفصولة بالمسافات):", tex: `N_w = ${ntex(W, 6)}` },
    { text: "زمن القراءة:", tex: `t_r = \\frac{${ntex(W, 6)}}{${ntex(readWpm, 6)}} \\times 60 = ${ntex(readSec, 4)}\\ s` },
    { text: "زمن الإلقاء:", tex: `t_s = \\frac{${ntex(W, 6)}}{${ntex(speakWpm, 6)}} \\times 60 = ${ntex(speakSec, 4)}\\ s` }
  ];
  return {
    results: [
      { label: "عدد الكلمات", value: fmt(W), text: `الكلمات: ${fmt(W)}` },
      { label: "الأحرف مع المسافات", value: fmt(chars), text: `الأحرف: ${fmt(chars)}` },
      { label: "الأحرف بدون مسافات", value: fmt(charsNoSpace) },
      { label: "عدد الجمل", value: fmt(sentences) },
      { label: "عدد الفقرات", value: fmt(paragraphs) },
      { label: "الحروف العربية", value: fmt(arabic) },
      { label: "الحروف اللاتينية", value: fmt(latin) },
      { label: "الأرقام", value: fmt(digits) },
      { label: "زمن القراءة (دقيقة:ثانية)", value: rs, text: `زمن القراءة: ${rs}` },
      { label: "زمن الإلقاء (دقيقة:ثانية)", value: ss, text: `زمن الإلقاء: ${ss}` },
      { label: "متوسط طول الكلمة", value: `${fmt(avgLen, 3)} حرف` }
    ],
    steps,
    blocks: [{ type: "table", caption: "أكثر 10 كلمات تكراراً (طولها 3 أحرف أو أكثر)", ltr: true, head: ["#", "الكلمة", "التكرار"], rows: top.map(([w, n], i) => [String(i + 1), w, fmt(n)]) }],
    copy: `الكلمات: ${fmt(W)}، الأحرف: ${fmt(chars)}، زمن القراءة: ${rs}، زمن الإلقاء: ${ss}`,
    values: { W, chars, charsNoSpace, sentences, paragraphs, arabic, latin, digits, readSec, speakSec, avgLen, top }
  };
}
