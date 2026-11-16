import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cfmt, ctex } from "../core/complex.js";
import { zR, zL, zC, deg, cabs } from "./common.js";
import { logspaceSafe } from "../dc-circuits/common.js";

export const meta = {
  description: "Calcule la impedancia de una resistencia, una bobina y un condensador a cualquier frecuencia: reactancia e impedancia compleja, su módulo y ángulo, y la admitancia, con la curva de reactancia frente a la frecuencia.",
  keywords: ["Impedancia", "Reactancia", "impedance", "reactance", "Reactancia inductiva", "Reactancia capacitiva", "Admitancia", "admittance"],
  formulas: [
    { label: "Resistencia, bobina y condensador", tex: "Z_R = R,\\qquad Z_L = j\\omega L = jX_L,\\qquad Z_C = \\frac{1}{j\\omega C} = -jX_C" },
    { label: "Reactancias", tex: "X_L = 2\\pi f L,\\qquad X_C = \\frac{1}{2\\pi f C},\\qquad Y = \\frac{1}{Z}" }
  ],
  inputs: [
    { id: "el", label: "Elemento", type: "select", default: "C", options: [["R", "Resistencia R"], ["L", "Bobina L"], ["C", "Condensador C"]] },
    { id: "val", label: "Valor (Ω, H o F)", type: "number", default: "10u", help: "Por ejemplo, 100, 10m, 4.7u, 22n." },
    { id: "f", label: "Frecuencia f", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { el: "C", val: "10u", f: "50" }, expect: ["Z = -318.31j"], note: "Ejemplo: condensador de 10 µF a 50 Hz." },
  invalid: { values: { el: "C", val: "10u", f: "0" } },
  related: ["rlc-circuit", "resonance", "passive-filter", "complex-numbers"]
};

export function solve(input) {
  const el = choice(input, "el", "Elemento", ["R", "L", "C"], "C");
  const val = num(input, "val", "Valor", { positive: true });
  const f = num(input, "f", "Frecuencia", { positive: true });
  const w = 2 * Math.PI * f;
  const Z = el === "R" ? zR(val) : el === "L" ? zL(val, w) : zC(val, w);
  const X = Z.im;
  const steps = [{ text: "Frecuencia angular:", tex: `\\omega = 2\\pi f = 2\\pi \\times ${ntex(f)} = ${ntex(w, 6)}\\ \\text{rad/s}` }];
  if (el === "R") steps.push("La resistencia ideal no depende de la frecuencia y su ángulo es cero (tensión y corriente en fase).");
  if (el === "L") steps.push({ text: "La reactancia de la bobina aumenta linealmente con la frecuencia, y la tensión adelanta a la corriente 90°:", tex: `X_L = \\omega L = ${ntex(w, 6)} \\times ${ntex(val)} = ${ntex(X, 6)}\\ \\Omega,\\quad Z_L = j${ntex(X, 6)}\\ \\Omega` });
  if (el === "C") steps.push({ text: "La reactancia del condensador disminuye al aumentar la frecuencia, y la corriente adelanta a la tensión 90°:", tex: `X_C = \\frac{1}{\\omega C} = \\frac{1}{${ntex(w, 6)} \\times ${ntex(val)}} = ${ntex(-X, 6)}\\ \\Omega,\\quad Z_C = -j${ntex(-X, 6)}\\ \\Omega` });
  const Y = { re: Z.re / (cabs(Z) ** 2), im: -Z.im / (cabs(Z) ** 2) };
  steps.push({ text: "La admitancia es el inverso de la impedancia:", tex: `Y = \\frac{1}{Z} = ${ctex(Y, 6)}\\ S` });
  const unit = el === "R" ? "Ω" : el === "L" ? "H" : "F";
  const fs = logspaceSafe(f / 100, f * 100, 200);
  const curve = el === "R" ? fs.map((x) => [x, val]) : el === "L" ? fs.map((x) => [x, 2 * Math.PI * x * val]) : fs.map((x) => [x, 1 / (2 * Math.PI * x * val)]);
  return {
    results: [
      { label: "Impedancia compleja Z", tex: `${ctex(Z, 6)}\\ \\Omega`, text: `Z = ${cfmt(Z, 6)} Ω` },
      { label: "Módulo |Z|", value: eng(cabs(Z), "Ω", 5) },
      { label: "Ángulo", value: deg(Z), unit: "°", sig: 4 },
      { label: el === "R" ? "Resistencia" : "Reactancia", value: eng(Math.abs(el === "R" ? Z.re : X), "Ω", 5) },
      { label: "Admitancia Y", text: cfmt(Y, 5), tex: `${ctex(Y, 5)}\\ S` }
    ],
    blocks: [{ type: "plot", title: `${el === "R" ? "Resistencia" : "Reactancia"} frente a la frecuencia del elemento ${eng(val, unit)}`, logX: true, xLabel: "f (Hz)", yLabel: "|X| (Ω)", series: [{ name: "|Z|", points: curve }], vlines: [{ x: f }] }],
    steps, copy: `Z = ${cfmt(Z, 6)} Ω (|Z| = ${eng(cabs(Z), "Ω", 5)}, ${fmt(deg(Z), 4)}°)`
  };
}
