import { simplify } from "../core/symbolic.js";
import { fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt } from "../core/format.js";
import { bisection, sampleFunction } from "../core/numeric.js";
import { readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "Plot up to three functions together over a domain you choose, with the intersections of the first function with the axes found automatically.",
  keywords: ["plot a function", "graph", "plot", "graph", "curve", "function plotter"],
  formulas: [{ label: "Roots are found from sign changes, then refined by bisection", tex: "f(x_i)\\,f(x_{i+1}) < 0 \\Rightarrow \\exists\\, r \\in (x_i, x_{i+1}): f(r) = 0" }],
  inputs: [
    { id: "f1", label: "First function f(x)", type: "expr", placeholder: "sin(x)", help: "Greatest integer: [x], absolute value: |x|, square root: sqrt(x)" },
    { id: "f2", label: "Second function g(x) (optional)", type: "expr", placeholder: "cos(x)" },
    { id: "f3", label: "Third function h(x) (optional)", type: "expr" },
    { id: "xmin", label: "Minimum x", type: "number", default: "-10" },
    { id: "xmax", label: "Maximum x", type: "number", default: "10" },
    { id: "ymin", label: "Minimum y (optional)", type: "number" },
    { id: "ymax", label: "Maximum y (optional)", type: "number" }
  ],
  example: { values: { f1: "x^2 - 4", f2: "2x + 1", f3: "", xmin: "-5", xmax: "5", ymin: "", ymax: "" }, expect: ["x = -2", "x = 2"], note: "Example: the parabola $x^2-4$ with the line $2x+1$." },
  invalid: { values: { f1: "x^2", xmin: "5", xmax: "1" } },
  related: ["root-finding", "derivative", "integral", "trigonometry"]
};

const safe = (F) => (x) => { let y; try { y = F(x); } catch { y = NaN; } return Number.isFinite(y) ? y : NaN; };

function minimize(g, a, b) {
  const R = (Math.sqrt(5) - 1) / 2;
  let c = b - R * (b - a), d = a + R * (b - a), gc = g(c), gd = g(d);
  for (let i = 0; i < 200 && b - a > 1e-15 * Math.max(1, Math.abs(a) + Math.abs(b)); i++) {
    if (!(gd < gc)) { b = d; d = c; gd = gc; c = b - R * (b - a); gc = g(c); }
    else { a = c; c = d; gc = gd; d = a + R * (b - a); gd = g(d); }
  }
  return gc < gd ? c : d;
}

function snap(F, r) {
  const fr = Math.abs(F(r));
  for (let k = 0; k <= 9; k++) {
    const p = 10 ** k, c = Math.round(r * p) / p;
    if (Math.abs(c - r) < 1e-7 * Math.max(1, Math.abs(r)) && Math.abs(F(c)) <= fr) return c === 0 ? 0 : c;
  }
  return r;
}

export function rootSamples(a, b) {
  return Math.min(200000, Math.max(4000, Math.ceil((b - a) * 40)));
}

function domainEdge(F, bad, good) {
  for (let k = 0; k < 200; k++) {
    const m = (bad + good) / 2;
    if (m === bad || m === good) break;
    if (isFinite(F(m))) good = m; else bad = m;
  }
  return good;
}

