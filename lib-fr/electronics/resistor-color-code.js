import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt } from "../core/format.js";

export const COLORS = {
  black: { ar: "Noir", digit: 0, mult: 1, tc: 250, hex: "#000000", fg: "#ffffff" },
  brown: { ar: "Marron", digit: 1, mult: 10, tol: 1, tc: 100, hex: "#7b3f00", fg: "#ffffff" },
  red: { ar: "Rouge", digit: 2, mult: 100, tol: 2, tc: 50, hex: "#d32f2f", fg: "#ffffff" },
  orange: { ar: "Orange", digit: 3, mult: 1e3, tc: 15, hex: "#f57c00", fg: "#000000" },
  yellow: { ar: "Jaune", digit: 4, mult: 1e4, tc: 25, hex: "#fdd835", fg: "#000000" },
  green: { ar: "Vert", digit: 5, mult: 1e5, tol: 0.5, tc: 20, hex: "#388e3c", fg: "#ffffff" },
  blue: { ar: "Bleu", digit: 6, mult: 1e6, tol: 0.25, tc: 10, hex: "#1976d2", fg: "#ffffff" },
  violet: { ar: "Violet", digit: 7, mult: 1e7, tol: 0.1, tc: 5, hex: "#7b1fa2", fg: "#ffffff" },
  grey: { ar: "Gris", digit: 8, mult: 1e8, tol: 0.05, tc: 1, hex: "#9e9e9e", fg: "#000000" },
  white: { ar: "Blanc", digit: 9, mult: 1e9, hex: "#ffffff", fg: "#000000" },
  gold: { ar: "Or", mult: 0.1, tol: 5, hex: "#c9a227", fg: "#000000" },
  silver: { ar: "Argent", mult: 0.01, tol: 10, hex: "#c0c0c0", fg: "#000000" },
  none: { ar: "Sans anneau", tol: 20, hex: "transparent", fg: "inherit" }
};

const OPT = Object.entries(COLORS).map(([k, c]) => [k, c.ar]);
const TOLS = Object.entries(COLORS).filter(([, c]) => c.tol !== undefined).map(([k, c]) => [String(c.tol), `${c.tol}% (${c.ar})`]);

export const meta = {
  description: "Lisez la valeur d'une résistance à partir des couleurs des anneaux (4, 5 ou 6 anneaux), ou convertissez une valeur en couleurs, avec la tolérance, le coefficient de température et la plage de la valeur réelle.",
  keywords: ["Couleurs des résistances", "Code couleur", "resistor color code", "Anneaux de la résistance", "Lecture de la résistance", "Tolérance"],
  formulas: [
    { label: "4 anneaux : deux chiffres, puis le multiplicateur, puis la tolérance", tex: "R = (10 d_1 + d_2) \\times 10^{m}" },
    { label: "5 et 6 anneaux : trois chiffres, puis le multiplicateur (et le sixième anneau est le coefficient de température)", tex: "R = (100 d_1 + 10 d_2 + d_3) \\times 10^{m}" }
  ],
  inputs: [
    { id: "mode", label: "Sens", type: "select", default: "decode", options: [["decode", "Des couleurs à la valeur"], ["encode", "De la valeur aux couleurs"]] },
    { id: "bands", label: "Nombre d'anneaux", type: "select", default: "4", options: [["4", "4"], ["5", "5"], ["6", "6"]] },
    { id: "b1", label: "Anneau 1", type: "select", default: "yellow", options: OPT, when: { mode: ["decode"] } },
    { id: "b2", label: "Anneau 2", type: "select", default: "violet", options: OPT, when: { mode: ["decode"] } },
    { id: "b3", label: "Anneau 3", type: "select", default: "red", options: OPT, when: { mode: ["decode"] } },
    { id: "b4", label: "Anneau 4", type: "select", default: "gold", options: OPT, when: { mode: ["decode"] } },
    { id: "b5", label: "Anneau 5", type: "select", default: "brown", options: OPT, when: { mode: ["decode"], bands: ["5", "6"] } },
    { id: "b6", label: "Anneau 6", type: "select", default: "red", options: OPT, when: { mode: ["decode"], bands: ["6"] } },
    { id: "value", label: "Valeur de la résistance", unit: "Ω", type: "number", default: "4.7k", when: { mode: ["encode"] } },
    { id: "tol", label: "Tolérance", type: "select", default: "5", options: TOLS, when: { mode: ["encode"] } },
    { id: "tc", label: "Coefficient de température (6 anneaux)", unit: "ppm/K", type: "select", default: "50", options: Object.values(COLORS).filter((c) => c.tc).map((c) => [String(c.tc), `${c.tc} (${c.ar})`]), when: { mode: ["encode"], bands: ["6"] } }
  ],
  example: { values: { mode: "decode", bands: "4", b1: "yellow", b2: "violet", b3: "red", b4: "gold" }, expect: ["4.7 kΩ ±5%"], note: "Exemple : jaune, violet, rouge, or = 47 × 100 = 4.7 kΩ ±5 %." },
  invalid: { values: { mode: "decode", bands: "4", b1: "gold", b2: "violet", b3: "red", b4: "gold" } },
  related: ["standard-resistor-values", "series-parallel-resistors", "led-resistor"]
};

