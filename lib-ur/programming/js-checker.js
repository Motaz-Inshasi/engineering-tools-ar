import * as acorn from "../../vendor/acorn/acorn.mjs";
import { choice } from "../core/validate.js";
import { readCode, report, lineCol, closest, distance } from "./code-view.js";

export const meta = {
  description: "JavaScript کوڈ چسپاں کریں تاکہ نحوی غلطیاں دریافت ہوں، ہر غلطی کی اردو وضاحت اور اصلاح کا طریقہ دیکھیں، اور عام غلطیوں جیسے غیر متعین متغیرات، املا کی غلطیوں اور == کی جگہ === کے انتباہات حاصل کریں۔",
  keywords: ["javascript", "js", "کوڈ کی جانچ", "غلطیوں کی تصحیح", "syntax error", "linter", "جاوا اسکرپٹ", "پروگرامنگ غلطی"],
  formulas: [{ label: "کوڈ کو سنٹیکس ٹری (AST) میں تبدیل کیا جاتا ہے، پھر عام غلطیوں کے اصول جانچے جاتے ہیں", tex: "\\text{code} \\xrightarrow{\\text{parser}} \\text{AST} \\xrightarrow{\\text{rules}} \\text{issues}" }],
  inputs: [
    { id: "code", label: "JavaScript کوڈ", type: "textarea", rows: 12, wide: true, placeholder: "function sum(a, b) {\n  return a + b;\n}" },
    { id: "mode", label: "فائل کی قسم", type: "select", default: "script", options: [["script", "عام اسکرپٹ"], ["module", "ES Module ماڈیول (import/export استعمال کرتا ہے)"]] }
  ],
  example: {
    values: { code: "function average(list) {\n  let total = 0;\n  for (let i = 0; i < list.length; i++) {\n    total += list[i];\n  }\n  if (list.length == 0) return 0;\n  return totl / list.length;\n}\nconsole.log(average([4, 8, 6]));", mode: "script" },
    expect: ["totl", "total"],
    note: "مثال: اوسط نکالنے والا فنکشن جس میں متغیر کے نام میں املا کی غلطی ہے، اور === کی جگہ == استعمال ہوا ہے۔"
  },
  invalid: { values: { code: "   ", mode: "script" } },
  related: ["error-explainer", "bracket-checker", "json-formatter", "python-checker", "regex-tester"]
};

const GLOBALS = new Set(("console Math JSON Number String Boolean Array Object Date RegExp Error TypeError RangeError SyntaxError ReferenceError EvalError URIError AggregateError Promise Map Set WeakMap WeakSet WeakRef Symbol BigInt parseInt parseFloat isNaN isFinite undefined NaN Infinity globalThis window document navigator location alert prompt confirm setTimeout setInterval clearTimeout clearInterval fetch localStorage sessionStorage require module exports process __dirname __filename Buffer arguments structuredClone queueMicrotask Intl Reflect Proxy encodeURIComponent decodeURIComponent encodeURI decodeURI escape unescape URL URLSearchParams TextEncoder TextDecoder AbortController Event CustomEvent EventTarget HTMLElement Element Node NodeList performance crypto atob btoa requestAnimationFrame cancelAnimationFrame Image Audio FormData Blob File FileReader WebSocket XMLHttpRequest history screen getComputedStyle matchMedia Uint8Array Uint8ClampedArray Int8Array Uint16Array Int16Array Uint32Array Int32Array Float32Array Float64Array BigInt64Array BigUint64Array ArrayBuffer SharedArrayBuffer DataView Atomics eval self top parent frames opener Function Generator Response Request Headers Worker MutationObserver IntersectionObserver ResizeObserver Notification indexedDB caches customElements DOMParser Option KeyboardEvent MouseEvent CSS Deno Bun global Iterator ImageData OffscreenCanvas CanvasRenderingContext2D HTMLCanvasElement HTMLInputElement HTMLFormElement SVGElement DocumentFragment Range Selection getSelection scrollTo scrollBy innerWidth innerHeight devicePixelRatio open close print postMessage BroadcastChannel MessageChannel ReadableStream WritableStream TransformStream PerformanceObserver reportError FinalizationRegistry").split(" "));

const MEMBERS = new Set(("length push pop shift unshift slice splice indexOf lastIndexOf includes forEach map filter reduce reduceRight find findIndex findLast some every join split toUpperCase toLowerCase trim trimStart trimEnd replace replaceAll substring substr charAt charCodeAt codePointAt toString toFixed toPrecision innerHTML innerText textContent value addEventListener removeEventListener getElementById getElementsByClassName getElementsByTagName querySelector querySelectorAll appendChild removeChild createElement createTextNode setAttribute getAttribute removeAttribute classList className style parentNode parentElement children firstChild nextSibling dataset checked disabled preventDefault stopPropagation target currentTarget keys values entries assign freeze parse stringify floor ceil round random sqrt abs max min then catch finally resolve reject sort reverse concat startsWith endsWith padStart padEnd repeat match matchAll test exec flat flatMap fill from isArray isInteger isNaN getTime getFullYear getMonth getDate getDay getHours getMinutes getSeconds toISOString toLocaleString toLocaleDateString hasOwnProperty prototype constructor call apply bind log error warn info table json text status focus click submit reset remove append prepend contains toggle add delete clear size has get set").split(" "));

