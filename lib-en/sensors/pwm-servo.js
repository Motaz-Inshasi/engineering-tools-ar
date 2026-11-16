import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "PWM calculator for microcontrollers: the timer TOP value, actual frequency, PWM resolution in bits and the compare value for any duty cycle, and the servo pulse width and compare value for any angle.",
  keywords: ["PWM", "Servo", "servo", "Duty cycle", "duty cycle", "Timer", "timer", "prescaler", "Pulse width", "Arduino", "STM32"],
  formulas: [
    { label: "Timer PWM frequency (Fast PWM)", tex: "f_{PWM} = \\frac{f_{clk}}{N_{pre}(TOP + 1)},\\qquad \\text{resolution} = \\log_2(TOP + 1)\\ \\text{bits}" },
    { label: "Servo: pulse width is linear with angle", tex: "t_p = t_{min} + \\frac{\\theta}{\\theta_{max}}(t_{max} - t_{min}),\\qquad D = \\frac{t_p}{T}" }
  ],
  inputs: [
    { id: "mode", label: "Calculate", type: "select", default: "servo", options: [["pwm", "PWM timer setup"], ["servo", "Servo angle"]] },
    { id: "fclk", label: "Timer clock frequency", unit: "Hz", type: "number", default: "16M" },
    { id: "pre", label: "Prescaler", type: "number", default: "8" },
    { id: "f", label: "Required PWM frequency", unit: "Hz", type: "number", default: "50" },
    { id: "duty", label: "Duty cycle", unit: "%", type: "number", default: "25", when: { mode: ["pwm"] } },
    { id: "angle", label: "Required angle", unit: "°", type: "number", default: "90", when: { mode: ["servo"] } },
    { id: "range", label: "Servo angle range", unit: "°", type: "number", default: "180", when: { mode: ["servo"] } },
    { id: "tmin", label: "Pulse width at 0°", unit: "s", type: "number", default: "1m", when: { mode: ["servo"] } },
    { id: "tmax", label: "Pulse width at maximum angle", unit: "s", type: "number", default: "2m", when: { mode: ["servo"] } }
  ],
  example: { values: { mode: "servo", fclk: "16M", pre: "8", f: "50", angle: "90", range: "180", tmin: "1m", tmax: "2m" }, expect: ["TOP = 39999", "pulse = 1.5 ms", "OCR = 3000"], note: "Example: 180° servo on a 16 MHz timer with prescaler 8 and 50 Hz frequency." },
  invalid: { values: { mode: "pwm", fclk: "16M", pre: "1", f: "1", duty: "50" } },
  related: ["timer-555", "adc", "sample-rate-resolution"]
};

export function timer(fclk, pre, f) {
  const top = Math.round(fclk / (pre * f)) - 1;
  return { top, fact: fclk / (pre * (top + 1)), bits: Math.log2(top + 1) };
}

export function solve(input) {
  const mode = choice(input, "mode", "Calculate", ["pwm", "servo"], "servo");
  const fclk = num(input, "fclk", "Clock frequency", { positive: true });
  const pre = num(input, "pre", "Prescaler", { integer: true, min: 1, max: 65536 });
  const f = num(input, "f", "PWM frequency", { positive: true });
  const { top, fact, bits } = timer(fclk, pre, f);
  if (top < 1) fail("The required frequency is higher than this prescaler and clock frequency allow. Reduce the prescaler or the frequency.", "f");
  if (top > 65535) fail(`The required TOP value ${top} exceeds a 16-bit timer (65535). Increase the prescaler.`, "pre");
  const steps = [
    { text: "Timer frequency after the prescaler, then the number of counts per period:", tex: `\\frac{f_{clk}}{N_{pre}} = \\frac{${ntex(fclk)}}{${pre}} = ${ntex(fclk / pre, 6)}\\ Hz,\\quad TOP = \\frac{${ntex(fclk / pre, 6)}}{${ntex(f)}} - 1 = ${top}` },
    `Actual frequency ${eng(fact, "Hz", 6)} (error ${fmt((100 * (fact - f)) / f, 3)}%) and PWM resolution ${fmt(bits, 4)} bits.`
  ];
  const results = [
    { label: "TOP value (ICR/ARR)", value: top, text: `TOP = ${top}` },
    { label: "Actual frequency", value: eng(fact, "Hz", 6) },
    { label: "PWM resolution", value: `${fmt(bits, 4)} bits` }
  ];
  const T = 1 / fact;
  let duty, copy;
  if (mode === "pwm") {
    duty = num(input, "duty", "Duty cycle", { min: 0, max: 100 }) / 100;
    const ocr = Math.round(duty * (top + 1));
    steps.push({ text: "Compare value for the duty cycle:", tex: `OCR = D(TOP + 1) = ${ntex(duty)} \\times ${top + 1} = ${ocr}` });
    results.push({ label: "Compare value OCR/CCR", value: ocr, text: `OCR = ${ocr}` }, { label: "High time", value: eng(duty * T, "s", 4) });
    copy = `TOP = ${top}, OCR = ${ocr}, f = ${eng(fact, "Hz", 6)}`;
  } else {
    const angle = num(input, "angle", "Angle"), range = num(input, "range", "Angle range", { positive: true });
    const tmin = num(input, "tmin", "Minimum pulse width", { positive: true }), tmax = num(input, "tmax", "Maximum pulse width", { positive: true });
    if (angle < 0 || angle > range) fail(`The angle must be between 0 and ${fmt(range)}°.`, "angle");
    if (tmax <= tmin) fail("The maximum pulse width must be greater than the minimum.", "tmax");
    if (tmax >= T) fail("The maximum pulse width is longer than the PWM period; reduce the frequency (servos usually use 50 Hz).", "f");
    const tp = tmin + (angle / range) * (tmax - tmin);
    duty = tp / T;
    const ocr = Math.round(duty * (top + 1));
    const stepDeg = range / ((tmax - tmin) / (T / (top + 1)));
    steps.push({ text: "Pulse width is linear with angle:", tex: `t_p = ${ntex(tmin)} + \\frac{${ntex(angle)}}{${ntex(range)}}(${ntex(tmax)} - ${ntex(tmin)}) = ${ntex(tp, 5)}\\ s` });
    steps.push({ text: "Duty cycle and compare value:", tex: `D = \\frac{t_p}{T} = ${ntex(100 * duty, 4)}\\%,\\quad OCR = D(TOP + 1) = ${ocr}` });
    steps.push(`Each count corresponds to about ${fmt(stepDeg, 3)}°, which is the smallest possible angle step with this setup.`);
    results.push({ label: "Pulse width", value: eng(tp, "s", 4), text: `pulse = ${eng(tp, "s", 4)}` }, { label: "Duty cycle", value: `${fmt(100 * duty, 4)}%` }, { label: "Compare value", value: ocr, text: `OCR = ${ocr}` }, { label: "Smallest angle step", value: `${fmt(stepDeg, 3)}°` });
    copy = `TOP = ${top}, pulse = ${eng(tp, "s", 4)}, OCR = ${ocr}`;
  }
  const wave = [];
  for (let k = 0; k < 2; k++) wave.push([k * T, 0], [k * T, 1], [k * T + duty * T, 1], [k * T + duty * T, 0], [(k + 1) * T, 0]);
  return { results, steps, copy, blocks: [{ type: "plot", title: "PWM signal waveform (rotation)", xLabel: "t (s)", yLabel: "Output", yMin: -0.2, yMax: 1.3, series: [{ name: "PWM", points: wave }] }] };
}
