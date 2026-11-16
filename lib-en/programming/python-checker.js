import { readCode, report, closest } from "./code-view.js";

export const meta = {
  description: "Paste Python code to detect indentation, colon, bracket, unclosed string, and undefined name errors, with an explanation of each error in English and how to fix it.",
  keywords: ["python", "Python", "Code check", "IndentationError", "SyntaxError", "NameError", "Debugging", "linter"],
  formulas: [{ label: "The code is split into logical lines, then indentation, blocks, and common error rules are checked", tex: "\\text{code} \\rightarrow \\text{tokens} \\rightarrow \\text{blocks} \\rightarrow \\text{issues}" }],
  inputs: [
    { id: "code", label: "Python code", type: "textarea", rows: 12, wide: true, placeholder: "def greet(name):\n    print(\"Hello\", name)" }
  ],
  example: {
    values: { code: "def average(numbers)\n    total = 0\n    for n in numbers:\n        total += n\n    return total / len(numbers)\n\nscores = [90, 85, 77]\nprint(averge(scores))" },
    expect: ["':'", "Line 1"],
    note: "Example: a function where the student forgot the colon after the definition and misspelled the function name when calling it."
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
const BR_NAME = { "(": "Bracket (", "[": "Bracket [", "{": "Bracket {" };

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
          ? { line: startLine, col: startCol, len: 3, severity: "error", message: `A triple-quoted string ${q} was not closed until the end of the code (unterminated triple-quoted string literal).`, fix: `Add ${q} at the end of the string.` }
          : { line: startLine, col: startCol, len: 1, severity: "error", message: `The string starting with ${q} was not closed on the same line (unterminated string literal).`, fix: `Close the string with ${q} before the end of the line, or use three ${q.repeat(3)} characters for a multi-line string.` });
      }
      continue;
    }
    if (PAIRS[c]) stack.push({ ch: c, line, col });
    else if (CLOSE[c]) {
      const top = stack[stack.length - 1];
      if (!top) issues.push({ line, col, len: 1, severity: "error", message: `The closing bracket “${c}” is extra and has no matching opening bracket (unmatched '${c}').`, fix: "Delete this bracket, or add the missing opening bracket." });
      else if (top.ch !== CLOSE[c]) { issues.push({ line, col, len: 1, severity: "error", message: `The bracket “${c}” does not match “${top.ch}” opened on line ${top.line} (closing parenthesis '${c}' does not match opening parenthesis '${top.ch}').`, fix: `Close “${top.ch}” with “${PAIRS[top.ch]}”.` }); stack.pop(); }
      else stack.pop();
    }
    push(c); i++; col++;
  }
  masked.push(cur);
  for (const s of stack) issues.push({ line: s.line, col: s.col, len: 1, severity: "error", message: `${BR_NAME[s.ch]} opened on line ${s.line} was never closed ('${s.ch}' was never closed).`, fix: `Add “${PAIRS[s.ch]}” in the appropriate place.` });
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
  if (mixedLine) add(mixedLine.line, 0, mixedLine.indent.length, "warning", "The indentation of this line mixes Tab and regular spaces, which easily causes a TabError: inconsistent use of tabs and spaces in indentation.", "Use 4 regular spaces per level throughout the whole file, and enable converting Tab to spaces in your editor.");
  else if (usesTab && usesSpace) {
    const L = lines.find((x) => x.indent.includes("\t"));
    add(L.line, 0, L.indent.length, "warning", "The code uses Tab in some lines and regular spaces in others, which easily causes a TabError during any edit.", "Use 4 regular spaces per level throughout the whole file.");
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
      if (w <= indents[indents.length - 1]) add(L.line, 0, Math.max(1, t.length), "error", `After the line ${expectBlock.line} ending with “:” there must be an indented block (IndentationError: expected an indented block after '${expectBlock.kw}' statement on line ${expectBlock.line}).`, "Indent this line 4 spaces, or write pass if the block is temporarily empty.");
      else indents.push(w);
      expectBlock = null;
    } else if (w > indents[indents.length - 1]) {
      add(L.line, 0, Math.max(1, L.indent.length), "error", "Unexpected indent: this line is indented but is not preceded by a line ending with “:” (IndentationError: unexpected indent).", "Remove the extra spaces at the start of the line so it aligns with the line before it.");
      indents.push(w);
    }
    if (w < indents[indents.length - 1]) {
      while (indents.length > 1 && w < indents[indents.length - 1]) indents.pop();
      if (w !== indents[indents.length - 1]) {
        add(L.line, 0, Math.max(1, L.indent.length), "error", "This line does not match the indentation level of any outer block (IndentationError: unindent does not match any outer indentation level).", "Make the line's indentation exactly equal to the block it belongs to (multiples of 4 spaces).");
        indents.push(w);
      }
    }
    if (!odd && !usesTab && w % 4 !== 0) { odd = true; add(L.line, 0, L.indent.length, "info", "The indentation is not a multiple of 4 spaces.", "The standard Python style (PEP 8) is 4 spaces per level."); }
    while (blocks.length && blocks[blocks.length - 1].w >= w) blocks.pop();
    for (const [k] of lastHeader) if (k > w) lastHeader.delete(k);
    const inFunc = blocks.some((b) => b.kw === "def");
    const loopIdx = blocks.map((b) => b.kw).lastIndexOf("for") > blocks.map((b) => b.kw).lastIndexOf("def") || blocks.map((b) => b.kw).lastIndexOf("while") > blocks.map((b) => b.kw).lastIndexOf("def");
    const colon = topColon(t);
    const isHeader = HEADERS.has(kw);
    const before = lastHeader.get(w);
    for (const [tw, tl] of openTry) {
      if (tw > w || (tw === w && kw !== "except" && kw !== "finally")) {
        add(tl, 0, 3, "error", `The try block on line ${tl} is not followed by except or finally (SyntaxError: expected 'except' or 'finally' block).`, "After the try block, add an except ErrorType: or finally: block aligned with it.");
        openTry.delete(tw);
      } else if (tw === w) openTry.delete(tw);
    }
    if (kw === "try") openTry.set(w, L.line);
    const original = physical[L.line - 1].trim();
    const elseIf = kw === "else" && /^else\s+if\b/.test(t);
    if (elseIf) add(L.line, lineCol, 7, "error", "Python does not use “else if”.", "Write elif instead: elif condition:");
    const cBrace = isHeader && /\{\s*$/.test(original);
    if (isHeader) {
      if (cBrace) add(L.line, lineCol + original.length - 1, 1, "error", "Python does not use curly brackets { } to define blocks as C and Java do; it uses the colon “:” and indentation.", `Write: ${original.replace(/\s*\{\s*$/, "")}: then indent the block lines by 4 spaces and delete }.`);
      else if (colon < 0) {
        const name = kw === "def" || kw === "class" ? `${kw} definition` : `${kw} statement`;
        add(L.line, Math.min(physical[L.line - 1].length, lineCol + original.length), 1, "error", `${name} must end with a colon “:” (SyntaxError: expected ':').`, `Add “:” at the end of the line: ${original.slice(0, 80)}:`);
      }
      if (kw === "def" && !/^(async\s+)?def\s+[A-Za-z_]\w*\s*\(/.test(t)) add(L.line, lineCol, t.length, "error", "A function definition needs two parentheses after its name, even if it has no parameters.", "Write: def name():");
      if ((kw === "if" || kw === "elif" || kw === "while") && hasTopAssign(colon > 0 ? t.slice(kw.length, colon) : t.slice(kw.length))) add(L.line, lineCol, t.length, "error", "You used = (assignment) inside the condition instead of == (comparison) (SyntaxError: invalid syntax. Maybe you meant '==' or ':=' instead of '='?).", "Use == for comparison, for example: if x == 5:");
      if (kw === "elif" && !["if", "elif"].includes(before)) add(L.line, lineCol, 4, "error", "elif without a preceding if at the same indentation level (SyntaxError: invalid syntax).", "Make sure elif is aligned exactly with the if it follows.");
      if (kw === "else" && !elseIf && !["if", "elif", "for", "while", "try", "except"].includes(before)) add(L.line, lineCol, 4, "error", "else without a preceding if (or for/while/try) at the same indentation level (SyntaxError: invalid syntax).", "Make sure else is aligned exactly with the if statement it follows.");
      if (kw === "except" && !["try", "except"].includes(before)) add(L.line, lineCol, 6, "error", "except without a preceding try at the same indentation level.", "Align except exactly with try.");
      if (kw === "finally" && !["try", "except", "else"].includes(before)) add(L.line, lineCol, 7, "error", "finally without a preceding try at the same indentation level.", "Align finally exactly with try.");
      if (kw === "except" && /^except\s*:/.test(t)) add(L.line, lineCol, 6, "info", "A bare except: catches all errors, even Ctrl+C, which hides the causes of problems.", "Specify the error type: except ValueError: or at least except Exception:");
      if (kw === "def") {
        const params = (t.match(/\((.*)\)/) || ["", ""])[1].trim();
        const parentIsClass = blocks.length && blocks[blocks.length - 1].kw === "class";
        if (parentIsClass && !/^@staticmethod/.test(prevDecorator) && !/^(self|cls)\b/.test(params)) add(L.line, lineCol, t.length, "warning", "A method inside a class has no self parameter; when called from an object this will cause TypeError: takes 0 positional arguments but 1 was given.", "Make self the first parameter: def name(self, ...):, or add @staticmethod before it.");
        if (/=\s*(\[\s*\]|\{\s*\}|list\(\)|dict\(\)|set\(\))/.test(params)) add(L.line, lineCol, t.length, "warning", "A mutable default value ([] or {}) is created once and shared among all calls.", "Use None and create the value inside the function: def f(a=None): if a is None: a = []");
      }
      if (!cBrace && (colon < 0 || !t.slice(colon + 1).trim())) expectBlock = { line: L.line, kw };
      blocks.push({ w, kw });
      lastHeader.set(w, kw);
    } else {
      lastHeader.delete(w);
      if (kw === "return" && !inFunc) add(L.line, lineCol, 6, "error", "return outside any function (SyntaxError: 'return' outside function).", "Put return inside a def function, or delete it.");
      if (kw === "yield" && !inFunc) add(L.line, lineCol, 5, "error", "yield outside any function.", "Put yield inside a def function.");
      if ((kw === "break" || kw === "continue") && !loopIdx) add(L.line, lineCol, kw.length, "error", `${kw} outside a loop (SyntaxError: '${kw}' outside loop).`, `Put ${kw} inside a for or while.`);
      if (/^print\s+[^\s=(.,)]/.test(t) && !/^print\s*\(/.test(t)) add(L.line, lineCol, 5, "error", "In Python 3, print became a function that needs parentheses (SyntaxError: Missing parentheses in call to 'print').", `Write: print(${original.replace(/^print\s+/, "")})`);
      if (t === "}" || t === "{") add(L.line, lineCol, 1, "error", "Python does not use curly brackets { } to define blocks.", "Delete the bracket and rely on indentation to define the block.");
      if (/^(\w+)\s*=\s*input\s*\(/.test(t)) strNames.add(t.match(/^(\w+)/)[1]);
      if (/^(\w+)\s*=\s*(int|float)\s*\(/.test(t)) strNames.delete(t.match(/^(\w+)/)[1]);
    }
    prevDecorator = t.startsWith("@") ? t : (isHeader ? "" : prevDecorator && kw ? "" : prevDecorator);
    const phys = lexed.masked[L.line - 1];
    const at = (re) => { const m = phys.match(re); return m ? m.index : lineCol; };
    if (/&&|\|\|/.test(t)) add(L.line, at(/&&|\|\|/), 2, "error", "Python does not use && or || .", "Use and instead of && and or instead of || .");
    if (/(^|[^!=<>])!(?!=)\s*[\w(]/.test(t)) add(L.line, at(/!(?!=)/), 1, "error", "Python does not use ! for negation.", "Use not, for example: if not done:");
    if (/[A-Za-z_]\w*\s*(\+\+|--)(?!\s*[\w(])/.test(t)) add(L.line, at(/\+\+|--/), 2, "error", "Python does not support ++ or -- .", "Use x += 1 or x -= 1 .");
    if (/;\s*$/.test(t)) add(L.line, at(/;\s*$/), 1, "info", "A semicolon at the end of a line is unnecessary in Python.", "Delete it.");
    for (const m of t.matchAll(/\b(true|false|null|none|TRUE|FALSE|NULL|NONE|nil)\b/g)) {
      if (defined.has(m[1])) continue;
      const fixWord = { true: "True", false: "False", null: "None", none: "None", nil: "None" }[m[1].toLowerCase()];
      add(L.line, at(new RegExp(`\\b${m[1]}\\b`)), m[1].length, "error", `“${m[1]}” is not defined in Python (NameError); boolean values and the null value are written with a capital letter.`, `Write ${fixWord}.`);
    }
    if (/[=!]=\s*None\b/.test(t)) add(L.line, at(/[=!]=\s*None/), 2, "info", "Comparison with None should use is, not == .", "Write: if x is None: or if x is not None:");
    if (/\bis\s+(not\s+)?(-?\d|["'])/.test(t)) add(L.line, at(/\bis\s/), 2, "warning", "is compares object identity, not value; with numbers and strings it may give a wrong result (SyntaxWarning).", "Use == for comparison by value.");
    if (/["']\s*\+\s*-?\d|\d\s*\+\s*[rRbBuUfF]?["']/.test(t)) add(L.line, at(/["']\s*\+|\d\s*\+/), 1, "error", "Adding a string and a number causes TypeError: can only concatenate str (not \"int\") to str.", "Convert the number to a string with str(5), or use an f-string: f\"Age {age}\".");
    for (const n of strNames) {
      const re = new RegExp(`\\b${n}\\s*([-*/%<>]|\\+\\s*\\d)|(\\d\\s*[-*/%+<>]|[<>]=?)\\s*${n}\\b`);
      if (re.test(t) && !new RegExp(`^${n}\\s*=`).test(t)) {
        add(L.line, at(new RegExp(`\\b${n}\\b`)), n.length, "warning", `“${n}” holds a value from input(), and input() always returns a string, so an arithmetic operation or comparison on it will cause a TypeError.`, `Convert it to a number: ${n} = int(input(...)) or float(...).`);
        strNames.delete(n);
      }
    }
  }
  for (const tl of openTry.values()) add(tl, 0, 3, "error", `The try block on line ${tl} is not followed by except or finally (SyntaxError: expected 'except' or 'finally' block).`, "After the try block, add an except ErrorType: or finally: block aligned with it.");
  if (expectBlock) add(expectBlock.line, 0, 1, "error", `The code ended after the line ${expectBlock.line} ending with “:” without an indented block (IndentationError: expected an indented block).`, "Add the block lines indented by 4 spaces, or write pass.");
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
        add(m ? L.line : L.line, m ? m.index : 0, n.length, guess ? "error" : "warning", `The name “${n}” is not defined${guess ? `, did you mean «${guess}»?` : ""} (NameError: name '${n}' is not defined).`, guess ? `Correct the name to “${guess}”.` : `Define “${n}” before using it, or import it with import if it comes from a library.`);
      }
    }
  }
  return issues;
}

export function solve(input) {
  const code = readCode(input, "code");
  const issues = check(code);
  const n = code.split("\n").length;
  const linesWord = n === 1 ? "one line" : n === 2 ? "two lines" : n <= 10 ? `${n} lines` : `${n} lines`;
  const lexical = issues.some((i) => /unterminated|was never closed|unmatched|does not match/.test(i.message));
  const steps = [
    `We read ${linesWord}, ignored comments and string content, then tracked the brackets and quote marks.`,
    lexical ? "A problem with brackets or strings was found, and it disrupts the rest of the analysis, so fix it first and then run the check again." : "We joined the logical lines (a line broken inside brackets counts as one line) and checked indentation: every line ending with “:” must be followed by an indented block, and dedenting must return to a previous level.",
    "Then we checked common rules: colons after if, for, def…, = instead of == in conditions, else/elif/except in their place, return and break outside their place, undefined names and their typos, and habits from other languages such as &&, ++, and true.",
    "Note: the check is static, without running the code, so it does not detect runtime errors that depend on values, such as division by zero."
  ];
  const out = report(code, issues, { "Number of lines": n });
  return { results: out.results, steps, blocks: out.blocks, copy: out.copy };
}
