import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "حاسبة PWM للمتحكمات الدقيقة: قيمة TOP للمؤقت والتردد الفعلي ودقة PWM بالبت وقيمة المقارنة لأي دورة عمل، وحساب عرض نبضة السيرفو وقيمة المقارنة لأي زاوية.",
  keywords: ["PWM", "سيرفو", "servo", "دورة العمل", "duty cycle", "مؤقت", "timer", "prescaler", "عرض النبضة", "Arduino", "STM32"],
  formulas: [
    { label: "تردد PWM للمؤقت (Fast PWM)", tex: "f_{PWM} = \\frac{f_{clk}}{N_{pre}(TOP + 1)},\\qquad \\text{resolution} = \\log_2(TOP + 1)\\ \\text{bits}" },
    { label: "السيرفو: عرض النبضة خطي مع الزاوية", tex: "t_p = t_{min} + \\frac{\\theta}{\\theta_{max}}(t_{max} - t_{min}),\\qquad D = \\frac{t_p}{T}" }
  ],
  inputs: [
    { id: "mode", label: "المطلوب", type: "select", default: "servo", options: [["pwm", "إعداد مؤقت PWM"], ["servo", "زاوية السيرفو"]] },
    { id: "fclk", label: "تردد ساعة المؤقت", unit: "Hz", type: "number", default: "16M" },
    { id: "pre", label: "المقسم المسبق (Prescaler)", type: "number", default: "8" },
    { id: "f", label: "تردد PWM المطلوب", unit: "Hz", type: "number", default: "50" },
    { id: "duty", label: "دورة العمل", unit: "%", type: "number", default: "25", when: { mode: ["pwm"] } },
    { id: "angle", label: "الزاوية المطلوبة", unit: "°", type: "number", default: "90", when: { mode: ["servo"] } },
    { id: "range", label: "مدى زاوية السيرفو", unit: "°", type: "number", default: "180", when: { mode: ["servo"] } },
    { id: "tmin", label: "عرض النبضة عند 0°", unit: "s", type: "number", default: "1m", when: { mode: ["servo"] } },
    { id: "tmax", label: "عرض النبضة عند أقصى زاوية", unit: "s", type: "number", default: "2m", when: { mode: ["servo"] } }
  ],
  example: { values: { mode: "servo", fclk: "16M", pre: "8", f: "50", angle: "90", range: "180", tmin: "1m", tmax: "2m" }, expect: ["TOP = 39999", "pulse = 1.5 ms", "OCR = 3000"], note: "مثال: سيرفو 180° على مؤقت 16 MHz بمقسم 8 وتردد 50 Hz." },
  invalid: { values: { mode: "pwm", fclk: "16M", pre: "1", f: "1", duty: "50" } },
  related: ["timer-555", "adc", "sample-rate-resolution"]
};

export function timer(fclk, pre, f) {
  const top = Math.round(fclk / (pre * f)) - 1;
  return { top, fact: fclk / (pre * (top + 1)), bits: Math.log2(top + 1) };
}

