import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt } from "../core/format.js";

export const COLORS = {
  black: { ar: "Hitam", digit: 0, mult: 1, tc: 250, hex: "#000000", fg: "#ffffff" },
  brown: { ar: "Cokelat", digit: 1, mult: 10, tol: 1, tc: 100, hex: "#7b3f00", fg: "#ffffff" },
  red: { ar: "Merah", digit: 2, mult: 100, tol: 2, tc: 50, hex: "#d32f2f", fg: "#ffffff" },
  orange: { ar: "Oranye", digit: 3, mult: 1e3, tc: 15, hex: "#f57c00", fg: "#000000" },
  yellow: { ar: "Kuning", digit: 4, mult: 1e4, tc: 25, hex: "#fdd835", fg: "#000000" },
  green: { ar: "Hijau", digit: 5, mult: 1e5, tol: 0.5, tc: 20, hex: "#388e3c", fg: "#ffffff" },
  blue: { ar: "Biru", digit: 6, mult: 1e6, tol: 0.25, tc: 10, hex: "#1976d2", fg: "#ffffff" },
  violet: { ar: "Ungu", digit: 7, mult: 1e7, tol: 0.1, tc: 5, hex: "#7b1fa2", fg: "#ffffff" },
  grey: { ar: "Abu-abu", digit: 8, mult: 1e8, tol: 0.05, tc: 1, hex: "#9e9e9e", fg: "#000000" },
  white: { ar: "Putih", digit: 9, mult: 1e9, hex: "#ffffff", fg: "#000000" },
  gold: { ar: "Emas", mult: 0.1, tol: 5, hex: "#c9a227", fg: "#000000" },
  silver: { ar: "Perak", mult: 0.01, tol: 10, hex: "#c0c0c0", fg: "#000000" },
  none: { ar: "Tanpa gelang", tol: 20, hex: "transparent", fg: "inherit" }
};

const OPT = Object.entries(COLORS).map(([k, c]) => [k, c.ar]);
const TOLS = Object.entries(COLORS).filter(([, c]) => c.tol !== undefined).map(([k, c]) => [String(c.tol), `${c.tol}% (${c.ar})`]);

export const meta = {
  description: "Baca nilai resistor dari warna gelang (4, 5, atau 6 gelang) atau ubah nilai apa pun menjadi warnanya, dengan toleransi, koefisien suhu, dan rentang nilai sebenarnya.",
  keywords: ["kode warna resistor", "kode warna", "resistor color code", "gelang resistor", "pembacaan resistor", "toleransi"],
  formulas: [
    { label: "4 gelang: dua digit, lalu pengali, lalu toleransi", tex: "R = (10 d_1 + d_2) \\times 10^{m}" },
    { label: "5 dan 6 gelang: tiga digit, lalu pengali (dan gelang keenam adalah koefisien suhu)", tex: "R = (100 d_1 + 10 d_2 + d_3) \\times 10^{m}" }
  ],
  inputs: [
    { id: "mode", label: "Arah", type: "select", default: "decode", options: [["decode", "Dari warna ke nilai"], ["encode", "Dari nilai ke warna"]] },
    { id: "bands", label: "Jumlah gelang", type: "select", default: "4", options: [["4", "4"], ["5", "5"], ["6", "6"]] },
    { id: "b1", label: "Gelang 1", type: "select", default: "yellow", options: OPT, when: { mode: ["decode"] } },
    { id: "b2", label: "Gelang 2", type: "select", default: "violet", options: OPT, when: { mode: ["decode"] } },
    { id: "b3", label: "Gelang 3", type: "select", default: "red", options: OPT, when: { mode: ["decode"] } },
    { id: "b4", label: "Gelang 4", type: "select", default: "gold", options: OPT, when: { mode: ["decode"] } },
    { id: "b5", label: "Gelang 5", type: "select", default: "brown", options: OPT, when: { mode: ["decode"], bands: ["5", "6"] } },
    { id: "b6", label: "Gelang 6", type: "select", default: "red", options: OPT, when: { mode: ["decode"], bands: ["6"] } },
    { id: "value", label: "Nilai resistor", unit: "Ω", type: "number", default: "4.7k", when: { mode: ["encode"] } },
    { id: "tol", label: "Toleransi", type: "select", default: "5", options: TOLS, when: { mode: ["encode"] } },
    { id: "tc", label: "Koefisien suhu (6 gelang)", unit: "ppm/K", type: "select", default: "50", options: Object.values(COLORS).filter((c) => c.tc).map((c) => [String(c.tc), `${c.tc} (${c.ar})`]), when: { mode: ["encode"], bands: ["6"] } }
  ],
  example: { values: { mode: "decode", bands: "4", b1: "yellow", b2: "violet", b3: "red", b4: "gold" }, expect: ["4.7 kΩ ±5%"], note: "Contoh: kuning, ungu, merah, emas = 47 × 100 = 4.7 kΩ ±5%." },
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
    if (!c || c.digit === undefined) fail(`Warna «${c ? c.ar : keys[i]}» tidak sesuai untuk gelang ${i + 1} (gelang angka).`, `b${i + 1}`);
    digits = digits * 10 + c.digit;
  }
  const m = COLORS[keys[nd]];
  if (!m || m.mult === undefined) fail(`Warna «${m ? m.ar : keys[nd]}» tidak sesuai untuk pengali.`, `b${nd + 1}`);
  const t = COLORS[keys[nd + 1]];
  if (!t || t.tol === undefined) fail(`Warna «${t ? t.ar : keys[nd + 1]}» tidak sesuai untuk gelang toleransi.`, `b${nd + 2}`);
  let tc = null;
  if (bands === 6) {
    const c = COLORS[keys[5]];
    if (!c || !c.tc) fail(`Warna «${c ? c.ar : keys[5]}» tidak sesuai untuk koefisien suhu.`, "b6");
    tc = c.tc;
  }
  return { value: Number((digits * m.mult).toPrecision(6)), digits, mult: m.mult, tol: t.tol, tc };
}

