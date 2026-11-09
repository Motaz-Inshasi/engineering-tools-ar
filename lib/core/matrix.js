import { niceTex, nice, fmt } from "./format.js";
import { roots, cleanRoot, groupRoots } from "./polynomial.js";
import { InputError } from "./validate.js";

export const clone = (M) => M.map((r) => r.slice());
export const zeros = (n, m = n) => Array.from({ length: n }, () => new Array(m).fill(0));
export const identity = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
export const transpose = (A) => A[0].map((_, j) => A.map((r) => r[j]));
export const size = (A) => [A.length, A[0].length];

export function scaleOf(A) {
  let m = 0;
  for (const r of A) for (const x of r) m = Math.max(m, Math.abs(x));
  return m || 1;
}

export function madd(A, B, sign = 1) {
  if (A.length !== B.length || A[0].length !== B[0].length) throw new InputError("الجمع والطرح يحتاجان مصفوفتين بالأبعاد نفسها.");
  return A.map((r, i) => r.map((x, j) => x + sign * B[i][j]));
}

export function mmul(A, B) {
  if (A[0].length !== B.length) throw new InputError(`لا يمكن الضرب: عدد أعمدة الأولى (${A[0].length}) لا يساوي عدد صفوف الثانية (${B.length}).`);
  const out = zeros(A.length, B[0].length);
  for (let i = 0; i < A.length; i++) for (let j = 0; j < B[0].length; j++) {
    let s = 0;
    for (let k = 0; k < B.length; k++) s += A[i][k] * B[k][j];
    out[i][j] = s;
  }
  return out;
}

export function mvec(A, x) {
  return A.map((r) => r.reduce((s, a, j) => s + a * x[j], 0));
}

export function trace(A) {
  return A.reduce((s, r, i) => s + r[i], 0);
}

function cleanVal(x, scale) {
  if (Math.abs(x) < 1e-12 * scale) return 0;
  const r = Math.round(x);
  if (Math.abs(x - r) < 1e-10 * Math.max(1, Math.abs(x))) return r;
  return x;
}

export function cleanMatrix(A, scale = scaleOf(A)) {
  return A.map((r) => r.map((x) => cleanVal(x, scale)));
}

export function matTex(A, aug = -1) {
  const cols = A[0].length;
  const spec = aug >= 0 ? `{${"c".repeat(aug)}|${"c".repeat(cols - aug)}}` : null;
  const body = A.map((r) => r.map((x) => niceTex(x, 6)).join(" & ")).join(" \\\\ ");
  return spec ? `\\left[\\begin{array}${spec}${body}\\end{array}\\right]` : `\\begin{bmatrix}${body}\\end{bmatrix}`;
}

export function matText(A) {
  return A.map((r) => r.map((x) => nice(x, 8)).join("\t")).join("\n");
}

const rowName = (i) => `R_{${i + 1}}`;

export function rref(Ain, opts = {}) {
  const A = clone(Ain);
  const rows = A.length, cols = A[0].length;
  const limit = opts.cols ?? cols;
  const scale = scaleOf(A);
  const eps = 1e-10 * scale;
  const steps = [];
  const pivots = [];
  let r = 0;
  for (let c = 0; c < limit && r < rows; c++) {
    let p = r;
    for (let i = r + 1; i < rows; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i;
    if (Math.abs(A[p][c]) <= eps) { for (let i = r; i < rows; i++) A[i][c] = 0; continue; }
    if (p !== r) {
      [A[p], A[r]] = [A[r], A[p]];
      steps.push({ op: `${rowName(r)} \\leftrightarrow ${rowName(p)}`, M: clone(A) });
    }
    const pv = A[r][c];
    if (Math.abs(pv - 1) > 1e-14) {
      A[r] = A[r].map((x) => x / pv);
      steps.push({ op: `${rowName(r)} \\leftarrow \\frac{1}{${niceTex(pv)}} ${rowName(r)}`, M: cleanMatrix(A, scale) });
    }
    for (let i = 0; i < rows; i++) {
      if (i === r) continue;
      const f = A[i][c];
      if (Math.abs(f) <= 1e-15 * scale) { A[i][c] = 0; continue; }
      A[i] = A[i].map((x, j) => x - f * A[r][j]);
      A[i][c] = 0;
      steps.push({ op: `${rowName(i)} \\leftarrow ${rowName(i)} ${f < 0 ? "+" : "-"} ${Math.abs(f - 1) < 1e-14 || Math.abs(f + 1) < 1e-14 ? "" : niceTex(Math.abs(f))}${rowName(r)}`, M: cleanMatrix(A, scale) });
    }
    pivots.push(c);
    r++;
  }
  return { R: cleanMatrix(A, scale), pivots, steps, rank: pivots.length };
}

export function rank(A) {
  return rref(A).rank;
}

export function det(Ain) {
  const n = Ain.length;
  if (n !== Ain[0].length) throw new InputError("المحدد يُحسب للمصفوفة المربعة فقط.");
  const A = clone(Ain);
  const scale = scaleOf(A);
  let d = 1;
  const steps = [];
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let i = c + 1; i < n; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i;
    if (Math.abs(A[p][c]) <= 1e-13 * scale) return { value: 0, steps, singularAt: c };
    if (p !== c) {
      [A[p], A[c]] = [A[c], A[p]];
      d = -d;
      steps.push({ op: `${rowName(c)} \\leftrightarrow ${rowName(p)}\\ (\\text{sign} \\times -1)`, M: clone(A) });
    }
    for (let i = c + 1; i < n; i++) {
      const f = A[i][c] / A[c][c];
      if (f === 0) continue;
      A[i] = A[i].map((x, j) => x - f * A[c][j]);
      A[i][c] = 0;
      steps.push({ op: `${rowName(i)} \\leftarrow ${rowName(i)} ${f < 0 ? "+" : "-"} ${niceTex(Math.abs(f))}${rowName(c)}`, M: cleanMatrix(A, scale) });
    }
    d *= A[c][c];
  }
  const diag = A.map((r, i) => r[i]);
  return { value: cleanVal(d, Math.pow(scale, n)), steps, diag, sign: Math.sign(d) };
}

