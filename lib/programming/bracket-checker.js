import { choice, fail, isBlank } from "../core/validate.js";

export const meta = {
  description: "افحص توازن الأقواس ( ) [ ] { } في الشيفرة، مع تجاهل الأقواس داخل النصوص والتعليقات حسب اللغة، وحدّد كل قوس زائد أو غير مغلق أو مطابق خطأً مع موقعه وطريقة إصلاحه.",
  keywords: ["أقواس", "فاحص الأقواس", "قوس غير مغلق", "علامات تنصيص", "bracket checker", "brackets", "parentheses", "matching brackets"],
  formulas: [{ label: "كل قوس فتح يُدفع إلى مكدس، وكل قوس إغلاق يجب أن يطابق القوس الموجود في قمة المكدس", tex: "( \\leftrightarrow )\\quad [ \\leftrightarrow ]\\quad \\{ \\leftrightarrow \\}" }],
  inputs: [
    { id: "text", label: "الشيفرة أو النص", type: "textarea", rows: 10, wide: true, default: "" },
    { id: "lang", label: "نوع اللغة", type: "select", default: "clike", options: [["clike", "C / C++ / Java / C# / JavaScript"], ["python", "Python"], ["plain", "نص عادي (بدون تعليقات)"]] }
  ],
  example: {
    values: { text: "function total(items) {\n  const parts = items.map((x) => x[0] * (1 + x[1]));\n  // ignore ) here\n  return parts.reduce((a, b) => a + b, \"(0)\");\n}", lang: "clike" },
    expect: ["✅ لا توجد أخطاء", "أقصى عمق تداخل: 4"],
    note: "مثال: دالة JavaScript متوازنة، فيها قوس داخل نص وتعليق لا يُحسبان."
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
  const where = (pos) => `السطر ${loc(pos).line} العمود ${loc(pos).col}`;
  const add = (pos, len, message, suggestion) => problems.push({ pos, len, message, suggestion });
  const reportUnclosed = (e) => add(e.pos, 1, `القوس ${e.ch} المفتوح في ${where(e.pos)} لم يُغلق.`, `أضف ${MATCH[e.ch]} في المكان المناسب لإغلاقه.`);
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
      add(i, 3, `النص متعدد الأسطر الذي يبدأ بـ ${mark} في ${where(i)} لم يُغلق.`, `أضف ${mark} لإغلاق النص.`);
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
    add(i, 1, `النص الذي يبدأ بـ ${q} في ${where(i)} لم يُغلق.`, `أضف ${q} في نهاية النص نفسه، أو استخدم الشرطة المائلة \\ قبل أي ${q} داخله.`);
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
        add(i, 2, `التعليق متعدد الأسطر الذي يبدأ بـ /* في ${where(i)} لم يُغلق.`, "أضف */ في نهاية التعليق، وإلا عُدّ بقية الملف تعليقاً.");
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
        add(i, 1, `القوس ${c} لا يقابله قوس فتح قبله.`, `احذفه، أو أضف ${opener} المناسب قبل هذا الموضع.`);
      } else {
        const top = stack[stack.length - 1];
        if (top.ch === opener) {
          stack.pop();
        } else {
          add(i, 1, `توقعت ${MATCH[top.ch]} لإغلاق ${top.ch} المفتوح في ${where(top.pos)}، لكن وجدت ${c}.`, `استبدل ${c} بـ ${MATCH[top.ch]}، أو أضف ${MATCH[top.ch]} قبله إن كنت قد نسيته.`);
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
  if (isBlank(raw)) fail("أدخل الشيفرة أو النص الذي تريد فحص أقواسه.", "text");
  const text = String(raw);
  if (text.length > LIMIT) fail("النص أطول من 200000 حرف؛ قلّل حجمه ثم أعد الفحص.", "text");
  const lang = choice(input, "lang", "نوع اللغة", LANGS, "clike");
  const src = text.replace(/\r\n?/g, "\n");
  const { problems, counts, maxDepth } = scan(src, lang);
  const total = problems.length;
  const shown = problems.slice(0, CAP);
  const verdict = total ? `❌ وُجد ${total} خطأ` : "✅ لا توجد أخطاء";
  const opened = counts["("] + counts["["] + counts["{"];
  const closed = counts[")"] + counts["]"] + counts["}"];
  const results = [
    { label: "الحكم", value: verdict },
    { label: "عدد المشكلات", value: String(total) },
    { label: "الأقواس المفتوحة", value: String(opened) },
    { label: "الأقواس المغلقة", value: String(closed) },
    { label: "أقصى عمق تداخل", value: String(maxDepth) }
  ];
  const blocks = [];
  if (total) {
    blocks.push({ type: "table", wrap: true, head: ["السطر", "العمود", "المشكلة", "كيف تصلحه"], rows: shown.map((p) => [String(p.line), String(p.col), p.message, p.suggestion]) });
    if (total > CAP) blocks.push({ type: "note", text: `وُجدت ${total} مشكلة، وعُرض أول ${CAP} فقط.`, tone: "warn" });
  }
  blocks.push({ type: "table", head: ["الرمز", "عدد الظهور"], rows: ["(", ")", "[", "]", "{", "}"].map((ch) => [ch, String(counts[ch])]), ltr: true });
  if (total) blocks.push({ type: "html", html: snippet(src, shown) });
  return {
    results,
    steps: [
      "قسّمت النص إلى شيفرة ونصوص وتعليقات حسب اللغة المختارة.",
      "تجاهلت الأقواس داخل النصوص والتعليقات، وطابقت كل قوس إغلاق بأقرب قوس فتح من النوع نفسه.",
      "أبلغت عن كل قوس زائد أو غير مغلق أو مطابق خطأً، مع موقع كل مشكلة."
    ],
    blocks,
    copy: [verdict, `أقصى عمق تداخل: ${maxDepth}`, ...shown.map((p) => `السطر ${p.line} العمود ${p.col}: ${p.message}`)].join("\n")
  };
}
