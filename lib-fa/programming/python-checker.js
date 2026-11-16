import { readCode, report, closest } from "./code-view.js";

export const meta = {
  description: "کد Python را بچسبانید تا خطاهای تورفتگی، دونقطه، قوس‌ها، متن‌های بسته‌نشده و نام‌های تعریف‌نشده پیدا شوند، با توضیح فارسی هر خطا و روش اصلاح آن.",
  keywords: ["python", "پایتون", "بررسی کد", "IndentationError", "SyntaxError", "NameError", "رفع خطا", "linter"],
  formulas: [{ label: "کد به سطرهای منطقی تقسیم می‌شود، سپس تورفتگی و بلوک‌ها و قواعد خطاهای رایج بررسی می‌شوند", tex: "\\text{code} \\rightarrow \\text{tokens} \\rightarrow \\text{blocks} \\rightarrow \\text{issues}" }],
  inputs: [
    { id: "code", label: "کد Python", type: "textarea", rows: 12, wide: true, placeholder: "def greet(name):\n    print(\"Hello\", name)" }
  ],
  example: {
    values: { code: "def average(numbers)\n    total = 0\n    for n in numbers:\n        total += n\n    return total / len(numbers)\n\nscores = [90, 85, 77]\nprint(averge(scores))" },
    expect: ["':'", "سطر 1"],
    note: "مثال: تابعی که دانشجو دونقطه بعد از تعریفش را فراموش کرده و هنگام فراخوانی نامش را اشتباه نوشته است."
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
const BR_NAME = { "(": "پرانتز (", "[": "پرانتز [", "{": "پرانتز {" };

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
          ? { line: startLine, col: startCol, len: 3, severity: "error", message: `متن با سه گیومه ${q} تا پایان کد بسته نشده است (unterminated triple-quoted string literal).`, fix: `${q} را در انتهای متن اضافه کنید.` }
          : { line: startLine, col: startCol, len: 1, severity: "error", message: `متنی که با ${q} شروع شده، در همان سطر بسته نشده است (unterminated string literal).`, fix: `متن را با ${q} قبل از پایان سطر ببندید، یا برای متن چندسطری از سه نشانه ${q.repeat(3)} استفاده کنید.` });
      }
      continue;
    }
    if (PAIRS[c]) stack.push({ ch: c, line, col });
    else if (CLOSE[c]) {
      const top = stack[stack.length - 1];
      if (!top) issues.push({ line, col, len: 1, severity: "error", message: `قوس بسته‌شونده «${c}» اضافی است و قوس بازکننده‌ای ندارد (unmatched '${c}').`, fix: "این قوس را حذف کنید، یا قوس بازکننده کم‌شده را اضافه کنید." });
      else if (top.ch !== CLOSE[c]) { issues.push({ line, col, len: 1, severity: "error", message: `قوس «${c}» با «${top.ch}» که در سطر ${top.line} باز شده مطابقت ندارد (closing parenthesis '${c}' does not match opening parenthesis '${top.ch}').`, fix: `«${top.ch}» را با «${PAIRS[top.ch]}» ببندید.` }); stack.pop(); }
      else stack.pop();
    }
    push(c); i++; col++;
  }
  masked.push(cur);
  for (const s of stack) issues.push({ line: s.line, col: s.col, len: 1, severity: "error", message: `${BR_NAME[s.ch]} که در سطر ${s.line} باز شده، بسته نشده است ('${s.ch}' was never closed).`, fix: `«${PAIRS[s.ch]}» را در جای مناسب اضافه کنید.` });
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
  if (mixedLine) add(mixedLine.line, 0, mixedLine.indent.length, "warning", "تورفتگی این سطر Tab و فاصله‌های عادی را با هم مخلوط می‌کند و این به راحتی TabError ایجاد می‌کند: inconsistent use of tabs and spaces in indentation.", "در کل فایل برای هر سطح 4 فاصله عادی استفاده کنید، و در ویرایشگرتان تبدیل Tab به فاصله را فعال کنید.");
  else if (usesTab && usesSpace) {
    const L = lines.find((x) => x.indent.includes("\t"));
    add(L.line, 0, L.indent.length, "warning", "کد در بعضی سطرها از Tab و در بعضی دیگر از فاصله عادی استفاده می‌کند، و این به راحتی هنگام هر ویرایش TabError ایجاد می‌کند.", "در کل فایل برای هر سطح 4 فاصله عادی استفاده کنید.");
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
      if (w <= indents[indents.length - 1]) add(L.line, 0, Math.max(1, t.length), "error", `بعد از سطر ${expectBlock.line} که با «:» تمام می‌شود باید یک بلوک با تورفتگی بیاید (IndentationError: expected an indented block after '${expectBlock.kw}' statement on line ${expectBlock.line}).`, "این سطر را 4 فاصله به داخل تورفتگی دهید، یا اگر بلوک موقتاً خالی است pass بنویسید.");
      else indents.push(w);
      expectBlock = null;
    } else if (w > indents[indents.length - 1]) {
      add(L.line, 0, Math.max(1, L.indent.length), "error", "تورفتگی غیرمنتظره: این سطر به داخل تورفتگی شده، بدون آنکه سطر قبلی با «:» تمام شده باشد (IndentationError: unexpected indent).", "فاصله‌های اضافی ابتدای سطر را حذف کنید تا هم‌تراز سطر قبلی شود.");
      indents.push(w);
    }
    if (w < indents[indents.length - 1]) {
      while (indents.length > 1 && w < indents[indents.length - 1]) indents.pop();
      if (w !== indents[indents.length - 1]) {
        add(L.line, 0, Math.max(1, L.indent.length), "error", "این سطر با هیچ سطح تورفتگی بلوک‌های قبلی هم‌خوانی ندارد (IndentationError: unindent does not match any outer indentation level).", "تورفتگی سطر را دقیقاً برابر تورفتگی بلوکی که به آن تعلق دارد کنید (مضرب‌های 4 فاصله).");
        indents.push(w);
      }
    }
    if (!odd && !usesTab && w % 4 !== 0) { odd = true; add(L.line, 0, L.indent.length, "info", "تورفتگی مضرب 4 فاصله نیست.", "روش استاندارد Python (PEP 8) برای هر سطح 4 فاصله است."); }
    while (blocks.length && blocks[blocks.length - 1].w >= w) blocks.pop();
    for (const [k] of lastHeader) if (k > w) lastHeader.delete(k);
    const inFunc = blocks.some((b) => b.kw === "def");
    const loopIdx = blocks.map((b) => b.kw).lastIndexOf("for") > blocks.map((b) => b.kw).lastIndexOf("def") || blocks.map((b) => b.kw).lastIndexOf("while") > blocks.map((b) => b.kw).lastIndexOf("def");
    const colon = topColon(t);
    const isHeader = HEADERS.has(kw);
    const before = lastHeader.get(w);
    for (const [tw, tl] of openTry) {
      if (tw > w || (tw === w && kw !== "except" && kw !== "finally")) {
        add(tl, 0, 3, "error", `بلوک try در سطر ${tl} بعدش except یا finally ندارد (SyntaxError: expected 'except' or 'finally' block).`, "بعد از بلوک try یک بلوک except نوع_خطا: یا finally: هم‌تراز آن اضافه کنید.");
        openTry.delete(tw);
      } else if (tw === w) openTry.delete(tw);
    }
    if (kw === "try") openTry.set(w, L.line);
    const original = physical[L.line - 1].trim();
    const elseIf = kw === "else" && /^else\s+if\b/.test(t);
    if (elseIf) add(L.line, lineCol, 7, "error", "Python از «else if» استفاده نمی‌کند.", "به جای آن elif بنویسید: elif شرط:");
    const cBrace = isHeader && /\{\s*$/.test(original);
    if (isHeader) {
      if (cBrace) add(L.line, lineCol + original.length - 1, 1, "error", "Python برای تعیین بلوک‌ها مانند C و Java از آکولاد { } استفاده نمی‌کند، بلکه از دونقطه «:» و تورفتگی.", `بنویسید: ${original.replace(/\s*\{\s*$/, "")}: سپس سطرهای بلوک را 4 فاصله تورفتگی دهید و } را حذف کنید.`);
      else if (colon < 0) {
        const name = kw === "def" || kw === "class" ? `تعریف ${kw}` : `جمله ${kw}`;
        add(L.line, Math.min(physical[L.line - 1].length, lineCol + original.length), 1, "error", `${name} باید با دونقطه «:» تمام شود (SyntaxError: expected ':').`, `«:» را در انتهای سطر اضافه کنید: ${original.slice(0, 80)}:`);
      }
      if (kw === "def" && !/^(async\s+)?def\s+[A-Za-z_]\w*\s*\(/.test(t)) add(L.line, lineCol, t.length, "error", "تعریف تابع برای نامش به دو پرانتز نیاز دارد، حتی اگر پارامتری نداشته باشد.", "بنویسید: def name():");
      if ((kw === "if" || kw === "elif" || kw === "while") && hasTopAssign(colon > 0 ? t.slice(kw.length, colon) : t.slice(kw.length))) add(L.line, lineCol, t.length, "error", "در شرط از = (انتساب) به جای == (مقایسه) استفاده کرده‌اید (SyntaxError: invalid syntax. Maybe you meant '==' or ':=' instead of '='?).", "برای مقایسه از == استفاده کنید، مانند: if x == 5:");
      if (kw === "elif" && !["if", "elif"].includes(before)) add(L.line, lineCol, 4, "error", "elif بدون if قبل از آن در همان سطح تورفتگی (SyntaxError: invalid syntax).", "مطمئن شوید elif دقیقاً هم‌تراز if ای است که بعدش می‌آید.");
      if (kw === "else" && !elseIf && !["if", "elif", "for", "while", "try", "except"].includes(before)) add(L.line, lineCol, 4, "error", "else بدون if (یا for/while/try) قبل از آن در همان سطح تورفتگی (SyntaxError: invalid syntax).", "مطمئن شوید else دقیقاً هم‌تراز جمله if ای است که بعدش می‌آید.");
      if (kw === "except" && !["try", "except"].includes(before)) add(L.line, lineCol, 6, "error", "except بدون try قبل از آن در همان سطح تورفتگی.", "except را دقیقاً هم‌تراز try قرار دهید.");
      if (kw === "finally" && !["try", "except", "else"].includes(before)) add(L.line, lineCol, 7, "error", "finally بدون try قبل از آن در همان سطح تورفتگی.", "finally را دقیقاً هم‌تراز try قرار دهید.");
      if (kw === "except" && /^except\s*:/.test(t)) add(L.line, lineCol, 6, "info", "except: بدون نوع خطا همه خطاها را می‌گیرد، حتی Ctrl+C، و دلیل مشکلات را پنهان می‌کند.", "نوع خطا را مشخص کنید: except ValueError: یا حداقل except Exception:");
      if (kw === "def") {
        const params = (t.match(/\((.*)\)/) || ["", ""])[1].trim();
        const parentIsClass = blocks.length && blocks[blocks.length - 1].kw === "class";
        if (parentIsClass && !/^@staticmethod/.test(prevDecorator) && !/^(self|cls)\b/.test(params)) add(L.line, lineCol, t.length, "warning", "تابعی داخل کلاس (method) بدون پارامتر self است، پس هنگام فراخوانی از یک شیء TypeError رخ می‌دهد: takes 0 positional arguments but 1 was given.", "self را اولین پارامتر کنید: def name(self, ...):، یا قبل از آن @staticmethod اضافه کنید.");
        if (/=\s*(\[\s*\]|\{\s*\}|list\(\)|dict\(\)|set\(\))/.test(params)) add(L.line, lineCol, t.length, "warning", "مقدار پیش‌فرض قابل تغییر ([] یا {}) فقط یک بار ساخته می‌شود و بین همه فراخوانی‌ها مشترک است.", "از None استفاده کنید و سپس داخل تابع بسازیدش: def f(a=None): if a is None: a = []");
      }
      if (!cBrace && (colon < 0 || !t.slice(colon + 1).trim())) expectBlock = { line: L.line, kw };
      blocks.push({ w, kw });
      lastHeader.set(w, kw);
    } else {
      lastHeader.delete(w);
      if (kw === "return" && !inFunc) add(L.line, lineCol, 6, "error", "return خارج از هر تابع (SyntaxError: 'return' outside function).", "return را داخل تابع def قرار دهید، یا آن را حذف کنید.");
      if (kw === "yield" && !inFunc) add(L.line, lineCol, 5, "error", "yield خارج از هر تابع.", "yield را داخل تابع def قرار دهید.");
      if ((kw === "break" || kw === "continue") && !loopIdx) add(L.line, lineCol, kw.length, "error", `${kw} خارج از حلقه تکرار است (SyntaxError: '${kw}' outside loop).`, `${kw} را داخل for یا while قرار دهید.`);
      if (/^print\s+[^\s=(.,)]/.test(t) && !/^print\s*\(/.test(t)) add(L.line, lineCol, 5, "error", "در Python 3، print به تابع تبدیل شده که برای فراخوانی به پرانتز نیاز دارد (SyntaxError: Missing parentheses in call to 'print').", `بنویسید: print(${original.replace(/^print\s+/, "")})`);
      if (t === "}" || t === "{") add(L.line, lineCol, 1, "error", "Python برای تعیین بلوک‌ها از آکولاد { } استفاده نمی‌کند.", "آکولاد را حذف کنید و برای تعیین بلوک به تورفتگی تکیه کنید.");
      if (/^(\w+)\s*=\s*input\s*\(/.test(t)) strNames.add(t.match(/^(\w+)/)[1]);
      if (/^(\w+)\s*=\s*(int|float)\s*\(/.test(t)) strNames.delete(t.match(/^(\w+)/)[1]);
    }
    prevDecorator = t.startsWith("@") ? t : (isHeader ? "" : prevDecorator && kw ? "" : prevDecorator);
    const phys = lexed.masked[L.line - 1];
    const at = (re) => { const m = phys.match(re); return m ? m.index : lineCol; };
    if (/&&|\|\|/.test(t)) add(L.line, at(/&&|\|\|/), 2, "error", "Python از && و || استفاده نمی‌کند.", "به جای && از and و به جای || از or استفاده کنید.");
    if (/(^|[^!=<>])!(?!=)\s*[\w(]/.test(t)) add(L.line, at(/!(?!=)/), 1, "error", "Python برای نقیض از ! استفاده نمی‌کند.", "از not استفاده کنید، مانند: if not done:");
    if (/[A-Za-z_]\w*\s*(\+\+|--)(?!\s*[\w(])/.test(t)) add(L.line, at(/\+\+|--/), 2, "error", "Python از ++ یا -- پشتیبانی نمی‌کند.", "از x += 1 یا x -= 1 استفاده کنید.");
    if (/;\s*$/.test(t)) add(L.line, at(/;\s*$/), 1, "info", "سمی‌کولون (;) در انتهای سطر در Python لازم نیست.", "آن را حذف کنید.");
    for (const m of t.matchAll(/\b(true|false|null|none|TRUE|FALSE|NULL|NONE|nil)\b/g)) {
      if (defined.has(m[1])) continue;
      const fixWord = { true: "True", false: "False", null: "None", none: "None", nil: "None" }[m[1].toLowerCase()];
      add(L.line, at(new RegExp(`\\b${m[1]}\\b`)), m[1].length, "error", `«${m[1]}» در Python تعریف نشده است (NameError)، پس مقادیر منطقی و مقدار تهی با حرف بزرگ نوشته می‌شوند.`, `بنویسید ${fixWord}.`);
    }
    if (/[=!]=\s*None\b/.test(t)) add(L.line, at(/[=!]=\s*None/), 2, "info", "مقایسه با None باید با is باشد نه با == .", "بنویسید: if x is None: یا if x is not None:");
    if (/\bis\s+(not\s+)?(-?\d|["'])/.test(t)) add(L.line, at(/\bis\s/), 2, "warning", "is هویت شیء را مقایسه می‌کند نه مقدارش، و با اعداد و متن ممکن است نتیجه نادرست بدهد (SyntaxWarning).", "برای مقایسه بر اساس مقدار از == استفاده کنید.");
    if (/["']\s*\+\s*-?\d|\d\s*\+\s*[rRbBuUfF]?["']/.test(t)) add(L.line, at(/["']\s*\+|\d\s*\+/), 1, "error", "جمع متن با عدد باعث TypeError می‌شود: can only concatenate str (not \"int\") to str.", "عدد را با str(5) به متن تبدیل کنید، یا از f-string استفاده کنید: f\"سن {age}\".");
    for (const n of strNames) {
      const re = new RegExp(`\\b${n}\\s*([-*/%<>]|\\+\\s*\\d)|(\\d\\s*[-*/%+<>]|[<>]=?)\\s*${n}\\b`);
      if (re.test(t) && !new RegExp(`^${n}\\s*=`).test(t)) {
        add(L.line, at(new RegExp(`\\b${n}\\b`)), n.length, "warning", `«${n}» مقدارش از input() است و input() همیشه متن برمی‌گرداند، پس عملیات حسابی یا مقایسه روی آن TypeError ایجاد می‌کند.`, `آن را به عدد تبدیل کنید: ${n} = int(input(...)) یا float(...).`);
        strNames.delete(n);
      }
    }
  }
  for (const tl of openTry.values()) add(tl, 0, 3, "error", `بلوک try در سطر ${tl} بعدش except یا finally ندارد (SyntaxError: expected 'except' or 'finally' block).`, "بعد از بلوک try یک بلوک except نوع_خطا: یا finally: هم‌تراز آن اضافه کنید.");
  if (expectBlock) add(expectBlock.line, 0, 1, "error", `کد بعد از سطر ${expectBlock.line} که با «:» تمام شده و بلوک تورفتگی‌دار ندارد تمام شد (IndentationError: expected an indented block).`, "سطرهای بلوک را با 4 فاصله تورفتگی اضافه کنید، یا pass بنویسید.");
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
        add(m ? L.line : L.line, m ? m.index : 0, n.length, guess ? "error" : "warning", `نام «${n}» تعریف نشده${guess ? `، شاید منظورتان «${guess}» باشد` : ""} (NameError: name '${n}' is not defined).`, guess ? `نام را به «${guess}» اصلاح کنید.` : `«${n}» را قبل از استفاده تعریف کنید، یا اگر از یک کتابخانه است با import وارد کنید.`);
      }
    }
  }
  return issues;
}

export function solve(input) {
  const code = readCode(input, "code");
  const issues = check(code);
  const n = code.split("\n").length;
  const linesWord = n === 1 ? "یک سطر" : n === 2 ? "دو سطر" : n <= 10 ? `${n} سطر` : `${n} سطر`;
  const lexical = issues.some((i) => /unterminated|was never closed|unmatched|does not match/.test(i.message));
  const steps = [
    `${linesWord} را خواندیم، توضیحات و محتوای متن‌ها را نادیده گرفتیم، و سپس قوس‌ها و گیومه‌ها را دنبال کردیم.`,
    lexical ? "مشکلی در قوس‌ها یا متن‌ها پیدا شد که بقیه تحلیل را مختل می‌کند، پس ابتدا آن را رفع کنید و سپس دوباره بررسی کنید." : "سطرهای منطقی را جمع کردیم (سطر شکسته داخل قوس یک سطر به حساب می‌آید) و تورفتگی را بررسی کردیم: هر سطری که با «:» تمام شود باید بلوک تورفتگی‌دار بعدش داشته باشد، و بازگشت باید با سطح قبلی هم‌خوان باشد.",
    "سپس قواعد رایج را بررسی کردیم: دونقطه بعد از if و for و def، و = به جای == در شرط‌ها، و else/elif/except در جای خود، و return و break خارج از جای خود، و نام‌های تعریف‌نشده و غلط‌های املایی، و عادت‌های زبان‌های دیگر مانند && و ++ و true.",
    "توجه: بررسی ایستاست و کد اجرا نمی‌شود، پس خطاهایی که به مقدارها بستگی دارند، مانند تقسیم بر صفر، پیدا نمی‌شوند."
  ];
  const out = report(code, issues, { "تعداد سطرها": n });
  return { results: out.results, steps, blocks: out.blocks, copy: out.copy };
}
