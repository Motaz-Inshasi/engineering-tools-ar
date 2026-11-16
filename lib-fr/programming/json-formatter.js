import { choice, fail, isBlank } from "../core/validate.js";

export const meta = {
  description: "Vérifiez un texte JSON et localisez chaque erreur avec précision (ligne et colonne), avec une explication en français et la manière de la corriger. Ensuite, mettez-le en forme avec l'espacement de votre choix, ou compressez-le sur une seule ligne avec des statistiques sur sa structure.",
  keywords: ["JSON", "Vérificateur JSON", "Mise en forme JSON", "Compression JSON", "JSON formatter", "JSON validator", "Syntaxe JSON"],
  formulas: [{ label: "Valeur en JSON", tex: "\\text{value} \\in \\{\\text{object}, \\text{array}, \\text{string}, \\text{number}, \\text{true}, \\text{false}, \\text{null}\\}" }],
  inputs: [
    { id: "text", label: "Texte JSON", type: "textarea", rows: 10, wide: true, default: "" },
    { id: "mode", label: "Mode", type: "select", default: "format", options: [["format", "Mise en forme"], ["minify", "Compresser sur une seule ligne"], ["validate", "Validation uniquement"]] },
    { id: "indent", label: "Indentation", type: "select", default: "2", options: [["2", "2 espaces"], ["4", "4 espaces"], ["tab", "Tabulation (Tab)"]], when: { mode: ["format"] } },
    { id: "sortKeys", label: "Trier les clés par ordre alphabétique", type: "checkbox", default: "", when: { mode: ["format", "minify"] } }
  ],
  example: {
    values: { text: "{\n  \"name\": \"Mihsab\",\n  \"version\": 1,\n  \"tags\": [\"éducation\", \"ingénierie\"],\n  \"enabled\": true\n}", mode: "format", indent: "2", sortKeys: "" },
    expect: ["✅ Aucune erreur trouvée", "Clés : 4"],
    note: "Exemple : un objet JSON valide composé de quatre clés."
  },
  invalid: { values: { text: "", mode: "format", indent: "2", sortKeys: "" } },
  related: ["html-checker", "bracket-checker", "js-checker", "python-checker", "error-explainer"]
};

