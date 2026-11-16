import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt, tex as ntex } from "../core/format.js";

const CLASSES = [
  ["Moins de 3", "Généralement imperceptible, enregistré uniquement par les instruments"],
  ["3 – 3.9", "Ressenti près de l'épicentre, le mobilier léger peut vibrer"],
  ["4 – 4.9", "Ressenti largement dans les bâtiments, les objets suspendus oscillent"],
  ["5 – 5.9", "Ressenti par tous, les bâtiments mal conçus peuvent être endommagés"],
  ["6 – 6.9", "Dégâts dans les zones habitées et fissures dans les bâtiments"],
  ["7 – 7.9", "Dégâts graves sur de vastes zones"],
  ["8+", "Destruction totale près de l'épicentre, avec des effets sur de grandes distances"]
];

const LIMITS = [3, 4, 5, 6, 7, 8];

function classOf(M) {
  let i = 0;
  while (i < LIMITS.length && M >= LIMITS[i]) i++;
  return CLASSES[i][0];
}

const CLASS_TABLE = { type: "table", caption: "Classes de magnitude et effets habituels", head: ["Classe de magnitude", "Effet habituel"], rows: CLASSES };

export const meta = {
  description: "Convertissez la magnitude d'un séisme en énergie (joules) et en équivalent TNT, comparez deux séismes par le rapport d'amplitude et d'énergie, ou calculez la magnitude de Richter ML à partir de l'amplitude maximale et de l'intervalle S−P, avec les classes de magnitude et leurs effets.",
  keywords: ["Force du séisme", "Échelle de Richter", "Énergie du séisme", "magnitude", "richter", "TNT", "Séisme"],
  formulas: [
    { label: "Énergie à partir de la magnitude", tex: "\\log_{10} E = 1.5M + 4.8 \\quad (E\\ \\text{en joules})" },
    { label: "Rapport d'amplitude et d'énergie", tex: "\\frac{A_2}{A_1} = 10^{\\Delta M},\\qquad \\frac{E_2}{E_1} = 10^{1.5\\Delta M}" },
    { label: "Magnitude de Richter locale", tex: "M_L = \\log_{10} A + 3\\log_{10}(8\\,\\Delta t) - 2.92" }
  ],
  inputs: [
    { id: "mode", label: "Calcul demandé", type: "select", default: "energy", options: [["energy", "De la magnitude à l'énergie"], ["compare", "Comparaison de deux séismes"], ["richter", "Calcul de la magnitude de Richter à partir de l'amplitude"]] },
    { id: "M", label: "Magnitude M", type: "number", default: "5", when: { mode: ["energy"] } },
    { id: "M1", label: "Première magnitude M1", type: "number", default: "5", when: { mode: ["compare"] } },
    { id: "M2", label: "Deuxième magnitude M2", type: "number", default: "7", when: { mode: ["compare"] } },
    { id: "A", label: "Amplitude maximale de l'onde A", unit: "mm", type: "number", default: "10", when: { mode: ["richter"] } },
    { id: "dt", label: "Intervalle de temps S−P", unit: "s", type: "number", default: "5", when: { mode: ["richter"] }, help: "Différence entre l'arrivée de l'onde P et de l'onde S à la station sismique." }
  ],
  example: { values: { mode: "energy", M: "5", M1: "", M2: "", A: "", dt: "" }, expect: ["E ≈ 1.995 TJ", "476.9 t"], note: "Exemple : séisme de magnitude 5 sur l'échelle de Richter." },
  invalid: { values: { mode: "energy", M: "11", M1: "", M2: "", A: "", dt: "" } },
  related: ["radiometric-dating", "air-quality-index"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Calcul demandé", ["energy", "compare", "richter"], "energy");
  if (mode === "compare") {
    const M1 = num(input, "M1", "Première magnitude", { min: 0, max: 10 });
    const M2 = num(input, "M2", "Deuxième magnitude", { min: 0, max: 10 });
    const d = Math.abs(M2 - M1);
    const amp = Math.pow(10, d);
    const en = Math.pow(10, 1.5 * d);
    const steps = [
      { text: "Écart de magnitude :", tex: `\\Delta M = |M_2 - M_1| = |${ntex(M2)} - ${ntex(M1)}| = ${fmt(d, 6)}` },
      { text: "Rapport d'amplitude (vibration maximale) :", tex: `\\frac{A_2}{A_1} = 10^{\\Delta M} = ${fmt(amp, 6)}` },
      { text: "Rapport de l'énergie libérée :", tex: `\\frac{E_2}{E_1} = 10^{1.5\\Delta M} = ${fmt(en, 6)}` }
    ];
    return {
      results: [
        { label: "Écart de magnitude ΔM", value: fmt(d, 4) },
        { label: "Rapport d'amplitude (vibration maximale)", value: `${fmt(amp, 4)}×` },
        { label: "Rapport de l'énergie libérée", value: `${fmt(en, 4)}×` }
      ],
      steps,
      copy: `ΔM = ${fmt(d, 4)} : rapport d'amplitude ${fmt(amp, 4)}× et rapport d'énergie ${fmt(en, 4)}×`,
      blocks: [CLASS_TABLE],
      values: { d, amp, en }
    };
  }
  if (mode === "richter") {
    const A = num(input, "A", "Amplitude maximale de l'onde", { positive: true });
    const dt = num(input, "dt", "Intervalle de temps S−P", { positive: true });
    const ML = Math.log10(A) + 3 * Math.log10(8 * dt) - 2.92;
    const cls = classOf(ML);
    const steps = [
      { text: "Équation de Richter locale :", tex: "M_L = \\log_{10} A + 3\\log_{10}(8\\,\\Delta t) - 2.92" },
      { text: "Par substitution :", tex: `M_L = \\log_{10} ${ntex(A)} + 3\\log_{10}(8 \\times ${ntex(dt)}) - 2.92 = ${ntex(ML, 6)}` }
    ];
    return {
      results: [
        { label: "Magnitude de Richter ML", value: fmt(ML, 4), text: `ML = ${fmt(ML, 4)}` },
        { label: "Classe du séisme", value: cls }
      ],
      steps,
      copy: `ML ≈ ${fmt(ML, 4)} (${cls})`,
      blocks: [CLASS_TABLE],
      values: { ML }
    };
  }
  const M = num(input, "M", "Magnitude", { min: 0, max: 10 });
  const logE = 1.5 * M + 4.8;
  const E = Math.pow(10, logE);
  const tons = E / 4.184e9;
  const cls = classOf(M);
  const steps = [
    { text: "Relation entre la magnitude et l'énergie :", tex: "\\log_{10} E = 1.5M + 4.8" },
    { text: "Par substitution :", tex: `\\log_{10} E = 1.5 \\times ${ntex(M)} + 4.8 = ${ntex(logE, 6)}` },
    { text: "Énergie en joules :", tex: `E = 10^{${ntex(logE, 6)}} = ${ntex(E, 4)}\\ J` },
    { text: "Équivalent en TNT (1 t = 4.184 × 10^9 J) :", tex: `\\frac{E}{4.184 \\times 10^{9}} = ${ntex(tons, 4)}\\ \\text{t}` }
  ];
  return {
    results: [
      { label: "Énergie libérée", value: eng(E, "J", 4), text: `E = ${eng(E, "J", 4)}` },
      { label: "Équivalent TNT", value: `${fmt(tons, 4)} t` },
      { label: "log10 E", value: fmt(logE, 5) },
      { label: "Classe du séisme", value: cls }
    ],
    steps,
    copy: `M = ${fmt(M)} : E ≈ ${eng(E, "J", 4)} ≈ ${fmt(tons, 4)} t de TNT`,
    blocks: [CLASS_TABLE],
    values: { M, logE, E, tons }
  };
}
