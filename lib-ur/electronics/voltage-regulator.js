import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "لکیری وولٹیج ریگولیٹر (جیسے 7805 یا LDO) کی جانچ کریں: ڈراپ آؤٹ وولٹیج کا مارجن، ضائع ہونے والی طاقت، کارکردگی، جنکشن کا درجہ حرارت، اور ہیٹ سنک کے لیے درکار تھرمل ریزسٹنس۔",
  keywords: ["وولٹیج ریگولیٹر", "voltage regulator", "LDO", "7805", "ڈراپ آؤٹ وولٹیج", "dropout", "ہیٹ سنک", "heatsink", "جنکشن کا درجہ حرارت"],
  formulas: [
    { label: "طاقت اور کارکردگی", tex: "P_D = (V_{in} - V_{out})I_L + V_{in}I_Q,\\qquad \\eta = \\frac{V_{out}I_L}{V_{in}(I_L + I_Q)}" },
    { label: "درجہ حرارت", tex: "T_J = T_A + P_D\\,\\theta_{JA},\\qquad \\theta_{SA,max} = \\frac{T_{J,max} - T_A}{P_D} - \\theta_{JC} - \\theta_{CS}" }
  ],
  inputs: [
    { id: "Vin", label: "ان پٹ وولٹیج (زیادہ سے زیادہ)", unit: "V", type: "number", default: "12" },
    { id: "Vout", label: "آؤٹ پٹ وولٹیج", unit: "V", type: "number", default: "5" },
    { id: "IL", label: "لوڈ کرنٹ", unit: "A", type: "number", default: "500m" },
    { id: "Vdo", label: "ڈراپ آؤٹ وولٹیج (Dropout)", unit: "V", type: "number", default: "2" },
    { id: "Iq", label: "کوئسینٹ کرنٹ Iq", unit: "A", type: "number", default: "5m" },
    { id: "Ta", label: "ماحولیاتی درجہ حرارت", unit: "°C", type: "number", default: "40" },
    { id: "Tj", label: "زیادہ سے زیادہ جنکشن درجہ حرارت", unit: "°C", type: "number", default: "125" },
    { id: "tja", label: "ہیٹ سنک کے بغیر θJA", unit: "°C/W", type: "number", default: "50" },
    { id: "tjc", label: "θJC", unit: "°C/W", type: "number", default: "5" },
    { id: "tcs", label: "θCS (تھرمل پیسٹ)", unit: "°C/W", type: "number", default: "0.5" }
  ],
  example: { values: { Vin: "12", Vout: "5", IL: "500m", Vdo: "2", Iq: "5m", Ta: "40", Tj: "125", tja: "50", tjc: "5", tcs: "0.5" }, expect: ["PD = 3.56 W", "θSA ≤ 18.38 °C/W"], note: "مثال: 500 mA کرنٹ کے ساتھ 12 V سے 7805۔" },
  invalid: { values: { Vin: "6", Vout: "5", IL: "500m", Vdo: "2", Iq: "5m", Ta: "40", Tj: "125", tja: "50", tjc: "5", tcs: "0.5" } },
  related: ["zener-regulator", "rectifier-ripple", "led-resistor"]
};

