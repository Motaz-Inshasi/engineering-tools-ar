import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CATS = [
  { name: "Good", color: "#00e400", fg: "#000000", range: "0 – 50" },
  { name: "Moderate", color: "#ffff00", fg: "#000000", range: "51 – 100" },
  { name: "Unhealthy for Sensitive Groups", color: "#ff7e00", fg: "#000000", range: "101 – 150" },
  { name: "Unhealthy", color: "#ff0000", fg: "#ffffff", range: "151 – 200" },
  { name: "Very Unhealthy", color: "#8f3f97", fg: "#ffffff", range: "201 – 300" },
  { name: "Hazardous", color: "#7e0023", fg: "#ffffff", range: "301 – 500" }
];

const POLLUTANTS = {
  pm25: { name: "PM2.5 (24-hour average)", unit: "µg/m³", digits: 1, rows: [[0, 9.0, 0, 50], [9.1, 35.4, 51, 100], [35.5, 55.4, 101, 150], [55.5, 125.4, 151, 200], [125.5, 225.4, 201, 300], [225.5, 325.4, 301, 500]] },
  pm10: { name: "PM10 (24-hour average)", unit: "µg/m³", digits: 0, rows: [[0, 54, 0, 50], [55, 154, 51, 100], [155, 254, 101, 150], [255, 354, 151, 200], [355, 424, 201, 300], [425, 604, 301, 500]] },
  o3: { name: "Ozone O3 (8-hour average)", unit: "ppm", digits: 3, rows: [[0, 0.054, 0, 50], [0.055, 0.070, 51, 100], [0.071, 0.085, 101, 150], [0.086, 0.105, 151, 200], [0.106, 0.200, 201, 300]] },
  co: { name: "Carbon monoxide CO (8-hour average)", unit: "ppm", digits: 1, rows: [[0, 4.4, 0, 50], [4.5, 9.4, 51, 100], [9.5, 12.4, 101, 150], [12.5, 15.4, 151, 200], [15.5, 30.4, 201, 300], [30.5, 50.4, 301, 500]] },
  no2: { name: "Nitrogen dioxide NO2 (1-hour average)", unit: "ppb", digits: 0, rows: [[0, 53, 0, 50], [54, 100, 51, 100], [101, 360, 101, 150], [361, 649, 151, 200], [650, 1249, 201, 300], [1250, 2049, 301, 500]] },
  so2: { name: "Sulfur dioxide SO2 (1-hour average)", unit: "ppb", digits: 0, rows: [[0, 35, 0, 50], [36, 75, 51, 100], [76, 185, 101, 150], [186, 304, 151, 200], [305, 604, 201, 300], [605, 1004, 301, 500]] }
};

const KEYS = Object.keys(POLLUTANTS);

function truncate(x, digits) {
  const f = 10 ** digits;
  return Math.trunc(x * f + 1e-7) / f;
}

export const meta = {
  description: "Calculate the US Air Quality Index (AQI) for a single pollutant from its concentration, rounding the concentration according to the standard, the health category and its color, and the linear interpolation step by step.",
  keywords: ["Air quality index", "AQI", "EPA", "PM2.5", "PM10", "Ozone", "Nitrogen dioxide", "air quality index"],
  formulas: [
    { label: "Linear interpolation", tex: "I = \\frac{I_{hi}-I_{lo}}{C_{hi}-C_{lo}}\\,(C_p - C_{lo}) + I_{lo}" }
  ],
  inputs: [
    { id: "pollutant", label: "Pollutant", type: "select", default: "pm25", options: [["pm25", "PM2.5 (µg/m³, 24-hour average)"], ["pm10", "PM10 (µg/m³, 24-hour average)"], ["o3", "Ozone O3 (ppm, 8-hour average)"], ["co", "CO (ppm, 8-hour average)"], ["no2", "NO2 (ppb, 1-hour average)"], ["so2", "SO2 (ppb, 1-hour average)"]] },
    { id: "C", label: "Concentration", type: "number", default: "35.4", help: "Enter the concentration in the unit shown for the selected pollutant." }
  ],
  example: { values: { pollutant: "pm25", C: "35.4" }, expect: ["AQI = 100", "Moderate"], note: "Example: PM2.5 at a concentration of 35.4 µg/m³." },
  invalid: { values: { pollutant: "pm25", C: "-1" } },
  related: ["carbon-footprint", "earthquake-magnitude"]
};

export function solve(input) {
  const key = choice(input, "pollutant", "Pollutant", KEYS, "pm25");
  const p = POLLUTANTS[key];
  const raw = num(input, "C", "Concentration", { nonNegative: true });
  const c = truncate(raw, p.digits);
  const idx = p.rows.findIndex(([lo, hi]) => c >= lo && c <= hi);
  const cText = `${fmt(c)} ${p.unit}`;
  const table = {
    type: "table",
    caption: "Air quality index categories",
    head: ["Category", "Index range"],
    rows: CATS.map((cat) => [{ text: cat.name, color: cat.color, fg: cat.fg }, cat.range])
  };
  const steps = [`Concentration after truncation to ${p.digits} decimal places: ${cText}`];
  const blocks = [table];
  if (key === "o3") blocks.push({ type: "note", text: "The ozone table in this tool ends at 0.200 ppm for the 8-hour average.", tone: "warn" });
  if (idx < 0) {
    const out = "Off scale (above 500)";
    steps.push(`Concentration ${cText} is above the last limit in the table, so the index is not calculated.`);
    return {
      results: [
        { label: "Air Quality Index (AQI)", value: out, text: out },
        { label: "Pollutant", value: p.name },
        { label: "Concentration after truncation", value: cText }
      ],
      steps,
      copy: `${p.name} at ${cText}: ${out}`,
      blocks,
      values: { I: null, category: null, c }
    };
  }
  const [clo, chi, ilo, ihi] = p.rows[idx];
  const cat = CATS[idx];
  const exact = (ihi - ilo) / (chi - clo) * (c - clo) + ilo;
  const I = Math.round(exact);
  steps.push({ text: "Applicable concentration range:", tex: `${ntex(clo)} \\le C_p \\le ${ntex(chi)}` });
  steps.push({ text: "Linear interpolation:", tex: `I = \\frac{${ntex(ihi)} - ${ntex(ilo)}}{${ntex(chi)} - ${ntex(clo)}}\\left(${ntex(c)} - ${ntex(clo)}\\right) + ${ntex(ilo)} = ${ntex(exact, 6)}` });
  steps.push({ text: "Round the index to the nearest integer:", tex: `AQI = ${I}` });
  return {
    results: [
      { label: "Air Quality Index (AQI)", value: String(I), text: `AQI = ${I}` },
      { label: "Health category", value: cat.name },
      { label: "Pollutant", value: p.name },
      { label: "Concentration after truncation", value: cText }
    ],
    steps,
    copy: `AQI = ${I} (${cat.name}) for ${p.name} at ${cText}`,
    blocks,
    values: { I, category: cat.name, c }
  };
}