export function findRoots(F0, a, b, n = rootSamples(a, b), depth = 0) {
  const F = safe(F0);
  const xs = new Float64Array(n + 1), ys = new Float64Array(n + 1);
  for (let i = 0; i <= n; i++) { xs[i] = i === n ? b : a + ((b - a) * i) / n; ys[i] = F(xs[i]); }
  const found = [], intervals = [], inRun = new Uint8Array(n + 1);
  let edges = 0;
  for (let i = 0; i <= n; i++) {
    if (ys[i] !== 0) continue;
    let j = i;
    while (j < n && ys[j + 1] === 0) j++;
    if (j > i) {
      inRun.fill(1, i, j + 1);
      const left = i === 0 ? { x: a, closed: true } : zeroEdge(F, xs[i], xs[i - 1]);
      const right = j === n ? { x: b, closed: true } : zeroEdge(F, xs[j], xs[j + 1]);
      intervals.push({ a: left.x, b: right.x, ca: left.closed, cb: right.closed });
    }
    i = j;
  }
  const accept = (r, scale) => { const y = F(r); if (isFinite(y) && Math.abs(y) <= 1e-7 * Math.max(1, scale)) found.push(r); };
  const cross = (x0, x1, scale) => { const r = bisection(F, x0, x1, { tol: 1e-14 }); if (r.ok) accept(r.root, scale); };
  for (let i = 0; i <= n; i++) {
    const y = ys[i];
    if (y === 0) {
      if (!inRun[i]) found.push(xs[i]);
      for (const j of [i - 1, i + 1]) {
        if (j < 0 || j > n || !isFinite(ys[j]) || ys[j] === 0) continue;
        const s = Math.sign(ys[j]), g = (x) => { const w = F(x); return isFinite(w) ? s * w : Infinity; };
        const lo = Math.min(xs[i], xs[j]), hi = Math.max(xs[i], xs[j]);
        const m = minimize(g, lo, hi);
        if (g(m) < 0) cross(xs[j] < m ? xs[j] : m, xs[j] < m ? m : xs[j], Math.abs(ys[j]));
      }
      continue;
    }
    if (depth < 2 && edges < 400 && i < n && isFinite(y) !== isFinite(ys[i + 1])) {
      edges++;
      const [bad, good] = isFinite(y) ? [xs[i + 1], xs[i]] : [xs[i], xs[i + 1]];
      const e = domainEdge(F, bad, good);
      if (e !== good) {
        const sub = findRoots(F, Math.min(e, good), Math.max(e, good), 400, depth + 1);
        found.push(...sub);
        intervals.push(...sub.intervals);
      }
    }
    if (i < n && isFinite(y) && isFinite(ys[i + 1]) && ys[i + 1] !== 0 && y * ys[i + 1] < 0) cross(xs[i], xs[i + 1], Math.max(Math.abs(y), Math.abs(ys[i + 1])));
    if (i === 0 || i === n || !isFinite(y)) continue;
    const yl = ys[i - 1], yr = ys[i + 1];
    if (!isFinite(yl) || !isFinite(yr) || yl * y <= 0 || yr * y <= 0) continue;
    if (Math.abs(y) > Math.abs(yl) || Math.abs(y) > Math.abs(yr)) continue;
    const s = Math.sign(y), g = (x) => { const v = F(x); return isFinite(v) ? s * v : Infinity; };
    const m = minimize(g, xs[i - 1], xs[i + 1]), gm = g(m), scale = Math.max(Math.abs(yl), Math.abs(yr));
    if (gm < 0) { cross(xs[i - 1], m, scale); cross(m, xs[i + 1], scale); }
    else if (gm <= 1e-10 * Math.max(1, scale)) found.push(m);
  }
  found.sort((p, q) => p - q);
  intervals.sort((p, q) => p.a - q.a);
  const near = (v, I) => v >= I.a - 1e-7 * Math.max(1, Math.abs(I.a)) && v <= I.b + 1e-7 * Math.max(1, Math.abs(I.b));
  const out = [];
  for (const r of found) {
    const v = snap(F, r);
    if (intervals.some((I) => near(v, I))) continue;
    if (!out.length || Math.abs(v - out[out.length - 1]) > 1e-7 * Math.max(1, Math.abs(v))) out.push(v);
  }
  Object.defineProperty(out, "intervals", { value: intervals });
  Object.defineProperty(out, "partial", { value: edges >= 400 });
  return out;
}

function zeroEdge(F, z, nz) {
  for (let k = 0; k < 200; k++) {
    const m = (z + nz) / 2;
    if (m === z || m === nz) break;
    if (F(m) === 0) z = m; else nz = m;
  }
  let x = Number(z.toPrecision(12));
  for (let k = 0; k <= 9; k++) {
    const p = 10 ** k, c = Math.round(z * p) / p;
    if (Math.abs(c - z) < 1e-9 * Math.max(1, Math.abs(z))) { x = c === 0 ? 0 : c; break; }
  }
  for (const q of PI_DEN) {
    const p = Math.round((z * q) / Math.PI), c = (p * Math.PI) / q;
    if (p !== 0 && Math.abs(c - z) < 1e-9 * Math.max(1, Math.abs(z))) { x = c; break; }
  }
  return { x, closed: F(x) === 0 };
}

