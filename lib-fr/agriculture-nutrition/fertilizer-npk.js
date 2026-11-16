import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const AREA = { m2: 1e-4, dunum: 0.1, ha: 1 };
const BAG = 50;

const FERTS = {
  urea: { name: "Urée (46-0-0)", N: 46, P: 0, K: 0 },
  an: { name: "Nitrate d'ammonium (34-0-0)", N: 34, P: 0, K: 0 },
  as: { name: "Sulfate d'ammonium (21-0-0)", N: 21, P: 0, K: 0 },
  dap: { name: "DAP (18-46-0)", N: 18, P: 46, K: 0 },
  ssp: { name: "Superphosphate simple SSP (0-20-0)", N: 0, P: 20, K: 0 },
  mop: { name: "Chlorure de potassium MOP (0-0-60)", N: 0, P: 0, K: 60 },
  sop: { name: "Sulfate de potassium SOP (0-0-50)", N: 0, P: 0, K: 50 },
  npk15: { name: "NPK (15-15-15)", N: 15, P: 15, K: 15 },
  npk20: { name: "NPK (20-20-20)", N: 20, P: 20, K: 20 }
};

const NUTRIENT_NAME = { N: "Azote N", P: "Phosphore P2O5", K: "Potassium K2O" };

export const meta = {
  description: "Calcule la quantité d'engrais nécessaire pour couvrir le besoin d'un seul élément (N, P2O5 ou K2O) sur une surface donnée, ou conçoit un mélange de DAP, de MOP et d'urée pour couvrir ensemble les objectifs en N, P et K, avec le nombre de sacs de 50 kg.",
  keywords: ["engrais", "NPK", "urée", "DAP", "MOP", "engrais", "azote", "phosphore", "potassium", "fertilizer"],
  formulas: [
    { label: "Quantité d'engrais pour un élément", tex: "m_{ha} = \\frac{R}{p/100},\\qquad M = m_{ha}\\cdot A_{ha}" },
    { label: "Mélange DAP, MOP et urée", tex: "D = \\frac{P_{target}}{0.46},\\quad U = \\frac{N_{target} - 0.18D}{0.46},\\quad K = \\frac{K_{target}}{0.60}" }
  ],
  inputs: [
    { id: "area", label: "Surface", type: "number", default: "1" },
    { id: "areaUnit", label: "Unité de surface", type: "select", default: "ha", options: [["m2", "m²"], ["dunum", "Dunum (1000 m²)"], ["ha", "Hectare"]] },
    { id: "mode", label: "Méthode", type: "select", default: "single", options: [["single", "Besoin d'un seul élément"], ["mix", "Mélange de trois éléments (DAP, MOP et urée)"]] },
    { id: "rate", label: "Besoin en élément", unit: "kg/ha", type: "number", default: "100", when: { mode: ["single"] } },
    { id: "nutrient", label: "Élément", type: "select", default: "N", options: [["N", "N (azote)"], ["P", "P2O5 (phosphore)"], ["K", "K2O (potassium)"]], when: { mode: ["single"] } },
    { id: "fert", label: "Engrais", type: "select", default: "urea", options: [["urea", "Urée (46-0-0)"], ["an", "Nitrate d'ammonium (34-0-0)"], ["as", "Sulfate d'ammonium (21-0-0)"], ["dap", "DAP (18-46-0)"], ["ssp", "Superphosphate SSP (0-20-0)"], ["mop", "Chlorure de potassium MOP (0-0-60)"], ["sop", "Sulfate de potassium SOP (0-0-50)"], ["npk15", "NPK (15-15-15)"], ["npk20", "NPK (20-20-20)"], ["custom", "Engrais personnalisé"]], when: { mode: ["single"] } },
    { id: "cN", label: "Teneur en N de l'engrais personnalisé", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "cP", label: "Teneur en P2O5 de l'engrais personnalisé", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "cK", label: "Teneur en K2O de l'engrais personnalisé", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "tN", label: "Objectif en N", unit: "kg/ha", type: "number", default: "100", when: { mode: ["mix"] } },
    { id: "tP", label: "Objectif en P2O5", unit: "kg/ha", type: "number", default: "46", when: { mode: ["mix"] } },
    { id: "tK", label: "Objectif en K2O", unit: "kg/ha", type: "number", default: "60", when: { mode: ["mix"] } }
  ],
  example: { values: { area: "1", areaUnit: "ha", mode: "single", rate: "100", nutrient: "N", fert: "urea", cN: "0", cP: "0", cK: "0", tN: "100", tP: "46", tK: "60" }, expect: ["217.4 kg"], note: "Exemple : 100 kg de N/ha à partir d'urée sur un hectare." },
  invalid: { values: { area: "1", areaUnit: "ha", mode: "single", rate: "100", nutrient: "N", fert: "mop", cN: "0", cP: "0", cK: "0", tN: "100", tP: "46", tK: "60" } },
  related: ["irrigation", "calorie-needs"]
};

