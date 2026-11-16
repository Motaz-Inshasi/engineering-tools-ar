import { choice, fail } from "../core/validate.js";
import { normalizeArabic, matches } from "../core/text.js";

export const CONSTANTS = [
  { name: "Vitesse de la lumière dans le vide", sym: "c", value: "299792458", unit: "m/s", exact: true },
  { name: "Constante de Planck", sym: "h", value: "6.62607015e-34", unit: "J·s", exact: true },
  { name: "Charge élémentaire (charge de l'électron)", sym: "e", value: "1.602176634e-19", unit: "C", exact: true },
  { name: "Constante de Boltzmann", sym: "k_B", value: "1.380649e-23", unit: "J/K", exact: true },
  { name: "Nombre d'Avogadro", sym: "N_A", value: "6.02214076e23", unit: "1/mol", exact: true },
  { name: "Constante des gaz parfaits", sym: "R", value: "8.314462618", unit: "J/(mol·K)", exact: true },
  { name: "Permittivité du vide", sym: "\\varepsilon_0", value: "8.8541878128e-12", unit: "F/m", exact: false },
  { name: "Perméabilité du vide", sym: "\\mu_0", value: "1.25663706212e-6", unit: "H/m", exact: false },
  { name: "Masse de l'électron", sym: "m_e", value: "9.1093837015e-31", unit: "kg", exact: false },
  { name: "Constante gravitationnelle universelle", sym: "G", value: "6.67430e-11", unit: "N·m²/kg²", exact: false },
  { name: "Accélération normale de la pesanteur", sym: "g_n", value: "9.80665", unit: "m/s²", exact: true },
  { name: "Constante de Stefan-Boltzmann", sym: "\\sigma", value: "5.670374419e-8", unit: "W/(m²·K⁴)", exact: true },
  { name: "Impédance du vide", sym: "Z_0", value: "376.730313668", unit: "Ω", exact: false },
  { name: "Tension thermique à 25 °C", sym: "V_T = kT/q", value: "0.025693", unit: "V", exact: false },
  { name: "Résistivité du cuivre à 20 °C", sym: "\\rho_{Cu}", value: "1.68e-8", unit: "Ω·m", exact: false }
];

export const FORMULAS = [
  { cat: "dc", name: "Loi d'Ohm et puissance", tex: "V = IR,\\quad P = VI = I^2R = V^2/R", tool: "ohms-law" },
  { cat: "dc", name: "Résistances en série et en parallèle", tex: "R_s = \\sum R_i,\\quad 1/R_p = \\sum 1/R_i", tool: "series-parallel-resistors" },
  { cat: "dc", name: "Diviseur de tension", tex: "V_{out} = V_{in}\\,R_2/(R_1 + R_2)", tool: "voltage-current-divider" },
  { cat: "dc", name: "Résistance d'un fil", tex: "R = \\rho\\,L/A", tool: "ohms-law" },
  { cat: "ac", name: "Réactance", tex: "X_L = 2\\pi f L,\\quad X_C = 1/(2\\pi f C)", tool: "impedance" },
  { cat: "ac", name: "Fréquence de résonance", tex: "f_0 = 1/(2\\pi\\sqrt{LC})", tool: "resonance" },
  { cat: "ac", name: "Valeur efficace d'une sinusoïde", tex: "V_{rms} = V_p/\\sqrt{2}", tool: "phasor" },
  { cat: "ac", name: "Puissance complexe", tex: "S = VI^*,\\ P = VI\\cos\\theta,\\ Q = VI\\sin\\theta", tool: "complex-power" },
  { cat: "ac", name: "Triphasé", tex: "P = \\sqrt{3}V_L I_L\\cos\\theta", tool: "three-phase" },
  { cat: "ac", name: "Constante de temps", tex: "\\tau = RC,\\quad \\tau = L/R", tool: "rc-rl-transient" },
  { cat: "electronics", name: "Énergie du condensateur et de la bobine", tex: "W_C = \\tfrac12 CV^2,\\quad W_L = \\tfrac12 LI^2", tool: "capacitor-inductor-combination" },
  { cat: "electronics", name: "Capacité du condensateur plan", tex: "C = \\varepsilon_0\\varepsilon_r A/d", tool: "capacitor-inductor-combination" },
  { cat: "electronics", name: "Amplificateur opérationnel inverseur", tex: "A = -R_f/R_{in}", tool: "op-amp" },
  { cat: "electronics", name: "Timer 555", tex: "f = 1.44/((R_1 + 2R_2)C)", tool: "timer-555" },
  { cat: "electronics", name: "Équation de la diode (Shockley)", tex: "I = I_S\\left(e^{V/(nV_T)} - 1\\right)", tool: "rectifier-ripple" },
  { cat: "signals", name: "Décibel", tex: "dB = 20\\log_{10}(V_2/V_1) = 10\\log_{10}(P_2/P_1)", tool: "bode-plot" },
  { cat: "signals", name: "Critère de Nyquist", tex: "f_s > 2 f_{max}", tool: "sampling-nyquist" },
  { cat: "signals", name: "SNR du convertisseur ADC", tex: "SNR = 6.02N + 1.76\\ dB", tool: "adc" },
  { cat: "math", name: "Formule générale du second degré", tex: "x = (-b \\pm \\sqrt{b^2 - 4ac})/(2a)", tool: "quadratic" },
  { cat: "math", name: "Formule d'Euler", tex: "e^{j\\theta} = \\cos\\theta + j\\sin\\theta", tool: "complex-numbers" },
  { cat: "math", name: "Identité trigonométrique de Pythagore", tex: "\\sin^2\\theta + \\cos^2\\theta = 1", tool: "trigonometry" }
];

