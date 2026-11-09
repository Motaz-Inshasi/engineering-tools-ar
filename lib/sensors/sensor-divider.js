import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";
import { logspaceSafe } from "../dc-circuits/common.js";

export const meta = {
  description: "صمّم مقسم جهد لحساس مقاومي (ثرمستور، LDR، مقياس جهد): أفضل مقاومة ثابتة لأكبر مدى خرج، ومدى الجهد والحساسية، مع منحنى الخرج مقابل مقاومة الحساس.",
  keywords: ["مقسم جهد الحساس", "LDR", "ثرمستور", "حساس مقاومي", "مقاومة ثابتة", "مدى الخرج", "sensor divider"],
  formulas: [
    { label: "الحساس في الأسفل", tex: "V_{out} = V_{cc}\\frac{R_s}{R_s + R}" },
    { label: "المقاومة المثلى لأكبر مدى", tex: "R_{opt} = \\sqrt{R_{s,min} R_{s,max}}" }
  ],
  inputs: [
    { id: "Rmin", label: "أقل مقاومة للحساس", unit: "Ω", type: "number", default: "1k" },
    { id: "Rmax", label: "أكبر مقاومة للحساس", unit: "Ω", type: "number", default: "100k" },
    { id: "Vcc", label: "جهد التغذية", unit: "V", type: "number", default: "5" },
    { id: "pos", label: "موضع الحساس", type: "select", default: "bottom", options: [["bottom", "في الأسفل (بين الخرج والأرضي)"], ["top", "في الأعلى (بين التغذية والخرج)"]] },
    { id: "R", label: "المقاومة الثابتة (اختياري، وإلا تُحسب المثلى)", unit: "Ω", type: "number" }
  ],
  example: { values: { Rmin: "1k", Rmax: "100k", Vcc: "5", pos: "bottom", R: "" }, expect: ["Ropt = 10 kΩ", "V(Rmax) = 4.545 V"], note: "مثال: LDR يتغير من 1 kΩ إلى 100 kΩ." },
  invalid: { values: { Rmin: "100k", Rmax: "1k", Vcc: "5", pos: "bottom" } },
  related: ["voltage-current-divider", "thermistor", "adc", "level-shifter"]
};

export function vout(Vcc, Rs, R, pos) {
  return pos === "bottom" ? (Vcc * Rs) / (Rs + R) : (Vcc * R) / (Rs + R);
}

export function solve(input) {
  const Rmin = num(input, "Rmin", "أقل مقاومة", { positive: true });
  const Rmax = num(input, "Rmax", "أكبر مقاومة", { positive: true });
  const Vcc = num(input, "Vcc", "جهد التغذية", { positive: true });
  const pos = choice(input, "pos", "الموضع", ["bottom", "top"], "bottom");
  if (Rmax <= Rmin) fail("أكبر مقاومة يجب أن تكون أكبر من أقلها.", "Rmax");
  const Ropt = Math.sqrt(Rmin * Rmax);
  const Rin = num(input, "R", "المقاومة الثابتة", { optional: true, positive: true });
  const R = Rin ?? nearest(Ropt, "E24").closest;
  const v1 = vout(Vcc, Rmin, R, pos), v2 = vout(Vcc, Rmax, R, pos);
  const span = Math.abs(v2 - v1);
  const steps = [
    { text: "بالاشتقاق نجد أن مدى الخرج يكون أكبر ما يمكن عندما تساوي المقاومة الثابتة المتوسط الهندسي لطرفي الحساس:", tex: `R_{opt} = \\sqrt{${ntex(Rmin)} \\times ${ntex(Rmax)}} = ${ntex(Ropt, 5)}\\ \\Omega` },
    Rin === null ? `نختار أقرب قيمة قياسية E24: ${eng(R, "Ω")}.` : `نستخدم المقاومة المدخلة ${eng(R, "Ω")}.`,
    { text: "الخرج عند طرفي مدى الحساس:", tex: `V(R_{min}) = ${ntex(v1, 5)}\\ V,\\quad V(R_{max}) = ${ntex(v2, 5)}\\ V` },
    `مدى الخرج ${fmt(span, 4)} V من أصل ${fmt(Vcc)} V (${fmt((100 * span) / Vcc, 3)}%). تيار المقسم الأقصى ${eng(Vcc / (Rmin + R), "A", 3)}، فانتبه لتسخين الحساس الذاتي.`
  ];
  const xs = logspaceSafe(Rmin / 2, Rmax * 2, 200);
  return {
    results: [
      { label: "المقاومة المثلى", value: eng(Ropt, "Ω", 4), text: `Ropt = ${eng(Ropt, "Ω", 4)}` },
      { label: "المقاومة المستخدمة", value: eng(R, "Ω") },
      { label: "الخرج عند أقل مقاومة", value: eng(v1, "V", 4), text: `V(Rmin) = ${eng(v1, "V", 4)}` },
      { label: "الخرج عند أكبر مقاومة", value: eng(v2, "V", 4), text: `V(Rmax) = ${eng(v2, "V", 4)}` },
      { label: "مدى الخرج", value: eng(span, "V", 4) }
    ],
    blocks: [{ type: "plot", title: "جهد الخرج مقابل مقاومة الحساس", logX: true, xLabel: "Rs (Ω)", yLabel: "Vout (V)", series: [{ name: "Vout", points: xs.map((x) => [x, vout(Vcc, x, R, pos)]) }], vlines: [{ x: Rmin }, { x: Rmax }] }],
    steps, copy: `Ropt = ${eng(Ropt, "Ω", 4)}, R = ${eng(R, "Ω")}, V(Rmin) = ${eng(v1, "V", 4)}, V(Rmax) = ${eng(v2, "V", 4)}`
  };
}
