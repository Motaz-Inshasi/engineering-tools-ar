import { choice, fail, isBlank } from "../core/validate.js";
import { ERROR_DB } from "./error-db.js";

const MAX_CHARS = 200000;
const MAX_ERRORS = 3;
const LANG_KEYS = ["auto", "python", "javascript", "java", "cpp", "csharp"];
const LANG_NAMES = { python: "Python", javascript: "JavaScript / Node.js", java: "Java", cpp: "C / C++", csharp: "C#" };
const HINTS = [
  ["python", /Traceback \(most recent call last\)|File "[^"\n]{1,200}", line \d+/],
  ["javascript", /at Object\.<anonymous>|node:internal|\bnode:\w|\.(?:js|mjs|cjs):\d+/],
  ["java", /Exception in thread|\.java:\d+/],
  ["cpp", /\.(?:c|cc|cpp|h):\d+|\bg\+\+|\bgcc\b|\bclang\b/],
  ["csharp", /\bCS\d{4}\b/]
];
const LOCATIONS = [
  /File "(?<file>[^"\n]{1,200})", line (?<line>\d+)/,
  /(?<file>[\w$.\\\/-]{1,200}\.java):(?<line>\d+)/,
  /(?<file>[\w.\\\/-]{1,200}\.(?:c|cc|cpp|cxx|h|hpp)):(?<line>\d+):(?<col>\d+)/,
  /(?<file>[^\s()'"]{1,200}\.(?:js|mjs|cjs|ts)):(?<line>\d+)(?::(?<col>\d+))?/,
  /(?<file>[^\s()]{1,200}\.cs)\((?<line>\d+),(?<col>\d+)\)/
];
const TIPS = [
  "آخری سطر پڑھیں، کیونکہ اس میں عموماً غلطی کی قسم اور اس کی تفصیل ہوتی ہے۔",
  "پیغام میں دی گئی سطر نمبر پر جائیں، وہاں اور اس سے پہلے کے کوڈ کی جانچ کریں۔",
  "غلطی کی قسم متعین کریں جیسے NameError یا SyntaxError، پھر اسے اپنی زبان کے نام کے ساتھ تلاش کریں۔",
  "وسیع وضاحت کے لیے پیغام کا متن سرچ انجن میں تلاش کریں۔"
];
const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };

