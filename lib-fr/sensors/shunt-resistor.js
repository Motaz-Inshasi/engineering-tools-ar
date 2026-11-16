import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Concevez une mesure de courant par résistance shunt : valeur de la résistance pour une chute de tension donnée, puissance dissipée et estimation de la puissance nominale recommandée, gain d'amplificateur nécessaire pour remplir la plage de l'ADC, et résolution de la mesure en ampères par pas.",
  keywords: ["Shunt", "shunt", "Mesure de courant", "current sense", "Petite résistance", "Amplificateur de courant", "INA", "ADC"],
  formulas: [
    { label: "Résistance shunt et puissance", tex: "R_{sh} = \\frac{V_{sh,max}}{I_{max}},\\qquad P = I_{max}^2 R_{sh}" },
    { label: "Gain et résolution", tex: "G = \\frac{V_{ref}}{V_{sh,max}},\\qquad \\Delta I = \\frac{V_{ref}}{2^N\\, G\\, R_{sh}}" }
  ],
  inputs: [
    { id: "Imax", label: "Courant maximal", unit: "A", type: "number", default: "10" },
    { id: "Vsh", label: "Chute de tension maximale aux bornes du shunt", unit: "V", type: "number", default: "100m", help: "Généralement 50, 75 ou 100 mV." },
    { id: "Vref", label: "Plage de l'ADC", unit: "V", type: "number", default: "3.3" },
    { id: "N", label: "Résolution de l'ADC", unit: "bit", type: "number", default: "12" }
  ],
  example: { values: { Imax: "10", Vsh: "100m", Vref: "3.3", N: "12" }, expect: ["Rsh = 10 mΩ", "G = 33"], note: "Exemple : mesure jusqu'à 10 A avec une chute de 100 mV et un ADC de 12 bits." },
  invalid: { values: { Imax: "10", Vsh: "0", Vref: "3.3", N: "12" } },
  related: ["ohms-law", "adc", "op-amp", "sample-rate-resolution"]
};

export function solve(input) {
  const Imax = num(input, "Imax", "Courant maximal", { positive: true });
  const Vsh = num(input, "Vsh", "Chute de tension du shunt", { positive: true });
  const Vref = num(input, "Vref", "Plage de l'ADC", { positive: true });
  const N = num(input, "N", "Résolution de l'ADC", { integer: true, min: 1, max: 32 });
  const R = Vsh / Imax, P = Imax * Imax * R;
  const rating = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10, 20, 50, 100].find((w) => w >= 2 * P) ?? 2 * P;
  const G = Vref / Vsh;
  const dI = Vref / Math.pow(2, N) / G / R;
  const steps = [
    { text: "Valeur de la résistance d'après la loi d'Ohm au courant maximal :", tex: `R_{sh} = \\frac{${ntex(Vsh)}}{${ntex(Imax)}} = ${ntex(R, 5)}\\ \\Omega` },
    { text: "Puissance dissipée au courant maximal :", tex: `P = I^2 R = ${ntex(Imax)}^2 \\times ${ntex(R, 5)} = ${ntex(P, 5)}\\ W` },
    `On choisit une résistance dont la puissance nominale est au moins le double de cette valeur : ${fmt(rating)} W, avec une tolérance de 1 % ou mieux et un faible coefficient de température, et on la raccorde en montage Kelvin (quatre fils) pour éviter la résistance des connexions.`,
    { text: "Gain de l'amplificateur pour que la chute maximale soit égale à la plage de l'ADC :", tex: `G = \\frac{${ntex(Vref)}}{${ntex(Vsh)}} = ${ntex(G, 5)}` },
    { text: "Plus petite variation de courant détectable :", tex: `\\Delta I = \\frac{${ntex(Vref)}}{2^{${N}} \\times ${ntex(G, 5)} \\times ${ntex(R, 5)}} = ${ntex(dI, 5)}\\ A` }
  ];
  return {
    results: [
      { label: "Résistance shunt", value: eng(R, "Ω", 4), text: `Rsh = ${eng(R, "Ω", 4)}` },
      { label: "Puissance dissipée", value: eng(P, "W", 4) },
      { label: "Puissance recommandée", value: `${fmt(rating)} W` },
      { label: "Gain de l'amplificateur", value: G, sig: 5, text: `G = ${fmt(G, 5)}` },
      { label: "Résolution de la mesure par pas", value: eng(dI, "A", 4) }
    ],
    steps, copy: `Rsh = ${eng(R, "Ω", 4)}, P = ${eng(P, "W", 4)}, G = ${fmt(G, 5)}, ΔI = ${eng(dI, "A", 4)}`
  };
}
