import { readTF, tfTex, tfFactorTex, evalTF, polesZeros } from "./common.js";
import { C, cabs, ctex, cfmt } from "../core/complex.js";
import { fmt, niceTex, tex as ntex } from "../core/format.js";
import { degree } from "../core/polynomial.js";

export const meta = {
  description: "Analice la función de transferencia H(s): polos, ceros, ganancia en continua, tipo de sistema, estabilidad, coeficiente de amortiguamiento y frecuencia natural de cada par de polos complejos, con el diagrama de polos y ceros.",
  keywords: ["Función de transferencia", "transfer function", "polos", "ceros", "poles", "zeros", "estabilidad", "diagrama de polos y ceros", "coeficiente de amortiguamiento"],
  formulas: [
    { label: "Forma factorizada", tex: "H(s) = K\\frac{(s - z_1)(s - z_2)\\cdots}{(s - p_1)(s - p_2)\\cdots}" },
    { label: "Estabilidad y par de polos complejos", tex: "\\operatorname{Re}(p_i) < 0\\;\\forall i,\\qquad p = -\\zeta\\omega_n \\pm j\\omega_n\\sqrt{1-\\zeta^2}" }
  ],
  inputs: [
    { id: "G", label: "Función de transferencia H(s)", type: "expr", default: "10(s + 2)/(s^3 + 4s^2 + 13s)", help: "Escríbala como una fracción en s, como (s+1)/(s^2+2s+5). El numerador y el denominador pueden escribirse factorizados." }
  ],
  example: { values: { G: "(s + 3)/(s^2 + 4s + 13)" }, expect: ["p = -2 ± 3j", "z = -3"], note: "Ejemplo: $H(s) = \\frac{s+3}{s^2+4s+13}$ tiene los polos complejos $-2 \\pm 3j$." },
  invalid: { values: { G: "s + 1" } },
  related: ["bode-plot", "step-response", "routh-hurwitz", "laplace"]
};

function pairText(list, sym) {
  const out = [];
  const used = new Set();
  list.forEach((p, i) => {
    if (used.has(i)) return;
    used.add(i);
    const m = p.mult > 1 ? ` (×${p.mult})` : "";
    if (p.root.im !== 0) {
      const j = list.findIndex((q, k) => !used.has(k) && Math.abs(q.root.re - p.root.re) < 1e-9 && Math.abs(q.root.im + p.root.im) < 1e-9);
      if (j >= 0) used.add(j);
      out.push(`${sym} = ${fmt(p.root.re, 8)} ± ${fmt(Math.abs(p.root.im), 8)}j${m}`);
    } else out.push(`${sym} = ${fmt(p.root.re, 8)}${m}`);
  });
  return out;
}

export function stability(poles) {
  const tol = 1e-9;
  if (poles.some((p) => p.root.re > tol)) return { kind: "unstable", text: "Inestable (polo en el semiplano derecho)" };
  const axis = poles.filter((p) => Math.abs(p.root.re) <= tol);
  if (axis.some((p) => p.mult > 1)) return { kind: "unstable", text: "Inestable (polo repetido en el eje imaginario)" };
  if (axis.length) return { kind: "marginal", text: "Marginalmente estable (polos simples en el eje imaginario)" };
  return { kind: "stable", text: "Estable (todos los polos en el semiplano izquierdo)" };
}

export function solve(input) {
  const tf = readTF(input, "G", "Función de transferencia");
  const { zeros, poles } = polesZeros(tf);
  const { lead, nTex, dTex } = tfFactorTex(tf);
  const st = stability(poles);
  const origin = poles.filter((p) => cabs(p.root) < 1e-9).reduce((s, p) => s + p.mult, 0);
  const dc = origin ? Infinity : evalTF(tf, C(0)).re;
  const rel = degree(tf.den) - degree(tf.num);
  const zText = pairText(zeros, "z"), pText = pairText(poles, "p");
  const steps = [
    { text: "Función de transferencia:", tex: `H(s) = ${tfTex(tf)}` },
    { text: "Factorizamos el numerador y el denominador hallando sus raíces:", tex: `H(s) = ${niceTex(lead, 8)}\\,\\frac{${nTex}}{${dTex}}` },
    `Los ceros son las raíces del numerador: ${zText.length ? zText.map((z) => `$${z.replace("±", "\\pm")}$`).join("، ") : "No hay ceros finitos"}.`,
    `Los polos son las raíces del denominador: ${pText.map((p) => `$${p.replace("±", "\\pm")}$`).join("، ")}.`,
    `Estabilidad: ${st.text}.`,
    origin ? `El origen tiene ${origin} polo(s), así que el sistema es de tipo ${origin} y la ganancia en continua es infinita.` : { text: "Ganancia en continua (en s = 0):", tex: `H(0) = ${ntex(dc, 8)}` }
  ];
  const rows = [];
  for (const p of poles) {
    if (p.root.im < 0) continue;
    const wn = cabs(p.root);
    const zeta = wn > 0 ? -p.root.re / wn : NaN;
    rows.push([{ tex: p.root.im ? `${ctex(p.root, 6)}, ${ctex({ re: p.root.re, im: -p.root.im }, 6)}` : ctex(p.root, 6) }, String(p.mult), fmt(wn, 6), p.root.im ? fmt(zeta, 6) : "—", p.root.re < 0 && wn > 0 ? fmt(-1 / p.root.re, 6) : "—"]);
  }
  const pts = (list) => list.flatMap((p) => Array(p.mult).fill([p.root.re, p.root.im]));
  const allPts = [...pts(poles), ...pts(zeros)];
  const m = Math.max(1, ...allPts.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y)))) * 1.3;
  return {
    results: [
      { label: "Ceros", value: zText.join("، ") || "Ninguno" },
      { label: "Polos", value: pText.join("، ") },
      { label: "Estabilidad", value: st.text },
      { label: "Ganancia en continua H(0)", value: dc, sig: 8 },
      { label: "Grado relativo (polos − ceros)", value: rel }
    ],
    blocks: [
      { type: "table", caption: "Propiedades de los polos", head: ["Polo", "Multiplicidad", "ωn", "ζ", "Constante de tiempo τ"], rows },
      { type: "plot", title: "Diagrama de polos (×) y ceros (○)", xLabel: "Re(s) = σ", yLabel: "Im(s) = jω", equalAspect: true, xMin: -m, xMax: m, yMin: -m, yMax: m, series: [{ name: "Polos", points: pts(poles), marker: "x" }, { name: "Ceros", points: pts(zeros), marker: "o", color: "var(--plot-1)" }] }
    ],
    steps,
    copy: `${pText.join("; ")}\n${zText.join("; ") || "no zeros"}\n${st.text}`
  };
}
