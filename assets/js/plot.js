import { escapeHtml } from "./math-render.js";

const COLORS = ["var(--plot-1)", "var(--plot-2)", "var(--plot-3)", "var(--plot-4)"];

function niceStep(span, count) {
  const raw = span / count;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}

export function niceTicks(lo, hi, count = 6) {
  if (!(hi > lo)) return [lo];
  const step = niceStep(hi - lo, count);
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}

function label(v) {
  const a = Math.abs(v);
  if (v === 0) return "0";
  if (a >= 1e5 || a < 1e-3) return v.toExponential(1).replace("e+", "e");
  return String(Number(v.toPrecision(4)));
}

function quantile(sorted, q) {
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return sorted[i];
}

export function plotRange(series, opts = {}) {
  const xs = [], ys = [];
  for (const s of series) for (const [x, y] of s.points) {
    if (Number.isFinite(x)) xs.push(x);
    if (y !== null && Number.isFinite(y)) ys.push(y);
  }
  let xMin = opts.xMin ?? Math.min(...xs), xMax = opts.xMax ?? Math.max(...xs);
  let yMin = opts.yMin, yMax = opts.yMax;
  if (yMin === undefined || yMax === undefined) {
    const sorted = ys.slice().sort((a, b) => a - b);
    let lo = sorted.length ? sorted[0] : -1, hi = sorted.length ? sorted[sorted.length - 1] : 1;
    if (sorted.length > 20) {
      const qlo = quantile(sorted, 0.03), qhi = quantile(sorted, 0.97);
      const core = Math.max(qhi - qlo, 1e-12);
      if (hi - lo > 8 * core) { lo = qlo - 0.5 * core; hi = qhi + 0.5 * core; }
    }
    if (opts.includeZero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
    if (hi - lo < 1e-12 * Math.max(1, Math.abs(hi))) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.06;
    yMin = yMin ?? lo - pad;
    yMax = yMax ?? hi + pad;
  }
  if (!(xMax > xMin)) { xMin -= 1; xMax += 1; }
  return { xMin, xMax, yMin, yMax };
}

export function renderPlot(block) {
  const W = 640, H = 380, ml = 62, mr = 18, mt = 16, mb = 48;
  const logX = !!block.logX;
  const series = block.series.map((s) => ({ ...s, points: logX ? s.points.filter(([x]) => x > 0).map(([x, y]) => [Math.log10(x), y]) : s.points }));
  const r = plotRange(series, {
    xMin: block.xMin !== undefined ? (logX ? Math.log10(block.xMin) : block.xMin) : undefined,
    xMax: block.xMax !== undefined ? (logX ? Math.log10(block.xMax) : block.xMax) : undefined,
    yMin: block.yMin, yMax: block.yMax, includeZero: block.includeZero
  });
  if (block.equalAspect) {
    const sx = (r.xMax - r.xMin) / (W - ml - mr), sy = (r.yMax - r.yMin) / (H - mt - mb);
    if (sx > sy) { const c = (r.yMax + r.yMin) / 2, h = sx * (H - mt - mb) / 2; r.yMin = c - h; r.yMax = c + h; }
    else { const c = (r.xMax + r.xMin) / 2, h = sy * (W - ml - mr) / 2; r.xMin = c - h; r.xMax = c + h; }
  }
  const X = (x) => ml + ((x - r.xMin) / (r.xMax - r.xMin)) * (W - ml - mr);
  const Y = (y) => mt + ((r.yMax - y) / (r.yMax - r.yMin)) * (H - mt - mb);
  const span = r.yMax - r.yMin;
  const parts = [];
  const xt = logX ? Array.from({ length: Math.floor(r.xMax) - Math.ceil(r.xMin) + 1 }, (_, i) => Math.ceil(r.xMin) + i) : niceTicks(r.xMin, r.xMax, 7);
  const yt = niceTicks(r.yMin, r.yMax, 6);
  for (const t of xt) {
    parts.push(`<line x1="${X(t).toFixed(1)}" y1="${mt}" x2="${X(t).toFixed(1)}" y2="${H - mb}" style="stroke:var(--plot-grid)"/>`);
    parts.push(`<text x="${X(t).toFixed(1)}" y="${H - mb + 18}" text-anchor="middle" font-size="12" style="fill:var(--muted)">${logX ? escapeHtml(label(Math.pow(10, t))) : escapeHtml(label(t))}</text>`);
  }
  if (logX) {
    for (let d = Math.floor(r.xMin); d < r.xMax; d++) for (let k = 2; k < 10; k++) {
      const t = d + Math.log10(k);
      if (t > r.xMin && t < r.xMax) parts.push(`<line x1="${X(t).toFixed(1)}" y1="${mt}" x2="${X(t).toFixed(1)}" y2="${H - mb}" style="stroke:var(--plot-grid);stroke-dasharray:2 3"/>`);
    }
  }
  for (const t of yt) {
    parts.push(`<line x1="${ml}" y1="${Y(t).toFixed(1)}" x2="${W - mr}" y2="${Y(t).toFixed(1)}" style="stroke:var(--plot-grid)"/>`);
    parts.push(`<text x="${ml - 6}" y="${(Y(t) + 4).toFixed(1)}" text-anchor="end" font-size="12" style="fill:var(--muted)">${escapeHtml(label(t))}</text>`);
  }
  if (r.yMin < 0 && r.yMax > 0) parts.push(`<line x1="${ml}" y1="${Y(0).toFixed(1)}" x2="${W - mr}" y2="${Y(0).toFixed(1)}" style="stroke:var(--muted);stroke-width:1.2"/>`);
  if (!logX && r.xMin < 0 && r.xMax > 0) parts.push(`<line x1="${X(0).toFixed(1)}" y1="${mt}" x2="${X(0).toFixed(1)}" y2="${H - mb}" style="stroke:var(--muted);stroke-width:1.2"/>`);
  for (const h of block.hlines || []) {
    if (h.y > r.yMin && h.y < r.yMax) parts.push(`<line x1="${ml}" y1="${Y(h.y).toFixed(1)}" x2="${W - mr}" y2="${Y(h.y).toFixed(1)}" style="stroke:var(--plot-2);stroke-dasharray:6 4"/>`);
  }
  for (const v of block.vlines || []) {
    const vx = logX ? Math.log10(v.x) : v.x;
    if (vx > r.xMin && vx < r.xMax) parts.push(`<line x1="${X(vx).toFixed(1)}" y1="${mt}" x2="${X(vx).toFixed(1)}" y2="${H - mb}" style="stroke:var(--plot-2);stroke-dasharray:6 4"/>`);
  }
  parts.push(`<rect x="${ml}" y="${mt}" width="${W - ml - mr}" height="${H - mt - mb}" fill="none" style="stroke:var(--border)"/>`);
  const clipId = `c${Math.random().toString(36).slice(2, 8)}`;
  parts.push(`<clipPath id="${clipId}"><rect x="${ml}" y="${mt}" width="${W - ml - mr}" height="${H - mt - mb}"/></clipPath>`);
  series.forEach((s, i) => {
    const color = s.color || COLORS[i % COLORS.length];
    if (s.marker) {
      for (const [x, y] of s.points) {
        if (y === null || !Number.isFinite(y)) continue;
        const cx = X(x), cy = Y(y);
        if (s.marker === "x") parts.push(`<path d="M${(cx - 6).toFixed(1)} ${(cy - 6).toFixed(1)}L${(cx + 6).toFixed(1)} ${(cy + 6).toFixed(1)}M${(cx - 6).toFixed(1)} ${(cy + 6).toFixed(1)}L${(cx + 6).toFixed(1)} ${(cy - 6).toFixed(1)}" style="stroke:${color};stroke-width:2.4"/>`);
        else parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6" fill="none" style="stroke:${color};stroke-width:2.4"/>`);
      }
      if (!s.line) return;
    }
    let d = "", pen = false, prevY = null;
    for (const [x, y] of s.points) {
      const bad = y === null || !Number.isFinite(y) || y > r.yMax + 3 * span || y < r.yMin - 3 * span;
      if (bad) { pen = false; prevY = null; continue; }
      if (pen && prevY !== null && Math.abs(y - prevY) > 2 * span) pen = false;
      d += `${pen ? "L" : "M"}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`;
      pen = true;
      prevY = y;
    }
    if (d) parts.push(`<path d="${d}" fill="none" clip-path="url(#${clipId})" style="stroke:${color};stroke-width:${s.width || 2.2}${s.dashed ? ";stroke-dasharray:7 5" : ""}"/>`);
  });
  if (block.xLabel) parts.push(`<text x="${(ml + W - mr) / 2}" y="${H - 8}" text-anchor="middle" font-size="13" style="fill:var(--text)">${escapeHtml(block.xLabel)}</text>`);
  if (block.yLabel) parts.push(`<text x="14" y="${(mt + H - mb) / 2}" text-anchor="middle" font-size="13" transform="rotate(-90 14 ${(mt + H - mb) / 2})" style="fill:var(--text)">${escapeHtml(block.yLabel)}</text>`);
  const title = block.title || "رسم بياني";
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(title)}" dir="ltr" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`;
  const legend = series.length > 1 || series.some((s) => s.name)
    ? `<div class="legend">${series.filter((s) => s.name).map((s, i) => `<span><i style="background:${s.color || COLORS[block.series.indexOf(block.series.find((b) => b.name === s.name)) % COLORS.length]}"></i>${escapeHtml(s.name)}</span>`).join("")}</div>`
    : "";
  return `<figure class="plot">${svg}${legend}<figcaption>${escapeHtml(title)}</figcaption></figure>`;
}
