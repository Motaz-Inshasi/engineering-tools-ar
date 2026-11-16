import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cfmt, ctex } from "../core/complex.js";
import { zR, zL, zC, deg, cabs } from "./common.js";
import { logspaceSafe } from "../dc-circuits/common.js";

export const meta = {
  description: "Calculez l'impédance d'une résistance, d'une bobine ou d'un condensateur à une fréquence donnée : réactance, impédance complexe, son module et son angle, et admittance, avec la courbe de réactance en fonction de la fréquence.",
  keywords: ["Impédance", "Réactance", "impedance", "reactance", "Réactance inductive", "Réactance capacitive", "Admittance", "admittance"],
  formulas: [
    { label: "Résistance, bobine et condensateur", tex: "Z_R = R,\\qquad Z_L = j\\omega L = jX_L,\\qquad Z_C = \\frac{1}{j\\omega C} = -jX_C" },
    { label: "Réactances", tex: "X_L = 2\\pi f L,\\qquad X_C = \\frac{1}{2\\pi f C},\\qquad Y = \\frac{1}{Z}" }
  ],
  inputs: [
    { id: "el", label: "Élément", type: "select", default: "C", options: [["R", "Résistance R"], ["L", "Bobine L"], ["C", "Condensateur C"]] },
    { id: "val", label: "Valeur (Ω, H ou F)", type: "number", default: "10u", help: "Par exemple 100, 10m, 4.7u ou 22n." },
    { id: "f", label: "Fréquence f", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { el: "C", val: "10u", f: "50" }, expect: ["Z = -318.31j"], note: "Exemple : condensateur de 10 µF à 50 Hz." },
  invalid: { values: { el: "C", val: "10u", f: "0" } },
  related: ["rlc-circuit", "resonance", "passive-filter", "complex-numbers"]
};

export function solve(input) {
  const el = choice(input, "el", "Élément", ["R", "L", "C"], "C");
  const val = num(input, "val", "Valeur", { positive: true });
  const f = num(input, "f", "Fréquence", { positive: true });
  const w = 2 * Math.PI * f;
  const Z = el === "R" ? zR(val) : el === "L" ? zL(val, w) : zC(val, w);
  const X = Z.im;
  const steps = [{ text: "Pulsation :", tex: `\\omega = 2\\pi f = 2\\pi \\times ${ntex(f)} = ${ntex(w, 6)}\\ \\text{rad/s}` }];
  if (el === "R") steps.push("La résistance idéale ne dépend pas de la fréquence et son angle est nul (tension et courant en phase).");
  if (el === "L") steps.push({ text: "La réactance de la bobine augmente linéairement avec la fréquence, et la tension précède le courant de 90° :", tex: `X_L = \\omega L = ${ntex(w, 6)} \\times ${ntex(val)} = ${ntex(X, 6)}\\ \\Omega,\\quad Z_L = j${ntex(X, 6)}\\ \\Omega` });
  if (el === "C") steps.push({ text: "La réactance du condensateur diminue quand la fréquence augmente, et le courant précède la tension de 90° :", tex: `X_C = \\frac{1}{\\omega C} = \\frac{1}{${ntex(w, 6)} \\times ${ntex(val)}} = ${ntex(-X, 6)}\\ \\Omega,\\quad Z_C = -j${ntex(-X, 6)}\\ \\Omega` });
  const Y = { re: Z.re / (cabs(Z) ** 2), im: -Z.im / (cabs(Z) ** 2) };
  steps.push({ text: "L'admittance est l'inverse de l'impédance :", tex: `Y = \\frac{1}{Z} = ${ctex(Y, 6)}\\ S` });
  const unit = el === "R" ? "Ω" : el === "L" ? "H" : "F";
  const fs = logspaceSafe(f / 100, f * 100, 200);
  const curve = el === "R" ? fs.map((x) => [x, val]) : el === "L" ? fs.map((x) => [x, 2 * Math.PI * x * val]) : fs.map((x) => [x, 1 / (2 * Math.PI * x * val)]);
  return {
    results: [
      { label: "Impédance complexe Z", tex: `${ctex(Z, 6)}\\ \\Omega`, text: `Z = ${cfmt(Z, 6)} Ω` },
      { label: "Module |Z|", value: eng(cabs(Z), "Ω", 5) },
      { label: "Angle", value: deg(Z), unit: "°", sig: 4 },
      { label: el === "R" ? "Résistance" : "Réactance", value: eng(Math.abs(el === "R" ? Z.re : X), "Ω", 5) },
      { label: "Admittance Y", text: cfmt(Y, 5), tex: `${ctex(Y, 5)}\\ S` }
    ],
    blocks: [{ type: "plot", title: `${el === "R" ? "Résistance" : "Réactance"} en fonction de la fréquence pour l'élément ${eng(val, unit)}`, logX: true, xLabel: "f (Hz)", yLabel: "|X| (Ω)", series: [{ name: "|Z|", points: curve }], vlines: [{ x: f }] }],
    steps, copy: `Z = ${cfmt(Z, 6)} Ω (|Z| = ${eng(cabs(Z), "Ω", 5)}, ${fmt(deg(Z), 4)}°)`
  };
}
