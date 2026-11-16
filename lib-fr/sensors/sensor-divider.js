import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";
import { logspaceSafe } from "../dc-circuits/common.js";

export const meta = {
  description: "Concevez un diviseur de tension pour un capteur résistif (thermistance, LDR, potentiomètre) : meilleure résistance fixe pour une plage de sortie maximale, plage de tension et sensibilité, avec la courbe de sortie en fonction de la résistance du capteur.",
  keywords: ["Diviseur de tension du capteur", "LDR", "Thermistance", "Capteur résistif", "Résistance fixe", "Plage de sortie", "sensor divider"],
  formulas: [
    { label: "Capteur en bas", tex: "V_{out} = V_{cc}\\frac{R_s}{R_s + R}" },
    { label: "Résistance optimale pour une plage maximale", tex: "R_{opt} = \\sqrt{R_{s,min} R_{s,max}}" }
  ],
  inputs: [
    { id: "Rmin", label: "Résistance minimale du capteur", unit: "Ω", type: "number", default: "1k" },
    { id: "Rmax", label: "Résistance maximale du capteur", unit: "Ω", type: "number", default: "100k" },
    { id: "Vcc", label: "Tension d'alimentation", unit: "V", type: "number", default: "5" },
    { id: "pos", label: "Position du capteur", type: "select", default: "bottom", options: [["bottom", "En bas (entre la sortie et la masse)"], ["top", "En haut (entre l'alimentation et la sortie)"]] },
    { id: "R", label: "Résistance fixe (facultatif, sinon la valeur optimale est calculée)", unit: "Ω", type: "number" }
  ],
  example: { values: { Rmin: "1k", Rmax: "100k", Vcc: "5", pos: "bottom", R: "" }, expect: ["Ropt = 10 kΩ", "V(Rmax) = 4.545 V"], note: "Exemple : LDR variant de 1 kΩ à 100 kΩ." },
  invalid: { values: { Rmin: "100k", Rmax: "1k", Vcc: "5", pos: "bottom" } },
  related: ["voltage-current-divider", "thermistor", "adc", "level-shifter"]
};

export function vout(Vcc, Rs, R, pos) {
  return pos === "bottom" ? (Vcc * Rs) / (Rs + R) : (Vcc * R) / (Rs + R);
}

export function solve(input) {
  const Rmin = num(input, "Rmin", "Résistance minimale", { positive: true });
  const Rmax = num(input, "Rmax", "Résistance maximale", { positive: true });
  const Vcc = num(input, "Vcc", "Tension d'alimentation", { positive: true });
  const pos = choice(input, "pos", "Position", ["bottom", "top"], "bottom");
  if (Rmax <= Rmin) fail("La résistance maximale doit être supérieure à la résistance minimale.", "Rmax");
  const Ropt = Math.sqrt(Rmin * Rmax);
  const Rin = num(input, "R", "Résistance fixe", { optional: true, positive: true });
  const R = Rin ?? nearest(Ropt, "E24").closest;
  const v1 = vout(Vcc, Rmin, R, pos), v2 = vout(Vcc, Rmax, R, pos);
  const span = Math.abs(v2 - v1);
  const steps = [
    { text: "En dérivant, on trouve que la plage de sortie est maximale lorsque la résistance fixe est égale à la moyenne géométrique des deux extrémités du capteur :", tex: `R_{opt} = \\sqrt{${ntex(Rmin)} \\times ${ntex(Rmax)}} = ${ntex(Ropt, 5)}\\ \\Omega` },
    Rin === null ? `On choisit la valeur normalisée E24 la plus proche : ${eng(R, "Ω")}.` : `On utilise la résistance saisie : ${eng(R, "Ω")}.`,
    { text: "Sortie aux extrémités de la plage du capteur :", tex: `V(R_{min}) = ${ntex(v1, 5)}\\ V,\\quad V(R_{max}) = ${ntex(v2, 5)}\\ V` },
    `Plage de sortie ${fmt(span, 4)} V sur ${fmt(Vcc)} V (${fmt((100 * span) / Vcc, 3)}%). Courant maximal du diviseur ${eng(Vcc / (Rmin + R), "A", 3)} : attention à l'auto-échauffement du capteur.`
  ];
  const xs = logspaceSafe(Rmin / 2, Rmax * 2, 200);
  return {
    results: [
      { label: "Résistance optimale", value: eng(Ropt, "Ω", 4), text: `Ropt = ${eng(Ropt, "Ω", 4)}` },
      { label: "Résistance utilisée", value: eng(R, "Ω") },
      { label: "Sortie à la résistance minimale", value: eng(v1, "V", 4), text: `V(Rmin) = ${eng(v1, "V", 4)}` },
      { label: "Sortie à la résistance maximale", value: eng(v2, "V", 4), text: `V(Rmax) = ${eng(v2, "V", 4)}` },
      { label: "Plage de sortie", value: eng(span, "V", 4) }
    ],
    blocks: [{ type: "plot", title: "Tension de sortie en fonction de la résistance du capteur", logX: true, xLabel: "Rs (Ω)", yLabel: "Vout (V)", series: [{ name: "Vout", points: xs.map((x) => [x, vout(Vcc, x, R, pos)]) }], vlines: [{ x: Rmin }, { x: Rmax }] }],
    steps, copy: `Ropt = ${eng(Ropt, "Ω", 4)}, R = ${eng(R, "Ω")}, V(Rmin) = ${eng(v1, "V", 4)}, V(Rmax) = ${eng(v2, "V", 4)}`
  };
}
