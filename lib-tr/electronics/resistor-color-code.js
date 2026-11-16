import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt } from "../core/format.js";

export const COLORS = {
  black: { ar: "siyah", digit: 0, mult: 1, tc: 250, hex: "#000000", fg: "#ffffff" },
  brown: { ar: "kahverengi", digit: 1, mult: 10, tol: 1, tc: 100, hex: "#7b3f00", fg: "#ffffff" },
  red: { ar: "kırmızı", digit: 2, mult: 100, tol: 2, tc: 50, hex: "#d32f2f", fg: "#ffffff" },
  orange: { ar: "turuncu", digit: 3, mult: 1e3, tc: 15, hex: "#f57c00", fg: "#000000" },
  yellow: { ar: "sarı", digit: 4, mult: 1e4, tc: 25, hex: "#fdd835", fg: "#000000" },
  green: { ar: "yeşil", digit: 5, mult: 1e5, tol: 0.5, tc: 20, hex: "#388e3c", fg: "#ffffff" },
  blue: { ar: "mavi", digit: 6, mult: 1e6, tol: 0.25, tc: 10, hex: "#1976d2", fg: "#ffffff" },
  violet: { ar: "mor", digit: 7, mult: 1e7, tol: 0.1, tc: 5, hex: "#7b1fa2", fg: "#ffffff" },
  grey: { ar: "gri", digit: 8, mult: 1e8, tol: 0.05, tc: 1, hex: "#9e9e9e", fg: "#000000" },
  white: { ar: "beyaz", digit: 9, mult: 1e9, hex: "#ffffff", fg: "#000000" },
  gold: { ar: "altın", mult: 0.1, tol: 5, hex: "#c9a227", fg: "#000000" },
  silver: { ar: "gümüş", mult: 0.01, tol: 10, hex: "#c0c0c0", fg: "#000000" },
  none: { ar: "şeritsiz", tol: 20, hex: "transparent", fg: "inherit" }
};

const OPT = Object.entries(COLORS).map(([k, c]) => [k, c.ar]);
const TOLS = Object.entries(COLORS).filter(([, c]) => c.tol !== undefined).map(([k, c]) => [String(c.tol), `${c.tol}% (${c.ar})`]);

export const meta = {
  description: "Direnç değerini şerit renklerinden (4, 5 veya 6 şerit) okuyun ya da herhangi bir değeri renklerine çevirin; toleransı, sıcaklık katsayısını ve gerçek değer aralığını gösterin.",
  keywords: ["Direnç renkleri", "Renk kodu", "resistor color code", "Direnç şeritleri", "Direnç okuma", "Tolerans"],
  formulas: [
    { label: "4 şerit: iki rakam, ardından çarpan, sonra tolerans", tex: "R = (10 d_1 + d_2) \\times 10^{m}" },
    { label: "5 ve 6 şerit: üç rakam, ardından çarpan (altıncı şerit sıcaklık katsayısıdır)", tex: "R = (100 d_1 + 10 d_2 + d_3) \\times 10^{m}" }
  ],
  inputs: [
    { id: "mode", label: "Yön", type: "select", default: "decode", options: [["decode", "Renklerden değere"], ["encode", "Değerden renklere"]] },
    { id: "bands", label: "Şerit sayısı", type: "select", default: "4", options: [["4", "4"], ["5", "5"], ["6", "6"]] },
    { id: "b1", label: "1. şerit", type: "select", default: "yellow", options: OPT, when: { mode: ["decode"] } },
    { id: "b2", label: "2. şerit", type: "select", default: "violet", options: OPT, when: { mode: ["decode"] } },
    { id: "b3", label: "3. şerit", type: "select", default: "red", options: OPT, when: { mode: ["decode"] } },
    { id: "b4", label: "4. şerit", type: "select", default: "gold", options: OPT, when: { mode: ["decode"] } },
    { id: "b5", label: "5. şerit", type: "select", default: "brown", options: OPT, when: { mode: ["decode"], bands: ["5", "6"] } },
    { id: "b6", label: "6. şerit", type: "select", default: "red", options: OPT, when: { mode: ["decode"], bands: ["6"] } },
    { id: "value", label: "Direnç değeri", unit: "Ω", type: "number", default: "4.7k", when: { mode: ["encode"] } },
    { id: "tol", label: "Tolerans", type: "select", default: "5", options: TOLS, when: { mode: ["encode"] } },
    { id: "tc", label: "Sıcaklık katsayısı (6 şerit)", unit: "ppm/K", type: "select", default: "50", options: Object.values(COLORS).filter((c) => c.tc).map((c) => [String(c.tc), `${c.tc} (${c.ar})`]), when: { mode: ["encode"], bands: ["6"] } }
  ],
  example: { values: { mode: "decode", bands: "4", b1: "yellow", b2: "violet", b3: "red", b4: "gold" }, expect: ["4.7 kΩ ±5%"], note: "Örnek: sarı, mor, kırmızı, altın = 47 × 100 = 4,7 kΩ ±%5." },
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
    if (!c || c.digit === undefined) fail(`«${c ? c.ar : keys[i]}» rengi ${i + 1}. şerit için uygun değil.`, `b${i + 1}`);
    digits = digits * 10 + c.digit;
  }
  const m = COLORS[keys[nd]];
  if (!m || m.mult === undefined) fail(`«${m ? m.ar : keys[nd]}» rengi çarpan için uygun değil.`, `b${nd + 1}`);
  const t = COLORS[keys[nd + 1]];
  if (!t || t.tol === undefined) fail(`«${t ? t.ar : keys[nd + 1]}» rengi tolerans şeridi için uygun değil.`, `b${nd + 2}`);
  let tc = null;
  if (bands === 6) {
    const c = COLORS[keys[5]];
    if (!c || !c.tc) fail(`«${c ? c.ar : keys[5]}» rengi sıcaklık katsayısı için uygun değil.`, "b6");
    tc = c.tc;
  }
  return { value: Number((digits * m.mult).toPrecision(6)), digits, mult: m.mult, tol: t.tol, tc };
}

