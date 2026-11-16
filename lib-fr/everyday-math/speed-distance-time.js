import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const KMH_FACTOR = { kmh: 1, ms: 3.6, mph: 1.609344 };
const provided = (v) => !isBlank(v);

const hourWord = (h) => (h === 1 ? "1 heure" : h === 2 ? "deux heures" : h <= 10 ? `${h} heures` : `${h} heures`);
const minWord = (m) => (m === 1 ? "1 minute" : m === 2 ? "deux minutes" : m <= 10 ? `${m} minutes` : `${m} minutes`);

const hm = (h) => {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  const parts = [];
  if (hh > 0) parts.push(hourWord(hh));
  if (mm > 0) parts.push(minWord(mm));
  return parts.length ? parts.join(" et ") : "0 minute";
};

const readTime = (input, timeMode) => {
  if (timeMode === "decimal") return num(input, "time", "Durée", { positive: true });
  const h = num(input, "timeH", "Heures", { integer: true, nonNegative: true, default: 0 });
  const m = num(input, "timeM", "Minutes", { integer: true, min: 0, max: 59, default: 0 });
  const total = h + m / 60;
  if (!(total > 0)) fail("La durée doit être supérieure à zéro.", "timeH");
  return total;
};

const solveTriple = (input) => {
  const unit = choice(input, "speedUnit", "Unité de vitesse", ["kmh", "ms", "mph"], "kmh");
  const timeMode = choice(input, "timeMode", "Format de la durée", ["decimal", "hm"], "decimal");
  const hasSpeed = provided(input.speed);
  const hasDistance = provided(input.distance);
  const hasTime = timeMode === "decimal" ? provided(input.time) : provided(input.timeH) || provided(input.timeM);
  const count = [hasSpeed, hasDistance, hasTime].filter(Boolean).length;
  if (count !== 2) {
    const field = !hasSpeed ? "speed" : !hasDistance ? "distance" : "time";
    fail("Saisissez exactement deux valeurs parmi vitesse, distance et durée, et laissez la troisième vide.", field);
  }
  const speed = hasSpeed ? num(input, "speed", "Vitesse", { positive: true }) * KMH_FACTOR[unit] : null;
  const distance = hasDistance ? num(input, "distance", "Distance", { positive: true }) : null;
  const time = hasTime ? readTime(input, timeMode) : null;

  let v = speed;
  let d = distance;
  let t = time;
  if (v === null) v = d / t;
  else if (d === null) d = v * t;
  else t = d / v;

  const steps = [];
  if (speed === null) steps.push({ text: "Vitesse = distance ÷ durée :", tex: `v = \\frac{${ntex(d)}}{${ntex(t, 6)}} = ${ntex(v, 6)}\\ \\text{km/h}` });
  else if (distance === null) steps.push({ text: "Distance = vitesse × durée :", tex: `d = ${ntex(v, 6)} \\times ${ntex(t, 6)} = ${ntex(d, 6)}\\ \\text{km}` });
  else steps.push({ text: "Durée = distance ÷ vitesse :", tex: `t = \\frac{${ntex(d, 6)}}{${ntex(v, 6)}} = ${ntex(t, 6)}\\ \\text{h}` });
  steps.push({ text: "Conversion de la vitesse dans les trois unités :", tex: `${ntex(v, 6)}\\ \\text{km/h} = ${ntex(v / 3.6, 6)}\\ \\text{m/s} = ${ntex(v / KMH_FACTOR.mph, 6)}\\ \\text{mph}` });

  return {
    results: [
      { label: "Vitesse en kilomètres par heure", value: `${fmt(v, 6)} km/h` },
      { label: "Vitesse en mètres par seconde", value: `${fmt(v / 3.6, 6)} m/s` },
      { label: "Vitesse en miles par heure", value: `${fmt(v / KMH_FACTOR.mph, 6)} mph` },
      { label: "Distance", value: `${fmt(d, 6)} km` },
      { label: "Durée", value: hm(t) },
      { label: "Durée en heures décimales", value: `${fmt(t, 6)} heures` }
    ],
    steps,
    copy: `Vitesse : ${fmt(v, 6)} km/h, distance : ${fmt(d, 6)} km, durée : ${hm(t)}`
  };
};

const average = (input) => {
  const legMode = choice(input, "legMode", "Données des deux étapes", ["speeds", "times"], "speeds");
  const d1 = num(input, "d1", "Distance de la première étape", { positive: true });
  const d2 = num(input, "d2", "Distance de la seconde étape", { positive: true });
  let t1, t2, v1 = null, v2 = null;
  if (legMode === "speeds") {
    v1 = num(input, "v1", "Vitesse de la première étape", { positive: true });
    v2 = num(input, "v2", "Vitesse de la seconde étape", { positive: true });
    t1 = d1 / v1;
    t2 = d2 / v2;
  } else {
    t1 = num(input, "t1", "Durée de la première étape", { positive: true });
    t2 = num(input, "t2", "Durée de la seconde étape", { positive: true });
  }
  const D = d1 + d2;
  const T = t1 + t2;
  const avg = D / T;
  const equalLegs = legMode === "speeds" && Math.abs(d1 - d2) < 1e-12;
  const harmonic = equalLegs ? (2 * v1 * v2) / (v1 + v2) : null;

  const steps = [];
  if (legMode === "speeds") {
    steps.push({ text: "Durée de chaque étape = distance ÷ vitesse :", tex: `t_1 = \\frac{${ntex(d1)}}{${ntex(v1)}} = ${ntex(t1, 6)},\\qquad t_2 = \\frac{${ntex(d2)}}{${ntex(v2)}} = ${ntex(t2, 6)}` });
  }
  steps.push({ text: "Vitesse moyenne = distance totale ÷ durée totale (et non la moyenne des deux vitesses) :", tex: `\\bar{v} = \\frac{d_1 + d_2}{t_1 + t_2} = \\frac{${ntex(D)}}{${ntex(T, 6)}} = ${ntex(avg, 6)}\\ \\text{km/h}` });
  if (equalLegs) steps.push({ text: "Pour deux distances égales, la moyenne est la moyenne harmonique des deux vitesses :", tex: `\\bar{v} = \\frac{2 v_1 v_2}{v_1 + v_2} = ${ntex(harmonic, 6)}\\ \\text{km/h}` });

  const results = [
    { label: "Vitesse moyenne", value: `${fmt(avg, 6)} km/h` },
    { label: "Distance totale", value: `${fmt(D, 6)} km` },
    { label: "Durée totale", value: hm(T) }
  ];
  if (harmonic !== null) results.push({ label: "Moyenne harmonique des deux vitesses", value: `${fmt(harmonic, 6)} km/h` });

  const blocks = [];
  if (legMode === "speeds") {
    blocks.push({ type: "note", text: "Lorsqu'on parcourt deux distances à deux vitesses différentes, la moyenne correcte est la moyenne harmonique (ou pondérée par la distance), et non la moyenne arithmétique (v1 + v2) / 2." });
  }

  return {
    results,
    steps,
    copy: `Vitesse moyenne : ${fmt(avg, 6)} km/h, distance totale : ${fmt(D, 6)} km, durée totale : ${hm(T)}`,
    blocks
  };
};

