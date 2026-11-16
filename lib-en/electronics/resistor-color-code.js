import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt } from "../core/format.js";

export const COLORS = {
  black: { ar: "Black", digit: 0, mult: 1, tc: 250, hex: "#000000", fg: "#ffffff" },
  brown: { ar: "Brown", digit: 1, mult: 10, tol: 1, tc: 100, hex: "#7b3f00", fg: "#ffffff" },
  red: { ar: "Red", digit: 2, mult: 100, tol: 2, tc: 50, hex: "#d32f2f", fg: "#ffffff" },
  orange: { ar: "Orange", digit: 3, mult: 1e3, tc: 15, hex: "#f57c00", fg: "#000000" },
  yellow: { ar: "Yellow", digit: 4, mult: 1e4, tc: 25, hex: "#fdd835", fg: "#000000" },
  green: { ar: "Green", digit: 5, mult: 1e5, tol: 0.5, tc: 20, hex: "#388e3c", fg: "#ffffff" },
  blue: { ar: "Blue", digit: 6, mult: 1e6, tol: 0.25, tc: 10, hex: "#1976d2", fg: "#ffffff" },
  violet: { ar: "Violet", digit: 7, mult: 1e7, tol: 0.1, tc: 5, hex: "#7b1fa2", fg: "#ffffff" },
  grey: { ar: "Grey", digit: 8, mult: 1e8, tol: 0.05, tc: 1, hex: "#9e9e9e", fg: "#000000" },
  white: { ar: "White", digit: 9, mult: 1e9, hex: "#ffffff", fg: "#000000" },
  gold: { ar: "Gold", mult: 0.1, tol: 5, hex: "#c9a227", fg: "#000000" },
  silver: { ar: "Silver", mult: 0.01, tol: 10, hex: "#c0c0c0", fg: "#000000" },
  none: { ar: "No band", tol: 20, hex: "transparent", fg: "inherit" }
};

const OPT = Object.entries(COLORS).map(([k, c]) => [k, c.ar]);
const TOLS = Object.entries(COLORS).filter(([, c]) => c.tol !== undefined).map(([k, c]) => [String(c.tol), `${c.tol}% (${c.ar})`]);

export const meta = {
  description: "Read the resistance value from the color bands (4, 5 or 6 bands), or convert any value to its color bands, including the tolerance, temperature coefficient and the range of the actual value.",
  keywords: ["Resistor colors", "Color code", "resistor color code", "Resistor bands", "Reading a resistor", "Tolerance"],
  formulas: [
    { label: "4 bands: two digits, then the multiplier, then the tolerance", tex: "R = (10 d_1 + d_2) \\times 10^{m}" },
    { label: "5 and 6 bands: three digits, then the multiplier (the sixth band is the temperature coefficient)", tex: "R = (100 d_1 + 10 d_2 + d_3) \\times 10^{m}" }
  ],
  inputs: [
    { id: "mode", label: "Direction", type: "select", default: "decode", options: [["decode", "From colors to value"], ["encode", "From value to colors"]] },
    { id: "bands", label: "Number of bands", type: "select", default: "4", options: [["4", "4"], ["5", "5"], ["6", "6"]] },
    { id: "b1", label: "Band 1", type: "select", default: "yellow", options: OPT, when: { mode: ["decode"] } },
    { id: "b2", label: "Band 2", type: "select", default: "violet", options: OPT, when: { mode: ["decode"] } },
    { id: "b3", label: "Band 3", type: "select", default: "red", options: OPT, when: { mode: ["decode"] } },
    { id: "b4", label: "Band 4", type: "select", default: "gold", options: OPT, when: { mode: ["decode"] } },
    { id: "b5", label: "Band 5", type: "select", default: "brown", options: OPT, when: { mode: ["decode"], bands: ["5", "6"] } },
    { id: "b6", label: "Band 6", type: "select", default: "red", options: OPT, when: { mode: ["decode"], bands: ["6"] } },
    { id: "value", label: "Resistance value", unit: "Ω", type: "number", default: "4.7k", when: { mode: ["encode"] } },
    { id: "tol", label: "Tolerance", type: "select", default: "5", options: TOLS, when: { mode: ["encode"] } },
    { id: "tc", label: "Temperature coefficient (6 bands)", unit: "ppm/K", type: "select", default: "50", options: Object.values(COLORS).filter((c) => c.tc).map((c) => [String(c.tc), `${c.tc} (${c.ar})`]), when: { mode: ["encode"], bands: ["6"] } }
  ],
  example: { values: { mode: "decode", bands: "4", b1: "yellow", b2: "violet", b3: "red", b4: "gold" }, expect: ["4.7 kΩ ±5%"], note: "Example: yellow, violet, red, gold = 47 × 100 = 4.7 kΩ ±5%." },
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
    if (!c || c.digit === undefined) fail(`Color “${c ? c.ar : keys[i]}” is not valid for band ${i + 1} (a digit band).`, `b${i + 1}`);
    digits = digits * 10 + c.digit;
  }
  const m = COLORS[keys[nd]];
  if (!m || m.mult === undefined) fail(`Color “${m ? m.ar : keys[nd]}” is not valid for the multiplier.`, `b${nd + 1}`);
  const t = COLORS[keys[nd + 1]];
  if (!t || t.tol === undefined) fail(`Color “${t ? t.ar : keys[nd + 1]}” is not valid for the tolerance band.`, `b${nd + 2}`);
  let tc = null;
  if (bands === 6) {
    const c = COLORS[keys[5]];
    if (!c || !c.tc) fail(`Color “${c ? c.ar : keys[5]}” is not valid for the temperature coefficient.`, "b6");
    tc = c.tc;
  }
  return { value: Number((digits * m.mult).toPrecision(6)), digits, mult: m.mult, tol: t.tol, tc };
}

