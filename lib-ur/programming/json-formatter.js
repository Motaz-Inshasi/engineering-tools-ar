import { choice, fail, isBlank } from "../core/validate.js";

export const meta = {
  description: "JSON متن کی جانچ کریں، ہر غلطی کا درست مقام (سطر اور کالم) معلوم کریں، اردو وضاحت اور اصلاح کا طریقہ دیں، پھر اسے اپنی پسند کی خالی جگہ کے ساتھ فارمیٹ کریں یا ایک سطر میں سکیڑ کر اس کے ڈھانچے کے اعداد دیکھیں۔",
  keywords: ["JSON", "JSON چیکر", "JSON فارمیٹ", "JSON سکیڑیں", "JSON formatter", "JSON validator", "JSON کی شکل"],
  formulas: [{ label: "JSON میں قدر", tex: "\\text{value} \\in \\{\\text{object}, \\text{array}, \\text{string}, \\text{number}, \\text{true}, \\text{false}, \\text{null}\\}" }],
  inputs: [
    { id: "text", label: "JSON متن", type: "textarea", rows: 10, wide: true, default: "" },
    { id: "mode", label: "موڈ", type: "select", default: "format", options: [["format", "فارمیٹ"], ["minify", "ایک سطر میں سکیڑیں"], ["validate", "صرف جانچ"]] },
    { id: "indent", label: "ابتدائی خالی جگہ", type: "select", default: "2", options: [["2", "2 خالی جگہیں"], ["4", "4 خالی جگہیں"], ["tab", "ٹیب (Tab)"]], when: { mode: ["format"] } },
    { id: "sortKeys", label: "کلیدیں حروف تہجی کے مطابق ترتیب دیں", type: "checkbox", default: "", when: { mode: ["format", "minify"] } }
  ],
  example: {
    values: { text: "{\n  \"name\": \"مِحساب\",\n  \"version\": 1,\n  \"tags\": [\"تعلیم\", \"انجینئرنگ\"],\n  \"enabled\": true\n}", mode: "format", indent: "2", sortKeys: "" },
    expect: ["✅ کوئی غلطی نہیں", "کلیدیں: 4"],
    note: "مثال: چار کلیدوں پر مشتمل درست JSON آبجیکٹ۔"
  },
  invalid: { values: { text: "", mode: "format", indent: "2", sortKeys: "" } },
  related: ["html-checker", "bracket-checker", "js-checker", "python-checker", "error-explainer"]
};

