import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Calculadora PWM para microcontroladores: valor TOP del temporizador, frecuencia real, resolución PWM en bits y valor de comparación para cualquier ciclo de trabajo, y cálculo del ancho de pulso del servo y del valor de comparación para cualquier ángulo.",
  keywords: ["PWM", "Servo", "servo", "Ciclo de trabajo", "duty cycle", "Temporizador", "timer", "prescaler", "Ancho de pulso", "Arduino", "STM32"],
  formulas: [
    { label: "Frecuencia PWM del temporizador (Fast PWM)", tex: "f_{PWM} = \\frac{f_{clk}}{N_{pre}(TOP + 1)},\\qquad \\text{resolution} = \\log_2(TOP + 1)\\ \\text{bits}" },
    { label: "Servo: el ancho de pulso es lineal con el ángulo", tex: "t_p = t_{min} + \\frac{\\theta}{\\theta_{max}}(t_{max} - t_{min}),\\qquad D = \\frac{t_p}{T}" }
  ],
  inputs: [
    { id: "mode", label: "Se pide", type: "select", default: "servo", options: [["pwm", "Configuración del temporizador PWM"], ["servo", "Ángulo del servo"]] },
    { id: "fclk", label: "Frecuencia del reloj del temporizador", unit: "Hz", type: "number", default: "16M" },
    { id: "pre", label: "Preescalador (Prescaler)", type: "number", default: "8" },
    { id: "f", label: "Frecuencia PWM requerida", unit: "Hz", type: "number", default: "50" },
    { id: "duty", label: "Ciclo de trabajo", unit: "%", type: "number", default: "25", when: { mode: ["pwm"] } },
    { id: "angle", label: "Ángulo requerido", unit: "°", type: "number", default: "90", when: { mode: ["servo"] } },
    { id: "range", label: "Rango angular del servo", unit: "°", type: "number", default: "180", when: { mode: ["servo"] } },
    { id: "tmin", label: "Ancho de pulso a 0°", unit: "s", type: "number", default: "1m", when: { mode: ["servo"] } },
    { id: "tmax", label: "Ancho de pulso en el ángulo máximo", unit: "s", type: "number", default: "2m", when: { mode: ["servo"] } }
  ],
  example: { values: { mode: "servo", fclk: "16M", pre: "8", f: "50", angle: "90", range: "180", tmin: "1m", tmax: "2m" }, expect: ["TOP = 39999", "pulse = 1.5 ms", "OCR = 3000"], note: "Ejemplo: servo de 180° en un temporizador de 16 MHz con preescalador 8 y frecuencia de 50 Hz." },
  invalid: { values: { mode: "pwm", fclk: "16M", pre: "1", f: "1", duty: "50" } },
  related: ["timer-555", "adc", "sample-rate-resolution"]
};

export function timer(fclk, pre, f) {
  const top = Math.round(fclk / (pre * f)) - 1;
  return { top, fact: fclk / (pre * (top + 1)), bits: Math.log2(top + 1) };
}

