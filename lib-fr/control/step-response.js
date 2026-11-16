import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Réponse indicielle des systèmes du premier et du second ordre : équation temporelle, temps de montée, temps de pic, dépassement et temps de réponse, pour les cas sous-amorti, critique et sur-amorti, avec tracé.",
  keywords: ["Réponse indicielle", "step response", "Système du second ordre", "Système du premier ordre", "Dépassement", "overshoot", "Temps de réponse", "Temps de montée", "Coefficient d'amortissement"],
  formulas: [
    { label: "Premier ordre", tex: "G(s) = \\frac{K}{\\tau s + 1} \\Rightarrow y(t) = K\\left(1 - e^{-t/\\tau}\\right)" },
    { label: "Second ordre (sous-amorti)", tex: "G(s) = \\frac{K\\omega_n^2}{s^2 + 2\\zeta\\omega_n s + \\omega_n^2},\\; \\%OS = 100\\,e^{-\\zeta\\pi/\\sqrt{1-\\zeta^2}},\\; T_p = \\frac{\\pi}{\\omega_d},\\; T_s \\approx \\frac{4}{\\zeta\\omega_n}" }
  ],
  inputs: [
    { id: "order", label: "Ordre du système", type: "select", default: "2", options: [["1", "Premier"], ["2", "Second"]] },
    { id: "K", label: "Gain statique K", type: "number", default: "1" },
    { id: "tau", label: "Constante de temps τ", unit: "s", type: "number", default: "0.5", when: { order: ["1"] } },
    { id: "wn", label: "Pulsation propre ωn", unit: "rad/s", type: "number", default: "4", when: { order: ["2"] } },
    { id: "zeta", label: "Coefficient d'amortissement ζ", type: "number", default: "0.3", when: { order: ["2"] } }
  ],
  example: { values: { order: "2", K: "1", wn: "4", zeta: "0.3" }, expect: ["OS = 37.2"], note: "Exemple : système du second ordre avec $\\omega_n = 4$ et $\\zeta = 0.3$ (sous-amorti)." },
  invalid: { values: { order: "2", K: "1", wn: "4", zeta: "-0.5" } },
  related: ["transfer-function", "bode-plot", "routh-hurwitz", "rc-rl-transient"]
};

export function response(order, p) {
  const { K } = p;
  if (order === 1) return (t) => (t < 0 ? 0 : K * (1 - Math.exp(-t / p.tau)));
  const { wn, zeta } = p;
  if (zeta < 1) {
    const wd = wn * Math.sqrt(1 - zeta * zeta);
    return (t) => (t < 0 ? 0 : K * (1 - Math.exp(-zeta * wn * t) * (Math.cos(wd * t) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(wd * t))));
  }
  if (zeta === 1) return (t) => (t < 0 ? 0 : K * (1 - Math.exp(-wn * t) * (1 + wn * t)));
  const r = Math.sqrt(zeta * zeta - 1);
  const s1 = -wn * (zeta - r), s2 = -wn * (zeta + r);
  return (t) => (t < 0 ? 0 : K * (1 + (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s1 - s2)));
}

export function metrics(y, K, tEnd, n = 20000) {
  const dt = tEnd / n;
  let t10 = null, t90 = null, peak = -Infinity, tp = 0, ts = 0;
  const sgn = Math.sign(K) || 1;
  for (let i = 0; i <= n; i++) {
    const t = i * dt, v = y(t) * sgn, k = Math.abs(K);
    if (t10 === null && v >= 0.1 * k) t10 = t;
    if (t90 === null && v >= 0.9 * k) t90 = t;
    if (v > peak) { peak = v; tp = t; }
    if (Math.abs(v - k) > 0.02 * k) ts = t + dt;
  }
  return { tr: t10 !== null && t90 !== null ? t90 - t10 : NaN, peak: peak * sgn, tp, ts: ts >= tEnd ? Infinity : ts, os: Math.max(0, (100 * (peak - Math.abs(K))) / Math.abs(K)) };
}

