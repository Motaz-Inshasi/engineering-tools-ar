import { fail, isBlank } from "../core/validate.js";

export const meta = {
  description: "Check HTML code for unclosed tags, wrong or extra closing tags, duplicate IDs and attributes, nested links, and warnings for images without alt text and paragraphs containing block elements.",
  keywords: ["HTML", "HTML checker", "HTML tags", "Check HTML", "HTML checker", "HTML validator", "Unclosed tag"],
  formulas: [{ label: "Every opening tag must be closed by a matching closing tag in reverse order, except void elements such as br and img", tex: "\\texttt{<div><p>} \\ldots \\texttt{</p></div>}" }],
  inputs: [
    { id: "text", label: "HTML code", type: "textarea", rows: 10, wide: true, default: "" }
  ],
  example: {
    values: { text: "<ul>\n  <li>First\n  <li>Second\n</ul>\n<img src=\"logo.png\">" },
    expect: ["✅ No errors", "Warnings: 1"],
    note: "Example: a list of <li> elements without a closing tag (this is allowed), and an image without an alt attribute shows a warning."
  },
  invalid: { values: { text: "" } },
  related: ["json-formatter", "bracket-checker", "js-checker", "python-checker", "error-explainer"]
};

const LIMIT = 200000;
const CONTEXT = 3;
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr", "keygen"]);
const OPTIONAL = new Set(["p", "li", "td", "th", "tr", "thead", "tbody", "tfoot", "option", "optgroup", "dt", "dd", "colgroup", "caption", "rp", "rt"]);
const BLOCK = new Set(["address", "article", "aside", "blockquote", "div", "dl", "fieldset", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "main", "nav", "ol", "p", "pre", "section", "table", "ul"]);
const RAW = new Set(["script", "style"]);
const SCOPES = {
  li: { self: ["li"], stop: ["ul", "ol", "menu"] },
  dt: { self: ["dt", "dd"], stop: ["dl"] },
  dd: { self: ["dt", "dd"], stop: ["dl"] },
  option: { self: ["option"], stop: ["select", "datalist", "optgroup"] },
  optgroup: { self: ["optgroup", "option"], stop: ["select"] },
  tr: { self: ["tr"], stop: ["table", "thead", "tbody", "tfoot"] },
  td: { self: ["td", "th"], stop: ["tr", "table"] },
  th: { self: ["td", "th"], stop: ["tr", "table"] },
  thead: { self: ["thead", "tbody", "tfoot"], stop: ["table"] },
  tbody: { self: ["thead", "tbody", "tfoot"], stop: ["table"] },
  tfoot: { self: ["thead", "tbody", "tfoot"], stop: ["table"] }
};
const CLOSE_RE = /<\/([A-Za-z][A-Za-z0-9:-]*)[^>]*>/y;

const isAlpha = (c) => c !== undefined && /[A-Za-z]/.test(c);

function makeLocator(src) {
  const starts = [0];
  for (let k = 0; k < src.length; k++) if (src[k] === "\n") starts.push(k + 1);
  return (pos) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, col: pos - starts[lo] + 1 };
  };
}

