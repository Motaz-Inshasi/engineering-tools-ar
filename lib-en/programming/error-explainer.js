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
  "Read the last line of the message; it usually contains the error type and its description.",
  "Go to the line number mentioned in the message and check the code there and just before it.",
  "Identify the error type, such as NameError or SyntaxError, then search for it together with the name of your language.",
  "Search for the exact text of the message in a search engine to find broader explanations."
];
const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };

export const meta = {
  description: "Paste the full error message or compiler output to get the error name, its meaning in English, its location in the code, its likely causes, and ways to fix it, with a wrong example and a correct one, for the most common errors in Python, JavaScript, Java, C/C++, and C#.",
  keywords: ["Error explanation", "Error message", "error", "traceback", "exception", "programming error", "NameError", "TypeError", "SyntaxError", "NullPointerException", "segmentation fault", "CS0103"],
  formulas: [{ label: "The message is matched against a known error rule, then the error name, its location, and its meaning are extracted.", tex: "\\text{message} \\xrightarrow{\\text{match}} \\text{error type} + \\text{line} \\rightarrow \\text{fix}" }],
  inputs: [
    { id: "text", label: "Error message text", type: "textarea", rows: 8, wide: true, default: "NameError: name 'totl' is not defined", help: "Paste the full message, preferably its last line and the location line if one exists." },
    { id: "lang", label: "Program language", type: "select", default: "auto", options: [["auto", "Auto"], ["python", "Python"], ["javascript", "JavaScript / Node.js"], ["java", "Java"], ["cpp", "C / C++"], ["csharp", "C#"]], help: "Leave it on auto unless the tool does not recognize your language." }
  ],
  example: {
    values: { text: "Traceback (most recent call last):\n  File \"main.py\", line 5, in <module>\n    print(totl)\nNameError: name 'totl' is not defined", lang: "auto" },
    expect: ["totl"],
    note: "Example: a full Python traceback that ends with an undefined variable name."
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
  return `<div class="pair"><p>❌ Wrong</p><pre class="code" dir="ltr"><code>${escapeHtml(entry.bad)}</code></pre><p>✅ Correct</p><pre class="code" dir="ltr"><code>${escapeHtml(entry.good)}</code></pre></div>`;
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
  if (g.line) parts.push(`Line ${g.line}`);
  if (g.col) parts.push(`Column ${g.col}`);
  return parts.length ? `${parts.join("، ")} in file ${g.file}` : `File ${g.file}`;
}

function unknownResult(lang) {
  return {
    results: [
      { label: "Verdict", value: "This message is not recognized" },
      { label: "Language", value: lang === "auto" ? "Auto" : LANG_NAMES[lang] }
    ],
    steps: TIPS,
    blocks: [{ type: "note", text: "The message did not match any error in the tool's database. Try selecting the language manually, or search for the exact text of the message." }],
    copy: "This message is not recognized"
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
    results.push({ label: `Error${s}`, value: fill(e.title, g) });
    results.push({ label: `Language${s}`, value: LANG_NAMES[e.lang] });
    if (loc) results.push({ label: `Location${s}`, value: loc });
    results.push({ label: `Meaning${s}`, value: fill(e.explain, g) });
    blocks.push({ type: "note", text: `Possible causes${s}: ${numbered(e.causes, g)}` });
    blocks.push({ type: "note", text: `How to fix${s}: ${numbered(e.fixes, g)}` });
    blocks.push({ type: "html", html: pairHtml(e) });
    steps.push(`Resolve the error “${fill(e.title, g)}” by applying the fixes, then run the code again.`);
  });
  const copy = hits.map((h) => `${fill(h.entry.title, h.m.groups || {})}: ${fill(h.entry.explain, h.m.groups || {})}`).join(" | ");
  return { results, steps, blocks, copy };
}

export function solve(input) {
  if (isBlank(input.text)) fail("Enter the error message text.", "text");
  const source = String(input.text);
  if (source.length > MAX_CHARS) fail("The text exceeds the allowed limit (200000 characters), so cut out the part that contains the error message.", "text");
  const lang = choice(input, "lang", "Program language", LANG_KEYS, "auto");
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
