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
  "اقرأ السطر الأخير من الرسالة، فهو غالباً يحمل نوع الخطأ ووصفه.",
  "انتقل إلى رقم السطر المذكور في الرسالة وافحص الكود عنده وما قبله.",
  "حدّد نوع الخطأ مثل NameError أو SyntaxError ثم ابحث عنه مع اسم لغتك.",
  "ابحث عن نص الرسالة الحرفي في محرك بحث للحصول على شروح أوسع."
];
const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };

export const meta = {
  description: "الصق رسالة الخطأ أو مخرجات المترجم كاملة، وستحصل على اسم الخطأ ومعناه بالعربية وموقعه في الكود وأسبابه المحتملة وطرق إصلاحه مع مثال خاطئ وآخر صحيح، لأشهر أخطاء Python و JavaScript و Java و C/C++ و C#.",
  keywords: ["شرح الخطأ", "رسالة الخطأ", "error", "traceback", "exception", "خطأ برمجي", "NameError", "TypeError", "SyntaxError", "NullPointerException", "segmentation fault", "CS0103"],
  formulas: [{ label: "تُطابَق الرسالة مع قاعدة أخطاء معروفة، ثم يُستخرج اسم الخطأ وموقعه ومعناه", tex: "\\text{message} \\xrightarrow{\\text{match}} \\text{error type} + \\text{line} \\rightarrow \\text{fix}" }],
  inputs: [
    { id: "text", label: "نص رسالة الخطأ", type: "textarea", rows: 8, wide: true, default: "NameError: name 'totl' is not defined", help: "الصق الرسالة كاملة، ويفضّل آخر سطر منها وسطر الموقع إن وُجد." },
    { id: "lang", label: "لغة البرنامج", type: "select", default: "auto", options: [["auto", "تلقائي"], ["python", "Python"], ["javascript", "JavaScript / Node.js"], ["java", "Java"], ["cpp", "C / C++"], ["csharp", "C#"]], help: "اتركها تلقائياً ما لم تتعرف الأداة على لغتك." }
  ],
  example: {
    values: { text: "Traceback (most recent call last):\n  File \"main.py\", line 5, in <module>\n    print(totl)\nNameError: name 'totl' is not defined", lang: "auto" },
    expect: ["totl"],
    note: "مثال: تتبّع Python كامل ينتهي باسم متغير غير معرّف."
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
  return `<div class="pair"><p>❌ خطأ</p><pre class="code" dir="ltr"><code>${escapeHtml(entry.bad)}</code></pre><p>✅ صحيح</p><pre class="code" dir="ltr"><code>${escapeHtml(entry.good)}</code></pre></div>`;
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
  if (g.line) parts.push(`السطر ${g.line}`);
  if (g.col) parts.push(`العمود ${g.col}`);
  return parts.length ? `${parts.join("، ")} في الملف ${g.file}` : `الملف ${g.file}`;
}

function unknownResult(lang) {
  return {
    results: [
      { label: "الحكم", value: "لم نتعرف على هذه الرسالة" },
      { label: "اللغة", value: lang === "auto" ? "تلقائي" : LANG_NAMES[lang] }
    ],
    steps: TIPS,
    blocks: [{ type: "note", text: "لم تطابق الرسالة أي خطأ في قاعدة الأداة. جرّب اختيار اللغة يدوياً، أو ابحث عن نص الرسالة الحرفي." }],
    copy: "لم نتعرف على هذه الرسالة"
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
    results.push({ label: `الخطأ${s}`, value: fill(e.title, g) });
    results.push({ label: `اللغة${s}`, value: LANG_NAMES[e.lang] });
    if (loc) results.push({ label: `الموقع${s}`, value: loc });
    results.push({ label: `المعنى${s}`, value: fill(e.explain, g) });
    blocks.push({ type: "note", text: `الأسباب المحتملة${s}: ${numbered(e.causes, g)}` });
    blocks.push({ type: "note", text: `طرق الإصلاح${s}: ${numbered(e.fixes, g)}` });
    blocks.push({ type: "html", html: pairHtml(e) });
    steps.push(`عالج الخطأ «${fill(e.title, g)}» بتطبيق طرق الإصلاح ثم أعد تشغيل الكود.`);
  });
  const copy = hits.map((h) => `${fill(h.entry.title, h.m.groups || {})}: ${fill(h.entry.explain, h.m.groups || {})}`).join(" | ");
  return { results, steps, blocks, copy };
}

export function solve(input) {
  if (isBlank(input.text)) fail("أدخل نص رسالة الخطأ.", "text");
  const source = String(input.text);
  if (source.length > MAX_CHARS) fail("النص أطول من الحد المسموح (200000 حرف)، فاقتطع الجزء الذي يحوي رسالة الخطأ.", "text");
  const lang = choice(input, "lang", "لغة البرنامج", LANG_KEYS, "auto");
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
