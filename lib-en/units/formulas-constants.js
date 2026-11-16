import { choice, fail } from "../core/validate.js";
import { normalizeArabic, matches } from "../core/text.js";

export const CONSTANTS = [
  { name: "Speed of light in vacuum", sym: "c", value: "299792458", unit: "m/s", exact: true },
  { name: "Planck constant", sym: "h", value: "6.62607015e-34", unit: "J·s", exact: true },
  { name: "Elementary charge (electron charge)", sym: "e", value: "1.602176634e-19", unit: "C", exact: true },
  { name: "Boltzmann constant", sym: "k_B", value: "1.380649e-23", unit: "J/K", exact: true },
  { name: "Avogadro constant", sym: "N_A", value: "6.02214076e23", unit: "1/mol", exact: true },
  { name: "Molar gas constant", sym: "R", value: "8.314462618", unit: "J/(mol·K)", exact: true },
  { name: "Vacuum permittivity", sym: "\\varepsilon_0", value: "8.8541878128e-12", unit: "F/m", exact: false },
  { name: "Vacuum permeability", sym: "\\mu_0", value: "1.25663706212e-6", unit: "H/m", exact: false },
  { name: "Electron mass", sym: "m_e", value: "9.1093837015e-31", unit: "kg", exact: false },
  { name: "Gravitational constant", sym: "G", value: "6.67430e-11", unit: "N·m²/kg²", exact: false },
  { name: "Standard acceleration of gravity", sym: "g_n", value: "9.80665", unit: "m/s²", exact: true },
  { name: "Stefan–Boltzmann constant", sym: "\\sigma", value: "5.670374419e-8", unit: "W/(m²·K⁴)", exact: true },
  { name: "Impedance of free space", sym: "Z_0", value: "376.730313668", unit: "Ω", exact: false },
  { name: "Thermal voltage at 25 °C", sym: "V_T = kT/q", value: "0.025693", unit: "V", exact: false },
  { name: "Resistivity of copper at 20 °C", sym: "\\rho_{Cu}", value: "1.68e-8", unit: "Ω·m", exact: false }
];

export const FORMULAS = [
  { cat: "dc", name: "Ohm's law and power", tex: "V = IR,\\quad P = VI = I^2R = V^2/R", tool: "ohms-law" },
  { cat: "dc", name: "Resistors in series and in parallel", tex: "R_s = \\sum R_i,\\quad 1/R_p = \\sum 1/R_i", tool: "series-parallel-resistors" },
  { cat: "dc", name: "Voltage divider", tex: "V_{out} = V_{in}\\,R_2/(R_1 + R_2)", tool: "voltage-current-divider" },
  { cat: "dc", name: "Wire resistance", tex: "R = \\rho\\,L/A", tool: "ohms-law" },
  { cat: "ac", name: "Reactance", tex: "X_L = 2\\pi f L,\\quad X_C = 1/(2\\pi f C)", tool: "impedance" },
  { cat: "ac", name: "Resonant frequency", tex: "f_0 = 1/(2\\pi\\sqrt{LC})", tool: "resonance" },
  { cat: "ac", name: "RMS value of a sinusoid", tex: "V_{rms} = V_p/\\sqrt{2}", tool: "phasor" },
  { cat: "ac", name: "Complex power", tex: "S = VI^*,\\ P = VI\\cos\\theta,\\ Q = VI\\sin\\theta", tool: "complex-power" },
  { cat: "ac", name: "Three-phase power", tex: "P = \\sqrt{3}V_L I_L\\cos\\theta", tool: "three-phase" },
  { cat: "ac", name: "Time constant", tex: "\\tau = RC,\\quad \\tau = L/R", tool: "rc-rl-transient" },
  { cat: "electronics", name: "Energy of capacitor and inductor", tex: "W_C = \\tfrac12 CV^2,\\quad W_L = \\tfrac12 LI^2", tool: "capacitor-inductor-combination" },
  { cat: "electronics", name: "Capacitance of a parallel-plate capacitor", tex: "C = \\varepsilon_0\\varepsilon_r A/d", tool: "capacitor-inductor-combination" },
  { cat: "electronics", name: "Inverting operational amplifier", tex: "A = -R_f/R_{in}", tool: "op-amp" },
  { cat: "electronics", name: "555 timer", tex: "f = 1.44/((R_1 + 2R_2)C)", tool: "timer-555" },
  { cat: "electronics", name: "Diode equation (Shockley)", tex: "I = I_S\\left(e^{V/(nV_T)} - 1\\right)", tool: "rectifier-ripple" },
  { cat: "signals", name: "Decibel", tex: "dB = 20\\log_{10}(V_2/V_1) = 10\\log_{10}(P_2/P_1)", tool: "bode-plot" },
  { cat: "signals", name: "Nyquist criterion", tex: "f_s > 2 f_{max}", tool: "sampling-nyquist" },
  { cat: "signals", name: "ADC signal-to-noise ratio (SNR)", tex: "SNR = 6.02N + 1.76\\ dB", tool: "adc" },
  { cat: "math", name: "Quadratic formula", tex: "x = (-b \\pm \\sqrt{b^2 - 4ac})/(2a)", tool: "quadratic" },
  { cat: "math", name: "Euler's formula", tex: "e^{j\\theta} = \\cos\\theta + j\\sin\\theta", tool: "complex-numbers" },
  { cat: "math", name: "Pythagorean trigonometric identity", tex: "\\sin^2\\theta + \\cos^2\\theta = 1", tool: "trigonometry" }
];

