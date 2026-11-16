import * as acorn from "../../vendor/acorn/acorn.mjs";
import { choice } from "../core/validate.js";
import { readCode, report, lineCol, closest, distance } from "./code-view.js";

export const meta = {
  description: "JavaScript kodunu yapıştırın; sözdizimi hatalarını Türkçe açıklamasıyla ve düzeltme yoluyla bulur, tanımsız değişkenler, yazım hataları ve === yerine == gibi yaygın hatalar için uyarılar verir.",
  keywords: ["javascript", "js", "kod denetimi", "hata ayıklama", "syntax error", "linter", "JavaScript", "programlama hatası"],
  formulas: [{ label: "Kod bir sözdizimi ağacına (AST) çözümlenir, ardından yaygın hata kuralları denetlenir", tex: "\\text{code} \\xrightarrow{\\text{parser}} \\text{AST} \\xrightarrow{\\text{rules}} \\text{issues}" }],
  inputs: [
    { id: "code", label: "JavaScript kodu", type: "textarea", rows: 12, wide: true, placeholder: "function sum(a, b) {\n  return a + b;\n}" },
    { id: "mode", label: "Dosya türü", type: "select", default: "script", options: [["script", "Normal betik"], ["module", "ES Module modülü (import/export kullanır)"]] }
  ],
  example: {
    values: { code: "function average(list) {\n  let total = 0;\n  for (let i = 0; i < list.length; i++) {\n    total += list[i];\n  }\n  if (list.length == 0) return 0;\n  return totl / list.length;\n}\nconsole.log(average([4, 8, 6]));", mode: "script" },
    expect: ["totl", "total"],
    note: "Örnek: bir değişken adında yazım hatası ve === yerine == kullanılan bir ortalama hesaplama fonksiyonu."
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
    if (stack.length === 1) return { message: `Kod bitti; satır ${top.line}'deki «${top.label}» parantezi kapatılmadı.`, fix: `Uygun yere «${OPENERS[top.label]}» ekleyerek kapatın.`, at: top };
    if (stack.length > 1) {
      const inner = stack.find((t, i) => (t.label === "(" || t.label === "[") && stack[i + 1] && stack[i + 1].label === "{" && stack[i + 1].line === t.line);
      const list = stack.map((t) => `«${t.label}», satır ${t.line}`).join("، ");
      if (inner) return { message: `«{» öncesinde satır ${inner.line}'deki «${inner.label}» parantezi kapatılmadı; kapatılmamış parantezler: ${list}.`, fix: `«{» öncesine «${OPENERS[inner.label]}» ekleyin (satır ${inner.line}), ardından kalan parantezleri kapatın.`, at: inner };
      return { message: `Kod bitti; şu parantezler kapatılmadı: ${list}.`, fix: `Ters sırada kapatın: ${stack.map((t) => OPENERS[t.label]).reverse().join(" ")}`, at: stack[0] };
    }
    return { message: "Kod son ifade tamamlanmadan bitti.", fix: "Son ifadeyi tamamlayın; örneğin = işaretinden sonra bir değer verin." };
  }
  if (prev && prev.value === "await" && prev.label === "name") return { message: "await kelimesi yalnızca bir async fonksiyonunun içinde (ya da ES Module'de) kullanılabilir.", fix: "Fonksiyondan önce async ekleyin: async function f() { await ... }, ya da dosya türü olarak «ES Module modülü» seçin." };
  if (prev && prev2 && prev2.keyword === "const" && prev.label === "name" && cur && (cur.label === ";" || cur.label === ",")) return { message: `const ile tanımlanan «${prev.value}» sabiti, tanımlandığında bir değer almalıdır.`, fix: `const ${prev.value} = değer; yazın, ya da değer sonradan verilecekse let kullanın.` };
  if (prev && prev.keyword === "class" && cur && cur.label === "{") return { message: "class tanımında class kelimesinden sonra bir ad gerekir.", fix: "class MyClass { ... } yazın." };
  if (cur && cur.label === "{" && top && top.label === "(") return { message: `Satır ${top.line}'deki «(» parantezi, «{» öncesinde kapatılmadı.`, fix: "Kıvrık parantez «{» öncesine «)» ekleyin, örneğin: if (x > 1) {" , at: top };
  if (cur && CLOSERS.has(cur.label)) {
    if (top && OPENERS[top.label] !== cur.label) return { message: `«${cur.label}» parantezi, satır ${top.line}'deki «${top.label}» ile eşleşmiyor.`, fix: `Önce «${top.label}» işaretini «${OPENERS[top.label]}» ile kapatın, ya da fazla parantezi silin.` };
    if (!top) return { message: `«${cur.label}» kapanış parantezi fazla; karşılığında açılış parantezi yok.`, fix: "Bu parantezi silin ya da önüne eksik açılış parantezini ekleyin." };
    if (prev && !VALUE_END.has(prev.label) && prev.label !== "," && prev.label !== "(" && prev.label !== "[" && prev.label !== "{") return { message: `«${shown(prev)}» işleci, «${cur.label}» öncesinde bir değere ihtiyaç duyar.`, fix: "İşlecin sonrasına bir değer yazın ya da fazla işleci silin." };
  }
  if (cur && (cur.label === ";" || cur.label === ",") && prev && !VALUE_END.has(prev.label) && prev.label !== ";" && !prev.keyword) return { message: `«${shown(prev)}» işlecinden sonra bir değer gerekir.`, fix: "İfadeyi işleçten sonra bir değerle tamamlayın, örneğin: let y = 5 + 3;" };
  if (prev && cur && VALUE_END.has(prev.label) && (VALUE_START.has(cur.label) || (cur.keyword && VALUE_START.has(cur.keyword)))) {
    if (top && (top.label === "(" || top.label === "[")) return { message: `«${shown(prev)}» ile «${shown(cur)}» arasında «,» virgülü eksik.`, fix: `Öğeleri virgülle ayırın: ${shown(prev)}, ${shown(cur)}` };
    if (top && top.label === "{" && code.slice(top.end).match(/^\s*[\w"'$]+\s*:/)) return { message: `«${shown(cur)}» öncesinde nesne özellikleri arasında «,» virgülü eksik.`, fix: "Nesne özelliklerini virgülle ayırın: { a: 1, b: 2 }" };
    return { message: `«${shown(cur)}», «${shown(prev)}» ardından hemen geldi; aralarında işleç ya da virgül yok.`, fix: "İki parça arasında bir işleç (+, = ya da .), noktalı virgül ya da eksik parantez olup olmadığını denetleyin." };
  }
  if (cur && cur.label === "=>" ) return { message: "=> oku yanlış bir yerde.", fix: "Ok fonksiyonunun biçimini denetleyin: (a, b) => a + b" };
  const tok = cur ? shown(cur) : code[pos];
  return { message: `«${tok}» simgesi bu konumda beklenmiyor.`, fix: "Aynı satıra ve bir önceki satıra bakın: bir parantez, virgül ya da işleç eksik olabilir." };
}

const RULES = [
  [/^Unterminated string constant/, () => ({ message: "Metin (string) tırnak işaretiyle kapatılmadı.", fix: "Metni açtığınız tırnak işaretiyle (\" ya da ') aynı satırda kapatın; çok satırlı metinler için ` kullanın." })],
  [/^Unterminated template/, () => ({ message: "` ile başlayan şablon metni kapatılmadı.", fix: "Metnin sonuna ` ekleyin." })],
  [/^Unterminated comment/, () => ({ message: "/* ile başlayan çok satırlı yorum */ ile kapatılmadı.", fix: "Yorumun sonuna */ ekleyin." })],
  [/^Unterminated regular expression/, () => ({ message: "/ ile başlayan düzenli ifade (regex) kapatılmadı.", fix: "İfadeyi aynı satırda / ile kapatın, ya da buradaki / işaretinin eksik taraflı bir bölme olmadığından emin olun." })],
  [/^Identifier '(.+)' has already been declared/, (m) => ({ message: `«${m[1]}» değişkeni aynı kapsamda zaten tanımlı; let ya da const ile yeniden tanımlanamaz.`, fix: `Değeri değiştirmek için ikinci tanımdan let/const kaldırın: ${m[1]} = ..., ya da başka bir ad seçin.` })],
  [/^'return' outside of function/, () => ({ message: "return ifadesi bir fonksiyonun dışında yazılmış.", fix: "return'ü bir fonksiyon gövdesinin içine koyun ya da silin." })],
  [/^'import' and 'export' may appear only/, () => ({ message: "import ve export normal betikte çalışmaz.", fix: "Dosya türü olarak «ES Module modülü» seçin; HTML'de <script type=\"module\"> kullanın." })],
  [/^Assigning to rvalue|^Invalid left-hand side/, () => ({ message: "Atama işleci = in sol tarafı, değeri değiştirilebilecek bir değişken değil.", fix: "Karşılaştırma yapmak istiyorsanız = yerine === kullanın; aksi halde = işaretinin soluna bir değişken adı yazın." })],
  [/^Invalid regular expression flag/, () => ({ message: "Düzenli ifadeden sonra geçersiz bir bayrak (flag) var.", fix: "İzin verilen bayraklar: g i m s u y d v." })],
  [/^Invalid regular expression: (.*)/, (m) => ({ message: `Geçersiz düzenli ifade: ${m[1]}`, fix: "İfadedeki parantezleri ve özel simgeleri denetleyin; bir Regex test aracı kullanın." })],
  [/^Unexpected character '(.*)'/, (m) => ({ message: `«${m[1]}» karakteri burada JavaScript kodunda izin verilmiyor.`, fix: /[“”‘’]/.test(m[1]) ? "Bu, bir metin programından gelen «akıllı» tırnak işareti; normal \" ya da ' ile değiştirin." : /[،؛]/.test(m[1]) ? "Bu Arapça bir virgül; standart , ya da ; kullanın." : "Bu karakteri silin ya da çift tırnak işaretleri arasında bir metnin içine koyun." })],
  [/^Unexpected keyword '(.*)'/, (m) => ({ message: `Ayrılmış «${m[1]}» sözcüğü uygunsuz bir yerde kullanılmış.`, fix: `«${m[1]}» sözcüğünü değişken ya da fonksiyon adı olarak kullanmayın; önündeki sözdizimini denetleyin.` })],
  [/^Cannot use keyword 'await' outside an async function|'await' is only valid/, () => ({ message: "await kelimesi yalnızca bir async fonksiyonunun içinde kullanılabilir.", fix: "Fonksiyondan önce async ekleyin: async function f() { ... }." })],
  [/^Unsyntactic (break|continue)/, (m) => ({ message: `${m[1]} ifadesi bir döngünün dışında yazılmış${m[1] === "break" ? " ya da switch" : ""}.`, fix: `${m[1]} ifadesini for ya da while${m[1] === "break" ? " ya da switch" : ""} içine koyun, ya da fonksiyondan çıkmak için return kullanın.` })],
  [/^Identifier directly after number/, () => ({ message: "Bir sayının hemen ardından bir ad geldi, ör. 3px ya da 2x.", fix: "Değeri \"3px\" gibi tırnak işaretleri arasına alın, ya da çarpma işlemini açıkça 2 * x olarak yazın." })],
  [/^let is disallowed as a lexically bound name/, () => ({ message: "let adı değişken adı olarak kullanılamaz.", fix: "Değişken için başka bir ad seçin." })],
  [/^The keyword '(.*)' is reserved/, (m) => ({ message: `«${m[1]}» JavaScript'te ayrılmış bir sözcüktür, ad olarak kullanılamaz.`, fix: "Değişken ya da fonksiyon için başka bir ad seçin." })],
  [/^Argument name clash/, () => ({ message: "Fonksiyon tanımında aynı ada sahip iki parametre var.", fix: "Fonksiyon parametrelerinin adlarını farklı yapın." })],
  [/^Complex binding patterns require an initialization value|^Missing initializer/, () => ({ message: "Tanımdaki yıkma (destructuring) bir değer gerektirir.", fix: "Örneğin şöyle yazın: const { a, b } = obj;" })],
  [/^Octal literal in strict mode|^Invalid number/, () => ({ message: "Sayı biçimi geçersiz.", fix: "Sayıların başına fazla sıfır koymayın; sekizlik taban için 0o, onaltılık taban için 0x kullanın." })],
  [/^Bad escape sequence|^Invalid escape sequence|^Bad character escape/, () => ({ message: "Metnin içinde ters eğik çizgi \\ sonrasında geçersiz bir kaçış dizisi (escape) var.", fix: "Ters eğik çizgi yazmak için \\\\ kullanın, ya da \\n ve \\t gibi geçerli bir kaçış dizisi yazın." })],
  [/^Label '(.*)' is already declared/, (m) => ({ message: `«${m[1]}» etiketi iki kez tanımlanmış.`, fix: "İki etiketten birinin adını değiştirin." })],
  [/^Duplicate constructor/, () => ({ message: "Sınıfta birden fazla constructor var.", fix: "Sınıfta yalnızca bir constructor fonksiyonu bulunsun." })],
  [/^Shorthand property assignments are valid only in destructuring/, () => ({ message: "Nesnede iki nokta : yerine = kullandınız.", fix: "Özellikleri { key: value } biçiminde yazın." })],
  [/^Comma is not permitted after the rest element|^Rest element must be last/, () => ({ message: "Kalan parametre ... en son olmalıdır.", fix: "...rest'i listenin sonuna taşıyın." })],
  [/^'with' in strict mode|^Deleting local variable in strict mode/, () => ({ message: "Bu biçim katı mod (strict mode) içinde izin verilmez.", fix: "with kullanmaktan ve değişkenleri delete ile silmekten kaçının." })]
];

function syntaxIssue(code, err, sourceType) {
  const raw = String(err.message).replace(/\s*\(\d+:\d+\)\s*$/, "");
  const pos = Number.isInteger(err.pos) ? err.pos : 0;
  const { line, col } = err.loc ? { line: err.loc.line, col: err.loc.column } : lineCol(code, pos);
  let info = null;
  if (/^Unexpected token/.test(raw)) info = explainUnexpected(code, pos, sourceType);
  else for (const [re, fn] of RULES) { const m = raw.match(re); if (m) { info = fn(m); break; } }
  if (!info) info = { message: `Sözdizimi hatası: ${raw}`, fix: "Bu satırı ve bir önceki satırı denetleyin." };
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
        if (assigned && !guess) add(n, "warning", `«${n.name}» değişkenine let ya da const ile tanımlanmadan atama yapılıyor; bu, genel bir değişken oluşturur (katı modda hatadır).`, `Önce tanımlayın: let ${n.name} = ...`);
        else add(n, guess ? "error" : "warning", `«${n.name}» adı kodda tanımlı değil${guess ? `, belki de «${guess}» demek istediniz` : ""}; çalıştırıldığında ReferenceError: ${n.name} is not defined hatasına yol açar.`, guess ? `Adı «${guess}» olarak düzeltin.` : `«${n.name}» adını kullanmadan önce let, const ya da function ile tanımlayın ya da var olan bir genel değişken olduğundan emin olun.`);
      }
    }
    if (n.type === "MemberExpression" && !n.computed && n.property.type === "Identifier" && n.property.name.length >= 4 && !MEMBERS.has(n.property.name)) {
      const p = n.property.name;
      const sorted = (w) => [...w.toLowerCase()].sort().join("");
      const guess = [...MEMBERS].find((m) => m.toLowerCase() === p.toLowerCase()) || [...MEMBERS].find((m) => m.length === p.length && sorted(m) === sorted(p) && distance(p, m) === 1) || (p.length >= 7 ? [...MEMBERS].find((m) => distance(p, m) === 1) : null);
      if (guess) add(n.property, "warning", `«${p}» özelliği «${guess}» üzerinde yazım hatası gibi görünüyor; sonuç çoğunlukla undefined ya da TypeError: ${p} is not a function olur.`, `.${guess} yazın`);
    }
    if ((n.type === "AssignmentExpression" && n.left.type === "Identifier") || (n.type === "UpdateExpression" && n.argument.type === "Identifier")) {
      const id = n.type === "AssignmentExpression" ? n.left : n.argument;
      const d = declared.get(id.name);
      if (d && d.kinds.size === 1 && d.kinds.has("const")) add(id, "error", `const ile tanımlanan «${id.name}» sabitinin değeri değiştirilemez (TypeError: Assignment to constant variable).`, `Değeri değişecekse const yerine let ile tanımlayın: let ${id.name} = ...`);
    }
    if (n.type === "BinaryExpression" && (n.operator === "==" || n.operator === "!=")) {
      const isNull = (x) => x.type === "Literal" && x.value === null;
      if (!isNull(n.left) && !isNull(n.right)) {
        const opPos = code.indexOf(n.operator, n.left.end);
        const lc = lineCol(code, opPos);
        issues.push({ line: lc.line, col: lc.col, len: 2, severity: "warning", message: `${n.operator} karşılaştırması türleri otomatik çevirir (ör. "0" == 0 doğrudur); beklenmedik sonuçlar verebilir.`, fix: `Katı karşılaştırma için ${n.operator}= kullanın.` });
      }
    }
    if (n.type === "BinaryExpression" && /^[!=]==?$/.test(n.operator) && [n.left, n.right].some((x) => x.type === "Identifier" && x.name === "NaN")) add(n, "error", "NaN ile karşılaştırma her zaman false verir, çünkü NaN kendisi dahil hiçbir değere eşit değildir.", "Bunun yerine Number.isNaN(x) kullanın.");
    if (n.type === "BinaryExpression" && /^[!=]==?$/.test(n.operator)) {
      const t = n.left.type === "UnaryExpression" && n.left.operator === "typeof" ? n.right : n.right.type === "UnaryExpression" && n.right.operator === "typeof" ? n.left : null;
      if (t && t.type === "Literal" && typeof t.value === "string" && !TYPEOF_OK.has(t.value)) add(t, "error", `typeof asla "${t.value}" döndürmez; olası değerler: undefined, object, boolean, number, string, function, symbol, bigint.`, `Sözcüğü düzeltin${closest(t.value, [...TYPEOF_OK]) ? ` → "${closest(t.value, [...TYPEOF_OK])}"` : ""}.`);
    }
    if ((n.type === "IfStatement" || n.type === "WhileStatement" || n.type === "DoWhileStatement") && n.test.type === "AssignmentExpression" && n.test.operator === "=") add(n.test, "warning", "Koşulda = atama işleci var; büyük olasılıkla karşılaştırma (==) amaçlanmış.", "Karşılaştırma için === kullanın: if (x === 5)");
    if ((n.type === "IfStatement" || n.type === "ForStatement" || n.type === "WhileStatement") && (n.consequent || n.body) && (n.consequent || n.body).type === "EmptyStatement") add(n.consequent || n.body, "warning", `${n.type === "IfStatement" ? "if" : "döngü"} koşulundan hemen sonra noktalı virgül, gövdesini boş yapar; bu yüzden izleyen kod koşuldan etkilenmez.`, ") parantezinden sonraki ; işaretini silin.", 1);
    if (n.type === "VariableDeclaration" && n.kind === "var") add(n, "info", "var eski bir anahtar sözcüktür ve kapsamı tüm fonksiyondur; bu da gizli hatalara yol açabilir.", "Değişkenler için let, sabitler için const kullanın.", 3);
    if (n.type === "ObjectExpression") {
      const seen = new Set();
      for (const p of n.properties) {
        if (p.type !== "Property" || p.computed || p.kind !== "init") continue;
        const k = p.key.type === "Identifier" ? p.key.name : String(p.key.value);
        if (seen.has(k)) add(p.key, "warning", `«${k}» anahtarı nesnede yinelenmiş; son değer ilkini geçersiz kılar.`, "İki anahtardan birini silin ya da adını değiştirin.");
        seen.add(k);
      }
    }
    if (n.type === "BlockStatement" || n.type === "Program" || n.type === "SwitchCase") {
      const body = n.type === "SwitchCase" ? n.consequent : n.body;
      for (let i = 0; i < body.length - 1; i++) {
        if (ENDS.has(body[i].type)) {
          const next = body.slice(i + 1).find((s) => s.type !== "FunctionDeclaration" && s.type !== "EmptyStatement");
          if (next) add(next, "warning", `Bu kod asla çalıştırılmayacak, çünkü ${({ ReturnStatement: "return", ThrowStatement: "throw", BreakStatement: "break", ContinueStatement: "continue" })[body[i].type]} ifadesinden sonra geliyor.`, "Bunu silin ya da o ifadeden önceye taşıyın.");
          break;
        }
      }
    }
    if (n.type === "SwitchStatement") {
      n.cases.forEach((c, i) => {
        if (i === n.cases.length - 1 || !c.consequent.length) return;
        const last = c.consequent[c.consequent.length - 1];
        const ends = ENDS.has(last.type) || (last.type === "BlockStatement" && last.body.length && ENDS.has(last.body[last.body.length - 1].type));
        if (!ends) add(c, "warning", "Bu case, break ile bitmiyor; bu yüzden çalıştırma bir sonraki duruma geçer.", "Devam etmek istenmiyorsa case'in sonuna break; ekleyin.", 4);
      });
    }
    if (n.type === "CatchClause" && !n.body.body.length) add(n, "info", "Boş bir catch bloğu hataları gizler ve nedenini anlamanızı engeller.", "En azından hatayı yazdırın: console.error(err);", 5);
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
      issues.push({ line: d.node.loc.start.line, col: d.node.loc.start.column, len: name.length, severity: "info", message: `«${name}» fonksiyonu tanımlanmış ama bu kodda çağrılmıyor.`, fix: "Çağırın ya da gerekli değilse silin." });
      continue;
    }
    issues.push({ line: d.node.loc.start.line, col: d.node.loc.start.column, len: name.length, severity: "info", message: `«${name}» tanımlanmış ama kullanılmıyor.`, fix: "İhtiyacınız yoksa silin." });
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
  const mode = choice(input, "mode", "Dosya türü", ["script", "module"], "script");
  const res = check(code, mode);
  const lines = code.split("\n").length;
  const linesWord = lines === 1 ? "bir satır" : lines === 2 ? "iki satır" : lines <= 10 ? `${lines} satır` : `${lines} satır`;
  const steps = [`${linesWord} JavaScript çözümleyicisi (Acorn) ile en güncel ECMAScript standardına göre çözümlendi, ${mode === "module" ? "ES Module modülü" : "Normal betik"} olarak.`];
  let extra = {};
  if (!res.ok) {
    const e = res.issues[0];
    steps.push(`Çözümleyici ${e.line}. satır, ${e.col + 1}. sütundaki ilk sözdizimi hatasında durdu. Motorun özgün mesajı: ${e.english}.`);
    steps.push(`Açıklama: ${e.message}`);
    steps.push(`Düzeltme: ${e.fix}`);
    steps.push("Bu hatayı düzelttikten sonra denetimi yeniden çalıştırın; arkasında gizli kalmış başka hatalar çıkabilir.");
  } else {
    let fns = 0;
    walk(res.ast, null, (n) => { if (/Function/.test(n.type)) fns++; });
    extra = { "Satır sayısı": lines, "Fonksiyon sayısı": fns };
    steps.push("Sözdizimi hatası yok, kod çalıştırılabilir.");
    steps.push("Ardından yaygın mantık hatalarını denetledik: tanımsız adlar ve bunların yazım hataları, sabitlerin değiştirilmesi, ==, koşullarda atama, çalışmayan kod, yinelenen anahtarlar ve break içermeyen switch durumları.");
    steps.push("Not: denetim kodu çalıştırmadan yapılır; bu yüzden yalnızca çalışma sırasında ortaya çıkan hataları yakalayamayabilir.");
  }
  const out = report(code, res.issues, extra);
  return { results: out.results, steps, blocks: out.blocks, copy: out.copy };
}
