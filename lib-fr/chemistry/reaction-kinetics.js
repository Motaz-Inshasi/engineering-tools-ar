import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const R = 8.314;
const MODES = ["integrated", "arrhenius", "activation"];

export const meta = {
  description: "Analyse de la vitesse de réaction : concentration restante [A]t et temps de demi-vie pour une réaction d'ordre 0, 1 ou 2 avec tracé, constante de vitesse à une autre température (Arrhenius), ou énergie d'activation à partir de deux constantes à deux températures.",
  keywords: ["cinétique chimique", "vitesse de réaction", "ordre de réaction", "demi-vie", "half-life", "constante de vitesse", "Arrhenius", "Arrhenius", "énergie d'activation", "Ea", "kinetics"],
  formulas: [
    { label: "Ordre zéro", tex: "[A]_t = [A]_0 - kt,\\qquad t_{1/2} = \\frac{[A]_0}{2k}" },
    { label: "Premier ordre", tex: "[A]_t = [A]_0 e^{-kt},\\qquad t_{1/2} = \\frac{\\ln 2}{k}" },
    { label: "Second ordre", tex: "\\frac{1}{[A]_t} = \\frac{1}{[A]_0} + kt,\\qquad t_{1/2} = \\frac{1}{k[A]_0}" },
    { label: "Arrhenius", tex: "\\ln\\frac{k_2}{k_1} = -\\frac{E_a}{R}\\left(\\frac{1}{T_2} - \\frac{1}{T_1}\\right)" }
  ],
  inputs: [
    { id: "mode", label: "Type de calcul", type: "select", default: "integrated", options: [["integrated", "Concentration [A] en fonction du temps"], ["arrhenius", "Calcul de k2 à partir de l'énergie d'activation"], ["activation", "Calcul de l'énergie d'activation à partir de k1 et k2"]] },
    { id: "order", label: "ordre de réaction", type: "select", default: "1", options: [["0", "Ordre 0"], ["1", "Ordre 1"], ["2", "Ordre 2"]], when: { mode: ["integrated"] } },
    { id: "k", label: "Constante de vitesse k", type: "number", default: "0.1", when: { mode: ["integrated"] }, help: "Son unité correspond à l'ordre de la réaction et à l'unité de temps t." },
    { id: "A0", label: "Concentration initiale [A]0", type: "number", default: "1", when: { mode: ["integrated"] } },
    { id: "t", label: "Temps t", type: "number", default: "10", when: { mode: ["integrated"] } },
    { id: "k1", label: "Première constante de vitesse k1", type: "number", default: "1", when: { mode: ["arrhenius", "activation"] } },
    { id: "T1", label: "Première température T1", unit: "K", type: "number", default: "300", when: { mode: ["arrhenius", "activation"] } },
    { id: "T2", label: "Deuxième température T2", unit: "K", type: "number", default: "310", when: { mode: ["arrhenius", "activation"] } },
    { id: "Ea", label: "Énergie d'activation Ea", unit: "kJ/mol", type: "number", default: "50", when: { mode: ["arrhenius"] } },
    { id: "k2", label: "Seconde constante de vitesse k2", type: "number", default: "2", when: { mode: ["activation"] } }
  ],
  example: { values: { mode: "integrated", order: "1", k: "0.1", A0: "1", t: "10", k1: "", T1: "", T2: "", Ea: "", k2: "" }, expect: ["0.3679", "6.931"], note: "Exemple : réaction du premier ordre de constante k = 0.1 et de concentration initiale 1, après 10 unités de temps." },
  invalid: { values: { mode: "integrated", order: "1", k: "0", A0: "1", t: "10", k1: "", T1: "", T2: "", Ea: "", k2: "" } },
  related: ["solutions", "ph-calculator", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function conc(order, A0, k, t) {
  if (order === 0) return Math.max(0, A0 - k * t);
  if (order === 1) return A0 * Math.exp(-k * t);
  return 1 / (1 / A0 + k * t);
}

function halfLife(order, A0, k) {
  if (order === 0) return A0 / (2 * k);
  if (order === 1) return Math.LN2 / k;
  return 1 / (k * A0);
}

function integrated(input) {
  const order = Number(choice(input, "order", "Ordre", ["0", "1", "2"], "1"));
  const k = num(input, "k", "Constante de vitesse k", { positive: true });
  const A0 = num(input, "A0", "Concentration initiale [A]0", { positive: true });
  const t = num(input, "t", "Temps t", { nonNegative: true });
  const At = conc(order, A0, k, t);
  const half = halfLife(order, A0, k);
  const results = [
    { label: "Concentration restante [A]t", value: fmt(At, 4) },
    { label: "Temps de demi-vie t½", value: fmt(half, 4) }
  ];
  const steps = [];
  if (order === 0) {
    const raw = A0 - k * t;
    steps.push({ text: "Loi intégrée pour l'ordre zéro :", tex: `[A]_t = [A]_0 - kt = ${ntex(A0)} - ${ntex(k)} \\times ${ntex(t)} = ${ntex(raw, 6)}` });
    if (raw <= 0) {
      const tFull = A0 / k;
      results.push({ label: "Temps de consommation complète t = [A]0/k", value: fmt(tFull, 4) });
      steps.push({ text: "Le réactif a été entièrement consommé avant le temps t, la concentration restante est donc nulle :", tex: `t_{full} = \\frac{[A]_0}{k} = ${ntex(tFull, 6)}` });
    }
    steps.push({ text: "Temps de demi-vie pour l'ordre zéro :", tex: `t_{1/2} = \\frac{[A]_0}{2k} = ${ntex(half, 6)}` });
  } else if (order === 1) {
    steps.push({ text: "Loi intégrée pour le premier ordre :", tex: `[A]_t = [A]_0 e^{-kt} = ${ntex(A0)} e^{-${ntex(k)} \\times ${ntex(t)}} = ${ntex(At, 6)}` });
    steps.push({ text: "Temps de demi-vie pour le premier ordre :", tex: `t_{1/2} = \\frac{\\ln 2}{k} = \\frac{0.693147}{${ntex(k)}} = ${ntex(half, 6)}` });
  } else {
    steps.push({ text: "Loi intégrée pour le second ordre :", tex: `\\frac{1}{[A]_t} = \\frac{1}{${ntex(A0)}} + ${ntex(k)} \\times ${ntex(t)},\\qquad [A]_t = ${ntex(At, 6)}` });
    steps.push({ text: "Temps de demi-vie pour le second ordre :", tex: `t_{1/2} = \\frac{1}{k[A]_0} = ${ntex(half, 6)}` });
  }
  const tMax = Math.max(t, 3 * half);
  const N = 60;
  const points = [];
  for (let i = 0; i <= N; i++) {
    const x = (tMax * i) / N;
    points.push([x, conc(order, A0, k, x)]);
  }
  const blocks = [{ type: "plot", title: `Variation de [A] en fonction du temps (ordre ${order})`, xLabel: "t", yLabel: "[A]", series: [{ name: "[A]", points, line: true }], vlines: [{ x: t }], includeZero: true }];
  return {
    results, steps, blocks,
    copy: `[A]t = ${fmt(At, 4)}، t½ = ${fmt(half, 4)}`
  };
}

function arrhenius(input) {
  const k1 = num(input, "k1", "Première constante de vitesse k1", { positive: true });
  const T1 = num(input, "T1", "Première température T1", { positive: true });
  const T2 = num(input, "T2", "Deuxième température T2", { positive: true });
  const Ea = num(input, "Ea", "Énergie d'activation Ea", { nonNegative: true });
  const lnRatio = (-Ea * 1000 / R) * (1 / T2 - 1 / T1);
  const k2 = k1 * Math.exp(lnRatio);
  return {
    results: [{ label: "Seconde constante de vitesse k2", value: fmt(k2, 4) }],
    steps: [
      { text: "Équation d'Arrhenius entre deux températures :", tex: "\\ln\\frac{k_2}{k_1} = -\\frac{E_a}{R}\\left(\\frac{1}{T_2} - \\frac{1}{T_1}\\right)" },
      { text: "Par substitution, en convertissant Ea en J/mol :", tex: `\\ln\\frac{k_2}{k_1} = -\\frac{${ntex(Ea * 1000)}}{8.314}\\left(\\frac{1}{${ntex(T2)}} - \\frac{1}{${ntex(T1)}}\\right) = ${ntex(lnRatio, 6)}` },
      { text: "Constante de vitesse à T2 :", tex: `k_2 = k_1 e^{${ntex(lnRatio, 6)}} = ${ntex(k1)} \\times ${ntex(Math.exp(lnRatio), 6)} = ${ntex(k2, 6)}` }
    ],
    copy: `k2 = ${fmt(k2, 4)}`
  };
}

function activation(input) {
  const k1 = num(input, "k1", "Première constante de vitesse k1", { positive: true });
  const T1 = num(input, "T1", "Première température T1", { positive: true });
  const k2 = num(input, "k2", "Seconde constante de vitesse k2", { positive: true });
  const T2 = num(input, "T2", "Deuxième température T2", { positive: true });
  if (T1 === T2) fail("T2 doit être différente de T1 pour calculer l'énergie d'activation.", "T2");
  const Ea = (R * Math.log(k2 / k1)) / (1 / T1 - 1 / T2) / 1000;
  return {
    results: [{ label: "Énergie d'activation Ea", value: `${fmt(Ea, 4)} kJ/mol` }],
    steps: [
      { text: "À partir de l'équation d'Arrhenius, on calcule Ea :", tex: "E_a = \\frac{R \\ln(k_2/k_1)}{1/T_1 - 1/T_2}" },
      { text: "En remplaçant :", tex: `E_a = \\frac{8.314 \\times \\ln(${ntex(k2)}/${ntex(k1)})}{1/${ntex(T1)} - 1/${ntex(T2)}} = ${ntex(Ea, 6)}\\ \\text{kJ/mol}` }
    ],
    copy: `Ea = ${fmt(Ea, 4)} kJ/mol`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Type de calcul", MODES, "integrated");
  if (mode === "integrated") return integrated(input);
  if (mode === "arrhenius") return arrhenius(input);
  return activation(input);
}
