import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "صمّم مقسم جهد لخفض مستوى إشارة منطقية (مثل 5 V إلى 3.3 V): المقاومة الثانية القياسية والجهد الفعلي والتيار، وأقصى تردد للإشارة بسبب سعة دخل الطرف المستقبل.",
  keywords: ["تحويل المستوى", "level shifter", "مقسم جهد", "5V إلى 3.3V", "UART", "Arduino", "ESP32", "Raspberry Pi"],
  formulas: [
    { label: "اختيار R2", tex: "V_{out} = V_{in}\\frac{R_2}{R_1 + R_2} \\Rightarrow R_2 = R_1\\frac{V_{out}}{V_{in} - V_{out}}" },
    { label: "سرعة الحافة", tex: "\\tau = (R_1 \\parallel R_2)\\,C_{in},\\qquad f_{max} \\approx \\frac{1}{10\\,\\tau}" }
  ],
  inputs: [
    { id: "Vin", label: "جهد الإشارة العالي", unit: "V", type: "number", default: "5" },
    { id: "Vout", label: "الجهد المطلوب", unit: "V", type: "number", default: "3.3" },
    { id: "R1", label: "R1 (العلوية)", unit: "Ω", type: "number", default: "1k" },
    { id: "series", label: "السلسلة القياسية لـ R2", type: "select", default: "E24", options: [["E12", "E12"], ["E24", "E24"], ["E96", "E96"]] },
    { id: "Vmax", label: "أقصى جهد يتحمله الطرف المستقبل", unit: "V", type: "number", default: "3.6" },
    { id: "Cin", label: "سعة دخل الطرف المستقبل (اختياري)", unit: "F", type: "number", default: "10p" }
  ],
  example: { values: { Vin: "5", Vout: "3.3", R1: "1k", series: "E24", Vmax: "3.6", Cin: "10p" }, expect: ["R2 = 2 kΩ", "Vout = 3.333 V"], note: "مثال: خفض إشارة 5 V إلى 3.3 V بمقاومة علوية 1 kΩ." },
  invalid: { values: { Vin: "3.3", Vout: "5", R1: "1k", series: "E24" } },
  related: ["voltage-current-divider", "sensor-divider", "logic-gates"]
};

export function solve(input) {
  const Vin = num(input, "Vin", "جهد الإشارة", { positive: true });
  const Vt = num(input, "Vout", "الجهد المطلوب", { positive: true });
  const R1 = num(input, "R1", "R1", { positive: true });
  const series = choice(input, "series", "السلسلة", ["E12", "E24", "E96"], "E24");
  const Vmax = num(input, "Vmax", "أقصى جهد", { optional: true, positive: true });
  const Cin = num(input, "Cin", "سعة الدخل", { optional: true, positive: true });
  if (Vt >= Vin) fail("مقسم الجهد يخفض الجهد فقط؛ الجهد المطلوب يجب أن يكون أقل من جهد الإشارة. للرفع استخدم دائرة ترانزستور أو شريحة تحويل.", "Vout");
  const R2exact = (R1 * Vt) / (Vin - Vt);
  const cand = nearest(R2exact, series);
  let R2 = cand.closest;
  let Vact = (Vin * R2) / (R1 + R2);
  let note = "";
  if (Vmax !== null && Vact > Vmax && cand.below) {
    R2 = cand.below;
    Vact = (Vin * R2) / (R1 + R2);
    note = `أقرب قيمة كانت تعطي جهداً فوق الحد الآمن ${fmt(Vmax)} V، فاخترنا القيمة الأصغر ${eng(R2, "Ω")}.`;
  }
  const I = Vin / (R1 + R2);
  const steps = [
    { text: "القيمة المحسوبة لـ R2:", tex: `R_2 = ${ntex(R1)} \\times \\frac{${ntex(Vt)}}{${ntex(Vin)} - ${ntex(Vt)}} = ${ntex(R2exact, 5)}\\ \\Omega` },
    `أقرب قيمة ${series}: ${eng(R2, "Ω")}. ${note}`,
    { text: "الجهد الفعلي والتيار في الحالة العالية:", tex: `V_{out} = ${ntex(Vin)}\\frac{${ntex(R2)}}{${ntex(R1)} + ${ntex(R2)}} = ${ntex(Vact, 5)}\\ V,\\quad I = ${ntex(I, 4)}\\ A` }
  ];
  const results = [
    { label: "R2 المحسوبة", value: eng(R2exact, "Ω", 4) },
    { label: `R2 القياسية (${series})`, value: eng(R2, "Ω"), text: `R2 = ${eng(R2, "Ω")}` },
    { label: "الجهد الفعلي", value: eng(Vact, "V", 4), text: `Vout = ${eng(Vact, "V", 4)}` },
    { label: "الخطأ عن المطلوب", value: `${fmt((100 * (Vact - Vt)) / Vt, 3)}%` },
    { label: "التيار المستهلك", value: eng(I, "A", 4) }
  ];
  if (Cin !== null) {
    const tau = ((R1 * R2) / (R1 + R2)) * Cin;
    const fmax = 1 / (10 * tau);
    steps.push({ text: "سعة دخل الطرف المستقبل تبطئ الحواف:", tex: `\\tau = (R_1 \\parallel R_2) C_{in} = ${ntex(tau, 4)}\\ s,\\quad f_{max} \\approx \\frac{1}{10\\tau} = ${ntex(fmax, 4)}\\ Hz` });
    results.push({ label: "أقصى تردد تقريبي للإشارة", value: eng(fmax, "Hz", 3) });
  }
  steps.push("هذا المقسم يصلح للإشارات أحادية الاتجاه (مثل TX إلى RX). للخطوط ثنائية الاتجاه مثل I²C استخدم محول مستوى بترانزستور MOSFET.");
  return { results, steps, copy: `R2 = ${eng(R2, "Ω")}, Vout = ${eng(Vact, "V", 4)}, I = ${eng(I, "A", 4)}` };
}
