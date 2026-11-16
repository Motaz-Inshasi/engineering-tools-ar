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
  "Lisez la dernière ligne du message ; elle contient généralement le type de l'erreur et sa description.",
  "Allez à la ligne mentionnée dans le message, puis examinez le code à cet endroit et juste avant.",
  "Identifiez le type de l'erreur, comme NameError ou SyntaxError, puis recherchez-le avec le nom de votre langage.",
  "Recherchez le texte exact du message dans un moteur de recherche pour trouver des explications plus détaillées."
];
const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };

export const meta = {
  description: "Collez le message d'erreur complet ou la sortie du compilateur : vous obtenez le nom de l'erreur, sa signification, son emplacement, ses causes probables et les moyens de la corriger, avec un exemple incorrect et un correct, pour Python, JavaScript, Java, C/C++ et C#.",
  keywords: ["Explication de l'erreur", "Message d'erreur", "error", "traceback", "exception", "erreur de programmation", "NameError", "TypeError", "SyntaxError", "NullPointerException", "segmentation fault", "CS0103"],
  formulas: [{ label: "Le message est comparé à une règle d'erreur connue, puis le nom de l'erreur, son emplacement et sa signification sont extraits", tex: "\\text{message} \\xrightarrow{\\text{match}} \\text{error type} + \\text{line} \\rightarrow \\text{fix}" }],
  inputs: [
    { id: "text", label: "Texte du message d'erreur", type: "textarea", rows: 8, wide: true, default: "NameError: name 'totl' is not defined", help: "Collez le message complet, de préférence sa dernière ligne et la ligne de localisation si elle existe." },
    { id: "lang", label: "Langage du programme", type: "select", default: "auto", options: [["auto", "Automatique"], ["python", "Python"], ["javascript", "JavaScript / Node.js"], ["java", "Java"], ["cpp", "C / C++"], ["csharp", "C#"]], help: "Laissez l'option automatique, sauf si l'outil ne reconnaît pas votre langage." }
  ],
  example: {
    values: { text: "Traceback (most recent call last):\n  File \"main.py\", line 5, in <module>\n    print(totl)\nNameError: name 'totl' is not defined", lang: "auto" },
    expect: ["totl"],
    note: "Exemple : une trace complète de Python qui se termine par un nom de variable non défini."
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
  return `<div class="pair"><p>❌ Incorrect</p><pre class="code" dir="ltr"><code>${escapeHtml(entry.bad)}</code></pre><p>✅ Correct</p><pre class="code" dir="ltr"><code>${escapeHtml(entry.good)}</code></pre></div>`;
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
  if (g.line) parts.push(`Ligne ${g.line}`);
  if (g.col) parts.push(`Colonne ${g.col}`);
  return parts.length ? `${parts.join("، ")} dans le fichier ${g.file}` : `Fichier ${g.file}`;
}

function unknownResult(lang) {
  return {
    results: [
      { label: "Verdict", value: "Ce message n'est pas reconnu" },
      { label: "Langage", value: lang === "auto" ? "Automatique" : LANG_NAMES[lang] }
    ],
    steps: TIPS,
    blocks: [{ type: "note", text: "Le message ne correspond à aucune erreur de la base de l'outil. Essayez de sélectionner le langage manuellement, ou recherchez le texte exact du message." }],
    copy: "Ce message n'est pas reconnu"
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
    results.push({ label: `Erreur${s}`, value: fill(e.title, g) });
    results.push({ label: `Langage${s}`, value: LANG_NAMES[e.lang] });
    if (loc) results.push({ label: `Emplacement${s}`, value: loc });
    results.push({ label: `Signification${s}`, value: fill(e.explain, g) });
    blocks.push({ type: "note", text: `Causes possibles${s} : ${numbered(e.causes, g)}` });
    blocks.push({ type: "note", text: `Comment la corriger${s} : ${numbered(e.fixes, g)}` });
    blocks.push({ type: "html", html: pairHtml(e) });
    steps.push(`Résolvez l'erreur « ${fill(e.title, g)} » en appliquant les corrections, puis relancez le code.`);
  });
  const copy = hits.map((h) => `${fill(h.entry.title, h.m.groups || {})}: ${fill(h.entry.explain, h.m.groups || {})}`).join(" | ");
  return { results, steps, blocks, copy };
}

export function solve(input) {
  if (isBlank(input.text)) fail("Saisissez le texte du message d'erreur.", "text");
  const source = String(input.text);
  if (source.length > MAX_CHARS) fail("Le texte dépasse la limite autorisée (200000 caractères) ; découpez la partie qui contient le message d'erreur.", "text");
  const lang = choice(input, "lang", "Langage du programme", LANG_KEYS, "auto");
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
