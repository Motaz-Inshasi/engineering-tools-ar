import { choice, fail, isBlank } from "../core/validate.js";

export const meta = {
  description: "متن JSON را بررسی کنید و محل دقیق هر خطا (سطر و ستون) را با توضیح فارسی و روش اصلاح آن نشان دهید، سپس آن را با فاصله‌گذاری دلخواه قالب‌بندی کنید یا در یک سطر فشرده کنید، همراه با آمار ساختارش.",
  keywords: ["JSON", "بررسی‌کننده JSON", "قالب‌بندی JSON", "فشرده‌سازی JSON", "JSON formatter", "JSON validator", "ساختار JSON"],
  formulas: [{ label: "مقدار در JSON", tex: "\\text{value} \\in \\{\\text{object}, \\text{array}, \\text{string}, \\text{number}, \\text{true}, \\text{false}, \\text{null}\\}" }],
  inputs: [
    { id: "text", label: "متن JSON", type: "textarea", rows: 10, wide: true, default: "" },
    { id: "mode", label: "حالت", type: "select", default: "format", options: [["format", "قالب‌بندی"], ["minify", "فشرده در یک سطر"], ["validate", "فقط بررسی"]] },
    { id: "indent", label: "تورفتگی", type: "select", default: "2", options: [["2", "2 فاصله"], ["4", "4 فاصله"], ["tab", "تب (Tab)"]], when: { mode: ["format"] } },
    { id: "sortKeys", label: "مرتب‌سازی کلیدها به ترتیب الفبا", type: "checkbox", default: "", when: { mode: ["format", "minify"] } }
  ],
  example: {
    values: { text: "{\n  \"name\": \"مِحساب\",\n  \"version\": 1,\n  \"tags\": [\"آموزش\", \"مهندسی\"],\n  \"enabled\": true\n}", mode: "format", indent: "2", sortKeys: "" },
    expect: ["✅ خطایی وجود ندارد", "کلیدها: 4"],
    note: "مثال: یک شیء JSON معتبر با چهار کلید."
  },
  invalid: { values: { text: "", mode: "format", indent: "2", sortKeys: "" } },
  related: ["html-checker", "bracket-checker", "js-checker", "python-checker", "error-explainer"]
};