export function encode(value, bands, tol, tc) {
  const nd = bands === 4 ? 2 : 3;
  let e = Math.floor(Math.log10(value)) - (nd - 1);
  let digits = Math.round(value / Math.pow(10, e));
  if (digits >= Math.pow(10, nd)) { digits /= 10; e += 1; }
  if (e < -2 || e > 9) fail("The value is outside the range that can be represented by colors (from 0.1 Ω to hundreds of gigaohms).", "value");
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
  const mode = choice(input, "mode", "Direction", ["decode", "encode"], "decode");
  const bands = Number(choice(input, "bands", "Number of bands", ["4", "5", "6"], "4"));
  const steps = [];
  if (mode === "decode") {
    const keys = Array.from({ length: bands }, (_, i) => choice(input, `b${i + 1}`, `Band ${i + 1}`, Object.keys(COLORS), "black"));
    const r = decode(bands, keys);
    const nd = bands === 4 ? 2 : 3;
    steps.push(`Bands ${keys.slice(0, nd).map((k) => COLORS[k].ar).join(" and")} are the digits ${keys.slice(0, nd).map((k) => COLORS[k].digit).join("")}.`);
    steps.push(`Band ${nd + 1} (${COLORS[keys[nd]].ar}) is the multiplier × ${fmt(r.mult)}, so the value = ${r.digits} × ${fmt(r.mult)} = ${eng(r.value, "Ω", 6)}.`);
    steps.push(`Band ${nd + 2} (${COLORS[keys[nd + 1]].ar}) means a tolerance of ±${r.tol}%, so the actual value is between ${eng(r.value * (1 - r.tol / 100), "Ω", 5)} and ${eng(r.value * (1 + r.tol / 100), "Ω", 5)}.`);
    if (r.tc) steps.push(`Band 6 (${COLORS[keys[5]].ar}) means a temperature coefficient of ${r.tc} ppm/K, i.e. the resistance changes by ${fmt((r.value * r.tc) / 1e6, 4)} Ω per degree.`);
    const text = `${eng(r.value, "Ω", 6)} ±${r.tol}%`;
    return {
      results: [{ label: "Value", value: text, text }, { label: "Minimum value", value: eng(r.value * (1 - r.tol / 100), "Ω", 5) }, { label: "Maximum value", value: eng(r.value * (1 + r.tol / 100), "Ω", 5) }, ...(r.tc ? [{ label: "Temperature coefficient", value: `${r.tc} ppm/K` }] : [])],
      blocks: [{ type: "table", caption: "Bands", head: keys.map((_, i) => `${i + 1}`), rows: [keys.map(swatch)] }],
      steps, copy: text
    };
  }
  const value = num(input, "value", "Value", { positive: true });
  const tol = Number(input.tol ?? 5);
  if (!Object.values(COLORS).some((c) => c.tol === tol)) fail("Choose a valid tolerance.", "tol");
  const tc = bands === 6 ? Number(input.tc ?? 50) : null;
  if (bands === 6 && !Object.values(COLORS).some((c) => c.tc === tc)) fail("Choose a valid temperature coefficient.", "tc");
  const r = encode(value, bands, tol, tc);
  const nd = bands === 4 ? 2 : 3;
  steps.push(`We write the value ${eng(value, "Ω", 6)} with ${nd} significant figures and a power-of-ten multiplier: ${eng(r.exact, "Ω", 6)}.`);
  if (r.rounded) steps.push(`The value cannot be represented exactly with ${nd} digits, so we rounded it to ${eng(r.exact, "Ω", 6)}.`);
  steps.push(`Colors in order: ${r.keys.map((k) => COLORS[k].ar).join("، ")}.`);
  const text = r.keys.map((k) => COLORS[k].ar).join(" - ");
  return {
    results: [{ label: "Colors", value: text, text }, { label: "Represented value", value: eng(r.exact, "Ω", 6) }],
    blocks: [{ type: "table", caption: "Bands", head: r.keys.map((_, i) => `${i + 1}`), rows: [r.keys.map(swatch)] }],
    steps, copy: text
  };
}
