import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CROPS = { wheat: 1.15, maize: 1.2, tomato: 1.15, potato: 1.15, olive: 0.7, citrus: 0.65, alfalfa: 0.95, grass: 0.95 };
const SYSTEMS = { drip: 0.9, sprinkler: 0.75, surface: 0.6 };
const AREA_M2 = { m2: 1, dunum: 1000, ha: 10000 };

export const meta = {
  description: "ET0، فصل کے کوئفیشنٹ Kc، مؤثر بارش اور آبپاشی نظام کی کارکردگی سے فصل کی روزانہ آبپاشی کی ضرورت حساب کریں، پھر لیٹر اور مکعب میٹر میں روزانہ و ہفتہ وار حجم، اور نظام کا بہاؤ دینے پر چلانے کا وقت۔",
  keywords: ["آبپاشی کی ضرورت", "ETc", "ET0", "فصل کا کوئفیشنٹ Kc", "FAO-56", "آبپاشی کی کارکردگی", "ڈرپ", "irrigation"],
  formulas: [
    { label: "فصل کی پانی کی ضرورت", tex: "ET_c = K_c \\cdot ET_0" },
    { label: "خالص اور مجموعی ضرورت", tex: "N = \\max(ET_c - P_{eff},\\,0),\\qquad G = \\frac{N}{E_f}" },
    { label: "روزانہ کا حجم", tex: "V\\,[L] = G\\,[mm] \\times A\\,[m^2],\\qquad t = \\frac{V}{Q}" }
  ],
  inputs: [
    { id: "et0", label: "حوالہ ایواپوٹرانسپیریشن ET0", unit: "mm/day", type: "number", default: "5" },
    { id: "crop", label: "فصل", type: "select", default: "wheat", options: [["wheat", "گندم (Kc 1.15)"], ["maize", "مکئی (Kc 1.20)"], ["tomato", "ٹماٹر (Kc 1.15)"], ["potato", "آلو (Kc 1.15)"], ["olive", "زیتون (Kc 0.70)"], ["citrus", "کھٹے پھل (Kc 0.65)"], ["alfalfa", "برسیم (Kc 0.95)"], ["grass", "گھاس اور چراگاہیں (Kc 0.95)"], ["custom", "مخصوص کوئفیشنٹ"]] },
    { id: "kc", label: "فصل کا کوئفیشنٹ Kc", type: "number", default: "1.2", when: { crop: ["custom"] } },
    { id: "rain", label: "مؤثر بارش", unit: "mm/day", type: "number", default: "0" },
    { id: "area", label: "رقبہ", type: "number", default: "1000" },
    { id: "areaUnit", label: "رقبے کی اکائی", type: "select", default: "m2", options: [["m2", "m²"], ["dunum", "دونم (1000 m²)"], ["ha", "ہیکٹر"]] },
    { id: "system", label: "آبپاشی کا نظام", type: "select", default: "drip", options: [["drip", "ڈرپ (کارکردگی 0.90)"], ["sprinkler", "اسپرنکلر (کارکردگی 0.75)"], ["surface", "سطحی یا سیلابی (کارکردگی 0.60)"]] },
    { id: "flow", label: "نظام کا کل بہاؤ (اختیاری)", unit: "L/h", type: "number", default: "", help: "اگر چلانے کا وقت معلوم نہیں کرنا تو یہ خانہ خالی چھوڑ دیں۔" }
  ],
  example: { values: { et0: "5", crop: "custom", kc: "1.2", rain: "0", area: "1000", areaUnit: "m2", system: "drip", flow: "" }, expect: ["6.667 mm", "6667 L"], note: "مثال: ET0 = 5 mm/day اور کوئفیشنٹ 1.2، 1000 m² پر ڈرپ آبپاشی۔" },
  invalid: { values: { et0: "5", crop: "custom", kc: "1.2", rain: "0", area: "0", areaUnit: "m2", system: "drip", flow: "" } },
  related: ["fertilizer-npk", "calorie-needs"]
};

