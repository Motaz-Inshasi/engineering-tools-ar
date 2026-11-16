import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const R = 8.314;
const MODES = ["integrated", "arrhenius", "activation"];

export const meta = {
  description: "Chemical reaction rates: remaining concentration [A]t and half-life for zero, first or second order reactions with a plot, the rate constant at another temperature (Arrhenius), or the activation energy from two rate constants.",
  keywords: ["chemical kinetics", "reaction rate", "reaction order", "half-life", "half-life", "rate constant", "Arrhenius", "Arrhenius", "activation energy", "Ea", "kinetics"],
  formulas: [
    { label: "Zero order", tex: "[A]_t = [A]_0 - kt,\\qquad t_{1/2} = \\frac{[A]_0}{2k}" },
    { label: "First order", tex: "[A]_t = [A]_0 e^{-kt},\\qquad t_{1/2} = \\frac{\\ln 2}{k}" },
    { label: "Second order", tex: "\\frac{1}{[A]_t} = \\frac{1}{[A]_0} + kt,\\qquad t_{1/2} = \\frac{1}{k[A]_0}" },
    { label: "Arrhenius", tex: "\\ln\\frac{k_2}{k_1} = -\\frac{E_a}{R}\\left(\\frac{1}{T_2} - \\frac{1}{T_1}\\right)" }
  ],
  inputs: [
    { id: "mode", label: "Calculation type", type: "select", default: "integrated", options: [["integrated", "concentration [A] versus time"], ["arrhenius", "Calculate k2 from the activation energy"], ["activation", "Calculate the activation energy from k1 and k2"]] },
    { id: "order", label: "reaction order", type: "select", default: "1", options: [["0", "Order 0"], ["1", "Order 1"], ["2", "Order 2"]], when: { mode: ["integrated"] } },
    { id: "k", label: "Rate constant k", type: "number", default: "0.1", when: { mode: ["integrated"] }, help: "Its unit matches the order and the time unit t." },
    { id: "A0", label: "Initial concentration [A]0", type: "number", default: "1", when: { mode: ["integrated"] } },
    { id: "t", label: "Time t", type: "number", default: "10", when: { mode: ["integrated"] } },
    { id: "k1", label: "First rate constant k1", type: "number", default: "1", when: { mode: ["arrhenius", "activation"] } },
    { id: "T1", label: "First temperature T1", unit: "K", type: "number", default: "300", when: { mode: ["arrhenius", "activation"] } },
    { id: "T2", label: "Second temperature T2", unit: "K", type: "number", default: "310", when: { mode: ["arrhenius", "activation"] } },
    { id: "Ea", label: "Activation energy Ea", unit: "kJ/mol", type: "number", default: "50", when: { mode: ["arrhenius"] } },
    { id: "k2", label: "Second rate constant k2", type: "number", default: "2", when: { mode: ["activation"] } }
  ],
  example: { values: { mode: "integrated", order: "1", k: "0.1", A0: "1", t: "10", k1: "", T1: "", T2: "", Ea: "", k2: "" }, expect: ["0.3679", "6.931"], note: "Example: a first-order reaction with k = 0.1 and an initial concentration of 1, after 10 time units." },
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
  const order = Number(choice(input, "order", "Order", ["0", "1", "2"], "1"));
  const k = num(input, "k", "Rate constant k", { positive: true });
  const A0 = num(input, "A0", "Initial concentration [A]0", { positive: true });
  const t = num(input, "t", "Time t", { nonNegative: true });
  const At = conc(order, A0, k, t);
  const half = halfLife(order, A0, k);
  const results = [
    { label: "Remaining concentration [A]t", value: fmt(At, 4) },
    { label: "Half-life t½", value: fmt(half, 4) }
  ];
  const steps = [];
  if (order === 0) {
    const raw = A0 - k * t;
    steps.push({ text: "Integrated rate law for zero order:", tex: `[A]_t = [A]_0 - kt = ${ntex(A0)} - ${ntex(k)} \\times ${ntex(t)} = ${ntex(raw, 6)}` });
    if (raw <= 0) {
      const tFull = A0 / k;
      results.push({ label: "Time for complete consumption t = [A]0/k", value: fmt(tFull, 4) });
      steps.push({ text: "The reactant was completely consumed before time t, so the remaining concentration is zero:", tex: `t_{full} = \\frac{[A]_0}{k} = ${ntex(tFull, 6)}` });
    }
    steps.push({ text: "Half-life for zero order:", tex: `t_{1/2} = \\frac{[A]_0}{2k} = ${ntex(half, 6)}` });
  } else if (order === 1) {
    steps.push({ text: "Integrated rate law for first order:", tex: `[A]_t = [A]_0 e^{-kt} = ${ntex(A0)} e^{-${ntex(k)} \\times ${ntex(t)}} = ${ntex(At, 6)}` });
    steps.push({ text: "Half-life for first order:", tex: `t_{1/2} = \\frac{\\ln 2}{k} = \\frac{0.693147}{${ntex(k)}} = ${ntex(half, 6)}` });
  } else {
    steps.push({ text: "Integrated rate law for second order:", tex: `\\frac{1}{[A]_t} = \\frac{1}{${ntex(A0)}} + ${ntex(k)} \\times ${ntex(t)},\\qquad [A]_t = ${ntex(At, 6)}` });
    steps.push({ text: "Half-life for second order:", tex: `t_{1/2} = \\frac{1}{k[A]_0} = ${ntex(half, 6)}` });
  }
  const tMax = Math.max(t, 3 * half);
  const N = 60;
  const points = [];
  for (let i = 0; i <= N; i++) {
    const x = (tMax * i) / N;
    points.push([x, conc(order, A0, k, x)]);
  }
  const blocks = [{ type: "plot", title: `Change of [A] over time (order ${order})`, xLabel: "t", yLabel: "[A]", series: [{ name: "[A]", points, line: true }], vlines: [{ x: t }], includeZero: true }];
  return {
    results, steps, blocks,
    copy: `[A]t = ${fmt(At, 4)}، t½ = ${fmt(half, 4)}`
  };
}

