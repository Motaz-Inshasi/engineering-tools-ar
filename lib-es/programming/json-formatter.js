import { choice, fail, isBlank } from "../core/validate.js";

export const meta = {
  description: "Revisa un texto JSON y localiza cada error con precisión (línea y columna), con explicación en español y cómo corregirlo; luego fórmalo con la sangría que elijas o compáctalo en una sola línea con estadísticas de su estructura.",
  keywords: ["JSON", "Validador JSON", "Formatear JSON", "Compactar JSON", "JSON formatter", "JSON validator", "Formato JSON"],
  formulas: [{ label: "Valor en JSON", tex: "\\text{value} \\in \\{\\text{object}, \\text{array}, \\text{string}, \\text{number}, \\text{true}, \\text{false}, \\text{null}\\}" }],
  inputs: [
    { id: "text", label: "Texto JSON", type: "textarea", rows: 10, wide: true, default: "" },
    { id: "mode", label: "Modo", type: "select", default: "format", options: [["format", "Formato"], ["minify", "Compactar en una sola línea"], ["validate", "Solo validar"]] },
    { id: "indent", label: "Sangría", type: "select", default: "2", options: [["2", "2 espacios"], ["4", "4 espacios"], ["tab", "Tabulación (Tab)"]], when: { mode: ["format"] } },
    { id: "sortKeys", label: "Ordenar claves alfabéticamente", type: "checkbox", default: "", when: { mode: ["format", "minify"] } }
  ],
  example: {
    values: { text: "{\n  \"name\": \"Mihsab\",\n  \"version\": 1,\n  \"tags\": [\"educación\", \"ingeniería\"],\n  \"enabled\": true\n}", mode: "format", indent: "2", sortKeys: "" },
    expect: ["✅ No hay errores", "Claves: 4"],
    note: "Ejemplo: objeto JSON válido formado por cuatro claves."
  },
  invalid: { values: { text: "", mode: "format", indent: "2", sortKeys: "" } },
  related: ["html-checker", "bracket-checker", "js-checker", "python-checker", "error-explainer"]
};