const VALUE_END =new Set(["name", "num", "string", "regexp", ")", "]", "}", "`", "privateId", "true", "false", "null", "this", "super", "bigint"]);
const VALUE_START = new Set(["name", "num", "string", "regexp", "`", "true", "false", "null", "this", "new", "function", "class", "privateId", "bigint", "typeof", "void"]);
const OPENERS = { "(": ")", "[": "]", "{": "}", "${": "}" };
const CLOSERS = new Set([")", "]", "}"]);

function tokensOf(code, sourceType) {
  const toks = [];
  try {
    for (const t of acorn.tokenizer(code, { ecmaVersion: "latest", sourceType, locations: true, allowHashBang: true })) {
      toks.push({ label: t.type.label, keyword: t.type.keyword, value: t.value, start: t.start, end: t.end, line: t.loc.start.line, col: t.loc.start.column });
      if (toks.length > 400000) break;
    }
  } catch { return toks; }
  return toks;
}

function stackBefore(toks, pos) {
  const stack = [];
  for (const t of toks) {
    if (t.start >= pos) break;
    if (OPENERS[t.label]) stack.push(t);
    else if (CLOSERS.has(t.label) && stack.length && OPENERS[stack[stack.length - 1].label] === t.label) stack.pop();
  }
  return stack;
}

const shown = (t) => (!t ? "" : t.label === "string" ? JSON.stringify(t.value) : t.value !== undefined && t.value !== null && typeof t.value !== "object" ? String(t.value) : t.label);