const LIMIT = 200000;
const CONTEXT = 3;
const VERDICT_OK = "✅ کوئی غلطی نہیں";
const VERDICT_ERR = "❌ 1 غلطی ملی";
const INDENTS = { "2": "  ", "4": "    ", tab: "\t" };
const ROOT_TYPES = { object: "آبجیکٹ", array: "ایرے", string: "متن", number: "عدد", boolean: "بولین قدر", null: "خالی (null)" };
const ESCAPES = new Map([["\"", "\""], ["\\", "\\"], ["/", "/"], ["b", "\b"], ["f", "\f"], ["n", "\n"], ["r", "\r"], ["t", "\t"]]);
const VALUE_START = /[-0-9"{\[a-zA-Z_$]/;
const LITERAL_HINTS = new Map([
  ["True", ["قدر «True» JSON میں درست نہیں، درست شکل چھوٹے حروف میں ہے۔", "اسے «true» چھوٹے حروف میں لکھیں۔"]],
  ["False", ["قدر «False» JSON میں درست نہیں، درست شکل چھوٹے حروف میں ہے۔", "اسے «false» چھوٹے حروف میں لکھیں۔"]],
  ["None", ["قدر «None» Python کی قدر ہے، JSON کی نہیں۔", "اسے «null» چھوٹے حروف میں لکھیں۔"]],
  ["undefined", ["قدر «undefined» JavaScript کی قدر ہے، JSON کی نہیں۔", "اسے «null» لکھیں۔"]],
  ["NaN", ["قدر «NaN» JSON میں اجازت شدہ نہیں ہے۔", "«null» استعمال کریں، یا قدر کو دو اقتباسی نشانات کے درمیان متن کے طور پر لکھیں۔"]],
  ["Infinity", ["قدر «Infinity» JSON میں اجازت شدہ نہیں ہے۔", "«null» استعمال کریں، یا قدر کو دو اقتباسی نشانات کے درمیان متن کے طور پر لکھیں۔"]]
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
  return `سطر ${l.line} (کالم ${l.col})`;
}

const digit = (c) => c !== undefined && c >= "0" && c <= "9";
const isLetter = (c) => c !== undefined && /[A-Za-z_$]/.test(c);

function wordEnd(s, i) {
  let k = i;
  while (k < s.length && /[A-Za-z0-9_$]/.test(s[k])) k++;
  return k;
}

function unclosed(s, open, ch, close) {
  fault(s.length, 0, `«${ch}» جو ${where(s, open)} پر کھلا تھا، فائل کے ختم ہونے سے پہلے بند نہیں ہوا۔`, `بند کرنے کے لیے مناسب جگہ پر «${close}» شامل کریں۔`);
}

function skipSpace(st) {
  const s = st.s;
  while (s[st.i] === " " || s[st.i] === "\t" || s[st.i] === "\n") st.i++;
  if (s[st.i] === "/" && s[st.i + 1] === "/") {
    const end = s.indexOf("\n", st.i);
    fault(st.i, (end < 0 ? s.length : end) - st.i, "JSON میں تبصرے سپورٹ نہیں ہوتے، اور یہاں ایک تبصرہ شروع ہوتا ہے۔", "تبصرہ مکمل طور پر حذف کریں؛ JSON فائلوں میں کوئی تبصرہ نہیں ہوتا۔");
  }
  if (s[st.i] === "/" && s[st.i + 1] === "*") {
    const end = s.indexOf("*/", st.i + 2);
    fault(st.i, end < 0 ? s.length - st.i : end + 2 - st.i, "JSON میں تبصرے سپورٹ نہیں ہوتے، اور یہاں ایک کثیر سطری تبصرہ شروع ہوتا ہے۔", "تبصرہ مکمل طور پر حذف کریں؛ JSON فائلوں میں کوئی تبصرہ نہیں ہوتا۔");
  }
}

function parseString(st) {
  const s = st.s, start = st.i;
  let i = start + 1, value = "";
  for (;;) {
    const c = s[i];
    if (c === undefined || c === "\n") fault(start, 1, "وہ دوہرا اقتباسی نشان بند نہیں ہوا جس سے متن شروع ہوا تھا۔", "متن کے آخر میں \" شامل کریں، اور متن کو کسی دوسری سطر تک نہ بڑھائیں۔");
    if (c === "\"") {
      st.i = i + 1;
      return { type: "string", value, raw: s.slice(start, i + 1) };
    }
    if (c === "\\") {
      const e = s[i + 1];
      if (e === undefined || e === "\n") fault(start, 1, "وہ دوہرا اقتباسی نشان بند نہیں ہوا جس سے متن شروع ہوا تھا۔", "متن کے آخر میں \" شامل کریں، اور متن کو کسی دوسری سطر تک نہ بڑھائیں۔");
      if (e === "u") {
        const hex = s.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) fault(i, 2, "\\u کے escape sequence کے بعد چار ہیکساڈیسیمل ہندسے ہونے چاہئیں (0-9 یا A-F)۔", "درست مثال: \\u00e9 حرف é کو ظاہر کرتا ہے۔");
        value += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      }
      if (!ESCAPES.has(e)) fault(i, 2, `escape sequence «\\${e}» JSON میں درست نہیں ہے۔`, "ترچھی لکیر \\ کے بعد اجازت شدہ حروف یہ ہیں: \" \\ / b f n r t u۔");
      value += ESCAPES.get(e);
      i += 2;
      continue;
    }
    if (c < " ") fault(i, 1, "متن کے اندر اجازت نہ ہونے والا کنٹرول حرف (جیسے Tab یا غیر مرئی حرف)۔", "اسے \\t جیسے escape sequence سے بدلیں، یا حذف کریں۔");
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
      fault(start, k - start, "JSON میں عدد صفر سے شروع نہیں ہو سکتا جس کے بعد ہندسہ ہو۔", "عدد کے شروع کے فالتو صفر حذف کریں، مثلاً 01 بن جائے گا 1۔");
    }
  } else if (digit(s[i])) {
    while (digit(s[i])) i++;
  } else {
    fault(start, 1, "علامت «-» کے بعد ہندسہ ہونا ضروری ہے۔", "«-» کے بعد عدد لکھیں، مثلاً -5، یا اگر یہ غلطی ہے تو علامت حذف کریں۔");
  }
  if (s[i] === ".") {
    i++;
    if (!digit(s[i])) fault(i - 1, 1, "اعشاری نقطے کے بعد ہندسہ ہونا ضروری ہے۔", "نقطے کے بعد ایک ہندسہ لکھیں، مثلاً 1.5، یا نقطہ حذف کریں۔");
    while (digit(s[i])) i++;
  }
  if (s[i] === "e" || s[i] === "E") {
    i++;
    if (s[i] === "+" || s[i] === "-") i++;
    if (!digit(s[i])) fault(start, i - start, "سائنٹفک عدد میں قوت (exponent) کے بعد ہندسہ ہونا ضروری ہے۔", "درست مثال: 1e5 یا 2.5E-3۔");
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
  fault(start, w.length, `لفظ «${w}» JSON کی درست قدر نہیں ہے۔`, "اجازت شدہ قدریں: \"\" کے درمیان متن، یا عدد، یا true، یا false، یا null۔");
}

function parseKey(st) {
  const s = st.s, c = s[st.i];
  if (c === "\"") return parseString(st);
  if (c === "}") fault(st.i, 1, "«}» سے پہلے فالتو کوما۔", "«}» سے پہلے آخری کوما حذف کریں۔");
  if (c === "'") fault(st.i, 1, "کلید کا نام دو دوہرے اقتباسی نشانات کے درمیان ہونا چاہیے، اکہرے نشان کے درمیان نہیں۔", "کلید کے نام کے گرد ' کی جگہ \" لگائیں۔");
  if (isLetter(c)) {
    const w = s.slice(st.i, wordEnd(s, st.i));
    fault(st.i, w.length, `کلید کا نام «${w}» دو اقتباسی نشانات کے بغیر ہے۔`, `نام کو دو اقتباسی نشانات کے درمیان رکھیں: "${w}"۔`);
  }
  fault(st.i, 1, `کلید کا نام دو دوہرے اقتباسی نشانات کے درمیان متن ہونا چاہیے، لیکن «${c}» ملا۔`, "کلید کا نام دو دوہرے اقتباسی نشانات کے درمیان لکھیں۔");
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
    if (s[st.i] !== ":") fault(st.i, 1, `کلید کے نام کے بعد «:» متوقع تھا، لیکن «${s[st.i]}» ملا۔`, "کلید کے نام اور قدر کے درمیان «:» لگائیں، جیسے: \"name\": \"value\"۔");
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
    if (d === "]") fault(st.i, 1, `«]» ملا، جبکہ «{» کو بند کرنے کے لیے «}» متوقع تھا، جو ${where(s, open)} پر کھلا تھا۔`, "اگر یہ آبجیکٹ کا اختتام ہے تو «]» کی جگہ «}» لگائیں، ورنہ بریکٹس کی جانچ کریں۔");
    if (VALUE_START.test(d)) fault(st.i, 1, "آبجیکٹ کے ارکان کے درمیان کوما «,» متوقع تھا، لیکن نیا رکن فوراً شروع ہو گیا۔", "پچھلی قدر کے بعد کوما «,» لگائیں۔");
    fault(st.i, 1, `«,» یا «}» متوقع تھا، لیکن «${d}» ملا۔`, "اس مقام کے گرد کوماؤں اور بریکٹس کی جانچ کریں۔");
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
    if (s[st.i] === "]") fault(st.i, 1, "«]» سے پہلے فالتو کوما۔", "«]» سے پہلے آخری کوما حذف کریں۔");
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
    if (d === "}") fault(st.i, 1, `«}» ملا، جبکہ «[» کو بند کرنے کے لیے «]» متوقع تھا، جو ${where(s, open)} پر کھلا تھا۔`, "اگر یہ ایرے کا اختتام ہے تو «}» کی جگہ «]» لگائیں، ورنہ بریکٹس کی جانچ کریں۔");
    if (VALUE_START.test(d)) fault(st.i, 1, "ایرے کے عناصر کے درمیان کوما «,» متوقع تھا، لیکن نیا عنصر فوراً شروع ہو گیا۔", "دونوں عناصر کے درمیان کوما «,» لگائیں۔");
    fault(st.i, 1, `«,» یا «]» متوقع تھا، لیکن «${d}» ملا۔`, "اس مقام کے گرد کوماؤں اور بریکٹس کی جانچ کریں۔");
  }
}

