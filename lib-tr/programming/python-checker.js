import { readCode, report, closest } from "./code-view.js";

export const meta = {
  description: "Python kodunu yapıştırın; girinti, iki nokta, parantez, kapatılmamış metin ve tanımsız ad hatalarını bulur, her hatayı Türkçe açıklar ve düzeltme yolunu gösterir.",
  keywords: ["python", "Python", "kod denetimi", "IndentationError", "SyntaxError", "NameError", "hata ayıklama", "linter"],
  formulas: [{ label: "Kod mantıksal satırlara bölünür; ardından girinti, bloklar ve yaygın hata kuralları denetlenir", tex: "\\text{code} \\rightarrow \\text{tokens} \\rightarrow \\text{blocks} \\rightarrow \\text{issues}" }],
  inputs: [
    { id: "code", label: "Python kodu", type: "textarea", rows: 12, wide: true, placeholder: "def greet(name):\n    print(\"Hello\", name)" }
  ],
  example: {
    values: { code: "def average(numbers)\n    total = 0\n    for n in numbers:\n        total += n\n    return total / len(numbers)\n\nscores = [90, 85, 77]\nprint(averge(scores))" },
    expect: ["':'", "Satır 1"],
    note: "Örnek: öğrencinin tanımdan sonra iki noktayı unuttuğu ve çağrıda fonksiyon adını yanlış yazdığı bir fonksiyon."
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
const BR_NAME = { "(": "( parantezi", "[": "[ parantezi", "{": "{ parantezi" };

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
          ? { line: startLine, col: startCol, len: 3, severity: "error", message: `${q} ile başlayan üç tırnaklı metin kodun sonuna kadar kapatılmadı (unterminated triple-quoted string literal).`, fix: `Metnin sonuna ${q} ekleyin.` }
          : { line: startLine, col: startCol, len: 1, severity: "error", message: `${q} ile başlayan metin aynı satırda kapatılmadı (unterminated string literal).`, fix: `Metni satır sonundan önce ${q} ile kapatın ya da çok satırlı metin için üç ${q.repeat(3)} kullanın.` });
      }
      continue;
    }
    if (PAIRS[c]) stack.push({ ch: c, line, col });
    else if (CLOSE[c]) {
      const top = stack[stack.length - 1];
      if (!top) issues.push({ line, col, len: 1, severity: "error", message: `Fazla kapanış parantezi «${c}», karşılığında açılış parantezi yok (unmatched '${c}').`, fix: "Bu parantezi silin ya da eksik açılış parantezini ekleyin." });
      else if (top.ch !== CLOSE[c]) { issues.push({ line, col, len: 1, severity: "error", message: `«${c}» parantezi, ${top.line}. satırda açılan «${top.ch}» ile eşleşmiyor (closing parenthesis '${c}' does not match opening parenthesis '${top.ch}').`, fix: `«${top.ch}» parantezini «${PAIRS[top.ch]}» ile kapatın.` }); stack.pop(); }
      else stack.pop();
    }
    push(c); i++; col++;
  }
  masked.push(cur);
  for (const s of stack) issues.push({ line: s.line, col: s.col, len: 1, severity: "error", message: `${s.line}. satırda açılan ${BR_NAME[s.ch]} kapatılmadı ('${s.ch}' was never closed).`, fix: `«${PAIRS[s.ch]}» uygun yere ekleyin.` });
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
  if (mixedLine) add(mixedLine.line, 0, mixedLine.indent.length, "warning", "Bu satırın girintisi Tab ile normal boşlukları karıştırıyor; bu kolayca TabError: inconsistent use of tabs and spaces in indentation hatasına yol açar.", "Dosyanın tamamında her seviye için 4 normal boşluk kullanın ve editörünüzde Tab'ı boşluğa çevirme özelliğini açın.");
  else if (usesTab && usesSpace) {
    const L = lines.find((x) => x.indent.includes("\t"));
    add(L.line, 0, L.indent.length, "warning", "Kod bazı satırlarda Tab, bazılarında normal boşluk kullanıyor; bu, her değişiklikte kolayca TabError hatasına yol açar.", "Dosyanın tamamında her seviye için 4 normal boşluk kullanın.");
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
      if (w <= indents[indents.length - 1]) add(L.line, 0, Math.max(1, t.length), "error", `${expectBlock.line}. satır «:» ile bitiyor; ardından içeriye girintili bir blok gelmelidir (IndentationError: expected an indented block after '${expectBlock.kw}' statement on line ${expectBlock.line}).`, "Bu satırı 4 boşluk içeriye girintileyin ya da blok geçici olarak boşsa pass yazın.");
      else indents.push(w);
      expectBlock = null;
    } else if (w > indents[indents.length - 1]) {
      add(L.line, 0, Math.max(1, L.indent.length), "error", "Beklenmeyen girinti: bu satır, «:» ile biten bir satır olmadan içeriye girintili (IndentationError: unexpected indent).", "Satır başındaki fazla boşlukları silin; satır bir önceki satırla aynı hizaya gelsin.");
      indents.push(w);
    }
    if (w < indents[indents.length - 1]) {
      while (indents.length > 1 && w < indents[indents.length - 1]) indents.pop();
      if (w !== indents[indents.length - 1]) {
        add(L.line, 0, Math.max(1, L.indent.length), "error", "Bu satırın girintisi önceki hiçbir blok seviyesiyle eşleşmiyor (IndentationError: unindent does not match any outer indentation level).", "Satırın girintisini ait olduğu bloğun girintisiyle tamamen eşitleyin (4 boşluğun katları).");
        indents.push(w);
      }
    }
    if (!odd && !usesTab && w % 4 !== 0) { odd = true; add(L.line, 0, L.indent.length, "info", "Girinti 4 boşluğun katı değil.", "Python'da (PEP 8) önerilen yöntem her seviye için 4 boşluktur."); }
    while (blocks.length && blocks[blocks.length - 1].w >= w) blocks.pop();
    for (const [k] of lastHeader) if (k > w) lastHeader.delete(k);
    const inFunc = blocks.some((b) => b.kw === "def");
    const loopIdx = blocks.map((b) => b.kw).lastIndexOf("for") > blocks.map((b) => b.kw).lastIndexOf("def") || blocks.map((b) => b.kw).lastIndexOf("while") > blocks.map((b) => b.kw).lastIndexOf("def");
    const colon = topColon(t);
    const isHeader = HEADERS.has(kw);
    const before = lastHeader.get(w);
    for (const [tw, tl] of openTry) {
      if (tw > w || (tw === w && kw !== "except" && kw !== "finally")) {
        add(tl, 0, 3, "error", `${tl}. satırdaki try bloğundan sonra except ya da finally yok (SyntaxError: expected 'except' or 'finally' block).`, "try bloğundan sonra, onunla aynı hizada bir except tür_hatası: ya da finally: ekleyin.");
        openTry.delete(tw);
      } else if (tw === w) openTry.delete(tw);
    }
    if (kw === "try") openTry.set(w, L.line);
    const original = physical[L.line - 1].trim();
    const elseIf = kw === "else" && /^else\s+if\b/.test(t);
    if (elseIf) add(L.line, lineCol, 7, "error", "Python «else if» kullanmaz.", "Bunun yerine elif yazın: elif koşul:");
    const cBrace = isHeader && /\{\s*$/.test(original);
    if (isHeader) {
      if (cBrace) add(L.line, lineCol + original.length - 1, 1, "error", "Python, C ve Java'dan farklı olarak blokları { } parantezleriyle değil, «:» ve girintiyle belirler.", `Şunu yazın: ${original.replace(/\s*\{\s*$/, "")}: ardından blok satırlarını 4 boşluk içeriye girintileyin ve } işaretini silin.`);
      else if (colon < 0) {
        const name = kw === "def" || kw === "class" ? `${kw} tanımı` : `${kw} ifadesi`;
        add(L.line, Math.min(physical[L.line - 1].length, lineCol + original.length), 1, "error", `${name} «:» ile bitmelidir (SyntaxError: expected ':').`, `Satırın sonuna «:» ekleyin: ${original.slice(0, 80)}:`);
      }
      if (kw === "def" && !/^(async\s+)?def\s+[A-Za-z_]\w*\s*\(/.test(t)) add(L.line, lineCol, t.length, "error", "Fonksiyon tanımında adından sonra parametresi olmasa bile iki parantez gerekir.", "Şunu yazın: def name():");
      if ((kw === "if" || kw === "elif" || kw === "while") && hasTopAssign(colon > 0 ? t.slice(kw.length, colon) : t.slice(kw.length))) add(L.line, lineCol, t.length, "error", "Koşulda == (karşılaştırma) yerine = (atama) kullandınız (SyntaxError: invalid syntax. Maybe you meant '==' or ':=' instead of '='?).", "Karşılaştırma için == kullanın, ör.: if x == 5:");
      if (kw === "elif" && !["if", "elif"].includes(before)) add(L.line, lineCol, 4, "error", "elif'ten önce aynı girinti seviyesinde bir if yok (SyntaxError: invalid syntax).", "elif'in, kendisini izleyen if ile tam olarak aynı hizada olduğundan emin olun.");
      if (kw === "else" && !elseIf && !["if", "elif", "for", "while", "try", "except"].includes(before)) add(L.line, lineCol, 4, "error", "Aynı girinti seviyesinde, önünde bir if (ya da for/while/try) olmayan bir else var (SyntaxError: invalid syntax).", "else'in, kendisini izleyen if ifadesi ile tam olarak aynı hizada olduğundan emin olun.");
      if (kw === "except" && !["try", "except"].includes(before)) add(L.line, lineCol, 6, "error", "try'dan önce aynı girinti seviyesinde olmayan bir except var.", "except'i try ile tam olarak aynı hizaya yazın.");
      if (kw === "finally" && !["try", "except", "else"].includes(before)) add(L.line, lineCol, 7, "error", "finally'den önce aynı girinti seviyesinde bir try yok.", "finally'yi try ile tam olarak aynı hizaya yazın.");
      if (kw === "except" && /^except\s*:/.test(t)) add(L.line, lineCol, 6, "info", "Hata türü belirtilmeyen except her hatayı yakalar, Ctrl+C dahil; bu da sorunların nedenlerini gizler.", "Hata türünü belirtin: except ValueError: ya da en azından except Exception:");
      if (kw === "def") {
        const params = (t.match(/\((.*)\)/) || ["", ""])[1].trim();
        const parentIsClass = blocks.length && blocks[blocks.length - 1].kw === "class";
        if (parentIsClass && !/^@staticmethod/.test(prevDecorator) && !/^(self|cls)\b/.test(params)) add(L.line, lineCol, t.length, "warning", "Sınıf içindeki bir metotta self parametresi yok; bu metot bir nesne üzerinden çağrıldığında TypeError: takes 0 positional arguments but 1 was given hatası oluşur.", "self'i ilk parametre yapın: def name(self, ...):, ya da önüne @staticmethod ekleyin.");
        if (/=\s*(\[\s*\]|\{\s*\}|list\(\)|dict\(\)|set\(\))/.test(params)) add(L.line, lineCol, t.length, "warning", "Değiştirilebilir bir varsayılan değer ([] ya da {}) bir kez oluşturulur ve tüm çağrılar arasında paylaşılır.", "None kullanın ve fonksiyonun içinde oluşturun: def f(a=None): if a is None: a = []");
      }
      if (!cBrace && (colon < 0 || !t.slice(colon + 1).trim())) expectBlock = { line: L.line, kw };
      blocks.push({ w, kw });
      lastHeader.set(w, kw);
    } else {
      lastHeader.delete(w);
      if (kw === "return" && !inFunc) add(L.line, lineCol, 6, "error", "return bir fonksiyonun dışında (SyntaxError: 'return' outside function).", "return'ü bir def fonksiyonunun içine koyun ya da silin.");
      if (kw === "yield" && !inFunc) add(L.line, lineCol, 5, "error", "yield bir fonksiyonun dışında.", "yield'i bir def fonksiyonunun içine koyun.");
      if ((kw === "break" || kw === "continue") && !loopIdx) add(L.line, lineCol, kw.length, "error", `${kw} bir döngünün dışında (SyntaxError: '${kw}' outside loop).`, `${kw} ifadesini for ya da while içine koyun.`);
      if (/^print\s+[^\s=(.,)]/.test(t) && !/^print\s*\(/.test(t)) add(L.line, lineCol, 5, "error", "Python 3'te print bir fonksiyon oldu ve parantez gerektirir (SyntaxError: Missing parentheses in call to 'print').", `Şunu yazın: print(${original.replace(/^print\s+/, "")})`);
      if (t === "}" || t === "{") add(L.line, lineCol, 1, "error", "Python blokları belirlemek için { } parantezlerini kullanmaz.", "Parantezi silin ve bloğu belirlemek için girintiye güvenin.");
      if (/^(\w+)\s*=\s*input\s*\(/.test(t)) strNames.add(t.match(/^(\w+)/)[1]);
      if (/^(\w+)\s*=\s*(int|float)\s*\(/.test(t)) strNames.delete(t.match(/^(\w+)/)[1]);
    }
    prevDecorator = t.startsWith("@") ? t : (isHeader ? "" : prevDecorator && kw ? "" : prevDecorator);
    const phys = lexed.masked[L.line - 1];
    const at = (re) => { const m = phys.match(re); return m ? m.index : lineCol; };
    if (/&&|\|\|/.test(t)) add(L.line, at(/&&|\|\|/), 2, "error", "Python && ve || kullanmaz.", "&& yerine and, || yerine or kullanın.");
    if (/(^|[^!=<>])!(?!=)\s*[\w(]/.test(t)) add(L.line, at(/!(?!=)/), 1, "error", "Python olumsuzlama için ! kullanmaz.", "not kullanın, ör.: if not done:");
    if (/[A-Za-z_]\w*\s*(\+\+|--)(?!\s*[\w(])/.test(t)) add(L.line, at(/\+\+|--/), 2, "error", "Python ++ ve -- desteklemez.", "x += 1 ya da x -= 1 kullanın.");
    if (/;\s*$/.test(t)) add(L.line, at(/;\s*$/), 1, "info", "Satır sonundaki noktalı virgül Python'da gereksizdir.", "Silin.");
    for (const m of t.matchAll(/\b(true|false|null|none|TRUE|FALSE|NULL|NONE|nil)\b/g)) {
      if (defined.has(m[1])) continue;
      const fixWord = { true: "True", false: "False", null: "None", none: "None", nil: "None" }[m[1].toLowerCase()];
      add(L.line, at(new RegExp(`\\b${m[1]}\\b`)), m[1].length, "error", `«${m[1]}» Python'da tanımlı değil (NameError); mantıksal değerler ve boş değer büyük harfle yazılır.`, `Şunu yazın: ${fixWord}.`);
    }
    if (/[=!]=\s*None\b/.test(t)) add(L.line, at(/[=!]=\s*None/), 2, "info", "None ile karşılaştırma == ile değil, is ile yapılır.", "Şunu yazın: if x is None: ya da if x is not None:");
    if (/\bis\s+(not\s+)?(-?\d|["'])/.test(t)) add(L.line, at(/\bis\s/), 2, "warning", "is nesnenin kimliğini karşılaştırır, değerini değil; sayılar ve metinlerle yanlış sonuç verebilir (SyntaxWarning).", "Değer karşılaştırması için == kullanın.");
    if (/["']\s*\+\s*-?\d|\d\s*\+\s*[rRbBuUfF]?["']/.test(t)) add(L.line, at(/["']\s*\+|\d\s*\+/), 1, "error", "Bir metin ile bir sayıyı toplamak TypeError: can only concatenate str (not \"int\") to str hatasına yol açar.", "Sayıyı str(5) ile metne çevirin ya da f-string kullanın: f\"yaş {age}\".");
    for (const n of strNames) {
      const re = new RegExp(`\\b${n}\\s*([-*/%<>]|\\+\\s*\\d)|(\\d\\s*[-*/%+<>]|[<>]=?)\\s*${n}\\b`);
      if (re.test(t) && !new RegExp(`^${n}\\s*=`).test(t)) {
        add(L.line, at(new RegExp(`\\b${n}\\b`)), n.length, "warning", `«${n}» değeri input()'tan gelir; input() her zaman metin döndürür, bu yüzden üzerinde yapılan aritmetik işlem ya da karşılaştırma TypeError verir.`, `Sayıya çevirin: ${n} = int(input(...)) ya da float(...).`);
        strNames.delete(n);
      }
    }
  }
  for (const tl of openTry.values()) add(tl, 0, 3, "error", `${tl}. satırdaki try bloğundan sonra except ya da finally yok (SyntaxError: expected 'except' or 'finally' block).`, "try bloğundan sonra, onunla aynı hizada bir except tür_hatası: ya da finally: ekleyin.");
  if (expectBlock) add(expectBlock.line, 0, 1, "error", `Kod, ${expectBlock.line}. satırdaki «:» ile biten ifadeden sonra girintili blok olmadan bitti (IndentationError: expected an indented block).`, "Blok satırlarını 4 boşluk girintili ekleyin ya da pass yazın.");
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
        add(m ? L.line : L.line, m ? m.index : 0, n.length, guess ? "error" : "warning", `«${n}» adı tanımlı değil${guess ? `, belki de «${guess}» demek istediniz` : ""} (NameError: name '${n}' is not defined).`, guess ? `Adı «${guess}» olarak düzeltin.` : `«${n}» adını kullanmadan önce tanımlayın ya da bir kütüphaneden geliyorsa import ile içe aktarın.`);
      }
    }
  }
  return issues;
}

export function solve(input) {
  const code = readCode(input, "code");
  const issues = check(code);
  const n = code.split("\n").length;
  const linesWord = n === 1 ? "bir satır" : n === 2 ? "iki satır" : n <= 10 ? `${n} satır` : `${n} satır`;
  const lexical = issues.some((i) => /unterminated|was never closed|unmatched|does not match/.test(i.message));
  const steps = [
    `${linesWord} okuduk; yorumları ve metin içeriklerini yok saydık, ardından parantezleri ve tırnak işaretlerini izledik.`,
    lexical ? "Parantez ya da metinlerde bir sorun bulundu; bu sorun geri kalan çözümlemeyi bozar, bu yüzden önce onu düzeltip denetimi yeniden çalıştırın." : "Mantıksal satırları topladık (parantez içinde kırılan satır tek satır sayılır) ve girintiyi denetledik: «:» ile biten her satırın ardından girintili bir blok gelmelidir ve geri dönüş önceki bir seviyeyle eşleşmelidir.",
    "Ardından yaygın kuralları denetledik: if, for, def… sonrasındaki iki noktalar, koşullarda == yerine = kullanımı, else/elif/except'in yerleri, return ve break'in yanlış yerleri, tanımsız adlar ve yazım hataları ile && , ++ ve true gibi diğer dillerin alışkanlıkları.",
    "Not: denetim kodu çalıştırmadan yapılır; bu yüzden değere bağlı çalışma zamanı hatalarını, örneğin sıfıra bölmeyi yakalamaz."
  ];
  const out = report(code, issues, { "Satır sayısı": n });
  return { results: out.results, steps, blocks: out.blocks, copy: out.copy };
}