const LIMIT = 200000;
const CONTEXT = 3;
const VERDICT_OK = "✅ No hay errores";
const VERDICT_ERR = "❌ Se encontró 1 error";
const INDENTS = { "2": "  ", "4": "    ", tab: "\t" };
const ROOT_TYPES = { object: "objeto", array: "arreglo", string: "texto", number: "número", boolean: "valor booleano", null: "nulo (null)" };
const ESCAPES = new Map([["\"", "\""], ["\\", "\\"], ["/", "/"], ["b", "\b"], ["f", "\f"], ["n", "\n"], ["r", "\r"], ["t", "\t"]]);
const VALUE_START = /[-0-9"{\[a-zA-Z_$]/;
const LITERAL_HINTS = new Map([
  ["True", ["El valor «True» no es válido en JSON; debe escribirse en minúsculas.", "Escríbelo «true» en minúsculas."]],
  ["False", ["El valor «False» no es válido en JSON; debe escribirse en minúsculas.", "Escríbelo «false» en minúsculas."]],
  ["None", ["El valor «None» es de Python y no es un valor JSON.", "Escríbelo «null» en minúsculas."]],
  ["undefined", ["El valor «undefined» es de JavaScript y no es un valor JSON.", "Escríbelo «null»."]],
  ["NaN", ["El valor «NaN» no está permitido en JSON.", "Usa «null», o escribe el valor como texto entre comillas."]],
  ["Infinity", ["El valor «Infinity» no está permitido en JSON.", "Usa «null», o escribe el valor como texto entre comillas."]]
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
  return `Línea ${l.line} (columna ${l.col})`;
}

const digit = (c) => c !== undefined && c >= "0" && c <= "9";
const isLetter = (c) => c !== undefined && /[A-Za-z_$]/.test(c);

function wordEnd(s, i) {
  let k = i;
  while (k < s.length && /[A-Za-z0-9_$]/.test(s[k])) k++;
  return k;
}

function unclosed(s, open, ch, close) {
  fault(s.length, 0, `«${ch}» abierto en ${where(s, open)} no se cerró antes del final del archivo.`, `Añade «${close}» en el lugar adecuado para cerrarlo.`);
}

function skipSpace(st) {
  const s = st.s;
  while (s[st.i] === " " || s[st.i] === "\t" || s[st.i] === "\n") st.i++;
  if (s[st.i] === "/" && s[st.i + 1] === "/") {
    const end = s.indexOf("\n", st.i);
    fault(st.i, (end < 0 ? s.length : end) - st.i, "JSON no admite comentarios; este comentario empieza aquí.", "Elimina el comentario por completo; los archivos JSON no admiten ningún comentario.");
  }
  if (s[st.i] === "/" && s[st.i + 1] === "*") {
    const end = s.indexOf("*/", st.i + 2);
    fault(st.i, end < 0 ? s.length - st.i : end + 2 - st.i, "JSON no admite comentarios; este comentario de varias líneas empieza aquí.", "Elimina el comentario por completo; los archivos JSON no admiten ningún comentario.");
  }
}

function parseString(st) {
  const s = st.s, start = st.i;
  let i = start + 1, value = "";
  for (;;) {
    const c = s[i];
    if (c === undefined || c === "\n") fault(start, 1, "No se cerró la comilla doble con la que empieza el texto.", "Añade \" al final del texto, y no continúes el texto en otra línea.");
    if (c === "\"") {
      st.i = i + 1;
      return { type: "string", value, raw: s.slice(start, i + 1) };
    }
    if (c === "\\") {
      const e = s[i + 1];
      if (e === undefined || e === "\n") fault(start, 1, "No se cerró la comilla doble con la que empieza el texto.", "Añade \" al final del texto, y no continúes el texto en otra línea.");
      if (e === "u") {
        const hex = s.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) fault(i, 2, "La secuencia de escape \\u debe ir seguida de cuatro dígitos hexadecimales (0-9 o A-F).", "Ejemplo correcto: \\u00e9 representa la letra é.");
        value += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      }
      if (!ESCAPES.has(e)) fault(i, 2, `La secuencia de escape «\\${e}» no es válida en JSON.`, "Los caracteres permitidos después de la barra invertida \\ son: \" \\ / b f n r t u.");
      value += ESCAPES.get(e);
      i += 2;
      continue;
    }
    if (c < " ") fault(i, 1, "Carácter de control no permitido dentro del texto (como Tab o un carácter invisible).", "Reemplázalo por una secuencia de escape como \\t, o elimínalo.");
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
      fault(start, k - start, "En JSON, un número no puede empezar con un cero seguido de otro dígito.", "Elimina los ceros sobrantes al inicio del número; por ejemplo, 01 pasa a ser 1.");
    }
  } else if (digit(s[i])) {
    while (digit(s[i])) i++;
  } else {
    fault(start, 1, "El signo «-» debe ir seguido de un número.", "Escribe el número después de «-», por ejemplo -5, o elimina el signo si es un error.");
  }
  if (s[i] === ".") {
    i++;
    if (!digit(s[i])) fault(i - 1, 1, "El punto decimal debe ir seguido de un número.", "Escribe un número después del punto, por ejemplo 1.5, o elimina el punto.");
    while (digit(s[i])) i++;
  }
  if (s[i] === "e" || s[i] === "E") {
    i++;
    if (s[i] === "+" || s[i] === "-") i++;
    if (!digit(s[i])) fault(start, i - start, "El exponente del número científico debe ir seguido de un número.", "Ejemplo correcto: 1e5 o 2.5E-3.");
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
  fault(start, w.length, `La palabra «${w}» no es un valor JSON válido.`, "Valores permitidos: texto entre \"\", número, true, false o null.");
}

function parseKey(st) {
  const s = st.s, c = s[st.i];
  if (c === "\"") return parseString(st);
  if (c === "}") fault(st.i, 1, "Coma sobrante antes de «}».", "Elimina la última coma antes de la llave «}».");
  if (c === "'") fault(st.i, 1, "El nombre de la clave debe ir entre comillas dobles, no simples.", "Cambia ' por \" alrededor del nombre de la clave.");
  if (isLetter(c)) {
    const w = s.slice(st.i, wordEnd(s, st.i));
    fault(st.i, w.length, `El nombre de la clave «${w}» no tiene comillas.`, `Pon el nombre entre comillas: "${w}".`);
  }
  fault(st.i, 1, `El nombre de la clave debe ser un texto entre comillas dobles, pero encontré «${c}».`, "Escribe el nombre de la clave entre comillas dobles.");
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
    if (s[st.i] !== ":") fault(st.i, 1, `Esperaba dos puntos «:» después del nombre de la clave, pero encontré «${s[st.i]}».`, "Pon «:» entre el nombre de la clave y el valor, por ejemplo: \"name\": \"value\".");
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
    if (d === "]") fault(st.i, 1, `Encontré «]» cuando se esperaba «}» para cerrar la «{» abierta en ${where(s, open)}.`, "Si aquí termina el objeto, cambia «]» por «}»; si no, revisa los corchetes.");
    if (VALUE_START.test(d)) fault(st.i, 1, "Esperaba una coma «,» entre los miembros del objeto, pero empezó uno nuevo directamente.", "Añade una coma «,» después del valor anterior.");
    fault(st.i, 1, `Esperaba «,» o «}», pero encontré «${d}».`, "Revisa las comas y los corchetes alrededor de esta posición.");
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
    if (s[st.i] === "]") fault(st.i, 1, "Coma sobrante antes de «]».", "Elimina la última coma antes del corchete «]».");
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
    if (d === "}") fault(st.i, 1, `Encontré «}» cuando se esperaba «]» para cerrar el «[» abierto en ${where(s, open)}.`, "Si aquí termina el arreglo, cambia «}» por «]»; si no, revisa los corchetes.");
    if (VALUE_START.test(d)) fault(st.i, 1, "Esperaba una coma «,» entre los elementos del arreglo, pero empezó uno nuevo directamente.", "Añade una coma «,» entre los dos elementos.");
    fault(st.i, 1, `Esperaba «,» o «]», pero encontré «${d}».`, "Revisa las comas y los corchetes alrededor de esta posición.");
  }
}

