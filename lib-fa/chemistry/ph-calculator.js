import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const KW = 1e-14;
const TYPES = ["strong-acid", "strong-base", "weak-acid", "weak-base", "buffer", "from-ph"];

export const meta = {
  description: "محاسبه pH و pOH و غلظت یون‌های H+ و OH- برای اسیدها و بازهای قوی و ضعیف و محلول‌های بافر با معادله هندرسون–هاسلباخ، همراه با درجه یونش و طبقه‌بندی محلول به اسیدی یا بازی یا خنثی در 25 °C.",
  keywords: ["pH", "pOH", "اسید", "باز", "اسید قوی", "اسید ضعیف", "Ka", "Kb", "pKa", "محلول بافر", "هندرسون–هاسلباخ", "Henderson", "یونش", "Kw"],
  formulas: [
    { label: "آب در 25 °C", tex: "K_w = [H^+][OH^-] = 10^{-14},\\qquad pH + pOH = 14" },
    { label: "اسید ضعیف", tex: "x^2 + K_a x - K_a C = 0,\\qquad [H^+] = x" },
    { label: "محلول بافر", tex: "pH = pK_a + \\log\\frac{[A^-]}{[HA]}" }
  ],
  inputs: [
    { id: "type", label: "نوع محلول", type: "select", default: "strong-acid", options: [["strong-acid", "اسید قوی"], ["strong-base", "باز قوی"], ["weak-acid", "اسید ضعیف"], ["weak-base", "باز ضعیف"], ["buffer", "محلول بافر (هندرسون–هاسلباخ)"], ["from-ph", "از pH به [H+] و [OH-]"]] },
    { id: "C", label: "غلظت تحلیلی C", unit: "M", type: "number", default: "0.01", when: { type: ["strong-acid", "strong-base", "weak-acid", "weak-base"] } },
    { id: "hydroxides", label: "تعداد گروه‌های OH- در باز", type: "select", default: "1", options: [["1", "1 (مانند NaOH)"], ["2", "2 (مانند Ca(OH)2)"]], when: { type: ["strong-base"] } },
    { id: "constKind", label: "نوع ثابت وارد شده", type: "select", default: "K", options: [["K", "K (Ka یا Kb)"], ["pK", "pK (pKa یا pKb)"]], when: { type: ["weak-acid", "weak-base"] } },
    { id: "constVal", label: "مقدار ثابت", type: "number", default: "1.8e-5", when: { type: ["weak-acid", "weak-base"] }, help: "مثال: اسید استیک Ka = 1.8e-5 یا pKa = 4.74." },
    { id: "pKa", label: "pKa محلول بافر", type: "number", default: "4.76", when: { type: ["buffer"] } },
    { id: "A", label: "غلظت یون مزدوج [A-]", unit: "M", type: "number", default: "0.1", when: { type: ["buffer"] } },
    { id: "HA", label: "غلظت اسید [HA]", unit: "M", type: "number", default: "0.1", when: { type: ["buffer"] } },
    { id: "pH", label: "مقدار pH", type: "number", default: "7", when: { type: ["from-ph"] } }
  ],
  example: { values: { type: "strong-acid", C: "0.01", hydroxides: "1", constKind: "K", constVal: "", pKa: "", A: "", HA: "", pH: "" }, expect: ["pH = 2"], note: "مثال: اسید HCl با غلظت 0.01 M." },
  invalid: { values: { type: "weak-acid", C: "0", hydroxides: "1", constKind: "K", constVal: "1.8e-5", pKa: "", A: "", HA: "", pH: "" } },
  related: ["solutions", "reaction-kinetics", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function finish(H, steps, extra = []) {
  const OH = KW / H;
  const pH = -Math.log10(H);
  const pOH = -Math.log10(OH);
  const nature = Math.abs(pH - 7) < 1e-9 ? "خنثی" : pH < 7 ? "اسیدی" : "بازی";
  const all = [...steps, { text: "pH و pOH:", tex: `pH = -\\log[H^+] = ${ntex(pH, 6)},\\qquad pOH = 14 - pH = ${ntex(pOH, 6)}` }];
  return {
    results: [
      { label: "pH", value: fmt(pH, 5) },
      { label: "pOH", value: fmt(pOH, 5) },
      { label: "غلظت یون هیدروژن [H+]", value: `${fmt(H, 4)} M` },
      { label: "غلظت یون هیدروکسید [OH-]", value: `${fmt(OH, 4)} M` },
      { label: "ماهیت محلول", value: nature },
      ...extra
    ],
    steps: all,
    copy: `pH = ${fmt(pH, 5)} (${nature})، pOH = ${fmt(pOH, 5)}، [H+] = ${fmt(H, 4)} M`
  };
}

function strongAcid(input) {
  const C = num(input, "C", "غلظت اسید", { positive: true });
  const exact = C < 1e-6;
  const H = exact ? (C + Math.sqrt(C * C + 4 * KW)) / 2 : C;
  const steps = [{ text: "اسید قوی تک‌پروتونه، [H+] = C:", tex: `[H^+] = C = ${ntex(C)}\\ M` }];
  if (exact) steps.push({ text: "غلظت بسیار کم است، پس یون‌های H+ حاصل از آب را هم در محاسبه لحاظ می‌کنیم:", tex: `[H^+] = \\frac{C + \\sqrt{C^2 + 4K_w}}{2} = ${ntex(H, 6)}\\ M` });
  return finish(H, steps);
}

function strongBase(input) {
  const C = num(input, "C", "غلظت باز", { positive: true });
  const n = Number(choice(input, "hydroxides", "تعداد گروه‌های OH-", ["1", "2"], "1"));
  const c2 = n * C;
  const exact = c2 < 1e-6;
  const OH = exact ? (c2 + Math.sqrt(c2 * c2 + 4 * KW)) / 2 : c2;
  const steps = [{ text: `باز قوی، تعداد گروه‌های OH- = ${n}، پس [OH-] = n·C:`, tex: `[OH^-] = ${n} \\times ${ntex(C)} = ${ntex(c2, 6)}\\ M` }];
  if (exact) steps.push({ text: "غلظت بسیار کم است، پس یون‌های OH- حاصل از آب را هم در محاسبه لحاظ می‌کنیم:", tex: `[OH^-] = \\frac{n C + \\sqrt{(nC)^2 + 4K_w}}{2} = ${ntex(OH, 6)}\\ M` });
  return finish(KW / OH, steps);
}

function constant(input, label) {
  const kind = choice(input, "constKind", "نوع ثابت", ["K", "pK"], "K");
  const v = num(input, "constVal", label, kind === "K" ? { positive: true } : {});
  return kind === "K" ? v : Math.pow(10, -v);
}

function weak(input, isAcid) {
  const C = num(input, "C", isAcid ? "غلظت اسید" : "غلظت باز", { positive: true });
  const K = constant(input, isAcid ? "مقدار Ka یا pKa" : "مقدار Kb یا pKb");
  const sym = isAcid ? "a" : "b";
  const x = (2 * K * C) / (K + Math.sqrt(K * K + 4 * K * C));
  const alpha = (100 * x) / C;
  const steps = [
    { text: "معادله تعادل درجه دوم، که در آن x = [H+] برای اسید یا [OH-] برای باز است:", tex: `x^2 + K_${sym} x - K_${sym} C = 0,\\qquad K_${sym} = ${ntex(K, 6)},\\quad C = ${ntex(C)}` },
    { text: "ریشه مثبت:", tex: `x = \\frac{2K_${sym}C}{K_${sym} + \\sqrt{K_${sym}^2 + 4K_${sym}C}} = ${ntex(x, 6)}\\ M` }
  ];
  const extra = [{ label: "درجه یونش α", value: `${fmt(alpha, 4)} %` }];
  return finish(isAcid ? x : KW / x, steps, extra);
}

function buffer(input) {
  const pKa = num(input, "pKa", "pKa");
  const A = num(input, "A", "غلظت [A-]", { positive: true });
  const HA = num(input, "HA", "غلظت [HA]", { positive: true });
  const pH = pKa + Math.log10(A / HA);
  const steps = [{ text: "معادله هندرسون–هاسلباخ:", tex: `pH = pK_a + \\log\\frac{[A^-]}{[HA]} = ${ntex(pKa)} + \\log\\frac{${ntex(A)}}{${ntex(HA)}} = ${ntex(pH, 6)}` }];
  return finish(Math.pow(10, -pH), steps);
}

function fromPh(input) {
  const pH = num(input, "pH", "مقدار pH", { min: 0, max: 14 });
  const H = Math.pow(10, -pH);
  const steps = [{ text: "[H+] = 10^(-pH):", tex: `[H^+] = 10^{-${ntex(pH)}} = ${ntex(H, 6)}\\ M` }];
  return finish(H, steps);
}

export function solve(input) {
  const type = choice(input, "type", "نوع محلول", TYPES, "strong-acid");
  if (type === "strong-acid") return strongAcid(input);
  if (type === "strong-base") return strongBase(input);
  if (type === "weak-acid") return weak(input, true);
  if (type === "weak-base") return weak(input, false);
  if (type === "buffer") return buffer(input);
  return fromPh(input);
}
