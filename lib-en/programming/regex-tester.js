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
  d: "any digit from 0 to 9",
  D: "any character that is not a digit",
  w: "any Latin letter, digit, or underscore _",
  W: "any character that is not a Latin letter, digit, or _",
  s: "any whitespace character (space, tab, or newline)",
  S: "any character that is not whitespace",
  b: "word boundary: a position that separates a word character from a non-word character (consumes no character)",
  B: "not a word boundary: a position inside or outside a word (consumes no character)",
  n: "Newline (LF)",
  r: "Carriage return (CR)",
  t: "Tab",
  f: "Form feed",
  v: "Vertical tab"
};

const FLAG_INFO = {
  d: "adds the start and end positions of each group (indices)",
  g: "searches for all matches instead of only the first match",
  i: "ignores the difference between uppercase and lowercase letters",
  m: "makes ^ and $ match the start and end of each line",
  s: "makes the dot . also match a newline (dotAll)",
  u: "treats the pattern as full Unicode code points and supports \\p{...}",
  y: "sticky: the match starts exactly at lastIndex without skipping",
  v: "a newer version of u with support for advanced character sets"
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
    if (!FLAG_SET.includes(ch)) fail(`The flag «${ch}» is not supported. Allowed flags: dgimsuyv`, "flags");
    if (seen.has(ch)) fail(`The flag «${ch}» is repeated.`, "flags");
    seen.add(ch);
  }
  try {
    new RegExp("", raw);
  } catch (e) {
    fail(`The set of flags is invalid in JavaScript: ${e.message}`, "flags");
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
  if (pattern.length > MAX_CHARS) fail(`The pattern is longer than ${MAX_CHARS} characters.`, "pattern");
  if (text.length > MAX_CHARS) fail(`The text is longer than ${MAX_CHARS} characters.`, "text");
  let re;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    fail(`Invalid pattern: ${e.message}`, "pattern");
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
  if (d === undefined) return "Backslash at the end of the pattern";
  if (d === "0") return "NUL character";
  if (/[1-9]/.test(d)) return `Returns the text of group number ${tok.slice(1)}`;
  if (ESCAPES[d] !== undefined) return ESCAPES[d];
  if (d === "k") return `Returns the text of the named group «${tok.slice(3, -1)}»`;
  if (d === "x") return `The character with hexadecimal code ${tok.slice(2)}`;
  if (d === "u") return `The character with Unicode code ${tok.slice(2)}`;
  if (d === "c") return `Control character with the key Ctrl+${tok.slice(2)}`;
  if (d === "p") return `Any character that belongs to the category ${tok.slice(2, -1)}`;
  if (d === "P") return `Any character that does not belong to the category ${tok.slice(2, -1)}`;
  return `The character «${d}» literally (escaping its special meaning)`;
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
    if (pattern[i + len] === "?") add(len + 1, `${desc}, lazy (stops at the smallest possible number)`);
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
      add(end - i, `${neg ? "any character that is not one of" : "any one character from"} the group [${body}]`);
    } else if (c === "(") {
      if (pattern.startsWith("(?:", i)) add(3, "non-capturing group: groups elements without saving their text");
      else if (pattern.startsWith("(?<=", i)) add(4, "positive lookbehind: checks whether the text inside the group precedes the position, without consuming characters");
      else if (pattern.startsWith("(?<!", i)) add(4, "negative lookbehind: checks whether the text inside the group does not precede the position, without consuming characters");
      else if (pattern.startsWith("(?=", i)) add(3, "positive lookahead: checks whether the text inside the group follows the position, without consuming characters");
      else if (pattern.startsWith("(?!", i)) add(3, "negative lookahead: checks whether the text inside the group does not follow the position, without consuming characters");
      else if (pattern.startsWith("(?<", i)) {
        const end = pattern.indexOf(">", i) + 1;
        group += 1;
        add(end - i, `named capture group «${pattern.slice(i + 3, end - 1)}» (number ${group})`);
      } else {
        group += 1;
        add(1, `capture group number ${group}`);
      }
    } else if (c === ")") {
      add(1, "end of group");
    } else if (c === "*") {
      quant(1, "zero or more times");
    } else if (c === "+") {
      quant(1, "one or more times");
    } else if (c === "?") {
      quant(1, "zero or one time (optional)");
    } else if (c === "{" && quantAt(pattern, i)) {
      const m = quantAt(pattern, i);
      const desc = m[2] === undefined ? `exactly ${m[1]} times` : m[3] === "" ? `${m[1]} times or more` : `between ${m[1]} and ${m[3]} times`;
      quant(m[0].length, desc);
    } else if (c === "^") {
      add(1, "start of text (or start of line with the m flag)");
    } else if (c === "$") {
      add(1, "end of text (or end of line with the m flag)");
    } else if (c === ".") {
      add(1, "any single character except a newline (included with the s flag)");
    } else if (c === "|") {
      add(1, "alternation: one of the two sides matches");
    } else {
      const ch = String.fromCodePoint(pattern.codePointAt(i));
      add(ch.length, `the character «${ch}» literally`);
    }
  }
  return rows;
}

