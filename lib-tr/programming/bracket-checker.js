import { choice, fail, isBlank } from "../core/validate.js";

export const meta = {
  description: "Koddaki ( ) [ ] { } parantez dengesini denetler; dile göre metin ve yorum içindeki parantezleri yok sayar, her fazla, kapanmamış veya eşleşmeyen parantezi konumu ve düzeltme yoluyla belirtir.",
  keywords: ["parantez", "Parantez denetleyici", "kapanmamış parantez", "tırnak işaretleri", "bracket checker", "brackets", "parentheses", "matching brackets"],
  formulas: [{ label: "Her açılış parantezi bir yığına itilir; her kapanış parantezi yığının üstündeki parantezle eşleşmelidir.", tex: "( \\leftrightarrow )\\quad [ \\leftrightarrow ]\\quad \\{ \\leftrightarrow \\}" }],
  inputs: [
    { id: "text", label: "Kod veya metin", type: "textarea", rows: 10, wide: true, default: "" },
    { id: "lang", label: "Dil türü", type: "select", default: "clike", options: [["clike", "C / C++ / Java / C# / JavaScript"], ["python", "Python"], ["plain", "Düz metin (yorumsuz)"]] }
  ],
  example: {
    values: { text: "function total(items) {\n  const parts = items.map((x) => x[0] * (1 + x[1]));\n  // ignore ) here\n  return parts.reduce((a, b) => a + b, \"(0)\");\n}", lang: "clike" },
    expect: ["✅ Hata bulunmadı", "En fazla iç içe derinlik: 4"],
    note: "Örnek: metin içinde parantez ve yorum bulunan, dengeli bir JavaScript fonksiyonu; bunlar sayılmaz."
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
  const where = (pos) => `Satır ${loc(pos).line} sütun ${loc(pos).col}`;
  const add = (pos, len, message, suggestion) => problems.push({ pos, len, message, suggestion });
  const reportUnclosed = (e) => add(e.pos, 1, `${where(e.pos)} konumunda açılan ${e.ch} parantezi kapatılmadı.`, `Uygun yere ${MATCH[e.ch]} ekleyerek kapatın.`);
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
      add(i, 3, `${where(i)} konumunda ${mark} ile başlayan çok satırlı metin kapatılmadı.`, `Metni kapatmak için ${mark} ekleyin.`);
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
    add(i, 1, `${where(i)} konumunda ${q} ile başlayan metin kapatılmadı.`, `Metnin sonuna ${q} ekleyin ya da içindeki her ${q} karakterinden önce ters eğik çizgi \\ kullanın.`);
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
        add(i, 2, `${where(i)} konumunda /* ile başlayan çok satırlı yorum kapatılmadı.`, "Yorumun sonuna */ ekleyin; yoksa dosyanın geri kalanı yorum sayılır.");
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
        add(i, 1, `${c} parantezinin önünde eşleşen bir açılış parantezi yok.`, `Bunu silin ya da bu konumdan önce uygun ${opener} ekleyin.`);
      } else {
        const top = stack[stack.length - 1];
        if (top.ch === opener) {
          stack.pop();
        } else {
          add(i, 1, `${where(top.pos)} konumunda açılan ${top.ch} için ${MATCH[top.ch]} bekleniyordu, ancak ${c} bulundu.`, `${c} yerine ${MATCH[top.ch]} yazın; unuttuysanız önüne ${MATCH[top.ch]} ekleyin.`);
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
  if (isBlank(raw)) fail("Parantezlerini denetlemek istediğiniz kodu veya metni girin.", "text");
  const text = String(raw);
  if (text.length > LIMIT) fail("Metin 200000 karakterden uzun; boyutunu küçültüp denetimi yeniden çalıştırın.", "text");
  const lang = choice(input, "lang", "Dil türü", LANGS, "clike");
  const src = text.replace(/\r\n?/g, "\n");
  const { problems, counts, maxDepth } = scan(src, lang);
  const total = problems.length;
  const shown = problems.slice(0, CAP);
  const verdict = total ? `❌ ${total} hata bulundu` : "✅ Hata bulunmadı";
  const opened = counts["("] + counts["["] + counts["{"];
  const closed = counts[")"] + counts["]"] + counts["}"];
  const results = [
    { label: "Karar", value: verdict },
    { label: "Sorun sayısı", value: String(total) },
    { label: "Açılan parantezler", value: String(opened) },
    { label: "Kapanan parantezler", value: String(closed) },
    { label: "En fazla iç içe derinlik", value: String(maxDepth) }
  ];
  const blocks = [];
  if (total) {
    blocks.push({ type: "table", wrap: true, head: ["Satır", "Sütun", "Sorun", "Nasıl düzeltilir"], rows: shown.map((p) => [String(p.line), String(p.col), p.message, p.suggestion]) });
    if (total > CAP) blocks.push({ type: "note", text: `${total} sorun bulundu; yalnızca ilk ${CAP} tanesi gösteriliyor.`, tone: "warn" });
  }
  blocks.push({ type: "table", head: ["Karakter", "Görülme sayısı"], rows: ["(", ")", "[", "]", "{", "}"].map((ch) => [ch, String(counts[ch])]), ltr: true });
  if (total) blocks.push({ type: "html", html: snippet(src, shown) });
  return {
    results,
    steps: [
      "Metni seçilen dile göre kod, metin ve yorumlara ayırdım.",
      "Metin ve yorum içindeki parantezleri yok saydım; her kapanış parantezini aynı türdeki en yakın açılış parantezi ile eşleştirdim.",
      "Her fazla, kapanmamış veya eşleşmeyen parantezi konumuyla birlikte bildirdim."
    ],
    blocks,
    copy: [verdict, `En fazla iç içe derinlik: ${maxDepth}`, ...shown.map((p) => `Satır ${p.line} sütun ${p.col}: ${p.message}`)].join("\n")
  };
}
