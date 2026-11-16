import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cfmt, ctex } from "../core/complex.js";
import { zR, zL, zC, deg, cabs } from "./common.js";
import { logspaceSafe } from "../dc-circuits/common.js";

export const meta = {
  description: "کسی بھی فریکوئنسی پر ریزسٹر، انڈکٹر اور کیپیسٹر کا امپیڈنس حساب کریں: ری ایکٹنس، کمپلیکس امپیڈنس اس کی مقدار اور زاویے کے ساتھ، اور ایڈمٹنس، ساتھ ری ایکٹنس بمقابلہ فریکوئنسی کا گراف۔",
  keywords: ["امپیڈنس", "ری ایکٹنس", "impedance", "reactance", "انڈکٹو ری ایکٹنس", "کیپیسٹو ری ایکٹنس", "ایڈمٹنس", "admittance"],
  formulas: [
    { label: "ریزسٹر، انڈکٹر اور کیپیسٹر", tex: "Z_R = R,\\qquad Z_L = j\\omega L = jX_L,\\qquad Z_C = \\frac{1}{j\\omega C} = -jX_C" },
    { label: "ری ایکٹنسز", tex: "X_L = 2\\pi f L,\\qquad X_C = \\frac{1}{2\\pi f C},\\qquad Y = \\frac{1}{Z}" }
  ],
  inputs: [
    { id: "el", label: "عنصر", type: "select", default: "C", options: [["R", "ریزسٹر R"], ["L", "انڈکٹر L"], ["C", "کیپیسٹر C"]] },
    { id: "val", label: "قدر (Ω یا H یا F)", type: "number", default: "10u", help: "مثلاً 100 یا 10m یا 4.7u یا 22n۔" },
    { id: "f", label: "فریکوئنسی f", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { el: "C", val: "10u", f: "50" }, expect: ["Z = -318.31j"], note: "مثال: 50 Hz پر 10 µF کا کیپیسٹر۔" },
  invalid: { values: { el: "C", val: "10u", f: "0" } },
  related: ["rlc-circuit", "resonance", "passive-filter", "complex-numbers"]
};

export function solve(input) {
  const el = choice(input, "el", "عنصر", ["R", "L", "C"], "C");
  const val = num(input, "val", "قدر", { positive: true });
  const f = num(input, "f", "فریکوئنسی", { positive: true });
  const w = 2 * Math.PI * f;
  const Z = el === "R" ? zR(val) : el === "L" ? zL(val, w) : zC(val, w);
  const X = Z.im;
  const steps = [{ text: "اینگولر فریکوئنسی:", tex: `\\omega = 2\\pi f = 2\\pi \\times ${ntex(f)} = ${ntex(w, 6)}\\ \\text{rad/s}` }];
  if (el === "R") steps.push("آئیڈیل ریزسٹر کا امپیڈنس فریکوئنسی پر منحصر نہیں ہوتا، اور اس کا زاویہ صفر ہے (وولٹیج اور کرنٹ ہم فیز ہوتے ہیں)۔");
  if (el === "L") steps.push({ text: "انڈکٹر کا ری ایکٹنس فریکوئنسی کے ساتھ خطی طور پر بڑھتا ہے، اور وولٹیج کرنٹ سے 90° آگے ہوتا ہے:", tex: `X_L = \\omega L = ${ntex(w, 6)} \\times ${ntex(val)} = ${ntex(X, 6)}\\ \\Omega,\\quad Z_L = j${ntex(X, 6)}\\ \\Omega` });
  if (el === "C") steps.push({ text: "کیپیسٹر کا ری ایکٹنس فریکوئنسی بڑھنے کے ساتھ کم ہوتا ہے، اور کرنٹ وولٹیج سے 90° آگے ہوتا ہے:", tex: `X_C = \\frac{1}{\\omega C} = \\frac{1}{${ntex(w, 6)} \\times ${ntex(val)}} = ${ntex(-X, 6)}\\ \\Omega,\\quad Z_C = -j${ntex(-X, 6)}\\ \\Omega` });
  const Y = { re: Z.re / (cabs(Z) ** 2), im: -Z.im / (cabs(Z) ** 2) };
  steps.push({ text: "ایڈمٹنس امپیڈنس کا معکوس ہے:", tex: `Y = \\frac{1}{Z} = ${ctex(Y, 6)}\\ S` });
  const unit = el === "R" ? "Ω" : el === "L" ? "H" : "F";
  const fs = logspaceSafe(f / 100, f * 100, 200);
  const curve = el === "R" ? fs.map((x) => [x, val]) : el === "L" ? fs.map((x) => [x, 2 * Math.PI * x * val]) : fs.map((x) => [x, 1 / (2 * Math.PI * x * val)]);
  return {
    results: [
      { label: "کمپلیکس امپیڈنس Z", tex: `${ctex(Z, 6)}\\ \\Omega`, text: `Z = ${cfmt(Z, 6)} Ω` },
      { label: "مقدار |Z|", value: eng(cabs(Z), "Ω", 5) },
      { label: "زاویہ", value: deg(Z), unit: "°", sig: 4 },
      { label: el === "R" ? "مزاحمت" : "ری ایکٹنس", value: eng(Math.abs(el === "R" ? Z.re : X), "Ω", 5) },
      { label: "ایڈمٹنس Y", text: cfmt(Y, 5), tex: `${ctex(Y, 5)}\\ S` }
    ],
    blocks: [{ type: "plot", title: `${eng(val, unit)} عنصر کے لیے ${el === "R" ? "مزاحمت" : "ری ایکٹنس"} بمقابلہ فریکوئنسی`, logX: true, xLabel: "f (Hz)", yLabel: "|X| (Ω)", series: [{ name: "|Z|", points: curve }], vlines: [{ x: f }] }],
    steps, copy: `Z = ${cfmt(Z, 6)} Ω (|Z| = ${eng(cabs(Z), "Ω", 5)}, ${fmt(deg(Z), 4)}°)`
  };
}
