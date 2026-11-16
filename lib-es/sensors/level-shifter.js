import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "Diseñe un divisor de tensión para reducir el nivel de una señal lógica (por ejemplo de 5 V a 3.3 V): la resistencia normalizada, la tensión real y la corriente, y la frecuencia máxima de la señal por la capacidad de entrada del receptor.",
  keywords: ["Conversión de nivel", "level shifter", "Divisor de tensión", "5 V a 3.3 V", "UART", "Arduino", "ESP32", "Raspberry Pi"],
  formulas: [
    { label: "Selección de R2", tex: "V_{out} = V_{in}\\frac{R_2}{R_1 + R_2} \\Rightarrow R_2 = R_1\\frac{V_{out}}{V_{in} - V_{out}}" },
    { label: "Velocidad del flanco", tex: "\\tau = (R_1 \\parallel R_2)\\,C_{in},\\qquad f_{max} \\approx \\frac{1}{10\\,\\tau}" }
  ],
  inputs: [
    { id: "Vin", label: "Tensión de la señal alta", unit: "V", type: "number", default: "5" },
    { id: "Vout", label: "Tensión requerida", unit: "V", type: "number", default: "3.3" },
    { id: "R1", label: "R1 (superior)", unit: "Ω", type: "number", default: "1k" },
    { id: "series", label: "Serie normalizada de R2", type: "select", default: "E24", options: [["E12", "E12"], ["E24", "E24"], ["E96", "E96"]] },
    { id: "Vmax", label: "Tensión máxima que soporta la entrada receptora", unit: "V", type: "number", default: "3.6" },
    { id: "Cin", label: "Capacidad de entrada del receptor (opcional)", unit: "F", type: "number", default: "10p" }
  ],
  example: { values: { Vin: "5", Vout: "3.3", R1: "1k", series: "E24", Vmax: "3.6", Cin: "10p" }, expect: ["R2 = 2 kΩ", "Vout = 3.333 V"], note: "Ejemplo: reducir una señal de 5 V a 3.3 V con una resistencia superior de 1 kΩ." },
  invalid: { values: { Vin: "3.3", Vout: "5", R1: "1k", series: "E24" } },
  related: ["voltage-current-divider", "sensor-divider", "logic-gates"]
};

export function solve(input) {
  const Vin = num(input, "Vin", "Tensión de la señal", { positive: true });
  const Vt = num(input, "Vout", "Tensión requerida", { positive: true });
  const R1 = num(input, "R1", "R1", { positive: true });
  const series = choice(input, "series", "Serie", ["E12", "E24", "E96"], "E24");
  const Vmax = num(input, "Vmax", "Tensión máxima", { optional: true, positive: true });
  const Cin = num(input, "Cin", "Capacidad de entrada", { optional: true, positive: true });
  if (Vt >= Vin) fail("El divisor solo reduce la tensión; la tensión requerida debe ser menor que la de la señal. Para elevarla use un circuito con transistor o un chip conversor de nivel.", "Vout");
  const R2exact = (R1 * Vt) / (Vin - Vt);
  const cand = nearest(R2exact, series);
  let R2 = cand.closest;
  let Vact = (Vin * R2) / (R1 + R2);
  let note = "";
  if (Vmax !== null && Vact > Vmax && cand.below) {
    R2 = cand.below;
    Vact = (Vin * R2) / (R1 + R2);
    note = `El valor más próximo daba una tensión por encima del límite seguro de ${fmt(Vmax)} V, así que elegimos el valor inferior ${eng(R2, "Ω")}.`;
  }
  const I = Vin / (R1 + R2);
  const steps = [
    { text: "Valor calculado de R2:", tex: `R_2 = ${ntex(R1)} \\times \\frac{${ntex(Vt)}}{${ntex(Vin)} - ${ntex(Vt)}} = ${ntex(R2exact, 5)}\\ \\Omega` },
    `Valor normalizado más próximo ${series}: ${eng(R2, "Ω")}. ${note}`,
    { text: "Tensión real y corriente en el estado alto:", tex: `V_{out} = ${ntex(Vin)}\\frac{${ntex(R2)}}{${ntex(R1)} + ${ntex(R2)}} = ${ntex(Vact, 5)}\\ V,\\quad I = ${ntex(I, 4)}\\ A` }
  ];
  const results = [
    { label: "R2 calculada", value: eng(R2exact, "Ω", 4) },
    { label: `R2 normalizada (${series})`, value: eng(R2, "Ω"), text: `R2 = ${eng(R2, "Ω")}` },
    { label: "Tensión real", value: eng(Vact, "V", 4), text: `Vout = ${eng(Vact, "V", 4)}` },
    { label: "Error respecto a lo requerido", value: `${fmt((100 * (Vact - Vt)) / Vt, 3)}%` },
    { label: "Corriente consumida", value: eng(I, "A", 4) }
  ];
  if (Cin !== null) {
    const tau = ((R1 * R2) / (R1 + R2)) * Cin;
    const fmax = 1 / (10 * tau);
    steps.push({ text: "La capacidad de entrada del receptor ralentiza los flancos:", tex: `\\tau = (R_1 \\parallel R_2) C_{in} = ${ntex(tau, 4)}\\ s,\\quad f_{max} \\approx \\frac{1}{10\\tau} = ${ntex(fmax, 4)}\\ Hz` });
    results.push({ label: "Frecuencia máxima aproximada de la señal", value: eng(fmax, "Hz", 3) });
  }
  steps.push("Este divisor sirve para señales unidireccionales (por ejemplo de TX a RX). Para líneas bidireccionales como I²C use un conversor de nivel con transistor MOSFET.");
  return { results, steps, copy: `R2 = ${eng(R2, "Ω")}, Vout = ${eng(Vact, "V", 4)}, I = ${eng(I, "A", 4)}` };
}
