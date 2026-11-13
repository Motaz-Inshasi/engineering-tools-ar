import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const ISOTOPES = {
  C14: { label: "C-14", T: 5730 },
  K40: { label: "K-40", T: 1.248e9 },
  U238: { label: "U-238", T: 4.468e9 },
  U235: { label: "U-235", T: 7.04e8 },
  Rb87: { label: "Rb-87", T: 4.97e10 }
};

export const meta = {
  description: "احسب عمر العينة من النسبة المتبقية من العنصر الأم أو من نسبة الابن إلى الأم، أو احسب النسبة المتبقية لعمر معلوم، مع منحنى التحلل الإشعاعي حتى خمسة أعمار نصف.",
  keywords: ["تأريخ بالنظائر المشعة", "عمر النصف", "كربون 14", "C-14", "K-40", "U-238", "Rb-87", "radiometric dating", "half-life"],
  formulas: [
    { label: "العمر من النسبة المتبقية", tex: "t = \\frac{T_{1/2}}{\\ln 2}\\ln\\frac{100}{p}" },
    { label: "العمر من نسبة الابن إلى الأم", tex: "t = \\frac{T_{1/2}}{\\ln 2}\\ln\\left(1+\\frac{D}{P}\\right)" },
    { label: "النسبة المتبقية من العمر", tex: "p = 100\\cdot 2^{-t/T_{1/2}}" }
  ],
  inputs: [
    { id: "iso", label: "النظير المشع", type: "select", default: "C14", options: [["C14", "C-14 (5730 سنة)"], ["K40", "K-40"], ["U238", "U-238"], ["U235", "U-235"], ["Rb87", "Rb-87"], ["custom", "عمر نصف مخصص"]] },
    { id: "halfLife", label: "عمر النصف المخصص", unit: "سنة", type: "number", default: "5730", when: { iso: ["custom"] } },
    { id: "mode", label: "المطلوب", type: "select", default: "fraction", options: [["fraction", "العمر من النسبة المتبقية من الأم"], ["ratio", "العمر من نسبة الابن إلى الأم D/P"], ["age", "النسبة المتبقية من العمر"]] },
    { id: "pct", label: "النسبة المتبقية من الأم", unit: "%", type: "number", default: "25", when: { mode: ["fraction"] } },
    { id: "ratio", label: "نسبة الابن إلى الأم D/P", type: "number", default: "1", when: { mode: ["ratio"] } },
    { id: "age", label: "العمر", unit: "سنة", type: "number", default: "11460", when: { mode: ["age"] } }
  ],
  example: { values: { iso: "C14", halfLife: "", mode: "fraction", pct: "25", ratio: "", age: "" }, expect: ["11460 سنة"], note: "مثال: بقاء 25% من C-14 يعني مرور عمرين نصفيين." },
  invalid: { values: { iso: "C14", halfLife: "", mode: "fraction", pct: "0", ratio: "", age: "" } },
  related: ["earthquake-magnitude", "carbon-footprint"]
};

export function solve(input) {
  const iso = choice(input, "iso", "النظير", ["C14", "K40", "U238", "U235", "Rb87", "custom"], "C14");
  const mode = choice(input, "mode", "المطلوب", ["fraction", "ratio", "age"], "fraction");
  const T = iso === "custom" ? num(input, "halfLife", "عمر النصف", { positive: true }) : ISOTOPES[iso].T;
  const name = iso === "custom" ? "نظير مخصص" : ISOTOPES[iso].label;
  const steps = [];
  let t;
  if (mode === "fraction") {
    const p = num(input, "pct", "النسبة المتبقية", { positive: true, max: 100 });
    t = T * Math.log(100 / p) / Math.LN2;
    steps.push({ text: "قانون التحلل الإشعاعي:", tex: "\\frac{N}{N_0} = \\left(\\tfrac{1}{2}\\right)^{t/T_{1/2}}" });
    steps.push({ text: "حل المعادلة للزمن:", tex: "t = \\frac{T_{1/2}}{\\ln 2}\\ln\\frac{100}{p}" });
    steps.push({ text: "بالتعويض:", tex: `t = \\frac{${ntex(T)}}{\\ln 2}\\ln\\frac{100}{${ntex(p)}} = ${ntex(t, 6)}\\ \\text{y}` });
  } else if (mode === "ratio") {
    const r = num(input, "ratio", "نسبة الابن إلى الأم", { nonNegative: true });
    t = T * Math.log(1 + r) / Math.LN2;
    steps.push({ text: "نسبة الابن إلى الأم تعطي الزمن:", tex: "t = \\frac{T_{1/2}}{\\ln 2}\\ln\\left(1+\\frac{D}{P}\\right)" });
    steps.push({ text: "بالتعويض:", tex: `t = \\frac{${ntex(T)}}{\\ln 2}\\ln\\left(1+${ntex(r)}\\right) = ${ntex(t, 6)}\\ \\text{y}` });
  } else {
    t = num(input, "age", "العمر", { nonNegative: true });
    steps.push({ text: "العمر المعطى:", tex: `t = ${ntex(t, 6)}\\ \\text{y}` });
  }
  const remain = 100 * Math.pow(2, -t / T);
  steps.push({ text: "النسبة المتبقية من العنصر الأم:", tex: `p = 100 \\cdot 2^{-${ntex(t, 6)}/${ntex(T)}} = ${ntex(remain, 6)}\\ \\%` });
  const tTxt = `${fmt(t, 4)} سنة`;
  const pts = [];
  const xMax = Math.max(5 * T, t);
  for (let i = 0; i <= 80; i++) {
    const x = xMax * i / 80;
    pts.push([x, 100 * Math.pow(2, -x / T)]);
  }
  return {
    results: [
      { label: "العمر", value: tTxt, text: `t = ${tTxt}` },
      { label: "بالملايين", value: `${fmt(t / 1e6, 4)} مليون سنة` },
      { label: "النسبة المتبقية من الأم", value: `${fmt(remain, 4)} %` },
      { label: "عدد أعمار النصف المنقضية", value: fmt(t / T, 4) },
      { label: "عمر النصف المستخدم", value: `${fmt(T, 4)} سنة` }
    ],
    steps,
    copy: `العمر ≈ ${tTxt} (${name}، عمر النصف ${fmt(T, 4)} سنة)`,
    blocks: [
      { type: "plot", title: "منحنى التحلل الإشعاعي", xLabel: "الزمن (سنة)", yLabel: "النسبة المتبقية (%)", series: [{ name: "النسبة المتبقية", points: pts }], vlines: [{ x: t }], includeZero: true }
    ],
    values: { t, T, remain }
  };
}
