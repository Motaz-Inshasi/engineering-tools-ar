import * as acorn from "../../vendor/acorn/acorn.mjs";
import { choice } from "../core/validate.js";
import { readCode, report, lineCol, closest, distance } from "./code-view.js";

export const meta = {
  description: "Paste JavaScript code to detect syntax errors, with an explanation of each error in English and how to fix it, plus warnings for common mistakes such as undeclared variables, typos, and == used instead of ===.",
  keywords: ["javascript", "js", "Code check", "Debugging", "syntax error", "linter", "JavaScript", "programming error"],
  formulas: [{ label: "The code is parsed into a syntax tree (AST), then common error rules are checked", tex: "\\text{code} \\xrightarrow{\\text{parser}} \\text{AST} \\xrightarrow{\\text{rules}} \\text{issues}" }],
  inputs: [
    { id: "code", label: "JavaScript code", type: "textarea", rows: 12, wide: true, placeholder: "function sum(a, b) {\n  return a + b;\n}" },
    { id: "mode", label: "File type", type: "select", default: "script", options: [["script", "Regular script"], ["module", "ES Module (uses import/export)"]] }
  ],
  example: {
    values: { code: "function average(list) {\n  let total = 0;\n  for (let i = 0; i < list.length; i++) {\n    total += list[i];\n  }\n  if (list.length == 0) return 0;\n  return totl / list.length;\n}\nconsole.log(average([4, 8, 6]));", mode: "script" },
    expect: ["totl", "total"],
    note: "Example: an average function with a misspelled variable name and == used instead of ===."
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
    if (stack.length === 1) return { message: `The code ended and the bracket “${top.label}” opened on line ${top.line} was not closed.`, fix: `Add “${OPENERS[top.label]}” in the appropriate place to close it.`, at: top };
    if (stack.length > 1) {
      const inner = stack.find((t, i) => (t.label === "(" || t.label === "[") && stack[i + 1] && stack[i + 1].label === "{" && stack[i + 1].line === t.line);
      const list = stack.map((t) => `“${t.label}” on line ${t.line}`).join("، ");
      if (inner) return { message: `The bracket “${inner.label}” opened on line ${inner.line} was not closed before “{”, and the unclosed brackets are: ${list}.`, fix: `Add “${OPENERS[inner.label]}” before “{” on line ${inner.line}, then close the remaining brackets.`, at: inner };
      return { message: `The code ended and these brackets were not closed: ${list}.`, fix: `Close them in reverse order: ${stack.map((t) => OPENERS[t.label]).reverse().join(" ")}`, at: stack[0] };
    }
    return { message: "The code ended before the last statement was complete.", fix: "Complete the last statement, for example give a value after = or complete the expression." };
  }
  if (prev && prev.value === "await" && prev.label === "name") return { message: "The keyword await can only be used inside an async function (or in an ES Module).", fix: "Add async before the function: async function f() { await ... }, or choose the file type “ES Module”." };
  if (prev && prev2 && prev2.keyword === "const" && prev.label === "name" && cur && (cur.label === ";" || cur.label === ",")) return { message: `The constant “${prev.value}” declared with const must be given a value when it is declared.`, fix: `Write const ${prev.value} = value; or use let if the value will be assigned later.` };
  if (prev && prev.keyword === "class" && cur && cur.label === "{") return { message: "A class declaration needs a name after the class keyword.", fix: "Write class MyClass { ... }." };
  if (cur && cur.label === "{" && top && top.label === "(") return { message: `The bracket “(” opened on line ${top.line} was not closed before “{”.`, fix: "Add “)” before the curly bracket {, for example: if (x > 1) {" , at: top };
  if (cur && CLOSERS.has(cur.label)) {
    if (top && OPENERS[top.label] !== cur.label) return { message: `The bracket “${cur.label}” does not match the bracket “${top.label}” opened on line ${top.line}.`, fix: `Close “${top.label}” with “${OPENERS[top.label]}” first, or remove the extra bracket.` };
    if (!top) return { message: `The closing bracket “${cur.label}” is extra and has no matching opening bracket.`, fix: "Remove this bracket, or add the missing opening bracket before it." };
    if (prev && !VALUE_END.has(prev.label) && prev.label !== "," && prev.label !== "(" && prev.label !== "[" && prev.label !== "{") return { message: `The operator “${shown(prev)}” needs a value after it, before “${cur.label}”.`, fix: "Complete the expression with a value after the operator, or remove the extra operator." };
  }
  if (cur && (cur.label === ";" || cur.label === ",") && prev && !VALUE_END.has(prev.label) && prev.label !== ";" && !prev.keyword) return { message: `The operator “${shown(prev)}” needs a value after it.`, fix: "Complete the expression with a value after the operator, for example: let y = 5 + 3;" };
  if (prev && cur && VALUE_END.has(prev.label) && (VALUE_START.has(cur.label) || (cur.keyword && VALUE_START.has(cur.keyword)))) {
    if (top && (top.label === "(" || top.label === "[")) return { message: `A comma “,” is missing between “${shown(prev)}” and “${shown(cur)}”.`, fix: `Separate the items with a comma: ${shown(prev)}, ${shown(cur)}` };
    if (top && top.label === "{" && code.slice(top.end).match(/^\s*[\w"'$]+\s*:/)) return { message: `A comma “,” is missing between the object properties before “${shown(cur)}”.`, fix: "Separate the object properties with a comma: { a: 1, b: 2 }" };
    return { message: `“${shown(cur)}” comes directly after “${shown(prev)}” with no operator or comma between them.`, fix: "Check for an operator (+, = or .), a semicolon, or an opening bracket between the two parts." };
  }
  if (cur && cur.label === "=>" ) return { message: "The arrow => is in the wrong place.", fix: "Check the syntax of the arrow function: (a, b) => a + b" };
  const tok = cur ? shown(cur) : code[pos];
  return { message: `The token “${tok}” is unexpected at this position.`, fix: "Review this line and the line before it: a bracket, comma, or operator may be missing." };
}

const RULES = [
  [/^Unterminated string constant/, () => ({ message: "String (string) was not closed with a quote mark.", fix: "Close the string with the same quote mark it started with, \" or ', on the same line, and use ` for multi-line text." })],
  [/^Unterminated template/, () => ({ message: "The template string starting with ` was not closed.", fix: "Add ` at the end of the text." })],
  [/^Unterminated comment/, () => ({ message: "The multi-line comment /* was not closed with */.", fix: "Add */ at the end of the comment." })],
  [/^Unterminated regular expression/, () => ({ message: "The regular expression (regex) starting with / was not closed.", fix: "Close the expression with / on the same line, or make sure this / is not an incomplete division." })],
  [/^Identifier '(.+)' has already been declared/, (m) => ({ message: `The variable “${m[1]}” is already declared in the same scope, so it cannot be declared again with let or const.`, fix: `To change the value, remove let/const from the second declaration: ${m[1]} = ..., or choose a different name.` })],
  [/^'return' outside of function/, () => ({ message: "The return statement is written outside any function.", fix: "Put return inside a function body, or remove it." })],
  [/^'import' and 'export' may appear only/, () => ({ message: "import and export do not work in a regular script.", fix: "Choose the file type “ES Module”, and in HTML use <script type=\"module\">." })],
  [/^Assigning to rvalue|^Invalid left-hand side/, () => ({ message: "The left side of the assignment = is not a variable whose value can be changed.", fix: "If you mean a comparison, use === instead of =; otherwise, put a variable name on the left of =." })],
  [/^Invalid regular expression flag/, () => ({ message: "Invalid flag after the regular expression.", fix: "Allowed flags: g i m s u y d v." })],
  [/^Invalid regular expression: (.*)/, (m) => ({ message: `Invalid regular expression: ${m[1]}`, fix: "Review the brackets and special characters in the expression, and use a Regex testing tool." })],
  [/^Unexpected character '(.*)'/, (m) => ({ message: `The character “${m[1]}” is not allowed in JavaScript code here.`, fix: /[“”‘’]/.test(m[1]) ? "This is a “smart” quote mark from a word processor; replace it with a regular \" or '." : /[،؛]/.test(m[1]) ? "This is an Arabic comma; use the English comma “,” or “;” instead." : "Delete this character, or put it inside text enclosed in quote marks." })],
  [/^Unexpected keyword '(.*)'/, (m) => ({ message: `The reserved word “${m[1]}” appears in an inappropriate place.`, fix: `Do not use “${m[1]}” as the name of a variable or function, and check the syntax before it.` })],
  [/^Cannot use keyword 'await' outside an async function|'await' is only valid/, () => ({ message: "The keyword await can only be used inside an async function.", fix: "Add async before the function: async function f() { ... }." })],
  [/^Unsyntactic (break|continue)/, (m) => ({ message: `The statement ${m[1]} is written outside a loop${m[1] === "break" ? " or switch" : ""}.`, fix: `Put ${m[1]} inside a for or while${m[1] === "break" ? " or switch" : ""}, or use return to exit a function.` })],
  [/^Identifier directly after number/, () => ({ message: "A name comes directly after a number, such as 3px or 2x.", fix: "Put the value between quote marks, \"3px\", or write the multiplication explicitly: 2 * x." })],
  [/^let is disallowed as a lexically bound name/, () => ({ message: "A variable cannot be named let.", fix: "Choose a different name for the variable." })],
  [/^The keyword '(.*)' is reserved/, (m) => ({ message: `“${m[1]}” is a reserved word in JavaScript and cannot be used as a name.`, fix: "Choose a different name for the variable or function." })],
  [/^Argument name clash/, () => ({ message: "Two parameters with the same name appear in the function definition.", fix: "Make the function parameter names different." })],
  [/^Complex binding patterns require an initialization value|^Missing initializer/, () => ({ message: "Destructuring in a declaration needs a value.", fix: "For example, write: const { a, b } = obj;" })],
  [/^Octal literal in strict mode|^Invalid number/, () => ({ message: "Invalid number format.", fix: "Do not start numbers with an extra zero; use 0o for octal and 0x for hexadecimal." })],
  [/^Bad escape sequence|^Invalid escape sequence|^Bad character escape/, () => ({ message: "Invalid escape sequence after \\ inside the text.", fix: "Use \\\\ to write a backslash, or a valid sequence such as \\n and \\t." })],
  [/^Label '(.*)' is already declared/, (m) => ({ message: `The label “${m[1]}” is declared twice.`, fix: "Rename one of the two labels." })],
  [/^Duplicate constructor/, () => ({ message: "The class has more than one constructor.", fix: "Make sure the class has only one constructor function." })],
  [/^Shorthand property assignments are valid only in destructuring/, () => ({ message: "You used = inside an object instead of the colon :.", fix: "Write the properties in the form { key: value }." })],
  [/^Comma is not permitted after the rest element|^Rest element must be last/, () => ({ message: "The rest parameter ... must be the last one.", fix: "Move ...rest to the end of the list." })],
  [/^'with' in strict mode|^Deleting local variable in strict mode/, () => ({ message: "This syntax is not allowed in strict mode.", fix: "Avoid with and deleting variables with delete." })]
];

function syntaxIssue(code, err, sourceType) {
  const raw = String(err.message).replace(/\s*\(\d+:\d+\)\s*$/, "");
  const pos = Number.isInteger(err.pos) ? err.pos : 0;
  const { line, col } = err.loc ? { line: err.loc.line, col: err.loc.column } : lineCol(code, pos);
  let info = null;
  if (/^Unexpected token/.test(raw)) info = explainUnexpected(code, pos, sourceType);
  else for (const [re, fn] of RULES) { const m = raw.match(re); if (m) { info = fn(m); break; } }
  if (!info) info = { message: `Syntax error: ${raw}`, fix: "Review this line and the line before it." };
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
        if (assigned && !guess) add(n, "warning", `The variable “${n.name}” is assigned a value without being declared with let or const, so it becomes a global variable (and an error in strict mode).`, `Declare it first: let ${n.name} = ...`);
        else add(n, guess ? "error" : "warning", `The name «${n.name}» is not defined in the code${guess ? `, did you mean «${guess}»?` : ""}, and will cause a ReferenceError: ${n.name} is not defined when run.`, guess ? `Correct the name to “${guess}”.` : `Declare “${n.name}” with let, const, or function before using it, or make sure it is an existing global variable.`);
      }
    }
    if (n.type === "MemberExpression" && !n.computed && n.property.type === "Identifier" && n.property.name.length >= 4 && !MEMBERS.has(n.property.name)) {
      const p = n.property.name;
      const sorted = (w) => [...w.toLowerCase()].sort().join("");
      const guess = [...MEMBERS].find((m) => m.toLowerCase() === p.toLowerCase()) || [...MEMBERS].find((m) => m.length === p.length && sorted(m) === sorted(p) && distance(p, m) === 1) || (p.length >= 7 ? [...MEMBERS].find((m) => distance(p, m) === 1) : null);
      if (guess) add(n.property, "warning", `The property “${p}” looks like a typo in “${guess}”, and the result is likely undefined or a TypeError: ${p} is not a function.`, `Write .${guess}`);
    }
    if ((n.type === "AssignmentExpression" && n.left.type === "Identifier") || (n.type === "UpdateExpression" && n.argument.type === "Identifier")) {
      const id = n.type === "AssignmentExpression" ? n.left : n.argument;
      const d = declared.get(id.name);
      if (d && d.kinds.size === 1 && d.kinds.has("const")) add(id, "error", `The value of the constant “${id.name}” declared with const cannot be changed (TypeError: Assignment to constant variable).`, `Declare it with let instead of const if its value will change: let ${id.name} = ...`);
    }
    if (n.type === "BinaryExpression" && (n.operator === "==" || n.operator === "!=")) {
      const isNull = (x) => x.type === "Literal" && x.value === null;
      if (!isNull(n.left) && !isNull(n.right)) {
        const opPos = code.indexOf(n.operator, n.left.end);
        const lc = lineCol(code, opPos);
        issues.push({ line: lc.line, col: lc.col, len: 2, severity: "warning", message: `The comparison ${n.operator} converts types automatically (for example, "0" == 0 is true), and may give unexpected results.`, fix: `Use ${n.operator}= for strict comparison.` });
      }
    }
    if (n.type === "BinaryExpression" && /^[!=]==?$/.test(n.operator) && [n.left, n.right].some((x) => x.type === "Identifier" && x.name === "NaN")) add(n, "error", "A comparison with NaN always gives false, because NaN is not equal to any value, not even itself.", "Use Number.isNaN(x) instead.");
    if (n.type === "BinaryExpression" && /^[!=]==?$/.test(n.operator)) {
      const t = n.left.type === "UnaryExpression" && n.left.operator === "typeof" ? n.right : n.right.type === "UnaryExpression" && n.right.operator === "typeof" ? n.left : null;
      if (t && t.type === "Literal" && typeof t.value === "string" && !TYPEOF_OK.has(t.value)) add(t, "error", `typeof never returns "${t.value}"; the possible values are: undefined, object, boolean, number, string, function, symbol, bigint.`, `Correct the word${closest(t.value, [...TYPEOF_OK]) ? ` to "${closest(t.value, [...TYPEOF_OK])}"` : ""}.`);
    }
    if ((n.type === "IfStatement" || n.type === "WhileStatement" || n.type === "DoWhileStatement") && n.test.type === "AssignmentExpression" && n.test.operator === "=") add(n.test, "warning", "There is an assignment = inside a condition, and a comparison was probably intended.", "Use === for comparison: if (x === 5)");
    if ((n.type === "IfStatement" || n.type === "ForStatement" || n.type === "WhileStatement") && (n.consequent || n.body) && (n.consequent || n.body).type === "EmptyStatement") add(n.consequent || n.body, "warning", `A semicolon directly after the condition ${n.type === "IfStatement" ? "if" : "the loop"} makes its body empty, so the code that follows is not affected by the condition.`, "Delete the ; after the bracket ).", 1);
    if (n.type === "VariableDeclaration" && n.kind === "var") add(n, "info", "var is outdated and its scope is the whole function, which may cause hidden errors.", "Use let for variables and const for constants.", 3);
    if (n.type === "ObjectExpression") {
      const seen = new Set();
      for (const p of n.properties) {
        if (p.type !== "Property" || p.computed || p.kind !== "init") continue;
        const k = p.key.type === "Identifier" ? p.key.name : String(p.key.value);
        if (seen.has(k)) add(p.key, "warning", `The key “${k}” is duplicated in the object, and the last value overrides the first.`, "Delete one of the two keys or rename it.");
        seen.add(k);
      }
    }
    if (n.type === "BlockStatement" || n.type === "Program" || n.type === "SwitchCase") {
      const body = n.type === "SwitchCase" ? n.consequent : n.body;
      for (let i = 0; i < body.length - 1; i++) {
        if (ENDS.has(body[i].type)) {
          const next = body.slice(i + 1).find((s) => s.type !== "FunctionDeclaration" && s.type !== "EmptyStatement");
          if (next) add(next, "warning", `This code will never run because it comes after ${({ ReturnStatement: "return", ThrowStatement: "throw", BreakStatement: "break", ContinueStatement: "continue" })[body[i].type]}.`, "Delete it, or move it before that statement.");
          break;
        }
      }
    }
    if (n.type === "SwitchStatement") {
      n.cases.forEach((c, i) => {
        if (i === n.cases.length - 1 || !c.consequent.length) return;
        const last = c.consequent[c.consequent.length - 1];
        const ends = ENDS.has(last.type) || (last.type === "BlockStatement" && last.body.length && ENDS.has(last.body[last.body.length - 1].type));
        if (!ends) add(c, "warning", "This case does not end with break, so execution will continue to the next case.", "Add break; at the end of the case if continuing is not intended.", 4);
      });
    }
    if (n.type === "CatchClause" && !n.body.body.length) add(n, "info", "An empty catch block hides errors, so you cannot tell what caused them.", "At least log the error: console.error(err);", 5);
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
      issues.push({ line: d.node.loc.start.line, col: d.node.loc.start.column, len: name.length, severity: "info", message: `The function “${name}” is defined but not called in this code.`, fix: "Call it, or delete it if it is not needed." });
      continue;
    }
    issues.push({ line: d.node.loc.start.line, col: d.node.loc.start.column, len: name.length, severity: "info", message: `“${name}” is defined but never used.`, fix: "Delete it if you do not need it." });
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
  const mode = choice(input, "mode", "File type", ["script", "module"], "script");
  const res = check(code, mode);
  const lines = code.split("\n").length;
  const linesWord = lines === 1 ? "one line" : lines === 2 ? "two lines" : lines <= 10 ? `${lines} lines` : `${lines} lines`;
  const steps = [`We analyzed ${linesWord} with the JavaScript parser (Acorn) according to the latest ECMAScript standard, as ${mode === "module" ? "ES Module" : "Regular script"}.`];
  let extra = {};
  if (!res.ok) {
    const e = res.issues[0];
    steps.push(`The parser stopped at the first syntax error on line ${e.line}, column ${e.col + 1}. Original engine message: ${e.english}.`);
    steps.push(`Explanation: ${e.message}`);
    steps.push(`Fix: ${e.fix}`);
    steps.push("After fixing this error, run the check again, as other errors hidden behind it may appear.");
  } else {
    let fns = 0;
    walk(res.ast, null, (n) => { if (/Function/.test(n.type)) fns++; });
    extra = { "Number of lines": lines, "Number of functions": fns };
    steps.push("No syntax errors found, so the code can run.");
    steps.push("Then we checked common logical mistakes: undeclared names and their typos, changing constants, the == comparison, assignment inside conditions, code that never runs, duplicate keys, and switch cases without break.");
    steps.push("Note: the check is static (without running the code), so it may not detect errors that appear only during execution.");
  }
  const out = report(code, res.issues, extra);
  return { results: out.results, steps, blocks: out.blocks, copy: out.copy };
}
