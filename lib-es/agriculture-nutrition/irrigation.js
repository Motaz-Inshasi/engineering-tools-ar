import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CROPS = { wheat: 1.15, maize: 1.2, tomato: 1.15, potato: 1.15, olive: 0.7, citrus: 0.65, alfalfa: 0.95, grass: 0.95 };
const SYSTEMS = { drip: 0.9, sprinkler: 0.75, surface: 0.6 };
const AREA_M2 = { m2: 1, dunum: 1000, ha: 10000 };

export const meta = {
  description: "Calcule la necesidad diaria de riego a partir de ET0, el coeficiente del cultivo Kc, la lluvia efectiva y la eficiencia del sistema; luego el volumen diario y semanal en litros y metros cúbicos, y el tiempo de riego si indica el caudal.",
  keywords: ["necesidad de riego", "ETc", "ET0", "coeficiente del cultivo Kc", "FAO-56", "eficiencia de riego", "goteo", "irrigation"],
  formulas: [
    { label: "Necesidad hídrica del cultivo", tex: "ET_c = K_c \\cdot ET_0" },
    { label: "Necesidad neta y bruta", tex: "N = \\max(ET_c - P_{eff},\\,0),\\qquad G = \\frac{N}{E_f}" },
    { label: "Volumen diario", tex: "V\\,[L] = G\\,[mm] \\times A\\,[m^2],\\qquad t = \\frac{V}{Q}" }
  ],
  inputs: [
    { id: "et0", label: "Evapotranspiración de referencia ET0", unit: "mm/day", type: "number", default: "5" },
    { id: "crop", label: "Cultivo", type: "select", default: "wheat", options: [["wheat", "Trigo (Kc 1.15)"], ["maize", "Maíz (Kc 1.20)"], ["tomato", "Tomate (Kc 1.15)"], ["potato", "Patata (Kc 1.15)"], ["olive", "Olivo (Kc 0.70)"], ["citrus", "Cítricos (Kc 0.65)"], ["alfalfa", "Alfalfa (Kc 0.95)"], ["grass", "Pasto y pastizal (Kc 0.95)"], ["custom", "Coeficiente personalizado"]] },
    { id: "kc", label: "coeficiente del cultivo Kc", type: "number", default: "1.2", when: { crop: ["custom"] } },
    { id: "rain", label: "Lluvia efectiva", unit: "mm/day", type: "number", default: "0" },
    { id: "area", label: "Superficie", type: "number", default: "1000" },
    { id: "areaUnit", label: "Unidad de superficie", type: "select", default: "m2", options: [["m2", "m²"], ["dunum", "Dunam (1000 m²)"], ["ha", "Hectárea"]] },
    { id: "system", label: "Sistema de riego", type: "select", default: "drip", options: [["drip", "Goteo (eficiencia 0.90)"], ["sprinkler", "Aspersión (eficiencia 0.75)"], ["surface", "Superficial o por inundación (eficiencia 0.60)"]] },
    { id: "flow", label: "Caudal total del sistema (opcional)", unit: "L/h", type: "number", default: "", help: "Deje el campo vacío si no desea calcular el tiempo de funcionamiento." }
  ],
  example: { values: { et0: "5", crop: "custom", kc: "1.2", rain: "0", area: "1000", areaUnit: "m2", system: "drip", flow: "" }, expect: ["6.667 mm", "6667 L"], note: "Ejemplo: ET0 = 5 mm/day y coeficiente 1.2 sobre 1000 m² con goteo." },
  invalid: { values: { et0: "5", crop: "custom", kc: "1.2", rain: "0", area: "0", areaUnit: "m2", system: "drip", flow: "" } },
  related: ["fertilizer-npk", "calorie-needs"]
};

export function solve(input) {
  const et0 = num(input, "et0", "ET0", { nonNegative: true });
  const crop = choice(input, "crop", "Cultivo", [...Object.keys(CROPS), "custom"], "wheat");
  const kc = crop === "custom" ? num(input, "kc", "coeficiente del cultivo Kc", { nonNegative: true }) : CROPS[crop];
  const rain = num(input, "rain", "Lluvia efectiva", { nonNegative: true, default: 0 });
  const areaRaw = num(input, "area", "Superficie", { positive: true });
  const unit = choice(input, "areaUnit", "Unidad de superficie", ["m2", "dunum", "ha"], "m2");
  const sys = choice(input, "system", "Sistema de riego", ["drip", "sprinkler", "surface"], "drip");
  const flow = num(input, "flow", "caudal del sistema", { positive: true, optional: true });
  const eff = SYSTEMS[sys];
  const etc = kc * et0;
  const net = Math.max(etc - rain, 0);
  const gross = net / eff;
  const areaM2 = areaRaw * AREA_M2[unit];
  const liters = gross * areaM2;
  const m3 = liters / 1000;
  const hours = flow ? liters / flow : null;
  const steps = [
    { text: "Necesidad hídrica del cultivo ETc = Kc × ET0:", tex: `ET_c = ${ntex(kc)} \\times ${ntex(et0)} = ${ntex(etc, 6)}\\ mm` },
    { text: "Necesidad neta tras la lluvia efectiva:", tex: `N = \\max(${ntex(etc, 6)} - ${ntex(rain)},\\ 0) = ${ntex(net, 6)}\\ mm` },
    { text: "Necesidad bruta tras la eficiencia del sistema:", tex: `G = \\frac{N}{E_f} = \\frac{${ntex(net, 6)}}{${ntex(eff)}} = ${ntex(gross, 6)}\\ mm` },
    { text: "Volumen diario (1 mm sobre 1 m² = 1 L):", tex: `V = G \\times A = ${ntex(gross, 6)} \\times ${ntex(areaM2, 6)} = ${ntex(liters, 6)}\\ L` }
  ];
  if (hours !== null) steps.push({ text: "Tiempo de funcionamiento diario:", tex: `t = \\frac{V}{Q} = \\frac{${ntex(liters, 6)}}{${ntex(flow)}} = ${ntex(hours, 6)}\\ h` });
  const results = [
    { label: "Necesidad hídrica del cultivo ETc", value: `${fmt(etc, 4)} mm/día` },
    { label: "Necesidad neta", value: `${fmt(net, 4)} mm/día` },
    { label: "Necesidad bruta de riego", value: `${fmt(gross, 4)} mm/día`, text: `${fmt(gross, 4)} mm/día` },
    { label: "Volumen diario", value: `${fmt(liters, 4)} L/día`, text: `${fmt(liters, 4)} L/día` },
    { label: "Volumen diario en metros cúbicos", value: `${fmt(m3, 4)} m³/día` },
    { label: "Volumen semanal", value: `${fmt(m3 * 7, 4)} m³/semana` }
  ];
  if (hours !== null) results.push({ label: "Tiempo de riego diario", value: `${fmt(hours, 4)} horas (${fmt(hours * 60, 4)} minutos)` });
  return {
    results,
    steps,
    copy: `La necesidad bruta ${fmt(gross, 4)} mm/día ≈ ${fmt(liters, 4)} L/día para una superficie de ${fmt(areaM2, 4)} m²`,
    blocks: [{ type: "note", text: "Valores medios de Kc para la fase de mitad de temporada según FAO-56; son aproximados y varían según el clima y la fase de crecimiento." }],
    values: { etc, net, gross, liters, m3, hours }
  };
}