function explainUnexpected(code, pos, sourceType) {
  const toks = tokensOf(code, sourceType);
  const before = toks.filter((t) => t.end <= pos);
  const prev = before[before.length - 1], prev2 = before[before.length - 2];
  const cur = toks.find((t) => t.start >= pos);
  const stack = stackBefore(toks, pos);
  const top = stack[stack.length - 1];
  const atEnd = !code.slice(pos).trim();
  if (atEnd) {
    if (stack.length === 1) return { message: `کوڈ ختم ہو گیا جبکہ «${top.label}» جو سطر ${top.line} پر کھلا تھا بند نہیں ہوا۔`, fix: `بند کرنے کے لیے مناسب جگہ پر «${OPENERS[top.label]}» شامل کریں۔`, at: top };
    if (stack.length > 1) {
      const inner = stack.find((t, i) => (t.label === "(" || t.label === "[") && stack[i + 1] && stack[i + 1].label === "{" && stack[i + 1].line === t.line);
      const list = stack.map((t) => `«${t.label}» سطر ${t.line} پر`).join("، ");
      if (inner) return { message: `«${inner.label}» جو سطر ${inner.line} پر کھلا تھا، «{» سے پہلے بند نہیں ہوا، اور بند نہ ہونے والے بریکٹس: ${list}۔`, fix: `«{» سے پہلے سطر ${inner.line} پر «${OPENERS[inner.label]}» شامل کریں، پھر بقیہ بریکٹس بند کریں۔`, at: inner };
      return { message: `کوڈ ختم ہو گیا اور یہ بریکٹس بند نہیں ہوئے: ${list}۔`, fix: `انہیں الٹی ترتیب میں بند کریں: ${stack.map((t) => OPENERS[t.label]).reverse().join(" ")}`, at: stack[0] };
    }
    return { message: "کوڈ آخری جملہ مکمل ہونے سے پہلے ختم ہو گیا۔", fix: "آخری جملہ مکمل کریں، مثلاً = کے بعد قدر دیں یا اظہار مکمل کریں۔" };
  }
  if (prev && prev.value === "await" && prev.label === "name") return { message: "لفظ await صرف async فنکشن کے اندر (یا ES Module میں) استعمال ہوتا ہے۔", fix: "فنکشن سے پہلے async لگائیں: async function f() { await ... }، یا فائل کی قسم «ES Module ماڈیول» منتخب کریں۔" };
  if (prev && prev2 && prev2.keyword === "const" && prev.label === "name" && cur && (cur.label === ";" || cur.label === ",")) return { message: `const سے متعین مستقل «${prev.value}» کو اس کی تعریف کے وقت قدر دینا ضروری ہے۔`, fix: `const ${prev.value} = قدر; لکھیں، یا اگر قدر بعد میں دی جائے گی تو let استعمال کریں۔` };
  if (prev && prev.keyword === "class" && cur && cur.label === "{") return { message: "class کی تعریف کے لیے class کے لفظ کے بعد نام درکار ہے۔", fix: "class MyClass { ... } لکھیں۔" };
  if (cur && cur.label === "{" && top && top.label === "(") return { message: `«(» جو سطر ${top.line} پر کھلا تھا، «{» سے پہلے بند نہیں ہوا۔`, fix: "گھونگھریالے بریکٹ { سے پہلے «)» شامل کریں، مثلاً: if (x > 1) {" , at: top };
  if (cur && CLOSERS.has(cur.label)) {
    if (top && OPENERS[top.label] !== cur.label) return { message: `بریکٹ «${cur.label}» بریکٹ «${top.label}» سے مطابقت نہیں رکھتا جو سطر ${top.line} پر کھلا تھا۔`, fix: `پہلے «${top.label}» کو «${OPENERS[top.label]}» سے بند کریں، یا فالتو بریکٹ حذف کریں۔` };
    if (!top) return { message: `بند کرنے والا بریکٹ «${cur.label}» فالتو ہے اور اس کا کھلنے والا بریکٹ موجود نہیں۔`, fix: "یہ بریکٹ حذف کریں، یا اس سے پہلے کھلنے والا بریکٹ شامل کریں۔" };
    if (prev && !VALUE_END.has(prev.label) && prev.label !== "," && prev.label !== "(" && prev.label !== "[" && prev.label !== "{") return { message: `آپریٹر «${shown(prev)}» کے بعد «${cur.label}» سے پہلے ایک قدر درکار ہے۔`, fix: "آپریٹر کے بعد قدر کے ساتھ اظہار مکمل کریں، یا فالتو آپریٹر حذف کریں۔" };
  }
  if (cur && (cur.label === ";" || cur.label === ",") && prev && !VALUE_END.has(prev.label) && prev.label !== ";" && !prev.keyword) return { message: `آپریٹر «${shown(prev)}» کے بعد قدر درکار ہے۔`, fix: "آپریٹر کے بعد قدر کے ساتھ اظہار مکمل کریں، مثلاً: let y = 5 + 3;" };
  if (prev && cur && VALUE_END.has(prev.label) && (VALUE_START.has(cur.label) || (cur.keyword && VALUE_START.has(cur.keyword)))) {
    if (top && (top.label === "(" || top.label === "[")) return { message: `«${shown(prev)}» اور «${shown(cur)}» کے درمیان کوما «,» غائب ہے۔`, fix: `عناصر کو کوما سے الگ کریں: ${shown(prev)}, ${shown(cur)}` };
    if (top && top.label === "{" && code.slice(top.end).match(/^\s*[\w"'$]+\s*:/)) return { message: `«${shown(cur)}» سے پہلے آبجیکٹ کی خصوصیات کے درمیان کوما «,» غائب ہے۔`, fix: "آبجیکٹ کی خصوصیات کو کوما سے الگ کریں: { a: 1, b: 2 }" };
    return { message: `«${shown(prev)}» کے فوراً بعد «${shown(cur)}» آیا، ان کے درمیان کوئی آپریٹر یا کوما نہیں۔`, fix: "دونوں حصوں کے درمیان آپریٹر (+ یا = یا .) یا سیمی کولن یا بند بریکٹ کی موجودگی کی جانچ کریں۔" };
  }
  if (cur && cur.label === "=>" ) return { message: "تیر «=>» غلط جگہ پر ہے۔", fix: "تیر والے فنکشن کی شکل کی تصدیق کریں: (a, b) => a + b" };
  const tok = cur ? shown(cur) : code[pos];
  return { message: `علامت «${tok}» اس مقام پر غیر متوقع ہے۔`, fix: "اسی سطر اور اس سے پہلے کی سطر کو دیکھیں: ممکن ہے بریکٹ، کوما یا آپریٹر غائب ہو۔" };
}

const RULES = [
  [/^Unterminated string constant/, () => ({ message: "اسٹرنگ (string) کو اقتباسی نشان سے بند نہیں کیا گیا۔", fix: "متن کو اسی سطر پر اسی نشان سے بند کریں جس سے شروع کیا تھا، یعنی \" یا '، اور کثیر سطری متن کے لیے ` استعمال کریں۔" })],
  [/^Unterminated template/, () => ({ message: "` سے شروع ہونے والا ٹیمپلیٹ متن بند نہیں ہوا۔", fix: "متن کے آخر میں ` شامل کریں۔" })],
  [/^Unterminated comment/, () => ({ message: "کثیر سطری تبصرہ /* کو */ سے بند نہیں کیا گیا۔", fix: "تبصرے کے آخر میں */ شامل کریں۔" })],
  [/^Unterminated regular expression/, () => ({ message: "باقاعدہ اظہار (regex) جو / سے شروع ہوتا ہے بند نہیں ہوا۔", fix: "اظہار کو اسی سطر پر / سے بند کریں، یا یقینی بنائیں کہ یہاں / ادھوری تقسیم کا نشان نہیں ہے۔" })],
  [/^Identifier '(.+)' has already been declared/, (m) => ({ message: `متغیر «${m[1]}» اسی دائرے میں پہلے سے متعین ہے، اس لیے let یا const سے دوبارہ متعین نہیں ہو سکتا۔`, fix: `دوسری تعریف سے let/const حذف کریں تاکہ قدر تبدیل ہو: ${m[1]} = ...، یا کوئی اور نام منتخب کریں۔` })],
  [/^'return' outside of function/, () => ({ message: "return کا جملہ کسی فنکشن سے باہر لکھا گیا ہے۔", fix: "return کو فنکشن کے بدن کے اندر رکھیں، یا اسے حذف کریں۔" })],
  [/^'import' and 'export' may appear only/, () => ({ message: "import اور export عام اسکرپٹ میں کام نہیں کرتے۔", fix: "فائل کی قسم «ES Module ماڈیول» منتخب کریں، اور HTML میں <script type=\"module\"> استعمال کریں۔" })],
  [/^Assigning to rvalue|^Invalid left-hand side/, () => ({ message: "تفویض (=) کے بائیں جانب والی چیز ایسا متغیر نہیں جس کی قدر بدلی جا سکے۔", fix: "اگر مقابلہ مقصود ہے تو = کی جگہ === استعمال کریں، ورنہ = کے بائیں طرف متغیر کا نام رکھیں۔" })],
  [/^Invalid regular expression flag/, () => ({ message: "باقاعدہ اظہار کے بعد فلیگ (flag) درست نہیں ہے۔", fix: "اجازت شدہ فلیگز: g i m s u y d v۔" })],
  [/^Invalid regular expression: (.*)/, (m) => ({ message: `باقاعدہ اظہار درست نہیں: ${m[1]}`, fix: "اظہار کے قوسین اور خاص علامات دیکھیں، اور Regex ٹیسٹ ٹول استعمال کریں۔" })],
  [/^Unexpected character '(.*)'/, (m) => ({ message: `یہاں حرف «${m[1]}» JavaScript کوڈ میں اجازت شدہ نہیں ہے۔`, fix: /[“”‘’]/.test(m[1]) ? "یہ ورڈ پروسیسر کا «سمارٹ» اقتباسی نشان ہے؛ اسے عام \" یا ' سے بدلیں۔" : /[،؛]/.test(m[1]) ? "یہ عربی کوما ہے؛ انگریزی کوما «,» یا سیمی کولن «;» استعمال کریں۔" : "یہ حرف حذف کریں، یا اسے دو اقتباسی نشانات کے درمیان متن میں رکھیں۔" })],
  [/^Unexpected keyword '(.*)'/, (m) => ({ message: `محفوظ لفظ «${m[1]}» نامناسب جگہ پر آیا ہے۔`, fix: `«${m[1]}» کو متغیر یا فنکشن کا نام نہ بنائیں، اور اس سے پہلے کی شکل جانچیں۔` })],
  [/^Cannot use keyword 'await' outside an async function|'await' is only valid/, () => ({ message: "لفظ await صرف async فنکشن کے اندر استعمال ہوتا ہے۔", fix: "فنکشن سے پہلے async لگائیں: async function f() { ... }۔" })],
  [/^Unsyntactic (break|continue)/, (m) => ({ message: `جملہ ${m[1]} تکرار والی لوپ${m[1] === "break" ? " یا switch" : ""} کے باہر لکھا گیا ہے۔`, fix: `${m[1]} کو for یا while${m[1] === "break" ? " یا switch" : ""} کے اندر رکھیں، یا فنکشن سے نکلنے کے لیے return استعمال کریں۔` })],
  [/^Identifier directly after number/, () => ({ message: "عدد کے فوراً بعد نام آیا ہے، جیسے 3px یا 2x۔", fix: "قدر کو دو اقتباسی نشانات میں لکھیں، \"3px\"، یا ضرب کا عمل صراحت سے 2 * x لکھیں۔" })],
  [/^let is disallowed as a lexically bound name/, () => ({ message: "متغیر کا نام let رکھنا جائز نہیں۔", fix: "متغیر کے لیے کوئی اور نام منتخب کریں۔" })],
  [/^The keyword '(.*)' is reserved/, (m) => ({ message: `«${m[1]}» جاوا اسکرپٹ میں محفوظ لفظ ہے اور بطور نام استعمال نہیں ہو سکتا۔`, fix: "متغیر یا فنکشن کے لیے کوئی اور نام منتخب کریں۔" })],
  [/^Argument name clash/, () => ({ message: "فنکشن کی تعریف میں ایک ہی نام کے دو پیرامیٹر ہیں۔", fix: "فنکشن کے پیرامیٹرز کے نام مختلف رکھیں۔" })],
  [/^Complex binding patterns require an initialization value|^Missing initializer/, () => ({ message: "تعریف میں destructuring کو قدر درکار ہے۔", fix: "مثلاً لکھیں: const { a, b } = obj;" })],
  [/^Octal literal in strict mode|^Invalid number/, () => ({ message: "عدد کی شکل درست نہیں ہے۔", fix: "ہندسوں کو غیر ضروری صفر سے شروع نہ کریں، آٹھ کے نظام کے لیے 0o اور سولہ کے نظام کے لیے 0x استعمال کریں۔" })],
  [/^Bad escape sequence|^Invalid escape sequence|^Bad character escape/, () => ({ message: "متن کے اندر \\ کے بعد غلط escape sequence ہے۔", fix: "ترچھی لکیر لکھنے کے لیے \\\\ استعمال کریں، یا درست sequence جیسے \\n اور \\t۔" })],
  [/^Label '(.*)' is already declared/, (m) => ({ message: `لیبل «${m[1]}» دو بار متعین ہے۔`, fix: "دو میں سے ایک لیبل کا نام بدلیں۔" })],
  [/^Duplicate constructor/, () => ({ message: "کلاس میں ایک سے زیادہ constructor ہیں۔", fix: "کلاس میں صرف ایک constructor فنکشن رکھیں۔" })],
  [/^Shorthand property assignments are valid only in destructuring/, () => ({ message: "آبجیکٹ میں : کی جگہ = استعمال ہوا ہے۔", fix: "خصوصیات کو { key: value } کی شکل میں لکھیں۔" })],
  [/^Comma is not permitted after the rest element|^Rest element must be last/, () => ({ message: "باقی عنصر ... آخری ہونا چاہیے۔", fix: "...rest کو فہرست کے آخر میں لے جائیں۔" })],
  [/^'with' in strict mode|^Deleting local variable in strict mode/, () => ({ message: "یہ شکل strict mode میں اجازت شدہ نہیں ہے۔", fix: "with سے گریز کریں اور delete کے ذریعے متغیرات حذف نہ کریں۔" })]
];

function syntaxIssue(code, err, sourceType) {
  const raw = String(err.message).replace(/\s*\(\d+:\d+\)\s*$/, "");
  const pos = Number.isInteger(err.pos) ? err.pos : 0;
  const { line, col } = err.loc ? { line: err.loc.line, col: err.loc.column } : lineCol(code, pos);
  let info = null;
  if (/^Unexpected token/.test(raw)) info = explainUnexpected(code, pos, sourceType);
  else for (const [re, fn] of RULES) { const m = raw.match(re); if (m) { info = fn(m); break; } }
  if (!info) info = { message: `نحوی غلطی: ${raw}`, fix: "اس سطر اور اس سے پہلے کی سطر کو دیکھیں۔" };
  const at = info.at || { line, col };
  return { line: at.line, col: at.col, len: Math.max(1, (err.raisedAt || pos + 1) - pos), severity: "error", message: info.message, fix: info.fix, english: `SyntaxError: ${raw}` };
}

function walk(node, parent, fn) {
  if (!node || typeof node.type !== "string") return;
  fn(node, parent);
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "start" || key === "end" || key === "type") continue;
    const v = node[key];
    if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === "string") walk(c, node, fn); }
    else if (v && typeof v.type === "string") walk(v, node, fn);
  }
}

