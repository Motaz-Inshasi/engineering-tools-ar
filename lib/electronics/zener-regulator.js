import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "صمّم منظم زينر بمقاومة توالي: المدى المسموح للمقاومة، والقيمة القياسية المختارة، وتيار الزينر وقدرته في أسوأ الحالات عند تغير جهد الدخل والحمل.",
  keywords: ["زينر", "zener", "منظم زينر", "مقاومة التوالي", "تنظيم الجهد", "قدرة الزينر"],
  formulas: [
    { label: "أكبر مقاومة توالي (أسوأ حالة: أقل دخل وأكبر حمل)", tex: "R_{s,max} = \\frac{V_{in,min} - V_Z}{I_{L,max} + I_{Z,min}}" },
    { label: "أكبر تيار وقدرة في الزينر (أكبر دخل وأقل حمل)", tex: "I_{Z,max} = \\frac{V_{in,max} - V_Z}{R_s} - I_{L,min},\\quad P_Z = V_Z I_{Z,max}" }
  ],
  inputs: [
    { id: "Vmin", label: "أقل جهد دخل", unit: "V", type: "number", default: "10" },
    { id: "Vmax", label: "أكبر جهد دخل", unit: "V", type: "number", default: "14" },
    { id: "Vz", label: "جهد الزينر Vz", unit: "V", type: "number", default: "5.1" },
    { id: "ILmax", label: "أكبر تيار حمل", unit: "A", type: "number", default: "50m" },
    { id: "ILmin", label: "أقل تيار حمل", unit: "A", type: "number", default: "0" },
    { id: "Izmin", label: "أقل تيار زينر للتنظيم", unit: "A", type: "number", default: "5m" },
    { id: "Pz", label: "قدرة الزينر المقننة (اختياري)", unit: "W", type: "number", default: "1" }
  ],
  example: { values: { Vmin: "10", Vmax: "14", Vz: "5.1", ILmax: "50m", ILmin: "0", Izmin: "5m", Pz: "1" }, expect: ["Rs,max = 89.09 Ω", "Rs = 82 Ω"], note: "مثال: تنظيم 5.1 V من دخل 10–14 V لحمل حتى 50 mA." },
  invalid: { values: { Vmin: "4", Vmax: "14", Vz: "5.1", ILmax: "50m", Izmin: "5m" } },
  related: ["voltage-regulator", "rectifier-ripple", "led-resistor"]
};

export function solve(input) {
  const Vmin = num(input, "Vmin", "أقل جهد دخل", { positive: true });
  const Vmax = num(input, "Vmax", "أكبر جهد دخل", { positive: true });
  const Vz = num(input, "Vz", "جهد الزينر", { positive: true });
  const ILmax = num(input, "ILmax", "أكبر تيار حمل", { nonNegative: true });
  const ILmin = num(input, "ILmin", "أقل تيار حمل", { nonNegative: true, default: 0 });
  const Izmin = num(input, "Izmin", "أقل تيار زينر", { positive: true });
  const Pz = num(input, "Pz", "قدرة الزينر", { optional: true, positive: true });
  if (Vmax < Vmin) fail("أكبر جهد دخل يجب ألا يقل عن أقل جهد.", "Vmax");
  if (ILmin > ILmax) fail("أقل تيار حمل يجب ألا يتجاوز أكبره.", "ILmin");
  if (Vmin <= Vz) fail(`أقل جهد دخل يجب أن يكون أكبر من جهد الزينر (${fmt(Vz)} V) ليبقى في التنظيم.`, "Vmin");
  const RsMax = (Vmin - Vz) / (ILmax + Izmin);
  const Rs = nearest(RsMax, "E12").below;
  const IzMax = (Vmax - Vz) / Rs - ILmin;
  const PzMax = Vz * IzMax;
  const PRs = Math.pow(Vmax - Vz, 2) / Rs;
  const IzAtMin = (Vmin - Vz) / Rs - ILmax;
  const steps = [
    { text: "أسوأ حالة للتنظيم: أقل جهد دخل وأكبر تيار حمل، ويجب أن يبقى في الزينر Iz,min على الأقل:", tex: `R_{s,max} = \\frac{${ntex(Vmin)} - ${ntex(Vz)}}{${ntex(ILmax)} + ${ntex(Izmin)}} = ${ntex(RsMax, 5)}\\ \\Omega` },
    `نختار قيمة قياسية E12 أصغر منها: $R_s = ${ntex(Rs)}\\ \\Omega$، فيمر عند أسوأ حالة تيار زينر ${eng(IzAtMin, "A", 4)}.`,
    { text: "أسوأ حالة للقدرة: أكبر جهد دخل وأقل حمل، فيمر أكبر تيار في الزينر:", tex: `I_{Z,max} = \\frac{${ntex(Vmax)} - ${ntex(Vz)}}{${ntex(Rs)}} - ${ntex(ILmin)} = ${ntex(IzMax, 5)}\\ A,\\quad P_Z = ${ntex(PzMax, 5)}\\ W` },
    { text: "القدرة في مقاومة التوالي (أسوأ حالة):", tex: `P_{R} = \\frac{(${ntex(Vmax)} - ${ntex(Vz)})^2}{${ntex(Rs)}} = ${ntex(PRs, 5)}\\ W` }
  ];
  const results = [
    { label: "أكبر مقاومة توالي مسموحة", value: eng(RsMax, "Ω", 4), text: `Rs,max = ${eng(RsMax, "Ω", 4)}` },
    { label: "المقاومة المختارة (E12)", value: eng(Rs, "Ω"), text: `Rs = ${eng(Rs, "Ω")}` },
    { label: "أكبر تيار في الزينر", value: eng(IzMax, "A", 4) },
    { label: "أكبر قدرة في الزينر", value: eng(PzMax, "W", 4) },
    { label: "أكبر قدرة في المقاومة", value: eng(PRs, "W", 4) }
  ];
  if (Pz !== null) {
    const ok = PzMax <= Pz;
    results.push({ label: "الحكم", value: ok ? `مناسب (${fmt((100 * PzMax) / Pz, 3)}% من قدرة الزينر)` : "الزينر سيحترق: اختر زينر أكبر قدرة أو قلّل مدى الدخل" });
    steps.push(ok ? `القدرة ${fmt(PzMax, 4)} W أقل من القدرة المقننة ${fmt(Pz)} W.` : `القدرة ${fmt(PzMax, 4)} W تتجاوز القدرة المقننة ${fmt(Pz)} W.`);
  }
  return { results, steps, copy: `Rs,max = ${eng(RsMax, "Ω", 4)}, Rs = ${eng(Rs, "Ω")}, Iz,max = ${eng(IzMax, "A", 4)}, Pz = ${eng(PzMax, "W", 4)}` };
}
