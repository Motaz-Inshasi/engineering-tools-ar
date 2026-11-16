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
  description: "Count words, characters, sentences, paragraphs, Arabic and Latin letters, and digits, with reading time, speaking time and the most frequent words.",
  keywords: ["Word counter", "word counter", "Character count", "reading time", "speaking time", "word frequency"],
  formulas: [
    { label: "reading time", tex: "t_r = \\frac{N_w}{v_r} \\times 60" },
    { label: "speaking time", tex: "t_s = \\frac{N_w}{v_s} \\times 60" }
  ],
  inputs: [
    { id: "text", label: "Text", type: "textarea", rows: 6, placeholder: "Type or paste the text here", help: "Counts Arabic and English text together." },
    { id: "readWpm", label: "Reading speed", unit: "words/min", type: "number", default: "200" },
    { id: "speakWpm", label: "Speaking speed", unit: "words/min", type: "number", default: "130" }
  ],
  example: { values: { text: "Knowledge is light and ignorance is darkness. Read at least one page every day!", readWpm: "200", speakWpm: "130" }, expect: ["Words: 14", "Characters: 79"], note: "Example: two short English sentences." },
  invalid: { values: { text: "   ", readWpm: "200", speakWpm: "130" } },
  related: ["citation-generator", "study-planner", "gpa-calculator"]
};

export function solve(input) {
  const t = str(input, "text", "Text").trim();
  if (t === "") fail("Enter text to count.", "text");
  const readWpm = num(input, "readWpm", "Reading speed", { positive: true, max: 2000 });
  const speakWpm = num(input, "speakWpm", "Speaking speed", { positive: true, max: 2000 });
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
    { text: "Number of words (separated by spaces):", tex: `N_w = ${ntex(W, 6)}` },
    { text: "Reading time:", tex: `t_r = \\frac{${ntex(W, 6)}}{${ntex(readWpm, 6)}} \\times 60 = ${ntex(readSec, 4)}\\ s` },
    { text: "Speaking time:", tex: `t_s = \\frac{${ntex(W, 6)}}{${ntex(speakWpm, 6)}} \\times 60 = ${ntex(speakSec, 4)}\\ s` }
  ];
  return {
    results: [
      { label: "Word count", value: fmt(W), text: `Words: ${fmt(W)}` },
      { label: "Characters with spaces", value: fmt(chars), text: `Characters: ${fmt(chars)}` },
      { label: "Characters without spaces", value: fmt(charsNoSpace) },
      { label: "Number of sentences", value: fmt(sentences) },
      { label: "Number of paragraphs", value: fmt(paragraphs) },
      { label: "Arabic letters", value: fmt(arabic) },
      { label: "Latin letters", value: fmt(latin) },
      { label: "Digits", value: fmt(digits) },
      { label: "Reading time (min:sec)", value: rs, text: `Reading time: ${rs}` },
      { label: "Speaking time (min:sec)", value: ss, text: `Speaking time: ${ss}` },
      { label: "Average word length", value: `${fmt(avgLen, 3)} characters` }
    ],
    steps,
    blocks: [{ type: "table", caption: "Top 10 most frequent words (3 or more characters long)", ltr: true, head: ["#", "Word", "Frequency"], rows: top.map(([w, n], i) => [String(i + 1), w, fmt(n)]) }],
    copy: `Words: ${fmt(W)}, characters: ${fmt(chars)}, reading time: ${rs}, speaking time: ${ss}`,
    values: { W, chars, charsNoSpace, sentences, paragraphs, arabic, latin, digits, readSec, speakSec, avgLen, top }
  };
}