export function solve(input) {
  const mode = choice(input, "mode", "Se pide", ["pwm", "servo"], "servo");
  const fclk = num(input, "fclk", "Frecuencia del reloj", { positive: true });
  const pre = num(input, "pre", "Preescalador", { integer: true, min: 1, max: 65536 });
  const f = num(input, "f", "Frecuencia PWM", { positive: true });
  const { top, fact, bits } = timer(fclk, pre, f);
  if (top < 1) fail("La frecuencia requerida es mayor que la que permiten este preescalador y el reloj. Reduzca el preescalador o la frecuencia.", "f");
  if (top > 65535) fail(`El valor TOP requerido ${top} supera el temporizador de 16 bits (65535). Aumente el preescalador.`, "pre");
  const steps = [
    { text: "Frecuencia del temporizador tras el preescalador y después número de cuentas por periodo:", tex: `\\frac{f_{clk}}{N_{pre}} = \\frac{${ntex(fclk)}}{${pre}} = ${ntex(fclk / pre, 6)}\\ Hz,\\quad TOP = \\frac{${ntex(fclk / pre, 6)}}{${ntex(f)}} - 1 = ${top}` },
    `Frecuencia real ${eng(fact, "Hz", 6)} (error ${fmt((100 * (fact - f)) / f, 3)}%) y resolución PWM de ${fmt(bits, 4)} bits.`
  ];
  const results = [
    { label: "Valor TOP (ICR/ARR)", value: top, text: `TOP = ${top}` },
    { label: "Frecuencia real", value: eng(fact, "Hz", 6) },
    { label: "Resolución PWM", value: `${fmt(bits, 4)} bits` }
  ];
  const T = 1 / fact;
  let duty, copy;
  if (mode === "pwm") {
    duty = num(input, "duty", "Ciclo de trabajo", { min: 0, max: 100 }) / 100;
    const ocr = Math.round(duty * (top + 1));
    steps.push({ text: "Valor de comparación para el ciclo de trabajo:", tex: `OCR = D(TOP + 1) = ${ntex(duty)} \\times ${top + 1} = ${ocr}` });
    results.push({ label: "Valor de comparación OCR/CCR", value: ocr, text: `OCR = ${ocr}` }, { label: "Tiempo en alto", value: eng(duty * T, "s", 4) });
    copy = `TOP = ${top}, OCR = ${ocr}, f = ${eng(fact, "Hz", 6)}`;
  } else {
    const angle = num(input, "angle", "Ángulo"), range = num(input, "range", "Rango angular", { positive: true });
    const tmin = num(input, "tmin", "Ancho de pulso mínimo", { positive: true }), tmax = num(input, "tmax", "Ancho de pulso máximo", { positive: true });
    if (angle < 0 || angle > range) fail(`El ángulo debe estar entre 0 y ${fmt(range)}°.`, "angle");
    if (tmax <= tmin) fail("El ancho de pulso máximo debe ser mayor que el mínimo.", "tmax");
    if (tmax >= T) fail("El ancho de pulso máximo es mayor que el periodo PWM; reduzca la frecuencia (los servos suelen usar 50 Hz).", "f");
    const tp = tmin + (angle / range) * (tmax - tmin);
    duty = tp / T;
    const ocr = Math.round(duty * (top + 1));
    const stepDeg = range / ((tmax - tmin) / (T / (top + 1)));
    steps.push({ text: "El ancho de pulso es lineal con el ángulo:", tex: `t_p = ${ntex(tmin)} + \\frac{${ntex(angle)}}{${ntex(range)}}(${ntex(tmax)} - ${ntex(tmin)}) = ${ntex(tp, 5)}\\ s` });
    steps.push({ text: "Ciclo de trabajo y valor de comparación:", tex: `D = \\frac{t_p}{T} = ${ntex(100 * duty, 4)}\\%,\\quad OCR = D(TOP + 1) = ${ocr}` });
    steps.push(`Cada cuenta corresponde a unos ${fmt(stepDeg, 3)}°, que es el menor paso angular posible con esta configuración.`);
    results.push({ label: "Ancho de pulso", value: eng(tp, "s", 4), text: `pulse = ${eng(tp, "s", 4)}` }, { label: "Ciclo de trabajo", value: `${fmt(100 * duty, 4)}%` }, { label: "Valor de comparación", value: ocr, text: `OCR = ${ocr}` }, { label: "Menor paso angular", value: `${fmt(stepDeg, 3)}°` });
    copy = `TOP = ${top}, pulse = ${eng(tp, "s", 4)}, OCR = ${ocr}`;
  }
  const wave = [];
  for (let k = 0; k < 2; k++) wave.push([k * T, 0], [k * T, 1], [k * T + duty * T, 1], [k * T + duty * T, 0], [(k + 1) * T, 0]);
  return { results, steps, copy, blocks: [{ type: "plot", title: "Forma de la señal PWM (giro)", xLabel: "t (s)", yLabel: "Salida", yMin: -0.2, yMax: 1.3, series: [{ name: "PWM", points: wave }] }] };
}
