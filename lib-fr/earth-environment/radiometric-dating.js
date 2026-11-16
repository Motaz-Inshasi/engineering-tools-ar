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
  description: "Calculez l'âge d'un échantillon à partir du pourcentage restant de l'élément parent ou du rapport fils/parent, ou calculez le pourcentage restant pour un âge donné, avec la courbe de décroissance radioactive jusqu'à cinq demi-vies.",
  keywords: ["Datation par isotopes radioactifs", "Demi-vie", "Carbone 14", "C-14", "K-40", "U-238", "Rb-87", "radiometric dating", "half-life"],
  formulas: [
    { label: "Âge à partir du pourcentage restant", tex: "t = \\frac{T_{1/2}}{\\ln 2}\\ln\\frac{100}{p}" },
    { label: "Âge à partir du rapport fils/parent", tex: "t = \\frac{T_{1/2}}{\\ln 2}\\ln\\left(1+\\frac{D}{P}\\right)" },
    { label: "Pourcentage restant à partir de l'âge", tex: "p = 100\\cdot 2^{-t/T_{1/2}}" }
  ],
  inputs: [
    { id: "iso", label: "Isotope radioactif", type: "select", default: "C14", options: [["C14", "C-14 (5730 ans)"], ["K40", "K-40"], ["U238", "U-238"], ["U235", "U-235"], ["Rb87", "Rb-87"], ["custom", "Demi-vie personnalisée"]] },
    { id: "halfLife", label: "Demi-vie personnalisée", unit: "ans", type: "number", default: "5730", when: { iso: ["custom"] } },
    { id: "mode", label: "Résultat demandé", type: "select", default: "fraction", options: [["fraction", "Âge à partir du pourcentage restant du parent"], ["ratio", "Âge à partir du rapport fils/parent D/P"], ["age", "Pourcentage restant à partir de l'âge"]] },
    { id: "pct", label: "Pourcentage restant du parent", unit: "%", type: "number", default: "25", when: { mode: ["fraction"] } },
    { id: "ratio", label: "Rapport fils/parent D/P", type: "number", default: "1", when: { mode: ["ratio"] } },
    { id: "age", label: "Âge", unit: "ans", type: "number", default: "11460", when: { mode: ["age"] } }
  ],
  example: { values: { iso: "C14", halfLife: "", mode: "fraction", pct: "25", ratio: "", age: "" }, expect: ["11460 ans"], note: "Exemple : 25 % de C-14 restant signifie que deux demi-vies se sont écoulées." },
  invalid: { values: { iso: "C14", halfLife: "", mode: "fraction", pct: "0", ratio: "", age: "" } },
  related: ["earthquake-magnitude", "carbon-footprint"]
};

export function solve(input) {
  const iso = choice(input, "iso", "Isotope", ["C14", "K40", "U238", "U235", "Rb87", "custom"], "C14");
  const mode = choice(input, "mode", "Résultat demandé", ["fraction", "ratio", "age"], "fraction");
  const T = iso === "custom" ? num(input, "halfLife", "Demi-vie", { positive: true }) : ISOTOPES[iso].T;
  const name = iso === "custom" ? "Isotope personnalisé" : ISOTOPES[iso].label;
  const steps = [];
  let t;
  if (mode === "fraction") {
    const p = num(input, "pct", "Pourcentage restant", { positive: true, max: 100 });
    t = T * Math.log(100 / p) / Math.LN2;
    steps.push({ text: "Loi de la décroissance radioactive :", tex: "\\frac{N}{N_0} = \\left(\\tfrac{1}{2}\\right)^{t/T_{1/2}}" });
    steps.push({ text: "Résolution de l'équation par rapport au temps :", tex: "t = \\frac{T_{1/2}}{\\ln 2}\\ln\\frac{100}{p}" });
    steps.push({ text: "Par substitution :", tex: `t = \\frac{${ntex(T)}}{\\ln 2}\\ln\\frac{100}{${ntex(p)}} = ${ntex(t, 6)}\\ \\text{y}` });
  } else if (mode === "ratio") {
    const r = num(input, "ratio", "Rapport fils/parent", { nonNegative: true });
    t = T * Math.log(1 + r) / Math.LN2;
    steps.push({ text: "Le rapport fils/parent donne le temps :", tex: "t = \\frac{T_{1/2}}{\\ln 2}\\ln\\left(1+\\frac{D}{P}\\right)" });
    steps.push({ text: "Par substitution :", tex: `t = \\frac{${ntex(T)}}{\\ln 2}\\ln\\left(1+${ntex(r)}\\right) = ${ntex(t, 6)}\\ \\text{y}` });
  } else {
    t = num(input, "age", "Âge", { nonNegative: true });
    steps.push({ text: "Âge obtenu :", tex: `t = ${ntex(t, 6)}\\ \\text{y}` });
  }
  const remain = 100 * Math.pow(2, -t / T);
  steps.push({ text: "Pourcentage restant de l'élément parent :", tex: `p = 100 \\cdot 2^{-${ntex(t, 6)}/${ntex(T)}} = ${ntex(remain, 6)}\\ \\%` });
  const tTxt = `${fmt(t, 4)} ans`;
  const pts = [];
  const xMax = Math.max(5 * T, t);
  for (let i = 0; i <= 80; i++) {
    const x = xMax * i / 80;
    pts.push([x, 100 * Math.pow(2, -x / T)]);
  }
  return {
    results: [
      { label: "Âge", value: tTxt, text: `t = ${tTxt}` },
      { label: "En millions", value: `${fmt(t / 1e6, 4)} millions d'années` },
      { label: "Pourcentage restant du parent", value: `${fmt(remain, 4)} %` },
      { label: "Nombre de demi-vies écoulées", value: fmt(t / T, 4) },
      { label: "Demi-vie utilisée", value: `${fmt(T, 4)} ans` }
    ],
    steps,
    copy: `Âge ≈ ${tTxt} (${name}, demi-vie ${fmt(T, 4)} ans)`,
    blocks: [
      { type: "plot", title: "Courbe de décroissance radioactive", xLabel: "Temps (ans)", yLabel: "Pourcentage restant (%)", series: [{ name: "Pourcentage restant", points: pts }], vlines: [{ x: t }], includeZero: true }
    ],
    values: { t, T, remain }
  };
}
