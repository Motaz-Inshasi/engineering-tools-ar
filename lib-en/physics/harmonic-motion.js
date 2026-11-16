import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const DEG = Math.PI / 180;

export const meta = {
  description: "Computes simple harmonic motion of a spring (frequency, period, maximum velocity and acceleration, and energy) and of a simple pendulum (period and frequency, with the exact period for large angles), with a plot of the displacement or angle over two cycles.",
  keywords: ["Simple harmonic motion", "spring", "pendulum", "spring constant", "amplitude", "period", "frequency", "simple harmonic motion", "spring", "pendulum"],
  formulas: [
    { label: "Spring", tex: "\\omega = \\sqrt{\\frac{k}{m}},\\quad T = \\frac{2\\pi}{\\omega},\\quad v_{max} = A\\omega,\\quad a_{max} = A\\omega^2,\\quad E = \\frac{1}{2}kA^2" },
    { label: "Simple pendulum", tex: "T = 2\\pi\\sqrt{\\frac{L}{g}}\\quad (\\theta_0 \\text{ small}),\\qquad T_{exact} = \\frac{T}{\\mathrm{AGM}\\left(1,\\cos\\frac{\\theta_0}{2}\\right)}" }
  ],
  inputs: [
    { id: "mode", label: "System type", type: "select", default: "spring", options: [["spring", "Spring and mass"], ["pendulum", "Simple pendulum"]] },
    { id: "k", label: "Spring constant k", unit: "N/m", type: "number", default: "200", when: { mode: ["spring"] } },
    { id: "ms", label: "Mass m", unit: "kg", type: "number", default: "0.5", when: { mode: ["spring"] } },
    { id: "A", label: "Amplitude A", unit: "m", type: "number", default: "0.1", when: { mode: ["spring"] }, help: "Maximum displacement from the equilibrium position." },
    { id: "L", label: "String length L", unit: "m", type: "number", default: "1", when: { mode: ["pendulum"] } },
    { id: "g", label: "Gravitational acceleration g", unit: "m/s²", type: "number", default: "9.81", when: { mode: ["pendulum"] } },
    { id: "th", label: "Amplitude angle θ0", unit: "°", type: "number", default: "5", when: { mode: ["pendulum"] }, help: "Preferably less than 15° for the accuracy of the small-angle approximation." }
  ],
  example: {
    values: { mode: "spring", k: "200", ms: "0.5", A: "0.1", L: "1", g: "9.81", th: "5" },
    expect: ["ω = 20 rad/s", "vmax = 2 m/s"],
    note: "Example: a spring with constant 200 N/m carrying a 0.5 kg mass, with amplitude 0.1 m."
  },
  invalid: { values: { mode: "spring", k: "0", ms: "0.5", A: "0.1", L: "1", g: "9.81", th: "5" } },
  related: ["waves-doppler", "work-energy", "kinematics", "formulas-constants"]
};

function agm(a, b) {
  let x = a, y = b;
  for (let i = 0; i < 100 && Math.abs(x - y) > 1e-15 * x; i++) {
    const nx = (x + y) / 2;
    y = Math.sqrt(x * y);
    x = nx;
  }
  return x;
}

function samples(span, fn) {
  const N = 240;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = span * i / N;
    pts.push([t, fn(t)]);
  }
  return pts;
}

