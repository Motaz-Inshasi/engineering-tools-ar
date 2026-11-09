import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt } from "../core/format.js";

export const COLORS = {
  black: { ar: "أسود", digit: 0, mult: 1, tc: 250, hex: "#000000", fg: "#ffffff" },
  brown: { ar: "بني", digit: 1, mult: 10, tol: 1, tc: 100, hex: "#7b3f00", fg: "#ffffff" },
  red: { ar: "أحمر", digit: 2, mult: 100, tol: 2, tc: 50, hex: "#d32f2f", fg: "#ffffff" },
  orange: { ar: "برتقالي", digit: 3, mult: 1e3, tc: 15, hex: "#f57c00", fg: "#000000" },
  yellow: { ar: "أصفر", digit: 4, mult: 1e4, tc: 25, hex: "#fdd835", fg: "#000000" },
  green: { ar: "أخضر", digit: 5, mult: 1e5, tol: 0.5, tc: 20, hex: "#388e3c", fg: "#ffffff" },
  blue: { ar: "أزرق", digit: 6, mult: 1e6, tol: 0.25, tc: 10, hex: "#1976d2", fg: "#ffffff" },
  violet: { ar: "بنفسجي", digit: 7, mult: 1e7, tol: 0.1, tc: 5, hex: "#7b1fa2", fg: "#ffffff" },
  grey: { ar: "رمادي", digit: 8, mult: 1e8, tol: 0.05, tc: 1, hex: "#9e9e9e", fg: "#000000" },
  white: { ar: "أبيض", digit: 9, mult: 1e9, hex: "#ffffff", fg: "#000000" },
  gold: { ar: "ذهبي", mult: 0.1, tol: 5, hex: "#c9a227", fg: "#000000" },
  silver: { ar: "فضي", mult: 0.01, tol: 10, hex: "#c0c0c0", fg: "#000000" },
  none: { ar: "بلا شريط", tol: 20, hex: "transparent", fg: "inherit" }
};

const OPT = Object.entries(COLORS).map(([k, c]) => [k, c.ar]);
const TOLS = Object.entries(COLORS).filter(([, c]) => c.tol !== undefined).map(([k, c]) => [String(c.tol), `${c.tol}% (${c.ar})`]);

export const meta = {
  description: "اقرأ قيمة المقاومة من ألوان الأشرطة (4 أو 5 أو 6 أشرطة) أو حوّل أي قيمة إلى ألوانها، مع نسبة السماحية ومعامل الحرارة ومدى القيمة الفعلية.",
  keywords: ["ألوان المقاومات", "كود الألوان", "resistor color code", "أشرطة المقاومة", "قراءة المقاومة", "سماحية"],
  formulas: [
    { label: "4 أشرطة: رقمان ثم المضاعف ثم السماحية", tex: "R = (10 d_1 + d_2) \\times 10^{m}" },
    { label: "5 و 6 أشرطة: ثلاثة أرقام ثم المضاعف (والشريط السادس معامل الحرارة)", tex: "R = (100 d_1 + 10 d_2 + d_3) \\times 10^{m}" }
  ],
  inputs: [
    { id: "mode", label: "الاتجاه", type: "select", default: "decode", options: [["decode", "من الألوان إلى القيمة"], ["encode", "من القيمة إلى الألوان"]] },
    { id: "bands", label: "عدد الأشرطة", type: "select", default: "4", options: [["4", "4"], ["5", "5"], ["6", "6"]] },
    { id: "b1", label: "الشريط 1", type: "select", default: "yellow", options: OPT, when: { mode: ["decode"] } },
    { id: "b2", label: "الشريط 2", type: "select", default: "violet", options: OPT, when: { mode: ["decode"] } },
    { id: "b3", label: "الشريط 3", type: "select", default: "red", options: OPT, when: { mode: ["decode"] } },
    { id: "b4", label: "الشريط 4", type: "select", default: "gold", options: OPT, when: { mode: ["decode"] } },
    { id: "b5", label: "الشريط 5", type: "select", default: "brown", options: OPT, when: { mode: ["decode"], bands: ["5", "6"] } },
    { id: "b6", label: "الشريط 6", type: "select", default: "red", options: OPT, when: { mode: ["decode"], bands: ["6"] } },
    { id: "value", label: "قيمة المقاومة", unit: "Ω", type: "number", default: "4.7k", when: { mode: ["encode"] } },
    { id: "tol", label: "السماحية", type: "select", default: "5", options: TOLS, when: { mode: ["encode"] } },
    { id: "tc", label: "معامل الحرارة (6 أشرطة)", unit: "ppm/K", type: "select", default: "50", options: Object.values(COLORS).filter((c) => c.tc).map((c) => [String(c.tc), `${c.tc} (${c.ar})`]), when: { mode: ["encode"], bands: ["6"] } }
  ],
  example: { values: { mode: "decode", bands: "4", b1: "yellow", b2: "violet", b3: "red", b4: "gold" }, expect: ["4.7 kΩ ±5%"], note: "مثال: أصفر، بنفسجي، أحمر، ذهبي = 47 × 100 = 4.7 kΩ ±5%." },
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
    if (!c || c.digit === undefined) fail(`اللون «${c ? c.ar : keys[i]}» لا يصلح للشريط ${i + 1} (شريط رقم).`, `b${i + 1}`);
    digits = digits * 10 + c.digit;
  }
  const m = COLORS[keys[nd]];
  if (!m || m.mult === undefined) fail(`اللون «${m ? m.ar : keys[nd]}» لا يصلح للمضاعف.`, `b${nd + 1}`);
  const t = COLORS[keys[nd + 1]];
  if (!t || t.tol === undefined) fail(`اللون «${t ? t.ar : keys[nd + 1]}» لا يصلح لشريط السماحية.`, `b${nd + 2}`);
  let tc = null;
  if (bands === 6) {
    const c = COLORS[keys[5]];
    if (!c || !c.tc) fail(`اللون «${c ? c.ar : keys[5]}» لا يصلح لمعامل الحرارة.`, "b6");
    tc = c.tc;
  }
  return { value: Number((digits * m.mult).toPrecision(6)), digits, mult: m.mult, tol: t.tol, tc };
}

