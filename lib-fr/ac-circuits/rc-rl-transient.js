import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Réponse transitoire des circuits RC et RL en charge ou en décharge : constante de temps, équation temporelle de la tension et du courant, valeur à un instant donné et temps nécessaire pour atteindre un pourcentage donné, avec tracé.",
  keywords: ["Constante de temps", "time constant", "Charge du condensateur", "Décharge du condensateur", "Circuit RC", "Circuit RL", "Réponse transitoire", "transient", "τ"],
  formulas: [
    { label: "Constante de temps", tex: "\\tau_{RC} = RC,\\qquad \\tau_{RL} = \\frac{L}{R}" },
    { label: "Forme générale de toute grandeur dans un circuit du premier ordre", tex: "x(t) = x(\\infty) + \\left[x(0) - x(\\infty)\\right]e^{-t/\\tau}" }
  ],
  inputs: [
    { id: "type", label: "Circuit", type: "select", default: "RC", options: [["RC", "RC (tension du condensateur)"], ["RL", "RL (courant de la bobine)"]] },
    { id: "mode", label: "Régime", type: "select", default: "charge", options: [["charge", "Charge (source connectée)"], ["discharge", "Décharge (source retirée)"]] },
    { id: "Vs", label: "Tension de source Vs", unit: "V", type: "number", default: "5" },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10k" },
    { id: "C", label: "C", unit: "F", type: "number", default: "100u", when: { type: ["RC"] } },
    { id: "L", label: "L", unit: "H", type: "number", default: "10m", when: { type: ["RL"] } },
    { id: "t", label: "Instant de calcul de la valeur (facultatif)", unit: "s", type: "number", default: "1" },
    { id: "pct", label: "Pourcentage cible de la valeur finale (facultatif)", unit: "%", type: "number", default: "90" }
  ],
  example: { values: { type: "RC", mode: "charge", Vs: "5", R: "10k", C: "100u", t: "1", pct: "90" }, expect: ["τ = 1 s", "3.161 V"], note: "Exemple : charge d'un condensateur de 100 µF à travers 10 kΩ depuis 5 V." },
  invalid: { values: { type: "RC", mode: "charge", Vs: "5", R: "10k", C: "-1u" } },
  related: ["step-response", "laplace", "passive-filter", "timer-555"]
};

export function solve(input) {
  const type = choice(input, "type", "Circuit", ["RC", "RL"], "RC");
  const mode = choice(input, "mode", "Régime", ["charge", "discharge"], "charge");
  const Vs = num(input, "Vs", "Tension de source", { nonZero: true });
  const R = num(input, "R", "R", { positive: true });
  const tau = type === "RC" ? R * num(input, "C", "C", { positive: true }) : num(input, "L", "L", { positive: true }) / R;
  const t = num(input, "t", "Instant", { optional: true, nonNegative: true });
  const pct = num(input, "pct", "Pourcentage", { optional: true, positive: true, below: 100 });
  const final = type === "RC" ? Vs : Vs / R;
  const unit = type === "RC" ? "V" : "A";
  const qty = type === "RC" ? "v_C" : "i_L";
  const x = mode === "charge" ? (s) => final * (1 - Math.exp(-s / tau)) : (s) => final * Math.exp(-s / tau);
  const steps = [
    { text: "Constante de temps :", tex: type === "RC" ? `\\tau = RC = ${ntex(R)} \\times ${ntex(tau / R)} = ${ntex(tau, 6)}\\ s` : `\\tau = \\frac{L}{R} = \\frac{${ntex(tau * R)}}{${ntex(R)}} = ${ntex(tau, 6)}\\ s` },
    type === "RC" ? "La tension du condensateur ne varie pas instantanément, c'est donc la grandeur appropriée." : "Le courant de la bobine ne varie pas instantanément, c'est donc la grandeur appropriée.",
    mode === "charge"
      ? { text: `Valeur initiale 0 et valeur finale ${eng(final, unit, 5)} :`, tex: `${qty}(t) = ${ntex(final, 6)}\\left(1 - e^{-t/${ntex(tau, 6)}}\\right)` }
      : { text: `Valeur initiale ${eng(final, unit, 5)} et valeur finale 0 :`, tex: `${qty}(t) = ${ntex(final, 6)}\\,e^{-t/${ntex(tau, 6)}}` },
    `Après une constante τ, la réponse atteint ${mode === "charge" ? "63.2%" : "36.8%"} de ${mode === "charge" ? "la valeur finale" : "la valeur initiale"} ; après 5τ = ${eng(5 * tau, "s", 4)}, elle est considérée comme stable (99.3%).`
  ];
  const results = [{ label: "Constante de temps τ", value: eng(tau, "s", 5), text: `τ = ${eng(tau, "s", 5)}` }, { label: "Temps de stabilisation approximatif 5τ", value: eng(5 * tau, "s", 4) }, { label: mode === "charge" ? "la valeur finale" : "la valeur initiale", value: eng(final, unit, 5) }];
  if (t !== null) {
    const v = x(t);
    const other = type === "RC" ? (mode === "charge" ? (Vs - v) / R : -v / R) : mode === "charge" ? Vs - v * R : -v * R;
    results.push({ label: `${type === "RC" ? "Tension du condensateur" : "Courant de la bobine"} à t = ${eng(t, "s")}`, value: eng(v, unit, 4), text: `${qty}(${eng(t, "s")}) = ${eng(v, unit, 4)}` });
    results.push({ label: type === "RC" ? "Courant du circuit à cet instant" : "Tension de la bobine à cet instant", value: eng(other, type === "RC" ? "A" : "V", 4) });
    steps.push({ text: `À $t = ${ntex(t)}$ s :`, tex: `${qty}(${ntex(t)}) = ${ntex(v, 6)}\\ ${unit}` });
  }
  if (pct !== null) {
    const tp = mode === "charge" ? -tau * Math.log(1 - pct / 100) : -tau * Math.log(pct / 100);
    results.push({ label: mode === "charge" ? `Temps pour atteindre ${fmt(pct)}%` : `Temps pour descendre à ${fmt(pct)}%`, value: eng(tp, "s", 4) });
    steps.push({ text: "On résout l'équation pour trouver le temps :", tex: mode === "charge" ? `t = -\\tau\\ln\\left(1 - ${ntex(pct / 100)}\\right) = ${ntex(tp, 6)}\\ s` : `t = -\\tau\\ln(${ntex(pct / 100)}) = ${ntex(tp, 6)}\\ s` });
  }
  if (!isFinite(tau) || tau <= 0) fail("La constante de temps n'est pas valide.", "R");
  return {
    results, steps, copy: results.map((r) => r.text ?? `${r.label}: ${r.value}`).join("\n"),
    blocks: [{ type: "plot", title: type === "RC" ? "Tension du condensateur" : "Courant de la bobine", xLabel: "t (s)", yLabel: `${qty} (${unit})`, includeZero: true, series: [{ name: qty, points: sampleFunction(x, 0, 6 * tau, 400) }], vlines: [{ x: tau }] }]
  };
}
