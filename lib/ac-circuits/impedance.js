import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cfmt, ctex } from "../core/complex.js";
import { zR, zL, zC, deg, cabs } from "./common.js";
import { logspaceSafe } from "../dc-circuits/common.js";

export const meta = {
  description: "احسب ممانعة المقاومة والملف والمكثف عند أي تردد: المفاعلة والممانعة المركبة ومقدارها وزاويتها والمسامحة، مع منحنى المفاعلة مقابل التردد.",
  keywords: ["ممانعة", "مفاعلة", "impedance", "reactance", "مفاعلة حثية", "مفاعلة سعوية", "مسامحة", "admittance"],
  formulas: [
    { label: "المقاومة والملف والمكثف", tex: "Z_R = R,\\qquad Z_L = j\\omega L = jX_L,\\qquad Z_C = \\frac{1}{j\\omega C} = -jX_C" },
    { label: "المفاعلات", tex: "X_L = 2\\pi f L,\\qquad X_C = \\frac{1}{2\\pi f C},\\qquad Y = \\frac{1}{Z}" }
  ],
  inputs: [
    { id: "el", label: "العنصر", type: "select", default: "C", options: [["R", "مقاومة R"], ["L", "ملف L"], ["C", "مكثف C"]] },
    { id: "val", label: "القيمة (Ω أو H أو F)", type: "number", default: "10u", help: "مثل 100 أو 10m أو 4.7u أو 22n." },
    { id: "f", label: "التردد f", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { el: "C", val: "10u", f: "50" }, expect: ["Z = -318.31j"], note: "مثال: مكثف 10 µF عند 50 Hz." },
  invalid: { values: { el: "C", val: "10u", f: "0" } },
  related: ["rlc-circuit", "resonance", "passive-filter", "complex-numbers"]
};

export function solve(input) {
  const el = choice(input, "el", "العنصر", ["R", "L", "C"], "C");
  const val = num(input, "val", "القيمة", { positive: true });
  const f = num(input, "f", "التردد", { positive: true });
  const w = 2 * Math.PI * f;
  const Z = el === "R" ? zR(val) : el === "L" ? zL(val, w) : zC(val, w);
  const X = Z.im;
  const steps = [{ text: "التردد الزاوي:", tex: `\\omega = 2\\pi f = 2\\pi \\times ${ntex(f)} = ${ntex(w, 6)}\\ \\text{rad/s}` }];
  if (el === "R") steps.push("المقاومة المثالية لا تعتمد على التردد، وزاويتها صفر (الجهد والتيار في طور واحد).");
  if (el === "L") steps.push({ text: "مفاعلة الملف تزيد خطياً مع التردد، والجهد يسبق التيار بـ 90°:", tex: `X_L = \\omega L = ${ntex(w, 6)} \\times ${ntex(val)} = ${ntex(X, 6)}\\ \\Omega,\\quad Z_L = j${ntex(X, 6)}\\ \\Omega` });
  if (el === "C") steps.push({ text: "مفاعلة المكثف تقل مع زيادة التردد، والتيار يسبق الجهد بـ 90°:", tex: `X_C = \\frac{1}{\\omega C} = \\frac{1}{${ntex(w, 6)} \\times ${ntex(val)}} = ${ntex(-X, 6)}\\ \\Omega,\\quad Z_C = -j${ntex(-X, 6)}\\ \\Omega` });
  const Y = { re: Z.re / (cabs(Z) ** 2), im: -Z.im / (cabs(Z) ** 2) };
  steps.push({ text: "المسامحة هي مقلوب الممانعة:", tex: `Y = \\frac{1}{Z} = ${ctex(Y, 6)}\\ S` });
  const unit = el === "R" ? "Ω" : el === "L" ? "H" : "F";
  const fs = logspaceSafe(f / 100, f * 100, 200);
  const curve = el === "R" ? fs.map((x) => [x, val]) : el === "L" ? fs.map((x) => [x, 2 * Math.PI * x * val]) : fs.map((x) => [x, 1 / (2 * Math.PI * x * val)]);
  return {
    results: [
      { label: "الممانعة المركبة Z", tex: `${ctex(Z, 6)}\\ \\Omega`, text: `Z = ${cfmt(Z, 6)} Ω` },
      { label: "المقدار |Z|", value: eng(cabs(Z), "Ω", 5) },
      { label: "الزاوية", value: deg(Z), unit: "°", sig: 4 },
      { label: el === "R" ? "المقاومة" : "المفاعلة", value: eng(Math.abs(el === "R" ? Z.re : X), "Ω", 5) },
      { label: "المسامحة Y", text: cfmt(Y, 5), tex: `${ctex(Y, 5)}\\ S` }
    ],
    blocks: [{ type: "plot", title: `${el === "R" ? "المقاومة" : "المفاعلة"} مقابل التردد للعنصر ${eng(val, unit)}`, logX: true, xLabel: "f (Hz)", yLabel: "|X| (Ω)", series: [{ name: "|Z|", points: curve }], vlines: [{ x: f }] }],
    steps, copy: `Z = ${cfmt(Z, 6)} Ω (|Z| = ${eng(cabs(Z), "Ω", 5)}, ${fmt(deg(Z), 4)}°)`
  };
}
