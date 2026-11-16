import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt, tex as ntex } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "تحقّق من معدل أخذ العينات بنظرية نايكويست: معدل نايكويست وتردد نايكويست ونسبة الإفراط في أخذ العينات، واحسب تردد التشويه (aliasing) لأي نغمة مع رسم العينات.",
  keywords: ["نايكويست", "أخذ العينات", "sampling", "nyquist", "aliasing", "تشويه الطيف", "معدل العينات", "تردد الطي"],
  formulas: [
    { label: "شرط نايكويست", tex: "f_s > 2 f_{max},\\qquad f_N = \\frac{f_s}{2}" },
    { label: "تردد التشويه (الطي)", tex: "f_{alias} = \\left| f_0 - k f_s \\right|,\\quad k = \\operatorname{round}\\left(\\frac{f_0}{f_s}\\right)" }
  ],
  inputs: [
    { id: "fmax", label: "أعلى تردد في الإشارة fmax", unit: "Hz", type: "number", default: "4k" },
    { id: "fs", label: "معدل أخذ العينات fs", unit: "Hz", type: "number", default: "10k" },
    { id: "f0", label: "تردد نغمة لفحص التشويه f₀ (اختياري)", unit: "Hz", type: "number", default: "7k" }
  ],
  example: { values: { fmax: "4k", fs: "10k", f0: "7k" }, expect: ["3 kHz"], note: "مثال: نغمة 7 kHz تؤخذ عيناتها بمعدل 10 kHz فتظهر كأنها 3 kHz." },
  invalid: { values: { fmax: "4k", fs: "0", f0: "" } },
  related: ["adc", "sample-rate-resolution", "fourier-series"]
};

export function aliasOf(f0, fs) {
  const k = Math.round(f0 / fs);
  return { k, fa: Math.abs(f0 - k * fs) };
}

export function solve(input) {
  const fmax = num(input, "fmax", "أعلى تردد", { positive: true });
  const fs = num(input, "fs", "معدل أخذ العينات", { positive: true });
  const f0 = num(input, "f0", "تردد النغمة", { optional: true, nonNegative: true });
  const nyqRate = 2 * fmax, fN = fs / 2, Ts = 1 / fs, osr = fs / nyqRate;
  const ok = fs > nyqRate;
  const steps = [
    { text: "معدل نايكويست هو ضعف أعلى تردد:", tex: `2 f_{max} = 2 \\times ${ntex(fmax)} = ${ntex(nyqRate)}\\ \\text{Hz}` },
    { text: "تردد نايكويست هو نصف معدل العينات:", tex: `f_N = \\frac{${ntex(fs)}}{2} = ${ntex(fN)}\\ \\text{Hz}` },
    ok ? `بما أن $f_s > 2f_{max}$ فالشرط محقق نظرياً، ونسبة الإفراط ${fmt(osr, 4)}. عملياً يُفضّل $f_s \\ge 2.5 f_{max}$ لترك مجال لمرشح منع التشويه.`
       : `بما أن $f_s \\le 2f_{max}$ فالشرط غير محقق، والترددات فوق ${eng(fN, "Hz")} ستنطوي وتظهر بترددات خاطئة.`
  ];
  const results = [
    { label: "معدل نايكويست 2fmax", value: nyqRate, unit: "Hz", eng: true },
    { label: "تردد نايكويست fs/2", value: fN, unit: "Hz", eng: true },
    { label: "زمن العينة Ts", value: Ts, unit: "s", eng: true },
    { label: "نسبة الإفراط fs / 2fmax", value: osr, sig: 4 },
    { label: "الحكم", value: ok ? "معدل العينات كافٍ" : "معدل العينات غير كافٍ (تشويه محتمل)" },
    { label: "أقل معدل عملي موصى به (2.5 fmax)", value: 2.5 * fmax, unit: "Hz", eng: true }
  ];
  const blocks = [];
  let copy = `Nyquist rate = ${eng(nyqRate, "Hz")}, fs/2 = ${eng(fN, "Hz")}, ${ok ? "OK" : "aliasing"}`;
  if (f0 !== null) {
    const { k, fa } = aliasOf(f0, fs);
    results.push({ label: "التردد الظاهر للنغمة بعد أخذ العينات", value: fa, unit: "Hz", eng: true });
    steps.push({ text: `نطوي تردد النغمة حول مضاعفات $f_s$ (هنا $k = ${k}$):`, tex: `f_{alias} = |${ntex(f0)} - ${k} \\times ${ntex(fs)}| = ${ntex(fa)}\\ \\text{Hz}` });
    steps.push(f0 <= fN ? "النغمة أقل من تردد نايكويست فتظهر بترددها الحقيقي." : "النغمة أعلى من تردد نايكويست فتظهر بتردد خاطئ (تشويه)، ولا يمكن تمييزها عن نغمة بالتردد الظاهر.");
    copy += `\nalias of ${eng(f0, "Hz")} = ${eng(fa, "Hz")}`;
    if (f0 > 0) {
      const span = Math.min(4 / Math.max(fa, 1e-12), 4 / f0 * Math.max(1, Math.ceil(f0 / fs)) * 3, 40 * Ts);
      const end = Math.max(span, 6 * Ts);
      const nS = Math.min(400, Math.floor(end / Ts) + 1);
      const samples = Array.from({ length: nS }, (_, i) => [i * Ts, Math.cos(2 * Math.PI * f0 * i * Ts)]);
      blocks.push({ type: "plot", title: "النغمة الأصلية والعينات والإشارة الظاهرة", xLabel: "t (s)", yLabel: "x", yMin: -1.3, yMax: 1.3, series: [
        { name: `النغمة ${eng(f0, "Hz")}`, points: sampleFunction((t) => Math.cos(2 * Math.PI * f0 * t), 0, (nS - 1) * Ts, 1500), width: 1.2 },
        { name: "العينات", points: samples, marker: "o" },
        { name: `الظاهرة ${eng(fa, "Hz")}`, points: sampleFunction((t) => Math.cos(2 * Math.PI * fa * t), 0, (nS - 1) * Ts, 600), dashed: true }
      ] });
    }
  }
  return { results, steps, blocks, copy };
}