export function solve(input) {
  const Vin = num(input, "Vin", "ان پٹ وولٹیج", { positive: true });
  const Vout = num(input, "Vout", "آؤٹ پٹ وولٹیج", { positive: true });
  const IL = num(input, "IL", "لوڈ کرنٹ", { nonNegative: true });
  const Vdo = num(input, "Vdo", "ڈراپ آؤٹ وولٹیج", { nonNegative: true });
  const Iq = num(input, "Iq", "کوئسینٹ کرنٹ", { nonNegative: true, default: 0 });
  const Ta = num(input, "Ta", "ماحولیاتی درجہ حرارت", { min: -60, max: 150 });
  const Tjmax = num(input, "Tj", "زیادہ سے زیادہ جنکشن درجہ حرارت", { min: 50, max: 200 });
  const tja = num(input, "tja", "θJA", { positive: true });
  const tjc = num(input, "tjc", "θJC", { nonNegative: true, default: 0 });
  const tcs = num(input, "tcs", "θCS", { nonNegative: true, default: 0 });
  if (Vin < Vout + Vdo) fail(`ان پٹ وولٹیج ${fmt(Vin)} V کم از کم ${fmt(Vout + Vdo)} V (آؤٹ پٹ + ڈراپ آؤٹ وولٹیج) سے کم ہے، اس لیے ریگولیٹر ریگولیٹ نہیں کرے گا۔`, "Vin");
  if (Tjmax <= Ta) fail("زیادہ سے زیادہ جنکشن درجہ حرارت ماحولیاتی درجہ حرارت سے زیادہ ہونا چاہیے۔", "Tj");
  const PD = (Vin - Vout) * IL + Vin * Iq;
  const eff = IL > 0 ? (Vout * IL) / (Vin * (IL + Iq)) : 0;
  const TjNoHs = Ta + PD * tja;
  const PDmax = (Tjmax - Ta) / tja;
  const steps = [
    `ڈراپ آؤٹ وولٹیج سے ${fmt(Vin - Vout - Vdo, 4)} V اوپر وولٹیج کا مارجن ہے، لہٰذا ریگولیٹر کام کرتا ہے۔`,
    { text: "ضائع ہونے والی طاقت (وولٹیج فرق × کرنٹ + ریگولیٹر کی کھپت):", tex: `P_D = (${ntex(Vin)} - ${ntex(Vout)}) \\times ${ntex(IL)} + ${ntex(Vin)} \\times ${ntex(Iq)} = ${ntex(PD, 4)}\\ W` },
    { text: "کارکردگی:", tex: `\\eta = \\frac{${ntex(Vout)} \\times ${ntex(IL)}}{${ntex(Vin)} \\times (${ntex(IL)} + ${ntex(Iq)})} = ${ntex(100 * eff, 4)}\\%` },
    { text: "ہیٹ سنک کے بغیر جنکشن کا درجہ حرارت:", tex: `T_J = ${ntex(Ta)} + ${ntex(PD, 4)} \\times ${ntex(tja)} = ${ntex(TjNoHs, 4)}^\\circ C` }
  ];
  const results = [
    { label: "ضائع ہونے والی طاقت", value: eng(PD, "W", 3), text: `PD = ${eng(PD, "W", 3)}` },
    { label: "کارکردگی", value: `${fmt(100 * eff, 4)}%` },
    { label: "ہیٹ سنک کے بغیر جنکشن کا درجہ حرارت", value: `${fmt(TjNoHs, 4)} °C` },
    { label: "ہیٹ سنک کے بغیر زیادہ سے زیادہ طاقت", value: eng(PDmax, "W", 3) }
  ];
  let copy = `PD = ${eng(PD, "W", 3)}, η = ${fmt(100 * eff, 4)}%, Tj = ${fmt(TjNoHs, 4)} °C`;
  if (TjNoHs > Tjmax) {
    const tsa = (Tjmax - Ta) / PD - tjc - tcs;
    if (tsa <= 0) {
      steps.push("مثالی ہیٹ سنک کے ساتھ بھی یہ طاقت محفوظ طریقے سے ضائع نہیں ہو سکتی؛ سوئچنگ (بک) ریگولیٹر استعمال کریں یا ان پٹ وولٹیج کم کریں۔");
      results.push({ label: "فیصلہ", value: "لکیری ریگولیٹر کے ساتھ ممکن نہیں: سوئچنگ ریگولیٹر استعمال کریں" });
    } else {
      steps.push({ text: "درجہ حرارت حد سے زیادہ ہے، اس لیے ہمیں ایسا ہیٹ سنک درکار ہے جس کی تھرمل ریزسٹنس اس سے زیادہ نہ ہو:", tex: `\\theta_{SA} \\le \\frac{${ntex(Tjmax)} - ${ntex(Ta)}}{${ntex(PD, 4)}} - ${ntex(tjc)} - ${ntex(tcs)} = ${ntex(tsa, 4)}^\\circ C/W` });
      results.push({ label: "فیصلہ", value: "ہیٹ سنک کی ضرورت ہے" }, { label: "ہیٹ سنک کا زیادہ سے زیادہ θSA", value: `${fmt(tsa, 4)} °C/W`, text: `θSA ≤ ${fmt(tsa, 4)} °C/W` });
      copy += `\nθSA ≤ ${fmt(tsa, 4)} °C/W`;
    }
  } else {
    steps.push("درجہ حرارت حد کے اندر ہے، اس لیے ہیٹ سنک کی ضرورت نہیں (کم از کم 20 °C کا حفاظتی مارجن تجویز کیا جاتا ہے)۔");
    results.push({ label: "فیصلہ", value: TjNoHs > Tjmax - 20 ? "قابلِ قبول، لیکن حد کے قریب" : "ہیٹ سنک کی ضرورت نہیں" });
  }
  return { results, steps, copy };
}
