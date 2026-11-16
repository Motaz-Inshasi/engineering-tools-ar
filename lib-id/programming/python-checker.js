import { readCode, report, closest } from "./code-view.js";

export const meta = {
  description: "Tempelkan kode Python untuk mendeteksi kesalahan indentasi, titik dua, kurung, string yang tidak ditutup, dan nama yang tidak terdefinisi, dengan penjelasan setiap kesalahan dalam bahasa Indonesia dan cara memperbaikinya.",
  keywords: ["python", "Python", "Pemeriksaan kode", "IndentationError", "SyntaxError", "NameError", "Debugging", "linter"],
  formulas: [{ label: "Kode dibagi menjadi baris logis, lalu indentasi, blok, dan aturan kesalahan umum diperiksa", tex: "\\text{code} \\rightarrow \\text{tokens} \\rightarrow \\text{blocks} \\rightarrow \\text{issues}" }],
  inputs: [
    { id: "code", label: "Kode Python", type: "textarea", rows: 12, wide: true, placeholder: "def greet(name):\n    print(\"Hello\", name)" }
  ],
  example: {
    values: { code: "def average(numbers)\n    total = 0\n    for n in numbers:\n        total += n\n    return total / len(numbers)\n\nscores = [90, 85, 77]\nprint(averge(scores))" },
    expect: ["':'", "Baris 1"],
    note: "Contoh: fungsi yang titik dua-nya terlewat setelah definisi, dan nama fungsinya salah ditulis saat dipanggil."
  },
  invalid: { values: { code: "" } },
  related: ["error-explainer", "js-checker", "bracket-checker", "json-formatter", "regex-tester"]
};

const KEYWORDS = new Set("False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield".split(" "));
const SOFT = new Set(["match", "case", "_", "type"]);
const BUILTINS = new Set("print input len range int float str bool list dict set tuple abs min max sum sorted reversed enumerate zip map filter open round type isinstance issubclass super object id hash hex oct bin chr ord pow divmod any all iter next repr format getattr setattr hasattr delattr vars dir globals locals callable staticmethod classmethod property exit quit help slice frozenset bytes bytearray memoryview complex compile eval exec breakpoint ascii aiter anext __import__ __name__ __file__ __doc__ __builtins__ NotImplemented Ellipsis Exception BaseException ValueError TypeError KeyError IndexError NameError ZeroDivisionError AttributeError ImportError ModuleNotFoundError FileNotFoundError IOError OSError RuntimeError StopIteration NotImplementedError RecursionError AssertionError ArithmeticError LookupError OverflowError KeyboardInterrupt SystemExit UnicodeError UnicodeDecodeError UnicodeEncodeError EOFError PermissionError TimeoutError FileExistsError IsADirectoryError ConnectionError MemoryError GeneratorExit Warning DeprecationWarning UserWarning".split(" "));
const HEADERS = new Set(["if", "elif", "else", "for", "while", "def", "class", "try", "except", "finally", "with"]);
const PAIRS = { "(": ")", "[": "]", "{": "}" };
const CLOSE = { ")": "(", "]": "[", "}": "{" };
const BR_NAME = { "(": "Kurung (", "[": "Kurung [", "{": "Kurung {" };

