import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt } from "../core/format.js";
import { nearest, SERIES, TOLERANCE } from "../core/eseries.js";

const S = Object.keys(SERIES).map((k) => [k, `${k} (±${TOLERANCE[k]}%)`]);

export const meta = {
  description: "Find the closest standard value of any resistor or capacitor in the E6 to E192 series, with the lower and upper values and the error, and the best combination of two standard resistors in series or in parallel to reach the value more precisely.",
  keywords: ["Standard values", "E12", "E24", "E96", "E192", "standard values", "Closest resistor", "Two-resistor combination"],
  formulas: [
    { label: "En series values in each decade", tex: "v_i \\approx 10^{i/n},\\quad i = 0, 1, \\dots, n - 1" },
    { label: "Error of the chosen value", tex: "\\text{error} = \\frac{R_{std} - R}{R} \\times 100\\%" }
  ],
  inputs: [
    { id: "x", label: "Required value", unit: "Ω", type: "number", default: "5.1234k" },
    { id: "series", label: "Series", type: "select", default: "E12", options: S },
    { id: "combo", label: "Search for a two-resistor combination", type: "checkbox", default: "1" }
  ],
  example: { values: { x: "5.1234k", series: "E12", combo: "1" }, expect: ["4.7 kΩ", "5.6 kΩ"], note: "Example: 5.1234 kΩ does not exist in E12." },
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
  const x = num(input, "x", "Value", { positive: true });
  const series = choice(input, "series", "Series", Object.keys(SERIES), "E12");
  const combo = !!input.combo && input.combo !== "0";
  const n = nearest(x, series);
  const err = (v) => (100 * (v - x)) / x;
  const steps = [
    `The ${series} series has ${SERIES[series].length} values per decade with a tolerance of ±${TOLERANCE[series]}%: ${SERIES[series].slice(0, 12).join("، ")}${SERIES[series].length > 12 ? "…" : ""}.`,
    `We place the value in its decade and find the two values around it: ${eng(n.below, "Ω")} (${fmt(err(n.below), 3)}%) and ${eng(n.above, "Ω")} (+${fmt(err(n.above), 3)}%).`,
    `The closest value in relative terms (on a logarithmic scale) is ${eng(n.closest, "Ω")}.`
  ];
  const results = [
    { label: "Closest", value: eng(n.closest, "Ω"), text: `Closest: ${eng(n.closest, "Ω")}` },
    { label: "Lower value", value: `${eng(n.below, "Ω")} (${fmt(err(n.below), 3)}%)`, text: `Lower: ${eng(n.below, "Ω")}` },
    { label: "Upper value", value: `${eng(n.above, "Ω")} (+${fmt(err(n.above), 3)}%)`, text: `Upper: ${eng(n.above, "Ω")}` }
  ];
  if (combo && n.closest !== x) {
    const c = bestCombo(x, series);
    if (c) {
      const t = `${eng(c.a, "Ω")} ${c.type === "series" ? "+" : "∥"} ${eng(c.b, "Ω")} = ${eng(c.v, "Ω", 5)}`;
      results.push({ label: c.type === "series" ? "Best series combination" : "Best parallel combination", value: `${t} (${fmt(100 * c.err, 3)}%)`, text: t });
      steps.push(`We tried each value ${series} as the first resistor, calculated the required second one in series or in parallel, and rounded it; best result: ${t} with an error of ${fmt(100 * c.err, 3)}%.`);
    }
  }
  return { results, steps, copy: results.map((r) => r.text).join("\n") };
}
