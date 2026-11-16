import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "RC اور RL سرکٹس کا عبوری رسپانس چارجنگ یا ڈسچارجنگ کے دوران: ٹائم کانسٹنٹ، وولٹیج اور کرنٹ کی ٹائم مساوات، کسی بھی لمحے کی قدر، اور مطلوبہ فیصد تک پہنچنے کا وقت، ساتھ گراف۔",
  keywords: ["ٹائم کانسٹنٹ", "time constant", "کیپیسٹر کی چارجنگ", "کیپیسٹر کی ڈسچارجنگ", "RC سرکٹ", "RL سرکٹ", "عبوری رسپانس", "transient", "τ"],
  formulas: [
    { label: "ٹائم کانسٹنٹ", tex: "\\tau_{RC} = RC,\\qquad \\tau_{RL} = \\frac{L}{R}" },
    { label: "پہلے درجے کے سرکٹ میں کسی بھی مقدار کا عمومی فارمولا", tex: "x(t) = x(\\infty) + \\left[x(0) - x(\\infty)\\right]e^{-t/\\tau}" }
  ],
  inputs: [
    { id: "type", label: "سرکٹ", type: "select", default: "RC", options: [["RC", "RC (کیپیسٹر وولٹیج)"], ["RL", "RL (انڈکٹر کرنٹ)"]] },
    { id: "mode", label: "حالت", type: "select", default: "charge", options: [["charge", "چارجنگ (سورس جوڑا گیا)"], ["discharge", "ڈسچارجنگ (سورس ہٹایا گیا)"]] },
    { id: "Vs", label: "سورس وولٹیج Vs", unit: "V", type: "number", default: "5" },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10k" },
    { id: "C", label: "C", unit: "F", type: "number", default: "100u", when: { type: ["RC"] } },
    { id: "L", label: "L", unit: "H", type: "number", default: "10m", when: { type: ["RL"] } },
    { id: "t", label: "قدر معلوم کرنے کا لمحہ (اختیاری)", unit: "s", type: "number", default: "1" },
    { id: "pct", label: "حتمی قدر کا مطلوبہ فیصد (اختیاری)", unit: "%", type: "number", default: "90" }
  ],
  example: { values: { type: "RC", mode: "charge", Vs: "5", R: "10k", C: "100u", t: "1", pct: "90" }, expect: ["τ = 1 s", "3.161 V"], note: "مثال: 5 V سے 10 kΩ کے ذریعے 100 µF کیپیسٹر کی چارجنگ۔" },
  invalid: { values: { type: "RC", mode: "charge", Vs: "5", R: "10k", C: "-1u" } },
  related: ["step-response", "laplace", "passive-filter", "timer-555"]
};

