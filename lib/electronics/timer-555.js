import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "المؤقت 555 في وضعي الهزاز غير المستقر (astable) وأحادي الاستقرار (monostable): التردد ودورة العمل وأزمنة الارتفاع والانخفاض وعرض النبضة، مع شكل الخرج.",
  keywords: ["555", "مؤقت 555", "timer", "astable", "monostable", "هزاز", "نبضة", "دورة العمل", "duty cycle"],
  formulas: [
    { label: "الهزاز غير المستقر", tex: "t_H = \\ln 2\\,(R_1 + R_2)C,\\quad t_L = \\ln 2\\,R_2 C,\\quad f = \\frac{1}{t_H + t_L} \\approx \\frac{1.44}{(R_1 + 2R_2)C}" },
    { label: "أحادي الاستقرار", tex: "t = \\ln 3\\,RC \\approx 1.1\\,RC" }
  ],
  inputs: [
    { id: "mode", label: "الوضع", type: "select", default: "astable", options: [["astable", "غير مستقر (مذبذب)"], ["mono", "أحادي الاستقرار (نبضة واحدة)"]] },
    { id: "R1", label: "R1", unit: "Ω", type: "number", default: "1k", when: { mode: ["astable"] } },
    { id: "R2", label: "R2", unit: "Ω", type: "number", default: "10k", when: { mode: ["astable"] } },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "100k", when: { mode: ["mono"] } },
    { id: "C", label: "C", unit: "F", type: "number", default: "100n" }
  ],
  example: { values: { mode: "astable", R1: "1k", R2: "10k", C: "100n" }, expect: ["f = 687 Hz", "52.38%"], note: "مثال: R1 = 1 kΩ و R2 = 10 kΩ و C = 100 nF." },
  invalid: { values: { mode: "astable", R1: "1k", R2: "0", C: "100n" } },
  related: ["rc-rl-transient", "pwm-servo", "capacitor-inductor-combination"]
};

export function solve(input) {
  const mode = choice(input, "mode", "الوضع", ["astable", "mono"], "astable");
  const C = num(input, "C", "C", { positive: true });
  const L2 = Math.LN2, L3 = Math.log(3);
  if (mode === "mono") {
    const R = num(input, "R", "R", { positive: true });
    const t = L3 * R * C;
    return {
      results: [{ label: "عرض النبضة", value: eng(t, "s", 4), text: `t = ${eng(t, "s", 4)}` }],
      steps: [
        "عند نبضة القدح يرتفع الخرج ويشحن المكثف عبر R حتى يبلغ 2/3 جهد التغذية، فينخفض الخرج.",
        { text: "زمن الشحن من 0 إلى ⅔Vcc:", tex: `t = RC\\ln 3 = ${ntex(R)} \\times ${ntex(C)} \\times 1.0986 = ${ntex(t, 5)}\\ s` },
        "النتيجة لا تعتمد على جهد التغذية لأن عتبتي المقارنة نسبة منه."
      ],
      copy: `t = ${eng(t, "s", 4)}`
    };
  }
  const R1 = num(input, "R1", "R1", { positive: true }), R2 = num(input, "R2", "R2", { positive: true });
  if (R1 < 1) fail("R1 صغيرة جداً، وقد تُتلف دبوس التفريغ (يُفضّل 1 kΩ على الأقل).", "R1");
  const tH = L2 * (R1 + R2) * C, tL = L2 * R2 * C, T = tH + tL, f = 1 / T, D = tH / T;
  const steps = [
    "يتأرجح جهد المكثف بين ⅓Vcc و ⅔Vcc: يشحن عبر R1 + R2 (الخرج مرتفع) ويفرغ عبر R2 فقط (الخرج منخفض).",
    { text: "زمن الارتفاع والانخفاض:", tex: `t_H = \\ln 2 (${ntex(R1)} + ${ntex(R2)})(${ntex(C)}) = ${ntex(tH, 5)}\\ s,\\quad t_L = \\ln 2 \\cdot ${ntex(R2)} \\cdot ${ntex(C)} = ${ntex(tL, 5)}\\ s` },
    { text: "التردد ودورة العمل:", tex: `f = \\frac{1}{t_H + t_L} = ${ntex(f, 5)}\\ Hz,\\quad D = \\frac{t_H}{t_H + t_L} = ${ntex(100 * D, 4)}\\%` },
    "دورة العمل في هذه الدائرة دائماً أكبر من 50%؛ للحصول على أقل من ذلك يُضاف دايود موازٍ لـ R2."
  ];
  const pts = [];
  for (let k = 0; k < 3; k++) {
    const t0 = k * T;
    pts.push([t0, 0], [t0, 1], [t0 + tH, 1], [t0 + tH, 0], [t0 + T, 0]);
  }
  return {
    results: [
      { label: "التردد", value: eng(f, "Hz", 4), text: `f = ${eng(f, "Hz", 4)}` },
      { label: "دورة العمل", value: `${fmt(100 * D, 4)}%`, text: `D = ${fmt(100 * D, 4)}%` },
      { label: "زمن الارتفاع tH", value: eng(tH, "s", 4) },
      { label: "زمن الانخفاض tL", value: eng(tL, "s", 4) },
      { label: "الدور T", value: eng(T, "s", 4) }
    ],
    blocks: [{ type: "plot", title: "شكل الخرج (ثلاث دورات)", xLabel: "t (s)", yLabel: "الخرج", yMin: -0.2, yMax: 1.3, series: [{ name: "الخرج", points: pts }] }],
    steps, copy: `f = ${eng(f, "Hz", 4)}, D = ${fmt(100 * D, 4)}%, tH = ${eng(tH, "s", 4)}, tL = ${eng(tL, "s", 4)}`
  };
}
