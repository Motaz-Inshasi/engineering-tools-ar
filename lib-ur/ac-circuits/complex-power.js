import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "AC سرکٹ میں کمپلیکس پاور: حقیقی، ری ایکٹو اور ظاہری پاور، پاور فیکٹر اور پاور مثلث، اور کسی بھی مطلوبہ پاور فیکٹر کے لیے تصحیحی کیپیسٹر کا حساب۔",
  keywords: ["کمپلیکس پاور", "پاور فیکٹر", "power factor", "پاور فیکٹر کی تصحیح", "پاور مثلث", "حقیقی پاور", "ری ایکٹو پاور", "kVAR", "تصحیحی کیپیسٹر"],
  formulas: [
    { label: "پاور مثلث", tex: "S = V I^* = P + jQ,\\quad P = VI\\cos\\theta,\\quad Q = VI\\sin\\theta,\\quad |S|^2 = P^2 + Q^2" },
    { label: "تصحیحی کیپیسٹر", tex: "Q_C = P(\\tan\\theta_1 - \\tan\\theta_2),\\qquad C = \\frac{Q_C}{\\omega V^2}" }
  ],
  inputs: [
    { id: "mode", label: "ان پٹ ڈیٹا", type: "select", default: "ppf", options: [["ppf", "حقیقی پاور اور پاور فیکٹر"], ["vi", "وولٹیج، کرنٹ اور فیز اینگل"]] },
    { id: "V", label: "وولٹیج (RMS)", unit: "V", type: "number", default: "400" },
    { id: "P", label: "حقیقی پاور P", unit: "W", type: "number", default: "50k", when: { mode: ["ppf"] } },
    { id: "pf", label: "موجودہ پاور فیکٹر", type: "number", default: "0.7", when: { mode: ["ppf"] } },
    { id: "I", label: "کرنٹ (RMS)", unit: "A", type: "number", default: "10", when: { mode: ["vi"] } },
    { id: "theta", label: "زاویہ θ = θv − θi", unit: "°", type: "number", default: "36.87", when: { mode: ["vi"] }, help: "انڈکٹو لوڈ کے لیے مثبت (کرنٹ پیچھے رہتا ہے)۔" },
    { id: "nature", label: "لوڈ کی قسم", type: "select", default: "lag", options: [["lag", "انڈکٹو (لیگنگ)"], ["lead", "کیپیسٹو (لیڈنگ)"]], when: { mode: ["ppf"] } },
    { id: "target", label: "مطلوبہ پاور فیکٹر (اختیاری)", type: "number", default: "0.95" },
    { id: "f", label: "گرڈ فریکوئنسی", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { mode: "ppf", V: "400", P: "50k", pf: "0.7", nature: "lag", target: "0.95", f: "50" }, expect: ["Qc = 34.58 kVAR"], note: "مثال: 0.7 لیگنگ پاور فیکٹر والا 50 kW لوڈ، جسے 0.95 تک درست کیا جاتا ہے۔" },
  invalid: { values: { mode: "ppf", V: "400", P: "50k", pf: "1.3", target: "" } },
  related: ["rlc-circuit", "three-phase", "phasor", "transformer"]
};

