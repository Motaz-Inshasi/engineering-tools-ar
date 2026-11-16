import { readCode, report, closest } from "./code-view.js";

export const meta = {
  description: "Collez du code Python pour détecter les erreurs d'indentation, de deux-points, de parenthèses, de chaînes non fermées et de noms non définis, avec une explication en français de chaque erreur et la manière de la corriger.",
  keywords: ["python", "Python", "Vérification du code", "IndentationError", "SyntaxError", "NameError", "Débogage", "linter"],
  formulas: [{ label: "Le code est découpé en lignes logiques, puis l'indentation, les blocs et les règles d'erreurs courantes sont vérifiés", tex: "\\text{code} \\rightarrow \\text{tokens} \\rightarrow \\text{blocks} \\rightarrow \\text{issues}" }],
  inputs: [
    { id: "code", label: "Code Python", type: "textarea", rows: 12, wide: true, placeholder: "def greet(name):\n    print(\"Hello\", name)" }
  ],
  example: {
    values: { code: "def average(numbers)\n    total = 0\n    for n in numbers:\n        total += n\n    return total / len(numbers)\n\nscores = [90, 85, 77]\nprint(averge(scores))" },
    expect: ["':'", "Ligne 1"],
    note: "Exemple : une fonction dont l'élève a oublié les deux-points après la définition, et dont le nom a été mal orthographié lors de l'appel."
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
const BR_NAME = { "(": "Parenthèse (", "[": "Crochet [", "{": "Accolade {" };

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
          ? { line: startLine, col: startCol, len: 3, severity: "error", message: `La chaîne à trois guillemets ${q} n'a pas été fermée jusqu'à la fin du code (unterminated triple-quoted string literal).`, fix: `Ajoutez ${q} à la fin de la chaîne.` }
          : { line: startLine, col: startCol, len: 1, severity: "error", message: `La chaîne commençant par ${q} n'a pas été fermée sur la même ligne (unterminated string literal).`, fix: `Fermez la chaîne avec ${q} avant la fin de la ligne, ou utilisez trois ${q.repeat(3)} pour une chaîne sur plusieurs lignes.` });
      }
      continue;
    }
    if (PAIRS[c]) stack.push({ ch: c, line, col });
    else if (CLOSE[c]) {
      const top = stack[stack.length - 1];
      if (!top) issues.push({ line, col, len: 1, severity: "error", message: `La parenthèse fermante «${c}» est en trop et ne correspond à aucune parenthèse ouvrante (unmatched '${c}').`, fix: "Supprimez cette parenthèse, ou ajoutez la parenthèse ouvrante manquante." });
      else if (top.ch !== CLOSE[c]) { issues.push({ line, col, len: 1, severity: "error", message: `La parenthèse «${c}» ne correspond pas à «${top.ch}» ouverte à la ligne ${top.line} (closing parenthesis '${c}' does not match opening parenthesis '${top.ch}').`, fix: `Fermez «${top.ch}» avec «${PAIRS[top.ch]}».` }); stack.pop(); }
      else stack.pop();
    }
    push(c); i++; col++;
  }
  masked.push(cur);
  for (const s of stack) issues.push({ line: s.line, col: s.col, len: 1, severity: "error", message: `${BR_NAME[s.ch]} ouverte à la ligne ${s.line} n'a jamais été fermée ('${s.ch}' was never closed).`, fix: `Ajoutez «${PAIRS[s.ch]}» à l'endroit approprié.` });
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
  if (mixedLine) add(mixedLine.line, 0, mixedLine.indent.length, "warning", "L'indentation de cette ligne mélange les tabulations (Tab) et les espaces ordinaires, ce qui provoque facilement une TabError: inconsistent use of tabs and spaces in indentation.", "Utilisez 4 espaces ordinaires par niveau dans tout le fichier, et activez dans votre éditeur la conversion des tabulations en espaces.");
  else if (usesTab && usesSpace) {
    const L = lines.find((x) => x.indent.includes("\t"));
    add(L.line, 0, L.indent.length, "warning", "Le code utilise des tabulations dans certaines lignes et des espaces ordinaires dans d'autres, ce qui provoque facilement une TabError lors de toute modification.", "Utilisez 4 espaces ordinaires par niveau dans tout le fichier.");
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
      if (w <= indents[indents.length - 1]) add(L.line, 0, Math.max(1, t.length), "error", `Après la ligne ${expectBlock.line} qui se termine par « : », un bloc indenté doit suivre (IndentationError: expected an indented block after '${expectBlock.kw}' statement on line ${expectBlock.line}).`, "Indentez cette ligne de 4 espaces, ou écrivez pass si le bloc est provisoirement vide.");
      else indents.push(w);
      expectBlock = null;
    } else if (w > indents[indents.length - 1]) {
      add(L.line, 0, Math.max(1, L.indent.length), "error", "Indentation inattendue : cette ligne est indentée sans être précédée d'une ligne qui se termine par « : » (IndentationError: unexpected indent).", "Supprimez les espaces superflus au début de la ligne pour qu'elle soit alignée sur la ligne qui la précède.");
      indents.push(w);
    }
    if (w < indents[indents.length - 1]) {
      while (indents.length > 1 && w < indents[indents.length - 1]) indents.pop();
      if (w !== indents[indents.length - 1]) {
        add(L.line, 0, Math.max(1, L.indent.length), "error", "Cette ligne ne correspond au niveau d'indentation d'aucun bloc englobant (IndentationError: unindent does not match any outer indentation level).", "Faites en sorte que l'indentation de la ligne soit exactement égale à celle du bloc auquel elle appartient (multiples de 4 espaces).");
        indents.push(w);
      }
    }
    if (!odd && !usesTab && w % 4 !== 0) { odd = true; add(L.line, 0, L.indent.length, "info", "L'indentation n'est pas un multiple de 4 espaces.", "Le style standard de Python (PEP 8) est de 4 espaces par niveau."); }
    while (blocks.length && blocks[blocks.length - 1].w >= w) blocks.pop();
    for (const [k] of lastHeader) if (k > w) lastHeader.delete(k);
    const inFunc = blocks.some((b) => b.kw === "def");
    const loopIdx = blocks.map((b) => b.kw).lastIndexOf("for") > blocks.map((b) => b.kw).lastIndexOf("def") || blocks.map((b) => b.kw).lastIndexOf("while") > blocks.map((b) => b.kw).lastIndexOf("def");
    const colon = topColon(t);
    const isHeader = HEADERS.has(kw);
    const before = lastHeader.get(w);
    for (const [tw, tl] of openTry) {
      if (tw > w || (tw === w && kw !== "except" && kw !== "finally")) {
        add(tl, 0, 3, "error", `Le bloc try à la ligne ${tl} n'est suivi ni de except ni de finally (SyntaxError: expected 'except' or 'finally' block).`, "Après le bloc try, ajoutez un bloc except NomErreur: ou finally: aligné avec lui.");
        openTry.delete(tw);
      } else if (tw === w) openTry.delete(tw);
    }
    if (kw === "try") openTry.set(w, L.line);
    const original = physical[L.line - 1].trim();
    const elseIf = kw === "else" && /^else\s+if\b/.test(t);
    if (elseIf) add(L.line, lineCol, 7, "error", "Python n'utilise pas « else if ».", "Écrivez plutôt elif : elif condition:");
    const cBrace = isHeader && /\{\s*$/.test(original);
    if (isHeader) {
      if (cBrace) add(L.line, lineCol + original.length - 1, 1, "error", "Python n'utilise pas les accolades { } pour délimiter les blocs comme le font C et Java ; il utilise les deux-points « : » et l'indentation.", `Écrivez : ${original.replace(/\s*\{\s*$/, "")}: puis indentez les lignes du bloc de 4 espaces et supprimez }.`);
      else if (colon < 0) {
        const name = kw === "def" || kw === "class" ? `Définition ${kw}` : `Instruction ${kw}`;
        add(L.line, Math.min(physical[L.line - 1].length, lineCol + original.length), 1, "error", `${name} doit se terminer par des deux-points « : » (SyntaxError: expected ':').`, `Ajoutez « : » à la fin de la ligne : ${original.slice(0, 80)}:`);
      }
      if (kw === "def" && !/^(async\s+)?def\s+[A-Za-z_]\w*\s*\(/.test(t)) add(L.line, lineCol, t.length, "error", "La définition d'une fonction nécessite deux parenthèses après son nom, même si elle n'a pas de paramètres.", "Écrivez : def name():");
      if ((kw === "if" || kw === "elif" || kw === "while") && hasTopAssign(colon > 0 ? t.slice(kw.length, colon) : t.slice(kw.length))) add(L.line, lineCol, t.length, "error", "Vous avez utilisé = (affectation) dans la condition au lieu de == (comparaison) (SyntaxError: invalid syntax. Maybe you meant '==' or ':=' instead of '='?).", "Utilisez == pour comparer, par exemple : if x == 5:");
      if (kw === "elif" && !["if", "elif"].includes(before)) add(L.line, lineCol, 4, "error", "elif sans if qui le précède au même niveau d'indentation (SyntaxError: invalid syntax).", "Assurez-vous que elif est aligné exactement avec le if qu'il suit.");
      if (kw === "else" && !elseIf && !["if", "elif", "for", "while", "try", "except"].includes(before)) add(L.line, lineCol, 4, "error", "else sans if (ni for/while/try) qui le précède au même niveau d'indentation (SyntaxError: invalid syntax).", "Assurez-vous que else est aligné exactement avec l'instruction if qu'il suit.");
      if (kw === "except" && !["try", "except"].includes(before)) add(L.line, lineCol, 6, "error", "except sans try qui le précède au même niveau d'indentation.", "Alignez except exactement sur try.");
      if (kw === "finally" && !["try", "except", "else"].includes(before)) add(L.line, lineCol, 7, "error", "finally sans try qui le précède au même niveau d'indentation.", "Alignez finally exactement sur try.");
      if (kw === "except" && /^except\s*:/.test(t)) add(L.line, lineCol, 6, "info", "Un except: nu intercepte toutes les erreurs, même Ctrl+C, ce qui masque les causes des problèmes.", "Précisez le type d'erreur : except ValueError: ou au minimum except Exception:");
      if (kw === "def") {
        const params = (t.match(/\((.*)\)/) || ["", ""])[1].trim();
        const parentIsClass = blocks.length && blocks[blocks.length - 1].kw === "class";
        if (parentIsClass && !/^@staticmethod/.test(prevDecorator) && !/^(self|cls)\b/.test(params)) add(L.line, lineCol, t.length, "warning", "Une méthode définie dans une classe n'a pas de paramètre self ; lorsqu'elle est appelée depuis un objet, cela provoquera TypeError: takes 0 positional arguments but 1 was given.", "Faites de self le premier paramètre : def name(self, ...):, ou ajoutez @staticmethod avant elle.");
        if (/=\s*(\[\s*\]|\{\s*\}|list\(\)|dict\(\)|set\(\))/.test(params)) add(L.line, lineCol, t.length, "warning", "Une valeur par défaut modifiable ([] ou {}) est créée une seule fois et partagée entre tous les appels.", "Utilisez None et créez la valeur à l'intérieur de la fonction : def f(a=None): if a is None: a = []");
      }
      if (!cBrace && (colon < 0 || !t.slice(colon + 1).trim())) expectBlock = { line: L.line, kw };
      blocks.push({ w, kw });
      lastHeader.set(w, kw);
    } else {
      lastHeader.delete(w);
      if (kw === "return" && !inFunc) add(L.line, lineCol, 6, "error", "return en dehors de toute fonction (SyntaxError: 'return' outside function).", "Placez return à l'intérieur d'une fonction def, ou supprimez-le.");
      if (kw === "yield" && !inFunc) add(L.line, lineCol, 5, "error", "yield en dehors de toute fonction.", "Placez yield à l'intérieur d'une fonction def.");
      if ((kw === "break" || kw === "continue") && !loopIdx) add(L.line, lineCol, kw.length, "error", `${kw} en dehors d'une boucle (SyntaxError: '${kw}' outside loop).`, `Placez ${kw} dans un for ou un while.`);
      if (/^print\s+[^\s=(.,)]/.test(t) && !/^print\s*\(/.test(t)) add(L.line, lineCol, 5, "error", "En Python 3, print est devenu une fonction qui nécessite des parenthèses (SyntaxError: Missing parentheses in call to 'print').", `Écrivez : print(${original.replace(/^print\s+/, "")})`);
      if (t === "}" || t === "{") add(L.line, lineCol, 1, "error", "Python n'utilise pas les accolades { } pour délimiter les blocs.", "Supprimez l'accolade et appuyez-vous sur l'indentation pour délimiter le bloc.");
      if (/^(\w+)\s*=\s*input\s*\(/.test(t)) strNames.add(t.match(/^(\w+)/)[1]);
      if (/^(\w+)\s*=\s*(int|float)\s*\(/.test(t)) strNames.delete(t.match(/^(\w+)/)[1]);
    }
    prevDecorator = t.startsWith("@") ? t : (isHeader ? "" : prevDecorator && kw ? "" : prevDecorator);
    const phys = lexed.masked[L.line - 1];
    const at = (re) => { const m = phys.match(re); return m ? m.index : lineCol; };
    if (/&&|\|\|/.test(t)) add(L.line, at(/&&|\|\|/), 2, "error", "Python n'utilise pas && ni || .", "Utilisez and au lieu de && et or au lieu de || .");
    if (/(^|[^!=<>])!(?!=)\s*[\w(]/.test(t)) add(L.line, at(/!(?!=)/), 1, "error", "Python n'utilise pas ! pour la négation.", "Utilisez not, par exemple : if not done:");
    if (/[A-Za-z_]\w*\s*(\+\+|--)(?!\s*[\w(])/.test(t)) add(L.line, at(/\+\+|--/), 2, "error", "Python ne prend pas en charge ++ ni -- .", "Utilisez x += 1 ou x -= 1 .");
    if (/;\s*$/.test(t)) add(L.line, at(/;\s*$/), 1, "info", "Un point-virgule en fin de ligne n'est pas nécessaire en Python.", "Supprimez-le.");
    for (const m of t.matchAll(/\b(true|false|null|none|TRUE|FALSE|NULL|NONE|nil)\b/g)) {
      if (defined.has(m[1])) continue;
      const fixWord = { true: "True", false: "False", null: "None", none: "None", nil: "None" }[m[1].toLowerCase()];
      add(L.line, at(new RegExp(`\\b${m[1]}\\b`)), m[1].length, "error", `«${m[1]}» n'est pas défini en Python (NameError) ; les valeurs booléennes et la valeur vide s'écrivent avec une majuscule.`, `Écrivez ${fixWord}.`);
    }
    if (/[=!]=\s*None\b/.test(t)) add(L.line, at(/[=!]=\s*None/), 2, "info", "La comparaison avec None doit se faire avec is, et non avec == .", "Écrivez : if x is None: ou if x is not None:");
    if (/\bis\s+(not\s+)?(-?\d|["'])/.test(t)) add(L.line, at(/\bis\s/), 2, "warning", "is compare l'identité de l'objet et non sa valeur ; avec les nombres et les chaînes, cela peut donner un résultat faux (SyntaxWarning).", "Utilisez == pour comparer les valeurs.");
    if (/["']\s*\+\s*-?\d|\d\s*\+\s*[rRbBuUfF]?["']/.test(t)) add(L.line, at(/["']\s*\+|\d\s*\+/), 1, "error", "Additionner une chaîne et un nombre provoque TypeError: can only concatenate str (not \"int\") to str.", "Convertissez le nombre en chaîne avec str(5), ou utilisez une f-string : f\"Âge {age}\".");
    for (const n of strNames) {
      const re = new RegExp(`\\b${n}\\s*([-*/%<>]|\\+\\s*\\d)|(\\d\\s*[-*/%+<>]|[<>]=?)\\s*${n}\\b`);
      if (re.test(t) && !new RegExp(`^${n}\\s*=`).test(t)) {
        add(L.line, at(new RegExp(`\\b${n}\\b`)), n.length, "warning", `«${n}» reçoit sa valeur de input(), et input() renvoie toujours une chaîne ; une opération arithmétique ou une comparaison sur elle provoquera une TypeError.`, `Convertissez-la en nombre : ${n} = int(input(...)) ou float(...).`);
        strNames.delete(n);
      }
    }
  }
  for (const tl of openTry.values()) add(tl, 0, 3, "error", `Le bloc try à la ligne ${tl} n'est suivi ni de except ni de finally (SyntaxError: expected 'except' or 'finally' block).`, "Après le bloc try, ajoutez un bloc except NomErreur: ou finally: aligné avec lui.");
  if (expectBlock) add(expectBlock.line, 0, 1, "error", `Le code s'est terminé après la ligne ${expectBlock.line} qui se termine par « : » sans bloc indenté (IndentationError: expected an indented block).`, "Ajoutez les lignes du bloc indentées de 4 espaces, ou écrivez pass.");
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
        add(m ? L.line : L.line, m ? m.index : 0, n.length, guess ? "error" : "warning", `Le nom «${n}» n'est pas défini${guess ? `, vouliez-vous dire «${guess}» ?` : ""} (NameError: name '${n}' is not defined).`, guess ? `Corrigez le nom en «${guess}».` : `Définissez «${n}» avant de l'utiliser, ou importez-le avec import s'il provient d'une bibliothèque.`);
      }
    }
  }
  return issues;
}

export function solve(input) {
  const code = readCode(input, "code");
  const issues = check(code);
  const n = code.split("\n").length;
  const linesWord = n === 1 ? "une ligne" : n === 2 ? "deux lignes" : n <= 10 ? `${n} lignes` : `${n} lignes`;
  const lexical = issues.some((i) => /unterminated|was never closed|unmatched|does not match/.test(i.message));
  const steps = [
    `Nous avons lu ${linesWord}, ignoré les commentaires et le contenu des chaînes, puis suivi les parenthèses et les guillemets.`,
    lexical ? "Un problème de parenthèses ou de chaînes a été détecté ; il perturbe la suite de l'analyse, corrigez-le donc d'abord, puis relancez la vérification." : "Nous avons regroupé les lignes logiques (une ligne coupée à l'intérieur de parenthèses compte comme une seule ligne) et vérifié l'indentation : chaque ligne qui se termine par « : » doit être suivie d'un bloc indenté, et un retour arrière doit correspondre à un niveau précédent.",
    "Nous avons ensuite vérifié les règles courantes : les deux-points après if, for, def…, = au lieu de == dans les conditions, else/elif/except à leur place, return et break en dehors de leur place, les noms non définis et leurs fautes de frappe, et les habitudes d'autres langages comme &&, ++ et true.",
    "Remarque : la vérification est statique, sans exécution du code ; elle ne détecte donc pas les erreurs d'exécution qui dépendent des valeurs, comme la division par zéro."
  ];
  const out = report(code, issues, { "Nombre de lignes": n });
  return { results: out.results, steps, blocks: out.blocks, copy: out.copy };
}
