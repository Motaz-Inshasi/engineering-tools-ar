import { choice, fail, isBlank } from "../core/validate.js";

export const meta = {
  description: "Vérifiez l'équilibre des parenthèses ( ) [ ] { } dans le code, en ignorant les symboles situés dans les chaînes et les commentaires selon le langage, et repérez chaque parenthèse en trop, non fermée ou mal associée, avec son emplacement et la manière de la corriger.",
  keywords: ["parenthèses", "Vérificateur de parenthèses", "Parenthèse non fermée", "guillemets", "bracket checker", "brackets", "parentheses", "matching brackets"],
  formulas: [{ label: "Chaque parenthèse ouvrante est empilée, et chaque parenthèse fermante doit correspondre à celle qui se trouve au sommet de la pile", tex: "( \\leftrightarrow )\\quad [ \\leftrightarrow ]\\quad \\{ \\leftrightarrow \\}" }],
  inputs: [
    { id: "text", label: "Code ou texte", type: "textarea", rows: 10, wide: true, default: "" },
    { id: "lang", label: "Type de langage", type: "select", default: "clike", options: [["clike", "C / C++ / Java / C# / JavaScript"], ["python", "Python"], ["plain", "Texte brut (sans commentaires)"]] }
  ],
  example: {
    values: { text: "function total(items) {\n  const parts = items.map((x) => x[0] * (1 + x[1]));\n  // ignore ) here\n  return parts.reduce((a, b) => a + b, \"(0)\");\n}", lang: "clike" },
    expect: ["✅ Aucune erreur", "Profondeur maximale d'imbrication : 4"],
    note: "Exemple : une fonction JavaScript équilibrée, avec une parenthèse dans une chaîne et un commentaire, qui ne sont pas comptés."
  },
  invalid: { values: { text: "", lang: "clike" } },
  related: ["json-formatter", "html-checker", "js-checker", "python-checker", "error-explainer"]
};

const LIMIT = 200000;
const CONTEXT = 3;
const CAP = 50;
const OPEN_SET = "([{";
const CLOSE_SET = ")]}";
const MATCH = { "(": ")", "[": "]", "{": "}" };
const OPENER_OF = { ")": "(", "]": "[", "}": "{" };
const LANGS = ["clike", "python", "plain"];

function makeLocator(src) {
  const starts = [0];
  for (let k = 0; k < src.length; k++) if (src[k] === "\n") starts.push(k + 1);
  return (pos) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, col: pos - starts[lo] + 1 };
  };
}

function scan(src, lang) {
  const problems = [];
  const stack = [];
  const counts = { "(": 0, ")": 0, "[": 0, "]": 0, "{": 0, "}": 0 };
  const loc = makeLocator(src);
  const where = (pos) => `ligne ${loc(pos).line} colonne ${loc(pos).col}`;
  const add = (pos, len, message, suggestion) => problems.push({ pos, len, message, suggestion });
  const reportUnclosed = (e) => add(e.pos, 1, `La parenthèse ${e.ch} ouverte à ${where(e.pos)} n'a pas été fermée.`, `Ajoutez ${MATCH[e.ch]} à l'endroit approprié pour la fermer.`);
  const n = src.length;
  const clike = lang === "clike";
  const py = lang === "python";
  const quotes = clike ? ["'", "\"", "`"] : py ? ["'", "\""] : [];
  let maxDepth = 0;

  const scanString = (i, q) => {
    const mark = q + q + q;
    if (py && src.startsWith(mark, i)) {
      let j = i + 3;
      while (j < n) {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src.startsWith(mark, j)) return j + 3;
        j++;
      }
      add(i, 3, `La chaîne multiligne qui commence par ${mark} à ${where(i)} n'a pas été fermée.`, `Ajoutez ${mark} pour fermer la chaîne.`);
      return n;
    }
    let j = i + 1;
    while (j < n) {
      const ch = src[j];
      if (ch === "\\") {
        j += 2;
        continue;
      }
      if (ch === q) return j + 1;
      if (ch === "\n" && q !== "`") break;
      j++;
    }
    add(i, 1, `La chaîne qui commence par ${q} à ${where(i)} n'a pas été fermée.`, `Ajoutez ${q} à la fin de cette même chaîne, ou placez une barre oblique inverse \\ devant chaque ${q} qu'elle contient.`);
    return Math.min(j, n);
  };

  let i = 0;
  while (i < n) {
    const c = src[i];
    if (clike && c === "/" && src[i + 1] === "/") {
      const e = src.indexOf("\n", i);
      i = e < 0 ? n : e;
      continue;
    }
    if (clike && c === "/" && src[i + 1] === "*") {
      const e = src.indexOf("*/", i + 2);
      if (e < 0) {
        add(i, 2, `Le commentaire multiligne qui commence par /* à ${where(i)} n'a pas été fermé.`, "Ajoutez */ à la fin du commentaire ; sinon, le reste du fichier est traité comme un commentaire.");
        break;
      }
      i = e + 2;
      continue;
    }
    if (py && c === "#") {
      const e = src.indexOf("\n", i);
      i = e < 0 ? n : e;
      continue;
    }
    if (quotes.includes(c)) {
      i = scanString(i, c);
      continue;
    }
    if (OPEN_SET.includes(c)) {
      counts[c]++;
      stack.push({ ch: c, pos: i });
      if (stack.length > maxDepth) maxDepth = stack.length;
    } else if (CLOSE_SET.includes(c)) {
      counts[c]++;
      const opener = OPENER_OF[c];
      if (!stack.length) {
        add(i, 1, `La parenthèse ${c} n'a pas de parenthèse ouvrante correspondante avant elle.`, `Supprimez-la, ou ajoutez la ${opener} appropriée avant cette position.`);
      } else {
        const top = stack[stack.length - 1];
        if (top.ch === opener) {
          stack.pop();
        } else {
          add(i, 1, `${MATCH[top.ch]} attendu pour fermer ${top.ch} ouvert à ${where(top.pos)}, mais ${c} a été trouvé.`, `Remplacez ${c} par ${MATCH[top.ch]}, ou ajoutez ${MATCH[top.ch]} avant si vous l'avez oublié.`);
          let k = -1;
          for (let m = stack.length - 1; m >= 0; m--) {
            if (stack[m].ch === opener) {
              k = m;
              break;
            }
          }
          const dropped = stack.splice(k >= 0 ? k : stack.length - 1);
          for (const e of dropped.slice(1, -1)) reportUnclosed(e);
        }
      }
    }
    i++;
  }
  for (const e of stack) reportUnclosed(e);
  const list = problems.map((p) => ({ ...p, line: loc(p.pos).line, col: loc(p.pos).col }));
  list.sort((a, b) => a.pos - b.pos);
  return { problems: list, counts, maxDepth };
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderLine(text, ranges) {
  const bad = new Array(text.length).fill(false);
  let tail = false;
  for (const [a, b] of ranges) {
    if (a >= text.length) tail = true;
    for (let k = a; k < Math.min(b, text.length); k++) bad[k] = true;
  }
  let html = "";
  let k = 0;
  while (k < text.length) {
    const flag = bad[k];
    let j = k;
    while (j < text.length && bad[j] === flag) j++;
    const chunk = esc(text.slice(k, j));
    html += flag ? `<span class="bad">${chunk}</span>` : chunk;
    k = j;
  }
  if (tail) html += "<span class=\"bad\"> </span>";
  return html;
}

