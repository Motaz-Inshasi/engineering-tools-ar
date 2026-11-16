import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "صمّم قياس التيار بمقاومة شنت: قيمة المقاومة لهبوط جهد محدد، والقدرة المبددة وتقدير القدرة الموصى بها، وكسب المكبر اللازم لملء مدى ADC، ودقة القياس بالأمبير لكل خطوة.",
  keywords: ["شنت", "shunt", "قياس التيار", "current sense", "مقاومة صغيرة", "مكبر تيار", "INA", "ADC"],
  formulas: [
    { label: "مقاومة الشنت والقدرة", tex: "R_{sh} = \\frac{V_{sh,max}}{I_{max}},\\qquad P = I_{max}^2 R_{sh}" },
    { label: "الكسب والدقة", tex: "G = \\frac{V_{ref}}{V_{sh,max}},\\qquad \\Delta I = \\frac{V_{ref}}{2^N\\, G\\, R_{sh}}" }
  ],
  inputs: [
    { id: "Imax", label: "أقصى تيار", unit: "A", type: "number", default: "10" },
    { id: "Vsh", label: "أقصى هبوط على الشنت", unit: "V", type: "number", default: "100m", help: "عادة 50 أو 75 أو 100 mV." },
    { id: "Vref", label: "مدى ADC", unit: "V", type: "number", default: "3.3" },
    { id: "N", label: "دقة ADC", unit: "بت", type: "number", default: "12" }
  ],
  example: { values: { Imax: "10", Vsh: "100m", Vref: "3.3", N: "12" }, expect: ["Rsh = 10 mΩ", "G = 33"], note: "مثال: قياس حتى 10 A بهبوط 100 mV و ADC بدقة 12 بت." },
  invalid: { values: { Imax: "10", Vsh: "0", Vref: "3.3", N: "12" } },
  related: ["ohms-law", "adc", "op-amp", "sample-rate-resolution"]
};

export function solve(input) {
  const Imax = num(input, "Imax", "أقصى تيار", { positive: true });
  const Vsh = num(input, "Vsh", "هبوط الشنت", { positive: true });
  const Vref = num(input, "Vref", "مدى ADC", { positive: true });
  const N = num(input, "N", "دقة ADC", { integer: true, min: 1, max: 32 });
  const R = Vsh / Imax, P = Imax * Imax * R;
  const rating = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10, 20, 50, 100].find((w) => w >= 2 * P) ?? 2 * P;
  const G = Vref / Vsh;
  const dI = Vref / Math.pow(2, N) / G / R;
  const steps = [
    { text: "قيمة المقاومة من قانون أوم عند أقصى تيار:", tex: `R_{sh} = \\frac{${ntex(Vsh)}}{${ntex(Imax)}} = ${ntex(R, 5)}\\ \\Omega` },
    { text: "القدرة المبددة عند أقصى تيار:", tex: `P = I^2 R = ${ntex(Imax)}^2 \\times ${ntex(R, 5)} = ${ntex(P, 5)}\\ W` },
    `نختار مقاومة قدرتها ضعف ذلك على الأقل: ${fmt(rating)} W، بسماحية 1% أو أفضل ومعامل حرارة منخفض، ونوصلها بأسلوب كلفن (أربعة أطراف) لتجنب مقاومة التوصيلات.`,
    { text: "كسب المكبر ليصبح أقصى هبوط مساوياً لمدى ADC:", tex: `G = \\frac{${ntex(Vref)}}{${ntex(Vsh)}} = ${ntex(G, 5)}` },
    { text: "أصغر تغير في التيار يمكن تمييزه:", tex: `\\Delta I = \\frac{${ntex(Vref)}}{2^{${N}} \\times ${ntex(G, 5)} \\times ${ntex(R, 5)}} = ${ntex(dI, 5)}\\ A` }
  ];
  return {
    results: [
      { label: "مقاومة الشنت", value: eng(R, "Ω", 4), text: `Rsh = ${eng(R, "Ω", 4)}` },
      { label: "القدرة المبددة", value: eng(P, "W", 4) },
      { label: "القدرة الموصى بها", value: `${fmt(rating)} W` },
      { label: "كسب المكبر", value: G, sig: 5, text: `G = ${fmt(G, 5)}` },
      { label: "دقة القياس لكل خطوة", value: eng(dI, "A", 4) }
    ],
    steps, copy: `Rsh = ${eng(R, "Ω", 4)}, P = ${eng(P, "W", 4)}, G = ${fmt(G, 5)}, ΔI = ${eng(dI, "A", 4)}`
  };
}
