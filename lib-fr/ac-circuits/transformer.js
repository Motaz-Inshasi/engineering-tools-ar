import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Transformateur idéal : rapport de transformation, tensions et courants du primaire et du secondaire, impédance ramenée, avec la puissance et un rendement facultatif pour calculer la puissance d'entrée et les pertes.",
  keywords: ["Transformateur", "transformer", "Rapport de transformation", "Nombre de spires", "Primaire", "Secondaire", "Impédance ramenée", "Élévateur", "Abaisseur"],
  formulas: [
    { label: "Transformateur idéal", tex: "a = \\frac{N_1}{N_2} = \\frac{V_1}{V_2} = \\frac{I_2}{I_1}" },
    { label: "Impédance ramenée", tex: "Z_1' = a^2 Z_L" }
  ],
  inputs: [
    { id: "N1", label: "Spires du primaire N1", type: "number", default: "1000" },
    { id: "N2", label: "Spires du secondaire N2", type: "number", default: "50" },
    { id: "V1", label: "Tension du primaire V1", unit: "V", type: "number", default: "230" },
    { id: "RL", label: "Résistance de charge au secondaire", unit: "Ω", type: "number", default: "5" },
    { id: "eff", label: "Rendement (facultatif)", unit: "%", type: "number" }
  ],
  example: { values: { N1: "1000", N2: "50", V1: "230", RL: "5", eff: "" }, expect: ["V2 = 11.5 V", "I1 = 115 mA"], note: "Exemple : transformateur abaisseur 20:1 à partir de 230 V pour une charge de 5 Ω." },
  invalid: { values: { N1: "1000", N2: "0", V1: "230", RL: "5" } },
  related: ["three-phase", "complex-power", "max-power-transfer", "rectifier-ripple"]
};

export function solve(input) {
  const N1 = num(input, "N1", "Spires du primaire", { positive: true });
  const N2 = num(input, "N2", "Spires du secondaire", { positive: true });
  const V1 = num(input, "V1", "Tension du primaire", { positive: true });
  const RL = num(input, "RL", "Résistance de charge", { positive: true });
  const eff = num(input, "eff", "Rendement", { optional: true, positive: true, max: 100 });
  const a = N1 / N2;
  const V2 = V1 / a, I2 = V2 / RL, I1 = I2 / a, Zin = a * a * RL, P = V2 * I2;
  const kind = a > 1 ? "Abaisseur de tension" : a < 1 ? "Élévateur de tension" : "Isolateur (1:1)";
  const steps = [
    { text: `Rapport de transformation (transformateur ${kind}) :`, tex: `a = \\frac{N_1}{N_2} = \\frac{${ntex(N1)}}{${ntex(N2)}} = ${ntex(a, 6)}` },
    { text: "Tension du secondaire :", tex: `V_2 = \\frac{V_1}{a} = \\frac{${ntex(V1)}}{${ntex(a, 6)}} = ${ntex(V2, 6)}\\ V` },
    { text: "Courant de charge puis courant du primaire (le courant est inversement proportionnel à la tension) :", tex: `I_2 = \\frac{V_2}{R_L} = ${ntex(I2, 6)}\\ A,\\quad I_1 = \\frac{I_2}{a} = ${ntex(I1, 6)}\\ A` },
    { text: "Impédance vue par la source :", tex: `Z_{in} = a^2 R_L = ${ntex(a, 6)}^2 \\times ${ntex(RL)} = ${ntex(Zin, 6)}\\ \\Omega` },
    `Dans un transformateur idéal, la puissance se conserve : $V_1 I_1 = ${fmt(V1 * I1, 6)}$ W = $V_2 I_2 = ${fmt(P, 6)}$ W.`
  ];
  const results = [
    { label: "Rapport de transformation a", value: a, sig: 6 },
    { label: "Type", value: kind },
    { label: "Tension du secondaire V2", value: eng(V2, "V", 4), text: `V2 = ${eng(V2, "V", 4)}` },
    { label: "Courant du secondaire I2", value: eng(I2, "A", 4) },
    { label: "Courant du primaire I1", value: eng(I1, "A", 4), text: `I1 = ${eng(I1, "A", 4)}` },
    { label: "Impédance ramenée", value: eng(Zin, "Ω", 4) },
    { label: "Puissance de la charge", value: eng(P, "W", 4) }
  ];
  if (eff !== null) {
    const Pin = P / (eff / 100);
    results.push({ label: "Puissance d'entrée", value: eng(Pin, "W", 4) }, { label: "Pertes", value: eng(Pin - P, "W", 4) }, { label: "Courant réel du primaire", value: eng(Pin / V1, "A", 4) });
    steps.push({ text: `Avec un rendement de ${fmt(eff)}% :`, tex: `P_{in} = \\frac{P_{out}}{\\eta} = ${ntex(Pin, 6)}\\ W,\\quad P_{loss} = ${ntex(Pin - P, 6)}\\ W` });
  }
  if (!isFinite(V2)) fail("Valeurs non valides.", "N2");
  return { results, steps, copy: `V2 = ${eng(V2, "V", 4)}, I2 = ${eng(I2, "A", 4)}, I1 = ${eng(I1, "A", 4)}` };
}
