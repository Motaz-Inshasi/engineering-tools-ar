import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt, tex as ntex } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Check the sampling rate with the Nyquist theorem: Nyquist rate, Nyquist frequency and oversampling ratio, and compute the aliasing frequency of any tone with a plot of the samples.",
  keywords: ["Nyquist", "sampling", "sampling", "nyquist", "aliasing", "spectral aliasing", "sampling rate", "folding frequency"],
  formulas: [
    { label: "Nyquist condition", tex: "f_s > 2 f_{max},\\qquad f_N = \\frac{f_s}{2}" },
    { label: "Aliasing (folded) frequency", tex: "f_{alias} = \\left| f_0 - k f_s \\right|,\\quad k = \\operatorname{round}\\left(\\frac{f_0}{f_s}\\right)" }
  ],
  inputs: [
    { id: "fmax", label: "Highest signal frequency fmax", unit: "Hz", type: "number", default: "4k" },
    { id: "fs", label: "Sampling rate fs", unit: "Hz", type: "number", default: "10k" },
    { id: "f0", label: "Tone frequency to test for aliasing f₀ (optional)", unit: "Hz", type: "number", default: "7k" }
  ],
  example: { values: { fmax: "4k", fs: "10k", f0: "7k" }, expect: ["3 kHz"], note: "Example: a 7 kHz tone sampled at 10 kHz appears as 3 kHz." },
  invalid: { values: { fmax: "4k", fs: "0", f0: "" } },
  related: ["adc", "sample-rate-resolution", "fourier-series"]
};

export function aliasOf(f0, fs) {
  const k = Math.round(f0 / fs);
  return { k, fa: Math.abs(f0 - k * fs) };
}

export function solve(input) {
  const fmax = num(input, "fmax", "Highest frequency", { positive: true });
  const fs = num(input, "fs", "Sampling rate", { positive: true });
  const f0 = num(input, "f0", "Tone frequency", { optional: true, nonNegative: true });
  const nyqRate = 2 * fmax, fN = fs / 2, Ts = 1 / fs, osr = fs / nyqRate;
  const ok = fs > nyqRate;
  const steps = [
    { text: "The Nyquist rate is twice the highest frequency:", tex: `2 f_{max} = 2 \\times ${ntex(fmax)} = ${ntex(nyqRate)}\\ \\text{Hz}` },
    { text: "The Nyquist frequency is half the sampling rate:", tex: `f_N = \\frac{${ntex(fs)}}{2} = ${ntex(fN)}\\ \\text{Hz}` },
    ok ? `Since $f_s > 2f_{max}$, the condition is met in theory, and the oversampling ratio is ${fmt(osr, 4)}. In practice, $f_s \\ge 2.5 f_{max}$ is preferred to leave room for an anti-aliasing filter.`
       : `Since $f_s \\le 2f_{max}$, the condition is not met, and frequencies above ${eng(fN, "Hz")} will fold and appear at wrong frequencies.`
  ];
  const results = [
    { label: "Nyquist rate 2fmax", value: nyqRate, unit: "Hz", eng: true },
    { label: "Nyquist frequency fs/2", value: fN, unit: "Hz", eng: true },
    { label: "Sample period Ts", value: Ts, unit: "s", eng: true },
    { label: "Oversampling ratio fs / 2fmax", value: osr, sig: 4 },
    { label: "Verdict", value: ok ? "Sampling rate is sufficient" : "Sampling rate is insufficient (aliasing likely)" },
    { label: "Minimum recommended practical rate (2.5 fmax)", value: 2.5 * fmax, unit: "Hz", eng: true }
  ];
  const blocks = [];
  let copy = `Nyquist rate = ${eng(nyqRate, "Hz")}, fs/2 = ${eng(fN, "Hz")}, ${ok ? "OK" : "aliasing"}`;
  if (f0 !== null) {
    const { k, fa } = aliasOf(f0, fs);
    results.push({ label: "Apparent tone frequency after sampling", value: fa, unit: "Hz", eng: true });
    steps.push({ text: `We fold the tone frequency around multiples of $f_s$ (here $k = ${k}$):`, tex: `f_{alias} = |${ntex(f0)} - ${k} \\times ${ntex(fs)}| = ${ntex(fa)}\\ \\text{Hz}` });
    steps.push(f0 <= fN ? "The tone is below the Nyquist frequency, so it appears at its true frequency." : "The tone is above the Nyquist frequency, so it appears at a wrong frequency (aliasing) and cannot be distinguished from a tone at the apparent frequency.");
    copy += `\nalias of ${eng(f0, "Hz")} = ${eng(fa, "Hz")}`;
    if (f0 > 0) {
      const span = Math.min(4 / Math.max(fa, 1e-12), 4 / f0 * Math.max(1, Math.ceil(f0 / fs)) * 3, 40 * Ts);
      const end = Math.max(span, 6 * Ts);
      const nS = Math.min(400, Math.floor(end / Ts) + 1);
      const samples = Array.from({ length: nS }, (_, i) => [i * Ts, Math.cos(2 * Math.PI * f0 * i * Ts)]);
      blocks.push({ type: "plot", title: "Original tone, samples and apparent signal", xLabel: "t (s)", yLabel: "x", yMin: -1.3, yMax: 1.3, series: [
        { name: `Tone ${eng(f0, "Hz")}`, points: sampleFunction((t) => Math.cos(2 * Math.PI * f0 * t), 0, (nS - 1) * Ts, 1500), width: 1.2 },
        { name: "Samples", points: samples, marker: "o" },
        { name: `Apparent ${eng(fa, "Hz")}`, points: sampleFunction((t) => Math.cos(2 * Math.PI * fa * t), 0, (nS - 1) * Ts, 600), dashed: true }
      ] });
    }
  }
  return { results, steps, blocks, copy };
}
