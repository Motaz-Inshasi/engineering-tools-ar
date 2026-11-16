import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, eng, tex as ntex } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

const WAVES = [["square", "Square wave"], ["triangle", "Triangular wave"], ["sawtooth", "Sawtooth wave"], ["halfwave", "Half-wave rectified sine"], ["fullwave", "Full-wave rectified sine"], ["pulse", "Rectangular pulse train"]];

export const meta = {
  description: "Fourier series for the basic waves: square, triangular, sawtooth, rectified and pulse waves, with a table of coefficients, the harmonic spectrum, the RMS value (Parseval) and a plot comparing the wave with the partial sum.",
  keywords: ["Fourier", "Fourier series", "fourier series", "harmonics", "harmonics", "Square wave", "spectrum", "Parseval"],
  formulas: [
    { label: "Trigonometric form of the Fourier series", tex: "x(t) = a_0 + \\sum_{n=1}^{\\infty}\\left[a_n\\cos(n\\omega_0 t) + b_n\\sin(n\\omega_0 t)\\right],\\quad \\omega_0 = \\frac{2\\pi}{T}" },
    { label: "Coefficients and Parseval's theorem", tex: "a_n = \\frac{2}{T}\\int_T x\\cos(n\\omega_0 t)dt,\\; b_n = \\frac{2}{T}\\int_T x\\sin(n\\omega_0 t)dt,\\; X_{rms}^2 = a_0^2 + \\sum\\frac{a_n^2+b_n^2}{2}" }
  ],
  inputs: [
    { id: "wave", label: "Wave shape", type: "select", default: "square", options: WAVES },
    { id: "A", label: "Amplitude A", type: "number", default: "1" },
    { id: "f", label: "Fundamental frequency f", unit: "Hz", type: "number", default: "50" },
    { id: "d", label: "Duty cycle d", type: "number", default: "0.25", when: { wave: ["pulse"] }, help: "Ratio of pulse time to period, between 0 and 1." },
    { id: "N", label: "Number of harmonics N", type: "number", default: "9", help: "From 1 to 50" }
  ],
  example: { values: { wave: "square", A: "1", f: "50", N: "7" }, expect: ["b1 = 1.27324", "b3 = 0.424413"], note: "Example: square wave with amplitude 1: $b_n = \\frac{4A}{n\\pi}$ for odd harmonics only." },
  invalid: { values: { wave: "pulse", A: "1", f: "50", d: "1.5", N: "5" } },
  related: ["sampling-nyquist", "laplace", "passive-filter", "rectifier-ripple"]
};

const RMS = { square: (A) => A, triangle: (A) => A / Math.sqrt(3), sawtooth: (A) => A / Math.sqrt(3), halfwave: (A) => A / 2, fullwave: (A) => A / Math.SQRT2, pulse: (A, d) => A * Math.sqrt(d) };

export function waveform(w, A, T, d = 0.5) {
  return (t) => {
    let u = ((t / T) % 1 + 1) % 1;
    if (u >= 0.5) u -= 1;
    switch (w) {
      case "square": return u === 0 || u === -0.5 ? 0 : u > 0 ? A : -A;
      case "triangle": return A * (1 - 4 * Math.abs(u));
      case "sawtooth": return u === -0.5 ? 0 : 2 * A * u;
      case "halfwave": return u >= 0 ? A * Math.sin(2 * Math.PI * u) : 0;
      case "fullwave": return A * Math.abs(Math.sin(Math.PI * u));
      case "pulse": return Math.abs(u) < d / 2 ? A : Math.abs(u) === d / 2 ? A / 2 : 0;
    }
    return NaN;
  };
}

export function coefficients(w, A, n, d = 0.5) {
  const pi = Math.PI;
  if (n === 0) {
    return { a: { square: 0, triangle: 0, sawtooth: 0, halfwave: A / pi, fullwave: (2 * A) / pi, pulse: A * d }[w], b: 0 };
  }
  switch (w) {
    case "square": return { a: 0, b: n % 2 ? (4 * A) / (n * pi) : 0 };
    case "triangle": return { a: n % 2 ? (8 * A) / (pi * pi * n * n) : 0, b: 0 };
    case "sawtooth": return { a: 0, b: (2 * A * (n % 2 ? 1 : -1)) / (n * pi) };
    case "halfwave":
      if (n === 1) return { a: 0, b: A / 2 };
      return { a: n % 2 ? 0 : (-2 * A) / (pi * (n * n - 1)), b: 0 };
    case "fullwave": return { a: (-4 * A) / (pi * (4 * n * n - 1)), b: 0 };
    case "pulse": return { a: (2 * A * Math.sin(n * pi * d)) / (n * pi), b: 0 };
  }
  return { a: NaN, b: NaN };
}

