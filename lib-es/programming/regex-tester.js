import { fail } from "../core/validate.js";

const MAX_CHARS = 200000;
const MAX_MATCHES = 500;
const EXPLAIN_LIMIT = 2000;
const LITERAL = /^\/([\s\S]*)\/([A-Za-z]*)$/;
const QUANT = /\{(\d+)(?:(,)(\d*))?\}/y;
const HEX2 = /[0-9a-fA-F]{2}/y;
const HEX4 = /[0-9a-fA-F]{4}/y;
const FLAG_SET = "dgimsuyv";

const ESCAPES = {
  d: "Cualquier dígito del 0 al 9",
  D: "Cualquier carácter que no sea dígito",
  w: "Cualquier letra latina, dígito o guion bajo _",
  W: "Cualquier carácter que no sea letra latina, dígito ni _",
  s: "Cualquier espacio en blanco (espacio, tabulación o salto de línea)",
  S: "Cualquier carácter que no sea espacio en blanco",
  b: "Límite de palabra: posición que separa un carácter de palabra de uno que no lo es (no consume caracteres)",
  B: "No es límite de palabra: posición dentro o fuera de una palabra (no consume caracteres)",
  n: "Salto de línea (LF)",
  r: "Retorno de carro (CR)",
  t: "Tabulación (Tab)",
  f: "Avance de página (Form feed)",
  v: "Tabulación vertical (Vertical tab)"
};

const FLAG_INFO = {
  d: "Añade las posiciones de inicio y fin de cada grupo (indices)",
  g: "Busca todas las coincidencias en lugar de solo la primera",
  i: "Ignora la diferencia entre mayúsculas y minúsculas",
  m: "Hace que ^ y $ coincidan con el inicio y el final de cada línea",
  s: "Hace que el punto . coincida también con los saltos de línea (dotAll)",
  u: "Trata el patrón con códigos Unicode completos y admite \\p{...}",
  y: "Pegajosa (sticky): la coincidencia empieza exactamente en lastIndex, sin saltar posiciones",
  v: "Versión más reciente de u, con soporte para conjuntos de caracteres avanzados"
};

function show(s) {
  const t = String(s).replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
  return t.split("$").length > 2 ? t.replace(/\$/g, "﹩") : t;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function codeBlock(inner) {
  return `<pre class="code" dir="ltr"><code>${inner}</code></pre>`;
}

function readFlags(raw) {
  const seen = new Set();
  for (const ch of raw) {
    if (!FLAG_SET.includes(ch)) fail(`La bandera «${ch}» no es compatible. Banderas permitidas: dgimsuyv`, "flags");
    if (seen.has(ch)) fail(`La bandera «${ch}» está repetida.`, "flags");
    seen.add(ch);
  }
  try {
    new RegExp("", raw);
  } catch (e) {
    fail(`Conjunto de banderas no válido en JavaScript: ${e.message}`, "flags");
  }
  return raw;
}

function nextIndex(text, i, unicode) {
  if (!unicode) return i + 1;
  const cp = text.codePointAt(i);
  return i + (cp !== undefined && cp > 0xffff ? 2 : 1);
}

function toMatch(m) {
  return {
    index: m.index,
    text: m[0],
    groups: m.slice(1),
    named: m.groups ? { ...m.groups } : null
  };
}

export function findMatches(re, text, limit = MAX_MATCHES) {
  const loop = re.global || re.sticky;
  const list = [];
  let truncated = false;
  re.lastIndex = 0;
  for (;;) {
    const m = re.exec(text);
    if (m === null) break;
    if (list.length === limit) {
      truncated = true;
      break;
    }
    list.push(toMatch(m));
    if (!loop) break;
    if (m[0] === "") re.lastIndex = nextIndex(text, re.lastIndex, re.unicode || re.unicodeSets);
  }
  re.lastIndex = 0;
  return { list, truncated };
}

export function analyze(input) {
  const raw = String(input.pattern ?? "");
  const lit = raw.trim().match(LITERAL);
  const pattern = lit ? lit[1] : raw;
  const flags = readFlags(lit ? lit[2] : String(input.flags ?? "").trim());
  const text = String(input.text ?? "");
  const replace = String(input.replace ?? "");
  if (pattern.length > MAX_CHARS) fail(`El patrón tiene más de ${MAX_CHARS} caracteres.`, "pattern");
  if (text.length > MAX_CHARS) fail(`El texto tiene más de ${MAX_CHARS} caracteres.`, "text");
  let re;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    fail(`Patrón de expresión no válido: ${e.message}`, "pattern");
  }
  const { list, truncated } = findMatches(re, text);
  let replaced = null;
  if (replace !== "") {
    re.lastIndex = 0;
    replaced = text.replace(re, replace);
  }
  return { pattern, flags, text, replace, matches: list, truncated, replaced };
}