export function solve(input) {
  const mode = choice(input, "mode", "ان پٹ ڈیٹا", ["ppf", "vi"], "ppf");
  const V = num(input, "V", "وولٹیج", { positive: true });
  let P, Q, th;
  const steps = [];
  if (mode === "ppf") {
    P = num(input, "P", "حقیقی پاور", { positive: true });
    const pf = num(input, "pf", "پاور فیکٹر", { positive: true, max: 1 });
    const lag = choice(input, "nature", "لوڈ کی قسم", ["lag", "lead"], "lag") === "lag";
    th = (lag ? 1 : -1) * Math.acos(pf);
    Q = P * Math.tan(th);
    steps.push({ text: "پاور فیکٹر سے پاور زاویہ:", tex: `\\theta = ${lag ? "" : "-"}\\cos^{-1}(${ntex(pf)}) = ${ntex((th * 180) / Math.PI, 5)}^\\circ` });
    steps.push({ text: "ری ایکٹو اور ظاہری پاور:", tex: `Q = P\\tan\\theta = ${ntex(Q, 6)}\\ VAR,\\quad |S| = \\frac{P}{PF} = ${ntex(P / pf, 6)}\\ VA` });
  } else {
    const I = num(input, "I", "کرنٹ", { positive: true });
    const deg = num(input, "theta", "زاویہ", { min: -90, max: 90 });
    th = (deg * Math.PI) / 180;
    P = V * I * Math.cos(th);
    Q = V * I * Math.sin(th);
    steps.push({ text: "وولٹیج، کرنٹ اور زاویے سے:", tex: `P = VI\\cos\\theta = ${ntex(P, 6)}\\ W,\\quad Q = VI\\sin\\theta = ${ntex(Q, 6)}\\ VAR` });
  }
  const S = Math.hypot(P, Q), pf = P / S, I = S / V;
  const nature = Math.abs(Q) < 1e-12 * S ? "مزاحمتی" : Q > 0 ? "انڈکٹو (لیگنگ)" : "کیپیسٹو (لیڈنگ)";
  const results = [
    { label: "حقیقی پاور P", value: eng(P, "W", 5) },
    { label: "ری ایکٹو پاور Q", value: eng(Q, "VAR", 5) },
    { label: "ظاہری پاور |S|", value: eng(S, "VA", 5) },
    { label: "پاور فیکٹر", value: `${fmt(pf, 5)} ${nature}` },
    { label: "کرنٹ", value: eng(I, "A", 5) }
  ];
  const target = num(input, "target", "مطلوبہ پاور فیکٹر", { optional: true, positive: true, max: 1 });
  let copy = `P = ${eng(P, "W", 5)}, Q = ${eng(Q, "VAR", 5)}, S = ${eng(S, "VA", 5)}, PF = ${fmt(pf, 5)}`;
  const tri = [[0, 0], [P, 0], [P, Q], [0, 0]];
  const series = [{ name: "پاور مثلث", points: tri }];
  if (target !== null) {
    if (Q <= 0) fail("لوڈ انڈکٹو نہیں ہے، اس لیے کیپیسٹر سے تصحیح لاگو نہیں ہوتی۔", "target");
    if (target <= pf) fail(`مطلوبہ پاور فیکٹر موجودہ پاور فیکٹر سے زیادہ ہونا چاہیے (${fmt(pf, 4)})۔`, "target");
    const f = num(input, "f", "فریکوئنسی", { positive: true });
    const th2 = Math.acos(target);
    const Q2 = P * Math.tan(th2), Qc = Q - Q2;
    const w = 2 * Math.PI * f;
    const Cap = Qc / (w * V * V);
    const I2 = P / target / V;
    steps.push({ text: "تصحیح کے بعد مطلوبہ ری ایکٹو پاور:", tex: `Q_2 = P\\tan(\\cos^{-1}${ntex(target)}) = ${ntex(Q2, 6)}\\ VAR` });
    steps.push({ text: "کیپیسٹر کو یہ فرق فراہم کرنا ہوگا:", tex: `Q_C = Q - Q_2 = ${ntex(Qc, 6)}\\ VAR,\\quad C = \\frac{Q_C}{\\omega V^2} = \\frac{${ntex(Qc, 6)}}{${ntex(w, 6)} \\times ${ntex(V)}^2} = ${ntex(Cap, 6)}\\ F` });
    steps.push(`تصحیح کے بعد، وہی حقیقی پاور کے لیے کرنٹ ${eng(I, "A", 4)} سے کم ہو کر ${eng(I2, "A", 4)} ہو جاتا ہے۔ یہ قدر ان پٹ وولٹیج پر ایک کیپیسٹر کے لیے ہے (سنگل فیز)۔`);
    results.push({ label: "مطلوبہ کیپیسٹر پاور", value: eng(Qc, "VAR", 4), text: `Qc = ${eng(Qc, "VAR", 4)}` }, { label: "کیپیسٹر کی گنجائش", value: eng(Cap, "F", 4) }, { label: "تصحیح کے بعد کرنٹ", value: eng(I2, "A", 4) });
    copy += `\nQc = ${eng(Qc, "VAR", 4)}, C = ${eng(Cap, "F", 4)}`;
    series.push({ name: "تصحیح کے بعد", points: [[0, 0], [P, Q2]], dashed: true });
  }
  return { results, steps, copy, blocks: [{ type: "plot", title: "پاور مثلث (P افقی، Q عمودی)", xLabel: "P (W)", yLabel: "Q (VAR)", includeZero: true, series }] };
}
