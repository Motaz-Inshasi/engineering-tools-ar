import { readCode, report, closest } from "./code-view.js";

export const meta = {
  description: "الصق كود Python لاكتشاف أخطاء المسافات البادئة والنقطتين والأقواس والنصوص غير المغلقة والأسماء غير المعرّفة، مع شرح كل خطأ بالعربية وطريقة إصلاحه.",
  keywords: ["python", "بايثون", "فحص الكود", "IndentationError", "SyntaxError", "NameError", "تصحيح الأخطاء", "linter"],
  formulas: [{ label: "يُقسَّم الكود إلى أسطر منطقية، ثم تُفحص المسافات البادئة والكتل وقواعد الأخطاء الشائعة", tex: "\\text{code} \\rightarrow \\text{tokens} \\rightarrow \\text{blocks} \\rightarrow \\text{issues}" }],
  inputs: [
    { id: "code", label: "كود Python", type: "textarea", rows: 12, wide: true, placeholder: "def greet(name):\n    print(\"Hello\", name)" }
  ],
  example: {
    values: { code: "def average(numbers)\n    total = 0\n    for n in numbers:\n        total += n\n    return total / len(numbers)\n\nscores = [90, 85, 77]\nprint(averge(scores))" },
    expect: ["':'", "السطر 1"],
    note: "مثال: دالة نسي فيها الطالب النقطتين بعد التعريف، وكتب اسم الدالة خطأً عند استدعائها."
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
const BR_NAME = { "(": "القوس (", "[": "القوس [", "{": "القوس {" };

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
          ? { line: startLine, col: startCol, len: 3, severity: "error", message: `نص بثلاث علامات تنصيص ${q} لم يُغلق حتى نهاية الكود (unterminated triple-quoted string literal).`, fix: `أضف ${q} في نهاية النص.` }
          : { line: startLine, col: startCol, len: 1, severity: "error", message: `النص الذي يبدأ بـ ${q} لم يُغلق على السطر نفسه (unterminated string literal).`, fix: `أغلق النص بـ ${q} قبل نهاية السطر، أو استخدم ثلاث علامات ${q.repeat(3)} لنص متعدد الأسطر.` });
      }
      continue;
    }
    if (PAIRS[c]) stack.push({ ch: c, line, col });
    else if (CLOSE[c]) {
      const top = stack[stack.length - 1];
      if (!top) issues.push({ line, col, len: 1, severity: "error", message: `قوس الإغلاق «${c}» زائد ولا يقابله قوس فتح (unmatched '${c}').`, fix: "احذف هذا القوس أو أضف قوس الفتح الناقص." });
      else if (top.ch !== CLOSE[c]) { issues.push({ line, col, len: 1, severity: "error", message: `القوس «${c}» لا يطابق «${top.ch}» المفتوح في السطر ${top.line} (closing parenthesis '${c}' does not match opening parenthesis '${top.ch}').`, fix: `أغلق «${top.ch}» بـ «${PAIRS[top.ch]}».` }); stack.pop(); }
      else stack.pop();
    }
    push(c); i++; col++;
  }
  masked.push(cur);
  for (const s of stack) issues.push({ line: s.line, col: s.col, len: 1, severity: "error", message: `${BR_NAME[s.ch]} المفتوح في السطر ${s.line} لم يُغلق ('${s.ch}' was never closed).`, fix: `أضف «${PAIRS[s.ch]}» في المكان المناسب.` });
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
  if (mixedLine) add(mixedLine.line, 0, mixedLine.indent.length, "warning", "إزاحة هذا السطر تخلط بين Tab والمسافات العادية، وهذا يسبب بسهولة TabError: inconsistent use of tabs and spaces in indentation.", "استخدم 4 مسافات عادية لكل مستوى في الملف كله، وفعّل في محررك تحويل Tab إلى مسافات.");
  else if (usesTab && usesSpace) {
    const L = lines.find((x) => x.indent.includes("\t"));
    add(L.line, 0, L.indent.length, "warning", "الكود يستخدم Tab في بعض الأسطر ومسافات عادية في أخرى، وهذا يسبب TabError بسهولة عند أي تعديل.", "استخدم 4 مسافات عادية لكل مستوى في الملف كله.");
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
      if (w <= indents[indents.length - 1]) add(L.line, 0, Math.max(1, t.length), "error", `بعد السطر ${expectBlock.line} المنتهي بـ «:» يجب أن تأتي كتلة مُزاحة إلى الداخل (IndentationError: expected an indented block after '${expectBlock.kw}' statement on line ${expectBlock.line}).`, "أزِح هذا السطر 4 مسافات إلى الداخل، أو اكتب pass إذا كانت الكتلة فارغة مؤقتاً.");
      else indents.push(w);
      expectBlock = null;
    } else if (w > indents[indents.length - 1]) {
      add(L.line, 0, Math.max(1, L.indent.length), "error", "إزاحة غير متوقعة: هذا السطر مُزاح إلى الداخل دون أن يسبقه سطر ينتهي بـ «:» (IndentationError: unexpected indent).", "احذف المسافات الزائدة في بداية السطر ليصبح بمحاذاة السطر الذي قبله.");
      indents.push(w);
    }
    if (w < indents[indents.length - 1]) {
      while (indents.length > 1 && w < indents[indents.length - 1]) indents.pop();
      if (w !== indents[indents.length - 1]) {
        add(L.line, 0, Math.max(1, L.indent.length), "error", "هذا السطر لا يطابق مستوى إزاحة أي كتلة سابقة (IndentationError: unindent does not match any outer indentation level).", "اجعل إزاحة السطر مساوية تماماً لإزاحة الكتلة التي ينتمي إليها (مضاعفات 4 مسافات).");
        indents.push(w);
      }
    }
    if (!odd && !usesTab && w % 4 !== 0) { odd = true; add(L.line, 0, L.indent.length, "info", "الإزاحة ليست من مضاعفات 4 مسافات.", "الأسلوب المعتمد في Python (PEP 8) هو 4 مسافات لكل مستوى."); }
    while (blocks.length && blocks[blocks.length - 1].w >= w) blocks.pop();
    for (const [k] of lastHeader) if (k > w) lastHeader.delete(k);
    const inFunc = blocks.some((b) => b.kw === "def");
    const loopIdx = blocks.map((b) => b.kw).lastIndexOf("for") > blocks.map((b) => b.kw).lastIndexOf("def") || blocks.map((b) => b.kw).lastIndexOf("while") > blocks.map((b) => b.kw).lastIndexOf("def");
    const colon = topColon(t);
    const isHeader = HEADERS.has(kw);
    const before = lastHeader.get(w);
    for (const [tw, tl] of openTry) {
      if (tw > w || (tw === w && kw !== "except" && kw !== "finally")) {
        add(tl, 0, 3, "error", `الكتلة try في السطر ${tl} بلا except أو finally بعدها (SyntaxError: expected 'except' or 'finally' block).`, "أضف بعد كتلة try كتلة except نوع_الخطأ: أو finally: بمحاذاتها.");
        openTry.delete(tw);
      } else if (tw === w) openTry.delete(tw);
    }
    if (kw === "try") openTry.set(w, L.line);
    const original = physical[L.line - 1].trim();
    const elseIf = kw === "else" && /^else\s+if\b/.test(t);
    if (elseIf) add(L.line, lineCol, 7, "error", "Python لا تستخدم «else if».", "اكتب elif بدلاً منها: elif شرط:");
    const cBrace = isHeader && /\{\s*$/.test(original);
    if (isHeader) {
      if (cBrace) add(L.line, lineCol + original.length - 1, 1, "error", "Python لا تستخدم الأقواس { } لتحديد الكتل كما في C و Java، بل النقطتين «:» والإزاحة.", `اكتب: ${original.replace(/\s*\{\s*$/, "")}: ثم أزِح أسطر الكتلة 4 مسافات واحذف }.`);
      else if (colon < 0) {
        const name = kw === "def" || kw === "class" ? `تعريف ${kw}` : `الجملة ${kw}`;
        add(L.line, Math.min(physical[L.line - 1].length, lineCol + original.length), 1, "error", `${name} يجب أن ينتهي بنقطتين «:» (SyntaxError: expected ':').`, `أضف «:» في نهاية السطر: ${original.slice(0, 80)}:`);
      }
      if (kw === "def" && !/^(async\s+)?def\s+[A-Za-z_]\w*\s*\(/.test(t)) add(L.line, lineCol, t.length, "error", "تعريف الدالة يحتاج قوسين بعد اسمها حتى لو لم تكن لها معاملات.", "اكتب: def name():");
      if ((kw === "if" || kw === "elif" || kw === "while") && hasTopAssign(colon > 0 ? t.slice(kw.length, colon) : t.slice(kw.length))) add(L.line, lineCol, t.length, "error", "استخدمت = (إسناد) داخل الشرط بدل == (مقارنة) (SyntaxError: invalid syntax. Maybe you meant '==' or ':=' instead of '='?).", "استخدم == للمقارنة، مثل: if x == 5:");
      if (kw === "elif" && !["if", "elif"].includes(before)) add(L.line, lineCol, 4, "error", "elif بلا if قبلها على مستوى الإزاحة نفسه (SyntaxError: invalid syntax).", "تأكد أن elif بمحاذاة if التي تتبعها تماماً.");
      if (kw === "else" && !elseIf && !["if", "elif", "for", "while", "try", "except"].includes(before)) add(L.line, lineCol, 4, "error", "else بلا if (أو for/while/try) قبلها على مستوى الإزاحة نفسه (SyntaxError: invalid syntax).", "تأكد أن else بمحاذاة الجملة if التي تتبعها تماماً.");
      if (kw === "except" && !["try", "except"].includes(before)) add(L.line, lineCol, 6, "error", "except بلا try قبلها على مستوى الإزاحة نفسه.", "ضع except بمحاذاة try تماماً.");
      if (kw === "finally" && !["try", "except", "else"].includes(before)) add(L.line, lineCol, 7, "error", "finally بلا try قبلها على مستوى الإزاحة نفسه.", "ضع finally بمحاذاة try تماماً.");
      if (kw === "except" && /^except\s*:/.test(t)) add(L.line, lineCol, 6, "info", "except: بلا نوع خطأ تلتقط كل الأخطاء، حتى Ctrl+C، فتُخفي أسباب المشكلات.", "حدّد نوع الخطأ: except ValueError: أو على الأقل except Exception:");
      if (kw === "def") {
        const params = (t.match(/\((.*)\)/) || ["", ""])[1].trim();
        const parentIsClass = blocks.length && blocks[blocks.length - 1].kw === "class";
        if (parentIsClass && !/^@staticmethod/.test(prevDecorator) && !/^(self|cls)\b/.test(params)) add(L.line, lineCol, t.length, "warning", "دالة داخل صنف (method) بلا المعامل self، فعند استدعائها من كائن سيحدث TypeError: takes 0 positional arguments but 1 was given.", "اجعل self أول معامل: def name(self, ...):، أو أضف @staticmethod قبلها.");
        if (/=\s*(\[\s*\]|\{\s*\}|list\(\)|dict\(\)|set\(\))/.test(params)) add(L.line, lineCol, t.length, "warning", "قيمة افتراضية قابلة للتعديل ([] أو {}) تُنشأ مرة واحدة وتُشارك بين كل الاستدعاءات.", "استخدم None ثم أنشئها داخل الدالة: def f(a=None): if a is None: a = []");
      }
      if (!cBrace && (colon < 0 || !t.slice(colon + 1).trim())) expectBlock = { line: L.line, kw };
      blocks.push({ w, kw });
      lastHeader.set(w, kw);
    } else {
      lastHeader.delete(w);
      if (kw === "return" && !inFunc) add(L.line, lineCol, 6, "error", "return خارج أي دالة (SyntaxError: 'return' outside function).", "ضع return داخل دالة def، أو احذفه.");
      if (kw === "yield" && !inFunc) add(L.line, lineCol, 5, "error", "yield خارج أي دالة.", "ضع yield داخل دالة def.");
      if ((kw === "break" || kw === "continue") && !loopIdx) add(L.line, lineCol, kw.length, "error", `${kw} خارج حلقة تكرار (SyntaxError: '${kw}' outside loop).`, `ضع ${kw} داخل for أو while.`);
      if (/^print\s+[^\s=(.,)]/.test(t) && !/^print\s*\(/.test(t)) add(L.line, lineCol, 5, "error", "في Python 3 أصبحت print دالة تحتاج قوسين (SyntaxError: Missing parentheses in call to 'print').", `اكتب: print(${original.replace(/^print\s+/, "")})`);
      if (t === "}" || t === "{") add(L.line, lineCol, 1, "error", "Python لا تستخدم الأقواس { } لتحديد الكتل.", "احذف القوس واعتمد على الإزاحة لتحديد الكتلة.");
      if (/^(\w+)\s*=\s*input\s*\(/.test(t)) strNames.add(t.match(/^(\w+)/)[1]);
      if (/^(\w+)\s*=\s*(int|float)\s*\(/.test(t)) strNames.delete(t.match(/^(\w+)/)[1]);
    }
    prevDecorator = t.startsWith("@") ? t : (isHeader ? "" : prevDecorator && kw ? "" : prevDecorator);
    const phys = lexed.masked[L.line - 1];
    const at = (re) => { const m = phys.match(re); return m ? m.index : lineCol; };
    if (/&&|\|\|/.test(t)) add(L.line, at(/&&|\|\|/), 2, "error", "Python لا تستخدم && و || .", "استخدم and بدل && و or بدل || .");
    if (/(^|[^!=<>])!(?!=)\s*[\w(]/.test(t)) add(L.line, at(/!(?!=)/), 1, "error", "Python لا تستخدم ! للنفي.", "استخدم not، مثل: if not done:");
    if (/[A-Za-z_]\w*\s*(\+\+|--)(?!\s*[\w(])/.test(t)) add(L.line, at(/\+\+|--/), 2, "error", "Python لا تدعم ++ أو -- .", "استخدم x += 1 أو x -= 1 .");
    if (/;\s*$/.test(t)) add(L.line, at(/;\s*$/), 1, "info", "الفاصلة المنقوطة في نهاية السطر غير ضرورية في Python.", "احذفها.");
    for (const m of t.matchAll(/\b(true|false|null|none|TRUE|FALSE|NULL|NONE|nil)\b/g)) {
      if (defined.has(m[1])) continue;
      const fixWord = { true: "True", false: "False", null: "None", none: "None", nil: "None" }[m[1].toLowerCase()];
      add(L.line, at(new RegExp(`\\b${m[1]}\\b`)), m[1].length, "error", `«${m[1]}» غير معرّف في Python (NameError)، فالقيم المنطقية والقيمة الفارغة تُكتب بحرف كبير.`, `اكتب ${fixWord}.`);
    }
    if (/[=!]=\s*None\b/.test(t)) add(L.line, at(/[=!]=\s*None/), 2, "info", "المقارنة مع None تكون بـ is لا بـ == .", "اكتب: if x is None: أو if x is not None:");
    if (/\bis\s+(not\s+)?(-?\d|["'])/.test(t)) add(L.line, at(/\bis\s/), 2, "warning", "is تقارن هوية الكائن لا قيمته، ومع الأرقام والنصوص قد تعطي نتيجة خاطئة (SyntaxWarning).", "استخدم == للمقارنة بالقيمة.");
    if (/["']\s*\+\s*-?\d|\d\s*\+\s*[rRbBuUfF]?["']/.test(t)) add(L.line, at(/["']\s*\+|\d\s*\+/), 1, "error", "جمع نص مع رقم يسبب TypeError: can only concatenate str (not \"int\") to str.", "حوّل الرقم إلى نص بـ str(5)، أو استخدم f-string: f\"العمر {age}\".");
    for (const n of strNames) {
      const re = new RegExp(`\\b${n}\\s*([-*/%<>]|\\+\\s*\\d)|(\\d\\s*[-*/%+<>]|[<>]=?)\\s*${n}\\b`);
      if (re.test(t) && !new RegExp(`^${n}\\s*=`).test(t)) {
        add(L.line, at(new RegExp(`\\b${n}\\b`)), n.length, "warning", `«${n}» قيمته من input()، و input() تعيد نصاً دائماً، فالعملية الحسابية أو المقارنة عليه ستسبب TypeError.`, `حوّله إلى رقم: ${n} = int(input(...)) أو float(...).`);
        strNames.delete(n);
      }
    }
  }
  for (const tl of openTry.values()) add(tl, 0, 3, "error", `الكتلة try في السطر ${tl} بلا except أو finally بعدها (SyntaxError: expected 'except' or 'finally' block).`, "أضف بعد كتلة try كتلة except نوع_الخطأ: أو finally: بمحاذاتها.");
  if (expectBlock) add(expectBlock.line, 0, 1, "error", `انتهى الكود بعد السطر ${expectBlock.line} المنتهي بـ «:» دون كتلة مُزاحة (IndentationError: expected an indented block).`, "أضف أسطر الكتلة مُزاحة 4 مسافات، أو اكتب pass.");
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
        add(m ? L.line : L.line, m ? m.index : 0, n.length, guess ? "error" : "warning", `الاسم «${n}» غير معرّف${guess ? `، ربما تقصد «${guess}»` : ""} (NameError: name '${n}' is not defined).`, guess ? `صحّح الاسم إلى «${guess}».` : `عرّف «${n}» قبل استخدامه، أو استورده بـ import إن كان من مكتبة.`);
      }
    }
  }
  return issues;
}

export function solve(input) {
  const code = readCode(input, "code");
  const issues = check(code);
  const n = code.split("\n").length;
  const linesWord = n === 1 ? "سطراً واحداً" : n === 2 ? "سطرين" : n <= 10 ? `${n} أسطر` : `${n} سطراً`;
  const lexical = issues.some((i) => /unterminated|was never closed|unmatched|does not match/.test(i.message));
  const steps = [
    `قرأنا ${linesWord}، وتجاهلنا التعليقات ومحتوى النصوص، ثم تتبعنا الأقواس وعلامات التنصيص.`,
    lexical ? "وُجدت مشكلة في الأقواس أو النصوص، وهي تُربك بقية التحليل، لذلك أصلحها أولاً ثم أعد الفحص." : "جمعنا الأسطر المنطقية (السطر المكسور داخل أقواس يُعد سطراً واحداً)، وفحصنا الإزاحة: كل سطر ينتهي بـ «:» يجب أن تليه كتلة مُزاحة، والرجوع يجب أن يطابق مستوى سابقاً.",
    "ثم فحصنا القواعد الشائعة: النقطتان بعد if و for و def…، و = بدل == في الشروط، و else/elif/except في مكانها، و return و break خارج مكانهما، والأسماء غير المعرّفة والأخطاء الإملائية، وعادات اللغات الأخرى مثل && و ++ و true.",
    "ملاحظة: الفحص ثابت دون تشغيل الكود، فلا يكتشف أخطاء التنفيذ التي تعتمد على القيم، مثل القسمة على صفر."
  ];
  const out = report(code, issues, { "عدد الأسطر": n });
  return { results: out.results, steps, blocks: out.blocks, copy: out.copy };
}
