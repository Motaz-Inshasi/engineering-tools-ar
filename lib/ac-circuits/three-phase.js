import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cabs, carg, ctex, cfmt, cpolar } from "../core/complex.js";
import { phasorBlock } from "./common.js";

export const meta = {
  description: "الأنظمة ثلاثية الطور المتزنة بتوصيل النجمة أو الدلتا: جهد وتيار الطور والخط، والقدرة الفعالة وغير الفعالة والظاهرية ومعامل القدرة، من جهد الخط وممانعة الحمل لكل طور.",
  keywords: ["ثلاثي الطور", "ثلاثة أطوار", "three phase", "نجمة", "دلتا", "star", "delta", "جهد الخط", "تيار الخط", "√3"],
  formulas: [
    { label: "النجمة (Y)", tex: "V_L = \\sqrt{3}\\,V_{ph},\\quad I_L = I_{ph}" },
    { label: "الدلتا (Δ) والقدرة الكلية", tex: "V_L = V_{ph},\\quad I_L = \\sqrt{3}\\,I_{ph},\\qquad P = \\sqrt{3}\\,V_L I_L\\cos\\theta = 3V_{ph}I_{ph}\\cos\\theta" }
  ],
  inputs: [
    { id: "conn", label: "توصيل الحمل", type: "select", default: "star", options: [["star", "نجمة (Y)"], ["delta", "دلتا (Δ)"]] },
    { id: "VL", label: "جهد الخط (فعال)", unit: "V", type: "number", default: "400" },
    { id: "Z", label: "ممانعة الحمل لكل طور", unit: "Ω", type: "text", default: "8+6j", help: "ديكارتي مثل 8+6j أو قطبي مثل 10∠36.87." }
  ],
  example: { values: { conn: "star", VL: "400", Z: "8+6j" }, expect: ["IL = 23.09 A", "P = 12.8 kW"], note: "مثال: حمل نجمة 8+6j Ω على شبكة 400 V." },
  invalid: { values: { conn: "star", VL: "400", Z: "0" } },
  related: ["complex-power", "transformer", "phasor"]
};

export function solve(input) {
  const conn = choice(input, "conn", "التوصيل", ["star", "delta"], "star");
  const VL = num(input, "VL", "جهد الخط", { positive: true });
  const Z = readComplex(input, "Z", "الممانعة");
  if (cabs(Z) === 0) fail("ممانعة الطور لا يمكن أن تكون صفراً.", "Z");
  if (Z.re < 0) fail("الجزء الحقيقي للممانعة لا يمكن أن يكون سالباً لحمل سلبي.", "Z");
  const s3 = Math.sqrt(3);
  const Vph = conn === "star" ? VL / s3 : VL;
  const Iph = Vph / cabs(Z);
  const IL = conn === "star" ? Iph : s3 * Iph;
  const th = carg(Z);
  const P = 3 * Vph * Iph * Math.cos(th), Q = 3 * Vph * Iph * Math.sin(th), S = 3 * Vph * Iph;
  const steps = [
    conn === "star" ? { text: "في النجمة جهد الطور أقل من جهد الخط بـ √3:", tex: `V_{ph} = \\frac{${ntex(VL)}}{\\sqrt{3}} = ${ntex(Vph, 6)}\\ V` } : "في الدلتا جهد الطور يساوي جهد الخط.",
    { text: "تيار الطور من قانون أوم:", tex: `I_{ph} = \\frac{V_{ph}}{|Z|} = \\frac{${ntex(Vph, 6)}}{${ntex(cabs(Z), 6)}} = ${ntex(Iph, 6)}\\ A` },
    conn === "star" ? "في النجمة تيار الخط يساوي تيار الطور." : { text: "في الدلتا تيار الخط أكبر بـ √3:", tex: `I_L = \\sqrt{3} \\times ${ntex(Iph, 6)} = ${ntex(IL, 6)}\\ A` },
    { text: "القدرة الكلية للأطوار الثلاثة:", tex: `P = \\sqrt{3}V_L I_L\\cos\\theta = \\sqrt{3} \\times ${ntex(VL)} \\times ${ntex(IL, 6)} \\times \\cos(${ntex((th * 180) / Math.PI, 5)}^\\circ) = ${ntex(P, 6)}\\ W` },
    { tex: `Q = ${ntex(Q, 6)}\\ VAR,\\quad S = ${ntex(S, 6)}\\ VA,\\quad PF = ${ntex(Math.cos(th), 5)}` }
  ];
  const ph = [0, -120, 120].map((d) => cpolar(Vph, (d * Math.PI) / 180));
  const cur = ph.map((v) => cpolar(Iph, carg(v) - th));
  const scale = Vph / Math.max(Iph, 1e-30) * 0.6;
  return {
    results: [
      { label: "جهد الطور", value: eng(Vph, "V", 5) },
      { label: "تيار الطور", value: eng(Iph, "A", 5) },
      { label: "تيار الخط", value: eng(IL, "A", 4), text: `IL = ${eng(IL, "A", 4)}` },
      { label: "القدرة الفعالة P", value: eng(P, "W", 4), text: `P = ${eng(P, "W", 4)}` },
      { label: "القدرة غير الفعالة Q", value: eng(Q, "VAR", 4) },
      { label: "القدرة الظاهرية S", value: eng(S, "VA", 4) },
      { label: "معامل القدرة", value: `${fmt(Math.cos(th), 5)} ${th > 0 ? "متأخر" : th < 0 ? "متقدم" : ""}` }
    ],
    blocks: [phasorBlock([["Va", ph[0]], ["Vb", ph[1]], ["Vc", ph[2]], ...cur.map((c, k) => [`I${"abc"[k]} (مكبّر)`, { re: c.re * scale, im: c.im * scale }])], "جهود الأطوار وتياراتها")],
    steps, copy: `Vph = ${eng(Vph, "V", 5)}, IL = ${eng(IL, "A", 4)}, P = ${eng(P, "W", 4)}, Q = ${eng(Q, "VAR", 4)}`
  };
}

export { ctex, cfmt };
