import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CROPS = { wheat: 1.15, maize: 1.2, tomato: 1.15, potato: 1.15, olive: 0.7, citrus: 0.65, alfalfa: 0.95, grass: 0.95 };
const SYSTEMS = { drip: 0.9, sprinkler: 0.75, surface: 0.6 };
const AREA_M2 = { m2: 1, dunum: 1000, ha: 10000 };

export const meta = {
  description: "احسب احتياج الري اليومي للمحصول من ET0 ومعامل المحصول Kc والمطر الفعال وكفاءة نظام الري، ثم الحجم اليومي والأسبوعي بالليتر والمتر المكعب وزمن التشغيل إن أدخلت تدفق النظام.",
  keywords: ["احتياج الري", "ETc", "ET0", "معامل المحصول Kc", "FAO-56", "كفاءة الري", "تنقيط", "irrigation"],
  formulas: [
    { label: "الاحتياج المائي للمحصول", tex: "ET_c = K_c \\cdot ET_0" },
    { label: "الاحتياج الصافي والإجمالي", tex: "N = \\max(ET_c - P_{eff},\\,0),\\qquad G = \\frac{N}{E_f}" },
    { label: "الحجم اليومي", tex: "V\\,[L] = G\\,[mm] \\times A\\,[m^2],\\qquad t = \\frac{V}{Q}" }
  ],
  inputs: [
    { id: "et0", label: "التبخر والنتح المرجعي ET0", unit: "mm/day", type: "number", default: "5" },
    { id: "crop", label: "المحصول", type: "select", default: "wheat", options: [["wheat", "قمح (Kc 1.15)"], ["maize", "ذرة (Kc 1.20)"], ["tomato", "طماطم (Kc 1.15)"], ["potato", "بطاطس (Kc 1.15)"], ["olive", "زيتون (Kc 0.70)"], ["citrus", "حمضيات (Kc 0.65)"], ["alfalfa", "برسيم (Kc 0.95)"], ["grass", "عشب ومراعٍ (Kc 0.95)"], ["custom", "معامل مخصص"]] },
    { id: "kc", label: "معامل المحصول Kc", type: "number", default: "1.2", when: { crop: ["custom"] } },
    { id: "rain", label: "المطر الفعال", unit: "mm/day", type: "number", default: "0" },
    { id: "area", label: "المساحة", type: "number", default: "1000" },
    { id: "areaUnit", label: "وحدة المساحة", type: "select", default: "m2", options: [["m2", "م²"], ["dunum", "دونم (1000 م²)"], ["ha", "هكتار"]] },
    { id: "system", label: "نظام الري", type: "select", default: "drip", options: [["drip", "تنقيط (كفاءة 0.90)"], ["sprinkler", "رش (كفاءة 0.75)"], ["surface", "سطحي أو غمر (كفاءة 0.60)"]] },
    { id: "flow", label: "تدفق النظام الكلي (اختياري)", unit: "L/h", type: "number", default: "", help: "اترك الحقل فارغاً إذا لم ترِد حساب زمن التشغيل." }
  ],
  example: { values: { et0: "5", crop: "custom", kc: "1.2", rain: "0", area: "1000", areaUnit: "m2", system: "drip", flow: "" }, expect: ["6.667 mm", "6667 L"], note: "مثال: ET0 = 5 mm/day ومعامل 1.2 على 1000 م² بالتنقيط." },
  invalid: { values: { et0: "5", crop: "custom", kc: "1.2", rain: "0", area: "0", areaUnit: "m2", system: "drip", flow: "" } },
  related: ["fertilizer-npk", "calorie-needs"]
};

export function solve(input) {
  const et0 = num(input, "et0", "ET0", { nonNegative: true });
  const crop = choice(input, "crop", "المحصول", [...Object.keys(CROPS), "custom"], "wheat");
  const kc = crop === "custom" ? num(input, "kc", "معامل المحصول Kc", { nonNegative: true }) : CROPS[crop];
  const rain = num(input, "rain", "المطر الفعال", { nonNegative: true, default: 0 });
  const areaRaw = num(input, "area", "المساحة", { positive: true });
  const unit = choice(input, "areaUnit", "وحدة المساحة", ["m2", "dunum", "ha"], "m2");
  const sys = choice(input, "system", "نظام الري", ["drip", "sprinkler", "surface"], "drip");
  const flow = num(input, "flow", "تدفق النظام", { positive: true, optional: true });
  const eff = SYSTEMS[sys];
  const etc = kc * et0;
  const net = Math.max(etc - rain, 0);
  const gross = net / eff;
  const areaM2 = areaRaw * AREA_M2[unit];
  const liters = gross * areaM2;
  const m3 = liters / 1000;
  const hours = flow ? liters / flow : null;
  const steps = [
    { text: "الاحتياج المائي للمحصول ETc = Kc × ET0:", tex: `ET_c = ${ntex(kc)} \\times ${ntex(et0)} = ${ntex(etc, 6)}\\ mm` },
    { text: "الاحتياج الصافي بعد المطر الفعال:", tex: `N = \\max(${ntex(etc, 6)} - ${ntex(rain)},\\ 0) = ${ntex(net, 6)}\\ mm` },
    { text: "الاحتياج الإجمالي بعد كفاءة النظام:", tex: `G = \\frac{N}{E_f} = \\frac{${ntex(net, 6)}}{${ntex(eff)}} = ${ntex(gross, 6)}\\ mm` },
    { text: "الحجم اليومي (1 mm على 1 m² = 1 L):", tex: `V = G \\times A = ${ntex(gross, 6)} \\times ${ntex(areaM2, 6)} = ${ntex(liters, 6)}\\ L` }
  ];
  if (hours !== null) steps.push({ text: "زمن التشغيل اليومي:", tex: `t = \\frac{V}{Q} = \\frac{${ntex(liters, 6)}}{${ntex(flow)}} = ${ntex(hours, 6)}\\ h` });
  const results = [
    { label: "الاحتياج المائي للمحصول ETc", value: `${fmt(etc, 4)} mm/يوم` },
    { label: "الاحتياج الصافي", value: `${fmt(net, 4)} mm/يوم` },
    { label: "الاحتياج الإجمالي للري", value: `${fmt(gross, 4)} mm/يوم`, text: `${fmt(gross, 4)} mm/يوم` },
    { label: "الحجم اليومي", value: `${fmt(liters, 4)} L/يوم`, text: `${fmt(liters, 4)} L/يوم` },
    { label: "الحجم اليومي بالمتر المكعب", value: `${fmt(m3, 4)} م³/يوم` },
    { label: "الحجم الأسبوعي", value: `${fmt(m3 * 7, 4)} م³/أسبوع` }
  ];
  if (hours !== null) results.push({ label: "زمن الري اليومي", value: `${fmt(hours, 4)} ساعة (${fmt(hours * 60, 4)} دقيقة)` });
  return {
    results,
    steps,
    copy: `الاحتياج الإجمالي ${fmt(gross, 4)} mm/يوم ≈ ${fmt(liters, 4)} L/يوم لمساحة ${fmt(areaM2, 4)} م²`,
    blocks: [{ type: "note", text: "قيم Kc متوسطة لمرحلة منتصف الموسم وفق FAO-56، وهي تقريبية وتختلف حسب المناخ وطور النمو." }],
    values: { etc, net, gross, liters, m3, hours }
  };
}
