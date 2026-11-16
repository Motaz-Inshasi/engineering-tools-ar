import * as acorn from "../../vendor/acorn/acorn.mjs";
import { choice } from "../core/validate.js";
import { readCode, report, lineCol, closest, distance } from "./code-view.js";

export const meta = {
  description: "کد JavaScript را بچسبانید تا خطاهای نحوی همراه با توضیح فارسی و روش اصلاح آن پیدا شوند، و هشدارهایی برای خطاهای رایج مانند متغیرهای تعریف‌نشده، غلط‌های املایی و == به جای === داده شود.",
  keywords: ["javascript", "js", "بررسی کد", "رفع خطا", "syntax error", "linter", "جاوااسکریپت", "خطای برنامه‌نویسی"],
  formulas: [{ label: "کد به درخت نحوی (AST) تبدیل می‌شود، سپس قواعد خطاهای رایج بررسی می‌شوند", tex: "\\text{code} \\xrightarrow{\\text{parser}} \\text{AST} \\xrightarrow{\\text{rules}} \\text{issues}" }],
  inputs: [
    { id: "code", label: "کد JavaScript", type: "textarea", rows: 12, wide: true, placeholder: "function sum(a, b) {\n  return a + b;\n}" },
    { id: "mode", label: "نوع فایل", type: "select", default: "script", options: [["script", "اسکریپت معمولی"], ["module", "ماژول ES Module (با import/export)"]] }
  ],
  example: {
    values: { code: "function average(list) {\n  let total = 0;\n  for (let i = 0; i < list.length; i++) {\n    total += list[i];\n  }\n  if (list.length == 0) return 0;\n  return totl / list.length;\n}\nconsole.log(average([4, 8, 6]));", mode: "script" },
    expect: ["totl", "total"],
    note: "مثال: تابعی برای محاسبه میانگین که در نام یک متغیر غلط املایی دارد و به جای === از == استفاده کرده است."
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
    if (stack.length === 1) return { message: `کد تمام شد و قوس «${top.label}» که در سطر ${top.line} باز شده، بسته نشده است.`, fix: `«${OPENERS[top.label]}» را در جای مناسب برای بستن آن اضافه کنید.`, at: top };
    if (stack.length > 1) {
      const inner = stack.find((t, i) => (t.label === "(" || t.label === "[") && stack[i + 1] && stack[i + 1].label === "{" && stack[i + 1].line === t.line);
      const list = stack.map((t) => `«${t.label}» در سطر ${t.line}`).join("، ");
      if (inner) return { message: `قوس «${inner.label}» که در سطر ${inner.line} باز شده، قبل از «{» بسته نشده است، و قوس‌های بسته‌نشده: ${list}.`, fix: `«${OPENERS[inner.label]}» را قبل از «{» در سطر ${inner.line} اضافه کنید، سپس بقیه قوس‌ها را ببندید.`, at: inner };
      return { message: `کد تمام شد و این قوس‌ها بسته نشده‌اند: ${list}.`, fix: `آن‌ها را به ترتیب معکوس ببندید: ${stack.map((t) => OPENERS[t.label]).reverse().join(" ")}`, at: stack[0] };
    }
    return { message: "کد قبل از کامل شدن آخرین دستور تمام شد.", fix: "آخرین دستور را کامل کنید، برای مثال بعد از = مقداری بنویسید یا عبارت را کامل کنید." };
  }
  if (prev && prev.value === "await" && prev.label === "name") return { message: "کلمه await فقط داخل تابع async (یا در ES Module) استفاده می‌شود.", fix: "قبل از تابع async بنویسید: async function f() { await ... }، یا نوع فایل «ماژول ES Module» را انتخاب کنید." };
  if (prev && prev2 && prev2.keyword === "const" && prev.label === "name" && cur && (cur.label === ";" || cur.label === ",")) return { message: `ثابت «${prev.value}» که با const تعریف شده باید هنگام تعریف مقدار داشته باشد.`, fix: `بنویسید const ${prev.value} = مقدار; یا اگر مقدار بعداً داده می‌شود از let استفاده کنید.` };
  if (prev && prev.keyword === "class" && cur && cur.label === "{") return { message: "تعریف کلاس class به نامی بعد از کلمه class نیاز دارد.", fix: "بنویسید class MyClass { ... }." };
  if (cur && cur.label === "{" && top && top.label === "(") return { message: `قوس «(» که در سطر ${top.line} باز شده، قبل از «{» بسته نشده است.`, fix: "قبل از آکولاد {، قوس «)» اضافه کنید، مانند: if (x > 1) {" , at: top };
  if (cur && CLOSERS.has(cur.label)) {
    if (top && OPENERS[top.label] !== cur.label) return { message: `قوس «${cur.label}» با قوس «${top.label}» که در سطر ${top.line} باز شده مطابقت ندارد.`, fix: `ابتدا «${top.label}» را با «${OPENERS[top.label]}» ببندید، یا قوس اضافی را حذف کنید.` };
    if (!top) return { message: `قوس بسته‌شونده «${cur.label}» اضافی است و قوس بازکننده‌ای ندارد.`, fix: "این قوس را حذف کنید، یا قوس بازکننده کم‌شده را قبل از آن اضافه کنید." };
    if (prev && !VALUE_END.has(prev.label) && prev.label !== "," && prev.label !== "(" && prev.label !== "[" && prev.label !== "{") return { message: `عملگر «${shown(prev)}» قبل از «${cur.label}» به مقداری بعد از خودش نیاز دارد.`, fix: "عبارت را با مقداری بعد از عملگر کامل کنید، یا عملگر اضافی را حذف کنید." };
  }
  if (cur && (cur.label === ";" || cur.label === ",") && prev && !VALUE_END.has(prev.label) && prev.label !== ";" && !prev.keyword) return { message: `عملگر «${shown(prev)}» به مقداری بعد از خودش نیاز دارد.`, fix: "عبارت را با مقداری بعد از عملگر کامل کنید، مانند: let y = 5 + 3;" };
  if (prev && cur && VALUE_END.has(prev.label) && (VALUE_START.has(cur.label) || (cur.keyword && VALUE_START.has(cur.keyword)))) {
    if (top && (top.label === "(" || top.label === "[")) return { message: `کاما «,» بین «${shown(prev)}» و «${shown(cur)}» جا افتاده است.`, fix: `عناصر را با کاما از هم جدا کنید: ${shown(prev)}, ${shown(cur)}` };
    if (top && top.label === "{" && code.slice(top.end).match(/^\s*[\w"'$]+\s*:/)) return { message: `کاما «,» بین خصایص شیء قبل از «${shown(cur)}» جا افتاده است.`, fix: "خصایص شیء را با کاما از هم جدا کنید: { a: 1, b: 2 }" };
    return { message: `«${shown(cur)}» مستقیماً بعد از «${shown(prev)}» آمده، بدون عملگر یا کاما بین آن‌ها.`, fix: "وجود یک عملگر (+ یا = یا .) یا نقطه‌ویرگول یا قوس جاافتاده را بین دو بخش بررسی کنید." };
  }
  if (cur && cur.label === "=>" ) return { message: "فلش => در جای نادرستی است.", fix: "قالب تابع فلشی را بررسی کنید: (a, b) => a + b" };
  const tok = cur ? shown(cur) : code[pos];
  return { message: `نشانه «${tok}» در این موقعیت غیرمنتظره است.`, fix: "همین سطر و سطر قبلی را بررسی کنید: ممکن است قوس یا کاما یا عملگری کم باشد." };
}

const RULES = [
  [/^Unterminated string constant/, () => ({ message: "رشته (string) با علامت تنصیص بسته نشده است.", fix: "رشته را با همان نشانه‌ای که با آن شروع شده، یعنی \" یا '، در همان سطر ببندید، و برای متن‌های چندسطری از ` استفاده کنید." })],
  [/^Unterminated template/, () => ({ message: "متن قالب (template) که با ` شروع شده، بسته نشده است.", fix: "در انتهای متن ` اضافه کنید." })],
  [/^Unterminated comment/, () => ({ message: "توضیح چندسطری /* با */ بسته نشده است.", fix: "در انتهای توضیح */ اضافه کنید." })],
  [/^Unterminated regular expression/, () => ({ message: "عبارت باقاعده (regex) که با / شروع شده، بسته نشده است.", fix: "عبارت را در همان سطر با / ببندید، یا مطمئن شوید که / اینجا تقسیم ناقص نیست." })],
  [/^Identifier '(.+)' has already been declared/, (m) => ({ message: `متغیر «${m[1]}» در همان محدوده قبلاً تعریف شده و نمی‌توان دوباره آن را با let یا const تعریف کرد.`, fix: `از تعریف دوم let/const را حذف کنید تا مقدار تغییر کند: ${m[1]} = ...، یا نام دیگری انتخاب کنید.` })],
  [/^'return' outside of function/, () => ({ message: "دستور return خارج از هر تابعی نوشته شده است.", fix: "return را داخل بدنه یک تابع قرار دهید، یا آن را حذف کنید." })],
  [/^'import' and 'export' may appear only/, () => ({ message: "import و export در اسکریپت معمولی کار نمی‌کنند.", fix: "نوع فایل «ماژول ES Module» را انتخاب کنید، و در HTML از <script type=\"module\"> استفاده کنید." })],
  [/^Assigning to rvalue|^Invalid left-hand side/, () => ({ message: "طرف چپ انتساب = متغیری نیست که بتوان مقدارش را تغییر داد.", fix: "اگر مقایسه مدنظر است از === به جای = استفاده کنید، وگرنه یک نام متغیر را در سمت چپ = قرار دهید." })],
  [/^Invalid regular expression flag/, () => ({ message: "پرچم (flag) بعد از عبارت باقاعده نامعتبر است.", fix: "پرچم‌های مجاز: g i m s u y d v." })],
  [/^Invalid regular expression: (.*)/, (m) => ({ message: `عبارت باقاعده نامعتبر است: ${m[1]}`, fix: "پرانتزها و نمادهای ویژه عبارت را بررسی کنید، و از ابزار آزمون Regex استفاده کنید." })],
  [/^Unexpected character '(.*)'/, (m) => ({ message: `نویسه «${m[1]}» در اینجا در کد JavaScript مجاز نیست.`, fix: /[“”‘’]/.test(m[1]) ? "این یک گیومه «هوشمند» از یک نرم‌افزار متنی است؛ آن را با \" یا ' معمولی جایگزین کنید." : /[،؛]/.test(m[1]) ? "این ویرگول فارسی است؛ از کاما انگلیسی , یا ; استفاده کنید." : "این نویسه را حذف کنید، یا آن را داخل متنی بین دو گیومه قرار دهید." })],
  [/^Unexpected keyword '(.*)'/, (m) => ({ message: `کلمه کلیدی رزروشده «${m[1]}» در جای نامناسبی آمده است.`, fix: `«${m[1]}» را به عنوان نام متغیر یا تابع استفاده نکنید، و نحو قبل از آن را بررسی کنید.` })],
  [/^Cannot use keyword 'await' outside an async function|'await' is only valid/, () => ({ message: "کلمه await فقط داخل تابع async استفاده می‌شود.", fix: "قبل از تابع بنویسید: async function f() { ... }." })],
  [/^Unsyntactic (break|continue)/, (m) => ({ message: `دستور ${m[1]} خارج از حلقه تکرار نوشته شده است${m[1] === "break" ? " یا switch" : ""}.`, fix: `${m[1]} را داخل for یا while${m[1] === "break" ? " یا switch" : ""} قرار دهید، یا برای خروج از تابع از return استفاده کنید.` })],
  [/^Identifier directly after number/, () => ({ message: "بلافاصله بعد از عدد یک نام آمده است، مانند 3px یا 2x.", fix: "مقدار را بین دو گیومه \"3px\" بگذارید، یا عملیات ضرب را صریحاً به صورت 2 * x بنویسید." })],
  [/^let is disallowed as a lexically bound name/, () => ({ message: "نمی‌توان نام متغیر را let گذاشت.", fix: "یک نام دیگر برای متغیر انتخاب کنید." })],
  [/^The keyword '(.*)' is reserved/, (m) => ({ message: `«${m[1]}» کلمه رزروشده در JavaScript است و نمی‌تواند نام باشد.`, fix: "یک نام دیگر برای متغیر یا تابع انتخاب کنید." })],
  [/^Argument name clash/, () => ({ message: "در تعریف تابع دو پارامتر با یک نام وجود دارد.", fix: "نام پارامترهای تابع را متفاوت کنید." })],
  [/^Complex binding patterns require an initialization value|^Missing initializer/, () => ({ message: "تفکیک (destructuring) در تعریف به مقدار نیاز دارد.", fix: "مثلاً بنویسید: const { a, b } = obj;" })],
  [/^Octal literal in strict mode|^Invalid number/, () => ({ message: "قالب عدد نامعتبر است.", fix: "اعداد را با صفر اضافی شروع نکنید، و از 0o برای مبنای هشت و از 0x برای مبنای شانزده‌دهی استفاده کنید." })],
  [/^Bad escape sequence|^Invalid escape sequence|^Bad character escape/, () => ({ message: "توالی فرار (escape) بعد از \\ داخل متن نامعتبر است.", fix: "برای نوشتن خط مورب معکوس از \\\\ استفاده کنید، یا از توالی صحیحی مانند \\n و \\t." })],
  [/^Label '(.*)' is already declared/, (m) => ({ message: `برچسب «${m[1]}» دو بار تعریف شده است.`, fix: "نام یکی از برچسب‌ها را تغییر دهید." })],
  [/^Duplicate constructor/, () => ({ message: "کلاس بیش از یک constructor دارد.", fix: "در کلاس فقط یک تابع constructor قرار دهید." })],
  [/^Shorthand property assignments are valid only in destructuring/, () => ({ message: "داخل شیء به جای دونقطه : از = استفاده کرده‌اید.", fix: "خصایص را به صورت { key: value } بنویسید." })],
  [/^Comma is not permitted after the rest element|^Rest element must be last/, () => ({ message: "پارامتر باقیمانده ... باید آخرین باشد.", fix: "...rest را به آخر فهرست منتقل کنید." })],
  [/^'with' in strict mode|^Deleting local variable in strict mode/, () => ({ message: "این شکل نوشتن در حالت سخت‌گیرانه (strict mode) مجاز نیست.", fix: "از with پرهیز کنید و برای حذف متغیرها از delete استفاده نکنید." })]
];

function syntaxIssue(code, err, sourceType) {
  const raw = String(err.message).replace(/\s*\(\d+:\d+\)\s*$/, "");
  const pos = Number.isInteger(err.pos) ? err.pos : 0;
  const { line, col } = err.loc ? { line: err.loc.line, col: err.loc.column } : lineCol(code, pos);
  let info = null;
  if (/^Unexpected token/.test(raw)) info = explainUnexpected(code, pos, sourceType);
  else for (const [re, fn] of RULES) { const m = raw.match(re); if (m) { info = fn(m); break; } }
  if (!info) info = { message: `خطای نحوی: ${raw}`, fix: "همین سطر و سطر قبلی را بررسی کنید." };
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
        if (assigned && !guess) add(n, "warning", `به متغیر «${n.name}» بدون تعریف با let یا const مقدار داده شده، پس متغیر سراسری می‌شود (و در حالت سخت‌گیرانه خطا است).`, `ابتدا آن را تعریف کنید: let ${n.name} = ...`);
        else add(n, guess ? "error" : "warning", `نام «${n.name}» در کد تعریف نشده${guess ? `، شاید منظورتان «${guess}» باشد` : ""}، و هنگام اجرا ReferenceError: ${n.name} is not defined ایجاد می‌کند.`, guess ? `نام را به «${guess}» اصلاح کنید.` : `قبل از استفاده «${n.name}» را با let یا const یا function تعریف کنید، یا مطمئن شوید که یک متغیر سراسری موجود است.`);
      }
    }
    if (n.type === "MemberExpression" && !n.computed && n.property.type === "Identifier" && n.property.name.length >= 4 && !MEMBERS.has(n.property.name)) {
      const p = n.property.name;
      const sorted = (w) => [...w.toLowerCase()].sort().join("");
      const guess = [...MEMBERS].find((m) => m.toLowerCase() === p.toLowerCase()) || [...MEMBERS].find((m) => m.length === p.length && sorted(m) === sorted(p) && distance(p, m) === 1) || (p.length >= 7 ? [...MEMBERS].find((m) => distance(p, m) === 1) : null);
      if (guess) add(n.property, "warning", `ویژگی «${p}» احتمالاً در «${guess}» غلط املایی دارد، و نتیجه معمولاً undefined یا TypeError: ${p} is not a function است.`, `بنویسید .${guess}`);
    }
    if ((n.type === "AssignmentExpression" && n.left.type === "Identifier") || (n.type === "UpdateExpression" && n.argument.type === "Identifier")) {
      const id = n.type === "AssignmentExpression" ? n.left : n.argument;
      const d = declared.get(id.name);
      if (d && d.kinds.size === 1 && d.kinds.has("const")) add(id, "error", `نمی‌توان مقدار ثابت «${id.name}» را که با const تعریف شده تغییر داد (TypeError: Assignment to constant variable).`, `اگر مقدارش تغییر می‌کند با let تعریفش کنید: let ${id.name} = ...`);
    }
    if (n.type === "BinaryExpression" && (n.operator === "==" || n.operator === "!=")) {
      const isNull = (x) => x.type === "Literal" && x.value === null;
      if (!isNull(n.left) && !isNull(n.right)) {
        const opPos = code.indexOf(n.operator, n.left.end);
        const lc = lineCol(code, opPos);
        issues.push({ line: lc.line, col: lc.col, len: 2, severity: "warning", message: `مقایسه ${n.operator} به صورت خودکار نوع‌ها را تبدیل می‌کند (مثلاً "0" == 0 درست است)، و ممکن است نتایج غیرمنتظره بدهد.`, fix: `برای مقایسه سخت‌گیرانه از ${n.operator}= استفاده کنید.` });
      }
    }
    if (n.type === "BinaryExpression" && /^[!=]==?$/.test(n.operator) && [n.left, n.right].some((x) => x.type === "Identifier" && x.name === "NaN")) add(n, "error", "مقایسه با NaN همیشه false می‌دهد، زیرا NaN با هیچ مقداری حتی با خودش برابر نیست.", "به جای آن از Number.isNaN(x) استفاده کنید.");
    if (n.type === "BinaryExpression" && /^[!=]==?$/.test(n.operator)) {
      const t = n.left.type === "UnaryExpression" && n.left.operator === "typeof" ? n.right : n.right.type === "UnaryExpression" && n.right.operator === "typeof" ? n.left : null;
      if (t && t.type === "Literal" && typeof t.value === "string" && !TYPEOF_OK.has(t.value)) add(t, "error", `typeof هرگز "${t.value}" برنمی‌گرداند؛ مقادیر ممکن: undefined, object, boolean, number, string, function, symbol, bigint.`, `کلمه را اصلاح کنید${closest(t.value, [...TYPEOF_OK]) ? ` به "${closest(t.value, [...TYPEOF_OK])}"` : ""}.`);
    }
    if ((n.type === "IfStatement" || n.type === "WhileStatement" || n.type === "DoWhileStatement") && n.test.type === "AssignmentExpression" && n.test.operator === "=") add(n.test, "warning", "یک انتساب = داخل شرط وجود دارد، و احتمالاً مقصود مقایسه بوده است.", "برای مقایسه از === استفاده کنید: if (x === 5)");
    if ((n.type === "IfStatement" || n.type === "ForStatement" || n.type === "WhileStatement") && (n.consequent || n.body) && (n.consequent || n.body).type === "EmptyStatement") add(n.consequent || n.body, "warning", `نقطه‌ویرگول بلافاصله بعد از شرط ${n.type === "IfStatement" ? "if" : "حلقه"} باعث می‌شود بدنه آن خالی باشد، پس کدی که بعدش می‌آید تحت تأثیر شرط نیست.`, "نقطه‌ویرگول ; بعد از قوس ) را حذف کنید.", 1);
    if (n.type === "VariableDeclaration" && n.kind === "var") add(n, "info", "var قدیمی است و محدوده آن کل تابع است، که ممکن است خطاهای پنهان ایجاد کند.", "از let برای متغیرها و از const برای ثابت‌ها استفاده کنید.", 3);
    if (n.type === "ObjectExpression") {
      const seen = new Set();
      for (const p of n.properties) {
        if (p.type !== "Property" || p.computed || p.kind !== "init") continue;
        const k = p.key.type === "Identifier" ? p.key.name : String(p.key.value);
        if (seen.has(k)) add(p.key, "warning", `کلید «${k}» در شیء تکراری است، و مقدار آخر، مقدار اول را لغو می‌کند.`, "یکی از کلیدها را حذف کنید یا نامش را تغییر دهید.");
        seen.add(k);
      }
    }
    if (n.type === "BlockStatement" || n.type === "Program" || n.type === "SwitchCase") {
      const body = n.type === "SwitchCase" ? n.consequent : n.body;
      for (let i = 0; i < body.length - 1; i++) {
        if (ENDS.has(body[i].type)) {
          const next = body.slice(i + 1).find((s) => s.type !== "FunctionDeclaration" && s.type !== "EmptyStatement");
          if (next) add(next, "warning", `این کد هرگز اجرا نمی‌شود، زیرا بعد از ${({ ReturnStatement: "return", ThrowStatement: "throw", BreakStatement: "break", ContinueStatement: "continue" })[body[i].type]} آمده است.`, "آن را حذف کنید یا قبل از آن دستور منتقلش کنید.");
          break;
        }
      }
    }
    if (n.type === "SwitchStatement") {
      n.cases.forEach((c, i) => {
        if (i === n.cases.length - 1 || !c.consequent.length) return;
        const last = c.consequent[c.consequent.length - 1];
        const ends = ENDS.has(last.type) || (last.type === "BlockStatement" && last.body.length && ENDS.has(last.body[last.body.length - 1].type));
        if (!ends) add(c, "warning", "این حالت case با break تمام نشده، پس اجرا تا حالت بعدی ادامه پیدا می‌کند.", "اگر ادامه دادن عمدی نیست، در انتهای حالت break; اضافه کنید.", 4);
      });
    }
    if (n.type === "CatchClause" && !n.body.body.length) add(n, "info", "بلوک catch خالی خطاها را پنهان می‌کند و معلوم نمی‌شود علتشان چیست.", "حداقل خطا را چاپ کنید: console.error(err);", 5);
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
      issues.push({ line: d.node.loc.start.line, col: d.node.loc.start.column, len: name.length, severity: "info", message: `تابع «${name}» تعریف شده، اما در این کد فراخوانی نشده است.`, fix: "آن را فراخوانی کنید، یا اگر لازم نیست حذفش کنید." });
      continue;
    }
    issues.push({ line: d.node.loc.start.line, col: d.node.loc.start.column, len: name.length, severity: "info", message: `«${name}» تعریف شده، اما استفاده نشده است.`, fix: "اگر به آن نیاز ندارید حذفش کنید." });
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
  const mode = choice(input, "mode", "نوع فایل", ["script", "module"], "script");
  const res = check(code, mode);
  const lines = code.split("\n").length;
  const linesWord = lines === 1 ? "یک سطر" : lines === 2 ? "دو سطر" : lines <= 10 ? `${lines} سطر` : `${lines} سطر`;
  const steps = [`${linesWord} را با تحلیلگر JavaScript (Acorn) مطابق آخرین استاندارد ECMAScript تحلیل کردیم، به عنوان ${mode === "module" ? "ماژول ES Module" : "اسکریپت معمولی"}.`];
  let extra = {};
  if (!res.ok) {
    const e = res.issues[0];
    steps.push(`تحلیلگر در اولین خطای نحوی در سطر ${e.line}، ستون ${e.col + 1} متوقف شد. پیام اصلی موتور: ${e.english}.`);
    steps.push(`توضیح: ${e.message}`);
    steps.push(`اصلاح: ${e.fix}`);
    steps.push("بعد از اصلاح این خطا دوباره بررسی کنید، زیرا ممکن است خطاهای دیگری که پشت آن پنهان بودند ظاهر شوند.");
  } else {
    let fns = 0;
    walk(res.ast, null, (n) => { if (/Function/.test(n.type)) fns++; });
    extra = { "تعداد سطرها": lines, "تعداد توابع": fns };
    steps.push("هیچ خطای نحوی‌ای پیدا نشد، و کد قابل اجراست.");
    steps.push("سپس خطاهای منطقی رایج را بررسی کردیم: نام‌های تعریف‌نشده و غلط‌های املایی در آن‌ها، تغییر ثابت‌ها، مقایسه ==، انتساب داخل شرط‌ها، کد اجرانشدنی، کلیدهای تکراری و حالت‌های switch بدون break.");
    steps.push("توجه: بررسی ایستاست (بدون اجرای کد)، پس ممکن است خطاهایی را که فقط هنگام اجرا ظاهر می‌شوند پیدا نکند.");
  }
  const out = report(code, res.issues, extra);
  return { results: out.results, steps, blocks: out.blocks, copy: out.copy };
}
