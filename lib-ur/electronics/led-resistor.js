import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "کسی بھی سپلائی وولٹیج اور سیریز میں LED کی کسی بھی تعداد کے لیے درکار مزاحم کا حساب لگائیں، ساتھ قریب ترین محفوظ معیاری قدر، اس میں اصل کرنٹ اور مطلوبہ مزاحم کی طاقت کی درجہ بندی۔",
  keywords: ["LED مزاحم", "LED", "LED resistor", "فارورڈ وولٹیج", "LED کرنٹ", "کرنٹ محدود کرنے والا مزاحم"],
  formulas: [{ label: "کرنٹ محدود کرنے والا مزاحم", tex: "R = \\frac{V_s - n V_F}{I_F},\\qquad P_R = I_F^2 R" }],
  inputs: [
    { id: "Vs", label: "سپلائی وولٹیج Vs", unit: "V", type: "number", default: "5" },
    { id: "Vf", label: "ہر LED کا فارورڈ وولٹیج", unit: "V", type: "number", default: "2", help: "تقریباً: سرخ 2 V، سبز/نیلا/سفید 3 V۔" },
    { id: "If", label: "درکار LED کرنٹ", unit: "A", type: "number", default: "20m" },
    { id: "n", label: "سیریز میں LED کی تعداد", type: "number", default: "1" },
    { id: "series", label: "معیاری سلسلہ", type: "select", default: "E12", options: [["E12", "E12"], ["E24", "E24"], ["E96", "E96"]] }
  ],
  example: { values: { Vs: "5", Vf: "2", If: "20m", n: "1", series: "E12" }, expect: ["R = 150 Ω", "150 Ω (E12)"], note: "مثال: 20 mA کرنٹ کے ساتھ 5 V سے سرخ LED۔" },
  invalid: { values: { Vs: "5", Vf: "3", If: "20m", n: "2" } },
  related: ["ohms-law", "resistor-color-code", "standard-resistor-values", "zener-regulator"]
};

export function solve(input) {
  const Vs = num(input, "Vs", "سپلائی وولٹیج", { positive: true });
  const Vf = num(input, "Vf", "فارورڈ وولٹیج", { positive: true });
  const If = num(input, "If", "کرنٹ", { positive: true });
  const n = num(input, "n", "LED کی تعداد", { integer: true, min: 1, max: 100 });
  const series = choice(input, "series", "سلسلہ", ["E12", "E24", "E96"], "E12");
  const Vr = Vs - n * Vf;
  if (Vr <= 0) fail(`سپلائی وولٹیج (${fmt(Vs)} V) سیریز میں ${n} LED چلانے کے لیے کافی نہیں ہے (${fmt(n * Vf)} V)۔ ان کی تعداد کم کریں یا وولٹیج بڑھائیں۔`, "n");
  const R = Vr / If;
  const std = nearest(R, series);
  const Rstd = std.above;
  const Iact = Vr / Rstd, P = Iact * Iact * Rstd;
  const rating = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10].find((w) => w >= 2 * P) ?? 10;
  const steps = [
    { text: "مزاحم پر باقی وولٹیج:", tex: `V_R = V_s - nV_F = ${ntex(Vs)} - ${n} \\times ${ntex(Vf)} = ${ntex(Vr, 6)}\\ V` },
    { text: "اوہم کے قانون سے حاصل کردہ مزاحمت:", tex: `R = \\frac{V_R}{I_F} = \\frac{${ntex(Vr, 6)}}{${ntex(If)}} = ${ntex(R, 6)}\\ \\Omega` },
    `ہم ${series} سلسلے سے قریب ترین بڑی معیاری قدر منتخب کرتے ہیں تاکہ کرنٹ درکار قدر سے تجاوز نہ کرے: ${eng(Rstd, "Ω")}۔`,
    { text: "مزاحم میں اصل کرنٹ اور طاقت:", tex: `I = \\frac{${ntex(Vr, 6)}}{${ntex(Rstd)}} = ${ntex(Iact, 5)}\\ A,\\quad P = I^2R = ${ntex(P, 5)}\\ W` },
    `حفاظت کے لیے ہم ایسا مزاحم منتخب کرتے ہیں جس کی طاقت کم از کم حساب شدہ طاقت کی دوگنی ہو: ${fmt(rating)} W۔`
  ];
  return {
    results: [
      { label: "حساب شدہ مزاحمت", value: eng(R, "Ω", 4), text: `R = ${eng(R, "Ω", 4)}` },
      { label: `${series} کی قریب ترین محفوظ قدر`, value: eng(Rstd, "Ω"), text: `${series}: ${eng(Rstd, "Ω")}` },
      { label: "اصل کرنٹ", value: eng(Iact, "A", 4) },
      { label: "مزاحم کی طاقت", value: eng(P, "W", 4) },
      { label: "تجویز کردہ مزاحم کی طاقت", value: `${fmt(rating)} W` },
      { label: "فی LED طاقت", value: eng(Vf * Iact, "W", 4) }
    ],
    steps, copy: `R = ${eng(R, "Ω", 4)} → ${eng(Rstd, "Ω")} (${series}), I = ${eng(Iact, "A", 4)}, P = ${eng(P, "W", 3)}`
  };
}
