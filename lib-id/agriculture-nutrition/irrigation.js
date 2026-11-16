import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CROPS = { wheat: 1.15, maize: 1.2, tomato: 1.15, potato: 1.15, olive: 0.7, citrus: 0.65, alfalfa: 0.95, grass: 0.95 };
const SYSTEMS = { drip: 0.9, sprinkler: 0.75, surface: 0.6 };
const AREA_M2 = { m2: 1, dunum: 1000, ha: 10000 };

export const meta = {
  description: "Hitung kebutuhan irigasi harian tanaman dari ET0, koefisien tanaman Kc, curah hujan efektif, dan efisiensi sistem irigasi, lalu volume harian dan mingguan dalam liter dan meter kubik, serta waktu operasi jika Anda memasukkan debit sistem.",
  keywords: ["kebutuhan irigasi", "ETc", "ET0", "koefisien tanaman Kc", "FAO-56", "efisiensi irigasi", "tetes", "irrigation"],
  formulas: [
    { label: "Kebutuhan air tanaman", tex: "ET_c = K_c \\cdot ET_0" },
    { label: "Kebutuhan bersih dan kotor", tex: "N = \\max(ET_c - P_{eff},\\,0),\\qquad G = \\frac{N}{E_f}" },
    { label: "Volume harian", tex: "V\\,[L] = G\\,[mm] \\times A\\,[m^2],\\qquad t = \\frac{V}{Q}" }
  ],
  inputs: [
    { id: "et0", label: "Evapotranspirasi acuan ET0", unit: "mm/day", type: "number", default: "5" },
    { id: "crop", label: "Tanaman", type: "select", default: "wheat", options: [["wheat", "Gandum (Kc 1.15)"], ["maize", "Jagung (Kc 1.20)"], ["tomato", "Tomat (Kc 1.15)"], ["potato", "Kentang (Kc 1.15)"], ["olive", "Zaitun (Kc 0.70)"], ["citrus", "Jeruk (Kc 0.65)"], ["alfalfa", "Semanggi (Kc 0.95)"], ["grass", "Rumput dan padang penggembalaan (Kc 0.95)"], ["custom", "Koefisien kustom"]] },
    { id: "kc", label: "koefisien tanaman Kc", type: "number", default: "1.2", when: { crop: ["custom"] } },
    { id: "rain", label: "Curah hujan efektif", unit: "mm/day", type: "number", default: "0" },
    { id: "area", label: "Luas", type: "number", default: "1000" },
    { id: "areaUnit", label: "Satuan luas", type: "select", default: "m2", options: [["m2", "m²"], ["dunum", "Dunam (1000 m²)"], ["ha", "Hektar"]] },
    { id: "system", label: "Sistem irigasi", type: "select", default: "drip", options: [["drip", "Tetes (efisiensi 0.90)"], ["sprinkler", "Sprinkler (efisiensi 0.75)"], ["surface", "Permukaan atau genangan (efisiensi 0.60)"]] },
    { id: "flow", label: "Debit total sistem (opsional)", unit: "L/h", type: "number", default: "", help: "Kosongkan kolom ini jika Anda tidak ingin menghitung waktu operasi." }
  ],
  example: { values: { et0: "5", crop: "custom", kc: "1.2", rain: "0", area: "1000", areaUnit: "m2", system: "drip", flow: "" }, expect: ["6.667 mm", "6667 L"], note: "Contoh: ET0 = 5 mm/day dan koefisien 1.2 pada 1000 m² dengan irigasi tetes." },
  invalid: { values: { et0: "5", crop: "custom", kc: "1.2", rain: "0", area: "0", areaUnit: "m2", system: "drip", flow: "" } },
  related: ["fertilizer-npk", "calorie-needs"]
};

export function solve(input) {
  const et0 = num(input, "et0", "ET0", { nonNegative: true });
  const crop = choice(input, "crop", "Tanaman", [...Object.keys(CROPS), "custom"], "wheat");
  const kc = crop === "custom" ? num(input, "kc", "koefisien tanaman Kc", { nonNegative: true }) : CROPS[crop];
  const rain = num(input, "rain", "Curah hujan efektif", { nonNegative: true, default: 0 });
  const areaRaw = num(input, "area", "Luas", { positive: true });
  const unit = choice(input, "areaUnit", "Satuan luas", ["m2", "dunum", "ha"], "m2");
  const sys = choice(input, "system", "Sistem irigasi", ["drip", "sprinkler", "surface"], "drip");
  const flow = num(input, "flow", "Debit sistem", { positive: true, optional: true });
  const eff = SYSTEMS[sys];
  const etc = kc * et0;
  const net = Math.max(etc - rain, 0);
  const gross = net / eff;
  const areaM2 = areaRaw * AREA_M2[unit];
  const liters = gross * areaM2;
  const m3 = liters / 1000;
  const hours = flow ? liters / flow : null;
  const steps = [
    { text: "Kebutuhan air tanaman ETc = Kc × ET0:", tex: `ET_c = ${ntex(kc)} \\times ${ntex(et0)} = ${ntex(etc, 6)}\\ mm` },
    { text: "Kebutuhan bersih setelah curah hujan efektif:", tex: `N = \\max(${ntex(etc, 6)} - ${ntex(rain)},\\ 0) = ${ntex(net, 6)}\\ mm` },
    { text: "Kebutuhan kotor setelah efisiensi sistem:", tex: `G = \\frac{N}{E_f} = \\frac{${ntex(net, 6)}}{${ntex(eff)}} = ${ntex(gross, 6)}\\ mm` },
    { text: "Volume harian (1 mm pada 1 m² = 1 L):", tex: `V = G \\times A = ${ntex(gross, 6)} \\times ${ntex(areaM2, 6)} = ${ntex(liters, 6)}\\ L` }
  ];
  if (hours !== null) steps.push({ text: "Waktu operasi harian:", tex: `t = \\frac{V}{Q} = \\frac{${ntex(liters, 6)}}{${ntex(flow)}} = ${ntex(hours, 6)}\\ h` });
  const results = [
    { label: "Kebutuhan air tanaman ETc", value: `${fmt(etc, 4)} mm/hari` },
    { label: "Kebutuhan bersih", value: `${fmt(net, 4)} mm/hari` },
    { label: "Kebutuhan kotor irigasi", value: `${fmt(gross, 4)} mm/hari`, text: `${fmt(gross, 4)} mm/hari` },
    { label: "Volume harian", value: `${fmt(liters, 4)} L/hari`, text: `${fmt(liters, 4)} L/hari` },
    { label: "Volume harian dalam meter kubik", value: `${fmt(m3, 4)} m³/hari` },
    { label: "Volume mingguan", value: `${fmt(m3 * 7, 4)} m³/minggu` }
  ];
  if (hours !== null) results.push({ label: "Waktu irigasi harian", value: `${fmt(hours, 4)} jam (${fmt(hours * 60, 4)} menit)` });
  return {
    results,
    steps,
    copy: `Kebutuhan kotor ${fmt(gross, 4)} mm/hari ≈ ${fmt(liters, 4)} L/hari untuk luas ${fmt(areaM2, 4)} m²`,
    blocks: [{ type: "note", text: "Nilai Kc rata-rata untuk tahap pertengahan musim menurut FAO-56; nilai ini bersifat perkiraan dan bervariasi menurut iklim serta tahap pertumbuhan." }],
    values: { etc, net, gross, liters, m3, hours }
  };
}