const LIMIT = 200000;
const CONTEXT = 3;
const VERDICT_OK = "✅ Aucune erreur trouvée";
const VERDICT_ERR = "❌ 1 erreur trouvée";
const INDENTS = { "2": "  ", "4": "    ", tab: "\t" };
const ROOT_TYPES = { object: "Objet", array: "Tableau", string: "Chaîne", number: "Nombre", boolean: "Booléen", null: "Vide (null)" };
const ESCAPES = new Map([["\"", "\""], ["\\", "\\"], ["/", "/"], ["b", "\b"], ["f", "\f"], ["n", "\n"], ["r", "\r"], ["t", "\t"]]);
const VALUE_START = /[-0-9"{\[a-zA-Z_$]/;
const LITERAL_HINTS = new Map([
  ["True", ["La valeur «True» n'est pas valide en JSON ; la forme correcte est en minuscules.", "Écrivez-la « true » en minuscules."]],
  ["False", ["La valeur «False» n'est pas valide en JSON ; la forme correcte est en minuscules.", "Écrivez-la « false » en minuscules."]],
  ["None", ["La valeur «None» provient de Python et n'est pas une valeur JSON.", "Écrivez-la « null » en minuscules."]],
  ["undefined", ["La valeur «undefined» provient de JavaScript et n'est pas une valeur JSON.", "Écrivez-la « null »."]],
  ["NaN", ["La valeur «NaN» n'est pas autorisée en JSON.", "Utilisez « null », ou écrivez la valeur sous forme de texte entre guillemets."]],
  ["Infinity", ["La valeur «Infinity» n'est pas autorisée en JSON.", "Utilisez « null », ou écrivez la valeur sous forme de texte entre guillemets."]]
]);

class JsonProblem extends Error {
  constructor(pos, len, message, suggestion) {
    super(message);
    this.pos = pos;
    this.len = len;
    this.suggestion = suggestion;
  }
}

function fault(pos, len, message, suggestion) {
  throw new JsonProblem(pos, len, message, suggestion);
}

function locate(src, pos) {
  let line = 1, start = 0;
  for (let k = 0; k < pos; k++) if (src[k] === "\n") { line++; start = k + 1; }
  return { line, col: pos - start + 1 };
}

function where(src, pos) {
  const l = locate(src, pos);
  return `Ligne ${l.line} (colonne ${l.col})`;
}

const digit = (c) => c !== undefined && c >= "0" && c <= "9";
const isLetter = (c) => c !== undefined && /[A-Za-z_$]/.test(c);

function wordEnd(s, i) {
  let k = i;
  while (k < s.length && /[A-Za-z0-9_$]/.test(s[k])) k++;
  return k;
}

function unclosed(s, open, ch, close) {
  fault(s.length, 0, `Le «${ch}» ouvert à ${where(s, open)} n'a pas été fermé avant la fin du fichier.`, `Ajoutez «${close}» à l'endroit approprié pour le fermer.`);
}

function skipSpace(st) {
  const s = st.s;
  while (s[st.i] === " " || s[st.i] === "\t" || s[st.i] === "\n") st.i++;
  if (s[st.i] === "/" && s[st.i + 1] === "/") {
    const end = s.indexOf("\n", st.i);
    fault(st.i, (end < 0 ? s.length : end) - st.i, "JSON ne prend pas en charge les commentaires, et voici un commentaire qui commence ici.", "Supprimez entièrement le commentaire ; les fichiers JSON n'acceptent aucun commentaire.");
  }
  if (s[st.i] === "/" && s[st.i + 1] === "*") {
    const end = s.indexOf("*/", st.i + 2);
    fault(st.i, end < 0 ? s.length - st.i : end + 2 - st.i, "JSON ne prend pas en charge les commentaires, et voici un commentaire multiligne qui commence ici.", "Supprimez entièrement le commentaire ; les fichiers JSON n'acceptent aucun commentaire.");
  }
}

function parseString(st) {
  const s = st.s, start = st.i;
  let i = start + 1, value = "";
  for (;;) {
    const c = s[i];
    if (c === undefined || c === "\n") fault(start, 1, "Le guillemet double qui a ouvert la chaîne n'a pas été fermé.", "Ajoutez \" à la fin de la chaîne, et ne prolongez pas la chaîne sur une autre ligne.");
    if (c === "\"") {
      st.i = i + 1;
      return { type: "string", value, raw: s.slice(start, i + 1) };
    }
    if (c === "\\") {
      const e = s[i + 1];
      if (e === undefined || e === "\n") fault(start, 1, "Le guillemet double qui a ouvert la chaîne n'a pas été fermé.", "Ajoutez \" à la fin de la chaîne, et ne prolongez pas la chaîne sur une autre ligne.");
      if (e === "u") {
        const hex = s.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) fault(i, 2, "La séquence d'échappement \\u doit être suivie de quatre chiffres hexadécimaux (0-9 ou A-F).", "Exemple correct : \\u00e9 représente le caractère é.");
        value += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      }
      if (!ESCAPES.has(e)) fault(i, 2, `La séquence d'échappement «\\${e}» n'est pas valide en JSON.`, "Les caractères autorisés après la barre oblique inverse \\ sont : \" \\ / b f n r t u.");
      value += ESCAPES.get(e);
      i += 2;
      continue;
    }
    if (c < " ") fault(i, 1, "Un caractère de contrôle n'est pas autorisé dans le texte (comme Tab ou un caractère invisible).", "Remplacez-le par une séquence d'échappement comme \\t, ou supprimez-le.");
    value += c;
    i++;
  }
}

function parseNumber(st) {
  const s = st.s, start = st.i;
  let i = start;
  if (s[i] === "-") i++;
  if (s[i] === "0") {
    i++;
    if (digit(s[i])) {
      let k = i;
      while (digit(s[k])) k++;
      fault(start, k - start, "Un nombre en JSON ne doit pas commencer par un zéro suivi d'un chiffre.", "Supprimez les zéros superflus au début du nombre ; par exemple, 01 devient 1.");
    }
  } else if (digit(s[i])) {
    while (digit(s[i])) i++;
  } else {
    fault(start, 1, "Le signe « - » doit être suivi d'un chiffre.", "Écrivez le nombre après « - », comme -5, ou supprimez le signe s'il est une erreur.");
  }
  if (s[i] === ".") {
    i++;
    if (!digit(s[i])) fault(i - 1, 1, "Le point décimal doit être suivi d'un chiffre.", "Écrivez un chiffre après le point, comme 1.5, ou supprimez le point.");
    while (digit(s[i])) i++;
  }
  if (s[i] === "e" || s[i] === "E") {
    i++;
    if (s[i] === "+" || s[i] === "-") i++;
    if (!digit(s[i])) fault(start, i - start, "L'exposant du nombre scientifique doit être suivi d'un chiffre.", "Exemples corrects : 1e5 ou 2.5E-3.");
    while (digit(s[i])) i++;
  }
  st.i = i;
  return { type: "number", raw: s.slice(start, i) };
}