export const meta = {
  description: "Calcule la vitesse, la distance ou la durée lorsque deux d'entre elles sont connues, convertit la vitesse entre km/h, m/s et mph, et calcule la vitesse moyenne de deux étapes par la moyenne harmonique ou par la distance totale divisée par la durée totale.",
  keywords: ["vitesse", "distance", "durée", "Vitesse moyenne", "moyenne harmonique", "speed distance time", "km/h"],
  formulas: [
    { label: "Relation de base", tex: "d = v \\times t" },
    { label: "Vitesse moyenne de deux étapes à distances égales", tex: "\\bar{v} = \\frac{2 v_1 v_2}{v_1 + v_2}" },
    { label: "Vitesse moyenne globale", tex: "\\bar{v} = \\frac{d_1 + d_2}{t_1 + t_2}" }
  ],
  inputs: [
    { id: "mode", label: "Type de calcul", type: "select", default: "solve", options: [["solve", "Calculer l'inconnue à partir de deux valeurs"], ["average", "Vitesse moyenne de deux étapes"]] },
    { id: "speed", label: "Vitesse", type: "number", default: "80", when: { mode: ["solve"] }, help: "Laissez vide si c'est l'inconnue." },
    { id: "speedUnit", label: "Unité de vitesse", type: "select", default: "kmh", options: [["kmh", "km/h"], ["ms", "m/s"], ["mph", "mph"]], when: { mode: ["solve"] } },
    { id: "distance", label: "Distance", unit: "km", type: "number", default: "120", when: { mode: ["solve"] }, help: "Laissez vide si c'est l'inconnue." },
    { id: "timeMode", label: "Format de la durée", type: "select", default: "decimal", options: [["decimal", "Heures décimales"], ["hm", "Heures et minutes"]], when: { mode: ["solve"] } },
    { id: "time", label: "Durée", unit: "heure", type: "number", default: "", when: { mode: ["solve"], timeMode: ["decimal"] } },
    { id: "timeH", label: "Heures", type: "number", default: "", when: { mode: ["solve"], timeMode: ["hm"] } },
    { id: "timeM", label: "Minutes", type: "number", default: "", when: { mode: ["solve"], timeMode: ["hm"] } },
    { id: "legMode", label: "Données des deux étapes", type: "select", default: "speeds", options: [["speeds", "Distance et vitesse pour chaque étape"], ["times", "Distance et durée pour chaque étape"]], when: { mode: ["average"] } },
    { id: "d1", label: "Distance de la première étape", unit: "km", type: "number", default: "60", when: { mode: ["average"] } },
    { id: "v1", label: "Vitesse de la première étape", unit: "km/h", type: "number", default: "60", when: { mode: ["average"], legMode: ["speeds"] } },
    { id: "t1", label: "Durée de la première étape", unit: "heure", type: "number", default: "1", when: { mode: ["average"], legMode: ["times"] } },
    { id: "d2", label: "Distance de la seconde étape", unit: "km", type: "number", default: "60", when: { mode: ["average"] } },
    { id: "v2", label: "Vitesse de la seconde étape", unit: "km/h", type: "number", default: "30", when: { mode: ["average"], legMode: ["speeds"] } },
    { id: "t2", label: "Durée de la seconde étape", unit: "heure", type: "number", default: "2", when: { mode: ["average"], legMode: ["times"] } }
  ],
  example: {
    values: { mode: "solve", speed: "80", speedUnit: "kmh", distance: "120", timeMode: "decimal", time: "", timeH: "", timeM: "", legMode: "speeds", d1: "60", v1: "60", t1: "1", d2: "60", v2: "30", t2: "2" },
    expect: ["1 heure et 30 minutes"],
    note: "Exemple : une distance de 120 km à une vitesse de 80 km/h prend 1 heure et 30 minutes."
  },
  invalid: { values: { mode: "solve", speed: "80", speedUnit: "kmh", distance: "120", timeMode: "decimal", time: "1.5", timeH: "", timeM: "", legMode: "speeds", d1: "60", v1: "60", t1: "1", d2: "60", v2: "30", t2: "2" } },
  related: ["unit-converter", "fuel-cost", "discount-tax"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Type de calcul", ["solve", "average"], "solve");
  return mode === "average" ? average(input) : solveTriple(input);
}
