import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Cálculos del convertidor analógico-digital (ADC): valor del bit menos significativo (LSB), código correspondiente a una tensión o viceversa, error de cuantización y relación señal-ruido ideal, con conversión del código a un valor físico.",
  keywords: ["ADC", "Convertidor analógico-digital", "Resolución", "LSB", "Cuantización", "quantization", "SNR", "Escalado", "scaling", "bit"],
  formulas: [
    { label: "Resolución del convertidor y código", tex: "\\text{LSB} = \\frac{V_{ref}}{2^N},\\qquad \\text{code} = \\left\\lfloor \\frac{V_{in}}{\\text{LSB}} \\right\\rfloor" },
    { label: "SNR ideal y escalado lineal", tex: "SNR = 6.02N + 1.76\\ dB,\\qquad x = x_{min} + \\frac{\\text{code}}{2^N - 1}(x_{max} - x_{min})" }
  ],
  inputs: [
    { id: "N", label: "Número de bits N", type: "number", default: "12" },
    { id: "Vref", label: "Tensión de referencia Vref", unit: "V", type: "number", default: "3.3" },
    { id: "mode", label: "Se pide", type: "select", default: "v2c", options: [["v2c", "Código a partir de la tensión"], ["c2v", "Tensión a partir del código"]] },
    { id: "Vin", label: "Tensión de entrada", unit: "V", type: "number", default: "1.65", when: { mode: ["v2c"] } },
    { id: "code", label: "Código", type: "number", default: "2048", when: { mode: ["c2v"] } },
    { id: "xmin", label: "Valor físico a 0 V (opcional)", type: "number", default: "0" },
    { id: "xmax", label: "Valor físico en Vref (opcional)", type: "number", default: "100" },
    { id: "xunit", label: "Unidad del valor físico", type: "text", default: "°C" }
  ],
  example: { values: { N: "12", Vref: "3.3", mode: "v2c", Vin: "1.65", xmin: "0", xmax: "100", xunit: "°C" }, expect: ["code = 2048", "LSB = 805.7 µV"], note: "Ejemplo: ADC de 12 bits, referencia de 3.3 V y sensor de temperatura de 0–100 °C." },
  invalid: { values: { N: "12", Vref: "3.3", mode: "v2c", Vin: "4" } },
  related: ["sample-rate-resolution", "sensor-divider", "binary-twos-complement", "shunt-resistor"]
};

export function solve(input) {
  const N = num(input, "N", "Número de bits", { integer: true, min: 1, max: 32 });
  const Vref = num(input, "Vref", "Tensión de referencia", { positive: true });
  const mode = choice(input, "mode", "Se pide", ["v2c", "c2v"], "v2c");
  const levels = Math.pow(2, N), maxCode = levels - 1, lsb = Vref / levels;
  const steps = [
    { text: `Número de niveles $2^{${N}} = ${levels}$, y valor del LSB:`, tex: `\\text{LSB} = \\frac{${ntex(Vref)}}{${levels}} = ${ntex(lsb, 5)}\\ V` }
  ];
  let code, Vin;
  if (mode === "v2c") {
    Vin = num(input, "Vin", "Tensión de entrada", { nonNegative: true });
    if (Vin > Vref) fail(`La tensión de entrada supera la de referencia ${fmt(Vref)} V, por lo que el convertidor se saturará en el código ${maxCode}.`, "Vin");
    code = Math.min(maxCode, Math.floor(Vin / lsb + 1e-9));
    steps.push({ text: "El código es la parte entera del cociente de la tensión entre el LSB:", tex: `\\text{code} = \\left\\lfloor\\frac{${ntex(Vin)}}{${ntex(lsb, 5)}}\\right\\rfloor = ${code}` });
  } else {
    code = num(input, "code", "Código", { integer: true, min: 0, max: maxCode });
    Vin = code * lsb;
    steps.push({ text: "Tensión correspondiente al inicio del nivel del código:", tex: `V = \\text{code} \\times \\text{LSB} = ${code} \\times ${ntex(lsb, 5)} = ${ntex(Vin, 6)}\\ V` });
  }
  const snr = 6.02 * N + 1.76;
  steps.push(`El error de cuantización está entre 0 y un LSB (o ±½ LSB si el convertidor redondea): máximo ${eng(lsb, "V", 4)}.`);
  steps.push({ text: "Mejor relación señal-ruido teórica para una onda senoidal a plena escala:", tex: `SNR = 6.02 \\times ${N} + 1.76 = ${ntex(snr, 4)}\\ dB` });
  const results = [
    { label: "Valor del LSB", value: eng(lsb, "V", 4), text: `LSB = ${eng(lsb, "V", 4)}` },
    { label: "Código", value: code, text: `code = ${code}` },
    { label: "Código en hexadecimal", value: "0x" + code.toString(16).toUpperCase() },
    { label: "Tensión correspondiente", value: eng(code * lsb, "V", 6) },
    { label: "SNR ideal", value: `${fmt(snr, 4)} dB` }
  ];
  if (!isBlank(input.xmin) && !isBlank(input.xmax)) {
    const xmin = num(input, "xmin", "Valor mínimo"), xmax = num(input, "xmax", "Valor máximo");
    if (xmin === xmax) fail("Los dos valores físicos son iguales.", "xmax");
    const unit = String(input.xunit ?? "").trim();
    const x = xmin + (code / maxCode) * (xmax - xmin);
    const res = (xmax - xmin) / maxCode;
    steps.push({ text: "Escalado lineal del código al valor físico:", tex: `x = ${ntex(xmin)} + \\frac{${code}}{${maxCode}}(${ntex(xmax)} - ${ntex(xmin)}) = ${ntex(x, 6)}` });
    results.push({ label: "Valor físico", value: `${fmt(x, 6)} ${unit}` }, { label: "Resolución física por paso", value: `${fmt(res, 4)} ${unit}` });
  }
  return { results, steps, copy: `LSB = ${eng(lsb, "V", 4)}, code = ${code}, V = ${eng(code * lsb, "V", 6)}` };
}
