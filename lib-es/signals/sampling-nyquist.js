import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt, tex as ntex } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Verifique la tasa de muestreo con el teorema de Nyquist: tasa de Nyquist, frecuencia de Nyquist y razón de sobremuestreo, y calcule la frecuencia de aliasing de cualquier tono con una gráfica de las muestras.",
  keywords: ["Nyquist", "muestreo", "sampling", "nyquist", "aliasing", "aliasing espectral", "tasa de muestreo", "frecuencia de plegado"],
  formulas: [
    { label: "Condición de Nyquist", tex: "f_s > 2 f_{max},\\qquad f_N = \\frac{f_s}{2}" },
    { label: "Frecuencia de aliasing (plegada)", tex: "f_{alias} = \\left| f_0 - k f_s \\right|,\\quad k = \\operatorname{round}\\left(\\frac{f_0}{f_s}\\right)" }
  ],
  inputs: [
    { id: "fmax", label: "Frecuencia máxima de la señal fmax", unit: "Hz", type: "number", default: "4k" },
    { id: "fs", label: "Tasa de muestreo fs", unit: "Hz", type: "number", default: "10k" },
    { id: "f0", label: "Frecuencia de un tono para comprobar el aliasing f₀ (opcional)", unit: "Hz", type: "number", default: "7k" }
  ],
  example: { values: { fmax: "4k", fs: "10k", f0: "7k" }, expect: ["3 kHz"], note: "Ejemplo: un tono de 7 kHz muestreado a 10 kHz aparece como 3 kHz." },
  invalid: { values: { fmax: "4k", fs: "0", f0: "" } },
  related: ["adc", "sample-rate-resolution", "fourier-series"]
};

export function aliasOf(f0, fs) {
  const k = Math.round(f0 / fs);
  return { k, fa: Math.abs(f0 - k * fs) };
}

export function solve(input) {
  const fmax = num(input, "fmax", "Frecuencia máxima", { positive: true });
  const fs = num(input, "fs", "Tasa de muestreo", { positive: true });
  const f0 = num(input, "f0", "Frecuencia del tono", { optional: true, nonNegative: true });
  const nyqRate = 2 * fmax, fN = fs / 2, Ts = 1 / fs, osr = fs / nyqRate;
  const ok = fs > nyqRate;
  const steps = [
    { text: "La tasa de Nyquist es el doble de la frecuencia máxima:", tex: `2 f_{max} = 2 \\times ${ntex(fmax)} = ${ntex(nyqRate)}\\ \\text{Hz}` },
    { text: "La frecuencia de Nyquist es la mitad de la tasa de muestreo:", tex: `f_N = \\frac{${ntex(fs)}}{2} = ${ntex(fN)}\\ \\text{Hz}` },
    ok ? `Como $f_s > 2f_{max}$, la condición se cumple en teoría, y la razón de sobremuestreo es ${fmt(osr, 4)}. En la práctica se prefiere $f_s \\ge 2.5 f_{max}$ para dejar margen a un filtro antialiasing.`
       : `Como $f_s \\le 2f_{max}$, la condición no se cumple, y las frecuencias por encima de ${eng(fN, "Hz")} se plegarán y aparecerán con frecuencias erróneas.`
  ];
  const results = [
    { label: "Tasa de Nyquist 2fmax", value: nyqRate, unit: "Hz", eng: true },
    { label: "Frecuencia de Nyquist fs/2", value: fN, unit: "Hz", eng: true },
    { label: "Periodo de muestreo Ts", value: Ts, unit: "s", eng: true },
    { label: "Razón de sobremuestreo fs / 2fmax", value: osr, sig: 4 },
    { label: "Veredicto", value: ok ? "La tasa de muestreo es suficiente" : "La tasa de muestreo es insuficiente (es probable el aliasing)" },
    { label: "Tasa práctica mínima recomendada (2.5 fmax)", value: 2.5 * fmax, unit: "Hz", eng: true }
  ];
  const blocks = [];
  let copy = `Nyquist rate = ${eng(nyqRate, "Hz")}, fs/2 = ${eng(fN, "Hz")}, ${ok ? "OK" : "aliasing"}`;
  if (f0 !== null) {
    const { k, fa } = aliasOf(f0, fs);
    results.push({ label: "Frecuencia aparente del tono tras el muestreo", value: fa, unit: "Hz", eng: true });
    steps.push({ text: `Plegamos la frecuencia del tono alrededor de los múltiplos de $f_s$ (aquí $k = ${k}$):`, tex: `f_{alias} = |${ntex(f0)} - ${k} \\times ${ntex(fs)}| = ${ntex(fa)}\\ \\text{Hz}` });
    steps.push(f0 <= fN ? "El tono está por debajo de la frecuencia de Nyquist, así que aparece con su frecuencia real." : "El tono está por encima de la frecuencia de Nyquist, así que aparece con una frecuencia errónea (aliasing) y no puede distinguirse de un tono con la frecuencia aparente.");
    copy += `\nalias of ${eng(f0, "Hz")} = ${eng(fa, "Hz")}`;
    if (f0 > 0) {
      const span = Math.min(4 / Math.max(fa, 1e-12), 4 / f0 * Math.max(1, Math.ceil(f0 / fs)) * 3, 40 * Ts);
      const end = Math.max(span, 6 * Ts);
      const nS = Math.min(400, Math.floor(end / Ts) + 1);
      const samples = Array.from({ length: nS }, (_, i) => [i * Ts, Math.cos(2 * Math.PI * f0 * i * Ts)]);
      blocks.push({ type: "plot", title: "Tono original, muestras y señal aparente", xLabel: "t (s)", yLabel: "x", yMin: -1.3, yMax: 1.3, series: [
        { name: `Tono ${eng(f0, "Hz")}`, points: sampleFunction((t) => Math.cos(2 * Math.PI * f0 * t), 0, (nS - 1) * Ts, 1500), width: 1.2 },
        { name: "Muestras", points: samples, marker: "o" },
        { name: `Aparente ${eng(fa, "Hz")}`, points: sampleFunction((t) => Math.cos(2 * Math.PI * fa * t), 0, (nS - 1) * Ts, 600), dashed: true }
      ] });
    }
  }
  return { results, steps, blocks, copy };
}
