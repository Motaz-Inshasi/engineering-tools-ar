import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "احسب مقاومة الـ LED المناسبة لأي جهد تغذية وعدد من الـ LED على التوالي، مع أقرب قيمة قياسية آمنة والتيار الفعلي بها وقدرة المقاومة المطلوبة.",
  keywords: ["مقاومة LED", "ليد", "LED resistor", "جهد أمامي", "تيار LED", "مقاومة تحديد التيار"],
  formulas: [{ label: "مقاومة تحديد التيار", tex: "R = \\frac{V_s - n V_F}{I_F},\\qquad P_R = I_F^2 R" }],
  inputs: [
    { id: "Vs", label: "جهد التغذية Vs", unit: "V", type: "number", default: "5" },
    { id: "Vf", label: "الجهد الأمامي لكل LED", unit: "V", type: "number", default: "2", help: "تقريباً: أحمر 2، أخضر/أزرق/أبيض 3 فولت." },
    { id: "If", label: "تيار LED المطلوب", unit: "A", type: "number", default: "20m" },
    { id: "n", label: "عدد الـ LED على التوالي", type: "number", default: "1" },
    { id: "series", label: "السلسلة القياسية", type: "select", default: "E12", options: [["E12", "E12"], ["E24", "E24"], ["E96", "E96"]] }
  ],
  example: { values: { Vs: "5", Vf: "2", If: "20m", n: "1", series: "E12" }, expect: ["R = 150 Ω", "150 Ω (E12)"], note: "مثال: LED أحمر من 5 V بتيار 20 mA." },
  invalid: { values: { Vs: "5", Vf: "3", If: "20m", n: "2" } },
  related: ["ohms-law", "resistor-color-code", "standard-resistor-values", "zener-regulator"]
};

export function solve(input) {
  const Vs = num(input, "Vs", "جهد التغذية", { positive: true });
  const Vf = num(input, "Vf", "الجهد الأمامي", { positive: true });
  const If = num(input, "If", "التيار", { positive: true });
  const n = num(input, "n", "عدد الـ LED", { integer: true, min: 1, max: 100 });
  const series = choice(input, "series", "السلسلة", ["E12", "E24", "E96"], "E12");
  const Vr = Vs - n * Vf;
  if (Vr <= 0) fail(`جهد التغذية (${fmt(Vs)} V) لا يكفي لتشغيل ${n} LED على التوالي (${fmt(n * Vf)} V). قلّل عددها أو ارفع الجهد.`, "n");
  const R = Vr / If;
  const std = nearest(R, series);
  const Rstd = std.above;
  const Iact = Vr / Rstd, P = Iact * Iact * Rstd;
  const rating = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10].find((w) => w >= 2 * P) ?? 10;
  const steps = [
    { text: "الجهد المتبقي على المقاومة:", tex: `V_R = V_s - nV_F = ${ntex(Vs)} - ${n} \\times ${ntex(Vf)} = ${ntex(Vr, 6)}\\ V` },
    { text: "المقاومة المحسوبة من قانون أوم:", tex: `R = \\frac{V_R}{I_F} = \\frac{${ntex(Vr, 6)}}{${ntex(If)}} = ${ntex(R, 6)}\\ \\Omega` },
    `نختار أقرب قيمة قياسية ${series} أكبر منها حتى لا يتجاوز التيار المطلوب: ${eng(Rstd, "Ω")}.`,
    { text: "التيار الفعلي والقدرة في المقاومة:", tex: `I = \\frac{${ntex(Vr, 6)}}{${ntex(Rstd)}} = ${ntex(Iact, 5)}\\ A,\\quad P = I^2R = ${ntex(P, 5)}\\ W` },
    `نختار مقاومة قدرتها ضعف القدرة المحسوبة على الأقل للأمان: ${fmt(rating)} W.`
  ];
  return {
    results: [
      { label: "المقاومة المحسوبة", value: eng(R, "Ω", 4), text: `R = ${eng(R, "Ω", 4)}` },
      { label: `أقرب قيمة ${series} آمنة`, value: eng(Rstd, "Ω"), text: `${series}: ${eng(Rstd, "Ω")}` },
      { label: "التيار الفعلي", value: eng(Iact, "A", 4) },
      { label: "قدرة المقاومة", value: eng(P, "W", 4) },
      { label: "قدرة المقاومة الموصى بها", value: `${fmt(rating)} W` },
      { label: "قدرة كل LED", value: eng(Vf * Iact, "W", 4) }
    ],
    steps, copy: `R = ${eng(R, "Ω", 4)} → ${eng(Rstd, "Ω")} (${series}), I = ${eng(Iact, "A", 4)}, P = ${eng(P, "W", 3)}`
  };
}
