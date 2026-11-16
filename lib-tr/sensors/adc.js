import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "حسابات المحول التناظري الرقمي ADC: قيمة البت الأقل (LSB) والكود المقابل لأي جهد أو العكس، وخطأ التكميم ونسبة الإشارة إلى الضجيج المثالية، مع تحويل الكود إلى قيمة فيزيائية.",
  keywords: ["ADC", "محول تناظري رقمي", "دقة", "LSB", "تكميم", "quantization", "SNR", "تحجيم", "scaling", "بت"],
  formulas: [
    { label: "دقة المحول والكود", tex: "\\text{LSB} = \\frac{V_{ref}}{2^N},\\qquad \\text{code} = \\left\\lfloor \\frac{V_{in}}{\\text{LSB}} \\right\\rfloor" },
    { label: "SNR المثالي والتحجيم الخطي", tex: "SNR = 6.02N + 1.76\\ dB,\\qquad x = x_{min} + \\frac{\\text{code}}{2^N - 1}(x_{max} - x_{min})" }
  ],
  inputs: [
    { id: "N", label: "عدد البتات N", type: "number", default: "12" },
    { id: "Vref", label: "الجهد المرجعي Vref", unit: "V", type: "number", default: "3.3" },
    { id: "mode", label: "المطلوب", type: "select", default: "v2c", options: [["v2c", "الكود من الجهد"], ["c2v", "الجهد من الكود"]] },
    { id: "Vin", label: "جهد الدخل", unit: "V", type: "number", default: "1.65", when: { mode: ["v2c"] } },
    { id: "code", label: "الكود", type: "number", default: "2048", when: { mode: ["c2v"] } },
    { id: "xmin", label: "القيمة الفيزيائية عند 0 V (اختياري)", type: "number", default: "0" },
    { id: "xmax", label: "القيمة الفيزيائية عند Vref (اختياري)", type: "number", default: "100" },
    { id: "xunit", label: "وحدة القيمة الفيزيائية", type: "text", default: "°C" }
  ],
  example: { values: { N: "12", Vref: "3.3", mode: "v2c", Vin: "1.65", xmin: "0", xmax: "100", xunit: "°C" }, expect: ["code = 2048", "LSB = 805.7 µV"], note: "مثال: ADC بدقة 12 بت ومرجع 3.3 V وحساس حرارة 0–100 °C." },
  invalid: { values: { N: "12", Vref: "3.3", mode: "v2c", Vin: "4" } },
  related: ["sample-rate-resolution", "sensor-divider", "binary-twos-complement", "shunt-resistor"]
};

export function solve(input) {
  const N = num(input, "N", "عدد البتات", { integer: true, min: 1, max: 32 });
  const Vref = num(input, "Vref", "الجهد المرجعي", { positive: true });
  const mode = choice(input, "mode", "المطلوب", ["v2c", "c2v"], "v2c");
  const levels = Math.pow(2, N), maxCode = levels - 1, lsb = Vref / levels;
  const steps = [
    { text: `عدد المستويات $2^{${N}} = ${levels}$، وقيمة البت الأقل:`, tex: `\\text{LSB} = \\frac{${ntex(Vref)}}{${levels}} = ${ntex(lsb, 5)}\\ V` }
  ];
  let code, Vin;
  if (mode === "v2c") {
    Vin = num(input, "Vin", "جهد الدخل", { nonNegative: true });
    if (Vin > Vref) fail(`جهد الدخل أكبر من الجهد المرجعي ${fmt(Vref)} V، فالمحول سيتشبع عند الكود ${maxCode}.`, "Vin");
    code = Math.min(maxCode, Math.floor(Vin / lsb + 1e-9));
    steps.push({ text: "الكود هو الجزء الصحيح من قسمة الجهد على LSB:", tex: `\\text{code} = \\left\\lfloor\\frac{${ntex(Vin)}}{${ntex(lsb, 5)}}\\right\\rfloor = ${code}` });
  } else {
    code = num(input, "code", "الكود", { integer: true, min: 0, max: maxCode });
    Vin = code * lsb;
    steps.push({ text: "الجهد المقابل لبداية مستوى الكود:", tex: `V = \\text{code} \\times \\text{LSB} = ${code} \\times ${ntex(lsb, 5)} = ${ntex(Vin, 6)}\\ V` });
  }
  const snr = 6.02 * N + 1.76;
  steps.push(`خطأ التكميم بين 0 و LSB واحد (أو ±½ LSB إذا كان المحول يقرّب): أقصاه ${eng(lsb, "V", 4)}.`);
  steps.push({ text: "أفضل نسبة إشارة إلى ضجيج نظرياً لموجة جيبية بكامل المدى:", tex: `SNR = 6.02 \\times ${N} + 1.76 = ${ntex(snr, 4)}\\ dB` });
  const results = [
    { label: "قيمة LSB", value: eng(lsb, "V", 4), text: `LSB = ${eng(lsb, "V", 4)}` },
    { label: "الكود", value: code, text: `code = ${code}` },
    { label: "الكود بالست عشري", value: "0x" + code.toString(16).toUpperCase() },
    { label: "الجهد المقابل", value: eng(code * lsb, "V", 6) },
    { label: "SNR المثالي", value: `${fmt(snr, 4)} dB` }
  ];
  if (!isBlank(input.xmin) && !isBlank(input.xmax)) {
    const xmin = num(input, "xmin", "القيمة الدنيا"), xmax = num(input, "xmax", "القيمة العليا");
    if (xmin === xmax) fail("القيمتان الفيزيائيتان متساويتان.", "xmax");
    const unit = String(input.xunit ?? "").trim();
    const x = xmin + (code / maxCode) * (xmax - xmin);
    const res = (xmax - xmin) / maxCode;
    steps.push({ text: "التحجيم الخطي من الكود إلى القيمة الفيزيائية:", tex: `x = ${ntex(xmin)} + \\frac{${code}}{${maxCode}}(${ntex(xmax)} - ${ntex(xmin)}) = ${ntex(x, 6)}` });
    results.push({ label: "القيمة الفيزيائية", value: `${fmt(x, 6)} ${unit}` }, { label: "الدقة الفيزيائية لكل خطوة", value: `${fmt(res, 4)} ${unit}` });
  }
  return { results, steps, copy: `LSB = ${eng(lsb, "V", 4)}, code = ${code}, V = ${eng(code * lsb, "V", 6)}` };
}
