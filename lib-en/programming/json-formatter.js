import { choice, fail, isBlank } from "../core/validate.js";

export const meta = {
  description: "Check JSON text and pinpoint the location of each error precisely (line and column), with an explanation in English and how to fix it. Then format it with the spacing you choose, or minify it onto a single line with structure statistics.",
  keywords: ["JSON", "JSON checker", "JSON formatting", "JSON minify", "JSON formatter", "JSON validator", "JSON syntax"],
  formulas: [{ label: "Value in JSON", tex: "\\text{value} \\in \\{\\text{object}, \\text{array}, \\text{string}, \\text{number}, \\text{true}, \\text{false}, \\text{null}\\}" }],
  inputs: [
    { id: "text", label: "JSON text", type: "textarea", rows: 10, wide: true, default: "" },
    { id: "mode", label: "Mode", type: "select", default: "format", options: [["format", "Format"], ["minify", "Minify to a single line"], ["validate", "Validate only"]] },
    { id: "indent", label: "Indentation", type: "select", default: "2", options: [["2", "2 spaces"], ["4", "4 spaces"], ["tab", "Tab"]], when: { mode: ["format"] } },
    { id: "sortKeys", label: "Sort keys alphabetically", type: "checkbox", default: "", when: { mode: ["format", "minify"] } }
  ],
  example: {
    values: { text: "{\n  \"name\": \"Mihsab\",\n  \"version\": 1,\n  \"tags\": [\"education\", \"engineering\"],\n  \"enabled\": true\n}", mode: "format", indent: "2", sortKeys: "" },
    expect: ["✅ No errors found", "Keys: 4"],
    note: "Example: a valid JSON object with four keys."
  },
  invalid: { values: { text: "", mode: "format", indent: "2", sortKeys: "" } },
  related: ["html-checker", "bracket-checker", "js-checker", "python-checker", "error-explainer"]
};

