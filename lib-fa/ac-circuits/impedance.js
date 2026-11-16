import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { cfmt, ctex } from "../core/complex.js";
import { zR, zL, zC, deg, cabs } from "./common.js";
import { logspaceSafe } from "../dc-circuits/common.js";

export const meta = {
  description: "محاسبه امپدانس مقاومت، سلف و خازن در هر فرکانس: راکتانس، امپدانس مختلط با اندازه و زاویه‌اش، و ادمیتانس، همراه با نمودار راکتانس بر حسب فرکانس.",
  keywords: ["امپدانس", "راکتانس", "impedance", "reactance", "راکتانس سلفی", "راکتانس خازنی", "ادمیتانس", "admittance"],
  formulas: [
    { label: "مقاومت، سلف و خازن", tex: "Z_R = R,\\qquad Z_L = j\\omega L = jX_L,\\qquad Z_C = \\frac{1}{j\\omega C} = -jX_C" },
    { label: "راکتانس‌ها", tex: "X_L = 2\\pi f L,\\qquad X_C = \\frac{1}{2\\pi f C},\\qquad Y = \\frac{1}{Z}" }
  ],
  inputs: [
    { id: "el", label: "عنصر", type: "select", default: "C", options: [["R", "مقاومت R"], ["L", "سلف L"], ["C", "خازن C"]] },
    { id: "val", label: "مقدار (Ω یا H یا F)", type: "number", default: "10u", help: "مثلاً: 100 یا 10m یا 4.7u یا 22n." },
    { id: "f", label: "فرکانس f", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { el: "C", val: "10u", f: "50" }, expect: ["Z = -318.31j"], note: "مثال: خازن 10 میکروفاراد در 50 هرتز." },
  invalid: { values: { el: "C", val: "10u", f: "0" } },
  related: ["rlc-circuit", "resonance", "passive-filter", "complex-numbers"]
};

export function solve(input) {
  const el = choice(input, "el", "عنصر", ["R", "L", "C"], "C");
  const val = num(input, "val", "مقدار", { positive: true });
  const f = num(input, "f", "فرکانس", { positive: true });
  const w = 2 * Math.PI * f;
  const Z = el === "R" ? zR(val) : el === "L" ? zL(val, w) : zC(val, w);
  const X = Z.im;
  const steps = [{ text: "فرکانس زاویه‌ای:", tex: `\\omega = 2\\pi f = 2\\pi \\times ${ntex(f)} = ${ntex(w, 6)}\\ \\text{rad/s}` }];
  if (el === "R") steps.push("مقاومت ایده‌آل به فرکانس وابسته نیست و زاویه‌اش صفر است (ولتاژ و جریان هم‌فازند).");
  if (el === "L") steps.push({ text: "راکتانس سلف به‌طور خطی با فرکانس افزایش می‌یابد و ولتاژ 90 درجه از جریان پیش است:", tex: `X_L = \\omega L = ${ntex(w, 6)} \\times ${ntex(val)} = ${ntex(X, 6)}\\ \\Omega,\\quad Z_L = j${ntex(X, 6)}\\ \\Omega` });
  if (el === "C") steps.push({ text: "راکتانس خازن با افزایش فرکانس کاهش می‌یابد و جریان 90 درجه از ولتاژ پیش است:", tex: `X_C = \\frac{1}{\\omega C} = \\frac{1}{${ntex(w, 6)} \\times ${ntex(val)}} = ${ntex(-X, 6)}\\ \\Omega,\\quad Z_C = -j${ntex(-X, 6)}\\ \\Omega` });
  const Y = { re: Z.re / (cabs(Z) ** 2), im: -Z.im / (cabs(Z) ** 2) };
  steps.push({ text: "ادمیتانس معکوس امپدانس است:", tex: `Y = \\frac{1}{Z} = ${ctex(Y, 6)}\\ S` });
  const unit = el === "R" ? "Ω" : el === "L" ? "H" : "F";
  const fs = logspaceSafe(f / 100, f * 100, 200);
  const curve = el === "R" ? fs.map((x) => [x, val]) : el === "L" ? fs.map((x) => [x, 2 * Math.PI * x * val]) : fs.map((x) => [x, 1 / (2 * Math.PI * x * val)]);
  return {
    results: [
      { label: "امپدانس مختلط Z", tex: `${ctex(Z, 6)}\\ \\Omega`, text: `Z = ${cfmt(Z, 6)} Ω` },
      { label: "اندازه |Z|", value: eng(cabs(Z), "Ω", 5) },
      { label: "زاویه", value: deg(Z), unit: "°", sig: 4 },
      { label: el === "R" ? "مقاومت" : "راکتانس", value: eng(Math.abs(el === "R" ? Z.re : X), "Ω", 5) },
      { label: "ادمیتانس Y", text: cfmt(Y, 5), tex: `${ctex(Y, 5)}\\ S` }
    ],
    blocks: [{ type: "plot", title: `${el === "R" ? "مقاومت" : "راکتانس"} بر حسب فرکانس برای عنصر ${eng(val, unit)}`, logX: true, xLabel: "f (Hz)", yLabel: "|X| (Ω)", series: [{ name: "|Z|", points: curve }], vlines: [{ x: f }] }],
    steps, copy: `Z = ${cfmt(Z, 6)} Ω (|Z| = ${eng(cabs(Z), "Ω", 5)}, ${fmt(deg(Z), 4)}°)`
  };
}
