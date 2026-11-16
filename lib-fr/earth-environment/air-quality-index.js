import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CATS = [
  { name: "Bon", color: "#00e400", fg: "#000000", range: "0 – 50" },
  { name: "Modéré", color: "#ffff00", fg: "#000000", range: "51 – 100" },
  { name: "Mauvais pour les groupes sensibles", color: "#ff7e00", fg: "#000000", range: "101 – 150" },
  { name: "Mauvais", color: "#ff0000", fg: "#ffffff", range: "151 – 200" },
  { name: "Très mauvais", color: "#8f3f97", fg: "#ffffff", range: "201 – 300" },
  { name: "Dangereux", color: "#7e0023", fg: "#ffffff", range: "301 – 500" }
];

const POLLUTANTS = {
  pm25: { name: "PM2.5 (moyenne sur 24 heures)", unit: "µg/m³", digits: 1, rows: [[0, 9.0, 0, 50], [9.1, 35.4, 51, 100], [35.5, 55.4, 101, 150], [55.5, 125.4, 151, 200], [125.5, 225.4, 201, 300], [225.5, 325.4, 301, 500]] },
  pm10: { name: "PM10 (moyenne sur 24 heures)", unit: "µg/m³", digits: 0, rows: [[0, 54, 0, 50], [55, 154, 51, 100], [155, 254, 101, 150], [255, 354, 151, 200], [355, 424, 201, 300], [425, 604, 301, 500]] },
  o3: { name: "Ozone O3 (moyenne sur 8 heures)", unit: "ppm", digits: 3, rows: [[0, 0.054, 0, 50], [0.055, 0.070, 51, 100], [0.071, 0.085, 101, 150], [0.086, 0.105, 151, 200], [0.106, 0.200, 201, 300]] },
  co: { name: "Monoxyde de carbone CO (moyenne sur 8 heures)", unit: "ppm", digits: 1, rows: [[0, 4.4, 0, 50], [4.5, 9.4, 51, 100], [9.5, 12.4, 101, 150], [12.5, 15.4, 151, 200], [15.5, 30.4, 201, 300], [30.5, 50.4, 301, 500]] },
  no2: { name: "Dioxyde d'azote NO2 (sur 1 heure)", unit: "ppb", digits: 0, rows: [[0, 53, 0, 50], [54, 100, 51, 100], [101, 360, 101, 150], [361, 649, 151, 200], [650, 1249, 201, 300], [1250, 2049, 301, 500]] },
  so2: { name: "Dioxyde de soufre SO2 (sur 1 heure)", unit: "ppb", digits: 0, rows: [[0, 35, 0, 50], [36, 75, 51, 100], [76, 185, 101, 150], [186, 304, 151, 200], [305, 604, 201, 300], [605, 1004, 301, 500]] }
};

const KEYS = Object.keys(POLLUTANTS);

function truncate(x, digits) {
  const f = 10 ** digits;
  return Math.trunc(x * f + 1e-7) / f;
}

export const meta = {
  description: "Calculez l'indice américain de qualité de l'air (AQI) pour un polluant à partir de sa concentration, avec l'arrondi de la concentration selon la norme, la catégorie sanitaire et sa couleur, et l'interpolation linéaire étape par étape.",
  keywords: ["Indice de qualité de l'air", "AQI", "EPA", "PM2.5", "PM10", "Ozone", "Dioxyde d'azote", "air quality index"],
  formulas: [
    { label: "Interpolation linéaire", tex: "I = \\frac{I_{hi}-I_{lo}}{C_{hi}-C_{lo}}\\,(C_p - C_{lo}) + I_{lo}" }
  ],
  inputs: [
    { id: "pollutant", label: "Polluant", type: "select", default: "pm25", options: [["pm25", "PM2.5 (µg/m³, moyenne sur 24 heures)"], ["pm10", "PM10 (µg/m³, moyenne sur 24 heures)"], ["o3", "Ozone O3 (ppm, moyenne sur 8 heures)"], ["co", "CO (ppm, moyenne sur 8 heures)"], ["no2", "NO2 (ppb, moyenne horaire)"], ["so2", "SO2 (ppb, moyenne horaire)"]] },
    { id: "C", label: "Concentration", type: "number", default: "35.4", help: "Saisissez la concentration dans l'unité indiquée pour le polluant choisi." }
  ],
  example: { values: { pollutant: "pm25", C: "35.4" }, expect: ["AQI = 100", "Modéré"], note: "Exemple : PM2.5 à une concentration de 35.4 µg/m³." },
  invalid: { values: { pollutant: "pm25", C: "-1" } },
  related: ["carbon-footprint", "earthquake-magnitude"]
};

export function solve(input) {
  const key = choice(input, "pollutant", "Polluant", KEYS, "pm25");
  const p = POLLUTANTS[key];
  const raw = num(input, "C", "Concentration", { nonNegative: true });
  const c = truncate(raw, p.digits);
  const idx = p.rows.findIndex(([lo, hi]) => c >= lo && c <= hi);
  const cText = `${fmt(c)} ${p.unit}`;
  const table = {
    type: "table",
    caption: "Catégories de l'indice de qualité de l'air",
    head: ["Catégorie", "Plage de l'indice"],
    rows: CATS.map((cat) => [{ text: cat.name, color: cat.color, fg: cat.fg }, cat.range])
  };
  const steps = [`Concentration après troncature à ${p.digits} décimale(s) : ${cText}`];
  const blocks = [table];
  if (key === "o3") blocks.push({ type: "note", text: "Le tableau de l'ozone de cet outil se termine à 0.200 ppm pour une moyenne sur 8 heures.", tone: "warn" });
  if (idx < 0) {
    const out = "Hors échelle (plus de 500)";
    steps.push(`La concentration ${cText} dépasse la dernière limite du tableau, l'indice n'est donc pas calculé.`);
    return {
      results: [
        { label: "Indice de qualité de l'air AQI", value: out, text: out },
        { label: "Polluant", value: p.name },
        { label: "Concentration après troncature", value: cText }
      ],
      steps,
      copy: `${p.name} à ${cText} : ${out}`,
      blocks,
      values: { I: null, category: null, c }
    };
  }
  const [clo, chi, ilo, ihi] = p.rows[idx];
  const cat = CATS[idx];
  const exact = (ihi - ilo) / (chi - clo) * (c - clo) + ilo;
  const I = Math.round(exact);
  steps.push({ text: "Plage de concentration appropriée :", tex: `${ntex(clo)} \\le C_p \\le ${ntex(chi)}` });
  steps.push({ text: "Interpolation linéaire :", tex: `I = \\frac{${ntex(ihi)} - ${ntex(ilo)}}{${ntex(chi)} - ${ntex(clo)}}\\left(${ntex(c)} - ${ntex(clo)}\\right) + ${ntex(ilo)} = ${ntex(exact, 6)}` });
  steps.push({ text: "Arrondi de l'indice à l'entier le plus proche :", tex: `AQI = ${I}` });
  return {
    results: [
      { label: "Indice de qualité de l'air AQI", value: String(I), text: `AQI = ${I}` },
      { label: "Catégorie sanitaire", value: cat.name },
      { label: "Polluant", value: p.name },
      { label: "Concentration après troncature", value: cText }
    ],
    steps,
    copy: `AQI = ${I} (${cat.name}) pour ${p.name} à ${cText}`,
    blocks,
    values: { I, category: cat.name, c }
  };
}
