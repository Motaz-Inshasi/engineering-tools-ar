import { numList, choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "مقسم الجهد بمقاومتين مع أثر الحمل، ومقسم التيار لأي عدد من الفروع المتوازية، مع الخطوات والتحقق بقانوني كيرشوف.",
  keywords: ["مقسم جهد", "مقسم تيار", "voltage divider", "current divider", "تأثير الحمل", "loading"],
  formulas: [
    { label: "مقسم الجهد", tex: "V_{out} = V_{in}\\frac{R_2}{R_1 + R_2}" },
    { label: "مقسم التيار", tex: "I_k = I_T \\frac{G_k}{\\sum G_i} = I_T\\frac{1/R_k}{\\sum 1/R_i}" }
  ],
  inputs: [
    { id: "mode", label: "النوع", type: "select", default: "voltage", options: [["voltage", "مقسم جهد"], ["current", "مقسم تيار"]] },
    { id: "Vin", label: "جهد الدخل Vin", unit: "V", type: "number", default: "12", when: { mode: ["voltage"] } },
    { id: "R1", label: "R1 (العلوية)", unit: "Ω", type: "number", default: "10k", when: { mode: ["voltage"] } },
    { id: "R2", label: "R2 (السفلية)", unit: "Ω", type: "number", default: "4.7k", when: { mode: ["voltage"] } },
    { id: "RL", label: "مقاومة الحمل على R2 (اختياري)", unit: "Ω", type: "number", when: { mode: ["voltage"] } },
    { id: "IT", label: "التيار الكلي IT", unit: "A", type: "number", default: "10m", when: { mode: ["current"] } },
    { id: "list", label: "مقاومات الفروع المتوازية", unit: "Ω", type: "text", default: "1k, 2.2k, 4.7k", when: { mode: ["current"] } }
  ],
  example: { values: { mode: "voltage", Vin: "12", R1: "10k", R2: "4.7k", RL: "10k" }, expect: ["Vout = 2.907 V"], note: "مثال: مقسم 10k و 4.7k من 12 V، مع حمل 10k يخفض المخرج." },
  invalid: { values: { mode: "voltage", Vin: "12", R1: "0", R2: "4.7k" } },
  related: ["series-parallel-resistors", "sensor-divider", "level-shifter", "wheatstone-bridge"]
};

export function solve(input) {
  const mode = choice(input, "mode", "النوع", ["voltage", "current"], "voltage");
  if (mode === "voltage") {
    const Vin = num(input, "Vin", "جهد الدخل");
    const R1 = num(input, "R1", "R1", { positive: true });
    const R2 = num(input, "R2", "R2", { positive: true });
    const RL = num(input, "RL", "مقاومة الحمل", { optional: true, positive: true });
    const unloaded = (Vin * R2) / (R1 + R2);
    const steps = [{ text: "بلا حمل:", tex: `V_{out} = ${ntex(Vin)} \\times \\frac{${ntex(R2)}}{${ntex(R1)} + ${ntex(R2)}} = ${ntex(unloaded, 6)}\\ V` }];
    let Vout = unloaded, R2eff = R2;
    const results = [];
    if (RL !== null) {
      R2eff = (R2 * RL) / (R2 + RL);
      Vout = (Vin * R2eff) / (R1 + R2eff);
      steps.push({ text: "الحمل يوازي R2 فيخفض مقاومتها الفعالة:", tex: `R_2 \\parallel R_L = \\frac{${ntex(R2)} \\times ${ntex(RL)}}{${ntex(R2)} + ${ntex(RL)}} = ${ntex(R2eff, 6)}\\ \\Omega` });
      steps.push({ tex: `V_{out} = ${ntex(Vin)} \\times \\frac{${ntex(R2eff, 6)}}{${ntex(R1)} + ${ntex(R2eff, 6)}} = ${ntex(Vout, 6)}\\ V` });
      steps.push(`انخفض المخرج بنسبة ${fmt((100 * (unloaded - Vout)) / (unloaded || 1), 4)}% بسبب الحمل. لتقليل الأثر اجعل الحمل أكبر بعشر مرات على الأقل من R2.`);
      results.push({ label: "الجهد بلا حمل", value: eng(unloaded, "V", 4) });
    }
    const I = Vin / (R1 + R2eff);
    steps.push({ text: "تيار المقسم وتحقق KVL:", tex: `I = \\frac{V_{in}}{R_1 + R_{2,eff}} = ${ntex(I, 6)}\\ A,\\quad I R_1 + V_{out} = ${ntex(I * R1 + Vout, 8)}\\ V` });
    return {
      results: [{ label: "جهد الخرج Vout", value: eng(Vout, "V", 4), text: `Vout = ${eng(Vout, "V", 4)}` }, ...results, { label: "نسبة التقسيم", value: Vout / Vin, sig: 6 }, { label: "تيار المقسم", value: eng(I, "A", 4) }, { label: "القدرة في R1", value: eng(I * I * R1, "W", 4) }],
      steps, copy: `Vout = ${eng(Vout, "V", 4)}`
    };
  }
  const IT = num(input, "IT", "التيار الكلي");
  const list = numList(input, "list", "مقاومات الفروع", { positive: true, min: 2, max: 20 });
  const Gt = list.reduce((s, r) => s + 1 / r, 0);
  const V = IT / Gt;
  const currents = list.map((r) => V / r);
  const steps = [
    { text: "مجموع الموصليات:", tex: `G_T = ${list.map((r) => `\\frac{1}{${ntex(r)}}`).join(" + ")} = ${ntex(Gt, 6)}\\ S` },
    { text: "الجهد المشترك على الفروع:", tex: `V = \\frac{I_T}{G_T} = ${ntex(V, 6)}\\ V` },
    ...list.map((r, k) => ({ tex: `I_{${k + 1}} = I_T\\frac{1/${ntex(r)}}{G_T} = ${ntex(currents[k], 6)}\\ A` })),
    `تحقق KCL: مجموع تيارات الفروع = ${eng(currents.reduce((a, b) => a + b, 0), "A", 6)}، ويساوي التيار الكلي.`
  ];
  if (list.length === 2) steps.push(`لفرعين فقط: $I_1 = I_T \\frac{R_2}{R_1 + R_2}$، أي أن الفرع ذا المقاومة الأصغر يأخذ التيار الأكبر.`);
  return {
    results: [...currents.map((c, k) => ({ label: `تيار الفرع ${k + 1} (R = ${eng(list[k], "Ω")})`, value: eng(c, "A", 4), text: `I${k + 1} = ${eng(c, "A", 4)}` })), { label: "الجهد المشترك", value: eng(V, "V", 4) }],
    steps, copy: currents.map((c, k) => `I${k + 1} = ${eng(c, "A", 4)}`).join("\n")
  };
}
