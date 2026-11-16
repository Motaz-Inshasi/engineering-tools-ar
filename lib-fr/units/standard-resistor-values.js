import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt } from "../core/format.js";
import { nearest, SERIES, TOLERANCE } from "../core/eseries.js";

const S = Object.keys(SERIES).map((k) => [k, `${k} (±${TOLERANCE[k]}%)`]);

export const meta = {
  description: "Trouvez la valeur normalisée la plus proche de toute résistance ou tout condensateur des séries E6 à E192, avec les valeurs inférieure et supérieure et l'erreur relative, et la meilleure association de deux valeurs normalisées en série ou en parallèle pour plus de précision.",
  keywords: ["Valeurs normalisées", "E12", "E24", "E96", "E192", "standard values", "Résistance la plus proche", "Association de deux résistances"],
  formulas: [
    { label: "Valeurs de la série En par décade", tex: "v_i \\approx 10^{i/n},\\quad i = 0, 1, \\dots, n - 1" },
    { label: "Erreur de la valeur choisie", tex: "\\text{error} = \\frac{R_{std} - R}{R} \\times 100\\%" }
  ],
  inputs: [
    { id: "x", label: "Valeur demandée", unit: "Ω", type: "number", default: "5.1234k" },
    { id: "series", label: "Série", type: "select", default: "E12", options: S },
    { id: "combo", label: "Rechercher une association de deux résistances", type: "checkbox", default: "1" }
  ],
  example: { values: { x: "5.1234k", series: "E12", combo: "1" }, expect: ["4.7 kΩ", "5.6 kΩ"], note: "Exemple : 5.1234 kΩ n'existe pas dans la série E12." },
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
  const x = num(input, "x", "Valeur", { positive: true });
  const series = choice(input, "series", "Série", Object.keys(SERIES), "E12");
  const combo = !!input.combo && input.combo !== "0";
  const n = nearest(x, series);
  const err = (v) => (100 * (v - x)) / x;
  const steps = [
    `La série ${series} comporte ${SERIES[series].length} valeurs par décade avec une tolérance de ±${TOLERANCE[series]} % : ${SERIES[series].slice(0, 12).join("، ")}${SERIES[series].length > 12 ? "…" : ""}.`,
    `On place la valeur dans sa décade et on cherche les deux valeurs qui l'encadrent : ${eng(n.below, "Ω")} (${fmt(err(n.below), 3)} %) et ${eng(n.above, "Ω")} (+${fmt(err(n.above), 3)} %).`,
    `La plus proche en valeur relative (échelle logarithmique) est ${eng(n.closest, "Ω")}.`
  ];
  const results = [
    { label: "Le plus proche", value: eng(n.closest, "Ω"), text: `Le plus proche : ${eng(n.closest, "Ω")}` },
    { label: "Valeur inférieure", value: `${eng(n.below, "Ω")} (${fmt(err(n.below), 3)}%)`, text: `Inférieure : ${eng(n.below, "Ω")}` },
    { label: "Valeur supérieure", value: `${eng(n.above, "Ω")} (+${fmt(err(n.above), 3)}%)`, text: `Supérieure : ${eng(n.above, "Ω")}` }
  ];
  if (combo && n.closest !== x) {
    const c = bestCombo(x, series);
    if (c) {
      const t = `${eng(c.a, "Ω")} ${c.type === "series" ? "+" : "∥"} ${eng(c.b, "Ω")} = ${eng(c.v, "Ω", 5)}`;
      results.push({ label: c.type === "series" ? "Meilleure association en série" : "Meilleure association en parallèle", value: `${t} (${fmt(100 * c.err, 3)}%)`, text: t });
      steps.push(`Nous avons essayé chaque valeur ${series} comme première résistance, calculé la seconde requise en série ou en parallèle puis arrondi ; meilleur résultat : ${t} avec une erreur de ${fmt(100 * c.err, 3)} %.`);
    }
  }
  return { results, steps, copy: results.map((r) => r.text).join("\n") };
}