export function intervalText(I) {
  return `${fmt(I.a, 8)} ${I.ca ? "≤" : "<"} x ${I.cb ? "≤" : "<"} ${fmt(I.b, 8)}`;
}

const PI_DEN = [1, 2, 3, 4, 5, 6, 8, 10, 12];

function piText(d) {
  for (const q of PI_DEN) {
    const p = Math.round((d * q) / Math.PI);
    if (p > 0 && Math.abs(d - (p * Math.PI) / q) < 1e-7 * d) return (p === 1 ? "" : p) + "π" + (q === 1 ? "" : "/" + q);
  }
  return fmt(d, 8);
}

export function rootPattern(roots) {
  if (roots.length < 4) return null;
  const d = roots[1] - roots[0];
  if (!(d > 0)) return null;
  for (let i = 2; i < roots.length; i++) if (Math.abs(roots[i] - roots[i - 1] - d) > 1e-6 * Math.max(1, d)) return null;
  const k = Math.round(-roots[0] / d), base = roots[0] + k * d;
  return { step: d, base: Math.abs(base) < 1e-9 ? 0 : base, text: piText(d) };
}

function summarize(items) {
  const SHOW = 6;
  const sorted = [...items].sort((p, q) => p.pos - q.pos);
  if (items.length <= 8) return { list: sorted, more: 0 };
  const near = [...items].sort((p, q) => Math.abs(p.pos) - Math.abs(q.pos) || p.pos - q.pos).slice(0, SHOW).sort((p, q) => p.pos - q.pos);
  return { list: near, more: items.length - SHOW };
}

function hasStep(node) {
  if (!node) return false;
  if (node.type === "fn" && (node.name === "floor" || node.name === "ceil")) return true;
  return hasStep(node.a) || hasStep(node.b);
}

function breakJumps(points) {
  const out = [];
  const dy = (i) => (i < 0 || i + 1 >= points.length || points[i][1] === null || points[i + 1][1] === null ? 0 : Math.abs(points[i + 1][1] - points[i][1]));
  for (let i = 0; i < points.length; i++) {
    out.push(points[i]);
    const d = dy(i);
    if (d > 1e-9 && d > 4 * Math.max(dy(i - 1), dy(i + 1))) out.push([(points[i][0] + points[i + 1][0]) / 2, null]);
  }
  return out;
}

