import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Puissance complexe en courant alternatif : puissance active, réactive et apparente, facteur de puissance et triangle des puissances, et calcul d'un condensateur de correction du facteur de puissance jusqu'à une valeur cible.",
  keywords: ["Puissance complexe", "Facteur de puissance", "power factor", "Correction du facteur de puissance", "Triangle des puissances", "Puissance active", "Puissance réactive", "kVAR", "Condensateur de correction"],
  formulas: [
    { label: "Triangle des puissances", tex: "S = V I^* = P + jQ,\\quad P = VI\\cos\\theta,\\quad Q = VI\\sin\\theta,\\quad |S|^2 = P^2 + Q^2" },
    { label: "Condensateur de correction", tex: "Q_C = P(\\tan\\theta_1 - \\tan\\theta_2),\\qquad C = \\frac{Q_C}{\\omega V^2}" }
  ],
  inputs: [
    { id: "mode", label: "Données", type: "select", default: "ppf", options: [["ppf", "Puissance active et facteur de puissance"], ["vi", "Tension, courant et déphasage"]] },
    { id: "V", label: "Tension (efficace)", unit: "V", type: "number", default: "400" },
    { id: "P", label: "Puissance active P", unit: "W", type: "number", default: "50k", when: { mode: ["ppf"] } },
    { id: "pf", label: "Facteur de puissance actuel", type: "number", default: "0.7", when: { mode: ["ppf"] } },
    { id: "I", label: "Courant (efficace)", unit: "A", type: "number", default: "10", when: { mode: ["vi"] } },
    { id: "theta", label: "Angle θ = θv − θi", unit: "°", type: "number", default: "36.87", when: { mode: ["vi"] }, help: "Positif pour une charge inductive (courant en retard)." },
    { id: "nature", label: "Nature de la charge", type: "select", default: "lag", options: [["lag", "Inductive (en retard)"], ["lead", "Capacitive (en avance)"]], when: { mode: ["ppf"] } },
    { id: "target", label: "Facteur de puissance cible (facultatif)", type: "number", default: "0.95" },
    { id: "f", label: "Fréquence du réseau", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { mode: "ppf", V: "400", P: "50k", pf: "0.7", nature: "lag", target: "0.95", f: "50" }, expect: ["Qc = 34.58 kVAR"], note: "Exemple : charge de 50 kW avec un facteur de puissance de 0.7 en retard, corrigé à 0.95." },
  invalid: { values: { mode: "ppf", V: "400", P: "50k", pf: "1.3", target: "" } },
  related: ["rlc-circuit", "three-phase", "phasor", "transformer"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Données", ["ppf", "vi"], "ppf");
  const V = num(input, "V", "Tension", { positive: true });
  let P, Q, th;
  const steps = [];
  if (mode === "ppf") {
    P = num(input, "P", "Puissance active", { positive: true });
    const pf = num(input, "pf", "Facteur de puissance", { positive: true, max: 1 });
    const lag = choice(input, "nature", "Nature de la charge", ["lag", "lead"], "lag") === "lag";
    th = (lag ? 1 : -1) * Math.acos(pf);
    Q = P * Math.tan(th);
    steps.push({ text: "Angle de puissance à partir du facteur de puissance :", tex: `\\theta = ${lag ? "" : "-"}\\cos^{-1}(${ntex(pf)}) = ${ntex((th * 180) / Math.PI, 5)}^\\circ` });
    steps.push({ text: "Puissance réactive et apparente :", tex: `Q = P\\tan\\theta = ${ntex(Q, 6)}\\ VAR,\\quad |S| = \\frac{P}{PF} = ${ntex(P / pf, 6)}\\ VA` });
  } else {
    const I = num(input, "I", "Courant", { positive: true });
    const deg = num(input, "theta", "Angle", { min: -90, max: 90 });
    th = (deg * Math.PI) / 180;
    P = V * I * Math.cos(th);
    Q = V * I * Math.sin(th);
    steps.push({ text: "À partir de la tension, du courant et de l'angle :", tex: `P = VI\\cos\\theta = ${ntex(P, 6)}\\ W,\\quad Q = VI\\sin\\theta = ${ntex(Q, 6)}\\ VAR` });
  }
  const S = Math.hypot(P, Q), pf = P / S, I = S / V;
  const nature = Math.abs(Q) < 1e-12 * S ? "Résistive" : Q > 0 ? "Inductive (en retard)" : "Capacitive (en avance)";
  const results = [
    { label: "Puissance active P", value: eng(P, "W", 5) },
    { label: "Puissance réactive Q", value: eng(Q, "VAR", 5) },
    { label: "Puissance apparente |S|", value: eng(S, "VA", 5) },
    { label: "Facteur de puissance", value: `${fmt(pf, 5)} ${nature}` },
    { label: "Courant", value: eng(I, "A", 5) }
  ];
  const target = num(input, "target", "Facteur de puissance cible", { optional: true, positive: true, max: 1 });
  let copy = `P = ${eng(P, "W", 5)}, Q = ${eng(Q, "VAR", 5)}, S = ${eng(S, "VA", 5)}, PF = ${fmt(pf, 5)}`;
  const tri = [[0, 0], [P, 0], [P, Q], [0, 0]];
  const series = [{ name: "Triangle des puissances", points: tri }];
  if (target !== null) {
    if (Q <= 0) fail("La charge n'est pas inductive : la correction par condensateurs ne s'applique pas.", "target");
    if (target <= pf) fail(`Le facteur de puissance cible doit être supérieur à l'actuel (${fmt(pf, 4)}).`, "target");
    const f = num(input, "f", "Fréquence", { positive: true });
    const th2 = Math.acos(target);
    const Q2 = P * Math.tan(th2), Qc = Q - Q2;
    const w = 2 * Math.PI * f;
    const Cap = Qc / (w * V * V);
    const I2 = P / target / V;
    steps.push({ text: "Puissance réactive requise après correction :", tex: `Q_2 = P\\tan(\\cos^{-1}${ntex(target)}) = ${ntex(Q2, 6)}\\ VAR` });
    steps.push({ text: "Le condensateur doit fournir la différence :", tex: `Q_C = Q - Q_2 = ${ntex(Qc, 6)}\\ VAR,\\quad C = \\frac{Q_C}{\\omega V^2} = \\frac{${ntex(Qc, 6)}}{${ntex(w, 6)} \\times ${ntex(V)}^2} = ${ntex(Cap, 6)}\\ F` });
    steps.push(`Après correction, le courant passe de ${eng(I, "A", 4)} à ${eng(I2, "A", 4)} pour la même puissance active. Valeur pour un seul condensateur sous la tension d'entrée (monophasé).`);
    results.push({ label: "Puissance du condensateur requise", value: eng(Qc, "VAR", 4), text: `Qc = ${eng(Qc, "VAR", 4)}` }, { label: "Capacité du condensateur", value: eng(Cap, "F", 4) }, { label: "Courant après correction", value: eng(I2, "A", 4) });
    copy += `\nQc = ${eng(Qc, "VAR", 4)}, C = ${eng(Cap, "F", 4)}`;
    series.push({ name: "Après correction", points: [[0, 0], [P, Q2]], dashed: true });
  }
  return { results, steps, copy, blocks: [{ type: "plot", title: "Triangle des puissances (P horizontal, Q vertical)", xLabel: "P (W)", yLabel: "Q (VAR)", includeZero: true, series }] };
}
