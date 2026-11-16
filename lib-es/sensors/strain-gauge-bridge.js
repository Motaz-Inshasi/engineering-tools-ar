import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const CFG = [["quarter", "Cuarto de puente (un extensómetro)"], ["half", "Medio puente (dos extensómetros: tracción y compresión)"], ["full", "Puente completo (cuatro extensómetros)"]];

export const meta = {
  description: "Extensómetro en puente de Wheatstone: tensión de salida para cuarto de puente, medio puente y puente completo a partir de la deformación y el factor del extensómetro, o la deformación a partir de la tensión de salida, con el cambio de resistencia y la ganancia necesaria del amplificador.",
  keywords: ["Extensómetro", "strain gauge", "Deformación", "puente", "gauge factor", "Factor del extensómetro", "microdeformación", "celda de carga"],
  formulas: [
    { label: "Cambio de resistencia", tex: "\\frac{\\Delta R}{R} = GF \\cdot \\varepsilon" },
    { label: "Salida", tex: "\\text{quarter: } V_o = V_{ex}\\frac{GF\\varepsilon}{4}\\cdot\\frac{1}{1 + GF\\varepsilon/2},\\quad \\text{half: } \\frac{V_{ex}GF\\varepsilon}{2},\\quad \\text{full: } V_{ex}GF\\varepsilon" }
  ],
  inputs: [
    { id: "cfg", label: "Conexión", type: "select", default: "quarter", options: CFG },
    { id: "dir", label: "Se pide", type: "select", default: "e2v", options: [["e2v", "Tensión de salida a partir de la deformación"], ["v2e", "Deformación a partir de la tensión de salida"]] },
    { id: "strain", label: "Deformación", unit: "µε", type: "number", default: "1000", when: { dir: ["e2v"] } },
    { id: "Vo", label: "Tensión de salida", unit: "V", type: "number", default: "5m", when: { dir: ["v2e"] } },
    { id: "GF", label: "Factor del extensómetro GF", type: "number", default: "2" },
    { id: "Vex", label: "Tensión de excitación Vex", unit: "V", type: "number", default: "10" },
    { id: "R", label: "Resistencia del extensómetro", unit: "Ω", type: "number", default: "350" },
    { id: "Vadc", label: "Rango de ADC requerido para la salida a plena escala (opcional)", unit: "V", type: "number", default: "3.3" }
  ],
  example: { values: { cfg: "quarter", dir: "e2v", strain: "1000", GF: "2", Vex: "10", R: "350", Vadc: "3.3" }, expect: ["Vo = 4.995 mV"], note: "Ejemplo: deformación de 1000 µε con un extensómetro, GF = 2 y excitación de 10 V." },
  invalid: { values: { cfg: "quarter", dir: "e2v", strain: "1000", GF: "0", Vex: "10", R: "350" } },
  related: ["wheatstone-bridge", "op-amp", "adc", "rtd"]
};

export function output(cfg, Vex, GF, e) {
  const x = GF * e;
  if (cfg === "quarter") return (Vex * x) / 4 / (1 + x / 2);
  if (cfg === "half") return (Vex * x) / 2;
  return Vex * x;
}

export function strainFrom(cfg, Vex, GF, Vo) {
  const r = Vo / Vex;
  if (cfg === "quarter") return (4 * r) / (GF * (1 - 2 * r));
  if (cfg === "half") return (2 * r) / GF;
  return r / GF;
}

export function solve(input) {
  const cfg = choice(input, "cfg", "Conexión", CFG.map((c) => c[0]), "quarter");
  const dir = choice(input, "dir", "Se pide", ["e2v", "v2e"], "e2v");
  const GF = num(input, "GF", "Factor del extensómetro", { positive: true });
  const Vex = num(input, "Vex", "Tensión de excitación", { positive: true });
  const R = num(input, "R", "Resistencia del extensómetro", { positive: true });
  const Vadc = num(input, "Vadc", "Rango del ADC", { optional: true, positive: true });
  let e, Vo;
  const steps = [];
  if (dir === "e2v") {
    e = num(input, "strain", "Deformación", { min: -1e5, max: 1e5 }) * 1e-6;
    Vo = output(cfg, Vex, GF, e);
  } else {
    Vo = num(input, "Vo", "Tensión de salida");
    e = strainFrom(cfg, Vex, GF, Vo);
  }
  const dR = R * GF * e;
  steps.push({ text: "Cambio de resistencia del extensómetro:", tex: `\\Delta R = R \\cdot GF \\cdot \\varepsilon = ${ntex(R)} \\times ${ntex(GF)} \\times ${ntex(e, 5)} = ${ntex(dR, 5)}\\ \\Omega` });
  if (cfg === "quarter") steps.push({ text: "En el cuarto de puente solo hay un brazo activo, y la relación es algo no lineal:", tex: `V_o = ${ntex(Vex)}\\frac{GF\\varepsilon/4}{1 + GF\\varepsilon/2} = ${ntex(Vo, 5)}\\ V` });
  else if (cfg === "half") steps.push({ text: "En el medio puente hay un extensómetro a tracción y otro a compresión en brazos contiguos, por lo que la sensibilidad se duplica y desaparece la no linealidad:", tex: `V_o = \\frac{V_{ex} GF \\varepsilon}{2} = ${ntex(Vo, 5)}\\ V` });
  else steps.push({ text: "En el puente completo hay cuatro extensómetros activos, por lo que la sensibilidad es cuatro veces la del cuarto de puente:", tex: `V_o = V_{ex} GF \\varepsilon = ${ntex(Vo, 5)}\\ V` });
  if (dir === "v2e") steps.push({ text: "Invertimos la relación para hallar la deformación:", tex: `\\varepsilon = ${ntex(e * 1e6, 5)}\\ \\mu\\varepsilon` });
  steps.push("El medio puente y el puente completo también compensan automáticamente el cambio de temperatura, y por eso se usan mucho en celdas de carga.");
  const results = [
    { label: "Tensión de salida", value: eng(Vo, "V", 4), text: `Vo = ${eng(Vo, "V", 4)}` },
    { label: "Deformación", value: `${fmt(e * 1e6, 5)} µε` },
    { label: "Cambio de resistencia", value: eng(dR, "Ω", 4) },
    { label: "Sensibilidad", value: `${fmt((Vo / Vex) * 1000, 4)} mV/V` }
  ];
  if (Vadc !== null && Vo !== 0) {
    const G = Vadc / Math.abs(Vo);
    results.push({ label: "Ganancia del amplificador para llenar el rango del ADC", value: fmt(G, 4) });
    steps.push(`Para amplificar esta salida hasta ${fmt(Vadc)} V necesitamos un amplificador (normalmente de instrumentación) con una ganancia de ${fmt(G, 4)}.`);
  }
  return { results, steps, copy: `Vo = ${eng(Vo, "V", 4)}, ε = ${fmt(e * 1e6, 5)} µε, ΔR = ${eng(dR, "Ω", 4)}` };
}
