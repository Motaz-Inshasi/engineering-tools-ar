import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Compare la frecuencia de muestreo y la resolución: SNR teórico, bits efectivos (ENOB) a partir de un SNR medido, ganancia de resolución por sobremuestreo y promediado, y tasa de datos de varios canales.",
  keywords: ["Frecuencia de muestreo", "Resolución", "oversampling", "Sobremuestreo", "ENOB", "SNR", "Tasa de datos", "decimation"],
  formulas: [
    { label: "SNR y ENOB", tex: "SNR = 6.02N + 1.76\\ dB,\\qquad ENOB = \\frac{SINAD - 1.76}{6.02}" },
    { label: "Sobremuestreo (para ruido blanco)", tex: "\\Delta N = \\tfrac{1}{2}\\log_2(OSR),\\qquad f_{out} = \\frac{f_s}{OSR}" }
  ],
  inputs: [
    { id: "N", label: "Resolución del ADC", unit: "bits", type: "number", default: "12" },
    { id: "fs", label: "Frecuencia de muestreo", unit: "Hz", type: "number", default: "1M" },
    { id: "osr", label: "Relación de sobremuestreo OSR", type: "number", default: "16" },
    { id: "ch", label: "Número de canales", type: "number", default: "4" },
    { id: "snr", label: "SINAD medido (opcional)", unit: "dB", type: "number" }
  ],
  example: { values: { N: "12", fs: "1M", osr: "16", ch: "4", snr: "" }, expect: ["14 bits", "62.5 kHz"], note: "Ejemplo: ADC de 12 bits a 1 MS/s con sobremuestreo ×16." },
  invalid: { values: { N: "12", fs: "1M", osr: "0.5", ch: "4" } },
  related: ["adc", "sampling-nyquist", "shunt-resistor"]
};

export function solve(input) {
  const N = num(input, "N", "Resolución", { integer: true, min: 1, max: 32 });
  const fs = num(input, "fs", "Frecuencia de muestreo", { positive: true });
  const osr = num(input, "osr", "OSR", { min: 1 });
  const ch = num(input, "ch", "Número de canales", { integer: true, min: 1, max: 1024 });
  const snrIn = num(input, "snr", "SINAD", { optional: true, positive: true });
  const snr = 6.02 * N + 1.76;
  const gain = 0.5 * Math.log2(osr);
  const fout = fs / osr;
  const perCh = fout / ch;
  const rate = fs * N;
  const steps = [
    { text: "Mejor SNR teórico para esta resolución:", tex: `SNR = 6.02 \\times ${N} + 1.76 = ${ntex(snr, 4)}\\ dB` },
    { text: "El sobremuestreo seguido de promediado reduce el ruido de cuantización: cada multiplicación por cuatro añade un bit:", tex: `\\Delta N = \\tfrac{1}{2}\\log_2(${ntex(osr)}) = ${ntex(gain, 4)}\\ \\text{bits} \\Rightarrow N_{eff} = ${ntex(N + gain, 4)}` },
    { text: "Pero la tasa de salida real disminuye y se reparte entre los canales:", tex: `f_{out} = \\frac{${ntex(fs)}}{${ntex(osr)}} = ${ntex(fout, 5)}\\ Hz,\\quad \\text{per channel} = ${ntex(perCh, 5)}\\ Hz` },
    `La frecuencia máxima medible por canal (Nyquist) es ${eng(perCh / 2, "Hz", 4)}.`,
    "La ganancia del sobremuestreo solo se cumple si la señal tiene suficiente ruido (≥ 1 LSB) que haga aleatorio el error."
  ];
  const results = [
    { label: "SNR teórico", value: `${fmt(snr, 4)} dB` },
    { label: "Resolución efectiva tras el sobremuestreo", value: `${fmt(N + gain, 4)} bits`, text: `Neff = ${fmt(N + gain, 4)} bits` },
    { label: "Tasa de salida tras el promediado", value: eng(fout, "Hz", 4), text: `fout = ${eng(fout, "Hz", 4)}` },
    { label: "Tasa por canal", value: eng(perCh, "Hz", 4) },
    { label: "Tasa de datos bruta", value: `${eng(rate, "bit/s", 4)} (${eng(rate / 8, "B/s", 4)})` }
  ];
  if (snrIn !== null) {
    const enob = (snrIn - 1.76) / 6.02;
    steps.push({ text: "Bits efectivos a partir de la medida real:", tex: `ENOB = \\frac{${ntex(snrIn)} - 1.76}{6.02} = ${ntex(enob, 4)}\\ \\text{bits}` });
    results.push({ label: "ENOB medido", value: `${fmt(enob, 4)} bits` });
  }
  return { results, steps, copy: `SNR = ${fmt(snr, 4)} dB, Neff = ${fmt(N + gain, 4)} bits, fout = ${eng(fout, "Hz", 4)}` };
}
