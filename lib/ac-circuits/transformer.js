import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "المحول المثالي: نسبة التحويل وجهد وتيار الثانوي والابتدائي والممانعة المنعكسة، مع القدرة وكفاءة اختيارية لحساب قدرة الدخل والمفاقيد.",
  keywords: ["محول", "transformer", "نسبة التحويل", "عدد اللفات", "ابتدائي", "ثانوي", "ممانعة منعكسة", "رافع", "خافض"],
  formulas: [
    { label: "المحول المثالي", tex: "a = \\frac{N_1}{N_2} = \\frac{V_1}{V_2} = \\frac{I_2}{I_1}" },
    { label: "الممانعة المنعكسة", tex: "Z_1' = a^2 Z_L" }
  ],
  inputs: [
    { id: "N1", label: "لفات الابتدائي N1", type: "number", default: "1000" },
    { id: "N2", label: "لفات الثانوي N2", type: "number", default: "50" },
    { id: "V1", label: "جهد الابتدائي V1", unit: "V", type: "number", default: "230" },
    { id: "RL", label: "مقاومة الحمل على الثانوي", unit: "Ω", type: "number", default: "5" },
    { id: "eff", label: "الكفاءة (اختياري)", unit: "%", type: "number" }
  ],
  example: { values: { N1: "1000", N2: "50", V1: "230", RL: "5", eff: "" }, expect: ["V2 = 11.5 V", "I1 = 115 mA"], note: "مثال: محول خافض 20:1 من 230 V لحمل 5 Ω." },
  invalid: { values: { N1: "1000", N2: "0", V1: "230", RL: "5" } },
  related: ["three-phase", "complex-power", "max-power-transfer", "rectifier-ripple"]
};

export function solve(input) {
  const N1 = num(input, "N1", "لفات الابتدائي", { positive: true });
  const N2 = num(input, "N2", "لفات الثانوي", { positive: true });
  const V1 = num(input, "V1", "جهد الابتدائي", { positive: true });
  const RL = num(input, "RL", "مقاومة الحمل", { positive: true });
  const eff = num(input, "eff", "الكفاءة", { optional: true, positive: true, max: 100 });
  const a = N1 / N2;
  const V2 = V1 / a, I2 = V2 / RL, I1 = I2 / a, Zin = a * a * RL, P = V2 * I2;
  const kind = a > 1 ? "خافض للجهد" : a < 1 ? "رافع للجهد" : "عازل (1:1)";
  const steps = [
    { text: `نسبة التحويل (المحول ${kind}):`, tex: `a = \\frac{N_1}{N_2} = \\frac{${ntex(N1)}}{${ntex(N2)}} = ${ntex(a, 6)}` },
    { text: "جهد الثانوي:", tex: `V_2 = \\frac{V_1}{a} = \\frac{${ntex(V1)}}{${ntex(a, 6)}} = ${ntex(V2, 6)}\\ V` },
    { text: "تيار الحمل ثم تيار الابتدائي (التيار يتناسب عكسياً مع الجهد):", tex: `I_2 = \\frac{V_2}{R_L} = ${ntex(I2, 6)}\\ A,\\quad I_1 = \\frac{I_2}{a} = ${ntex(I1, 6)}\\ A` },
    { text: "الممانعة التي يراها المصدر:", tex: `Z_{in} = a^2 R_L = ${ntex(a, 6)}^2 \\times ${ntex(RL)} = ${ntex(Zin, 6)}\\ \\Omega` },
    `في المحول المثالي القدرة محفوظة: $V_1 I_1 = ${fmt(V1 * I1, 6)}$ W = $V_2 I_2 = ${fmt(P, 6)}$ W.`
  ];
  const results = [
    { label: "نسبة التحويل a", value: a, sig: 6 },
    { label: "النوع", value: kind },
    { label: "جهد الثانوي V2", value: eng(V2, "V", 4), text: `V2 = ${eng(V2, "V", 4)}` },
    { label: "تيار الثانوي I2", value: eng(I2, "A", 4) },
    { label: "تيار الابتدائي I1", value: eng(I1, "A", 4), text: `I1 = ${eng(I1, "A", 4)}` },
    { label: "الممانعة المنعكسة", value: eng(Zin, "Ω", 4) },
    { label: "قدرة الحمل", value: eng(P, "W", 4) }
  ];
  if (eff !== null) {
    const Pin = P / (eff / 100);
    results.push({ label: "قدرة الدخل", value: eng(Pin, "W", 4) }, { label: "المفاقيد", value: eng(Pin - P, "W", 4) }, { label: "تيار الابتدائي الفعلي", value: eng(Pin / V1, "A", 4) });
    steps.push({ text: `بكفاءة ${fmt(eff)}%:`, tex: `P_{in} = \\frac{P_{out}}{\\eta} = ${ntex(Pin, 6)}\\ W,\\quad P_{loss} = ${ntex(Pin - P, 6)}\\ W` });
  }
  if (!isFinite(V2)) fail("قيم غير صالحة.", "N2");
  return { results, steps, copy: `V2 = ${eng(V2, "V", 4)}, I2 = ${eng(I2, "A", 4)}, I1 = ${eng(I1, "A", 4)}` };
}
