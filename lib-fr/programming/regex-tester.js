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
  d: "n'importe quel chiffre de 0 à 9",
  D: "n'importe quel caractère qui n'est pas un chiffre",
  w: "n'importe quelle lettre latine, chiffre ou le tiret bas _",
  W: "n'importe quel caractère qui n'est ni une lettre latine, ni un chiffre, ni _",
  s: "n'importe quel caractère d'espacement (espace, tabulation ou saut de ligne)",
  S: "n'importe quel caractère qui n'est pas un espacement",
  b: "limite de mot : position qui sépare un caractère de mot d'un caractère qui n'en est pas un (ne consomme aucun caractère)",
  B: "ce n'est pas une limite de mot : position à l'intérieur ou à l'extérieur d'un mot (ne consomme aucun caractère)",
  n: "Saut de ligne (LF)",
  r: "Retour chariot (CR)",
  t: "Tabulation (Tab)",
  f: "Saut de page (Form feed)",
  v: "Tabulation verticale (Vertical tab)"
};

const FLAG_INFO = {
  d: "ajoute les positions de début et de fin de chaque groupe (indices)",
  g: "recherche toutes les correspondances au lieu de la première seulement",
  i: "ignore la différence entre majuscules et minuscules",
  m: "fait correspondre ^ et $ au début et à la fin de chaque ligne",
  s: "fait aussi correspondre le point . à un saut de ligne (dotAll)",
  u: "traite le motif avec les points de code Unicode complets et prend en charge \\p{...}",
  y: "collant (sticky) : la correspondance commence exactement à lastIndex, sans rien sauter",
  v: "version plus récente de u avec prise en charge des jeux de caractères avancés"
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
    if (!FLAG_SET.includes(ch)) fail(`L'indicateur «${ch}» n'est pas pris en charge. Indicateurs autorisés : dgimsuyv`, "flags");
    if (seen.has(ch)) fail(`L'indicateur «${ch}» est répété.`, "flags");
    seen.add(ch);
  }
  try {
    new RegExp("", raw);
  } catch (e) {
    fail(`L'ensemble des indicateurs n'est pas valide en JavaScript : ${e.message}`, "flags");
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
  if (pattern.length > MAX_CHARS) fail(`Le motif dépasse ${MAX_CHARS} caractères.`, "pattern");
  if (text.length > MAX_CHARS) fail(`Le texte dépasse ${MAX_CHARS} caractères.`, "text");
  let re;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    fail(`Expression de motif non valide : ${e.message}`, "pattern");
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
  if (d === undefined) return "Barre oblique inverse à la fin du motif";
  if (d === "0") return "Caractère NUL";
  if (/[1-9]/.test(d)) return `Renvoie le texte du groupe numéro ${tok.slice(1)}`;
  if (ESCAPES[d] !== undefined) return ESCAPES[d];
  if (d === "k") return `Renvoie le texte du groupe nommé «${tok.slice(3, -1)}»`;
  if (d === "x") return `Le caractère de code hexadécimal ${tok.slice(2)}`;
  if (d === "u") return `Le caractère de code Unicode ${tok.slice(2)}`;
  if (d === "c") return `Caractère de contrôle avec la touche Ctrl+${tok.slice(2)}`;
  if (d === "p") return `Tout caractère appartenant à la catégorie ${tok.slice(2, -1)}`;
  if (d === "P") return `Tout caractère n'appartenant pas à la catégorie ${tok.slice(2, -1)}`;
  return `Le caractère «${d}» littéralement (sans son sens spécial)`;
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
    if (pattern[i + len] === "?") add(len + 1, `${desc}, non gourmand (s'arrête au plus petit nombre possible)`);
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
      add(end - i, `${neg ? "n'importe quel caractère qui n'est pas parmi" : "un seul caractère parmi"} du groupe [${body}]`);
    } else if (c === "(") {
      if (pattern.startsWith("(?:", i)) add(3, "groupe sans capture : regroupe les éléments sans mémoriser leur texte");
      else if (pattern.startsWith("(?<=", i)) add(4, "assertion arrière positive : vérifie que le texte du groupe précède la position, sans consommer de caractères");
      else if (pattern.startsWith("(?<!", i)) add(4, "assertion arrière négative : vérifie que le texte du groupe ne précède pas la position, sans consommer de caractères");
      else if (pattern.startsWith("(?=", i)) add(3, "assertion avant positive : vérifie que le texte du groupe suit la position, sans consommer de caractères");
      else if (pattern.startsWith("(?!", i)) add(3, "assertion avant négative : vérifie que le texte du groupe ne suit pas la position, sans consommer de caractères");
      else if (pattern.startsWith("(?<", i)) {
        const end = pattern.indexOf(">", i) + 1;
        group += 1;
        add(end - i, `groupe de capture nommé «${pattern.slice(i + 3, end - 1)}» (numéro ${group})`);
      } else {
        group += 1;
        add(1, `groupe de capture numéro ${group}`);
      }
    } else if (c === ")") {
      add(1, "fin du groupe");
    } else if (c === "*") {
      quant(1, "zéro fois ou plus");
    } else if (c === "+") {
      quant(1, "une fois ou plus");
    } else if (c === "?") {
      quant(1, "zéro ou une fois (facultatif)");
    } else if (c === "{" && quantAt(pattern, i)) {
      const m = quantAt(pattern, i);
      const desc = m[2] === undefined ? `exactement ${m[1]} fois` : m[3] === "" ? `${m[1]} fois ou plus` : `entre ${m[1]} et ${m[3]} fois`;
      quant(m[0].length, desc);
    } else if (c === "^") {
      add(1, "début du texte (ou début de ligne avec l'indicateur m)");
    } else if (c === "$") {
      add(1, "fin du texte (ou fin de ligne avec l'indicateur m)");
    } else if (c === ".") {
      add(1, "n'importe quel caractère unique sauf un saut de ligne (inclus avec l'indicateur s)");
    } else if (c === "|") {
      add(1, "alternative : l'un des deux côtés correspond");
    } else {
      const ch = String.fromCodePoint(pattern.codePointAt(i));
      add(ch.length, `le caractère «${ch}» littéralement`);
    }
  }
  return rows;
}