function parseWord(st) {
  const s = st.s, start = st.i, end = wordEnd(s, start);
  const w = s.slice(start, end);
  st.i = end;
  if (w === "true" || w === "false") return { type: "boolean", raw: w };
  if (w === "null") return { type: "null", raw: w };
  if (LITERAL_HINTS.has(w)) {
    const [message, suggestion] = LITERAL_HINTS.get(w);
    fault(start, w.length, message, suggestion);
  }
  fault(start, w.length, `Le mot «${w}» n'est pas une valeur JSON valide.`, "Valeurs autorisées : texte entre \"\", un nombre, true, false ou null.");
}

function parseKey(st) {
  const s = st.s, c = s[st.i];
  if (c === "\"") return parseString(st);
  if (c === "}") fault(st.i, 1, "Virgule en trop avant «}».", "Supprimez la dernière virgule avant l'accolade «}».");
  if (c === "'") fault(st.i, 1, "Le nom de la clé doit être placé entre guillemets doubles, et non simples.", "Remplacez ' par \" autour du nom de la clé.");
  if (isLetter(c)) {
    const w = s.slice(st.i, wordEnd(s, st.i));
    fault(st.i, w.length, `Le nom de la clé «${w}» n'est pas entre guillemets.`, `Placez le nom entre guillemets doubles : "${w}".`);
  }
  fault(st.i, 1, `Le nom de la clé doit être un texte entre guillemets doubles, mais «${c}» a été trouvé.`, "Écrivez le nom de la clé entre guillemets doubles.");
}

function parseObject(st) {
  const s = st.s, open = st.i;
  st.i++;
  const entries = [];
  skipSpace(st);
  if (s[st.i] === "}") {
    st.i++;
    return { type: "object", entries };
  }
  for (;;) {
    skipSpace(st);
    if (s[st.i] === undefined) unclosed(s, open, "{", "}");
    const key = parseKey(st);
    skipSpace(st);
    if (s[st.i] === undefined) unclosed(s, open, "{", "}");
    if (s[st.i] !== ":") fault(st.i, 1, `Les deux-points « : » étaient attendus après le nom de la clé, mais «${s[st.i]}» a été trouvé.`, "Placez « : » entre le nom de la clé et la valeur, par exemple : \"name\": \"value\".");
    st.i++;
    entries.push({ key: key.value, raw: key.raw, value: parseValue(st) });
    skipSpace(st);
    const d = s[st.i];
    if (d === ",") {
      st.i++;
      continue;
    }
    if (d === "}") {
      st.i++;
      return { type: "object", entries };
    }
    if (d === undefined) unclosed(s, open, "{", "}");
    if (d === "]") fault(st.i, 1, `«]» a été trouvé alors que «}» est attendu pour fermer «{» ouverte à ${where(s, open)}.`, "Si c'est la fin de l'objet, remplacez «]» par «}» ; sinon, vérifiez les parenthèses.");
    if (VALUE_START.test(d)) fault(st.i, 1, "Une virgule « , » était attendue entre les membres de l'objet, mais un nouveau membre a commencé directement.", "Ajoutez une virgule « , » après la valeur précédente.");
    fault(st.i, 1, `« , » ou « } » était attendu, mais «${d}» a été trouvé.`, "Vérifiez les virgules et les accolades autour de cette position.");
  }
}

function parseArray(st) {
  const s = st.s, open = st.i;
  st.i++;
  const items = [];
  skipSpace(st);
  if (s[st.i] === "]") {
    st.i++;
    return { type: "array", items };
  }
  for (;;) {
    skipSpace(st);
    if (s[st.i] === undefined) unclosed(s, open, "[", "]");
    if (s[st.i] === "]") fault(st.i, 1, "Virgule en trop avant «]».", "Supprimez la dernière virgule avant le crochet «]».");
    items.push(parseValue(st));
    skipSpace(st);
    const d = s[st.i];
    if (d === ",") {
      st.i++;
      continue;
    }
    if (d === "]") {
      st.i++;
      return { type: "array", items };
    }
    if (d === undefined) unclosed(s, open, "[", "]");
    if (d === "}") fault(st.i, 1, `«}» a été trouvé alors que «]» est attendu pour fermer «[» ouverte à ${where(s, open)}.`, "Si c'est la fin du tableau, remplacez «}» par «]» ; sinon, vérifiez les parenthèses.");
    if (VALUE_START.test(d)) fault(st.i, 1, "Une virgule « , » était attendue entre les éléments du tableau, mais un nouvel élément a commencé directement.", "Ajoutez une virgule « , » entre les deux éléments.");
    fault(st.i, 1, `« , » ou «]» était attendu, mais «${d}» a été trouvé.`, "Vérifiez les virgules et les accolades autour de cette position.");
  }
}

