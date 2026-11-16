import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cabs, carg, ctex, cfmt, cpolar } from "../core/complex.js";
import { phasorBlock } from "./common.js";

export const meta = {
  description: "Sistemas trifásicos equilibrados con conexión en estrella o en triángulo: tensión y corriente de fase y de línea, potencias activa, reactiva y aparente, y factor de potencia, a partir de la tensión de línea y la impedancia de carga por fase.",
  keywords: ["Trifásico", "Tres fases", "three phase", "Estrella", "Triángulo", "star", "delta", "Tensión de línea", "Corriente de línea", "√3"],
  formulas: [
    { label: "Estrella (Y)", tex: "V_L = \\sqrt{3}\\,V_{ph},\\quad I_L = I_{ph}" },
    { label: "Triángulo (Δ) y potencia total", tex: "V_L = V_{ph},\\quad I_L = \\sqrt{3}\\,I_{ph},\\qquad P = \\sqrt{3}\\,V_L I_L\\cos\\theta = 3V_{ph}I_{ph}\\cos\\theta" }
  ],
  inputs: [
    { id: "conn", label: "Conexión de la carga", type: "select", default: "star", options: [["star", "Estrella (Y)"], ["delta", "Triángulo (Δ)"]] },
    { id: "VL", label: "Tensión de línea (eficaz)", unit: "V", type: "number", default: "400" },
    { id: "Z", label: "Impedancia de carga por fase", unit: "Ω", type: "text", default: "8+6j", help: "Cartesiana, por ejemplo 8+6j, o polar, por ejemplo 10∠36.87." }
  ],
  example: { values: { conn: "star", VL: "400", Z: "8+6j" }, expect: ["IL = 23.09 A", "P = 12.8 kW"], note: "Ejemplo: carga en estrella de 8+6j Ω en una red de 400 V." },
  invalid: { values: { conn: "star", VL: "400", Z: "0" } },
  related: ["complex-power", "transformer", "phasor"]
};

export function solve(input) {
  const conn = choice(input, "conn", "Conexión", ["star", "delta"], "star");
  const VL = num(input, "VL", "Tensión de línea", { positive: true });
  const Z = readComplex(input, "Z", "Impedancia");
  if (cabs(Z) === 0) fail("La impedancia de fase no puede ser cero.", "Z");
  if (Z.re < 0) fail("La parte real de la impedancia no puede ser negativa en una carga pasiva.", "Z");
  const s3 = Math.sqrt(3);
  const Vph = conn === "star" ? VL / s3 : VL;
  const Iph = Vph / cabs(Z);
  const IL = conn === "star" ? Iph : s3 * Iph;
  const th = carg(Z);
  const P = 3 * Vph * Iph * Math.cos(th), Q = 3 * Vph * Iph * Math.sin(th), S = 3 * Vph * Iph;
  const steps = [
    conn === "star" ? { text: "En estrella la tensión de fase es menor que la de línea en √3:", tex: `V_{ph} = \\frac{${ntex(VL)}}{\\sqrt{3}} = ${ntex(Vph, 6)}\\ V` } : "En triángulo la tensión de fase es igual a la de línea.",
    { text: "Corriente de fase por la ley de Ohm:", tex: `I_{ph} = \\frac{V_{ph}}{|Z|} = \\frac{${ntex(Vph, 6)}}{${ntex(cabs(Z), 6)}} = ${ntex(Iph, 6)}\\ A` },
    conn === "star" ? "En estrella la corriente de línea es igual a la de fase." : { text: "En triángulo la corriente de línea es √3 veces mayor:", tex: `I_L = \\sqrt{3} \\times ${ntex(Iph, 6)} = ${ntex(IL, 6)}\\ A` },
    { text: "Potencia total de las tres fases:", tex: `P = \\sqrt{3}V_L I_L\\cos\\theta = \\sqrt{3} \\times ${ntex(VL)} \\times ${ntex(IL, 6)} \\times \\cos(${ntex((th * 180) / Math.PI, 5)}^\\circ) = ${ntex(P, 6)}\\ W` },
    { tex: `Q = ${ntex(Q, 6)}\\ VAR,\\quad S = ${ntex(S, 6)}\\ VA,\\quad PF = ${ntex(Math.cos(th), 5)}` }
  ];
  const ph = [0, -120, 120].map((d) => cpolar(Vph, (d * Math.PI) / 180));
  const cur = ph.map((v) => cpolar(Iph, carg(v) - th));
  const scale = Vph / Math.max(Iph, 1e-30) * 0.6;
  return {
    results: [
      { label: "Tensión de fase", value: eng(Vph, "V", 5) },
      { label: "Corriente de fase", value: eng(Iph, "A", 5) },
      { label: "Corriente de línea", value: eng(IL, "A", 4), text: `IL = ${eng(IL, "A", 4)}` },
      { label: "Potencia activa P", value: eng(P, "W", 4), text: `P = ${eng(P, "W", 4)}` },
      { label: "Potencia reactiva Q", value: eng(Q, "VAR", 4) },
      { label: "Potencia aparente S", value: eng(S, "VA", 4) },
      { label: "Factor de potencia", value: `${fmt(Math.cos(th), 5)} ${th > 0 ? "en retraso" : th < 0 ? "en adelanto" : ""}` }
    ],
    blocks: [phasorBlock([["Va", ph[0]], ["Vb", ph[1]], ["Vc", ph[2]], ...cur.map((c, k) => [`I${"abc"[k]} (ampliada)`, { re: c.re * scale, im: c.im * scale }])], "Tensiones y corrientes de fase")],
    steps, copy: `Vph = ${eng(Vph, "V", 5)}, IL = ${eng(IL, "A", 4)}, P = ${eng(P, "W", 4)}, Q = ${eng(Q, "VAR", 4)}`
  };
}

export { ctex, cfmt };
