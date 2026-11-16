import { choice, fail, isBlank } from "../core/validate.js";

export const meta = {
  description: "Comprueba el equilibrio de los paréntesis ( ) [ ] { } en el código, ignorando los que aparecen dentro de textos y comentarios según el lenguaje, e indica cada paréntesis sobrante, sin cerrar o que no coincide, con su posición y cómo corregirlo.",
  keywords: ["paréntesis", "Verificador de paréntesis", "paréntesis sin cerrar", "comillas", "bracket checker", "brackets", "parentheses", "matching brackets"],
  formulas: [{ label: "Cada paréntesis de apertura se apila, y cada paréntesis de cierre debe coincidir con el que está en la cima de la pila", tex: "( \\leftrightarrow )\\quad [ \\leftrightarrow ]\\quad \\{ \\leftrightarrow \\}" }],
  inputs: [
    { id: "text", label: "Código o texto", type: "textarea", rows: 10, wide: true, default: "" },
    { id: "lang", label: "Tipo de lenguaje", type: "select", default: "clike", options: [["clike", "C / C++ / Java / C# / JavaScript"], ["python", "Python"], ["plain", "Texto sin formato (sin comentarios)"]] }
  ],
  example: {
    values: { text: "function total(items) {\n  const parts = items.map((x) => x[0] * (1 + x[1]));\n  // ignore ) here\n  return parts.reduce((a, b) => a + b, \"(0)\");\n}", lang: "clike" },
    expect: ["✅ No hay errores", "Profundidad máxima de anidamiento: 4"],
    note: "Ejemplo: una función JavaScript equilibrada, con un paréntesis dentro de un texto y un comentario que no se cuentan."
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
  const where = (pos) => `Línea ${loc(pos).line}, columna ${loc(pos).col}`;
  const add = (pos, len, message, suggestion) => problems.push({ pos, len, message, suggestion });
  const reportUnclosed = (e) => add(e.pos, 1, `El paréntesis ${e.ch} abierto en ${where(e.pos)} no se cerró.`, `Añade ${MATCH[e.ch]} en el lugar adecuado para cerrarlo.`);
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
      add(i, 3, `El texto de varias líneas que empieza con ${mark} en ${where(i)} no se cerró.`, `Añade ${mark} para cerrar el texto.`);
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
    add(i, 1, `El texto que empieza con ${q} en ${where(i)} no se cerró.`, `Añade ${q} al final del mismo texto, o usa la barra invertida \\ antes de cualquier ${q} que haya dentro.`);
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
        add(i, 2, `El comentario de varias líneas que empieza con /* en ${where(i)} no se cerró.`, "Añade */ al final del comentario; si no, el resto del archivo se considerará comentario.");
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
        add(i, 1, `El paréntesis ${c} no tiene un paréntesis de apertura anterior que le corresponda.`, `Elimínalo, o añade ${opener} adecuado antes de esta posición.`);
      } else {
        const top = stack[stack.length - 1];
        if (top.ch === opener) {
          stack.pop();
        } else {
          add(i, 1, `Se esperaba ${MATCH[top.ch]} para cerrar ${top.ch} abierto en ${where(top.pos)}, pero se encontró ${c}.`, `Reemplaza ${c} por ${MATCH[top.ch]}, o añade ${MATCH[top.ch]} antes si lo olvidaste.`);
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
  if (isBlank(raw)) fail("Introduce el código o el texto cuyos paréntesis quieres revisar.", "text");
  const text = String(raw);
  if (text.length > LIMIT) fail("El texto supera los 200000 caracteres; reduce su tamaño y vuelve a revisarlo.", "text");
  const lang = choice(input, "lang", "Tipo de lenguaje", LANGS, "clike");
  const src = text.replace(/\r\n?/g, "\n");
  const { problems, counts, maxDepth } = scan(src, lang);
  const total = problems.length;
  const shown = problems.slice(0, CAP);
  const verdict = total ? `❌ Errores: ${total}` : "✅ No hay errores";
  const opened = counts["("] + counts["["] + counts["{"];
  const closed = counts[")"] + counts["]"] + counts["}"];
  const results = [
    { label: "Veredicto", value: verdict },
    { label: "Número de problemas", value: String(total) },
    { label: "Paréntesis abiertos", value: String(opened) },
    { label: "Paréntesis cerrados", value: String(closed) },
    { label: "Profundidad máxima de anidamiento", value: String(maxDepth) }
  ];
  const blocks = [];
  if (total) {
    blocks.push({ type: "table", wrap: true, head: ["Línea", "Columna", "Problema", "Cómo corregirlo"], rows: shown.map((p) => [String(p.line), String(p.col), p.message, p.suggestion]) });
    if (total > CAP) blocks.push({ type: "note", text: `Se encontraron ${total} problemas; solo se muestran los primeros ${CAP}.`, tone: "warn" });
  }
  blocks.push({ type: "table", head: ["Símbolo", "Apariciones"], rows: ["(", ")", "[", "]", "{", "}"].map((ch) => [ch, String(counts[ch])]), ltr: true });
  if (total) blocks.push({ type: "html", html: snippet(src, shown) });
  return {
    results,
    steps: [
      "Dividí el texto en código, cadenas y comentarios según el lenguaje elegido.",
      "Ignoré los paréntesis dentro de cadenas y comentarios, y emparejé cada paréntesis de cierre con el paréntesis de apertura más cercano del mismo tipo.",
      "Informé de cada paréntesis sobrante, sin cerrar o que no coincide, con la posición de cada problema."
    ],
    blocks,
    copy: [verdict, `Profundidad máxima de anidamiento: ${maxDepth}`, ...shown.map((p) => `Línea ${p.line}, columna ${p.col}: ${p.message}`)].join("\n")
  };
}
