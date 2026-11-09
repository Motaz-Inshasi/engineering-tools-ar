import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt } from "../core/format.js";
import { nearest, SERIES, TOLERANCE } from "../core/eseries.js";

const S = Object.keys(SERIES).map((k) => [k, `${k} (±${TOLERANCE[k]}%)`]);

export const meta = {
  description: "أوجد أقرب قيمة قياسية لأي مقاومة أو مكثف في سلاسل E6 إلى E192، مع القيمتين الأدنى والأعلى ونسبة الخطأ، وأفضل تركيبة من مقاومتين قياسيتين على التوالي أو التوازي للوصول إلى القيمة بدقة أعلى.",
  keywords: ["القيم القياسية", "E12", "E24", "E96", "E192", "standard values", "أقرب مقاومة", "تركيب مقاومتين"],
  formulas: [
    { label: "قيم السلسلة En في كل عقد", tex: "v_i \\approx 10^{i/n},\\quad i = 0, 1, \\dots, n - 1" },
    { label: "خطأ القيمة المختارة", tex: "\\text{error} = \\frac{R_{std} - R}{R} \\times 100\\%" }
  ],
  inputs: [
    { id: "x", label: "القيمة المطلوبة", unit: "Ω", type: "number", default: "5.1234k" },
    { id: "series", label: "السلسلة", type: "select", default: "E12", options: S },
    { id: "combo", label: "ابحث عن تركيبة من مقاومتين", type: "checkbox", default: "1" }
  ],
  example: { values: { x: "5.1234k", series: "E12", combo: "1" }, expect: ["4.7 kΩ", "5.6 kΩ"], note: "مثال: 5.1234 kΩ غير موجودة في E12." },
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
  const x = num(input, "x", "القيمة", { positive: true });
  const series = choice(input, "series", "السلسلة", Object.keys(SERIES), "E12");
  const combo = !!input.combo && input.combo !== "0";
  const n = nearest(x, series);
  const err = (v) => (100 * (v - x)) / x;
  const steps = [
    `السلسلة ${series} فيها ${SERIES[series].length} قيمة في كل عقد بسماحية ±${TOLERANCE[series]}%: ${SERIES[series].slice(0, 12).join("، ")}${SERIES[series].length > 12 ? "…" : ""}.`,
    `نضع القيمة في عقدها ونبحث عن القيمتين المحيطتين بها: ${eng(n.below, "Ω")} (${fmt(err(n.below), 3)}%) و ${eng(n.above, "Ω")} (+${fmt(err(n.above), 3)}%).`,
    `الأقرب نسبياً (على مقياس لوغاريتمي) هي ${eng(n.closest, "Ω")}.`
  ];
  const results = [
    { label: "الأقرب", value: eng(n.closest, "Ω"), text: `الأقرب: ${eng(n.closest, "Ω")}` },
    { label: "القيمة الأدنى", value: `${eng(n.below, "Ω")} (${fmt(err(n.below), 3)}%)`, text: `الأدنى: ${eng(n.below, "Ω")}` },
    { label: "القيمة الأعلى", value: `${eng(n.above, "Ω")} (+${fmt(err(n.above), 3)}%)`, text: `الأعلى: ${eng(n.above, "Ω")}` }
  ];
  if (combo && n.closest !== x) {
    const c = bestCombo(x, series);
    if (c) {
      const t = `${eng(c.a, "Ω")} ${c.type === "series" ? "+" : "∥"} ${eng(c.b, "Ω")} = ${eng(c.v, "Ω", 5)}`;
      results.push({ label: c.type === "series" ? "أفضل تركيبة توالي" : "أفضل تركيبة توازي", value: `${t} (${fmt(100 * c.err, 3)}%)`, text: t });
      steps.push(`جرّبنا كل قيمة ${series} كمقاومة أولى، وحسبنا الثانية المطلوبة على التوالي أو التوازي ثم قرّبناها؛ أفضل نتيجة: ${t} بخطأ ${fmt(100 * c.err, 3)}%.`);
    }
  }
  return { results, steps, copy: results.map((r) => r.text).join("\n") };
}
