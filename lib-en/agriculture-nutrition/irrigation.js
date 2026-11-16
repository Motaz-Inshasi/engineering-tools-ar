import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CROPS = { wheat: 1.15, maize: 1.2, tomato: 1.15, potato: 1.15, olive: 0.7, citrus: 0.65, alfalfa: 0.95, grass: 0.95 };
const SYSTEMS = { drip: 0.9, sprinkler: 0.75, surface: 0.6 };
const AREA_M2 = { m2: 1, dunum: 1000, ha: 10000 };

export const meta = {
  description: "Calculates the daily irrigation requirement of the crop from ET0, the crop coefficient Kc, effective rainfall, and irrigation system efficiency, then the daily and weekly volume in liters and cubic meters, and the operating time if you enter the system flow.",
  keywords: ["irrigation requirement", "ETc", "ET0", "crop coefficient Kc", "FAO-56", "irrigation efficiency", "drip", "irrigation"],
  formulas: [
    { label: "Crop water requirement", tex: "ET_c = K_c \\cdot ET_0" },
    { label: "Net and gross requirement", tex: "N = \\max(ET_c - P_{eff},\\,0),\\qquad G = \\frac{N}{E_f}" },
    { label: "Daily volume", tex: "V\\,[L] = G\\,[mm] \\times A\\,[m^2],\\qquad t = \\frac{V}{Q}" }
  ],
  inputs: [
    { id: "et0", label: "Reference evapotranspiration ET0", unit: "mm/day", type: "number", default: "5" },
    { id: "crop", label: "Crop", type: "select", default: "wheat", options: [["wheat", "Wheat (Kc 1.15)"], ["maize", "Maize (Kc 1.20)"], ["tomato", "Tomato (Kc 1.15)"], ["potato", "Potato (Kc 1.15)"], ["olive", "Olive (Kc 0.70)"], ["citrus", "Citrus (Kc 0.65)"], ["alfalfa", "Clover (Kc 0.95)"], ["grass", "Grass and pasture (Kc 0.95)"], ["custom", "Custom coefficient"]] },
    { id: "kc", label: "crop coefficient Kc", type: "number", default: "1.2", when: { crop: ["custom"] } },
    { id: "rain", label: "Effective rainfall", unit: "mm/day", type: "number", default: "0" },
    { id: "area", label: "Area", type: "number", default: "1000" },
    { id: "areaUnit", label: "Area unit", type: "select", default: "m2", options: [["m2", "m²"], ["dunum", "Dunam (1000 m²)"], ["ha", "Hectare"]] },
    { id: "system", label: "Irrigation system", type: "select", default: "drip", options: [["drip", "Drip (efficiency 0.90)"], ["sprinkler", "Sprinkler (efficiency 0.75)"], ["surface", "Surface or flood (efficiency 0.60)"]] },
    { id: "flow", label: "Total system flow (optional)", unit: "L/h", type: "number", default: "", help: "Leave the field empty if you do not want to calculate the operating time." }
  ],
  example: { values: { et0: "5", crop: "custom", kc: "1.2", rain: "0", area: "1000", areaUnit: "m2", system: "drip", flow: "" }, expect: ["6.667 mm", "6667 L"], note: "Example: ET0 = 5 mm/day and a coefficient of 1.2 over 1000 m² with drip irrigation." },
  invalid: { values: { et0: "5", crop: "custom", kc: "1.2", rain: "0", area: "0", areaUnit: "m2", system: "drip", flow: "" } },
  related: ["fertilizer-npk", "calorie-needs"]
};

export function solve(input) {
  const et0 = num(input, "et0", "ET0", { nonNegative: true });
  const crop = choice(input, "crop", "Crop", [...Object.keys(CROPS), "custom"], "wheat");
  const kc = crop === "custom" ? num(input, "kc", "crop coefficient Kc", { nonNegative: true }) : CROPS[crop];
  const rain = num(input, "rain", "Effective rainfall", { nonNegative: true, default: 0 });
  const areaRaw = num(input, "area", "Area", { positive: true });
  const unit = choice(input, "areaUnit", "Area unit", ["m2", "dunum", "ha"], "m2");
  const sys = choice(input, "system", "Irrigation system", ["drip", "sprinkler", "surface"], "drip");
  const flow = num(input, "flow", "System flow", { positive: true, optional: true });
  const eff = SYSTEMS[sys];
  const etc = kc * et0;
  const net = Math.max(etc - rain, 0);
  const gross = net / eff;
  const areaM2 = areaRaw * AREA_M2[unit];
  const liters = gross * areaM2;
  const m3 = liters / 1000;
  const hours = flow ? liters / flow : null;
  const steps = [
    { text: "Crop water requirement ETc = Kc × ET0:", tex: `ET_c = ${ntex(kc)} \\times ${ntex(et0)} = ${ntex(etc, 6)}\\ mm` },
    { text: "Net requirement after effective rainfall:", tex: `N = \\max(${ntex(etc, 6)} - ${ntex(rain)},\\ 0) = ${ntex(net, 6)}\\ mm` },
    { text: "Gross requirement after system efficiency:", tex: `G = \\frac{N}{E_f} = \\frac{${ntex(net, 6)}}{${ntex(eff)}} = ${ntex(gross, 6)}\\ mm` },
    { text: "Daily volume (1 mm over 1 m² = 1 L):", tex: `V = G \\times A = ${ntex(gross, 6)} \\times ${ntex(areaM2, 6)} = ${ntex(liters, 6)}\\ L` }
  ];
  if (hours !== null) steps.push({ text: "Daily operating time:", tex: `t = \\frac{V}{Q} = \\frac{${ntex(liters, 6)}}{${ntex(flow)}} = ${ntex(hours, 6)}\\ h` });
  const results = [
    { label: "Crop water requirement ETc", value: `${fmt(etc, 4)} mm/day` },
    { label: "Net requirement", value: `${fmt(net, 4)} mm/day` },
    { label: "Total irrigation requirement", value: `${fmt(gross, 4)} mm/day`, text: `${fmt(gross, 4)} mm/day` },
    { label: "Daily volume", value: `${fmt(liters, 4)} L/day`, text: `${fmt(liters, 4)} L/day` },
    { label: "Daily volume in cubic meters", value: `${fmt(m3, 4)} m³/day` },
    { label: "Weekly volume", value: `${fmt(m3 * 7, 4)} m³/week` }
  ];
  if (hours !== null) results.push({ label: "Daily irrigation time", value: `${fmt(hours, 4)} hours (${fmt(hours * 60, 4)} minutes)` });
  return {
    results,
    steps,
    copy: `Total requirement ${fmt(gross, 4)} mm/day ≈ ${fmt(liters, 4)} L/day for an area of ${fmt(areaM2, 4)} m²`,
    blocks: [{ type: "note", text: "Average Kc values for the mid-season stage according to FAO-56; they are approximate and vary with climate and growth stage." }],
    values: { etc, net, gross, liters, m3, hours }
  };
}
