import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "تحقق من منظم جهد خطي (مثل 7805 أو LDO): هامش جهد الانقطاع، والقدرة المبددة، والكفاءة، ودرجة حرارة الوصلة، والمقاومة الحرارية المطلوبة للمشتت الحراري.",
  keywords: ["منظم جهد", "voltage regulator", "LDO", "7805", "جهد الانقطاع", "dropout", "مشتت حراري", "heatsink", "درجة حرارة الوصلة"],
  formulas: [
    { label: "القدرة والكفاءة", tex: "P_D = (V_{in} - V_{out})I_L + V_{in}I_Q,\\qquad \\eta = \\frac{V_{out}I_L}{V_{in}(I_L + I_Q)}" },
    { label: "الحرارة", tex: "T_J = T_A + P_D\\,\\theta_{JA},\\qquad \\theta_{SA,max} = \\frac{T_{J,max} - T_A}{P_D} - \\theta_{JC} - \\theta_{CS}" }
  ],
  inputs: [
    { id: "Vin", label: "جهد الدخل (أقصى قيمة)", unit: "V", type: "number", default: "12" },
    { id: "Vout", label: "جهد الخرج", unit: "V", type: "number", default: "5" },
    { id: "IL", label: "تيار الحمل", unit: "A", type: "number", default: "500m" },
    { id: "Vdo", label: "جهد الانقطاع (Dropout)", unit: "V", type: "number", default: "2" },
    { id: "Iq", label: "تيار السكون Iq", unit: "A", type: "number", default: "5m" },
    { id: "Ta", label: "درجة حرارة المحيط", unit: "°C", type: "number", default: "40" },
    { id: "Tj", label: "أقصى حرارة للوصلة", unit: "°C", type: "number", default: "125" },
    { id: "tja", label: "θJA بلا مشتت", unit: "°C/W", type: "number", default: "50" },
    { id: "tjc", label: "θJC", unit: "°C/W", type: "number", default: "5" },
    { id: "tcs", label: "θCS (معجون حراري)", unit: "°C/W", type: "number", default: "0.5" }
  ],
  example: { values: { Vin: "12", Vout: "5", IL: "500m", Vdo: "2", Iq: "5m", Ta: "40", Tj: "125", tja: "50", tjc: "5", tcs: "0.5" }, expect: ["PD = 3.56 W", "θSA ≤ 18.38 °C/W"], note: "مثال: 7805 من 12 V بتيار 500 mA." },
  invalid: { values: { Vin: "6", Vout: "5", IL: "500m", Vdo: "2", Iq: "5m", Ta: "40", Tj: "125", tja: "50", tjc: "5", tcs: "0.5" } },
  related: ["zener-regulator", "rectifier-ripple", "led-resistor"]
};

export function solve(input) {
  const Vin = num(input, "Vin", "جهد الدخل", { positive: true });
  const Vout = num(input, "Vout", "جهد الخرج", { positive: true });
  const IL = num(input, "IL", "تيار الحمل", { nonNegative: true });
  const Vdo = num(input, "Vdo", "جهد الانقطاع", { nonNegative: true });
  const Iq = num(input, "Iq", "تيار السكون", { nonNegative: true, default: 0 });
  const Ta = num(input, "Ta", "حرارة المحيط", { min: -60, max: 150 });
  const Tjmax = num(input, "Tj", "أقصى حرارة للوصلة", { min: 50, max: 200 });
  const tja = num(input, "tja", "θJA", { positive: true });
  const tjc = num(input, "tjc", "θJC", { nonNegative: true, default: 0 });
  const tcs = num(input, "tcs", "θCS", { nonNegative: true, default: 0 });
  if (Vin < Vout + Vdo) fail(`جهد الدخل ${fmt(Vin)} V أقل من الحد الأدنى ${fmt(Vout + Vdo)} V (الخرج + جهد الانقطاع)، فلن ينظّم المنظم.`, "Vin");
  if (Tjmax <= Ta) fail("أقصى حرارة للوصلة يجب أن تكون أعلى من حرارة المحيط.", "Tj");
  const PD = (Vin - Vout) * IL + Vin * Iq;
  const eff = IL > 0 ? (Vout * IL) / (Vin * (IL + Iq)) : 0;
  const TjNoHs = Ta + PD * tja;
  const PDmax = (Tjmax - Ta) / tja;
  const steps = [
    `هامش الجهد ${fmt(Vin - Vout - Vdo, 4)} V فوق جهد الانقطاع، فالمنظم يعمل.`,
    { text: "القدرة المبددة (الفرق في الجهد × التيار + استهلاك المنظم):", tex: `P_D = (${ntex(Vin)} - ${ntex(Vout)}) \\times ${ntex(IL)} + ${ntex(Vin)} \\times ${ntex(Iq)} = ${ntex(PD, 4)}\\ W` },
    { text: "الكفاءة:", tex: `\\eta = \\frac{${ntex(Vout)} \\times ${ntex(IL)}}{${ntex(Vin)} \\times (${ntex(IL)} + ${ntex(Iq)})} = ${ntex(100 * eff, 4)}\\%` },
    { text: "حرارة الوصلة بلا مشتت:", tex: `T_J = ${ntex(Ta)} + ${ntex(PD, 4)} \\times ${ntex(tja)} = ${ntex(TjNoHs, 4)}^\\circ C` }
  ];
  const results = [
    { label: "القدرة المبددة", value: eng(PD, "W", 3), text: `PD = ${eng(PD, "W", 3)}` },
    { label: "الكفاءة", value: `${fmt(100 * eff, 4)}%` },
    { label: "حرارة الوصلة بلا مشتت", value: `${fmt(TjNoHs, 4)} °C` },
    { label: "أقصى قدرة بلا مشتت", value: eng(PDmax, "W", 3) }
  ];
  let copy = `PD = ${eng(PD, "W", 3)}, η = ${fmt(100 * eff, 4)}%, Tj = ${fmt(TjNoHs, 4)} °C`;
  if (TjNoHs > Tjmax) {
    const tsa = (Tjmax - Ta) / PD - tjc - tcs;
    if (tsa <= 0) {
      steps.push("حتى مع مشتت مثالي لا يمكن تبديد هذه القدرة بأمان؛ استخدم منظماً تبديلياً (Buck) أو خفّض جهد الدخل.");
      results.push({ label: "الحكم", value: "غير ممكن بمنظم خطي: استخدم منظماً تبديلياً" });
    } else {
      steps.push({ text: "الحرارة تتجاوز الحد، فنحتاج مشتتاً مقاومته الحرارية لا تزيد عن:", tex: `\\theta_{SA} \\le \\frac{${ntex(Tjmax)} - ${ntex(Ta)}}{${ntex(PD, 4)}} - ${ntex(tjc)} - ${ntex(tcs)} = ${ntex(tsa, 4)}^\\circ C/W` });
      results.push({ label: "الحكم", value: "يحتاج مشتتاً حرارياً" }, { label: "أكبر θSA للمشتت", value: `${fmt(tsa, 4)} °C/W`, text: `θSA ≤ ${fmt(tsa, 4)} °C/W` });
      copy += `\nθSA ≤ ${fmt(tsa, 4)} °C/W`;
    }
  } else {
    steps.push("الحرارة ضمن الحد، فلا حاجة لمشتت (يُفضّل هامش أمان 20 °C على الأقل).");
    results.push({ label: "الحكم", value: TjNoHs > Tjmax - 20 ? "مقبول لكن قريب من الحد" : "لا يحتاج مشتتاً" });
  }
  return { results, steps, copy };
}
