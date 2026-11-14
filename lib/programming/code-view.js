import { fail } from "../core/validate.js";

export const MAX_CODE = 200000;

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function readCode(input, field = "code") {
  const code = String(input[field] ?? "").replace(/\r\n?/g, "\n");
  if (!code.trim()) fail("الصق الكود المراد فحصه.", field);
  if (code.length > MAX_CODE) fail("الكود طويل جداً؛ الحد الأقصى 200,000 حرف.", field);
  return code;
}

export function lineCol(code, pos) {
  let line = 1, last = -1;
  for (let i = 0; i < pos && i < code.length; i++) if (code[i] === "\n") { line++; last = i; }
  return { line, col: pos - last - 1 };
}

function renderLine(text, marks) {
  if (!marks.length) return escapeHtml(text);
  const ms = [...marks].sort((a, b) => a.col - b.col);
  let out = "", at = 0;
  for (const m of ms) {
    const s = Math.max(at, Math.min(m.col, text.length));
    const e = Math.max(s, Math.min(text.length, m.col + Math.max(1, m.len || 1)));
    out += escapeHtml(text.slice(at, s));
    out += e > s ? `<span class="bad">${escapeHtml(text.slice(s, e))}</span>` : `<span class="bad"> </span>`;
    at = e;
  }
  return out + escapeHtml(text.slice(at));
}

export function codeBlock(code, marks = [], context = 3) {
  const lines = code.split("\n");
  const byLine = new Map();
  for (const m of marks) {
    if (!m || !(m.line >= 1)) continue;
    const ln = Math.min(m.line, lines.length);
    if (!byLine.has(ln)) byLine.set(ln, []);
    byLine.get(ln).push(m);
  }
  let show;
  if (lines.length <= 60) show = lines.map((_, i) => i + 1);
  else {
    const set = new Set();
    for (const ln of byLine.keys()) for (let k = ln - context; k <= ln + context; k++) if (k >= 1 && k <= lines.length) set.add(k);
    if (!set.size) for (let k = 1; k <= Math.min(20, lines.length); k++) set.add(k);
    show = [...set].sort((a, b) => a - b);
  }
  const width = String(lines.length).length;
  const parts = [];
  let prev = 0;
  const gap = `<span class="ln">${" ".repeat(width)}</span>…`;
  for (const ln of show) {
    if (ln > prev + 1) parts.push(gap);
    parts.push(`<span class="ln">${String(ln).padStart(width, " ")}</span>${renderLine(lines[ln - 1], byLine.get(ln) || [])}`);
    prev = ln;
  }
  if (prev < lines.length) parts.push(gap);
  return { type: "html", html: `<pre class="code" dir="ltr"><code>${parts.join("\n")}</code></pre>` };
}

const SEV = { error: "❌ خطأ", warning: "⚠️ تحذير", info: "💡 ملاحظة" };
const ORDER = { error: 0, warning: 1, info: 2 };

export function report(code, issues, extra = {}) {
  const list = [...issues].sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || a.line - b.line || a.col - b.col).slice(0, 60);
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const infos = issues.filter((i) => i.severity === "info").length;
  const verdict = errors ? `❌ وُجد ${errors} ${errors === 1 ? "خطأ" : errors === 2 ? "خطآن" : "أخطاء"}` : warnings ? `✅ لا أخطاء، مع ${warnings} ${warnings === 1 ? "تحذير" : "تحذيرات"}` : "✅ لا توجد أخطاء";
  const results = [{ label: "النتيجة", value: verdict }];
  const first = list[0];
  if (first && first.severity !== "info") results.push({ label: first.severity === "error" ? "أول خطأ" : "أهم تحذير", value: `السطر ${first.line}: ${first.message}` });
  if (first && first.fix && first.severity !== "info") results.push({ label: "الحل", value: first.fix });
  results.push({ label: "الملخص", value: `${errors} خطأ، ${warnings} تحذير، ${infos} ملاحظة` });
  for (const [k, v] of Object.entries(extra)) results.push({ label: k, value: String(v) });
  const blocks = [];
  if (list.length) blocks.push({ type: "table", wrap: true, caption: "المشكلات المكتشفة", head: ["السطر", "النوع", "المشكلة", "الحل"], rows: list.map((i) => [String(i.line), SEV[i.severity], i.message, i.fix || "—"]) });
  blocks.push(codeBlock(code, list.filter((i) => i.severity !== "info").map((i) => ({ line: i.line, col: i.col, len: i.len }))));
  if (issues.length > list.length) blocks.push({ type: "note", text: `عُرضت أول ${list.length} مشكلة فقط من ${issues.length}.`, tone: "warn" });
  const copy = `${verdict}${first ? ` — السطر ${first.line}: ${first.message}` : ""}`;
  return { results, blocks, copy };
}

export function distance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}

export function closest(name, pool) {
  let best = null, bd = 3;
  const limit = name.length <= 3 ? 1 : 2;
  for (const p of pool) {
    if (p === name) continue;
    const d = p.toLowerCase() === name.toLowerCase() ? 0.5 : distance(name, p);
    if (d <= limit && d < bd) { bd = d; best = p; }
  }
  return best;
}
