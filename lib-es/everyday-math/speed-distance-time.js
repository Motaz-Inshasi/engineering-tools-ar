import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const KMH_FACTOR = { kmh: 1, ms: 3.6, mph: 1.609344 };
const provided = (v) => !isBlank(v);

const hourWord = (h) => (h === 1 ? "una hora" : h === 2 ? "dos horas" : h <= 10 ? `${h} horas` : `${h} horas`);
const minWord = (m) => (m === 1 ? "1 minuto" : m === 2 ? "dos minutos" : m <= 10 ? `${m} minutos` : `${m} minutos`);

const hm = (h) => {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  const parts = [];
  if (hh > 0) parts.push(hourWord(hh));
  if (mm > 0) parts.push(minWord(mm));
  return parts.length ? parts.join(" y ") : "0 minutos";
};

const readTime = (input, timeMode) => {
  if (timeMode === "decimal") return num(input, "time", "Tiempo", { positive: true });
  const h = num(input, "timeH", "Horas", { integer: true, nonNegative: true, default: 0 });
  const m = num(input, "timeM", "Minutos", { integer: true, min: 0, max: 59, default: 0 });
  const total = h + m / 60;
  if (!(total > 0)) fail("El tiempo debe ser mayor que cero.", "timeH");
  return total;
};

const solveTriple = (input) => {
  const unit = choice(input, "speedUnit", "Unidad de velocidad", ["kmh", "ms", "mph"], "kmh");
  const timeMode = choice(input, "timeMode", "Formato del tiempo", ["decimal", "hm"], "decimal");
  const hasSpeed = provided(input.speed);
  const hasDistance = provided(input.distance);
  const hasTime = timeMode === "decimal" ? provided(input.time) : provided(input.timeH) || provided(input.timeM);
  const count = [hasSpeed, hasDistance, hasTime].filter(Boolean).length;
  if (count !== 2) {
    const field = !hasSpeed ? "speed" : !hasDistance ? "distance" : "time";
    fail("Introduzca exactamente dos valores de velocidad, distancia y tiempo, y deje vacío el tercero.", field);
  }
  const speed = hasSpeed ? num(input, "speed", "Velocidad", { positive: true }) * KMH_FACTOR[unit] : null;
  const distance = hasDistance ? num(input, "distance", "distancia", { positive: true }) : null;
  const time = hasTime ? readTime(input, timeMode) : null;

  let v = speed;
  let d = distance;
  let t = time;
  if (v === null) v = d / t;
  else if (d === null) d = v * t;
  else t = d / v;

  const steps = [];
  if (speed === null) steps.push({ text: "Velocidad = distancia ÷ tiempo:", tex: `v = \\frac{${ntex(d)}}{${ntex(t, 6)}} = ${ntex(v, 6)}\\ \\text{km/h}` });
  else if (distance === null) steps.push({ text: "Distancia = velocidad × tiempo:", tex: `d = ${ntex(v, 6)} \\times ${ntex(t, 6)} = ${ntex(d, 6)}\\ \\text{km}` });
  else steps.push({ text: "Tiempo = distancia ÷ velocidad:", tex: `t = \\frac{${ntex(d, 6)}}{${ntex(v, 6)}} = ${ntex(t, 6)}\\ \\text{h}` });
  steps.push({ text: "Conversión de la velocidad a las tres unidades:", tex: `${ntex(v, 6)}\\ \\text{km/h} = ${ntex(v / 3.6, 6)}\\ \\text{m/s} = ${ntex(v / KMH_FACTOR.mph, 6)}\\ \\text{mph}` });

  return {
    results: [
      { label: "Velocidad en kilómetros por hora", value: `${fmt(v, 6)} km/h` },
      { label: "Velocidad en metros por segundo", value: `${fmt(v / 3.6, 6)} m/s` },
      { label: "Velocidad en millas por hora", value: `${fmt(v / KMH_FACTOR.mph, 6)} mi/h` },
      { label: "distancia", value: `${fmt(d, 6)} km` },
      { label: "Tiempo", value: hm(t) },
      { label: "Tiempo en horas decimales", value: `${fmt(t, 6)} horas` }
    ],
    steps,
    copy: `Velocidad: ${fmt(v, 6)} km/h; distancia: ${fmt(d, 6)} km; tiempo: ${hm(t)}`
  };
};