function patternNames(p, out = []) {
  if (!p) return out;
  if (p.type === "Identifier") out.push(p);
  else if (p.type === "ObjectPattern") for (const pr of p.properties) patternNames(pr.type === "RestElement" ? pr.argument : pr.value, out);
  else if (p.type === "ArrayPattern") for (const e of p.elements) patternNames(e, out);
  else if (p.type === "RestElement") patternNames(p.argument, out);
  else if (p.type === "AssignmentPattern") patternNames(p.left, out);
  return out;
}

const isRefPosition = (node, parent) => {
  if (!parent) return true;
  if (parent.type === "MemberExpression" && parent.property === node && !parent.computed) return false;
  if ((parent.type === "Property" || parent.type === "PropertyDefinition" || parent.type === "MethodDefinition") && parent.key === node && !parent.computed) return parent.type === "Property" && parent.shorthand && parent.value === node;
  if (parent.type === "LabeledStatement" || parent.type === "BreakStatement" || parent.type === "ContinueStatement") return false;
  if (parent.type === "MetaProperty") return false;
  if (parent.type === "ExportSpecifier") return parent.local === node;
  if (parent.type === "ImportSpecifier" || parent.type === "ImportDefaultSpecifier" || parent.type === "ImportNamespaceSpecifier") return false;
  return true;
};

