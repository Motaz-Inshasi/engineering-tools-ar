import { C, cadd, csub, cmul, cdiv, cabs, cscale, cclean, csqrt, cpolar } from "./complex.js";
import { niceTex, nice, fmt } from "./format.js";
import { evaluate, dependsOn, variables } from "./parser.js";
import { InputError } from "./validate.js";

export function trim(p, eps = 0) {
  const q = p.slice();
  while (q.length > 1 && Math.abs(q[q.length - 1]) <= eps) q.pop();
  return q.length ? q : [0];
}

export const degree = (p) => trim(p).length - 1;
export const isZero = (p) => trim(p).length === 1 && trim(p)[0] === 0;

export function padd(a, b) {
  const n = Math.max(a.length, b.length), r = [];
  for (let i = 0; i < n; i++) r.push((a[i] || 0) + (b[i] || 0));
  return trim(r);
}

export function psub(a, b) {
  return padd(a, b.map((x) => -x));
}

export function pscale(a, k) {
  return trim(a.map((x) => x * k));
}

export function pmul(a, b) {
  const r = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) r[i + j] += a[i] * b[j];
  return trim(r);
}

export function ppow(a, n) {
  let r = [1];
  for (let i = 0; i < n; i++) r = pmul(r, a);
  return r;
}

export function pdivmod(a, b) {
  a = trim(a); b = trim(b);
  const db = b.length - 1;
  if (db === 0 && b[0] === 0) throw new InputError("القسمة على كثير حدود صفري.");
  let r = a.slice();
  const q = new Array(Math.max(1, a.length - db)).fill(0);
  for (let i = a.length - 1; i >= db; i--) {
    const c = r[i] / b[db];
    q[i - db] = c;
    for (let j = 0; j <= db; j++) r[i - db + j] -= c * b[j];
  }
  r = r.slice(0, Math.max(1, db));
  const scale = Math.max(1, ...a.map(Math.abs));
  return { q: trim(q), r: trim(r.map((x) => (Math.abs(x) < 1e-12 * scale ? 0 : x))) };
}

export function pderiv(a) {
  if (a.length <= 1) return [0];
  return trim(a.slice(1).map((c, i) => c * (i + 1)));
}

export function peval(a, x) {
  let r = 0;
  for (let i = a.length - 1; i >= 0; i--) r = r * x + a[i];
  return r;
}

export function pevalC(a, z) {
  let r = C(0, 0);
  for (let i = a.length - 1; i >= 0; i--) r = cadd(cmul(r, z), C(a[i], 0));
  return r;
}

export function pevalCC(a, z) {
  let r = C(0, 0);
  for (let i = a.length - 1; i >= 0; i--) r = cadd(cmul(r, z), a[i]);
  return r;
}

export function fromRoots(roots) {
  let p = [C(1, 0)];
  for (const r of roots) {
    const n = new Array(p.length + 1).fill(null).map(() => C(0, 0));
    for (let i = 0; i < p.length; i++) {
      n[i + 1] = cadd(n[i + 1], p[i]);
      n[i] = csub(n[i], cmul(p[i], r));
    }
    p = n;
  }
  return p.map((z) => z.re);
}

export function fromDescending(coeffs) {
  return trim(coeffs.slice().reverse());
}

export function toDescending(p) {
  return trim(p).slice().reverse();
}

function quadRoots(c, b, a) {
  const d = b * b - 4 * a * c;
  if (d >= 0) {
    const s = Math.sqrt(d);
    const q = -0.5 * (b + (b >= 0 ? s : -s));
    if (q === 0) return [C(0), C(0)];
    return [C(q / a), C(c / q)];
  }
  const s = Math.sqrt(-d);
  return [C(-b / (2 * a), s / (2 * a)), C(-b / (2 * a), -s / (2 * a))];
}

function polish(p, z) {
  const dp = pderiv(p);
  for (let i = 0; i < 8; i++) {
    const f = pevalC(p, z), d = pevalC(dp, z);
    if (cabs(d) === 0) break;
    const step = cdiv(f, d);
    const nz = csub(z, step);
    if (!isFinite(nz.re) || !isFinite(nz.im)) break;
    if (cabs(pevalC(p, nz)) > cabs(f)) break;
    z = nz;
    if (cabs(step) < 1e-16 * Math.max(1, cabs(z))) break;
  }
  return z;
}

