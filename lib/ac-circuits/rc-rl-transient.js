import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "الاستجابة العابرة لدوائر RC و RL عند الشحن أو التفريغ: الثابت الزمني والمعادلة الزمنية للجهد والتيار والقيمة عند أي لحظة والزمن اللازم للوصول إلى نسبة معينة، مع الرسم.",
  keywords: ["الثابت الزمني", "time constant", "شحن المكثف", "تفريغ المكثف", "دائرة RC", "دائرة RL", "استجابة عابرة", "transient", "τ"],
  formulas: [
    { label: "الثابت الزمني", tex: "\\tau_{RC} = RC,\\qquad \\tau_{RL} = \\frac{L}{R}" },
    { label: "الصيغة العامة لأي متغير في دائرة رتبة أولى", tex: "x(t) = x(\\infty) + \\left[x(0) - x(\\infty)\\right]e^{-t/\\tau}" }
  ],
  inputs: [
    { id: "type", label: "الدائرة", type: "select", default: "RC", options: [["RC", "RC (جهد المكثف)"], ["RL", "RL (تيار الملف)"]] },
    { id: "mode", label: "الحالة", type: "select", default: "charge", options: [["charge", "شحن (توصيل المصدر)"], ["discharge", "تفريغ (إزالة المصدر)"]] },
    { id: "Vs", label: "جهد المصدر Vs", unit: "V", type: "number", default: "5" },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10k" },
    { id: "C", label: "C", unit: "F", type: "number", default: "100u", when: { type: ["RC"] } },
    { id: "L", label: "L", unit: "H", type: "number", default: "10m", when: { type: ["RL"] } },
    { id: "t", label: "لحظة لحساب القيمة (اختياري)", unit: "s", type: "number", default: "1" },
    { id: "pct", label: "نسبة مستهدفة من القيمة النهائية (اختياري)", unit: "%", type: "number", default: "90" }
  ],
  example: { values: { type: "RC", mode: "charge", Vs: "5", R: "10k", C: "100u", t: "1", pct: "90" }, expect: ["τ = 1 s", "3.161 V"], note: "مثال: شحن مكثف 100 µF عبر 10 kΩ من 5 V." },
  invalid: { values: { type: "RC", mode: "charge", Vs: "5", R: "10k", C: "-1u" } },
  related: ["step-response", "laplace", "passive-filter", "timer-555"]
};

export function solve(input) {
  const type = choice(input, "type", "الدائرة", ["RC", "RL"], "RC");
  const mode = choice(input, "mode", "الحالة", ["charge", "discharge"], "charge");
  const Vs = num(input, "Vs", "جهد المصدر", { nonZero: true });
  const R = num(input, "R", "R", { positive: true });
  const tau = type === "RC" ? R * num(input, "C", "C", { positive: true }) : num(input, "L", "L", { positive: true }) / R;
  const t = num(input, "t", "اللحظة", { optional: true, nonNegative: true });
  const pct = num(input, "pct", "النسبة", { optional: true, positive: true, below: 100 });
  const final = type === "RC" ? Vs : Vs / R;
  const unit = type === "RC" ? "V" : "A";
  const qty = type === "RC" ? "v_C" : "i_L";
  const x = mode === "charge" ? (s) => final * (1 - Math.exp(-s / tau)) : (s) => final * Math.exp(-s / tau);
  const steps = [
    { text: "الثابت الزمني:", tex: type === "RC" ? `\\tau = RC = ${ntex(R)} \\times ${ntex(tau / R)} = ${ntex(tau, 6)}\\ s` : `\\tau = \\frac{L}{R} = \\frac{${ntex(tau * R)}}{${ntex(R)}} = ${ntex(tau, 6)}\\ s` },
    type === "RC" ? "جهد المكثف لا يتغير لحظياً، فهو المتغير المناسب." : "تيار الملف لا يتغير لحظياً، فهو المتغير المناسب.",
    mode === "charge"
      ? { text: `القيمة الابتدائية 0 والنهائية ${eng(final, unit, 5)}:`, tex: `${qty}(t) = ${ntex(final, 6)}\\left(1 - e^{-t/${ntex(tau, 6)}}\\right)` }
      : { text: `القيمة الابتدائية ${eng(final, unit, 5)} والنهائية 0:`, tex: `${qty}(t) = ${ntex(final, 6)}\\,e^{-t/${ntex(tau, 6)}}` },
    `بعد τ واحد تبلغ الاستجابة ${mode === "charge" ? "63.2%" : "36.8%"} من ${mode === "charge" ? "القيمة النهائية" : "القيمة الابتدائية"}، وبعد 5τ = ${eng(5 * tau, "s", 4)} تُعدّ مستقرة (99.3%).`
  ];
  const results = [{ label: "الثابت الزمني τ", value: eng(tau, "s", 5), text: `τ = ${eng(tau, "s", 5)}` }, { label: "زمن الاستقرار التقريبي 5τ", value: eng(5 * tau, "s", 4) }, { label: mode === "charge" ? "القيمة النهائية" : "القيمة الابتدائية", value: eng(final, unit, 5) }];
  if (t !== null) {
    const v = x(t);
    const other = type === "RC" ? (mode === "charge" ? (Vs - v) / R : -v / R) : mode === "charge" ? Vs - v * R : -v * R;
    results.push({ label: `${type === "RC" ? "جهد المكثف" : "تيار الملف"} عند t = ${eng(t, "s")}`, value: eng(v, unit, 4), text: `${qty}(${eng(t, "s")}) = ${eng(v, unit, 4)}` });
    results.push({ label: type === "RC" ? "تيار الدائرة عندها" : "جهد الملف عندها", value: eng(other, type === "RC" ? "A" : "V", 4) });
    steps.push({ text: `عند $t = ${ntex(t)}$ s:`, tex: `${qty}(${ntex(t)}) = ${ntex(v, 6)}\\ ${unit}` });
  }
  if (pct !== null) {
    const tp = mode === "charge" ? -tau * Math.log(1 - pct / 100) : -tau * Math.log(pct / 100);
    results.push({ label: mode === "charge" ? `زمن الوصول إلى ${fmt(pct)}%` : `زمن الهبوط إلى ${fmt(pct)}%`, value: eng(tp, "s", 4) });
    steps.push({ text: "نحل المعادلة لإيجاد الزمن:", tex: mode === "charge" ? `t = -\\tau\\ln\\left(1 - ${ntex(pct / 100)}\\right) = ${ntex(tp, 6)}\\ s` : `t = -\\tau\\ln(${ntex(pct / 100)}) = ${ntex(tp, 6)}\\ s` });
  }
  if (!isFinite(tau) || tau <= 0) fail("الثابت الزمني غير صالح.", "R");
  return {
    results, steps, copy: results.map((r) => r.text ?? `${r.label}: ${r.value}`).join("\n"),
    blocks: [{ type: "plot", title: type === "RC" ? "جهد المكثف" : "تيار الملف", xLabel: "t (s)", yLabel: `${qty} (${unit})`, includeZero: true, series: [{ name: qty, points: sampleFunction(x, 0, 6 * tau, 400) }], vlines: [{ x: tau }] }]
  };
}