function tokenize(src, add) {
  const tokens = [];
  const n = src.length;
  let i = 0;
  while (i < n) {
    const lt = src.indexOf("<", i);
    if (lt < 0) break;
    i = lt;
    if (src.startsWith("<!--", i)) {
      const end = src.indexOf("-->", i + 4);
      if (end < 0) {
        add(i, 4, "error", "The comment <!-- is not closed with -->.", "Add --> at the end of the comment; an unclosed comment hides the rest of the page from the browser.");
        break;
      }
      tokens.push({ kind: "comment", pos: i });
      i = end + 3;
      continue;
    }
    const c1 = src[i + 1];
    if (c1 === "!" || c1 === "?") {
      const end = src.indexOf(">", i);
      const stop = end < 0 ? n : end + 1;
      tokens.push({ kind: "decl", pos: i, text: src.slice(i, stop) });
      i = stop;
      continue;
    }
    if (c1 === "/" && isAlpha(src[i + 2])) {
      CLOSE_RE.lastIndex = i;
      const m = CLOSE_RE.exec(src);
      if (!m) {
        add(i, 2, "error", "The closing tag is not closed with >.", "Add > at the end of the closing tag.");
        break;
      }
      tokens.push({ kind: "close", name: m[1], lname: m[1].toLowerCase(), pos: i, end: i + m[0].length });
      i += m[0].length;
      continue;
    }
    if (isAlpha(c1)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9:-]/.test(src[j])) j++;
      const name = src.slice(i + 1, j);
      const lname = name.toLowerCase();
      const attrs = [];
      let selfClose = false, closed = false, broken = false;
      while (j < n) {
        while (j < n && /\s/.test(src[j])) j++;
        if (j >= n) break;
        const ch = src[j];
        if (ch === ">") {
          closed = true;
          j++;
          break;
        }
        if (ch === "/" && src[j + 1] === ">") {
          selfClose = true;
          closed = true;
          j += 2;
          break;
        }
        if (ch === "/" || ch === "=") {
          j++;
          continue;
        }
        const start = j;
        while (j < n && !/[\s=>\/]/.test(src[j])) j++;
        const aname = src.slice(start, j);
        let k = j;
        while (k < n && /\s/.test(src[k])) k++;
        let value = null;
        if (src[k] === "=") {
          k++;
          while (k < n && /\s/.test(src[k])) k++;
          const q = src[k];
          if (q === "\"" || q === "'") {
            const close = src.indexOf(q, k + 1);
            if (close < 0) {
              add(k, 1, "error", `The value of attribute “${aname}” starts with ${q} and is not closed.`, `Add ${q} to close the value.`);
              broken = true;
              break;
            }
            value = src.slice(k + 1, close);
            j = close + 1;
          } else {
            const vs = k;
            while (k < n && !/[\s>]/.test(src[k])) k++;
            value = src.slice(vs, k);
            j = k;
            const bad = /["'<=`]/.exec(value);
            if (bad) add(vs, value.length, "error", `The value of attribute “${aname}” is not in quotes and contains “${bad[0]}”, so the browser will misread it.`, `Put the whole value between quotation marks, for example ${aname}="..."`);
          }
        }
        attrs.push({ name: aname, lname: aname.toLowerCase(), value, pos: start });
      }
      if (broken) break;
      if (!closed) {
        add(i, j - i || 1, "error", `The tag <${name} is not closed with >.`, "Add > at the end of the tag.");
        break;
      }
      tokens.push({ kind: "open", name, lname, attrs, selfClose, pos: i, end: j });
      i = j;
      if (RAW.has(lname) && !selfClose) {
        const re = new RegExp(`</${lname}`, "gi");
        re.lastIndex = i;
        const m = re.exec(src);
        i = m ? m.index : n;
      }
      continue;
    }
    i += 1;
  }
  return tokens;
}

function findScope(stack, rule) {
  for (let k = stack.length - 1; k >= 0; k--) {
    const n = stack[k].name;
    if (rule.stop.includes(n)) return -1;
    if (rule.self.includes(n)) return k;
  }
  return -1;
}

