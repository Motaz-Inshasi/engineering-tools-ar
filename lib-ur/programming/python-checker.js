import { readCode, report, closest } from "./code-view.js";

export const meta = {
  description: "Python کوڈ چسپاں کریں تاکہ انڈینٹیشن، کولنز، بریکٹس، بند نہ ہونے والے اسٹرنگز اور غیر متعین ناموں کی غلطیاں دریافت ہوں، ہر غلطی کی اردو وضاحت اور اصلاح کے طریقے کے ساتھ۔",
  keywords: ["python", "پائتھن", "کوڈ کی جانچ", "IndentationError", "SyntaxError", "NameError", "غلطیوں کی تصحیح", "linter"],
  formulas: [{ label: "کوڈ کو منطقی سطروں میں تقسیم کیا جاتا ہے، پھر انڈینٹیشن، بلاکس اور عام غلطیوں کے اصول جانچے جاتے ہیں", tex: "\\text{code} \\rightarrow \\text{tokens} \\rightarrow \\text{blocks} \\rightarrow \\text{issues}" }],
  inputs: [
    { id: "code", label: "Python کوڈ", type: "textarea", rows: 12, wide: true, placeholder: "def greet(name):\n    print(\"Hello\", name)" }
  ],
  example: {
    values: { code: "def average(numbers)\n    total = 0\n    for n in numbers:\n        total += n\n    return total / len(numbers)\n\nscores = [90, 85, 77]\nprint(averge(scores))" },
    expect: ["':'", "سطر 1"],
    note: "مثال: ایک فنکشن جس میں طالب علم نے تعریف کے بعد کولن بھول گیا، اور اسے بلاتے وقت فنکشن کا نام غلط لکھا۔"
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
const BR_NAME = { "(": "بریکٹ (", "[": "بریکٹ [", "{": "بریکٹ {" };

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
          ? { line: startLine, col: startCol, len: 3, severity: "error", message: `تین اقتباسی نشانات ${q} والا اسٹرنگ کوڈ کے آخر تک بند نہیں ہوا (unterminated triple-quoted string literal)۔`, fix: `متن کے آخر میں ${q} شامل کریں۔` }
          : { line: startLine, col: startCol, len: 1, severity: "error", message: `«${q}» سے شروع ہونے والا اسٹرنگ اسی سطر پر بند نہیں ہوا (unterminated string literal)۔`, fix: `سطر کے ختم ہونے سے پہلے ${q} سے اسٹرنگ بند کریں، یا کثیر سطری اسٹرنگ کے لیے تین ${q.repeat(3)} استعمال کریں۔` });
      }
      continue;
    }
    if (PAIRS[c]) stack.push({ ch: c, line, col });
    else if (CLOSE[c]) {
      const top = stack[stack.length - 1];
      if (!top) issues.push({ line, col, len: 1, severity: "error", message: `بند کرنے والا بریکٹ «${c}» فالتو ہے اور اس کا کھلنے والا بریکٹ موجود نہیں (unmatched '${c}')۔`, fix: "یہ بریکٹ حذف کریں، یا غائب کھلنے والا بریکٹ شامل کریں۔" });
      else if (top.ch !== CLOSE[c]) { issues.push({ line, col, len: 1, severity: "error", message: `بریکٹ «${c}» سطر ${top.line} پر کھلے «${top.ch}» سے مطابقت نہیں رکھتا (closing parenthesis '${c}' does not match opening parenthesis '${top.ch}')۔`, fix: `«${top.ch}» کو «${PAIRS[top.ch]}» سے بند کریں۔` }); stack.pop(); }
      else stack.pop();
    }
    push(c); i++; col++;
  }
  masked.push(cur);
  for (const s of stack) issues.push({ line: s.line, col: s.col, len: 1, severity: "error", message: `${BR_NAME[s.ch]} جو سطر ${s.line} پر کھلا تھا بند نہیں ہوا ('${s.ch}' was never closed)۔`, fix: `مناسب جگہ پر «${PAIRS[s.ch]}» شامل کریں۔` });
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
  if (mixedLine) add(mixedLine.line, 0, mixedLine.indent.length, "warning", "اس سطر کا انڈینٹ Tab اور عام اسپیسز کو ملا رہا ہے، جس سے آسانی سے TabError: inconsistent use of tabs and spaces in indentation ہو جاتا ہے۔", "پوری فائل میں ہر سطح کے لیے 4 عام اسپیسز استعمال کریں، اور اپنے ایڈیٹر میں Tab کو اسپیسز میں بدلنے کا آپشن فعال کریں۔");
  else if (usesTab && usesSpace) {
    const L = lines.find((x) => x.indent.includes("\t"));
    add(L.line, 0, L.indent.length, "warning", "کوڈ کچھ سطروں میں Tab اور کچھ میں عام اسپیسز استعمال کرتا ہے، جس سے کسی بھی تبدیلی پر آسانی سے TabError آ سکتا ہے۔", "پوری فائل میں ہر سطح کے لیے 4 عام اسپیسز استعمال کریں۔");
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
      if (w <= indents[indents.length - 1]) add(L.line, 0, Math.max(1, t.length), "error", `سطر ${expectBlock.line} کے بعد جو «:» پر ختم ہوتی ہے، اندر کی طرف انڈینٹ کیا ہوا بلاک آنا چاہیے (IndentationError: expected an indented block after '${expectBlock.kw}' statement on line ${expectBlock.line})۔`, "اس سطر کو 4 اسپیسز اندر کی طرف انڈینٹ کریں، یا اگر بلاک عارضی طور پر خالی ہے تو pass لکھیں۔");
      else indents.push(w);
      expectBlock = null;
    } else if (w > indents[indents.length - 1]) {
      add(L.line, 0, Math.max(1, L.indent.length), "error", "غیر متوقع انڈینٹ: یہ سطر اندر کی طرف انڈینٹ ہے لیکن اس سے پہلے «:» پر ختم ہونے والی کوئی سطر نہیں (IndentationError: unexpected indent)۔", "سطر کے شروع کی فالتو اسپیسز حذف کریں تاکہ وہ پچھلی سطر کے ساتھ ہم قطار ہو جائے۔");
      indents.push(w);
    }
    if (w < indents[indents.length - 1]) {
      while (indents.length > 1 && w < indents[indents.length - 1]) indents.pop();
      if (w !== indents[indents.length - 1]) {
        add(L.line, 0, Math.max(1, L.indent.length), "error", "یہ سطر کسی پچھلے بلاک کے انڈینٹ لیول سے مطابقت نہیں رکھتی (IndentationError: unindent does not match any outer indentation level)۔", "سطر کا انڈینٹ اس بلاک کے انڈینٹ کے برابر کریں جس سے وہ تعلق رکھتی ہے (4 اسپیسز کے مضاعف)۔");
        indents.push(w);
      }
    }
    if (!odd && !usesTab && w % 4 !== 0) { odd = true; add(L.line, 0, L.indent.length, "info", "انڈینٹ 4 اسپیسز کے مضاعف نہیں ہے۔", "Python کا معیاری طریقہ (PEP 8) ہر سطح کے لیے 4 اسپیسز ہے۔"); }
    while (blocks.length && blocks[blocks.length - 1].w >= w) blocks.pop();
    for (const [k] of lastHeader) if (k > w) lastHeader.delete(k);
    const inFunc = blocks.some((b) => b.kw === "def");
    const loopIdx = blocks.map((b) => b.kw).lastIndexOf("for") > blocks.map((b) => b.kw).lastIndexOf("def") || blocks.map((b) => b.kw).lastIndexOf("while") > blocks.map((b) => b.kw).lastIndexOf("def");
    const colon = topColon(t);
    const isHeader = HEADERS.has(kw);
    const before = lastHeader.get(w);
    for (const [tw, tl] of openTry) {
      if (tw > w || (tw === w && kw !== "except" && kw !== "finally")) {
        add(tl, 0, 3, "error", `سطر ${tl} پر try بلاک کے بعد except یا finally نہیں ہے (SyntaxError: expected 'except' or 'finally' block)۔`, "try بلاک کے بعد اس کے ہم قطار except نوع_الخطأ: یا finally: شامل کریں۔");
        openTry.delete(tw);
      } else if (tw === w) openTry.delete(tw);
    }
    if (kw === "try") openTry.set(w, L.line);
    const original = physical[L.line - 1].trim();
    const elseIf = kw === "else" && /^else\s+if\b/.test(t);
    if (elseIf) add(L.line, lineCol, 7, "error", "Python میں «else if» استعمال نہیں ہوتا۔", "اس کی جگہ elif لکھیں: elif شرط:");
    const cBrace = isHeader && /\{\s*$/.test(original);
    if (isHeader) {
      if (cBrace) add(L.line, lineCol + original.length - 1, 1, "error", "Python C اور Java کی طرح بلاکس کے لیے { } استعمال نہیں کرتا، بلکہ کولن «:» اور انڈینٹ استعمال کرتا ہے۔", `لکھیں: ${original.replace(/\s*\{\s*$/, "")}: پھر بلاک کی سطریں 4 اسپیسز اندر کریں اور } حذف کریں۔`);
      else if (colon < 0) {
        const name = kw === "def" || kw === "class" ? `تعریف ${kw}` : `جملہ ${kw}`;
        add(L.line, Math.min(physical[L.line - 1].length, lineCol + original.length), 1, "error", `${name} کو کولن «:» پر ختم ہونا چاہیے (SyntaxError: expected ':')۔`, `سطر کے آخر میں «:» شامل کریں: ${original.slice(0, 80)}:`);
      }
      if (kw === "def" && !/^(async\s+)?def\s+[A-Za-z_]\w*\s*\(/.test(t)) add(L.line, lineCol, t.length, "error", "فنکشن کی تعریف میں نام کے بعد دو قوسین ضروری ہیں، چاہے اس کے پیرامیٹرز نہ ہوں۔", "لکھیں: def name():");
      if ((kw === "if" || kw === "elif" || kw === "while") && hasTopAssign(colon > 0 ? t.slice(kw.length, colon) : t.slice(kw.length))) add(L.line, lineCol, t.length, "error", "شرط کے اندر == (مقابلہ) کی جگہ = (تفویض) استعمال ہوا ہے (SyntaxError: invalid syntax. Maybe you meant '==' or ':=' instead of '='?)۔", "مقابلے کے لیے == استعمال کریں، مثلاً: if x == 5:");
      if (kw === "elif" && !["if", "elif"].includes(before)) add(L.line, lineCol, 4, "error", "elif کے اوپر اسی انڈینٹ لیول پر کوئی if نہیں (SyntaxError: invalid syntax)۔", "یقینی بنائیں کہ elif اپنی if کے ساتھ بالکل ہم قطار ہو۔");
      if (kw === "else" && !elseIf && !["if", "elif", "for", "while", "try", "except"].includes(before)) add(L.line, lineCol, 4, "error", "else کے اوپر اسی انڈینٹ لیول پر if (یا for/while/try) نہیں ہے (SyntaxError: invalid syntax)۔", "یقینی بنائیں کہ else بالکل اس if کے ساتھ ہم قطار ہو جس سے وہ جڑا ہے۔");
      if (kw === "except" && !["try", "except"].includes(before)) add(L.line, lineCol, 6, "error", "except کے اوپر اسی انڈینٹ لیول پر try نہیں ہے۔", "except کو try کے ساتھ بالکل ہم قطار رکھیں۔");
      if (kw === "finally" && !["try", "except", "else"].includes(before)) add(L.line, lineCol, 7, "error", "finally کے اوپر اسی انڈینٹ لیول پر try نہیں ہے۔", "finally کو try کے ساتھ بالکل ہم قطار رکھیں۔");
      if (kw === "except" && /^except\s*:/.test(t)) add(L.line, lineCol, 6, "info", "except: بغیر خطا کی قسم کے ہر غلطی پکڑتا ہے، حتیٰ کہ Ctrl+C بھی، اس لیے مسائل کی وجوہات چھپ جاتی ہیں۔", "خطا کی قسم متعین کریں: except ValueError: یا کم از کم except Exception:");
      if (kw === "def") {
        const params = (t.match(/\((.*)\)/) || ["", ""])[1].trim();
        const parentIsClass = blocks.length && blocks[blocks.length - 1].kw === "class";
        if (parentIsClass && !/^@staticmethod/.test(prevDecorator) && !/^(self|cls)\b/.test(params)) add(L.line, lineCol, t.length, "warning", "کلاس کے اندر فنکشن (method) میں self پیرامیٹر نہیں ہے، اس لیے اسے آبجیکٹ سے بلانے پر TypeError: takes 0 positional arguments but 1 was given ہوگا۔", "self کو پہلا پیرامیٹر بنائیں: def name(self, ...):، یا اس سے پہلے @staticmethod لگائیں۔");
        if (/=\s*(\[\s*\]|\{\s*\}|list\(\)|dict\(\)|set\(\))/.test(params)) add(L.line, lineCol, t.length, "warning", "قابلِ تبدیل ڈیفالٹ قدر ([] یا {}) ایک بار بنتی ہے اور تمام کالز کے درمیان مشترک رہتی ہے۔", "None استعمال کریں اور فنکشن کے اندر بنائیں: def f(a=None): if a is None: a = []");
      }
      if (!cBrace && (colon < 0 || !t.slice(colon + 1).trim())) expectBlock = { line: L.line, kw };
      blocks.push({ w, kw });
      lastHeader.set(w, kw);
    } else {
      lastHeader.delete(w);
      if (kw === "return" && !inFunc) add(L.line, lineCol, 6, "error", "return کسی فنکشن سے باہر ہے (SyntaxError: 'return' outside function)۔", "return کو def فنکشن کے اندر رکھیں، یا اسے حذف کریں۔");
      if (kw === "yield" && !inFunc) add(L.line, lineCol, 5, "error", "yield کسی فنکشن سے باہر ہے۔", "yield کو def فنکشن کے اندر رکھیں۔");
      if ((kw === "break" || kw === "continue") && !loopIdx) add(L.line, lineCol, kw.length, "error", `${kw} لوپ سے باہر ہے (SyntaxError: '${kw}' outside loop)۔`, `${kw} کو for یا while کے اندر رکھیں۔`);
      if (/^print\s+[^\s=(.,)]/.test(t) && !/^print\s*\(/.test(t)) add(L.line, lineCol, 5, "error", "Python 3 میں print ایک فنکشن ہے جسے دو قوسین درکار ہیں (SyntaxError: Missing parentheses in call to 'print')۔", `لکھیں: print(${original.replace(/^print\s+/, "")})`);
      if (t === "}" || t === "{") add(L.line, lineCol, 1, "error", "Python بلاکس متعین کرنے کے لیے { } استعمال نہیں کرتا۔", "قوس حذف کریں اور بلاک متعین کرنے کے لیے انڈینٹیشن پر انحصار کریں۔");
      if (/^(\w+)\s*=\s*input\s*\(/.test(t)) strNames.add(t.match(/^(\w+)/)[1]);
      if (/^(\w+)\s*=\s*(int|float)\s*\(/.test(t)) strNames.delete(t.match(/^(\w+)/)[1]);
    }
    prevDecorator = t.startsWith("@") ? t : (isHeader ? "" : prevDecorator && kw ? "" : prevDecorator);
    const phys = lexed.masked[L.line - 1];
    const at = (re) => { const m = phys.match(re); return m ? m.index : lineCol; };
    if (/&&|\|\|/.test(t)) add(L.line, at(/&&|\|\|/), 2, "error", "Python میں && اور || استعمال نہیں ہوتے۔", "&& کی جگہ and اور || کی جگہ or استعمال کریں۔");
    if (/(^|[^!=<>])!(?!=)\s*[\w(]/.test(t)) add(L.line, at(/!(?!=)/), 1, "error", "Python نفی کے لیے ! استعمال نہیں کرتا۔", "not استعمال کریں، مثلاً: if not done:");
    if (/[A-Za-z_]\w*\s*(\+\+|--)(?!\s*[\w(])/.test(t)) add(L.line, at(/\+\+|--/), 2, "error", "Python میں ++ یا -- سپورٹ نہیں ہوتے۔", "x += 1 یا x -= 1 استعمال کریں۔");
    if (/;\s*$/.test(t)) add(L.line, at(/;\s*$/), 1, "info", "سطر کے آخر میں سیمی کولن Python میں ضروری نہیں ہے۔", "اسے حذف کریں۔");
    for (const m of t.matchAll(/\b(true|false|null|none|TRUE|FALSE|NULL|NONE|nil)\b/g)) {
      if (defined.has(m[1])) continue;
      const fixWord = { true: "True", false: "False", null: "None", none: "None", nil: "None" }[m[1].toLowerCase()];
      add(L.line, at(new RegExp(`\\b${m[1]}\\b`)), m[1].length, "error", `«${m[1]}» Python میں غیر متعین ہے (NameError)، منطقی قدریں اور خالی قدر بڑے حرف سے لکھی جاتی ہیں۔`, `لکھیں ${fixWord}۔`);
    }
    if (/[=!]=\s*None\b/.test(t)) add(L.line, at(/[=!]=\s*None/), 2, "info", "None کے ساتھ مقابلہ is سے ہوتا ہے، == سے نہیں۔", "لکھیں: if x is None: یا if x is not None:");
    if (/\bis\s+(not\s+)?(-?\d|["'])/.test(t)) add(L.line, at(/\bis\s/), 2, "warning", "is آبجیکٹ کی شناخت کا موازنہ کرتا ہے، قدر کا نہیں، اور ہندسوں اور اسٹرنگز کے ساتھ غلط نتیجہ دے سکتا ہے (SyntaxWarning)۔", "قدر کے موازنے کے لیے == استعمال کریں۔");
    if (/["']\s*\+\s*-?\d|\d\s*\+\s*[rRbBuUfF]?["']/.test(t)) add(L.line, at(/["']\s*\+|\d\s*\+/), 1, "error", "نمبر کے ساتھ اسٹرنگ کو جوڑنے سے TypeError: can only concatenate str (not \"int\") to str ہوتا ہے۔", "نمبر کو str(5) سے اسٹرنگ میں بدلیں، یا f-string استعمال کریں: f\"عمر {age}\"۔");
    for (const n of strNames) {
      const re = new RegExp(`\\b${n}\\s*([-*/%<>]|\\+\\s*\\d)|(\\d\\s*[-*/%+<>]|[<>]=?)\\s*${n}\\b`);
      if (re.test(t) && !new RegExp(`^${n}\\s*=`).test(t)) {
        add(L.line, at(new RegExp(`\\b${n}\\b`)), n.length, "warning", `«${n}» کی قدر input() سے آتی ہے، اور input() ہمیشہ اسٹرنگ دیتا ہے، اس لیے اس پر حسابی عمل یا مقابلہ TypeError دے گا۔`, `اسے نمبر میں بدلیں: ${n} = int(input(...)) یا float(...)۔`);
        strNames.delete(n);
      }
    }
  }
  for (const tl of openTry.values()) add(tl, 0, 3, "error", `سطر ${tl} پر try بلاک کے بعد except یا finally نہیں ہے (SyntaxError: expected 'except' or 'finally' block)۔`, "try بلاک کے بعد اس کے ہم قطار except نوع_الخطأ: یا finally: شامل کریں۔");
  if (expectBlock) add(expectBlock.line, 0, 1, "error", `سطر ${expectBlock.line} کے بعد جو «:» پر ختم ہوتی ہے، انڈینٹ شدہ بلاک کے بغیر کوڈ ختم ہو گیا (IndentationError: expected an indented block)۔`, "بلاک کی سطریں 4 اسپیسز انڈینٹ کرکے شامل کریں، یا pass لکھیں۔");
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
        add(m ? L.line : L.line, m ? m.index : 0, n.length, guess ? "error" : "warning", `نام «${n}» غیر متعین ہے${guess ? `، شاید مراد «${guess}» ہو` : ""} (NameError: name '${n}' is not defined)۔`, guess ? `نام درست کرکے «${guess}» کریں۔` : `«${n}» کو استعمال سے پہلے متعین کریں، یا اگر یہ لائبریری سے ہے تو import سے درآمد کریں۔`);
      }
    }
  }
  return issues;
}

export function solve(input) {
  const code = readCode(input, "code");
  const issues = check(code);
  const n = code.split("\n").length;
  const linesWord = n === 1 ? "ایک سطر" : n === 2 ? "دو سطریں" : n <= 10 ? `${n} سطریں` : `${n} سطریں`;
  const lexical = issues.some((i) => /unterminated|was never closed|unmatched|does not match/.test(i.message));
  const steps = [
    `ہم نے ${linesWord} پڑھیں، تبصروں اور اسٹرنگ کے مواد کو نظرانداز کیا، پھر بریکٹس اور اقتباسی نشانات کا سراغ لگایا۔`,
    lexical ? "بریکٹس یا اسٹرنگز میں ایک مسئلہ ہے جو باقی تجزیے کو الجھا دیتا ہے، اس لیے پہلے اسے درست کریں، پھر دوبارہ جانچیں۔" : "ہم نے منطقی سطریں جوڑیں (بریکٹس کے اندر ٹوٹی ہوئی سطر ایک سطر شمار ہوتی ہے)، اور انڈینٹیشن جانچی: ہر سطر جو «:» پر ختم ہو اس کے بعد انڈینٹ شدہ بلاک آنا چاہیے، اور واپسی کا انڈینٹ کسی پچھلے لیول سے مطابقت رکھنا چاہیے۔",
    "پھر ہم نے عام قواعد جانچے: if اور for اور def کے بعد کولن، شرطوں میں == کی جگہ =، else/elif/except اپنی جگہ پر، return اور break اپنی جگہ سے باہر، غیر متعین نام اور املا کی غلطیاں، اور دیگر زبانوں کی عادات جیسے && اور ++ اور true۔",
    "نوٹ: جانچ جامد ہے (کوڈ چلائے بغیر)، اس لیے وہ رن ٹائم غلطیاں نہیں پکڑتی جو قدروں پر منحصر ہوں، جیسے صفر سے تقسیم۔"
  ];
  const out = report(code, issues, { "سطروں کی تعداد": n });
  return { results: out.results, steps, blocks: out.blocks, copy: out.copy };
}
