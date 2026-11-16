import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cabs, carg, ctex, cfmt, cpolar } from "../core/complex.js";
import { phasorBlock } from "./common.js";

export const meta = {
  description: "Systèmes triphasés équilibrés en montage étoile ou triangle : tensions et courants de phase et de ligne, puissances active, réactive et apparente et facteur de puissance, à partir de la tension de ligne et de l'impédance de charge par phase.",
  keywords: ["Triphasé", "Trois phases", "three phase", "Étoile", "Triangle", "star", "delta", "Tension de ligne", "Courant de ligne", "√3"],
  formulas: [
    { label: "Étoile (Y)", tex: "V_L = \\sqrt{3}\\,V_{ph},\\quad I_L = I_{ph}" },
    { label: "Triangle (Δ) et puissance totale", tex: "V_L = V_{ph},\\quad I_L = \\sqrt{3}\\,I_{ph},\\qquad P = \\sqrt{3}\\,V_L I_L\\cos\\theta = 3V_{ph}I_{ph}\\cos\\theta" }
  ],
  inputs: [
    { id: "conn", label: "Montage de la charge", type: "select", default: "star", options: [["star", "Étoile (Y)"], ["delta", "Triangle (Δ)"]] },
    { id: "VL", label: "Tension de ligne (efficace)", unit: "V", type: "number", default: "400" },
    { id: "Z", label: "Impédance de charge par phase", unit: "Ω", type: "text", default: "8+6j", help: "Cartésienne, par exemple 8+6j, ou polaire, par exemple 10∠36.87." }
  ],
  example: { values: { conn: "star", VL: "400", Z: "8+6j" }, expect: ["IL = 23.09 A", "P = 12.8 kW"], note: "Exemple : charge en étoile de 8+6j Ω sur un réseau de 400 V." },
  invalid: { values: { conn: "star", VL: "400", Z: "0" } },
  related: ["complex-power", "transformer", "phasor"]
};

export function solve(input) {
  const conn = choice(input, "conn", "Montage", ["star", "delta"], "star");
  const VL = num(input, "VL", "Tension de ligne", { positive: true });
  const Z = readComplex(input, "Z", "Impédance");
  if (cabs(Z) === 0) fail("L'impédance de phase ne peut pas être nulle.", "Z");
  if (Z.re < 0) fail("La partie réelle de l'impédance ne peut pas être négative pour une charge passive.", "Z");
  const s3 = Math.sqrt(3);
  const Vph = conn === "star" ? VL / s3 : VL;
  const Iph = Vph / cabs(Z);
  const IL = conn === "star" ? Iph : s3 * Iph;
  const th = carg(Z);
  const P = 3 * Vph * Iph * Math.cos(th), Q = 3 * Vph * Iph * Math.sin(th), S = 3 * Vph * Iph;
  const steps = [
    conn === "star" ? { text: "En étoile, la tension de phase est inférieure à la tension de ligne de √3 :", tex: `V_{ph} = \\frac{${ntex(VL)}}{\\sqrt{3}} = ${ntex(Vph, 6)}\\ V` } : "En triangle, la tension de phase est égale à la tension de ligne.",
    { text: "Courant de phase par la loi d'Ohm :", tex: `I_{ph} = \\frac{V_{ph}}{|Z|} = \\frac{${ntex(Vph, 6)}}{${ntex(cabs(Z), 6)}} = ${ntex(Iph, 6)}\\ A` },
    conn === "star" ? "En étoile, le courant de ligne est égal au courant de phase." : { text: "En triangle, le courant de ligne est supérieur de √3 :", tex: `I_L = \\sqrt{3} \\times ${ntex(Iph, 6)} = ${ntex(IL, 6)}\\ A` },
    { text: "Puissance totale des trois phases :", tex: `P = \\sqrt{3}V_L I_L\\cos\\theta = \\sqrt{3} \\times ${ntex(VL)} \\times ${ntex(IL, 6)} \\times \\cos(${ntex((th * 180) / Math.PI, 5)}^\\circ) = ${ntex(P, 6)}\\ W` },
    { tex: `Q = ${ntex(Q, 6)}\\ VAR,\\quad S = ${ntex(S, 6)}\\ VA,\\quad PF = ${ntex(Math.cos(th), 5)}` }
  ];
  const ph = [0, -120, 120].map((d) => cpolar(Vph, (d * Math.PI) / 180));
  const cur = ph.map((v) => cpolar(Iph, carg(v) - th));
  const scale = Vph / Math.max(Iph, 1e-30) * 0.6;
  return {
    results: [
      { label: "Tension de phase", value: eng(Vph, "V", 5) },
      { label: "Courant de phase", value: eng(Iph, "A", 5) },
      { label: "Courant de ligne", value: eng(IL, "A", 4), text: `IL = ${eng(IL, "A", 4)}` },
      { label: "Puissance active P", value: eng(P, "W", 4), text: `P = ${eng(P, "W", 4)}` },
      { label: "Puissance réactive Q", value: eng(Q, "VAR", 4) },
      { label: "Puissance apparente S", value: eng(S, "VA", 4) },
      { label: "Facteur de puissance", value: `${fmt(Math.cos(th), 5)} ${th > 0 ? "en retard" : th < 0 ? "en avance" : ""}` }
    ],
    blocks: [phasorBlock([["Va", ph[0]], ["Vb", ph[1]], ["Vc", ph[2]], ...cur.map((c, k) => [`I${"abc"[k]} (agrandi)`, { re: c.re * scale, im: c.im * scale }])], "Tensions des phases et leurs courants")],
    steps, copy: `Vph = ${eng(Vph, "V", 5)}, IL = ${eng(IL, "A", 4)}, P = ${eng(P, "W", 4)}, Q = ${eng(Q, "VAR", 4)}`
  };
}

export { ctex, cfmt };