const LIMIT = 200000;
const CONTEXT = 3;
const VERDICT_OK = "✅ No errors found";
const VERDICT_ERR = "❌ 1 error found";
const INDENTS = { "2": "  ", "4": "    ", tab: "\t" };
const ROOT_TYPES = { object: "Object", array: "Array", string: "String", number: "Number", boolean: "Boolean", null: "Empty (null)" };
const ESCAPES = new Map([["\"", "\""], ["\\", "\\"], ["/", "/"], ["b", "\b"], ["f", "\f"], ["n", "\n"], ["r", "\r"], ["t", "\t"]]);
const VALUE_START = /[-0-9"{\[a-zA-Z_$]/;
const LITERAL_HINTS = new Map([
  ["True", ["The value “True” is not valid in JSON; the correct form is lowercase.", "Write it as “true” in lowercase."]],
  ["False", ["The value “False” is not valid in JSON; the correct form is lowercase.", "Write it as “false” in lowercase."]],
  ["None", ["The value “None” is from Python and is not a JSON value.", "Write it as “null” in lowercase."]],
  ["undefined", ["The value “undefined” is from JavaScript and is not a JSON value.", "Write it as “null”."]],
  ["NaN", ["The value “NaN” is not allowed in JSON.", "Use “null”, or put the value as text between quote marks."]],
  ["Infinity", ["The value “Infinity” is not allowed in JSON.", "Use “null”, or put the value as text between quote marks."]]
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
  return `Line ${l.line} (column ${l.col})`;
}

const digit = (c) => c !== undefined && c >= "0" && c <= "9";
const isLetter = (c) => c !== undefined && /[A-Za-z_$]/.test(c);

function wordEnd(s, i) {
  let k = i;
  while (k < s.length && /[A-Za-z0-9_$]/.test(s[k])) k++;
  return k;
}

function unclosed(s, open, ch, close) {
  fault(s.length, 0, `The “${ch}” opened in ${where(s, open)} was not closed before the end of the file.`, `Add “${close}” in the appropriate place to close it.`);
}

function skipSpace(st) {
  const s = st.s;
  while (s[st.i] === " " || s[st.i] === "\t" || s[st.i] === "\n") st.i++;
  if (s[st.i] === "/" && s[st.i + 1] === "/") {
    const end = s.indexOf("\n", st.i);
    fault(st.i, (end < 0 ? s.length : end) - st.i, "JSON does not support comments, and this is a comment starting here.", "Delete the comment entirely; JSON files do not allow any comments.");
  }
  if (s[st.i] === "/" && s[st.i + 1] === "*") {
    const end = s.indexOf("*/", st.i + 2);
    fault(st.i, end < 0 ? s.length - st.i : end + 2 - st.i, "JSON does not support comments, and this is a multi-line comment starting here.", "Delete the comment entirely; JSON files do not allow any comments.");
  }
}

function parseString(st) {
  const s = st.s, start = st.i;
  let i = start + 1, value = "";
  for (;;) {
    const c = s[i];
    if (c === undefined || c === "\n") fault(start, 1, "The double quote mark that started the string was not closed.", "Add \" at the end of the string, and do not continue the string onto another line.");
    if (c === "\"") {
      st.i = i + 1;
      return { type: "string", value, raw: s.slice(start, i + 1) };
    }
    if (c === "\\") {
      const e = s[i + 1];
      if (e === undefined || e === "\n") fault(start, 1, "The double quote mark that started the string was not closed.", "Add \" at the end of the string, and do not continue the string onto another line.");
      if (e === "u") {
        const hex = s.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) fault(i, 2, "The escape sequence \\u must be followed by four hexadecimal digits (0-9 or A-F).", "Correct example: \\u00e9 represents the character é.");
        value += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      }
      if (!ESCAPES.has(e)) fault(i, 2, `The escape sequence “\\${e}” is not valid in JSON.`, "The characters allowed after the backslash \\ are: \" \\ / b f n r t u.");
      value += ESCAPES.get(e);
      i += 2;
      continue;
    }
    if (c < " ") fault(i, 1, "A control character is not allowed inside the text (such as Tab or an invisible character).", "Replace it with an escape sequence such as \\t, or delete it.");
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
      fault(start, k - start, "A number in JSON must not start with a zero followed by a digit.", "Remove the extra leading zeros from the number; for example, 01 becomes 1.");
    }
  } else if (digit(s[i])) {
    while (digit(s[i])) i++;
  } else {
    fault(start, 1, "The “-” sign must be followed by a digit.", "Write the number after “-”, such as -5, or remove the sign if it is a mistake.");
  }
  if (s[i] === ".") {
    i++;
    if (!digit(s[i])) fault(i - 1, 1, "The decimal point must be followed by a digit.", "Write a digit after the point, such as 1.5, or remove the point.");
    while (digit(s[i])) i++;
  }
  if (s[i] === "e" || s[i] === "E") {
    i++;
    if (s[i] === "+" || s[i] === "-") i++;
    if (!digit(s[i])) fault(start, i - start, "The exponent in the scientific number must be followed by a digit.", "Correct examples: 1e5 or 2.5E-3.");
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
  fault(start, w.length, `The word “${w}” is not a valid JSON value.`, "Allowed values: text in \"\", a number, true, false, or null.");
}

function parseKey(st) {
  const s = st.s, c = s[st.i];
  if (c === "\"") return parseString(st);
  if (c === "}") fault(st.i, 1, "Extra comma before “}”.", "Delete the last comma before the curly bracket “}”.");
  if (c === "'") fault(st.i, 1, "The key name must be between double quote marks, not single quote marks.", "Replace ' with \" around the key name.");
  if (isLetter(c)) {
    const w = s.slice(st.i, wordEnd(s, st.i));
    fault(st.i, w.length, `The key name “${w}” has no quote marks.`, `Put the name between double quote marks: "${w}".`);
  }
  fault(st.i, 1, `The key name must be text between double quote marks, but “${c}” was found.`, "Write the key name between double quote marks.");
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
    if (s[st.i] !== ":") fault(st.i, 1, `A colon “:” was expected after the key name, but “${s[st.i]}” was found.`, "Put “:” between the key name and the value, for example: \"name\": \"value\".");
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
    if (d === "]") fault(st.i, 1, `“]” was found, but “}” is expected to close the “{” opened in ${where(s, open)}.`, "If this is the end of the object, replace “]” with “}”; otherwise check the brackets.");
    if (VALUE_START.test(d)) fault(st.i, 1, "A comma “,” was expected between the object members, but a new member started directly.", "Add a comma “,” after the previous value.");
    fault(st.i, 1, `“,” or “}” was expected, but “${d}” was found.`, "Check the commas and brackets around this position.");
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
    if (s[st.i] === "]") fault(st.i, 1, "Extra comma before “]”.", "Delete the last comma before the square bracket “]”.");
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
    if (d === "}") fault(st.i, 1, `“}” was found, but “]” is expected to close the “[” opened in ${where(s, open)}.`, "If this is the end of the array, replace “}” with “]”; otherwise check the brackets.");
    if (VALUE_START.test(d)) fault(st.i, 1, "A comma “,” was expected between the array elements, but a new element started directly.", "Add a comma “,” between the two elements.");
    fault(st.i, 1, `“,” or “]” was expected, but “${d}” was found.`, "Check the commas and brackets around this position.");
  }
}