function lex(code) {
  const issues = [];
  const masked = [];
  const stack = [];
  let i = 0, line = 1, col = 0, cur = "";
  const push = (ch) => { cur += ch; };
  const newline = () => { masked.push(cur); cur = ""; line++; col = 0; };
  while (i < code.length) {
    const c = code[i];
    if (c === "\n") { newline(); i++; continue; }
    if (c === "#") { while (i < code.length && code[i] !== "\n") { i++; col++; } continue; }
    if (c === "'" || c === "\"") {
      const triple = code.startsWith(c.repeat(3), i);
      const q = triple ? c.repeat(3) : c;
      const startLine = line, startCol = col;
      const prefix = (code.slice(Math.max(0, i - 2), i).match(/[rRbBuUfF]{1,2}$/) || [""])[0];
      const raw = /r/i.test(prefix);
      push(q); i += q.length; col += q.length;
      let closed = false;
      while (i < code.length) {
        const d = code[i];
        if (d === "\\" && !raw) { if (code[i + 1] === "\n") { i++; newline(); i++; continue; } push("  "); i += 2; col += 2; continue; }
        if (d === "\\" && raw) { push(" "); i++; col++; if (i < code.length && code[i] !== "\n") { push(" "); i++; col++; } continue; }
        if (code.startsWith(q, i)) { push(q); i += q.length; col += q.length; closed = true; break; }
        if (d === "\n") { if (!triple) break; newline(); i++; continue; }
        push(" "); i++; col++;
      }
      if (!closed) {
        issues.push(triple
          ? { line: startLine, col: startCol, len: 3, severity: "error", message: `String dengan tiga tanda kutip ${q} tidak ditutup hingga akhir kode (unterminated triple-quoted string literal).`, fix: `Tambahkan ${q} di akhir string.` }
          : { line: startLine, col: startCol, len: 1, severity: "error", message: `String yang dimulai dengan ${q} tidak ditutup pada baris yang sama (unterminated string literal).`, fix: `Tutup string dengan ${q} sebelum akhir baris, atau gunakan tiga karakter ${q.repeat(3)} untuk string multibaris.` });
      }
      continue;
    }
    if (PAIRS[c]) stack.push({ ch: c, line, col });
    else if (CLOSE[c]) {
      const top = stack[stack.length - 1];
      if (!top) issues.push({ line, col, len: 1, severity: "error", message: `Kurung tutup «${c}» berlebih dan tidak memiliki kurung buka yang sesuai (unmatched '${c}').`, fix: "Hapus kurung ini, atau tambahkan kurung buka yang kurang." });
      else if (top.ch !== CLOSE[c]) { issues.push({ line, col, len: 1, severity: "error", message: `Kurung «${c}» tidak cocok dengan «${top.ch}» yang dibuka di baris ${top.line} (closing parenthesis '${c}' does not match opening parenthesis '${top.ch}').`, fix: `Tutup «${top.ch}» dengan «${PAIRS[top.ch]}».` }); stack.pop(); }
      else stack.pop();
    }
    push(c); i++; col++;
  }
  masked.push(cur);
  for (const s of stack) issues.push({ line: s.line, col: s.col, len: 1, severity: "error", message: `${BR_NAME[s.ch]} yang dibuka di baris ${s.line} tidak pernah ditutup ('${s.ch}' was never closed).`, fix: `Tambahkan «${PAIRS[s.ch]}» di tempat yang sesuai.` });
  return { issues, masked };
}

function logicalLines(masked, physical) {
  const out = [];
  let depth = 0, cur = null;
  masked.forEach((m, idx) => {
    const lineNo = idx + 1;
    const startDepth = depth;
    for (const ch of m) { if (PAIRS[ch]) depth++; else if (CLOSE[ch]) depth = Math.max(0, depth - 1); }
    if (!cur) {
      if (!m.trim()) return;
      cur = { line: lineNo, indent: physical[idx].match(/^[ \t]*/)[0], text: m.trim(), first: m, last: lineNo };
    } else {
      cur.text += " " + m.trim();
      cur.last = lineNo;
    }
    if (startDepth >= 0 && depth === 0 && !/\\\s*$/.test(m)) { out.push(cur); cur = null; }
  });
  if (cur) out.push(cur);
  return out;
}

function topColon(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (PAIRS[c]) depth++;
    else if (CLOSE[c]) depth--;
    else if (c === ":" && depth === 0 && s[i + 1] !== "=") return i;
  }
  return -1;
}

function hasTopAssign(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (PAIRS[c]) depth++;
    else if (CLOSE[c]) depth--;
    else if (c === "=" && depth === 0 && !"=!<>:+-*/%&|^@".includes(s[i - 1] || "") && s[i + 1] !== "=") return true;
  }
  return false;
}

const width = (ind) => [...ind].reduce((w, ch) => (ch === "\t" ? w + 8 - (w % 8) : w + 1), 0);

function namesIn(s) {
  return s.replace(/\([^()]*\)/g, (m) => m).split(",").map((p) => p.trim().replace(/^\*+/, "").split(/[=:]/)[0].trim()).filter((p) => /^[A-Za-z_]\w*$/.test(p));
}

