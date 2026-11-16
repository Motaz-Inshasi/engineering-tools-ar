import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "ترانسفورماتور ایده‌آل: نسبت تبدیل، ولتاژ و جریان ثانویه و اولیه و امپدانس بازتابیده، همراه با توان و بازده اختیاری برای محاسبه توان ورودی و تلفات.",
  keywords: ["ترانسفورماتور", "transformer", "نسبت تبدیل", "تعداد دور", "اولیه", "ثانویه", "امپدانس بازتابیده", "افزاینده", "کاهنده"],
  formulas: [
    { label: "ترانسفورماتور ایده‌آل", tex: "a = \\frac{N_1}{N_2} = \\frac{V_1}{V_2} = \\frac{I_2}{I_1}" },
    { label: "امپدانس بازتابیده", tex: "Z_1' = a^2 Z_L" }
  ],
  inputs: [
    { id: "N1", label: "تعداد دور اولیه N1", type: "number", default: "1000" },
    { id: "N2", label: "تعداد دور ثانویه N2", type: "number", default: "50" },
    { id: "V1", label: "ولتاژ اولیه V1", unit: "V", type: "number", default: "230" },
    { id: "RL", label: "مقاومت بار روی ثانویه", unit: "Ω", type: "number", default: "5" },
    { id: "eff", label: "بازده (اختیاری)", unit: "%", type: "number" }
  ],
  example: { values: { N1: "1000", N2: "50", V1: "230", RL: "5", eff: "" }, expect: ["V2 = 11.5 V", "I1 = 115 mA"], note: "مثال: ترانسفورماتور کاهنده 20:1 از 230 ولت به بار 5 اهم." },
  invalid: { values: { N1: "1000", N2: "0", V1: "230", RL: "5" } },
  related: ["three-phase", "complex-power", "max-power-transfer", "rectifier-ripple"]
};

export function solve(input) {
  const N1 = num(input, "N1", "تعداد دور اولیه", { positive: true });
  const N2 = num(input, "N2", "تعداد دور ثانویه", { positive: true });
  const V1 = num(input, "V1", "ولتاژ اولیه", { positive: true });
  const RL = num(input, "RL", "مقاومت بار", { positive: true });
  const eff = num(input, "eff", "بازده", { optional: true, positive: true, max: 100 });
  const a = N1 / N2;
  const V2 = V1 / a, I2 = V2 / RL, I1 = I2 / a, Zin = a * a * RL, P = V2 * I2;
  const kind = a > 1 ? "کاهنده ولتاژ" : a < 1 ? "افزاینده ولتاژ" : "ایزوله (1:1)";
  const steps = [
    { text: `نسبت تبدیل (ترانسفورماتور ${kind}):`, tex: `a = \\frac{N_1}{N_2} = \\frac{${ntex(N1)}}{${ntex(N2)}} = ${ntex(a, 6)}` },
    { text: "ولتاژ ثانویه:", tex: `V_2 = \\frac{V_1}{a} = \\frac{${ntex(V1)}}{${ntex(a, 6)}} = ${ntex(V2, 6)}\\ V` },
    { text: "جریان بار، سپس جریان اولیه (جریان با ولتاژ نسبت وارون دارد):", tex: `I_2 = \\frac{V_2}{R_L} = ${ntex(I2, 6)}\\ A,\\quad I_1 = \\frac{I_2}{a} = ${ntex(I1, 6)}\\ A` },
    { text: "امپدانسی که منبع می‌بیند:", tex: `Z_{in} = a^2 R_L = ${ntex(a, 6)}^2 \\times ${ntex(RL)} = ${ntex(Zin, 6)}\\ \\Omega` },
    `در ترانسفورماتور ایده‌آل توان پایسته است: $V_1 I_1 = ${fmt(V1 * I1, 6)}$ W = $V_2 I_2 = ${fmt(P, 6)}$ W.`
  ];
  const results = [
    { label: "نسبت تبدیل a", value: a, sig: 6 },
    { label: "نوع", value: kind },
    { label: "ولتاژ ثانویه V2", value: eng(V2, "V", 4), text: `V2 = ${eng(V2, "V", 4)}` },
    { label: "جریان ثانویه I2", value: eng(I2, "A", 4) },
    { label: "جریان اولیه I1", value: eng(I1, "A", 4), text: `I1 = ${eng(I1, "A", 4)}` },
    { label: "امپدانس بازتابیده", value: eng(Zin, "Ω", 4) },
    { label: "توان بار", value: eng(P, "W", 4) }
  ];
  if (eff !== null) {
    const Pin = P / (eff / 100);
    results.push({ label: "توان ورودی", value: eng(Pin, "W", 4) }, { label: "تلفات", value: eng(Pin - P, "W", 4) }, { label: "جریان واقعی اولیه", value: eng(Pin / V1, "A", 4) });
    steps.push({ text: `با بازده ${fmt(eff)}٪:`, tex: `P_{in} = \\frac{P_{out}}{\\eta} = ${ntex(Pin, 6)}\\ W,\\quad P_{loss} = ${ntex(Pin - P, 6)}\\ W` });
  }
  if (!isFinite(V2)) fail("مقادیر نامعتبر.", "N2");
  return { results, steps, copy: `V2 = ${eng(V2, "V", 4)}, I2 = ${eng(I2, "A", 4)}, I1 = ${eng(I1, "A", 4)}` };
}
