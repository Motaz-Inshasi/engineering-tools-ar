import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Step response of first- and second-order systems: the time-domain equation, rise time, peak time, overshoot, and settling time, for the underdamped, critically damped, and overdamped cases, with a plot.",
  keywords: ["step response", "step response", "second-order system", "first-order system", "overshoot", "overshoot", "settling time", "rise time", "damping ratio"],
  formulas: [
    { label: "First order", tex: "G(s) = \\frac{K}{\\tau s + 1} \\Rightarrow y(t) = K\\left(1 - e^{-t/\\tau}\\right)" },
    { label: "Second order (underdamped)", tex: "G(s) = \\frac{K\\omega_n^2}{s^2 + 2\\zeta\\omega_n s + \\omega_n^2},\\; \\%OS = 100\\,e^{-\\zeta\\pi/\\sqrt{1-\\zeta^2}},\\; T_p = \\frac{\\pi}{\\omega_d},\\; T_s \\approx \\frac{4}{\\zeta\\omega_n}" }
  ],
  inputs: [
    { id: "order", label: "System order", type: "select", default: "2", options: [["1", "First"], ["2", "Second"]] },
    { id: "K", label: "Static gain K", type: "number", default: "1" },
    { id: "tau", label: "Time constant τ", unit: "s", type: "number", default: "0.5", when: { order: ["1"] } },
    { id: "wn", label: "Natural frequency ωn", unit: "rad/s", type: "number", default: "4", when: { order: ["2"] } },
    { id: "zeta", label: "Damping ratio ζ", type: "number", default: "0.3", when: { order: ["2"] } }
  ],
  example: { values: { order: "2", K: "1", wn: "4", zeta: "0.3" }, expect: ["OS = 37.2"], note: "Example: a second-order system with $\\omega_n = 4$ and $\\zeta = 0.3$ (underdamped)." },
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
  const order = Number(choice(input, "order", "System order", ["1", "2"], "2"));
  const K = num(input, "K", "Gain", { nonZero: true });
  const steps = [];
  let y, tEnd, results, copy;
  if (order === 1) {
    const tau = num(input, "tau", "Time constant", { positive: true });
    y = response(1, { K, tau });
    tEnd = 6 * tau;
    const m = metrics(y, K, tEnd);
    steps.push({ text: "First-order step response by applying the inverse Laplace transform to $\\frac{K}{s(\\tau s+1)}$:", tex: `y(t) = ${ntex(K)}\\left(1 - e^{-t/${ntex(tau)}}\\right)` });
    steps.push(`After one time constant the response reaches 63.2% of the final value: $y(\\tau) = ${ntex(y(tau), 6)}$.`);
    steps.push({ text: "Rise time (10% → 90%) and settling time (2%):", tex: `T_r = \\tau\\ln 9 = ${ntex(2.1972 * tau, 6)}\\ s,\\qquad T_s = \\tau\\ln 50 \\approx 4\\tau = ${ntex(3.912 * tau, 6)}\\ s` });
    results = [
      { label: "Final value", value: K, sig: 8 },
      { label: "Rise time 10–90%", value: m.tr, unit: "s", sig: 5 },
      { label: "Settling time 2%", value: m.ts, unit: "s", sig: 5 },
      { label: "Overshoot", value: 0, unit: "%" }
    ];
    copy = `Tr = ${fmt(m.tr, 5)} s, Ts = ${fmt(m.ts, 5)} s, OS = 0%`;
  } else {
    const wn = num(input, "wn", "Natural frequency", { positive: true });
    const zeta = num(input, "zeta", "damping ratio", { nonNegative: true });
    if (zeta > 100) fail("The damping ratio is too large.", "zeta");
    y = response(2, { K, wn, zeta });
    const kind = zeta === 0 ? "Undamped (sustained oscillation)" : zeta < 1 ? "Underdamped (decaying oscillation)" : zeta === 1 ? "Critically damped" : "Overdamped (no oscillation)";
    steps.push({ text: `The poles are the roots of $s^2 + 2\\zeta\\omega_n s + \\omega_n^2$, and the system is ${kind}.`, tex: zeta < 1 ? `s = -${ntex(zeta * wn, 6)} \\pm j${ntex(wn * Math.sqrt(1 - zeta * zeta), 6)}` : `s = ${ntex(-wn * (zeta - Math.sqrt(zeta * zeta - 1)), 6)},\\; ${ntex(-wn * (zeta + Math.sqrt(zeta * zeta - 1)), 6)}` });
    if (zeta === 0) {
      tEnd = (6 * 2 * Math.PI) / wn;
      steps.push({ text: "Without damping the response oscillates around K forever:", tex: `y(t) = ${ntex(K)}\\left(1 - \\cos ${ntex(wn)}t\\right)` });
      results = [
        { label: "Response type", value: kind },
        { label: "Oscillation frequency", value: wn, unit: "rad/s", sig: 6 },
        { label: "Maximum value", value: 2 * K, sig: 6 },
        { label: "Overshoot", value: 100, unit: "%" },
        { label: "settling time", value: "Does not settle" }
      ];
      copy = `undamped, OS = 100%`;
    } else {
      tEnd = Math.max(12 / (zeta * wn), zeta >= 1 ? 12 * zeta / wn : 0);
      const m = metrics(y, K, tEnd);
      if (zeta < 1) {
        const wd = wn * Math.sqrt(1 - zeta * zeta);
        const os = 100 * Math.exp((-zeta * Math.PI) / Math.sqrt(1 - zeta * zeta));
        steps.push({ text: "Time response (inverse Laplace):", tex: `y(t) = ${ntex(K)}\\left[1 - e^{-${ntex(zeta * wn, 6)}t}\\left(\\cos ${ntex(wd, 6)}t + ${ntex(zeta / Math.sqrt(1 - zeta * zeta), 6)}\\sin ${ntex(wd, 6)}t\\right)\\right]` });
        steps.push({ text: "Peak time and overshoot from the formulas:", tex: `T_p = \\frac{\\pi}{\\omega_d} = ${ntex(Math.PI / wd, 6)}\\ s,\\quad \\%OS = ${ntex(os, 6)}\\%` });
        steps.push({ text: "Approximate settling time (2%):", tex: `T_s \\approx \\frac{4}{\\zeta\\omega_n} = ${ntex(4 / (zeta * wn), 6)}\\ s` });
        steps.push(`Exact values from simulating the curve: rise time ${fmt(m.tr, 5)} s, actual settling time ${fmt(m.ts, 5)} s.`);
        results = [
          { label: "Response type", value: kind },
          { label: "Overshoot percentage", value: os, unit: "%", sig: 5, text: `OS = ${fmt(os, 5)}%` },
          { label: "Peak time Tp", value: Math.PI / wd, unit: "s", sig: 5 },
          { label: "Rise time 10–90%", value: m.tr, unit: "s", sig: 5 },
          { label: "Settling time 2% (actual)", value: m.ts, unit: "s", sig: 5 },
          { label: "Approximate settling time 4/(ζωn)", value: 4 / (zeta * wn), unit: "s", sig: 5 },
          { label: "Damped frequency ωd", value: wd, unit: "rad/s", sig: 5 }
        ];
        copy = `OS = ${fmt(os, 5)}%, Tp = ${fmt(Math.PI / wd, 5)} s, Tr = ${fmt(m.tr, 5)} s, Ts = ${fmt(m.ts, 5)} s`;
      } else {
        steps.push(zeta === 1 ? { text: "Critically damped case:", tex: `y(t) = ${ntex(K)}\\left[1 - e^{-${ntex(wn)}t}(1 + ${ntex(wn)}t)\\right]` } : "Overdamped case: two real negative poles, and the response is a sum of two exponentials with no oscillation and no overshoot.");
        steps.push(`Values from curve simulation: rise time ${fmt(m.tr, 5)} s and settling time ${fmt(m.ts, 5)} s.`);
        results = [
          { label: "Response type", value: kind },
          { label: "Overshoot percentage", value: 0, unit: "%", text: "OS = 0%" },
          { label: "Rise time 10–90%", value: m.tr, unit: "s", sig: 5 },
          { label: "Settling time 2%", value: m.ts, unit: "s", sig: 5 }
        ];
        copy = `OS = 0%, Tr = ${fmt(m.tr, 5)} s, Ts = ${fmt(m.ts, 5)} s`;
      }
    }
  }
  return {
    results, steps, copy,
    blocks: [{ type: "plot", title: "step response", xLabel: "t (s)", yLabel: "y(t)", includeZero: true, series: [{ name: "y(t)", points: sampleFunction(y, 0, tEnd, 600) }], hlines: [{ y: K }] }]
  };
}
