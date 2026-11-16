import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const DEG = Math.PI / 180;

export const meta = {
  description: "Calcula el movimiento armónico simple de un resorte (frecuencia, periodo, velocidad y aceleración máximas, energía) y de un péndulo simple (periodo y frecuencia, con periodo exacto para ángulos grandes), con la gráfica de dos ciclos.",
  keywords: ["Movimiento armónico", "Resorte", "Péndulo", "Constante del resorte", "Amplitud de oscilación", "Periodo", "Frecuencia", "simple harmonic motion", "spring", "pendulum"],
  formulas: [
    { label: "Resorte", tex: "\\omega = \\sqrt{\\frac{k}{m}},\\quad T = \\frac{2\\pi}{\\omega},\\quad v_{max} = A\\omega,\\quad a_{max} = A\\omega^2,\\quad E = \\frac{1}{2}kA^2" },
    { label: "Péndulo simple", tex: "T = 2\\pi\\sqrt{\\frac{L}{g}}\\quad (\\theta_0 \\text{ pequeña}),\\qquad T_{exact} = \\frac{T}{\\mathrm{AGM}\\left(1,\\cos\\frac{\\theta_0}{2}\\right)}" }
  ],
  inputs: [
    { id: "mode", label: "Tipo de sistema", type: "select", default: "spring", options: [["spring", "Resorte y masa"], ["pendulum", "Péndulo simple"]] },
    { id: "k", label: "Constante del resorte k", unit: "N/m", type: "number", default: "200", when: { mode: ["spring"] } },
    { id: "ms", label: "Masa m", unit: "kg", type: "number", default: "0.5", when: { mode: ["spring"] } },
    { id: "A", label: "Amplitud A", unit: "m", type: "number", default: "0.1", when: { mode: ["spring"] }, help: "Máximo desplazamiento desde la posición de equilibrio." },
    { id: "L", label: "Longitud del hilo L", unit: "m", type: "number", default: "1", when: { mode: ["pendulum"] } },
    { id: "g", label: "Gravedad g", unit: "m/s²", type: "number", default: "9.81", when: { mode: ["pendulum"] } },
    { id: "th", label: "Ángulo de amplitud θ0", unit: "°", type: "number", default: "5", when: { mode: ["pendulum"] }, help: "Se recomienda que sea menor de 15° para la precisión de la aproximación de ángulo pequeño." }
  ],
  example: {
    values: { mode: "spring", k: "200", ms: "0.5", A: "0.1", L: "1", g: "9.81", th: "5" },
    expect: ["ω = 20 rad/s", "vmax = 2 m/s"],
    note: "Ejemplo: resorte de constante 200 N/m con una masa de 0.5 kg y amplitud de 0.1 m."
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
  const k = num(input, "k", "Constante del resorte k", { positive: true });
  const m = num(input, "ms", "Masa m", { positive: true });
  const A = num(input, "A", "Amplitud A", { nonNegative: true });
  const w = Math.sqrt(k / m);
  const f = w / (2 * Math.PI);
  const T = 1 / f;
  const vmax = A * w;
  const amax = A * w * w;
  const E = 0.5 * k * A * A;
  return {
    results: [
      { label: "Frecuencia angular ω", value: `${fmt(w, 4)} rad/s` },
      { label: "Frecuencia f", value: `${fmt(f, 4)} Hz` },
      { label: "Periodo T", value: `${fmt(T, 4)} s` },
      { label: "Velocidad máxima vmax", value: `${fmt(vmax, 4)} m/s` },
      { label: "Aceleración máxima amax", value: `${fmt(amax, 4)} m/s²` },
      { label: "Energía total E", value: `${fmt(E, 4)} J` }
    ],
    steps: [
      { text: "Frecuencia angular del resorte:", tex: `\\omega = \\sqrt{\\frac{k}{m}} = \\sqrt{\\frac{${ntex(k)}}{${ntex(m)}}} = ${ntex(w, 6)}\\ rad/s` },
      { text: "Frecuencia y periodo:", tex: `f = \\frac{\\omega}{2\\pi} = ${ntex(f, 6)}\\ Hz,\\qquad T = \\frac{1}{f} = ${ntex(T, 6)}\\ s` },
      { text: "Velocidad máxima:", tex: `v_{max} = A\\omega = ${ntex(A)} \\times ${ntex(w, 6)} = ${ntex(vmax, 6)}\\ m/s` },
      { text: "Aceleración máxima:", tex: `a_{max} = A\\omega^2 = ${ntex(amax, 6)}\\ m/s^2` },
      { text: "Energía total:", tex: `E = \\frac{1}{2}kA^2 = ${ntex(E, 6)}\\ J` }
    ],
    blocks: [
      { type: "plot", title: "Desplazamiento x(t) durante dos ciclos", xLabel: "t (s)", yLabel: "x (m)", includeZero: true, series: [{ name: "x(t)", points: samples(2 * T, (t) => A * Math.cos(w * t)), line: true }] }
    ],
    copy: `ω = ${fmt(w, 4)} rad/s, f = ${fmt(f, 4)} Hz, T = ${fmt(T, 4)} s, vmax = ${fmt(vmax, 4)} m/s, amax = ${fmt(amax, 4)} m/s², E = ${fmt(E, 4)} J`
  };
}

function pendulum(input) {
  const L = num(input, "L", "Longitud del hilo L", { positive: true });
  const g = num(input, "g", "Gravedad g", { positive: true });
  const th = num(input, "th", "Ángulo de amplitud θ0", { positive: true, below: 180 });
  const T = 2 * Math.PI * Math.sqrt(L / g);
  const f = 1 / T;
  const w = 2 * Math.PI / T;
  const Tex = T / agm(1, Math.cos(th * DEG / 2));
  const blocks = [];
  if (th > 15) blocks.push({ type: "note", tone: "warn", text: "El ángulo de amplitud es mayor que 15°, por lo que la aproximación de ángulo pequeño reduce el periodo real; consulta el periodo exacto en los resultados." });
  blocks.push({ type: "plot", title: "Ángulo θ(t) durante dos ciclos (aproximación de ángulo pequeño)", xLabel: "t (s)", yLabel: "θ (°)", includeZero: true, series: [{ name: "θ(t)", points: samples(2 * T, (t) => th * Math.cos(w * t)), line: true }] });
  return {
    results: [
      { label: "Periodo con aproximación de ángulo pequeño T", value: `${fmt(T, 4)} s` },
      { label: "Periodo exacto", value: `${fmt(Tex, 4)} s` },
      { label: "Frecuencia f", value: `${fmt(f, 4)} Hz` },
      { label: "Frecuencia angular ω", value: `${fmt(w, 4)} rad/s` }
    ],
    steps: [
      { text: "Periodo con aproximación de ángulo pequeño:", tex: `T = 2\\pi\\sqrt{\\frac{L}{g}} = 2\\pi\\sqrt{\\frac{${ntex(L)}}{${ntex(g)}}} = ${ntex(T, 6)}\\ s` },
      { text: "Frecuencia y frecuencia angular:", tex: `f = \\frac{1}{T} = ${ntex(f, 6)}\\ Hz,\\qquad \\omega = \\frac{2\\pi}{T} = ${ntex(w, 6)}\\ rad/s` },
      { text: "Periodo exacto para el ángulo de amplitud:", tex: `T_{exact} = \\frac{T}{\\mathrm{AGM}\\left(1,\\cos\\frac{\\theta_0}{2}\\right)} = ${ntex(Tex, 6)}\\ s` }
    ],
    blocks,
    copy: `T = ${fmt(T, 4)} s, T_exact = ${fmt(Tex, 4)} s, f = ${fmt(f, 4)} Hz, ω = ${fmt(w, 4)} rad/s`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Tipo de sistema", ["spring", "pendulum"], "spring");
  return mode === "pendulum" ? pendulum(input) : spring(input);
}
