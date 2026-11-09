import { C, cadd, csub, cmul, cdiv, cabs, cconj, cclean } from "./complex.js";
import { trim, pdivmod, distinctRoots, pscale, pevalC, degree } from "./polynomial.js";
import { InputError } from "./validate.js";

function taylorAt(p, r) {
  const n = p.length;
  let cur = p.map((x) => C(x, 0));
  const out = [];
  for (let i = 0; i < n; i++) {
    const m = cur.length;
    const q = new Array(m).fill(null);
    let acc = C(0, 0);
    for (let k = m - 1; k >= 0; k--) {
      acc = cadd(cmul(acc, r), cur[k]);
      q[k] = acc;
    }
    out.push(q[0]);
    cur = q.slice(1);
    if (!cur.length) break;
  }
  while (out.length < n) out.push(C(0, 0));
  return out;
}

function seriesDiv(a, b, terms) {
  const out = [];
  for (let i = 0; i < terms; i++) {
    let s = a[i] || C(0, 0);
    for (let j = 1; j <= i; j++) s = csub(s, cmul(b[j] || C(0, 0), out[i - j]));
    out.push(cdiv(s, b[0]));
  }
  return out;
}

export function decompose(numIn, denIn) {
  let den = trim(denIn);
  if (degree(den) < 1) throw new InputError("المقام يجب أن يكون كثير حدود من الدرجة الأولى أو أعلى.");
  const lead = den[den.length - 1];
  den = pscale(den, 1 / lead);
  const num = pscale(trim(numIn), 1 / lead);
  const { q, r } = degree(num) >= degree(den) ? pdivmod(num, den) : { q: [0], r: num };
  const rts = distinctRoots(den).sort((a, b) => b.root.re - a.root.re || b.root.im - a.root.im);
  const terms = [];
  for (const { root, mult } of rts) {
    const N = taylorAt(r, root);
    const D = taylorAt(den, root).slice(mult);
    if (!D.length || cabs(D[0]) < 1e-14) throw new InputError("تعذر فصل الجذور المتكررة بدقة كافية.");
    const g = seriesDiv(N, D, mult);
    for (let i = 0; i < mult; i++) {
      terms.push({ root, power: mult - i, coef: cclean(g[i], 1e-11) });
    }
  }
  return { poly: q, remainder: r, den, roots: rts, terms };
}

export function evalDecomposition(dec, z) {
  let s = pevalC(dec.poly, z);
  for (const t of dec.terms) {
    let d = C(1, 0);
    for (let k = 0; k < t.power; k++) d = cmul(d, csub(z, t.root));
    s = cadd(s, cdiv(t.coef, d));
  }
  return s;
}

export function realForm(dec) {
  const out = [];
  const used = new Set();
  dec.terms.forEach((t, i) => {
    if (used.has(i)) return;
    if (t.root.im === 0) {
      out.push({ kind: "real", r: t.root.re, power: t.power, A: t.coef.re });
      used.add(i);
      return;
    }
    const j = dec.terms.findIndex((u, k) => k !== i && !used.has(k) && u.power === t.power && Math.abs(u.root.re - t.root.re) < 1e-9 * Math.max(1, Math.abs(t.root.re)) && Math.abs(u.root.im + t.root.im) < 1e-9 * Math.max(1, Math.abs(t.root.im)));
    used.add(i);
    if (j >= 0) used.add(j);
    const pos = t.root.im > 0 ? t : dec.terms[j] || t;
    const K = pos.coef, rr = pos.root;
    if (t.power === 1) {
      out.push({ kind: "quad", p: -2 * rr.re, q: rr.re * rr.re + rr.im * rr.im, B: 2 * K.re, Cc: -2 * cmul(K, cconj(rr)).re, alpha: rr.re, beta: Math.abs(rr.im), K, power: 1 });
    } else {
      out.push({ kind: "complex", root: rr, K, power: t.power });
    }
  });
  return out;
}

export { cabs };
