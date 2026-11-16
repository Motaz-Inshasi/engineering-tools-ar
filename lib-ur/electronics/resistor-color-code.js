import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt } from "../core/format.js";

export const COLORS = {
  black: { ar: "سیاہ", digit: 0, mult: 1, tc: 250, hex: "#000000", fg: "#ffffff" },
  brown: { ar: "بھورا", digit: 1, mult: 10, tol: 1, tc: 100, hex: "#7b3f00", fg: "#ffffff" },
  red: { ar: "سرخ", digit: 2, mult: 100, tol: 2, tc: 50, hex: "#d32f2f", fg: "#ffffff" },
  orange: { ar: "نارنجی", digit: 3, mult: 1e3, tc: 15, hex: "#f57c00", fg: "#000000" },
  yellow: { ar: "پیلا", digit: 4, mult: 1e4, tc: 25, hex: "#fdd835", fg: "#000000" },
  green: { ar: "سبز", digit: 5, mult: 1e5, tol: 0.5, tc: 20, hex: "#388e3c", fg: "#ffffff" },
  blue: { ar: "نیلا", digit: 6, mult: 1e6, tol: 0.25, tc: 10, hex: "#1976d2", fg: "#ffffff" },
  violet: { ar: "جامنی", digit: 7, mult: 1e7, tol: 0.1, tc: 5, hex: "#7b1fa2", fg: "#ffffff" },
  grey: { ar: "سرمئی", digit: 8, mult: 1e8, tol: 0.05, tc: 1, hex: "#9e9e9e", fg: "#000000" },
  white: { ar: "سفید", digit: 9, mult: 1e9, hex: "#ffffff", fg: "#000000" },
  gold: { ar: "سنہری", mult: 0.1, tol: 5, hex: "#c9a227", fg: "#000000" },
  silver: { ar: "چاندی", mult: 0.01, tol: 10, hex: "#c0c0c0", fg: "#000000" },
  none: { ar: "کوئی پٹی نہیں", tol: 20, hex: "transparent", fg: "inherit" }
};

const OPT = Object.entries(COLORS).map(([k, c]) => [k, c.ar]);
const TOLS = Object.entries(COLORS).filter(([, c]) => c.tol !== undefined).map(([k, c]) => [String(c.tol), `${c.tol}% (${c.ar})`]);

export const meta = {
  description: "پٹیوں کے رنگوں (4 یا 5 یا 6 پٹیوں) سے مزاحمت کی قدر پڑھیں، یا کوئی قدر اس کے رنگوں میں تبدیل کریں، ساتھ رواداری، درجہ حرارتی عامل اور اصل قدر کی حد۔",
  keywords: ["مزاحم کے رنگ", "رنگوں کا کوڈ", "resistor color code", "مزاحم کی پٹیاں", "مزاحم پڑھنا", "رواداری"],
  formulas: [
    { label: "4 پٹیاں: دو ہندسے، پھر ضرب کنندہ، پھر رواداری", tex: "R = (10 d_1 + d_2) \\times 10^{m}" },
    { label: "5 اور 6 پٹیاں: تین ہندسے، پھر ضرب کنندہ (چھٹی پٹی درجہ حرارتی عامل ہے)", tex: "R = (100 d_1 + 10 d_2 + d_3) \\times 10^{m}" }
  ],
  inputs: [
    { id: "mode", label: "سمت", type: "select", default: "decode", options: [["decode", "رنگوں سے قدر"], ["encode", "قدر سے رنگ"]] },
    { id: "bands", label: "پٹیوں کی تعداد", type: "select", default: "4", options: [["4", "4"], ["5", "5"], ["6", "6"]] },
    { id: "b1", label: "پٹی 1", type: "select", default: "yellow", options: OPT, when: { mode: ["decode"] } },
    { id: "b2", label: "پٹی 2", type: "select", default: "violet", options: OPT, when: { mode: ["decode"] } },
    { id: "b3", label: "پٹی 3", type: "select", default: "red", options: OPT, when: { mode: ["decode"] } },
    { id: "b4", label: "پٹی 4", type: "select", default: "gold", options: OPT, when: { mode: ["decode"] } },
    { id: "b5", label: "پٹی 5", type: "select", default: "brown", options: OPT, when: { mode: ["decode"], bands: ["5", "6"] } },
    { id: "b6", label: "پٹی 6", type: "select", default: "red", options: OPT, when: { mode: ["decode"], bands: ["6"] } },
    { id: "value", label: "مزاحمت کی قدر", unit: "Ω", type: "number", default: "4.7k", when: { mode: ["encode"] } },
    { id: "tol", label: "رواداری", type: "select", default: "5", options: TOLS, when: { mode: ["encode"] } },
    { id: "tc", label: "درجہ حرارتی عامل (6 پٹیاں)", unit: "ppm/K", type: "select", default: "50", options: Object.values(COLORS).filter((c) => c.tc).map((c) => [String(c.tc), `${c.tc} (${c.ar})`]), when: { mode: ["encode"], bands: ["6"] } }
  ],
  example: { values: { mode: "decode", bands: "4", b1: "yellow", b2: "violet", b3: "red", b4: "gold" }, expect: ["4.7 kΩ ±5%"], note: "مثال: پیلا، جامنی، سرخ، سنہری = 47 × 100 = 4.7 kΩ ±5%۔" },
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
    if (!c || c.digit === undefined) fail(`رنگ “${c ? c.ar : keys[i]}” پٹی ${i + 1} کے لیے درست نہیں ہے (ہندسے کی پٹی)۔`, `b${i + 1}`);
    digits = digits * 10 + c.digit;
  }
  const m = COLORS[keys[nd]];
  if (!m || m.mult === undefined) fail(`رنگ “${m ? m.ar : keys[nd]}” ضرب کنندہ کے لیے درست نہیں ہے۔`, `b${nd + 1}`);
  const t = COLORS[keys[nd + 1]];
  if (!t || t.tol === undefined) fail(`رنگ “${t ? t.ar : keys[nd + 1]}” رواداری کی پٹی کے لیے درست نہیں ہے۔`, `b${nd + 2}`);
  let tc = null;
  if (bands === 6) {
    const c = COLORS[keys[5]];
    if (!c || !c.tc) fail(`رنگ “${c ? c.ar : keys[5]}” درجہ حرارتی عامل کے لیے درست نہیں ہے۔`, "b6");
    tc = c.tc;
  }
  return { value: Number((digits * m.mult).toPrecision(6)), digits, mult: m.mult, tol: t.tol, tc };
}

