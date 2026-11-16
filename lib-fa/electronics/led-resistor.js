import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "مقاومت مناسب LED را برای هر ولتاژ تغذیه و هر تعداد LED سری محاسبه کنید، همراه با نزدیک‌ترین مقدار استاندارد و ایمن، جریان واقعی با آن و توان موردنیاز مقاومت.",
  keywords: ["مقاومت LED", "LED", "LED resistor", "ولتاژ مستقیم", "جریان LED", "مقاومت محدودکنندهٔ جریان"],
  formulas: [{ label: "مقاومت محدودکنندهٔ جریان", tex: "R = \\frac{V_s - n V_F}{I_F},\\qquad P_R = I_F^2 R" }],
  inputs: [
    { id: "Vs", label: "ولتاژ تغذیه Vs", unit: "V", type: "number", default: "5" },
    { id: "Vf", label: "ولتاژ مستقیم هر LED", unit: "V", type: "number", default: "2", help: "تقریباً: قرمز 2، سبز/آبی/سفید 3 ولت." },
    { id: "If", label: "جریان موردنیاز LED", unit: "A", type: "number", default: "20m" },
    { id: "n", label: "تعداد LED سری", type: "number", default: "1" },
    { id: "series", label: "سری استاندارد", type: "select", default: "E12", options: [["E12", "E12"], ["E24", "E24"], ["E96", "E96"]] }
  ],
  example: { values: { Vs: "5", Vf: "2", If: "20m", n: "1", series: "E12" }, expect: ["R = 150 Ω", "150 Ω (E12)"], note: "مثال: LED قرمز با تغذیهٔ 5 V و جریان 20 mA." },
  invalid: { values: { Vs: "5", Vf: "3", If: "20m", n: "2" } },
  related: ["ohms-law", "resistor-color-code", "standard-resistor-values", "zener-regulator"]
};

export function solve(input) {
  const Vs = num(input, "Vs", "ولتاژ تغذیه", { positive: true });
  const Vf = num(input, "Vf", "ولتاژ مستقیم", { positive: true });
  const If = num(input, "If", "جریان", { positive: true });
  const n = num(input, "n", "تعداد LED", { integer: true, min: 1, max: 100 });
  const series = choice(input, "series", "سری", ["E12", "E24", "E96"], "E12");
  const Vr = Vs - n * Vf;
  if (Vr <= 0) fail(`ولتاژ تغذیه (${fmt(Vs)} V) برای روشن کردن ${n} LED سری (${fmt(n * Vf)} V) کافی نیست. تعدادشان را کم کنید یا ولتاژ را بالا ببرید.`, "n");
  const R = Vr / If;
  const std = nearest(R, series);
  const Rstd = std.above;
  const Iact = Vr / Rstd, P = Iact * Iact * Rstd;
  const rating = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10].find((w) => w >= 2 * P) ?? 10;
  const steps = [
    { text: "ولتاژ باقی‌مانده روی مقاومت:", tex: `V_R = V_s - nV_F = ${ntex(Vs)} - ${n} \\times ${ntex(Vf)} = ${ntex(Vr, 6)}\\ V` },
    { text: "مقاومت محاسبه‌شده از قانون اهم:", tex: `R = \\frac{V_R}{I_F} = \\frac{${ntex(Vr, 6)}}{${ntex(If)}} = ${ntex(R, 6)}\\ \\Omega` },
    `نزدیک‌ترین مقدار استاندارد بزرگ‌تر از آن را از سری ${series} انتخاب می‌کنیم تا جریان موردنظر بیشتر نشود: ${eng(Rstd, "Ω")}.`,
    { text: "جریان واقعی و توان در مقاومت:", tex: `I = \\frac{${ntex(Vr, 6)}}{${ntex(Rstd)}} = ${ntex(Iact, 5)}\\ A,\\quad P = I^2R = ${ntex(P, 5)}\\ W` },
    `برای ایمنی، مقاومتی انتخاب می‌کنیم که توانش دست‌کم دو برابر توان محاسبه‌شده باشد: ${fmt(rating)} W.`
  ];
  return {
    results: [
      { label: "مقاومت محاسبه‌شده", value: eng(R, "Ω", 4), text: `R = ${eng(R, "Ω", 4)}` },
      { label: `نزدیک‌ترین مقدار ایمن ${series}`, value: eng(Rstd, "Ω"), text: `${series}: ${eng(Rstd, "Ω")}` },
      { label: "جریان واقعی", value: eng(Iact, "A", 4) },
      { label: "توان مقاومت", value: eng(P, "W", 4) },
      { label: "توان توصیه‌شدهٔ مقاومت", value: `${fmt(rating)} W` },
      { label: "توان هر LED", value: eng(Vf * Iact, "W", 4) }
    ],
    steps, copy: `R = ${eng(R, "Ω", 4)} → ${eng(Rstd, "Ω")} (${series}), I = ${eng(Iact, "A", 4)}, P = ${eng(P, "W", 3)}`
  };
}
