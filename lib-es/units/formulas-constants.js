import { choice, fail } from "../core/validate.js";
import { normalizeArabic, matches } from "../core/text.js";

export const CONSTANTS = [
  { name: "Velocidad de la luz en el vacío", sym: "c", value: "299792458", unit: "m/s", exact: true },
  { name: "Constante de Planck", sym: "h", value: "6.62607015e-34", unit: "J·s", exact: true },
  { name: "Carga elemental (carga del electrón)", sym: "e", value: "1.602176634e-19", unit: "C", exact: true },
  { name: "Constante de Boltzmann", sym: "k_B", value: "1.380649e-23", unit: "J/K", exact: true },
  { name: "Número de Avogadro", sym: "N_A", value: "6.02214076e23", unit: "1/mol", exact: true },
  { name: "Constante universal de los gases", sym: "R", value: "8.314462618", unit: "J/(mol·K)", exact: true },
  { name: "Permitividad del vacío", sym: "\\varepsilon_0", value: "8.8541878128e-12", unit: "F/m", exact: false },
  { name: "Permeabilidad del vacío", sym: "\\mu_0", value: "1.25663706212e-6", unit: "H/m", exact: false },
  { name: "Masa del electrón", sym: "m_e", value: "9.1093837015e-31", unit: "kg", exact: false },
  { name: "Constante gravitacional universal", sym: "G", value: "6.67430e-11", unit: "N·m²/kg²", exact: false },
  { name: "Aceleración estándar de la gravedad", sym: "g_n", value: "9.80665", unit: "m/s²", exact: true },
  { name: "Constante de Stefan-Boltzmann", sym: "\\sigma", value: "5.670374419e-8", unit: "W/(m²·K⁴)", exact: true },
  { name: "Impedancia del vacío", sym: "Z_0", value: "376.730313668", unit: "Ω", exact: false },
  { name: "Tensión térmica a 25 °C", sym: "V_T = kT/q", value: "0.025693", unit: "V", exact: false },
  { name: "Resistividad del cobre a 20 °C", sym: "\\rho_{Cu}", value: "1.68e-8", unit: "Ω·m", exact: false }
];

export const FORMULAS = [
  { cat: "dc", name: "Ley de Ohm y potencia", tex: "V = IR,\\quad P = VI = I^2R = V^2/R", tool: "ohms-law" },
  { cat: "dc", name: "Resistencias en serie y en paralelo", tex: "R_s = \\sum R_i,\\quad 1/R_p = \\sum 1/R_i", tool: "series-parallel-resistors" },
  { cat: "dc", name: "Divisor de tensión", tex: "V_{out} = V_{in}\\,R_2/(R_1 + R_2)", tool: "voltage-current-divider" },
  { cat: "dc", name: "Resistencia de un conductor", tex: "R = \\rho\\,L/A", tool: "ohms-law" },
  { cat: "ac", name: "Reactancia", tex: "X_L = 2\\pi f L,\\quad X_C = 1/(2\\pi f C)", tool: "impedance" },
  { cat: "ac", name: "Frecuencia de resonancia", tex: "f_0 = 1/(2\\pi\\sqrt{LC})", tool: "resonance" },
  { cat: "ac", name: "Valor eficaz de una senoide", tex: "V_{rms} = V_p/\\sqrt{2}", tool: "phasor" },
  { cat: "ac", name: "Potencia compleja", tex: "S = VI^*,\\ P = VI\\cos\\theta,\\ Q = VI\\sin\\theta", tool: "complex-power" },
  { cat: "ac", name: "Sistema trifásico", tex: "P = \\sqrt{3}V_L I_L\\cos\\theta", tool: "three-phase" },
  { cat: "ac", name: "Constante de tiempo", tex: "\\tau = RC,\\quad \\tau = L/R", tool: "rc-rl-transient" },
  { cat: "electronics", name: "Energía del condensador y de la bobina", tex: "W_C = \\tfrac12 CV^2,\\quad W_L = \\tfrac12 LI^2", tool: "capacitor-inductor-combination" },
  { cat: "electronics", name: "Capacidad del condensador de placas paralelas", tex: "C = \\varepsilon_0\\varepsilon_r A/d", tool: "capacitor-inductor-combination" },
  { cat: "electronics", name: "Amplificador operacional inversor", tex: "A = -R_f/R_{in}", tool: "op-amp" },
  { cat: "electronics", name: "Temporizador 555", tex: "f = 1.44/((R_1 + 2R_2)C)", tool: "timer-555" },
  { cat: "electronics", name: "Ecuación del diodo (Shockley)", tex: "I = I_S\\left(e^{V/(nV_T)} - 1\\right)", tool: "rectifier-ripple" },
  { cat: "signals", name: "Decibelio", tex: "dB = 20\\log_{10}(V_2/V_1) = 10\\log_{10}(P_2/P_1)", tool: "bode-plot" },
  { cat: "signals", name: "Criterio de Nyquist", tex: "f_s > 2 f_{max}", tool: "sampling-nyquist" },
  { cat: "signals", name: "SNR del convertidor ADC", tex: "SNR = 6.02N + 1.76\\ dB", tool: "adc" },
  { cat: "math", name: "Fórmula general de la ecuación cuadrática", tex: "x = (-b \\pm \\sqrt{b^2 - 4ac})/(2a)", tool: "quadratic" },
  { cat: "math", name: "Fórmula de Euler", tex: "e^{j\\theta} = \\cos\\theta + j\\sin\\theta", tool: "complex-numbers" },
  { cat: "math", name: "Identidad trigonométrica pitagórica", tex: "\\sin^2\\theta + \\cos^2\\theta = 1", tool: "trigonometry" }
];