function sticky(re, s, i) {
  re.lastIndex = i;
  return re.test(s);
}

function quantAt(p, i) {
  QUANT.lastIndex = i;
  return QUANT.exec(p);
}

function closeAt(p, ch, i) {
  const k = p.indexOf(ch, i);
  return k < 0 ? i + 2 : k + 1;
}

function escapeEnd(p, i) {
  const d = p[i + 1];
  if (d === undefined) return i + 1;
  if (d === "x") return sticky(HEX2, p, i + 2) ? i + 4 : i + 2;
  if (d === "u") {
    if (p[i + 2] === "{") return closeAt(p, "}", i);
    return sticky(HEX4, p, i + 2) ? i + 6 : i + 2;
  }
  if (d === "c") return i + 3;
  if ((d === "p" || d === "P") && p[i + 2] === "{") return closeAt(p, "}", i);
  if (d === "k" && p[i + 2] === "<") return closeAt(p, ">", i);
  if (/[1-9]/.test(d)) {
    let j = i + 1;
    while (j < p.length && /\d/.test(p[j])) j++;
    return j;
  }
  return i + 2;
}

function escapeDesc(tok) {
  const d = tok[1];
  if (d === undefined) return "Barra invertida al final del patrón";
  if (d === "0") return "Carácter NUL";
  if (/[1-9]/.test(d)) return `Devuelve el texto del grupo número ${tok.slice(1)}`;
  if (ESCAPES[d] !== undefined) return ESCAPES[d];
  if (d === "k") return `Devuelve el texto del grupo con nombre «${tok.slice(3, -1)}»`;
  if (d === "x") return `Carácter con código hexadecimal ${tok.slice(2)}`;
  if (d === "u") return `Carácter con código Unicode ${tok.slice(2)}`;
  if (d === "c") return `Carácter de control con la tecla Ctrl+${tok.slice(2)}`;
  if (d === "p") return `Cualquier carácter de la categoría ${tok.slice(2, -1)}`;
  if (d === "P") return `Cualquier carácter que no pertenezca a la categoría ${tok.slice(2, -1)}`;
  return `El carácter «${d}» literal (sin significado especial)`;
}

function classEnd(p, i) {
  let j = p[i + 1] === "^" ? i + 2 : i + 1;
  while (j < p.length && p[j] !== "]") j += p[j] === "\\" ? 2 : 1;
  return Math.min(j + 1, p.length);
}

