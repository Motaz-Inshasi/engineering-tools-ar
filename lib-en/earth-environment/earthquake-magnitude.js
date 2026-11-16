import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt, tex as ntex } from "../core/format.js";

const CLASSES = [
  ["Less than 3", "Usually not felt; recorded only by instruments"],
  ["3 – 3.9", "Felt near the epicenter; light furniture may shake"],
  ["4 – 4.9", "Widely felt indoors; hanging objects swing"],
  ["5 – 5.9", "Felt by everyone; poorly designed buildings may be damaged"],
  ["6 – 6.9", "Damage in populated areas and cracks in buildings"],
  ["7 – 7.9", "Severe damage over wide areas"],
  ["8+", "Total destruction near the epicenter, with effects over large distances"]
];

const LIMITS = [3, 4, 5, 6, 7, 8];

function classOf(M) {
  let i = 0;
  while (i < LIMITS.length && M >= LIMITS[i]) i++;
  return CLASSES[i][0];
}

const CLASS_TABLE = { type: "table", caption: "Magnitude classes and their usual effects", head: ["Magnitude class", "Usual effect"], rows: CLASSES };

export const meta = {
  description: "Convert an earthquake's magnitude into energy in joules and TNT equivalent, compare two earthquakes by amplitude and energy ratio, or calculate the local Richter magnitude ML from the maximum amplitude and the S−P interval, with magnitude classes and their effects.",
  keywords: ["Earthquake magnitude", "Richter scale", "Earthquake energy", "magnitude", "richter", "TNT", "Earthquake"],
  formulas: [
    { label: "Energy from magnitude", tex: "\\log_{10} E = 1.5M + 4.8 \\quad (E\\ \\text{in joules})" },
    { label: "Amplitude and energy ratio", tex: "\\frac{A_2}{A_1} = 10^{\\Delta M},\\qquad \\frac{E_2}{E_1} = 10^{1.5\\Delta M}" },
    { label: "Local Richter magnitude", tex: "M_L = \\log_{10} A + 3\\log_{10}(8\\,\\Delta t) - 2.92" }
  ],
  inputs: [
    { id: "mode", label: "Required calculation", type: "select", default: "energy", options: [["energy", "From magnitude to energy"], ["compare", "Compare two earthquakes"], ["richter", "Richter magnitude from amplitude"]] },
    { id: "M", label: "Magnitude M", type: "number", default: "5", when: { mode: ["energy"] } },
    { id: "M1", label: "First magnitude M1", type: "number", default: "5", when: { mode: ["compare"] } },
    { id: "M2", label: "Second magnitude M2", type: "number", default: "7", when: { mode: ["compare"] } },
    { id: "A", label: "Maximum wave amplitude A", unit: "mm", type: "number", default: "10", when: { mode: ["richter"] } },
    { id: "dt", label: "S−P interval", unit: "s", type: "number", default: "5", when: { mode: ["richter"] }, help: "The time difference between the arrival of the P wave and the S wave at the seismic station." }
  ],
  example: { values: { mode: "energy", M: "5", M1: "", M2: "", A: "", dt: "" }, expect: ["E ≈ 1.995 TJ", "476.9 tons"], note: "Example: an earthquake of magnitude 5 on the Richter scale." },
  invalid: { values: { mode: "energy", M: "11", M1: "", M2: "", A: "", dt: "" } },
  related: ["radiometric-dating", "air-quality-index"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Required calculation", ["energy", "compare", "richter"], "energy");
  if (mode === "compare") {
    const M1 = num(input, "M1", "First magnitude", { min: 0, max: 10 });
    const M2 = num(input, "M2", "Second magnitude", { min: 0, max: 10 });
    const d = Math.abs(M2 - M1);
    const amp = Math.pow(10, d);
    const en = Math.pow(10, 1.5 * d);
    const steps = [
      { text: "Magnitude difference:", tex: `\\Delta M = |M_2 - M_1| = |${ntex(M2)} - ${ntex(M1)}| = ${fmt(d, 6)}` },
      { text: "Amplitude ratio (maximum vibration):", tex: `\\frac{A_2}{A_1} = 10^{\\Delta M} = ${fmt(amp, 6)}` },
      { text: "Energy release ratio:", tex: `\\frac{E_2}{E_1} = 10^{1.5\\Delta M} = ${fmt(en, 6)}` }
    ];
    return {
      results: [
        { label: "Magnitude difference ΔM", value: fmt(d, 4) },
        { label: "Amplitude ratio (maximum vibration)", value: `${fmt(amp, 4)}×` },
        { label: "Energy release ratio", value: `${fmt(en, 4)}×` }
      ],
      steps,
      copy: `ΔM = ${fmt(d, 4)}: amplitude ratio ${fmt(amp, 4)}× and energy ratio ${fmt(en, 4)}×`,
      blocks: [CLASS_TABLE],
      values: { d, amp, en }
    };
  }
  if (mode === "richter") {
    const A = num(input, "A", "Maximum wave amplitude", { positive: true });
    const dt = num(input, "dt", "S−P interval", { positive: true });
    const ML = Math.log10(A) + 3 * Math.log10(8 * dt) - 2.92;
    const cls = classOf(ML);
    const steps = [
      { text: "Local Richter equation:", tex: "M_L = \\log_{10} A + 3\\log_{10}(8\\,\\Delta t) - 2.92" },
      { text: "Substitution:", tex: `M_L = \\log_{10} ${ntex(A)} + 3\\log_{10}(8 \\times ${ntex(dt)}) - 2.92 = ${ntex(ML, 6)}` }
    ];
    return {
      results: [
        { label: "Richter magnitude ML", value: fmt(ML, 4), text: `ML = ${fmt(ML, 4)}` },
        { label: "Earthquake class", value: cls }
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
    { text: "Relation between magnitude and energy:", tex: "\\log_{10} E = 1.5M + 4.8" },
    { text: "Substitution:", tex: `\\log_{10} E = 1.5 \\times ${ntex(M)} + 4.8 = ${ntex(logE, 6)}` },
    { text: "Energy in joules:", tex: `E = 10^{${ntex(logE, 6)}} = ${ntex(E, 4)}\\ J` },
    { text: "TNT equivalent (1 ton = 4.184 × 10^9 J):", tex: `\\frac{E}{4.184 \\times 10^{9}} = ${ntex(tons, 4)}\\ \\text{t}` }
  ];
  return {
    results: [
      { label: "Energy released", value: eng(E, "J", 4), text: `E = ${eng(E, "J", 4)}` },
      { label: "TNT equivalent", value: `${fmt(tons, 4)} tons` },
      { label: "log10 E", value: fmt(logE, 5) },
      { label: "Earthquake class", value: cls }
    ],
    steps,
    copy: `M = ${fmt(M)}: E ≈ ${eng(E, "J", 4)} ≈ ${fmt(tons, 4)} tons of TNT`,
    blocks: [CLASS_TABLE],
    values: { M, logE, E, tons }
  };
}
