import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Calculs du convertisseur analogique-numérique ADC : valeur du bit de poids faible (LSB) et code correspondant à une tension donnée, ou l'inverse, erreur de quantification et rapport signal sur bruit idéal, avec conversion du code en grandeur physique.",
  keywords: ["ADC", "Convertisseur analogique-numérique", "Résolution", "LSB", "Quantification", "quantization", "SNR", "Mise à l'échelle", "scaling", "bit"],
  formulas: [
    { label: "Résolution et code du convertisseur", tex: "\\text{LSB} = \\frac{V_{ref}}{2^N},\\qquad \\text{code} = \\left\\lfloor \\frac{V_{in}}{\\text{LSB}} \\right\\rfloor" },
    { label: "SNR idéal et mise à l'échelle linéaire", tex: "SNR = 6.02N + 1.76\\ dB,\\qquad x = x_{min} + \\frac{\\text{code}}{2^N - 1}(x_{max} - x_{min})" }
  ],
  inputs: [
    { id: "N", label: "Nombre de bits N", type: "number", default: "12" },
    { id: "Vref", label: "Tension de référence Vref", unit: "V", type: "number", default: "3.3" },
    { id: "mode", label: "Grandeur demandée", type: "select", default: "v2c", options: [["v2c", "Code à partir de la tension"], ["c2v", "Tension à partir du code"]] },
    { id: "Vin", label: "Tension d'entrée", unit: "V", type: "number", default: "1.65", when: { mode: ["v2c"] } },
    { id: "code", label: "Code", type: "number", default: "2048", when: { mode: ["c2v"] } },
    { id: "xmin", label: "Valeur physique à 0 V (facultatif)", type: "number", default: "0" },
    { id: "xmax", label: "Valeur physique à Vref (facultatif)", type: "number", default: "100" },
    { id: "xunit", label: "Unité de la valeur physique", type: "text", default: "°C" }
  ],
  example: { values: { N: "12", Vref: "3.3", mode: "v2c", Vin: "1.65", xmin: "0", xmax: "100", xunit: "°C" }, expect: ["code = 2048", "LSB = 805.7 µV"], note: "Exemple : ADC de 12 bits, référence 3.3 V et capteur de température 0–100 °C." },
  invalid: { values: { N: "12", Vref: "3.3", mode: "v2c", Vin: "4" } },
  related: ["sample-rate-resolution", "sensor-divider", "binary-twos-complement", "shunt-resistor"]
};

export function solve(input) {
  const N = num(input, "N", "Nombre de bits", { integer: true, min: 1, max: 32 });
  const Vref = num(input, "Vref", "Tension de référence", { positive: true });
  const mode = choice(input, "mode", "Grandeur demandée", ["v2c", "c2v"], "v2c");
  const levels = Math.pow(2, N), maxCode = levels - 1, lsb = Vref / levels;
  const steps = [
    { text: `Nombre de niveaux $2^{${N}} = ${levels}$, et valeur du bit de poids faible :`, tex: `\\text{LSB} = \\frac{${ntex(Vref)}}{${levels}} = ${ntex(lsb, 5)}\\ V` }
  ];
  let code, Vin;
  if (mode === "v2c") {
    Vin = num(input, "Vin", "Tension d'entrée", { nonNegative: true });
    if (Vin > Vref) fail(`La tension d'entrée dépasse la tension de référence ${fmt(Vref)} V : le convertisseur saturera au code ${maxCode}.`, "Vin");
    code = Math.min(maxCode, Math.floor(Vin / lsb + 1e-9));
    steps.push({ text: "Le code est la partie entière de la division de la tension par le LSB :", tex: `\\text{code} = \\left\\lfloor\\frac{${ntex(Vin)}}{${ntex(lsb, 5)}}\\right\\rfloor = ${code}` });
  } else {
    code = num(input, "code", "Code", { integer: true, min: 0, max: maxCode });
    Vin = code * lsb;
    steps.push({ text: "Tension correspondant au début du niveau de code :", tex: `V = \\text{code} \\times \\text{LSB} = ${code} \\times ${ntex(lsb, 5)} = ${ntex(Vin, 6)}\\ V` });
  }
  const snr = 6.02 * N + 1.76;
  steps.push(`L'erreur de quantification est comprise entre 0 et un LSB (ou ±½ LSB si le convertisseur arrondit) : maximum ${eng(lsb, "V", 4)}.`);
  steps.push({ text: "Meilleur rapport signal sur bruit théorique pour une sinusoïde pleine échelle :", tex: `SNR = 6.02 \\times ${N} + 1.76 = ${ntex(snr, 4)}\\ dB` });
  const results = [
    { label: "Valeur du LSB", value: eng(lsb, "V", 4), text: `LSB = ${eng(lsb, "V", 4)}` },
    { label: "Code", value: code, text: `code = ${code}` },
    { label: "Code en hexadécimal", value: "0x" + code.toString(16).toUpperCase() },
    { label: "Tension correspondante", value: eng(code * lsb, "V", 6) },
    { label: "SNR idéal", value: `${fmt(snr, 4)} dB` }
  ];
  if (!isBlank(input.xmin) && !isBlank(input.xmax)) {
    const xmin = num(input, "xmin", "Valeur minimale"), xmax = num(input, "xmax", "Valeur maximale");
    if (xmin === xmax) fail("Les deux valeurs physiques sont égales.", "xmax");
    const unit = String(input.xunit ?? "").trim();
    const x = xmin + (code / maxCode) * (xmax - xmin);
    const res = (xmax - xmin) / maxCode;
    steps.push({ text: "Mise à l'échelle linéaire du code vers la valeur physique :", tex: `x = ${ntex(xmin)} + \\frac{${code}}{${maxCode}}(${ntex(xmax)} - ${ntex(xmin)}) = ${ntex(x, 6)}` });
    results.push({ label: "Valeur physique", value: `${fmt(x, 6)} ${unit}` }, { label: "Résolution physique par pas", value: `${fmt(res, 4)} ${unit}` });
  }
  return { results, steps, copy: `LSB = ${eng(lsb, "V", 4)}, code = ${code}, V = ${eng(code * lsb, "V", 6)}` };
}
