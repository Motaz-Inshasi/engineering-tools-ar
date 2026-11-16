import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CROPS = { wheat: 1.15, maize: 1.2, tomato: 1.15, potato: 1.15, olive: 0.7, citrus: 0.65, alfalfa: 0.95, grass: 0.95 };
const SYSTEMS = { drip: 0.9, sprinkler: 0.75, surface: 0.6 };
const AREA_M2 = { m2: 1, dunum: 1000, ha: 10000 };

export const meta = {
  description: "ET0, bitki katsayısı Kc, etkili yağış ve sulama sistemi verimliliğinden bitkinin günlük sulama ihtiyacını hesaplayın; sistem debisi girilirse günlük ve haftalık hacmi litre ve metreküp olarak ve sulama süresini bulun.",
  keywords: ["sulama ihtiyacı", "ETc", "ET0", "bitki katsayısı Kc", "FAO-56", "sulama verimliliği", "damla sulama", "irrigation"],
  formulas: [
    { label: "Bitkinin su ihtiyacı", tex: "ET_c = K_c \\cdot ET_0" },
    { label: "Net ve brüt ihtiyaç", tex: "N = \\max(ET_c - P_{eff},\\,0),\\qquad G = \\frac{N}{E_f}" },
    { label: "Günlük hacim", tex: "V\\,[L] = G\\,[mm] \\times A\\,[m^2],\\qquad t = \\frac{V}{Q}" }
  ],
  inputs: [
    { id: "et0", label: "Referans evapotranspirasyon ET0", unit: "mm/day", type: "number", default: "5" },
    { id: "crop", label: "Bitki", type: "select", default: "wheat", options: [["wheat", "Buğday (Kc 1.15)"], ["maize", "Mısır (Kc 1.20)"], ["tomato", "Domates (Kc 1.15)"], ["potato", "Patates (Kc 1.15)"], ["olive", "Zeytin (Kc 0.70)"], ["citrus", "Narenciye (Kc 0.65)"], ["alfalfa", "Yonca (Kc 0.95)"], ["grass", "Çayır ve otlak (Kc 0.95)"], ["custom", "Özel katsayı"]] },
    { id: "kc", label: "bitki katsayısı Kc", type: "number", default: "1.2", when: { crop: ["custom"] } },
    { id: "rain", label: "Etkili yağış", unit: "mm/day", type: "number", default: "0" },
    { id: "area", label: "Alan", type: "number", default: "1000" },
    { id: "areaUnit", label: "Alan birimi", type: "select", default: "m2", options: [["m2", "m²"], ["dunum", "dönüm (1000 m²)"], ["ha", "hektar"]] },
    { id: "system", label: "Sulama sistemi", type: "select", default: "drip", options: [["drip", "Damla (verimlilik 0.90)"], ["sprinkler", "Yağmurlama (verimlilik 0.75)"], ["surface", "Yüzey veya salma (verimlilik 0.60)"]] },
    { id: "flow", label: "Sistemin toplam debisi (isteğe bağlı)", unit: "L/h", type: "number", default: "", help: "Sulama süresini hesaplamak istemiyorsanız alanı boş bırakın." }
  ],
  example: { values: { et0: "5", crop: "custom", kc: "1.2", rain: "0", area: "1000", areaUnit: "m2", system: "drip", flow: "" }, expect: ["6.667 mm", "6667 L"], note: "Örnek: ET0 = 5 mm/gün ve katsayı 1.2, 1000 m² alanda damla sulama." },
  invalid: { values: { et0: "5", crop: "custom", kc: "1.2", rain: "0", area: "0", areaUnit: "m2", system: "drip", flow: "" } },
  related: ["fertilizer-npk", "calorie-needs"]
};

export function solve(input) {
  const et0 = num(input, "et0", "ET0", { nonNegative: true });
  const crop = choice(input, "crop", "Bitki", [...Object.keys(CROPS), "custom"], "wheat");
  const kc = crop === "custom" ? num(input, "kc", "bitki katsayısı Kc", { nonNegative: true }) : CROPS[crop];
  const rain = num(input, "rain", "Etkili yağış", { nonNegative: true, default: 0 });
  const areaRaw = num(input, "area", "Alan", { positive: true });
  const unit = choice(input, "areaUnit", "Alan birimi", ["m2", "dunum", "ha"], "m2");
  const sys = choice(input, "system", "Sulama sistemi", ["drip", "sprinkler", "surface"], "drip");
  const flow = num(input, "flow", "Sistem debisi", { positive: true, optional: true });
  const eff = SYSTEMS[sys];
  const etc = kc * et0;
  const net = Math.max(etc - rain, 0);
  const gross = net / eff;
  const areaM2 = areaRaw * AREA_M2[unit];
  const liters = gross * areaM2;
  const m3 = liters / 1000;
  const hours = flow ? liters / flow : null;
  const steps = [
    { text: "Bitkinin su ihtiyacı ETc = Kc × ET0:", tex: `ET_c = ${ntex(kc)} \\times ${ntex(et0)} = ${ntex(etc, 6)}\\ mm` },
    { text: "Etkili yağış sonrası net ihtiyaç:", tex: `N = \\max(${ntex(etc, 6)} - ${ntex(rain)},\\ 0) = ${ntex(net, 6)}\\ mm` },
    { text: "Sistem verimliliği sonrası brüt ihtiyaç:", tex: `G = \\frac{N}{E_f} = \\frac{${ntex(net, 6)}}{${ntex(eff)}} = ${ntex(gross, 6)}\\ mm` },
    { text: "Günlük hacim (1 mm / 1 m² = 1 L):", tex: `V = G \\times A = ${ntex(gross, 6)} \\times ${ntex(areaM2, 6)} = ${ntex(liters, 6)}\\ L` }
  ];
  if (hours !== null) steps.push({ text: "Günlük sulama süresi:", tex: `t = \\frac{V}{Q} = \\frac{${ntex(liters, 6)}}{${ntex(flow)}} = ${ntex(hours, 6)}\\ h` });
  const results = [
    { label: "Bitkinin su ihtiyacı ETc", value: `${fmt(etc, 4)} mm/gün` },
    { label: "Net ihtiyaç", value: `${fmt(net, 4)} mm/gün` },
    { label: "Brüt sulama ihtiyacı", value: `${fmt(gross, 4)} mm/gün`, text: `${fmt(gross, 4)} mm/gün` },
    { label: "Günlük hacim", value: `${fmt(liters, 4)} L/gün`, text: `${fmt(liters, 4)} L/gün` },
    { label: "Günlük hacim metreküp olarak", value: `${fmt(m3, 4)} m³/gün` },
    { label: "Haftalık hacim", value: `${fmt(m3 * 7, 4)} m³/hafta` }
  ];
  if (hours !== null) results.push({ label: "Günlük sulama süresi", value: `${fmt(hours, 4)} saat (${fmt(hours * 60, 4)} dakika)` });
  return {
    results,
    steps,
    copy: `Brüt ihtiyaç ${fmt(gross, 4)} mm/gün ≈ ${fmt(liters, 4)} L/gün, alan ${fmt(areaM2, 4)} m²`,
    blocks: [{ type: "note", text: "FAO-56'ya göre orta sezon dönemi için Kc değerleri yaklaşıktır ve iklim ile büyüme evresine göre değişir." }],
    values: { etc, net, gross, liters, m3, hours }
  };
}
