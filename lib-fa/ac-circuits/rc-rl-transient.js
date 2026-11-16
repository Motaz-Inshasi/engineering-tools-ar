import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "پاسخ گذرای مدارهای RC و RL در هنگام شارژ یا تخلیه: ثابت زمانی، معادله زمانی ولتاژ و جریان، مقدار در هر لحظه و زمان لازم برای رسیدن به درصد معینی، همراه با نمودار.",
  keywords: ["ثابت زمانی", "time constant", "شارژ خازن", "تخلیه خازن", "مدار RC", "مدار RL", "پاسخ گذرا", "transient", "τ"],
  formulas: [
    { label: "ثابت زمانی", tex: "\\tau_{RC} = RC,\\qquad \\tau_{RL} = \\frac{L}{R}" },
    { label: "فرمول کلی برای هر کمیت در مدار مرتبه اول", tex: "x(t) = x(\\infty) + \\left[x(0) - x(\\infty)\\right]e^{-t/\\tau}" }
  ],
  inputs: [
    { id: "type", label: "مدار", type: "select", default: "RC", options: [["RC", "RC (ولتاژ خازن)"], ["RL", "RL (جریان سلف)"]] },
    { id: "mode", label: "حالت", type: "select", default: "charge", options: [["charge", "شارژ (وصل منبع)"], ["discharge", "تخلیه (حذف منبع)"]] },
    { id: "Vs", label: "ولتاژ منبع Vs", unit: "V", type: "number", default: "5" },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10k" },
    { id: "C", label: "C", unit: "F", type: "number", default: "100u", when: { type: ["RC"] } },
    { id: "L", label: "L", unit: "H", type: "number", default: "10m", when: { type: ["RL"] } },
    { id: "t", label: "لحظه برای محاسبه مقدار (اختیاری)", unit: "s", type: "number", default: "1" },
    { id: "pct", label: "درصد هدف از مقدار نهایی (اختیاری)", unit: "%", type: "number", default: "90" }
  ],
  example: { values: { type: "RC", mode: "charge", Vs: "5", R: "10k", C: "100u", t: "1", pct: "90" }, expect: ["τ = 1 s", "3.161 V"], note: "مثال: شارژ خازن 100 میکروفاراد از طریق 10 کیلواهم با منبع 5 ولت." },
  invalid: { values: { type: "RC", mode: "charge", Vs: "5", R: "10k", C: "-1u" } },
  related: ["step-response", "laplace", "passive-filter", "timer-555"]
};

export function solve(input) {
  const type = choice(input, "type", "مدار", ["RC", "RL"], "RC");
  const mode = choice(input, "mode", "حالت", ["charge", "discharge"], "charge");
  const Vs = num(input, "Vs", "ولتاژ منبع", { nonZero: true });
  const R = num(input, "R", "R", { positive: true });
  const tau = type === "RC" ? R * num(input, "C", "C", { positive: true }) : num(input, "L", "L", { positive: true }) / R;
  const t = num(input, "t", "لحظه", { optional: true, nonNegative: true });
  const pct = num(input, "pct", "درصد", { optional: true, positive: true, below: 100 });
  const final = type === "RC" ? Vs : Vs / R;
  const unit = type === "RC" ? "V" : "A";
  const qty = type === "RC" ? "v_C" : "i_L";
  const x = mode === "charge" ? (s) => final * (1 - Math.exp(-s / tau)) : (s) => final * Math.exp(-s / tau);
  const steps = [
    { text: "ثابت زمانی:", tex: type === "RC" ? `\\tau = RC = ${ntex(R)} \\times ${ntex(tau / R)} = ${ntex(tau, 6)}\\ s` : `\\tau = \\frac{L}{R} = \\frac{${ntex(tau * R)}}{${ntex(R)}} = ${ntex(tau, 6)}\\ s` },
    type === "RC" ? "ولتاژ خازن به‌طور لحظه‌ای تغییر نمی‌کند، پس متغیر مناسب همین است." : "جریان سلف به‌طور لحظه‌ای تغییر نمی‌کند، پس متغیر مناسب همین است.",
    mode === "charge"
      ? { text: `مقدار اولیه 0 و مقدار نهایی ${eng(final, unit, 5)}:`, tex: `${qty}(t) = ${ntex(final, 6)}\\left(1 - e^{-t/${ntex(tau, 6)}}\\right)` }
      : { text: `مقدار اولیه ${eng(final, unit, 5)} و مقدار نهایی 0:`, tex: `${qty}(t) = ${ntex(final, 6)}\\,e^{-t/${ntex(tau, 6)}}` },
    `پس از یک τ پاسخ به ${mode === "charge" ? "63.2%" : "36.8%"} از ${mode === "charge" ? "مقدار نهایی" : "مقدار اولیه"} می‌رسد و پس از 5τ = ${eng(5 * tau, "s", 4)} پایدار در نظر گرفته می‌شود (99.3%).`
  ];
  const results = [{ label: "ثابت زمانی τ", value: eng(tau, "s", 5), text: `τ = ${eng(tau, "s", 5)}` }, { label: "زمان تقریبی رسیدن به پایداری 5τ", value: eng(5 * tau, "s", 4) }, { label: mode === "charge" ? "مقدار نهایی" : "مقدار اولیه", value: eng(final, unit, 5) }];
  if (t !== null) {
    const v = x(t);
    const other = type === "RC" ? (mode === "charge" ? (Vs - v) / R : -v / R) : mode === "charge" ? Vs - v * R : -v * R;
    results.push({ label: `${type === "RC" ? "ولتاژ خازن" : "جریان سلف"} در t = ${eng(t, "s")}`, value: eng(v, unit, 4), text: `${qty}(${eng(t, "s")}) = ${eng(v, unit, 4)}` });
    results.push({ label: type === "RC" ? "جریان مدار در آن لحظه" : "ولتاژ سلف در آن لحظه", value: eng(other, type === "RC" ? "A" : "V", 4) });
    steps.push({ text: `در $t = ${ntex(t)}$ s:`, tex: `${qty}(${ntex(t)}) = ${ntex(v, 6)}\\ ${unit}` });
  }
  if (pct !== null) {
    const tp = mode === "charge" ? -tau * Math.log(1 - pct / 100) : -tau * Math.log(pct / 100);
    results.push({ label: mode === "charge" ? `زمان رسیدن به ${fmt(pct)}٪` : `زمان افت به ${fmt(pct)}٪`, value: eng(tp, "s", 4) });
    steps.push({ text: "معادله را برای زمان حل می‌کنیم:", tex: mode === "charge" ? `t = -\\tau\\ln\\left(1 - ${ntex(pct / 100)}\\right) = ${ntex(tp, 6)}\\ s` : `t = -\\tau\\ln(${ntex(pct / 100)}) = ${ntex(tp, 6)}\\ s` });
  }
  if (!isFinite(tau) || tau <= 0) fail("ثابت زمانی نامعتبر است.", "R");
  return {
    results, steps, copy: results.map((r) => r.text ?? `${r.label}: ${r.value}`).join("\n"),
    blocks: [{ type: "plot", title: type === "RC" ? "ولتاژ خازن" : "جریان سلف", xLabel: "t (s)", yLabel: `${qty} (${unit})`, includeZero: true, series: [{ name: qty, points: sampleFunction(x, 0, 6 * tau, 400) }], vlines: [{ x: tau }] }]
  };
}
