import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "مائیکرو کنٹرولرز کے لیے PWM کیلکولیٹر: ٹائمر کی TOP قدر، اصل فریکوئنسی، بِٹس میں PWM ریزولوشن، اور کسی بھی ڈیوٹی سائیکل کے لیے کمپیئر ویلیو، نیز سرو کی پلس چوڑائی اور کسی بھی زاویے کے لیے کمپیئر ویلیو کا حساب۔",
  keywords: ["PWM", "سرو", "servo", "ڈیوٹی سائیکل", "duty cycle", "ٹائمر", "timer", "prescaler", "پلس کی چوڑائی", "Arduino", "STM32"],
  formulas: [
    { label: "ٹائمر PWM فریکوئنسی (Fast PWM)", tex: "f_{PWM} = \\frac{f_{clk}}{N_{pre}(TOP + 1)},\\qquad \\text{resolution} = \\log_2(TOP + 1)\\ \\text{bits}" },
    { label: "سرو: پلس کی چوڑائی زاویے کے ساتھ خطی ہے", tex: "t_p = t_{min} + \\frac{\\theta}{\\theta_{max}}(t_{max} - t_{min}),\\qquad D = \\frac{t_p}{T}" }
  ],
  inputs: [
    { id: "mode", label: "درکار", type: "select", default: "servo", options: [["pwm", "PWM ٹائمر سیٹ اپ"], ["servo", "سرو کا زاویہ"]] },
    { id: "fclk", label: "ٹائمر کلاک کی فریکوئنسی", unit: "Hz", type: "number", default: "16M" },
    { id: "pre", label: "پری اسکیلر (Prescaler)", type: "number", default: "8" },
    { id: "f", label: "درکار PWM فریکوئنسی", unit: "Hz", type: "number", default: "50" },
    { id: "duty", label: "ڈیوٹی سائیکل", unit: "%", type: "number", default: "25", when: { mode: ["pwm"] } },
    { id: "angle", label: "درکار زاویہ", unit: "°", type: "number", default: "90", when: { mode: ["servo"] } },
    { id: "range", label: "سرو زاویے کی حد", unit: "°", type: "number", default: "180", when: { mode: ["servo"] } },
    { id: "tmin", label: "0° پر پلس کی چوڑائی", unit: "s", type: "number", default: "1m", when: { mode: ["servo"] } },
    { id: "tmax", label: "زیادہ سے زیادہ زاویے پر پلس کی چوڑائی", unit: "s", type: "number", default: "2m", when: { mode: ["servo"] } }
  ],
  example: { values: { mode: "servo", fclk: "16M", pre: "8", f: "50", angle: "90", range: "180", tmin: "1m", tmax: "2m" }, expect: ["TOP = 39999", "pulse = 1.5 ms", "OCR = 3000"], note: "مثال: 16 MHz ٹائمر پر پری اسکیلر 8 اور 50 Hz فریکوئنسی کے ساتھ 180° سرو۔" },
  invalid: { values: { mode: "pwm", fclk: "16M", pre: "1", f: "1", duty: "50" } },
  related: ["timer-555", "adc", "sample-rate-resolution"]
};

export function timer(fclk, pre, f) {
  const top = Math.round(fclk / (pre * f)) - 1;
  return { top, fact: fclk / (pre * (top + 1)), bits: Math.log2(top + 1) };
}