function parseValue(st) {
  skipSpace(st);
  const s = st.s, c = s[st.i];
  if (c === undefined) fault(st.i, 0, "فائل ختم ہو گئی جبکہ یہاں ایک قدر متوقع تھی۔", "غائب قدر مکمل کریں، یا پہلے والا کوما یا کولن حذف کریں۔");
  if (c === "{") return parseObject(st);
  if (c === "[") return parseArray(st);
  if (c === "\"") return parseString(st);
  if (c === "'") fault(st.i, 1, "JSON میں متن دوہرے اقتباسی نشان \" میں لکھا جاتا ہے، اور اکہرا نشان ' اجازت شدہ نہیں۔", "متن کے شروع اور آخر میں ' کی جگہ \" لگائیں۔");
  if (c === "-" || digit(c)) return parseNumber(st);
  if (isLetter(c)) return parseWord(st);
  fault(st.i, 1, `یہاں قدر متوقع تھی لیکن «${c}» ملا۔`, "اجازت شدہ قدریں: \"\" کے درمیان متن، یا عدد، یا true، یا false، یا null، یا آبجیکٹ {}، یا ایرے []۔");
}

export function parseJson(src) {
  const st = { s: src, i: 0 };
  try {
    const tree = parseValue(st);
    skipSpace(st);
    if (st.i < src.length) {
      const c = src[st.i];
      if (c === "]" || c === "}") fault(st.i, 1, `بند کرنے والا بریکٹ «${c}» فالتو ہے، اس کا کوئی کھلنے والا بریکٹ نہیں۔`, "اسے حذف کریں، یا تصدیق کریں کہ ہر کھلنے والے بریکٹ کا مطابق بند کرنے والا بریکٹ موجود ہے۔");
      fault(st.i, 1, "بنیادی قدر ختم ہونے کے بعد فالتو مواد موجود ہے۔", "JSON فائل میں صرف ایک قدر ہونی چاہیے؛ عناصر کو ایرے [ ] یا آبجیکٹ { } کے اندر رکھیں۔");
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
  const at = `سطر ${problem.line}، کالم ${problem.col}`;
  return {
    results: [
      { label: "فیصلہ", value: VERDICT_ERR },
      { label: "غلطی کی جگہ", value: at },
      { label: "پہلے کا حجم", value: `${length} حروف` }
    ],
    steps: [`${at} پر جائیں۔`, problem.suggestion],
    blocks: [
      { type: "table", wrap: true, head: ["سطر", "کالم", "مسئلہ", "اسے کیسے ٹھیک کریں"], rows: [[String(problem.line), String(problem.col), problem.message, problem.suggestion]] },
      { type: "html", html: snippet(src, [problem]) }
    ],
    copy: `${VERDICT_ERR}
${at}: ${problem.message}
اسے کیسے ٹھیک کریں: ${problem.suggestion}`
  };
}

export function solve(input) {
  const raw = input.text;
  if (isBlank(raw)) fail("وہ JSON متن درج کریں جس کی جانچ کرنی ہے۔", "text");
  const text = String(raw);
  if (text.length > LIMIT) fail("متن 200000 حروف سے زیادہ ہے؛ اس کا سائز کم کریں، پھر دوبارہ جانچ کریں۔", "text");
  const mode = choice(input, "mode", "موڈ", ["format", "minify", "validate"], "format");
  const indent = choice(input, "indent", "ابتدائی خالی جگہ", ["2", "4", "tab"], "2");
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
    { label: "فیصلہ", value: VERDICT_OK },
    { label: "بنیادی قدر کی قسم", value: rootLabel },
    { label: "کلیدوں کی تعداد", value: String(acc.keys) },
    { label: "قدروں کی تعداد", value: String(acc.values) },
    { label: "زیادہ سے زیادہ گہرائی", value: String(acc.maxDepth) },
    { label: "پہلے کا حجم", value: `${text.length} حروف` }
  ];
  const blocks = [];
  let step = "فارمیٹ نہیں مانگا گیا، اس لیے صرف جانچ کی۔";
  if (output) {
    results.push({ label: "بعد کا حجم", value: `${output.length} حروف` });
    blocks.push({ type: "note", text: mode === "minify" ? "نتیجہ ایک سطر میں سکیڑا ہوا:" : "فارمیٹ کے بعد نتیجہ:" });
    blocks.push({ type: "html", html: `<pre class="code" dir="ltr"><code>${esc(output)}</code></pre>` });
    step = mode === "minify" ? "متن کے اندر والی چیزوں کے علاوہ خالی جگہیں اور خالی سطریں ہٹا دیں۔" : "ہر اندرونی سطح کو الگ indent دے کر فائل دوبارہ لکھی۔";
  }
  const summary = `${VERDICT_OK}۔ بنیادی قدر کی قسم: ${rootLabel}، کلیدیں: ${acc.keys}، قدریں: ${acc.values}، زیادہ سے زیادہ گہرائی: ${acc.maxDepth}، حجم: ${text.length} حروف`;
  return {
    results,
    steps: ["متن پڑھا اور JSON کے قواعد کے مطابق اس کی ساخت حرف بہ حرف تجزیہ کی۔", "تصدیق کی کہ کلیدیں دوہرے اقتباسی نشانات کے درمیان ہیں، اور کوما اور بریکٹس متوازن ہیں۔", step],
    blocks,
    copy: output ? `${summary}\n${output}` : summary
  };
}
