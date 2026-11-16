import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const snap = (x) => (Math.abs(x) < 1e-12 ? 0 : x);
const MODES = [
  ["ke", "Energía cinética KE = ½mv²"],
  ["pe", "Energía potencial PE = mgh"],
  ["work", "Trabajo W = F d cosθ"],
  ["power", "Potencia P = W/t o P = Fv"],
  ["fall", "Velocidad tras la caída con pérdida de energía"]
];

export const meta = {
  description: "Calcula la energía cinética, la energía potencial, el trabajo, la potencia y la velocidad de caída con porcentaje de pérdida de energía, eligiendo el modo adecuado, con los pasos y unidades SI.",
  keywords: ["Trabajo", "Energía", "Energía cinética", "Energía potencial", "Potencia", "work", "energy", "power", "Caída"],
  formulas: [
    { label: "Energía cinética", tex: "KE = \\tfrac{1}{2}mv^2" },
    { label: "Energía potencial", tex: "PE = mgh" },
    { label: "Trabajo y potencia", tex: "W = Fd\\cos\\theta,\\qquad P = \\frac{W}{t} = Fv" },
    { label: "Velocidad tras la caída", tex: "v = \\sqrt{\\left(v_0^2 + 2gh\\right)\\left(1 - \\frac{L}{100}\\right)}" }
  ],
  inputs: [
    { id: "mode", label: "Modo", type: "select", default: "ke", options: MODES },
    { id: "m", label: "Masa m", unit: "kg", type: "number", default: "2", when: { mode: ["ke", "pe"] } },
    { id: "v", label: "Velocidad v", unit: "m/s", type: "number", when: { mode: ["ke", "power"] }, help: "En modo potencia: opcional, se usa con F para calcular P = Fv." },
    { id: "h", label: "Altura h", unit: "m", type: "number", default: "10", when: { mode: ["pe", "fall"] } },
    { id: "g", label: "Gravedad g", unit: "m/s²", type: "number", default: "9.81", when: { mode: ["pe", "fall"] } },
    { id: "F", label: "Fuerza F", unit: "N", type: "number", when: { mode: ["work", "power"] }, help: "En modo potencia: opcional, se usa con v para calcular P = Fv." },
    { id: "d", label: "Desplazamiento d", unit: "m", type: "number", when: { mode: ["work"] } },
    { id: "theta", label: "Ángulo entre F y d θ", unit: "°", type: "number", default: "0", when: { mode: ["work"] } },
    { id: "W", label: "Trabajo W", unit: "J", type: "number", when: { mode: ["power"] } },
    { id: "t", label: "Tiempo t", unit: "s", type: "number", when: { mode: ["power"] } },
    { id: "v0", label: "Velocidad inicial v0", unit: "m/s", type: "number", when: { mode: ["fall"] } },
    { id: "loss", label: "Porcentaje de pérdida de energía", unit: "%", type: "number", default: "0", when: { mode: ["fall"] }, help: "Entre 0 y 100; reduce la energía total tras la caída." }
  ],
  example: { values: { mode: "ke", m: "2", v: "10", g: "", h: "", F: "", d: "", theta: "", W: "", t: "", v0: "", loss: "" }, expect: ["KE = 100 J"], note: "Ejemplo: masa de 2 kg que se mueve a 10 m/s." },
  invalid: { values: { mode: "ke", m: "0", v: "10", g: "", h: "", F: "", d: "", theta: "", W: "", t: "", v0: "", loss: "" } },
  related: ["kinematics", "collisions", "projectile-motion", "formulas-constants"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Modo", MODES.map((m) => m[0]), "ke");
  const steps = [];
  const results = [];
  let copy;
  let values;
  switch (mode) {
    case "ke": {
      const m = num(input, "m", "Masa", { positive: true });
      const v = num(input, "v", "Velocidad", { nonNegative: true });
      const KE = 0.5 * m * v * v;
      steps.push({ text: "Energía cinética:", tex: `KE = \\frac{1}{2}mv^2 = \\frac{1}{2} \\times ${T(m)} \\times (${T(v)})^2 = ${T(KE)}\\ J` });
      results.push({ label: "Energía cinética KE", value: `${fmt(KE, 6)} J` });
      copy = `KE = ${fmt(KE, 6)} J`;
      values = { KE };
      break;
    }
    case "pe": {
      const m = num(input, "m", "Masa", { positive: true });
      const h = num(input, "h", "Altura");
      const g = num(input, "g", "Gravedad", { positive: true });
      const PE = m * g * h;
      steps.push({ text: "Energía potencial gravitatoria:", tex: `PE = mgh = ${T(m)} \\times ${T(g)} \\times (${T(h)}) = ${T(PE)}\\ J` });
      results.push({ label: "Energía potencial PE", value: `${fmt(PE, 6)} J` });
      copy = `PE = ${fmt(PE, 6)} J`;
      values = { PE };
      break;
    }
    case "work": {
      const F = num(input, "F", "Fuerza F");
      const d = num(input, "d", "Desplazamiento d");
      const theta = num(input, "theta", "Ángulo θ", { min: -360, max: 360 });
      const c = snap(Math.cos((theta * Math.PI) / 180));
      const W = F * d * c;
      steps.push({ text: "Trabajo con fuerza constante:", tex: `W = Fd\\cos\\theta = ${T(F)} \\times ${T(d)} \\times \\cos(${T(theta)}^\\circ) = ${T(W)}\\ J` });
      results.push({ label: "Trabajo W", value: `${fmt(W, 6)} J` });
      copy = `W = ${fmt(W, 6)} J`;
      values = { W };
      break;
    }
    case "power": {
      const W = num(input, "W", "Trabajo W");
      const t = num(input, "t", "Tiempo t", { positive: true });
      const hasF = !isBlank(input.F);
      const hasV = !isBlank(input.v);
      if (hasF !== hasV) fail("Para calcular P = Fv introduce la fuerza F y la velocidad v juntas, o déjalas vacías.", hasF ? "v" : "F");
      const P = W / t;
      steps.push({ text: "Potencia media:", tex: `P = \\frac{W}{t} = \\frac{${T(W)}}{${T(t)}} = ${T(P)}\\ W` });
      results.push({ label: "Potencia P = W/t", value: `${fmt(P, 6)} W` });
      copy = `P = ${fmt(P, 6)} W`;
      values = { P };
      if (hasF) {
        const F = num(input, "F", "Fuerza F");
        const v = num(input, "v", "Velocidad v");
        const Pf = F * v;
        steps.push({ text: "Potencia instantánea en función de la fuerza y la velocidad:", tex: `P = Fv = ${T(F)} \\times ${T(v)} = ${T(Pf)}\\ W` });
        results.push({ label: "Potencia P = Fv", value: `${fmt(Pf, 6)} W` });
        copy += `، P = Fv = ${fmt(Pf, 6)} W`;
        values.Pf = Pf;
      }
      break;
    }
    case "fall": {
      const v0 = num(input, "v0", "Velocidad inicial", { nonNegative: true });
      const h = num(input, "h", "Altura h", { nonNegative: true });
      const g = num(input, "g", "Gravedad", { positive: true });
      const loss = num(input, "loss", "Porcentaje de pérdida", { default: 0, min: 0, max: 100 });
      const energy = v0 * v0 + 2 * g * h;
      const vIdeal = Math.sqrt(energy);
      const v = Math.sqrt(energy * (1 - loss / 100));
      steps.push({ text: "Sin pérdida, por conservación de la energía:", tex: `v_{ideal} = \\sqrt{v_0^2 + 2gh} = ${T(vIdeal)}\\ m/s` });
      steps.push({ text: "Con porcentaje de pérdida L, la energía total se reduce según (1 - L/100):", tex: `v = \\sqrt{(v_0^2 + 2gh)\\left(1 - \\frac{${T(loss)}}{100}\\right)} = ${T(v)}\\ m/s` });
      results.push({ label: "Velocidad tras la caída v", value: `${fmt(v, 6)} m/s` });
      results.push({ label: "Velocidad sin pérdida", value: `${fmt(vIdeal, 6)} m/s` });
      copy = `v = ${fmt(v, 6)} m/s, sin pérdida = ${fmt(vIdeal, 6)} m/s`;
      values = { v, vIdeal };
      break;
    }
  }
  return { results, steps, copy, values };
}
