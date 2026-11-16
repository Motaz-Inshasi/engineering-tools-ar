import { readTF } from "../signals/common.js";
import { roots, toTex as ptex, toDescending } from "../core/polynomial.js";
import { fmt, niceTex } from "../core/format.js";
import { fail } from "../core/validate.js";

export const meta = {
  description: "Test the stability of a system using the Routh-Hurwitz criterion: the complete Routh table with the two special cases (a zero in the first column, and a full row of zeros), the number of roots in the right half-plane, and a check by computing the roots directly.",
  keywords: ["Routh", "Hurwitz", "routh", "hurwitz", "Routh table", "stability", "stability", "characteristic equation"],
  formulas: [
    { label: "Each row is built by cross-multiplying the two rows above it", tex: "b_i = \\frac{a_{1}\\,a_{2i} - a_{0}\\,a_{2i+1}}{a_{1}}" },
    { label: "Number of roots in the right half-plane = number of sign changes in the first column", tex: "N_{RHP} = N_{\\text{sign}}" }
  ],
  inputs: [
    { id: "p", label: "Characteristic polynomial in s", type: "expr", default: "s^4 + 2s^3 + 3s^2 + 4s + 5", help: "For example $s^3 + 6s^2 + 11s + 6$ (enter the left side of the equation only)." }
  ],
  example: { values: { p: "s^4 + 2s^3 + 3s^2 + 4s + 5" }, expect: ["RHP = 2"], note: "A well-known textbook example: $s^4 + 2s^3 + 3s^2 + 4s + 5$ has two sign changes, i.e. two unstable roots." },
  invalid: { values: { p: "5" } },
  related: ["transfer-function", "step-response", "bode-plot", "steady-state-error"]
};

export function routhTable(desc) {
  const n = desc.length - 1;
  const width = Math.ceil((n + 1) / 2);
  const scale = Math.max(...desc.map(Math.abs));
  const eps = 1e-9 * scale;
  const rows = [desc.filter((_, i) => i % 2 === 0), desc.filter((_, i) => i % 2 === 1)].map((r) => [...r, ...Array(width - r.length + 1).fill(0)]);
  const notes = [];
  let usedEps = false, auxRow = null;
  const isZero = (x) => Math.abs(x) <= 1e-10 * scale;
  for (let i = 2; i <= n; i++) {
    const prev = rows[i - 1], prev2 = rows[i - 2];
    if (prev.every(isZero)) {
      const order = n - (i - 2);
      const aux = prev2.map((c, k) => c * (order - 2 * k));
      rows[i - 1] = aux.map((c, k) => (order - 2 * k > 0 ? c : 0));
      notes.push({ row: i - 1, kind: "zeroRow", aux: prev2.slice(0, Math.floor(order / 2) + 1), order });
      auxRow = { order, coeffs: prev2.slice(0, Math.floor(order / 2) + 1) };
    } else if (isZero(prev[0])) {
      prev[0] = eps;
      usedEps = true;
      notes.push({ row: i - 1, kind: "eps" });
    }
    const a = rows[i - 1], b = rows[i - 2];
    const row = [];
    for (let k = 0; k < width; k++) row.push((a[0] * (b[k + 1] || 0) - b[0] * (a[k + 1] || 0)) / a[0]);
    row.push(0);
    rows.push(row.map((x) => (isZero(x) ? 0 : x)));
  }
  if (rows.length > n + 1) rows.length = n + 1;
  const first = rows.map((r) => r[0]);
  let changes = 0;
  for (let i = 1; i < first.length; i++) if (Math.sign(first[i]) !== Math.sign(first[i - 1]) && first[i] !== 0 && first[i - 1] !== 0) changes++;
  return { rows: rows.map((r) => r.slice(0, width)), first, changes, notes, usedEps, auxRow, n };
}

export function solve(input) {
  const tf = readTF(input, "p", "Polynomial", { polynomial: true });
  const asc = tf.num.map((c) => c / tf.den[0]);
  let desc = toDescending(asc);
  const n = desc.length - 1;
  if (n < 1) fail("The polynomial must be of at least the first degree.", "p");
  if (desc[0] < 0) desc = desc.map((c) => -c);
  const steps = [{ text: "Characteristic equation:", tex: `${ptex(asc, "s")} = 0` }];
  const missing = desc.some((c) => c === 0), negative = desc.some((c) => c < 0);
  if (missing || negative) steps.push(`The necessary condition is not met: ${negative ? "a negative coefficient exists" : "a zero coefficient exists"}, so the system is not absolutely stable. We continue the table to find the number of unstable roots.`);
  else steps.push("The necessary condition is met: all coefficients exist and are positive. We build the table to confirm.");
  const T = routhTable(desc);
  steps.push("The first two rows are the alternating coefficients of the polynomial, and each row after them is computed by cross-multiplying the two rows above it, divided by the first element of the previous row.");
  for (const note of T.notes) {
    if (note.kind === "eps") steps.push(`In row $s^{${n - note.row}}$ a zero appeared in the first column, so we replaced it with a very small positive number $\\varepsilon$ and continued.`);
    else steps.push({ text: `Row $s^{${n - note.row}}$ is entirely zeros, so we form the auxiliary polynomial from the previous row and replace the zero row with the coefficients of its derivative. This means there are roots symmetric about the origin (they may lie on the imaginary axis):`, tex: `A(s) = ${note.aux.map((c, k) => `${niceTex(c, 6)}s^{${note.order - 2 * k}}`).join(" + ")}` });
  }
  const rs = roots(asc);
  const rhp = rs.filter((r) => r.re > 1e-10 * Math.max(1, Math.hypot(r.re, r.im))).length;
  const jw = rs.filter((r) => Math.abs(r.re) <= 1e-10 * Math.max(1, Math.hypot(r.re, r.im))).length;
  steps.push(`Number of sign changes in the first column = ${T.changes}, which is the number of roots in the right half-plane.`);
  steps.push(`For verification, we computed the roots numerically: ${rhp} in the right half-plane and ${jw} on the imaginary axis.`);
  const verdict = rhp > 0 ? "Unstable" : jw > 0 ? "Marginally stable (roots on the imaginary axis)" : "Stable";
  const rows = T.rows.map((r, i) => [{ tex: `s^{${n - i}}`, th: true }, ...r.map((x, k) => (k === 0 && T.notes.some((q) => q.kind === "eps" && q.row === i) ? { tex: "\\varepsilon" } : fmt(x, 6)))]);
  return {
    results: [
      { label: "Verdict", value: verdict },
      { label: "Sign changes in the first column", value: T.changes },
      { label: "Roots in the right half-plane (RHP)", value: rhp, text: `RHP = ${rhp}` },
      { label: "Roots on the imaginary axis", value: jw }
    ],
    blocks: [{ type: "table", caption: "Routh table", head: ["", ...Array.from({ length: T.rows[0].length }, (_, k) => `Column ${k + 1}`)], rows }],
    steps, copy: `${verdict}, RHP = ${rhp}, sign changes = ${T.changes}`
  };
}
