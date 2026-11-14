import { choice, fail, isBlank } from "../core/validate.js";

export const meta = {
  description: "افحص نص JSON وحدّد موقع كل خطأ بدقة (السطر والعمود) مع شرح عربي وطريقة إصلاحه، ثم نسّقه بالمسافات التي تختارها أو اضغطه في سطر واحد مع إحصاءات بنيته.",
  keywords: ["JSON", "فاحص JSON", "تنسيق JSON", "ضغط JSON", "JSON formatter", "JSON validator", "صيغة JSON"],
  formulas: [{ label: "القيمة في JSON", tex: "\\text{value} \\in \\{\\text{object}, \\text{array}, \\text{string}, \\text{number}, \\text{true}, \\text{false}, \\text{null}\\}" }],
  inputs: [
    { id: "text", label: "نص JSON", type: "textarea", rows: 10, wide: true, default: "" },
    { id: "mode", label: "الوضع", type: "select", default: "format", options: [["format", "تنسيق"], ["minify", "ضغط في سطر واحد"], ["validate", "فحص فقط"]] },
    { id: "indent", label: "المسافة البادئة", type: "select", default: "2", options: [["2", "2 مسافة"], ["4", "4 مسافات"], ["tab", "تبويب (Tab)"]], when: { mode: ["format"] } },
    { id: "sortKeys", label: "ترتيب المفاتيح أبجدياً", type: "checkbox", default: "", when: { mode: ["format", "minify"] } }
  ],
  example: {
    values: { text: "{\n  \"name\": \"مِحساب\",\n  \"version\": 1,\n  \"tags\": [\"تعليم\", \"هندسة\"],\n  \"enabled\": true\n}", mode: "format", indent: "2", sortKeys: "" },
    expect: ["✅ لا توجد أخطاء", "المفاتيح: 4"],
    note: "مثال: كائن JSON صحيح مكوّن من أربعة مفاتيح."
  },
  invalid: { values: { text: "", mode: "format", indent: "2", sortKeys: "" } },
  related: ["html-checker", "bracket-checker", "js-checker", "python-checker", "error-explainer"]
};

