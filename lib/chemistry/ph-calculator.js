import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const KW = 1e-14;
const TYPES = ["strong-acid", "strong-base", "weak-acid", "weak-base", "buffer", "from-ph"];

export const meta = {
  description: "احسب الرقم الهيدروجيني pH وpOH وتركيز أيونات H+ وOH- للحمض والقاعدة القوية والضعيفة والمحلول المنظم بمعادلة هندرسون–هاسلباخ، مع نسبة التأين وتصنيف المحلول إلى حمضي أو قاعدي أو متعادل عند 25 °C.",
  keywords: ["pH", "pOH", "حمض", "قاعدة", "حمض قوي", "حمض ضعيف", "Ka", "Kb", "pKa", "محلول منظم", "هندرسون هاسلباخ", "Henderson", "تأين", "Kw"],
  formulas: [
    { label: "الماء عند 25 °C", tex: "K_w = [H^+][OH^-] = 10^{-14},\\qquad pH + pOH = 14" },
    { label: "حمض ضعيف", tex: "x^2 + K_a x - K_a C = 0,\\qquad [H^+] = x" },
    { label: "محلول منظم", tex: "pH = pK_a + \\log\\frac{[A^-]}{[HA]}" }
  ],
  inputs: [
    { id: "type", label: "نوع المحلول", type: "select", default: "strong-acid", options: [["strong-acid", "حمض قوي"], ["strong-base", "قاعدة قوية"], ["weak-acid", "حمض ضعيف"], ["weak-base", "قاعدة ضعيفة"], ["buffer", "محلول منظم (هندرسون–هاسلباخ)"], ["from-ph", "من pH إلى [H+] و[OH-]"]] },
    { id: "C", label: "التركيز التحليلي C", unit: "M", type: "number", default: "0.01", when: { type: ["strong-acid", "strong-base", "weak-acid", "weak-base"] } },
    { id: "hydroxides", label: "عدد مجموعات OH- في القاعدة", type: "select", default: "1", options: [["1", "1 (مثل NaOH)"], ["2", "2 (مثل Ca(OH)2)"]], when: { type: ["strong-base"] } },
    { id: "constKind", label: "نوع الثابت المُدخل", type: "select", default: "K", options: [["K", "K (Ka أو Kb)"], ["pK", "pK (pKa أو pKb)"]], when: { type: ["weak-acid", "weak-base"] } },
    { id: "constVal", label: "قيمة الثابت", type: "number", default: "1.8e-5", when: { type: ["weak-acid", "weak-base"] }, help: "مثال: acetic acid Ka = 1.8e-5 أو pKa = 4.74." },
    { id: "pKa", label: "pKa للمحلول المنظم", type: "number", default: "4.76", when: { type: ["buffer"] } },
    { id: "A", label: "تركيز الأيون المرافق [A-]", unit: "M", type: "number", default: "0.1", when: { type: ["buffer"] } },
    { id: "HA", label: "تركيز الحمض [HA]", unit: "M", type: "number", default: "0.1", when: { type: ["buffer"] } },
    { id: "pH", label: "قيمة pH", type: "number", default: "7", when: { type: ["from-ph"] } }
  ],
  example: { values: { type: "strong-acid", C: "0.01", hydroxides: "1", constKind: "K", constVal: "", pKa: "", A: "", HA: "", pH: "" }, expect: ["pH = 2"], note: "مثال: حمض HCl تركيزه 0.01 M." },
  invalid: { values: { type: "weak-acid", C: "0", hydroxides: "1", constKind: "K", constVal: "1.8e-5", pKa: "", A: "", HA: "", pH: "" } },
  related: ["solutions", "reaction-kinetics", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function finish(H, steps, extra = []) {
  const OH = KW / H;
  const pH = -Math.log10(H);
  const pOH = -Math.log10(OH);
  const nature = Math.abs(pH - 7) < 1e-9 ? "متعادل" : pH < 7 ? "حمضي" : "قاعدي";
  const all = [...steps, { text: "الرقم الهيدروجيني و pOH:", tex: `pH = -\\log[H^+] = ${ntex(pH, 6)},\\qquad pOH = 14 - pH = ${ntex(pOH, 6)}` }];
  return {
    results: [
      { label: "الرقم الهيدروجيني pH", value: fmt(pH, 5) },
      { label: "pOH", value: fmt(pOH, 5) },
      { label: "تركيز أيونات الهيدروجين [H+]", value: `${fmt(H, 4)} M` },
      { label: "تركيز أيونات الهيدروكسيد [OH-]", value: `${fmt(OH, 4)} M` },
      { label: "طبيعة المحلول", value: nature },
      ...extra
    ],
    steps: all,
    copy: `pH = ${fmt(pH, 5)} (${nature})، pOH = ${fmt(pOH, 5)}، [H+] = ${fmt(H, 4)} M`
  };
}

function strongAcid(input) {
  const C = num(input, "C", "تركيز الحمض", { positive: true });
  const exact = C < 1e-6;
  const H = exact ? (C + Math.sqrt(C * C + 4 * KW)) / 2 : C;
  const steps = [{ text: "حمض قوي أحادي البروتون، [H+] = C:", tex: `[H^+] = C = ${ntex(C)}\\ M` }];
  if (exact) steps.push({ text: "التركيز منخفض جداً، نأخذ في الحساب أيونات H+ من الماء:", tex: `[H^+] = \\frac{C + \\sqrt{C^2 + 4K_w}}{2} = ${ntex(H, 6)}\\ M` });
  return finish(H, steps);
}

function strongBase(input) {
  const C = num(input, "C", "تركيز القاعدة", { positive: true });
  const n = Number(choice(input, "hydroxides", "عدد مجموعات OH-", ["1", "2"], "1"));
  const c2 = n * C;
  const exact = c2 < 1e-6;
  const OH = exact ? (c2 + Math.sqrt(c2 * c2 + 4 * KW)) / 2 : c2;
  const steps = [{ text: `قاعدة قوية، عدد مجموعات OH- = ${n}، فـ [OH-] = n·C:`, tex: `[OH^-] = ${n} \\times ${ntex(C)} = ${ntex(c2, 6)}\\ M` }];
  if (exact) steps.push({ text: "التركيز منخفض جداً، نأخذ في الحساب أيونات OH- من الماء:", tex: `[OH^-] = \\frac{n C + \\sqrt{(nC)^2 + 4K_w}}{2} = ${ntex(OH, 6)}\\ M` });
  return finish(KW / OH, steps);
}

function constant(input, label) {
  const kind = choice(input, "constKind", "نوع الثابت", ["K", "pK"], "K");
  const v = num(input, "constVal", label, kind === "K" ? { positive: true } : {});
  return kind === "K" ? v : Math.pow(10, -v);
}

function weak(input, isAcid) {
  const C = num(input, "C", isAcid ? "تركيز الحمض" : "تركيز القاعدة", { positive: true });
  const K = constant(input, isAcid ? "قيمة Ka أو pKa" : "قيمة Kb أو pKb");
  const sym = isAcid ? "a" : "b";
  const x = (2 * K * C) / (K + Math.sqrt(K * K + 4 * K * C));
  const alpha = (100 * x) / C;
  const steps = [
    { text: "معادلة التوازن التربيعية، حيث x = [H+] للحمض أو [OH-] للقاعدة:", tex: `x^2 + K_${sym} x - K_${sym} C = 0,\\qquad K_${sym} = ${ntex(K, 6)},\\quad C = ${ntex(C)}` },
    { text: "الحل الموجب:", tex: `x = \\frac{2K_${sym}C}{K_${sym} + \\sqrt{K_${sym}^2 + 4K_${sym}C}} = ${ntex(x, 6)}\\ M` }
  ];
  const extra = [{ label: "نسبة التأين α", value: `${fmt(alpha, 4)} %` }];
  return finish(isAcid ? x : KW / x, steps, extra);
}

function buffer(input) {
  const pKa = num(input, "pKa", "pKa");
  const A = num(input, "A", "تركيز [A-]", { positive: true });
  const HA = num(input, "HA", "تركيز [HA]", { positive: true });
  const pH = pKa + Math.log10(A / HA);
  const steps = [{ text: "معادلة هندرسون–هاسلباخ:", tex: `pH = pK_a + \\log\\frac{[A^-]}{[HA]} = ${ntex(pKa)} + \\log\\frac{${ntex(A)}}{${ntex(HA)}} = ${ntex(pH, 6)}` }];
  return finish(Math.pow(10, -pH), steps);
}

function fromPh(input) {
  const pH = num(input, "pH", "قيمة pH", { min: 0, max: 14 });
  const H = Math.pow(10, -pH);
  const steps = [{ text: "[H+] = 10^(-pH):", tex: `[H^+] = 10^{-${ntex(pH)}} = ${ntex(H, 6)}\\ M` }];
  return finish(H, steps);
}

export function solve(input) {
  const type = choice(input, "type", "نوع المحلول", TYPES, "strong-acid");
  if (type === "strong-acid") return strongAcid(input);
  if (type === "strong-base") return strongBase(input);
  if (type === "weak-acid") return weak(input, true);
  if (type === "weak-base") return weak(input, false);
  if (type === "buffer") return buffer(input);
  return fromPh(input);
}