const LIMIT = 200000;
const CONTEXT = 3;
const VERDICT_OK = "✅ خطایی وجود ندارد";
const VERDICT_ERR = "❌ 1 خطا پیدا شد";
const INDENTS = { "2": "  ", "4": "    ", tab: "\t" };
const ROOT_TYPES = { object: "شیء", array: "آرایه", string: "متن", number: "عدد", boolean: "مقدار منطقی", null: "تهی (null)" };
const ESCAPES = new Map([["\"", "\""], ["\\", "\\"], ["/", "/"], ["b", "\b"], ["f", "\f"], ["n", "\n"], ["r", "\r"], ["t", "\t"]]);
const VALUE_START = /[-0-9"{\[a-zA-Z_$]/;
const LITERAL_HINTS = new Map([
  ["True", ["مقدار «True» در JSON معتبر نیست؛ مقدار درست باید با حروف کوچک نوشته شود.", "آن را با حروف کوچک «true» بنویسید."]],
  ["False", ["مقدار «False» در JSON معتبر نیست؛ مقدار نادرست باید با حروف کوچک نوشته شود.", "آن را با حروف کوچک «false» بنویسید."]],
  ["None", ["مقدار «None» مربوط به زبان Python است و مقدار JSON نیست.", "آن را با حروف کوچک «null» بنویسید."]],
  ["undefined", ["مقدار «undefined» مربوط به JavaScript است و مقدار JSON نیست.", "آن را «null» بنویسید."]],
  ["NaN", ["مقدار «NaN» در JSON مجاز نیست.", "از «null» استفاده کنید، یا مقدار را به صورت متن بین دو گیومه بنویسید."]],
  ["Infinity", ["مقدار «Infinity» در JSON مجاز نیست.", "از «null» استفاده کنید، یا مقدار را به صورت متن بین دو گیومه بنویسید."]]
]);

class JsonProblem extends Error {
  constructor(pos, len, message, suggestion) {
    super(message);
    this.pos = pos;
    this.len = len;
    this.suggestion = suggestion;
  }
}

function fault(pos, len, message, suggestion) {
  throw new JsonProblem(pos, len, message, suggestion);
}

function locate(src, pos) {
  let line = 1, start = 0;
  for (let k = 0; k < pos; k++) if (src[k] === "\n") { line++; start = k + 1; }
  return { line, col: pos - start + 1 };
}

function where(src, pos) {
  const l = locate(src, pos);
  return `سطر ${l.line} (ستون ${l.col})`;
}

const digit = (c) => c !== undefined && c >= "0" && c <= "9";
const isLetter = (c) => c !== undefined && /[A-Za-z_$]/.test(c);

function wordEnd(s, i) {
  let k = i;
  while (k < s.length && /[A-Za-z0-9_$]/.test(s[k])) k++;
  return k;
}

function unclosed(s, open, ch, close) {
  fault(s.length, 0, `«${ch}» که در ${where(s, open)} باز شده، قبل از پایان فایل بسته نشده است.`, `«${close}» را در جای مناسب برای بستن آن اضافه کنید.`);
}

function skipSpace(st) {
  const s = st.s;
  while (s[st.i] === " " || s[st.i] === "\t" || s[st.i] === "\n") st.i++;
  if (s[st.i] === "/" && s[st.i + 1] === "/") {
    const end = s.indexOf("\n", st.i);
    fault(st.i, (end < 0 ? s.length : end) - st.i, "JSON از توضیحات پشتیبانی نمی‌کند، و این توضیح از اینجا شروع می‌شود.", "کل توضیح را حذف کنید؛ فایل‌های JSON هیچ توضیحی را نمی‌پذیرند.");
  }
  if (s[st.i] === "/" && s[st.i + 1] === "*") {
    const end = s.indexOf("*/", st.i + 2);
    fault(st.i, end < 0 ? s.length - st.i : end + 2 - st.i, "JSON از توضیحات پشتیبانی نمی‌کند، و این توضیح چندسطری از اینجا شروع می‌شود.", "کل توضیح را حذف کنید؛ فایل‌های JSON هیچ توضیحی را نمی‌پذیرند.");
  }
}

function parseString(st) {
  const s = st.s, start = st.i;
  let i = start + 1, value = "";
  for (;;) {
    const c = s[i];
    if (c === undefined || c === "\n") fault(start, 1, "گیومه دوتایی که متن با آن شروع شده، بسته نشده است.", "در انتهای متن \" اضافه کنید و متن را به سطر دیگری ادامه ندهید.");
    if (c === "\"") {
      st.i = i + 1;
      return { type: "string", value, raw: s.slice(start, i + 1) };
    }
    if (c === "\\") {
      const e = s[i + 1];
      if (e === undefined || e === "\n") fault(start, 1, "گیومه دوتایی که متن با آن شروع شده، بسته نشده است.", "در انتهای متن \" اضافه کنید و متن را به سطر دیگری ادامه ندهید.");
      if (e === "u") {
        const hex = s.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) fault(i, 2, "توالی فرار \\u باید با چهار رقم شانزده‌دهی (0-9 یا A-F) دنبال شود.", "مثال درست: \\u00e9 نشان‌دهنده حرف é است.");
        value += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      }
      if (!ESCAPES.has(e)) fault(i, 2, `توالی فرار «\\${e}» در JSON معتبر نیست.`, "نویسه‌های مجاز بعد از خط مورب معکوس \\ عبارت‌اند از: \" \\ / b f n r t u.");
      value += ESCAPES.get(e);
      i += 2;
      continue;
    }
    if (c < " ") fault(i, 1, "نویسه کنترلی غیرمجاز داخل متن (مانند Tab یا نویسه نامرئی).", "آن را با توالی فراری مانند \\t جایگزین کنید، یا حذفش کنید.");
    value += c;
    i++;
  }
}

function parseNumber(st) {
  const s = st.s, start = st.i;
  let i = start;
  if (s[i] === "-") i++;
  if (s[i] === "0") {
    i++;
    if (digit(s[i])) {
      let k = i;
      while (digit(s[k])) k++;
      fault(start, k - start, "عدد در JSON نباید با صفر شروع شود و پس از آن رقم بیاید.", "صفرهای اضافی ابتدای عدد را حذف کنید؛ برای مثال 01 می‌شود 1.");
    }
  } else if (digit(s[i])) {
    while (digit(s[i])) i++;
  } else {
    fault(start, 1, "بعد از علامت «-» باید یک رقم بیاید.", "عدد را بعد از «-» بنویسید، مانند -5، یا اگر علامت اشتباه است آن را حذف کنید.");
  }
  if (s[i] === ".") {
    i++;
    if (!digit(s[i])) fault(i - 1, 1, "بعد از نقطه اعشار باید یک رقم بیاید.", "بعد از نقطه یک رقم بنویسید، مانند 1.5، یا نقطه را حذف کنید.");
    while (digit(s[i])) i++;
  }
  if (s[i] === "e" || s[i] === "E") {
    i++;
    if (s[i] === "+" || s[i] === "-") i++;
    if (!digit(s[i])) fault(start, i - start, "توان در عدد علمی باید با یک رقم دنبال شود.", "مثال درست: 1e5 یا 2.5E-3.");
    while (digit(s[i])) i++;
  }
  st.i = i;
  return { type: "number", raw: s.slice(start, i) };
}

