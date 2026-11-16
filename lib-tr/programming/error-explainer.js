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
  "Mesajın son satırını okuyun; genellikle hata türünü ve açıklamasını içerir.",
  "Mesajda belirtilen satır numarasına gidin ve kodu o satırda ve öncesinde inceleyin.",
  "NameError veya SyntaxError gibi hata türünü belirleyin, ardından bunu kendi programlama diliniz ile birlikte arayın.",
  "Mesajın tam metnini bir arama motorunda arayarak daha geniş açıklamalar bulun."
];
const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };

export const meta = {
  description: "Hata mesajını ya da derleyici çıktısının tamamını yapıştırın; hata adını, Türkçe anlamını, konumunu, olası nedenlerini ve düzeltme yollarını yanlış ve doğru örnekle alırsınız. Python, JavaScript, Java, C/C++ ve C# için yaygın hatalar kapsanır.",
  keywords: ["Hata açıklaması", "Hata mesajı", "error", "traceback", "exception", "programlama hatası", "NameError", "TypeError", "SyntaxError", "NullPointerException", "segmentation fault", "CS0103"],
  formulas: [{ label: "Mesaj bilinen hata kurallarıyla eşleştirilir, ardından hata adı, konumu ve anlamı çıkarılır.", tex: "\\text{message} \\xrightarrow{\\text{match}} \\text{error type} + \\text{line} \\rightarrow \\text{fix}" }],
  inputs: [
    { id: "text", label: "Hata mesajı metni", type: "textarea", rows: 8, wide: true, default: "NameError: name 'totl' is not defined", help: "Mesajın tamamını yapıştırın; mümkünse son satırını ve varsa konum satırını ekleyin." },
    { id: "lang", label: "Programlama dili", type: "select", default: "auto", options: [["auto", "Otomatik"], ["python", "Python"], ["javascript", "JavaScript / Node.js"], ["java", "Java"], ["cpp", "C / C++"], ["csharp", "C#"]], help: "Araç dilinizi tanıyamazsa otomatik seçeneğini bırakın." }
  ],
  example: {
    values: { text: "Traceback (most recent call last):\n  File \"main.py\", line 5, in <module>\n    print(totl)\nNameError: name 'totl' is not defined", lang: "auto" },
    expect: ["totl"],
    note: "Örnek: tanımsız bir değişkenle biten tam bir Python izlemesi."
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
  return `<div class="pair"><p>❌ Hatalı</p><pre class="code" dir="ltr"><code>${escapeHtml(entry.bad)}</code></pre><p>✅ Doğru</p><pre class="code" dir="ltr"><code>${escapeHtml(entry.good)}</code></pre></div>`;
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
  if (g.line) parts.push(`Satır ${g.line}`);
  if (g.col) parts.push(`Sütun ${g.col}`);
  return parts.length ? `${parts.join("، ")}, ${g.file} dosyasında` : `Dosya ${g.file}`;
}

function unknownResult(lang) {
  return {
    results: [
      { label: "Karar", value: "Bu mesaj tanınamadı" },
      { label: "Dil", value: lang === "auto" ? "Otomatik" : LANG_NAMES[lang] }
    ],
    steps: TIPS,
    blocks: [{ type: "note", text: "Mesaj aracın hata veritabanındaki hiçbir kayıtla eşleşmedi. Dili elle seçmeyi deneyin ya da mesajın tam metnini arayın." }],
    copy: "Bu mesaj tanınamadı"
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
    results.push({ label: `Hata${s}`, value: fill(e.title, g) });
    results.push({ label: `Dil${s}`, value: LANG_NAMES[e.lang] });
    if (loc) results.push({ label: `Konum${s}`, value: loc });
    results.push({ label: `Anlam${s}`, value: fill(e.explain, g) });
    blocks.push({ type: "note", text: `Olası nedenler${s}: ${numbered(e.causes, g)}` });
    blocks.push({ type: "note", text: `Düzeltme yolları${s}: ${numbered(e.fixes, g)}` });
    blocks.push({ type: "html", html: pairHtml(e) });
    steps.push(`«${fill(e.title, g)}» hatasını düzeltme yollarını uygulayarak giderin, ardından kodu yeniden çalıştırın.`);
  });
  const copy = hits.map((h) => `${fill(h.entry.title, h.m.groups || {})}: ${fill(h.entry.explain, h.m.groups || {})}`).join(" | ");
  return { results, steps, blocks, copy };
}

export function solve(input) {
  if (isBlank(input.text)) fail("Hata mesajının metnini girin.", "text");
  const source = String(input.text);
  if (source.length > MAX_CHARS) fail("Metin izin verilen sınırı (200000 karakter) aşıyor, bu yüzden hata mesajını içeren kısım kesildi.", "text");
  const lang = choice(input, "lang", "Programlama dili", LANG_KEYS, "auto");
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
