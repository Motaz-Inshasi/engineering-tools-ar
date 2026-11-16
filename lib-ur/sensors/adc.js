import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "انالاگ سے ڈیجیٹل کنورٹر (ADC) کے حسابات: کم ترین اہم بِٹ (LSB) کی قدر اور کسی بھی وولٹیج کا متعلقہ کوڈ یا اس کا الٹ، کوانٹائزیشن کی غلطی اور مثالی سگنل سے شور کا تناسب، ساتھ کوڈ کی طبیعی قدر میں تبدیلی۔",
  keywords: ["ADC", "انالاگ سے ڈیجیٹل کنورٹر", "ریزولوشن", "LSB", "کوانٹائزیشن", "quantization", "SNR", "اسکیلنگ", "scaling", "بِٹ"],
  formulas: [
    { label: "ریزولوشن اور کوڈ", tex: "\\text{LSB} = \\frac{V_{ref}}{2^N},\\qquad \\text{code} = \\left\\lfloor \\frac{V_{in}}{\\text{LSB}} \\right\\rfloor" },
    { label: "مثالی SNR اور خطی اسکیلنگ", tex: "SNR = 6.02N + 1.76\\ dB,\\qquad x = x_{min} + \\frac{\\text{code}}{2^N - 1}(x_{max} - x_{min})" }
  ],
  inputs: [
    { id: "N", label: "بِٹس کی تعداد N", type: "number", default: "12" },
    { id: "Vref", label: "حوالہ وولٹیج Vref", unit: "V", type: "number", default: "3.3" },
    { id: "mode", label: "درکار", type: "select", default: "v2c", options: [["v2c", "وولٹیج سے کوڈ"], ["c2v", "کوڈ سے وولٹیج"]] },
    { id: "Vin", label: "ان پٹ وولٹیج", unit: "V", type: "number", default: "1.65", when: { mode: ["v2c"] } },
    { id: "code", label: "کوڈ", type: "number", default: "2048", when: { mode: ["c2v"] } },
    { id: "xmin", label: "0 V پر طبیعی قدر (اختیاری)", type: "number", default: "0" },
    { id: "xmax", label: "Vref پر طبیعی قدر (اختیاری)", type: "number", default: "100" },
    { id: "xunit", label: "طبیعی قدر کی اکائی", type: "text", default: "°C" }
  ],
  example: { values: { N: "12", Vref: "3.3", mode: "v2c", Vin: "1.65", xmin: "0", xmax: "100", xunit: "°C" }, expect: ["code = 2048", "LSB = 805.7 µV"], note: "مثال: 12 بِٹ ADC، 3.3 V حوالہ اور 0 سے 100 °C کا درجہ حرارت سینسر۔" },
  invalid: { values: { N: "12", Vref: "3.3", mode: "v2c", Vin: "4" } },
  related: ["sample-rate-resolution", "sensor-divider", "binary-twos-complement", "shunt-resistor"]
};

export function solve(input) {
  const N = num(input, "N", "بِٹس کی تعداد", { integer: true, min: 1, max: 32 });
  const Vref = num(input, "Vref", "حوالہ وولٹیج", { positive: true });
  const mode = choice(input, "mode", "درکار", ["v2c", "c2v"], "v2c");
  const levels = Math.pow(2, N), maxCode = levels - 1, lsb = Vref / levels;
  const steps = [
    { text: `سطحوں کی تعداد $2^{${N}} = ${levels}$، اور کم ترین اہم بِٹ کی قدر:`, tex: `\\text{LSB} = \\frac{${ntex(Vref)}}{${levels}} = ${ntex(lsb, 5)}\\ V` }
  ];
  let code, Vin;
  if (mode === "v2c") {
    Vin = num(input, "Vin", "ان پٹ وولٹیج", { nonNegative: true });
    if (Vin > Vref) fail(`ان پٹ وولٹیج حوالہ وولٹیج ${fmt(Vref)} V سے زیادہ ہے، اس لیے کنورٹر کوڈ ${maxCode} پر سیچوریٹ ہو جائے گا۔`, "Vin");
    code = Math.min(maxCode, Math.floor(Vin / lsb + 1e-9));
    steps.push({ text: "کوڈ وولٹیج کو LSB سے تقسیم کرنے کا صحیح جزو ہے:", tex: `\\text{code} = \\left\\lfloor\\frac{${ntex(Vin)}}{${ntex(lsb, 5)}}\\right\\rfloor = ${code}` });
  } else {
    code = num(input, "code", "کوڈ", { integer: true, min: 0, max: maxCode });
    Vin = code * lsb;
    steps.push({ text: "کوڈ کی سطح کے آغاز کے مطابق وولٹیج:", tex: `V = \\text{code} \\times \\text{LSB} = ${code} \\times ${ntex(lsb, 5)} = ${ntex(Vin, 6)}\\ V` });
  }
  const snr = 6.02 * N + 1.76;
  steps.push(`کوانٹائزیشن کی غلطی 0 اور ایک LSB کے درمیان ہے (یا اگر کنورٹر گول کرتا ہو تو ±½ LSB): زیادہ سے زیادہ ${eng(lsb, "V", 4)}۔`);
  steps.push({ text: "مکمل پیمانے کی سائن لہر کے لیے نظری طور پر بہترین سگنل سے شور کا تناسب:", tex: `SNR = 6.02 \\times ${N} + 1.76 = ${ntex(snr, 4)}\\ dB` });
  const results = [
    { label: "LSB کی قدر", value: eng(lsb, "V", 4), text: `LSB = ${eng(lsb, "V", 4)}` },
    { label: "کوڈ", value: code, text: `code = ${code}` },
    { label: "ہیگزا ڈیسیمل کوڈ", value: "0x" + code.toString(16).toUpperCase() },
    { label: "متعلقہ وولٹیج", value: eng(code * lsb, "V", 6) },
    { label: "مثالی SNR", value: `${fmt(snr, 4)} dB` }
  ];
  if (!isBlank(input.xmin) && !isBlank(input.xmax)) {
    const xmin = num(input, "xmin", "کم سے کم قدر"), xmax = num(input, "xmax", "زیادہ سے زیادہ قدر");
    if (xmin === xmax) fail("دونوں طبیعی قدریں برابر ہیں۔", "xmax");
    const unit = String(input.xunit ?? "").trim();
    const x = xmin + (code / maxCode) * (xmax - xmin);
    const res = (xmax - xmin) / maxCode;
    steps.push({ text: "کوڈ سے طبیعی قدر تک خطی اسکیلنگ:", tex: `x = ${ntex(xmin)} + \\frac{${code}}{${maxCode}}(${ntex(xmax)} - ${ntex(xmin)}) = ${ntex(x, 6)}` });
    results.push({ label: "طبیعی قدر", value: `${fmt(x, 6)} ${unit}` }, { label: "ہر قدم پر طبیعی ریزولوشن", value: `${fmt(res, 4)} ${unit}` });
  }
  return { results, steps, copy: `LSB = ${eng(lsb, "V", 4)}, code = ${code}, V = ${eng(code * lsb, "V", 6)}` };
}