const CATS = [["all", "All"], ["constants", "Physical constants"], ["dc", "Direct current (DC)"], ["ac", "Alternating current (AC)"], ["electronics", "Electronics"], ["signals", "Signals"], ["math", "Mathematics"]];

export const meta = {
  description: "A searchable quick reference of physical constants (with exact CODATA 2018 values) and the most important laws of electricity, electronics, signals and mathematics, with a link to the tool that calculates each law.",
  keywords: ["formulas", "constants", "physical constants", "reference", "constants", "formulas", "speed of light", "Boltzmann", "cheat sheet"],
  formulas: [{ label: "Example: thermal voltage of a diode", tex: "V_T = \\frac{k_B T}{e} \\approx 25.7\\ mV\\ (25^\\circ C)" }],
  inputs: [
    { id: "cat", label: "Category", type: "select", default: "all", options: CATS },
    { id: "find", label: "Search (optional)", type: "text", placeholder: "For example: resonance, Boltzmann, capacitor" }
  ],
  example: { values: { cat: "all", find: "Boltzmann" }, expect: ["1.380649e-23"], note: "Example: search for the Boltzmann constant." },
  invalid: { values: { cat: "all", find: "zzzzqqq" } },
  related: ["unit-converter", "engineering-notation", "ohms-law"]
};

export function solve(input) {
  const cat = choice(input, "cat", "Category", CATS.map((c) => c[0]), "all");
  const q = normalizeArabic(input.find ?? "");
  const consts = cat === "all" || cat === "constants" ? CONSTANTS.filter((c) => !q || matches(`${c.name} ${c.sym} ${c.unit}`, q)) : [];
  const forms = cat === "constants" ? [] : FORMULAS.filter((f) => (cat === "all" || f.cat === cat) && (!q || matches(`${f.name} ${f.tex} ${f.tool}`, q)));
  if (!consts.length && !forms.length) {
    fail("No matching results. Try another word or choose “All”.", "find");
  }
  const blocks = [];
  if (consts.length) blocks.push({ type: "table", caption: "Physical constants (CODATA 2018)", head: ["Constant", "Symbol", "Value", "Unit", "Exact?"], rows: consts.map((c) => [c.name, { tex: c.sym }, { tex: c.value.replace(/e(-?\d+)$/, " \\times 10^{$1}") }, c.unit, c.exact ? "Yes (defined)" : "Measured"]) });
  if (forms.length) blocks.push({ type: "table", caption: "Formulas", head: ["Law", "Formula", "Tool"], rows: forms.map((f) => [f.name, { tex: f.tex }, { text: f.tool }]) });
  const steps = [
    "Constants marked “defined” have exact values since the 2019 redefinition of the SI units; the rest are measured values from the latest CODATA recommendations.",
    "The tool name next to each law is the tool on this site that calculates it in detail."
  ];
  return {
    results: [{ label: "Number of matching constants", value: consts.length }, { label: "Number of matching formulas", value: forms.length }],
    blocks, steps,
    copy: [...consts.map((c) => `${c.name}: ${c.value} ${c.unit}`), ...forms.map((f) => `${f.name}: ${f.tex}`)].join("\n")
  };
}
