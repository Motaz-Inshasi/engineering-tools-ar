import { numList, choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Diviseur de tension à deux résistances avec effet de charge, et diviseur de courant pour un nombre quelconque de branches en parallèle, avec les étapes et la vérification par les lois de Kirchhoff.",
  keywords: ["Diviseur de tension", "Diviseur de courant", "voltage divider", "current divider", "Effet de charge", "loading"],
  formulas: [
    { label: "Diviseur de tension", tex: "V_{out} = V_{in}\\frac{R_2}{R_1 + R_2}" },
    { label: "Diviseur de courant", tex: "I_k = I_T \\frac{G_k}{\\sum G_i} = I_T\\frac{1/R_k}{\\sum 1/R_i}" }
  ],
  inputs: [
    { id: "mode", label: "Type", type: "select", default: "voltage", options: [["voltage", "Diviseur de tension"], ["current", "Diviseur de courant"]] },
    { id: "Vin", label: "Tension d'entrée Vin", unit: "V", type: "number", default: "12", when: { mode: ["voltage"] } },
    { id: "R1", label: "R1 (supérieure)", unit: "Ω", type: "number", default: "10k", when: { mode: ["voltage"] } },
    { id: "R2", label: "R2 (inférieure)", unit: "Ω", type: "number", default: "4.7k", when: { mode: ["voltage"] } },
    { id: "RL", label: "Résistance de charge sur R2 (facultatif)", unit: "Ω", type: "number", when: { mode: ["voltage"] } },
    { id: "IT", label: "Courant total IT", unit: "A", type: "number", default: "10m", when: { mode: ["current"] } },
    { id: "list", label: "Résistances des branches en parallèle", unit: "Ω", type: "text", default: "1k, 2.2k, 4.7k", when: { mode: ["current"] } }
  ],
  example: { values: { mode: "voltage", Vin: "12", R1: "10k", R2: "4.7k", RL: "10k" }, expect: ["Vout = 2.907 V"], note: "Exemple : diviseur 10k et 4.7k alimenté sous 12 V, avec une charge de 10k qui réduit la sortie." },
  invalid: { values: { mode: "voltage", Vin: "12", R1: "0", R2: "4.7k" } },
  related: ["series-parallel-resistors", "sensor-divider", "level-shifter", "wheatstone-bridge"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Type", ["voltage", "current"], "voltage");
  if (mode === "voltage") {
    const Vin = num(input, "Vin", "Tension d'entrée");
    const R1 = num(input, "R1", "R1", { positive: true });
    const R2 = num(input, "R2", "R2", { positive: true });
    const RL = num(input, "RL", "Résistance de charge", { optional: true, positive: true });
    const unloaded = (Vin * R2) / (R1 + R2);
    const steps = [{ text: "Sans charge :", tex: `V_{out} = ${ntex(Vin)} \\times \\frac{${ntex(R2)}}{${ntex(R1)} + ${ntex(R2)}} = ${ntex(unloaded, 6)}\\ V` }];
    let Vout = unloaded, R2eff = R2;
    const results = [];
    if (RL !== null) {
      R2eff = (R2 * RL) / (R2 + RL);
      Vout = (Vin * R2eff) / (R1 + R2eff);
      steps.push({ text: "La charge est en parallèle avec R2 et réduit sa résistance effective :", tex: `R_2 \\parallel R_L = \\frac{${ntex(R2)} \\times ${ntex(RL)}}{${ntex(R2)} + ${ntex(RL)}} = ${ntex(R2eff, 6)}\\ \\Omega` });
      steps.push({ tex: `V_{out} = ${ntex(Vin)} \\times \\frac{${ntex(R2eff, 6)}}{${ntex(R1)} + ${ntex(R2eff, 6)}} = ${ntex(Vout, 6)}\\ V` });
      steps.push(`La sortie a baissé de ${fmt((100 * (unloaded - Vout)) / (unloaded || 1), 4)}% à cause de la charge. Pour réduire cet effet, rendez la charge au moins dix fois supérieure à R2.`);
      results.push({ label: "Tension sans charge", value: eng(unloaded, "V", 4) });
    }
    const I = Vin / (R1 + R2eff);
    steps.push({ text: "Courant du diviseur et vérification KVL :", tex: `I = \\frac{V_{in}}{R_1 + R_{2,eff}} = ${ntex(I, 6)}\\ A,\\quad I R_1 + V_{out} = ${ntex(I * R1 + Vout, 8)}\\ V` });
    return {
      results: [{ label: "Tension de sortie Vout", value: eng(Vout, "V", 4), text: `Vout = ${eng(Vout, "V", 4)}` }, ...results, { label: "Rapport de division", value: Vout / Vin, sig: 6 }, { label: "Courant du diviseur", value: eng(I, "A", 4) }, { label: "Puissance dans R1", value: eng(I * I * R1, "W", 4) }],
      steps, copy: `Vout = ${eng(Vout, "V", 4)}`
    };
  }
  const IT = num(input, "IT", "Courant total");
  const list = numList(input, "list", "Résistances des branches", { positive: true, min: 2, max: 20 });
  const Gt = list.reduce((s, r) => s + 1 / r, 0);
  const V = IT / Gt;
  const currents = list.map((r) => V / r);
  const steps = [
    { text: "Somme des conductances :", tex: `G_T = ${list.map((r) => `\\frac{1}{${ntex(r)}}`).join(" + ")} = ${ntex(Gt, 6)}\\ S` },
    { text: "Tension commune aux branches :", tex: `V = \\frac{I_T}{G_T} = ${ntex(V, 6)}\\ V` },
    ...list.map((r, k) => ({ tex: `I_{${k + 1}} = I_T\\frac{1/${ntex(r)}}{G_T} = ${ntex(currents[k], 6)}\\ A` })),
    `Vérification KCL : somme des courants des branches = ${eng(currents.reduce((a, b) => a + b, 0), "A", 6)}, égale au courant total.`
  ];
  if (list.length === 2) steps.push(`Pour deux branches seulement : $I_1 = I_T \\frac{R_2}{R_1 + R_2}$, c'est-à-dire que la branche de plus faible résistance prend le courant le plus élevé.`);
  return {
    results: [...currents.map((c, k) => ({ label: `Courant de la branche ${k + 1} (R = ${eng(list[k], "Ω")})`, value: eng(c, "A", 4), text: `I${k + 1} = ${eng(c, "A", 4)}` })), { label: "Tension commune", value: eng(V, "V", 4) }],
    steps, copy: currents.map((c, k) => `I${k + 1} = ${eng(c, "A", 4)}`).join("\n")
  };
}
