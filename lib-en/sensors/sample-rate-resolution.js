import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Compare sampling rate and resolution: theoretical SNR, effective number of bits (ENOB) from a measured SNR, resolution gain from oversampling and averaging, and data rate for multiple channels.",
  keywords: ["Sampling rate", "Resolution", "oversampling", "Oversampling", "ENOB", "SNR", "Data rate", "decimation"],
  formulas: [
    { label: "SNR and ENOB", tex: "SNR = 6.02N + 1.76\\ dB,\\qquad ENOB = \\frac{SINAD - 1.76}{6.02}" },
    { label: "Oversampling (for white noise)", tex: "\\Delta N = \\tfrac{1}{2}\\log_2(OSR),\\qquad f_{out} = \\frac{f_s}{OSR}" }
  ],
  inputs: [
    { id: "N", label: "ADC resolution", unit: "bits", type: "number", default: "12" },
    { id: "fs", label: "Sampling rate", unit: "Hz", type: "number", default: "1M" },
    { id: "osr", label: "Oversampling ratio OSR", type: "number", default: "16" },
    { id: "ch", label: "Number of channels", type: "number", default: "4" },
    { id: "snr", label: "Measured SINAD (optional)", unit: "dB", type: "number" }
  ],
  example: { values: { N: "12", fs: "1M", osr: "16", ch: "4", snr: "" }, expect: ["14 bits", "62.5 kHz"], note: "Example: 12-bit ADC at 1 MS/s with ×16 oversampling." },
  invalid: { values: { N: "12", fs: "1M", osr: "0.5", ch: "4" } },
  related: ["adc", "sampling-nyquist", "shunt-resistor"]
};

export function solve(input) {
  const N = num(input, "N", "Resolution", { integer: true, min: 1, max: 32 });
  const fs = num(input, "fs", "Sampling rate", { positive: true });
  const osr = num(input, "osr", "OSR", { min: 1 });
  const ch = num(input, "ch", "Number of channels", { integer: true, min: 1, max: 1024 });
  const snrIn = num(input, "snr", "SINAD", { optional: true, positive: true });
  const snr = 6.02 * N + 1.76;
  const gain = 0.5 * Math.log2(osr);
  const fout = fs / osr;
  const perCh = fout / ch;
  const rate = fs * N;
  const steps = [
    { text: "Best theoretical SNR for this resolution:", tex: `SNR = 6.02 \\times ${N} + 1.76 = ${ntex(snr, 4)}\\ dB` },
    { text: "Oversampling followed by averaging reduces quantization noise, so each fourfold increase adds one bit:", tex: `\\Delta N = \\tfrac{1}{2}\\log_2(${ntex(osr)}) = ${ntex(gain, 4)}\\ \\text{bits} \\Rightarrow N_{eff} = ${ntex(N + gain, 4)}` },
    { text: "But the actual output rate drops, and it is shared among the channels:", tex: `f_{out} = \\frac{${ntex(fs)}}{${ntex(osr)}} = ${ntex(fout, 5)}\\ Hz,\\quad \\text{per channel} = ${ntex(perCh, 5)}\\ Hz` },
    `The maximum measurable frequency per channel (Nyquist) is ${eng(perCh / 2, "Hz", 4)}.`,
    "Oversampling gain is only achieved if the signal has enough noise (≥ 1 LSB) to make the error random."
  ];
  const results = [
    { label: "Theoretical SNR", value: `${fmt(snr, 4)} dB` },
    { label: "Effective resolution after oversampling", value: `${fmt(N + gain, 4)} bits`, text: `Neff = ${fmt(N + gain, 4)} bits` },
    { label: "Output rate after averaging", value: eng(fout, "Hz", 4), text: `fout = ${eng(fout, "Hz", 4)}` },
    { label: "Rate per channel", value: eng(perCh, "Hz", 4) },
    { label: "Raw data rate", value: `${eng(rate, "bit/s", 4)} (${eng(rate / 8, "B/s", 4)})` }
  ];
  if (snrIn !== null) {
    const enob = (snrIn - 1.76) / 6.02;
    steps.push({ text: "Effective bits from the actual measurement:", tex: `ENOB = \\frac{${ntex(snrIn)} - 1.76}{6.02} = ${ntex(enob, 4)}\\ \\text{bits}` });
    results.push({ label: "Measured ENOB", value: `${fmt(enob, 4)} bits` });
  }
  return { results, steps, copy: `SNR = ${fmt(snr, 4)} dB, Neff = ${fmt(N + gain, 4)} bits, fout = ${eng(fout, "Hz", 4)}` };
}