function parseWord(st) {
  const s = st.s, start = st.i, end = wordEnd(s, start);
  const w = s.slice(start, end);
  st.i = end;
  if (w === "true" || w === "false") return { type: "boolean", raw: w };
  if (w === "null") return { type: "null", raw: w };
  if (LITERAL_HINTS.has(w)) {
    const [message, suggestion] = LITERAL_HINTS.get(w);
    fault(start, w.length, message, suggestion);
  }
  fault(start, w.length, `کلمه «${w}» مقدار معتبر JSON نیست.`, "مقادیر مجاز: متن بین \"\"، یا عدد، یا true، یا false، یا null.");
}

function parseKey(st) {
  const s = st.s, c = s[st.i];
  if (c === "\"") return parseString(st);
  if (c === "}") fault(st.i, 1, "کاما اضافی قبل از «}».", "کاما آخر را قبل از آکولاد «}» حذف کنید.");
  if (c === "'") fault(st.i, 1, "نام کلید باید بین دو گیومه دوتایی باشد، نه تک‌گیومه.", "' را اطراف نام کلید با \" جایگزین کنید.");
  if (isLetter(c)) {
    const w = s.slice(st.i, wordEnd(s, st.i));
    fault(st.i, w.length, `نام کلید «${w}» بدون گیومه است.`, `نام را بین دو گیومه بگذارید: "${w}".`);
  }
  fault(st.i, 1, `نام کلید باید متنی بین دو گیومه دوتایی باشد، اما «${c}» پیدا شد.`, "نام کلید را بین دو گیومه دوتایی بنویسید.");
}

function parseObject(st) {
  const s = st.s, open = st.i;
  st.i++;
  const entries = [];
  skipSpace(st);
  if (s[st.i] === "}") {
    st.i++;
    return { type: "object", entries };
  }
  for (;;) {
    skipSpace(st);
    if (s[st.i] === undefined) unclosed(s, open, "{", "}");
    const key = parseKey(st);
    skipSpace(st);
    if (s[st.i] === undefined) unclosed(s, open, "{", "}");
    if (s[st.i] !== ":") fault(st.i, 1, `بعد از نام کلید دونقطه «:» انتظار می‌رفت، اما «${s[st.i]}» پیدا شد.`, "بین نام کلید و مقدار «:» بگذارید، مانند: \"name\": \"value\".");
    st.i++;
    entries.push({ key: key.value, raw: key.raw, value: parseValue(st) });
    skipSpace(st);
    const d = s[st.i];
    if (d === ",") {
      st.i++;
      continue;
    }
    if (d === "}") {
      st.i++;
      return { type: "object", entries };
    }
    if (d === undefined) unclosed(s, open, "{", "}");
    if (d === "]") fault(st.i, 1, `«]» پیدا شد، در حالی که برای بستن «{» که در ${where(s, open)} باز شده «}» انتظار می‌رفت.`, "اگر این پایان شیء است، «]» را با «}» جایگزین کنید؛ وگرنه پرانتزها را بررسی کنید.");
    if (VALUE_START.test(d)) fault(st.i, 1, "کاما «,» بین اعضای شیء انتظار می‌رفت، اما عضو جدیدی بلافاصله شروع شد.", "کاما «,» را بعد از مقدار قبلی اضافه کنید.");
    fault(st.i, 1, `«,» یا «}» انتظار می‌رفت، اما «${d}» پیدا شد.`, "کاماها و قوس‌های اطراف این موقعیت را بررسی کنید.");
  }
}

