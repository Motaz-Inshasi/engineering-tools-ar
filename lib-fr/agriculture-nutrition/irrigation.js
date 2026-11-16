import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CROPS = { wheat: 1.15, maize: 1.2, tomato: 1.15, potato: 1.15, olive: 0.7, citrus: 0.65, alfalfa: 0.95, grass: 0.95 };
const SYSTEMS = { drip: 0.9, sprinkler: 0.75, surface: 0.6 };
const AREA_M2 = { m2: 1, dunum: 1000, ha: 10000 };

export const meta = {
  description: "Calcule le besoin d'irrigation quotidien de la culture à partir de l'ET0, du coefficient cultural Kc, de la pluie efficace et du rendement du système, puis le volume quotidien et hebdomadaire en litres et en mètres cubes, et la durée d'arrosage si vous saisissez le débit.",
  keywords: ["besoin d'irrigation", "ETc", "ET0", "coefficient cultural Kc", "FAO-56", "efficience de l'irrigation", "goutte-à-goutte", "irrigation"],
  formulas: [
    { label: "Besoin en eau de la culture", tex: "ET_c = K_c \\cdot ET_0" },
    { label: "Besoin net et besoin brut", tex: "N = \\max(ET_c - P_{eff},\\,0),\\qquad G = \\frac{N}{E_f}" },
    { label: "Volume quotidien", tex: "V\\,[L] = G\\,[mm] \\times A\\,[m^2],\\qquad t = \\frac{V}{Q}" }
  ],
  inputs: [
    { id: "et0", label: "Évapotranspiration de référence ET0", unit: "mm/day", type: "number", default: "5" },
    { id: "crop", label: "Culture", type: "select", default: "wheat", options: [["wheat", "Blé (Kc 1.15)"], ["maize", "Maïs (Kc 1.20)"], ["tomato", "Tomate (Kc 1.15)"], ["potato", "Pomme de terre (Kc 1.15)"], ["olive", "Olivier (Kc 0.70)"], ["citrus", "Agrumes (Kc 0.65)"], ["alfalfa", "Trèfle (Kc 0.95)"], ["grass", "Herbe et pâturage (Kc 0.95)"], ["custom", "Coefficient personnalisé"]] },
    { id: "kc", label: "coefficient cultural Kc", type: "number", default: "1.2", when: { crop: ["custom"] } },
    { id: "rain", label: "Pluie efficace", unit: "mm/day", type: "number", default: "0" },
    { id: "area", label: "Surface", type: "number", default: "1000" },
    { id: "areaUnit", label: "Unité de surface", type: "select", default: "m2", options: [["m2", "m²"], ["dunum", "Dunum (1000 m²)"], ["ha", "Hectare"]] },
    { id: "system", label: "Système d'irrigation", type: "select", default: "drip", options: [["drip", "Goutte-à-goutte (efficience 0.90)"], ["sprinkler", "Aspersion (efficience 0.75)"], ["surface", "Gravitaire ou par submersion (efficience 0.60)"]] },
    { id: "flow", label: "Débit total du système (facultatif)", unit: "L/h", type: "number", default: "", help: "Laissez le champ vide si vous ne souhaitez pas calculer la durée de fonctionnement." }
  ],
  example: { values: { et0: "5", crop: "custom", kc: "1.2", rain: "0", area: "1000", areaUnit: "m2", system: "drip", flow: "" }, expect: ["6.667 mm", "6667 L"], note: "Exemple : ET0 = 5 mm/jour et coefficient de 1.2 sur 1000 m² en goutte-à-goutte." },
  invalid: { values: { et0: "5", crop: "custom", kc: "1.2", rain: "0", area: "0", areaUnit: "m2", system: "drip", flow: "" } },
  related: ["fertilizer-npk", "calorie-needs"]
};

export function solve(input) {
  const et0 = num(input, "et0", "ET0", { nonNegative: true });
  const crop = choice(input, "crop", "Culture", [...Object.keys(CROPS), "custom"], "wheat");
  const kc = crop === "custom" ? num(input, "kc", "coefficient cultural Kc", { nonNegative: true }) : CROPS[crop];
  const rain = num(input, "rain", "Pluie efficace", { nonNegative: true, default: 0 });
  const areaRaw = num(input, "area", "Surface", { positive: true });
  const unit = choice(input, "areaUnit", "Unité de surface", ["m2", "dunum", "ha"], "m2");
  const sys = choice(input, "system", "Système d'irrigation", ["drip", "sprinkler", "surface"], "drip");
  const flow = num(input, "flow", "Débit du système", { positive: true, optional: true });
  const eff = SYSTEMS[sys];
  const etc = kc * et0;
  const net = Math.max(etc - rain, 0);
  const gross = net / eff;
  const areaM2 = areaRaw * AREA_M2[unit];
  const liters = gross * areaM2;
  const m3 = liters / 1000;
  const hours = flow ? liters / flow : null;
  const steps = [
    { text: "Besoin en eau de la culture ETc = Kc × ET0 :", tex: `ET_c = ${ntex(kc)} \\times ${ntex(et0)} = ${ntex(etc, 6)}\\ mm` },
    { text: "Besoin net après la pluie efficace :", tex: `N = \\max(${ntex(etc, 6)} - ${ntex(rain)},\\ 0) = ${ntex(net, 6)}\\ mm` },
    { text: "Besoin brut après l'efficience du système :", tex: `G = \\frac{N}{E_f} = \\frac{${ntex(net, 6)}}{${ntex(eff)}} = ${ntex(gross, 6)}\\ mm` },
    { text: "Volume quotidien (1 mm sur 1 m² = 1 L) :", tex: `V = G \\times A = ${ntex(gross, 6)} \\times ${ntex(areaM2, 6)} = ${ntex(liters, 6)}\\ L` }
  ];
  if (hours !== null) steps.push({ text: "Durée d'irrigation quotidienne :", tex: `t = \\frac{V}{Q} = \\frac{${ntex(liters, 6)}}{${ntex(flow)}} = ${ntex(hours, 6)}\\ h` });
  const results = [
    { label: "Besoin en eau de la culture ETc", value: `${fmt(etc, 4)} mm/jour` },
    { label: "Besoin net", value: `${fmt(net, 4)} mm/jour` },
    { label: "Besoin brut d'irrigation", value: `${fmt(gross, 4)} mm/jour`, text: `${fmt(gross, 4)} mm/jour` },
    { label: "Volume quotidien", value: `${fmt(liters, 4)} L/jour`, text: `${fmt(liters, 4)} L/jour` },
    { label: "Volume quotidien en mètres cubes", value: `${fmt(m3, 4)} m³/jour` },
    { label: "Volume hebdomadaire", value: `${fmt(m3 * 7, 4)} m³/semaine` }
  ];
  if (hours !== null) results.push({ label: "Durée d'irrigation quotidienne", value: `${fmt(hours, 4)} heures (${fmt(hours * 60, 4)} minutes)` });
  return {
    results,
    steps,
    copy: `Besoin brut ${fmt(gross, 4)} mm/jour ≈ ${fmt(liters, 4)} L/jour pour une surface de ${fmt(areaM2, 4)} m²`,
    blocks: [{ type: "note", text: "Valeurs moyennes de Kc pour le stade de mi-saison selon la FAO-56 ; elles sont indicatives et varient selon le climat et le stade de croissance." }],
    values: { etc, net, gross, liters, m3, hours }
  };
}
