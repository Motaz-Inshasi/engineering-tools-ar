import * as acorn from "../../vendor/acorn/acorn.mjs";
import { choice } from "../core/validate.js";
import { readCode, report, lineCol, closest, distance } from "./code-view.js";

export const meta = {
  description: "الصق كود JavaScript لاكتشاف أخطاء الصياغة مع شرحها بالعربية وطريقة إصلاحها، وتنبيهات للأخطاء الشائعة مثل المتغيرات غير المعرّفة والأخطاء الإملائية و == بدل ===.",
  keywords: ["javascript", "js", "فحص الكود", "تصحيح الأخطاء", "syntax error", "linter", "جافاسكربت", "خطأ برمجي"],
  formulas: [{ label: "يُحلَّل الكود إلى شجرة صياغة (AST)، ثم تُفحص قواعد الأخطاء الشائعة", tex: "\\text{code} \\xrightarrow{\\text{parser}} \\text{AST} \\xrightarrow{\\text{rules}} \\text{issues}" }],
  inputs: [
    { id: "code", label: "كود JavaScript", type: "textarea", rows: 12, wide: true, placeholder: "function sum(a, b) {\n  return a + b;\n}" },
    { id: "mode", label: "نوع الملف", type: "select", default: "script", options: [["script", "سكربت عادي"], ["module", "وحدة ES Module (تستخدم import/export)"]] }
  ],
  example: {
    values: { code: "function average(list) {\n  let total = 0;\n  for (let i = 0; i < list.length; i++) {\n    total += list[i];\n  }\n  if (list.length == 0) return 0;\n  return totl / list.length;\n}\nconsole.log(average([4, 8, 6]));", mode: "script" },
    expect: ["totl", "total"],
    note: "مثال: دالة لحساب المتوسط فيها خطأ إملائي في اسم متغير، واستخدام == بدل ===."
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
    if (stack.length === 1) return { message: `انتهى الكود والقوس «${top.label}» المفتوح في السطر ${top.line} لم يُغلق.`, fix: `أضف «${OPENERS[top.label]}» في المكان المناسب لإغلاقه.`, at: top };
    if (stack.length > 1) {
      const inner = stack.find((t, i) => (t.label === "(" || t.label === "[") && stack[i + 1] && stack[i + 1].label === "{" && stack[i + 1].line === t.line);
      const list = stack.map((t) => `«${t.label}» في السطر ${t.line}`).join("، ");
      if (inner) return { message: `القوس «${inner.label}» المفتوح في السطر ${inner.line} لم يُغلق قبل «{»، والأقواس غير المغلقة: ${list}.`, fix: `أضف «${OPENERS[inner.label]}» قبل «{» في السطر ${inner.line}، ثم أغلق بقية الأقواس.`, at: inner };
      return { message: `انتهى الكود وهذه الأقواس لم تُغلق: ${list}.`, fix: `أغلقها بالترتيب العكسي: ${stack.map((t) => OPENERS[t.label]).reverse().join(" ")}`, at: stack[0] };
    }
    return { message: "انتهى الكود قبل اكتمال التعليمة الأخيرة.", fix: "أكمل التعليمة الأخيرة، مثلاً أعطِ قيمة بعد = أو أكمل التعبير." };
  }
  if (prev && prev.value === "await" && prev.label === "name") return { message: "الكلمة await لا تُستخدم إلا داخل دالة async (أو في ES Module).", fix: "أضف async قبل الدالة: async function f() { await ... }، أو اختر نوع الملف «وحدة ES Module»." };
  if (prev && prev2 && prev2.keyword === "const" && prev.label === "name" && cur && (cur.label === ";" || cur.label === ",")) return { message: `الثابت «${prev.value}» المعرّف بـ const يجب أن يُعطى قيمة عند تعريفه.`, fix: `اكتب const ${prev.value} = قيمة; أو استخدم let إذا كانت القيمة ستُعطى لاحقاً.` };
  if (prev && prev.keyword === "class" && cur && cur.label === "{") return { message: "تعريف الصنف class يحتاج اسماً بعد الكلمة class.", fix: "اكتب class MyClass { ... }." };
  if (cur && cur.label === "{" && top && top.label === "(") return { message: `القوس «(» المفتوح في السطر ${top.line} لم يُغلق قبل «{».`, fix: "أضف «)» قبل القوس المعقوف {، مثل: if (x > 1) {" , at: top };
  if (cur && CLOSERS.has(cur.label)) {
    if (top && OPENERS[top.label] !== cur.label) return { message: `القوس «${cur.label}» لا يطابق القوس «${top.label}» المفتوح في السطر ${top.line}.`, fix: `أغلق «${top.label}» بـ «${OPENERS[top.label]}» أولاً، أو احذف القوس الزائد.` };
    if (!top) return { message: `قوس الإغلاق «${cur.label}» زائد ولا يقابله قوس فتح.`, fix: "احذف هذا القوس أو أضف قوس الفتح الناقص قبله." };
    if (prev && !VALUE_END.has(prev.label) && prev.label !== "," && prev.label !== "(" && prev.label !== "[" && prev.label !== "{") return { message: `العامل «${shown(prev)}» يحتاج قيمة بعده قبل «${cur.label}».`, fix: "أكمل التعبير بقيمة بعد العامل أو احذف العامل الزائد." };
  }
  if (cur && (cur.label === ";" || cur.label === ",") && prev && !VALUE_END.has(prev.label) && prev.label !== ";" && !prev.keyword) return { message: `العامل «${shown(prev)}» يحتاج قيمة بعده.`, fix: "أكمل التعبير بقيمة بعد العامل، مثل: let y = 5 + 3;" };
  if (prev && cur && VALUE_END.has(prev.label) && (VALUE_START.has(cur.label) || (cur.keyword && VALUE_START.has(cur.keyword)))) {
    if (top && (top.label === "(" || top.label === "[")) return { message: `ينقص فاصلة «,» بين «${shown(prev)}» و«${shown(cur)}».`, fix: `افصل بين العناصر بفاصلة: ${shown(prev)}, ${shown(cur)}` };
    if (top && top.label === "{" && code.slice(top.end).match(/^\s*[\w"'$]+\s*:/)) return { message: `ينقص فاصلة «,» بين خصائص الكائن قبل «${shown(cur)}».`, fix: "افصل بين خصائص الكائن بفاصلة: { a: 1, b: 2 }" };
    return { message: `جاء «${shown(cur)}» مباشرة بعد «${shown(prev)}» دون عامل أو فاصلة بينهما.`, fix: "تحقق من وجود عامل (+ أو = أو .) أو فاصلة منقوطة أو قوس ناقص بين الجزأين." };
  }
  if (cur && cur.label === "=>" ) return { message: "السهم => في مكان غير صحيح.", fix: "تأكد من صيغة الدالة السهمية: (a, b) => a + b" };
  const tok = cur ? shown(cur) : code[pos];
  return { message: `الرمز «${tok}» غير متوقع في هذا الموضع.`, fix: "راجع السطر نفسه والسطر الذي قبله: قد ينقص قوس أو فاصلة أو عامل." };
}

const RULES = [
  [/^Unterminated string constant/, () => ({ message: "نص (string) لم يُغلق بعلامة التنصيص.", fix: "أغلق النص بنفس العلامة التي بدأ بها \" أو ' على السطر نفسه، واستخدم ` للنصوص متعددة الأسطر." })],
  [/^Unterminated template/, () => ({ message: "نص القالب الذي يبدأ بـ ` لم يُغلق.", fix: "أضف ` في نهاية النص." })],
  [/^Unterminated comment/, () => ({ message: "تعليق متعدد الأسطر /* لم يُغلق بـ */.", fix: "أضف */ في نهاية التعليق." })],
  [/^Unterminated regular expression/, () => ({ message: "تعبير نمطي (regex) يبدأ بـ / لم يُغلق.", fix: "أغلق التعبير بـ / على نفس السطر، أو تأكد أن / هنا ليست قسمة ناقصة الطرف." })],
  [/^Identifier '(.+)' has already been declared/, (m) => ({ message: `المتغير «${m[1]}» معرّف مسبقاً في النطاق نفسه، ولا يجوز تعريفه مرة أخرى بـ let أو const.`, fix: `احذف let/const من التعريف الثاني لتعديل القيمة: ${m[1]} = ...، أو اختر اسماً آخر.` })],
  [/^'return' outside of function/, () => ({ message: "التعليمة return مكتوبة خارج أي دالة.", fix: "ضع return داخل جسم دالة، أو احذفها." })],
  [/^'import' and 'export' may appear only/, () => ({ message: "import و export لا تعمل في السكربت العادي.", fix: "اختر نوع الملف «وحدة ES Module»، وفي HTML استخدم <script type=\"module\">." })],
  [/^Assigning to rvalue|^Invalid left-hand side/, () => ({ message: "الطرف الأيسر من عملية الإسناد = ليس متغيراً يمكن تغيير قيمته.", fix: "إذا كنت تقصد المقارنة فاستخدم === بدل =، وإلا ضع اسم متغير على يسار =." })],
  [/^Invalid regular expression flag/, () => ({ message: "علَم (flag) غير صالح بعد التعبير النمطي.", fix: "الأعلام المسموحة: g i m s u y d v." })],
  [/^Invalid regular expression: (.*)/, (m) => ({ message: `التعبير النمطي غير صالح: ${m[1]}`, fix: "راجع الأقواس والرموز الخاصة في التعبير، واستخدم أداة اختبار Regex." })],
  [/^Unexpected character '(.*)'/, (m) => ({ message: `الحرف «${m[1]}» غير مسموح في كود JavaScript هنا.`, fix: /[“”‘’]/.test(m[1]) ? "هذه علامة تنصيص «ذكية» من برنامج نصوص؛ استبدلها بـ \" أو ' العادية." : /[،؛]/.test(m[1]) ? "هذه فاصلة عربية؛ استخدم الفاصلة الإنجليزية , أو ; ." : "احذف هذا الحرف أو ضعه داخل نص بين علامتي تنصيص." })],
  [/^Unexpected keyword '(.*)'/, (m) => ({ message: `الكلمة المحجوزة «${m[1]}» جاءت في مكان غير مناسب.`, fix: `لا تستخدم «${m[1]}» اسماً لمتغير أو دالة، وتحقق من الصياغة قبلها.` })],
  [/^Cannot use keyword 'await' outside an async function|'await' is only valid/, () => ({ message: "الكلمة await لا تُستخدم إلا داخل دالة async.", fix: "أضف async قبل الدالة: async function f() { ... }." })],
  [/^Unsyntactic (break|continue)/, (m) => ({ message: `التعليمة ${m[1]} مكتوبة خارج حلقة تكرار${m[1] === "break" ? " أو switch" : ""}.`, fix: `ضع ${m[1]} داخل for أو while${m[1] === "break" ? " أو switch" : ""}، أو استخدم return للخروج من دالة.` })],
  [/^Identifier directly after number/, () => ({ message: "جاء اسم مباشرة بعد رقم، مثل 3px أو 2x.", fix: "ضع القيمة بين علامتي تنصيص \"3px\"، أو اكتب عملية الضرب صراحة 2 * x." })],
  [/^let is disallowed as a lexically bound name/, () => ({ message: "لا يجوز تسمية متغير باسم let.", fix: "اختر اسماً آخر للمتغير." })],
  [/^The keyword '(.*)' is reserved/, (m) => ({ message: `«${m[1]}» كلمة محجوزة في JavaScript ولا تصلح اسماً.`, fix: "اختر اسماً آخر للمتغير أو الدالة." })],
  [/^Argument name clash/, () => ({ message: "يوجد معاملان بالاسم نفسه في تعريف الدالة.", fix: "اجعل أسماء معاملات الدالة مختلفة." })],
  [/^Complex binding patterns require an initialization value|^Missing initializer/, () => ({ message: "التفكيك (destructuring) في التعريف يحتاج قيمة.", fix: "اكتب مثلاً: const { a, b } = obj;" })],
  [/^Octal literal in strict mode|^Invalid number/, () => ({ message: "صيغة الرقم غير صالحة.", fix: "لا تبدأ الأرقام بصفر زائد، واستخدم 0o للأساس الثماني و 0x للست عشري." })],
  [/^Bad escape sequence|^Invalid escape sequence|^Bad character escape/, () => ({ message: "تسلسل هروب (escape) غير صالح بعد \\ داخل النص.", fix: "استخدم \\\\ لكتابة شرطة مائلة عكسية، أو تسلسلاً صحيحاً مثل \\n و \\t." })],
  [/^Label '(.*)' is already declared/, (m) => ({ message: `الوسم «${m[1]}» معرّف مرتين.`, fix: "غيّر اسم أحد الوسمين." })],
  [/^Duplicate constructor/, () => ({ message: "الصنف يحتوي أكثر من constructor.", fix: "اجعل في الصنف دالة constructor واحدة فقط." })],
  [/^Shorthand property assignments are valid only in destructuring/, () => ({ message: "استخدمت = داخل كائن بدل النقطتين :.", fix: "اكتب الخصائص بالصيغة { key: value }." })],
  [/^Comma is not permitted after the rest element|^Rest element must be last/, () => ({ message: "معامل البقية ... يجب أن يكون الأخير.", fix: "انقل ...rest إلى آخر القائمة." })],
  [/^'with' in strict mode|^Deleting local variable in strict mode/, () => ({ message: "هذه الصيغة غير مسموحة في الوضع الصارم (strict mode).", fix: "تجنّب with وحذف المتغيرات بـ delete." })]
];

function syntaxIssue(code, err, sourceType) {
  const raw = String(err.message).replace(/\s*\(\d+:\d+\)\s*$/, "");
  const pos = Number.isInteger(err.pos) ? err.pos : 0;
  const { line, col } = err.loc ? { line: err.loc.line, col: err.loc.column } : lineCol(code, pos);
  let info = null;
  if (/^Unexpected token/.test(raw)) info = explainUnexpected(code, pos, sourceType);
  else for (const [re, fn] of RULES) { const m = raw.match(re); if (m) { info = fn(m); break; } }
  if (!info) info = { message: `خطأ صياغة: ${raw}`, fix: "راجع هذا السطر والسطر الذي قبله." };
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
        if (assigned && !guess) add(n, "warning", `المتغير «${n.name}» يُسند إليه دون تعريفه بـ let أو const، فيصبح متغيراً عاماً (وخطأً في الوضع الصارم).`, `عرّفه أولاً: let ${n.name} = ...`);
        else add(n, guess ? "error" : "warning", `الاسم «${n.name}» غير معرّف في الكود${guess ? `، ربما تقصد «${guess}»` : ""}، وسيسبب ReferenceError: ${n.name} is not defined عند التنفيذ.`, guess ? `صحّح الاسم إلى «${guess}».` : `عرّف «${n.name}» قبل استخدامه بـ let أو const أو function، أو تأكد أنه متغير عام موجود.`);
      }
    }
    if (n.type === "MemberExpression" && !n.computed && n.property.type === "Identifier" && n.property.name.length >= 4 && !MEMBERS.has(n.property.name)) {
      const p = n.property.name;
      const sorted = (w) => [...w.toLowerCase()].sort().join("");
      const guess = [...MEMBERS].find((m) => m.toLowerCase() === p.toLowerCase()) || [...MEMBERS].find((m) => m.length === p.length && sorted(m) === sorted(p) && distance(p, m) === 1) || (p.length >= 7 ? [...MEMBERS].find((m) => distance(p, m) === 1) : null);
      if (guess) add(n.property, "warning", `الخاصية «${p}» تبدو خطأً إملائياً في «${guess}»، والنتيجة غالباً undefined أو TypeError: ${p} is not a function.`, `اكتب .${guess}`);
    }
    if ((n.type === "AssignmentExpression" && n.left.type === "Identifier") || (n.type === "UpdateExpression" && n.argument.type === "Identifier")) {
      const id = n.type === "AssignmentExpression" ? n.left : n.argument;
      const d = declared.get(id.name);
      if (d && d.kinds.size === 1 && d.kinds.has("const")) add(id, "error", `لا يمكن تغيير قيمة الثابت «${id.name}» المعرّف بـ const (TypeError: Assignment to constant variable).`, `عرّفه بـ let بدل const إذا كانت قيمته تتغير: let ${id.name} = ...`);
    }
    if (n.type === "BinaryExpression" && (n.operator === "==" || n.operator === "!=")) {
      const isNull = (x) => x.type === "Literal" && x.value === null;
      if (!isNull(n.left) && !isNull(n.right)) {
        const opPos = code.indexOf(n.operator, n.left.end);
        const lc = lineCol(code, opPos);
        issues.push({ line: lc.line, col: lc.col, len: 2, severity: "warning", message: `المقارنة ${n.operator} تحوّل الأنواع تلقائياً (مثلاً "0" == 0 صحيحة)، وقد تعطي نتائج غير متوقعة.`, fix: `استخدم ${n.operator}= للمقارنة الصارمة.` });
      }
    }
    if (n.type === "BinaryExpression" && /^[!=]==?$/.test(n.operator) && [n.left, n.right].some((x) => x.type === "Identifier" && x.name === "NaN")) add(n, "error", "المقارنة مع NaN تعطي دائماً false، لأن NaN لا تساوي أي قيمة حتى نفسها.", "استخدم Number.isNaN(x) بدلاً منها.");
    if (n.type === "BinaryExpression" && /^[!=]==?$/.test(n.operator)) {
      const t = n.left.type === "UnaryExpression" && n.left.operator === "typeof" ? n.right : n.right.type === "UnaryExpression" && n.right.operator === "typeof" ? n.left : null;
      if (t && t.type === "Literal" && typeof t.value === "string" && !TYPEOF_OK.has(t.value)) add(t, "error", `typeof لا يعيد أبداً "${t.value}"؛ القيم الممكنة: undefined, object, boolean, number, string, function, symbol, bigint.`, `صحّح الكلمة${closest(t.value, [...TYPEOF_OK]) ? ` إلى "${closest(t.value, [...TYPEOF_OK])}"` : ""}.`);
    }
    if ((n.type === "IfStatement" || n.type === "WhileStatement" || n.type === "DoWhileStatement") && n.test.type === "AssignmentExpression" && n.test.operator === "=") add(n.test, "warning", "يوجد إسناد = داخل شرط، وغالباً المقصود المقارنة.", "استخدم === للمقارنة: if (x === 5)");
    if ((n.type === "IfStatement" || n.type === "ForStatement" || n.type === "WhileStatement") && (n.consequent || n.body) && (n.consequent || n.body).type === "EmptyStatement") add(n.consequent || n.body, "warning", `فاصلة منقوطة مباشرة بعد شرط ${n.type === "IfStatement" ? "if" : "الحلقة"} تجعل جسمه فارغاً، فلا يتأثر الكود الذي يليه بالشرط.`, "احذف ; الموجودة بعد القوس ).", 1);
    if (n.type === "VariableDeclaration" && n.kind === "var") add(n, "info", "var قديمة ونطاقها الدالة كاملة، مما قد يسبب أخطاء خفية.", "استخدم let للمتغيرات و const للثوابت.", 3);
    if (n.type === "ObjectExpression") {
      const seen = new Set();
      for (const p of n.properties) {
        if (p.type !== "Property" || p.computed || p.kind !== "init") continue;
        const k = p.key.type === "Identifier" ? p.key.name : String(p.key.value);
        if (seen.has(k)) add(p.key, "warning", `المفتاح «${k}» مكرر في الكائن، والقيمة الأخيرة تلغي الأولى.`, "احذف أحد المفتاحين أو غيّر اسمه.");
        seen.add(k);
      }
    }
    if (n.type === "BlockStatement" || n.type === "Program" || n.type === "SwitchCase") {
      const body = n.type === "SwitchCase" ? n.consequent : n.body;
      for (let i = 0; i < body.length - 1; i++) {
        if (ENDS.has(body[i].type)) {
          const next = body.slice(i + 1).find((s) => s.type !== "FunctionDeclaration" && s.type !== "EmptyStatement");
          if (next) add(next, "warning", `هذا الكود لن يُنفَّذ أبداً لأنه بعد ${({ ReturnStatement: "return", ThrowStatement: "throw", BreakStatement: "break", ContinueStatement: "continue" })[body[i].type]}.`, "احذفه أو انقله قبل تلك التعليمة.");
          break;
        }
      }
    }
    if (n.type === "SwitchStatement") {
      n.cases.forEach((c, i) => {
        if (i === n.cases.length - 1 || !c.consequent.length) return;
        const last = c.consequent[c.consequent.length - 1];
        const ends = ENDS.has(last.type) || (last.type === "BlockStatement" && last.body.length && ENDS.has(last.body[last.body.length - 1].type));
        if (!ends) add(c, "warning", "هذه الحالة case لا تنتهي بـ break، فيستمر التنفيذ إلى الحالة التالية.", "أضف break; في نهاية الحالة إن لم يكن الاستمرار مقصوداً.", 4);
      });
    }
    if (n.type === "CatchClause" && !n.body.body.length) add(n, "info", "كتلة catch فارغة تُخفي الأخطاء فلا تعرف سببها.", "اطبع الخطأ على الأقل: console.error(err);", 5);
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
      issues.push({ line: d.node.loc.start.line, col: d.node.loc.start.column, len: name.length, severity: "info", message: `الدالة «${name}» معرّفة لكنها لا تُستدعى في هذا الكود.`, fix: "استدعها أو احذفها إن لم تكن مطلوبة." });
      continue;
    }
    issues.push({ line: d.node.loc.start.line, col: d.node.loc.start.column, len: name.length, severity: "info", message: `«${name}» معرّف لكنه غير مستخدم.`, fix: "احذفه إن لم تكن بحاجة إليه." });
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
  const mode = choice(input, "mode", "نوع الملف", ["script", "module"], "script");
  const res = check(code, mode);
  const lines = code.split("\n").length;
  const linesWord = lines === 1 ? "سطراً واحداً" : lines === 2 ? "سطرين" : lines <= 10 ? `${lines} أسطر` : `${lines} سطراً`;
  const steps = [`حلّلنا ${linesWord} بمحلّل JavaScript (Acorn) وفق أحدث معيار ECMAScript، كـ${mode === "module" ? "وحدة ES Module" : "سكربت عادي"}.`];
  let extra = {};
  if (!res.ok) {
    const e = res.issues[0];
    steps.push(`توقف المحلّل عند أول خطأ صياغة في السطر ${e.line}، العمود ${e.col + 1}. رسالة المحرك الأصلية: ${e.english}.`);
    steps.push(`الشرح: ${e.message}`);
    steps.push(`الإصلاح: ${e.fix}`);
    steps.push("بعد إصلاح هذا الخطأ أعد الفحص، فقد تظهر أخطاء أخرى كانت مخفية بعده.");
  } else {
    let fns = 0;
    walk(res.ast, null, (n) => { if (/Function/.test(n.type)) fns++; });
    extra = { "عدد الأسطر": lines, "عدد الدوال": fns };
    steps.push("لا توجد أخطاء صياغة، فالكود يمكن تشغيله.");
    steps.push("ثم فحصنا الأخطاء المنطقية الشائعة: الأسماء غير المعرّفة والأخطاء الإملائية فيها، وتغيير الثوابت، والمقارنة ==، والإسناد داخل الشروط، والكود الذي لا يُنفَّذ، والمفاتيح المكررة، وحالات switch بلا break.");
    steps.push("ملاحظة: الفحص ثابت (دون تشغيل الكود)، لذا قد لا يكتشف أخطاء تظهر فقط أثناء التنفيذ.");
  }
  const out = report(code, res.issues, extra);
  return { results: out.results, steps, blocks: out.blocks, copy: out.copy };
}
