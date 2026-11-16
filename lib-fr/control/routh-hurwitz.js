import { readTF } from "../signals/common.js";
import { roots, toTex as ptex, toDescending } from "../core/polynomial.js";
import { fmt, niceTex } from "../core/format.js";
import { fail } from "../core/validate.js";

export const meta = {
  description: "Étudiez la stabilité d'un système par le critère de Routh-Hurwitz : tableau de Routh complet avec les deux cas particuliers (zéro en première colonne, ligne entièrement nulle), nombre de racines dans le demi-plan droit, avec vérification par le calcul direct des racines.",
  keywords: ["Routh", "Hurwitz", "routh", "hurwitz", "Tableau de Routh", "Stabilité", "stability", "Équation caractéristique"],
  formulas: [
    { label: "Chaque ligne est construite par multiplication croisée des deux lignes au-dessus", tex: "b_i = \\frac{a_{1}\\,a_{2i} - a_{0}\\,a_{2i+1}}{a_{1}}" },
    { label: "Nombre de racines dans le demi-plan droit = nombre de changements de signe dans la première colonne", tex: "N_{RHP} = N_{\\text{sign}}" }
  ],
  inputs: [
    { id: "p", label: "Polynôme caractéristique en s", type: "expr", default: "s^4 + 2s^3 + 3s^2 + 4s + 5", help: "Par exemple $s^3 + 6s^2 + 11s + 6$ (saisissez uniquement le membre de gauche de l'équation)." }
  ],
  example: { values: { p: "s^4 + 2s^3 + 3s^2 + 4s + 5" }, expect: ["RHP = 2"], note: "Exemple classique : $s^4 + 2s^3 + 3s^2 + 4s + 5$ présente deux changements de signe, soit deux racines instables." },
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
  const tf = readTF(input, "p", "Polynôme", { polynomial: true });
  const asc = tf.num.map((c) => c / tf.den[0]);
  let desc = toDescending(asc);
  const n = desc.length - 1;
  if (n < 1) fail("Le polynôme doit être au moins de degré 1.", "p");
  if (desc[0] < 0) desc = desc.map((c) => -c);
  const steps = [{ text: "Équation caractéristique :", tex: `${ptex(asc, "s")} = 0` }];
  const missing = desc.some((c) => c === 0), negative = desc.some((c) => c < 0);
  if (missing || negative) steps.push(`La condition nécessaire n'est pas vérifiée : ${negative ? "il existe un coefficient négatif" : "il existe un coefficient nul"}, donc le système n'est pas strictement stable. Nous poursuivons le tableau pour déterminer le nombre de racines instables.`);
  else steps.push("La condition nécessaire est vérifiée : tous les coefficients sont présents et positifs. Nous construisons le tableau pour confirmer.");
  const T = routhTable(desc);
  steps.push("Les deux premières lignes sont formées en alternant les coefficients du polynôme ; chaque ligne suivante est calculée par multiplication croisée des deux lignes au-dessus, divisée par le premier élément de la ligne précédente.");
  for (const note of T.notes) {
    if (note.kind === "eps") steps.push(`Dans la ligne $s^{${n - note.row}}$, un zéro apparaît dans la première colonne ; on le remplace par un nombre positif très petit $\\varepsilon$ et on poursuit le calcul.`);
    else steps.push({ text: `La ligne $s^{${n - note.row}}$ est entièrement nulle : on forme le polynôme auxiliaire à partir de la ligne précédente et on remplace la ligne nulle par les coefficients de sa dérivée. Cela signifie qu'il existe des racines symétriques par rapport à l'origine (elles peuvent se trouver sur l'axe imaginaire) :`, tex: `A(s) = ${note.aux.map((c, k) => `${niceTex(c, 6)}s^{${note.order - 2 * k}}`).join(" + ")}` });
  }
  const rs = roots(asc);
  const rhp = rs.filter((r) => r.re > 1e-10 * Math.max(1, Math.hypot(r.re, r.im))).length;
  const jw = rs.filter((r) => Math.abs(r.re) <= 1e-10 * Math.max(1, Math.hypot(r.re, r.im))).length;
  steps.push(`Nombre de changements de signe dans la première colonne = ${T.changes}, soit le nombre de racines dans le demi-plan droit.`);
  steps.push(`Pour vérifier, nous avons calculé les racines numériquement : ${rhp} dans le demi-plan droit et ${jw} sur l'axe imaginaire.`);
  const verdict = rhp > 0 ? "Instable" : jw > 0 ? "Marginalement stable (racines sur l'axe imaginaire)" : "Stable";
  const rows = T.rows.map((r, i) => [{ tex: `s^{${n - i}}`, th: true }, ...r.map((x, k) => (k === 0 && T.notes.some((q) => q.kind === "eps" && q.row === i) ? { tex: "\\varepsilon" } : fmt(x, 6)))]);
  return {
    results: [
      { label: "Verdict", value: verdict },
      { label: "Changements de signe dans la première colonne", value: T.changes },
      { label: "Racines dans le demi-plan droit (RHP)", value: rhp, text: `RHP = ${rhp}` },
      { label: "Racines sur l'axe imaginaire", value: jw }
    ],
    blocks: [{ type: "table", caption: "Tableau de Routh", head: ["", ...Array.from({ length: T.rows[0].length }, (_, k) => `Colonne ${k + 1}`)], rows }],
    steps, copy: `${verdict}, RHP = ${rhp}, sign changes = ${T.changes}`
  };
}