function singlePlan(input, areaRaw, areaHa, unit) {
  const rate = num(input, "rate", "Besoin en élément", { positive: true });
  const nut = choice(input, "nutrient", "Élément", ["N", "P", "K"], "N");
  const fk = choice(input, "fert", "Engrais", ["urea", "an", "as", "dap", "ssp", "mop", "sop", "npk15", "npk20", "custom"], "urea");
  const content = fk === "custom"
    ? { name: "Engrais personnalisé", N: num(input, "cN", "Teneur en N", { nonNegative: true, max: 100, default: 0 }), P: num(input, "cP", "Teneur en P2O5", { nonNegative: true, max: 100, default: 0 }), K: num(input, "cK", "Teneur en K2O", { nonNegative: true, max: 100, default: 0 }) }
    : FERTS[fk];
  const pct = content[nut];
  if (!(pct > 0)) fail(`${content.name} ne contient pas ${NUTRIENT_NAME[nut]} ; choisissez un autre engrais.`, "fert");
  const perHa = rate / (pct / 100);
  const total = perHa * areaHa;
  const bags = Math.ceil(total / BAG);
  const steps = [
    { text: "Quantité d'engrais par hectare = besoin ÷ teneur de l'élément :", tex: `m_{ha} = \\frac{${ntex(rate)}}{${ntex(pct / 100, 6)}} = ${ntex(perHa, 6)}\\ kg/ha` },
    { text: "Conversion de la surface en hectares :", tex: `A = ${ntex(areaRaw)} \\times ${ntex(AREA[unit], 6)} = ${ntex(areaHa, 6)}\\ ha` },
    { text: "Quantité totale :", tex: `M = m_{ha} \\times A = ${ntex(perHa, 6)} \\times ${ntex(areaHa, 6)} = ${ntex(total, 6)}\\ kg` }
  ];
  return {
    results: [
      { label: "Quantité totale d'engrais", value: `${fmt(total, 4)} kg`, text: `${fmt(total, 4)} kg` },
      { label: "Quantité par hectare", value: `${fmt(perHa, 4)} kg/ha` },
      { label: "Teneur de l'élément dans l'engrais", value: `${fmt(pct, 4)} %` },
      { label: "Nombre de sacs de 50 kg", value: `${bags}` }
    ],
    steps,
    copy: `${content.name} pour ${NUTRIENT_NAME[nut]} : ${fmt(total, 4)} kg`,
    values: { perHa, total, bags, pct }
  };
}

function mixPlan(input, areaHa) {
  const tN = num(input, "tN", "Objectif en N", { nonNegative: true, default: 0 });
  const tP = num(input, "tP", "Objectif en P2O5", { nonNegative: true, default: 0 });
  const tK = num(input, "tK", "Objectif en K2O", { nonNegative: true, default: 0 });
  if (tN + tP + tK <= 0) fail("Saisissez un objectif positif pour au moins un élément.", "tN");
  const dap = tP / (FERTS.dap.P / 100);
  const dapN = dap * FERTS.dap.N / 100;
  const urea = Math.max(tN - dapN, 0) / (FERTS.urea.N / 100);
  const mop = tK / (FERTS.mop.K / 100);
  const suppliedN = dapN + urea * FERTS.urea.N / 100;
  const suppliedP = dap * FERTS.dap.P / 100;
  const suppliedK = mop * FERTS.mop.K / 100;
  const rows = [
    ["DAP (18-46-0)", dap, dap * areaHa],
    ["MOP (0-0-60)", mop, mop * areaHa],
    ["Urée (46-0-0)", urea, urea * areaHa]
  ];
  const steps = [
    { text: "DAP pour couvrir le P2O5 :", tex: `D = \\frac{${ntex(tP)}}{0.46} = ${ntex(dap, 6)}\\ kg/ha` },
    { text: "Azote apporté par le DAP :", tex: `N_{DAP} = ${ntex(dap, 6)} \\times 0.18 = ${ntex(dapN, 6)}\\ kg/ha` },
    { text: "Urée pour couvrir le reste de N :", tex: `U = \\frac{\\max(${ntex(tN)} - ${ntex(dapN, 6)},\\ 0)}{0.46} = ${ntex(urea, 6)}\\ kg/ha` },
    { text: "MOP pour couvrir le K2O :", tex: `M = \\frac{${ntex(tK)}}{0.60} = ${ntex(mop, 6)}\\ kg/ha` }
  ];
  const blocks = [
    {
      type: "table",
      caption: "Quantités du mélange",
      head: ["Engrais", "Par hectare (kg)", "Pour la surface totale (kg)", "Sacs de 50 kg"],
      rows: rows.map(([n, perHa, tot]) => [n, fmt(perHa, 4), fmt(tot, 4), String(Math.ceil(tot / BAG))])
    },
    dapN > tN
      ? { type: "note", text: `Le DAP apporte ${fmt(dapN, 4)} kg de N par hectare, ce qui dépasse l'objectif en azote ; aucune urée n'a donc été ajoutée.`, tone: "warn" }
      : { type: "note", text: `${fmt(dapN, 4)} kg de N par hectare apportés par le DAP ont été comptés dans l'objectif en azote.` }
  ];
  const totals = rows.map(([n, , tot]) => `${n} : ${fmt(tot, 4)} kg`).join("، ");
  return {
    results: [
      { label: "DAP", value: `${fmt(dap * areaHa, 4)} kg` },
      { label: "MOP", value: `${fmt(mop * areaHa, 4)} kg` },
      { label: "Urée", value: `${fmt(urea * areaHa, 4)} kg` },
      { label: "N réellement apporté", value: `${fmt(suppliedN, 4)} kg/ha` },
      { label: "P2O5 réellement apporté", value: `${fmt(suppliedP, 4)} kg/ha` },
      { label: "K2O réellement apporté", value: `${fmt(suppliedK, 4)} kg/ha` }
    ],
    steps,
    copy: `Mélange : ${totals}`,
    blocks,
    values: { dap, urea, mop, dapN, suppliedN, suppliedP, suppliedK, areaHa }
  };
}

export function solve(input) {
  const areaRaw = num(input, "area", "Surface", { positive: true });
  const unit = choice(input, "areaUnit", "Unité de surface", ["m2", "dunum", "ha"], "ha");
  const areaHa = areaRaw * AREA[unit];
  const mode = choice(input, "mode", "Méthode", ["single", "mix"], "single");
  if (mode === "mix") return mixPlan(input, areaHa);
  return singlePlan(input, areaRaw, areaHa, unit);
}
