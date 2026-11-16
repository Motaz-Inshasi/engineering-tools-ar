import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Revisa un regulador de tensión lineal (como el 7805 o un LDO): margen de caída de tensión, potencia disipada, rendimiento, temperatura de unión y la resistencia térmica necesaria del disipador.",
  keywords: ["Regulador de tensión", "voltage regulator", "LDO", "7805", "Tensión de caída (dropout)", "dropout", "Disipador térmico", "heatsink", "Temperatura de unión"],
  formulas: [
    { label: "Potencia y eficiencia", tex: "P_D = (V_{in} - V_{out})I_L + V_{in}I_Q,\\qquad \\eta = \\frac{V_{out}I_L}{V_{in}(I_L + I_Q)}" },
    { label: "Térmica", tex: "T_J = T_A + P_D\\,\\theta_{JA},\\qquad \\theta_{SA,max} = \\frac{T_{J,max} - T_A}{P_D} - \\theta_{JC} - \\theta_{CS}" }
  ],
  inputs: [
    { id: "Vin", label: "Tensión de entrada (valor máximo)", unit: "V", type: "number", default: "12" },
    { id: "Vout", label: "Tensión de salida", unit: "V", type: "number", default: "5" },
    { id: "IL", label: "Corriente de carga", unit: "A", type: "number", default: "500m" },
    { id: "Vdo", label: "Tensión de caída (dropout)", unit: "V", type: "number", default: "2" },
    { id: "Iq", label: "Corriente de reposo Iq", unit: "A", type: "number", default: "5m" },
    { id: "Ta", label: "Temperatura ambiente", unit: "°C", type: "number", default: "40" },
    { id: "Tj", label: "Temperatura máxima de unión", unit: "°C", type: "number", default: "125" },
    { id: "tja", label: "θJA sin disipador", unit: "°C/W", type: "number", default: "50" },
    { id: "tjc", label: "θJC", unit: "°C/W", type: "number", default: "5" },
    { id: "tcs", label: "θCS (pasta térmica)", unit: "°C/W", type: "number", default: "0.5" }
  ],
  example: { values: { Vin: "12", Vout: "5", IL: "500m", Vdo: "2", Iq: "5m", Ta: "40", Tj: "125", tja: "50", tjc: "5", tcs: "0.5" }, expect: ["PD = 3.56 W", "θSA ≤ 18.38 °C/W"], note: "Ejemplo: 7805 desde 12 V con 500 mA." },
  invalid: { values: { Vin: "6", Vout: "5", IL: "500m", Vdo: "2", Iq: "5m", Ta: "40", Tj: "125", tja: "50", tjc: "5", tcs: "0.5" } },
  related: ["zener-regulator", "rectifier-ripple", "led-resistor"]
};

export function solve(input) {
  const Vin = num(input, "Vin", "Tensión de entrada", { positive: true });
  const Vout = num(input, "Vout", "Tensión de salida", { positive: true });
  const IL = num(input, "IL", "Corriente de carga", { nonNegative: true });
  const Vdo = num(input, "Vdo", "Tensión de caída (dropout)", { nonNegative: true });
  const Iq = num(input, "Iq", "Corriente de reposo", { nonNegative: true, default: 0 });
  const Ta = num(input, "Ta", "Temperatura ambiente", { min: -60, max: 150 });
  const Tjmax = num(input, "Tj", "Temperatura máxima de unión", { min: 50, max: 200 });
  const tja = num(input, "tja", "θJA", { positive: true });
  const tjc = num(input, "tjc", "θJC", { nonNegative: true, default: 0 });
  const tcs = num(input, "tcs", "θCS", { nonNegative: true, default: 0 });
  if (Vin < Vout + Vdo) fail(`La tensión de entrada ${fmt(Vin)} V es menor que el mínimo ${fmt(Vout + Vdo)} V (salida + tensión de caída), así que el regulador no regulará.`, "Vin");
  if (Tjmax <= Ta) fail("La temperatura máxima de unión debe ser mayor que la temperatura ambiente.", "Tj");
  const PD = (Vin - Vout) * IL + Vin * Iq;
  const eff = IL > 0 ? (Vout * IL) / (Vin * (IL + Iq)) : 0;
  const TjNoHs = Ta + PD * tja;
  const PDmax = (Tjmax - Ta) / tja;
  const steps = [
    `El margen de tensión de ${fmt(Vin - Vout - Vdo, 4)} V por encima de la caída de tensión permite que el regulador funcione.`,
    { text: "Potencia disipada (diferencia de tensión × corriente + consumo del regulador):", tex: `P_D = (${ntex(Vin)} - ${ntex(Vout)}) \\times ${ntex(IL)} + ${ntex(Vin)} \\times ${ntex(Iq)} = ${ntex(PD, 4)}\\ W` },
    { text: "Eficiencia:", tex: `\\eta = \\frac{${ntex(Vout)} \\times ${ntex(IL)}}{${ntex(Vin)} \\times (${ntex(IL)} + ${ntex(Iq)})} = ${ntex(100 * eff, 4)}\\%` },
    { text: "Temperatura de unión sin disipador:", tex: `T_J = ${ntex(Ta)} + ${ntex(PD, 4)} \\times ${ntex(tja)} = ${ntex(TjNoHs, 4)}^\\circ C` }
  ];
  const results = [
    { label: "Potencia disipada", value: eng(PD, "W", 3), text: `PD = ${eng(PD, "W", 3)}` },
    { label: "Eficiencia", value: `${fmt(100 * eff, 4)}%` },
    { label: "Temperatura de unión sin disipador", value: `${fmt(TjNoHs, 4)} °C` },
    { label: "Potencia máxima sin disipador", value: eng(PDmax, "W", 3) }
  ];
  let copy = `PD = ${eng(PD, "W", 3)}, η = ${fmt(100 * eff, 4)}%, Tj = ${fmt(TjNoHs, 4)} °C`;
  if (TjNoHs > Tjmax) {
    const tsa = (Tjmax - Ta) / PD - tjc - tcs;
    if (tsa <= 0) {
      steps.push("Incluso con un disipador ideal no se puede disipar esta potencia con seguridad; use un regulador conmutado (Buck) o reduzca la tensión de entrada.");
      results.push({ label: "Veredicto", value: "No es posible con un regulador lineal: use un regulador conmutado" });
    } else {
      steps.push({ text: "La temperatura supera el límite, así que necesitamos un disipador cuya resistencia térmica no supere:", tex: `\\theta_{SA} \\le \\frac{${ntex(Tjmax)} - ${ntex(Ta)}}{${ntex(PD, 4)}} - ${ntex(tjc)} - ${ntex(tcs)} = ${ntex(tsa, 4)}^\\circ C/W` });
      results.push({ label: "Veredicto", value: "Necesita disipador térmico" }, { label: "θSA máximo del disipador", value: `${fmt(tsa, 4)} °C/W`, text: `θSA ≤ ${fmt(tsa, 4)} °C/W` });
      copy += `\nθSA ≤ ${fmt(tsa, 4)} °C/W`;
    }
  } else {
    steps.push("La temperatura está dentro del límite, así que no hace falta disipador (se recomienda un margen de seguridad de al menos 20 °C).");
    results.push({ label: "Veredicto", value: TjNoHs > Tjmax - 20 ? "Aceptable, pero cerca del límite" : "No necesita disipador" });
  }
  return { results, steps, copy };
}