export function encode(value, bands, tol, tc) {
  const nd = bands === 4 ? 2 : 3;
  let e = Math.floor(Math.log10(value)) - (nd - 1);
  let digits = Math.round(value / Math.pow(10, e));
  if (digits >= Math.pow(10, nd)) { digits /= 10; e += 1; }
  if (e < -2 || e > 9) fail("Nilai di luar rentang yang dapat direpresentasikan dengan warna (dari 0.1 Ω hingga ratusan gigaohm).", "value");
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
  const mode = choice(input, "mode", "Arah", ["decode", "encode"], "decode");
  const bands = Number(choice(input, "bands", "Jumlah gelang", ["4", "5", "6"], "4"));
  const steps = [];
  if (mode === "decode") {
    const keys = Array.from({ length: bands }, (_, i) => choice(input, `b${i + 1}`, `Gelang ${i + 1}`, Object.keys(COLORS), "black"));
    const r = decode(bands, keys);
    const nd = bands === 4 ? 2 : 3;
    steps.push(`Gelang ${keys.slice(0, nd).map((k) => COLORS[k].ar).join(" dan")} membentuk angka ${keys.slice(0, nd).map((k) => COLORS[k].digit).join("")}.`);
    steps.push(`Gelang ${nd + 1} (${COLORS[keys[nd]].ar}) adalah pengali × ${fmt(r.mult)}, sehingga nilainya = ${r.digits} × ${fmt(r.mult)} = ${eng(r.value, "Ω", 6)}.`);
    steps.push(`Gelang ${nd + 2} (${COLORS[keys[nd + 1]].ar}) berarti toleransi ±${r.tol}%, sehingga nilai sebenarnya berada di antara ${eng(r.value * (1 - r.tol / 100), "Ω", 5)} dan ${eng(r.value * (1 + r.tol / 100), "Ω", 5)}.`);
    if (r.tc) steps.push(`Gelang keenam (${COLORS[keys[5]].ar}) berarti koefisien suhu ${r.tc} ppm/K, yaitu resistansi berubah ${fmt((r.value * r.tc) / 1e6, 4)} Ω per derajat.`);
    const text = `${eng(r.value, "Ω", 6)} ±${r.tol}%`;
    return {
      results: [{ label: "Nilai", value: text, text }, { label: "Nilai terkecil", value: eng(r.value * (1 - r.tol / 100), "Ω", 5) }, { label: "Nilai terbesar", value: eng(r.value * (1 + r.tol / 100), "Ω", 5) }, ...(r.tc ? [{ label: "Koefisien suhu", value: `${r.tc} ppm/K` }] : [])],
      blocks: [{ type: "table", caption: "Gelang", head: keys.map((_, i) => `${i + 1}`), rows: [keys.map(swatch)] }],
      steps, copy: text
    };
  }
  const value = num(input, "value", "Nilai", { positive: true });
  const tol = Number(input.tol ?? 5);
  if (!Object.values(COLORS).some((c) => c.tol === tol)) fail("Pilih toleransi yang benar.", "tol");
  const tc = bands === 6 ? Number(input.tc ?? 50) : null;
  if (bands === 6 && !Object.values(COLORS).some((c) => c.tc === tc)) fail("Pilih koefisien suhu yang benar.", "tc");
  const r = encode(value, bands, tol, tc);
  const nd = bands === 4 ? 2 : 3;
  steps.push(`Nilai ${eng(value, "Ω", 6)} ditulis dengan ${nd} angka penting dan pengali pangkat sepuluh: ${eng(r.exact, "Ω", 6)}.`);
  if (r.rounded) steps.push(`Nilai tidak dapat direpresentasikan secara tepat dengan ${nd} angka, sehingga kami bulatkan menjadi ${eng(r.exact, "Ω", 6)}.`);
  steps.push(`Warna berurutan: ${r.keys.map((k) => COLORS[k].ar).join("، ")}.`);
  const text = r.keys.map((k) => COLORS[k].ar).join(" - ");
  return {
    results: [{ label: "Warna", value: text, text }, { label: "Nilai yang direpresentasikan", value: eng(r.exact, "Ω", 6) }],
    blocks: [{ type: "table", caption: "Gelang", head: r.keys.map((_, i) => `${i + 1}`), rows: [r.keys.map(swatch)] }],
    steps, copy: text
  };
}