function parseValue(st) {
  skipSpace(st);
  const s = st.s, c = s[st.i];
  if (c === undefined) fault(st.i, 0, "El archivo terminó cuando se esperaba un valor aquí.", "Completa el valor que falta, o elimina la coma o los dos puntos anteriores.");
  if (c === "{") return parseObject(st);
  if (c === "[") return parseArray(st);
  if (c === "\"") return parseString(st);
  if (c === "'") fault(st.i, 1, "Los textos en JSON se escriben con comillas dobles \", y la comilla simple ' no está permitida.", "Cambia ' por \" al inicio y al final del texto.");
  if (c === "-" || digit(c)) return parseNumber(st);
  if (isLetter(c)) return parseWord(st);
  fault(st.i, 1, `Esperaba un valor aquí, pero encontré «${c}».`, "Valores permitidos: texto entre \"\", número, true, false, null, objeto {} o arreglo [].");
}

export function parseJson(src) {
  const st = { s: src, i: 0 };
  try {
    const tree = parseValue(st);
    skipSpace(st);
    if (st.i < src.length) {
      const c = src[st.i];
      if (c === "]" || c === "}") fault(st.i, 1, `El corchete de cierre «${c}» sobra y no tiene apertura correspondiente.`, "Elimínalo, o comprueba que cada apertura tenga su cierre correspondiente.");
      fault(st.i, 1, "Hay contenido sobrante después del valor principal.", "El archivo JSON debe contener un solo valor; pon los elementos dentro de un arreglo [ ] o un objeto { }.");
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
  const at = `Línea ${problem.line}, columna ${problem.col}`;
  return {
    results: [
      { label: "Veredicto", value: VERDICT_ERR },
      { label: "Ubicación del error", value: at },
      { label: "Tamaño antes", value: `${length} caracteres` }
    ],
    steps: [`Ve a ${at}.`, problem.suggestion],
    blocks: [
      { type: "table", wrap: true, head: ["Línea", "Columna", "Problema", "Cómo corregirlo"], rows: [[String(problem.line), String(problem.col), problem.message, problem.suggestion]] },
      { type: "html", html: snippet(src, [problem]) }
    ],
    copy: `${VERDICT_ERR}
${at}: ${problem.message}
Cómo corregirlo: ${problem.suggestion}`
  };
}

export function solve(input) {
  const raw = input.text;
  if (isBlank(raw)) fail("Introduce el texto JSON que quieres validar.", "text");
  const text = String(raw);
  if (text.length > LIMIT) fail("El texto tiene más de 200000 caracteres; redúcelo y vuelve a validarlo.", "text");
  const mode = choice(input, "mode", "Modo", ["format", "minify", "validate"], "format");
  const indent = choice(input, "indent", "Sangría", ["2", "4", "tab"], "2");
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
    { label: "Veredicto", value: VERDICT_OK },
    { label: "Tipo del valor raíz", value: rootLabel },
    { label: "Número de claves", value: String(acc.keys) },
    { label: "Número de valores", value: String(acc.values) },
    { label: "Profundidad máxima", value: String(acc.maxDepth) },
    { label: "Tamaño antes", value: `${text.length} caracteres` }
  ];
  const blocks = [];
  let step = "No se pidió formato, así que solo validé.";
  if (output) {
    results.push({ label: "Tamaño después", value: `${output.length} caracteres` });
    blocks.push({ type: "note", text: mode === "minify" ? "Resultado compactado en una sola línea:" : "Resultado tras el formato:" });
    blocks.push({ type: "html", html: `<pre class="code" dir="ltr"><code>${esc(output)}</code></pre>` });
    step = mode === "minify" ? "Eliminé los espacios y las líneas vacías fuera de los textos." : "Volví a escribir el archivo con sangría en cada nivel interno.";
  }
  const summary = `${VERDICT_OK}. Tipo del valor raíz: ${rootLabel}, claves: ${acc.keys}, valores: ${acc.values}, profundidad máxima: ${acc.maxDepth}, tamaño: ${text.length} caracteres`;
  return {
    results,
    steps: ["Leí el texto y analicé su estructura carácter por carácter según las reglas de JSON.", "Comprobé que las claves estén entre comillas dobles y que las comas y los corchetes estén equilibrados.", step],
    blocks,
    copy: output ? `${summary}\n${output}` : summary
  };
}
