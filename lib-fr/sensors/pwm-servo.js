import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Calculatrice PWM pour microcontrôleurs : valeur TOP du timer, fréquence réelle, résolution PWM en bits et valeur de comparaison pour un rapport cyclique donné, et calcul de la largeur d'impulsion du servomoteur et de la valeur de comparaison pour un angle donné.",
  keywords: ["PWM", "Servomoteur", "servo", "Rapport cyclique", "duty cycle", "Timer", "timer", "prescaler", "Largeur d'impulsion", "Arduino", "STM32"],
  formulas: [
    { label: "Fréquence PWM du timer (Fast PWM)", tex: "f_{PWM} = \\frac{f_{clk}}{N_{pre}(TOP + 1)},\\qquad \\text{resolution} = \\log_2(TOP + 1)\\ \\text{bits}" },
    { label: "Servomoteur : largeur d'impulsion linéaire avec l'angle", tex: "t_p = t_{min} + \\frac{\\theta}{\\theta_{max}}(t_{max} - t_{min}),\\qquad D = \\frac{t_p}{T}" }
  ],
  inputs: [
    { id: "mode", label: "Grandeur demandée", type: "select", default: "servo", options: [["pwm", "Configuration du timer PWM"], ["servo", "Angle du servomoteur"]] },
    { id: "fclk", label: "Fréquence d'horloge du timer", unit: "Hz", type: "number", default: "16M" },
    { id: "pre", label: "Prédiviseur (Prescaler)", type: "number", default: "8" },
    { id: "f", label: "Fréquence PWM souhaitée", unit: "Hz", type: "number", default: "50" },
    { id: "duty", label: "Rapport cyclique", unit: "%", type: "number", default: "25", when: { mode: ["pwm"] } },
    { id: "angle", label: "Angle souhaité", unit: "°", type: "number", default: "90", when: { mode: ["servo"] } },
    { id: "range", label: "Plage angulaire du servomoteur", unit: "°", type: "number", default: "180", when: { mode: ["servo"] } },
    { id: "tmin", label: "Largeur d'impulsion à 0°", unit: "s", type: "number", default: "1m", when: { mode: ["servo"] } },
    { id: "tmax", label: "Largeur d'impulsion à l'angle maximal", unit: "s", type: "number", default: "2m", when: { mode: ["servo"] } }
  ],
  example: { values: { mode: "servo", fclk: "16M", pre: "8", f: "50", angle: "90", range: "180", tmin: "1m", tmax: "2m" }, expect: ["TOP = 39999", "pulse = 1.5 ms", "OCR = 3000"], note: "Exemple : servomoteur 180° sur un timer de 16 MHz avec prédiviseur 8 et fréquence de 50 Hz." },
  invalid: { values: { mode: "pwm", fclk: "16M", pre: "1", f: "1", duty: "50" } },
  related: ["timer-555", "adc", "sample-rate-resolution"]
};

export function timer(fclk, pre, f) {
  const top = Math.round(fclk / (pre * f)) - 1;
  return { top, fact: fclk / (pre * (top + 1)), bits: Math.log2(top + 1) };
}

