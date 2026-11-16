import { readTF, tfTex, polesZeros } from "../signals/common.js";
import { numx as num } from "../core/numexpr.js";
import { fail } from "../core/validate.js";
import { padd, peval, roots, trim } from "../core/polynomial.js";
import { cabs } from "../core/complex.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calculez l'erreur en régime permanent d'un système à retour unitaire : type du système, constantes d'erreur Kp, Kv et Ka, et erreur pour un échelon, une rampe et une parabole, après vérification de la stabilité de la boucle fermée.",
  keywords: ["Erreur en régime permanent", "steady state error", "Type du système", "Constante d'erreur", "Kp", "Kv", "Ka", "Retour"],
  formulas: [
    { label: "Constantes d'erreur", tex: "K_p = \\lim_{s\\to0}G(s),\\quad K_v = \\lim_{s\\to0}sG(s),\\quad K_a = \\lim_{s\\to0}s^2G(s)" },
    { label: "Erreur pour une entrée d'amplitude A", tex: "e_{step} = \\frac{A}{1+K_p},\\quad e_{ramp} = \\frac{A}{K_v},\\quad e_{parabola} = \\frac{A}{K_a}" }
  ],
  inputs: [
    { id: "G", label: "Fonction de boucle ouverte G(s)", type: "expr", default: "10(s + 2)/(s(s + 1)(s + 5))", help: "Avec un retour unitaire : T(s) = G/(1+G)." },
    { id: "A", label: "Amplitude d'entrée A", type: "number", default: "1" }
  ],
  example: { values: { G: "10(s + 2)/(s(s + 1)(s + 5))", A: "1" }, expect: ["e_ramp = 0.25"], note: "Exemple : système de type 1, donc l'erreur à l'échelon est nulle et l'erreur à la rampe vaut $1/K_v$." },
  invalid: { values: { G: "1/(s - 1)", A: "1" } },
  related: ["bode-plot", "routh-hurwitz", "transfer-function", "step-response"]
};

export function errorConstants(tf) {
  let den = trim(tf.den), N = 0;
  while (den.length > 1 && Math.abs(den[0]) < 1e-12 * Math.max(...den.map(Math.abs))) { den = den.slice(1); N++; }
  const g0 = peval(tf.num, 0) / den[0];
  const K = [0, 1, 2].map((k) => (N > k ? Infinity : N === k ? g0 : 0));
  return { type: N, Kp: K[0], Kv: K[1], Ka: K[2], g0 };
}

export function solve(input) {
  const tf = readTF(input, "G", "Fonction de boucle ouverte");
  const A = num(input, "A", "Amplitude d'entrée", { nonZero: true });
  const charPoly = padd(tf.den, tf.num);
  const cl = roots(charPoly);
  const unstable = cl.filter((r) => r.re >= -1e-9);
  const steps = [
    { text: "Fonction de boucle ouverte :", tex: `G(s) = ${tfTex(tf)}` },
    { text: "Nous vérifions d'abord la stabilité de la boucle fermée en calculant les racines de l'équation caractéristique $1 + G(s) = 0$ :", tex: `D(s) + N(s) = 0` }
  ];
  if (unstable.length) {
    fail(`La boucle fermée est instable (${unstable.length} racine(s) sur l'axe imaginaire ou à droite de celui-ci) : l'erreur en régime permanent n'a alors pas de sens.`, "G");
  }
  steps.push(`Toutes les racines de la boucle fermée sont dans le demi-plan gauche (la plus lente a une partie réelle égale à ${fmt(Math.max(...cl.map((r) => r.re)), 5)}) : le système est stable, nous poursuivons.`);
  const c = errorConstants(tf);
  steps.push(`Nombre de pôles à l'origine = ${c.type}, donc le système est de type ${c.type}.`);
  const kTex = (v) => (v === Infinity ? "\\infty" : ntex(v, 6));
  steps.push({ text: "Constantes d'erreur :", tex: `K_p = ${kTex(c.Kp)},\\quad K_v = ${kTex(c.Kv)},\\quad K_a = ${kTex(c.Ka)}` });
  const e = (k, kind) => (kind === "step" ? A / (1 + k) : k === Infinity ? 0 : k === 0 ? Infinity : A / k);
  const es = e(c.Kp, "step"), er = e(c.Kv, "ramp"), ep = e(c.Ka, "par");
  steps.push({ text: `On remplace dans les formules avec A = ${fmt(A)} :`, tex: `e_{step} = ${kTex(es)},\\quad e_{ramp} = ${kTex(er)},\\quad e_{parabola} = ${kTex(ep)}` });
  steps.push("Une erreur ∞ signifie que la sortie ne peut pas suivre l'entrée et que l'écart augmente avec le temps.");
  const show = (v) => (v === Infinity ? "∞" : fmt(v, 6));
  return {
    results: [
      { label: "Type du système", value: c.type },
      { label: "Kp", value: show(c.Kp) },
      { label: "Kv", value: show(c.Kv) },
      { label: "Ka", value: show(c.Ka) },
      { label: "Erreur à l'échelon", value: show(es), text: `e_step = ${show(es)}` },
      { label: "Erreur à la rampe", value: show(er), text: `e_ramp = ${show(er)}` },
      { label: "Erreur à la parabole", value: show(ep), text: `e_parabola = ${show(ep)}` }
    ],
    steps,
    copy: `type ${c.type}: e_step = ${show(es)}, e_ramp = ${show(er)}, e_parabola = ${show(ep)}`
  };
}

export { cabs };
