import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "Diseña un regulador zener con resistencia serie: rango permitido de la resistencia, valor estándar elegido, y corriente y potencia del zener en el peor caso al variar la tensión de entrada y la carga.",
  keywords: ["Zener", "zener", "Regulador zener", "Resistencia serie", "Regulación de tensión", "Potencia del zener"],
  formulas: [
    { label: "Resistencia serie máxima (peor caso: mínima entrada y máxima carga)", tex: "R_{s,max} = \\frac{V_{in,min} - V_Z}{I_{L,max} + I_{Z,min}}" },
    { label: "Corriente y potencia máximas en el zener (máxima entrada y mínima carga)", tex: "I_{Z,max} = \\frac{V_{in,max} - V_Z}{R_s} - I_{L,min},\\quad P_Z = V_Z I_{Z,max}" }
  ],
  inputs: [
    { id: "Vmin", label: "Tensión de entrada mínima", unit: "V", type: "number", default: "10" },
    { id: "Vmax", label: "Tensión de entrada máxima", unit: "V", type: "number", default: "14" },
    { id: "Vz", label: "Tensión zener Vz", unit: "V", type: "number", default: "5.1" },
    { id: "ILmax", label: "Corriente de carga máxima", unit: "A", type: "number", default: "50m" },
    { id: "ILmin", label: "Corriente de carga mínima", unit: "A", type: "number", default: "0" },
    { id: "Izmin", label: "Corriente zener mínima para regular", unit: "A", type: "number", default: "5m" },
    { id: "Pz", label: "Potencia nominal del zener (opcional)", unit: "W", type: "number", default: "1" }
  ],
  example: { values: { Vmin: "10", Vmax: "14", Vz: "5.1", ILmax: "50m", ILmin: "0", Izmin: "5m", Pz: "1" }, expect: ["Rs,max = 89.09 Ω", "Rs = 82 Ω"], note: "Ejemplo: regulación de 5.1 V desde una entrada de 10–14 V con carga de hasta 50 mA." },
  invalid: { values: { Vmin: "4", Vmax: "14", Vz: "5.1", ILmax: "50m", Izmin: "5m" } },
  related: ["voltage-regulator", "rectifier-ripple", "led-resistor"]
};

export function solve(input) {
  const Vmin = num(input, "Vmin", "Tensión de entrada mínima", { positive: true });
  const Vmax = num(input, "Vmax", "Tensión de entrada máxima", { positive: true });
  const Vz = num(input, "Vz", "Tensión zener", { positive: true });
  const ILmax = num(input, "ILmax", "Corriente de carga máxima", { nonNegative: true });
  const ILmin = num(input, "ILmin", "Corriente de carga mínima", { nonNegative: true, default: 0 });
  const Izmin = num(input, "Izmin", "Corriente zener mínima", { positive: true });
  const Pz = num(input, "Pz", "Potencia del zener", { optional: true, positive: true });
  if (Vmax < Vmin) fail("La tensión de entrada máxima no debe ser menor que la mínima.", "Vmax");
  if (ILmin > ILmax) fail("La corriente de carga mínima no debe superar la máxima.", "ILmin");
  if (Vmin <= Vz) fail(`La tensión de entrada mínima debe ser mayor que la tensión zener (${fmt(Vz)} V) para mantenerse en regulación.`, "Vmin");
  const RsMax = (Vmin - Vz) / (ILmax + Izmin);
  const Rs = nearest(RsMax, "E12").below;
  const IzMax = (Vmax - Vz) / Rs - ILmin;
  const PzMax = Vz * IzMax;
  const PRs = Math.pow(Vmax - Vz, 2) / Rs;
  const IzAtMin = (Vmin - Vz) / Rs - ILmax;
  const steps = [
    { text: "Peor caso de regulación: mínima tensión de entrada y máxima corriente de carga; el zener debe mantener al menos Iz,min:", tex: `R_{s,max} = \\frac{${ntex(Vmin)} - ${ntex(Vz)}}{${ntex(ILmax)} + ${ntex(Izmin)}} = ${ntex(RsMax, 5)}\\ \\Omega` },
    `Elegimos el valor estándar E12 inmediatamente inferior: $R_s = ${ntex(Rs)}\\ \\Omega$, con lo que en el peor caso la corriente zener es ${eng(IzAtMin, "A", 4)}.`,
    { text: "Peor caso de potencia: máxima tensión de entrada y mínima carga, así que circula la mayor corriente por el zener:", tex: `I_{Z,max} = \\frac{${ntex(Vmax)} - ${ntex(Vz)}}{${ntex(Rs)}} - ${ntex(ILmin)} = ${ntex(IzMax, 5)}\\ A,\\quad P_Z = ${ntex(PzMax, 5)}\\ W` },
    { text: "Potencia en la resistencia serie (peor caso):", tex: `P_{R} = \\frac{(${ntex(Vmax)} - ${ntex(Vz)})^2}{${ntex(Rs)}} = ${ntex(PRs, 5)}\\ W` }
  ];
  const results = [
    { label: "Resistencia serie máxima permitida", value: eng(RsMax, "Ω", 4), text: `Rs,max = ${eng(RsMax, "Ω", 4)}` },
    { label: "Resistencia elegida (E12)", value: eng(Rs, "Ω"), text: `Rs = ${eng(Rs, "Ω")}` },
    { label: "Corriente máxima en el zener", value: eng(IzMax, "A", 4) },
    { label: "Potencia máxima en el zener", value: eng(PzMax, "W", 4) },
    { label: "Potencia máxima en la resistencia", value: eng(PRs, "W", 4) }
  ];
  if (Pz !== null) {
    const ok = PzMax <= Pz;
    results.push({ label: "Veredicto", value: ok ? `Adecuado (${fmt((100 * PzMax) / Pz, 3)}% de la potencia del zener)` : "El zener se quemará: elija un zener de mayor potencia o reduzca el rango de entrada" });
    steps.push(ok ? `La potencia ${fmt(PzMax, 4)} W es menor que la potencia nominal ${fmt(Pz)} W.` : `La potencia ${fmt(PzMax, 4)} W supera la potencia nominal ${fmt(Pz)} W.`);
  }
  return { results, steps, copy: `Rs,max = ${eng(RsMax, "Ω", 4)}, Rs = ${eng(Rs, "Ω")}, Iz,max = ${eng(IzMax, "A", 4)}, Pz = ${eng(PzMax, "W", 4)}` };
}