export function solve(input) {
  const order = Number(choice(input, "order", "Ordre du système", ["1", "2"], "2"));
  const K = num(input, "K", "Gain", { nonZero: true });
  const steps = [];
  let y, tEnd, results, copy;
  if (order === 1) {
    const tau = num(input, "tau", "Constante de temps", { positive: true });
    y = response(1, { K, tau });
    tEnd = 6 * tau;
    const m = metrics(y, K, tEnd);
    steps.push({ text: "Réponse indicielle du premier ordre par transformée de Laplace inverse de $\\frac{K}{s(\\tau s+1)}$ :", tex: `y(t) = ${ntex(K)}\\left(1 - e^{-t/${ntex(tau)}}\\right)` });
    steps.push(`Après une constante de temps, la réponse atteint 63.2 % de la valeur finale : $y(\\tau) = ${ntex(y(tau), 6)}$.`);
    steps.push({ text: "Temps de montée (10 % → 90 %) et temps de réponse (2 %) :", tex: `T_r = \\tau\\ln 9 = ${ntex(2.1972 * tau, 6)}\\ s,\\qquad T_s = \\tau\\ln 50 \\approx 4\\tau = ${ntex(3.912 * tau, 6)}\\ s` });
    results = [
      { label: "Valeur finale", value: K, sig: 8 },
      { label: "Temps de montée 10–90 %", value: m.tr, unit: "s", sig: 5 },
      { label: "Temps de réponse 2 %", value: m.ts, unit: "s", sig: 5 },
      { label: "Dépassement", value: 0, unit: "%" }
    ];
    copy = `Tr = ${fmt(m.tr, 5)} s, Ts = ${fmt(m.ts, 5)} s, OS = 0%`;
  } else {
    const wn = num(input, "wn", "Pulsation propre", { positive: true });
    const zeta = num(input, "zeta", "Coefficient d'amortissement", { nonNegative: true });
    if (zeta > 100) fail("Le coefficient d'amortissement est trop grand.", "zeta");
    y = response(2, { K, wn, zeta });
    const kind = zeta === 0 ? "Non amorti (oscillations permanentes)" : zeta < 1 ? "Sous-amorti (oscillations décroissantes)" : zeta === 1 ? "Critique" : "Sur-amorti (sans oscillation)";
    steps.push({ text: `Les pôles sont les racines de $s^2 + 2\\zeta\\omega_n s + \\omega_n^2$, et le système est ${kind}.`, tex: zeta < 1 ? `s = -${ntex(zeta * wn, 6)} \\pm j${ntex(wn * Math.sqrt(1 - zeta * zeta), 6)}` : `s = ${ntex(-wn * (zeta - Math.sqrt(zeta * zeta - 1)), 6)},\\; ${ntex(-wn * (zeta + Math.sqrt(zeta * zeta - 1)), 6)}` });
    if (zeta === 0) {
      tEnd = (6 * 2 * Math.PI) / wn;
      steps.push({ text: "Sans amortissement, la réponse oscille indéfiniment autour de K :", tex: `y(t) = ${ntex(K)}\\left(1 - \\cos ${ntex(wn)}t\\right)` });
      results = [
        { label: "Type de réponse", value: kind },
        { label: "Pulsation d'oscillation", value: wn, unit: "rad/s", sig: 6 },
        { label: "Valeur maximale", value: 2 * K, sig: 6 },
        { label: "Dépassement", value: 100, unit: "%" },
        { label: "Temps de réponse", value: "Ne se stabilise pas" }
      ];
      copy = `undamped, OS = 100%`;
    } else {
      tEnd = Math.max(12 / (zeta * wn), zeta >= 1 ? 12 * zeta / wn : 0);
      const m = metrics(y, K, tEnd);
      if (zeta < 1) {
        const wd = wn * Math.sqrt(1 - zeta * zeta);
        const os = 100 * Math.exp((-zeta * Math.PI) / Math.sqrt(1 - zeta * zeta));
        steps.push({ text: "Réponse temporelle (transformée de Laplace inverse) :", tex: `y(t) = ${ntex(K)}\\left[1 - e^{-${ntex(zeta * wn, 6)}t}\\left(\\cos ${ntex(wd, 6)}t + ${ntex(zeta / Math.sqrt(1 - zeta * zeta), 6)}\\sin ${ntex(wd, 6)}t\\right)\\right]` });
        steps.push({ text: "Temps de pic et dépassement d'après les formules :", tex: `T_p = \\frac{\\pi}{\\omega_d} = ${ntex(Math.PI / wd, 6)}\\ s,\\quad \\%OS = ${ntex(os, 6)}\\%` });
        steps.push({ text: "Temps de réponse approximatif (2 %) :", tex: `T_s \\approx \\frac{4}{\\zeta\\omega_n} = ${ntex(4 / (zeta * wn), 6)}\\ s` });
        steps.push(`Valeurs précises issues de la simulation de la courbe : temps de montée ${fmt(m.tr, 5)} s, et temps de réponse réel ${fmt(m.ts, 5)} s.`);
        results = [
          { label: "Type de réponse", value: kind },
          { label: "Dépassement", value: os, unit: "%", sig: 5, text: `OS = ${fmt(os, 5)}%` },
          { label: "Temps de pic Tp", value: Math.PI / wd, unit: "s", sig: 5 },
          { label: "Temps de montée 10–90 %", value: m.tr, unit: "s", sig: 5 },
          { label: "Temps de réponse 2 % (réel)", value: m.ts, unit: "s", sig: 5 },
          { label: "Temps de réponse approximatif 4/(ζωn)", value: 4 / (zeta * wn), unit: "s", sig: 5 },
          { label: "Pulsation amortie ωd", value: wd, unit: "rad/s", sig: 5 }
        ];
        copy = `OS = ${fmt(os, 5)}%, Tp = ${fmt(Math.PI / wd, 5)} s, Tr = ${fmt(m.tr, 5)} s, Ts = ${fmt(m.ts, 5)} s`;
      } else {
        steps.push(zeta === 1 ? { text: "Cas de l'amortissement critique :", tex: `y(t) = ${ntex(K)}\\left[1 - e^{-${ntex(wn)}t}(1 + ${ntex(wn)}t)\\right]` } : "Cas sur-amorti : deux pôles réels négatifs, et la réponse est une somme de deux exponentielles, sans oscillation ni dépassement.");
        steps.push(`Valeurs issues de la simulation de la courbe : temps de montée ${fmt(m.tr, 5)} s et temps de réponse ${fmt(m.ts, 5)} s.`);
        results = [
          { label: "Type de réponse", value: kind },
          { label: "Dépassement", value: 0, unit: "%", text: "OS = 0%" },
          { label: "Temps de montée 10–90 %", value: m.tr, unit: "s", sig: 5 },
          { label: "Temps de réponse 2 %", value: m.ts, unit: "s", sig: 5 }
        ];
        copy = `OS = 0%, Tr = ${fmt(m.tr, 5)} s, Ts = ${fmt(m.ts, 5)} s`;
      }
    }
  }
  return {
    results, steps, copy,
    blocks: [{ type: "plot", title: "Réponse indicielle", xLabel: "t (s)", yLabel: "y(t)", includeZero: true, series: [{ name: "y(t)", points: sampleFunction(y, 0, tEnd, 600) }], hlines: [{ y: K }] }]
  };
}