function analyze(src) {
  const issues = [];
  const add = (pos, len, sev, message, suggestion) => issues.push({ pos, len, sev, message, suggestion });
  const loc = makeLocator(src);
  const tokens = tokenize(src, add);
  const stack = [];
  const ids = new Map();
  let implicitP = 0;
  let htmlTok = null, hasDoctype = false, hasTitle = false;
  let opens = 0, closes = 0;
  const top = () => stack[stack.length - 1];

  const popTo = (k, reason) => {
    for (let m = k + 1; m < stack.length; m++) {
      const e = stack[m];
      if (!OPTIONAL.has(e.name)) add(e.pos, e.tag.length + 1, "error", `<${e.tag}> opened on line ${loc(e.pos).line} was not closed before ${reason} appeared.`, `Add </${e.tag}> before ${reason}.`);
    }
    stack.length = k;
  };

  const handleOpen = (t) => {
    opens++;
    const name = t.lname;
    for (const a of t.attrs) {
      if (a.lname === "id" && a.value) {
        if (ids.has(a.value)) add(a.pos, a.name.length, "error", `The ID “${a.value}” is duplicated; it was already used on line ${loc(ids.get(a.value)).line}.`, "Make the id value unique for each element on the page.");
        else ids.set(a.value, a.pos);
      }
    }
    const seen = new Set();
    for (const a of t.attrs) {
      if (seen.has(a.lname)) add(a.pos, a.name.length, "error", `The attribute “${a.name}” is duplicated in the same <${t.name}> tag.`, "Delete one of the duplicate attributes; the browser uses only one.");
      seen.add(a.lname);
    }
    if (name === "a" && stack.some((e) => e.name === "a")) add(t.pos, t.name.length + 1, "error", "An <a> link cannot be placed inside another <a> link.", "Close the first link before opening the second, or use an element other than <a>.");
    if (name === "html" && !htmlTok) htmlTok = t;
    if (name === "title") hasTitle = true;
    if (name === "img" && !t.attrs.some((a) => a.lname === "alt")) add(t.pos, t.end - t.pos, "warning", "The <img> image has no alt attribute, so a screen reader will not know what it shows.", "Add alt=\"short description of the image\", or alt=\"\" if it is decorative.");
    if (name === "p") {
      if (top() && top().name === "p") stack.pop();
    } else if (BLOCK.has(name) && top() && top().name === "p") {
      add(t.pos, t.name.length + 1, "warning", `The <${t.name}> element inside <p> automatically closes the paragraph, so the layout may differ from what you expect.`, `Close <p> before <${t.name}>, or use <div> instead of <p> if the paragraph contains block elements.`);
      stack.pop();
      implicitP++;
    }
    const rule = SCOPES[name];
    if (rule) {
      const k = findScope(stack, rule);
      if (k >= 0) popTo(k, `<${t.name}>`);
    }
    if (VOID.has(name) || t.selfClose) return;
    stack.push({ name, tag: t.name, pos: t.pos });
  };

  const handleClose = (t) => {
    closes++;
    const name = t.lname;
    const len = t.end - t.pos;
    if (VOID.has(name)) {
      add(t.pos, len, "error", `The closing tag </${t.name}> is not allowed, because <${t.name}> is a void element and does not need a closing tag.`, `Delete </${t.name}>; elements such as <br>, <img>, and <input> are written without a closing tag.`);
      return;
    }
    let k = -1;
    for (let m = stack.length - 1; m >= 0; m--) {
      if (stack[m].name === name) {
        k = m;
        break;
      }
    }
    if (k < 0) {
      if (name === "p" && implicitP > 0) {
        implicitP--;
        return;
      }
      add(t.pos, len, "error", `The closing tag </${t.name}> has no matching opening tag.`, `Delete it, or add <${t.name}> before the content it needs.`);
      return;
    }
    const unclosedAbove = stack.slice(k + 1).filter((e) => !OPTIONAL.has(e.name));
    if (unclosedAbove.length) {
      const inner = unclosedAbove[unclosedAbove.length - 1];
      add(t.pos, len, "error", `Expected </${inner.tag}> to close <${inner.tag}> opened on line ${loc(inner.pos).line}, but found </${t.name}>.`, `Add </${inner.tag}> before </${t.name}>.`);
    }
    stack.length = k;
  };

  for (const t of tokens) {
    if (t.kind === "open") handleOpen(t);
    else if (t.kind === "close") handleClose(t);
    else if (t.kind === "decl" && /^<!doctype\s+html\b/i.test(t.text)) hasDoctype = true;
  }
  for (const e of stack) {
    if (!OPTIONAL.has(e.name)) add(e.pos, e.tag.length + 1, "error", `The tag <${e.tag}> opened on line ${loc(e.pos).line} was not closed.`, `Add </${e.tag}> in the right place after its content.`);
  }
  if (/<html[\s>]/i.test(src)) {
    if (!hasDoctype) add(0, 1, "warning", "The full page does not start with <!DOCTYPE html>.", "Add <!DOCTYPE html> on the first line of the file.");
    if (htmlTok && !htmlTok.attrs.some((a) => a.lname === "lang")) add(htmlTok.pos, htmlTok.end - htmlTok.pos, "warning", "The <html> tag has no lang attribute.", "Add lang=\"ar\" or the language code of the page, so the browser and search engines know its language.");
    if (!hasTitle) add(htmlTok ? htmlTok.pos : 0, 1, "warning", "The full page has no <title> tag.", "Add <title>Page title</title> inside <head>.");
  }
  const list = issues.map((x) => ({ ...x, line: loc(x.pos).line, col: loc(x.pos).col }));
  list.sort((a, b) => a.pos - b.pos);
  return { issues: list, opens, closes };
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

function snippet(src, issues) {
  const lines = src.split("\n");
  const shown = new Set();
  const marks = new Map();
  for (const p of issues) {
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

export function solve(input) {
  const raw = input.text;
  if (isBlank(raw)) fail("Enter the HTML code you want to check.", "text");
  const text = String(raw);
  if (text.length > LIMIT) fail("The code is longer than 200000 characters; reduce its size and check again.", "text");
  const src = text.replace(/\r\n?/g, "\n");
  const { issues, opens, closes } = analyze(src);
  const errors = issues.filter((x) => x.sev === "error").length;
  const warnings = issues.length - errors;
  const verdict = errors ? `❌ Errors found: ${errors}` : "✅ No errors";
  const kind = (x) => (x.sev === "error" ? "Error" : "Warning");
  const results = [
    { label: "Verdict", value: verdict },
    { label: "Warnings", value: String(warnings) },
    { label: "Opening tags", value: String(opens) },
    { label: "Closing tags", value: String(closes) }
  ];
  const blocks = [];
  if (issues.length) {
    blocks.push({ type: "table", wrap: true, head: ["Line", "Type", "Problem", "Fix"], rows: issues.map((x) => [String(x.line), kind(x), x.message, x.suggestion]) });
    blocks.push({ type: "html", html: snippet(src, issues) });
  }
  const lines = issues.map((x) => `Line ${x.line} (${kind(x)}): ${x.message}`);
  return {
    results,
    steps: [
      "The code is split into tags, comments, and declarations, and the raw content of script and style is ignored.",
      "The order of opening and closing tags is tracked, and the optional closing rules are applied to elements such as <li>, <p>, and <td>.",
      "Duplicate attributes and IDs, nested links, alt attributes, and block elements inside paragraphs are checked."
    ],
    blocks,
    copy: [verdict, `Warnings: ${warnings}`, ...lines].join("\n")
  };
}