export function encode(value, bands, tol, tc) {
  const nd = bands === 4 ? 2 : 3;
  let e = Math.floor(Math.log10(value)) - (nd - 1);
  let digits = Math.round(value / Math.pow(10, e));
  if (digits >= Math.pow(10, nd)) { digits /= 10; e += 1; }
  if (e < -2 || e > 9) fail("القيمة خارج المدى الممكن تمثيله بالألوان (من 0.1 Ω إلى مئات الجيجا أوم).", "value");
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
  const mode = choice(input, "mode", "الاتجاه", ["decode", "encode"], "decode");
  const bands = Number(choice(input, "bands", "عدد الأشرطة", ["4", "5", "6"], "4"));
  const steps = [];
  if (mode === "decode") {
    const keys = Array.from({ length: bands }, (_, i) => choice(input, `b${i + 1}`, `الشريط ${i + 1}`, Object.keys(COLORS), "black"));
    const r = decode(bands, keys);
    const nd = bands === 4 ? 2 : 3;
    steps.push(`الأشرطة ${keys.slice(0, nd).map((k) => COLORS[k].ar).join(" و")} هي الأرقام ${keys.slice(0, nd).map((k) => COLORS[k].digit).join("")}.`);
    steps.push(`الشريط ${nd + 1} (${COLORS[keys[nd]].ar}) هو المضاعف × ${fmt(r.mult)}، فالقيمة = ${r.digits} × ${fmt(r.mult)} = ${eng(r.value, "Ω", 6)}.`);
    steps.push(`الشريط ${nd + 2} (${COLORS[keys[nd + 1]].ar}) يعني سماحية ±${r.tol}%، فالقيمة الفعلية بين ${eng(r.value * (1 - r.tol / 100), "Ω", 5)} و ${eng(r.value * (1 + r.tol / 100), "Ω", 5)}.`);
    if (r.tc) steps.push(`الشريط السادس (${COLORS[keys[5]].ar}) يعني معامل حرارة ${r.tc} ppm/K، أي تتغير المقاومة ${fmt((r.value * r.tc) / 1e6, 4)} Ω لكل درجة.`);
    const text = `${eng(r.value, "Ω", 6)} ±${r.tol}%`;
    return {
      results: [{ label: "القيمة", value: text, text }, { label: "أصغر قيمة", value: eng(r.value * (1 - r.tol / 100), "Ω", 5) }, { label: "أكبر قيمة", value: eng(r.value * (1 + r.tol / 100), "Ω", 5) }, ...(r.tc ? [{ label: "معامل الحرارة", value: `${r.tc} ppm/K` }] : [])],
      blocks: [{ type: "table", caption: "الأشرطة", head: keys.map((_, i) => `${i + 1}`), rows: [keys.map(swatch)] }],
      steps, copy: text
    };
  }
  const value = num(input, "value", "القيمة", { positive: true });
  const tol = Number(input.tol ?? 5);
  if (!Object.values(COLORS).some((c) => c.tol === tol)) fail("اختر سماحية صحيحة.", "tol");
  const tc = bands === 6 ? Number(input.tc ?? 50) : null;
  if (bands === 6 && !Object.values(COLORS).some((c) => c.tc === tc)) fail("اختر معامل حرارة صحيحاً.", "tc");
  const r = encode(value, bands, tol, tc);
  const nd = bands === 4 ? 2 : 3;
  steps.push(`نكتب القيمة ${eng(value, "Ω", 6)} بـ ${nd} أرقام معنوية ومضاعف من قوى العشرة: ${eng(r.exact, "Ω", 6)}.`);
  if (r.rounded) steps.push(`القيمة لا تُمثَّل بدقة بـ ${nd} أرقام، فقرّبناها إلى ${eng(r.exact, "Ω", 6)}.`);
  steps.push(`الألوان بالترتيب: ${r.keys.map((k) => COLORS[k].ar).join("، ")}.`);
  const text = r.keys.map((k) => COLORS[k].ar).join(" - ");
  return {
    results: [{ label: "الألوان", value: text, text }, { label: "القيمة الممثلة", value: eng(r.exact, "Ω", 6) }],
    blocks: [{ type: "table", caption: "الأشرطة", head: r.keys.map((_, i) => `${i + 1}`), rows: [r.keys.map(swatch)] }],
    steps, copy: text
  };
}
