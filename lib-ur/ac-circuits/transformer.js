import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "آئیڈیل ٹرانسفارمر: ٹرنز ریشو، ثانوی اور ابتدائی وولٹیج و کرنٹ، اور ریفلیکٹڈ امپیڈنس، ساتھ پاور اور اختیاری کارکردگی سے ان پٹ پاور اور نقصانات کا حساب۔",
  keywords: ["ٹرانسفارمر", "transformer", "ٹرنز ریشو", "ٹرنز کی تعداد", "پرائمری", "سیکنڈری", "ریفلیکٹڈ امپیڈنس", "اسٹیپ اپ", "اسٹیپ ڈاؤن"],
  formulas: [
    { label: "آئیڈیل ٹرانسفارمر", tex: "a = \\frac{N_1}{N_2} = \\frac{V_1}{V_2} = \\frac{I_2}{I_1}" },
    { label: "ریفلیکٹڈ امپیڈنس", tex: "Z_1' = a^2 Z_L" }
  ],
  inputs: [
    { id: "N1", label: "پرائمری ٹرنز N1", type: "number", default: "1000" },
    { id: "N2", label: "سیکنڈری ٹرنز N2", type: "number", default: "50" },
    { id: "V1", label: "پرائمری وولٹیج V1", unit: "V", type: "number", default: "230" },
    { id: "RL", label: "سیکنڈری پر لوڈ ریزسٹنس", unit: "Ω", type: "number", default: "5" },
    { id: "eff", label: "کارکردگی (اختیاری)", unit: "%", type: "number" }
  ],
  example: { values: { N1: "1000", N2: "50", V1: "230", RL: "5", eff: "" }, expect: ["V2 = 11.5 V", "I1 = 115 mA"], note: "مثال: 230 V سے 5 Ω لوڈ کے لیے 20:1 اسٹیپ ڈاؤن ٹرانسفارمر۔" },
  invalid: { values: { N1: "1000", N2: "0", V1: "230", RL: "5" } },
  related: ["three-phase", "complex-power", "max-power-transfer", "rectifier-ripple"]
};

export function solve(input) {
  const N1 = num(input, "N1", "پرائمری ٹرنز", { positive: true });
  const N2 = num(input, "N2", "سیکنڈری ٹرنز", { positive: true });
  const V1 = num(input, "V1", "پرائمری وولٹیج", { positive: true });
  const RL = num(input, "RL", "لوڈ ریزسٹنس", { positive: true });
  const eff = num(input, "eff", "کارکردگی", { optional: true, positive: true, max: 100 });
  const a = N1 / N2;
  const V2 = V1 / a, I2 = V2 / RL, I1 = I2 / a, Zin = a * a * RL, P = V2 * I2;
  const kind = a > 1 ? "وولٹیج کم کرنے والا" : a < 1 ? "وولٹیج بڑھانے والا" : "آئسولیشن (1:1)";
  const steps = [
    { text: `ٹرنز ریشو (${kind} ٹرانسفارمر):`, tex: `a = \\frac{N_1}{N_2} = \\frac{${ntex(N1)}}{${ntex(N2)}} = ${ntex(a, 6)}` },
    { text: "ثانوی وولٹیج:", tex: `V_2 = \\frac{V_1}{a} = \\frac{${ntex(V1)}}{${ntex(a, 6)}} = ${ntex(V2, 6)}\\ V` },
    { text: "لوڈ کرنٹ، پھر پرائمری کرنٹ (کرنٹ وولٹیج کے الٹ متناسب ہوتا ہے):", tex: `I_2 = \\frac{V_2}{R_L} = ${ntex(I2, 6)}\\ A,\\quad I_1 = \\frac{I_2}{a} = ${ntex(I1, 6)}\\ A` },
    { text: "سورس کو نظر آنے والا امپیڈنس:", tex: `Z_{in} = a^2 R_L = ${ntex(a, 6)}^2 \\times ${ntex(RL)} = ${ntex(Zin, 6)}\\ \\Omega` },
    `آئیڈیل ٹرانسفارمر میں پاور محفوظ رہتی ہے: $V_1 I_1 = ${fmt(V1 * I1, 6)}$ W = $V_2 I_2 = ${fmt(P, 6)}$ W۔`
  ];
  const results = [
    { label: "ٹرنز ریشو a", value: a, sig: 6 },
    { label: "قسم", value: kind },
    { label: "ثانوی وولٹیج V2", value: eng(V2, "V", 4), text: `V2 = ${eng(V2, "V", 4)}` },
    { label: "ثانوی کرنٹ I2", value: eng(I2, "A", 4) },
    { label: "پرائمری کرنٹ I1", value: eng(I1, "A", 4), text: `I1 = ${eng(I1, "A", 4)}` },
    { label: "ریفلیکٹڈ امپیڈنس", value: eng(Zin, "Ω", 4) },
    { label: "لوڈ پاور", value: eng(P, "W", 4) }
  ];
  if (eff !== null) {
    const Pin = P / (eff / 100);
    results.push({ label: "ان پٹ پاور", value: eng(Pin, "W", 4) }, { label: "نقصانات", value: eng(Pin - P, "W", 4) }, { label: "اصل پرائمری کرنٹ", value: eng(Pin / V1, "A", 4) });
    steps.push({ text: `${fmt(eff)}% کارکردگی کے ساتھ:`, tex: `P_{in} = \\frac{P_{out}}{\\eta} = ${ntex(Pin, 6)}\\ W,\\quad P_{loss} = ${ntex(Pin - P, 6)}\\ W` });
  }
  if (!isFinite(V2)) fail("غلط قدریں۔", "N2");
  return { results, steps, copy: `V2 = ${eng(V2, "V", 4)}, I2 = ${eng(I2, "A", 4)}, I1 = ${eng(I1, "A", 4)}` };
}