function flagRows(flags) {
  return [...flags].filter((f) => FLAG_INFO[f]).map((f) => [f, FLAG_INFO[f]]);
}

function valueText(v) {
  return v === undefined ? "no match" : `"${show(v)}"`;
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
  description: "Test a regular expression (Regex) in JavaScript syntax on a text: show the number of matches and their details and groups, highlight them in the text, explain each part of the pattern and the meaning of its flags, and replace the matches when needed.",
  keywords: ["regex", "regular expression", "regex", "regular expression", "regex test", "replace", "groups", "lookahead", "lookbehind"],
  formulas: [{ label: "Form of a regular expression", tex: "/\\text{pattern}/\\text{flags}" }],
  inputs: [
    { id: "pattern", label: "Pattern", type: "text", wide: true, default: "\\d+", placeholder: "\\d+", help: "Write the pattern without /, or write the full form such as /abc/gi and the flags will be taken from it." },
    { id: "flags", label: "Flags", type: "text", default: "g", help: "From the characters dgimsuyv, each flag only once." },
    { id: "text", label: "Text", type: "textarea", rows: 6, wide: true, default: "a1b22c333" },
    { id: "replace", label: "Replacement text (optional)", type: "text", default: "", help: "Leave it empty if you do not want a replacement." }
  ],
  example: { values: { pattern: "\\d+", flags: "g", text: "a1b22c333", replace: "#" }, expect: ["Number of matches: 3"], note: "Example: extract the numbers from a mixed text, then replace them with the symbol #." },
  invalid: { values: { pattern: "(", flags: "g", text: "abc", replace: "" } },
  related: ["js-checker", "json-formatter", "cron-explainer", "text-encoding"]
};

export function solve(input) {
  const a = analyze(input);
  const count = a.matches.length;
  const first = a.matches[0];
  const countText = a.truncated ? `${count} (first ${MAX_MATCHES} only)` : String(count);
  const blocks = [];
  if (count === 0) blocks.push({ type: "note", text: "No matches for this pattern in the text.", tone: "warn" });
  if (a.truncated) blocks.push({ type: "note", text: `Only the first ${MAX_MATCHES} matches are shown.`, tone: "warn" });
  if (count > 0) {
    blocks.push({
      type: "table",
      caption: "Matches",
      head: ["#", "Matched text", "Position", "Length", "Groups"],
      rows: a.matches.map((m, k) => [k + 1, `"${show(m.text)}"`, m.index, m.text.length, groupsText(m)]),
      ltr: true
    });
  }
  blocks.push({ type: "note", text: "Text with matches highlighted:" });
  blocks.push({ type: "html", html: highlight(a.text, a.matches) });
  if (a.replaced !== null) {
    blocks.push({ type: "note", text: "Text after replacement:" });
    blocks.push({ type: "html", html: codeBlock(escapeHtml(a.replaced)) });
  }
  if (a.pattern === "") blocks.push({ type: "note", text: "Empty pattern: matches every position in the text." });
  else if (a.pattern.length > EXPLAIN_LIMIT) blocks.push({ type: "note", text: `The pattern is longer than ${EXPLAIN_LIMIT} characters, so its explanation is not shown in detail.` });
  else blocks.push({ type: "table", wrap: true, caption: "Pattern explanation", head: ["Symbol", "Meaning"], rows: explain(a.pattern), ltr: true });
  const fr = flagRows(a.flags);
  if (fr.length) blocks.push({ type: "table", caption: "Flags", head: ["Flag", "Meaning"], rows: fr, ltr: true });
  else blocks.push({ type: "note", text: "No flags: only the first match is shown and letter case remains significant." });
  const results = [
    { label: "Number of matches", value: countText },
    { label: "First match", value: first ? `"${show(first.text)}" at position ${first.index}` : "none" }
  ];
  const steps = [
    `Pattern used: /${show(a.pattern)}/${a.flags}`,
    a.flags.includes("g") ? "Flag g enabled: the search goes through the whole text and collects all matches in sequence." : "Flag g not enabled: only the first match is shown.",
    `Number of matches found: ${countText}.`
  ];
  if (a.replaced !== null) steps.push(`The replacement with the text «${show(a.replace)}» was applied; the replacement supports group numbers and names as in JavaScript.`);
  const copy = `Number of matches: ${countText}` + (first ? `, first match: "${show(first.text)}" at position ${first.index}` : ", no matches");
  return { results, steps, copy, blocks };
}
