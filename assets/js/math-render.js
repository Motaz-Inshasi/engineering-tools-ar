export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function katexLib() {
  return typeof window !== "undefined" ? window.katex : globalThis.katex;
}

export function renderTex(tex, display = false) {
  const k = katexLib();
  if (!k) return `<code dir="ltr">${escapeHtml(tex)}</code>`;
  return k.renderToString(tex, { displayMode: display, throwOnError: false, output: "htmlAndMathml", strict: false });
}

const NUM_RE = /([+\-−]?\d[\d.,]*(?:e[+\-]?\d+)?(?:\s?(?:[kMGTmunpµ]?(?:Ω|V|A|W|F|H|Hz|s|VA|VAR|°C|K|bit|bits|dB))|%|°)?)/g;

function wrapNumbers(html) {
  return html.replace(NUM_RE, '<bdi dir="ltr" class="num">$1</bdi>');
}

export function renderInline(text) {
  const parts = String(text).split(/(\$[^$]+\$)/g);
  return parts.map((p) => {
    if (p.length > 1 && p.startsWith("$") && p.endsWith("$")) return renderTex(p.slice(1, -1), false);
    return wrapNumbers(escapeHtml(p));
  }).join("");
}
