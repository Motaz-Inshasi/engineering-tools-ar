import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const R = 8.314;
const MODES = ["integrated", "arrhenius", "activation"];

export const meta = {
  description: "Analiza la velocidad de reacción: calcula [A]t y el tiempo de vida media para orden 0, 1 o 2 con gráfica, la constante a otra temperatura con Arrhenius, o la energía de activación a partir de dos constantes y temperaturas.",
  keywords: ["Cinética química", "Velocidad de reacción", "Orden de reacción", "Vida media", "half-life", "Constante de velocidad", "Arrhenius", "Arrhenius", "Energía de activación", "Ea", "kinetics"],
  formulas: [
    { label: "Orden cero", tex: "[A]_t = [A]_0 - kt,\\qquad t_{1/2} = \\frac{[A]_0}{2k}" },
    { label: "Primer orden", tex: "[A]_t = [A]_0 e^{-kt},\\qquad t_{1/2} = \\frac{\\ln 2}{k}" },
    { label: "Segundo orden", tex: "\\frac{1}{[A]_t} = \\frac{1}{[A]_0} + kt,\\qquad t_{1/2} = \\frac{1}{k[A]_0}" },
    { label: "Arrhenius", tex: "\\ln\\frac{k_2}{k_1} = -\\frac{E_a}{R}\\left(\\frac{1}{T_2} - \\frac{1}{T_1}\\right)" }
  ],
  inputs: [
    { id: "mode", label: "Tipo de cálculo", type: "select", default: "integrated", options: [["integrated", "Concentración de [A] con el tiempo"], ["arrhenius", "Cálculo de k2 a partir de la energía de activación"], ["activation", "Cálculo de la energía de activación a partir de k1 y k2"]] },
    { id: "order", label: "Orden de reacción", type: "select", default: "1", options: [["0", "Orden 0"], ["1", "Orden 1"], ["2", "Orden 2"]], when: { mode: ["integrated"] } },
    { id: "k", label: "Constante de velocidad k", type: "number", default: "0.1", when: { mode: ["integrated"] }, help: "Su unidad debe corresponder al orden y a la unidad de tiempo t." },
    { id: "A0", label: "Concentración inicial [A]0", type: "number", default: "1", when: { mode: ["integrated"] } },
    { id: "t", label: "Tiempo t", type: "number", default: "10", when: { mode: ["integrated"] } },
    { id: "k1", label: "Constante de velocidad inicial k1", type: "number", default: "1", when: { mode: ["arrhenius", "activation"] } },
    { id: "T1", label: "Temperatura inicial T1", unit: "K", type: "number", default: "300", when: { mode: ["arrhenius", "activation"] } },
    { id: "T2", label: "Temperatura final T2", unit: "K", type: "number", default: "310", when: { mode: ["arrhenius", "activation"] } },
    { id: "Ea", label: "Energía de activación Ea", unit: "kJ/mol", type: "number", default: "50", when: { mode: ["arrhenius"] } },
    { id: "k2", label: "Constante de velocidad k2", type: "number", default: "2", when: { mode: ["activation"] } }
  ],
  example: { values: { mode: "integrated", order: "1", k: "0.1", A0: "1", t: "10", k1: "", T1: "", T2: "", Ea: "", k2: "" }, expect: ["0.3679", "6.931"], note: "Ejemplo: reacción de primer orden con k = 0.1 y concentración inicial 1 después de 10 unidades de tiempo." },
  invalid: { values: { mode: "integrated", order: "1", k: "0", A0: "1", t: "10", k1: "", T1: "", T2: "", Ea: "", k2: "" } },
  related: ["solutions", "ph-calculator", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function conc(order, A0, k, t) {
  if (order === 0) return Math.max(0, A0 - k * t);
  if (order === 1) return A0 * Math.exp(-k * t);
  return 1 / (1 / A0 + k * t);
}

function halfLife(order, A0, k) {
  if (order === 0) return A0 / (2 * k);
  if (order === 1) return Math.LN2 / k;
  return 1 / (k * A0);
}

function integrated(input) {
  const order = Number(choice(input, "order", "Orden", ["0", "1", "2"], "1"));
  const k = num(input, "k", "Constante de velocidad k", { positive: true });
  const A0 = num(input, "A0", "Concentración inicial [A]0", { positive: true });
  const t = num(input, "t", "Tiempo t", { nonNegative: true });
  const At = conc(order, A0, k, t);
  const half = halfLife(order, A0, k);
  const results = [
    { label: "Concentración restante [A]t", value: fmt(At, 4) },
    { label: "Tiempo de vida media t½", value: fmt(half, 4) }
  ];
  const steps = [];
  if (order === 0) {
    const raw = A0 - k * t;
    steps.push({ text: "Ley integrada de orden cero:", tex: `[A]_t = [A]_0 - kt = ${ntex(A0)} - ${ntex(k)} \\times ${ntex(t)} = ${ntex(raw, 6)}` });
    if (raw <= 0) {
      const tFull = A0 / k;
      results.push({ label: "Tiempo de consumo total t = [A]0/k", value: fmt(tFull, 4) });
      steps.push({ text: "El reactivo se consumió por completo antes del tiempo t, así que la concentración restante es cero:", tex: `t_{full} = \\frac{[A]_0}{k} = ${ntex(tFull, 6)}` });
    }
    steps.push({ text: "Vida media de orden cero:", tex: `t_{1/2} = \\frac{[A]_0}{2k} = ${ntex(half, 6)}` });
  } else if (order === 1) {
    steps.push({ text: "Ley integrada de primer orden:", tex: `[A]_t = [A]_0 e^{-kt} = ${ntex(A0)} e^{-${ntex(k)} \\times ${ntex(t)}} = ${ntex(At, 6)}` });
    steps.push({ text: "Vida media de primer orden:", tex: `t_{1/2} = \\frac{\\ln 2}{k} = \\frac{0.693147}{${ntex(k)}} = ${ntex(half, 6)}` });
  } else {
    steps.push({ text: "Ley integrada de segundo orden:", tex: `\\frac{1}{[A]_t} = \\frac{1}{${ntex(A0)}} + ${ntex(k)} \\times ${ntex(t)},\\qquad [A]_t = ${ntex(At, 6)}` });
    steps.push({ text: "Vida media de segundo orden:", tex: `t_{1/2} = \\frac{1}{k[A]_0} = ${ntex(half, 6)}` });
  }
  const tMax = Math.max(t, 3 * half);
  const N = 60;
  const points = [];
  for (let i = 0; i <= N; i++) {
    const x = (tMax * i) / N;
    points.push([x, conc(order, A0, k, x)]);
  }
  const blocks = [{ type: "plot", title: `Variación de [A] con el tiempo (orden ${order})`, xLabel: "t", yLabel: "[A]", series: [{ name: "[A]", points, line: true }], vlines: [{ x: t }], includeZero: true }];
  return {
    results, steps, blocks,
    copy: `[A]t = ${fmt(At, 4)}، t½ = ${fmt(half, 4)}`
  };
}

function arrhenius(input) {
  const k1 = num(input, "k1", "Constante de velocidad inicial k1", { positive: true });
  const T1 = num(input, "T1", "Temperatura inicial T1", { positive: true });
  const T2 = num(input, "T2", "Temperatura final T2", { positive: true });
  const Ea = num(input, "Ea", "Energía de activación Ea", { nonNegative: true });
  const lnRatio = (-Ea * 1000 / R) * (1 / T2 - 1 / T1);
  const k2 = k1 * Math.exp(lnRatio);
  return {
    results: [{ label: "Constante de velocidad k2", value: fmt(k2, 4) }],
    steps: [
      { text: "Ecuación de Arrhenius entre dos temperaturas:", tex: "\\ln\\frac{k_2}{k_1} = -\\frac{E_a}{R}\\left(\\frac{1}{T_2} - \\frac{1}{T_1}\\right)" },
      { text: "Sustituyendo con conversión de Ea a J/mol:", tex: `\\ln\\frac{k_2}{k_1} = -\\frac{${ntex(Ea * 1000)}}{8.314}\\left(\\frac{1}{${ntex(T2)}} - \\frac{1}{${ntex(T1)}}\\right) = ${ntex(lnRatio, 6)}` },
      { text: "Constante de velocidad a T2:", tex: `k_2 = k_1 e^{${ntex(lnRatio, 6)}} = ${ntex(k1)} \\times ${ntex(Math.exp(lnRatio), 6)} = ${ntex(k2, 6)}` }
    ],
    copy: `k2 = ${fmt(k2, 4)}`
  };
}

function activation(input) {
  const k1 = num(input, "k1", "Constante de velocidad inicial k1", { positive: true });
  const T1 = num(input, "T1", "Temperatura inicial T1", { positive: true });
  const k2 = num(input, "k2", "Constante de velocidad k2", { positive: true });
  const T2 = num(input, "T2", "Temperatura final T2", { positive: true });
  if (T1 === T2) fail("T2 debe ser distinta de T1 para calcular la energía de activación.", "T2");
  const Ea = (R * Math.log(k2 / k1)) / (1 / T1 - 1 / T2) / 1000;
  return {
    results: [{ label: "Energía de activación Ea", value: `${fmt(Ea, 4)} kJ/mol` }],
    steps: [
      { text: "De la ecuación de Arrhenius calculamos Ea:", tex: "E_a = \\frac{R \\ln(k_2/k_1)}{1/T_1 - 1/T_2}" },
      { text: "Sustituyendo:", tex: `E_a = \\frac{8.314 \\times \\ln(${ntex(k2)}/${ntex(k1)})}{1/${ntex(T1)} - 1/${ntex(T2)}} = ${ntex(Ea, 6)}\\ \\text{kJ/mol}` }
    ],
    copy: `Ea = ${fmt(Ea, 4)} kJ/mol`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Tipo de cálculo", MODES, "integrated");
  if (mode === "integrated") return integrated(input);
  if (mode === "arrhenius") return arrhenius(input);
  return activation(input);
}
