import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const PRESETS = {
  none: { yU: "", tU: "", aU: "", note: "" },
  newton: {
    yU: "°C", tU: "min", aU: "1/min",
    note: "Newton cooling: T' = −k(T − Tₐ) ⇒ a = k and b = k·Tₐ. Units: T in °C, time in minutes, k in 1/min, and the steady state is the ambient temperature Tₐ."
  },
  rc: {
    yU: "V", tU: "s", aU: "1/s",
    note: "RC capacitor charging: V' + V/(RC) = V_s/(RC) ⇒ a = 1/(RC) and b = V_s/(RC). Units: voltage in volts, time in seconds, and the steady state is the supply voltage V_s."
  },
  growth: {
    yU: "Quantity unit", tU: "Time unit", aU: "1/time unit",
    note: "Exponential growth or decay: y' = r·y ⇒ a = −r and b = 0. If r > 0 it is growth (a < 0); for decay, a > 0. The steady state is 0."
  },
  mixing: {
    yU: "g/L", tU: "min", aU: "1/min",
    note: "Simple mixing tank: C' + (q/V)·C = q·C_in/V ⇒ a = q/V and b = q·C_in/V. Units: concentration in g/L, time in minutes, flow rate q in L/min, volume V in liters, and the steady state is C_in."
  }
};

const unitOf = (u) => (u ? ` ${u}` : "");
const tex = (x) => ntex(x, 6);
const texSigned = (x) => (x < 0 ? `- ${tex(-x)}` : `+ ${tex(x)}`);
const plainSigned = (x) => (x < 0 ? `− ${fmt(-x, 4)}` : `+ ${fmt(x, 4)}`);
const tTex = (t0) => (t0 === 0 ? "t" : `(t ${texSigned(-t0)})`);
const tPlain = (t0) => (t0 === 0 ? "t" : `(t ${plainSigned(-t0)})`);
const samples = (t0, span, f) => {
  const points = [];
  for (let i = 0; i <= 200; i++) {
    const t = t0 + (span * i) / 200;
    points.push([t, f(t)]);
  }
  return points;
};

export const meta = {
  description: "Solves the first-order linear differential equation y' + a·y = b with constant coefficients and an initial condition, including the integrating factor, the time constant, the half-difference time, and the graph.",
  keywords: ["differential equation", "first order", "integrating factor", "time constant", "Newton cooling", "capacitor charging", "exponential growth", "exponential decay", "first order ODE", "integrating factor", "time constant"],
  formulas: [
    { label: "Standard form", tex: "y' + a\\,y = b" },
    { label: "General solution with the initial condition", tex: "y(t) = \\frac{b}{a} + \\left(y_0 - \\frac{b}{a}\\right)e^{-a(t-t_0)}" },
    { label: "Time constant", tex: "\\tau = \\frac{1}{a}" },
    { label: "Case a = 0", tex: "y(t) = y_0 + b\\,(t - t_0)" }
  ],
  inputs: [
    { id: "a", label: "Coefficient a", type: "number", default: "0.1", help: "Coefficient of y in the form y' + a·y = b. It can be zero or negative." },
    { id: "b", label: "Right-hand side b", type: "number", default: "2", help: "The constant term on the right-hand side of the equation." },
    { id: "t0", label: "Initial time t0", type: "number", default: "0" },
    { id: "y0", label: "Initial value y0", type: "number", default: "0", help: "Value of y at time t0." },
    { id: "t1", label: "Calculation time t1 (optional)", type: "number", default: "10", help: "Leave the field empty if you do not need a value at a specific time." },
    {
      id: "preset", label: "Example model", type: "select", default: "none",
      options: [["none", "No model"], ["newton", "Newton cooling"], ["rc", "RC capacitor charging"], ["growth", "Exponential growth or decay"], ["mixing", "Simple mixing tank"]]
    }
  ],
  example: {
    values: { a: "0.1", b: "2", t0: "0", y0: "0", t1: "10", preset: "none" },
    expect: ["y(10) = 12.64", "Steady state = 20"],
    note: "Example: a = 0.1, b = 2, y0 = 0, so y(10) = 20(1 − e⁻¹) ≈ 12.64."
  },
  invalid: { values: { a: "0.1", b: "2", t0: "0", y0: "", t1: "10", preset: "none" } },
  related: ["ode-second-order", "ode-numerical", "rc-rl-transient", "population-growth"]
};

