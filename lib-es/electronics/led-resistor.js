import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "Calcula la resistencia adecuada para un LED con cualquier tensión de alimentación y cualquier número de LED en serie, con el valor estándar seguro más cercano, la corriente real con ese valor y la potencia requerida de la resistencia.",
  keywords: ["Resistencia LED", "LED", "LED resistor", "Tensión directa", "Corriente del LED", "Resistencia limitadora de corriente"],
  formulas: [{ label: "Resistencia limitadora de corriente", tex: "R = \\frac{V_s - n V_F}{I_F},\\qquad P_R = I_F^2 R" }],
  inputs: [
    { id: "Vs", label: "Tensión de alimentación Vs", unit: "V", type: "number", default: "5" },
    { id: "Vf", label: "Tensión directa por LED", unit: "V", type: "number", default: "2", help: "Aproximadamente: rojo 2, verde/azul/blanco 3 V." },
    { id: "If", label: "Corriente deseada del LED", unit: "A", type: "number", default: "20m" },
    { id: "n", label: "Número de LED en serie", type: "number", default: "1" },
    { id: "series", label: "Serie estándar", type: "select", default: "E12", options: [["E12", "E12"], ["E24", "E24"], ["E96", "E96"]] }
  ],
  example: { values: { Vs: "5", Vf: "2", If: "20m", n: "1", series: "E12" }, expect: ["R = 150 Ω", "150 Ω (E12)"], note: "Ejemplo: LED rojo desde 5 V con 20 mA." },
  invalid: { values: { Vs: "5", Vf: "3", If: "20m", n: "2" } },
  related: ["ohms-law", "resistor-color-code", "standard-resistor-values", "zener-regulator"]
};

export function solve(input) {
  const Vs = num(input, "Vs", "Tensión de alimentación", { positive: true });
  const Vf = num(input, "Vf", "Tensión directa", { positive: true });
  const If = num(input, "If", "Corriente", { positive: true });
  const n = num(input, "n", "Número de LED", { integer: true, min: 1, max: 100 });
  const series = choice(input, "series", "Serie", ["E12", "E24", "E96"], "E12");
  const Vr = Vs - n * Vf;
  if (Vr <= 0) fail(`La tensión de alimentación (${fmt(Vs)} V) no basta para encender ${n} LED en serie (${fmt(n * Vf)} V). Reduzca su número o aumente la tensión.`, "n");
  const R = Vr / If;
  const std = nearest(R, series);
  const Rstd = std.above;
  const Iact = Vr / Rstd, P = Iact * Iact * Rstd;
  const rating = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10].find((w) => w >= 2 * P) ?? 10;
  const steps = [
    { text: "Tensión restante en la resistencia:", tex: `V_R = V_s - nV_F = ${ntex(Vs)} - ${n} \\times ${ntex(Vf)} = ${ntex(Vr, 6)}\\ V` },
    { text: "Resistencia calculada con la ley de Ohm:", tex: `R = \\frac{V_R}{I_F} = \\frac{${ntex(Vr, 6)}}{${ntex(If)}} = ${ntex(R, 6)}\\ \\Omega` },
    `Elegimos el valor estándar ${series} superior más cercano para no superar la corriente deseada: ${eng(Rstd, "Ω")}.`,
    { text: "Corriente real y potencia en la resistencia:", tex: `I = \\frac{${ntex(Vr, 6)}}{${ntex(Rstd)}} = ${ntex(Iact, 5)}\\ A,\\quad P = I^2R = ${ntex(P, 5)}\\ W` },
    `Por seguridad, elegimos una resistencia con al menos el doble de la potencia calculada: ${fmt(rating)} W.`
  ];
  return {
    results: [
      { label: "Resistencia calculada", value: eng(R, "Ω", 4), text: `R = ${eng(R, "Ω", 4)}` },
      { label: `Valor ${series} más cercano y seguro`, value: eng(Rstd, "Ω"), text: `${series}: ${eng(Rstd, "Ω")}` },
      { label: "Corriente real", value: eng(Iact, "A", 4) },
      { label: "Potencia de la resistencia", value: eng(P, "W", 4) },
      { label: "Potencia recomendada de la resistencia", value: `${fmt(rating)} W` },
      { label: "Potencia de cada LED", value: eng(Vf * Iact, "W", 4) }
    ],
    steps, copy: `R = ${eng(R, "Ω", 4)} → ${eng(Rstd, "Ω")} (${series}), I = ${eng(Iact, "A", 4)}, P = ${eng(P, "W", 3)}`
  };
}