function swatch(key) {
  const c = COLORS[key];
  return { text: c.ar, color: c.hex, fg: c.fg };
}

export function decode(bands, keys) {
  const nd = bands === 4 ? 2 : 3;
  let digits = 0;
  for (let i = 0; i < nd; i++) {
    const c = COLORS[keys[i]];
    if (!c || c.digit === undefined) fail(`La couleur «${c ? c.ar : keys[i]}» ne convient pas à l'anneau ${i + 1} (anneau numéro).`, `b${i + 1}`);
    digits = digits * 10 + c.digit;
  }
  const m = COLORS[keys[nd]];
  if (!m || m.mult === undefined) fail(`La couleur «${m ? m.ar : keys[nd]}» ne convient pas au multiplicateur.`, `b${nd + 1}`);
  const t = COLORS[keys[nd + 1]];
  if (!t || t.tol === undefined) fail(`La couleur «${t ? t.ar : keys[nd + 1]}» ne convient pas à l'anneau de tolérance.`, `b${nd + 2}`);
  let tc = null;
  if (bands === 6) {
    const c = COLORS[keys[5]];
    if (!c || !c.tc) fail(`La couleur «${c ? c.ar : keys[5]}» ne convient pas au coefficient de température.`, "b6");
    tc = c.tc;
  }
  return { value: Number((digits * m.mult).toPrecision(6)), digits, mult: m.mult, tol: t.tol, tc };
}

export function encode(value, bands, tol, tc) {
  const nd = bands === 4 ? 2 : 3;
  let e = Math.floor(Math.log10(value)) - (nd - 1);
  let digits = Math.round(value / Math.pow(10, e));
  if (digits >= Math.pow(10, nd)) { digits /= 10; e += 1; }
  if (e < -2 || e > 9) fail("La valeur est hors de la plage représentable par des couleurs (de 0.1 Ω à plusieurs centaines de gigaohms).", "value");
  const exact = Number((digits * Math.pow(10, e)).toPrecision(6));
  const ds = String(digits).padStart(nd, "0").split("").map(Number);
  const byDigit = (d) => Object.keys(COLORS).find((k) => COLORS[k].digit === d);
  const multKey = Object.keys(COLORS).find((k) => COLORS[k].mult !== undefined && Math.abs(Math.log10(COLORS[k].mult) - e) < 1e-9);
  const tolKey = Object.keys(COLORS).find((k) => COLORS[k].tol === tol);
  const keys = [...ds.map(byDigit), multKey, tolKey];
  if (bands === 6) keys.push(Object.keys(COLORS).find((k) => COLORS[k].tc === tc));
  return { keys, exact, rounded: Math.abs(exact - value) > 1e-9 * value };
}

