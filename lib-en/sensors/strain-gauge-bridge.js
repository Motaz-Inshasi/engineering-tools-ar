import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const CFG = [["quarter", "Quarter bridge (one gauge)"], ["half", "Half bridge (two gauges: tension and compression)"], ["full", "Full bridge (four gauges)"]];

export const meta = {
  description: "Strain gauge in a Wheatstone bridge: output voltage for quarter, half and full bridges from the strain and gauge factor, or the strain from the output voltage, with the resistance change and the gain required for the amplifier.",
  keywords: ["Strain gauge", "strain gauge", "Strain", "Bridge", "gauge factor", "Gauge factor", "Microstrain", "Load cell"],
  formulas: [
    { label: "Resistance change", tex: "\\frac{\\Delta R}{R} = GF \\cdot \\varepsilon" },
    { label: "Output", tex: "\\text{quarter: } V_o = V_{ex}\\frac{GF\\varepsilon}{4}\\cdot\\frac{1}{1 + GF\\varepsilon/2},\\quad \\text{half: } \\frac{V_{ex}GF\\varepsilon}{2},\\quad \\text{full: } V_{ex}GF\\varepsilon" }
  ],
  inputs: [
    { id: "cfg", label: "Configuration", type: "select", default: "quarter", options: CFG },
    { id: "dir", label: "Calculate", type: "select", default: "e2v", options: [["e2v", "Output voltage from strain"], ["v2e", "Strain from output voltage"]] },
    { id: "strain", label: "Strain", unit: "µε", type: "number", default: "1000", when: { dir: ["e2v"] } },
    { id: "Vo", label: "Output voltage", unit: "V", type: "number", default: "5m", when: { dir: ["v2e"] } },
    { id: "GF", label: "Gauge factor GF", type: "number", default: "2" },
    { id: "Vex", label: "Excitation voltage Vex", unit: "V", type: "number", default: "10" },
    { id: "R", label: "Gauge resistance", unit: "Ω", type: "number", default: "350" },
    { id: "Vadc", label: "ADC range required for full output (optional)", unit: "V", type: "number", default: "3.3" }
  ],
  example: { values: { cfg: "quarter", dir: "e2v", strain: "1000", GF: "2", Vex: "10", R: "350", Vadc: "3.3" }, expect: ["Vo = 4.995 mV"], note: "Example: 1000 µε strain with a single gauge, GF = 2 and 10 V excitation." },
  invalid: { values: { cfg: "quarter", dir: "e2v", strain: "1000", GF: "0", Vex: "10", R: "350" } },
  related: ["wheatstone-bridge", "op-amp", "adc", "rtd"]
};

export function output(cfg, Vex, GF, e) {
  const x = GF * e;
  if (cfg === "quarter") return (Vex * x) / 4 / (1 + x / 2);
  if (cfg === "half") return (Vex * x) / 2;
  return Vex * x;
}

export function strainFrom(cfg, Vex, GF, Vo) {
  const r = Vo / Vex;
  if (cfg === "quarter") return (4 * r) / (GF * (1 - 2 * r));
  if (cfg === "half") return (2 * r) / GF;
  return r / GF;
}

export function solve(input) {
  const cfg = choice(input, "cfg", "Configuration", CFG.map((c) => c[0]), "quarter");
  const dir = choice(input, "dir", "Calculate", ["e2v", "v2e"], "e2v");
  const GF = num(input, "GF", "Gauge factor", { positive: true });
  const Vex = num(input, "Vex", "Supply voltage", { positive: true });
  const R = num(input, "R", "Gauge resistance", { positive: true });
  const Vadc = num(input, "Vadc", "ADC range", { optional: true, positive: true });
  let e, Vo;
  const steps = [];
  if (dir === "e2v") {
    e = num(input, "strain", "Strain", { min: -1e5, max: 1e5 }) * 1e-6;
    Vo = output(cfg, Vex, GF, e);
  } else {
    Vo = num(input, "Vo", "Output voltage");
    e = strainFrom(cfg, Vex, GF, Vo);
  }
  const dR = R * GF * e;
  steps.push({ text: "Change in gauge resistance:", tex: `\\Delta R = R \\cdot GF \\cdot \\varepsilon = ${ntex(R)} \\times ${ntex(GF)} \\times ${ntex(e, 5)} = ${ntex(dR, 5)}\\ \\Omega` });
  if (cfg === "quarter") steps.push({ text: "In a quarter bridge one arm is active, and the relation is slightly nonlinear:", tex: `V_o = ${ntex(Vex)}\\frac{GF\\varepsilon/4}{1 + GF\\varepsilon/2} = ${ntex(Vo, 5)}\\ V` });
  else if (cfg === "half") steps.push({ text: "In a half bridge there is a tension gauge and a compression gauge in two adjacent arms, so the sensitivity doubles and the nonlinearity disappears:", tex: `V_o = \\frac{V_{ex} GF \\varepsilon}{2} = ${ntex(Vo, 5)}\\ V` });
  else steps.push({ text: "In a full bridge there are four active gauges, so the sensitivity is four times that of a quarter bridge:", tex: `V_o = V_{ex} GF \\varepsilon = ${ntex(Vo, 5)}\\ V` });
  if (dir === "v2e") steps.push({ text: "We inverted the relation to find the strain:", tex: `\\varepsilon = ${ntex(e * 1e6, 5)}\\ \\mu\\varepsilon` });
  steps.push("Full and half bridges also compensate for temperature changes automatically, which is why they are common in load cells.");
  const results = [
    { label: "Output voltage", value: eng(Vo, "V", 4), text: `Vo = ${eng(Vo, "V", 4)}` },
    { label: "Strain", value: `${fmt(e * 1e6, 5)} µε` },
    { label: "Resistance change", value: eng(dR, "Ω", 4) },
    { label: "Sensitivity", value: `${fmt((Vo / Vex) * 1000, 4)} mV/V` }
  ];
  if (Vadc !== null && Vo !== 0) {
    const G = Vadc / Math.abs(Vo);
    results.push({ label: "Amplifier gain to fill the ADC range", value: fmt(G, 4) });
    steps.push(`To amplify this output to ${fmt(Vadc)} V we need an amplifier (usually an instrumentation amplifier) with gain ${fmt(G, 4)}.`);
  }
  return { results, steps, copy: `Vo = ${eng(Vo, "V", 4)}, ε = ${fmt(e * 1e6, 5)} µε, ΔR = ${eng(dR, "Ω", 4)}` };
}