export function explain(pattern) {
  const rows = [];
  const n = pattern.length;
  let i = 0;
  let group = 0;
  const add = (len, desc) => {
    rows.push([show(pattern.slice(i, i + len)), show(desc)]);
    i += len;
  };
  const quant = (len, desc) => {
    if (pattern[i + len] === "?") add(len + 1, `${desc}, perezosa (se detiene en el menor número posible)`);
    else add(len, desc);
  };
  while (i < n) {
    const c = pattern[i];
    if (c === "\\") {
      const end = escapeEnd(pattern, i);
      add(end - i, escapeDesc(pattern.slice(i, end)));
    } else if (c === "[") {
      const end = classEnd(pattern, i);
      const neg = pattern[i + 1] === "^";
      const body = pattern.slice(i + (neg ? 2 : 1), end - 1);
      add(end - i, `${neg ? "Cualquier carácter que no esté en" : "Un carácter de"} [${body}]`);
    } else if (c === "(") {
      if (pattern.startsWith("(?:", i)) add(3, "Grupo sin captura: agrupa los elementos sin guardar su texto");
      else if (pattern.startsWith("(?<=", i)) add(4, "Aserción retrospectiva positiva: comprueba si el texto del grupo precede a la posición, sin consumir caracteres");
      else if (pattern.startsWith("(?<!", i)) add(4, "Aserción retrospectiva negativa: comprueba si el texto del grupo no precede a la posición, sin consumir caracteres");
      else if (pattern.startsWith("(?=", i)) add(3, "Aserción anticipada positiva: comprueba si el texto del grupo sigue a la posición, sin consumir caracteres");
      else if (pattern.startsWith("(?!", i)) add(3, "Aserción anticipada negativa: comprueba si el texto del grupo no sigue a la posición, sin consumir caracteres");
      else if (pattern.startsWith("(?<", i)) {
        const end = pattern.indexOf(">", i) + 1;
        group += 1;
        add(end - i, `Grupo de captura con nombre «${pattern.slice(i + 3, end - 1)}» (número ${group})`);
      } else {
        group += 1;
        add(1, `Grupo de captura número ${group}`);
      }
    } else if (c === ")") {
      add(1, "Fin del grupo");
    } else if (c === "*") {
      quant(1, "Cero o más veces");
    } else if (c === "+") {
      quant(1, "Una o más veces");
    } else if (c === "?") {
      quant(1, "Cero o una vez (opcional)");
    } else if (c === "{" && quantAt(pattern, i)) {
      const m = quantAt(pattern, i);
      const desc = m[2] === undefined ? `Exactamente ${m[1]} veces` : m[3] === "" ? `Al menos ${m[1]} veces` : `Entre ${m[1]} y ${m[3]} veces`;
      quant(m[0].length, desc);
    } else if (c === "^") {
      add(1, "Inicio del texto (o inicio de línea con la bandera m)");
    } else if (c === "$") {
      add(1, "Final del texto (o final de línea con la bandera m)");
    } else if (c === ".") {
      add(1, "Cualquier carácter excepto salto de línea (salvo con la bandera s)");
    } else if (c === "|") {
      add(1, "Alternativa: coincide uno de los dos lados");
    } else {
      const ch = String.fromCodePoint(pattern.codePointAt(i));
      add(ch.length, `El carácter «${ch}» literal`);
    }
  }
  return rows;
}

function flagRows(flags) {
  return [...flags].filter((f) => FLAG_INFO[f]).map((f) => [f, FLAG_INFO[f]]);
}

function valueText(v) {
  return v === undefined ? "No coincide" : `"${show(v)}"`;
}

function groupsText(m) {
  const parts = m.groups.map((v, i) => `${i + 1}: ${valueText(v)}`);
  if (m.named) for (const [k, v] of Object.entries(m.named)) parts.push(`${k}: ${valueText(v)}`);
  return parts.length ? parts.join("، ") : "—";
}

function highlight(text, list) {
  let out = "";
  let pos = 0;
  for (const m of list) {
    if (m.text === "") continue;
    out += escapeHtml(text.slice(pos, m.index)) + `<span class="mark">${escapeHtml(m.text)}</span>`;
    pos = m.index + m.text.length;
  }
  return codeBlock(out + escapeHtml(text.slice(pos)));
}

