import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const snap = (x) => (Math.abs(x) < 1e-12 ? 0 : x);
const MODES = [
  ["ke", "Kinetic energy KE = ½mv²"],
  ["pe", "Potential energy PE = mgh"],
  ["work", "Work W = F d cosθ"],
  ["power", "Power P = W/t or P = Fv"],
  ["fall", "Speed after falling with energy loss"]
];

export const meta = {
  description: "Calculates kinetic energy, potential energy, work, power and fall speed with an energy loss percentage, by choosing the suitable mode, with steps and SI units.",
  keywords: ["work", "energy", "kinetic energy", "potential energy", "power", "work", "energy", "power", "fall"],
  formulas: [
    { label: "Kinetic energy", tex: "KE = \\tfrac{1}{2}mv^2" },
    { label: "Potential energy", tex: "PE = mgh" },
    { label: "Work and power", tex: "W = Fd\\cos\\theta,\\qquad P = \\frac{W}{t} = Fv" },
    { label: "Speed after falling", tex: "v = \\sqrt{\\left(v_0^2 + 2gh\\right)\\left(1 - \\frac{L}{100}\\right)}" }
  ],
  inputs: [
    { id: "mode", label: "Mode", type: "select", default: "ke", options: MODES },
    { id: "m", label: "Mass m", unit: "kg", type: "number", default: "2", when: { mode: ["ke", "pe"] } },
    { id: "v", label: "Speed v", unit: "m/s", type: "number", when: { mode: ["ke", "power"] }, help: "In power mode: optional, used with F to calculate P = Fv." },
    { id: "h", label: "Height h", unit: "m", type: "number", default: "10", when: { mode: ["pe", "fall"] } },
    { id: "g", label: "Gravitational acceleration g", unit: "m/s²", type: "number", default: "9.81", when: { mode: ["pe", "fall"] } },
    { id: "F", label: "Force F", unit: "N", type: "number", when: { mode: ["work", "power"] }, help: "In power mode: optional, used with v to calculate P = Fv." },
    { id: "d", label: "Displacement d", unit: "m", type: "number", when: { mode: ["work"] } },
    { id: "theta", label: "Angle between F and d θ", unit: "°", type: "number", default: "0", when: { mode: ["work"] } },
    { id: "W", label: "Work W", unit: "J", type: "number", when: { mode: ["power"] } },
    { id: "t", label: "Time t", unit: "s", type: "number", when: { mode: ["power"] } },
    { id: "v0", label: "Initial velocity v0", unit: "m/s", type: "number", when: { mode: ["fall"] } },
    { id: "loss", label: "Energy loss percentage", unit: "%", type: "number", default: "0", when: { mode: ["fall"] }, help: "From 0 to 100; the total energy after the fall is reduced by this percentage." }
  ],
  example: { values: { mode: "ke", m: "2", v: "10", g: "", h: "", F: "", d: "", theta: "", W: "", t: "", v0: "", loss: "" }, expect: ["KE = 100 J"], note: "Example: a 2 kg mass moving at 10 m/s." },
  invalid: { values: { mode: "ke", m: "0", v: "10", g: "", h: "", F: "", d: "", theta: "", W: "", t: "", v0: "", loss: "" } },
  related: ["kinematics", "collisions", "projectile-motion", "formulas-constants"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Mode", MODES.map((m) => m[0]), "ke");
  const steps = [];
  const results = [];
  let copy;
  let values;
  switch (mode) {
    case "ke": {
      const m = num(input, "m", "Mass", { positive: true });
      const v = num(input, "v", "Speed", { nonNegative: true });
      const KE = 0.5 * m * v * v;
      steps.push({ text: "Kinetic energy:", tex: `KE = \\frac{1}{2}mv^2 = \\frac{1}{2} \\times ${T(m)} \\times (${T(v)})^2 = ${T(KE)}\\ J` });
      results.push({ label: "Kinetic energy KE", value: `${fmt(KE, 6)} J` });
      copy = `KE = ${fmt(KE, 6)} J`;
      values = { KE };
      break;
    }
    case "pe": {
      const m = num(input, "m", "Mass", { positive: true });
      const h = num(input, "h", "Height");
      const g = num(input, "g", "Gravitational acceleration", { positive: true });
      const PE = m * g * h;
      steps.push({ text: "Gravitational potential energy:", tex: `PE = mgh = ${T(m)} \\times ${T(g)} \\times (${T(h)}) = ${T(PE)}\\ J` });
      results.push({ label: "Potential energy PE", value: `${fmt(PE, 6)} J` });
      copy = `PE = ${fmt(PE, 6)} J`;
      values = { PE };
      break;
    }
    case "work": {
      const F = num(input, "F", "Force F");
      const d = num(input, "d", "Displacement d");
      const theta = num(input, "theta", "Angle θ", { min: -360, max: 360 });
      const c = snap(Math.cos((theta * Math.PI) / 180));
      const W = F * d * c;
      steps.push({ text: "Work by a constant force:", tex: `W = Fd\\cos\\theta = ${T(F)} \\times ${T(d)} \\times \\cos(${T(theta)}^\\circ) = ${T(W)}\\ J` });
      results.push({ label: "Work W", value: `${fmt(W, 6)} J` });
      copy = `W = ${fmt(W, 6)} J`;
      values = { W };
      break;
    }
    case "power": {
      const W = num(input, "W", "Work W");
      const t = num(input, "t", "Time t", { positive: true });
      const hasF = !isBlank(input.F);
      const hasV = !isBlank(input.v);
      if (hasF !== hasV) fail("To calculate P = Fv, enter the force F and the speed v together, or leave both empty.", hasF ? "v" : "F");
      const P = W / t;
      steps.push({ text: "Average power:", tex: `P = \\frac{W}{t} = \\frac{${T(W)}}{${T(t)}} = ${T(P)}\\ W` });
      results.push({ label: "Power P = W/t", value: `${fmt(P, 6)} W` });
      copy = `P = ${fmt(P, 6)} W`;
      values = { P };
      if (hasF) {
        const F = num(input, "F", "Force F");
        const v = num(input, "v", "Speed v");
        const Pf = F * v;
        steps.push({ text: "Instantaneous power in terms of force and speed:", tex: `P = Fv = ${T(F)} \\times ${T(v)} = ${T(Pf)}\\ W` });
        results.push({ label: "Power P = Fv", value: `${fmt(Pf, 6)} W` });
        copy += `، P = Fv = ${fmt(Pf, 6)} W`;
        values.Pf = Pf;
      }
      break;
    }
    case "fall": {
      const v0 = num(input, "v0", "Initial velocity", { nonNegative: true });
      const h = num(input, "h", "Height h", { nonNegative: true });
      const g = num(input, "g", "Gravitational acceleration", { positive: true });
      const loss = num(input, "loss", "Energy loss percentage", { default: 0, min: 0, max: 100 });
      const energy = v0 * v0 + 2 * g * h;
      const vIdeal = Math.sqrt(energy);
      const v = Math.sqrt(energy * (1 - loss / 100));
      steps.push({ text: "Without loss, from conservation of energy:", tex: `v_{ideal} = \\sqrt{v_0^2 + 2gh} = ${T(vIdeal)}\\ m/s` });
      steps.push({ text: "With the energy loss percentage L, the total energy is reduced by the factor (1 - L/100):", tex: `v = \\sqrt{(v_0^2 + 2gh)\\left(1 - \\frac{${T(loss)}}{100}\\right)} = ${T(v)}\\ m/s` });
      results.push({ label: "Speed after falling v", value: `${fmt(v, 6)} m/s` });
      results.push({ label: "Speed without loss", value: `${fmt(vIdeal, 6)} m/s` });
      copy = `v = ${fmt(v, 6)} m/s, without loss = ${fmt(vIdeal, 6)} m/s`;
      values = { v, vIdeal };
      break;
    }
  }
  return { results, steps, copy, values };
}