export function roots(pin) {
  let p = trim(pin);
  const n0 = p.length - 1;
  if (n0 < 1) return [];
  const out = [];
  while (p.length > 1 && p[0] === 0) { out.push(C(0)); p = p.slice(1); }
  const n = p.length - 1;
  if (n === 1) { out.push(C(-p[0] / p[1])); return out; }
  if (n === 2) return out.concat(quadRoots(p[0], p[1], p[2]));
  const lead = p[n];
  const mon = p.map((c) => c / lead);
  const radius = 1 + Math.max(...mon.slice(0, n).map(Math.abs));
  let z = [];
  for (let k = 0; k < n; k++) z.push(cpolar(radius * 0.5 + 0.1, (2 * Math.PI * k) / n + 0.4));
  const dmon = pderiv(mon);
  for (let iter = 0; iter < 2000; iter++) {
    let maxStep = 0;
    const nz = [];
    for (let i = 0; i < n; i++) {
      const f = pevalC(mon, z[i]);
      const d = pevalC(dmon, z[i]);
      const ratio = cdiv(f, d);
      let s = C(0, 0);
      for (let j = 0; j < n; j++) if (j !== i) s = cadd(s, cdiv(C(1), csub(z[i], z[j])));
      const w = cdiv(ratio, csub(C(1), cmul(ratio, s)));
      const zi = isFinite(w.re) && isFinite(w.im) ? csub(z[i], w) : z[i];
      maxStep = Math.max(maxStep, cabs(csub(zi, z[i])) / Math.max(1, cabs(zi)));
      nz.push(zi);
    }
    z = nz;
    if (maxStep < 1e-15) break;
  }
  z = z.map((r) => polish(mon, r));
  return out.concat(z);
}

export function cleanRoot(z) {
  const m = Math.max(1, cabs(z));
  let { re, im } = cclean(z, 1e-9);
  if (Math.abs(im) < 1e-8 * m) im = 0;
  const rr = Math.round(re);
  if (Math.abs(re - rr) < 1e-9 * m) re = rr;
  const ri = Math.round(im);
  if (im !== 0 && Math.abs(im - ri) < 1e-9 * m) im = ri;
  return C(re, im);
}

export function groupRoots(rs, tol = 1e-5) {
  const groups = [];
  for (const r of rs) {
    const g = groups.find((g) => cabs(csub(g.sum.m, r)) <= tol * Math.max(1, cabs(r)));
    if (g) {
      g.items.push(r);
      g.sum.m = cscale(g.items.reduce((a, b) => cadd(a, b), C(0)), 1 / g.items.length);
    } else groups.push({ items: [r], sum: { m: r } });
  }
  return groups.map((g) => ({ root: cleanRoot(g.sum.m), mult: g.items.length }));
}

function multipleOk(p, r, m) {
  let q = trim(p);
  for (let j = 0; j < m; j++) {
    const val = cabs(pevalC(q, r));
    const scale = q.reduce((s, c, k) => s + Math.abs(c) * Math.pow(cabs(r), k), 0) || 1;
    if (val > 1e-11 * scale) return false;
    q = pderiv(q);
  }
  return true;
}

export function distinctRoots(p) {
  const rs = roots(p);
  for (const tol of [2e-2, 5e-3, 1e-3, 1e-4, 1e-6]) {
    const g = groupRoots(rs, tol);
    const out = g.map((x) => ({ root: x.mult > 1 ? refineMultiple(p, x.root, x.mult) : cleanRoot(polish(trim(p), x.root)), mult: x.mult }));
    if (out.every((x) => x.mult === 1 || multipleOk(p, x.root, x.mult))) return out;
  }
  return rs.map((r) => ({ root: cleanRoot(polish(trim(p), r)), mult: 1 }));
}

function refineMultiple(p, r, m) {
  let q = trim(p);
  for (let k = 0; k < m - 1; k++) q = pderiv(q);
  return cleanRoot(polish(q, r));
}

export function termTex(c, k, v, first) {
  const a = Math.abs(c);
  const sign = c < 0 ? (first ? "-" : " - ") : first ? "" : " + ";
  const coef = k > 0 && Math.abs(a - 1) < 1e-12 ? "" : niceTex(a);
  const pw = k === 0 ? "" : k === 1 ? v : `${v}^{${k}}`;
  return `${sign}${coef}${pw}`;
}

export function toTex(p, v = "x") {
  p = trim(p);
  let s = "", first = true;
  for (let k = p.length - 1; k >= 0; k--) {
    const c = p[k];
    if (Math.abs(c) < 1e-14 && !(k === 0 && first)) continue;
    s += termTex(c, k, v, first);
    first = false;
  }
  return s || "0";
}

export function toText(p, v = "x") {
  p = trim(p);
  const parts = [];
  for (let k = p.length - 1; k >= 0; k--) {
    const c = p[k];
    if (Math.abs(c) < 1e-14) continue;
    const a = Math.abs(c);
    const coef = k > 0 && Math.abs(a - 1) < 1e-12 ? "" : nice(a);
    const pw = k === 0 ? "" : k === 1 ? v : `${v}^${k}`;
    const sep = coef && pw ? "*" : "";
    parts.push(`${c < 0 ? (parts.length ? "- " : "-") : parts.length ? "+ " : ""}${coef}${sep}${pw}`);
  }
  return parts.length ? parts.join(" ") : "0";
}

function constValue(n) {
  const v = evaluate(n, {});
  if (!isFinite(v)) throw new InputError("التعبير يحتوي قيمة غير معرّفة.");
  return v;
}

