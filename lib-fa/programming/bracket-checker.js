import { choice, fail, isBlank } from "../core/validate.js";

export const meta = {
  description: "توازن پرانتزهای ( ) [ ] { } را در کد بررسی کنید، با نادیده گرفتن پرانتزهای داخل رشته‌ها و توضیحات بسته به زبان، و هر پرانتز اضافی، بازنشده یا جفت‌نشده را همراه با موقعیت و روش اصلاح آن مشخص کنید.",
  keywords: ["پرانتز", "بررسی‌کننده پرانتز", "پرانتز بسته‌نشده", "علامت‌های نقل قول", "bracket checker", "brackets", "parentheses", "matching brackets"],
  formulas: [{ label: "هر پرانتز بازکننده به یک پشته وارد می‌شود، و هر پرانتز بسته باید با پرانتز بالای پشته مطابقت داشته باشد", tex: "( \\leftrightarrow )\\quad [ \\leftrightarrow ]\\quad \\{ \\leftrightarrow \\}" }],
  inputs: [
    { id: "text", label: "کد یا متن", type: "textarea", rows: 10, wide: true, default: "" },
    { id: "lang", label: "نوع زبان", type: "select", default: "clike", options: [["clike", "C / C++ / Java / C# / JavaScript"], ["python", "Python"], ["plain", "متن ساده (بدون توضیحات)"]] }
  ],
  example: {
    values: { text: "function total(items) {\n  const parts = items.map((x) => x[0] * (1 + x[1]));\n  // ignore ) here\n  return parts.reduce((a, b) => a + b, \"(0)\");\n}", lang: "clike" },
    expect: ["✅ خطایی وجود ندارد", "حداکثر عمق تودرتو: 4"],
    note: "مثال: یک تابع JavaScript متوازن که یک پرانتز داخل رشته و یک توضیح دارد که شمرده نمی‌شوند."
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
  const where = (pos) => `خط ${loc(pos).line} ستون ${loc(pos).col}`;
  const add = (pos, len, message, suggestion) => problems.push({ pos, len, message, suggestion });
  const reportUnclosed = (e) => add(e.pos, 1, `پرانتز ${e.ch} که در ${where(e.pos)} باز شده، بسته نشده است.`, `${MATCH[e.ch]} را در جای مناسب اضافه کنید تا بسته شود.`);
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
      add(i, 3, `رشته چندخطی که با ${mark} در ${where(i)} شروع شده، بسته نشده است.`, `برای بستن رشته ${mark} را اضافه کنید.`);
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
    add(i, 1, `رشته‌ای که با ${q} در ${where(i)} شروع شده، بسته نشده است.`, `${q} را در انتهای همان رشته اضافه کنید، یا قبل از هر ${q} داخل آن از خط مورب معکوس \\ استفاده کنید.`);
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
        add(i, 2, `توضیح چندخطی که با /* در ${where(i)} شروع شده، بسته نشده است.`, "*/ را در انتهای توضیح اضافه کنید، وگرنه بقیه فایل توضیح حساب می‌شود.");
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
        add(i, 1, `پرانتز ${c} پرانتز بازکننده‌ای قبل از خود ندارد.`, `آن را حذف کنید، یا ${opener} مناسب را قبل از این موقعیت اضافه کنید.`);
      } else {
        const top = stack[stack.length - 1];
        if (top.ch === opener) {
          stack.pop();
        } else {
          add(i, 1, `انتظار ${MATCH[top.ch]} برای بستن ${top.ch} که در ${where(top.pos)} باز شده بود را داشتم، اما ${c} پیدا کردم.`, `${c} را با ${MATCH[top.ch]} جایگزین کنید، یا اگر فراموش کرده‌اید، ${MATCH[top.ch]} را قبل از آن اضافه کنید.`);
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
  if (isBlank(raw)) fail("کد یا متنی را که می‌خواهید پرانتزهایش بررسی شود وارد کنید.", "text");
  const text = String(raw);
  if (text.length > LIMIT) fail("متن بیش از 200000 نویسه است؛ حجم آن را کم کنید و دوباره بررسی کنید.", "text");
  const lang = choice(input, "lang", "نوع زبان", LANGS, "clike");
  const src = text.replace(/\r\n?/g, "\n");
  const { problems, counts, maxDepth } = scan(src, lang);
  const total = problems.length;
  const shown = problems.slice(0, CAP);
  const verdict = total ? `❌ ${total} خطا پیدا شد` : "✅ خطایی وجود ندارد";
  const opened = counts["("] + counts["["] + counts["{"];
  const closed = counts[")"] + counts["]"] + counts["}"];
  const results = [
    { label: "حکم", value: verdict },
    { label: "تعداد مشکلات", value: String(total) },
    { label: "پرانتزهای بازشده", value: String(opened) },
    { label: "پرانتزهای بسته‌شده", value: String(closed) },
    { label: "حداکثر عمق تودرتو", value: String(maxDepth) }
  ];
  const blocks = [];
  if (total) {
    blocks.push({ type: "table", wrap: true, head: ["خط", "ستون", "مشکل", "روش اصلاح"], rows: shown.map((p) => [String(p.line), String(p.col), p.message, p.suggestion]) });
    if (total > CAP) blocks.push({ type: "note", text: `${total} مشکل پیدا شد و فقط ${CAP} مورد اول نمایش داده شد.`, tone: "warn" });
  }
  blocks.push({ type: "table", head: ["نماد", "تعداد دفعات"], rows: ["(", ")", "[", "]", "{", "}"].map((ch) => [ch, String(counts[ch])]), ltr: true });
  if (total) blocks.push({ type: "html", html: snippet(src, shown) });
  return {
    results,
    steps: [
      "متن را بسته به زبان انتخاب‌شده به کد، رشته‌ها و توضیحات تقسیم کردم.",
      "پرانتزهای داخل رشته‌ها و توضیحات را نادیده گرفتم و هر پرانتز بسته را با نزدیک‌ترین پرانتز بازکننده از همان نوع جفت کردم.",
      "هر پرانتز اضافی، بازنشده یا جفت‌نشده را همراه با موقعیت هر مشکل گزارش کردم."
    ],
    blocks,
    copy: [verdict, `حداکثر عمق تودرتو: ${maxDepth}`, ...shown.map((p) => `خط ${p.line} ستون ${p.col}: ${p.message}`)].join("\n")
  };
}