const average = (input) => {
  const legMode = choice(input, "legMode", "Datos de los dos tramos", ["speeds", "times"], "speeds");
  const d1 = num(input, "d1", "Distancia del primer tramo", { positive: true });
  const d2 = num(input, "d2", "Distancia del segundo tramo", { positive: true });
  let t1, t2, v1 = null, v2 = null;
  if (legMode === "speeds") {
    v1 = num(input, "v1", "Velocidad del primer tramo", { positive: true });
    v2 = num(input, "v2", "Velocidad del segundo tramo", { positive: true });
    t1 = d1 / v1;
    t2 = d2 / v2;
  } else {
    t1 = num(input, "t1", "Tiempo del primer tramo", { positive: true });
    t2 = num(input, "t2", "Tiempo del segundo tramo", { positive: true });
  }
  const D = d1 + d2;
  const T = t1 + t2;
  const avg = D / T;
  const equalLegs = legMode === "speeds" && Math.abs(d1 - d2) < 1e-12;
  const harmonic = equalLegs ? (2 * v1 * v2) / (v1 + v2) : null;

  const steps = [];
  if (legMode === "speeds") {
    steps.push({ text: "Tiempo de cada tramo = distancia ÷ velocidad:", tex: `t_1 = \\frac{${ntex(d1)}}{${ntex(v1)}} = ${ntex(t1, 6)},\\qquad t_2 = \\frac{${ntex(d2)}}{${ntex(v2)}} = ${ntex(t2, 6)}` });
  }
  steps.push({ text: "Velocidad media = distancia total ÷ tiempo total (y no la media de las dos velocidades):", tex: `\\bar{v} = \\frac{d_1 + d_2}{t_1 + t_2} = \\frac{${ntex(D)}}{${ntex(T, 6)}} = ${ntex(avg, 6)}\\ \\text{km/h}` });
  if (equalLegs) steps.push({ text: "Para distancias iguales, la media es la media armónica de las dos velocidades:", tex: `\\bar{v} = \\frac{2 v_1 v_2}{v_1 + v_2} = ${ntex(harmonic, 6)}\\ \\text{km/h}` });

  const results = [
    { label: "Velocidad media", value: `${fmt(avg, 6)} km/h` },
    { label: "Distancia total", value: `${fmt(D, 6)} km` },
    { label: "Tiempo total", value: hm(T) }
  ];
  if (harmonic !== null) results.push({ label: "Media armónica de las dos velocidades", value: `${fmt(harmonic, 6)} km/h` });

  const blocks = [];
  if (legMode === "speeds") {
    blocks.push({ type: "note", text: "Al recorrer dos distancias a velocidades diferentes, la media correcta es la media armónica (o ponderada por distancia) y no la media aritmética (v1 + v2) / 2." });
  }

  return {
    results,
    steps,
    copy: `Velocidad media: ${fmt(avg, 6)} km/h; distancia total: ${fmt(D, 6)} km; tiempo total: ${hm(T)}`,
    blocks
  };
};

export const meta = {
  description: "Calcule la velocidad, la distancia o el tiempo cuando conozca dos de ellos, con conversión entre km/h, m/s y mph, y la velocidad media de dos tramos por media armónica o distancia total entre tiempo total.",
  keywords: ["velocidad", "distancia", "tiempo", "Velocidad media", "media armónica", "speed distance time", "km/h"],
  formulas: [
    { label: "Relación básica", tex: "d = v \\times t" },
    { label: "Velocidad media de dos tramos de igual distancia", tex: "\\bar{v} = \\frac{2 v_1 v_2}{v_1 + v_2}" },
    { label: "Velocidad media general", tex: "\\bar{v} = \\frac{d_1 + d_2}{t_1 + t_2}" }
  ],
  inputs: [
    { id: "mode", label: "Tipo de cálculo", type: "select", default: "solve", options: [["solve", "Calcular la incógnita a partir de dos valores"], ["average", "Velocidad media de dos tramos"]] },
    { id: "speed", label: "Velocidad", type: "number", default: "80", when: { mode: ["solve"] }, help: "Déjelo vacío si es la incógnita." },
    { id: "speedUnit", label: "Unidad de velocidad", type: "select", default: "kmh", options: [["kmh", "km/h"], ["ms", "metros por segundo"], ["mph", "millas por hora"]], when: { mode: ["solve"] } },
    { id: "distance", label: "distancia", unit: "km", type: "number", default: "120", when: { mode: ["solve"] }, help: "Déjelo vacío si es la incógnita." },
    { id: "timeMode", label: "Formato del tiempo", type: "select", default: "decimal", options: [["decimal", "horas decimales"], ["hm", "horas y minutos"]], when: { mode: ["solve"] } },
    { id: "time", label: "Tiempo", unit: "hora", type: "number", default: "", when: { mode: ["solve"], timeMode: ["decimal"] } },
    { id: "timeH", label: "Horas", type: "number", default: "", when: { mode: ["solve"], timeMode: ["hm"] } },
    { id: "timeM", label: "Minutos", type: "number", default: "", when: { mode: ["solve"], timeMode: ["hm"] } },
    { id: "legMode", label: "Datos de los dos tramos", type: "select", default: "speeds", options: [["speeds", "Distancia y velocidad de cada tramo"], ["times", "Distancia y tiempo de cada tramo"]], when: { mode: ["average"] } },
    { id: "d1", label: "Distancia del primer tramo", unit: "km", type: "number", default: "60", when: { mode: ["average"] } },
    { id: "v1", label: "Velocidad del primer tramo", unit: "km/h", type: "number", default: "60", when: { mode: ["average"], legMode: ["speeds"] } },
    { id: "t1", label: "Tiempo del primer tramo", unit: "hora", type: "number", default: "1", when: { mode: ["average"], legMode: ["times"] } },
    { id: "d2", label: "Distancia del segundo tramo", unit: "km", type: "number", default: "60", when: { mode: ["average"] } },
    { id: "v2", label: "Velocidad del segundo tramo", unit: "km/h", type: "number", default: "30", when: { mode: ["average"], legMode: ["speeds"] } },
    { id: "t2", label: "Tiempo del segundo tramo", unit: "hora", type: "number", default: "2", when: { mode: ["average"], legMode: ["times"] } }
  ],
  example: {
    values: { mode: "solve", speed: "80", speedUnit: "kmh", distance: "120", timeMode: "decimal", time: "", timeH: "", timeM: "", legMode: "speeds", d1: "60", v1: "60", t1: "1", d2: "60", v2: "30", t2: "2" },
    expect: ["una hora y 30 minutos"],
    note: "Ejemplo: distancia de 120 km a una velocidad de 80 km/h; tarda una hora y 30 minutos."
  },
  invalid: { values: { mode: "solve", speed: "80", speedUnit: "kmh", distance: "120", timeMode: "decimal", time: "1.5", timeH: "", timeM: "", legMode: "speeds", d1: "60", v1: "60", t1: "1", d2: "60", v2: "30", t2: "2" } },
  related: ["unit-converter", "fuel-cost", "discount-tax"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Tipo de cálculo", ["solve", "average"], "solve");
  return mode === "average" ? average(input) : solveTriple(input);
}
