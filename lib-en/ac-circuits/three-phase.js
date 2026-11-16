import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cabs, carg, ctex, cfmt, cpolar } from "../core/complex.js";
import { phasorBlock } from "./common.js";

export const meta = {
  description: "Balanced three-phase systems in star or delta connection: phase and line voltage and current, real, reactive and apparent power and power factor, from the line voltage and the load impedance per phase.",
  keywords: ["Three-phase", "Three phases", "three phase", "Star", "Delta", "star", "delta", "Line voltage", "Line current", "√3"],
  formulas: [
    { label: "Star (Y)", tex: "V_L = \\sqrt{3}\\,V_{ph},\\quad I_L = I_{ph}" },
    { label: "Delta (Δ) and total power", tex: "V_L = V_{ph},\\quad I_L = \\sqrt{3}\\,I_{ph},\\qquad P = \\sqrt{3}\\,V_L I_L\\cos\\theta = 3V_{ph}I_{ph}\\cos\\theta" }
  ],
  inputs: [
    { id: "conn", label: "Load connection", type: "select", default: "star", options: [["star", "Star (Y)"], ["delta", "Delta (Δ)"]] },
    { id: "VL", label: "Line voltage (RMS)", unit: "V", type: "number", default: "400" },
    { id: "Z", label: "Load impedance per phase", unit: "Ω", type: "text", default: "8+6j", help: "Rectangular, e.g. 8+6j, or polar, e.g. 10∠36.87." }
  ],
  example: { values: { conn: "star", VL: "400", Z: "8+6j" }, expect: ["IL = 23.09 A", "P = 12.8 kW"], note: "Example: star load of 8+6j Ω on a 400 V supply." },
  invalid: { values: { conn: "star", VL: "400", Z: "0" } },
  related: ["complex-power", "transformer", "phasor"]
};

export function solve(input) {
  const conn = choice(input, "conn", "Connection", ["star", "delta"], "star");
  const VL = num(input, "VL", "Line voltage", { positive: true });
  const Z = readComplex(input, "Z", "Impedance");
  if (cabs(Z) === 0) fail("Phase impedance cannot be zero.", "Z");
  if (Z.re < 0) fail("The real part of the impedance cannot be negative for a passive load.", "Z");
  const s3 = Math.sqrt(3);
  const Vph = conn === "star" ? VL / s3 : VL;
  const Iph = Vph / cabs(Z);
  const IL = conn === "star" ? Iph : s3 * Iph;
  const th = carg(Z);
  const P = 3 * Vph * Iph * Math.cos(th), Q = 3 * Vph * Iph * Math.sin(th), S = 3 * Vph * Iph;
  const steps = [
    conn === "star" ? { text: "In star the phase voltage is lower than the line voltage by √3:", tex: `V_{ph} = \\frac{${ntex(VL)}}{\\sqrt{3}} = ${ntex(Vph, 6)}\\ V` } : "In delta the phase voltage equals the line voltage.",
    { text: "Phase current from Ohm's law:", tex: `I_{ph} = \\frac{V_{ph}}{|Z|} = \\frac{${ntex(Vph, 6)}}{${ntex(cabs(Z), 6)}} = ${ntex(Iph, 6)}\\ A` },
    conn === "star" ? "In star the line current equals the phase current." : { text: "In delta the line current is larger by √3:", tex: `I_L = \\sqrt{3} \\times ${ntex(Iph, 6)} = ${ntex(IL, 6)}\\ A` },
    { text: "Total power of the three phases:", tex: `P = \\sqrt{3}V_L I_L\\cos\\theta = \\sqrt{3} \\times ${ntex(VL)} \\times ${ntex(IL, 6)} \\times \\cos(${ntex((th * 180) / Math.PI, 5)}^\\circ) = ${ntex(P, 6)}\\ W` },
    { tex: `Q = ${ntex(Q, 6)}\\ VAR,\\quad S = ${ntex(S, 6)}\\ VA,\\quad PF = ${ntex(Math.cos(th), 5)}` }
  ];
  const ph = [0, -120, 120].map((d) => cpolar(Vph, (d * Math.PI) / 180));
  const cur = ph.map((v) => cpolar(Iph, carg(v) - th));
  const scale = Vph / Math.max(Iph, 1e-30) * 0.6;
  return {
    results: [
      { label: "Phase voltage", value: eng(Vph, "V", 5) },
      { label: "Phase current", value: eng(Iph, "A", 5) },
      { label: "Line current", value: eng(IL, "A", 4), text: `IL = ${eng(IL, "A", 4)}` },
      { label: "Real power P", value: eng(P, "W", 4), text: `P = ${eng(P, "W", 4)}` },
      { label: "Reactive power Q", value: eng(Q, "VAR", 4) },
      { label: "Apparent power S", value: eng(S, "VA", 4) },
      { label: "Power factor", value: `${fmt(Math.cos(th), 5)} ${th > 0 ? "lagging" : th < 0 ? "leading" : ""}` }
    ],
    blocks: [phasorBlock([["Va", ph[0]], ["Vb", ph[1]], ["Vc", ph[2]], ...cur.map((c, k) => [`I${"abc"[k]} (scaled)`, { re: c.re * scale, im: c.im * scale }])], "Phase voltages and currents")],
    steps, copy: `Vph = ${eng(Vph, "V", 5)}, IL = ${eng(IL, "A", 4)}, P = ${eng(P, "W", 4)}, Q = ${eng(Q, "VAR", 4)}`
  };
}

export { ctex, cfmt };
