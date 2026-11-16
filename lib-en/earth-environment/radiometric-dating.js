import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const ISOTOPES = {
  C14: { label: "C-14", T: 5730 },
  K40: { label: "K-40", T: 1.248e9 },
  U238: { label: "U-238", T: 4.468e9 },
  U235: { label: "U-235", T: 7.04e8 },
  Rb87: { label: "Rb-87", T: 4.97e10 }
};

export const meta = {
  description: "Calculate the age of a sample from the fraction of the parent element remaining or from the daughter-to-parent ratio, or calculate the remaining fraction for a known age, with the radioactive decay curve up to five half-lives.",
  keywords: ["Radiometric dating", "Half-life", "Carbon-14", "C-14", "K-40", "U-238", "Rb-87", "radiometric dating", "half-life"],
  formulas: [
    { label: "Age from remaining fraction", tex: "t = \\frac{T_{1/2}}{\\ln 2}\\ln\\frac{100}{p}" },
    { label: "Age from daughter-to-parent ratio", tex: "t = \\frac{T_{1/2}}{\\ln 2}\\ln\\left(1+\\frac{D}{P}\\right)" },
    { label: "Remaining fraction from age", tex: "p = 100\\cdot 2^{-t/T_{1/2}}" }
  ],
  inputs: [
    { id: "iso", label: "Radioactive isotope", type: "select", default: "C14", options: [["C14", "C-14 (5730 years)"], ["K40", "K-40"], ["U238", "U-238"], ["U235", "U-235"], ["Rb87", "Rb-87"], ["custom", "Custom half-life"]] },
    { id: "halfLife", label: "Custom half-life", unit: "years", type: "number", default: "5730", when: { iso: ["custom"] } },
    { id: "mode", label: "Required result", type: "select", default: "fraction", options: [["fraction", "Age from remaining fraction of parent"], ["ratio", "Age from daughter-to-parent ratio D/P"], ["age", "Remaining fraction from age"]] },
    { id: "pct", label: "Remaining fraction of parent", unit: "%", type: "number", default: "25", when: { mode: ["fraction"] } },
    { id: "ratio", label: "Daughter-to-parent ratio D/P", type: "number", default: "1", when: { mode: ["ratio"] } },
    { id: "age", label: "Age", unit: "years", type: "number", default: "11460", when: { mode: ["age"] } }
  ],
  example: { values: { iso: "C14", halfLife: "", mode: "fraction", pct: "25", ratio: "", age: "" }, expect: ["11460 years"], note: "Example: 25% of C-14 remaining means two half-lives have passed." },
  invalid: { values: { iso: "C14", halfLife: "", mode: "fraction", pct: "0", ratio: "", age: "" } },
  related: ["earthquake-magnitude", "carbon-footprint"]
};

export function solve(input) {
  const iso = choice(input, "iso", "Isotope", ["C14", "K40", "U238", "U235", "Rb87", "custom"], "C14");
  const mode = choice(input, "mode", "Required result", ["fraction", "ratio", "age"], "fraction");
  const T = iso === "custom" ? num(input, "halfLife", "Half-life", { positive: true }) : ISOTOPES[iso].T;
  const name = iso === "custom" ? "Custom isotope" : ISOTOPES[iso].label;
  const steps = [];
  let t;
  if (mode === "fraction") {
    const p = num(input, "pct", "Remaining fraction", { positive: true, max: 100 });
    t = T * Math.log(100 / p) / Math.LN2;
    steps.push({ text: "Radioactive decay law:", tex: "\\frac{N}{N_0} = \\left(\\tfrac{1}{2}\\right)^{t/T_{1/2}}" });
    steps.push({ text: "Solve the equation for time:", tex: "t = \\frac{T_{1/2}}{\\ln 2}\\ln\\frac{100}{p}" });
    steps.push({ text: "Substitution:", tex: `t = \\frac{${ntex(T)}}{\\ln 2}\\ln\\frac{100}{${ntex(p)}} = ${ntex(t, 6)}\\ \\text{y}` });
  } else if (mode === "ratio") {
    const r = num(input, "ratio", "Daughter-to-parent ratio", { nonNegative: true });
    t = T * Math.log(1 + r) / Math.LN2;
    steps.push({ text: "The daughter-to-parent ratio gives the time:", tex: "t = \\frac{T_{1/2}}{\\ln 2}\\ln\\left(1+\\frac{D}{P}\\right)" });
    steps.push({ text: "Substitution:", tex: `t = \\frac{${ntex(T)}}{\\ln 2}\\ln\\left(1+${ntex(r)}\\right) = ${ntex(t, 6)}\\ \\text{y}` });
  } else {
    t = num(input, "age", "Age", { nonNegative: true });
    steps.push({ text: "Given age:", tex: `t = ${ntex(t, 6)}\\ \\text{y}` });
  }
  const remain = 100 * Math.pow(2, -t / T);
  steps.push({ text: "Remaining fraction of the parent element:", tex: `p = 100 \\cdot 2^{-${ntex(t, 6)}/${ntex(T)}} = ${ntex(remain, 6)}\\ \\%` });
  const tTxt = `${fmt(t, 4)} years`;
  const pts = [];
  const xMax = Math.max(5 * T, t);
  for (let i = 0; i <= 80; i++) {
    const x = xMax * i / 80;
    pts.push([x, 100 * Math.pow(2, -x / T)]);
  }
  return {
    results: [
      { label: "Age", value: tTxt, text: `t = ${tTxt}` },
      { label: "In millions", value: `${fmt(t / 1e6, 4)} million years` },
      { label: "Remaining fraction of parent", value: `${fmt(remain, 4)} %` },
      { label: "Number of elapsed half-lives", value: fmt(t / T, 4) },
      { label: "Half-life used", value: `${fmt(T, 4)} years` }
    ],
    steps,
    copy: `Age ≈ ${tTxt} (${name}, half-life ${fmt(T, 4)} years)`,
    blocks: [
      { type: "plot", title: "Radioactive decay curve", xLabel: "Time (years)", yLabel: "Remaining fraction (%)", series: [{ name: "Remaining fraction", points: pts }], vlines: [{ x: t }], includeZero: true }
    ],
    values: { t, T, remain }
  };
}
