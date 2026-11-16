import { readCode, report, closest } from "./code-view.js";

export const meta = {
  description: "Pega código Python para detectar errores de sangría, de dos puntos, de paréntesis, de cadenas sin cerrar y de nombres no definidos, con la explicación de cada error en español y cómo corregirlo.",
  keywords: ["python", "Python", "Revisar código", "IndentationError", "SyntaxError", "NameError", "Depurar errores", "linter"],
  formulas: [{ label: "El código se divide en líneas lógicas y luego se revisan la sangría, los bloques y las reglas de errores comunes", tex: "\\text{code} \\rightarrow \\text{tokens} \\rightarrow \\text{blocks} \\rightarrow \\text{issues}" }],
  inputs: [
    { id: "code", label: "Código Python", type: "textarea", rows: 12, wide: true, placeholder: "def greet(name):\n    print(\"Hello\", name)" }
  ],
  example: {
    values: { code: "def average(numbers)\n    total = 0\n    for n in numbers:\n        total += n\n    return total / len(numbers)\n\nscores = [90, 85, 77]\nprint(averge(scores))" },
    expect: ["':'", "Línea 1"],
    note: "Ejemplo: función a la que el estudiante olvidó los dos puntos después de la definición, y que escribió mal el nombre al llamarla."
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
const BR_NAME = { "(": "Paréntesis (", "[": "Corchete [", "{": "Llave {" };

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
          ? { line: startLine, col: startCol, len: 3, severity: "error", message: `La cadena de tres comillas ${q} no se cerró hasta el final del código (unterminated triple-quoted string literal).`, fix: `Añade ${q} al final del texto.` }
          : { line: startLine, col: startCol, len: 1, severity: "error", message: `La cadena que empieza con ${q} no se cerró en la misma línea (unterminated string literal).`, fix: `Cierra la cadena con ${q} antes del final de la línea, o usa tres ${q.repeat(3)} para una cadena de varias líneas.` });
      }
      continue;
    }
    if (PAIRS[c]) stack.push({ ch: c, line, col });
    else if (CLOSE[c]) {
      const top = stack[stack.length - 1];
      if (!top) issues.push({ line, col, len: 1, severity: "error", message: `El paréntesis de cierre «${c}» sobra y no tiene paréntesis de apertura (unmatched '${c}').`, fix: "Elimina este paréntesis o añade el de apertura que falta." });
      else if (top.ch !== CLOSE[c]) { issues.push({ line, col, len: 1, severity: "error", message: `El paréntesis «${c}» no coincide con «${top.ch}» abierto en la línea ${top.line} (closing parenthesis '${c}' does not match opening parenthesis '${top.ch}').`, fix: `Cierra «${top.ch}» con «${PAIRS[top.ch]}».` }); stack.pop(); }
      else stack.pop();
    }
    push(c); i++; col++;
  }
  masked.push(cur);
  for (const s of stack) issues.push({ line: s.line, col: s.col, len: 1, severity: "error", message: `${BR_NAME[s.ch]} abierto en la línea ${s.line} no se cerró ('${s.ch}' was never closed).`, fix: `Añade «${PAIRS[s.ch]}» en el lugar adecuado.` });
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
  if (mixedLine) add(mixedLine.line, 0, mixedLine.indent.length, "warning", "La sangría de esta línea mezcla tabulaciones y espacios normales, lo que causa fácilmente TabError: inconsistent use of tabs and spaces in indentation.", "Usa 4 espacios normales por nivel en todo el archivo, y activa en tu editor la conversión de Tab a espacios.");
  else if (usesTab && usesSpace) {
    const L = lines.find((x) => x.indent.includes("\t"));
    add(L.line, 0, L.indent.length, "warning", "El código usa Tab en algunas líneas y espacios normales en otras, lo que causa fácilmente TabError al hacer cualquier cambio.", "Usa 4 espacios normales por nivel en todo el archivo.");
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
      if (w <= indents[indents.length - 1]) add(L.line, 0, Math.max(1, t.length), "error", `Después de la línea ${expectBlock.line}, que termina en «:», debe venir un bloque con sangría (IndentationError: expected an indented block after '${expectBlock.kw}' statement on line ${expectBlock.line}).`, "Sangra esta línea 4 espacios hacia dentro, o escribe pass si el bloque está vacío por ahora.");
      else indents.push(w);
      expectBlock = null;
    } else if (w > indents[indents.length - 1]) {
      add(L.line, 0, Math.max(1, L.indent.length), "error", "Sangría inesperada: esta línea tiene sangría, pero no la precede una línea que termine en «:» (IndentationError: unexpected indent).", "Elimina los espacios sobrantes al inicio de la línea para que quede alineada con la anterior.");
      indents.push(w);
    }
    if (w < indents[indents.length - 1]) {
      while (indents.length > 1 && w < indents[indents.length - 1]) indents.pop();
      if (w !== indents[indents.length - 1]) {
        add(L.line, 0, Math.max(1, L.indent.length), "error", "Esta línea no coincide con el nivel de sangría de ningún bloque anterior (IndentationError: unindent does not match any outer indentation level).", "Haz que la sangría de la línea sea exactamente igual a la del bloque al que pertenece (múltiplos de 4 espacios).");
        indents.push(w);
      }
    }
    if (!odd && !usesTab && w % 4 !== 0) { odd = true; add(L.line, 0, L.indent.length, "info", "La sangría no es múltiplo de 4 espacios.", "El estilo recomendado en Python (PEP 8) es 4 espacios por nivel."); }
    while (blocks.length && blocks[blocks.length - 1].w >= w) blocks.pop();
    for (const [k] of lastHeader) if (k > w) lastHeader.delete(k);
    const inFunc = blocks.some((b) => b.kw === "def");
    const loopIdx = blocks.map((b) => b.kw).lastIndexOf("for") > blocks.map((b) => b.kw).lastIndexOf("def") || blocks.map((b) => b.kw).lastIndexOf("while") > blocks.map((b) => b.kw).lastIndexOf("def");
    const colon = topColon(t);
    const isHeader = HEADERS.has(kw);
    const before = lastHeader.get(w);
    for (const [tw, tl] of openTry) {
      if (tw > w || (tw === w && kw !== "except" && kw !== "finally")) {
        add(tl, 0, 3, "error", `El bloque try de la línea ${tl} no tiene except ni finally después (SyntaxError: expected 'except' or 'finally' block).`, "Añade después del bloque try un bloque except tipo_de_error: o finally: alineado con él.");
        openTry.delete(tw);
      } else if (tw === w) openTry.delete(tw);
    }
    if (kw === "try") openTry.set(w, L.line);
    const original = physical[L.line - 1].trim();
    const elseIf = kw === "else" && /^else\s+if\b/.test(t);
    if (elseIf) add(L.line, lineCol, 7, "error", "Python no usa «else if».", "Escribe elif en su lugar: elif condición:");
    const cBrace = isHeader && /\{\s*$/.test(original);
    if (isHeader) {
      if (cBrace) add(L.line, lineCol + original.length - 1, 1, "error", "Python no usa llaves { } para delimitar bloques como en C y Java, sino los dos puntos «:» y la sangría.", `Escribe: ${original.replace(/\s*\{\s*$/, "")}: y luego sangra las líneas del bloque 4 espacios y elimina }.`);
      else if (colon < 0) {
        const name = kw === "def" || kw === "class" ? `Definición de ${kw}` : `Sentencia ${kw}`;
        add(L.line, Math.min(physical[L.line - 1].length, lineCol + original.length), 1, "error", `${name} debe terminar en dos puntos «:» (SyntaxError: expected ':').`, `Añade «:» al final de la línea: ${original.slice(0, 80)}:`);
      }
      if (kw === "def" && !/^(async\s+)?def\s+[A-Za-z_]\w*\s*\(/.test(t)) add(L.line, lineCol, t.length, "error", "La definición de la función necesita paréntesis después del nombre, aunque no tenga parámetros.", "Escribe: def name():");
      if ((kw === "if" || kw === "elif" || kw === "while") && hasTopAssign(colon > 0 ? t.slice(kw.length, colon) : t.slice(kw.length))) add(L.line, lineCol, t.length, "error", "Usaste = (asignación) dentro de la condición en lugar de == (comparación) (SyntaxError: invalid syntax. Maybe you meant '==' or ':=' instead of '='?).", "Usa == para comparar, por ejemplo: if x == 5:");
      if (kw === "elif" && !["if", "elif"].includes(before)) add(L.line, lineCol, 4, "error", "elif sin if antes en el mismo nivel de sangría (SyntaxError: invalid syntax).", "Asegúrate de que elif esté alineado exactamente con el if al que sigue.");
      if (kw === "else" && !elseIf && !["if", "elif", "for", "while", "try", "except"].includes(before)) add(L.line, lineCol, 4, "error", "else sin if (o for/while/try) antes en el mismo nivel de sangría (SyntaxError: invalid syntax).", "Asegúrate de que else esté alineado exactamente con la sentencia if a la que sigue.");
      if (kw === "except" && !["try", "except"].includes(before)) add(L.line, lineCol, 6, "error", "except sin try antes en el mismo nivel de sangría.", "Alinea except exactamente con try.");
      if (kw === "finally" && !["try", "except", "else"].includes(before)) add(L.line, lineCol, 7, "error", "finally sin try antes en el mismo nivel de sangría.", "Alinea finally exactamente con try.");
      if (kw === "except" && /^except\s*:/.test(t)) add(L.line, lineCol, 6, "info", "except: sin tipo de error captura todos los errores, incluso Ctrl+C, y oculta las causas de los problemas.", "Especifica el tipo de error: except ValueError: o, al menos, except Exception:");
      if (kw === "def") {
        const params = (t.match(/\((.*)\)/) || ["", ""])[1].trim();
        const parentIsClass = blocks.length && blocks[blocks.length - 1].kw === "class";
        if (parentIsClass && !/^@staticmethod/.test(prevDecorator) && !/^(self|cls)\b/.test(params)) add(L.line, lineCol, t.length, "warning", "Función dentro de una clase (método) sin el parámetro self; al llamarla desde un objeto ocurrirá TypeError: takes 0 positional arguments but 1 was given.", "Haz de self el primer parámetro: def name(self, ...):, o añade @staticmethod antes.");
        if (/=\s*(\[\s*\]|\{\s*\}|list\(\)|dict\(\)|set\(\))/.test(params)) add(L.line, lineCol, t.length, "warning", "Valor predeterminado mutable ([] o {}) que se crea una sola vez y se comparte entre todas las llamadas.", "Usa None y crea el valor dentro de la función: def f(a=None): if a is None: a = []");
      }
      if (!cBrace && (colon < 0 || !t.slice(colon + 1).trim())) expectBlock = { line: L.line, kw };
      blocks.push({ w, kw });
      lastHeader.set(w, kw);
    } else {
      lastHeader.delete(w);
      if (kw === "return" && !inFunc) add(L.line, lineCol, 6, "error", "return fuera de cualquier función (SyntaxError: 'return' outside function).", "Pon return dentro de una función def, o elimínalo.");
      if (kw === "yield" && !inFunc) add(L.line, lineCol, 5, "error", "yield fuera de cualquier función.", "Pon yield dentro de una función def.");
      if ((kw === "break" || kw === "continue") && !loopIdx) add(L.line, lineCol, kw.length, "error", `${kw} fuera de un bucle (SyntaxError: '${kw}' outside loop).`, `Pon ${kw} dentro de un for o while.`);
      if (/^print\s+[^\s=(.,)]/.test(t) && !/^print\s*\(/.test(t)) add(L.line, lineCol, 5, "error", "En Python 3, print es una función que necesita paréntesis (SyntaxError: Missing parentheses in call to 'print').", `Escribe: print(${original.replace(/^print\s+/, "")})`);
      if (t === "}" || t === "{") add(L.line, lineCol, 1, "error", "Python no usa llaves { } para delimitar bloques.", "Elimina la llave y usa la sangría para delimitar el bloque.");
      if (/^(\w+)\s*=\s*input\s*\(/.test(t)) strNames.add(t.match(/^(\w+)/)[1]);
      if (/^(\w+)\s*=\s*(int|float)\s*\(/.test(t)) strNames.delete(t.match(/^(\w+)/)[1]);
    }
    prevDecorator = t.startsWith("@") ? t : (isHeader ? "" : prevDecorator && kw ? "" : prevDecorator);
    const phys = lexed.masked[L.line - 1];
    const at = (re) => { const m = phys.match(re); return m ? m.index : lineCol; };
    if (/&&|\|\|/.test(t)) add(L.line, at(/&&|\|\|/), 2, "error", "Python no usa && ni || .", "Usa and en lugar de && y or en lugar de || .");
    if (/(^|[^!=<>])!(?!=)\s*[\w(]/.test(t)) add(L.line, at(/!(?!=)/), 1, "error", "Python no usa ! para negar.", "Usa not, por ejemplo: if not done:");
    if (/[A-Za-z_]\w*\s*(\+\+|--)(?!\s*[\w(])/.test(t)) add(L.line, at(/\+\+|--/), 2, "error", "Python no admite ++ ni -- .", "Usa x += 1 o x -= 1 .");
    if (/;\s*$/.test(t)) add(L.line, at(/;\s*$/), 1, "info", "El punto y coma al final de la línea no es necesario en Python.", "Elimínalo.");
    for (const m of t.matchAll(/\b(true|false|null|none|TRUE|FALSE|NULL|NONE|nil)\b/g)) {
      if (defined.has(m[1])) continue;
      const fixWord = { true: "True", false: "False", null: "None", none: "None", nil: "None" }[m[1].toLowerCase()];
      add(L.line, at(new RegExp(`\\b${m[1]}\\b`)), m[1].length, "error", `«${m[1]}» no está definido en Python (NameError); los valores booleanos y el valor vacío se escriben con mayúscula inicial.`, `Escribe ${fixWord}.`);
    }
    if (/[=!]=\s*None\b/.test(t)) add(L.line, at(/[=!]=\s*None/), 2, "info", "La comparación con None se hace con is, no con == .", "Escribe: if x is None: o if x is not None:");
    if (/\bis\s+(not\s+)?(-?\d|["'])/.test(t)) add(L.line, at(/\bis\s/), 2, "warning", "is compara la identidad del objeto, no su valor; con números y textos puede dar un resultado incorrecto (SyntaxWarning).", "Usa == para comparar por valor.");
    if (/["']\s*\+\s*-?\d|\d\s*\+\s*[rRbBuUfF]?["']/.test(t)) add(L.line, at(/["']\s*\+|\d\s*\+/), 1, "error", "Sumar un texto con un número causa TypeError: can only concatenate str (not \"int\") to str.", "Convierte el número a texto con str(5), o usa una f-string: f\"edad {age}\".");
    for (const n of strNames) {
      const re = new RegExp(`\\b${n}\\s*([-*/%<>]|\\+\\s*\\d)|(\\d\\s*[-*/%+<>]|[<>]=?)\\s*${n}\\b`);
      if (re.test(t) && !new RegExp(`^${n}\\s*=`).test(t)) {
        add(L.line, at(new RegExp(`\\b${n}\\b`)), n.length, "warning", `«${n}» toma su valor de input(), y input() siempre devuelve texto; por eso una operación aritmética o una comparación con él causará TypeError.`, `Conviértelo a número: ${n} = int(input(...)) o float(...).`);
        strNames.delete(n);
      }
    }
  }
  for (const tl of openTry.values()) add(tl, 0, 3, "error", `El bloque try de la línea ${tl} no tiene except ni finally después (SyntaxError: expected 'except' or 'finally' block).`, "Añade después del bloque try un bloque except tipo_de_error: o finally: alineado con él.");
  if (expectBlock) add(expectBlock.line, 0, 1, "error", `El código termina después de la línea ${expectBlock.line}, que acaba en «:», sin un bloque con sangría (IndentationError: expected an indented block).`, "Añade las líneas del bloque con sangría de 4 espacios, o escribe pass.");
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
        add(m ? L.line : L.line, m ? m.index : 0, n.length, guess ? "error" : "warning", `El nombre «${n}» no está definido${guess ? `, quizá quiso decir «${guess}»` : ""} (NameError: name '${n}' is not defined).`, guess ? `Corrige el nombre a «${guess}».` : `Define «${n}» antes de usarlo, o impórtalo con import si pertenece a una biblioteca.`);
      }
    }
  }
  return issues;
}

export function solve(input) {
  const code = readCode(input, "code");
  const issues = check(code);
  const n = code.split("\n").length;
  const linesWord = n === 1 ? "una línea" : n === 2 ? "dos líneas" : n <= 10 ? `${n} líneas` : `${n} líneas`;
  const lexical = issues.some((i) => /unterminated|was never closed|unmatched|does not match/.test(i.message));
  const steps = [
    `Leímos ${linesWord}, ignoramos los comentarios y el contenido de los textos, y luego seguimos los paréntesis y las comillas.`,
    lexical ? "Hay un problema con los paréntesis o las cadenas que confunde el resto del análisis; corrígelo primero y vuelve a revisar." : "Unimos las líneas lógicas (una línea partida dentro de paréntesis cuenta como una sola) y revisamos la sangría: cada línea que termina en «:» debe ir seguida de un bloque con sangría, y el retroceso debe coincidir con un nivel anterior.",
    "Luego revisamos las reglas comunes: los dos puntos después de if, for y def…, = en lugar de == en las condiciones, else/elif/except en su sitio, return y break fuera de su lugar, los nombres no definidos y los errores tipográficos, y costumbres de otros lenguajes como && , ++ y true.",
    "Nota: la revisión es estática, sin ejecutar el código, así que no detecta errores de ejecución que dependen de los valores, como la división entre cero."
  ];
  const out = report(code, issues, { "Número de líneas": n });
  return { results: out.results, steps, blocks: out.blocks, copy: out.copy };
}