export function inverse(A) {
  const n = A.length;
  if (n !== A[0].length) throw new InputError("المعكوس موجود للمصفوفة المربعة فقط.");
  const aug = A.map((r, i) => [...r, ...identity(n)[i]]);
  const res = rref(aug, { cols: n });
  if (res.rank < n) return null;
  return { inv: res.R.map((r) => r.slice(n)), steps: res.steps, aug };
}

export function solveLinear(A, b) {
  const n = A.length;
  const aug = A.map((r, i) => [...r, b[i]]);
  const res = rref(aug, { cols: A[0].length });
  const rankA = res.rank;
  const rankAug = rref(aug).rank;
  return { ...res, rankA, rankAug, aug, n, m: A[0].length };
}

export function charPoly(A) {
  const n = A.length;
  const c = new Array(n + 1).fill(0);
  c[n] = 1;
  let M = zeros(n);
  for (let k = 1; k <= n; k++) {
    const AM = mmul(A, M);
    M = AM.map((r, i) => r.map((x, j) => x + (i === j ? c[n - k + 1] : 0)));
    const AMk = mmul(A, M);
    c[n - k] = -trace(AMk) / k;
  }
  return c;
}

export function eigen(A) {
  const n = A.length;
  if (n !== A[0].length) throw new InputError("القيم الذاتية تُحسب للمصفوفة المربعة فقط.");
  const p = charPoly(A);
  const scale = scaleOf(A);
  const rs = roots(p).map((z) => cleanRoot(z));
  const groups = groupRoots(rs, 1e-6);
  const out = [];
  for (const g of groups) {
    const lam = g.root;
    let vectors = [];
    if (lam.im === 0) {
      const M = A.map((r, i) => r.map((x, j) => x - (i === j ? lam.re : 0)));
      vectors = nullSpace(M, 1e-7 * scale);
    }
    out.push({ value: lam, mult: g.mult, vectors });
  }
  return { poly: p, values: out };
}

export function nullSpace(M, tol) {
  const n = M[0].length;
  const R = clone(M);
  const rows = R.length;
  const piv = [];
  let r = 0;
  for (let c = 0; c < n && r < rows; c++) {
    let p = r;
    for (let i = r + 1; i < rows; i++) if (Math.abs(R[i][c]) > Math.abs(R[p][c])) p = i;
    if (Math.abs(R[p][c]) <= tol) continue;
    [R[p], R[r]] = [R[r], R[p]];
    const pv = R[r][c];
    R[r] = R[r].map((x) => x / pv);
    for (let i = 0; i < rows; i++) if (i !== r) { const f = R[i][c]; R[i] = R[i].map((x, j) => x - f * R[r][j]); }
    piv.push(c);
    r++;
  }
  const free = [];
  for (let c = 0; c < n; c++) if (!piv.includes(c)) free.push(c);
  return free.map((fc) => {
    const v = new Array(n).fill(0);
    v[fc] = 1;
    piv.forEach((pc, i) => { v[pc] = -R[i][fc]; });
    const big = v.reduce((m, x) => (Math.abs(x) > Math.abs(m) ? x : m), 0);
    const nonzero = v.filter((x) => Math.abs(x) > 1e-12);
    const minAbs = Math.min(...nonzero.map(Math.abs));
    const norm = nonzero.every((x) => Math.abs(x / minAbs - Math.round(x / minAbs)) < 1e-6) ? minAbs : Math.abs(big);
    return v.map((x) => cleanVal(x / norm * Math.sign(big || 1), 1));
  });
}

export { fmt };