function collectDefined(lines) {
  const defined = new Set();
  let star = false;
  const add = (n) => { if (n) defined.add(n); };
  for (const L of lines) {
    const t = L.text;
    let m;
    if ((m = t.match(/^(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\((.*)\)/))) { add(m[1]); for (const p of namesIn(m[2])) add(p); }
    if ((m = t.match(/^class\s+([A-Za-z_]\w*)/))) add(m[1]);
    if ((m = t.match(/^import\s+(.+)$/))) for (const part of m[1].split(",")) { const a = part.trim().split(/\s+as\s+/); add((a[1] || a[0].split(".")[0]).trim()); }
    if ((m = t.match(/^from\s+\S+\s+import\s+\(?(.+?)\)?$/))) { if (m[1].trim() === "*") star = true; for (const part of m[1].split(",")) { const a = part.trim().split(/\s+as\s+/); add((a[1] || a[0]).trim()); } }
    if ((m = t.match(/^(?:global|nonlocal)\s+(.+)$/))) for (const n of m[1].split(",")) add(n.trim());
    for (const f of t.matchAll(/\bfor\s+(.+?)\s+in\b/g)) for (const n of f[1].replace(/[()[\]]/g, " ").split(/[\s,]+/)) if (/^[A-Za-z_]\w*$/.test(n)) add(n);
    for (const f of t.matchAll(/\bas\s+([A-Za-z_]\w*)/g)) add(f[1]);
    for (const f of t.matchAll(/\blambda\s+([^:]*):/g)) for (const p of namesIn(f[1])) add(p);
    for (const f of t.matchAll(/([A-Za-z_]\w*)\s*:=/g)) add(f[1]);
    if (hasTopAssign(t) || /^[\w\s,.[\]()*]+\s*[-+*/%&|^@]?\/?\*?=(?!=)/.test(t)) {
      const lhsParts = [];
      let depth = 0, last = 0;
      for (let i = 0; i < t.length; i++) {
        const c = t[i];
        if (PAIRS[c]) depth++;
        else if (CLOSE[c]) depth--;
        else if (c === "=" && depth === 0 && !"=!<>".includes(t[i - 1] || "") && t[i + 1] !== "=") { lhsParts.push(t.slice(last, i)); last = i + 1; }
      }
      for (const lhs of lhsParts) {
        const clean = lhs.replace(/[-+*/%&|^@]+$/, "").replace(/:\s*[\w.[\], ]+$/, "");
        for (const n of clean.replace(/[()[\]]/g, " ").split(/[\s,]+/)) if (/^\*?[A-Za-z_]\w*$/.test(n)) add(n.replace(/^\*/, ""));
      }
    }
  }
  return { defined, star };
}

function usages(L) {
  const t = L.text;
  const out = [];
  let depth = 0;
  const re = /[A-Za-z_]\w*|[()[\]{}]|\S/g;
  let m;
  while ((m = re.exec(t))) {
    const w = m[0];
    if (PAIRS[w]) { depth++; continue; }
    if (CLOSE[w]) { depth--; continue; }
    if (!/^[A-Za-z_]/.test(w)) continue;
    const before = t.slice(0, m.index).trimEnd();
    const after = t.slice(m.index + w.length);
    if (before.endsWith(".")) continue;
    if (/^\s*["']/.test(after) && /^[rRbBuUfF]{1,2}$/.test(w)) continue;
    if (/^\d/.test(w)) continue;
    if (depth > 0 && /^\s*=(?!=)/.test(after)) continue;
    if (/^\s*(def|class)$/.test(before.split(/\s+/).pop() || "")) continue;
    out.push({ name: w, index: m.index });
  }
  return out;
}

export function check(code) {
  const physical = code.split("\n");
  const lexed = lex(code);
  if (lexed.issues.length) return lexed.issues;
  const issues = [];
  const add = (line, col, len, severity, message, fix) => issues.push({ line, col, len, severity, message, fix });
  const lines = logicalLines(lexed.masked, physical);
  const usesTab = lines.some((L) => L.indent.includes("\t")), usesSpace = lines.some((L) => L.indent.includes(" "));
  const mixedLine = lines.find((x) => /\t/.test(x.indent) && / /.test(x.indent));
  if (mixedLine) add(mixedLine.line, 0, mixedLine.indent.length, "warning", "Indentasi baris ini mencampur Tab dan spasi biasa, yang mudah menyebabkan TabError: inconsistent use of tabs and spaces in indentation.", "Gunakan 4 spasi biasa untuk setiap level di seluruh berkas, dan aktifkan konversi Tab menjadi spasi di editor Anda.");
  else if (usesTab && usesSpace) {
    const L = lines.find((x) => x.indent.includes("\t"));
    add(L.line, 0, L.indent.length, "warning", "Kode menggunakan Tab di sebagian baris dan spasi biasa di baris lain, yang mudah menyebabkan TabError saat diedit.", "Gunakan 4 spasi biasa untuk setiap level di seluruh berkas.");
  }
  const openTry = new Map();
  const indents = [0];
  const blocks = [];
  const lastHeader = new Map();
  let expectBlock = null, odd = false, prevDecorator = "";
  const { defined, star } = collectDefined(lines);
  const strNames = new Set();
  for (const L of lines) {
    const t = L.text;
    const w = width(L.indent);
    const kw = (t.match(/^(async\s+)?([A-Za-z_]\w*)/) || [])[2] || "";
    const lineCol = L.indent.length;
    if (expectBlock) {
      if (w <= indents[indents.length - 1]) add(L.line, 0, Math.max(1, t.length), "error", `Setelah baris ${expectBlock.line} yang diakhiri «:» harus ada blok yang menjorok ke dalam (IndentationError: expected an indented block after '${expectBlock.kw}' statement on line ${expectBlock.line}).`, "Jorokkan baris ini 4 spasi ke dalam, atau tulis pass jika blok sementara kosong.");
      else indents.push(w);
      expectBlock = null;
    } else if (w > indents[indents.length - 1]) {
      add(L.line, 0, Math.max(1, L.indent.length), "error", "Indentasi tidak terduga: baris ini menjorok ke dalam tanpa didahului baris yang diakhiri «:» (IndentationError: unexpected indent).", "Hapus spasi berlebih di awal baris agar sejajar dengan baris sebelumnya.");
      indents.push(w);
    }
    if (w < indents[indents.length - 1]) {
      while (indents.length > 1 && w < indents[indents.length - 1]) indents.pop();
      if (w !== indents[indents.length - 1]) {
        add(L.line, 0, Math.max(1, L.indent.length), "error", "Baris ini tidak cocok dengan level indentasi blok mana pun di luarnya (IndentationError: unindent does not match any outer indentation level).", "Buat indentasi baris sama persis dengan blok tempat baris itu berada (kelipatan 4 spasi).");
        indents.push(w);
      }
    }
    if (!odd && !usesTab && w % 4 !== 0) { odd = true; add(L.line, 0, L.indent.length, "info", "Indentasi bukan kelipatan 4 spasi.", "Gaya standar Python (PEP 8) adalah 4 spasi per level."); }
    while (blocks.length && blocks[blocks.length - 1].w >= w) blocks.pop();
    for (const [k] of lastHeader) if (k > w) lastHeader.delete(k);
    const inFunc = blocks.some((b) => b.kw === "def");
    const loopIdx = blocks.map((b) => b.kw).lastIndexOf("for") > blocks.map((b) => b.kw).lastIndexOf("def") || blocks.map((b) => b.kw).lastIndexOf("while") > blocks.map((b) => b.kw).lastIndexOf("def");
    const colon = topColon(t);
    const isHeader = HEADERS.has(kw);
    const before = lastHeader.get(w);
    for (const [tw, tl] of openTry) {
      if (tw > w || (tw === w && kw !== "except" && kw !== "finally")) {
        add(tl, 0, 3, "error", `Blok try di baris ${tl} tidak diikuti except atau finally (SyntaxError: expected 'except' or 'finally' block).`, "Setelah blok try, tambahkan blok except NamaKesalahan: atau finally: yang sejajar dengannya.");
        openTry.delete(tw);
      } else if (tw === w) openTry.delete(tw);
    }
    if (kw === "try") openTry.set(w, L.line);
    const original = physical[L.line - 1].trim();
    const elseIf = kw === "else" && /^else\s+if\b/.test(t);
    if (elseIf) add(L.line, lineCol, 7, "error", "Python tidak menggunakan «else if».", "Tulis elif sebagai gantinya: elif kondisi:");
    const cBrace = isHeader && /\{\s*$/.test(original);
    if (isHeader) {
      if (cBrace) add(L.line, lineCol + original.length - 1, 1, "error", "Python tidak menggunakan kurung kurawal { } untuk mendefinisikan blok seperti C dan Java; Python menggunakan titik dua «:» dan indentasi.", `Tulis: ${original.replace(/\s*\{\s*$/, "")}: lalu jorokkan baris blok 4 spasi dan hapus }.`);
      else if (colon < 0) {
        const name = kw === "def" || kw === "class" ? `Definisi ${kw}` : `Pernyataan ${kw}`;
        add(L.line, Math.min(physical[L.line - 1].length, lineCol + original.length), 1, "error", `${name} harus diakhiri dengan titik dua «:» (SyntaxError: expected ':').`, `Tambahkan «:» di akhir baris: ${original.slice(0, 80)}:`);
      }
      if (kw === "def" && !/^(async\s+)?def\s+[A-Za-z_]\w*\s*\(/.test(t)) add(L.line, lineCol, t.length, "error", "Definisi fungsi memerlukan dua kurung setelah namanya, meskipun tidak memiliki parameter.", "Tulis: def name():");
      if ((kw === "if" || kw === "elif" || kw === "while") && hasTopAssign(colon > 0 ? t.slice(kw.length, colon) : t.slice(kw.length))) add(L.line, lineCol, t.length, "error", "Anda menggunakan = (penugasan) di dalam kondisi, bukan == (perbandingan) (SyntaxError: invalid syntax. Maybe you meant '==' or ':=' instead of '='?).", "Gunakan == untuk perbandingan, misalnya: if x == 5:");
      if (kw === "elif" && !["if", "elif"].includes(before)) add(L.line, lineCol, 4, "error", "elif tanpa if di depannya pada level indentasi yang sama (SyntaxError: invalid syntax).", "Pastikan elif sejajar persis dengan if yang mengikutinya.");
      if (kw === "else" && !elseIf && !["if", "elif", "for", "while", "try", "except"].includes(before)) add(L.line, lineCol, 4, "error", "else tanpa if (atau for/while/try) di depannya pada level indentasi yang sama (SyntaxError: invalid syntax).", "Pastikan else sejajar persis dengan pernyataan if yang mengikutinya.");
      if (kw === "except" && !["try", "except"].includes(before)) add(L.line, lineCol, 6, "error", "except tanpa try di depannya pada level indentasi yang sama.", "Sejajarkan except persis dengan try.");
      if (kw === "finally" && !["try", "except", "else"].includes(before)) add(L.line, lineCol, 7, "error", "finally tanpa try di depannya pada level indentasi yang sama.", "Sejajarkan finally persis dengan try.");
      if (kw === "except" && /^except\s*:/.test(t)) add(L.line, lineCol, 6, "info", "except: tanpa tipe kesalahan menangkap semua kesalahan, bahkan Ctrl+C, sehingga menyembunyikan penyebab masalah.", "Tentukan tipe kesalahan: except ValueError: atau minimal except Exception:");
      if (kw === "def") {
        const params = (t.match(/\((.*)\)/) || ["", ""])[1].trim();
        const parentIsClass = blocks.length && blocks[blocks.length - 1].kw === "class";
        if (parentIsClass && !/^@staticmethod/.test(prevDecorator) && !/^(self|cls)\b/.test(params)) add(L.line, lineCol, t.length, "warning", "Metode di dalam kelas tidak memiliki parameter self; saat dipanggil dari objek akan terjadi TypeError: takes 0 positional arguments but 1 was given.", "Jadikan self sebagai parameter pertama: def name(self, ...):, atau tambahkan @staticmethod sebelumnya.");
        if (/=\s*(\[\s*\]|\{\s*\}|list\(\)|dict\(\)|set\(\))/.test(params)) add(L.line, lineCol, t.length, "warning", "Nilai default yang dapat diubah ([] atau {}) dibuat sekali dan dibagikan di antara semua pemanggilan.", "Gunakan None lalu buat nilainya di dalam fungsi: def f(a=None): if a is None: a = []");
      }
      if (!cBrace && (colon < 0 || !t.slice(colon + 1).trim())) expectBlock = { line: L.line, kw };
      blocks.push({ w, kw });
      lastHeader.set(w, kw);
    } else {
      lastHeader.delete(w);
      if (kw === "return" && !inFunc) add(L.line, lineCol, 6, "error", "return di luar fungsi mana pun (SyntaxError: 'return' outside function).", "Letakkan return di dalam fungsi def, atau hapus.");
      if (kw === "yield" && !inFunc) add(L.line, lineCol, 5, "error", "yield di luar fungsi mana pun.", "Letakkan yield di dalam fungsi def.");
      if ((kw === "break" || kw === "continue") && !loopIdx) add(L.line, lineCol, kw.length, "error", `${kw} di luar perulangan (SyntaxError: '${kw}' outside loop).`, `Letakkan ${kw} di dalam for atau while.`);
      if (/^print\s+[^\s=(.,)]/.test(t) && !/^print\s*\(/.test(t)) add(L.line, lineCol, 5, "error", "Di Python 3, print menjadi fungsi yang memerlukan kurung (SyntaxError: Missing parentheses in call to 'print').", `Tulis: print(${original.replace(/^print\s+/, "")})`);
      if (t === "}" || t === "{") add(L.line, lineCol, 1, "error", "Python tidak menggunakan kurung kurawal { } untuk mendefinisikan blok.", "Hapus kurung dan andalkan indentasi untuk mendefinisikan blok.");
      if (/^(\w+)\s*=\s*input\s*\(/.test(t)) strNames.add(t.match(/^(\w+)/)[1]);
      if (/^(\w+)\s*=\s*(int|float)\s*\(/.test(t)) strNames.delete(t.match(/^(\w+)/)[1]);
    }
    prevDecorator = t.startsWith("@") ? t : (isHeader ? "" : prevDecorator && kw ? "" : prevDecorator);
    const phys = lexed.masked[L.line - 1];
    const at = (re) => { const m = phys.match(re); return m ? m.index : lineCol; };
    if (/&&|\|\|/.test(t)) add(L.line, at(/&&|\|\|/), 2, "error", "Python tidak menggunakan && dan || .", "Gunakan and sebagai ganti && dan or sebagai ganti || .");
    if (/(^|[^!=<>])!(?!=)\s*[\w(]/.test(t)) add(L.line, at(/!(?!=)/), 1, "error", "Python tidak menggunakan ! untuk negasi.", "Gunakan not, misalnya: if not done:");
    if (/[A-Za-z_]\w*\s*(\+\+|--)(?!\s*[\w(])/.test(t)) add(L.line, at(/\+\+|--/), 2, "error", "Python tidak mendukung ++ atau -- .", "Gunakan x += 1 atau x -= 1 .");
    if (/;\s*$/.test(t)) add(L.line, at(/;\s*$/), 1, "info", "Titik koma di akhir baris tidak diperlukan dalam Python.", "Hapus.");
    for (const m of t.matchAll(/\b(true|false|null|none|TRUE|FALSE|NULL|NONE|nil)\b/g)) {
      if (defined.has(m[1])) continue;
      const fixWord = { true: "True", false: "False", null: "None", none: "None", nil: "None" }[m[1].toLowerCase()];
      add(L.line, at(new RegExp(`\\b${m[1]}\\b`)), m[1].length, "error", `«${m[1]}» tidak terdefinisi dalam Python (NameError); nilai boolean dan nilai kosong ditulis dengan huruf kapital.`, `Tulis ${fixWord}.`);
    }
    if (/[=!]=\s*None\b/.test(t)) add(L.line, at(/[=!]=\s*None/), 2, "info", "Perbandingan dengan None harus menggunakan is, bukan == .", "Tulis: if x is None: atau if x is not None:");
    if (/\bis\s+(not\s+)?(-?\d|["'])/.test(t)) add(L.line, at(/\bis\s/), 2, "warning", "is membandingkan identitas objek, bukan nilainya; dengan angka dan string dapat menghasilkan hasil yang salah (SyntaxWarning).", "Gunakan == untuk perbandingan berdasarkan nilai.");
    if (/["']\s*\+\s*-?\d|\d\s*\+\s*[rRbBuUfF]?["']/.test(t)) add(L.line, at(/["']\s*\+|\d\s*\+/), 1, "error", "Menjumlahkan string dengan angka menyebabkan TypeError: can only concatenate str (not \"int\") to str.", "Ubah angka menjadi string dengan str(5), atau gunakan f-string: f\"Umur {age}\".");
    for (const n of strNames) {
      const re = new RegExp(`\\b${n}\\s*([-*/%<>]|\\+\\s*\\d)|(\\d\\s*[-*/%+<>]|[<>]=?)\\s*${n}\\b`);
      if (re.test(t) && !new RegExp(`^${n}\\s*=`).test(t)) {
        add(L.line, at(new RegExp(`\\b${n}\\b`)), n.length, "warning", `«${n}» berisi nilai dari input(), dan input() selalu mengembalikan string, sehingga operasi hitung atau perbandingan padanya akan menyebabkan TypeError.`, `Ubah menjadi angka: ${n} = int(input(...)) atau float(...).`);
        strNames.delete(n);
      }
    }
  }
  for (const tl of openTry.values()) add(tl, 0, 3, "error", `Blok try di baris ${tl} tidak diikuti except atau finally (SyntaxError: expected 'except' or 'finally' block).`, "Setelah blok try, tambahkan blok except NamaKesalahan: atau finally: yang sejajar dengannya.");
  if (expectBlock) add(expectBlock.line, 0, 1, "error", `Kode berakhir setelah baris ${expectBlock.line} yang diakhiri «:» tanpa blok yang menjorok ke dalam (IndentationError: expected an indented block).`, "Tambahkan baris blok yang dijorokkan 4 spasi, atau tulis pass.");
  if (!star) {
    const reported = new Set();
    for (const L of lines) {
      if (/^(import|from)\s/.test(L.text)) continue;
      for (const u of usages(L)) {
        const n = u.name;
        if (KEYWORDS.has(n) || SOFT.has(n) || BUILTINS.has(n) || defined.has(n) || reported.has(n) || /^(true|false|null|none|TRUE|FALSE|NULL|NONE|nil)$/.test(n)) continue;
        if (/^(else|elif|print)$/.test(n)) continue;
        reported.add(n);
        const guess = closest(n, [...defined, ...BUILTINS, ...KEYWORDS]);
        const phys = lexed.masked[L.line - 1];
        const m = phys.match(new RegExp(`\\b${n}\\b`));
        add(m ? L.line : L.line, m ? m.index : 0, n.length, guess ? "error" : "warning", `Nama «${n}» tidak terdefinisi${guess ? `, mungkinkah maksud Anda «${guess}»?` : ""} (NameError: name '${n}' is not defined).`, guess ? `Perbaiki nama menjadi «${guess}».` : `Definisikan «${n}» sebelum digunakan, atau impor dengan import jika berasal dari pustaka.`);
      }
    }
  }
  return issues;
}

export function solve(input) {
  const code = readCode(input, "code");
  const issues = check(code);
  const n = code.split("\n").length;
  const linesWord = n === 1 ? "satu baris" : n === 2 ? "dua baris" : n <= 10 ? `${n} baris` : `${n} baris`;
  const lexical = issues.some((i) => /unterminated|was never closed|unmatched|does not match/.test(i.message));
  const steps = [
    `Kami membaca ${linesWord}, mengabaikan komentar dan isi string, lalu melacak kurung dan tanda kutip.`,
    lexical ? "Ditemukan masalah pada kurung atau string yang mengganggu sisa analisis, jadi perbaiki dahulu lalu jalankan pemeriksaan lagi." : "Kami menggabungkan baris logis (baris yang terpotong di dalam kurung dihitung sebagai satu baris) dan memeriksa indentasi: setiap baris yang diakhiri «:» harus diikuti blok yang menjorok, dan pengurangan indentasi harus kembali ke level sebelumnya.",
    "Kemudian kami memeriksa aturan umum: titik dua setelah if, for, def…, = sebagai ganti == dalam kondisi, else/elif/except di tempatnya, return dan break di luar tempatnya, nama yang tidak terdefinisi beserta salah ketiknya, serta kebiasaan dari bahasa lain seperti &&, ++, dan true.",
    "Catatan: pemeriksaan bersifat statis tanpa menjalankan kode, sehingga tidak mendeteksi kesalahan saat runtime yang bergantung pada nilai, seperti pembagian dengan nol."
  ];
  const out = report(code, issues, { "Jumlah baris": n });
  return { results: out.results, steps, blocks: out.blocks, copy: out.copy };
}
