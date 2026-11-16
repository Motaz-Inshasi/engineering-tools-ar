import { numList, choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "مقسم ولتاژ با دو مقاومت همراه با اثر بار، و مقسم جریان برای هر تعداد شاخه موازی، همراه با گام‌ها و بررسی با قوانین کیرشهف.",
  keywords: ["مقسم ولتاژ", "مقسم جریان", "voltage divider", "current divider", "اثر بار", "loading"],
  formulas: [
    { label: "مقسم ولتاژ", tex: "V_{out} = V_{in}\\frac{R_2}{R_1 + R_2}" },
    { label: "مقسم جریان", tex: "I_k = I_T \\frac{G_k}{\\sum G_i} = I_T\\frac{1/R_k}{\\sum 1/R_i}" }
  ],
  inputs: [
    { id: "mode", label: "نوع", type: "select", default: "voltage", options: [["voltage", "مقسم ولتاژ"], ["current", "مقسم جریان"]] },
    { id: "Vin", label: "ولتاژ ورودی Vin", unit: "V", type: "number", default: "12", when: { mode: ["voltage"] } },
    { id: "R1", label: "R1 (بالایی)", unit: "Ω", type: "number", default: "10k", when: { mode: ["voltage"] } },
    { id: "R2", label: "R2 (پایینی)", unit: "Ω", type: "number", default: "4.7k", when: { mode: ["voltage"] } },
    { id: "RL", label: "مقاومت بار روی R2 (اختیاری)", unit: "Ω", type: "number", when: { mode: ["voltage"] } },
    { id: "IT", label: "جریان کل IT", unit: "A", type: "number", default: "10m", when: { mode: ["current"] } },
    { id: "list", label: "مقاومت‌های شاخه‌های موازی", unit: "Ω", type: "text", default: "1k, 2.2k, 4.7k", when: { mode: ["current"] } }
  ],
  example: { values: { mode: "voltage", Vin: "12", R1: "10k", R2: "4.7k", RL: "10k" }, expect: ["Vout = 2.907 V"], note: "مثال: مقسم 10k و 4.7k از 12 V، با بار 10k که خروجی را کاهش می‌دهد." },
  invalid: { values: { mode: "voltage", Vin: "12", R1: "0", R2: "4.7k" } },
  related: ["series-parallel-resistors", "sensor-divider", "level-shifter", "wheatstone-bridge"]
};

export function solve(input) {
  const mode = choice(input, "mode", "نوع", ["voltage", "current"], "voltage");
  if (mode === "voltage") {
    const Vin = num(input, "Vin", "ولتاژ ورودی");
    const R1 = num(input, "R1", "R1", { positive: true });
    const R2 = num(input, "R2", "R2", { positive: true });
    const RL = num(input, "RL", "مقاومت بار", { optional: true, positive: true });
    const unloaded = (Vin * R2) / (R1 + R2);
    const steps = [{ text: "بی‌بار:", tex: `V_{out} = ${ntex(Vin)} \\times \\frac{${ntex(R2)}}{${ntex(R1)} + ${ntex(R2)}} = ${ntex(unloaded, 6)}\\ V` }];
    let Vout = unloaded, R2eff = R2;
    const results = [];
    if (RL !== null) {
      R2eff = (R2 * RL) / (R2 + RL);
      Vout = (Vin * R2eff) / (R1 + R2eff);
      steps.push({ text: "بار با R2 موازی است و مقاومت مؤثر آن را کم می‌کند:", tex: `R_2 \\parallel R_L = \\frac{${ntex(R2)} \\times ${ntex(RL)}}{${ntex(R2)} + ${ntex(RL)}} = ${ntex(R2eff, 6)}\\ \\Omega` });
      steps.push({ tex: `V_{out} = ${ntex(Vin)} \\times \\frac{${ntex(R2eff, 6)}}{${ntex(R1)} + ${ntex(R2eff, 6)}} = ${ntex(Vout, 6)}\\ V` });
      steps.push(`خروجی به‌دلیل بار ${fmt((100 * (unloaded - Vout)) / (unloaded || 1), 4)}% کاهش یافت. برای کاهش اثر، بار را حداقل ده برابر R2 بزرگ‌تر کنید.`);
      results.push({ label: "ولتاژ بی‌بار", value: eng(unloaded, "V", 4) });
    }
    const I = Vin / (R1 + R2eff);
    steps.push({ text: "جریان مقسم و بررسی KVL:", tex: `I = \\frac{V_{in}}{R_1 + R_{2,eff}} = ${ntex(I, 6)}\\ A,\\quad I R_1 + V_{out} = ${ntex(I * R1 + Vout, 8)}\\ V` });
    return {
      results: [{ label: "ولتاژ خروجی Vout", value: eng(Vout, "V", 4), text: `Vout = ${eng(Vout, "V", 4)}` }, ...results, { label: "نسبت تقسیم", value: Vout / Vin, sig: 6 }, { label: "جریان مقسم", value: eng(I, "A", 4) }, { label: "توان در R1", value: eng(I * I * R1, "W", 4) }],
      steps, copy: `Vout = ${eng(Vout, "V", 4)}`
    };
  }
  const IT = num(input, "IT", "جریان کل");
  const list = numList(input, "list", "مقاومت‌های شاخه‌ها", { positive: true, min: 2, max: 20 });
  const Gt = list.reduce((s, r) => s + 1 / r, 0);
  const V = IT / Gt;
  const currents = list.map((r) => V / r);
  const steps = [
    { text: "مجموع هدایت‌ها:", tex: `G_T = ${list.map((r) => `\\frac{1}{${ntex(r)}}`).join(" + ")} = ${ntex(Gt, 6)}\\ S` },
    { text: "ولتاژ مشترک شاخه‌ها:", tex: `V = \\frac{I_T}{G_T} = ${ntex(V, 6)}\\ V` },
    ...list.map((r, k) => ({ tex: `I_{${k + 1}} = I_T\\frac{1/${ntex(r)}}{G_T} = ${ntex(currents[k], 6)}\\ A` })),
    `بررسی KCL: مجموع جریان شاخه‌ها = ${eng(currents.reduce((a, b) => a + b, 0), "A", 6)}، که برابر جریان کل است.`
  ];
  if (list.length === 2) steps.push(`فقط برای دو شاخه: $I_1 = I_T \\frac{R_2}{R_1 + R_2}$، یعنی شاخه‌ای با مقاومت کوچک‌تر جریان بزرگ‌تری می‌گیرد.`);
  return {
    results: [...currents.map((c, k) => ({ label: `جریان شاخه ${k + 1} (R = ${eng(list[k], "Ω")})`, value: eng(c, "A", 4), text: `I${k + 1} = ${eng(c, "A", 4)}` })), { label: "ولتاژ مشترک", value: eng(V, "V", 4) }],
    steps, copy: currents.map((c, k) => `I${k + 1} = ${eng(c, "A", 4)}`).join("\n")
  };
}