export function solve(input) {
  const a = num(input, "a", "Coefficient a");
  const b = num(input, "b", "Right-hand side b");
  const t0 = num(input, "t0", "Initial time t0");
  const y0 = num(input, "y0", "Initial value y0");
  const t1 = num(input, "t1", "Time t1", { optional: true });
  const preset = choice(input, "preset", "Model", Object.keys(PRESETS), "none");
  const P = PRESETS[preset];
  const tU = unitOf(P.tU);
  const yU = unitOf(P.yU);

  const blocks = [];
  if (P.note) {
    blocks.push({ type: "note", text: P.note });
    blocks.push({ type: "table", caption: "Model units", head: ["Variable", "Unit"], rows: [["y", P.yU], ["t", P.tU], ["a", P.aU]] });
  }

  if (a === 0) {
    const lin = (t) => y0 + b * (t - t0);
    const steps = [
      { text: "When a = 0 the equation becomes y' = b, and no integrating factor is needed:", tex: `\\frac{dy}{dt} = ${tex(b)}` },
      { text: "Integrate directly from t0 to t:", tex: "y(t) = y_0 + \\int_{t_0}^{t} b\\,ds = y_0 + b(t - t_0)" },
      { text: "Substitute the values:", tex: `y(t) = ${tex(y0)} ${texSigned(b)}\\,${tTex(t0)}` }
    ];
    const results = [
      { label: "Solution", value: `y(t) = ${fmt(y0, 4)} ${plainSigned(b)}${tPlain(t0)}` },
      { label: "Rate of change dy/dt", value: `${fmt(b, 4)}${yU}${tU ? "/" + P.tU : ""}` },
      { label: "Steady state", value: "None (the solution is linear and grows without bound)" },
      { label: "Time constant τ", value: "Undefined (a = 0)" }
    ];
    let copy = `y(t) = ${fmt(y0, 4)} ${plainSigned(b)}${tPlain(t0)}`;
    if (t1 !== null) {
      const y1 = lin(t1);
      results.push({ label: `Value of y at t = ${fmt(t1, 4)}`, value: `${fmt(y1, 4)}${yU}`, text: `y(${fmt(t1, 4)}) = ${fmt(y1, 4)}${yU}` });
      copy = `y(${fmt(t1, 4)}) = ${fmt(y1, 4)}${yU}، ${copy}`;
    }
    blocks.push({ type: "plot", title: "Solution curve y(t)", xLabel: `t${tU}`, yLabel: `y${yU}`, includeZero: true, series: [{ name: "y(t)", points: samples(t0, 10, lin), line: true }] });
    return { results, steps, blocks, copy };
  }

  const tau = 1 / a;
  const ss = b / a;
  const C0 = y0 - ss;
  const yAt = (t) => ss + C0 * Math.exp(-a * (t - t0));
  const halfOrDouble = Math.LN2 / Math.abs(a);

  const steps = [
    { text: "Standard form of the solution:", tex: `y' ${texSigned(a)}\\,y = ${tex(b)}` },
    { text: "Integrating factor μ(t) = e^{∫a dt} = e^{at}, multiplied into both sides of the equation:", tex: `\\left(y\\,e^{${tex(a)}\\,t}\\right)' = ${tex(b)}\\,e^{${tex(a)}\\,t}` },
    { text: "Integrate both sides:", tex: `y\\,e^{at} = \\frac{b}{a}\\,e^{at} + C` },
    { text: "Divide by e^{at} to get the general solution:", tex: "y = \\frac{b}{a} + C\\,e^{-at}" },
    { text: "Apply the initial condition y(t0) = y0:", tex: `C = \\left(y_0 - \\frac{b}{a}\\right)e^{a t_0} \\quad\\Rightarrow\\quad y(t) = ${tex(ss)} ${texSigned(C0)}\\,e^{${tex(-a)}${tTex(t0)}}` },
    { text: "Time constant:", tex: `\\tau = \\frac{1}{a} = ${tex(tau)}${tU}` }
  ];
  if (a > 0) {
    steps.push({ text: "Steady state of the solution:", tex: `y_{\\infty} = \\frac{b}{a} = ${tex(ss)}${yU}` });
    steps.push({ text: "Half-difference time between y and the steady state:", tex: `t_{1/2} = \\frac{\\ln 2}{a} = ${tex(halfOrDouble)}${tU}` });
  } else {
    steps.push({ text: "Because a < 0, the solution moves away from the steady state, and the doubling time of the difference is:", tex: `t_2 = \\frac{\\ln 2}{|a|} = ${tex(halfOrDouble)}${tU}` });
  }

  const results = [
    { label: "Solution", value: `y(t) = ${fmt(ss, 4)} ${plainSigned(C0)} e^{${fmt(-a, 4)}${tPlain(t0)}}` },
    { label: "Steady state y∞ = b/a", value: a > 0 ? `${fmt(ss, 4)}${yU}` : "None (a < 0)" },
    { label: "Time constant τ = 1/a", value: `${fmt(tau, 4)}${tU}` },
    { label: a > 0 ? "Half-difference time t½" : "Doubling time of the difference", value: `${fmt(halfOrDouble, 4)}${tU}` }
  ];
  let copy = `Steady state = ${a > 0 ? `${fmt(ss, 4)}${yU}` : "none"}, τ = ${fmt(tau, 4)}${tU}`;
  if (t1 !== null) {
    const y1 = yAt(t1);
    results.push({ label: `Value of y at t = ${fmt(t1, 4)}`, value: `${fmt(y1, 4)}${yU}`, text: `y(${fmt(t1, 4)}) = ${fmt(y1, 4)}${yU}` });
    copy = `y(${fmt(t1, 4)}) = ${fmt(y1, 4)}${yU}، ${copy}`;
  }

  const plot = { type: "plot", title: "Solution curve y(t)", xLabel: `t${tU}`, yLabel: `y${yU}`, includeZero: true, series: [{ name: "y(t)", points: samples(t0, 5 / Math.abs(a), yAt), line: true }] };
  if (a > 0) plot.hlines = [{ y: ss }];
  blocks.push(plot);

  return { results, steps, blocks, copy };
}