const LIMIT = 200000;
const CONTEXT = 3;
const VERDICT_OK = "✅ لا توجد أخطاء";
const VERDICT_ERR = "❌ وُجد 1 خطأ";
const INDENTS = { "2": "  ", "4": "    ", tab: "\t" };
const ROOT_TYPES = { object: "كائن", array: "مصفوفة", string: "نص", number: "عدد", boolean: "قيمة منطقية", null: "فارغة (null)" };
const ESCAPES = new Map([["\"", "\""], ["\\", "\\"], ["/", "/"], ["b", "\b"], ["f", "\f"], ["n", "\n"], ["r", "\r"], ["t", "\t"]]);
const VALUE_START = /[-0-9"{\[a-zA-Z_$]/;
const LITERAL_HINTS = new Map([
  ["True", ["القيمة «True» غير صالحة في JSON، والصحيح بحروف صغيرة.", "اكتبها «true» بحروف صغيرة."]],
  ["False", ["القيمة «False» غير صالحة في JSON، والصحيح بحروف صغيرة.", "اكتبها «false» بحروف صغيرة."]],
  ["None", ["القيمة «None» من لغة Python وليست قيمة JSON.", "اكتبها «null» بحروف صغيرة."]],
  ["undefined", ["القيمة «undefined» من JavaScript وليست قيمة JSON.", "اكتبها «null»."]],
  ["NaN", ["القيمة «NaN» غير مسموحة في JSON.", "استخدم «null»، أو ضع القيمة كنص بين علامتي تنصيص."]],
  ["Infinity", ["القيمة «Infinity» غير مسموحة في JSON.", "استخدم «null»، أو ضع القيمة كنص بين علامتي تنصيص."]]
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
  return `السطر ${l.line} (العمود ${l.col})`;
}

const digit = (c) => c !== undefined && c >= "0" && c <= "9";
const isLetter = (c) => c !== undefined && /[A-Za-z_$]/.test(c);

function wordEnd(s, i) {
  let k = i;
  while (k < s.length && /[A-Za-z0-9_$]/.test(s[k])) k++;
  return k;
}

function unclosed(s, open, ch, close) {
  fault(s.length, 0, `لم يُغلق «${ch}» الذي فُتح في ${where(s, open)} قبل نهاية الملف.`, `أضف «${close}» في المكان المناسب لإغلاقه.`);
}

function skipSpace(st) {
  const s = st.s;
  while (s[st.i] === " " || s[st.i] === "\t" || s[st.i] === "\n") st.i++;
  if (s[st.i] === "/" && s[st.i + 1] === "/") {
    const end = s.indexOf("\n", st.i);
    fault(st.i, (end < 0 ? s.length : end) - st.i, "JSON لا يدعم التعليقات، وهذا تعليق يبدأ هنا.", "احذف التعليق بالكامل؛ ملفات JSON لا تحتمل أي تعليق.");
  }
  if (s[st.i] === "/" && s[st.i + 1] === "*") {
    const end = s.indexOf("*/", st.i + 2);
    fault(st.i, end < 0 ? s.length - st.i : end + 2 - st.i, "JSON لا يدعم التعليقات، وهذا تعليق متعدد الأسطر يبدأ هنا.", "احذف التعليق بالكامل؛ ملفات JSON لا تحتمل أي تعليق.");
  }
}

function parseString(st) {
  const s = st.s, start = st.i;
  let i = start + 1, value = "";
  for (;;) {
    const c = s[i];
    if (c === undefined || c === "\n") fault(start, 1, "لم تُغلق علامة التنصيص المزدوجة التي بدأ بها النص.", "أضف \" في نهاية النص، ولا تُكمل النص إلى سطر آخر.");
    if (c === "\"") {
      st.i = i + 1;
      return { type: "string", value, raw: s.slice(start, i + 1) };
    }
    if (c === "\\") {
      const e = s[i + 1];
      if (e === undefined || e === "\n") fault(start, 1, "لم تُغلق علامة التنصيص المزدوجة التي بدأ بها النص.", "أضف \" في نهاية النص، ولا تُكمل النص إلى سطر آخر.");
      if (e === "u") {
        const hex = s.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) fault(i, 2, "تسلسل الهروب \\u يجب أن يتبعه أربعة أرقام سداسية عشرية (0-9 أو A-F).", "مثال صحيح: \\u00e9 يمثل الحرف é.");
        value += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      }
      if (!ESCAPES.has(e)) fault(i, 2, `تسلسل الهروب «\\${e}» غير صالح في JSON.`, "الحروف المسموحة بعد الشرطة المائلة \\ هي: \" \\ / b f n r t u.");
      value += ESCAPES.get(e);
      i += 2;
      continue;
    }
    if (c < " ") fault(i, 1, "حرف تحكم غير مسموح به داخل النص (مثل Tab أو حرف غير مرئي).", "استبدله بتسلسل هروب مثل \\t، أو احذفه.");
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
      fault(start, k - start, "لا يجوز أن يبدأ العدد بصفر متبوعاً برقم في JSON.", "احذف الأصفار الزائدة من بداية العدد، فمثلاً 01 تصبح 1.");
    }
  } else if (digit(s[i])) {
    while (digit(s[i])) i++;
  } else {
    fault(start, 1, "علامة «-» يجب أن يتبعها رقم.", "اكتب العدد بعد «-»، مثل -5، أو احذف العلامة إن كانت خطأ.");
  }
  if (s[i] === ".") {
    i++;
    if (!digit(s[i])) fault(i - 1, 1, "النقطة العشرية يجب أن يتبعها رقم.", "اكتب رقماً بعد النقطة، مثل 1.5، أو احذف النقطة.");
    while (digit(s[i])) i++;
  }
  if (s[i] === "e" || s[i] === "E") {
    i++;
    if (s[i] === "+" || s[i] === "-") i++;
    if (!digit(s[i])) fault(start, i - start, "الأس في العدد العلمي يجب أن يتبعه رقم.", "مثال صحيح: 1e5 أو 2.5E-3.");
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
  fault(start, w.length, `الكلمة «${w}» ليست قيمة JSON صالحة.`, "القيم المسموحة: نص بين \"\"، أو عدد، أو true، أو false، أو null.");
}

function parseKey(st) {
  const s = st.s, c = s[st.i];
  if (c === "\"") return parseString(st);
  if (c === "}") fault(st.i, 1, "فاصلة زائدة قبل «}».", "احذف الفاصلة الأخيرة قبل القوس «}».");
  if (c === "'") fault(st.i, 1, "اسم المفتاح يجب أن يكون بين علامتي تنصيص مزدوجتين، وليس بعلامة فردية.", "استبدل ' بـ \" حول اسم المفتاح.");
  if (isLetter(c)) {
    const w = s.slice(st.i, wordEnd(s, st.i));
    fault(st.i, w.length, `اسم المفتاح «${w}» بدون علامتي تنصيص.`, `ضع الاسم بين علامتي تنصيص: "${w}".`);
  }
  fault(st.i, 1, `اسم المفتاح يجب أن يكون نصاً بين علامتي تنصيص مزدوجتين، لكن وجدت «${c}».`, "اكتب اسم المفتاح بين علامتي تنصيص مزدوجتين.");
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
    if (s[st.i] !== ":") fault(st.i, 1, `توقعت النقطتين «:» بعد اسم المفتاح، لكن وجدت «${s[st.i]}».`, "ضع «:» بين اسم المفتاح والقيمة، مثل: \"name\": \"value\".");
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
    if (d === "]") fault(st.i, 1, `وجدت «]» بينما يُنتظر «}» لإغلاق «{» التي فُتحت في ${where(s, open)}.`, "إن كان هذا نهاية الكائن فاستبدل «]» بـ «}»، وإلا فتحقّق من الأقواس.");
    if (VALUE_START.test(d)) fault(st.i, 1, "توقعت فاصلة «,» بين أعضاء الكائن، لكن بدأ عضو جديد مباشرة.", "أضف فاصلة «,» بعد القيمة السابقة.");
    fault(st.i, 1, `توقعت «,» أو «}» لكن وجدت «${d}».`, "تحقّق من الفواصل والأقواس حول هذا الموضع.");
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
    if (s[st.i] === "]") fault(st.i, 1, "فاصلة زائدة قبل «]».", "احذف الفاصلة الأخيرة قبل القوس «]».");
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
    if (d === "}") fault(st.i, 1, `وجدت «}» بينما يُنتظر «]» لإغلاق «[» التي فُتحت في ${where(s, open)}.`, "إن كان هذا نهاية المصفوفة فاستبدل «}» بـ «]»، وإلا فتحقّق من الأقواس.");
    if (VALUE_START.test(d)) fault(st.i, 1, "توقعت فاصلة «,» بين عناصر المصفوفة، لكن بدأ عنصر جديد مباشرة.", "أضف فاصلة «,» بين العنصرين.");
    fault(st.i, 1, `توقعت «,» أو «]» لكن وجدت «${d}».`, "تحقّق من الفواصل والأقواس حول هذا الموضع.");
  }
}

