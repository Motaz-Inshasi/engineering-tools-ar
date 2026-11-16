import { choice, numList, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const CFG = [["inv", "Inverting"], ["noninv", "Non-inverting"], ["sum", "Summing amplifier"], ["diff", "Difference amplifier (subtractor)"], ["integ", "Integrator"], ["deriv", "Differentiator"]];

export const meta = {
  description: "Calculate the gain of an ideal op-amp in common circuits: inverting, non-inverting, summing, difference, integrator and differentiator, with the output voltage and a saturation warning when the supply voltage is exceeded.",
  keywords: ["Op-amp", "op-amp", "Op-amp", "Inverting amplifier", "Non-inverting amplifier", "Summer", "Integrator", "Differentiator", "Gain"],
  formulas: [
    { label: "Inverting and non-inverting", tex: "A_{inv} = -\\frac{R_f}{R_{in}},\\qquad A_{non} = 1 + \\frac{R_f}{R_{in}}" },
    { label: "Summer, integrator and differentiator (sinusoidal signal)", tex: "V_o = -R_f\\sum\\frac{V_i}{R_i},\\qquad |A_{int}| = \\frac{1}{\\omega RC},\\qquad |A_{diff}| = \\omega RC" }
  ],
  inputs: [
    { id: "cfg", label: "Circuit", type: "select", default: "inv", options: CFG },
    { id: "Rf", label: "Feedback resistor Rf", unit: "Ω", type: "number", default: "100k", when: { cfg: ["inv", "noninv", "sum", "diff"] } },
    { id: "Rin", label: "Input resistor Rin", unit: "Ω", type: "number", default: "10k", when: { cfg: ["inv", "noninv", "diff"] } },
    { id: "Vin", label: "Input voltage Vin", unit: "V", type: "number", default: "0.5", when: { cfg: ["inv", "noninv", "integ", "deriv"] }, help: "For the integrator and differentiator: amplitude of the sinusoidal signal." },
    { id: "V2", label: "Second input voltage V2 (V1 = Vin is subtracted from it)", unit: "V", type: "number", default: "1", when: { cfg: ["diff"] } },
    { id: "V1d", label: "Input voltage V1", unit: "V", type: "number", default: "0.5", when: { cfg: ["diff"] } },
    { id: "Rs", label: "Input resistors for the summer", unit: "Ω", type: "text", default: "10k, 20k, 50k", when: { cfg: ["sum"] } },
    { id: "Vs", label: "Input voltages for the summer", unit: "V", type: "text", default: "1, 0.5, -2", when: { cfg: ["sum"] } },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10k", when: { cfg: ["integ", "deriv"] } },
    { id: "C", label: "C", unit: "F", type: "number", default: "10n", when: { cfg: ["integ", "deriv"] } },
    { id: "f", label: "Signal frequency", unit: "Hz", type: "number", default: "1k", when: { cfg: ["integ", "deriv"] } },
    { id: "Vsat", label: "Supply voltage ±Vcc", unit: "V", type: "number", default: "15" }
  ],
  example: { values: { cfg: "inv", Rf: "100k", Rin: "10k", Vin: "0.5", Vsat: "15" }, expect: ["A = -10", "Vout = -5 V"], note: "Example: inverting amplifier with gain −10 and input 0.5 V." },
  invalid: { values: { cfg: "inv", Rf: "100k", Rin: "0", Vin: "0.5", Vsat: "15" } },
  related: ["bjt-bias", "passive-filter", "adc", "sensor-divider"]
};

export function solve(input) {
  const cfg = choice(input, "cfg", "Circuit", CFG.map((c) => c[0]), "inv");
  const Vsat = num(input, "Vsat", "Supply voltage", { positive: true });
  const steps = ["We assume an ideal op-amp: infinite gain, no current enters its input terminals, and their voltages are equal (virtual short)."];
  let A = null, Vout, gainText;
  if (cfg === "inv" || cfg === "noninv") {
    const Rf = num(input, "Rf", "Rf", { positive: true }), Rin = num(input, "Rin", "Rin", { positive: true }), Vin = num(input, "Vin", "Vin");
    A = cfg === "inv" ? -Rf / Rin : 1 + Rf / Rin;
    Vout = A * Vin;
    steps.push({ text: cfg === "inv" ? "The inverting terminal is at virtual ground, so the entire input current flows through Rf:" : "The inverting terminal voltage equals Vin, and Rf and Rin form a divider with the output:", tex: cfg === "inv" ? `A = -\\frac{${ntex(Rf)}}{${ntex(Rin)}} = ${ntex(A, 6)}` : `A = 1 + \\frac{${ntex(Rf)}}{${ntex(Rin)}} = ${ntex(A, 6)}` });
    steps.push({ tex: `V_{out} = A V_{in} = ${ntex(A, 6)} \\times ${ntex(Vin)} = ${ntex(Vout, 6)}\\ V` });
    gainText = `A = ${fmt(A, 6)}`;
  } else if (cfg === "sum") {
    const Rf = num(input, "Rf", "Rf", { positive: true });
    const Rs = numList(input, "Rs", "Input resistors", { positive: true, max: 10 });
    const Vs = numList(input, "Vs", "Input voltages", { max: 10 });
    if (Rs.length !== Vs.length) fail(`The number of resistors (${Rs.length}) must equal the number of voltages (${Vs.length}).`, "Vs");
    Vout = -Rf * Rs.reduce((s, r, i) => s + Vs[i] / r, 0);
    steps.push({ text: "The input currents sum at the virtual ground and flow through Rf:", tex: `V_{out} = -${ntex(Rf)}\\left(${Rs.map((r, i) => `\\frac{${ntex(Vs[i])}}{${ntex(r)}}`).join(" + ")}\\right) = ${ntex(Vout, 6)}\\ V` });
    gainText = Rs.map((r, i) => `A${i + 1} = ${fmt(-Rf / r, 5)}`).join(", ");
  } else if (cfg === "diff") {
    const Rf = num(input, "Rf", "Rf", { positive: true }), Rin = num(input, "Rin", "Rin", { positive: true });
    const V1 = num(input, "V1d", "V1"), V2 = num(input, "V2", "V2");
    A = Rf / Rin;
    Vout = A * (V2 - V1);
    steps.push({ text: "With matched resistors (Rf/Rin on both sides), it amplifies only the difference:", tex: `V_{out} = \\frac{R_f}{R_{in}}(V_2 - V_1) = ${ntex(A, 6)}(${ntex(V2)} - ${ntex(V1)}) = ${ntex(Vout, 6)}\\ V` });
    gainText = `A = ${fmt(A, 6)}`;
  } else {
    const R = num(input, "R", "R", { positive: true }), C = num(input, "C", "C", { positive: true }), f = num(input, "f", "Frequency", { positive: true }), Vin = num(input, "Vin", "Vin");
    const w = 2 * Math.PI * f, wc = 1 / (R * C);
    A = cfg === "integ" ? 1 / (w * R * C) : w * R * C;
    Vout = A * Vin;
    steps.push(cfg === "integ"
      ? { text: "Integrator: $v_o = -\\frac{1}{RC}\\int v_i\\,dt$, and for a sinusoidal signal the gain becomes:", tex: `|A| = \\frac{1}{\\omega RC} = \\frac{1}{${ntex(w, 5)} \\times ${ntex(R)} \\times ${ntex(C)}} = ${ntex(A, 5)},\\ \\text{phase } +90^\\circ` }
      : { text: "Differentiator: $v_o = -RC\\frac{dv_i}{dt}$, and for a sinusoidal signal the gain becomes:", tex: `|A| = \\omega RC = ${ntex(w, 5)} \\times ${ntex(R)} \\times ${ntex(C)} = ${ntex(A, 5)},\\ \\text{phase } -90^\\circ` });
    steps.push(`At frequency ${eng(wc / (2 * Math.PI), "Hz", 4)} the gain becomes 1. ${cfg === "integ" ? "In practice, a resistor is added in parallel with the capacitor to prevent saturation from the DC voltage." : "In practice, a resistor is added in series with the capacitor to reduce high-frequency noise."}`);
    gainText = `|A| = ${fmt(A, 5)}`;
  }
  const sat = Math.abs(Vout) > Vsat;
  if (sat) steps.push(`Warning: the calculated output ${fmt(Vout, 4)} V exceeds the supply voltage ±${fmt(Vsat)} V, so the actual output will saturate at about ${fmt(Math.sign(Vout) * Vsat, 3)} V.`);
  const results = [];
  if (A !== null) results.push({ label: "Gain", value: A, sig: 6, text: gainText }, { label: "Gain in dB", value: `${fmt(20 * Math.log10(Math.abs(A)), 4)} dB` });
  else results.push({ label: "Gain per input", value: gainText });
  results.push({ label: cfg === "integ" || cfg === "deriv" ? "Output amplitude" : "Output voltage", value: eng(Vout, "V", 4), text: `Vout = ${eng(Vout, "V", 4)}` }, { label: "Status", value: sat ? "Saturated (output clipped)" : "Within the linear range" });
  return { results, steps, copy: `${gainText}, Vout = ${eng(Vout, "V", 4)}${sat ? " (saturated)" : ""}` };
}
