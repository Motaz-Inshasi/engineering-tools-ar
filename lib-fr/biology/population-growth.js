import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const LN2 = Math.LN2;
const SAMPLES = 200;
const LABELS = { exp: "Croissance exponentielle", logistic: "Croissance logistique", geom: "Croissance géométrique discrète" };

export const meta = {
  description: "Calculez l'effectif d'une population après une durée donnée selon le modèle exponentiel, logistique ou géométrique discret, avec le temps de doublement ou le temps d'atteinte de la moitié de la capacité limite, et un graphique de croissance.",
  keywords: ["Croissance de la population", "Croissance exponentielle", "Croissance logistique", "Capacité limite", "Temps de doublement", "population growth", "exponential", "logistic", "geometric"],
  formulas: [
    { label: "Modèle exponentiel", tex: "N = N_0 e^{rt}" },
    { label: "Modèle logistique", tex: "N = \\frac{K}{1 + \\frac{K - N_0}{N_0} e^{-rt}}" },
    { label: "Modèle géométrique discret", tex: "N = N_0 (1 + r)^t" }
  ],
  inputs: [
    { id: "model", label: "Modèle", type: "select", default: "exp", options: [["exp", "Exponentiel : N = N0 e^{rt}"], ["logistic", "Logistique : N = K / (1 + ((K − N0)/N0) e^{−rt})"], ["geom", "Géométrique discret : N = N0 (1 + r)^t"]] },
    { id: "N0", label: "Effectif initial de la population N0", unit: "individus", type: "number", default: "100" },
    { id: "r", label: "Taux de croissance r", unit: "1/unité de temps", type: "number", default: "0.1", help: "Dans le modèle exponentiel, r peut être négatif (décroissance). Dans le modèle géométrique discret, r doit être supérieur à -1." },
    { id: "t", label: "Temps t", unit: "unité de temps", type: "number", default: "10", help: "Dans le modèle géométrique, t doit être un nombre entier de générations." },
    { id: "K", label: "Capacité limite K", unit: "individus", type: "number", default: "1000", when: { model: ["logistic"] } }
  ],
  example: { values: { model: "exp", N0: "100", r: "0.1", t: "10", K: "1000" }, expect: ["271.8", "6.931"], note: "Exemple : N0 = 100, r = 0.1 et t = 10 dans le modèle exponentiel." },
  invalid: { values: { model: "geom", N0: "100", r: "-1", t: "5", K: "1000" } },
  related: ["serial-dilution", "hardy-weinberg"]
};

export function solve(input) {
  const model = choice(input, "model", "Modèle", ["exp", "logistic", "geom"], "exp");
  const N0 = num(input, "N0", "Effectif initial de la population N0", { positive: true });
  const r = num(input, "r", "Taux de croissance r", {});
  const t = num(input, "t", "Temps t", { nonNegative: true });
  const K = model === "logistic" ? num(input, "K", "Capacité limite K", { positive: true }) : null;
  if (model === "geom") {
    if (!(1 + r > 0)) fail("Dans le modèle géométrique, r doit être supérieur à -1.", "r");
    if (!Number.isInteger(t)) fail("Dans le modèle géométrique, le temps doit être un nombre entier de générations.", "t");
  }
  const at = (x) => {
    if (model === "exp") return N0 * Math.exp(r * x);
    if (model === "logistic") return K / (1 + ((K - N0) / N0) * Math.exp(-r * x));
    return N0 * Math.pow(1 + r, x);
  };
  const Nt = at(t);
  if (!Number.isFinite(Nt)) fail("La valeur de N(t) dépasse les limites de calcul ; diminuez t ou r.", "t");
  const label = LABELS[model];
  const results = [{ label: "Effectif de la population au temps t", value: fmt(Nt, 4) }];
  const steps = [];
  let doubling = null;
  let halfLife = null;
  let copyExtra = "";
  if (model === "exp") {
    if (r > 0) doubling = LN2 / r;
    if (r < 0) halfLife = LN2 / -r;
  }
  if (model === "geom" && r > 0) doubling = LN2 / Math.log(1 + r);
  if (doubling !== null) {
    results.push({ label: "Temps de doublement", value: fmt(doubling, 4) });
    copyExtra = `, temps de doublement = ${fmt(doubling, 4)}`;
  }
  if (halfLife !== null) {
    results.push({ label: "Temps de demi-vie", value: fmt(halfLife, 4) });
    copyExtra = `, temps de demi-vie = ${fmt(halfLife, 4)}`;
  }
  if (model === "logistic") {
    const A = (K - N0) / N0;
    const tHalf = A > 0 && r !== 0 ? Math.log(A) / r : NaN;
    const ok = Number.isFinite(tHalf) && tHalf >= 0;
    results.push({ label: "Temps d'atteinte de K/2", value: ok ? fmt(tHalf, 4) : "Non applicable" });
    if (ok) copyExtra = `, temps d'atteinte de K/2 = ${fmt(tHalf, 4)}`;
  }
  if (model === "exp") {
    steps.push({ text: "On remplace dans la formule exponentielle :", tex: `N = N_0 e^{rt} = ${ntex(N0)} \\times e^{${ntex(r)} \\times ${ntex(t)}} = ${ntex(Nt, 6)}` });
    if (doubling !== null) steps.push({ text: "Temps de doublement :", tex: `T_d = \\frac{\\ln 2}{r} = \\frac{${ntex(LN2, 6)}}{${ntex(r)}} = ${ntex(doubling, 6)}` });
  } else if (model === "logistic") {
    steps.push({ text: "On remplace dans la formule logistique :", tex: `N = \\frac{K}{1 + \\frac{K-N_0}{N_0} e^{-rt}} = \\frac{${ntex(K)}}{1 + ${ntex((K - N0) / N0, 6)} e^{${ntex(-r * t, 6)}}} = ${ntex(Nt, 6)}` });
  } else {
    steps.push({ text: "On remplace dans la formule géométrique :", tex: `N = N_0 (1+r)^t = ${ntex(N0)} \\times (${ntex(1 + r)})^{${ntex(t)}} = ${ntex(Nt, 6)}` });
    if (doubling !== null) steps.push({ text: "Temps de doublement du modèle géométrique :", tex: `T_d = \\frac{\\ln 2}{\\ln(1+r)} = ${ntex(doubling, 6)}` });
  }
  const xs = [];
  if (model === "geom") {
    const s = Math.max(1, Math.ceil(t / SAMPLES));
    for (let k = 0; k <= t; k += s) xs.push(k);
    if (xs[xs.length - 1] !== t) xs.push(t);
  } else {
    for (let i = 0; i <= SAMPLES; i++) xs.push((t * i) / SAMPLES);
  }
  const blocks = [];
  if (t > 0) {
    const plot = { type: "plot", title: `N(t) — ${label}`, xLabel: "t", yLabel: "N", includeZero: true, series: [{ name: "N(t)", points: xs.map((x) => [x, at(x)]) }] };
    if (K !== null) plot.hlines = [{ y: K }, { y: K / 2 }];
    blocks.push(plot);
  }
  return {
    results,
    steps,
    copy: `${label}: N(${fmt(t, 6)}) = ${fmt(Nt, 4)}${copyExtra}`,
    blocks
  };
}