function parseValue(st) {
  skipSpace(st);
  const s = st.s, c = s[st.i];
  if (c === undefined) fault(st.i, 0, "The file ended where a value was expected.", "Complete the missing value, or delete the comma or colon before it.");
  if (c === "{") return parseObject(st);
  if (c === "[") return parseArray(st);
  if (c === "\"") return parseString(st);
  if (c === "'") fault(st.i, 1, "Text in JSON is written with a double quote mark \", and the single quote mark ' is not allowed.", "Replace ' with \" at the start and end of the text.");
  if (c === "-" || digit(c)) return parseNumber(st);
  if (isLetter(c)) return parseWord(st);
  fault(st.i, 1, `A value was expected here, but “${c}” was found.`, "Allowed values: text in \"\", a number, true, false, null, an object {}, or an array [].");
}

export function parseJson(src) {
  const st = { s: src, i: 0 };
  try {
    const tree = parseValue(st);
    skipSpace(st);
    if (st.i < src.length) {
      const c = src[st.i];
      if (c === "]" || c === "}") fault(st.i, 1, `The closing bracket “${c}” is extra and has no matching opening bracket.`, "Delete it, or check that every opening bracket has a matching closing bracket.");
      fault(st.i, 1, "There is extra content after the end of the root value.", "A JSON file must contain only one value; put the items inside an array [ ] or an object { }.");
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
  const at = `Line ${problem.line}, column ${problem.col}`;
  return {
    results: [
      { label: "Verdict", value: VERDICT_ERR },
      { label: "Error location", value: at },
      { label: "Size before", value: `${length} characters` }
    ],
    steps: [`Go to ${at}.`, problem.suggestion],
    blocks: [
      { type: "table", wrap: true, head: ["Line", "Column", "Problem", "How to fix it"], rows: [[String(problem.line), String(problem.col), problem.message, problem.suggestion]] },
      { type: "html", html: snippet(src, [problem]) }
    ],
    copy: `${VERDICT_ERR}
${at}: ${problem.message}
How to fix it: ${problem.suggestion}`
  };
}

export function solve(input) {
  const raw = input.text;
  if (isBlank(raw)) fail("Enter the JSON text you want to check.", "text");
  const text = String(raw);
  if (text.length > LIMIT) fail("The text is longer than 200000 characters; reduce its size and then check again.", "text");
  const mode = choice(input, "mode", "Mode", ["format", "minify", "validate"], "format");
  const indent = choice(input, "indent", "Indentation", ["2", "4", "tab"], "2");
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
    { label: "Verdict", value: VERDICT_OK },
    { label: "Root value type", value: rootLabel },
    { label: "Number of keys", value: String(acc.keys) },
    { label: "Number of values", value: String(acc.values) },
    { label: "Maximum depth", value: String(acc.maxDepth) },
    { label: "Size before", value: `${text.length} characters` }
  ];
  const blocks = [];
  let step = "No formatting was requested, so only the check was performed.";
  if (output) {
    results.push({ label: "Size after", value: `${output.length} characters` });
    blocks.push({ type: "note", text: mode === "minify" ? "The result compacted onto a single line:" : "The result after formatting:" });
    blocks.push({ type: "html", html: `<pre class="code" dir="ltr"><code>${esc(output)}</code></pre>` });
    step = mode === "minify" ? "Removed spaces and empty lines outside the text." : "The file was rewritten with each inner level indented.";
  }
  const summary = `${VERDICT_OK}. Root value type: ${rootLabel}, keys: ${acc.keys}, values: ${acc.values}, maximum depth: ${acc.maxDepth}, size: ${text.length} characters`;
  return {
    results,
    steps: ["Read the text and analyzed its structure character by character according to JSON rules.", "Checked that the keys are between quote marks, and that commas and brackets are balanced.", step],
    blocks,
    copy: output ? `${summary}\n${output}` : summary
  };
}