export function solve(input) {
  const v = "x";
  const exprs = [];
  for (const [k, name] of [["f1", "f"], ["f2", "g"], ["f3", "h"]]) {
    if (k !== "f1" && isBlank(input[k])) continue;
    exprs.push({ name, node: simplify(readExpr(input, k, v, `Function ${name}`)) });
  }
  const xmin = num(input, "xmin", "Minimum x"), xmax = num(input, "xmax", "Maximum x");
  if (xmin >= xmax) fail("Minimum x must be less than maximum x.", "xmax");
  if (xmax - xmin > 1e6) fail("The domain is too wide to plot.", "xmax");
  const ymin = num(input, "ymin", "Minimum y", { optional: true }), ymax = num(input, "ymax", "Maximum y", { optional: true });
  if (ymin !== null && ymax !== null && ymin >= ymax) fail("Minimum y must be less than maximum y.", "ymax");
  const PLOT_N = 2000;
  const series = exprs.map((e) => {
    const pts = sampleFunction(f1(e.node, v), xmin, xmax, PLOT_N);
    return { name: `${e.name}(x) = ${toText(e.node)}`, points: hasStep(e.node) ? breakJumps(pts) : pts };
  });
  const F = f1(exprs[0].node, v);
  const n = rootSamples(xmin, xmax);
  let roots = findRoots(F, xmin, xmax, n);
  const dense = roots.length + roots.intervals.length > n / 6 || !!roots.partial;
  let lo = xmin, hi = xmax;
  if (dense) {
    const c = Math.min(Math.max(0, xmin), xmax);
    let w = xmax - xmin;
    for (let k = 0; k < 6; k++) {
      w /= 20;
      lo = Math.max(xmin, c - w / 2); hi = Math.min(xmax, c + w / 2);
      roots = findRoots(F, lo, hi);
      if (roots.length + roots.intervals.length <= rootSamples(lo, hi) / 6 && !roots.partial) break;
    }
  }
  let y0 = NaN;
  if (xmin <= 0 && xmax >= 0) { try { y0 = F(0); } catch { y0 = NaN; } }
  const intervals = roots.intervals || [];
  const pattern = intervals.length ? null : rootPattern(roots);
  const items = [
    ...roots.map((r) => ({ pos: r, text: `x = ${fmt(r, 8)}` })),
    ...intervals.map((I) => ({ pos: Math.min(Math.max(0, I.a), I.b), text: intervalText(I) }))
  ];
  const total = items.length;
  const { list, more } = dense ? { ...summarize(items), more: 0 } : summarize(items);
  const listText = list.map((it) => it.text).join("، ") + (more ? `, … (and ${more} more roots)` : "");
  const steps = exprs.map((e) => ({ text: `The function ${e.name} after simplification:`, tex: `${e.name}(x) = ${toTex(e.node)}` }));
  steps.push(`We evaluated f at ${n + 1} points between ${fmt(xmin)} and ${fmt(xmax)}, looked for sign changes between each pair of adjacent points, then refined each root by bisection.`);
  steps.push("At each point where f approaches zero without changing sign, we searched more finely to catch close roots and roots where the curve touches the axis without crossing it.");
  if (dense) steps.push(`Note: the function oscillates very rapidly in this wide domain, so not all of its roots can be listed. We searched carefully in the part [${fmt(lo, 8)}, ${fmt(hi, 8)}] around zero. Narrow the domain for a complete result.`);
  if (intervals.length) steps.push("The function f equals zero over a whole interval, not at a single point, so every x inside this interval is a root, meaning the number of roots is infinite.");
  if (total) steps.push(more || dense ? `Roots closest to zero: ${listText}.` : `Roots: ${listText}.`);
  else steps.push("We found no roots for the function f in this domain.");
  if (pattern) steps.push(`The roots are evenly spaced: the difference between each two consecutive roots is ${pattern.text}.`);
  if (!dense && roots.length > PLOT_N / 8) steps.push("Note: the domain is wide, so the plot cannot show all of the function's oscillations. Narrow the domain to see them clearly.");
  if (isFinite(y0)) steps.push("The y-intercept is $f(0) = " + fmt(y0, 8) + "$.");
  const count = dense ? "Very many (the function oscillates rapidly)" : intervals.length ? "Infinite (f = 0 over a whole interval)" : String(total);
  const results = [{ label: "Number of roots of f in the domain", value: count }];
  if (total) results.push({ label: more || dense ? "Roots closest to zero" : "Roots of f", value: listText });
  if (pattern) results.push({ label: "Root pattern", value: `repeats every ${pattern.text}` });
  results.push({ label: "Y-axis intercept", value: isFinite(y0) ? `f(0) = ${fmt(y0, 8)}` : "Undefined or outside the domain" });
  const block = { type: "plot", title: "function plotter", xLabel: "x", yLabel: "y", series, xMin: xmin, xMax: xmax };
  if (ymin !== null) block.yMin = ymin;
  if (ymax !== null) block.yMax = ymax;
  if (roots.length) series.push({ name: "Roots of f", points: roots.map((r) => [r, 0]), marker: "o" });
  if (intervals.length) series.push({ name: "f = 0 over an interval", points: intervals.flatMap((I) => [[I.a, 0], [I.b, 0], [I.b, null]]) });
  return { results, steps, blocks: [block], copy: `Roots of f (${count}): ${total ? listText : "none"}` };
}
