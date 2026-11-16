import * as acorn from "../../vendor/acorn/acorn.mjs";
import { choice } from "../core/validate.js";
import { readCode, report, lineCol, closest, distance } from "./code-view.js";

export const meta = {
  description: "Pega código JavaScript para detectar errores de sintaxis, con su explicación en español y cómo corregirlos, además de avisos sobre errores comunes como variables no declaradas, errores tipográficos y == en lugar de ===.",
  keywords: ["javascript", "js", "Revisar código", "Depurar errores", "syntax error", "linter", "JavaScript", "error de programación"],
  formulas: [{ label: "El código se analiza en un árbol de sintaxis (AST) y luego se revisan las reglas de errores comunes", tex: "\\text{code} \\xrightarrow{\\text{parser}} \\text{AST} \\xrightarrow{\\text{rules}} \\text{issues}" }],
  inputs: [
    { id: "code", label: "Código JavaScript", type: "textarea", rows: 12, wide: true, placeholder: "function sum(a, b) {\n  return a + b;\n}" },
    { id: "mode", label: "Tipo de archivo", type: "select", default: "script", options: [["script", "Script normal"], ["module", "Módulo ES Module (usa import/export)"]] }
  ],
  example: {
    values: { code: "function average(list) {\n  let total = 0;\n  for (let i = 0; i < list.length; i++) {\n    total += list[i];\n  }\n  if (list.length == 0) return 0;\n  return totl / list.length;\n}\nconsole.log(average([4, 8, 6]));", mode: "script" },
    expect: ["totl", "total"],
    note: "Ejemplo: función para calcular el promedio con un error tipográfico en el nombre de una variable y el uso de == en lugar de ===."
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
    if (stack.length === 1) return { message: `El código terminó y el paréntesis «${top.label}» abierto en la línea ${top.line} no se cerró.`, fix: `Añade «${OPENERS[top.label]}» en el lugar adecuado para cerrarlo.`, at: top };
    if (stack.length > 1) {
      const inner = stack.find((t, i) => (t.label === "(" || t.label === "[") && stack[i + 1] && stack[i + 1].label === "{" && stack[i + 1].line === t.line);
      const list = stack.map((t) => `«${t.label}» en la línea ${t.line}`).join("، ");
      if (inner) return { message: `El paréntesis «${inner.label}» abierto en la línea ${inner.line} no se cerró antes de «{»; los paréntesis sin cerrar son: ${list}.`, fix: `Añade «${OPENERS[inner.label]}» antes de «{» en la línea ${inner.line}, y luego cierra los demás paréntesis.`, at: inner };
      return { message: `El código terminó y estos paréntesis no se cerraron: ${list}.`, fix: `Ciérralos en orden inverso: ${stack.map((t) => OPENERS[t.label]).reverse().join(" ")}`, at: stack[0] };
    }
    return { message: "El código terminó antes de completar la última instrucción.", fix: "Completa la última instrucción; por ejemplo, asigna un valor después de = o completa la expresión." };
  }
  if (prev && prev.value === "await" && prev.label === "name") return { message: "La palabra await solo se usa dentro de una función async (o en un ES Module).", fix: "Añade async antes de la función: async function f() { await ... }, o elige el tipo de archivo «Módulo ES Module»." };
  if (prev && prev2 && prev2.keyword === "const" && prev.label === "name" && cur && (cur.label === ";" || cur.label === ",")) return { message: `La constante «${prev.value}» declarada con const debe recibir un valor al definirla.`, fix: `Escribe const ${prev.value} = valor; o usa let si el valor se asignará más tarde.` };
  if (prev && prev.keyword === "class" && cur && cur.label === "{") return { message: "La definición de la clase class necesita un nombre después de la palabra class.", fix: "Escribe class MyClass { ... }." };
  if (cur && cur.label === "{" && top && top.label === "(") return { message: `El paréntesis «(» abierto en la línea ${top.line} no se cerró antes de «{».`, fix: "Añade «)» antes de la llave {, por ejemplo: if (x > 1) {" , at: top };
  if (cur && CLOSERS.has(cur.label)) {
    if (top && OPENERS[top.label] !== cur.label) return { message: `El paréntesis «${cur.label}» no coincide con el paréntesis «${top.label}» abierto en la línea ${top.line}.`, fix: `Cierra primero «${top.label}» con «${OPENERS[top.label]}», o elimina el paréntesis sobrante.` };
    if (!top) return { message: `El paréntesis de cierre «${cur.label}» sobra y no tiene paréntesis de apertura.`, fix: "Elimina este paréntesis o añade antes el paréntesis de apertura que falta." };
    if (prev && !VALUE_END.has(prev.label) && prev.label !== "," && prev.label !== "(" && prev.label !== "[" && prev.label !== "{") return { message: `El operador «${shown(prev)}» necesita un valor después de él antes de «${cur.label}».`, fix: "Completa la expresión con un valor después del operador, o elimina el operador sobrante." };
  }
  if (cur && (cur.label === ";" || cur.label === ",") && prev && !VALUE_END.has(prev.label) && prev.label !== ";" && !prev.keyword) return { message: `El operador «${shown(prev)}» necesita un valor después de él.`, fix: "Completa la expresión con un valor después del operador, por ejemplo: let y = 5 + 3;" };
  if (prev && cur && VALUE_END.has(prev.label) && (VALUE_START.has(cur.label) || (cur.keyword && VALUE_START.has(cur.keyword)))) {
    if (top && (top.label === "(" || top.label === "[")) return { message: `Falta una coma «,» entre «${shown(prev)}» y «${shown(cur)}».`, fix: `Separa los elementos con una coma: ${shown(prev)}, ${shown(cur)}` };
    if (top && top.label === "{" && code.slice(top.end).match(/^\s*[\w"'$]+\s*:/)) return { message: `Falta una coma «,» entre las propiedades del objeto antes de «${shown(cur)}».`, fix: "Separa las propiedades del objeto con una coma: { a: 1, b: 2 }" };
    return { message: `«${shown(cur)}» aparece justo después de «${shown(prev)}» sin un operador ni una coma entre ambos.`, fix: "Revisa si hay un operador (+, = o .), un punto y coma o un paréntesis de apertura entre las dos partes." };
  }
  if (cur && cur.label === "=>" ) return { message: "La flecha => está en un lugar incorrecto.", fix: "Revisa la sintaxis de la función flecha: (a, b) => a + b" };
  const tok = cur ? shown(cur) : code[pos];
  return { message: `El símbolo «${tok}» no se espera en esta posición.`, fix: "Revisa esta línea y la anterior: puede faltar un paréntesis, una coma o un operador." };
}

const RULES = [
  [/^Unterminated string constant/, () => ({ message: "La cadena (string) no se cerró con su comilla.", fix: "Cierra el texto con la misma comilla con la que empezó: \" o ', en la misma línea, y usa ` para textos de varias líneas." })],
  [/^Unterminated template/, () => ({ message: "La plantilla que empieza con ` no se cerró.", fix: "Añade ` al final del texto." })],
  [/^Unterminated comment/, () => ({ message: "El comentario de varias líneas /* no se cerró con */.", fix: "Añade */ al final del comentario." })],
  [/^Unterminated regular expression/, () => ({ message: "La expresión regular (regex) que empieza con / no se cerró.", fix: "Cierra la expresión con / en la misma línea, o asegúrate de que este / no sea una división incompleta." })],
  [/^Identifier '(.+)' has already been declared/, (m) => ({ message: `La variable «${m[1]}» ya está declarada en el mismo ámbito, así que no se puede volver a declarar con let o const.`, fix: `Quita let/const de la segunda declaración para modificar el valor: ${m[1]} = ..., o elige otro nombre.` })],
  [/^'return' outside of function/, () => ({ message: "La instrucción return está escrita fuera de cualquier función.", fix: "Pon return dentro del cuerpo de una función, o elimínala." })],
  [/^'import' and 'export' may appear only/, () => ({ message: "import y export no funcionan en un script normal.", fix: "Elige el tipo de archivo «Módulo ES Module» y, en HTML, usa <script type=\"module\">." })],
  [/^Assigning to rvalue|^Invalid left-hand side/, () => ({ message: "El lado izquierdo de la asignación = no es una variable a la que se pueda cambiar el valor.", fix: "Si quieres comparar, usa === en lugar de =; si no, pon un nombre de variable a la izquierda de =." })],
  [/^Invalid regular expression flag/, () => ({ message: "Bandera (flag) no válida después de la expresión regular.", fix: "Banderas permitidas: g i m s u y d v." })],
  [/^Invalid regular expression: (.*)/, (m) => ({ message: `La expresión regular no es válida: ${m[1]}`, fix: "Revisa los paréntesis y los símbolos especiales de la expresión, y usa la herramienta de prueba de Regex." })],
  [/^Unexpected character '(.*)'/, (m) => ({ message: `El carácter «${m[1]}» no está permitido aquí en el código JavaScript.`, fix: /[“”‘’]/.test(m[1]) ? "Es una comilla «inteligente» de un procesador de texto; cámbiala por \" o ' normales." : /[،؛]/.test(m[1]) ? "Es una coma árabe; usa la coma inglesa , o ; ." : "Elimina este carácter o colócalo dentro de un texto entre comillas." })],
  [/^Unexpected keyword '(.*)'/, (m) => ({ message: `La palabra reservada «${m[1]}» aparece en un lugar inadecuado.`, fix: `No uses «${m[1]}» como nombre de variable o función, y revisa la sintaxis antes de ella.` })],
  [/^Cannot use keyword 'await' outside an async function|'await' is only valid/, () => ({ message: "La palabra await solo se usa dentro de una función async.", fix: "Añade async antes de la función: async function f() { ... }." })],
  [/^Unsyntactic (break|continue)/, (m) => ({ message: `La instrucción ${m[1]} está fuera de un bucle${m[1] === "break" ? " o switch" : ""}.`, fix: `Pon ${m[1]} dentro de un for o while${m[1] === "break" ? " o switch" : ""}, o usa return para salir de una función.` })],
  [/^Identifier directly after number/, () => ({ message: "Aparece un nombre justo después de un número, por ejemplo 3px o 2x.", fix: "Pon el valor entre comillas \"3px\", o escribe la multiplicación de forma explícita: 2 * x." })],
  [/^let is disallowed as a lexically bound name/, () => ({ message: "No se puede dar a una variable el nombre let.", fix: "Elige otro nombre para la variable." })],
  [/^The keyword '(.*)' is reserved/, (m) => ({ message: `«${m[1]}» es una palabra reservada en JavaScript y no sirve como nombre.`, fix: "Elige otro nombre para la variable o la función." })],
  [/^Argument name clash/, () => ({ message: "Hay dos parámetros con el mismo nombre en la definición de la función.", fix: "Haz que los nombres de los parámetros de la función sean distintos." })],
  [/^Complex binding patterns require an initialization value|^Missing initializer/, () => ({ message: "La desestructuración (destructuring) en la declaración necesita un valor.", fix: "Escribe, por ejemplo: const { a, b } = obj;" })],
  [/^Octal literal in strict mode|^Invalid number/, () => ({ message: "El formato del número no es válido.", fix: "Los números no deben empezar con un cero extra; usa 0o para octal y 0x para hexadecimal." })],
  [/^Bad escape sequence|^Invalid escape sequence|^Bad character escape/, () => ({ message: "Secuencia de escape no válida después de \\ dentro del texto.", fix: "Usa \\\\ para escribir una barra invertida, o una secuencia válida como \\n y \\t." })],
  [/^Label '(.*)' is already declared/, (m) => ({ message: `La etiqueta «${m[1]}» está declarada dos veces.`, fix: "Cambia el nombre de una de las dos etiquetas." })],
  [/^Duplicate constructor/, () => ({ message: "La clase tiene más de un constructor.", fix: "Deja en la clase un único método constructor." })],
  [/^Shorthand property assignments are valid only in destructuring/, () => ({ message: "Usaste = dentro de un objeto en lugar de dos puntos :.", fix: "Escribe las propiedades con la forma { key: value }." })],
  [/^Comma is not permitted after the rest element|^Rest element must be last/, () => ({ message: "El parámetro rest ... debe ser el último.", fix: "Mueve ...rest al final de la lista." })],
  [/^'with' in strict mode|^Deleting local variable in strict mode/, () => ({ message: "Esta sintaxis no está permitida en modo estricto (strict mode).", fix: "Evita with y borrar variables con delete." })]
];

function syntaxIssue(code, err, sourceType) {
  const raw = String(err.message).replace(/\s*\(\d+:\d+\)\s*$/, "");
  const pos = Number.isInteger(err.pos) ? err.pos : 0;
  const { line, col } = err.loc ? { line: err.loc.line, col: err.loc.column } : lineCol(code, pos);
  let info = null;
  if (/^Unexpected token/.test(raw)) info = explainUnexpected(code, pos, sourceType);
  else for (const [re, fn] of RULES) { const m = raw.match(re); if (m) { info = fn(m); break; } }
  if (!info) info = { message: `Error de sintaxis: ${raw}`, fix: "Revisa esta línea y la anterior." };
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
        if (assigned && !guess) add(n, "warning", `La variable «${n.name}» recibe un valor sin haberse declarado con let o const, así que se convierte en global (y es un error en modo estricto).`, `Decláralo primero: let ${n.name} = ...`);
        else add(n, guess ? "error" : "warning", `El nombre «${n.name}» no está definido en el código${guess ? `, quizá quiso decir «${guess}»` : ""}, y causará ReferenceError: ${n.name} is not defined al ejecutarse.`, guess ? `Corrige el nombre a «${guess}».` : `Declara «${n.name}» antes de usarlo con let, const o function, o asegúrate de que sea una variable global existente.`);
      }
    }
    if (n.type === "MemberExpression" && !n.computed && n.property.type === "Identifier" && n.property.name.length >= 4 && !MEMBERS.has(n.property.name)) {
      const p = n.property.name;
      const sorted = (w) => [...w.toLowerCase()].sort().join("");
      const guess = [...MEMBERS].find((m) => m.toLowerCase() === p.toLowerCase()) || [...MEMBERS].find((m) => m.length === p.length && sorted(m) === sorted(p) && distance(p, m) === 1) || (p.length >= 7 ? [...MEMBERS].find((m) => distance(p, m) === 1) : null);
      if (guess) add(n.property, "warning", `La propiedad «${p}» parece un error tipográfico en «${guess}»; el resultado suele ser undefined o TypeError: ${p} is not a function.`, `Escribe .${guess}`);
    }
    if ((n.type === "AssignmentExpression" && n.left.type === "Identifier") || (n.type === "UpdateExpression" && n.argument.type === "Identifier")) {
      const id = n.type === "AssignmentExpression" ? n.left : n.argument;
      const d = declared.get(id.name);
      if (d && d.kinds.size === 1 && d.kinds.has("const")) add(id, "error", `No se puede cambiar el valor de la constante «${id.name}» declarada con const (TypeError: Assignment to constant variable).`, `Decláralo con let en lugar de const si su valor va a cambiar: let ${id.name} = ...`);
    }
    if (n.type === "BinaryExpression" && (n.operator === "==" || n.operator === "!=")) {
      const isNull = (x) => x.type === "Literal" && x.value === null;
      if (!isNull(n.left) && !isNull(n.right)) {
        const opPos = code.indexOf(n.operator, n.left.end);
        const lc = lineCol(code, opPos);
        issues.push({ line: lc.line, col: lc.col, len: 2, severity: "warning", message: `La comparación ${n.operator} convierte los tipos automáticamente (por ejemplo, "0" == 0 es verdadera), y puede dar resultados inesperados.`, fix: `Usa ${n.operator}= para la comparación estricta.` });
      }
    }
    if (n.type === "BinaryExpression" && /^[!=]==?$/.test(n.operator) && [n.left, n.right].some((x) => x.type === "Identifier" && x.name === "NaN")) add(n, "error", "Una comparación con NaN siempre da false, porque NaN no es igual a ningún valor, ni siquiera a sí mismo.", "Usa Number.isNaN(x) en su lugar.");
    if (n.type === "BinaryExpression" && /^[!=]==?$/.test(n.operator)) {
      const t = n.left.type === "UnaryExpression" && n.left.operator === "typeof" ? n.right : n.right.type === "UnaryExpression" && n.right.operator === "typeof" ? n.left : null;
      if (t && t.type === "Literal" && typeof t.value === "string" && !TYPEOF_OK.has(t.value)) add(t, "error", `typeof nunca devuelve "${t.value}"; los valores posibles son: undefined, object, boolean, number, string, function, symbol, bigint.`, `Corrige la palabra${closest(t.value, [...TYPEOF_OK]) ? ` a "${closest(t.value, [...TYPEOF_OK])}"` : ""}.`);
    }
    if ((n.type === "IfStatement" || n.type === "WhileStatement" || n.type === "DoWhileStatement") && n.test.type === "AssignmentExpression" && n.test.operator === "=") add(n.test, "warning", "Hay una asignación = dentro de una condición; probablemente quisiste una comparación.", "Usa === para comparar: if (x === 5)");
    if ((n.type === "IfStatement" || n.type === "ForStatement" || n.type === "WhileStatement") && (n.consequent || n.body) && (n.consequent || n.body).type === "EmptyStatement") add(n.consequent || n.body, "warning", `Un punto y coma justo después de la condición ${n.type === "IfStatement" ? "if" : "del bucle"} deja su cuerpo vacío, así que el código que sigue no depende de la condición.`, "Elimina el ; que está después del paréntesis ).", 1);
    if (n.type === "VariableDeclaration" && n.kind === "var") add(n, "info", "var es antigua y su ámbito es toda la función, lo que puede causar errores ocultos.", "Usa let para las variables y const para las constantes.", 3);
    if (n.type === "ObjectExpression") {
      const seen = new Set();
      for (const p of n.properties) {
        if (p.type !== "Property" || p.computed || p.kind !== "init") continue;
        const k = p.key.type === "Identifier" ? p.key.name : String(p.key.value);
        if (seen.has(k)) add(p.key, "warning", `La clave «${k}» está repetida en el objeto, y el último valor reemplaza al primero.`, "Elimina una de las dos claves o cambia su nombre.");
        seen.add(k);
      }
    }
    if (n.type === "BlockStatement" || n.type === "Program" || n.type === "SwitchCase") {
      const body = n.type === "SwitchCase" ? n.consequent : n.body;
      for (let i = 0; i < body.length - 1; i++) {
        if (ENDS.has(body[i].type)) {
          const next = body.slice(i + 1).find((s) => s.type !== "FunctionDeclaration" && s.type !== "EmptyStatement");
          if (next) add(next, "warning", `Este código nunca se ejecutará porque está después de ${({ ReturnStatement: "return", ThrowStatement: "throw", BreakStatement: "break", ContinueStatement: "continue" })[body[i].type]}.`, "Elimínalo o muévelo antes de esa instrucción.");
          break;
        }
      }
    }
    if (n.type === "SwitchStatement") {
      n.cases.forEach((c, i) => {
        if (i === n.cases.length - 1 || !c.consequent.length) return;
        const last = c.consequent[c.consequent.length - 1];
        const ends = ENDS.has(last.type) || (last.type === "BlockStatement" && last.body.length && ENDS.has(last.body[last.body.length - 1].type));
        if (!ends) add(c, "warning", "Este caso case no termina con break, así que la ejecución continúa en el siguiente caso.", "Añade break; al final del caso si no es intencional que continúe.", 4);
      });
    }
    if (n.type === "CatchClause" && !n.body.body.length) add(n, "info", "Un bloque catch vacío oculta los errores y no sabrás cuál es su causa.", "Al menos imprime el error: console.error(err);", 5);
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
      issues.push({ line: d.node.loc.start.line, col: d.node.loc.start.column, len: name.length, severity: "info", message: `La función «${name}» está definida, pero no se llama en este código.`, fix: "Llámala o elimínala si no es necesaria." });
      continue;
    }
    issues.push({ line: d.node.loc.start.line, col: d.node.loc.start.column, len: name.length, severity: "info", message: `«${name}» está definido, pero no se usa.`, fix: "Elimínalo si no lo necesitas." });
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
  const mode = choice(input, "mode", "Tipo de archivo", ["script", "module"], "script");
  const res = check(code, mode);
  const lines = code.split("\n").length;
  const linesWord = lines === 1 ? "una línea" : lines === 2 ? "dos líneas" : lines <= 10 ? `${lines} líneas` : `${lines} líneas`;
  const steps = [`Analizamos ${linesWord} con el analizador de JavaScript (Acorn) según el estándar ECMAScript más reciente, como ${mode === "module" ? "módulo ES Module" : "Script normal"}.`];
  let extra = {};
  if (!res.ok) {
    const e = res.issues[0];
    steps.push(`El analizador se detuvo en el primer error de sintaxis, en la línea ${e.line}, columna ${e.col + 1}. Mensaje original del motor: ${e.english}.`);
    steps.push(`Explicación: ${e.message}`);
    steps.push(`Corrección: ${e.fix}`);
    steps.push("Después de corregir este error, vuelve a revisar: pueden aparecer otros errores que estaban ocultos tras él.");
  } else {
    let fns = 0;
    walk(res.ast, null, (n) => { if (/Function/.test(n.type)) fns++; });
    extra = { "Número de líneas": lines, "Número de funciones": fns };
    steps.push("No hay errores de sintaxis; el código se puede ejecutar.");
    steps.push("Luego revisamos los errores lógicos comunes: nombres no definidos y sus errores tipográficos, cambios en constantes, el uso de ==, asignaciones dentro de condiciones, código que nunca se ejecuta, claves repetidas y casos de switch sin break.");
    steps.push("Nota: la revisión es estática (sin ejecutar el código), así que puede no detectar errores que solo aparecen durante la ejecución.");
  }
  const out = report(code, res.issues, extra);
  return { results: out.results, steps, blocks: out.blocks, copy: out.copy };
}
