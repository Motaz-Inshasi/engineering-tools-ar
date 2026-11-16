import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { niceTex, nice, fmt, tex as ntex } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Résolution de l'équation quadratique ax² + bx + c = 0 par la formule générale avec le discriminant, racines réelles ou complexes, sommet de la parabole, factorisation et tracé.",
  keywords: ["équation quadratique", "équation du second degré", "formule générale", "discriminant", "quadratic", "delta", "sommet de la parabole"],
  formulas: [
    { label: "Formule générale et discriminant", tex: "x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a},\\qquad \\Delta = b^2 - 4ac" },
    { label: "Sommet de la parabole", tex: "x_v = -\\frac{b}{2a},\\qquad y_v = c - \\frac{b^2}{4a}" }
  ],
  inputs: [
    { id: "a", label: "a", type: "number", default: "1" },
    { id: "b", label: "b", type: "number", default: "-3" },
    { id: "c", label: "c", type: "number", default: "2" }
  ],
  example: { values: { a: "2", b: "4", c: "10" }, expect: ["x1 = -1 + 2j", "x2 = -1 - 2j"], note: "Exemple : $2x^2 + 4x + 10 = 0$, son discriminant est négatif, donc ses racines sont complexes." },
  invalid: { values: { a: "0", b: "2", c: "1" } },
  related: ["polynomial-roots", "complex-numbers", "function-plotter"]
};

export function solve(input) {
  const a = num(input, "a", "a"), b = num(input, "b", "b"), c = num(input, "c", "c");
  if (a === 0) fail("a ne peut pas être égal à zéro, sinon l'équation devient linéaire et non quadratique.", "a");
  const D = b * b - 4 * a * c;
  const steps = [
    { text: "L'équation :", tex: `${niceTex(a)}x^2 ${b < 0 ? "-" : "+"} ${niceTex(Math.abs(b))}x ${c < 0 ? "-" : "+"} ${niceTex(Math.abs(c))} = 0` },
    { text: "On calcule le discriminant :", tex: `\\Delta = b^2 - 4ac = (${niceTex(b)})^2 - 4(${niceTex(a)})(${niceTex(c)}) = ${niceTex(D, 10)}` }
  ];
  const xv = -b / (2 * a), yv = c - (b * b) / (4 * a);
  let results, copy;
  const scale = Math.max(b * b, Math.abs(4 * a * c));
  if (Math.abs(D) <= 1e-14 * scale) {
    steps.push({ text: "Le discriminant est nul, l'équation a donc une racine réelle double :", tex: `x = -\\frac{b}{2a} = ${niceTex(xv, 10)}` });
    results = [{ label: "Nature des racines", value: "Réelle double (Δ = 0)" }, { label: "$x$", value: xv, display: nice(xv, 10), text: `x = ${nice(xv, 10)}` }];
    copy = `x = ${nice(xv, 10)} (double)`;
    steps.push({ text: "Factorisation :", tex: `${niceTex(a)}\\left(x ${xv < 0 ? "+" : "-"} ${niceTex(Math.abs(xv))}\\right)^2` });
  } else if (D > 0) {
    const s = Math.sqrt(D);
    const q = -0.5 * (b + Math.sign(b || 1) * s);
    let x1 = q / a, x2 = c / q;
    if (q === 0) { x1 = s / (2 * a); x2 = -s / (2 * a); }
    if (x1 < x2) [x1, x2] = [x2, x1];
    steps.push({ text: "Le discriminant est positif, l'équation a donc deux racines réelles distinctes :", tex: `x = \\frac{${niceTex(-b)} \\pm \\sqrt{${niceTex(D, 10)}}}{${niceTex(2 * a)}}` });
    steps.push({ tex: `x_1 = ${niceTex(x1, 10)},\\qquad x_2 = ${niceTex(x2, 10)}` });
    steps.push(`On a utilisé la forme numériquement stable $x_1 = q/a,\\; x_2 = c/q$ pour éviter la perte de précision. Vérification : $x_1 + x_2 = -b/a = ${niceTex(-b / a, 8)}$ et $x_1 x_2 = c/a = ${niceTex(c / a, 8)}$.`);
    steps.push({ text: "Factorisation en facteurs :", tex: `${niceTex(a)}\\left(x ${x1 < 0 ? "+" : "-"} ${niceTex(Math.abs(x1), 8)}\\right)\\left(x ${x2 < 0 ? "+" : "-"} ${niceTex(Math.abs(x2), 8)}\\right)` });
    results = [{ label: "Nature des racines", value: "Deux racines réelles distinctes (Δ > 0)" }, { label: "$x_1$", value: x1, display: nice(x1, 10), text: `x1 = ${nice(x1, 10)}` }, { label: "$x_2$", value: x2, display: nice(x2, 10), text: `x2 = ${nice(x2, 10)}` }];
    copy = `x1 = ${nice(x1, 10)}\nx2 = ${nice(x2, 10)}`;
  } else {
    const re = xv, im = Math.sqrt(-D) / (2 * Math.abs(a));
    const z = (s) => `${nice(re, 10)} ${s} ${nice(im, 10) === "1" ? "" : nice(im, 10)}j`;
    steps.push({ text: "Le discriminant est négatif, les deux racines sont complexes conjuguées :", tex: `x = \\frac{${niceTex(-b)} \\pm j\\sqrt{${niceTex(-D, 10)}}}{${niceTex(2 * a)}} = ${niceTex(re, 10)} \\pm ${niceTex(im, 10)}j` });
    results = [{ label: "Nature des racines", value: "Complexes conjuguées (Δ < 0)" }, { label: "$x_1$", value: z("+"), text: `x1 = ${z("+")}` }, { label: "$x_2$", value: z("-"), text: `x2 = ${z("-")}` }];
    copy = `x1 = ${z("+")}\nx2 = ${z("-")}`;
  }
  steps.push({ text: "Sommet de la parabole :", tex: `\\left(${ntex(xv, 8)},\\; ${ntex(yv, 8)}\\right),\\ \\text{${a > 0 ? "minimum" : "maximum"}}` });
  results.push({ label: "sommet de la parabole", value: `(${fmt(xv, 8)}, ${fmt(yv, 8)})` });
  const w = Math.max(3, Math.sqrt(Math.abs(D)) / Math.abs(a));
  return {
    results, steps, copy,
    blocks: [{ type: "plot", title: "Parabole", xLabel: "x", yLabel: "y", series: [{ name: "y = ax² + bx + c", points: sampleFunction((x) => a * x * x + b * x + c, xv - w, xv + w, 300) }] }]
  };
}
