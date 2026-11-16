import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CATS = [
  { name: "Buena", color: "#00e400", fg: "#000000", range: "0 – 50" },
  { name: "Moderada", color: "#ffff00", fg: "#000000", range: "51 – 100" },
  { name: "Insalubre para grupos sensibles", color: "#ff7e00", fg: "#000000", range: "101 – 150" },
  { name: "Insalubre", color: "#ff0000", fg: "#ffffff", range: "151 – 200" },
  { name: "Muy insalubre", color: "#8f3f97", fg: "#ffffff", range: "201 – 300" },
  { name: "Peligrosa", color: "#7e0023", fg: "#ffffff", range: "301 – 500" }
];

const POLLUTANTS = {
  pm25: { name: "PM2.5 (promedio de 24 horas)", unit: "µg/m³", digits: 1, rows: [[0, 9.0, 0, 50], [9.1, 35.4, 51, 100], [35.5, 55.4, 101, 150], [55.5, 125.4, 151, 200], [125.5, 225.4, 201, 300], [225.5, 325.4, 301, 500]] },
  pm10: { name: "PM10 (promedio de 24 horas)", unit: "µg/m³", digits: 0, rows: [[0, 54, 0, 50], [55, 154, 51, 100], [155, 254, 101, 150], [255, 354, 151, 200], [355, 424, 201, 300], [425, 604, 301, 500]] },
  o3: { name: "Ozono O3 (promedio de 8 horas)", unit: "ppm", digits: 3, rows: [[0, 0.054, 0, 50], [0.055, 0.070, 51, 100], [0.071, 0.085, 101, 150], [0.086, 0.105, 151, 200], [0.106, 0.200, 201, 300]] },
  co: { name: "Monóxido de carbono CO (promedio de 8 horas)", unit: "ppm", digits: 1, rows: [[0, 4.4, 0, 50], [4.5, 9.4, 51, 100], [9.5, 12.4, 101, 150], [12.5, 15.4, 151, 200], [15.5, 30.4, 201, 300], [30.5, 50.4, 301, 500]] },
  no2: { name: "Dióxido de nitrógeno NO2 (horario)", unit: "ppb", digits: 0, rows: [[0, 53, 0, 50], [54, 100, 51, 100], [101, 360, 101, 150], [361, 649, 151, 200], [650, 1249, 201, 300], [1250, 2049, 301, 500]] },
  so2: { name: "Dióxido de azufre SO2 (horario)", unit: "ppb", digits: 0, rows: [[0, 35, 0, 50], [36, 75, 51, 100], [76, 185, 101, 150], [186, 304, 151, 200], [305, 604, 201, 300], [605, 1004, 301, 500]] }
};

const KEYS = Object.keys(POLLUTANTS);

function truncate(x, digits) {
  const f = 10 ** digits;
  return Math.trunc(x * f + 1e-7) / f;
}

export const meta = {
  description: "Calcule el índice de calidad del aire de EE. UU. (AQI) para un solo contaminante a partir de su concentración, redondeando la concentración según el estándar, la categoría de salud y su color, con interpolación lineal paso a paso.",
  keywords: ["Índice de calidad del aire", "AQI", "EPA", "PM2.5", "PM10", "Ozono", "Dióxido de nitrógeno", "air quality index"],
  formulas: [
    { label: "Interpolación lineal", tex: "I = \\frac{I_{hi}-I_{lo}}{C_{hi}-C_{lo}}\\,(C_p - C_{lo}) + I_{lo}" }
  ],
  inputs: [
    { id: "pollutant", label: "Contaminante", type: "select", default: "pm25", options: [["pm25", "PM2.5 (µg/m³, promedio de 24 horas)"], ["pm10", "PM10 (µg/m³, promedio de 24 horas)"], ["o3", "Ozono O3 (ppm, promedio de 8 horas)"], ["co", "CO (ppm, promedio de 8 horas)"], ["no2", "NO2 (ppb, promedio horario)"], ["so2", "SO2 (ppb, promedio horario)"]] },
    { id: "C", label: "Concentración", type: "number", default: "35.4", help: "Introduzca la concentración en la unidad indicada para el contaminante elegido." }
  ],
  example: { values: { pollutant: "pm25", C: "35.4" }, expect: ["AQI = 100", "Moderada"], note: "Ejemplo: PM2.5 con una concentración de 35.4 µg/m³." },
  invalid: { values: { pollutant: "pm25", C: "-1" } },
  related: ["carbon-footprint", "earthquake-magnitude"]
};

export function solve(input) {
  const key = choice(input, "pollutant", "Contaminante", KEYS, "pm25");
  const p = POLLUTANTS[key];
  const raw = num(input, "C", "Concentración", { nonNegative: true });
  const c = truncate(raw, p.digits);
  const idx = p.rows.findIndex(([lo, hi]) => c >= lo && c <= hi);
  const cText = `${fmt(c)} ${p.unit}`;
  const table = {
    type: "table",
    caption: "Categorías del índice de calidad del aire",
    head: ["Categoría", "Rango del índice"],
    rows: CATS.map((cat) => [{ text: cat.name, color: cat.color, fg: cat.fg }, cat.range])
  };
  const steps = [`Concentración redondeada a ${p.digits} decimales: ${cText}`];
  const blocks = [table];
  if (key === "o3") blocks.push({ type: "note", text: "La tabla de ozono de esta herramienta termina en 0.200 ppm para el promedio de 8 horas.", tone: "warn" });
  if (idx < 0) {
    const out = "Fuera de escala (más de 500)";
    steps.push(`La concentración ${cText} supera el último límite de la tabla, por lo que no se calcula el índice.`);
    return {
      results: [
        { label: "Índice de calidad del aire AQI", value: out, text: out },
        { label: "Contaminante", value: p.name },
        { label: "Concentración redondeada", value: cText }
      ],
      steps,
      copy: `${p.name} a ${cText}: ${out}`,
      blocks,
      values: { I: null, category: null, c }
    };
  }
  const [clo, chi, ilo, ihi] = p.rows[idx];
  const cat = CATS[idx];
  const exact = (ihi - ilo) / (chi - clo) * (c - clo) + ilo;
  const I = Math.round(exact);
  steps.push({ text: "Intervalo de concentración correspondiente:", tex: `${ntex(clo)} \\le C_p \\le ${ntex(chi)}` });
  steps.push({ text: "Interpolación lineal:", tex: `I = \\frac{${ntex(ihi)} - ${ntex(ilo)}}{${ntex(chi)} - ${ntex(clo)}}\\left(${ntex(c)} - ${ntex(clo)}\\right) + ${ntex(ilo)} = ${ntex(exact, 6)}` });
  steps.push({ text: "Redondeo del índice al entero más cercano:", tex: `AQI = ${I}` });
  return {
    results: [
      { label: "Índice de calidad del aire AQI", value: String(I), text: `AQI = ${I}` },
      { label: "Categoría de salud", value: cat.name },
      { label: "Contaminante", value: p.name },
      { label: "Concentración redondeada", value: cText }
    ],
    steps,
    copy: `AQI = ${I} (${cat.name}) para ${p.name} a ${cText}`,
    blocks,
    values: { I, category: cat.name, c }
  };
}
