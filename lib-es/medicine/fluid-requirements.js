import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "Solo con fines educativos y de formación. No sustituye al médico, al farmacéutico ni al protocolo aprobado de su institución." };

function maintenance(w) {
  const b1 = Math.min(w, 10);
  const b2 = Math.min(Math.max(w - 10, 0), 10);
  const b3 = Math.max(w - 20, 0);
  const daily = b1 * 100 + b2 * 50 + b3 * 20;
  const hourly = b1 * 4 + b2 * 2 + b3 * 1;
  const steps = [
    { text: "Primeros 10 kg a razón de 100 mL por kg al día:", tex: `${ntex(b1)} \\times 100 = ${ntex(b1 * 100)}\\ mL` },
    { text: "Los 10 kg siguientes a razón de 50 mL por kg al día:", tex: `${ntex(b2)} \\times 50 = ${ntex(b2 * 50)}\\ mL` },
    { text: "Por encima de 20 kg a razón de 20 mL por kg al día:", tex: `${ntex(b3)} \\times 20 = ${ntex(b3 * 20)}\\ mL` },
    { text: "Necesidad diaria total:", tex: `${ntex(b1 * 100)} + ${ntex(b2 * 50)} + ${ntex(b3 * 20)} = ${ntex(daily)}\\ mL/day` },
    { text: "Ritmo horario según la regla 4-2-1:", tex: `4 \\times ${ntex(b1)} + 2 \\times ${ntex(b2)} + 1 \\times ${ntex(b3)} = ${ntex(hourly)}\\ mL/h` }
  ];
  return {
    daily,
    hourly,
    steps,
    results: [
      { label: "Necesidad diaria", value: `${fmt(daily)} mL/day`, text: `${fmt(daily)} mL/day` },
      { label: "Ritmo horario (4-2-1)", value: `${fmt(hourly)} mL/h`, text: `${fmt(hourly)} mL/h` }
    ],
    table: {
      caption: "Tramos de necesidad de mantenimiento (Holliday-Segar)",
      head: ["Tramo", "Peso (kg)", "mL/kg/day", "mL/day", "mL/kg/h", "mL/h"],
      rows: [
        ["Primeros 10 kg", fmt(b1), "100", fmt(b1 * 100), "4", fmt(b1 * 4)],
        ["De 11 a 20 kg", fmt(b2), "50", fmt(b2 * 50), "2", fmt(b2 * 2)],
        ["Más de 20 kg", fmt(b3), "20", fmt(b3 * 20), "1", fmt(b3)]
      ]
    },
    copy: `Necesidad diaria ${fmt(daily)} mL/día, es decir, ${fmt(hourly)} mL/h (regla 4-2-1)`
  };
}

function parkland(w, burn) {
  const total = 4 * w * burn;
  const half = total / 2;
  const r1 = half / 8;
  const r2 = half / 16;
  const steps = [
    { text: "Volumen de solución en 24 horas según la fórmula de Parkland:", tex: `V = 4 \\times ${ntex(w)} \\times ${ntex(burn)} = ${ntex(total)}\\ mL` },
    { text: "La mitad del volumen se administra en las primeras 8 horas:", tex: `\\frac{${ntex(total)}}{2} = ${ntex(half)}\\ mL` },
    { text: "Ritmo de las primeras 8 horas:", tex: `\\frac{${ntex(half)}}{8} = ${ntex(r1, 6)}\\ mL/h` },
    { text: "La segunda mitad se administra en las 16 horas siguientes:", tex: `\\frac{${ntex(half)}}{16} = ${ntex(r2, 6)}\\ mL/h` }
  ];
  return {
    total,
    r1,
    r2,
    steps,
    results: [
      { label: "Total de 24 horas", value: `${fmt(total)} mL`, text: `${fmt(total)} mL` },
      { label: "Ritmo de las primeras 8 horas", value: `${fmt(r1)} mL/h`, text: `${fmt(r1)} mL/h` },
      { label: "Ritmo de las 16 horas siguientes", value: `${fmt(r2)} mL/h`, text: `${fmt(r2)} mL/h` }
    ],
    table: {
      caption: "Tabla de ritmos de Parkland",
      head: ["Periodo", "Volumen (mL)", "Ritmo (mL/h)"],
      rows: [
        ["Primeras 8 horas desde el momento de la quemadura", fmt(half), fmt(r1)],
        ["Las 16 horas siguientes", fmt(half), fmt(r2)]
      ]
    },
    copy: `Parkland: ${fmt(total)} mL en 24 horas, primeras 8 horas a ${fmt(r1)} mL/h y después ${fmt(r2)} mL/h durante 16 horas`
  };
}

export const meta = {
  description: "Calcula la necesidad diaria de líquidos en niños y adultos (Holliday-Segar, con ritmo horario 4-2-1) o el volumen de reanimación en quemaduras (Parkland), con los ritmos de las primeras 8 horas y de las 16 siguientes.",
  keywords: ["necesidades de líquidos", "Holliday-Segar", "regla 4-2-1", "Parkland", "Parkland", "quemaduras", "mantenimiento", "fluid requirements"],
  formulas: [
    { label: "Necesidad diaria de mantenimiento", tex: "V = 100W\\ (W\\le10),\\quad 1000 + 50(W-10)\\ (10<W\\le20),\\quad 1500 + 20(W-20)" },
    { label: "Fórmula de Parkland", tex: "V_{24} = 4 \\times W \\times \\%TBSA" }
  ],
  inputs: [
    { id: "mode", label: "Tipo de cálculo", type: "select", default: "maintenance", options: [["maintenance", "Necesidad de mantenimiento (Holliday-Segar)"], ["parkland", "Reanimación en quemaduras (Parkland)"]] },
    { id: "weight", label: "Peso", unit: "kg", type: "number", default: "70" },
    { id: "burn", label: "Porcentaje de superficie corporal quemada", unit: "%TBSA", type: "number", default: "20", help: "De 1 a 100.", when: { mode: ["parkland"] } }
  ],
  example: { values: { mode: "maintenance", weight: "70", burn: "" }, expect: ["2500 mL/day", "110 mL/h"], note: "Ejemplo: paciente de 70 kg en modo de mantenimiento." },
  invalid: { values: { mode: "parkland", weight: "70", burn: "0" } },
  related: ["iv-drip-rate", "drug-dosage", "bmi-bsa", "creatinine-clearance", "lab-units"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Tipo de cálculo", ["maintenance", "parkland"], "maintenance");
  const w = num(input, "weight", "Peso", { positive: true, max: 300 });
  const out = mode === "parkland"
    ? parkland(w, num(input, "burn", "porcentaje de quemadura", { min: 1, max: 100 }))
    : maintenance(w);
  return {
    results: out.results,
    steps: out.steps,
    blocks: [NOTE, { type: "table", caption: out.table.caption, head: out.table.head, rows: out.table.rows }],
    copy: out.copy
  };
}
