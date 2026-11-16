import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cabs, carg, ctex, cfmt, cpolar } from "../core/complex.js";
import { phasorBlock } from "./common.js";

export const meta = {
  description: "Yıldız veya üçgen bağlı dengeli üç fazlı sistemler: faz ve hat gerilimi ve akımı, aktif, reaktif ve görünür güç ile güç faktörü; hat gerilimi ve faz başına yük empedansından hesaplanır.",
  keywords: ["üç fazlı", "üç faz", "three phase", "yıldız", "üçgen", "star", "delta", "hat gerilimi", "hat akımı", "√3"],
  formulas: [
    { label: "Yıldız (Y)", tex: "V_L = \\sqrt{3}\\,V_{ph},\\quad I_L = I_{ph}" },
    { label: "Üçgen (Δ) ve toplam güç", tex: "V_L = V_{ph},\\quad I_L = \\sqrt{3}\\,I_{ph},\\qquad P = \\sqrt{3}\\,V_L I_L\\cos\\theta = 3V_{ph}I_{ph}\\cos\\theta" }
  ],
  inputs: [
    { id: "conn", label: "Yük bağlantısı", type: "select", default: "star", options: [["star", "Yıldız (Y)"], ["delta", "Üçgen (Δ)"]] },
    { id: "VL", label: "Hat gerilimi (etkin)", unit: "V", type: "number", default: "400" },
    { id: "Z", label: "Faz başına yük empedansı", unit: "Ω", type: "text", default: "8+6j", help: "Dikdörtgen biçim, örn. 8+6j, veya kutupsal biçim, örn. 10∠36.87." }
  ],
  example: { values: { conn: "star", VL: "400", Z: "8+6j" }, expect: ["IL = 23.09 A", "P = 12.8 kW"], note: "Örnek: 400 V şebekede 8+6j Ω yıldız yük." },
  invalid: { values: { conn: "star", VL: "400", Z: "0" } },
  related: ["complex-power", "transformer", "phasor"]
};

export function solve(input) {
  const conn = choice(input, "conn", "Bağlantı", ["star", "delta"], "star");
  const VL = num(input, "VL", "hat gerilimi", { positive: true });
  const Z = readComplex(input, "Z", "Empedans");
  if (cabs(Z) === 0) fail("Faz empedansı sıfır olamaz.", "Z");
  if (Z.re < 0) fail("Pasif bir yük için empedansın gerçek kısmı negatif olamaz.", "Z");
  const s3 = Math.sqrt(3);
  const Vph = conn === "star" ? VL / s3 : VL;
  const Iph = Vph / cabs(Z);
  const IL = conn === "star" ? Iph : s3 * Iph;
  const th = carg(Z);
  const P = 3 * Vph * Iph * Math.cos(th), Q = 3 * Vph * Iph * Math.sin(th), S = 3 * Vph * Iph;
  const steps = [
    conn === "star" ? { text: "Yıldızda faz gerilimi hat geriliminden √3 kat küçüktür:", tex: `V_{ph} = \\frac{${ntex(VL)}}{\\sqrt{3}} = ${ntex(Vph, 6)}\\ V` } : "Üçgende faz gerilimi hat gerilimine eşittir.",
    { text: "Faz akımı Ohm yasasından:", tex: `I_{ph} = \\frac{V_{ph}}{|Z|} = \\frac{${ntex(Vph, 6)}}{${ntex(cabs(Z), 6)}} = ${ntex(Iph, 6)}\\ A` },
    conn === "star" ? "Yıldızda hat akımı faz akımına eşittir." : { text: "Üçgende hat akımı √3 kat büyüktür:", tex: `I_L = \\sqrt{3} \\times ${ntex(Iph, 6)} = ${ntex(IL, 6)}\\ A` },
    { text: "Üç fazın toplam gücü:", tex: `P = \\sqrt{3}V_L I_L\\cos\\theta = \\sqrt{3} \\times ${ntex(VL)} \\times ${ntex(IL, 6)} \\times \\cos(${ntex((th * 180) / Math.PI, 5)}^\\circ) = ${ntex(P, 6)}\\ W` },
    { tex: `Q = ${ntex(Q, 6)}\\ VAR,\\quad S = ${ntex(S, 6)}\\ VA,\\quad PF = ${ntex(Math.cos(th), 5)}` }
  ];
  const ph = [0, -120, 120].map((d) => cpolar(Vph, (d * Math.PI) / 180));
  const cur = ph.map((v) => cpolar(Iph, carg(v) - th));
  const scale = Vph / Math.max(Iph, 1e-30) * 0.6;
  return {
    results: [
      { label: "Faz gerilimi", value: eng(Vph, "V", 5) },
      { label: "Faz akımı", value: eng(Iph, "A", 5) },
      { label: "hat akımı", value: eng(IL, "A", 4), text: `IL = ${eng(IL, "A", 4)}` },
      { label: "Aktif güç P", value: eng(P, "W", 4), text: `P = ${eng(P, "W", 4)}` },
      { label: "Reaktif güç Q", value: eng(Q, "VAR", 4) },
      { label: "Görünür güç S", value: eng(S, "VA", 4) },
      { label: "Güç faktörü", value: `${fmt(Math.cos(th), 5)} ${th > 0 ? "geride" : th < 0 ? "önde" : ""}` }
    ],
    blocks: [phasorBlock([["Va", ph[0]], ["Vb", ph[1]], ["Vc", ph[2]], ...cur.map((c, k) => [`I${"abc"[k]} (ölçekli)`, { re: c.re * scale, im: c.im * scale }])], "Faz gerilimleri ve akımları")],
    steps, copy: `Vph = ${eng(Vph, "V", 5)}, IL = ${eng(IL, "A", 4)}, P = ${eng(P, "W", 4)}, Q = ${eng(Q, "VAR", 4)}`
  };
}

export { ctex, cfmt };
