import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const KW = 1e-14;
const TYPES = ["strong-acid", "strong-base", "weak-acid", "weak-base", "buffer", "from-ph"];

export const meta = {
  description: "ہائیڈروجن آئن کی pH، pOH، اور H+ و OH- کے ارتکاز کا حساب کریں، مضبوط اور کمزور تیزابوں اور اساس اور بفر محلول کے لیے ہینڈرسن–ہیسلباخ مساوات سے، ساتھ آئنائزیشن کا فیصد اور 25 °C پر محلول کی تیزابی، اساسی یا متعادل درجہ بندی۔",
  keywords: ["pH", "pOH", "تیزاب", "اساس", "مضبوط تیزاب", "کمزور تیزاب", "Ka", "Kb", "pKa", "بفر محلول", "ہینڈرسن–ہیسلباخ", "Henderson", "آئنائزیشن", "Kw"],
  formulas: [
    { label: "25 °C پر پانی", tex: "K_w = [H^+][OH^-] = 10^{-14},\\qquad pH + pOH = 14" },
    { label: "کمزور تیزاب", tex: "x^2 + K_a x - K_a C = 0,\\qquad [H^+] = x" },
    { label: "بفر محلول", tex: "pH = pK_a + \\log\\frac{[A^-]}{[HA]}" }
  ],
  inputs: [
    { id: "type", label: "محلول کی قسم", type: "select", default: "strong-acid", options: [["strong-acid", "مضبوط تیزاب"], ["strong-base", "مضبوط اساس"], ["weak-acid", "کمزور تیزاب"], ["weak-base", "کمزور اساس"], ["buffer", "بفر محلول (ہینڈرسن–ہیسلباخ)"], ["from-ph", "pH سے [H+] اور [OH-] تک"]] },
    { id: "C", label: "تحلیلی ارتکاز C", unit: "M", type: "number", default: "0.01", when: { type: ["strong-acid", "strong-base", "weak-acid", "weak-base"] } },
    { id: "hydroxides", label: "اساس میں OH- گروپس کی تعداد", type: "select", default: "1", options: [["1", "1 (جیسے NaOH)"], ["2", "2 (جیسے Ca(OH)2)"]], when: { type: ["strong-base"] } },
    { id: "constKind", label: "درج شدہ مستقل کی قسم", type: "select", default: "K", options: [["K", "K (Ka یا Kb)"], ["pK", "pK (pKa یا pKb)"]], when: { type: ["weak-acid", "weak-base"] } },
    { id: "constVal", label: "مستقل کی قدر", type: "number", default: "1.8e-5", when: { type: ["weak-acid", "weak-base"] }, help: "مثال: ایسیٹک ایسڈ Ka = 1.8e-5 یا pKa = 4.74۔" },
    { id: "pKa", label: "بفر کا pKa", type: "number", default: "4.76", when: { type: ["buffer"] } },
    { id: "A", label: "مشترکہ آئن [A-] کا ارتکاز", unit: "M", type: "number", default: "0.1", when: { type: ["buffer"] } },
    { id: "HA", label: "تیزاب [HA] کا ارتکاز", unit: "M", type: "number", default: "0.1", when: { type: ["buffer"] } },
    { id: "pH", label: "pH کی قدر", type: "number", default: "7", when: { type: ["from-ph"] } }
  ],
  example: { values: { type: "strong-acid", C: "0.01", hydroxides: "1", constKind: "K", constVal: "", pKa: "", A: "", HA: "", pH: "" }, expect: ["pH = 2"], note: "مثال: 0.01 M ارتکاز والا HCl تیزاب۔" },
  invalid: { values: { type: "weak-acid", C: "0", hydroxides: "1", constKind: "K", constVal: "1.8e-5", pKa: "", A: "", HA: "", pH: "" } },
  related: ["solutions", "reaction-kinetics", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function finish(H, steps, extra = []) {
  const OH = KW / H;
  const pH = -Math.log10(H);
  const pOH = -Math.log10(OH);
  const nature = Math.abs(pH - 7) < 1e-9 ? "متعادل" : pH < 7 ? "تیزابی" : "اساسی";
  const all = [...steps, { text: "pH اور pOH:", tex: `pH = -\\log[H^+] = ${ntex(pH, 6)},\\qquad pOH = 14 - pH = ${ntex(pOH, 6)}` }];
  return {
    results: [
      { label: "pH", value: fmt(pH, 5) },
      { label: "pOH", value: fmt(pOH, 5) },
      { label: "ہائیڈروجن آئن کا ارتکاز [H+]", value: `${fmt(H, 4)} M` },
      { label: "ہائیڈروآکسائیڈ آئن کا ارتکاز [OH-]", value: `${fmt(OH, 4)} M` },
      { label: "محلول کی نوعیت", value: nature },
      ...extra
    ],
    steps: all,
    copy: `pH = ${fmt(pH, 5)} (${nature})، pOH = ${fmt(pOH, 5)}، [H+] = ${fmt(H, 4)} M`
  };
}

function strongAcid(input) {
  const C = num(input, "C", "تیزاب کا ارتکاز", { positive: true });
  const exact = C < 1e-6;
  const H = exact ? (C + Math.sqrt(C * C + 4 * KW)) / 2 : C;
  const steps = [{ text: "مضبوط مونو پروٹک تیزاب، [H+] = C:", tex: `[H^+] = C = ${ntex(C)}\\ M` }];
  if (exact) steps.push({ text: "ارتکاز بہت کم ہے، اس لیے ہم پانی سے آنے والے H+ آئنز کو بھی شمار کرتے ہیں:", tex: `[H^+] = \\frac{C + \\sqrt{C^2 + 4K_w}}{2} = ${ntex(H, 6)}\\ M` });
  return finish(H, steps);
}

function strongBase(input) {
  const C = num(input, "C", "اساس کا ارتکاز", { positive: true });
  const n = Number(choice(input, "hydroxides", "OH- گروپس کی تعداد", ["1", "2"], "1"));
  const c2 = n * C;
  const exact = c2 < 1e-6;
  const OH = exact ? (c2 + Math.sqrt(c2 * c2 + 4 * KW)) / 2 : c2;
  const steps = [{ text: `مضبوط اساس، OH- گروپس کی تعداد = ${n}، لہٰذا [OH-] = n·C:`, tex: `[OH^-] = ${n} \\times ${ntex(C)} = ${ntex(c2, 6)}\\ M` }];
  if (exact) steps.push({ text: "ارتکاز بہت کم ہے، اس لیے ہم پانی سے آنے والے OH- آئنز کو بھی شمار کرتے ہیں:", tex: `[OH^-] = \\frac{n C + \\sqrt{(nC)^2 + 4K_w}}{2} = ${ntex(OH, 6)}\\ M` });
  return finish(KW / OH, steps);
}

function constant(input, label) {
  const kind = choice(input, "constKind", "مستقل کی قسم", ["K", "pK"], "K");
  const v = num(input, "constVal", label, kind === "K" ? { positive: true } : {});
  return kind === "K" ? v : Math.pow(10, -v);
}

function weak(input, isAcid) {
  const C = num(input, "C", isAcid ? "تیزاب کا ارتکاز" : "اساس کا ارتکاز", { positive: true });
  const K = constant(input, isAcid ? "Ka یا pKa کی قدر" : "Kb یا pKb کی قدر");
  const sym = isAcid ? "a" : "b";
  const x = (2 * K * C) / (K + Math.sqrt(K * K + 4 * K * C));
  const alpha = (100 * x) / C;
  const steps = [
    { text: "توازن کی مربعی مساوات، جہاں x = تیزاب کے لیے [H+] یا اساس کے لیے [OH-]:", tex: `x^2 + K_${sym} x - K_${sym} C = 0,\\qquad K_${sym} = ${ntex(K, 6)},\\quad C = ${ntex(C)}` },
    { text: "مثبت جذر:", tex: `x = \\frac{2K_${sym}C}{K_${sym} + \\sqrt{K_${sym}^2 + 4K_${sym}C}} = ${ntex(x, 6)}\\ M` }
  ];
  const extra = [{ label: "آئنائزیشن کا فیصد α", value: `${fmt(alpha, 4)} %` }];
  return finish(isAcid ? x : KW / x, steps, extra);
}

function buffer(input) {
  const pKa = num(input, "pKa", "pKa");
  const A = num(input, "A", "[A-] کا ارتکاز", { positive: true });
  const HA = num(input, "HA", "[HA] کا ارتکاز", { positive: true });
  const pH = pKa + Math.log10(A / HA);
  const steps = [{ text: "ہینڈرسن–ہیسلباخ مساوات:", tex: `pH = pK_a + \\log\\frac{[A^-]}{[HA]} = ${ntex(pKa)} + \\log\\frac{${ntex(A)}}{${ntex(HA)}} = ${ntex(pH, 6)}` }];
  return finish(Math.pow(10, -pH), steps);
}

function fromPh(input) {
  const pH = num(input, "pH", "pH کی قدر", { min: 0, max: 14 });
  const H = Math.pow(10, -pH);
  const steps = [{ text: "[H+] = 10^(-pH):", tex: `[H^+] = 10^{-${ntex(pH)}} = ${ntex(H, 6)}\\ M` }];
  return finish(H, steps);
}

export function solve(input) {
  const type = choice(input, "type", "محلول کی قسم", TYPES, "strong-acid");
  if (type === "strong-acid") return strongAcid(input);
  if (type === "strong-base") return strongBase(input);
  if (type === "weak-acid") return weak(input, true);
  if (type === "weak-base") return weak(input, false);
  if (type === "buffer") return buffer(input);
  return fromPh(input);
}
