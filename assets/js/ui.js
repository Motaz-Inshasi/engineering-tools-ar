import { renderTex, renderInline, escapeHtml } from "./math-render.js";
import { renderPlot } from "./plot.js";
import { fmt, eng } from "../../lib/core/format.js";

export function displayValue(r) {
  if (r.display !== undefined) return String(r.display);
  if (typeof r.value === "number") {
    if (r.eng) return eng(r.value, r.unit || "", r.sig || 4);
    return `${fmt(r.value, r.sig || 6)}${r.unit ? " " + r.unit : ""}`;
  }
  return `${r.value ?? ""}${r.unit ? " " + r.unit : ""}`;
}

export function copyText(res) {
  if (res.copy) return res.copy;
  return (res.results || []).map((r) => `${r.label}: ${r.text ?? displayValue(r)}`).join("\n");
}

function cellHtml(c, tag) {
  if (c === null || c === undefined) return `<${tag}></${tag}>`;
  if (typeof c === "object") {
    const t = c.th ? "th" : tag;
    const style = c.color ? ` style="background:${escapeHtml(c.color)};color:${escapeHtml(c.fg || "#000")}"` : "";
    const cls = c.color ? ' class="swatch"' : "";
    const inner = c.tex !== undefined ? renderTex(c.tex) : renderInline(c.text ?? "");
    return `<${t}${cls}${style}${c.span ? ` colspan="${c.span}"` : ""}>${inner}</${t}>`;
  }
  return `<${tag}>${renderInline(c)}</${tag}>`;
}

export function blockHtml(b) {
  if (b.type === "table") {
    const head = b.head ? `<thead><tr>${b.head.map((h) => cellHtml(h, "th")).join("")}</tr></thead>` : "";
    const rows = b.rows.map((r) => `<tr>${r.map((c, i) => cellHtml(c, b.rowHeaders && i === 0 ? "th" : "td")).join("")}</tr>`).join("");
    return `<div class="table-wrap"><table>${b.caption ? `<caption>${renderInline(b.caption)}</caption>` : ""}${head}<tbody>${rows}</tbody></table></div>`;
  }
  if (b.type === "plot") return renderPlot(b);
  if (b.type === "note") return `<p class="note${b.tone === "warn" ? " warn" : ""}">${renderInline(b.text)}</p>`;
  if (b.type === "tex") return `<div class="step-tex">${b.label ? `<p>${renderInline(b.label)}</p>` : ""}${renderTex(b.tex, true)}</div>`;
  if (b.type === "html") return b.html;
  return "";
}

export function resultsHtml(res) {
  return (res.results || []).map((r) => {
    const val = r.tex !== undefined ? renderTex(r.tex) : `<bdi dir="ltr" class="num">${escapeHtml(displayValue(r))}</bdi>`;
    return `<div><dt>${renderInline(r.label)}</dt><dd>${val}</dd></div>`;
  }).join("");
}

export function stepsHtml(res) {
  return (res.steps || []).map((s) => {
    const o = typeof s === "string" ? { text: s } : s;
    return `<li>${o.text ? renderInline(o.text) : ""}${o.tex ? `<div class="step-tex">${renderTex(o.tex, true)}</div>` : ""}</li>`;
  }).join("");
}

function readValues(form) {
  const v = {};
  for (const el of form.querySelectorAll("[name]")) {
    v[el.name] = el.type === "checkbox" ? (el.checked ? "1" : "") : el.value;
  }
  return v;
}

function applyWhen(form) {
  const vals = readValues(form);
  for (const f of form.querySelectorAll("[data-when]")) {
    let rule;
    try { rule = JSON.parse(f.dataset.when); } catch { continue; }
    const show = Object.entries(rule).every(([k, allowed]) => allowed.includes(vals[k]));
    f.hidden = !show;
  }
}

function fill(form, values) {
  for (const el of form.querySelectorAll("[name]")) {
    if (!(el.name in values)) continue;
    const val = values[el.name];
    if (el.type === "checkbox") el.checked = !!val && val !== "0";
    else el.value = val;
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

export async function initTool() {
  const { tool, category } = document.body.dataset;
  const mod = await import(`../../lib/${category}/${tool}.js`);
  const form = document.getElementById("tool-form");
  const out = document.getElementById("output");
  const err = document.getElementById("out-error");
  const resultsEl = document.getElementById("out-results");
  const blocksEl = document.getElementById("out-blocks");
  const stepsEl = document.getElementById("out-steps");
  const stepsWrap = document.getElementById("steps-wrap");
  const copyBtn = document.getElementById("copy-btn");
  const copyStatus = document.getElementById("copy-status");
  const success = document.getElementById("out-success");
  let lastCopy = "";

  const clearInvalid = () => form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));

  function showError(message, field) {
    out.hidden = false;
    success.hidden = true;
    err.hidden = false;
    err.textContent = message;
    if (field) {
      const el = form.querySelector(`[name="${CSS.escape(field)}"]`);
      if (el) { el.setAttribute("aria-invalid", "true"); el.focus(); }
    }
  }

  function compute() {
    clearInvalid();
    copyStatus.textContent = "";
    let res;
    try {
      res = mod.solve(readValues(form));
    } catch (e) {
      if (e && e.name === "InputError") showError(e.message, e.field);
      else { console.error(e); showError("حدث خطأ غير متوقع أثناء الحساب. تحقّق من المدخلات وحاول مجدداً."); }
      return;
    }
    err.hidden = true;
    success.hidden = false;
    out.hidden = false;
    resultsEl.innerHTML = resultsHtml(res);
    blocksEl.innerHTML = (res.blocks || []).map(blockHtml).join("");
    const steps = stepsHtml(res);
    stepsEl.innerHTML = steps;
    stepsWrap.hidden = !steps;
    lastCopy = copyText(res);
    out.dataset.state = "done";
    out.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  form.addEventListener("input", () => applyWhen(form));
  form.addEventListener("change", () => applyWhen(form));
  form.addEventListener("submit", (e) => { e.preventDefault(); compute(); });
  form.addEventListener("reset", () => setTimeout(() => { applyWhen(form); clearInvalid(); out.hidden = true; }, 0));
  document.getElementById("example-btn")?.addEventListener("click", () => {
    fill(form, mod.meta.example.values);
    applyWhen(form);
    compute();
  });
  copyBtn.addEventListener("click", async () => {
    const ok = await copyToClipboard(lastCopy);
    copyStatus.textContent = ok ? "تم النسخ" : "تعذر النسخ، حدّد النص يدوياً";
  });
  applyWhen(form);
  document.body.dataset.ready = "1";
}
