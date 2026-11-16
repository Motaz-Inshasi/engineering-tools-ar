import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Minuterie 555 en modes astable (oscillateur) et monostable : fréquence, rapport cyclique, durées de montée et de descente, largeur d'impulsion et forme du signal de sortie.",
  keywords: ["555", "Minuterie 555", "timer", "astable", "monostable", "Oscillateur", "Impulsion", "Rapport cyclique", "duty cycle"],
  formulas: [
    { label: "Astable (oscillateur libre)", tex: "t_H = \\ln 2\\,(R_1 + R_2)C,\\quad t_L = \\ln 2\\,R_2 C,\\quad f = \\frac{1}{t_H + t_L} \\approx \\frac{1.44}{(R_1 + 2R_2)C}" },
    { label: "Monostable", tex: "t = \\ln 3\\,RC \\approx 1.1\\,RC" }
  ],
  inputs: [
    { id: "mode", label: "Mode", type: "select", default: "astable", options: [["astable", "Astable (oscillateur)"], ["mono", "Monostable (impulsion unique)"]] },
    { id: "R1", label: "R1", unit: "Ω", type: "number", default: "1k", when: { mode: ["astable"] } },
    { id: "R2", label: "R2", unit: "Ω", type: "number", default: "10k", when: { mode: ["astable"] } },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "100k", when: { mode: ["mono"] } },
    { id: "C", label: "C", unit: "F", type: "number", default: "100n" }
  ],
  example: { values: { mode: "astable", R1: "1k", R2: "10k", C: "100n" }, expect: ["f = 687 Hz", "52.38%"], note: "Exemple : R1 = 1 kΩ, R2 = 10 kΩ et C = 100 nF." },
  invalid: { values: { mode: "astable", R1: "1k", R2: "0", C: "100n" } },
  related: ["rc-rl-transient", "pwm-servo", "capacitor-inductor-combination"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Mode", ["astable", "mono"], "astable");
  const C = num(input, "C", "C", { positive: true });
  const L2 = Math.LN2, L3 = Math.log(3);
  if (mode === "mono") {
    const R = num(input, "R", "R", { positive: true });
    const t = L3 * R * C;
    return {
      results: [{ label: "Largeur d'impulsion", value: eng(t, "s", 4), text: `t = ${eng(t, "s", 4)}` }],
      steps: [
        "À l'impulsion de déclenchement, la sortie monte et le condensateur se charge à travers R jusqu'à atteindre 2/3 de la tension d'alimentation, puis la sortie descend.",
        { text: "Durée de charge de 0 à ⅔Vcc :", tex: `t = RC\\ln 3 = ${ntex(R)} \\times ${ntex(C)} \\times 1.0986 = ${ntex(t, 5)}\\ s` },
        "Le résultat ne dépend pas de la tension d'alimentation, car les seuils de comparaison en sont une fraction."
      ],
      copy: `t = ${eng(t, "s", 4)}`
    };
  }
  const R1 = num(input, "R1", "R1", { positive: true }), R2 = num(input, "R2", "R2", { positive: true });
  if (R1 < 1) fail("R1 est trop petite et peut endommager la broche de décharge (il est préférable d'avoir au moins 1 kΩ).", "R1");
  const tH = L2 * (R1 + R2) * C, tL = L2 * R2 * C, T = tH + tL, f = 1 / T, D = tH / T;
  const steps = [
    "La tension du condensateur oscille entre ⅓Vcc et ⅔Vcc : il se charge à travers R1 + R2 (sortie haute) et se décharge à travers R2 seul (sortie basse).",
    { text: "Durées de montée et de descente :", tex: `t_H = \\ln 2 (${ntex(R1)} + ${ntex(R2)})(${ntex(C)}) = ${ntex(tH, 5)}\\ s,\\quad t_L = \\ln 2 \\cdot ${ntex(R2)} \\cdot ${ntex(C)} = ${ntex(tL, 5)}\\ s` },
    { text: "Fréquence et rapport cyclique :", tex: `f = \\frac{1}{t_H + t_L} = ${ntex(f, 5)}\\ Hz,\\quad D = \\frac{t_H}{t_H + t_L} = ${ntex(100 * D, 4)}\\%` },
    "Dans ce montage, le rapport cyclique est toujours supérieur à 50 % ; pour obtenir moins, il faut ajouter une diode en parallèle sur R2."
  ];
  const pts = [];
  for (let k = 0; k < 3; k++) {
    const t0 = k * T;
    pts.push([t0, 0], [t0, 1], [t0 + tH, 1], [t0 + tH, 0], [t0 + T, 0]);
  }
  return {
    results: [
      { label: "Fréquence", value: eng(f, "Hz", 4), text: `f = ${eng(f, "Hz", 4)}` },
      { label: "Rapport cyclique", value: `${fmt(100 * D, 4)}%`, text: `D = ${fmt(100 * D, 4)}%` },
      { label: "Durée de montée tH", value: eng(tH, "s", 4) },
      { label: "Durée de descente tL", value: eng(tL, "s", 4) },
      { label: "Période T", value: eng(T, "s", 4) }
    ],
    blocks: [{ type: "plot", title: "Forme du signal de sortie (trois cycles)", xLabel: "t (s)", yLabel: "Sortie", yMin: -0.2, yMax: 1.3, series: [{ name: "Sortie", points: pts }] }],
    steps, copy: `f = ${eng(f, "Hz", 4)}, D = ${fmt(100 * D, 4)}%, tH = ${eng(tH, "s", 4)}, tL = ${eng(tL, "s", 4)}`
  };
}