export const meta = {
  description: "Prueba una expresión regular (Regex) con sintaxis de JavaScript sobre un texto: muestra el número de coincidencias, sus detalles y sus grupos, resáltalas en el texto, explica cada parte del patrón y el significado de sus banderas, y reemplaza las coincidencias si lo necesitas.",
  keywords: ["regex", "regular expression", "expresión regular", "expresión regular", "probar regex", "reemplazo", "grupos", "lookahead", "lookbehind"],
  formulas: [{ label: "Forma de la expresión regular", tex: "/\\text{pattern}/\\text{flags}" }],
  inputs: [
    { id: "pattern", label: "Patrón (Pattern)", type: "text", wide: true, default: "\\d+", placeholder: "\\d+", help: "Escribe el patrón sin /, o escribe la forma completa, como /abc/gi, para tomar de ella las banderas." },
    { id: "flags", label: "Banderas (Flags)", type: "text", default: "g", help: "Caracteres de dgimsuyv; cada bandera solo una vez." },
    { id: "text", label: "Texto", type: "textarea", rows: 6, wide: true, default: "a1b22c333" },
    { id: "replace", label: "Reemplazo (opcional)", type: "text", default: "", help: "Déjalo vacío si no quieres reemplazar." }
  ],
  example: { values: { pattern: "\\d+", flags: "g", text: "a1b22c333", replace: "#" }, expect: ["Número de coincidencias: 3"], note: "Ejemplo: extraer los números de un texto mixto y reemplazarlos por el símbolo #." },
  invalid: { values: { pattern: "(", flags: "g", text: "abc", replace: "" } },
  related: ["js-checker", "json-formatter", "cron-explainer", "text-encoding"]
};

export function solve(input) {
  const a = analyze(input);
  const count = a.matches.length;
  const first = a.matches[0];
  const countText = a.truncated ? `${count} (solo las primeras ${MAX_MATCHES})` : String(count);
  const blocks = [];
  if (count === 0) blocks.push({ type: "note", text: "No hay coincidencias de este patrón en el texto.", tone: "warn" });
  if (a.truncated) blocks.push({ type: "note", text: `Se muestran solo las primeras ${MAX_MATCHES} coincidencias.`, tone: "warn" });
  if (count > 0) {
    blocks.push({
      type: "table",
      caption: "Coincidencias",
      head: ["#", "Texto coincidente", "Posición", "Longitud", "Grupos"],
      rows: a.matches.map((m, k) => [k + 1, `"${show(m.text)}"`, m.index, m.text.length, groupsText(m)]),
      ltr: true
    });
  }
  blocks.push({ type: "note", text: "Texto con las coincidencias resaltadas:" });
  blocks.push({ type: "html", html: highlight(a.text, a.matches) });
  if (a.replaced !== null) {
    blocks.push({ type: "note", text: "Texto tras el reemplazo:" });
    blocks.push({ type: "html", html: codeBlock(escapeHtml(a.replaced)) });
  }
  if (a.pattern === "") blocks.push({ type: "note", text: "Patrón vacío: coincide con cada posición del texto." });
  else if (a.pattern.length > EXPLAIN_LIMIT) blocks.push({ type: "note", text: `El patrón tiene más de ${EXPLAIN_LIMIT} caracteres, por eso no se muestra su explicación detallada.` });
  else blocks.push({ type: "table", wrap: true, caption: "Explicación del patrón", head: ["Símbolo", "Significado"], rows: explain(a.pattern), ltr: true });
  const fr = flagRows(a.flags);
  if (fr.length) blocks.push({ type: "table", caption: "Banderas", head: ["Bandera", "Significado"], rows: fr, ltr: true });
  else blocks.push({ type: "note", text: "Sin banderas: se muestra solo la primera coincidencia y se distingue entre mayúsculas y minúsculas." });
  const results = [
    { label: "Número de coincidencias", value: countText },
    { label: "Primera coincidencia", value: first ? `"${show(first.text)}" en la posición ${first.index}` : "Ninguna" }
  ];
  const steps = [
    `Patrón usado: /${show(a.pattern)}/${a.flags}`,
    a.flags.includes("g") ? "Bandera g activada: la búsqueda recorre todo el texto y reúne todas las coincidencias en orden." : "Bandera g desactivada: se muestra solo la primera coincidencia.",
    `Número de coincidencias encontradas: ${countText}.`
  ];
  if (a.replaced !== null) steps.push(`Se aplicó el reemplazo con el texto «${show(a.replace)}». El reemplazo admite números y nombres de grupos, como en JavaScript.`);
  const copy = `Número de coincidencias: ${countText}` + (first ? `, primera coincidencia: "${show(first.text)}" en la posición ${first.index}` : ", no hay coincidencias");
  return { results, steps, copy, blocks };
}
