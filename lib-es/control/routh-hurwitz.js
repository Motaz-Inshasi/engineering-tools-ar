import { readTF } from "../signals/common.js";
import { roots, toTex as ptex, toDescending } from "../core/polynomial.js";
import { fmt, niceTex } from "../core/format.js";
import { fail } from "../core/validate.js";

export const meta = {
  description: "Comprueba la estabilidad de un sistema con el criterio de Routh-Hurwitz: tabla de Routh completa con los casos especiales (cero en la primera columna y fila completa de ceros), número de raíces en el semiplano derecho y verificación calculando las raíces directamente.",
  keywords: ["Routh", "Hurwitz", "routh", "hurwitz", "Tabla de Routh", "Estabilidad", "stability", "Ecuación característica"],
  formulas: [
    { label: "Cada fila se construye por multiplicación cruzada de las dos filas superiores", tex: "b_i = \\frac{a_{1}\\,a_{2i} - a_{0}\\,a_{2i+1}}{a_{1}}" },
    { label: "Número de raíces en el semiplano derecho = número de cambios de signo en la primera columna", tex: "N_{RHP} = N_{\\text{sign}}" }
  ],
  inputs: [
    { id: "p", label: "Polinomio característico en s", type: "expr", default: "s^4 + 2s^3 + 3s^2 + 4s + 5", help: "Por ejemplo $s^3 + 6s^2 + 11s + 6$ (escriba solo el miembro izquierdo de la ecuación)." }
  ],
  example: { values: { p: "s^4 + 2s^3 + 3s^2 + 4s + 5" }, expect: ["RHP = 2"], note: "Ejemplo clásico: $s^4 + 2s^3 + 3s^2 + 4s + 5$ tiene dos cambios de signo, es decir, dos raíces inestables." },
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
  const tf = readTF(input, "p", "Polinomio", { polynomial: true });
  const asc = tf.num.map((c) => c / tf.den[0]);
  let desc = toDescending(asc);
  const n = desc.length - 1;
  if (n < 1) fail("El polinomio debe ser de grado 1 como mínimo.", "p");
  if (desc[0] < 0) desc = desc.map((c) => -c);
  const steps = [{ text: "Ecuación característica:", tex: `${ptex(asc, "s")} = 0` }];
  const missing = desc.some((c) => c === 0), negative = desc.some((c) => c < 0);
  if (missing || negative) steps.push(`La condición necesaria no se cumple: ${negative ? "hay un coeficiente negativo" : "hay un coeficiente nulo"}, así que el sistema no es estable. Completamos la tabla para contar las raíces inestables.`);
  else steps.push("La condición necesaria se cumple: todos los coeficientes existen y son positivos. Construimos la tabla para confirmarlo.");
  const T = routhTable(desc);
  steps.push("Las dos primeras filas son los coeficientes del polinomio alternados; cada fila siguiente se calcula por multiplicación cruzada de las dos filas superiores, dividida entre el primer elemento de la fila anterior.");
  for (const note of T.notes) {
    if (note.kind === "eps") steps.push(`En la fila $s^{${n - note.row}}$ apareció un cero en la primera columna; lo sustituimos por un número positivo muy pequeño $\\varepsilon$ y continuamos.`);
    else steps.push({ text: `La fila $s^{${n - note.row}}$ es toda de ceros; formamos el polinomio auxiliar con la fila anterior y sustituimos la fila de ceros por los coeficientes de su derivada. Esto indica raíces simétricas respecto al origen (pueden estar en el eje imaginario):`, tex: `A(s) = ${note.aux.map((c, k) => `${niceTex(c, 6)}s^{${note.order - 2 * k}}`).join(" + ")}` });
  }
  const rs = roots(asc);
  const rhp = rs.filter((r) => r.re > 1e-10 * Math.max(1, Math.hypot(r.re, r.im))).length;
  const jw = rs.filter((r) => Math.abs(r.re) <= 1e-10 * Math.max(1, Math.hypot(r.re, r.im))).length;
  steps.push(`Número de cambios de signo en la primera columna = ${T.changes}, que es el número de raíces en el semiplano derecho.`);
  steps.push(`Para comprobarlo, calculamos las raíces numéricamente: ${rhp} en el semiplano derecho y ${jw} en el eje imaginario.`);
  const verdict = rhp > 0 ? "Inestable" : jw > 0 ? "Marginalmente estable (raíces en el eje imaginario)" : "Estable";
  const rows = T.rows.map((r, i) => [{ tex: `s^{${n - i}}`, th: true }, ...r.map((x, k) => (k === 0 && T.notes.some((q) => q.kind === "eps" && q.row === i) ? { tex: "\\varepsilon" } : fmt(x, 6)))]);
  return {
    results: [
      { label: "Veredicto", value: verdict },
      { label: "Cambios de signo en la primera columna", value: T.changes },
      { label: "Raíces en el semiplano derecho (RHP)", value: rhp, text: `RHP = ${rhp}` },
      { label: "Raíces en el eje imaginario", value: jw }
    ],
    blocks: [{ type: "table", caption: "Tabla de Routh", head: ["", ...Array.from({ length: T.rows[0].length }, (_, k) => `Columna ${k + 1}`)], rows }],
    steps, copy: `${verdict}, RHP = ${rhp}, sign changes = ${T.changes}`
  };
}