function flagRows(flags) {
  return [...flags].filter((f) => FLAG_INFO[f]).map((f) => [f, FLAG_INFO[f]]);
}

function valueText(v) {
  return v === undefined ? "aucune correspondance" : `"${show(v)}"`;
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
  description: "Testez une expression régulière (Regex) en syntaxe JavaScript sur un texte : nombre de correspondances, détails et groupes, mise en évidence dans le texte, explication de chaque partie du motif et de ses indicateurs, et remplacement des correspondances si besoin.",
  keywords: ["regex", "regular expression", "expression régulière", "expression rationnelle", "test regex", "remplacement", "groupes", "lookahead", "lookbehind"],
  formulas: [{ label: "Forme d'une expression régulière", tex: "/\\text{pattern}/\\text{flags}" }],
  inputs: [
    { id: "pattern", label: "Motif (Pattern)", type: "text", wide: true, default: "\\d+", placeholder: "\\d+", help: "Écrivez le motif sans /, ou écrivez la forme complète comme /abc/gi : les indicateurs seront alors pris à partir de celle-ci." },
    { id: "flags", label: "Indicateurs (Flags)", type: "text", default: "g", help: "Parmi les caractères dgimsuyv, chaque indicateur une seule fois." },
    { id: "text", label: "Texte", type: "textarea", rows: 6, wide: true, default: "a1b22c333" },
    { id: "replace", label: "Texte de remplacement (facultatif)", type: "text", default: "", help: "Laissez-le vide si vous ne souhaitez pas de remplacement." }
  ],
  example: { values: { pattern: "\\d+", flags: "g", text: "a1b22c333", replace: "#" }, expect: ["Nombre de correspondances : 3"], note: "Exemple : extraire les chiffres d'un texte mixte, puis les remplacer par le symbole #." },
  invalid: { values: { pattern: "(", flags: "g", text: "abc", replace: "" } },
  related: ["js-checker", "json-formatter", "cron-explainer", "text-encoding"]
};

export function solve(input) {
  const a = analyze(input);
  const count = a.matches.length;
  const first = a.matches[0];
  const countText = a.truncated ? `${count} (seulement les ${MAX_MATCHES} premières)` : String(count);
  const blocks = [];
  if (count === 0) blocks.push({ type: "note", text: "Aucune correspondance pour ce motif dans le texte.", tone: "warn" });
  if (a.truncated) blocks.push({ type: "note", text: `Seules les ${MAX_MATCHES} premières correspondances sont affichées.`, tone: "warn" });
  if (count > 0) {
    blocks.push({
      type: "table",
      caption: "Correspondances",
      head: ["#", "Texte correspondant", "Position", "Longueur", "Groupes"],
      rows: a.matches.map((m, k) => [k + 1, `"${show(m.text)}"`, m.index, m.text.length, groupsText(m)]),
      ltr: true
    });
  }
  blocks.push({ type: "note", text: "Texte avec les correspondances en évidence :" });
  blocks.push({ type: "html", html: highlight(a.text, a.matches) });
  if (a.replaced !== null) {
    blocks.push({ type: "note", text: "Texte après remplacement :" });
    blocks.push({ type: "html", html: codeBlock(escapeHtml(a.replaced)) });
  }
  if (a.pattern === "") blocks.push({ type: "note", text: "Motif vide : correspond à chaque position du texte." });
  else if (a.pattern.length > EXPLAIN_LIMIT) blocks.push({ type: "note", text: `Le motif dépasse ${EXPLAIN_LIMIT} caractères, son explication n'est donc pas affichée en détail.` });
  else blocks.push({ type: "table", wrap: true, caption: "Explication du motif", head: ["Symbole", "Signification"], rows: explain(a.pattern), ltr: true });
  const fr = flagRows(a.flags);
  if (fr.length) blocks.push({ type: "table", caption: "Indicateurs", head: ["Indicateur", "Signification"], rows: fr, ltr: true });
  else blocks.push({ type: "note", text: "Sans indicateurs : seule la première correspondance est affichée et la casse reste significative." });
  const results = [
    { label: "Nombre de correspondances", value: countText },
    { label: "Première correspondance", value: first ? `"${show(first.text)}" à la position ${first.index}` : "aucune" }
  ];
  const steps = [
    `Motif utilisé : /${show(a.pattern)}/${a.flags}`,
    a.flags.includes("g") ? "Indicateur g activé : la recherche parcourt tout le texte et rassemble toutes les correspondances à la suite." : "Indicateur g non activé : seule la première correspondance est affichée.",
    `Nombre de correspondances trouvées : ${countText}.`
  ];
  if (a.replaced !== null) steps.push(`Le remplacement par le texte «${show(a.replace)}» a été appliqué ; le remplacement prend en charge les numéros et les noms de groupes comme en JavaScript.`);
  const copy = `Nombre de correspondances : ${countText}` + (first ? `, première correspondance : "${show(first.text)}" à la position ${first.index}` : ", aucune correspondance");
  return { results, steps, copy, blocks };
}