const CATS = [["all", "Tout"], ["constants", "Constantes physiques"], ["dc", "Courant continu"], ["ac", "Courant alternatif"], ["electronics", "Électronique"], ["signals", "Signaux"], ["math", "Mathématiques"]];

export const meta = {
  description: "Référence rapide et consultable des constantes physiques (valeurs exactes CODATA 2018) et des principales lois de l'électricité, de l'électronique, des signaux et des mathématiques, avec un lien vers l'outil adapté à chaque loi.",
  keywords: ["lois", "constantes", "constantes physiques", "référence", "constants", "formulas", "vitesse de la lumière", "Boltzmann", "cheat sheet"],
  formulas: [{ label: "Exemple : tension thermique de la diode", tex: "V_T = \\frac{k_B T}{e} \\approx 25.7\\ mV\\ (25^\\circ C)" }],
  inputs: [
    { id: "cat", label: "Catégorie", type: "select", default: "all", options: CATS },
    { id: "find", label: "Recherche (facultatif)", type: "text", placeholder: "Par exemple : résonance, Boltzmann, condensateur" }
  ],
  example: { values: { cat: "all", find: "Boltzmann" }, expect: ["1.380649e-23"], note: "Exemple : rechercher la constante de Boltzmann." },
  invalid: { values: { cat: "all", find: "zzzzqqq" } },
  related: ["unit-converter", "engineering-notation", "ohms-law"]
};

export function solve(input) {
  const cat = choice(input, "cat", "Catégorie", CATS.map((c) => c[0]), "all");
  const q = normalizeArabic(input.find ?? "");
  const consts = cat === "all" || cat === "constants" ? CONSTANTS.filter((c) => !q || matches(`${c.name} ${c.sym} ${c.unit}`, q)) : [];
  const forms = cat === "constants" ? [] : FORMULAS.filter((f) => (cat === "all" || f.cat === cat) && (!q || matches(`${f.name} ${f.tex} ${f.tool}`, q)));
  if (!consts.length && !forms.length) {
    fail("Aucun résultat correspondant. Essayez un autre mot ou choisissez « Tout ».", "find");
  }
  const blocks = [];
  if (consts.length) blocks.push({ type: "table", caption: "Constantes physiques (CODATA 2018)", head: ["Constante", "Symbole", "Valeur", "Unité", "Exacte ?"], rows: consts.map((c) => [c.name, { tex: c.sym }, { tex: c.value.replace(/e(-?\d+)$/, " \\times 10^{$1}") }, c.unit, c.exact ? "Oui (définition)" : "Mesurée"]) });
  if (forms.length) blocks.push({ type: "table", caption: "Lois", head: ["Loi", "Formule", "Outil"], rows: forms.map((f) => [f.name, { tex: f.tex }, { text: f.tool }]) });
  const steps = [
    "Les constantes marquées « définition » ont des valeurs exactes depuis la redéfinition des unités SI en 2019 ; les autres sont des valeurs mesurées selon les dernières recommandations du CODATA.",
    "Le nom de l'outil à côté de chaque loi désigne l'outil de ce site qui la calcule en détail."
  ];
  return {
    results: [{ label: "Nombre de constantes correspondantes", value: consts.length }, { label: "Nombre de lois correspondantes", value: forms.length }],
    blocks, steps,
    copy: [...consts.map((c) => `${c.name}: ${c.value} ${c.unit}`), ...forms.map((f) => `${f.name}: ${f.tex}`)].join("\n")
  };
}
