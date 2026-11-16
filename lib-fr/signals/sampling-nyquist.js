import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt, tex as ntex } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Vérifiez la fréquence d'échantillonnage selon le théorème de Nyquist : débit de Nyquist, fréquence de Nyquist et taux de suréchantillonnage, puis calculez la fréquence de repliement (aliasing) de toute tonalité avec le tracé des échantillons.",
  keywords: ["Nyquist", "échantillonnage", "sampling", "nyquist", "aliasing", "repliement spectral", "fréquence d'échantillonnage", "fréquence de repliement"],
  formulas: [
    { label: "Condition de Nyquist", tex: "f_s > 2 f_{max},\\qquad f_N = \\frac{f_s}{2}" },
    { label: "Fréquence de repliement (aliasing)", tex: "f_{alias} = \\left| f_0 - k f_s \\right|,\\quad k = \\operatorname{round}\\left(\\frac{f_0}{f_s}\\right)" }
  ],
  inputs: [
    { id: "fmax", label: "Fréquence maximale du signal fmax", unit: "Hz", type: "number", default: "4k" },
    { id: "fs", label: "Fréquence d'échantillonnage fs", unit: "Hz", type: "number", default: "10k" },
    { id: "f0", label: "Fréquence d'une tonalité pour tester le repliement f₀ (facultatif)", unit: "Hz", type: "number", default: "7k" }
  ],
  example: { values: { fmax: "4k", fs: "10k", f0: "7k" }, expect: ["3 kHz"], note: "Exemple : une tonalité de 7 kHz échantillonnée à 10 kHz apparaît comme une tonalité de 3 kHz." },
  invalid: { values: { fmax: "4k", fs: "0", f0: "" } },
  related: ["adc", "sample-rate-resolution", "fourier-series"]
};

export function aliasOf(f0, fs) {
  const k = Math.round(f0 / fs);
  return { k, fa: Math.abs(f0 - k * fs) };
}

export function solve(input) {
  const fmax = num(input, "fmax", "Fréquence maximale", { positive: true });
  const fs = num(input, "fs", "Fréquence d'échantillonnage", { positive: true });
  const f0 = num(input, "f0", "Fréquence de la tonalité", { optional: true, nonNegative: true });
  const nyqRate = 2 * fmax, fN = fs / 2, Ts = 1 / fs, osr = fs / nyqRate;
  const ok = fs > nyqRate;
  const steps = [
    { text: "Le débit de Nyquist est le double de la fréquence maximale :", tex: `2 f_{max} = 2 \\times ${ntex(fmax)} = ${ntex(nyqRate)}\\ \\text{Hz}` },
    { text: "La fréquence de Nyquist est la moitié de la fréquence d'échantillonnage :", tex: `f_N = \\frac{${ntex(fs)}}{2} = ${ntex(fN)}\\ \\text{Hz}` },
    ok ? `Comme $f_s > 2f_{max}$, la condition est théoriquement satisfaite, et le taux de suréchantillonnage vaut ${fmt(osr, 4)}. En pratique, on préfère $f_s \\ge 2.5 f_{max}$ pour laisser une marge au filtre anti-repliement.`
       : `Comme $f_s \\le 2f_{max}$, la condition n'est pas satisfaite : les fréquences au-dessus de ${eng(fN, "Hz")} seront repliées et apparaîtront avec de fausses fréquences.`
  ];
  const results = [
    { label: "Débit de Nyquist 2fmax", value: nyqRate, unit: "Hz", eng: true },
    { label: "Fréquence de Nyquist fs/2", value: fN, unit: "Hz", eng: true },
    { label: "Période d'échantillonnage Ts", value: Ts, unit: "s", eng: true },
    { label: "Taux de suréchantillonnage fs / 2fmax", value: osr, sig: 4 },
    { label: "Verdict", value: ok ? "La fréquence d'échantillonnage est suffisante" : "La fréquence d'échantillonnage est insuffisante (repliement possible)" },
    { label: "Débit pratique minimal recommandé (2.5 fmax)", value: 2.5 * fmax, unit: "Hz", eng: true }
  ];
  const blocks = [];
  let copy = `Nyquist rate = ${eng(nyqRate, "Hz")}, fs/2 = ${eng(fN, "Hz")}, ${ok ? "OK" : "aliasing"}`;
  if (f0 !== null) {
    const { k, fa } = aliasOf(f0, fs);
    results.push({ label: "Fréquence apparente de la tonalité après échantillonnage", value: fa, unit: "Hz", eng: true });
    steps.push({ text: `On replie la fréquence de la tonalité autour des multiples de $f_s$ (ici $k = ${k}$) :`, tex: `f_{alias} = |${ntex(f0)} - ${k} \\times ${ntex(fs)}| = ${ntex(fa)}\\ \\text{Hz}` });
    steps.push(f0 <= fN ? "La tonalité est inférieure à la fréquence de Nyquist : elle apparaît avec sa fréquence réelle." : "La tonalité est supérieure à la fréquence de Nyquist : elle apparaît avec une fréquence fausse (repliement), et on ne peut pas la distinguer d'une tonalité à la fréquence apparente.");
    copy += `\nalias of ${eng(f0, "Hz")} = ${eng(fa, "Hz")}`;
    if (f0 > 0) {
      const span = Math.min(4 / Math.max(fa, 1e-12), 4 / f0 * Math.max(1, Math.ceil(f0 / fs)) * 3, 40 * Ts);
      const end = Math.max(span, 6 * Ts);
      const nS = Math.min(400, Math.floor(end / Ts) + 1);
      const samples = Array.from({ length: nS }, (_, i) => [i * Ts, Math.cos(2 * Math.PI * f0 * i * Ts)]);
      blocks.push({ type: "plot", title: "La tonalité d'origine, les échantillons et le signal apparent", xLabel: "t (s)", yLabel: "x", yMin: -1.3, yMax: 1.3, series: [
        { name: `Tonalité ${eng(f0, "Hz")}`, points: sampleFunction((t) => Math.cos(2 * Math.PI * f0 * t), 0, (nS - 1) * Ts, 1500), width: 1.2 },
        { name: "Échantillons", points: samples, marker: "o" },
        { name: `Tonalité apparente ${eng(fa, "Hz")}`, points: sampleFunction((t) => Math.cos(2 * Math.PI * fa * t), 0, (nS - 1) * Ts, 600), dashed: true }
      ] });
    }
  }
  return { results, steps, blocks, copy };
}
