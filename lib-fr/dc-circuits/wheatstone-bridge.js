import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Pont de Wheatstone : tension de sortie et condition d'équilibre, calcul de la résistance inconnue à l'équilibre, et courant du galvanomètre par l'équivalent de Thévenin lorsque sa résistance est saisie.",
  keywords: ["Pont de Wheatstone", "wheatstone", "bridge", "Équilibre du pont", "Résistance inconnue", "Galvanomètre"],
  formulas: [
    { label: "Tension de sortie (R1 au-dessus de R2 à gauche, R3 au-dessus de R4 à droite)", tex: "V_{out} = V_s\\left(\\frac{R_2}{R_1 + R_2} - \\frac{R_4}{R_3 + R_4}\\right)" },
    { label: "Condition d'équilibre", tex: "\\frac{R_1}{R_2} = \\frac{R_3}{R_4} \\;\\Rightarrow\\; R_4 = R_3\\frac{R_2}{R_1}" }
  ],
  inputs: [
    { id: "mode", label: "Grandeur demandée", type: "select", default: "vout", options: [["vout", "Tension de sortie"], ["balance", "R4 inconnue à l'équilibre"]] },
    { id: "Vs", label: "Tension d'alimentation Vs", unit: "V", type: "number", default: "10", when: { mode: ["vout"] } },
    { id: "R1", label: "R1", unit: "Ω", type: "number", default: "1k" },
    { id: "R2", label: "R2", unit: "Ω", type: "number", default: "1k" },
    { id: "R3", label: "R3", unit: "Ω", type: "number", default: "1k" },
    { id: "R4", label: "R4", unit: "Ω", type: "number", default: "1.1k", when: { mode: ["vout"] } },
    { id: "Rg", label: "Résistance du galvanomètre Rg (facultatif)", unit: "Ω", type: "number", when: { mode: ["vout"] } }
  ],
  example: { values: { mode: "vout", Vs: "10", R1: "1k", R2: "1k", R3: "1k", R4: "1.1k", Rg: "" }, expect: ["Vout = -238.1 mV"], note: "Exemple : pont presque équilibré, R4 supérieure de 10 %." },
  invalid: { values: { mode: "vout", Vs: "10", R1: "1k", R2: "-1k", R3: "1k", R4: "1k" } },
  related: ["strain-gauge-bridge", "voltage-current-divider", "thevenin-norton", "rtd"]
};

export function bridge(Vs, R1, R2, R3, R4) {
  return Vs * (R2 / (R1 + R2) - R4 / (R3 + R4));
}

export function solve(input) {
  const mode = choice(input, "mode", "Grandeur demandée", ["vout", "balance"], "vout");
  const R1 = num(input, "R1", "R1", { positive: true }), R2 = num(input, "R2", "R2", { positive: true }), R3 = num(input, "R3", "R3", { positive: true });
  if (mode === "balance") {
    const R4 = (R3 * R2) / R1;
    return {
      results: [{ label: "R4 à l'équilibre", value: eng(R4, "Ω", 5), text: `R4 = ${eng(R4, "Ω", 5)}` }],
      steps: [
        "À l'équilibre, les tensions des deux points milieu sont égales, donc aucun courant ne traverse le galvanomètre ; cela ne dépend pas de la tension d'alimentation.",
        { tex: `\\frac{R_1}{R_2} = \\frac{R_3}{R_4} \\Rightarrow R_4 = R_3\\frac{R_2}{R_1} = ${ntex(R3)} \\times \\frac{${ntex(R2)}}{${ntex(R1)}} = ${ntex(R4, 6)}\\ \\Omega` }
      ],
      copy: `R4 = ${eng(R4, "Ω", 5)}`
    };
  }
  const Vs = num(input, "Vs", "Tension d'alimentation");
  const R4 = num(input, "R4", "R4", { positive: true });
  const Rg = num(input, "Rg", "Résistance du galvanomètre", { optional: true, positive: true });
  const Va = (Vs * R2) / (R1 + R2), Vb = (Vs * R4) / (R3 + R4), Vout = Va - Vb;
  const balanced = Math.abs(R1 * R4 - R2 * R3) <= 1e-12 * R1 * R4;
  const steps = [
    { text: "Tension du point milieu gauche (diviseur R1-R2) :", tex: `V_a = ${ntex(Vs)}\\frac{${ntex(R2)}}{${ntex(R1)} + ${ntex(R2)}} = ${ntex(Va, 6)}\\ V` },
    { text: "Tension du point milieu droit (diviseur R3-R4) :", tex: `V_b = ${ntex(Vs)}\\frac{${ntex(R4)}}{${ntex(R3)} + ${ntex(R4)}} = ${ntex(Vb, 6)}\\ V` },
    { text: "La tension de sortie est la différence entre elles :", tex: `V_{out} = V_a - V_b = ${ntex(Vout, 6)}\\ V` },
    balanced ? "Les deux rapports sont égaux, donc le pont est équilibré." : `Le pont n'est pas équilibré : $R_1 R_4 = ${ntex(R1 * R4, 6)}$ alors que $R_2 R_3 = ${ntex(R2 * R3, 6)}$.`
  ];
  const results = [{ label: "Tension de sortie Vout", value: eng(Vout, "V", 4), text: `Vout = ${eng(Vout, "V", 4)}` }, { label: "Va", value: eng(Va, "V", 5) }, { label: "Vb", value: eng(Vb, "V", 5) }, { label: "État", value: balanced ? "Équilibré" : "Déséquilibré" }];
  if (Rg !== null) {
    const Rth = (R1 * R2) / (R1 + R2) + (R3 * R4) / (R3 + R4);
    const Ig = Vout / (Rth + Rg);
    steps.push({ text: "Par l'équivalent de Thévenin entre les deux points milieu (source court-circuitée) :", tex: `R_{th} = R_1 \\parallel R_2 + R_3 \\parallel R_4 = ${ntex(Rth, 6)}\\ \\Omega,\\quad I_g = \\frac{V_{out}}{R_{th} + R_g} = ${ntex(Ig, 6)}\\ A` });
    results.push({ label: "Résistance de Thévenin du pont", value: eng(Rth, "Ω", 4) }, { label: "Courant du galvanomètre", value: eng(Ig, "A", 4) });
  }
  return { results, steps, copy: `Vout = ${eng(Vout, "V", 4)}` };
}