function parseArray(st) {
  const s = st.s, open = st.i;
  st.i++;
  const items = [];
  skipSpace(st);
  if (s[st.i] === "]") {
    st.i++;
    return { type: "array", items };
  }
  for (;;) {
    skipSpace(st);
    if (s[st.i] === undefined) unclosed(s, open, "[", "]");
    if (s[st.i] === "]") fault(st.i, 1, "کاما اضافی قبل از «]».", "کاما آخر را قبل از کروشه «]» حذف کنید.");
    items.push(parseValue(st));
    skipSpace(st);
    const d = s[st.i];
    if (d === ",") {
      st.i++;
      continue;
    }
    if (d === "]") {
      st.i++;
      return { type: "array", items };
    }
    if (d === undefined) unclosed(s, open, "[", "]");
    if (d === "}") fault(st.i, 1, `«}» پیدا شد، در حالی که برای بستن «[» که در ${where(s, open)} باز شده «]» انتظار می‌رفت.`, "اگر این پایان آرایه است، «}» را با «]» جایگزین کنید؛ وگرنه پرانتزها را بررسی کنید.");
    if (VALUE_START.test(d)) fault(st.i, 1, "کاما «,» بین عناصر آرایه انتظار می‌رفت، اما عنصر جدیدی بلافاصله شروع شد.", "کاما «,» بین دو عنصر اضافه کنید.");
    fault(st.i, 1, `«,» یا «]» انتظار می‌رفت، اما «${d}» پیدا شد.`, "کاماها و قوس‌های اطراف این موقعیت را بررسی کنید.");
  }
}

function parseValue(st) {
  skipSpace(st);
  const s = st.s, c = s[st.i];
  if (c === undefined) fault(st.i, 0, "فایل تمام شد، در حالی که اینجا یک مقدار انتظار می‌رفت.", "مقدار گم‌شده را کامل کنید، یا کاما یا دونقطه قبلی را حذف کنید.");
  if (c === "{") return parseObject(st);
  if (c === "[") return parseArray(st);
  if (c === "\"") return parseString(st);
  if (c === "'") fault(st.i, 1, "متن‌ها در JSON با گیومه دوتایی \" نوشته می‌شوند و تک‌گیومه ' مجاز نیست.", "' را در ابتدا و انتهای متن با \" جایگزین کنید.");
  if (c === "-" || digit(c)) return parseNumber(st);
  if (isLetter(c)) return parseWord(st);
  fault(st.i, 1, `مقداری اینجا انتظار می‌رفت، اما «${c}» پیدا شد.`, "مقادیر مجاز: متن بین \"\"، یا عدد، یا true، یا false، یا null، یا شیء {}، یا آرایه [].");
}

export function parseJson(src) {
  const st = { s: src, i: 0 };
  try {
    const tree = parseValue(st);
    skipSpace(st);
    if (st.i < src.length) {
      const c = src[st.i];
      if (c === "]" || c === "}") fault(st.i, 1, `قوس بسته‌شونده «${c}» اضافی است و قوس بازکننده‌ای ندارد.`, "آن را حذف کنید، یا بررسی کنید که هر قوس بازکننده قوس بسته‌شونده مطابق داشته باشد.");
      fault(st.i, 1, "بعد از پایان مقدار اصلی، محتوای اضافی وجود دارد.", "فایل JSON فقط باید یک مقدار داشته باشد؛ عناصر را داخل آرایه [ ] یا شیء { } قرار دهید.");
    }
    return { ok: true, tree };
  } catch (e) {
    if (!(e instanceof JsonProblem)) throw e;
    const at = locate(src, e.pos);
    return { ok: false, problem: { pos: e.pos, len: e.len, line: at.line, col: at.col, message: e.message, suggestion: e.suggestion } };
  }
}

export function formatJson(tree, mode, unit, sortKeys) {
  return serialize(tree, mode === "minify" ? null : unit, sortKeys, 0);
}

function serialize(node, unit, sortKeys, level) {
  if (node.type === "object") {
    if (node.entries.length === 0) return "{}";
    let entries = node.entries;
    if (sortKeys) entries = entries.slice().sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    if (unit === null) return "{" + entries.map((e) => e.raw + ":" + serialize(e.value, null, sortKeys, 0)).join(",") + "}";
    const pad = unit.repeat(level + 1);
    return "{\n" + entries.map((e) => pad + e.raw + ": " + serialize(e.value, unit, sortKeys, level + 1)).join(",\n") + "\n" + unit.repeat(level) + "}";
  }
  if (node.type === "array") {
    if (node.items.length === 0) return "[]";
    if (unit === null) return "[" + node.items.map((x) => serialize(x, null, sortKeys, 0)).join(",") + "]";
    const pad = unit.repeat(level + 1);
    return "[\n" + node.items.map((x) => pad + serialize(x, unit, sortKeys, level + 1)).join(",\n") + "\n" + unit.repeat(level) + "]";
  }
  return node.raw;
}

