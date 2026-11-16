import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "Concevez un régulateur à diode Zener avec résistance série : plage admissible de la résistance, valeur normalisée choisie, courant et puissance de la Zener dans les pires cas, lorsque la tension d'entrée et la charge varient.",
  keywords: ["Zener", "zener", "Régulateur Zener", "Résistance série", "Régulation de tension", "Puissance de la Zener"],
  formulas: [
    { label: "Résistance série maximale (pire cas : tension d'entrée minimale et charge maximale)", tex: "R_{s,max} = \\frac{V_{in,min} - V_Z}{I_{L,max} + I_{Z,min}}" },
    { label: "Courant et puissance maximaux de la Zener (tension d'entrée maximale et charge minimale)", tex: "I_{Z,max} = \\frac{V_{in,max} - V_Z}{R_s} - I_{L,min},\\quad P_Z = V_Z I_{Z,max}" }
  ],
  inputs: [
    { id: "Vmin", label: "Tension d'entrée minimale", unit: "V", type: "number", default: "10" },
    { id: "Vmax", label: "Tension d'entrée maximale", unit: "V", type: "number", default: "14" },
    { id: "Vz", label: "Tension Zener Vz", unit: "V", type: "number", default: "5.1" },
    { id: "ILmax", label: "Courant de charge maximal", unit: "A", type: "number", default: "50m" },
    { id: "ILmin", label: "Courant de charge minimal", unit: "A", type: "number", default: "0" },
    { id: "Izmin", label: "Courant Zener minimal pour la régulation", unit: "A", type: "number", default: "5m" },
    { id: "Pz", label: "Puissance nominale de la Zener (facultatif)", unit: "W", type: "number", default: "1" }
  ],
  example: { values: { Vmin: "10", Vmax: "14", Vz: "5.1", ILmax: "50m", ILmin: "0", Izmin: "5m", Pz: "1" }, expect: ["Rs,max = 89.09 Ω", "Rs = 82 Ω"], note: "Exemple : régulation de 5.1 V à partir d'une entrée de 10 à 14 V, pour une charge allant jusqu'à 50 mA." },
  invalid: { values: { Vmin: "4", Vmax: "14", Vz: "5.1", ILmax: "50m", Izmin: "5m" } },
  related: ["voltage-regulator", "rectifier-ripple", "led-resistor"]
};

export function solve(input) {
  const Vmin = num(input, "Vmin", "Tension d'entrée minimale", { positive: true });
  const Vmax = num(input, "Vmax", "Tension d'entrée maximale", { positive: true });
  const Vz = num(input, "Vz", "Tension Zener", { positive: true });
  const ILmax = num(input, "ILmax", "Courant de charge maximal", { nonNegative: true });
  const ILmin = num(input, "ILmin", "Courant de charge minimal", { nonNegative: true, default: 0 });
  const Izmin = num(input, "Izmin", "Courant Zener minimal", { positive: true });
  const Pz = num(input, "Pz", "Puissance de la Zener", { optional: true, positive: true });
  if (Vmax < Vmin) fail("La tension d'entrée maximale ne doit pas être inférieure à la tension minimale.", "Vmax");
  if (ILmin > ILmax) fail("Le courant de charge minimal ne doit pas dépasser le maximal.", "ILmin");
  if (Vmin <= Vz) fail(`La tension d'entrée minimale doit être supérieure à la tension Zener (${fmt(Vz)} V) pour rester en régulation.`, "Vmin");
  const RsMax = (Vmin - Vz) / (ILmax + Izmin);
  const Rs = nearest(RsMax, "E12").below;
  const IzMax = (Vmax - Vz) / Rs - ILmin;
  const PzMax = Vz * IzMax;
  const PRs = Math.pow(Vmax - Vz, 2) / Rs;
  const IzAtMin = (Vmin - Vz) / Rs - ILmax;
  const steps = [
    { text: "Pire cas de régulation : tension d'entrée minimale et courant de charge maximal ; la Zener doit rester à au moins Iz,min :", tex: `R_{s,max} = \\frac{${ntex(Vmin)} - ${ntex(Vz)}}{${ntex(ILmax)} + ${ntex(Izmin)}} = ${ntex(RsMax, 5)}\\ \\Omega` },
    `On choisit la valeur normalisée E12 immédiatement inférieure : $R_s = ${ntex(Rs)}\\ \\Omega$, ce qui donne, dans le pire cas, un courant Zener de ${eng(IzAtMin, "A", 4)}.`,
    { text: "Pire cas de puissance : tension d'entrée maximale et charge minimale, donc le courant Zener est maximal :", tex: `I_{Z,max} = \\frac{${ntex(Vmax)} - ${ntex(Vz)}}{${ntex(Rs)}} - ${ntex(ILmin)} = ${ntex(IzMax, 5)}\\ A,\\quad P_Z = ${ntex(PzMax, 5)}\\ W` },
    { text: "Puissance dans la résistance série (pire cas) :", tex: `P_{R} = \\frac{(${ntex(Vmax)} - ${ntex(Vz)})^2}{${ntex(Rs)}} = ${ntex(PRs, 5)}\\ W` }
  ];
  const results = [
    { label: "Résistance série maximale admise", value: eng(RsMax, "Ω", 4), text: `Rs,max = ${eng(RsMax, "Ω", 4)}` },
    { label: "Résistance choisie (E12)", value: eng(Rs, "Ω"), text: `Rs = ${eng(Rs, "Ω")}` },
    { label: "Courant maximal dans la Zener", value: eng(IzMax, "A", 4) },
    { label: "Puissance maximale dans la Zener", value: eng(PzMax, "W", 4) },
    { label: "Puissance maximale dans la résistance", value: eng(PRs, "W", 4) }
  ];
  if (Pz !== null) {
    const ok = PzMax <= Pz;
    results.push({ label: "Verdict", value: ok ? `Adapté (${fmt((100 * PzMax) / Pz, 3)} % de la puissance de la Zener)` : "La Zener va surchauffer : choisissez une Zener de puissance supérieure ou réduisez la plage d'entrée" });
    steps.push(ok ? `La puissance ${fmt(PzMax, 4)} W est inférieure à la puissance nominale ${fmt(Pz)} W.` : `La puissance ${fmt(PzMax, 4)} W dépasse la puissance nominale ${fmt(Pz)} W.`);
  }
  return { results, steps, copy: `Rs,max = ${eng(RsMax, "Ω", 4)}, Rs = ${eng(Rs, "Ω")}, Iz,max = ${eng(IzMax, "A", 4)}, Pz = ${eng(PzMax, "W", 4)}` };
}