export function solve(input) {
  const mode = choice(input, "mode", "درکار", ["pwm", "servo"], "servo");
  const fclk = num(input, "fclk", "کلاک کی فریکوئنسی", { positive: true });
  const pre = num(input, "pre", "پری اسکیلر", { integer: true, min: 1, max: 65536 });
  const f = num(input, "f", "PWM فریکوئنسی", { positive: true });
  const { top, fact, bits } = timer(fclk, pre, f);
  if (top < 1) fail("درکار فریکوئنسی اس پری اسکیلر اور کلاک فریکوئنسی کی اجازت سے زیادہ ہے۔ پری اسکیلر یا فریکوئنسی کم کریں۔", "f");
  if (top > 65535) fail(`درکار TOP قدر ${top} 16 بِٹ ٹائمر (65535) سے زیادہ ہے۔ پری اسکیلر بڑھائیں۔`, "pre");
  const steps = [
    { text: "پری اسکیلر کے بعد ٹائمر کی فریکوئنسی، پھر دور میں گنتیوں کی تعداد:", tex: `\\frac{f_{clk}}{N_{pre}} = \\frac{${ntex(fclk)}}{${pre}} = ${ntex(fclk / pre, 6)}\\ Hz,\\quad TOP = \\frac{${ntex(fclk / pre, 6)}}{${ntex(f)}} - 1 = ${top}` },
    `اصل فریکوئنسی ${eng(fact, "Hz", 6)} (غلطی ${fmt((100 * (fact - f)) / f, 3)}%) اور PWM ریزولوشن ${fmt(bits, 4)} بِٹس۔`
  ];
  const results = [
    { label: "TOP قدر (ICR/ARR)", value: top, text: `TOP = ${top}` },
    { label: "اصل فریکوئنسی", value: eng(fact, "Hz", 6) },
    { label: "PWM ریزولوشن", value: `${fmt(bits, 4)} بِٹس` }
  ];
  const T = 1 / fact;
  let duty, copy;
  if (mode === "pwm") {
    duty = num(input, "duty", "ڈیوٹی سائیکل", { min: 0, max: 100 }) / 100;
    const ocr = Math.round(duty * (top + 1));
    steps.push({ text: "ڈیوٹی سائیکل کے لیے کمپیئر ویلیو:", tex: `OCR = D(TOP + 1) = ${ntex(duty)} \\times ${top + 1} = ${ocr}` });
    results.push({ label: "کمپیئر ویلیو OCR/CCR", value: ocr, text: `OCR = ${ocr}` }, { label: "ہائی ٹائم", value: eng(duty * T, "s", 4) });
    copy = `TOP = ${top}, OCR = ${ocr}, f = ${eng(fact, "Hz", 6)}`;
  } else {
    const angle = num(input, "angle", "زاویہ"), range = num(input, "range", "زاویے کی حد", { positive: true });
    const tmin = num(input, "tmin", "کم از کم پلس کی چوڑائی", { positive: true }), tmax = num(input, "tmax", "زیادہ سے زیادہ پلس کی چوڑائی", { positive: true });
    if (angle < 0 || angle > range) fail(`زاویہ 0 اور ${fmt(range)}° کے درمیان ہونا چاہیے۔`, "angle");
    if (tmax <= tmin) fail("زیادہ سے زیادہ پلس کی چوڑائی کم از کم سے بڑی ہونی چاہیے۔", "tmax");
    if (tmax >= T) fail("زیادہ سے زیادہ پلس کی چوڑائی PWM دور سے لمبی ہے؛ فریکوئنسی کم کریں (سرو عموماً 50 Hz استعمال کرتے ہیں)۔", "f");
    const tp = tmin + (angle / range) * (tmax - tmin);
    duty = tp / T;
    const ocr = Math.round(duty * (top + 1));
    const stepDeg = range / ((tmax - tmin) / (T / (top + 1)));
    steps.push({ text: "پلس کی چوڑائی زاویے کے ساتھ خطی ہے:", tex: `t_p = ${ntex(tmin)} + \\frac{${ntex(angle)}}{${ntex(range)}}(${ntex(tmax)} - ${ntex(tmin)}) = ${ntex(tp, 5)}\\ s` });
    steps.push({ text: "ڈیوٹی سائیکل اور کمپیئر ویلیو:", tex: `D = \\frac{t_p}{T} = ${ntex(100 * duty, 4)}\\%,\\quad OCR = D(TOP + 1) = ${ocr}` });
    steps.push(`ہر گنتی تقریباً ${fmt(stepDeg, 3)}° کے برابر ہے، جو اس سیٹ اپ کے ساتھ ممکنہ سب سے چھوٹا زاویائی قدم ہے۔`);
    results.push({ label: "پلس کی چوڑائی", value: eng(tp, "s", 4), text: `pulse = ${eng(tp, "s", 4)}` }, { label: "ڈیوٹی سائیکل", value: `${fmt(100 * duty, 4)}%` }, { label: "کمپیئر ویلیو", value: ocr, text: `OCR = ${ocr}` }, { label: "سب سے چھوٹا زاویائی قدم", value: `${fmt(stepDeg, 3)}°` });
    copy = `TOP = ${top}, pulse = ${eng(tp, "s", 4)}, OCR = ${ocr}`;
  }
  const wave = [];
  for (let k = 0; k < 2; k++) wave.push([k * T, 0], [k * T, 1], [k * T + duty * T, 1], [k * T + duty * T, 0], [(k + 1) * T, 0]);
  return { results, steps, copy, blocks: [{ type: "plot", title: "PWM سگنل کی شکل (گردش)", xLabel: "t (s)", yLabel: "آؤٹ پٹ", yMin: -0.2, yMax: 1.3, series: [{ name: "PWM", points: wave }] }] };
}