function measure(node, depth, acc) {
  acc.values++;
  if (node.type !== "object" && node.type !== "array") return;
  const d = depth + 1;
  if (d > acc.maxDepth) acc.maxDepth = d;
  if (node.type === "object") {
    acc.keys += node.entries.length;
    for (const e of node.entries) measure(e.value, d, acc);
  } else {
    for (const x of node.items) measure(x, d, acc);
  }
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

function errorResult(src, problem, length) {
  const at = `سطر ${problem.line}، ستون ${problem.col}`;
  return {
    results: [
      { label: "حکم", value: VERDICT_ERR },
      { label: "محل خطا", value: at },
      { label: "اندازه قبل", value: `${length} نویسه` }
    ],
    steps: [`به ${at} بروید.`, problem.suggestion],
    blocks: [
      { type: "table", wrap: true, head: ["سطر", "ستون", "مشکل", "روش اصلاح"], rows: [[String(problem.line), String(problem.col), problem.message, problem.suggestion]] },
      { type: "html", html: snippet(src, [problem]) }
    ],
    copy: `${VERDICT_ERR}
${at}: ${problem.message}
روش اصلاح: ${problem.suggestion}`
  };
}

export function solve(input) {
  const raw = input.text;
  if (isBlank(raw)) fail("متن JSON را که می‌خواهید بررسی شود وارد کنید.", "text");
  const text = String(raw);
  if (text.length > LIMIT) fail("متن بیش از 200000 نویسه است؛ حجم آن را کم کنید و دوباره بررسی کنید.", "text");
  const mode = choice(input, "mode", "حالت", ["format", "minify", "validate"], "format");
  const indent = choice(input, "indent", "تورفتگی", ["2", "4", "tab"], "2");
  const sortKeys = !isBlank(input.sortKeys) && String(input.sortKeys) !== "0";
  const src = text.replace(/\r\n?/g, "\n");
  const parsed = parseJson(src);
  if (!parsed.ok) return errorResult(src, parsed.problem, text.length);
  const tree = parsed.tree;
  const acc = { values: 0, keys: 0, maxDepth: 0 };
  measure(tree, 0, acc);
  const output = mode === "validate" ? "" : formatJson(tree, mode, INDENTS[indent], sortKeys);
  const rootLabel = ROOT_TYPES[tree.type];
  const results = [
    { label: "حکم", value: VERDICT_OK },
    { label: "نوع مقدار ریشه", value: rootLabel },
    { label: "تعداد کلیدها", value: String(acc.keys) },
    { label: "تعداد مقادیر", value: String(acc.values) },
    { label: "بیشترین عمق", value: String(acc.maxDepth) },
    { label: "اندازه قبل", value: `${text.length} نویسه` }
  ];
  const blocks = [];
  let step = "قالب‌بندی درخواست نشده بود، پس فقط بررسی انجام شد.";
  if (output) {
    results.push({ label: "اندازه بعد", value: `${output.length} نویسه` });
    blocks.push({ type: "note", text: mode === "minify" ? "نتیجه فشرده در یک سطر:" : "نتیجه پس از قالب‌بندی:" });
    blocks.push({ type: "html", html: `<pre class="code" dir="ltr"><code>${esc(output)}</code></pre>` });
    step = mode === "minify" ? "فاصله‌ها و سطرهای خالی بیرون متن‌ها را حذف کردم." : "فایل را با تورفتگی هر سطح داخلی بازنویسی کردم.";
  }
  const summary = `${VERDICT_OK}. نوع مقدار ریشه: ${rootLabel}، کلیدها: ${acc.keys}، مقادیر: ${acc.values}، بیشترین عمق: ${acc.maxDepth}، اندازه: ${text.length} نویسه`;
  return {
    results,
    steps: ["متن را خواندم و ساختارش را نویسه به نویسه طبق قواعد JSON تحلیل کردم.", "بررسی کردم که کلیدها بین گیومه باشند و کاماها و قوس‌ها متوازن باشند.", step],
    blocks,
    copy: output ? `${summary}\n${output}` : summary
  };
}