function arrhenius(input) {
  const k1 = num(input, "k1", "First rate constant k1", { positive: true });
  const T1 = num(input, "T1", "First temperature T1", { positive: true });
  const T2 = num(input, "T2", "Second temperature T2", { positive: true });
  const Ea = num(input, "Ea", "Activation energy Ea", { nonNegative: true });
  const lnRatio = (-Ea * 1000 / R) * (1 / T2 - 1 / T1);
  const k2 = k1 * Math.exp(lnRatio);
  return {
    results: [{ label: "Second rate constant k2", value: fmt(k2, 4) }],
    steps: [
      { text: "Arrhenius equation between two temperatures:", tex: "\\ln\\frac{k_2}{k_1} = -\\frac{E_a}{R}\\left(\\frac{1}{T_2} - \\frac{1}{T_1}\\right)" },
      { text: "Substituting, with Ea converted to J/mol:", tex: `\\ln\\frac{k_2}{k_1} = -\\frac{${ntex(Ea * 1000)}}{8.314}\\left(\\frac{1}{${ntex(T2)}} - \\frac{1}{${ntex(T1)}}\\right) = ${ntex(lnRatio, 6)}` },
      { text: "Rate constant at T2:", tex: `k_2 = k_1 e^{${ntex(lnRatio, 6)}} = ${ntex(k1)} \\times ${ntex(Math.exp(lnRatio), 6)} = ${ntex(k2, 6)}` }
    ],
    copy: `k2 = ${fmt(k2, 4)}`
  };
}

function activation(input) {
  const k1 = num(input, "k1", "First rate constant k1", { positive: true });
  const T1 = num(input, "T1", "First temperature T1", { positive: true });
  const k2 = num(input, "k2", "Second rate constant k2", { positive: true });
  const T2 = num(input, "T2", "Second temperature T2", { positive: true });
  if (T1 === T2) fail("T2 must differ from T1 to calculate the activation energy.", "T2");
  const Ea = (R * Math.log(k2 / k1)) / (1 / T1 - 1 / T2) / 1000;
  return {
    results: [{ label: "Activation energy Ea", value: `${fmt(Ea, 4)} kJ/mol` }],
    steps: [
      { text: "From the Arrhenius equation we calculate Ea:", tex: "E_a = \\frac{R \\ln(k_2/k_1)}{1/T_1 - 1/T_2}" },
      { text: "Substituting:", tex: `E_a = \\frac{8.314 \\times \\ln(${ntex(k2)}/${ntex(k1)})}{1/${ntex(T1)} - 1/${ntex(T2)}} = ${ntex(Ea, 6)}\\ \\text{kJ/mol}` }
    ],
    copy: `Ea = ${fmt(Ea, 4)} kJ/mol`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Calculation type", MODES, "integrated");
  if (mode === "integrated") return integrated(input);
  if (mode === "arrhenius") return arrhenius(input);
  return activation(input);
}
