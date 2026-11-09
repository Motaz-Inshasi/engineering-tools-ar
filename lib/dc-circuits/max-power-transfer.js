import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { logspaceSafe } from "./common.js";

export const meta = {
  description: "نظرية أقصى نقل للقدرة: الحمل الأمثل وأقصى قدرة والكفاءة عندها، والقدرة والكفاءة لأي حمل تختاره، مع منحنى القدرة مقابل مقاومة الحمل.",
  keywords: ["أقصى نقل للقدرة", "maximum power transfer", "مقاومة الحمل", "ثيفينين", "كفاءة", "مطابقة الممانعة"],
  formulas: [
    { label: "القدرة في الحمل", tex: "P_L = \\frac{V_{th}^2 R_L}{(R_{th} + R_L)^2}" },
    { label: "الشرط والقيمة القصوى", tex: "R_L = R_{th} \\Rightarrow P_{max} = \\frac{V_{th}^2}{4R_{th}},\\quad \\eta = 50\\%" }
  ],
  inputs: [
    { id: "Vth", label: "جهد ثيفينين Vth", unit: "V", type: "number", default: "12" },
    { id: "Rth", label: "مقاومة ثيفينين Rth", unit: "Ω", type: "number", default: "8" },
    { id: "RL", label: "مقاومة حمل للمقارنة (اختياري)", unit: "Ω", type: "number", default: "4" }
  ],
  example: { values: { Vth: "12", Rth: "8", RL: "4" }, expect: ["Pmax = 4.5 W"], note: "مثال: مصدر 12 V بمقاومة داخلية 8 Ω." },
  invalid: { values: { Vth: "12", Rth: "0" } },
  related: ["thevenin-norton", "ohms-law", "transformer"]
};

export function power(Vth, Rth, RL) {
  return (Vth * Vth * RL) / Math.pow(Rth + RL, 2);
}

export function solve(input) {
  const Vth = num(input, "Vth", "جهد ثيفينين", { nonZero: true });
  const Rth = num(input, "Rth", "مقاومة ثيفينين", { positive: true });
  const RL = num(input, "RL", "مقاومة الحمل", { optional: true, nonNegative: true });
  const Pmax = (Vth * Vth) / (4 * Rth);
  const steps = [
    "نشتق $P_L$ بالنسبة لـ $R_L$ ونساويها بالصفر فنجد أن القدرة تبلغ أقصاها عندما تساوي مقاومة الحمل مقاومة ثيفينين.",
    { tex: `R_L = R_{th} = ${ntex(Rth)}\\ \\Omega,\\qquad P_{max} = \\frac{${ntex(Vth)}^2}{4 \\times ${ntex(Rth)}} = ${ntex(Pmax, 6)}\\ W` },
    "عند هذه النقطة تُستهلك قدرة مساوية داخل المصدر، فالكفاءة 50% فقط. أنظمة القدرة الكبيرة تعمل بكفاءة أعلى بحمل أكبر من Rth."
  ];
  const results = [{ label: "مقاومة الحمل المثلى", value: eng(Rth, "Ω", 4) }, { label: "أقصى قدرة", value: eng(Pmax, "W", 4), text: `Pmax = ${eng(Pmax, "W", 4)}` }, { label: "الكفاءة عندها", value: "50%" }];
  if (RL !== null) {
    const P = power(Vth, Rth, RL), eff = RL / (Rth + RL);
    results.push({ label: `القدرة في الحمل ${eng(RL, "Ω")}`, value: eng(P, "W", 4) }, { label: "الكفاءة لهذا الحمل", value: `${fmt(100 * eff, 4)}%` }, { label: "نسبة من القدرة القصوى", value: `${fmt((100 * P) / Pmax, 4)}%` });
    steps.push({ text: `للحمل ${eng(RL, "Ω")}:`, tex: `P_L = \\frac{${ntex(Vth)}^2 \\times ${ntex(RL)}}{(${ntex(Rth)} + ${ntex(RL)})^2} = ${ntex(P, 6)}\\ W,\\quad \\eta = \\frac{R_L}{R_{th} + R_L} = ${ntex(100 * eff, 4)}\\%` });
  }
  const xs = logspaceSafe(Rth / 100, Rth * 100, 300);
  return {
    results, steps, copy: `RL = ${eng(Rth, "Ω")}, Pmax = ${eng(Pmax, "W", 4)}`,
    blocks: [{ type: "plot", title: "القدرة في الحمل مقابل مقاومته", logX: true, xLabel: "RL (Ω)", yLabel: "P (W)", series: [{ name: "P(RL)", points: xs.map((x) => [x, power(Vth, Rth, x)]) }], vlines: [{ x: Rth }] }]
  };
}
