import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Vérifiez un régulateur de tension linéaire (comme 7805 ou LDO) : marge de tension de décrochage, puissance dissipée, rendement, température de jonction et résistance thermique requise pour le dissipateur.",
  keywords: ["Régulateur de tension", "voltage regulator", "LDO", "7805", "Tension de décrochage", "dropout", "Dissipateur thermique", "heatsink", "Température de jonction"],
  formulas: [
    { label: "Puissance et rendement", tex: "P_D = (V_{in} - V_{out})I_L + V_{in}I_Q,\\qquad \\eta = \\frac{V_{out}I_L}{V_{in}(I_L + I_Q)}" },
    { label: "Température", tex: "T_J = T_A + P_D\\,\\theta_{JA},\\qquad \\theta_{SA,max} = \\frac{T_{J,max} - T_A}{P_D} - \\theta_{JC} - \\theta_{CS}" }
  ],
  inputs: [
    { id: "Vin", label: "Tension d'entrée (valeur maximale)", unit: "V", type: "number", default: "12" },
    { id: "Vout", label: "Tension de sortie", unit: "V", type: "number", default: "5" },
    { id: "IL", label: "Courant de charge", unit: "A", type: "number", default: "500m" },
    { id: "Vdo", label: "Tension de décrochage (Dropout)", unit: "V", type: "number", default: "2" },
    { id: "Iq", label: "Courant de repos Iq", unit: "A", type: "number", default: "5m" },
    { id: "Ta", label: "Température ambiante", unit: "°C", type: "number", default: "40" },
    { id: "Tj", label: "Température maximale de jonction", unit: "°C", type: "number", default: "125" },
    { id: "tja", label: "θJA sans dissipateur", unit: "°C/W", type: "number", default: "50" },
    { id: "tjc", label: "θJC", unit: "°C/W", type: "number", default: "5" },
    { id: "tcs", label: "θCS (pâte thermique)", unit: "°C/W", type: "number", default: "0.5" }
  ],
  example: { values: { Vin: "12", Vout: "5", IL: "500m", Vdo: "2", Iq: "5m", Ta: "40", Tj: "125", tja: "50", tjc: "5", tcs: "0.5" }, expect: ["PD = 3.56 W", "θSA ≤ 18.38 °C/W"], note: "Exemple : 7805 alimenté en 12 V avec un courant de 500 mA." },
  invalid: { values: { Vin: "6", Vout: "5", IL: "500m", Vdo: "2", Iq: "5m", Ta: "40", Tj: "125", tja: "50", tjc: "5", tcs: "0.5" } },
  related: ["zener-regulator", "rectifier-ripple", "led-resistor"]
};

export function solve(input) {
  const Vin = num(input, "Vin", "Tension d'entrée", { positive: true });
  const Vout = num(input, "Vout", "Tension de sortie", { positive: true });
  const IL = num(input, "IL", "Courant de charge", { nonNegative: true });
  const Vdo = num(input, "Vdo", "Tension de décrochage", { nonNegative: true });
  const Iq = num(input, "Iq", "Courant de repos", { nonNegative: true, default: 0 });
  const Ta = num(input, "Ta", "Température ambiante", { min: -60, max: 150 });
  const Tjmax = num(input, "Tj", "Température maximale de jonction", { min: 50, max: 200 });
  const tja = num(input, "tja", "θJA", { positive: true });
  const tjc = num(input, "tjc", "θJC", { nonNegative: true, default: 0 });
  const tcs = num(input, "tcs", "θCS", { nonNegative: true, default: 0 });
  if (Vin < Vout + Vdo) fail(`La tension d'entrée ${fmt(Vin)} V est inférieure au minimum ${fmt(Vout + Vdo)} V (sortie + tension de décrochage) : le régulateur ne pourra pas réguler.`, "Vin");
  if (Tjmax <= Ta) fail("La température maximale de jonction doit être supérieure à la température ambiante.", "Tj");
  const PD = (Vin - Vout) * IL + Vin * Iq;
  const eff = IL > 0 ? (Vout * IL) / (Vin * (IL + Iq)) : 0;
  const TjNoHs = Ta + PD * tja;
  const PDmax = (Tjmax - Ta) / tja;
  const steps = [
    `La marge de tension de ${fmt(Vin - Vout - Vdo, 4)} V au-dessus de la tension de décrochage est suffisante : le régulateur fonctionne.`,
    { text: "Puissance dissipée (écart de tension × courant + consommation du régulateur) :", tex: `P_D = (${ntex(Vin)} - ${ntex(Vout)}) \\times ${ntex(IL)} + ${ntex(Vin)} \\times ${ntex(Iq)} = ${ntex(PD, 4)}\\ W` },
    { text: "Rendement :", tex: `\\eta = \\frac{${ntex(Vout)} \\times ${ntex(IL)}}{${ntex(Vin)} \\times (${ntex(IL)} + ${ntex(Iq)})} = ${ntex(100 * eff, 4)}\\%` },
    { text: "Température de jonction sans dissipateur :", tex: `T_J = ${ntex(Ta)} + ${ntex(PD, 4)} \\times ${ntex(tja)} = ${ntex(TjNoHs, 4)}^\\circ C` }
  ];
  const results = [
    { label: "Puissance dissipée", value: eng(PD, "W", 3), text: `PD = ${eng(PD, "W", 3)}` },
    { label: "Rendement", value: `${fmt(100 * eff, 4)}%` },
    { label: "Température de jonction sans dissipateur", value: `${fmt(TjNoHs, 4)} °C` },
    { label: "Puissance maximale sans dissipateur", value: eng(PDmax, "W", 3) }
  ];
  let copy = `PD = ${eng(PD, "W", 3)}, η = ${fmt(100 * eff, 4)}%, Tj = ${fmt(TjNoHs, 4)} °C`;
  if (TjNoHs > Tjmax) {
    const tsa = (Tjmax - Ta) / PD - tjc - tcs;
    if (tsa <= 0) {
      steps.push("Même avec un dissipateur idéal, cette puissance ne peut pas être dissipée en sécurité : utilisez un régulateur à découpage (Buck) ou réduisez la tension d'entrée.");
      results.push({ label: "Verdict", value: "Impossible avec un régulateur linéaire : utilisez un régulateur à découpage" });
    } else {
      steps.push({ text: "La température dépasse la limite : il faut un dissipateur dont la résistance thermique ne dépasse pas :", tex: `\\theta_{SA} \\le \\frac{${ntex(Tjmax)} - ${ntex(Ta)}}{${ntex(PD, 4)}} - ${ntex(tjc)} - ${ntex(tcs)} = ${ntex(tsa, 4)}^\\circ C/W` });
      results.push({ label: "Verdict", value: "Un dissipateur thermique est nécessaire" }, { label: "θSA maximale du dissipateur", value: `${fmt(tsa, 4)} °C/W`, text: `θSA ≤ ${fmt(tsa, 4)} °C/W` });
      copy += `\nθSA ≤ ${fmt(tsa, 4)} °C/W`;
    }
  } else {
    steps.push("La température est dans la limite : aucun dissipateur n'est nécessaire (une marge de sécurité d'au moins 20 °C est préférable).");
    results.push({ label: "Verdict", value: TjNoHs > Tjmax - 20 ? "Acceptable mais proche de la limite" : "Aucun dissipateur nécessaire" });
  }
  return { results, steps, copy };
}
