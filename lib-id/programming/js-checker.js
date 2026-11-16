import * as acorn from "../../vendor/acorn/acorn.mjs";
import { choice } from "../core/validate.js";
import { readCode, report, lineCol, closest, distance } from "./code-view.js";

export const meta = {
  description: "Tempelkan kode JavaScript untuk mendeteksi kesalahan sintaks, dengan penjelasan setiap kesalahan dalam bahasa Indonesia dan cara memperbaikinya, serta peringatan untuk kesalahan umum seperti variabel yang tidak dideklarasikan, salah ketik, dan == yang dipakai sebagai ganti ===.",
  keywords: ["javascript", "js", "Pemeriksaan kode", "Debugging", "syntax error", "linter", "JavaScript", "kesalahan pemrograman"],
  formulas: [{ label: "Kode diurai menjadi pohon sintaks (AST), lalu aturan kesalahan umum diperiksa", tex: "\\text{code} \\xrightarrow{\\text{parser}} \\text{AST} \\xrightarrow{\\text{rules}} \\text{issues}" }],
  inputs: [
    { id: "code", label: "Kode JavaScript", type: "textarea", rows: 12, wide: true, placeholder: "function sum(a, b) {\n  return a + b;\n}" },
    { id: "mode", label: "Jenis berkas", type: "select", default: "script", options: [["script", "Skrip biasa"], ["module", "Modul ES (menggunakan import/export)"]] }
  ],
  example: {
    values: { code: "function average(list) {\n  let total = 0;\n  for (let i = 0; i < list.length; i++) {\n    total += list[i];\n  }\n  if (list.length == 0) return 0;\n  return totl / list.length;\n}\nconsole.log(average([4, 8, 6]));", mode: "script" },
    expect: ["totl", "total"],
    note: "Contoh: fungsi rata-rata dengan salah ketik pada nama variabel, dan == dipakai sebagai ganti ===."
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
    if (stack.length === 1) return { message: `Kode berakhir dan kurung «${top.label}» yang dibuka di baris ${top.line} belum ditutup.`, fix: `Tambahkan «${OPENERS[top.label]}» di tempat yang sesuai untuk menutupnya.`, at: top };
    if (stack.length > 1) {
      const inner = stack.find((t, i) => (t.label === "(" || t.label === "[") && stack[i + 1] && stack[i + 1].label === "{" && stack[i + 1].line === t.line);
      const list = stack.map((t) => `«${t.label}» di baris ${t.line}`).join("، ");
      if (inner) return { message: `Kurung «${inner.label}» yang dibuka di baris ${inner.line} belum ditutup sebelum «{», dan kurung yang belum ditutup adalah: ${list}.`, fix: `Tambahkan «${OPENERS[inner.label]}» sebelum «{» di baris ${inner.line}, lalu tutup kurung yang tersisa.`, at: inner };
      return { message: `Kode berakhir dan kurung berikut belum ditutup: ${list}.`, fix: `Tutup secara terbalik: ${stack.map((t) => OPENERS[t.label]).reverse().join(" ")}`, at: stack[0] };
    }
    return { message: "Kode berakhir sebelum pernyataan terakhir selesai.", fix: "Lengkapi pernyataan terakhir, misalnya beri nilai setelah = atau lengkapi ekspresinya." };
  }
  if (prev && prev.value === "await" && prev.label === "name") return { message: "Kata kunci await hanya dapat digunakan di dalam fungsi async (atau di dalam Modul ES).", fix: "Tambahkan async sebelum fungsi: async function f() { await ... }, atau pilih jenis berkas «Modul ES»." };
  if (prev && prev2 && prev2.keyword === "const" && prev.label === "name" && cur && (cur.label === ";" || cur.label === ",")) return { message: `Konstanta «${prev.value}» yang dideklarasikan dengan const harus diberi nilai saat dideklarasikan.`, fix: `Tulis const ${prev.value} = nilai; atau gunakan let jika nilainya akan diberikan nanti.` };
  if (prev && prev.keyword === "class" && cur && cur.label === "{") return { message: "Deklarasi kelas class memerlukan nama setelah kata kunci class.", fix: "Tulis class MyClass { ... }." };
  if (cur && cur.label === "{" && top && top.label === "(") return { message: `Kurung «(» yang dibuka di baris ${top.line} belum ditutup sebelum «{».`, fix: "Tambahkan «)» sebelum kurung kurawal {, misalnya: if (x > 1) {" , at: top };
  if (cur && CLOSERS.has(cur.label)) {
    if (top && OPENERS[top.label] !== cur.label) return { message: `Kurung «${cur.label}» tidak cocok dengan kurung «${top.label}» yang dibuka di baris ${top.line}.`, fix: `Tutup «${top.label}» dengan «${OPENERS[top.label]}» terlebih dahulu, atau hapus kurung yang berlebih.` };
    if (!top) return { message: `Kurung tutup «${cur.label}» berlebih dan tidak memiliki kurung buka yang sesuai.`, fix: "Hapus kurung ini, atau tambahkan kurung buka yang kurang sebelumnya." };
    if (prev && !VALUE_END.has(prev.label) && prev.label !== "," && prev.label !== "(" && prev.label !== "[" && prev.label !== "{") return { message: `Operator «${shown(prev)}» memerlukan nilai setelahnya, sebelum «${cur.label}».`, fix: "Lengkapi ekspresi dengan nilai setelah operator, atau hapus operator yang berlebih." };
  }
  if (cur && (cur.label === ";" || cur.label === ",") && prev && !VALUE_END.has(prev.label) && prev.label !== ";" && !prev.keyword) return { message: `Operator «${shown(prev)}» memerlukan nilai setelahnya.`, fix: "Lengkapi ekspresi dengan nilai setelah operator, misalnya: let y = 5 + 3;" };
  if (prev && cur && VALUE_END.has(prev.label) && (VALUE_START.has(cur.label) || (cur.keyword && VALUE_START.has(cur.keyword)))) {
    if (top && (top.label === "(" || top.label === "[")) return { message: `Tanda koma «,» hilang di antara «${shown(prev)}» dan «${shown(cur)}».`, fix: `Pisahkan item dengan koma: ${shown(prev)}, ${shown(cur)}` };
    if (top && top.label === "{" && code.slice(top.end).match(/^\s*[\w"'$]+\s*:/)) return { message: `Tanda koma «,» hilang di antara properti objek sebelum «${shown(cur)}».`, fix: "Pisahkan properti objek dengan koma: { a: 1, b: 2 }" };
    return { message: `«${shown(cur)}» langsung mengikuti «${shown(prev)}» tanpa operator atau koma di antara keduanya.`, fix: "Periksa adanya operator (+, = atau .), titik koma, atau kurung buka di antara kedua bagian tersebut." };
  }
  if (cur && cur.label === "=>" ) return { message: "Tanda panah => berada di tempat yang tidak tepat.", fix: "Periksa sintaks fungsi panah: (a, b) => a + b" };
  const tok = cur ? shown(cur) : code[pos];
  return { message: `Token «${tok}» tidak diharapkan di posisi ini.`, fix: "Periksa baris ini dan baris sebelumnya: mungkin ada kurung, koma, atau operator yang kurang." };
}

const RULES = [
  [/^Unterminated string constant/, () => ({ message: "String (string) tidak ditutup dengan tanda kutip.", fix: "Tutup string dengan tanda kutip yang sama seperti pembukanya, \" atau ', pada baris yang sama, dan gunakan ` untuk teks multibaris." })],
  [/^Unterminated template/, () => ({ message: "String template yang dimulai dengan ` tidak ditutup.", fix: "Tambahkan ` di akhir teks." })],
  [/^Unterminated comment/, () => ({ message: "Komentar multibaris /* tidak ditutup dengan */.", fix: "Tambahkan */ di akhir komentar." })],
  [/^Unterminated regular expression/, () => ({ message: "Ekspresi reguler (regex) yang dimulai dengan / tidak ditutup.", fix: "Tutup ekspresi dengan / pada baris yang sama, atau pastikan / ini bukan pembagian yang tidak lengkap." })],
  [/^Identifier '(.+)' has already been declared/, (m) => ({ message: `Variabel «${m[1]}» sudah dideklarasikan dalam cakupan yang sama, sehingga tidak dapat dideklarasikan lagi dengan let atau const.`, fix: `Untuk mengubah nilainya, hapus let/const dari deklarasi kedua: ${m[1]} = ..., atau pilih nama lain.` })],
  [/^'return' outside of function/, () => ({ message: "Pernyataan return ditulis di luar fungsi mana pun.", fix: "Letakkan return di dalam badan fungsi, atau hapus." })],
  [/^'import' and 'export' may appear only/, () => ({ message: "import dan export tidak berfungsi di dalam skrip biasa.", fix: "Pilih jenis berkas «Modul ES», dan di HTML gunakan <script type=\"module\">." })],
  [/^Assigning to rvalue|^Invalid left-hand side/, () => ({ message: "Sisi kiri dari operasi penugasan = bukan variabel yang nilainya dapat diubah.", fix: "Jika maksud Anda perbandingan, gunakan === sebagai ganti =; jika tidak, letakkan nama variabel di sebelah kiri =." })],
  [/^Invalid regular expression flag/, () => ({ message: "Flag tidak valid setelah ekspresi reguler.", fix: "Flag yang diizinkan: g i m s u y d v." })],
  [/^Invalid regular expression: (.*)/, (m) => ({ message: `Ekspresi reguler tidak valid: ${m[1]}`, fix: "Periksa kurung dan karakter khusus dalam ekspresi, lalu gunakan alat uji Regex." })],
  [/^Unexpected character '(.*)'/, (m) => ({ message: `Karakter «${m[1]}» tidak diizinkan dalam kode JavaScript di sini.`, fix: /[“”‘’]/.test(m[1]) ? "Ini adalah tanda kutip «pintar» dari pengolah kata; ganti dengan \" atau ' biasa." : /[،؛]/.test(m[1]) ? "Ini adalah tanda koma Arab; gunakan koma Inggris «,» atau titik koma «;» sebagai gantinya." : "Hapus karakter ini, atau letakkan di dalam teks yang diapit tanda kutip." })],
  [/^Unexpected keyword '(.*)'/, (m) => ({ message: `Kata kunci «${m[1]}» muncul di tempat yang tidak sesuai.`, fix: `Jangan gunakan «${m[1]}» sebagai nama variabel atau fungsi, dan periksa sintaks sebelumnya.` })],
  [/^Cannot use keyword 'await' outside an async function|'await' is only valid/, () => ({ message: "Kata kunci await hanya dapat digunakan di dalam fungsi async.", fix: "Tambahkan async sebelum fungsi: async function f() { ... }." })],
  [/^Unsyntactic (break|continue)/, (m) => ({ message: `Pernyataan ${m[1]} ditulis di luar perulangan${m[1] === "break" ? " atau switch" : ""}.`, fix: `Letakkan ${m[1]} di dalam for atau while${m[1] === "break" ? " atau switch" : ""}, atau gunakan return untuk keluar dari fungsi.` })],
  [/^Identifier directly after number/, () => ({ message: "Sebuah nama langsung mengikuti angka, seperti 3px atau 2x.", fix: "Letakkan nilai di antara tanda kutip, \"3px\", atau tulis operasi perkalian secara eksplisit: 2 * x." })],
  [/^let is disallowed as a lexically bound name/, () => ({ message: "Variabel tidak boleh dinamai let.", fix: "Pilih nama lain untuk variabel." })],
  [/^The keyword '(.*)' is reserved/, (m) => ({ message: `«${m[1]}» adalah kata cadangan dalam JavaScript dan tidak dapat digunakan sebagai nama.`, fix: "Pilih nama lain untuk variabel atau fungsi." })],
  [/^Argument name clash/, () => ({ message: "Dua parameter dengan nama yang sama muncul dalam definisi fungsi.", fix: "Buat nama parameter fungsi berbeda." })],
  [/^Complex binding patterns require an initialization value|^Missing initializer/, () => ({ message: "Destrukturisasi (destructuring) dalam deklarasi memerlukan nilai.", fix: "Misalnya, tulis: const { a, b } = obj;" })],
  [/^Octal literal in strict mode|^Invalid number/, () => ({ message: "Format angka tidak valid.", fix: "Jangan awali angka dengan nol berlebih; gunakan 0o untuk oktal dan 0x untuk heksadesimal." })],
  [/^Bad escape sequence|^Invalid escape sequence|^Bad character escape/, () => ({ message: "Urutan escape tidak valid setelah \\ di dalam teks.", fix: "Gunakan \\\\ untuk menulis garis miring terbalik, atau urutan yang benar seperti \\n dan \\t." })],
  [/^Label '(.*)' is already declared/, (m) => ({ message: `Label «${m[1]}» dideklarasikan dua kali.`, fix: "Ganti nama salah satu dari dua label." })],
  [/^Duplicate constructor/, () => ({ message: "Kelas memiliki lebih dari satu constructor.", fix: "Pastikan kelas hanya memiliki satu fungsi constructor." })],
  [/^Shorthand property assignments are valid only in destructuring/, () => ({ message: "Anda menggunakan = di dalam objek, padahal seharusnya titik dua :.", fix: "Tulis properti dalam bentuk { key: value }." })],
  [/^Comma is not permitted after the rest element|^Rest element must be last/, () => ({ message: "Parameter sisa ... harus berada di posisi terakhir.", fix: "Pindahkan ...rest ke akhir daftar." })],
  [/^'with' in strict mode|^Deleting local variable in strict mode/, () => ({ message: "Sintaks ini tidak diizinkan dalam mode ketat (strict mode).", fix: "Hindari with dan penghapusan variabel dengan delete." })]
];

function syntaxIssue(code, err, sourceType) {
  const raw = String(err.message).replace(/\s*\(\d+:\d+\)\s*$/, "");
  const pos = Number.isInteger(err.pos) ? err.pos : 0;
  const { line, col } = err.loc ? { line: err.loc.line, col: err.loc.column } : lineCol(code, pos);
  let info = null;
  if (/^Unexpected token/.test(raw)) info = explainUnexpected(code, pos, sourceType);
  else for (const [re, fn] of RULES) { const m = raw.match(re); if (m) { info = fn(m); break; } }
  if (!info) info = { message: `Kesalahan sintaks: ${raw}`, fix: "Periksa baris ini dan baris sebelumnya." };
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
        if (assigned && !guess) add(n, "warning", `Variabel «${n.name}» diberi nilai tanpa dideklarasikan dengan let atau const, sehingga menjadi variabel global (dan menjadi kesalahan dalam mode ketat).`, `Deklarasikan terlebih dahulu: let ${n.name} = ...`);
        else add(n, guess ? "error" : "warning", `Nama «${n.name}» tidak terdefinisi dalam kode${guess ? `, mungkinkah maksud Anda «${guess}»?` : ""}, dan akan menyebabkan ReferenceError: ${n.name} is not defined saat dijalankan.`, guess ? `Perbaiki nama menjadi «${guess}».` : `Deklarasikan «${n.name}» dengan let, const, atau function sebelum digunakan, atau pastikan itu adalah variabel global yang sudah ada.`);
      }
    }
    if (n.type === "MemberExpression" && !n.computed && n.property.type === "Identifier" && n.property.name.length >= 4 && !MEMBERS.has(n.property.name)) {
      const p = n.property.name;
      const sorted = (w) => [...w.toLowerCase()].sort().join("");
      const guess = [...MEMBERS].find((m) => m.toLowerCase() === p.toLowerCase()) || [...MEMBERS].find((m) => m.length === p.length && sorted(m) === sorted(p) && distance(p, m) === 1) || (p.length >= 7 ? [...MEMBERS].find((m) => distance(p, m) === 1) : null);
      if (guess) add(n.property, "warning", `Properti «${p}» tampaknya salah ketik dari «${guess}», dan hasilnya kemungkinan undefined atau TypeError: ${p} is not a function.`, `Tulis .${guess}`);
    }
    if ((n.type === "AssignmentExpression" && n.left.type === "Identifier") || (n.type === "UpdateExpression" && n.argument.type === "Identifier")) {
      const id = n.type === "AssignmentExpression" ? n.left : n.argument;
      const d = declared.get(id.name);
      if (d && d.kinds.size === 1 && d.kinds.has("const")) add(id, "error", `Nilai konstanta «${id.name}» yang dideklarasikan dengan const tidak dapat diubah (TypeError: Assignment to constant variable).`, `Deklarasikan dengan let sebagai ganti const jika nilainya akan berubah: let ${id.name} = ...`);
    }
    if (n.type === "BinaryExpression" && (n.operator === "==" || n.operator === "!=")) {
      const isNull = (x) => x.type === "Literal" && x.value === null;
      if (!isNull(n.left) && !isNull(n.right)) {
        const opPos = code.indexOf(n.operator, n.left.end);
        const lc = lineCol(code, opPos);
        issues.push({ line: lc.line, col: lc.col, len: 2, severity: "warning", message: `Perbandingan ${n.operator} mengubah tipe data secara otomatis (misalnya "0" == 0 bernilai benar), dan dapat memberikan hasil yang tidak diharapkan.`, fix: `Gunakan ${n.operator}= untuk perbandingan ketat.` });
      }
    }
    if (n.type === "BinaryExpression" && /^[!=]==?$/.test(n.operator) && [n.left, n.right].some((x) => x.type === "Identifier" && x.name === "NaN")) add(n, "error", "Perbandingan dengan NaN selalu menghasilkan false, karena NaN tidak sama dengan nilai apa pun, bahkan dengan dirinya sendiri.", "Gunakan Number.isNaN(x) sebagai gantinya.");
    if (n.type === "BinaryExpression" && /^[!=]==?$/.test(n.operator)) {
      const t = n.left.type === "UnaryExpression" && n.left.operator === "typeof" ? n.right : n.right.type === "UnaryExpression" && n.right.operator === "typeof" ? n.left : null;
      if (t && t.type === "Literal" && typeof t.value === "string" && !TYPEOF_OK.has(t.value)) add(t, "error", `typeof tidak pernah menghasilkan "${t.value}"; nilai yang mungkin adalah: undefined, object, boolean, number, string, function, symbol, bigint.`, `Perbaiki kata${closest(t.value, [...TYPEOF_OK]) ? ` menjadi "${closest(t.value, [...TYPEOF_OK])}"` : ""}.`);
    }
    if ((n.type === "IfStatement" || n.type === "WhileStatement" || n.type === "DoWhileStatement") && n.test.type === "AssignmentExpression" && n.test.operator === "=") add(n.test, "warning", "Ada penugasan = di dalam kondisi, dan kemungkinan yang dimaksud adalah perbandingan.", "Gunakan === untuk perbandingan: if (x === 5)");
    if ((n.type === "IfStatement" || n.type === "ForStatement" || n.type === "WhileStatement") && (n.consequent || n.body) && (n.consequent || n.body).type === "EmptyStatement") add(n.consequent || n.body, "warning", `Titik koma langsung setelah kondisi ${n.type === "IfStatement" ? "if" : "perulangan"} membuat badannya kosong, sehingga kode berikutnya tidak terpengaruh oleh kondisi tersebut.`, "Hapus ; yang ada setelah kurung ).", 1);
    if (n.type === "VariableDeclaration" && n.kind === "var") add(n, "info", "var sudah usang dan cakupannya adalah seluruh fungsi, yang dapat menyebabkan kesalahan tersembunyi.", "Gunakan let untuk variabel dan const untuk konstanta.", 3);
    if (n.type === "ObjectExpression") {
      const seen = new Set();
      for (const p of n.properties) {
        if (p.type !== "Property" || p.computed || p.kind !== "init") continue;
        const k = p.key.type === "Identifier" ? p.key.name : String(p.key.value);
        if (seen.has(k)) add(p.key, "warning", `Kunci «${k}» duplikat dalam objek, dan nilai terakhir menimpa nilai pertama.`, "Hapus salah satu dari dua kunci atau ganti namanya.");
        seen.add(k);
      }
    }
    if (n.type === "BlockStatement" || n.type === "Program" || n.type === "SwitchCase") {
      const body = n.type === "SwitchCase" ? n.consequent : n.body;
      for (let i = 0; i < body.length - 1; i++) {
        if (ENDS.has(body[i].type)) {
          const next = body.slice(i + 1).find((s) => s.type !== "FunctionDeclaration" && s.type !== "EmptyStatement");
          if (next) add(next, "warning", `Kode ini tidak akan pernah dijalankan karena berada setelah ${({ ReturnStatement: "return", ThrowStatement: "throw", BreakStatement: "break", ContinueStatement: "continue" })[body[i].type]}.`, "Hapus, atau pindahkan sebelum pernyataan tersebut.");
          break;
        }
      }
    }
    if (n.type === "SwitchStatement") {
      n.cases.forEach((c, i) => {
        if (i === n.cases.length - 1 || !c.consequent.length) return;
        const last = c.consequent[c.consequent.length - 1];
        const ends = ENDS.has(last.type) || (last.type === "BlockStatement" && last.body.length && ENDS.has(last.body[last.body.length - 1].type));
        if (!ends) add(c, "warning", "Kasus case ini tidak diakhiri dengan break, sehingga eksekusi akan berlanjut ke kasus berikutnya.", "Tambahkan break; di akhir case jika kelanjutan eksekusi tidak dimaksudkan.", 4);
      });
    }
    if (n.type === "CatchClause" && !n.body.body.length) add(n, "info", "Blok catch kosong menyembunyikan kesalahan sehingga Anda tidak dapat mengetahui penyebabnya.", "Setidaknya cetak kesalahannya: console.error(err);", 5);
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
      issues.push({ line: d.node.loc.start.line, col: d.node.loc.start.column, len: name.length, severity: "info", message: `Fungsi «${name}» dideklarasikan tetapi tidak dipanggil dalam kode ini.`, fix: "Panggil, atau hapus jika tidak diperlukan." });
      continue;
    }
    issues.push({ line: d.node.loc.start.line, col: d.node.loc.start.column, len: name.length, severity: "info", message: `«${name}» dideklarasikan tetapi tidak pernah digunakan.`, fix: "Hapus jika Anda tidak membutuhkannya." });
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
  const mode = choice(input, "mode", "Jenis berkas", ["script", "module"], "script");
  const res = check(code, mode);
  const lines = code.split("\n").length;
  const linesWord = lines === 1 ? "satu baris" : lines === 2 ? "dua baris" : lines <= 10 ? `${lines} baris` : `${lines} baris`;
  const steps = [`Kami menganalisis ${linesWord} dengan parser JavaScript (Acorn) sesuai standar ECMAScript terbaru, sebagai ${mode === "module" ? "Modul ES" : "Skrip biasa"}.`];
  let extra = {};
  if (!res.ok) {
    const e = res.issues[0];
    steps.push(`Parser berhenti pada kesalahan sintaks pertama di baris ${e.line}, kolom ${e.col + 1}. Pesan asli dari engine: ${e.english}.`);
    steps.push(`Penjelasan: ${e.message}`);
    steps.push(`Perbaikan: ${e.fix}`);
    steps.push("Setelah memperbaiki kesalahan ini, jalankan pemeriksaan lagi, karena kesalahan lain yang tersembunyi di baliknya mungkin muncul.");
  } else {
    let fns = 0;
    walk(res.ast, null, (n) => { if (/Function/.test(n.type)) fns++; });
    extra = { "Jumlah baris": lines, "Jumlah fungsi": fns };
    steps.push("Tidak ditemukan kesalahan sintaks, sehingga kode dapat dijalankan.");
    steps.push("Kemudian kami memeriksa kesalahan logika umum: nama yang tidak terdefinisi dan salah ketiknya, perubahan konstanta, perbandingan ==, penugasan di dalam kondisi, kode yang tidak dijalankan, kunci duplikat, dan kasus switch tanpa break.");
    steps.push("Catatan: pemeriksaan bersifat statis (tanpa menjalankan kode), sehingga mungkin tidak mendeteksi kesalahan yang hanya muncul saat eksekusi.");
  }
  const out = report(code, res.issues, extra);
  return { results: out.results, steps, blocks: out.blocks, copy: out.copy };
}