function parseValue(st) {
  skipSpace(st);
  const s = st.s, c = s[st.i];
  if (c === undefined) fault(st.i, 0, "Le fichier s'est terminé à l'endroit où une valeur était attendue.", "Complétez la valeur manquante, ou supprimez la virgule ou les deux-points qui la précèdent.");
  if (c === "{") return parseObject(st);
  if (c === "[") return parseArray(st);
  if (c === "\"") return parseString(st);
  if (c === "'") fault(st.i, 1, "Les textes en JSON s'écrivent avec un guillemet double \", et le guillemet simple ' n'est pas autorisé.", "Remplacez ' par \" au début et à la fin du texte.");
  if (c === "-" || digit(c)) return parseNumber(st);
  if (isLetter(c)) return parseWord(st);
  fault(st.i, 1, `Une valeur était attendue ici, mais «${c}» a été trouvé.`, "Valeurs autorisées : texte entre \"\", un nombre, true, false, null, un objet {} ou un tableau [].");
}

export function parseJson(src) {
  const st = { s: src, i: 0 };
  try {
    const tree = parseValue(st);
    skipSpace(st);
    if (st.i < src.length) {
      const c = src[st.i];
      if (c === "]" || c === "}") fault(st.i, 1, `La parenthèse fermante «${c}» est en trop et ne correspond à aucune parenthèse ouvrante.`, "Supprimez-la, ou vérifiez que chaque parenthèse ouvrante a une parenthèse fermante correspondante.");
      fault(st.i, 1, "Il y a un contenu superflu après la fin de la valeur racine.", "Un fichier JSON ne doit contenir qu'une seule valeur ; placez les éléments dans un tableau [ ] ou un objet { }.");
    }
    return { ok: true, tree };
  } catch (e) {
    if (!(e instanceof JsonProblem)) throw e;
    const at = locate(src, e.pos);
    return { ok: false, problem: { pos: e.pos, len: e.len, line: at.line, col: at.col, message: e.message, suggestion: e.suggestion } };
  }
}

export function formatJson(tree, mode, unit, sortKeys) {
  return serialize(tree, mode === "minify" ? null : unit, sortKeys, 0);
}

function serialize(node, unit, sortKeys, level) {
  if (node.type === "object") {
    if (node.entries.length === 0) return "{}";
    let entries = node.entries;
    if (sortKeys) entries = entries.slice().sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    if (unit === null) return "{" + entries.map((e) => e.raw + ":" + serialize(e.value, null, sortKeys, 0)).join(",") + "}";
    const pad = unit.repeat(level + 1);
    return "{\n" + entries.map((e) => pad + e.raw + ": " + serialize(e.value, unit, sortKeys, level + 1)).join(",\n") + "\n" + unit.repeat(level) + "}";
  }
  if (node.type === "array") {
    if (node.items.length === 0) return "[]";
    if (unit === null) return "[" + node.items.map((x) => serialize(x, null, sortKeys, 0)).join(",") + "]";
    const pad = unit.repeat(level + 1);
    return "[\n" + node.items.map((x) => pad + serialize(x, unit, sortKeys, level + 1)).join(",\n") + "\n" + unit.repeat(level) + "]";
  }
  return node.raw;
}

