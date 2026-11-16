import { choice, fail, isBlank } from "../core/validate.js";

export const meta = {
  description: "کوڈ میں بریکٹس ( ) [ ] { } کے توازن کی جانچ کریں، زبان کے مطابق متن اور تبصروں کے اندر کے بریکٹس کو نظرانداز کریں، اور ہر زائد، غیر بند یا غلط ملائے گئے بریکٹ کو اس کے مقام اور اصلاح کے طریقے کے ساتھ بتائیں۔",
  keywords: ["بریکٹس", "بریکٹس چیکر", "غیر بند بریکٹ", "اقتباسی نشانات", "bracket checker", "brackets", "parentheses", "matching brackets"],
  formulas: [{ label: "ہر کھلنے والا بریکٹ ایک اسٹیک میں ڈالا جاتا ہے، اور ہر بند کرنے والا بریکٹ اسٹیک کے اوپر والے بریکٹ سے ملنا چاہیے", tex: "( \\leftrightarrow )\\quad [ \\leftrightarrow ]\\quad \\{ \\leftrightarrow \\}" }],
  inputs: [
    { id: "text", label: "کوڈ یا متن", type: "textarea", rows: 10, wide: true, default: "" },
    { id: "lang", label: "زبان کی قسم", type: "select", default: "clike", options: [["clike", "C / C++ / Java / C# / JavaScript"], ["python", "Python"], ["plain", "سادہ متن (بغیر تبصروں کے)"]] }
  ],
  example: {
    values: { text: "function total(items) {\n  const parts = items.map((x) => x[0] * (1 + x[1]));\n  // ignore ) here\n  return parts.reduce((a, b) => a + b, \"(0)\");\n}", lang: "clike" },
    expect: ["✅ کوئی غلطی نہیں", "زیادہ سے زیادہ نیسٹنگ گہرائی: 4"],
    note: "مثال: ایک متوازن JavaScript فنکشن جس میں ایک بریکٹ اسٹرنگ کے اندر اور ایک تبصرہ ہے، جو شمار نہیں ہوتے۔"
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
  const where = (pos) => `سطر ${loc(pos).line} کالم ${loc(pos).col}`;
  const add = (pos, len, message, suggestion) => problems.push({ pos, len, message, suggestion });
  const reportUnclosed = (e) => add(e.pos, 1, `بریکٹ ${e.ch} جو ${where(e.pos)} پر کھلا تھا بند نہیں ہوا۔`, `اسے بند کرنے کے لیے مناسب جگہ پر ${MATCH[e.ch]} شامل کریں۔`);
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
      add(i, 3, `${where(i)} پر ${mark} سے شروع ہونے والا کثیر سطری متن بند نہیں ہوا۔`, `متن بند کرنے کے لیے ${mark} شامل کریں۔`);
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
    add(i, 1, `${where(i)} پر ${q} سے شروع ہونے والا متن بند نہیں ہوا۔`, `متن کے آخر میں ${q} شامل کریں، یا اس کے اندر کسی بھی ${q} سے پہلے الٹی ترچھی لکیر \\ استعمال کریں۔`);
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
        add(i, 2, `${where(i)} پر /* سے شروع ہونے والا کثیر سطری تبصرہ بند نہیں ہوا۔`, "تبصرے کے آخر میں */ شامل کریں، ورنہ فائل کا باقی حصہ تبصرہ سمجھا جائے گا۔");
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
        add(i, 1, `بریکٹ ${c} سے پہلے اس کا کھلنے والا بریکٹ موجود نہیں ہے۔`, `اسے حذف کریں، یا اس جگہ سے پہلے مناسب ${opener} شامل کریں۔`);
      } else {
        const top = stack[stack.length - 1];
        if (top.ch === opener) {
          stack.pop();
        } else {
          add(i, 1, `${where(top.pos)} پر کھلے ${top.ch} کو بند کرنے کے لیے ${MATCH[top.ch]} متوقع تھا، لیکن ${c} ملا۔`, `${c} کی جگہ ${MATCH[top.ch]} لگائیں، یا اگر آپ اسے بھول گئے ہیں تو اس سے پہلے ${MATCH[top.ch]} شامل کریں۔`);
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
  if (isBlank(raw)) fail("وہ کوڈ یا متن درج کریں جس کے بریکٹس کی جانچ کرنی ہے۔", "text");
  const text = String(raw);
  if (text.length > LIMIT) fail("متن 200000 حروف سے زیادہ ہے؛ اس کا سائز کم کریں، پھر دوبارہ جانچ کریں۔", "text");
  const lang = choice(input, "lang", "زبان کی قسم", LANGS, "clike");
  const src = text.replace(/\r\n?/g, "\n");
  const { problems, counts, maxDepth } = scan(src, lang);
  const total = problems.length;
  const shown = problems.slice(0, CAP);
  const verdict = total ? `❌ ${total} غلطی ملی` : "✅ کوئی غلطی نہیں";
  const opened = counts["("] + counts["["] + counts["{"];
  const closed = counts[")"] + counts["]"] + counts["}"];
  const results = [
    { label: "فیصلہ", value: verdict },
    { label: "مسائل کی تعداد", value: String(total) },
    { label: "کھلنے والے بریکٹ", value: String(opened) },
    { label: "بند ہونے والے بریکٹ", value: String(closed) },
    { label: "زیادہ سے زیادہ نیسٹنگ گہرائی", value: String(maxDepth) }
  ];
  const blocks = [];
  if (total) {
    blocks.push({ type: "table", wrap: true, head: ["سطر", "کالم", "مسئلہ", "اسے کیسے ٹھیک کریں"], rows: shown.map((p) => [String(p.line), String(p.col), p.message, p.suggestion]) });
    if (total > CAP) blocks.push({ type: "note", text: `${total} مسائل ملے، صرف پہلے ${CAP} دکھائے گئے۔`, tone: "warn" });
  }
  blocks.push({ type: "table", head: ["علامت", "تعداد"], rows: ["(", ")", "[", "]", "{", "}"].map((ch) => [ch, String(counts[ch])]), ltr: true });
  if (total) blocks.push({ type: "html", html: snippet(src, shown) });
  return {
    results,
    steps: [
      "زبان کے مطابق کوڈ، متن اور تبصروں میں تقسیم کیا۔",
      "متن اور تبصروں کے اندر کے بریکٹس کو نظرانداز کیا، اور ہر بند کرنے والے بریکٹ کو اسی قسم کے قریب ترین کھلنے والے بریکٹ سے ملایا۔",
      "ہر زائد، غیر بند یا غلط ملائے گئے بریکٹ کی اطلاع دی، ہر مسئلے کے مقام کے ساتھ۔"
    ],
    blocks,
    copy: [verdict, `زیادہ سے زیادہ نیسٹنگ گہرائی: ${maxDepth}`, ...shown.map((p) => `سطر ${p.line} کالم ${p.col}: ${p.message}`)].join("\n")
  };
}
