import * as acorn from "../../vendor/acorn/acorn.mjs";
import { choice } from "../core/validate.js";
import { readCode, report, lineCol, closest, distance } from "./code-view.js";

export const meta = {
  description: "Collez du code JavaScript pour détecter les erreurs de syntaxe, avec leur explication en français et la manière de les corriger, ainsi que des avertissements pour les erreurs courantes comme les variables non déclarées, les fautes de frappe et == utilisé à la place de ===.",
  keywords: ["javascript", "js", "Vérification du code", "Débogage", "syntax error", "linter", "JavaScript", "erreur de programmation"],
  formulas: [{ label: "Le code est analysé en arbre syntaxique (AST), puis les règles d'erreurs courantes sont vérifiées", tex: "\\text{code} \\xrightarrow{\\text{parser}} \\text{AST} \\xrightarrow{\\text{rules}} \\text{issues}" }],
  inputs: [
    { id: "code", label: "Code JavaScript", type: "textarea", rows: 12, wide: true, placeholder: "function sum(a, b) {\n  return a + b;\n}" },
    { id: "mode", label: "Type de fichier", type: "select", default: "script", options: [["script", "Script classique"], ["module", "Module ES (utilise import/export)"]] }
  ],
  example: {
    values: { code: "function average(list) {\n  let total = 0;\n  for (let i = 0; i < list.length; i++) {\n    total += list[i];\n  }\n  if (list.length == 0) return 0;\n  return totl / list.length;\n}\nconsole.log(average([4, 8, 6]));", mode: "script" },
    expect: ["totl", "total"],
    note: "Exemple : une fonction de calcul de la moyenne avec une faute de frappe dans un nom de variable et == utilisé à la place de ===."
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
    if (stack.length === 1) return { message: `Le code s'est terminé et la parenthèse «${top.label}» ouverte à la ligne ${top.line} n'a pas été fermée.`, fix: `Ajoutez «${OPENERS[top.label]}» à l'endroit approprié pour la fermer.`, at: top };
    if (stack.length > 1) {
      const inner = stack.find((t, i) => (t.label === "(" || t.label === "[") && stack[i + 1] && stack[i + 1].label === "{" && stack[i + 1].line === t.line);
      const list = stack.map((t) => `«${t.label}» à la ligne ${t.line}`).join("، ");
      if (inner) return { message: `La parenthèse «${inner.label}» ouverte à la ligne ${inner.line} n'a pas été fermée avant «{», et les parenthèses non fermées sont : ${list}.`, fix: `Ajoutez «${OPENERS[inner.label]}» avant «{» à la ligne ${inner.line}, puis fermez les autres parenthèses.`, at: inner };
      return { message: `Le code s'est terminé et ces parenthèses n'ont pas été fermées : ${list}.`, fix: `Fermez-les dans l'ordre inverse : ${stack.map((t) => OPENERS[t.label]).reverse().join(" ")}`, at: stack[0] };
    }
    return { message: "Le code s'est terminé avant la fin de la dernière instruction.", fix: "Complétez la dernière instruction, par exemple en donnant une valeur après = ou en complétant l'expression." };
  }
  if (prev && prev.value === "await" && prev.label === "name") return { message: "Le mot-clé await ne peut être utilisé qu'à l'intérieur d'une fonction async (ou dans un module ES).", fix: "Ajoutez async avant la fonction : async function f() { await ... }, ou choisissez le type de fichier « Module ES »." };
  if (prev && prev2 && prev2.keyword === "const" && prev.label === "name" && cur && (cur.label === ";" || cur.label === ",")) return { message: `La constante «${prev.value}» déclarée avec const doit recevoir une valeur lors de sa déclaration.`, fix: `Écrivez const ${prev.value} = valeur; ou utilisez let si la valeur sera affectée plus tard.` };
  if (prev && prev.keyword === "class" && cur && cur.label === "{") return { message: "La déclaration de la classe class nécessite un nom après le mot-clé class.", fix: "Écrivez class MyClass { ... }." };
  if (cur && cur.label === "{" && top && top.label === "(") return { message: `La parenthèse «(» ouverte à la ligne ${top.line} n'a pas été fermée avant «{».`, fix: "Ajoutez «)» avant l'accolade {, par exemple : if (x > 1) {" , at: top };
  if (cur && CLOSERS.has(cur.label)) {
    if (top && OPENERS[top.label] !== cur.label) return { message: `La parenthèse «${cur.label}» ne correspond pas à la parenthèse «${top.label}» ouverte à la ligne ${top.line}.`, fix: `Fermez d'abord «${top.label}» avec «${OPENERS[top.label]}», ou supprimez la parenthèse en trop.` };
    if (!top) return { message: `La parenthèse fermante «${cur.label}» est en trop et ne correspond à aucune parenthèse ouvrante.`, fix: "Supprimez cette parenthèse, ou ajoutez la parenthèse ouvrante manquante avant elle." };
    if (prev && !VALUE_END.has(prev.label) && prev.label !== "," && prev.label !== "(" && prev.label !== "[" && prev.label !== "{") return { message: `L'opérateur «${shown(prev)}» a besoin d'une valeur après lui, avant «${cur.label}».`, fix: "Complétez l'expression avec une valeur après l'opérateur, ou supprimez l'opérateur en trop." };
  }
  if (cur && (cur.label === ";" || cur.label === ",") && prev && !VALUE_END.has(prev.label) && prev.label !== ";" && !prev.keyword) return { message: `L'opérateur «${shown(prev)}» a besoin d'une valeur après lui.`, fix: "Complétez l'expression avec une valeur après l'opérateur, par exemple : let y = 5 + 3;" };
  if (prev && cur && VALUE_END.has(prev.label) && (VALUE_START.has(cur.label) || (cur.keyword && VALUE_START.has(cur.keyword)))) {
    if (top && (top.label === "(" || top.label === "[")) return { message: `Une virgule «,» manque entre «${shown(prev)}» et «${shown(cur)}».`, fix: `Séparez les éléments par une virgule : ${shown(prev)}, ${shown(cur)}` };
    if (top && top.label === "{" && code.slice(top.end).match(/^\s*[\w"'$]+\s*:/)) return { message: `Une virgule «,» manque entre les propriétés de l'objet avant «${shown(cur)}».`, fix: "Séparez les propriétés de l'objet par une virgule : { a: 1, b: 2 }" };
    return { message: `«${shown(cur)}» vient directement après «${shown(prev)}» sans opérateur ni virgule entre les deux.`, fix: "Vérifiez la présence d'un opérateur (+, = ou .), d'un point-virgule ou d'une parenthèse ouvrante entre les deux parties." };
  }
  if (cur && cur.label === "=>" ) return { message: "La flèche => est mal placée.", fix: "Vérifiez la syntaxe de la fonction fléchée : (a, b) => a + b" };
  const tok = cur ? shown(cur) : code[pos];
  return { message: `Le symbole «${tok}» est inattendu à cet endroit.`, fix: "Vérifiez cette ligne et la ligne qui la précède : une parenthèse, une virgule ou un opérateur peut manquer." };
}

const RULES = [
  [/^Unterminated string constant/, () => ({ message: "La chaîne de caractères (string) n'a pas été fermée par un guillemet.", fix: "Fermez la chaîne avec le même guillemet que celui qui l'a ouverte, \" ou ', sur la même ligne, et utilisez ` pour les textes sur plusieurs lignes." })],
  [/^Unterminated template/, () => ({ message: "La chaîne de gabarit commençant par ` n'a pas été fermée.", fix: "Ajoutez ` à la fin du texte." })],
  [/^Unterminated comment/, () => ({ message: "Le commentaire multiligne /* n'a pas été fermé par */.", fix: "Ajoutez */ à la fin du commentaire." })],
  [/^Unterminated regular expression/, () => ({ message: "L'expression régulière (regex) commençant par / n'a pas été fermée.", fix: "Fermez l'expression par / sur la même ligne, ou vérifiez que ce / n'est pas une division incomplète." })],
  [/^Identifier '(.+)' has already been declared/, (m) => ({ message: `La variable «${m[1]}» est déjà déclarée dans le même bloc, elle ne peut donc pas être redéclarée avec let ou const.`, fix: `Pour modifier la valeur, supprimez let/const de la seconde déclaration : ${m[1]} = ..., ou choisissez un autre nom.` })],
  [/^'return' outside of function/, () => ({ message: "L'instruction return est écrite en dehors de toute fonction.", fix: "Placez return dans le corps d'une fonction, ou supprimez-la." })],
  [/^'import' and 'export' may appear only/, () => ({ message: "import et export ne fonctionnent pas dans un script classique.", fix: "Choisissez le type de fichier « Module ES », et dans HTML utilisez <script type=\"module\">." })],
  [/^Assigning to rvalue|^Invalid left-hand side/, () => ({ message: "Le côté gauche de l'affectation = n'est pas une variable dont la valeur peut être modifiée.", fix: "Si vous voulez une comparaison, utilisez === au lieu de =; sinon, placez un nom de variable à gauche de =." })],
  [/^Invalid regular expression flag/, () => ({ message: "Indicateur (flag) non valide après l'expression régulière.", fix: "Indicateurs autorisés : g i m s u y d v." })],
  [/^Invalid regular expression: (.*)/, (m) => ({ message: `Expression régulière non valide : ${m[1]}`, fix: "Vérifiez les parenthèses et les caractères spéciaux de l'expression, et utilisez un outil de test de Regex." })],
  [/^Unexpected character '(.*)'/, (m) => ({ message: `Le caractère «${m[1]}» n'est pas autorisé dans le code JavaScript à cet endroit.`, fix: /[“”‘’]/.test(m[1]) ? "Ce sont des guillemets « intelligents » provenant d'un traitement de texte ; remplacez-les par les guillemets droits \" ou '." : /[،؛]/.test(m[1]) ? "Il s'agit d'une virgule arabe ; utilisez plutôt la virgule « , » ou le point-virgule « ; »." : "Supprimez ce caractère, ou placez-le à l'intérieur d'un texte entre guillemets." })],
  [/^Unexpected keyword '(.*)'/, (m) => ({ message: `Le mot réservé «${m[1]}» apparaît à un endroit inapproprié.`, fix: `N'utilisez pas «${m[1]}» comme nom de variable ou de fonction, et vérifiez la syntaxe qui le précède.` })],
  [/^Cannot use keyword 'await' outside an async function|'await' is only valid/, () => ({ message: "Le mot-clé await ne peut être utilisé qu'à l'intérieur d'une fonction async.", fix: "Ajoutez async avant la fonction : async function f() { ... }." })],
  [/^Unsyntactic (break|continue)/, (m) => ({ message: `L'instruction ${m[1]} est écrite en dehors d'une boucle${m[1] === "break" ? " ou switch" : ""}.`, fix: `Placez ${m[1]} dans un for ou un while${m[1] === "break" ? " ou switch" : ""}, ou utilisez return pour sortir d'une fonction.` })],
  [/^Identifier directly after number/, () => ({ message: "Un nom suit directement un nombre, comme 3px ou 2x.", fix: "Placez la valeur entre guillemets, \"3px\", ou écrivez explicitement la multiplication : 2 * x." })],
  [/^let is disallowed as a lexically bound name/, () => ({ message: "Une variable ne peut pas être nommée let.", fix: "Choisissez un autre nom pour la variable." })],
  [/^The keyword '(.*)' is reserved/, (m) => ({ message: `«${m[1]}» est un mot réservé en JavaScript et ne peut pas servir de nom.`, fix: "Choisissez un autre nom pour la variable ou la fonction." })],
  [/^Argument name clash/, () => ({ message: "Deux paramètres portant le même nom apparaissent dans la définition de la fonction.", fix: "Donnez des noms différents aux paramètres de la fonction." })],
  [/^Complex binding patterns require an initialization value|^Missing initializer/, () => ({ message: "La décomposition (destructuring) dans une déclaration nécessite une valeur.", fix: "Par exemple, écrivez : const { a, b } = obj;" })],
  [/^Octal literal in strict mode|^Invalid number/, () => ({ message: "Format du nombre non valide.", fix: "Ne commencez pas les nombres par un zéro superflu ; utilisez 0o pour l'octal et 0x pour l'hexadécimal." })],
  [/^Bad escape sequence|^Invalid escape sequence|^Bad character escape/, () => ({ message: "Séquence d'échappement non valide après \\ dans le texte.", fix: "Utilisez \\\\ pour écrire une barre oblique inverse, ou une séquence valide comme \\n et \\t." })],
  [/^Label '(.*)' is already declared/, (m) => ({ message: `L'étiquette «${m[1]}» est déclarée deux fois.`, fix: "Renommez l'une des deux étiquettes." })],
  [/^Duplicate constructor/, () => ({ message: "La classe contient plus d'un constructor.", fix: "Assurez-vous que la classe ne contient qu'une seule fonction constructor." })],
  [/^Shorthand property assignments are valid only in destructuring/, () => ({ message: "Vous avez utilisé = à l'intérieur d'un objet au lieu des deux-points :.", fix: "Écrivez les propriétés sous la forme { key: value }." })],
  [/^Comma is not permitted after the rest element|^Rest element must be last/, () => ({ message: "Le paramètre de reste ... doit être le dernier.", fix: "Déplacez ...rest à la fin de la liste." })],
  [/^'with' in strict mode|^Deleting local variable in strict mode/, () => ({ message: "Cette syntaxe n'est pas autorisée en mode strict (strict mode).", fix: "Évitez with et la suppression de variables avec delete." })]
];

function syntaxIssue(code, err, sourceType) {
  const raw = String(err.message).replace(/\s*\(\d+:\d+\)\s*$/, "");
  const pos = Number.isInteger(err.pos) ? err.pos : 0;
  const { line, col } = err.loc ? { line: err.loc.line, col: err.loc.column } : lineCol(code, pos);
  let info = null;
  if (/^Unexpected token/.test(raw)) info = explainUnexpected(code, pos, sourceType);
  else for (const [re, fn] of RULES) { const m = raw.match(re); if (m) { info = fn(m); break; } }
  if (!info) info = { message: `Erreur de syntaxe : ${raw}`, fix: "Vérifiez cette ligne et la ligne qui la précède." };
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
        if (assigned && !guess) add(n, "warning", `La variable «${n.name}» reçoit une valeur sans être déclarée avec let ou const ; elle devient donc une variable globale (et une erreur en mode strict).`, `Déclarez-la d'abord : let ${n.name} = ...`);
        else add(n, guess ? "error" : "warning", `Le nom «${n.name}» n'est pas défini dans le code${guess ? `, vouliez-vous dire «${guess}» ?` : ""}, et provoquera une ReferenceError: ${n.name} is not defined à l'exécution.`, guess ? `Corrigez le nom en «${guess}».` : `Déclarez «${n.name}» avec let, const ou function avant de l'utiliser, ou assurez-vous qu'il s'agit d'une variable globale existante.`);
      }
    }
    if (n.type === "MemberExpression" && !n.computed && n.property.type === "Identifier" && n.property.name.length >= 4 && !MEMBERS.has(n.property.name)) {
      const p = n.property.name;
      const sorted = (w) => [...w.toLowerCase()].sort().join("");
      const guess = [...MEMBERS].find((m) => m.toLowerCase() === p.toLowerCase()) || [...MEMBERS].find((m) => m.length === p.length && sorted(m) === sorted(p) && distance(p, m) === 1) || (p.length >= 7 ? [...MEMBERS].find((m) => distance(p, m) === 1) : null);
      if (guess) add(n.property, "warning", `La propriété «${p}» ressemble à une faute de frappe dans «${guess}», et le résultat sera probablement undefined ou une TypeError: ${p} is not a function.`, `Écrivez .${guess}`);
    }
    if ((n.type === "AssignmentExpression" && n.left.type === "Identifier") || (n.type === "UpdateExpression" && n.argument.type === "Identifier")) {
      const id = n.type === "AssignmentExpression" ? n.left : n.argument;
      const d = declared.get(id.name);
      if (d && d.kinds.size === 1 && d.kinds.has("const")) add(id, "error", `La valeur de la constante «${id.name}» déclarée avec const ne peut pas être modifiée (TypeError: Assignment to constant variable).`, `Déclarez-la avec let au lieu de const si sa valeur doit changer : let ${id.name} = ...`);
    }
    if (n.type === "BinaryExpression" && (n.operator === "==" || n.operator === "!=")) {
      const isNull = (x) => x.type === "Literal" && x.value === null;
      if (!isNull(n.left) && !isNull(n.right)) {
        const opPos = code.indexOf(n.operator, n.left.end);
        const lc = lineCol(code, opPos);
        issues.push({ line: lc.line, col: lc.col, len: 2, severity: "warning", message: `La comparaison ${n.operator} convertit automatiquement les types (par exemple, "0" == 0 est vrai) et peut donner des résultats inattendus.`, fix: `Utilisez ${n.operator}= pour une comparaison stricte.` });
      }
    }
    if (n.type === "BinaryExpression" && /^[!=]==?$/.test(n.operator) && [n.left, n.right].some((x) => x.type === "Identifier" && x.name === "NaN")) add(n, "error", "Une comparaison avec NaN donne toujours false, car NaN n'est égal à aucune valeur, pas même à lui-même.", "Utilisez plutôt Number.isNaN(x).");
    if (n.type === "BinaryExpression" && /^[!=]==?$/.test(n.operator)) {
      const t = n.left.type === "UnaryExpression" && n.left.operator === "typeof" ? n.right : n.right.type === "UnaryExpression" && n.right.operator === "typeof" ? n.left : null;
      if (t && t.type === "Literal" && typeof t.value === "string" && !TYPEOF_OK.has(t.value)) add(t, "error", `typeof ne renvoie jamais "${t.value}" ; les valeurs possibles sont : undefined, object, boolean, number, string, function, symbol, bigint.`, `Corrigez le mot${closest(t.value, [...TYPEOF_OK]) ? ` en "${closest(t.value, [...TYPEOF_OK])}"` : ""}.`);
    }
    if ((n.type === "IfStatement" || n.type === "WhileStatement" || n.type === "DoWhileStatement") && n.test.type === "AssignmentExpression" && n.test.operator === "=") add(n.test, "warning", "Il y a une affectation = dans une condition ; la comparaison était probablement voulue.", "Utilisez === pour comparer : if (x === 5)");
    if ((n.type === "IfStatement" || n.type === "ForStatement" || n.type === "WhileStatement") && (n.consequent || n.body) && (n.consequent || n.body).type === "EmptyStatement") add(n.consequent || n.body, "warning", `Un point-virgule placé juste après la condition ${n.type === "IfStatement" ? "if" : "la boucle"} rend son corps vide ; ainsi le code qui suit n'est pas affecté par la condition.`, "Supprimez le ; placé après la parenthèse ).", 1);
    if (n.type === "VariableDeclaration" && n.kind === "var") add(n, "info", "var est ancien et sa portée est toute la fonction, ce qui peut causer des erreurs cachées.", "Utilisez let pour les variables et const pour les constantes.", 3);
    if (n.type === "ObjectExpression") {
      const seen = new Set();
      for (const p of n.properties) {
        if (p.type !== "Property" || p.computed || p.kind !== "init") continue;
        const k = p.key.type === "Identifier" ? p.key.name : String(p.key.value);
        if (seen.has(k)) add(p.key, "warning", `La clé «${k}» est dupliquée dans l'objet, et la dernière valeur remplace la première.`, "Supprimez l'une des deux clés ou renommez-la.");
        seen.add(k);
      }
    }
    if (n.type === "BlockStatement" || n.type === "Program" || n.type === "SwitchCase") {
      const body = n.type === "SwitchCase" ? n.consequent : n.body;
      for (let i = 0; i < body.length - 1; i++) {
        if (ENDS.has(body[i].type)) {
          const next = body.slice(i + 1).find((s) => s.type !== "FunctionDeclaration" && s.type !== "EmptyStatement");
          if (next) add(next, "warning", `Ce code ne sera jamais exécuté car il se trouve après ${({ ReturnStatement: "return", ThrowStatement: "throw", BreakStatement: "break", ContinueStatement: "continue" })[body[i].type]}.`, "Supprimez-le, ou déplacez-le avant cette instruction.");
          break;
        }
      }
    }
    if (n.type === "SwitchStatement") {
      n.cases.forEach((c, i) => {
        if (i === n.cases.length - 1 || !c.consequent.length) return;
        const last = c.consequent[c.consequent.length - 1];
        const ends = ENDS.has(last.type) || (last.type === "BlockStatement" && last.body.length && ENDS.has(last.body[last.body.length - 1].type));
        if (!ends) add(c, "warning", "Ce cas case ne se termine pas par break, donc l'exécution se poursuivra vers le cas suivant.", "Ajoutez break; à la fin du cas si la poursuite n'est pas voulue.", 4);
      });
    }
    if (n.type === "CatchClause" && !n.body.body.length) add(n, "info", "Un bloc catch vide masque les erreurs, on ne peut donc pas savoir quelle en est la cause.", "Affichez au moins l'erreur : console.error(err);", 5);
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
      issues.push({ line: d.node.loc.start.line, col: d.node.loc.start.column, len: name.length, severity: "info", message: `La fonction «${name}» est définie mais n'est pas appelée dans ce code.`, fix: "Appelez-la, ou supprimez-la si elle n'est pas nécessaire." });
      continue;
    }
    issues.push({ line: d.node.loc.start.line, col: d.node.loc.start.column, len: name.length, severity: "info", message: `«${name}» est défini mais jamais utilisé.`, fix: "Supprimez-le si vous n'en avez pas besoin." });
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
  const mode = choice(input, "mode", "Type de fichier", ["script", "module"], "script");
  const res = check(code, mode);
  const lines = code.split("\n").length;
  const linesWord = lines === 1 ? "une ligne" : lines === 2 ? "deux lignes" : lines <= 10 ? `${lines} lignes` : `${lines} lignes`;
  const steps = [`Nous avons analysé ${linesWord} avec l'analyseur JavaScript (Acorn) selon la dernière norme ECMAScript, en tant que ${mode === "module" ? "module ES" : "Script classique"}.`];
  let extra = {};
  if (!res.ok) {
    const e = res.issues[0];
    steps.push(`L'analyseur s'est arrêté à la première erreur de syntaxe, à la ligne ${e.line}, colonne ${e.col + 1}. Message d'origine du moteur : ${e.english}.`);
    steps.push(`Explication : ${e.message}`);
    steps.push(`Correction : ${e.fix}`);
    steps.push("Après avoir corrigé cette erreur, relancez la vérification, car d'autres erreurs qui étaient masquées peuvent apparaître.");
  } else {
    let fns = 0;
    walk(res.ast, null, (n) => { if (/Function/.test(n.type)) fns++; });
    extra = { "Nombre de lignes": lines, "Nombre de fonctions": fns };
    steps.push("Aucune erreur de syntaxe trouvée, le code peut donc être exécuté.");
    steps.push("Nous avons ensuite vérifié les erreurs logiques courantes : les noms non déclarés et leurs fautes de frappe, la modification des constantes, la comparaison ==, l'affectation dans les conditions, le code qui ne s'exécute jamais, les clés dupliquées et les cas switch sans break.");
    steps.push("Remarque : la vérification est statique (sans exécution du code), elle ne détecte donc pas forcément les erreurs qui n'apparaissent qu'à l'exécution.");
  }
  const out = report(code, res.issues, extra);
  return { results: out.results, steps, blocks: out.blocks, copy: out.copy };
}