export const meta = {
  description: "غلطی کا پیغام یا مترجم کا پورا آؤٹ پٹ چسپاں کریں، اور غلطی کا نام، اردو مطلب، کوڈ میں مقام، ممکنہ وجوہات اور اصلاح کے طریقے غلط و درست مثال کے ساتھ حاصل کریں، Python، JavaScript، Java، C/C++ اور C# کی عام غلطیوں کے لیے۔",
  keywords: ["وضاحتِ غلطی", "غلطی کا پیغام", "error", "traceback", "exception", "پروگرامنگ غلطی", "NameError", "TypeError", "SyntaxError", "NullPointerException", "segmentation fault", "CS0103"],
  formulas: [{ label: "پیغام کو غلطیوں کی معلوم بنیاد سے ملایا جاتا ہے، پھر غلطی کا نام، مقام اور مطلب نکالا جاتا ہے", tex: "\\text{message} \\xrightarrow{\\text{match}} \\text{error type} + \\text{line} \\rightarrow \\text{fix}" }],
  inputs: [
    { id: "text", label: "غلطی کے پیغام کا متن", type: "textarea", rows: 8, wide: true, default: "NameError: name 'totl' is not defined", help: "پورا پیغام چسپاں کریں، ترجیحاً اس کی آخری سطر اور مقام والی سطر اگر موجود ہو۔" },
    { id: "lang", label: "پروگرام کی زبان", type: "select", default: "auto", options: [["auto", "خودکار"], ["python", "Python"], ["javascript", "JavaScript / Node.js"], ["java", "Java"], ["cpp", "C / C++"], ["csharp", "C#"]], help: "جب تک ٹول آپ کی زبان نہ پہچانے، اسے خودکار رہنے دیں۔" }
  ],
  example: {
    values: { text: "Traceback (most recent call last):\n  File \"main.py\", line 5, in <module>\n    print(totl)\nNameError: name 'totl' is not defined", lang: "auto" },
    expect: ["totl"],
    note: "مثال: مکمل Python ٹریس بیک جو ایک غیر متعین متغیر پر ختم ہوتا ہے۔"
  },
  invalid: { values: { text: "", lang: "auto" } },
  related: ["python-checker", "js-checker", "bracket-checker", "regex-tester"]
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

function fill(text, groups) {
  return String(text).replace(/\{(\w+)\}/g, (_, key) => (groups[key] !== undefined ? groups[key] : "..."));
}

function numbered(list, groups) {
  return list.map((t, i) => `(${i + 1}) ${fill(t, groups)}`).join(" ");
}

function pairHtml(entry) {
  return `<div class="pair"><p>❌ غلطی</p><pre class="code" dir="ltr"><code>${escapeHtml(entry.bad)}</code></pre><p>✅ درست</p><pre class="code" dir="ltr"><code>${escapeHtml(entry.good)}</code></pre></div>`;
}

function detectHints(text) {
  return HINTS.filter(([, re]) => re.test(text)).map(([lang]) => lang);
}

function scan(lines, pool) {
  const hits = [];
  lines.forEach((line, idx) => {
    if (line.trim() === "") return;
    let best = null;
    for (const entry of pool) {
      const m = entry.pattern.exec(line);
      if (m && (best === null || m[0].length > best.m[0].length)) best = { entry, m, idx };
    }
    if (best) hits.push(best);
  });
  return hits;
}

function pickHits(hits, text) {
  const traceback = /Traceback \(most recent call last\)/.test(text);
  const ordered = traceback ? [...hits].reverse() : hits;
  const seen = new Set();
  const out = [];
  for (const h of ordered) {
    if (seen.has(h.entry.id)) continue;
    seen.add(h.entry.id);
    out.push(h);
    if (out.length === (traceback ? 1 : MAX_ERRORS)) break;
  }
  return out;
}

function collectLocations(lines) {
  const locs = [];
  lines.forEach((line, idx) => {
    for (const re of LOCATIONS) {
      const m = re.exec(line);
      if (m) {
        locs.push({ idx, g: m.groups });
        break;
      }
    }
  });
  return locs;
}

function locationFor(locs, idx) {
  if (locs.length === 0) return "";
  let found = null;
  for (const loc of locs) {
    if (loc.idx <= idx) found = loc;
    else break;
  }
  const g = (found || locs[0]).g;
  const parts = [];
  if (g.line) parts.push(`سطر ${g.line}`);
  if (g.col) parts.push(`کالم ${g.col}`);
  return parts.length ? `${parts.join("، ")} فائل ${g.file} میں` : `فائل ${g.file}`;
}

function unknownResult(lang) {
  return {
    results: [
      { label: "فیصلہ", value: "یہ پیغام ہماری پہچان میں نہیں آیا" },
      { label: "زبان", value: lang === "auto" ? "خودکار" : LANG_NAMES[lang] }
    ],
    steps: TIPS,
    blocks: [{ type: "note", text: "یہ پیغام ٹول کی کسی غلطی سے نہیں ملا۔ زبان خود منتخب کرنے کی کوشش کریں، یا پیغام کا متن سرچ کریں۔" }],
    copy: "یہ پیغام ہماری پہچان میں نہیں آیا"
  };
}

function explainResult(hits, lines) {
  const locs = collectLocations(lines);
  const multi = hits.length > 1;
  const results = [];
  const blocks = [];
  const steps = [TIPS[0], TIPS[1]];
  hits.forEach((h, i) => {
    const e = h.entry;
    const g = h.m.groups || {};
    const s = multi ? ` ${i + 1}` : "";
    const loc = locationFor(locs, h.idx);
    results.push({ label: `غلطی${s}`, value: fill(e.title, g) });
    results.push({ label: `زبان${s}`, value: LANG_NAMES[e.lang] });
    if (loc) results.push({ label: `مقام${s}`, value: loc });
    results.push({ label: `مطلب${s}`, value: fill(e.explain, g) });
    blocks.push({ type: "note", text: `ممکنہ وجوہات${s}: ${numbered(e.causes, g)}` });
    blocks.push({ type: "note", text: `اصلاح کے طریقے${s}: ${numbered(e.fixes, g)}` });
    blocks.push({ type: "html", html: pairHtml(e) });
    steps.push(`غلطی «${fill(e.title, g)}» کو اصلاح کے طریقے لاگو کرکے درست کریں، پھر کوڈ دوبارہ چلائیں۔`);
  });
  const copy = hits.map((h) => `${fill(h.entry.title, h.m.groups || {})}: ${fill(h.entry.explain, h.m.groups || {})}`).join(" | ");
  return { results, steps, blocks, copy };
}

export function solve(input) {
  if (isBlank(input.text)) fail("غلطی کے پیغام کا متن درج کریں۔", "text");
  const source = String(input.text);
  if (source.length > MAX_CHARS) fail("متن زیادہ سے زیادہ حد (200000 حروف) سے بڑا ہے، اس لیے وہ حصہ رکھا گیا ہے جس میں غلطی کا پیغام ہے۔", "text");
  const lang = choice(input, "lang", "پروگرام کی زبان", LANG_KEYS, "auto");
  const text = source.replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const pool = lang === "auto" ? ERROR_DB : ERROR_DB.filter((e) => e.lang === lang);
  let hits = scan(lines, pool);
  if (lang === "auto") {
    const hints = detectHints(text);
    const hinted = hits.filter((h) => hints.includes(h.entry.lang));
    if (hinted.length > 0) hits = hinted;
  }
  hits = pickHits(hits, text);
  return hits.length === 0 ? unknownResult(lang) : explainResult(hits, lines);
}