export function solve(input) {
  const mode = choice(input, "mode", "المطلوب", ["pwm", "servo"], "servo");
  const fclk = num(input, "fclk", "تردد الساعة", { positive: true });
  const pre = num(input, "pre", "المقسم المسبق", { integer: true, min: 1, max: 65536 });
  const f = num(input, "f", "تردد PWM", { positive: true });
  const { top, fact, bits } = timer(fclk, pre, f);
  if (top < 1) fail("التردد المطلوب أعلى مما يسمح به هذا المقسم وتردد الساعة. قلّل المقسم أو التردد.", "f");
  if (top > 65535) fail(`قيمة TOP المطلوبة ${top} تتجاوز مؤقت 16 بت (65535). زِد المقسم المسبق.`, "pre");
  const steps = [
    { text: "تردد المؤقت بعد المقسم ثم عدد العدّات في الدور:", tex: `\\frac{f_{clk}}{N_{pre}} = \\frac{${ntex(fclk)}}{${pre}} = ${ntex(fclk / pre, 6)}\\ Hz,\\quad TOP = \\frac{${ntex(fclk / pre, 6)}}{${ntex(f)}} - 1 = ${top}` },
    `التردد الفعلي ${eng(fact, "Hz", 6)} (الخطأ ${fmt((100 * (fact - f)) / f, 3)}%) ودقة PWM ${fmt(bits, 4)} بت.`
  ];
  const results = [
    { label: "قيمة TOP (ICR/ARR)", value: top, text: `TOP = ${top}` },
    { label: "التردد الفعلي", value: eng(fact, "Hz", 6) },
    { label: "دقة PWM", value: `${fmt(bits, 4)} بت` }
  ];
  const T = 1 / fact;
  let duty, copy;
  if (mode === "pwm") {
    duty = num(input, "duty", "دورة العمل", { min: 0, max: 100 }) / 100;
    const ocr = Math.round(duty * (top + 1));
    steps.push({ text: "قيمة المقارنة لدورة العمل:", tex: `OCR = D(TOP + 1) = ${ntex(duty)} \\times ${top + 1} = ${ocr}` });
    results.push({ label: "قيمة المقارنة OCR/CCR", value: ocr, text: `OCR = ${ocr}` }, { label: "زمن الارتفاع", value: eng(duty * T, "s", 4) });
    copy = `TOP = ${top}, OCR = ${ocr}, f = ${eng(fact, "Hz", 6)}`;
  } else {
    const angle = num(input, "angle", "الزاوية"), range = num(input, "range", "مدى الزاوية", { positive: true });
    const tmin = num(input, "tmin", "عرض النبضة الأدنى", { positive: true }), tmax = num(input, "tmax", "عرض النبضة الأقصى", { positive: true });
    if (angle < 0 || angle > range) fail(`الزاوية يجب أن تكون بين 0 و ${fmt(range)}°.`, "angle");
    if (tmax <= tmin) fail("عرض النبضة الأقصى يجب أن يكون أكبر من الأدنى.", "tmax");
    if (tmax >= T) fail("عرض النبضة الأقصى أطول من دور PWM؛ قلّل التردد (السيرفو عادة 50 Hz).", "f");
    const tp = tmin + (angle / range) * (tmax - tmin);
    duty = tp / T;
    const ocr = Math.round(duty * (top + 1));
    const stepDeg = range / ((tmax - tmin) / (T / (top + 1)));
    steps.push({ text: "عرض النبضة خطي مع الزاوية:", tex: `t_p = ${ntex(tmin)} + \\frac{${ntex(angle)}}{${ntex(range)}}(${ntex(tmax)} - ${ntex(tmin)}) = ${ntex(tp, 5)}\\ s` });
    steps.push({ text: "دورة العمل وقيمة المقارنة:", tex: `D = \\frac{t_p}{T} = ${ntex(100 * duty, 4)}\\%,\\quad OCR = D(TOP + 1) = ${ocr}` });
    steps.push(`كل عدّة واحدة تقابل ${fmt(stepDeg, 3)}° تقريباً، وهي أصغر خطوة زاوية ممكنة بهذا الإعداد.`);
    results.push({ label: "عرض النبضة", value: eng(tp, "s", 4), text: `pulse = ${eng(tp, "s", 4)}` }, { label: "دورة العمل", value: `${fmt(100 * duty, 4)}%` }, { label: "قيمة المقارنة", value: ocr, text: `OCR = ${ocr}` }, { label: "أصغر خطوة زاوية", value: `${fmt(stepDeg, 3)}°` });
    copy = `TOP = ${top}, pulse = ${eng(tp, "s", 4)}, OCR = ${ocr}`;
  }
  const wave = [];
  for (let k = 0; k < 2; k++) wave.push([k * T, 0], [k * T, 1], [k * T + duty * T, 1], [k * T + duty * T, 0], [(k + 1) * T, 0]);
  return { results, steps, copy, blocks: [{ type: "plot", title: "شكل إشارة PWM (دوران)", xLabel: "t (s)", yLabel: "الخرج", yMin: -0.2, yMax: 1.3, series: [{ name: "PWM", points: wave }] }] };
}
