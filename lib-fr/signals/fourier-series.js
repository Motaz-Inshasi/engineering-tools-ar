import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, eng, tex as ntex } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

const WAVES = [["square", "Onde carrée"], ["triangle", "Onde triangulaire"], ["sawtooth", "Onde en dents de scie"], ["halfwave", "Sinusoïde redressée, demi-onde"], ["fullwave", "Sinusoïde redressée, onde complète"], ["pulse", "Train d'impulsions rectangulaires"]];

export const meta = {
  description: "Série de Fourier pour les ondes de base : carrée, triangulaire, en dents de scie, redressées et impulsions, avec un tableau des coefficients, le spectre des harmoniques, la valeur efficace (Parseval) et un tracé comparant l'onde à la somme partielle.",
  keywords: ["Fourier", "série de Fourier", "fourier series", "harmoniques", "harmonics", "Onde carrée", "spectre", "Parseval"],
  formulas: [
    { label: "Forme trigonométrique de la série de Fourier", tex: "x(t) = a_0 + \\sum_{n=1}^{\\infty}\\left[a_n\\cos(n\\omega_0 t) + b_n\\sin(n\\omega_0 t)\\right],\\quad \\omega_0 = \\frac{2\\pi}{T}" },
    { label: "Coefficients et théorème de Parseval", tex: "a_n = \\frac{2}{T}\\int_T x\\cos(n\\omega_0 t)dt,\\; b_n = \\frac{2}{T}\\int_T x\\sin(n\\omega_0 t)dt,\\; X_{rms}^2 = a_0^2 + \\sum\\frac{a_n^2+b_n^2}{2}" }
  ],
  inputs: [
    { id: "wave", label: "Forme de l'onde", type: "select", default: "square", options: WAVES },
    { id: "A", label: "Amplitude A", type: "number", default: "1" },
    { id: "f", label: "Fréquence fondamentale f", unit: "Hz", type: "number", default: "50" },
    { id: "d", label: "Rapport cyclique d", type: "number", default: "0.25", when: { wave: ["pulse"] }, help: "Rapport entre la durée de l'impulsion et la période, entre 0 et 1." },
    { id: "N", label: "Nombre d'harmoniques N", type: "number", default: "9", help: "De 1 à 50" }
  ],
  example: { values: { wave: "square", A: "1", f: "50", N: "7" }, expect: ["b1 = 1.27324", "b3 = 0.424413"], note: "Exemple : onde carrée d'amplitude 1 : $b_n = \\frac{4A}{n\\pi}$ pour les harmoniques impairs uniquement." },
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
  square: "L'onde est impaire (x(−t) = −x(t)) : tous les coefficients en cosinus sont nuls, et les harmoniques pairs disparaissent à cause de la symétrie de demi-onde.",
  triangle: "L'onde est paire : tous les coefficients en sinus sont nuls, et la symétrie de demi-onde annule les harmoniques pairs.",
  sawtooth: "L'onde est impaire : tous les coefficients en cosinus sont nuls, et tous les harmoniques apparaissent.",
  halfwave: "L'onde n'est ni paire ni impaire : il apparaît un terme constant, un terme sinusoïdal fondamental et des harmoniques en cosinus d'ordre pair.",
  fullwave: "L'onde est paire de période T : il n'apparaît que des coefficients en cosinus, avec un grand terme constant.",
  pulse: "L'impulsion est centrée sur zéro, elle est donc paire, et ses coefficients suivent une fonction sinc."
};

const LABEL = Object.fromEntries(WAVES);

export function solve(input) {
  const w = choice(input, "wave", "Forme de l'onde", WAVES.map((x) => x[0]), "square");
  const A = num(input, "A", "Amplitude", { positive: true });
  const f = num(input, "f", "Fréquence", { positive: true });
  const N = num(input, "N", "Nombre d'harmoniques", { integer: true, min: 1, max: 50 });
  const d = w === "pulse" ? num(input, "d", "Rapport cyclique", { positive: true, below: 1 }) : 0.5;
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
    `Période $T = 1/f = ${ntex(T, 6)}$ s et pulsation $\\omega_0 = 2\\pi f = ${ntex(w0, 6)}$ rad/s.`,
    SYM[w],
    { text: `En intégrant les coefficients sur une période, on obtient (puis en remplaçant $A = ${ntex(A)}$${w === "pulse" ? ` et $d = ${ntex(d)}$` : ""}, et les valeurs du tableau) :`, tex: FORM[w] },
    { text: "Terme constant (valeur moyenne) :", tex: `a_0 = ${ntex(c0, 8)}` },
    `Valeur efficace exacte de l'onde ${fmt(rmsExact, 8)}. D'après Parseval, les ${N} premiers ${fmt(Math.sqrt(power), 8)} portent ${fmt((100 * power) / (rmsExact * rmsExact), 5)}% de la puissance, donc la somme partielle en porte autant.`
  ];
  return {
    results: [
      { label: "Onde", value: LABEL[w] },
      { label: "Terme constant $a_0$", value: c0, sig: 8 },
      { label: "Coefficients non nuls", value: text.slice(0, 8).join("، ") + (text.length > 8 ? "، …" : "") },
      { label: "Valeur efficace exacte", value: rmsExact, sig: 8 },
      { label: `Part de puissance des ${N} premiers harmoniques`, value: (100 * power) / (rmsExact * rmsExact), unit: "%", sig: 5 }
    ],
    blocks: [
      { type: "table", caption: "Coefficients de Fourier", head: ["n", "Fréquence", "aₙ", "bₙ", "Amplitude √(aₙ²+bₙ²)"], rows },
      { type: "plot", title: `Onde d'origine et somme partielle des ${N} premiers harmoniques`, xLabel: "t (s)", yLabel: "x(t)", series: [{ name: "Onde", points: sampleFunction(x, -T, T, 801) }, { name: `Somme de ${N} harmoniques`, points: sampleFunction(partial, -T, T, 801), dashed: true }] },
      { type: "plot", title: "Spectre d'amplitude", xLabel: "n", yLabel: "|cₙ|", includeZero: true, series: [{ name: "Amplitude", points: spectrum, marker: "o" }] }
    ],
    steps,
    copy: [`a0 = ${fmt(c0, 6)}`, ...text].join("\n")
  };
}
