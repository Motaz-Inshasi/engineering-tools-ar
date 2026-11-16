import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Respons transien rangkaian RC dan RL saat pengisian atau pengosongan: konstanta waktu, persamaan waktu untuk tegangan dan arus, nilai pada saat tertentu, serta waktu yang diperlukan untuk mencapai persentase tertentu, dengan grafik.",
  keywords: ["Konstanta waktu", "time constant", "Pengisian kapasitor", "Pengosongan kapasitor", "Rangkaian RC", "Rangkaian RL", "Respons transien", "transient", "τ"],
  formulas: [
    { label: "Konstanta waktu", tex: "\\tau_{RC} = RC,\\qquad \\tau_{RL} = \\frac{L}{R}" },
    { label: "Rumus umum untuk besaran apa pun pada rangkaian orde pertama", tex: "x(t) = x(\\infty) + \\left[x(0) - x(\\infty)\\right]e^{-t/\\tau}" }
  ],
  inputs: [
    { id: "type", label: "Rangkaian", type: "select", default: "RC", options: [["RC", "RC (tegangan kapasitor)"], ["RL", "RL (arus induktor)"]] },
    { id: "mode", label: "Keadaan", type: "select", default: "charge", options: [["charge", "Pengisian (sumber terhubung)"], ["discharge", "Pengosongan (sumber dilepas)"]] },
    { id: "Vs", label: "Tegangan sumber Vs", unit: "V", type: "number", default: "5" },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10k" },
    { id: "C", label: "C", unit: "F", type: "number", default: "100u", when: { type: ["RC"] } },
    { id: "L", label: "L", unit: "H", type: "number", default: "10m", when: { type: ["RL"] } },
    { id: "t", label: "Saat untuk menghitung nilai (opsional)", unit: "s", type: "number", default: "1" },
    { id: "pct", label: "Persentase target dari nilai akhir (opsional)", unit: "%", type: "number", default: "90" }
  ],
  example: { values: { type: "RC", mode: "charge", Vs: "5", R: "10k", C: "100u", t: "1", pct: "90" }, expect: ["τ = 1 s", "3.161 V"], note: "Contoh: pengisian kapasitor 100 µF melalui 10 kΩ dari 5 V." },
  invalid: { values: { type: "RC", mode: "charge", Vs: "5", R: "10k", C: "-1u" } },
  related: ["step-response", "laplace", "passive-filter", "timer-555"]
};

export function solve(input) {
  const type = choice(input, "type", "Rangkaian", ["RC", "RL"], "RC");
  const mode = choice(input, "mode", "Keadaan", ["charge", "discharge"], "charge");
  const Vs = num(input, "Vs", "Tegangan sumber", { nonZero: true });
  const R = num(input, "R", "R", { positive: true });
  const tau = type === "RC" ? R * num(input, "C", "C", { positive: true }) : num(input, "L", "L", { positive: true }) / R;
  const t = num(input, "t", "Saat", { optional: true, nonNegative: true });
  const pct = num(input, "pct", "Persentase", { optional: true, positive: true, below: 100 });
  const final = type === "RC" ? Vs : Vs / R;
  const unit = type === "RC" ? "V" : "A";
  const qty = type === "RC" ? "v_C" : "i_L";
  const x = mode === "charge" ? (s) => final * (1 - Math.exp(-s / tau)) : (s) => final * Math.exp(-s / tau);
  const steps = [
    { text: "Konstanta waktu:", tex: type === "RC" ? `\\tau = RC = ${ntex(R)} \\times ${ntex(tau / R)} = ${ntex(tau, 6)}\\ s` : `\\tau = \\frac{L}{R} = \\frac{${ntex(tau * R)}}{${ntex(R)}} = ${ntex(tau, 6)}\\ s` },
    type === "RC" ? "Tegangan kapasitor tidak dapat berubah seketika, sehingga ia adalah variabel yang tepat." : "Arus induktor tidak dapat berubah seketika, sehingga ia adalah variabel yang tepat.",
    mode === "charge"
      ? { text: `Nilai awal 0 dan nilai akhir ${eng(final, unit, 5)}:`, tex: `${qty}(t) = ${ntex(final, 6)}\\left(1 - e^{-t/${ntex(tau, 6)}}\\right)` }
      : { text: `Nilai awal ${eng(final, unit, 5)} dan nilai akhir 0:`, tex: `${qty}(t) = ${ntex(final, 6)}\\,e^{-t/${ntex(tau, 6)}}` },
    `Setelah satu τ, respons mencapai ${mode === "charge" ? "63.2%" : "36.8%"} dari ${mode === "charge" ? "nilai akhir" : "nilai awal"}, dan setelah 5τ = ${eng(5 * tau, "s", 4)} dianggap sudah stabil (99.3%).`
  ];
  const results = [{ label: "Konstanta waktu τ", value: eng(tau, "s", 5), text: `τ = ${eng(tau, "s", 5)}` }, { label: "Perkiraan waktu stabil 5τ", value: eng(5 * tau, "s", 4) }, { label: mode === "charge" ? "nilai akhir" : "nilai awal", value: eng(final, unit, 5) }];
  if (t !== null) {
    const v = x(t);
    const other = type === "RC" ? (mode === "charge" ? (Vs - v) / R : -v / R) : mode === "charge" ? Vs - v * R : -v * R;
    results.push({ label: `${type === "RC" ? "Tegangan kapasitor" : "Arus induktor"} pada t = ${eng(t, "s")}`, value: eng(v, unit, 4), text: `${qty}(${eng(t, "s")}) = ${eng(v, unit, 4)}` });
    results.push({ label: type === "RC" ? "Arus rangkaian saat itu" : "Tegangan induktor saat itu", value: eng(other, type === "RC" ? "A" : "V", 4) });
    steps.push({ text: `Pada $t = ${ntex(t)}$ s:`, tex: `${qty}(${ntex(t)}) = ${ntex(v, 6)}\\ ${unit}` });
  }
  if (pct !== null) {
    const tp = mode === "charge" ? -tau * Math.log(1 - pct / 100) : -tau * Math.log(pct / 100);
    results.push({ label: mode === "charge" ? `Waktu untuk mencapai ${fmt(pct)}%` : `Waktu untuk turun hingga ${fmt(pct)}%`, value: eng(tp, "s", 4) });
    steps.push({ text: "Kita selesaikan persamaan untuk mencari waktu:", tex: mode === "charge" ? `t = -\\tau\\ln\\left(1 - ${ntex(pct / 100)}\\right) = ${ntex(tp, 6)}\\ s` : `t = -\\tau\\ln(${ntex(pct / 100)}) = ${ntex(tp, 6)}\\ s` });
  }
  if (!isFinite(tau) || tau <= 0) fail("Konstanta waktu tidak valid.", "R");
  return {
    results, steps, copy: results.map((r) => r.text ?? `${r.label}: ${r.value}`).join("\n"),
    blocks: [{ type: "plot", title: type === "RC" ? "Tegangan kapasitor" : "Arus induktor", xLabel: "t (s)", yLabel: `${qty} (${unit})`, includeZero: true, series: [{ name: qty, points: sampleFunction(x, 0, 6 * tau, 400) }], vlines: [{ x: tau }] }]
  };
}