const TYPEOF_OK = new Set(["undefined", "object", "boolean", "number", "string", "function", "symbol", "bigint"]);
const ENDS = new Set(["ReturnStatement", "ThrowStatement", "BreakStatement", "ContinueStatement"]);

function lint(ast, code) {
  const issues = [];
  const add = (node, severity, message, fix, len) => issues.push({ line: node.loc.start.line, col: node.loc.start.column, len: len || Math.max(1, Math.min(node.end - node.start, 60)), severity, message, fix });
  const declared = new Map();
  const declNodes = new Set();
  const declare = (id, kind) => {
    declNodes.add(id);
    if (!declared.has(id.name)) declared.set(id.name, { kind, node: id, kinds: new Set() });
    declared.get(id.name).kinds.add(kind);
  };
  walk(ast, null, (n) => {
    if (n.type === "VariableDeclaration") for (const d of n.declarations) for (const id of patternNames(d.id)) declare(id, n.kind);
    if ((n.type === "FunctionDeclaration" || n.type === "FunctionExpression" || n.type === "ClassDeclaration" || n.type === "ClassExpression") && n.id) declare(n.id, n.type.startsWith("Class") ? "class" : "function");
    if (n.type === "FunctionDeclaration" || n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression") for (const p of n.params) for (const id of patternNames(p)) declare(id, "param");
    if (n.type === "CatchClause" && n.param) for (const id of patternNames(n.param)) declare(id, "param");
    if (n.type === "ImportSpecifier" || n.type === "ImportDefaultSpecifier" || n.type === "ImportNamespaceSpecifier") declare(n.local, "import");
  });
  const used = new Map();
  const reported = new Set();
  walk(ast, null, (n, parent) => {
    if (n.type === "Identifier" && !declNodes.has(n) && isRefPosition(n, parent)) {
      used.set(n.name, (used.get(n.name) || 0) + 1);
      const isTypeof = parent && parent.type === "UnaryExpression" && parent.operator === "typeof";
      if (!declared.has(n.name) && !GLOBALS.has(n.name) && !isTypeof && !reported.has(n.name)) {
        reported.add(n.name);
        const assigned = parent && parent.type === "AssignmentExpression" && parent.left === n;
        const guess = closest(n.name, [...declared.keys(), ...GLOBALS]);
        if (assigned && !guess) add(n, "warning", `متغیر «${n.name}» کو let یا const سے متعین کیے بغیر قدر دی گئی ہے، اس لیے وہ عام متغیر بن جاتا ہے (اور strict mode میں غلطی ہے)۔`, `پہلے اسے متعین کریں: let ${n.name} = ...`);
        else add(n, guess ? "error" : "warning", `نام «${n.name}» کوڈ میں متعین نہیں${guess ? `، شاید مراد «${guess}» ہو` : ""}، اور عمل درآمد پر ReferenceError دے گا: ${n.name} is not defined۔`, guess ? `نام درست کرکے «${guess}» کریں۔` : `«${n.name}» کو استعمال سے پہلے let یا const یا function سے متعین کریں، یا یقینی بنائیں کہ یہ کوئی موجود عام متغیر ہے۔`);
      }
    }
    if (n.type === "MemberExpression" && !n.computed && n.property.type === "Identifier" && n.property.name.length >= 4 && !MEMBERS.has(n.property.name)) {
      const p = n.property.name;
      const sorted = (w) => [...w.toLowerCase()].sort().join("");
      const guess = [...MEMBERS].find((m) => m.toLowerCase() === p.toLowerCase()) || [...MEMBERS].find((m) => m.length === p.length && sorted(m) === sorted(p) && distance(p, m) === 1) || (p.length >= 7 ? [...MEMBERS].find((m) => distance(p, m) === 1) : null);
      if (guess) add(n.property, "warning", `خصوصیت «${p}» «${guess}» پر املا کی غلطی لگتی ہے، اور نتیجہ غالباً undefined یا TypeError: ${p} is not a function ہوگا۔`, `لکھیں .${guess}`);
    }
    if ((n.type === "AssignmentExpression" && n.left.type === "Identifier") || (n.type === "UpdateExpression" && n.argument.type === "Identifier")) {
      const id = n.type === "AssignmentExpression" ? n.left : n.argument;
      const d = declared.get(id.name);
      if (d && d.kinds.size === 1 && d.kinds.has("const")) add(id, "error", `const سے متعین مستقل «${id.name}» کی قدر تبدیل نہیں ہو سکتی (TypeError: Assignment to constant variable)۔`, `اگر قدر بدلنی ہے تو const کی جگہ let استعمال کریں: let ${id.name} = ...`);
    }
    if (n.type === "BinaryExpression" && (n.operator === "==" || n.operator === "!=")) {
      const isNull = (x) => x.type === "Literal" && x.value === null;
      if (!isNull(n.left) && !isNull(n.right)) {
        const opPos = code.indexOf(n.operator, n.left.end);
        const lc = lineCol(code, opPos);
        issues.push({ line: lc.line, col: lc.col, len: 2, severity: "warning", message: `مقابلہ ${n.operator} خودکار طور پر اقسام بدلتا ہے (مثلاً "0" == 0 درست ہے)، اور غیر متوقع نتائج دے سکتا ہے۔`, fix: `سخت مقابلے کے لیے ${n.operator}= استعمال کریں۔` });
      }
    }
    if (n.type === "BinaryExpression" && /^[!=]==?$/.test(n.operator) && [n.left, n.right].some((x) => x.type === "Identifier" && x.name === "NaN")) add(n, "error", "NaN کے ساتھ مقابلہ ہمیشہ false دیتا ہے، کیونکہ NaN کسی بھی قدر کے برابر نہیں، حتیٰ کہ خود اپنے برابر بھی نہیں۔", "اس کی جگہ Number.isNaN(x) استعمال کریں۔");
    if (n.type === "BinaryExpression" && /^[!=]==?$/.test(n.operator)) {
      const t = n.left.type === "UnaryExpression" && n.left.operator === "typeof" ? n.right : n.right.type === "UnaryExpression" && n.right.operator === "typeof" ? n.left : null;
      if (t && t.type === "Literal" && typeof t.value === "string" && !TYPEOF_OK.has(t.value)) add(t, "error", `typeof کبھی "${t.value}" واپس نہیں کرتا؛ ممکنہ قدریں: undefined, object, boolean, number, string, function, symbol, bigint۔`, `لفظ درست کریں${closest(t.value, [...TYPEOF_OK]) ? ` کو "${closest(t.value, [...TYPEOF_OK])}" میں` : ""}۔`);
    }
    if ((n.type === "IfStatement" || n.type === "WhileStatement" || n.type === "DoWhileStatement") && n.test.type === "AssignmentExpression" && n.test.operator === "=") add(n.test, "warning", "شرط کے اندر = تفویض ہے، اور غالباً مقابلہ مراد تھا۔", "مقابلے کے لیے === استعمال کریں: if (x === 5)");
    if ((n.type === "IfStatement" || n.type === "ForStatement" || n.type === "WhileStatement") && (n.consequent || n.body) && (n.consequent || n.body).type === "EmptyStatement") add(n.consequent || n.body, "warning", `${n.type === "IfStatement" ? "if" : "لوپ"} کی شرط کے فوراً بعد سیمی کولن اس کا بدن خالی کر دیتا ہے، اس لیے اس کے بعد والا کوڈ شرط سے متاثر نہیں ہوتا۔`, "وہ ; حذف کریں جو ) کے بعد ہے۔", 1);
    if (n.type === "VariableDeclaration" && n.kind === "var") add(n, "info", "var پرانا ہے اور اس کا دائرہ پورے فنکشن تک ہوتا ہے، جس سے پوشیدہ غلطیاں ہو سکتی ہیں۔", "متغیرات کے لیے let اور مستقل کے لیے const استعمال کریں۔", 3);
    if (n.type === "ObjectExpression") {
      const seen = new Set();
      for (const p of n.properties) {
        if (p.type !== "Property" || p.computed || p.kind !== "init") continue;
        const k = p.key.type === "Identifier" ? p.key.name : String(p.key.value);
        if (seen.has(k)) add(p.key, "warning", `کلید «${k}» آبجیکٹ میں دو بار ہے، اور آخری قدر پہلی کو منسوخ کر دیتی ہے۔`, "دونوں میں سے ایک کلید حذف کریں یا اس کا نام بدلیں۔");
        seen.add(k);
      }
    }
    if (n.type === "BlockStatement" || n.type === "Program" || n.type === "SwitchCase") {
      const body = n.type === "SwitchCase" ? n.consequent : n.body;
      for (let i = 0; i < body.length - 1; i++) {
        if (ENDS.has(body[i].type)) {
          const next = body.slice(i + 1).find((s) => s.type !== "FunctionDeclaration" && s.type !== "EmptyStatement");
          if (next) add(next, "warning", `یہ کوڈ کبھی عمل میں نہیں آئے گا کیونکہ یہ ${({ ReturnStatement: "return", ThrowStatement: "throw", BreakStatement: "break", ContinueStatement: "continue" })[body[i].type]} کے بعد ہے۔`, "اسے حذف کریں یا اس جملے سے پہلے منتقل کریں۔");
          break;
        }
      }
    }
    if (n.type === "SwitchStatement") {
      n.cases.forEach((c, i) => {
        if (i === n.cases.length - 1 || !c.consequent.length) return;
        const last = c.consequent[c.consequent.length - 1];
        const ends = ENDS.has(last.type) || (last.type === "BlockStatement" && last.body.length && ENDS.has(last.body[last.body.length - 1].type));
        if (!ends) add(c, "warning", "یہ case حالت break پر ختم نہیں ہوتی، اس لیے عمل اگلی حالت تک جاری رہے گا۔", "اگر جاری رکھنا مقصود نہیں تو حالت کے آخر میں break; شامل کریں۔", 4);
      });
    }
    if (n.type === "CatchClause" && !n.body.body.length) add(n, "info", "خالی catch بلاک غلطیاں چھپا دیتا ہے اور ان کی وجہ معلوم نہیں ہوتی۔", "کم از کم غلطی پرنٹ کریں: console.error(err);", 5);
  });
  const exported = new Set();
  walk(ast, null, (n) => {
    if ((n.type === "ExportNamedDeclaration" || n.type === "ExportDefaultDeclaration") && n.declaration) {
      const d = n.declaration;
      if (d.id) exported.add(d.id.name);
      if (d.type === "VariableDeclaration") for (const v of d.declarations) for (const id of patternNames(v.id)) exported.add(id.name);
    }
  });
  for (const [name, d] of declared) {
    if (exported.has(name)) continue;
    if (used.has(name) || d.kind === "param" || name.startsWith("_")) continue;
    if (d.kind === "function" && d.node === ast.body.find((s) => s.type === "FunctionDeclaration" && s.id && s.id.name === name)?.id) {
      issues.push({ line: d.node.loc.start.line, col: d.node.loc.start.column, len: name.length, severity: "info", message: `فنکشن «${name}» متعین ہے لیکن اس کوڈ میں اسے کال نہیں کیا گیا۔`, fix: "اسے کال کریں، یا اگر ضرورت نہ ہو تو حذف کریں۔" });
      continue;
    }
    issues.push({ line: d.node.loc.start.line, col: d.node.loc.start.column, len: name.length, severity: "info", message: `«${name}» متعین ہے لیکن استعمال نہیں ہوا۔`, fix: "اگر ضرورت نہ ہو تو اسے حذف کریں۔" });
  }
  return issues;
}

export function check(code, sourceType = "script") {
  const comments = [];
  try {
    const ast = acorn.parse(code, { ecmaVersion: "latest", sourceType, locations: true, allowHashBang: true, allowReturnOutsideFunction: false, onComment: comments });
    return { ok: true, ast, issues: lint(ast, code) };
  } catch (e) {
    if (!(e instanceof SyntaxError) || e.pos === undefined) throw e;
    return { ok: false, issues: [syntaxIssue(code, e, sourceType)] };
  }
}

export function solve(input) {
  const code = readCode(input, "code");
  const mode = choice(input, "mode", "فائل کی قسم", ["script", "module"], "script");
  const res = check(code, mode);
  const lines = code.split("\n").length;
  const linesWord = lines === 1 ? "ایک سطر" : lines === 2 ? "دو سطریں" : lines <= 10 ? `${lines} سطریں` : `${lines} سطریں`;
  const steps = [`${linesWord} کا تجزیہ JavaScript محلل (Acorn) سے ECMAScript کے تازہ ترین معیار کے مطابق کیا گیا، بطور ${mode === "module" ? "ES Module ماڈیول" : "عام اسکرپٹ"}۔`];
  let extra = {};
  if (!res.ok) {
    const e = res.issues[0];
    steps.push(`محلل سطر ${e.line}، کالم ${e.col + 1} پر پہلی نحوی غلطی پر رک گیا۔ اصل انجن کا پیغام: ${e.english}۔`);
    steps.push(`وضاحت: ${e.message}`);
    steps.push(`اصلاح: ${e.fix}`);
    steps.push("اس غلطی کو درست کرنے کے بعد دوبارہ جانچیں، کیونکہ اس کے بعد چھپی ہوئی دیگر غلطیاں ظاہر ہو سکتی ہیں۔");
  } else {
    let fns = 0;
    walk(res.ast, null, (n) => { if (/Function/.test(n.type)) fns++; });
    extra = { "سطروں کی تعداد": lines, "فنکشنز کی تعداد": fns };
    steps.push("کوئی نحوی غلطی نہیں، اس لیے کوڈ چلایا جا سکتا ہے۔");
    steps.push("پھر ہم نے عام منطقی غلطیاں جانچیں: غیر متعین ناموں اور ان کی املا کی غلطیاں، مستقلات کی تبدیلی، == کا مقابلہ، شرطوں کے اندر تفویض، نہ چلنے والا کوڈ، ڈپلیکیٹ کلیدیں، اور switch کی حالتیں بغیر break کے۔");
    steps.push("نوٹ: جانچ جامد ہے (کوڈ چلائے بغیر)، اس لیے وہ صرف عمل درآمد کے دوران ظاہر ہونے والی غلطیاں نہیں پکڑ سکتی۔");
  }
  const out = report(code, res.issues, extra);
  return { results: out.results, steps, blocks: out.blocks, copy: out.copy };
}
