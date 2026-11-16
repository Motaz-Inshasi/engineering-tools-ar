import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cabs, carg, ctex, cfmt, cpolar } from "../core/complex.js";
import { phasorBlock } from "./common.js";

export const meta = {
  description: "متوازن تھری فیز سسٹمز اسٹار یا ڈیلٹا کنکشن میں: فیز اور لائن وولٹیج و کرنٹ، حقیقی، ری ایکٹو اور ظاہری پاور، اور پاور فیکٹر، لائن وولٹیج اور فی فیز لوڈ امپیڈنس سے۔",
  keywords: ["تھری فیز", "تین فیز", "three phase", "اسٹار", "ڈیلٹا", "star", "delta", "لائن وولٹیج", "لائن کرنٹ", "√3"],
  formulas: [
    { label: "اسٹار (Y)", tex: "V_L = \\sqrt{3}\\,V_{ph},\\quad I_L = I_{ph}" },
    { label: "ڈیلٹا (Δ) اور کل پاور", tex: "V_L = V_{ph},\\quad I_L = \\sqrt{3}\\,I_{ph},\\qquad P = \\sqrt{3}\\,V_L I_L\\cos\\theta = 3V_{ph}I_{ph}\\cos\\theta" }
  ],
  inputs: [
    { id: "conn", label: "لوڈ کنکشن", type: "select", default: "star", options: [["star", "اسٹار (Y)"], ["delta", "ڈیلٹا (Δ)"]] },
    { id: "VL", label: "لائن وولٹیج (RMS)", unit: "V", type: "number", default: "400" },
    { id: "Z", label: "فی فیز لوڈ امپیڈنس", unit: "Ω", type: "text", default: "8+6j", help: "ریکٹینگولر شکل جیسے 8+6j یا پولر شکل جیسے 10∠36.87۔" }
  ],
  example: { values: { conn: "star", VL: "400", Z: "8+6j" }, expect: ["IL = 23.09 A", "P = 12.8 kW"], note: "مثال: 400 V سپلائی پر 8+6j Ω کا اسٹار لوڈ۔" },
  invalid: { values: { conn: "star", VL: "400", Z: "0" } },
  related: ["complex-power", "transformer", "phasor"]
};

export function solve(input) {
  const conn = choice(input, "conn", "کنکشن", ["star", "delta"], "star");
  const VL = num(input, "VL", "لائن وولٹیج", { positive: true });
  const Z = readComplex(input, "Z", "امپیڈنس");
  if (cabs(Z) === 0) fail("فیز امپیڈنس صفر نہیں ہو سکتا۔", "Z");
  if (Z.re < 0) fail("غیر فعال لوڈ کے لیے امپیڈنس کا حقیقی حصہ منفی نہیں ہو سکتا۔", "Z");
  const s3 = Math.sqrt(3);
  const Vph = conn === "star" ? VL / s3 : VL;
  const Iph = Vph / cabs(Z);
  const IL = conn === "star" ? Iph : s3 * Iph;
  const th = carg(Z);
  const P = 3 * Vph * Iph * Math.cos(th), Q = 3 * Vph * Iph * Math.sin(th), S = 3 * Vph * Iph;
  const steps = [
    conn === "star" ? { text: "اسٹار میں فیز وولٹیج لائن وولٹیج سے √3 گنا کم ہوتا ہے:", tex: `V_{ph} = \\frac{${ntex(VL)}}{\\sqrt{3}} = ${ntex(Vph, 6)}\\ V` } : "ڈیلٹا میں فیز وولٹیج لائن وولٹیج کے برابر ہوتا ہے۔",
    { text: "اوہم کے قانون سے فیز کرنٹ:", tex: `I_{ph} = \\frac{V_{ph}}{|Z|} = \\frac{${ntex(Vph, 6)}}{${ntex(cabs(Z), 6)}} = ${ntex(Iph, 6)}\\ A` },
    conn === "star" ? "اسٹار میں لائن کرنٹ فیز کرنٹ کے برابر ہوتا ہے۔" : { text: "ڈیلٹا میں لائن کرنٹ √3 گنا زیادہ ہوتا ہے:", tex: `I_L = \\sqrt{3} \\times ${ntex(Iph, 6)} = ${ntex(IL, 6)}\\ A` },
    { text: "تینوں فیزز کی کل پاور:", tex: `P = \\sqrt{3}V_L I_L\\cos\\theta = \\sqrt{3} \\times ${ntex(VL)} \\times ${ntex(IL, 6)} \\times \\cos(${ntex((th * 180) / Math.PI, 5)}^\\circ) = ${ntex(P, 6)}\\ W` },
    { tex: `Q = ${ntex(Q, 6)}\\ VAR,\\quad S = ${ntex(S, 6)}\\ VA,\\quad PF = ${ntex(Math.cos(th), 5)}` }
  ];
  const ph = [0, -120, 120].map((d) => cpolar(Vph, (d * Math.PI) / 180));
  const cur = ph.map((v) => cpolar(Iph, carg(v) - th));
  const scale = Vph / Math.max(Iph, 1e-30) * 0.6;
  return {
    results: [
      { label: "فیز وولٹیج", value: eng(Vph, "V", 5) },
      { label: "فیز کرنٹ", value: eng(Iph, "A", 5) },
      { label: "لائن کرنٹ", value: eng(IL, "A", 4), text: `IL = ${eng(IL, "A", 4)}` },
      { label: "حقیقی پاور P", value: eng(P, "W", 4), text: `P = ${eng(P, "W", 4)}` },
      { label: "ری ایکٹو پاور Q", value: eng(Q, "VAR", 4) },
      { label: "ظاہری پاور S", value: eng(S, "VA", 4) },
      { label: "پاور فیکٹر", value: `${fmt(Math.cos(th), 5)} ${th > 0 ? "لیگنگ" : th < 0 ? "لیڈنگ" : ""}` }
    ],
    blocks: [phasorBlock([["Va", ph[0]], ["Vb", ph[1]], ["Vc", ph[2]], ...cur.map((c, k) => [`I${"abc"[k]} (اسکیل شدہ)`, { re: c.re * scale, im: c.im * scale }])], "فیز وولٹیجز اور کرنٹس")],
    steps, copy: `Vph = ${eng(Vph, "V", 5)}, IL = ${eng(IL, "A", 4)}, P = ${eng(P, "W", 4)}, Q = ${eng(Q, "VAR", 4)}`
  };
}

export { ctex, cfmt };
