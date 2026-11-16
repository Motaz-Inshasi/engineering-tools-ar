import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const AREA = { m2: 1e-4, dunum: 0.1, ha: 1 };
const BAG = 50;

const FERTS = {
  urea: { name: "Urea (46-0-0)", N: 46, P: 0, K: 0 },
  an: { name: "Ammonium nitrate (34-0-0)", N: 34, P: 0, K: 0 },
  as: { name: "Ammonium sulfate (21-0-0)", N: 21, P: 0, K: 0 },
  dap: { name: "DAP (18-46-0)", N: 18, P: 46, K: 0 },
  ssp: { name: "Single superphosphate SSP (0-20-0)", N: 0, P: 20, K: 0 },
  mop: { name: "Potassium chloride MOP (0-0-60)", N: 0, P: 0, K: 60 },
  sop: { name: "Potassium sulfate SOP (0-0-50)", N: 0, P: 0, K: 50 },
  npk15: { name: "NPK (15-15-15)", N: 15, P: 15, K: 15 },
  npk20: { name: "NPK (20-20-20)", N: 20, P: 20, K: 20 }
};

const NUTRIENT_NAME = { N: "Nitrogen N", P: "Phosphorus P2O5", K: "Potassium K2O" };

export const meta = {
  description: "Calculates the amount of fertilizer needed to cover the requirement of one nutrient (N, P2O5, or K2O) for a given area, or designs a blend of DAP, MOP, and urea to cover the N, P, and K targets together, with the number of 50 kg bags.",
  keywords: ["fertilizers", "NPK", "urea", "DAP", "MOP", "fertilizer", "nitrogen", "phosphorus", "potassium", "fertilizer"],
  formulas: [
    { label: "Fertilizer amount for one nutrient", tex: "m_{ha} = \\frac{R}{p/100},\\qquad M = m_{ha}\\cdot A_{ha}" },
    { label: "DAP, MOP, and urea blend", tex: "D = \\frac{P_{target}}{0.46},\\quad U = \\frac{N_{target} - 0.18D}{0.46},\\quad K = \\frac{K_{target}}{0.60}" }
  ],
  inputs: [
    { id: "area", label: "Area", type: "number", default: "1" },
    { id: "areaUnit", label: "Area unit", type: "select", default: "ha", options: [["m2", "m²"], ["dunum", "Dunam (1000 m²)"], ["ha", "Hectare"]] },
    { id: "mode", label: "Method", type: "select", default: "single", options: [["single", "Requirement of one nutrient"], ["mix", "Blend of three nutrients (DAP, MOP, and urea)"]] },
    { id: "rate", label: "Nutrient requirement", unit: "kg/ha", type: "number", default: "100", when: { mode: ["single"] } },
    { id: "nutrient", label: "Nutrient", type: "select", default: "N", options: [["N", "N (nitrogen)"], ["P", "P2O5 (phosphorus)"], ["K", "K2O (potassium)"]], when: { mode: ["single"] } },
    { id: "fert", label: "Fertilizer", type: "select", default: "urea", options: [["urea", "Urea (46-0-0)"], ["an", "Ammonium nitrate (34-0-0)"], ["as", "Ammonium sulfate (21-0-0)"], ["dap", "DAP (18-46-0)"], ["ssp", "Single superphosphate SSP (0-20-0)"], ["mop", "Potassium chloride MOP (0-0-60)"], ["sop", "Potassium sulfate SOP (0-0-50)"], ["npk15", "NPK (15-15-15)"], ["npk20", "NPK (20-20-20)"], ["custom", "Custom fertilizer"]], when: { mode: ["single"] } },
    { id: "cN", label: "N percentage in the custom fertilizer", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "cP", label: "P2O5 percentage in the custom fertilizer", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "cK", label: "K2O percentage in the custom fertilizer", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "tN", label: "Target of N", unit: "kg/ha", type: "number", default: "100", when: { mode: ["mix"] } },
    { id: "tP", label: "Target of P2O5", unit: "kg/ha", type: "number", default: "46", when: { mode: ["mix"] } },
    { id: "tK", label: "Target of K2O", unit: "kg/ha", type: "number", default: "60", when: { mode: ["mix"] } }
  ],
  example: { values: { area: "1", areaUnit: "ha", mode: "single", rate: "100", nutrient: "N", fert: "urea", cN: "0", cP: "0", cK: "0", tN: "100", tP: "46", tK: "60" }, expect: ["217.4 kg"], note: "Example: 100 kg N/ha from urea on one hectare." },
  invalid: { values: { area: "1", areaUnit: "ha", mode: "single", rate: "100", nutrient: "N", fert: "mop", cN: "0", cP: "0", cK: "0", tN: "100", tP: "46", tK: "60" } },
  related: ["irrigation", "calorie-needs"]
};