function spring(input) {
  const k = num(input, "k", "Spring constant k", { positive: true });
  const m = num(input, "ms", "Mass m", { positive: true });
  const A = num(input, "A", "Amplitude A", { nonNegative: true });
  const w = Math.sqrt(k / m);
  const f = w / (2 * Math.PI);
  const T = 1 / f;
  const vmax = A * w;
  const amax = A * w * w;
  const E = 0.5 * k * A * A;
  return {
    results: [
      { label: "Angular frequency ω", value: `${fmt(w, 4)} rad/s` },
      { label: "Frequency f", value: `${fmt(f, 4)} Hz` },
      { label: "Period T", value: `${fmt(T, 4)} s` },
      { label: "Maximum velocity vmax", value: `${fmt(vmax, 4)} m/s` },
      { label: "Maximum acceleration amax", value: `${fmt(amax, 4)} m/s²` },
      { label: "Total energy E", value: `${fmt(E, 4)} J` }
    ],
    steps: [
      { text: "Angular frequency of the spring:", tex: `\\omega = \\sqrt{\\frac{k}{m}} = \\sqrt{\\frac{${ntex(k)}}{${ntex(m)}}} = ${ntex(w, 6)}\\ rad/s` },
      { text: "Frequency and period:", tex: `f = \\frac{\\omega}{2\\pi} = ${ntex(f, 6)}\\ Hz,\\qquad T = \\frac{1}{f} = ${ntex(T, 6)}\\ s` },
      { text: "Maximum velocity:", tex: `v_{max} = A\\omega = ${ntex(A)} \\times ${ntex(w, 6)} = ${ntex(vmax, 6)}\\ m/s` },
      { text: "Maximum acceleration:", tex: `a_{max} = A\\omega^2 = ${ntex(amax, 6)}\\ m/s^2` },
      { text: "Total energy:", tex: `E = \\frac{1}{2}kA^2 = ${ntex(E, 6)}\\ J` }
    ],
    blocks: [
      { type: "plot", title: "Displacement x(t) over two cycles", xLabel: "t (s)", yLabel: "x (m)", includeZero: true, series: [{ name: "x(t)", points: samples(2 * T, (t) => A * Math.cos(w * t)), line: true }] }
    ],
    copy: `ω = ${fmt(w, 4)} rad/s, f = ${fmt(f, 4)} Hz, T = ${fmt(T, 4)} s, vmax = ${fmt(vmax, 4)} m/s, amax = ${fmt(amax, 4)} m/s², E = ${fmt(E, 4)} J`
  };
}

function pendulum(input) {
  const L = num(input, "L", "String length L", { positive: true });
  const g = num(input, "g", "Gravitational acceleration g", { positive: true });
  const th = num(input, "th", "Amplitude angle θ0", { positive: true, below: 180 });
  const T = 2 * Math.PI * Math.sqrt(L / g);
  const f = 1 / T;
  const w = 2 * Math.PI / T;
  const Tex = T / agm(1, Math.cos(th * DEG / 2));
  const blocks = [];
  if (th > 15) blocks.push({ type: "note", tone: "warn", text: "The amplitude angle is greater than 15°, so the small-angle approximation gives a period smaller than the true one; see the exact period in the results." });
  blocks.push({ type: "plot", title: "Angle θ(t) over two cycles (small-angle approximation)", xLabel: "t (s)", yLabel: "θ (°)", includeZero: true, series: [{ name: "θ(t)", points: samples(2 * T, (t) => th * Math.cos(w * t)), line: true }] });
  return {
    results: [
      { label: "Period with small-angle approximation T", value: `${fmt(T, 4)} s` },
      { label: "Exact period", value: `${fmt(Tex, 4)} s` },
      { label: "Frequency f", value: `${fmt(f, 4)} Hz` },
      { label: "Angular frequency ω", value: `${fmt(w, 4)} rad/s` }
    ],
    steps: [
      { text: "Period with small-angle approximation:", tex: `T = 2\\pi\\sqrt{\\frac{L}{g}} = 2\\pi\\sqrt{\\frac{${ntex(L)}}{${ntex(g)}}} = ${ntex(T, 6)}\\ s` },
      { text: "Frequency and angular frequency:", tex: `f = \\frac{1}{T} = ${ntex(f, 6)}\\ Hz,\\qquad \\omega = \\frac{2\\pi}{T} = ${ntex(w, 6)}\\ rad/s` },
      { text: "Exact period for the amplitude angle:", tex: `T_{exact} = \\frac{T}{\\mathrm{AGM}\\left(1,\\cos\\frac{\\theta_0}{2}\\right)} = ${ntex(Tex, 6)}\\ s` }
    ],
    blocks,
    copy: `T = ${fmt(T, 4)} s, T_exact = ${fmt(Tex, 4)} s, f = ${fmt(f, 4)} Hz, ω = ${fmt(w, 4)} rad/s`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "System type", ["spring", "pendulum"], "spring");
  return mode === "pendulum" ? pendulum(input) : spring(input);
}
