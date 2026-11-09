import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "قنطرة ويتستون: جهد الخرج وشرط الاتزان، وحساب المقاومة المجهولة عند الاتزان، وتيار الجلفانومتر بمكافئ ثيفينين عند إدخال مقاومته.",
  keywords: ["قنطرة ويتستون", "wheatstone", "bridge", "اتزان القنطرة", "مقاومة مجهولة", "جلفانومتر"],
  formulas: [
    { label: "جهد الخرج (R1 فوق R2 يساراً، R3 فوق R4 يميناً)", tex: "V_{out} = V_s\\left(\\frac{R_2}{R_1 + R_2} - \\frac{R_4}{R_3 + R_4}\\right)" },
    { label: "شرط الاتزان", tex: "\\frac{R_1}{R_2} = \\frac{R_3}{R_4} \\;\\Rightarrow\\; R_4 = R_3\\frac{R_2}{R_1}" }
  ],
  inputs: [
    { id: "mode", label: "المطلوب", type: "select", default: "vout", options: [["vout", "جهد الخرج"], ["balance", "R4 المجهولة عند الاتزان"]] },
    { id: "Vs", label: "جهد التغذية Vs", unit: "V", type: "number", default: "10", when: { mode: ["vout"] } },
    { id: "R1", label: "R1", unit: "Ω", type: "number", default: "1k" },
    { id: "R2", label: "R2", unit: "Ω", type: "number", default: "1k" },
    { id: "R3", label: "R3", unit: "Ω", type: "number", default: "1k" },
    { id: "R4", label: "R4", unit: "Ω", type: "number", default: "1.1k", when: { mode: ["vout"] } },
    { id: "Rg", label: "مقاومة الجلفانومتر Rg (اختياري)", unit: "Ω", type: "number", when: { mode: ["vout"] } }
  ],
  example: { values: { mode: "vout", Vs: "10", R1: "1k", R2: "1k", R3: "1k", R4: "1.1k", Rg: "" }, expect: ["Vout = -238.1 mV"], note: "مثال: قنطرة متزنة تقريباً، R4 أكبر بـ 10%." },
  invalid: { values: { mode: "vout", Vs: "10", R1: "1k", R2: "-1k", R3: "1k", R4: "1k" } },
  related: ["strain-gauge-bridge", "voltage-current-divider", "thevenin-norton", "rtd"]
};

export function bridge(Vs, R1, R2, R3, R4) {
  return Vs * (R2 / (R1 + R2) - R4 / (R3 + R4));
}

export function solve(input) {
  const mode = choice(input, "mode", "المطلوب", ["vout", "balance"], "vout");
  const R1 = num(input, "R1", "R1", { positive: true }), R2 = num(input, "R2", "R2", { positive: true }), R3 = num(input, "R3", "R3", { positive: true });
  if (mode === "balance") {
    const R4 = (R3 * R2) / R1;
    return {
      results: [{ label: "R4 عند الاتزان", value: eng(R4, "Ω", 5), text: `R4 = ${eng(R4, "Ω", 5)}` }],
      steps: [
        "عند الاتزان يتساوى جهدا نقطتي المنتصف فلا يمر تيار في الجلفانومتر، وهذا لا يعتمد على جهد التغذية.",
        { tex: `\\frac{R_1}{R_2} = \\frac{R_3}{R_4} \\Rightarrow R_4 = R_3\\frac{R_2}{R_1} = ${ntex(R3)} \\times \\frac{${ntex(R2)}}{${ntex(R1)}} = ${ntex(R4, 6)}\\ \\Omega` }
      ],
      copy: `R4 = ${eng(R4, "Ω", 5)}`
    };
  }
  const Vs = num(input, "Vs", "جهد التغذية");
  const R4 = num(input, "R4", "R4", { positive: true });
  const Rg = num(input, "Rg", "مقاومة الجلفانومتر", { optional: true, positive: true });
  const Va = (Vs * R2) / (R1 + R2), Vb = (Vs * R4) / (R3 + R4), Vout = Va - Vb;
  const balanced = Math.abs(R1 * R4 - R2 * R3) <= 1e-12 * R1 * R4;
  const steps = [
    { text: "جهد نقطة المنتصف اليسرى (مقسم R1-R2):", tex: `V_a = ${ntex(Vs)}\\frac{${ntex(R2)}}{${ntex(R1)} + ${ntex(R2)}} = ${ntex(Va, 6)}\\ V` },
    { text: "جهد نقطة المنتصف اليمنى (مقسم R3-R4):", tex: `V_b = ${ntex(Vs)}\\frac{${ntex(R4)}}{${ntex(R3)} + ${ntex(R4)}} = ${ntex(Vb, 6)}\\ V` },
    { text: "جهد الخرج هو الفرق بينهما:", tex: `V_{out} = V_a - V_b = ${ntex(Vout, 6)}\\ V` },
    balanced ? "النسبتان متساويتان فالقنطرة متزنة." : `القنطرة غير متزنة: $R_1 R_4 = ${ntex(R1 * R4, 6)}$ بينما $R_2 R_3 = ${ntex(R2 * R3, 6)}$.`
  ];
  const results = [{ label: "جهد الخرج Vout", value: eng(Vout, "V", 4), text: `Vout = ${eng(Vout, "V", 4)}` }, { label: "Va", value: eng(Va, "V", 5) }, { label: "Vb", value: eng(Vb, "V", 5) }, { label: "الحالة", value: balanced ? "متزنة" : "غير متزنة" }];
  if (Rg !== null) {
    const Rth = (R1 * R2) / (R1 + R2) + (R3 * R4) / (R3 + R4);
    const Ig = Vout / (Rth + Rg);
    steps.push({ text: "بمكافئ ثيفينين بين نقطتي المنتصف (المصدر قصر):", tex: `R_{th} = R_1 \\parallel R_2 + R_3 \\parallel R_4 = ${ntex(Rth, 6)}\\ \\Omega,\\quad I_g = \\frac{V_{out}}{R_{th} + R_g} = ${ntex(Ig, 6)}\\ A` });
    results.push({ label: "مقاومة ثيفينين للقنطرة", value: eng(Rth, "Ω", 4) }, { label: "تيار الجلفانومتر", value: eng(Ig, "A", 4) });
  }
  return { results, steps, copy: `Vout = ${eng(Vout, "V", 4)}` };
}
