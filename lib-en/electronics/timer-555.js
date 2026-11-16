import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "The 555 timer in astable (free-running oscillator) and monostable (one-shot) modes: frequency, duty cycle, rise and fall times and pulse width, with the output waveform.",
  keywords: ["555", "555 timer", "timer", "astable", "monostable", "Oscillator", "Pulse", "Duty cycle", "duty cycle"],
  formulas: [
    { label: "Astable oscillator", tex: "t_H = \\ln 2\\,(R_1 + R_2)C,\\quad t_L = \\ln 2\\,R_2 C,\\quad f = \\frac{1}{t_H + t_L} \\approx \\frac{1.44}{(R_1 + 2R_2)C}" },
    { label: "Monostable", tex: "t = \\ln 3\\,RC \\approx 1.1\\,RC" }
  ],
  inputs: [
    { id: "mode", label: "Mode", type: "select", default: "astable", options: [["astable", "Astable (oscillator)"], ["mono", "Monostable (single pulse)"]] },
    { id: "R1", label: "R1", unit: "Ω", type: "number", default: "1k", when: { mode: ["astable"] } },
    { id: "R2", label: "R2", unit: "Ω", type: "number", default: "10k", when: { mode: ["astable"] } },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "100k", when: { mode: ["mono"] } },
    { id: "C", label: "C", unit: "F", type: "number", default: "100n" }
  ],
  example: { values: { mode: "astable", R1: "1k", R2: "10k", C: "100n" }, expect: ["f = 687 Hz", "52.38%"], note: "Example: R1 = 1 kΩ, R2 = 10 kΩ, and C = 100 nF." },
  invalid: { values: { mode: "astable", R1: "1k", R2: "0", C: "100n" } },
  related: ["rc-rl-transient", "pwm-servo", "capacitor-inductor-combination"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Mode", ["astable", "mono"], "astable");
  const C = num(input, "C", "C", { positive: true });
  const L2 = Math.LN2, L3 = Math.log(3);
  if (mode === "mono") {
    const R = num(input, "R", "R", { positive: true });
    const t = L3 * R * C;
    return {
      results: [{ label: "Pulse width", value: eng(t, "s", 4), text: `t = ${eng(t, "s", 4)}` }],
      steps: [
        "At the trigger pulse the output goes high and the capacitor charges through R until it reaches ⅔ of the supply voltage, then the output goes low.",
        { text: "Charging time from 0 to ⅔Vcc:", tex: `t = RC\\ln 3 = ${ntex(R)} \\times ${ntex(C)} \\times 1.0986 = ${ntex(t, 5)}\\ s` },
        "The result does not depend on the supply voltage, because the comparator thresholds are fractions of it."
      ],
      copy: `t = ${eng(t, "s", 4)}`
    };
  }
  const R1 = num(input, "R1", "R1", { positive: true }), R2 = num(input, "R2", "R2", { positive: true });
  if (R1 < 1) fail("R1 is very small and may damage the discharge pin (at least 1 kΩ is recommended).", "R1");
  const tH = L2 * (R1 + R2) * C, tL = L2 * R2 * C, T = tH + tL, f = 1 / T, D = tH / T;
  const steps = [
    "The capacitor voltage oscillates between ⅓Vcc and ⅔Vcc: it charges through R1 + R2 (output high) and discharges through R2 only (output low).",
    { text: "Rise and fall times:", tex: `t_H = \\ln 2 (${ntex(R1)} + ${ntex(R2)})(${ntex(C)}) = ${ntex(tH, 5)}\\ s,\\quad t_L = \\ln 2 \\cdot ${ntex(R2)} \\cdot ${ntex(C)} = ${ntex(tL, 5)}\\ s` },
    { text: "Frequency and duty cycle:", tex: `f = \\frac{1}{t_H + t_L} = ${ntex(f, 5)}\\ Hz,\\quad D = \\frac{t_H}{t_H + t_L} = ${ntex(100 * D, 4)}\\%` },
    "In this circuit the duty cycle is always greater than 50%; to get less than that, a diode is added in parallel with R2."
  ];
  const pts = [];
  for (let k = 0; k < 3; k++) {
    const t0 = k * T;
    pts.push([t0, 0], [t0, 1], [t0 + tH, 1], [t0 + tH, 0], [t0 + T, 0]);
  }
  return {
    results: [
      { label: "Frequency", value: eng(f, "Hz", 4), text: `f = ${eng(f, "Hz", 4)}` },
      { label: "Duty cycle", value: `${fmt(100 * D, 4)}%`, text: `D = ${fmt(100 * D, 4)}%` },
      { label: "Rise time tH", value: eng(tH, "s", 4) },
      { label: "Fall time tL", value: eng(tL, "s", 4) },
      { label: "Period T", value: eng(T, "s", 4) }
    ],
    blocks: [{ type: "plot", title: "Output waveform (three cycles)", xLabel: "t (s)", yLabel: "Output", yMin: -0.2, yMax: 1.3, series: [{ name: "Output", points: pts }] }],
    steps, copy: `f = ${eng(f, "Hz", 4)}, D = ${fmt(100 * D, 4)}%, tH = ${eng(tH, "s", 4)}, tL = ${eng(tL, "s", 4)}`
  };
}
