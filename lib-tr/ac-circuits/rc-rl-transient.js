import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "RC ve RL devrelerinin dolma veya boşalma geçici tepkisi: zaman sabiti, gerilim ve akımın zamana bağlı denklemi, herhangi bir andaki değer ve belirli bir orana ulaşma süresi; grafikle birlikte.",
  keywords: ["zaman sabiti", "time constant", "kondansatörün dolması", "kondansatörün boşalması", "RC devresi", "RL devresi", "geçici tepki", "transient", "τ"],
  formulas: [
    { label: "zaman sabiti", tex: "\\tau_{RC} = RC,\\qquad \\tau_{RL} = \\frac{L}{R}" },
    { label: "Birinci dereceden devrede herhangi bir büyüklük için genel formül", tex: "x(t) = x(\\infty) + \\left[x(0) - x(\\infty)\\right]e^{-t/\\tau}" }
  ],
  inputs: [
    { id: "type", label: "Devre", type: "select", default: "RC", options: [["RC", "RC (kondansatör gerilimi)"], ["RL", "RL (bobin akımı)"]] },
    { id: "mode", label: "Durum", type: "select", default: "charge", options: [["charge", "Dolma (kaynak bağlanır)"], ["discharge", "Boşalma (kaynak kaldırılır)"]] },
    { id: "Vs", label: "Kaynak gerilimi Vs", unit: "V", type: "number", default: "5" },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10k" },
    { id: "C", label: "C", unit: "F", type: "number", default: "100u", when: { type: ["RC"] } },
    { id: "L", label: "L", unit: "H", type: "number", default: "10m", when: { type: ["RL"] } },
    { id: "t", label: "Değeri hesaplanacak an (isteğe bağlı)", unit: "s", type: "number", default: "1" },
    { id: "pct", label: "Son değerin hedef yüzdesi (isteğe bağlı)", unit: "%", type: "number", default: "90" }
  ],
  example: { values: { type: "RC", mode: "charge", Vs: "5", R: "10k", C: "100u", t: "1", pct: "90" }, expect: ["τ = 1 s", "3.161 V"], note: "Örnek: 5 V kaynakla 10 kΩ üzerinden 100 µF kondansatörün dolması." },
  invalid: { values: { type: "RC", mode: "charge", Vs: "5", R: "10k", C: "-1u" } },
  related: ["step-response", "laplace", "passive-filter", "timer-555"]
};

export function solve(input) {
  const type = choice(input, "type", "Devre", ["RC", "RL"], "RC");
  const mode = choice(input, "mode", "Durum", ["charge", "discharge"], "charge");
  const Vs = num(input, "Vs", "Kaynak gerilimi", { nonZero: true });
  const R = num(input, "R", "R", { positive: true });
  const tau = type === "RC" ? R * num(input, "C", "C", { positive: true }) : num(input, "L", "L", { positive: true }) / R;
  const t = num(input, "t", "An", { optional: true, nonNegative: true });
  const pct = num(input, "pct", "Yüzde", { optional: true, positive: true, below: 100 });
  const final = type === "RC" ? Vs : Vs / R;
  const unit = type === "RC" ? "V" : "A";
  const qty = type === "RC" ? "v_C" : "i_L";
  const x = mode === "charge" ? (s) => final * (1 - Math.exp(-s / tau)) : (s) => final * Math.exp(-s / tau);
  const steps = [
    { text: "Zaman sabiti:", tex: type === "RC" ? `\\tau = RC = ${ntex(R)} \\times ${ntex(tau / R)} = ${ntex(tau, 6)}\\ s` : `\\tau = \\frac{L}{R} = \\frac{${ntex(tau * R)}}{${ntex(R)}} = ${ntex(tau, 6)}\\ s` },
    type === "RC" ? "Kondansatör gerilimi anî olarak değişmez, bu nedenle uygun değişkendir." : "Bobin akımı anî olarak değişmez, bu nedenle uygun değişkendir.",
    mode === "charge"
      ? { text: `Başlangıç değeri 0 ve son değer ${eng(final, unit, 5)}:`, tex: `${qty}(t) = ${ntex(final, 6)}\\left(1 - e^{-t/${ntex(tau, 6)}}\\right)` }
      : { text: `Başlangıç değeri ${eng(final, unit, 5)} ve son değer 0:`, tex: `${qty}(t) = ${ntex(final, 6)}\\,e^{-t/${ntex(tau, 6)}}` },
    `Bir τ sonunda tepki, ${mode === "charge" ? "son değer" : "başlangıç değeri"} değerinin ${mode === "charge" ? "63.2%" : "36.8%"} kadarına ulaşır; 5τ = ${eng(5 * tau, "s", 4)} sonra kararlı kabul edilir (99.3%).`
  ];
  const results = [{ label: "Zaman sabiti τ", value: eng(tau, "s", 5), text: `τ = ${eng(tau, "s", 5)}` }, { label: "Yaklaşık kararlılık süresi 5τ", value: eng(5 * tau, "s", 4) }, { label: mode === "charge" ? "son değer" : "başlangıç değeri", value: eng(final, unit, 5) }];
  if (t !== null) {
    const v = x(t);
    const other = type === "RC" ? (mode === "charge" ? (Vs - v) / R : -v / R) : mode === "charge" ? Vs - v * R : -v * R;
    results.push({ label: `${type === "RC" ? "kondansatör gerilimi" : "bobin akımı"} – t = ${eng(t, "s")} anında`, value: eng(v, unit, 4), text: `${qty}(${eng(t, "s")}) = ${eng(v, unit, 4)}` });
    results.push({ label: type === "RC" ? "Bu anda devre akımı" : "Bu anda bobin gerilimi", value: eng(other, type === "RC" ? "A" : "V", 4) });
    steps.push({ text: `$t = ${ntex(t)}$ s için:`, tex: `${qty}(${ntex(t)}) = ${ntex(v, 6)}\\ ${unit}` });
  }
  if (pct !== null) {
    const tp = mode === "charge" ? -tau * Math.log(1 - pct / 100) : -tau * Math.log(pct / 100);
    results.push({ label: mode === "charge" ? `${fmt(pct)}%'e ulaşma süresi` : `${fmt(pct)}%'e düşme süresi`, value: eng(tp, "s", 4) });
    steps.push({ text: "Süreyi bulmak için denklemi çözeriz:", tex: mode === "charge" ? `t = -\\tau\\ln\\left(1 - ${ntex(pct / 100)}\\right) = ${ntex(tp, 6)}\\ s` : `t = -\\tau\\ln(${ntex(pct / 100)}) = ${ntex(tp, 6)}\\ s` });
  }
  if (!isFinite(tau) || tau <= 0) fail("Zaman sabiti geçersiz.", "R");
  return {
    results, steps, copy: results.map((r) => r.text ?? `${r.label}: ${r.value}`).join("\n"),
    blocks: [{ type: "plot", title: type === "RC" ? "kondansatör gerilimi" : "bobin akımı", xLabel: "t (s)", yLabel: `${qty} (${unit})`, includeZero: true, series: [{ name: qty, points: sampleFunction(x, 0, 6 * tau, 400) }], vlines: [{ x: tau }] }]
  };
}