function measure(node, depth, acc) {
  acc.values++;
  if (node.type !== "object" && node.type !== "array") return;
  const d = depth + 1;
  if (d > acc.maxDepth) acc.maxDepth = d;
  if (node.type === "object") {
    acc.keys += node.entries.length;
    for (const e of node.entries) measure(e.value, d, acc);
  } else {
    for (const x of node.items) measure(x, d, acc);
  }
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderLine(text, ranges) {
  const bad = new Array(text.length).fill(false);
  let tail = false;
  for (const [a, b] of ranges) {
    if (a >= text.length) tail = true;
    for (let k = a; k < Math.min(b, text.length); k++) bad[k] = true;
  }
  let html = "";
  let k = 0;
  while (k < text.length) {
    const flag = bad[k];
    let j = k;
    while (j < text.length && bad[j] === flag) j++;
    const chunk = esc(text.slice(k, j));
    html += flag ? `<span class="bad">${chunk}</span>` : chunk;
    k = j;
  }
  if (tail) html += "<span class=\"bad\"> </span>";
  return html;
}

function snippet(src, problems) {
  const lines = src.split("\n");
  const shown = new Set();
  const marks = new Map();
  for (const p of problems) {
    for (let n = Math.max(1, p.line - CONTEXT); n <= Math.min(lines.length, p.line + CONTEXT); n++) shown.add(n);
    if (!marks.has(p.line)) marks.set(p.line, []);
    marks.get(p.line).push([p.col - 1, p.col - 1 + Math.max(1, p.len || 0)]);
  }
  const out = [];
  let prev = 0;
  for (const n of [...shown].sort((a, b) => a - b)) {
    if (prev && n !== prev + 1) out.push("…");
    out.push(`<span class="ln">${n}</span>${renderLine(lines[n - 1] ?? "", marks.get(n) || [])}`);
    prev = n;
  }
  return `<pre class="code" dir="ltr"><code>${out.join("\n")}</code></pre>`;
}

function errorResult(src, problem, length) {
  const at = `Ligne ${problem.line}, colonne ${problem.col}`;
  return {
    results: [
      { label: "Verdict", value: VERDICT_ERR },
      { label: "Emplacement de l'erreur", value: at },
      { label: "Taille avant", value: `${length} caractères` }
    ],
    steps: [`Rendez-vous à ${at}.`, problem.suggestion],
    blocks: [
      { type: "table", wrap: true, head: ["Ligne", "Colonne", "Problème", "Comment le corriger"], rows: [[String(problem.line), String(problem.col), problem.message, problem.suggestion]] },
      { type: "html", html: snippet(src, [problem]) }
    ],
    copy: `${VERDICT_ERR}
${at} : ${problem.message}
Comment le corriger : ${problem.suggestion}`
  };
}

export function solve(input) {
  const raw = input.text;
  if (isBlank(raw)) fail("Saisissez le texte JSON que vous voulez vérifier.", "text");
  const text = String(raw);
  if (text.length > LIMIT) fail("Le texte dépasse 200000 caractères ; réduisez sa taille, puis relancez la vérification.", "text");
  const mode = choice(input, "mode", "Mode", ["format", "minify", "validate"], "format");
  const indent = choice(input, "indent", "Indentation", ["2", "4", "tab"], "2");
  const sortKeys = !isBlank(input.sortKeys) && String(input.sortKeys) !== "0";
  const src = text.replace(/\r\n?/g, "\n");
  const parsed = parseJson(src);
  if (!parsed.ok) return errorResult(src, parsed.problem, text.length);
  const tree = parsed.tree;
  const acc = { values: 0, keys: 0, maxDepth: 0 };
  measure(tree, 0, acc);
  const output = mode === "validate" ? "" : formatJson(tree, mode, INDENTS[indent], sortKeys);
  const rootLabel = ROOT_TYPES[tree.type];
  const results = [
    { label: "Verdict", value: VERDICT_OK },
    { label: "Type de la valeur racine", value: rootLabel },
    { label: "Nombre de clés", value: String(acc.keys) },
    { label: "Nombre de valeurs", value: String(acc.values) },
    { label: "Profondeur maximale", value: String(acc.maxDepth) },
    { label: "Taille avant", value: `${text.length} caractères` }
  ];
  const blocks = [];
  let step = "Aucune mise en forme n'a été demandée, la vérification seule a donc été effectuée.";
  if (output) {
    results.push({ label: "Taille après", value: `${output.length} caractères` });
    blocks.push({ type: "note", text: mode === "minify" ? "Résultat compressé sur une seule ligne :" : "Résultat après mise en forme :" });
    blocks.push({ type: "html", html: `<pre class="code" dir="ltr"><code>${esc(output)}</code></pre>` });
    step = mode === "minify" ? "Espaces et lignes vides hors des textes supprimés." : "Le fichier a été réécrit en indentant chaque niveau interne.";
  }
  const summary = `${VERDICT_OK}. Type de la valeur racine : ${rootLabel}, clés : ${acc.keys}, valeurs : ${acc.values}, profondeur maximale : ${acc.maxDepth}, taille : ${text.length} caractères`;
  return {
    results,
    steps: ["Nous avons lu le texte et analysé sa structure caractère par caractère selon les règles JSON.", "Nous avons vérifié que les clés sont entre guillemets et que les virgules et les accolades sont équilibrées.", step],
    blocks,
    copy: output ? `${summary}\n${output}` : summary
  };
}
