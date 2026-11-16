import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "Solo con fines educativos y de formación. No sustituye al médico, al farmacéutico ni al protocolo aprobado de su institución." };

export const meta = {
  description: "Calcula la velocidad de perfusión intravenosa en mililitros por hora y el número de gotas por minuto para un factor de goteo del equipo dado, con el valor exacto y el valor redondeado a la gota entera más próxima.",
  keywords: ["goteo intravenoso", "número de gotas", "gtt/min", "velocidad de infusión", "IV drip rate", "drop factor", "mL/h"],
  formulas: [
    { label: "Caudal", tex: "R = \\frac{V}{T}" },
    { label: "Gotas por minuto", tex: "N = \\frac{R \\times DF}{60}" }
  ],
  inputs: [
    { id: "volume", label: "Volumen de la solución", unit: "mL", type: "number", default: "1000" },
    { id: "hours", label: "Duración en horas", unit: "h", type: "number", default: "8", help: "Entero de 0 a 999." },
    { id: "minutes", label: "Duración en minutos", unit: "min", type: "number", default: "0", help: "Entero de 0 a 59." },
    { id: "dropFactor", label: "Factor de goteo del equipo", unit: "gtt/mL", type: "select", default: "20", options: [["10", "10 gotas/mL"], ["15", "15 gotas/mL"], ["20", "20 gotas/mL"], ["60", "60 gotas/mL (microgoteo)"]] }
  ],
  example: { values: { volume: "1000", hours: "8", minutes: "0", dropFactor: "15" }, expect: ["125 mL/h", "31 gtt/min"], note: "Ejemplo: 1000 mL administrados en 8 horas con un equipo de 15 gotas/mL." },
  invalid: { values: { volume: "1000", hours: "0", minutes: "0", dropFactor: "15" } },
  related: ["drug-dosage", "fluid-requirements", "bmi-bsa", "creatinine-clearance", "lab-units"]
};

export function solve(input) {
  const V = num(input, "volume", "Volumen de la solución", { positive: true });
  const hours = num(input, "hours", "Duración en horas", { integer: true, min: 0, max: 999 });
  const minutes = num(input, "minutes", "Duración en minutos", { integer: true, min: 0, max: 59 });
  const DF = Number(choice(input, "dropFactor", "Factor de goteo del equipo", ["10", "15", "20", "60"], "20"));
  const T = hours * 60 + minutes;
  if (T <= 0) fail("Introduce una duración mayor que cero (horas o minutos).", "hours");
  const rate = V * 60 / T;
  const exactDrops = rate * DF / 60;
  const drops = Math.round(exactDrops);
  const steps = [
    { text: "Duración total en minutos:", tex: `T = ${ntex(hours)} \\times 60 + ${ntex(minutes)} = ${ntex(T)}\\ min` },
    { text: "Caudal en mililitros por hora:", tex: `R = \\frac{${ntex(V)}}{${ntex(T / 60, 6)}} = ${ntex(rate, 6)}\\ mL/h` },
    { text: "Gotas por minuto (valor exacto):", tex: `N = \\frac{${ntex(rate, 6)} \\times ${DF}}{60} = ${ntex(exactDrops, 6)}\\ gtt/min` },
    { text: "Redondeamos a la gota entera más próxima:", tex: `N \\approx ${drops}\\ gtt/min` }
  ];
  const blocks = [NOTE];
  if (drops === 0) blocks.unshift({ type: "note", tone: "warn", text: "Tras el redondeo, el ritmo es menor que una gota por minuto, así que no puede ajustarse con este equipo. Usa un equipo con mayor factor de goteo o una bomba de infusión." });
  return {
    results: [
      { label: "Caudal", value: `${fmt(rate, 6)} mL/h`, text: `${fmt(rate, 6)} mL/h` },
      { label: "Gotas por minuto (exacto)", value: `${fmt(exactDrops, 6)} gtt/min` },
      { label: "Gotas por minuto (redondeado)", value: `${drops} gtt/min`, text: `${drops} gtt/min` }
    ],
    steps,
    blocks,
    copy: `Caudal ${fmt(rate, 6)} mL/h, y las gotas ${fmt(exactDrops, 6)} se redondean a ${drops} gtt/min`
  };
}
