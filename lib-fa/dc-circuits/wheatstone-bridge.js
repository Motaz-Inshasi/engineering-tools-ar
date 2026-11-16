import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "پل وتستون: ولتاژ خروجی و شرط تعادل، محاسبه مقاومت مجهول در حالت تعادل، و جریان گالوانومتر با معادل تونن هنگام وارد کردن مقاومت آن.",
  keywords: ["پل وتستون", "wheatstone", "bridge", "تعادل پل", "مقاومت مجهول", "گالوانومتر"],
  formulas: [
    { label: "ولتاژ خروجی (R1 بالای R2 در چپ، R3 بالای R4 در راست)", tex: "V_{out} = V_s\\left(\\frac{R_2}{R_1 + R_2} - \\frac{R_4}{R_3 + R_4}\\right)" },
    { label: "شرط تعادل", tex: "\\frac{R_1}{R_2} = \\frac{R_3}{R_4} \\;\\Rightarrow\\; R_4 = R_3\\frac{R_2}{R_1}" }
  ],
  inputs: [
    { id: "mode", label: "خواسته", type: "select", default: "vout", options: [["vout", "ولتاژ خروجی"], ["balance", "R4 مجهول در تعادل"]] },
    { id: "Vs", label: "ولتاژ تغذیه Vs", unit: "V", type: "number", default: "10", when: { mode: ["vout"] } },
    { id: "R1", label: "R1", unit: "Ω", type: "number", default: "1k" },
    { id: "R2", label: "R2", unit: "Ω", type: "number", default: "1k" },
    { id: "R3", label: "R3", unit: "Ω", type: "number", default: "1k" },
    { id: "R4", label: "R4", unit: "Ω", type: "number", default: "1.1k", when: { mode: ["vout"] } },
    { id: "Rg", label: "مقاومت گالوانومتر Rg (اختیاری)", unit: "Ω", type: "number", when: { mode: ["vout"] } }
  ],
  example: { values: { mode: "vout", Vs: "10", R1: "1k", R2: "1k", R3: "1k", R4: "1.1k", Rg: "" }, expect: ["Vout = -238.1 mV"], note: "مثال: پلی تقریباً متعادل، با R4 به اندازه 10% بزرگ‌تر." },
  invalid: { values: { mode: "vout", Vs: "10", R1: "1k", R2: "-1k", R3: "1k", R4: "1k" } },
  related: ["strain-gauge-bridge", "voltage-current-divider", "thevenin-norton", "rtd"]
};

export function bridge(Vs, R1, R2, R3, R4) {
  return Vs * (R2 / (R1 + R2) - R4 / (R3 + R4));
}

export function solve(input) {
  const mode = choice(input, "mode", "خواسته", ["vout", "balance"], "vout");
  const R1 = num(input, "R1", "R1", { positive: true }), R2 = num(input, "R2", "R2", { positive: true }), R3 = num(input, "R3", "R3", { positive: true });
  if (mode === "balance") {
    const R4 = (R3 * R2) / R1;
    return {
      results: [{ label: "R4 در تعادل", value: eng(R4, "Ω", 5), text: `R4 = ${eng(R4, "Ω", 5)}` }],
      steps: [
        "در تعادل دو ولتاژ نقطه‌های وسط برابر می‌شوند، پس از گالوانومتر جریانی نمی‌گذرد؛ این موضوع به ولتاژ تغذیه بستگی ندارد.",
        { tex: `\\frac{R_1}{R_2} = \\frac{R_3}{R_4} \\Rightarrow R_4 = R_3\\frac{R_2}{R_1} = ${ntex(R3)} \\times \\frac{${ntex(R2)}}{${ntex(R1)}} = ${ntex(R4, 6)}\\ \\Omega` }
      ],
      copy: `R4 = ${eng(R4, "Ω", 5)}`
    };
  }
  const Vs = num(input, "Vs", "ولتاژ تغذیه");
  const R4 = num(input, "R4", "R4", { positive: true });
  const Rg = num(input, "Rg", "مقاومت گالوانومتر", { optional: true, positive: true });
  const Va = (Vs * R2) / (R1 + R2), Vb = (Vs * R4) / (R3 + R4), Vout = Va - Vb;
  const balanced = Math.abs(R1 * R4 - R2 * R3) <= 1e-12 * R1 * R4;
  const steps = [
    { text: "ولتاژ نقطه وسط چپ (مقسم R1-R2):", tex: `V_a = ${ntex(Vs)}\\frac{${ntex(R2)}}{${ntex(R1)} + ${ntex(R2)}} = ${ntex(Va, 6)}\\ V` },
    { text: "ولتاژ نقطه وسط راست (مقسم R3-R4):", tex: `V_b = ${ntex(Vs)}\\frac{${ntex(R4)}}{${ntex(R3)} + ${ntex(R4)}} = ${ntex(Vb, 6)}\\ V` },
    { text: "ولتاژ خروجی تفاضل آن دو است:", tex: `V_{out} = V_a - V_b = ${ntex(Vout, 6)}\\ V` },
    balanced ? "دو نسبت برابرند، پس پل متعادل است." : `پل نامتعادل است: $R_1 R_4 = ${ntex(R1 * R4, 6)}$ در حالی که $R_2 R_3 = ${ntex(R2 * R3, 6)}$.`
  ];
  const results = [{ label: "ولتاژ خروجی Vout", value: eng(Vout, "V", 4), text: `Vout = ${eng(Vout, "V", 4)}` }, { label: "Va", value: eng(Va, "V", 5) }, { label: "Vb", value: eng(Vb, "V", 5) }, { label: "وضعیت", value: balanced ? "متعادل" : "نامتعادل" }];
  if (Rg !== null) {
    const Rth = (R1 * R2) / (R1 + R2) + (R3 * R4) / (R3 + R4);
    const Ig = Vout / (Rth + Rg);
    steps.push({ text: "با معادل تونن بین نقطه‌های وسط (منبع اتصال کوتاه):", tex: `R_{th} = R_1 \\parallel R_2 + R_3 \\parallel R_4 = ${ntex(Rth, 6)}\\ \\Omega,\\quad I_g = \\frac{V_{out}}{R_{th} + R_g} = ${ntex(Ig, 6)}\\ A` });
    results.push({ label: "مقاومت تونن پل", value: eng(Rth, "Ω", 4) }, { label: "جریان گالوانومتر", value: eng(Ig, "A", 4) });
  }
  return { results, steps, copy: `Vout = ${eng(Vout, "V", 4)}` };
}