function singlePlan(input, areaRaw, areaHa, unit) {
  const rate = num(input, "rate", "Nutrient requirement", { positive: true });
  const nut = choice(input, "nutrient", "Nutrient", ["N", "P", "K"], "N");
  const fk = choice(input, "fert", "Fertilizer", ["urea", "an", "as", "dap", "ssp", "mop", "sop", "npk15", "npk20", "custom"], "urea");
  const content = fk === "custom"
    ? { name: "Custom fertilizer", N: num(input, "cN", "N percentage", { nonNegative: true, max: 100, default: 0 }), P: num(input, "cP", "P2O5 percentage", { nonNegative: true, max: 100, default: 0 }), K: num(input, "cK", "K2O percentage", { nonNegative: true, max: 100, default: 0 }) }
    : FERTS[fk];
  const pct = content[nut];
  if (!(pct > 0)) fail(`${content.name} does not contain ${NUTRIENT_NAME[nut]}; choose another fertilizer.`, "fert");
  const perHa = rate / (pct / 100);
  const total = perHa * areaHa;
  const bags = Math.ceil(total / BAG);
  const steps = [
    { text: "Fertilizer amount per hectare = requirement ÷ nutrient percentage:", tex: `m_{ha} = \\frac{${ntex(rate)}}{${ntex(pct / 100, 6)}} = ${ntex(perHa, 6)}\\ kg/ha` },
    { text: "Convert the area to hectares:", tex: `A = ${ntex(areaRaw)} \\times ${ntex(AREA[unit], 6)} = ${ntex(areaHa, 6)}\\ ha` },
    { text: "Total amount:", tex: `M = m_{ha} \\times A = ${ntex(perHa, 6)} \\times ${ntex(areaHa, 6)} = ${ntex(total, 6)}\\ kg` }
  ];
  return {
    results: [
      { label: "Total fertilizer amount", value: `${fmt(total, 4)} kg`, text: `${fmt(total, 4)} kg` },
      { label: "Amount per hectare", value: `${fmt(perHa, 4)} kg/ha` },
      { label: "Nutrient percentage in the fertilizer", value: `${fmt(pct, 4)} %` },
      { label: "Number of 50 kg bags", value: `${bags}` }
    ],
    steps,
    copy: `${content.name} for ${NUTRIENT_NAME[nut]}: ${fmt(total, 4)} kg`,
    values: { perHa, total, bags, pct }
  };
}

function mixPlan(input, areaHa) {
  const tN = num(input, "tN", "Target of N", { nonNegative: true, default: 0 });
  const tP = num(input, "tP", "Target of P2O5", { nonNegative: true, default: 0 });
  const tK = num(input, "tK", "Target of K2O", { nonNegative: true, default: 0 });
  if (tN + tP + tK <= 0) fail("Enter a positive target for at least one nutrient.", "tN");
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
    ["Urea (46-0-0)", urea, urea * areaHa]
  ];
  const steps = [
    { text: "DAP to cover P2O5:", tex: `D = \\frac{${ntex(tP)}}{0.46} = ${ntex(dap, 6)}\\ kg/ha` },
    { text: "Nitrogen supplied by DAP:", tex: `N_{DAP} = ${ntex(dap, 6)} \\times 0.18 = ${ntex(dapN, 6)}\\ kg/ha` },
    { text: "Urea to cover the remaining N:", tex: `U = \\frac{\\max(${ntex(tN)} - ${ntex(dapN, 6)},\\ 0)}{0.46} = ${ntex(urea, 6)}\\ kg/ha` },
    { text: "MOP to cover K2O:", tex: `M = \\frac{${ntex(tK)}}{0.60} = ${ntex(mop, 6)}\\ kg/ha` }
  ];
  const blocks = [
    {
      type: "table",
      caption: "Blend amounts",
      head: ["Fertilizer", "Per hectare (kg)", "For the whole area (kg)", "50 kg bags"],
      rows: rows.map(([n, perHa, tot]) => [n, fmt(perHa, 4), fmt(tot, 4), String(Math.ceil(tot / BAG))])
    },
    dapN > tN
      ? { type: "note", text: `DAP supplies ${fmt(dapN, 4)} kg N per hectare, which is higher than the nitrogen target, so no urea was added.`, tone: "warn" }
      : { type: "note", text: `${fmt(dapN, 4)} kg N per hectare supplied by DAP has been counted toward the nitrogen target.` }
  ];
  const totals = rows.map(([n, , tot]) => `${n}: ${fmt(tot, 4)} kg`).join("، ");
  return {
    results: [
      { label: "DAP", value: `${fmt(dap * areaHa, 4)} kg` },
      { label: "MOP", value: `${fmt(mop * areaHa, 4)} kg` },
      { label: "Urea", value: `${fmt(urea * areaHa, 4)} kg` },
      { label: "N actually supplied", value: `${fmt(suppliedN, 4)} kg/ha` },
      { label: "P2O5 actually supplied", value: `${fmt(suppliedP, 4)} kg/ha` },
      { label: "K2O actually supplied", value: `${fmt(suppliedK, 4)} kg/ha` }
    ],
    steps,
    copy: `Blend: ${totals}`,
    blocks,
    values: { dap, urea, mop, dapN, suppliedN, suppliedP, suppliedK, areaHa }
  };
}

export function solve(input) {
  const areaRaw = num(input, "area", "Area", { positive: true });
  const unit = choice(input, "areaUnit", "Area unit", ["m2", "dunum", "ha"], "ha");
  const areaHa = areaRaw * AREA[unit];
  const mode = choice(input, "mode", "Method", ["single", "mix"], "single");
  if (mode === "mix") return mixPlan(input, areaHa);
  return singlePlan(input, areaRaw, areaHa, unit);
}
