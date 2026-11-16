import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt, tex as ntex } from "../core/format.js";

const CLASSES = [
  ["Menos de 3", "Normalmente no se siente; solo se registra con instrumentos"],
  ["3 – 3.9", "Se siente cerca del epicentro; puede agitar muebles ligeros"],
  ["4 – 4.9", "Se siente ampliamente dentro de los edificios; los objetos colgantes se balancean"],
  ["5 – 5.9", "Lo siente todo el mundo; pueden dañarse los edificios mal diseñados"],
  ["6 – 6.9", "Daños en zonas pobladas y grietas en los edificios"],
  ["7 – 7.9", "Daños graves en áreas extensas"],
  ["8+", "Destrucción total cerca del epicentro, con efectos a grandes distancias"]
];

const LIMITS = [3, 4, 5, 6, 7, 8];

function classOf(M) {
  let i = 0;
  while (i < LIMITS.length && M >= LIMITS[i]) i++;
  return CLASSES[i][0];
}

const CLASS_TABLE = { type: "table", caption: "Clases de magnitud y sus efectos habituales", head: ["Clase de magnitud", "Efecto habitual"], rows: CLASSES };

export const meta = {
  description: "Convierta la magnitud de un sismo a energía en julios y en equivalente de TNT, compare dos sismos por su razón de amplitudes y de energía, o calcule la magnitud de Richter ML a partir de la amplitud máxima y el intervalo S−P, con sus clases y efectos.",
  keywords: ["Fuerza del sismo", "Escala de Richter", "Energía del sismo", "magnitude", "richter", "TNT", "Sismo"],
  formulas: [
    { label: "Energía a partir de la magnitud", tex: "\\log_{10} E = 1.5M + 4.8 \\quad (E\\ \\text{en julios})" },
    { label: "Razón de amplitudes y de energías", tex: "\\frac{A_2}{A_1} = 10^{\\Delta M},\\qquad \\frac{E_2}{E_1} = 10^{1.5\\Delta M}" },
    { label: "Magnitud local de Richter", tex: "M_L = \\log_{10} A + 3\\log_{10}(8\\,\\Delta t) - 2.92" }
  ],
  inputs: [
    { id: "mode", label: "Cálculo requerido", type: "select", default: "energy", options: [["energy", "De la magnitud a la energía"], ["compare", "Comparar dos sismos"], ["richter", "Calcular la magnitud de Richter a partir de la amplitud"]] },
    { id: "M", label: "Magnitud M", type: "number", default: "5", when: { mode: ["energy"] } },
    { id: "M1", label: "Primera magnitud M1", type: "number", default: "5", when: { mode: ["compare"] } },
    { id: "M2", label: "Segunda magnitud M2", type: "number", default: "7", when: { mode: ["compare"] } },
    { id: "A", label: "Amplitud máxima de la onda A", unit: "mm", type: "number", default: "10", when: { mode: ["richter"] } },
    { id: "dt", label: "Intervalo de tiempo S−P", unit: "s", type: "number", default: "5", when: { mode: ["richter"] }, help: "Diferencia entre la llegada de la onda P y la de la onda S a la estación sismológica." }
  ],
  example: { values: { mode: "energy", M: "5", M1: "", M2: "", A: "", dt: "" }, expect: ["E ≈ 1.995 TJ", "476.9 t"], note: "Ejemplo: sismo de magnitud 5 en la escala de Richter." },
  invalid: { values: { mode: "energy", M: "11", M1: "", M2: "", A: "", dt: "" } },
  related: ["radiometric-dating", "air-quality-index"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Cálculo requerido", ["energy", "compare", "richter"], "energy");
  if (mode === "compare") {
    const M1 = num(input, "M1", "Primera magnitud", { min: 0, max: 10 });
    const M2 = num(input, "M2", "Segunda magnitud", { min: 0, max: 10 });
    const d = Math.abs(M2 - M1);
    const amp = Math.pow(10, d);
    const en = Math.pow(10, 1.5 * d);
    const steps = [
      { text: "Diferencia de magnitud:", tex: `\\Delta M = |M_2 - M_1| = |${ntex(M2)} - ${ntex(M1)}| = ${fmt(d, 6)}` },
      { text: "Razón de amplitudes (vibración máxima):", tex: `\\frac{A_2}{A_1} = 10^{\\Delta M} = ${fmt(amp, 6)}` },
      { text: "Razón de energía liberada:", tex: `\\frac{E_2}{E_1} = 10^{1.5\\Delta M} = ${fmt(en, 6)}` }
    ];
    return {
      results: [
        { label: "Diferencia de magnitud ΔM", value: fmt(d, 4) },
        { label: "Razón de amplitudes (vibración máxima)", value: `${fmt(amp, 4)}×` },
        { label: "Razón de energía liberada", value: `${fmt(en, 4)}×` }
      ],
      steps,
      copy: `ΔM = ${fmt(d, 4)}: razón de amplitudes ${fmt(amp, 4)}× y razón de energía ${fmt(en, 4)}×`,
      blocks: [CLASS_TABLE],
      values: { d, amp, en }
    };
  }
  if (mode === "richter") {
    const A = num(input, "A", "Amplitud máxima de la onda", { positive: true });
    const dt = num(input, "dt", "Intervalo de tiempo S−P", { positive: true });
    const ML = Math.log10(A) + 3 * Math.log10(8 * dt) - 2.92;
    const cls = classOf(ML);
    const steps = [
      { text: "Ecuación local de Richter:", tex: "M_L = \\log_{10} A + 3\\log_{10}(8\\,\\Delta t) - 2.92" },
      { text: "Sustituyendo:", tex: `M_L = \\log_{10} ${ntex(A)} + 3\\log_{10}(8 \\times ${ntex(dt)}) - 2.92 = ${ntex(ML, 6)}` }
    ];
    return {
      results: [
        { label: "Magnitud de Richter ML", value: fmt(ML, 4), text: `ML = ${fmt(ML, 4)}` },
        { label: "Clase del sismo", value: cls }
      ],
      steps,
      copy: `ML ≈ ${fmt(ML, 4)} (${cls})`,
      blocks: [CLASS_TABLE],
      values: { ML }
    };
  }
  const M = num(input, "M", "Magnitud", { min: 0, max: 10 });
  const logE = 1.5 * M + 4.8;
  const E = Math.pow(10, logE);
  const tons = E / 4.184e9;
  const cls = classOf(M);
  const steps = [
    { text: "Relación entre magnitud y energía:", tex: "\\log_{10} E = 1.5M + 4.8" },
    { text: "Sustituyendo:", tex: `\\log_{10} E = 1.5 \\times ${ntex(M)} + 4.8 = ${ntex(logE, 6)}` },
    { text: "Energía en julios:", tex: `E = 10^{${ntex(logE, 6)}} = ${ntex(E, 4)}\\ J` },
    { text: "Equivalente en TNT (1 t = 4.184 × 10^9 J):", tex: `\\frac{E}{4.184 \\times 10^{9}} = ${ntex(tons, 4)}\\ \\text{t}` }
  ];
  return {
    results: [
      { label: "Energía liberada", value: eng(E, "J", 4), text: `E = ${eng(E, "J", 4)}` },
      { label: "Equivalente en TNT", value: `${fmt(tons, 4)} t` },
      { label: "log10 E", value: fmt(logE, 5) },
      { label: "Clase del sismo", value: cls }
    ],
    steps,
    copy: `M = ${fmt(M)}: E ≈ ${eng(E, "J", 4)} ≈ ${fmt(tons, 4)} t de TNT`,
    blocks: [CLASS_TABLE],
    values: { M, logE, E, tons }
  };
}
