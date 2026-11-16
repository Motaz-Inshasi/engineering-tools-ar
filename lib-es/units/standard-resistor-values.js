import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt } from "../core/format.js";
import { nearest, SERIES, TOLERANCE } from "../core/eseries.js";

const S = Object.keys(SERIES).map((k) => [k, `${k} (±${TOLERANCE[k]}%)`]);

export const meta = {
  description: "Encuentre el valor estándar más cercano de cualquier resistencia o condensador en las series E6 a E192, con los valores inferior y superior y el error, además de la mejor combinación de dos resistencias estándar en serie o en paralelo para lograr mayor precisión.",
  keywords: ["Valores estándar", "E12", "E24", "E96", "E192", "standard values", "Resistencia más cercana", "Combinación de dos resistencias"],
  formulas: [
    { label: "Valores de la serie En en cada década", tex: "v_i \\approx 10^{i/n},\\quad i = 0, 1, \\dots, n - 1" },
    { label: "Error del valor elegido", tex: "\\text{error} = \\frac{R_{std} - R}{R} \\times 100\\%" }
  ],
  inputs: [
    { id: "x", label: "Valor requerido", unit: "Ω", type: "number", default: "5.1234k" },
    { id: "series", label: "Serie", type: "select", default: "E12", options: S },
    { id: "combo", label: "Buscar una combinación de dos resistencias", type: "checkbox", default: "1" }
  ],
  example: { values: { x: "5.1234k", series: "E12", combo: "1" }, expect: ["4.7 kΩ", "5.6 kΩ"], note: "Ejemplo: 5.1234 kΩ no existe en E12." },
  invalid: { values: { x: "0", series: "E12" } },
  related: ["resistor-color-code", "led-resistor", "series-parallel-resistors", "level-shifter"]
};

export function bestCombo(x, series) {
  const base = SERIES[series], div = base[0];
  const vals = [];
  const e0 = Math.floor(Math.log10(x));
  for (let e = e0 - 3; e <= e0 + 1; e++) for (const b of base) vals.push(Number(((b / div) * Math.pow(10, e)).toPrecision(4)));
  let best = null;
  for (const a of vals) {
    if (a < x) {
      const rest = x - a;
      const n = nearest(rest, series);
      for (const b of [n.below, n.above]) if (b) { const v = a + b; const err = Math.abs(v - x) / x; if (!best || err < best.err) best = { type: "series", a, b, v, err }; }
    }
    if (a > x) {
      const rest = 1 / (1 / x - 1 / a);
      const n = nearest(rest, series);
      for (const b of [n.below, n.above]) if (b) { const v = (a * b) / (a + b); const err = Math.abs(v - x) / x; if (!best || err < best.err) best = { type: "parallel", a, b, v, err }; }
    }
  }
  return best;
}

export function solve(input) {
  const x = num(input, "x", "Valor", { positive: true });
  const series = choice(input, "series", "Serie", Object.keys(SERIES), "E12");
  const combo = !!input.combo && input.combo !== "0";
  const n = nearest(x, series);
  const err = (v) => (100 * (v - x)) / x;
  const steps = [
    `La serie ${series} tiene ${SERIES[series].length} valores por década con tolerancia ±${TOLERANCE[series]}%: ${SERIES[series].slice(0, 12).join("، ")}${SERIES[series].length > 12 ? "…" : ""}.`,
    `Ubicamos el valor en su década y buscamos los dos valores que lo rodean: ${eng(n.below, "Ω")} (${fmt(err(n.below), 3)}%) y ${eng(n.above, "Ω")} (+${fmt(err(n.above), 3)}%).`,
    `El más cercano en términos relativos (escala logarítmica) es ${eng(n.closest, "Ω")}.`
  ];
  const results = [
    { label: "Más cercano", value: eng(n.closest, "Ω"), text: `Más cercano: ${eng(n.closest, "Ω")}` },
    { label: "Valor inferior", value: `${eng(n.below, "Ω")} (${fmt(err(n.below), 3)}%)`, text: `Inferior: ${eng(n.below, "Ω")}` },
    { label: "Valor superior", value: `${eng(n.above, "Ω")} (+${fmt(err(n.above), 3)}%)`, text: `Superior: ${eng(n.above, "Ω")}` }
  ];
  if (combo && n.closest !== x) {
    const c = bestCombo(x, series);
    if (c) {
      const t = `${eng(c.a, "Ω")} ${c.type === "series" ? "+" : "∥"} ${eng(c.b, "Ω")} = ${eng(c.v, "Ω", 5)}`;
      results.push({ label: c.type === "series" ? "Mejor combinación en serie" : "Mejor combinación en paralelo", value: `${t} (${fmt(100 * c.err, 3)}%)`, text: t });
      steps.push(`Probamos cada valor de ${series} como primera resistencia, calculamos la segunda necesaria en serie o en paralelo y la redondeamos; mejor resultado: ${t} con un error de ${fmt(100 * c.err, 3)}%.`);
    }
  }
  return { results, steps, copy: results.map((r) => r.text).join("\n") };
}