export function solve(input) {
  const mode = choice(input, "mode", "Grandeur demandée", ["pwm", "servo"], "servo");
  const fclk = num(input, "fclk", "Fréquence d'horloge", { positive: true });
  const pre = num(input, "pre", "Prédiviseur", { integer: true, min: 1, max: 65536 });
  const f = num(input, "f", "Fréquence PWM", { positive: true });
  const { top, fact, bits } = timer(fclk, pre, f);
  if (top < 1) fail("La fréquence souhaitée est supérieure à ce que permettent ce prédiviseur et cette horloge. Réduisez le prédiviseur ou la fréquence.", "f");
  if (top > 65535) fail(`La valeur TOP requise ${top} dépasse un timer de 16 bits (65535). Augmentez le prédiviseur.`, "pre");
  const steps = [
    { text: "Fréquence du timer après le prédiviseur, puis nombre de comptages par période :", tex: `\\frac{f_{clk}}{N_{pre}} = \\frac{${ntex(fclk)}}{${pre}} = ${ntex(fclk / pre, 6)}\\ Hz,\\quad TOP = \\frac{${ntex(fclk / pre, 6)}}{${ntex(f)}} - 1 = ${top}` },
    `Fréquence réelle ${eng(fact, "Hz", 6)} (erreur ${fmt((100 * (fact - f)) / f, 3)}%) et résolution PWM ${fmt(bits, 4)} bits.`
  ];
  const results = [
    { label: "Valeur TOP (ICR/ARR)", value: top, text: `TOP = ${top}` },
    { label: "Fréquence réelle", value: eng(fact, "Hz", 6) },
    { label: "Résolution PWM", value: `${fmt(bits, 4)} bits` }
  ];
  const T = 1 / fact;
  let duty, copy;
  if (mode === "pwm") {
    duty = num(input, "duty", "Rapport cyclique", { min: 0, max: 100 }) / 100;
    const ocr = Math.round(duty * (top + 1));
    steps.push({ text: "Valeur de comparaison pour le rapport cyclique :", tex: `OCR = D(TOP + 1) = ${ntex(duty)} \\times ${top + 1} = ${ocr}` });
    results.push({ label: "Valeur de comparaison OCR/CCR", value: ocr, text: `OCR = ${ocr}` }, { label: "Durée à l'état haut", value: eng(duty * T, "s", 4) });
    copy = `TOP = ${top}, OCR = ${ocr}, f = ${eng(fact, "Hz", 6)}`;
  } else {
    const angle = num(input, "angle", "Angle"), range = num(input, "range", "Plage angulaire", { positive: true });
    const tmin = num(input, "tmin", "Largeur d'impulsion minimale", { positive: true }), tmax = num(input, "tmax", "Largeur d'impulsion maximale", { positive: true });
    if (angle < 0 || angle > range) fail(`L'angle doit être compris entre 0 et ${fmt(range)}°.`, "angle");
    if (tmax <= tmin) fail("La largeur d'impulsion maximale doit être supérieure à la minimale.", "tmax");
    if (tmax >= T) fail("La largeur d'impulsion maximale est plus longue que la période PWM ; réduisez la fréquence (un servomoteur utilise généralement 50 Hz).", "f");
    const tp = tmin + (angle / range) * (tmax - tmin);
    duty = tp / T;
    const ocr = Math.round(duty * (top + 1));
    const stepDeg = range / ((tmax - tmin) / (T / (top + 1)));
    steps.push({ text: "Largeur d'impulsion linéaire avec l'angle :", tex: `t_p = ${ntex(tmin)} + \\frac{${ntex(angle)}}{${ntex(range)}}(${ntex(tmax)} - ${ntex(tmin)}) = ${ntex(tp, 5)}\\ s` });
    steps.push({ text: "Rapport cyclique et valeur de comparaison :", tex: `D = \\frac{t_p}{T} = ${ntex(100 * duty, 4)}\\%,\\quad OCR = D(TOP + 1) = ${ocr}` });
    steps.push(`Chaque comptage correspond à environ ${fmt(stepDeg, 3)}°, c'est le plus petit pas angulaire possible avec ce réglage.`);
    results.push({ label: "Largeur d'impulsion", value: eng(tp, "s", 4), text: `pulse = ${eng(tp, "s", 4)}` }, { label: "Rapport cyclique", value: `${fmt(100 * duty, 4)}%` }, { label: "Valeur de comparaison", value: ocr, text: `OCR = ${ocr}` }, { label: "Plus petit pas angulaire", value: `${fmt(stepDeg, 3)}°` });
    copy = `TOP = ${top}, pulse = ${eng(tp, "s", 4)}, OCR = ${ocr}`;
  }
  const wave = [];
  for (let k = 0; k < 2; k++) wave.push([k * T, 0], [k * T, 1], [k * T + duty * T, 1], [k * T + duty * T, 0], [(k + 1) * T, 0]);
  return { results, steps, copy, blocks: [{ type: "plot", title: "Forme du signal PWM (rotation)", xLabel: "t (s)", yLabel: "Sortie", yMin: -0.2, yMax: 1.3, series: [{ name: "PWM", points: wave }] }] };
}
