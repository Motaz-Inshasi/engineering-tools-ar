import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "El temporizador 555 en los modos astable (oscilador) y monoestable: frecuencia, ciclo de trabajo, tiempos de subida y bajada y anchura del pulso, con la forma de onda de salida.",
  keywords: ["555", "Temporizador 555", "timer", "astable", "monostable", "Oscilador", "Pulso", "Ciclo de trabajo", "duty cycle"],
  formulas: [
    { label: "Astable (oscilador)", tex: "t_H = \\ln 2\\,(R_1 + R_2)C,\\quad t_L = \\ln 2\\,R_2 C,\\quad f = \\frac{1}{t_H + t_L} \\approx \\frac{1.44}{(R_1 + 2R_2)C}" },
    { label: "Monoestable", tex: "t = \\ln 3\\,RC \\approx 1.1\\,RC" }
  ],
  inputs: [
    { id: "mode", label: "Modo", type: "select", default: "astable", options: [["astable", "Astable (oscilador)"], ["mono", "Monoestable (pulso único)"]] },
    { id: "R1", label: "R1", unit: "Ω", type: "number", default: "1k", when: { mode: ["astable"] } },
    { id: "R2", label: "R2", unit: "Ω", type: "number", default: "10k", when: { mode: ["astable"] } },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "100k", when: { mode: ["mono"] } },
    { id: "C", label: "C", unit: "F", type: "number", default: "100n" }
  ],
  example: { values: { mode: "astable", R1: "1k", R2: "10k", C: "100n" }, expect: ["f = 687 Hz", "52.38%"], note: "Ejemplo: R1 = 1 kΩ, R2 = 10 kΩ y C = 100 nF." },
  invalid: { values: { mode: "astable", R1: "1k", R2: "0", C: "100n" } },
  related: ["rc-rl-transient", "pwm-servo", "capacitor-inductor-combination"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Modo", ["astable", "mono"], "astable");
  const C = num(input, "C", "C", { positive: true });
  const L2 = Math.LN2, L3 = Math.log(3);
  if (mode === "mono") {
    const R = num(input, "R", "R", { positive: true });
    const t = L3 * R * C;
    return {
      results: [{ label: "Anchura del pulso", value: eng(t, "s", 4), text: `t = ${eng(t, "s", 4)}` }],
      steps: [
        "Con el pulso de disparo, la salida sube y el condensador se carga a través de R hasta alcanzar 2/3 de la tensión de alimentación; entonces la salida baja.",
        { text: "Tiempo de carga de 0 a ⅔Vcc:", tex: `t = RC\\ln 3 = ${ntex(R)} \\times ${ntex(C)} \\times 1.0986 = ${ntex(t, 5)}\\ s` },
        "El resultado no depende de la tensión de alimentación, porque los umbrales de comparación son una fracción de ella."
      ],
      copy: `t = ${eng(t, "s", 4)}`
    };
  }
  const R1 = num(input, "R1", "R1", { positive: true }), R2 = num(input, "R2", "R2", { positive: true });
  if (R1 < 1) fail("R1 es muy pequeña y puede dañar el pin de descarga (se recomienda al menos 1 kΩ).", "R1");
  const tH = L2 * (R1 + R2) * C, tL = L2 * R2 * C, T = tH + tL, f = 1 / T, D = tH / T;
  const steps = [
    "La tensión del condensador oscila entre ⅓Vcc y ⅔Vcc: se carga a través de R1 + R2 (salida alta) y se descarga solo a través de R2 (salida baja).",
    { text: "Tiempos de subida y bajada:", tex: `t_H = \\ln 2 (${ntex(R1)} + ${ntex(R2)})(${ntex(C)}) = ${ntex(tH, 5)}\\ s,\\quad t_L = \\ln 2 \\cdot ${ntex(R2)} \\cdot ${ntex(C)} = ${ntex(tL, 5)}\\ s` },
    { text: "Frecuencia y ciclo de trabajo:", tex: `f = \\frac{1}{t_H + t_L} = ${ntex(f, 5)}\\ Hz,\\quad D = \\frac{t_H}{t_H + t_L} = ${ntex(100 * D, 4)}\\%` },
    "El ciclo de trabajo de este circuito es siempre mayor que el 50 %; para obtener menos, se añade un diodo en paralelo con R2."
  ];
  const pts = [];
  for (let k = 0; k < 3; k++) {
    const t0 = k * T;
    pts.push([t0, 0], [t0, 1], [t0 + tH, 1], [t0 + tH, 0], [t0 + T, 0]);
  }
  return {
    results: [
      { label: "Frecuencia", value: eng(f, "Hz", 4), text: `f = ${eng(f, "Hz", 4)}` },
      { label: "Ciclo de trabajo", value: `${fmt(100 * D, 4)}%`, text: `D = ${fmt(100 * D, 4)}%` },
      { label: "Tiempo de subida tH", value: eng(tH, "s", 4) },
      { label: "Tiempo de bajada tL", value: eng(tL, "s", 4) },
      { label: "Periodo T", value: eng(T, "s", 4) }
    ],
    blocks: [{ type: "plot", title: "Forma de onda de salida (tres ciclos)", xLabel: "t (s)", yLabel: "Salida", yMin: -0.2, yMax: 1.3, series: [{ name: "Salida", points: pts }] }],
    steps, copy: `f = ${eng(f, "Hz", 4)}, D = ${fmt(100 * D, 4)}%, tH = ${eng(tH, "s", 4)}, tL = ${eng(tL, "s", 4)}`
  };
}