export function encode(value, bands, tol, tc) {
  const nd = bands === 4 ? 2 : 3;
  let e = Math.floor(Math.log10(value)) - (nd - 1);
  let digits = Math.round(value / Math.pow(10, e));
  if (digits >= Math.pow(10, nd)) { digits /= 10; e += 1; }
  if (e < -2 || e > 9) fail("Değer, renklerle gösterilebilecek aralığın dışında (0,1 Ω ile yüzlerce GΩ arası).", "value");
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
  const mode = choice(input, "mode", "Yön", ["decode", "encode"], "decode");
  const bands = Number(choice(input, "bands", "Şerit sayısı", ["4", "5", "6"], "4"));
  const steps = [];
  if (mode === "decode") {
    const keys = Array.from({ length: bands }, (_, i) => choice(input, `b${i + 1}`, `${i + 1}. şerit`, Object.keys(COLORS), "black"));
    const r = decode(bands, keys);
    const nd = bands === 4 ? 2 : 3;
    steps.push(`${keys.slice(0, nd).map((k) => COLORS[k].ar).join(" ve ")}. şeritlerdeki rakamlar: ${keys.slice(0, nd).map((k) => COLORS[k].digit).join("")}.`);
    steps.push(`${nd + 1}. şerit (${COLORS[keys[nd]].ar}) çarpanı ${fmt(r.mult)} anlamına gelir; değer = ${r.digits} × ${fmt(r.mult)} = ${eng(r.value, "Ω", 6)}.`);
    steps.push(`${nd + 2}. şerit (${COLORS[keys[nd + 1]].ar}) ±${r.tol}%'lik toleransı gösterir; gerçek değer ${eng(r.value * (1 - r.tol / 100), "Ω", 5)} ile ${eng(r.value * (1 + r.tol / 100), "Ω", 5)} arasındadır.`);
    if (r.tc) steps.push(`Altıncı şerit (${COLORS[keys[5]].ar}) ${r.tc} ppm/K sıcaklık katsayısı anlamına gelir; yani her derece için direnç ${fmt((r.value * r.tc) / 1e6, 4)} Ω değişir.`);
    const text = `${eng(r.value, "Ω", 6)} ±${r.tol}%`;
    return {
      results: [{ label: "Değer", value: text, text }, { label: "En küçük değer", value: eng(r.value * (1 - r.tol / 100), "Ω", 5) }, { label: "En büyük değer", value: eng(r.value * (1 + r.tol / 100), "Ω", 5) }, ...(r.tc ? [{ label: "Sıcaklık katsayısı", value: `${r.tc} ppm/K` }] : [])],
      blocks: [{ type: "table", caption: "Şeritler", head: keys.map((_, i) => `${i + 1}`), rows: [keys.map(swatch)] }],
      steps, copy: text
    };
  }
  const value = num(input, "value", "Değer", { positive: true });
  const tol = Number(input.tol ?? 5);
  if (!Object.values(COLORS).some((c) => c.tol === tol)) fail("Geçerli bir tolerans seçin.", "tol");
  const tc = bands === 6 ? Number(input.tc ?? 50) : null;
  if (bands === 6 && !Object.values(COLORS).some((c) => c.tc === tc)) fail("Geçerli bir sıcaklık katsayısı seçin.", "tc");
  const r = encode(value, bands, tol, tc);
  const nd = bands === 4 ? 2 : 3;
  steps.push(`${eng(value, "Ω", 6)} değerini ${nd} anlamlı rakamla ve on kuvvetleri çarpanıyla yazıyoruz: ${eng(r.exact, "Ω", 6)}.`);
  if (r.rounded) steps.push(`Değer ${nd} rakamla tam gösterilemez; ${eng(r.exact, "Ω", 6)} değerine yuvarladık.`);
  steps.push(`Renkler sırasıyla: ${r.keys.map((k) => COLORS[k].ar).join("، ")}.`);
  const text = r.keys.map((k) => COLORS[k].ar).join(" - ");
  return {
    results: [{ label: "Renkler", value: text, text }, { label: "Gösterilen değer", value: eng(r.exact, "Ω", 6) }],
    blocks: [{ type: "table", caption: "Şeritler", head: r.keys.map((_, i) => `${i + 1}`), rows: [r.keys.map(swatch)] }],
    steps, copy: text
  };
}