export function solve(input) {
  const type = choice(input, "type", "سرکٹ", ["RC", "RL"], "RC");
  const mode = choice(input, "mode", "حالت", ["charge", "discharge"], "charge");
  const Vs = num(input, "Vs", "سورس وولٹیج", { nonZero: true });
  const R = num(input, "R", "R", { positive: true });
  const tau = type === "RC" ? R * num(input, "C", "C", { positive: true }) : num(input, "L", "L", { positive: true }) / R;
  const t = num(input, "t", "لمحہ", { optional: true, nonNegative: true });
  const pct = num(input, "pct", "فیصد", { optional: true, positive: true, below: 100 });
  const final = type === "RC" ? Vs : Vs / R;
  const unit = type === "RC" ? "V" : "A";
  const qty = type === "RC" ? "v_C" : "i_L";
  const x = mode === "charge" ? (s) => final * (1 - Math.exp(-s / tau)) : (s) => final * Math.exp(-s / tau);
  const steps = [
    { text: "ٹائم کانسٹنٹ:", tex: type === "RC" ? `\\tau = RC = ${ntex(R)} \\times ${ntex(tau / R)} = ${ntex(tau, 6)}\\ s` : `\\tau = \\frac{L}{R} = \\frac{${ntex(tau * R)}}{${ntex(R)}} = ${ntex(tau, 6)}\\ s` },
    type === "RC" ? "کیپیسٹر وولٹیج اچانک تبدیل نہیں ہوتا، اس لیے یہی مناسب مقدار ہے۔" : "انڈکٹر کرنٹ اچانک تبدیل نہیں ہوتا، اس لیے یہی مناسب مقدار ہے۔",
    mode === "charge"
      ? { text: `ابتدائی قدر 0 اور حتمی قدر ${eng(final, unit, 5)}:`, tex: `${qty}(t) = ${ntex(final, 6)}\\left(1 - e^{-t/${ntex(tau, 6)}}\\right)` }
      : { text: `ابتدائی قدر ${eng(final, unit, 5)} اور حتمی قدر 0:`, tex: `${qty}(t) = ${ntex(final, 6)}\\,e^{-t/${ntex(tau, 6)}}` },
    `ایک τ کے بعد رسپانس ${mode === "charge" ? "حتمی قدر" : "ابتدائی قدر"} کا ${mode === "charge" ? "63.2%" : "36.8%"} تک پہنچ جاتا ہے، اور 5τ = ${eng(5 * tau, "s", 4)} کے بعد اسے مستحکم سمجھا جاتا ہے (99.3%)۔`
  ];
  const results = [{ label: "ٹائم کانسٹنٹ τ", value: eng(tau, "s", 5), text: `τ = ${eng(tau, "s", 5)}` }, { label: "تقریباً سیٹلنگ ٹائم 5τ", value: eng(5 * tau, "s", 4) }, { label: mode === "charge" ? "حتمی قدر" : "ابتدائی قدر", value: eng(final, unit, 5) }];
  if (t !== null) {
    const v = x(t);
    const other = type === "RC" ? (mode === "charge" ? (Vs - v) / R : -v / R) : mode === "charge" ? Vs - v * R : -v * R;
    results.push({ label: `${type === "RC" ? "کیپیسٹر وولٹیج" : "انڈکٹر کرنٹ"} بوقتِ t = ${eng(t, "s")}`, value: eng(v, unit, 4), text: `${qty}(${eng(t, "s")}) = ${eng(v, unit, 4)}` });
    results.push({ label: type === "RC" ? "اس نقطے پر سرکٹ کرنٹ" : "اس نقطے پر انڈکٹر وولٹیج", value: eng(other, type === "RC" ? "A" : "V", 4) });
    steps.push({ text: `جب $t = ${ntex(t)}$ s:`, tex: `${qty}(${ntex(t)}) = ${ntex(v, 6)}\\ ${unit}` });
  }
  if (pct !== null) {
    const tp = mode === "charge" ? -tau * Math.log(1 - pct / 100) : -tau * Math.log(pct / 100);
    results.push({ label: mode === "charge" ? `${fmt(pct)}% تک پہنچنے کا وقت` : `${fmt(pct)}% تک گرنے کا وقت`, value: eng(tp, "s", 4) });
    steps.push({ text: "ہم وقت کے لیے مساوات حل کرتے ہیں:", tex: mode === "charge" ? `t = -\\tau\\ln\\left(1 - ${ntex(pct / 100)}\\right) = ${ntex(tp, 6)}\\ s` : `t = -\\tau\\ln(${ntex(pct / 100)}) = ${ntex(tp, 6)}\\ s` });
  }
  if (!isFinite(tau) || tau <= 0) fail("ٹائم کانسٹنٹ درست نہیں ہے۔", "R");
  return {
    results, steps, copy: results.map((r) => r.text ?? `${r.label}: ${r.value}`).join("\n"),
    blocks: [{ type: "plot", title: type === "RC" ? "کیپیسٹر وولٹیج" : "انڈکٹر کرنٹ", xLabel: "t (s)", yLabel: `${qty} (${unit})`, includeZero: true, series: [{ name: qty, points: sampleFunction(x, 0, 6 * tau, 400) }], vlines: [{ x: tau }] }]
  };
}
