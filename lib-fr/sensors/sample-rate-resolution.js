import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Comparez le taux d'échantillonnage et la résolution : SNR théorique, nombre de bits effectifs ENOB à partir d'un SNR mesuré, gain de résolution par suréchantillonnage et moyennage, et débit de données pour plusieurs canaux.",
  keywords: ["Taux d'échantillonnage", "Résolution", "oversampling", "Suréchantillonnage", "ENOB", "SNR", "Débit de données", "decimation"],
  formulas: [
    { label: "SNR et ENOB", tex: "SNR = 6.02N + 1.76\\ dB,\\qquad ENOB = \\frac{SINAD - 1.76}{6.02}" },
    { label: "Suréchantillonnage (pour un bruit blanc)", tex: "\\Delta N = \\tfrac{1}{2}\\log_2(OSR),\\qquad f_{out} = \\frac{f_s}{OSR}" }
  ],
  inputs: [
    { id: "N", label: "Résolution de l'ADC", unit: "bits", type: "number", default: "12" },
    { id: "fs", label: "Taux d'échantillonnage", unit: "Hz", type: "number", default: "1M" },
    { id: "osr", label: "Taux de suréchantillonnage OSR", type: "number", default: "16" },
    { id: "ch", label: "Nombre de canaux", type: "number", default: "4" },
    { id: "snr", label: "SINAD mesuré (facultatif)", unit: "dB", type: "number" }
  ],
  example: { values: { N: "12", fs: "1M", osr: "16", ch: "4", snr: "" }, expect: ["14 bits", "62.5 kHz"], note: "Exemple : ADC de 12 bits à 1 MS/s avec suréchantillonnage ×16." },
  invalid: { values: { N: "12", fs: "1M", osr: "0.5", ch: "4" } },
  related: ["adc", "sampling-nyquist", "shunt-resistor"]
};

export function solve(input) {
  const N = num(input, "N", "Résolution", { integer: true, min: 1, max: 32 });
  const fs = num(input, "fs", "Taux d'échantillonnage", { positive: true });
  const osr = num(input, "osr", "OSR", { min: 1 });
  const ch = num(input, "ch", "Nombre de canaux", { integer: true, min: 1, max: 1024 });
  const snrIn = num(input, "snr", "SINAD", { optional: true, positive: true });
  const snr = 6.02 * N + 1.76;
  const gain = 0.5 * Math.log2(osr);
  const fout = fs / osr;
  const perCh = fout / ch;
  const rate = fs * N;
  const steps = [
    { text: "Meilleur SNR théorique pour cette résolution :", tex: `SNR = 6.02 \\times ${N} + 1.76 = ${ntex(snr, 4)}\\ dB` },
    { text: "Le suréchantillonnage suivi d'un moyennage réduit le bruit de quantification : chaque multiplication par quatre ajoute un bit :", tex: `\\Delta N = \\tfrac{1}{2}\\log_2(${ntex(osr)}) = ${ntex(gain, 4)}\\ \\text{bits} \\Rightarrow N_{eff} = ${ntex(N + gain, 4)}` },
    { text: "Mais le débit de sortie réel diminue et se répartit entre les canaux :", tex: `f_{out} = \\frac{${ntex(fs)}}{${ntex(osr)}} = ${ntex(fout, 5)}\\ Hz,\\quad \\text{per channel} = ${ntex(perCh, 5)}\\ Hz` },
    `La fréquence maximale mesurable par canal (Nyquist) est ${eng(perCh / 2, "Hz", 4)}.`,
    "Le gain du suréchantillonnage n'est obtenu que si le signal contient assez de bruit (≥ 1 LSB) pour rendre l'erreur aléatoire."
  ];
  const results = [
    { label: "SNR théorique", value: `${fmt(snr, 4)} dB` },
    { label: "Résolution effective après suréchantillonnage", value: `${fmt(N + gain, 4)} bits`, text: `Neff = ${fmt(N + gain, 4)} bits` },
    { label: "Débit de sortie après moyennage", value: eng(fout, "Hz", 4), text: `fout = ${eng(fout, "Hz", 4)}` },
    { label: "Débit par canal", value: eng(perCh, "Hz", 4) },
    { label: "Débit de données brut", value: `${eng(rate, "bit/s", 4)} (${eng(rate / 8, "B/s", 4)})` }
  ];
  if (snrIn !== null) {
    const enob = (snrIn - 1.76) / 6.02;
    steps.push({ text: "Bits effectifs à partir de la mesure réelle :", tex: `ENOB = \\frac{${ntex(snrIn)} - 1.76}{6.02} = ${ntex(enob, 4)}\\ \\text{bits}` });
    results.push({ label: "ENOB mesuré", value: `${fmt(enob, 4)} bits` });
  }
  return { results, steps, copy: `SNR = ${fmt(snr, 4)} dB, Neff = ${fmt(N + gain, 4)} bits, fout = ${eng(fout, "Hz", 4)}` };
}
