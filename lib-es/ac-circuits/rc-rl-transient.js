import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Respuesta transitoria de circuitos RC y RL en carga y descarga: constante de tiempo, ecuación temporal de tensión y corriente, valor en cualquier instante y tiempo para alcanzar un porcentaje dado, con gráfica.",
  keywords: ["Constante de tiempo", "time constant", "Carga del condensador", "Descarga del condensador", "Circuito RC", "Circuito RL", "Respuesta transitoria", "transient", "τ"],
  formulas: [
    { label: "Constante de tiempo", tex: "\\tau_{RC} = RC,\\qquad \\tau_{RL} = \\frac{L}{R}" },
    { label: "Fórmula general de cualquier variable en un circuito de primer orden", tex: "x(t) = x(\\infty) + \\left[x(0) - x(\\infty)\\right]e^{-t/\\tau}" }
  ],
  inputs: [
    { id: "type", label: "Circuito", type: "select", default: "RC", options: [["RC", "RC (tensión del condensador)"], ["RL", "RL (corriente de la bobina)"]] },
    { id: "mode", label: "Caso", type: "select", default: "charge", options: [["charge", "Carga (conexión de la fuente)"], ["discharge", "Descarga (retirada de la fuente)"]] },
    { id: "Vs", label: "Tensión de la fuente Vs", unit: "V", type: "number", default: "5" },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10k" },
    { id: "C", label: "C", unit: "F", type: "number", default: "100u", when: { type: ["RC"] } },
    { id: "L", label: "L", unit: "H", type: "number", default: "10m", when: { type: ["RL"] } },
    { id: "t", label: "Instante para calcular el valor (opcional)", unit: "s", type: "number", default: "1" },
    { id: "pct", label: "Porcentaje objetivo del valor final (opcional)", unit: "%", type: "number", default: "90" }
  ],
  example: { values: { type: "RC", mode: "charge", Vs: "5", R: "10k", C: "100u", t: "1", pct: "90" }, expect: ["τ = 1 s", "3.161 V"], note: "Ejemplo: carga de un condensador de 100 µF a través de 10 kΩ desde 5 V." },
  invalid: { values: { type: "RC", mode: "charge", Vs: "5", R: "10k", C: "-1u" } },
  related: ["step-response", "laplace", "passive-filter", "timer-555"]
};

export function solve(input) {
  const type = choice(input, "type", "Circuito", ["RC", "RL"], "RC");
  const mode = choice(input, "mode", "Caso", ["charge", "discharge"], "charge");
  const Vs = num(input, "Vs", "Tensión de la fuente", { nonZero: true });
  const R = num(input, "R", "R", { positive: true });
  const tau = type === "RC" ? R * num(input, "C", "C", { positive: true }) : num(input, "L", "L", { positive: true }) / R;
  const t = num(input, "t", "Instante", { optional: true, nonNegative: true });
  const pct = num(input, "pct", "Porcentaje", { optional: true, positive: true, below: 100 });
  const final = type === "RC" ? Vs : Vs / R;
  const unit = type === "RC" ? "V" : "A";
  const qty = type === "RC" ? "v_C" : "i_L";
  const x = mode === "charge" ? (s) => final * (1 - Math.exp(-s / tau)) : (s) => final * Math.exp(-s / tau);
  const steps = [
    { text: "Constante de tiempo:", tex: type === "RC" ? `\\tau = RC = ${ntex(R)} \\times ${ntex(tau / R)} = ${ntex(tau, 6)}\\ s` : `\\tau = \\frac{L}{R} = \\frac{${ntex(tau * R)}}{${ntex(R)}} = ${ntex(tau, 6)}\\ s` },
    type === "RC" ? "La tensión del condensador no cambia instantáneamente, por lo que es la variable adecuada." : "La corriente de la bobina no cambia instantáneamente, por lo que es la variable adecuada.",
    mode === "charge"
      ? { text: `Valor inicial 0 y valor final ${eng(final, unit, 5)}:`, tex: `${qty}(t) = ${ntex(final, 6)}\\left(1 - e^{-t/${ntex(tau, 6)}}\\right)` }
      : { text: `Valor inicial ${eng(final, unit, 5)} y valor final 0:`, tex: `${qty}(t) = ${ntex(final, 6)}\\,e^{-t/${ntex(tau, 6)}}` },
    `Tras una τ la respuesta alcanza ${mode === "charge" ? "63.2%" : "36.8%"} de ${mode === "charge" ? "valor final" : "valor inicial"}, y tras 5τ = ${eng(5 * tau, "s", 4)} se considera estable (99.3%).`
  ];
  const results = [{ label: "Constante de tiempo τ", value: eng(tau, "s", 5), text: `τ = ${eng(tau, "s", 5)}` }, { label: "Tiempo de estabilización aproximado 5τ", value: eng(5 * tau, "s", 4) }, { label: mode === "charge" ? "valor final" : "valor inicial", value: eng(final, unit, 5) }];
  if (t !== null) {
    const v = x(t);
    const other = type === "RC" ? (mode === "charge" ? (Vs - v) / R : -v / R) : mode === "charge" ? Vs - v * R : -v * R;
    results.push({ label: `${type === "RC" ? "Tensión del condensador" : "Corriente de la bobina"} en t = ${eng(t, "s")}`, value: eng(v, unit, 4), text: `${qty}(${eng(t, "s")}) = ${eng(v, unit, 4)}` });
    results.push({ label: type === "RC" ? "Corriente del circuito en ese instante" : "Tensión de la bobina en ese instante", value: eng(other, type === "RC" ? "A" : "V", 4) });
    steps.push({ text: `En $t = ${ntex(t)}$ s:`, tex: `${qty}(${ntex(t)}) = ${ntex(v, 6)}\\ ${unit}` });
  }
  if (pct !== null) {
    const tp = mode === "charge" ? -tau * Math.log(1 - pct / 100) : -tau * Math.log(pct / 100);
    results.push({ label: mode === "charge" ? `Tiempo para alcanzar el ${fmt(pct)}%` : `Tiempo para descender al ${fmt(pct)}%`, value: eng(tp, "s", 4) });
    steps.push({ text: "Resolvemos la ecuación para hallar el tiempo:", tex: mode === "charge" ? `t = -\\tau\\ln\\left(1 - ${ntex(pct / 100)}\\right) = ${ntex(tp, 6)}\\ s` : `t = -\\tau\\ln(${ntex(pct / 100)}) = ${ntex(tp, 6)}\\ s` });
  }
  if (!isFinite(tau) || tau <= 0) fail("La constante de tiempo no es válida.", "R");
  return {
    results, steps, copy: results.map((r) => r.text ?? `${r.label}: ${r.value}`).join("\n"),
    blocks: [{ type: "plot", title: type === "RC" ? "Tensión del condensador" : "Corriente de la bobina", xLabel: "t (s)", yLabel: `${qty} (${unit})`, includeZero: true, series: [{ name: qty, points: sampleFunction(x, 0, 6 * tau, 400) }], vlines: [{ x: tau }] }]
  };
}