function snippet(src, problems) {
  const lines = src.split("\n");
  const shown = new Set();
  const marks = new Map();
  for (const p of problems) {
    for (let n = Math.max(1, p.line - CONTEXT); n <= Math.min(lines.length, p.line + CONTEXT); n++) shown.add(n);
    if (!marks.has(p.line)) marks.set(p.line, []);
    marks.get(p.line).push([p.col - 1, p.col - 1 + Math.max(1, p.len || 0)]);
  }
  const out = [];
  let prev = 0;
  for (const n of [...shown].sort((a, b) => a - b)) {
    if (prev && n !== prev + 1) out.push("…");
    out.push(`<span class="ln">${n}</span>${renderLine(lines[n - 1] ?? "", marks.get(n) || [])}`);
    prev = n;
  }
  return `<pre class="code" dir="ltr"><code>${out.join("\n")}</code></pre>`;
}

export function solve(input) {
  const raw = input.text;
  if (isBlank(raw)) fail("Saisissez le code ou le texte dont vous voulez vérifier les parenthèses.", "text");
  const text = String(raw);
  if (text.length > LIMIT) fail("Le texte dépasse 200000 caractères ; réduisez sa taille puis relancez la vérification.", "text");
  const lang = choice(input, "lang", "Type de langage", LANGS, "clike");
  const src = text.replace(/\r\n?/g, "\n");
  const { problems, counts, maxDepth } = scan(src, lang);
  const total = problems.length;
  const shown = problems.slice(0, CAP);
  const verdict = total ? `❌ Erreurs trouvées : ${total}` : "✅ Aucune erreur";
  const opened = counts["("] + counts["["] + counts["{"];
  const closed = counts[")"] + counts["]"] + counts["}"];
  const results = [
    { label: "Verdict", value: verdict },
    { label: "Nombre de problèmes", value: String(total) },
    { label: "Parenthèses ouvrantes", value: String(opened) },
    { label: "Parenthèses fermantes", value: String(closed) },
    { label: "Profondeur maximale d'imbrication", value: String(maxDepth) }
  ];
  const blocks = [];
  if (total) {
    blocks.push({ type: "table", wrap: true, head: ["Ligne", "Colonne", "Problème", "Comment le corriger"], rows: shown.map((p) => [String(p.line), String(p.col), p.message, p.suggestion]) });
    if (total > CAP) blocks.push({ type: "note", text: `${total} problèmes ont été trouvés ; seuls les ${CAP} premiers sont affichés.`, tone: "warn" });
  }
  blocks.push({ type: "table", head: ["Symbole", "Occurrences"], rows: ["(", ")", "[", "]", "{", "}"].map((ch) => [ch, String(counts[ch])]), ltr: true });
  if (total) blocks.push({ type: "html", html: snippet(src, shown) });
  return {
    results,
    steps: [
      "Le texte a été découpé en code, chaînes et commentaires selon le langage choisi.",
      "Les parenthèses situées dans les chaînes et les commentaires ont été ignorées, et chaque parenthèse fermante a été associée à la parenthèse ouvrante la plus proche du même type.",
      "Chaque parenthèse en trop, non fermée ou mal associée est signalée, avec l'emplacement de chaque problème."
    ],
    blocks,
    copy: [verdict, `Profondeur maximale d'imbrication : ${maxDepth}`, ...shown.map((p) => `Ligne ${p.line}, colonne ${p.col} : ${p.message}`)].join("\n")
  };
}
