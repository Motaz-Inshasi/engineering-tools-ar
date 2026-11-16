import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cabs, carg, ctex, cfmt, cpolar } from "../core/complex.js";
import { phasorBlock } from "./common.js";

export const meta = {
  description: "Sistem tiga fasa seimbang dengan hubungan bintang atau delta: tegangan dan arus fasa serta saluran, daya aktif, reaktif, dan semu, serta faktor daya, dari tegangan saluran dan impedansi beban per fasa.",
  keywords: ["Tiga fasa", "Tiga fasa", "three phase", "Bintang", "Delta", "star", "delta", "Tegangan saluran", "Arus saluran", "√3"],
  formulas: [
    { label: "Bintang (Y)", tex: "V_L = \\sqrt{3}\\,V_{ph},\\quad I_L = I_{ph}" },
    { label: "Delta (Δ) dan daya total", tex: "V_L = V_{ph},\\quad I_L = \\sqrt{3}\\,I_{ph},\\qquad P = \\sqrt{3}\\,V_L I_L\\cos\\theta = 3V_{ph}I_{ph}\\cos\\theta" }
  ],
  inputs: [
    { id: "conn", label: "Hubungan beban", type: "select", default: "star", options: [["star", "Bintang (Y)"], ["delta", "Delta (Δ)"]] },
    { id: "VL", label: "Tegangan saluran (efektif)", unit: "V", type: "number", default: "400" },
    { id: "Z", label: "Impedansi beban per fasa", unit: "Ω", type: "text", default: "8+6j", help: "Kartesian, misalnya 8+6j, atau polar, misalnya 10∠36.87." }
  ],
  example: { values: { conn: "star", VL: "400", Z: "8+6j" }, expect: ["IL = 23.09 A", "P = 12.8 kW"], note: "Contoh: beban bintang 8+6j Ω pada jaringan 400 V." },
  invalid: { values: { conn: "star", VL: "400", Z: "0" } },
  related: ["complex-power", "transformer", "phasor"]
};

export function solve(input) {
  const conn = choice(input, "conn", "Hubungan", ["star", "delta"], "star");
  const VL = num(input, "VL", "Tegangan saluran", { positive: true });
  const Z = readComplex(input, "Z", "Impedansi");
  if (cabs(Z) === 0) fail("Impedansi fasa tidak boleh nol.", "Z");
  if (Z.re < 0) fail("Bagian real impedansi tidak boleh negatif untuk beban pasif.", "Z");
  const s3 = Math.sqrt(3);
  const Vph = conn === "star" ? VL / s3 : VL;
  const Iph = Vph / cabs(Z);
  const IL = conn === "star" ? Iph : s3 * Iph;
  const th = carg(Z);
  const P = 3 * Vph * Iph * Math.cos(th), Q = 3 * Vph * Iph * Math.sin(th), S = 3 * Vph * Iph;
  const steps = [
    conn === "star" ? { text: "Pada hubungan bintang, tegangan fasa lebih rendah dari tegangan saluran sebesar √3:", tex: `V_{ph} = \\frac{${ntex(VL)}}{\\sqrt{3}} = ${ntex(Vph, 6)}\\ V` } : "Pada hubungan delta, tegangan fasa sama dengan tegangan saluran.",
    { text: "Arus fasa dari hukum Ohm:", tex: `I_{ph} = \\frac{V_{ph}}{|Z|} = \\frac{${ntex(Vph, 6)}}{${ntex(cabs(Z), 6)}} = ${ntex(Iph, 6)}\\ A` },
    conn === "star" ? "Pada hubungan bintang, arus saluran sama dengan arus fasa." : { text: "Pada hubungan delta, arus saluran lebih besar sebesar √3:", tex: `I_L = \\sqrt{3} \\times ${ntex(Iph, 6)} = ${ntex(IL, 6)}\\ A` },
    { text: "Daya total ketiga fasa:", tex: `P = \\sqrt{3}V_L I_L\\cos\\theta = \\sqrt{3} \\times ${ntex(VL)} \\times ${ntex(IL, 6)} \\times \\cos(${ntex((th * 180) / Math.PI, 5)}^\\circ) = ${ntex(P, 6)}\\ W` },
    { tex: `Q = ${ntex(Q, 6)}\\ VAR,\\quad S = ${ntex(S, 6)}\\ VA,\\quad PF = ${ntex(Math.cos(th), 5)}` }
  ];
  const ph = [0, -120, 120].map((d) => cpolar(Vph, (d * Math.PI) / 180));
  const cur = ph.map((v) => cpolar(Iph, carg(v) - th));
  const scale = Vph / Math.max(Iph, 1e-30) * 0.6;
  return {
    results: [
      { label: "Tegangan fasa", value: eng(Vph, "V", 5) },
      { label: "Arus fasa", value: eng(Iph, "A", 5) },
      { label: "Arus saluran", value: eng(IL, "A", 4), text: `IL = ${eng(IL, "A", 4)}` },
      { label: "Daya aktif P", value: eng(P, "W", 4), text: `P = ${eng(P, "W", 4)}` },
      { label: "Daya reaktif Q", value: eng(Q, "VAR", 4) },
      { label: "Daya semu S", value: eng(S, "VA", 4) },
      { label: "Faktor daya", value: `${fmt(Math.cos(th), 5)} ${th > 0 ? "tertinggal" : th < 0 ? "mendahului" : ""}` }
    ],
    blocks: [phasorBlock([["Va", ph[0]], ["Vb", ph[1]], ["Vc", ph[2]], ...cur.map((c, k) => [`I${"abc"[k]} (diperbesar)`, { re: c.re * scale, im: c.im * scale }])], "Tegangan dan arus fasa")],
    steps, copy: `Vph = ${eng(Vph, "V", 5)}, IL = ${eng(IL, "A", 4)}, P = ${eng(P, "W", 4)}, Q = ${eng(Q, "VAR", 4)}`
  };
}

export { ctex, cfmt };