function rmul(a, b) { return { num: pmul(a.num, b.num), den: pmul(a.den, b.den) }; }
function rdiv(a, b) {
  if (isZero(b.num)) throw new InputError("قسمة على صفر في التعبير.");
  return { num: pmul(a.num, b.den), den: pmul(a.den, b.num) };
}
function radd(a, b) { return { num: padd(pmul(a.num, b.den), pmul(b.num, a.den)), den: pmul(a.den, b.den) }; }

export class Unsupported extends Error {}

export function toRational(n, v) {
  const extra = [...variables(n)].filter((x) => x !== v);
  if (extra.length) throw new InputError(`المتغير «${extra[0]}» غير معروف هنا. استخدم المتغير ${v} فقط.`);
  return normalizeRational(rat(n, v));
}

function rat(n, v) {
  if (!dependsOn(n, v)) return { num: [constValue(n)], den: [1] };
  switch (n.type) {
    case "sym": return { num: [0, 1], den: [1] };
    case "neg": { const a = rat(n.a, v); return { num: pscale(a.num, -1), den: a.den }; }
    case "op": {
      if (n.op === "+") return radd(rat(n.a, v), rat(n.b, v));
      if (n.op === "-") { const b = rat(n.b, v); return radd(rat(n.a, v), { num: pscale(b.num, -1), den: b.den }); }
      if (n.op === "*") return rmul(rat(n.a, v), rat(n.b, v));
      if (n.op === "/") return rdiv(rat(n.a, v), rat(n.b, v));
      if (n.op === "^") {
        if (dependsOn(n.b, v)) throw new Unsupported("variable exponent");
        const e = constValue(n.b);
        if (!Number.isInteger(e) || Math.abs(e) > 40) throw new Unsupported("non-integer exponent");
        const base = rat(n.a, v);
        const p = { num: ppow(base.num, Math.abs(e)), den: ppow(base.den, Math.abs(e)) };
        return e < 0 ? { num: p.den, den: p.num } : p;
      }
    }
  }
  throw new Unsupported("function");
}

export function normalizeRational(r) {
  let num = trim(r.num), den = trim(r.den);
  const lead = den[den.length - 1];
  num = pscale(num, 1 / lead);
  den = pscale(den, 1 / lead);
  return cancelCommon(num, den);
}

export function cancelCommon(num, den) {
  if (degree(den) < 1 || isZero(num)) return { num: isZero(num) ? [0] : num, den: isZero(num) ? [1] : den };
  const rs = distinctRoots(den);
  for (const { root, mult } of rs) {
    for (let k = 0; k < mult; k++) {
      const val = cabs(pevalC(num, root));
      const scale = num.reduce((s, c, i) => s + Math.abs(c) * Math.pow(cabs(root), i), 0) || 1;
      if (degree(num) < 1 || val > 1e-9 * scale) break;
      if (root.im === 0) {
        num = pdivmod(num, [-root.re, 1]).q;
        den = pdivmod(den, [-root.re, 1]).q;
      } else if (root.im > 0) {
        const quad = [root.re * root.re + root.im * root.im, -2 * root.re, 1];
        const v2 = cabs(pevalC(num, C(root.re, -root.im)));
        if (v2 > 1e-9 * scale || degree(num) < 2) break;
        num = pdivmod(num, quad).q;
        den = pdivmod(den, quad).q;
      } else break;
    }
  }
  return { num: trim(num), den: trim(den) };
}

export function rationalTex(r, v = "s") {
  const d = trim(r.den);
  if (d.length === 1) return toTex(pscale(r.num, 1 / d[0]), v);
  return `\\frac{${toTex(r.num, v)}}{${toTex(d, v)}}`;
}

export function factorTex(p, v = "s") {
  p = trim(p);
  const lead = p[p.length - 1];
  const rs = distinctRoots(p);
  let s = Math.abs(lead - 1) < 1e-12 ? "" : Math.abs(lead + 1) < 1e-12 ? "-" : niceTex(lead);
  const used = new Set();
  for (let i = 0; i < rs.length; i++) {
    if (used.has(i)) continue;
    const { root, mult } = rs[i];
    const ex = mult > 1 ? `^{${mult}}` : "";
    if (root.im === 0) {
      s += root.re === 0 ? (mult > 1 ? `${v}${ex}` : v) : `\\left(${v} ${root.re < 0 ? "+" : "-"} ${niceTex(Math.abs(root.re))}\\right)${ex}`;
    } else {
      const j = rs.findIndex((x, k) => k !== i && !used.has(k) && Math.abs(x.root.re - root.re) < 1e-9 && Math.abs(x.root.im + root.im) < 1e-9);
      if (j >= 0) used.add(j);
      const q = [root.re * root.re + root.im * root.im, -2 * root.re, 1];
      s += `\\left(${toTex(q, v)}\\right)${ex}`;
    }
    used.add(i);
  }
  return s || "1";
}

export function sameRoots(a, b, tol = 1e-6) {
  if (a.length !== b.length) return false;
  const left = b.slice();
  for (const r of a) {
    const i = left.findIndex((x) => cabs(csub(x, r)) <= tol * Math.max(1, cabs(r)));
    if (i < 0) return false;
    left.splice(i, 1);
  }
  return true;
}

export { fmt, csqrt };
