import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CROPS = { wheat: 1.15, maize: 1.2, tomato: 1.15, potato: 1.15, olive: 0.7, citrus: 0.65, alfalfa: 0.95, grass: 0.95 };
const SYSTEMS = { drip: 0.9, sprinkler: 0.75, surface: 0.6 };
const AREA_M2 = { m2: 1, dunum: 1000, ha: 10000 };

export const meta = {
  description: "محاسبه نیاز آبیاری روزانه محصول از ET0 و ضریب محصول Kc و بارش مؤثر و بازده سامانه آبیاری، سپس حجم روزانه و هفتگی بر حسب لیتر و متر مکعب و زمان کارکرد، در صورت وارد کردن دبی سامانه.",
  keywords: ["نیاز آبیاری", "ETc", "ET0", "ضریب محصول Kc", "FAO-56", "بازده آبیاری", "قطره‌ای", "irrigation"],
  formulas: [
    { label: "نیاز آبی محصول", tex: "ET_c = K_c \\cdot ET_0" },
    { label: "نیاز خالص و ناخالص", tex: "N = \\max(ET_c - P_{eff},\\,0),\\qquad G = \\frac{N}{E_f}" },
    { label: "حجم روزانه", tex: "V\\,[L] = G\\,[mm] \\times A\\,[m^2],\\qquad t = \\frac{V}{Q}" }
  ],
  inputs: [
    { id: "et0", label: "تبخیر و تعرق مرجع ET0", unit: "mm/day", type: "number", default: "5" },
    { id: "crop", label: "محصول", type: "select", default: "wheat", options: [["wheat", "گندم (Kc 1.15)"], ["maize", "ذرت (Kc 1.20)"], ["tomato", "گوجه‌فرنگی (Kc 1.15)"], ["potato", "سیب‌زمینی (Kc 1.15)"], ["olive", "زیتون (Kc 0.70)"], ["citrus", "مرکبات (Kc 0.65)"], ["alfalfa", "یونجه (Kc 0.95)"], ["grass", "علف و مرتع (Kc 0.95)"], ["custom", "ضریب سفارشی"]] },
    { id: "kc", label: "ضریب محصول Kc", type: "number", default: "1.2", when: { crop: ["custom"] } },
    { id: "rain", label: "بارش مؤثر", unit: "mm/day", type: "number", default: "0" },
    { id: "area", label: "مساحت", type: "number", default: "1000" },
    { id: "areaUnit", label: "واحد مساحت", type: "select", default: "m2", options: [["m2", "م²"], ["dunum", "دونم (1000 م²)"], ["ha", "هکتار"]] },
    { id: "system", label: "سامانه آبیاری", type: "select", default: "drip", options: [["drip", "قطره‌ای (بازده 0.90)"], ["sprinkler", "بارانی (بازده 0.75)"], ["surface", "سطحی یا غرقابی (بازده 0.60)"]] },
    { id: "flow", label: "دبی کل سامانه (اختیاری)", unit: "L/h", type: "number", default: "", help: "اگر نمی‌خواهید زمان کارکرد محاسبه شود، این فیلد را خالی بگذارید." }
  ],
  example: { values: { et0: "5", crop: "custom", kc: "1.2", rain: "0", area: "1000", areaUnit: "m2", system: "drip", flow: "" }, expect: ["6.667 mm", "6667 L"], note: "مثال: ET0 = 5 mm/day و ضریب 1.2 روی 1000 م² با آبیاری قطره‌ای." },
  invalid: { values: { et0: "5", crop: "custom", kc: "1.2", rain: "0", area: "0", areaUnit: "m2", system: "drip", flow: "" } },
  related: ["fertilizer-npk", "calorie-needs"]
};

export function solve(input) {
  const et0 = num(input, "et0", "ET0", { nonNegative: true });
  const crop = choice(input, "crop", "محصول", [...Object.keys(CROPS), "custom"], "wheat");
  const kc = crop === "custom" ? num(input, "kc", "ضریب محصول Kc", { nonNegative: true }) : CROPS[crop];
  const rain = num(input, "rain", "بارش مؤثر", { nonNegative: true, default: 0 });
  const areaRaw = num(input, "area", "مساحت", { positive: true });
  const unit = choice(input, "areaUnit", "واحد مساحت", ["m2", "dunum", "ha"], "m2");
  const sys = choice(input, "system", "سامانه آبیاری", ["drip", "sprinkler", "surface"], "drip");
  const flow = num(input, "flow", "دبی سامانه", { positive: true, optional: true });
  const eff = SYSTEMS[sys];
  const etc = kc * et0;
  const net = Math.max(etc - rain, 0);
  const gross = net / eff;
  const areaM2 = areaRaw * AREA_M2[unit];
  const liters = gross * areaM2;
  const m3 = liters / 1000;
  const hours = flow ? liters / flow : null;
  const steps = [
    { text: "نیاز آبی محصول ETc = Kc × ET0:", tex: `ET_c = ${ntex(kc)} \\times ${ntex(et0)} = ${ntex(etc, 6)}\\ mm` },
    { text: "نیاز خالص پس از بارش مؤثر:", tex: `N = \\max(${ntex(etc, 6)} - ${ntex(rain)},\\ 0) = ${ntex(net, 6)}\\ mm` },
    { text: "نیاز ناخالص پس از بازده سامانه:", tex: `G = \\frac{N}{E_f} = \\frac{${ntex(net, 6)}}{${ntex(eff)}} = ${ntex(gross, 6)}\\ mm` },
    { text: "حجم روزانه (1 mm روی 1 m² = 1 L):", tex: `V = G \\times A = ${ntex(gross, 6)} \\times ${ntex(areaM2, 6)} = ${ntex(liters, 6)}\\ L` }
  ];
  if (hours !== null) steps.push({ text: "زمان کارکرد روزانه:", tex: `t = \\frac{V}{Q} = \\frac{${ntex(liters, 6)}}{${ntex(flow)}} = ${ntex(hours, 6)}\\ h` });
  const results = [
    { label: "نیاز آبی محصول ETc", value: `${fmt(etc, 4)} mm/day` },
    { label: "نیاز خالص", value: `${fmt(net, 4)} mm/day` },
    { label: "کل نیاز آبیاری", value: `${fmt(gross, 4)} mm/day`, text: `${fmt(gross, 4)} mm/day` },
    { label: "حجم روزانه", value: `${fmt(liters, 4)} L/day`, text: `${fmt(liters, 4)} L/day` },
    { label: "حجم روزانه بر حسب متر مکعب", value: `${fmt(m3, 4)} m³/day` },
    { label: "حجم هفتگی", value: `${fmt(m3 * 7, 4)} m³/week` }
  ];
  if (hours !== null) results.push({ label: "زمان آبیاری روزانه", value: `${fmt(hours, 4)} ساعت (${fmt(hours * 60, 4)} دقیقه)` });
  return {
    results,
    steps,
    copy: `نیاز کل ${fmt(gross, 4)} mm/day ≈ ${fmt(liters, 4)} L/day برای مساحت ${fmt(areaM2, 4)} م²`,
    blocks: [{ type: "note", text: "مقادیر متوسط Kc برای مرحله میانی فصل بر اساس FAO-56 است؛ این مقادیر تقریبی‌اند و با اقلیم و مرحله رشد تغییر می‌کنند." }],
    values: { etc, net, gross, liters, m3, hours }
  };
}