const CATS = [["all", "Todas"], ["constants", "Constantes físicas"], ["dc", "Corriente continua"], ["ac", "Corriente alterna"], ["electronics", "Electrónica"], ["signals", "Señales"], ["math", "Matemáticas"]];

export const meta = {
  description: "Referencia rápida y buscable de constantes físicas (con valores exactos CODATA 2018) y de las leyes principales de electricidad, electrónica, señales y matemáticas, con un enlace a la herramienta de cada ley.",
  keywords: ["Leyes", "Constantes", "Constantes físicas", "Referencia", "constants", "formulas", "Velocidad de la luz", "Boltzmann", "cheat sheet"],
  formulas: [{ label: "Ejemplo: tensión térmica del diodo", tex: "V_T = \\frac{k_B T}{e} \\approx 25.7\\ mV\\ (25^\\circ C)" }],
  inputs: [
    { id: "cat", label: "Categoría", type: "select", default: "all", options: CATS },
    { id: "find", label: "Buscar (opcional)", type: "text", placeholder: "Por ejemplo: resonancia, Boltzmann, condensador" }
  ],
  example: { values: { cat: "all", find: "Boltzmann" }, expect: ["1.380649e-23"], note: "Ejemplo: busque la constante de Boltzmann." },
  invalid: { values: { cat: "all", find: "zzzzqqq" } },
  related: ["unit-converter", "engineering-notation", "ohms-law"]
};

export function solve(input) {
  const cat = choice(input, "cat", "Categoría", CATS.map((c) => c[0]), "all");
  const q = normalizeArabic(input.find ?? "");
  const consts = cat === "all" || cat === "constants" ? CONSTANTS.filter((c) => !q || matches(`${c.name} ${c.sym} ${c.unit}`, q)) : [];
  const forms = cat === "constants" ? [] : FORMULAS.filter((f) => (cat === "all" || f.cat === cat) && (!q || matches(`${f.name} ${f.tex} ${f.tool}`, q)));
  if (!consts.length && !forms.length) {
    fail("No hay resultados. Pruebe otra palabra o elija «Todas».", "find");
  }
  const blocks = [];
  if (consts.length) blocks.push({ type: "table", caption: "Constantes físicas (CODATA 2018)", head: ["Constante", "Símbolo", "Valor", "Unidad", "¿Exacta?"], rows: consts.map((c) => [c.name, { tex: c.sym }, { tex: c.value.replace(/e(-?\d+)$/, " \\times 10^{$1}") }, c.unit, c.exact ? "Sí (definición)" : "Medida"]) });
  if (forms.length) blocks.push({ type: "table", caption: "Leyes", head: ["Ley", "Fórmula", "Herramienta"], rows: forms.map((f) => [f.name, { tex: f.tex }, { text: f.tool }]) });
  const steps = [
    "Las constantes marcadas «definición» tienen valores exactos desde la redefinición de las unidades del SI en 2019; el resto son valores medidos según las últimas recomendaciones de CODATA.",
    "El nombre de la herramienta junto a cada ley es la herramienta de este sitio que la calcula en detalle."
  ];
  return {
    results: [{ label: "Número de constantes encontradas", value: consts.length }, { label: "Número de leyes encontradas", value: forms.length }],
    blocks, steps,
    copy: [...consts.map((c) => `${c.name}: ${c.value} ${c.unit}`), ...forms.map((f) => `${f.name}: ${f.tex}`)].join("\n")
  };
}
