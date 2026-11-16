import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cfmt, ctex } from "../core/complex.js";
import { zR, zL, zC, deg, cabs } from "./common.js";
import { logspaceSafe } from "../dc-circuits/common.js";

export const meta = {
  description: "Hitung impedansi resistor, induktor, dan kapasitor pada frekuensi apa pun: reaktansi, impedansi kompleks dengan besar dan sudutnya, serta admitansi, dengan kurva reaktansi terhadap frekuensi.",
  keywords: ["Impedansi", "Reaktansi", "impedance", "reactance", "Reaktansi induktif", "Reaktansi kapasitif", "Admitansi", "admittance"],
  formulas: [
    { label: "Resistor, induktor, dan kapasitor", tex: "Z_R = R,\\qquad Z_L = j\\omega L = jX_L,\\qquad Z_C = \\frac{1}{j\\omega C} = -jX_C" },
    { label: "Reaktansi", tex: "X_L = 2\\pi f L,\\qquad X_C = \\frac{1}{2\\pi f C},\\qquad Y = \\frac{1}{Z}" }
  ],
  inputs: [
    { id: "el", label: "Elemen", type: "select", default: "C", options: [["R", "Resistor R"], ["L", "Induktor L"], ["C", "Kapasitor C"]] },
    { id: "val", label: "Nilai (Ω, H, atau F)", type: "number", default: "10u", help: "Misalnya 100, 10m, 4.7u, atau 22n." },
    { id: "f", label: "Frekuensi f", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { el: "C", val: "10u", f: "50" }, expect: ["Z = -318.31j"], note: "Contoh: kapasitor 10 µF pada 50 Hz." },
  invalid: { values: { el: "C", val: "10u", f: "0" } },
  related: ["rlc-circuit", "resonance", "passive-filter", "complex-numbers"]
};

export function solve(input) {
  const el = choice(input, "el", "Elemen", ["R", "L", "C"], "C");
  const val = num(input, "val", "Nilai", { positive: true });
  const f = num(input, "f", "Frekuensi", { positive: true });
  const w = 2 * Math.PI * f;
  const Z = el === "R" ? zR(val) : el === "L" ? zL(val, w) : zC(val, w);
  const X = Z.im;
  const steps = [{ text: "Frekuensi sudut:", tex: `\\omega = 2\\pi f = 2\\pi \\times ${ntex(f)} = ${ntex(w, 6)}\\ \\text{rad/s}` }];
  if (el === "R") steps.push("Resistor ideal tidak bergantung pada frekuensi, dan sudutnya nol (tegangan dan arus sefasa).");
  if (el === "L") steps.push({ text: "Reaktansi induktor bertambah secara linier terhadap frekuensi, dan tegangan mendahului arus sebesar 90°:", tex: `X_L = \\omega L = ${ntex(w, 6)} \\times ${ntex(val)} = ${ntex(X, 6)}\\ \\Omega,\\quad Z_L = j${ntex(X, 6)}\\ \\Omega` });
  if (el === "C") steps.push({ text: "Reaktansi kapasitor berkurang seiring bertambahnya frekuensi, dan arus mendahului tegangan sebesar 90°:", tex: `X_C = \\frac{1}{\\omega C} = \\frac{1}{${ntex(w, 6)} \\times ${ntex(val)}} = ${ntex(-X, 6)}\\ \\Omega,\\quad Z_C = -j${ntex(-X, 6)}\\ \\Omega` });
  const Y = { re: Z.re / (cabs(Z) ** 2), im: -Z.im / (cabs(Z) ** 2) };
  steps.push({ text: "Admitansi adalah kebalikan dari impedansi:", tex: `Y = \\frac{1}{Z} = ${ctex(Y, 6)}\\ S` });
  const unit = el === "R" ? "Ω" : el === "L" ? "H" : "F";
  const fs = logspaceSafe(f / 100, f * 100, 200);
  const curve = el === "R" ? fs.map((x) => [x, val]) : el === "L" ? fs.map((x) => [x, 2 * Math.PI * x * val]) : fs.map((x) => [x, 1 / (2 * Math.PI * x * val)]);
  return {
    results: [
      { label: "Impedansi kompleks Z", tex: `${ctex(Z, 6)}\\ \\Omega`, text: `Z = ${cfmt(Z, 6)} Ω` },
      { label: "Besar |Z|", value: eng(cabs(Z), "Ω", 5) },
      { label: "Sudut", value: deg(Z), unit: "°", sig: 4 },
      { label: el === "R" ? "Resistansi" : "Reaktansi", value: eng(Math.abs(el === "R" ? Z.re : X), "Ω", 5) },
      { label: "Admitansi Y", text: cfmt(Y, 5), tex: `${ctex(Y, 5)}\\ S` }
    ],
    blocks: [{ type: "plot", title: `${el === "R" ? "Resistansi" : "Reaktansi"} terhadap frekuensi untuk elemen ${eng(val, unit)}`, logX: true, xLabel: "f (Hz)", yLabel: "|X| (Ω)", series: [{ name: "|Z|", points: curve }], vlines: [{ x: f }] }],
    steps, copy: `Z = ${cfmt(Z, 6)} Ω (|Z| = ${eng(cabs(Z), "Ω", 5)}, ${fmt(deg(Z), 4)}°)`
  };
}