function parseValue(st) {
  skipSpace(st);
  const s = st.s, c = s[st.i];
  if (c === undefined) fault(st.i, 0, "انتهى الملف وكانت قيمة متوقعة هنا.", "أكمل القيمة المفقودة، أو احذف الفاصلة أو النقطتين السابقتين.");
  if (c === "{") return parseObject(st);
  if (c === "[") return parseArray(st);
  if (c === "\"") return parseString(st);
  if (c === "'") fault(st.i, 1, "النصوص في JSON تُكتب بعلامة تنصيص مزدوجة \"، والعلامة الفردية ' غير مسموحة.", "استبدل ' بـ \" في بداية النص ونهايته.");
  if (c === "-" || digit(c)) return parseNumber(st);
  if (isLetter(c)) return parseWord(st);
  fault(st.i, 1, `توقعت قيمة هنا لكن وجدت «${c}».`, "القيم المسموحة: نص بين \"\"، أو عدد، أو true، أو false، أو null، أو كائن {}، أو مصفوفة [].");
}

export function parseJson(src) {
  const st = { s: src, i: 0 };
  try {
    const tree = parseValue(st);
    skipSpace(st);
    if (st.i < src.length) {
      const c = src[st.i];
      if (c === "]" || c === "}") fault(st.i, 1, `قوس الإغلاق «${c}» زائد لا يقابله قوس فتح.`, "احذفه، أو تحقّق من أن كل قوس فتح له قوس إغلاق مطابق.");
      fault(st.i, 1, "يوجد محتوى زائد بعد نهاية القيمة الأساسية.", "ملف JSON يحتوي قيمة واحدة فقط؛ ضع العناصر داخل مصفوفة [ ] أو كائن { }.");
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
  const at = `السطر ${problem.line}، العمود ${problem.col}`;
  return {
    results: [
      { label: "الحكم", value: VERDICT_ERR },
      { label: "موقع الخطأ", value: at },
      { label: "الحجم قبل", value: `${length} حرف` }
    ],
    steps: [`انتقل إلى ${at}.`, problem.suggestion],
    blocks: [
      { type: "table", wrap: true, head: ["السطر", "العمود", "المشكلة", "كيف تصلحه"], rows: [[String(problem.line), String(problem.col), problem.message, problem.suggestion]] },
      { type: "html", html: snippet(src, [problem]) }
    ],
    copy: `${VERDICT_ERR}\n${at}: ${problem.message}\nكيف تصلحه: ${problem.suggestion}`
  };
}

export function solve(input) {
  const raw = input.text;
  if (isBlank(raw)) fail("أدخل نص JSON الذي تريد فحصه.", "text");
  const text = String(raw);
  if (text.length > LIMIT) fail("النص أطول من 200000 حرف؛ قلّل حجمه ثم أعد الفحص.", "text");
  const mode = choice(input, "mode", "الوضع", ["format", "minify", "validate"], "format");
  const indent = choice(input, "indent", "المسافة البادئة", ["2", "4", "tab"], "2");
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
    { label: "الحكم", value: VERDICT_OK },
    { label: "نوع القيمة الجذرية", value: rootLabel },
    { label: "عدد المفاتيح", value: String(acc.keys) },
    { label: "عدد القيم", value: String(acc.values) },
    { label: "أقصى عمق", value: String(acc.maxDepth) },
    { label: "الحجم قبل", value: `${text.length} حرف` }
  ];
  const blocks = [];
  let step = "لم يُطلب تنسيق، فاكتفيت بالفحص.";
  if (output) {
    results.push({ label: "الحجم بعد", value: `${output.length} حرف` });
    blocks.push({ type: "note", text: mode === "minify" ? "النتيجة مضغوطة في سطر واحد:" : "النتيجة بعد التنسيق:" });
    blocks.push({ type: "html", html: `<pre class="code" dir="ltr"><code>${esc(output)}</code></pre>` });
    step = mode === "minify" ? "أزلت المسافات والأسطر الفارغة خارج النصوص." : "أعدت كتابة الملف بإزاحة كل مستوى داخلي.";
  }
  const summary = `${VERDICT_OK}. نوع القيمة الجذرية: ${rootLabel}، المفاتيح: ${acc.keys}، القيم: ${acc.values}، أقصى عمق: ${acc.maxDepth}، الحجم: ${text.length} حرف`;
  return {
    results,
    steps: ["قرأت النص وحلّلت بنيته حرفاً بحرف وفق قواعد JSON.", "تحققت من أن المفاتيح بين علامتي تنصيص، وأن الفواصل والأقواس متوازنة.", step],
    blocks,
    copy: output ? `${summary}\n${output}` : summary
  };
}