export function encode(value, bands, tol, tc) {
  const nd = bands === 4 ? 2 : 3;
  let e = Math.floor(Math.log10(value)) - (nd - 1);
  let digits = Math.round(value / Math.pow(10, e));
  if (digits >= Math.pow(10, nd)) { digits /= 10; e += 1; }
  if (e < -2 || e > 9) fail("قدر ان رنگوں سے ظاہر کی جانے والی حد سے باہر ہے (0.1 Ω سے لے کر سینکڑوں گیگا اوہم تک)۔", "value");
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
  const mode = choice(input, "mode", "سمت", ["decode", "encode"], "decode");
  const bands = Number(choice(input, "bands", "پٹیوں کی تعداد", ["4", "5", "6"], "4"));
  const steps = [];
  if (mode === "decode") {
    const keys = Array.from({ length: bands }, (_, i) => choice(input, `b${i + 1}`, `پٹی ${i + 1}`, Object.keys(COLORS), "black"));
    const r = decode(bands, keys);
    const nd = bands === 4 ? 2 : 3;
    steps.push(`پٹیاں ${keys.slice(0, nd).map((k) => COLORS[k].ar).join(" اور")} ہندسے ${keys.slice(0, nd).map((k) => COLORS[k].digit).join("")} ہیں۔`);
    steps.push(`پٹی ${nd + 1} (${COLORS[keys[nd]].ar}) ضرب کنندہ × ${fmt(r.mult)} ہے، لہٰذا قدر = ${r.digits} × ${fmt(r.mult)} = ${eng(r.value, "Ω", 6)}۔`);
    steps.push(`پٹی ${nd + 2} (${COLORS[keys[nd + 1]].ar}) کا مطلب ±${r.tol}% رواداری ہے، لہٰذا اصل قدر ${eng(r.value * (1 - r.tol / 100), "Ω", 5)} اور ${eng(r.value * (1 + r.tol / 100), "Ω", 5)} کے درمیان ہے۔`);
    if (r.tc) steps.push(`چھٹی پٹی (${COLORS[keys[5]].ar}) کا مطلب درجہ حرارتی عامل ${r.tc} ppm/K ہے، یعنی فی ڈگری مزاحمت ${fmt((r.value * r.tc) / 1e6, 4)} Ω بدلتی ہے۔`);
    const text = `${eng(r.value, "Ω", 6)} ±${r.tol}%`;
    return {
      results: [{ label: "قدر", value: text, text }, { label: "کم از کم قدر", value: eng(r.value * (1 - r.tol / 100), "Ω", 5) }, { label: "زیادہ سے زیادہ قدر", value: eng(r.value * (1 + r.tol / 100), "Ω", 5) }, ...(r.tc ? [{ label: "درجہ حرارتی عامل", value: `${r.tc} ppm/K` }] : [])],
      blocks: [{ type: "table", caption: "پٹیاں", head: keys.map((_, i) => `${i + 1}`), rows: [keys.map(swatch)] }],
      steps, copy: text
    };
  }
  const value = num(input, "value", "قدر", { positive: true });
  const tol = Number(input.tol ?? 5);
  if (!Object.values(COLORS).some((c) => c.tol === tol)) fail("درست رواداری منتخب کریں۔", "tol");
  const tc = bands === 6 ? Number(input.tc ?? 50) : null;
  if (bands === 6 && !Object.values(COLORS).some((c) => c.tc === tc)) fail("درست درجہ حرارتی عامل منتخب کریں۔", "tc");
  const r = encode(value, bands, tol, tc);
  const nd = bands === 4 ? 2 : 3;
  steps.push(`ہم قدر ${eng(value, "Ω", 6)} کو ${nd} بامعنی ہندسوں اور دس کی طاقت کے ضرب کنندہ کے ساتھ لکھتے ہیں: ${eng(r.exact, "Ω", 6)}۔`);
  if (r.rounded) steps.push(`قدر ${nd} ہندسوں کے ساتھ بالکل ظاہر نہیں ہو سکتی، اس لیے ہم نے اسے ${eng(r.exact, "Ω", 6)} تک گول کیا۔`);
  steps.push(`ترتیب کے مطابق رنگ: ${r.keys.map((k) => COLORS[k].ar).join("، ")}۔`);
  const text = r.keys.map((k) => COLORS[k].ar).join(" - ");
  return {
    results: [{ label: "رنگ", value: text, text }, { label: "ظاہر کردہ قدر", value: eng(r.exact, "Ω", 6) }],
    blocks: [{ type: "table", caption: "پٹیاں", head: r.keys.map((_, i) => `${i + 1}`), rows: [r.keys.map(swatch)] }],
    steps, copy: text
  };
}