export function solve(input) {
  const mode = choice(input, "mode", "Sens", ["decode", "encode"], "decode");
  const bands = Number(choice(input, "bands", "Nombre d'anneaux", ["4", "5", "6"], "4"));
  const steps = [];
  if (mode === "decode") {
    const keys = Array.from({ length: bands }, (_, i) => choice(input, `b${i + 1}`, `Anneau ${i + 1}`, Object.keys(COLORS), "black"));
    const r = decode(bands, keys);
    const nd = bands === 4 ? 2 : 3;
    steps.push(`Les anneaux ${keys.slice(0, nd).map((k) => COLORS[k].ar).join(" et")} correspondent aux chiffres ${keys.slice(0, nd).map((k) => COLORS[k].digit).join("")}.`);
    steps.push(`L'anneau ${nd + 1} (${COLORS[keys[nd]].ar}) est le multiplicateur × ${fmt(r.mult)}, donc la valeur = ${r.digits} × ${fmt(r.mult)} = ${eng(r.value, "Ω", 6)}.`);
    steps.push(`L'anneau ${nd + 2} (${COLORS[keys[nd + 1]].ar}) correspond à une tolérance de ±${r.tol} %, donc la valeur réelle est comprise entre ${eng(r.value * (1 - r.tol / 100), "Ω", 5)} et ${eng(r.value * (1 + r.tol / 100), "Ω", 5)}.`);
    if (r.tc) steps.push(`Le sixième anneau (${COLORS[keys[5]].ar}) correspond à un coefficient de température de ${r.tc} ppm/K, soit une variation de ${fmt((r.value * r.tc) / 1e6, 4)} Ω par degré.`);
    const text = `${eng(r.value, "Ω", 6)} ±${r.tol}%`;
    return {
      results: [{ label: "Valeur", value: text, text }, { label: "Valeur minimale", value: eng(r.value * (1 - r.tol / 100), "Ω", 5) }, { label: "Valeur maximale", value: eng(r.value * (1 + r.tol / 100), "Ω", 5) }, ...(r.tc ? [{ label: "Coefficient de température", value: `${r.tc} ppm/K` }] : [])],
      blocks: [{ type: "table", caption: "Anneaux", head: keys.map((_, i) => `${i + 1}`), rows: [keys.map(swatch)] }],
      steps, copy: text
    };
  }
  const value = num(input, "value", "Valeur", { positive: true });
  const tol = Number(input.tol ?? 5);
  if (!Object.values(COLORS).some((c) => c.tol === tol)) fail("Choisissez une tolérance valide.", "tol");
  const tc = bands === 6 ? Number(input.tc ?? 50) : null;
  if (bands === 6 && !Object.values(COLORS).some((c) => c.tc === tc)) fail("Choisissez un coefficient de température valide.", "tc");
  const r = encode(value, bands, tol, tc);
  const nd = bands === 4 ? 2 : 3;
  steps.push(`On écrit la valeur ${eng(value, "Ω", 6)} avec ${nd} chiffres significatifs et une puissance de dix : ${eng(r.exact, "Ω", 6)}.`);
  if (r.rounded) steps.push(`La valeur ne peut pas être représentée exactement avec ${nd} chiffres ; nous l'avons arrondie à ${eng(r.exact, "Ω", 6)}.`);
  steps.push(`Couleurs dans l'ordre : ${r.keys.map((k) => COLORS[k].ar).join("، ")}.`);
  const text = r.keys.map((k) => COLORS[k].ar).join(" - ");
  return {
    results: [{ label: "Couleurs", value: text, text }, { label: "Valeur représentée", value: eng(r.exact, "Ω", 6) }],
    blocks: [{ type: "table", caption: "Anneaux", head: r.keys.map((_, i) => `${i + 1}`), rows: [r.keys.map(swatch)] }],
    steps, copy: text
  };
}
