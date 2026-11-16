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
  "Baca baris terakhir pesan; biasanya berisi jenis kesalahan dan deskripsinya.",
  "Buka nomor baris yang disebutkan dalam pesan, lalu periksa kode di baris tersebut dan di atasnya.",
  "Tentukan jenis kesalahan, seperti NameError atau SyntaxError, lalu cari bersama nama bahasa pemrograman Anda.",
  "Cari teks pesan yang persis di mesin pencari untuk mendapatkan penjelasan yang lebih luas."
];
const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };

export const meta = {
  description: "Tempelkan pesan kesalahan atau keluaran kompilator lengkap untuk mendapatkan nama kesalahan, artinya dalam bahasa Indonesia, lokasinya dalam kode, penyebab yang mungkin, dan cara memperbaikinya, dengan contoh salah dan benar, untuk kesalahan umum Python, JavaScript, Java, C/C++, dan C#.",
  keywords: ["Penjelasan kesalahan", "Pesan kesalahan", "error", "traceback", "exception", "kesalahan pemrograman", "NameError", "TypeError", "SyntaxError", "NullPointerException", "segmentation fault", "CS0103"],
  formulas: [{ label: "Pesan dicocokkan dengan aturan kesalahan yang dikenal, lalu nama kesalahan, lokasinya, dan artinya diambil", tex: "\\text{message} \\xrightarrow{\\text{match}} \\text{error type} + \\text{line} \\rightarrow \\text{fix}" }],
  inputs: [
    { id: "text", label: "Teks pesan kesalahan", type: "textarea", rows: 8, wide: true, default: "NameError: name 'totl' is not defined", help: "Tempelkan pesan lengkap, sebaiknya beserta baris terakhirnya dan baris lokasi jika ada." },
    { id: "lang", label: "Bahasa pemrograman", type: "select", default: "auto", options: [["auto", "Otomatis"], ["python", "Python"], ["javascript", "JavaScript / Node.js"], ["java", "Java"], ["cpp", "C / C++"], ["csharp", "C#"]], help: "Biarkan otomatis kecuali alat tidak mengenali bahasa Anda." }
  ],
  example: {
    values: { text: "Traceback (most recent call last):\n  File \"main.py\", line 5, in <module>\n    print(totl)\nNameError: name 'totl' is not defined", lang: "auto" },
    expect: ["totl"],
    note: "Contoh: jejak Python lengkap yang berakhir dengan nama variabel yang tidak didefinisikan."
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
  return `<div class="pair"><p>❌ Salah</p><pre class="code" dir="ltr"><code>${escapeHtml(entry.bad)}</code></pre><p>✅ Benar</p><pre class="code" dir="ltr"><code>${escapeHtml(entry.good)}</code></pre></div>`;
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
  if (g.line) parts.push(`Baris ${g.line}`);
  if (g.col) parts.push(`Kolom ${g.col}`);
  return parts.length ? `${parts.join("، ")} dalam berkas ${g.file}` : `Berkas ${g.file}`;
}

function unknownResult(lang) {
  return {
    results: [
      { label: "Hasil", value: "Pesan ini tidak dikenali" },
      { label: "Bahasa", value: lang === "auto" ? "Otomatis" : LANG_NAMES[lang] }
    ],
    steps: TIPS,
    blocks: [{ type: "note", text: "Pesan tidak cocok dengan kesalahan mana pun dalam basis data alat. Coba pilih bahasa secara manual, atau cari teks pesan yang persis." }],
    copy: "Pesan ini tidak dikenali"
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
    results.push({ label: `Kesalahan${s}`, value: fill(e.title, g) });
    results.push({ label: `Bahasa${s}`, value: LANG_NAMES[e.lang] });
    if (loc) results.push({ label: `Lokasi${s}`, value: loc });
    results.push({ label: `Arti${s}`, value: fill(e.explain, g) });
    blocks.push({ type: "note", text: `Kemungkinan penyebab${s}: ${numbered(e.causes, g)}` });
    blocks.push({ type: "note", text: `Cara memperbaiki${s}: ${numbered(e.fixes, g)}` });
    blocks.push({ type: "html", html: pairHtml(e) });
    steps.push(`Atasi kesalahan «${fill(e.title, g)}» dengan menerapkan cara perbaikan, lalu jalankan kode lagi.`);
  });
  const copy = hits.map((h) => `${fill(h.entry.title, h.m.groups || {})}: ${fill(h.entry.explain, h.m.groups || {})}`).join(" | ");
  return { results, steps, blocks, copy };
}

export function solve(input) {
  if (isBlank(input.text)) fail("Masukkan teks pesan kesalahan.", "text");
  const source = String(input.text);
  if (source.length > MAX_CHARS) fail("Teks melebihi batas yang diizinkan (200000 karakter), jadi potong bagian yang berisi pesan kesalahan.", "text");
  const lang = choice(input, "lang", "Bahasa pemrograman", LANG_KEYS, "auto");
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