export function solve(input) {
  const et0 = num(input, "et0", "ET0", { nonNegative: true });
  const crop = choice(input, "crop", "فصل", [...Object.keys(CROPS), "custom"], "wheat");
  const kc = crop === "custom" ? num(input, "kc", "فصل کا کوئفیشنٹ Kc", { nonNegative: true }) : CROPS[crop];
  const rain = num(input, "rain", "مؤثر بارش", { nonNegative: true, default: 0 });
  const areaRaw = num(input, "area", "رقبہ", { positive: true });
  const unit = choice(input, "areaUnit", "رقبے کی اکائی", ["m2", "dunum", "ha"], "m2");
  const sys = choice(input, "system", "آبپاشی کا نظام", ["drip", "sprinkler", "surface"], "drip");
  const flow = num(input, "flow", "نظام کا بہاؤ", { positive: true, optional: true });
  const eff = SYSTEMS[sys];
  const etc = kc * et0;
  const net = Math.max(etc - rain, 0);
  const gross = net / eff;
  const areaM2 = areaRaw * AREA_M2[unit];
  const liters = gross * areaM2;
  const m3 = liters / 1000;
  const hours = flow ? liters / flow : null;
  const steps = [
    { text: "فصل کی پانی کی ضرورت ETc = Kc × ET0:", tex: `ET_c = ${ntex(kc)} \\times ${ntex(et0)} = ${ntex(etc, 6)}\\ mm` },
    { text: "مؤثر بارش کے بعد خالص ضرورت:", tex: `N = \\max(${ntex(etc, 6)} - ${ntex(rain)},\\ 0) = ${ntex(net, 6)}\\ mm` },
    { text: "نظام کی کارکردگی کے بعد مجموعی ضرورت:", tex: `G = \\frac{N}{E_f} = \\frac{${ntex(net, 6)}}{${ntex(eff)}} = ${ntex(gross, 6)}\\ mm` },
    { text: "روزانہ حجم (1 mm فی 1 m² = 1 L):", tex: `V = G \\times A = ${ntex(gross, 6)} \\times ${ntex(areaM2, 6)} = ${ntex(liters, 6)}\\ L` }
  ];
  if (hours !== null) steps.push({ text: "روزانہ چلانے کا وقت:", tex: `t = \\frac{V}{Q} = \\frac{${ntex(liters, 6)}}{${ntex(flow)}} = ${ntex(hours, 6)}\\ h` });
  const results = [
    { label: "فصل کی پانی کی ضرورت ETc", value: `${fmt(etc, 4)} mm/دن` },
    { label: "خالص ضرورت", value: `${fmt(net, 4)} mm/دن` },
    { label: "کل آبپاشی کی ضرورت", value: `${fmt(gross, 4)} mm/دن`, text: `${fmt(gross, 4)} mm/دن` },
    { label: "روزانہ کا حجم", value: `${fmt(liters, 4)} L/دن`, text: `${fmt(liters, 4)} L/دن` },
    { label: "روزانہ حجم مکعب میٹر میں", value: `${fmt(m3, 4)} m³/دن` },
    { label: "ہفتہ وار حجم", value: `${fmt(m3 * 7, 4)} m³/ہفتہ` }
  ];
  if (hours !== null) results.push({ label: "روزانہ آبپاشی کا وقت", value: `${fmt(hours, 4)} گھنٹے (${fmt(hours * 60, 4)} منٹ)` });
  return {
    results,
    steps,
    copy: `کل ضرورت ${fmt(gross, 4)} mm/دن ≈ ${fmt(liters, 4)} L/دن، رقبہ ${fmt(areaM2, 4)} m²`,
    blocks: [{ type: "note", text: "FAO-56 کے مطابق وسطی موسم کے مرحلے کے لیے اوسط Kc قدریں؛ یہ تقریبی ہیں اور آب و ہوا اور نشوونما کے مرحلے کے مطابق بدلتی ہیں۔" }],
    values: { etc, net, gross, liters, m3, hours }
  };
}
