import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { logspaceSafe } from "./common.js";

export const meta = {
  description: "Théorème du transfert maximal de puissance : charge optimale, puissance maximale et rendement à ce point, puissance et rendement pour toute charge choisie, avec la courbe de puissance en fonction de la résistance de charge.",
  keywords: ["Transfert maximal de puissance", "maximum power transfer", "Résistance de charge", "Thévenin", "Rendement", "Adaptation d'impédance"],
  formulas: [
    { label: "Puissance dans la charge", tex: "P_L = \\frac{V_{th}^2 R_L}{(R_{th} + R_L)^2}" },
    { label: "Condition et valeur maximale", tex: "R_L = R_{th} \\Rightarrow P_{max} = \\frac{V_{th}^2}{4R_{th}},\\quad \\eta = 50\\%" }
  ],
  inputs: [
    { id: "Vth", label: "Tension de Thévenin Vth", unit: "V", type: "number", default: "12" },
    { id: "Rth", label: "Résistance de Thévenin Rth", unit: "Ω", type: "number", default: "8" },
    { id: "RL", label: "Résistance de charge de comparaison (facultatif)", unit: "Ω", type: "number", default: "4" }
  ],
  example: { values: { Vth: "12", Rth: "8", RL: "4" }, expect: ["Pmax = 4.5 W"], note: "Exemple : source de 12 V avec une résistance interne de 8 Ω." },
  invalid: { values: { Vth: "12", Rth: "0" } },
  related: ["thevenin-norton", "ohms-law", "transformer"]
};

export function power(Vth, Rth, RL) {
  return (Vth * Vth * RL) / Math.pow(Rth + RL, 2);
}

export function solve(input) {
  const Vth = num(input, "Vth", "Tension de Thévenin", { nonZero: true });
  const Rth = num(input, "Rth", "Résistance de Thévenin", { positive: true });
  const RL = num(input, "RL", "Résistance de charge", { optional: true, nonNegative: true });
  const Pmax = (Vth * Vth) / (4 * Rth);
  const steps = [
    "On dérive $P_L$ par rapport à $R_L$ et on l'annule : la puissance est maximale lorsque la résistance de charge est égale à la résistance de Thévenin.",
    { tex: `R_L = R_{th} = ${ntex(Rth)}\\ \\Omega,\\qquad P_{max} = \\frac{${ntex(Vth)}^2}{4 \\times ${ntex(Rth)}} = ${ntex(Pmax, 6)}\\ W` },
    "En ce point, une puissance égale est dissipée dans la source, donc le rendement n'est que de 50 %. Les systèmes de forte puissance fonctionnent avec un meilleur rendement, avec une charge supérieure à Rth."
  ];
  const results = [{ label: "Résistance de charge optimale", value: eng(Rth, "Ω", 4) }, { label: "Puissance maximale", value: eng(Pmax, "W", 4), text: `Pmax = ${eng(Pmax, "W", 4)}` }, { label: "Rendement à ce point", value: "50%" }];
  if (RL !== null) {
    const P = power(Vth, Rth, RL), eff = RL / (Rth + RL);
    results.push({ label: `Puissance dans la charge ${eng(RL, "Ω")}`, value: eng(P, "W", 4) }, { label: "Rendement pour cette charge", value: `${fmt(100 * eff, 4)}%` }, { label: "Part de la puissance maximale", value: `${fmt((100 * P) / Pmax, 4)}%` });
    steps.push({ text: `Pour la charge ${eng(RL, "Ω")} :`, tex: `P_L = \\frac{${ntex(Vth)}^2 \\times ${ntex(RL)}}{(${ntex(Rth)} + ${ntex(RL)})^2} = ${ntex(P, 6)}\\ W,\\quad \\eta = \\frac{R_L}{R_{th} + R_L} = ${ntex(100 * eff, 4)}\\%` });
  }
  const xs = logspaceSafe(Rth / 100, Rth * 100, 300);
  return {
    results, steps, copy: `RL = ${eng(Rth, "Ω")}, Pmax = ${eng(Pmax, "W", 4)}`,
    blocks: [{ type: "plot", title: "Puissance dans la charge en fonction de sa résistance", logX: true, xLabel: "RL (Ω)", yLabel: "P (W)", series: [{ name: "P(RL)", points: xs.map((x) => [x, power(Vth, Rth, x)]) }], vlines: [{ x: Rth }] }]
  };
}
