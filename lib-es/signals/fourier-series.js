import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, eng, tex as ntex } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

const WAVES = [["square", "Onda cuadrada"], ["triangle", "Onda triangular"], ["sawtooth", "Onda de diente de sierra"], ["halfwave", "Seno rectificado de media onda"], ["fullwave", "Seno rectificado de onda completa"], ["pulse", "Tren de pulsos rectangulares"]];

export const meta = {
  description: "Serie de Fourier de las ondas básicas: cuadrada, triangular, diente de sierra, rectificadas y de pulsos, con tabla de coeficientes, espectro de armónicos, valor eficaz (Parseval) y gráfica que compara la onda con la suma parcial.",
  keywords: ["Fourier", "Serie de Fourier", "fourier series", "armónicos", "harmonics", "Onda cuadrada", "espectro", "Parseval"],
  formulas: [
    { label: "Forma trigonométrica de la serie de Fourier", tex: "x(t) = a_0 + \\sum_{n=1}^{\\infty}\\left[a_n\\cos(n\\omega_0 t) + b_n\\sin(n\\omega_0 t)\\right],\\quad \\omega_0 = \\frac{2\\pi}{T}" },
    { label: "Coeficientes y teorema de Parseval", tex: "a_n = \\frac{2}{T}\\int_T x\\cos(n\\omega_0 t)dt,\\; b_n = \\frac{2}{T}\\int_T x\\sin(n\\omega_0 t)dt,\\; X_{rms}^2 = a_0^2 + \\sum\\frac{a_n^2+b_n^2}{2}" }
  ],
  inputs: [
    { id: "wave", label: "Forma de la onda", type: "select", default: "square", options: WAVES },
    { id: "A", label: "Amplitud A", type: "number", default: "1" },
    { id: "f", label: "Frecuencia fundamental f", unit: "Hz", type: "number", default: "50" },
    { id: "d", label: "Ciclo de trabajo d", type: "number", default: "0.25", when: { wave: ["pulse"] }, help: "Razón entre el tiempo del pulso y el periodo, entre 0 y 1." },
    { id: "N", label: "Número de armónicos N", type: "number", default: "9", help: "De 1 a 50" }
  ],
  example: { values: { wave: "square", A: "1", f: "50", N: "7" }, expect: ["b1 = 1.27324", "b3 = 0.424413"], note: "Ejemplo: onda cuadrada de amplitud 1: $b_n = \\frac{4A}{n\\pi}$ solo para los armónicos impares." },
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
  square: "La onda es impar (x(−t) = −x(t)), así que todos los coeficientes de coseno son cero, y los armónicos pares desaparecen por la simetría de media onda.",
  triangle: "La onda es par, así que todos los coeficientes de seno son cero, y la simetría de media onda anula los armónicos pares.",
  sawtooth: "La onda es impar, así que todos los coeficientes de coseno son cero, y aparecen todos los armónicos.",
  halfwave: "La onda no es par ni impar, por lo que aparecen un término constante, un término de seno fundamental y armónicos de coseno de orden par.",
  fullwave: "La onda es par con periodo T, así que solo aparecen coeficientes de coseno, junto con un gran término constante.",
  pulse: "El pulso está centrado en cero, así que es par, y sus coeficientes siguen una función sinc."
};

const LABEL = Object.fromEntries(WAVES);

export function solve(input) {
  const w = choice(input, "wave", "Forma de la onda", WAVES.map((x) => x[0]), "square");
  const A = num(input, "A", "Amplitud", { positive: true });
  const f = num(input, "f", "Frecuencia", { positive: true });
  const N = num(input, "N", "Número de armónicos", { integer: true, min: 1, max: 50 });
  const d = w === "pulse" ? num(input, "d", "Ciclo de trabajo", { positive: true, below: 1 }) : 0.5;
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
    `El periodo $T = 1/f = ${ntex(T, 6)}$ s y la frecuencia angular $\\omega_0 = 2\\pi f = ${ntex(w0, 6)}$ rad/s.`,
    SYM[w],
    { text: `Al integrar los coeficientes en un periodo se obtiene (luego sustituyendo $A = ${ntex(A)}$${w === "pulse" ? ` y $d = ${ntex(d)}$` : ""}, y los valores de la tabla):`, tex: FORM[w] },
    { text: "Término constante (valor medio):", tex: `a_0 = ${ntex(c0, 8)}` },
    `Valor eficaz exacto de la onda ${fmt(rmsExact, 8)}. Por Parseval, los primeros ${N} ${fmt(Math.sqrt(power), 8)} concentran el ${fmt((100 * power) / (rmsExact * rmsExact), 5)}% de la potencia, así que la suma parcial contiene esa proporción.`
  ];
  return {
    results: [
      { label: "Onda", value: LABEL[w] },
      { label: "Término constante $a_0$", value: c0, sig: 8 },
      { label: "Coeficientes no nulos", value: text.slice(0, 8).join("، ") + (text.length > 8 ? "، …" : "") },
      { label: "Valor eficaz exacto", value: rmsExact, sig: 8 },
      { label: `Porcentaje de potencia en los primeros ${N} armónicos`, value: (100 * power) / (rmsExact * rmsExact), unit: "%", sig: 5 }
    ],
    blocks: [
      { type: "table", caption: "Coeficientes de Fourier", head: ["n", "Frecuencia", "aₙ", "bₙ", "Amplitud √(aₙ²+bₙ²)"], rows },
      { type: "plot", title: `Onda original y suma parcial de los primeros ${N} armónicos`, xLabel: "t (s)", yLabel: "x(t)", series: [{ name: "Onda", points: sampleFunction(x, -T, T, 801) }, { name: `Suma de ${N} armónicos`, points: sampleFunction(partial, -T, T, 801), dashed: true }] },
      { type: "plot", title: "Espectro de amplitudes", xLabel: "n", yLabel: "|cₙ|", includeZero: true, series: [{ name: "Amplitud", points: spectrum, marker: "o" }] }
    ],
    steps,
    copy: [`a0 = ${fmt(c0, 6)}`, ...text].join("\n")
  };
}
