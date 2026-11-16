import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "منطقی سگنل کو نیچے لانے کے لیے وولٹیج ڈیوائیڈر ڈیزائن کریں (مثلاً 5 V سے 3.3 V): قریب ترین معیاری دوسرا ریزسٹر، اصل وولٹیج اور کرنٹ، اور وصول کنندہ پن کی ان پٹ کپیسیٹنس کے باعث زیادہ سے زیادہ سگنل فریکوئنسی۔",
  keywords: ["لیول شفٹر", "level shifter", "وولٹیج ڈیوائیڈر", "5V سے 3.3V", "UART", "Arduino", "ESP32", "Raspberry Pi"],
  formulas: [
    { label: "R2 کا انتخاب", tex: "V_{out} = V_{in}\\frac{R_2}{R_1 + R_2} \\Rightarrow R_2 = R_1\\frac{V_{out}}{V_{in} - V_{out}}" },
    { label: "ایج کی رفتار", tex: "\\tau = (R_1 \\parallel R_2)\\,C_{in},\\qquad f_{max} \\approx \\frac{1}{10\\,\\tau}" }
  ],
  inputs: [
    { id: "Vin", label: "ہائی سگنل وولٹیج", unit: "V", type: "number", default: "5" },
    { id: "Vout", label: "مطلوبہ وولٹیج", unit: "V", type: "number", default: "3.3" },
    { id: "R1", label: "R1 (اوپری)", unit: "Ω", type: "number", default: "1k" },
    { id: "series", label: "R2 کے لیے معیاری سلسلہ", type: "select", default: "E24", options: [["E12", "E12"], ["E24", "E24"], ["E96", "E96"]] },
    { id: "Vmax", label: "وصول کنندہ پن کی زیادہ سے زیادہ برداشت وولٹیج", unit: "V", type: "number", default: "3.6" },
    { id: "Cin", label: "وصول کنندہ پن کی ان پٹ کپیسیٹنس (اختیاری)", unit: "F", type: "number", default: "10p" }
  ],
  example: { values: { Vin: "5", Vout: "3.3", R1: "1k", series: "E24", Vmax: "3.6", Cin: "10p" }, expect: ["R2 = 2 kΩ", "Vout = 3.333 V"], note: "مثال: 1 kΩ کے اوپری ریزسٹر کے ساتھ 5 V سگنل کو 3.3 V تک نیچے لانا۔" },
  invalid: { values: { Vin: "3.3", Vout: "5", R1: "1k", series: "E24" } },
  related: ["voltage-current-divider", "sensor-divider", "logic-gates"]
};

export function solve(input) {
  const Vin = num(input, "Vin", "سگنل وولٹیج", { positive: true });
  const Vt = num(input, "Vout", "مطلوبہ وولٹیج", { positive: true });
  const R1 = num(input, "R1", "R1", { positive: true });
  const series = choice(input, "series", "سلسلہ", ["E12", "E24", "E96"], "E24");
  const Vmax = num(input, "Vmax", "زیادہ سے زیادہ وولٹیج", { optional: true, positive: true });
  const Cin = num(input, "Cin", "ان پٹ کپیسیٹنس", { optional: true, positive: true });
  if (Vt >= Vin) fail("وولٹیج ڈیوائیڈر صرف وولٹیج کم کر سکتا ہے، اس لیے مطلوبہ وولٹیج سگنل وولٹیج سے کم ہونا چاہیے۔ بڑھانے کے لیے ٹرانزسٹر سرکٹ یا لیول ٹرانسلیٹر چپ استعمال کریں۔", "Vout");
  const R2exact = (R1 * Vt) / (Vin - Vt);
  const cand = nearest(R2exact, series);
  let R2 = cand.closest;
  let Vact = (Vin * R2) / (R1 + R2);
  let note = "";
  if (Vmax !== null && Vact > Vmax && cand.below) {
    R2 = cand.below;
    Vact = (Vin * R2) / (R1 + R2);
    note = `قریب ترین قدر نے محفوظ حد ${fmt(Vmax)} V سے زیادہ وولٹیج دیا، اس لیے ہم نے چھوٹی قدر ${eng(R2, "Ω")} منتخب کی۔`;
  }
  const I = Vin / (R1 + R2);
  const steps = [
    { text: "R2 کی حساب شدہ قدر:", tex: `R_2 = ${ntex(R1)} \\times \\frac{${ntex(Vt)}}{${ntex(Vin)} - ${ntex(Vt)}} = ${ntex(R2exact, 5)}\\ \\Omega` },
    `قریب ترین ${series} قدر: ${eng(R2, "Ω")}۔ ${note}`,
    { text: "ہائی حالت میں اصل وولٹیج اور کرنٹ:", tex: `V_{out} = ${ntex(Vin)}\\frac{${ntex(R2)}}{${ntex(R1)} + ${ntex(R2)}} = ${ntex(Vact, 5)}\\ V,\\quad I = ${ntex(I, 4)}\\ A` }
  ];
  const results = [
    { label: "حساب شدہ R2", value: eng(R2exact, "Ω", 4) },
    { label: `معیاری R2 (${series})`, value: eng(R2, "Ω"), text: `R2 = ${eng(R2, "Ω")}` },
    { label: "اصل وولٹیج", value: eng(Vact, "V", 4), text: `Vout = ${eng(Vact, "V", 4)}` },
    { label: "مطلوبہ وولٹیج سے غلطی", value: `${fmt((100 * (Vact - Vt)) / Vt, 3)}%` },
    { label: "استعمال ہونے والا کرنٹ", value: eng(I, "A", 4) }
  ];
  if (Cin !== null) {
    const tau = ((R1 * R2) / (R1 + R2)) * Cin;
    const fmax = 1 / (10 * tau);
    steps.push({ text: "وصول کنندہ پن کی ان پٹ کپیسیٹنس کناروں کو سست کرتی ہے:", tex: `\\tau = (R_1 \\parallel R_2) C_{in} = ${ntex(tau, 4)}\\ s,\\quad f_{max} \\approx \\frac{1}{10\\tau} = ${ntex(fmax, 4)}\\ Hz` });
    results.push({ label: "سگنل کی تقریبی زیادہ سے زیادہ فریکوئنسی", value: eng(fmax, "Hz", 3) });
  }
  steps.push("یہ ڈیوائیڈر یک طرفہ سگنلز (جیسے TX سے RX) کے لیے موزوں ہے۔ I²C جیسی دو طرفہ لائنوں کے لیے MOSFET پر مبنی لیول شفٹر استعمال کریں۔");
  return { results, steps, copy: `R2 = ${eng(R2, "Ω")}, Vout = ${eng(Vact, "V", 4)}, I = ${eng(I, "A", 4)}` };
}
