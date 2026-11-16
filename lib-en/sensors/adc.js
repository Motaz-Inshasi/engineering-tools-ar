import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "ADC calculations: the least significant bit (LSB) value, the code for any voltage or the reverse, ideal quantization error and signal-to-noise ratio, with conversion of the code to a physical value.",
  keywords: ["ADC", "Analog-to-digital converter", "Resolution", "LSB", "Quantization", "quantization", "SNR", "Scaling", "scaling", "bits"],
  formulas: [
    { label: "Resolution and code", tex: "\\text{LSB} = \\frac{V_{ref}}{2^N},\\qquad \\text{code} = \\left\\lfloor \\frac{V_{in}}{\\text{LSB}} \\right\\rfloor" },
    { label: "Ideal SNR and linear scaling", tex: "SNR = 6.02N + 1.76\\ dB,\\qquad x = x_{min} + \\frac{\\text{code}}{2^N - 1}(x_{max} - x_{min})" }
  ],
  inputs: [
    { id: "N", label: "Number of bits N", type: "number", default: "12" },
    { id: "Vref", label: "Reference voltage Vref", unit: "V", type: "number", default: "3.3" },
    { id: "mode", label: "Calculate", type: "select", default: "v2c", options: [["v2c", "Code from voltage"], ["c2v", "Voltage from code"]] },
    { id: "Vin", label: "Input voltage", unit: "V", type: "number", default: "1.65", when: { mode: ["v2c"] } },
    { id: "code", label: "Code", type: "number", default: "2048", when: { mode: ["c2v"] } },
    { id: "xmin", label: "Physical value at 0 V (optional)", type: "number", default: "0" },
    { id: "xmax", label: "Physical value at Vref (optional)", type: "number", default: "100" },
    { id: "xunit", label: "Unit of the physical value", type: "text", default: "°C" }
  ],
  example: { values: { N: "12", Vref: "3.3", mode: "v2c", Vin: "1.65", xmin: "0", xmax: "100", xunit: "°C" }, expect: ["code = 2048", "LSB = 805.7 µV"], note: "Example: 12-bit ADC, 3.3 V reference and a temperature sensor from 0 to 100 °C." },
  invalid: { values: { N: "12", Vref: "3.3", mode: "v2c", Vin: "4" } },
  related: ["sample-rate-resolution", "sensor-divider", "binary-twos-complement", "shunt-resistor"]
};

export function solve(input) {
  const N = num(input, "N", "Number of bits", { integer: true, min: 1, max: 32 });
  const Vref = num(input, "Vref", "Reference voltage", { positive: true });
  const mode = choice(input, "mode", "Calculate", ["v2c", "c2v"], "v2c");
  const levels = Math.pow(2, N), maxCode = levels - 1, lsb = Vref / levels;
  const steps = [
    { text: `Number of levels $2^{${N}} = ${levels}$, and the least significant bit value:`, tex: `\\text{LSB} = \\frac{${ntex(Vref)}}{${levels}} = ${ntex(lsb, 5)}\\ V` }
  ];
  let code, Vin;
  if (mode === "v2c") {
    Vin = num(input, "Vin", "Input voltage", { nonNegative: true });
    if (Vin > Vref) fail(`The input voltage is greater than the reference voltage ${fmt(Vref)} V, so the converter will saturate at code ${maxCode}.`, "Vin");
    code = Math.min(maxCode, Math.floor(Vin / lsb + 1e-9));
    steps.push({ text: "The code is the integer part of the voltage divided by the LSB:", tex: `\\text{code} = \\left\\lfloor\\frac{${ntex(Vin)}}{${ntex(lsb, 5)}}\\right\\rfloor = ${code}` });
  } else {
    code = num(input, "code", "Code", { integer: true, min: 0, max: maxCode });
    Vin = code * lsb;
    steps.push({ text: "Voltage corresponding to the start of the code level:", tex: `V = \\text{code} \\times \\text{LSB} = ${code} \\times ${ntex(lsb, 5)} = ${ntex(Vin, 6)}\\ V` });
  }
  const snr = 6.02 * N + 1.76;
  steps.push(`Quantization error between 0 and one LSB (or ±½ LSB if the converter rounds): at most ${eng(lsb, "V", 4)}.`);
  steps.push({ text: "Theoretical best signal-to-noise ratio for a full-scale sine wave:", tex: `SNR = 6.02 \\times ${N} + 1.76 = ${ntex(snr, 4)}\\ dB` });
  const results = [
    { label: "LSB value", value: eng(lsb, "V", 4), text: `LSB = ${eng(lsb, "V", 4)}` },
    { label: "Code", value: code, text: `code = ${code}` },
    { label: "Hexadecimal code", value: "0x" + code.toString(16).toUpperCase() },
    { label: "Corresponding voltage", value: eng(code * lsb, "V", 6) },
    { label: "Ideal SNR", value: `${fmt(snr, 4)} dB` }
  ];
  if (!isBlank(input.xmin) && !isBlank(input.xmax)) {
    const xmin = num(input, "xmin", "Minimum value"), xmax = num(input, "xmax", "Maximum value");
    if (xmin === xmax) fail("The two physical values are equal.", "xmax");
    const unit = String(input.xunit ?? "").trim();
    const x = xmin + (code / maxCode) * (xmax - xmin);
    const res = (xmax - xmin) / maxCode;
    steps.push({ text: "Linear scaling from code to physical value:", tex: `x = ${ntex(xmin)} + \\frac{${code}}{${maxCode}}(${ntex(xmax)} - ${ntex(xmin)}) = ${ntex(x, 6)}` });
    results.push({ label: "Physical value", value: `${fmt(x, 6)} ${unit}` }, { label: "Physical resolution per step", value: `${fmt(res, 4)} ${unit}` });
  }
  return { results, steps, copy: `LSB = ${eng(lsb, "V", 4)}, code = ${code}, V = ${eng(code * lsb, "V", 6)}` };
}
