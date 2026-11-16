import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cfmt, ctex } from "../core/complex.js";
import { zR, zL, zC, deg, cabs } from "./common.js";
import { logspaceSafe } from "../dc-circuits/common.js";

export const meta = {
  description: "Direnç, bobin ve kondansatörün herhangi bir frekanstaki empedansını hesaplayın: reaktans, karmaşık empedansın büyüklüğü ve açısı, admitans; frekansa karşı reaktans eğrisiyle birlikte.",
  keywords: ["empedans", "reaktans", "impedance", "reactance", "endüktif reaktans", "kapasitif reaktans", "admitans", "admittance"],
  formulas: [
    { label: "Direnç, bobin ve kondansatör", tex: "Z_R = R,\\qquad Z_L = j\\omega L = jX_L,\\qquad Z_C = \\frac{1}{j\\omega C} = -jX_C" },
    { label: "Reaktanslar", tex: "X_L = 2\\pi f L,\\qquad X_C = \\frac{1}{2\\pi f C},\\qquad Y = \\frac{1}{Z}" }
  ],
  inputs: [
    { id: "el", label: "Eleman", type: "select", default: "C", options: [["R", "Direnç R"], ["L", "Bobin L"], ["C", "Kondansatör C"]] },
    { id: "val", label: "Değer (Ω, H veya F)", type: "number", default: "10u", help: "Örn. 100, 10m, 4.7u veya 22n." },
    { id: "f", label: "Frekans f", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { el: "C", val: "10u", f: "50" }, expect: ["Z = -318.31j"], note: "Örnek: 50 Hz'de 10 µF kondansatör." },
  invalid: { values: { el: "C", val: "10u", f: "0" } },
  related: ["rlc-circuit", "resonance", "passive-filter", "complex-numbers"]
};

export function solve(input) {
  const el = choice(input, "el", "Eleman", ["R", "L", "C"], "C");
  const val = num(input, "val", "Değer", { positive: true });
  const f = num(input, "f", "Frekans", { positive: true });
  const w = 2 * Math.PI * f;
  const Z = el === "R" ? zR(val) : el === "L" ? zL(val, w) : zC(val, w);
  const X = Z.im;
  const steps = [{ text: "Açısal frekans:", tex: `\\omega = 2\\pi f = 2\\pi \\times ${ntex(f)} = ${ntex(w, 6)}\\ \\text{rad/s}` }];
  if (el === "R") steps.push("İdeal direncin empedansı frekansa bağlı değildir ve açısı sıfırdır (gerilim ve akım aynı fazdadır).");
  if (el === "L") steps.push({ text: "Bobin reaktansı frekansla doğrusal olarak artar; gerilim akımdan 90° önde olur:", tex: `X_L = \\omega L = ${ntex(w, 6)} \\times ${ntex(val)} = ${ntex(X, 6)}\\ \\Omega,\\quad Z_L = j${ntex(X, 6)}\\ \\Omega` });
  if (el === "C") steps.push({ text: "Kondansatör reaktansı frekans arttıkça azalır; akım gerilimden 90° önde olur:", tex: `X_C = \\frac{1}{\\omega C} = \\frac{1}{${ntex(w, 6)} \\times ${ntex(val)}} = ${ntex(-X, 6)}\\ \\Omega,\\quad Z_C = -j${ntex(-X, 6)}\\ \\Omega` });
  const Y = { re: Z.re / (cabs(Z) ** 2), im: -Z.im / (cabs(Z) ** 2) };
  steps.push({ text: "Admitans, empedansın tersidir:", tex: `Y = \\frac{1}{Z} = ${ctex(Y, 6)}\\ S` });
  const unit = el === "R" ? "Ω" : el === "L" ? "H" : "F";
  const fs = logspaceSafe(f / 100, f * 100, 200);
  const curve = el === "R" ? fs.map((x) => [x, val]) : el === "L" ? fs.map((x) => [x, 2 * Math.PI * x * val]) : fs.map((x) => [x, 1 / (2 * Math.PI * x * val)]);
  return {
    results: [
      { label: "Karmaşık empedans Z", tex: `${ctex(Z, 6)}\\ \\Omega`, text: `Z = ${cfmt(Z, 6)} Ω` },
      { label: "Büyüklük |Z|", value: eng(cabs(Z), "Ω", 5) },
      { label: "Açı", value: deg(Z), unit: "°", sig: 4 },
      { label: el === "R" ? "Direnç" : "Reaktans", value: eng(Math.abs(el === "R" ? Z.re : X), "Ω", 5) },
      { label: "Admitans Y", text: cfmt(Y, 5), tex: `${ctex(Y, 5)}\\ S` }
    ],
    blocks: [{ type: "plot", title: `${el === "R" ? "Direnç" : "Reaktans"} – frekans ilişkisi (${eng(val, unit)} elemanı)`, logX: true, xLabel: "f (Hz)", yLabel: "|X| (Ω)", series: [{ name: "|Z|", points: curve }], vlines: [{ x: f }] }],
    steps, copy: `Z = ${cfmt(Z, 6)} Ω (|Z| = ${eng(cabs(Z), "Ω", 5)}, ${fmt(deg(Z), 4)}°)`
  };
}
