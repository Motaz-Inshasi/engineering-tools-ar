import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "وازن بين معدل العينات والدقة: SNR النظري، والبتات الفعالة ENOB من SNR مقيس، وكسب الدقة بالإفراط في أخذ العينات والمتوسط، ومعدل البيانات للقنوات المتعددة.",
  keywords: ["معدل العينات", "الدقة", "oversampling", "إفراط في أخذ العينات", "ENOB", "SNR", "معدل البيانات", "decimation"],
  formulas: [
    { label: "SNR و ENOB", tex: "SNR = 6.02N + 1.76\\ dB,\\qquad ENOB = \\frac{SINAD - 1.76}{6.02}" },
    { label: "الإفراط في أخذ العينات (لضجيج أبيض)", tex: "\\Delta N = \\tfrac{1}{2}\\log_2(OSR),\\qquad f_{out} = \\frac{f_s}{OSR}" }
  ],
  inputs: [
    { id: "N", label: "دقة ADC", unit: "بت", type: "number", default: "12" },
    { id: "fs", label: "معدل العينات", unit: "Hz", type: "number", default: "1M" },
    { id: "osr", label: "نسبة الإفراط OSR", type: "number", default: "16" },
    { id: "ch", label: "عدد القنوات", type: "number", default: "4" },
    { id: "snr", label: "SINAD مقيس (اختياري)", unit: "dB", type: "number" }
  ],
  example: { values: { N: "12", fs: "1M", osr: "16", ch: "4", snr: "" }, expect: ["14 بت", "62.5 kHz"], note: "مثال: ADC بدقة 12 بت عند 1 MS/s مع إفراط ×16." },
  invalid: { values: { N: "12", fs: "1M", osr: "0.5", ch: "4" } },
  related: ["adc", "sampling-nyquist", "shunt-resistor"]
};

export function solve(input) {
  const N = num(input, "N", "الدقة", { integer: true, min: 1, max: 32 });
  const fs = num(input, "fs", "معدل العينات", { positive: true });
  const osr = num(input, "osr", "OSR", { min: 1 });
  const ch = num(input, "ch", "عدد القنوات", { integer: true, min: 1, max: 1024 });
  const snrIn = num(input, "snr", "SINAD", { optional: true, positive: true });
  const snr = 6.02 * N + 1.76;
  const gain = 0.5 * Math.log2(osr);
  const fout = fs / osr;
  const perCh = fout / ch;
  const rate = fs * N;
  const steps = [
    { text: "أفضل SNR نظري لهذه الدقة:", tex: `SNR = 6.02 \\times ${N} + 1.76 = ${ntex(snr, 4)}\\ dB` },
    { text: "الإفراط في أخذ العينات ثم أخذ المتوسط يقلل ضجيج التكميم، فكل مضاعفة أربع مرات تضيف بتاً واحداً:", tex: `\\Delta N = \\tfrac{1}{2}\\log_2(${ntex(osr)}) = ${ntex(gain, 4)}\\ \\text{bits} \\Rightarrow N_{eff} = ${ntex(N + gain, 4)}` },
    { text: "لكن معدل الخرج الفعلي ينخفض، ويوزَّع على القنوات:", tex: `f_{out} = \\frac{${ntex(fs)}}{${ntex(osr)}} = ${ntex(fout, 5)}\\ Hz,\\quad \\text{per channel} = ${ntex(perCh, 5)}\\ Hz` },
    `أقصى تردد يمكن قياسه لكل قناة (نايكويست) هو ${eng(perCh / 2, "Hz", 4)}.`,
    "كسب الإفراط يتحقق فقط إذا كان في الإشارة ضجيج كافٍ (≥ 1 LSB) يجعل الخطأ عشوائياً."
  ];
  const results = [
    { label: "SNR النظري", value: `${fmt(snr, 4)} dB` },
    { label: "الدقة الفعالة بعد الإفراط", value: `${fmt(N + gain, 4)} بت`, text: `Neff = ${fmt(N + gain, 4)} بت` },
    { label: "معدل الخرج بعد المتوسط", value: eng(fout, "Hz", 4), text: `fout = ${eng(fout, "Hz", 4)}` },
    { label: "المعدل لكل قناة", value: eng(perCh, "Hz", 4) },
    { label: "معدل البيانات الخام", value: `${eng(rate, "bit/s", 4)} (${eng(rate / 8, "B/s", 4)})` }
  ];
  if (snrIn !== null) {
    const enob = (snrIn - 1.76) / 6.02;
    steps.push({ text: "البتات الفعالة من القياس الفعلي:", tex: `ENOB = \\frac{${ntex(snrIn)} - 1.76}{6.02} = ${ntex(enob, 4)}\\ \\text{bits}` });
    results.push({ label: "ENOB المقيس", value: `${fmt(enob, 4)} بت` });
  }
  return { results, steps, copy: `SNR = ${fmt(snr, 4)} dB, Neff = ${fmt(N + gain, 4)} بت, fout = ${eng(fout, "Hz", 4)}` };
}
