import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cabs } from "../core/complex.js";
import { zR, zL, zC, zsum, zpar } from "./common.js";
import { logspaceSafe } from "../dc-circuits/common.js";

export const meta = {
  description: "Resonant frequency, quality factor Q, bandwidth and half-power frequencies of a series or parallel RLC circuit, with the response curve around resonance.",
  keywords: ["Resonance", "resonance", "Resonant frequency", "Quality factor", "quality factor", "Q", "Bandwidth", "bandwidth"],
  formulas: [
    { label: "Resonant frequency", tex: "f_0 = \\frac{1}{2\\pi\\sqrt{LC}},\\qquad \\omega_0 = \\frac{1}{\\sqrt{LC}}" },
    { label: "Quality factor and bandwidth", tex: "Q_s = \\frac{1}{R}\\sqrt{\\frac{L}{C}},\\quad Q_p = R\\sqrt{\\frac{C}{L}},\\quad BW = \\frac{f_0}{Q}" }
  ],
  inputs: [
    { id: "conn", label: "Connection", type: "select", default: "series", options: [["series", "Series"], ["parallel", "Parallel"]] },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10" },
    { id: "L", label: "L", unit: "H", type: "number", default: "1m" },
    { id: "C", label: "C", unit: "F", type: "number", default: "100n" }
  ],
  example: { values: { conn: "series", R: "10", L: "1m", C: "100n" }, expect: ["f0 = 15.92 kHz", "Q = 10"], note: "Example: series circuit with 10 Ω, 1 mH and 100 nF." },
  invalid: { values: { conn: "series", R: "10", L: "-1m", C: "100n" } },
  related: ["rlc-circuit", "passive-filter", "impedance"]
};

export function solve(input) {
  const conn = choice(input, "conn", "Connection", ["series", "parallel"], "series");
  const R = num(input, "R", "R", { positive: true }), L = num(input, "L", "L", { positive: true }), Cap = num(input, "C", "C", { positive: true });
  const w0 = 1 / Math.sqrt(L * Cap), f0 = w0 / (2 * Math.PI);
  const Q = conn === "series" ? Math.sqrt(L / Cap) / R : R * Math.sqrt(Cap / L);
  const a = conn === "series" ? R / (2 * L) : 1 / (2 * R * Cap);
  const w1 = -a + Math.sqrt(a * a + w0 * w0), w2 = a + Math.sqrt(a * a + w0 * w0);
  const f1 = w1 / (2 * Math.PI), f2 = w2 / (2 * Math.PI), BW = f2 - f1;
  const steps = [
    { text: "At resonance the two reactances are equal, so each one cancels the other:", tex: `\\omega_0 L = \\frac{1}{\\omega_0 C} \\Rightarrow f_0 = \\frac{1}{2\\pi\\sqrt{${ntex(L)} \\times ${ntex(Cap)}}} = ${ntex(f0, 6)}\\ \\text{Hz}` },
    { text: "Quality factor:", tex: conn === "series" ? `Q = \\frac{1}{R}\\sqrt{\\frac{L}{C}} = \\frac{1}{${ntex(R)}}\\sqrt{\\frac{${ntex(L)}}{${ntex(Cap)}}} = ${ntex(Q, 6)}` : `Q = R\\sqrt{\\frac{C}{L}} = ${ntex(R)}\\sqrt{\\frac{${ntex(Cap)}}{${ntex(L)}}} = ${ntex(Q, 6)}` },
    { text: "Half-power frequencies (exact solution, not the high-Q approximation):", tex: `\\omega_{1,2} = \\mp\\alpha + \\sqrt{\\alpha^2 + \\omega_0^2},\\; \\alpha = ${ntex(a, 6)} \\Rightarrow f_1 = ${ntex(f1, 6)},\\; f_2 = ${ntex(f2, 6)}\\ \\text{Hz}` },
    { text: "Bandwidth:", tex: `BW = f_2 - f_1 = ${ntex(BW, 6)}\\ \\text{Hz} = \\frac{f_0}{Q}` },
    conn === "series" ? `At resonance the impedance is at its minimum and equals R, and the current is at its maximum. The voltage across the inductor and the capacitor equals Q times the source voltage.` : "At resonance the impedance is at its maximum and equals R, and the total current is at its minimum, while a current Q times larger circulates between L and C."
  ];
  const fs = logspaceSafe(f0 / 10, f0 * 10, 400);
  const resp = fs.map((f) => {
    const w = 2 * Math.PI * f;
    const Z = conn === "series" ? zsum(zR(R), zL(L, w), zC(Cap, w)) : zpar(zR(R), zL(L, w), zC(Cap, w));
    return [f, conn === "series" ? R / cabs(Z) : cabs(Z) / R];
  });
  return {
    results: [
      { label: "Resonant frequency f0", value: eng(f0, "Hz", 4), text: `f0 = ${eng(f0, "Hz", 4)}` },
      { label: "Angular frequency ω0", value: eng(w0, "rad/s", 5) },
      { label: "Quality factor Q", value: Q, sig: 5, text: `Q = ${fmt(Q, 5)}` },
      { label: "Bandwidth BW", value: eng(BW, "Hz", 5) },
      { label: "Lower cutoff frequency f1", value: eng(f1, "Hz", 5) },
      { label: "Upper cutoff frequency f2", value: eng(f2, "Hz", 5) },
      { label: "Impedance at resonance", value: eng(R, "Ω", 5) }
    ],
    blocks: [{ type: "plot", title: conn === "series" ? "Relative current I/I₀ versus frequency" : "Relative impedance |Z|/R versus frequency", logX: true, xLabel: "f (Hz)", yLabel: conn === "series" ? "I/I₀" : "|Z|/R", series: [{ name: "Response", points: resp }], hlines: [{ y: Math.SQRT1_2 }], vlines: [{ x: f1 }, { x: f2 }] }],
    steps, copy: `f0 = ${eng(f0, "Hz", 4)}, Q = ${fmt(Q, 5)}, BW = ${eng(BW, "Hz", 5)}`
  };
}