const FORM = {
  square: "a_n = 0,\\quad b_n = \\frac{4A}{n\\pi}\\;(n\\text{ odd}),\\quad b_n = 0\\;(n\\text{ even})",
  triangle: "b_n = 0,\\quad a_n = \\frac{8A}{\\pi^2 n^2}\\;(n\\text{ odd})",
  sawtooth: "a_n = 0,\\quad b_n = \\frac{2A(-1)^{n+1}}{n\\pi}",
  halfwave: "a_0 = \\frac{A}{\\pi},\\; b_1 = \\frac{A}{2},\\; a_n = \\frac{-2A}{\\pi(n^2-1)}\\;(n\\text{ even})",
  fullwave: "a_0 = \\frac{2A}{\\pi},\\quad a_n = \\frac{-4A}{\\pi(4n^2-1)}",
  pulse: "a_0 = Ad,\\quad a_n = \\frac{2A\\sin(n\\pi d)}{n\\pi}"
};

const SYM = {
  square: "The wave is odd (x(−t) = −x(t)), so all cosine coefficients are zero, and the even harmonics vanish due to half-wave symmetry.",
  triangle: "The wave is even, so all sine coefficients are zero, and half-wave symmetry cancels the even harmonics.",
  sawtooth: "The wave is odd, so all cosine coefficients are zero, and all harmonics appear.",
  halfwave: "The wave is neither even nor odd, so a constant term, a fundamental sine term and even-order cosine harmonics appear.",
  fullwave: "The wave is even with period T, so only cosine coefficients appear, together with a large constant term.",
  pulse: "The pulse is centered at zero, so it is even, and its coefficients follow a sinc function."
};

const LABEL = Object.fromEntries(WAVES);

export function solve(input) {
  const w = choice(input, "wave", "Wave shape", WAVES.map((x) => x[0]), "square");
  const A = num(input, "A", "Amplitude", { positive: true });
  const f = num(input, "f", "Frequency", { positive: true });
  const N = num(input, "N", "Number of harmonics", { integer: true, min: 1, max: 50 });
  const d = w === "pulse" ? num(input, "d", "Duty cycle", { positive: true, below: 1 }) : 0.5;
  const T = 1 / f, w0 = 2 * Math.PI * f;
  const c0 = coefficients(w, A, 0, d).a;
  const rows = [], text = [];
  let power = c0 * c0;
  const cs = [];
  for (let n = 1; n <= N; n++) {
    const { a, b } = coefficients(w, A, n, d);
    const an = Math.abs(a) < 1e-15 ? 0 : a, bn = Math.abs(b) < 1e-15 ? 0 : b;
    cs.push({ n, a: an, b: bn });
    const mag = Math.hypot(an, bn);
    power += (an * an + bn * bn) / 2;
    rows.push([String(n), eng(n * f, "Hz"), fmt(an, 6), fmt(bn, 6), fmt(mag, 6)]);
    if (an) text.push(`a${n} = ${fmt(an, 6)}`);
    if (bn) text.push(`b${n} = ${fmt(bn, 6)}`);
  }
  const rmsExact = RMS[w](A, d);
  const partial = (t) => c0 + cs.reduce((s, { n, a, b }) => s + a * Math.cos(n * w0 * t) + b * Math.sin(n * w0 * t), 0);
  const x = waveform(w, A, T, d);
  const spectrum = cs.filter((c) => Math.hypot(c.a, c.b) > 0).map((c) => [c.n, Math.hypot(c.a, c.b)]);
  const steps = [
    `Period $T = 1/f = ${ntex(T, 6)}$ s and angular frequency $\\omega_0 = 2\\pi f = ${ntex(w0, 6)}$ rad/s.`,
    SYM[w],
    { text: `Integrating the coefficients over one period gives (then substituting $A = ${ntex(A)}$${w === "pulse" ? ` and $d = ${ntex(d)}$` : ""}, and the values from the table):`, tex: FORM[w] },
    { text: "Constant term (average value):", tex: `a_0 = ${ntex(c0, 8)}` },
    `Exact RMS value of the ${fmt(rmsExact, 8)} wave. By Parseval, the first ${N} ${fmt(Math.sqrt(power), 8)} hold ${fmt((100 * power) / (rmsExact * rmsExact), 5)}% of the power, so the partial sum carries that share.`
  ];
  return {
    results: [
      { label: "Wave", value: LABEL[w] },
      { label: "Constant term $a_0$", value: c0, sig: 8 },
      { label: "Non-zero coefficients", value: text.slice(0, 8).join("، ") + (text.length > 8 ? "، …" : "") },
      { label: "Exact RMS value", value: rmsExact, sig: 8 },
      { label: `Power share in the first ${N} harmonics`, value: (100 * power) / (rmsExact * rmsExact), unit: "%", sig: 5 }
    ],
    blocks: [
      { type: "table", caption: "Fourier coefficients", head: ["n", "Frequency", "aₙ", "bₙ", "Amplitude √(aₙ²+bₙ²)"], rows },
      { type: "plot", title: `Original wave and partial sum of the first ${N} harmonics`, xLabel: "t (s)", yLabel: "x(t)", series: [{ name: "Wave", points: sampleFunction(x, -T, T, 801) }, { name: `Sum of ${N} harmonics`, points: sampleFunction(partial, -T, T, 801), dashed: true }] },
      { type: "plot", title: "Amplitude spectrum", xLabel: "n", yLabel: "|cₙ|", includeZero: true, series: [{ name: "Amplitude", points: spectrum, marker: "o" }] }
    ],
    steps,
    copy: [`a0 = ${fmt(c0, 6)}`, ...text].join("\n")
  };
}
