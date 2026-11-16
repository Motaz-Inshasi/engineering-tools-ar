import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "Calculez la résistance adaptée à une LED pour une tension d'alimentation donnée et un nombre de LED en série, avec la valeur normalisée sûre la plus proche, le courant réel obtenu et la puissance requise de la résistance.",
  keywords: ["Résistance de LED", "LED", "LED resistor", "Tension directe", "Courant de LED", "Résistance de limitation de courant"],
  formulas: [{ label: "Résistance de limitation de courant", tex: "R = \\frac{V_s - n V_F}{I_F},\\qquad P_R = I_F^2 R" }],
  inputs: [
    { id: "Vs", label: "Tension d'alimentation Vs", unit: "V", type: "number", default: "5" },
    { id: "Vf", label: "Tension directe par LED", unit: "V", type: "number", default: "2", help: "Environ : rouge 2 V, vert/bleu/blanc 3 V." },
    { id: "If", label: "Courant de LED souhaité", unit: "A", type: "number", default: "20m" },
    { id: "n", label: "Nombre de LED en série", type: "number", default: "1" },
    { id: "series", label: "Série normalisée", type: "select", default: "E12", options: [["E12", "E12"], ["E24", "E24"], ["E96", "E96"]] }
  ],
  example: { values: { Vs: "5", Vf: "2", If: "20m", n: "1", series: "E12" }, expect: ["R = 150 Ω", "150 Ω (E12)"], note: "Exemple : LED rouge alimentée en 5 V avec un courant de 20 mA." },
  invalid: { values: { Vs: "5", Vf: "3", If: "20m", n: "2" } },
  related: ["ohms-law", "resistor-color-code", "standard-resistor-values", "zener-regulator"]
};

export function solve(input) {
  const Vs = num(input, "Vs", "Tension d'alimentation", { positive: true });
  const Vf = num(input, "Vf", "Tension directe", { positive: true });
  const If = num(input, "If", "Courant", { positive: true });
  const n = num(input, "n", "Nombre de LED", { integer: true, min: 1, max: 100 });
  const series = choice(input, "series", "Série", ["E12", "E24", "E96"], "E12");
  const Vr = Vs - n * Vf;
  if (Vr <= 0) fail(`La tension d'alimentation (${fmt(Vs)} V) ne suffit pas pour faire fonctionner ${n} LED en série (${fmt(n * Vf)} V). Réduisez leur nombre ou augmentez la tension.`, "n");
  const R = Vr / If;
  const std = nearest(R, series);
  const Rstd = std.above;
  const Iact = Vr / Rstd, P = Iact * Iact * Rstd;
  const rating = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10].find((w) => w >= 2 * P) ?? 10;
  const steps = [
    { text: "Tension restant aux bornes de la résistance :", tex: `V_R = V_s - nV_F = ${ntex(Vs)} - ${n} \\times ${ntex(Vf)} = ${ntex(Vr, 6)}\\ V` },
    { text: "Résistance calculée avec la loi d'Ohm :", tex: `R = \\frac{V_R}{I_F} = \\frac{${ntex(Vr, 6)}}{${ntex(If)}} = ${ntex(R, 6)}\\ \\Omega` },
    `On choisit la valeur normalisée ${series} immédiatement supérieure, pour ne pas dépasser le courant voulu : ${eng(Rstd, "Ω")}.`,
    { text: "Courant réel et puissance dans la résistance :", tex: `I = \\frac{${ntex(Vr, 6)}}{${ntex(Rstd)}} = ${ntex(Iact, 5)}\\ A,\\quad P = I^2R = ${ntex(P, 5)}\\ W` },
    `On choisit une résistance dont la puissance nominale est au moins le double de la puissance calculée, par sécurité : ${fmt(rating)} W.`
  ];
  return {
    results: [
      { label: "Résistance calculée", value: eng(R, "Ω", 4), text: `R = ${eng(R, "Ω", 4)}` },
      { label: `Valeur normalisée ${series} sûre la plus proche`, value: eng(Rstd, "Ω"), text: `${series}: ${eng(Rstd, "Ω")}` },
      { label: "Courant réel", value: eng(Iact, "A", 4) },
      { label: "Puissance de la résistance", value: eng(P, "W", 4) },
      { label: "Puissance nominale recommandée", value: `${fmt(rating)} W` },
      { label: "Puissance de chaque LED", value: eng(Vf * Iact, "W", 4) }
    ],
    steps, copy: `R = ${eng(R, "Ω", 4)} → ${eng(Rstd, "Ω")} (${series}), I = ${eng(Iact, "A", 4)}, P = ${eng(P, "W", 3)}`
  };
}
