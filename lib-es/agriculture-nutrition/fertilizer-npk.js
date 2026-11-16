import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const AREA = { m2: 1e-4, dunum: 0.1, ha: 1 };
const BAG = 50;

const FERTS = {
  urea: { name: "Urea (46-0-0)", N: 46, P: 0, K: 0 },
  an: { name: "Nitrato de amonio (34-0-0)", N: 34, P: 0, K: 0 },
  as: { name: "Sulfato de amonio (21-0-0)", N: 21, P: 0, K: 0 },
  dap: { name: "DAP (18-46-0)", N: 18, P: 46, K: 0 },
  ssp: { name: "Superfosfato simple SSP (0-20-0)", N: 0, P: 20, K: 0 },
  mop: { name: "Cloruro de potasio MOP (0-0-60)", N: 0, P: 0, K: 60 },
  sop: { name: "Sulfato de potasio SOP (0-0-50)", N: 0, P: 0, K: 50 },
  npk15: { name: "NPK (15-15-15)", N: 15, P: 15, K: 15 },
  npk20: { name: "NPK (20-20-20)", N: 20, P: 20, K: 20 }
};

const NUTRIENT_NAME = { N: "Nitrógeno N", P: "Fósforo P2O5", K: "Potasio K2O" };

export const meta = {
  description: "Calcule la cantidad de fertilizante necesaria para cubrir la necesidad de un solo nutriente (N, P2O5 o K2O) en una superficie dada, o diseñe una mezcla de DAP, MOP y urea para cubrir a la vez los objetivos de N, P y K, con el número de sacos de 50 kg.",
  keywords: ["fertilizantes", "NPK", "urea", "DAP", "MOP", "fertilizante", "nitrógeno", "fósforo", "potasio", "fertilizer"],
  formulas: [
    { label: "Cantidad de fertilizante para un solo nutriente", tex: "m_{ha} = \\frac{R}{p/100},\\qquad M = m_{ha}\\cdot A_{ha}" },
    { label: "Mezcla de DAP, MOP y urea", tex: "D = \\frac{P_{target}}{0.46},\\quad U = \\frac{N_{target} - 0.18D}{0.46},\\quad K = \\frac{K_{target}}{0.60}" }
  ],
  inputs: [
    { id: "area", label: "Superficie", type: "number", default: "1" },
    { id: "areaUnit", label: "Unidad de superficie", type: "select", default: "ha", options: [["m2", "m²"], ["dunum", "Dunam (1000 m²)"], ["ha", "Hectárea"]] },
    { id: "mode", label: "Método", type: "select", default: "single", options: [["single", "Necesidad de un solo nutriente"], ["mix", "Mezcla de tres nutrientes (DAP, MOP y urea)"]] },
    { id: "rate", label: "Necesidad del nutriente", unit: "kg/ha", type: "number", default: "100", when: { mode: ["single"] } },
    { id: "nutrient", label: "Nutriente", type: "select", default: "N", options: [["N", "N (nitrógeno)"], ["P", "P2O5 (fósforo)"], ["K", "K2O (potasio)"]], when: { mode: ["single"] } },
    { id: "fert", label: "Fertilizante", type: "select", default: "urea", options: [["urea", "Urea (46-0-0)"], ["an", "Nitrato de amonio (34-0-0)"], ["as", "Sulfato de amonio (21-0-0)"], ["dap", "DAP (18-46-0)"], ["ssp", "Superfosfato SSP (0-20-0)"], ["mop", "Cloruro de potasio MOP (0-0-60)"], ["sop", "Sulfato de potasio SOP (0-0-50)"], ["npk15", "NPK (15-15-15)"], ["npk20", "NPK (20-20-20)"], ["custom", "Fertilizante personalizado"]], when: { mode: ["single"] } },
    { id: "cN", label: "Porcentaje de N en el fertilizante personalizado", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "cP", label: "Porcentaje de P2O5 en el fertilizante personalizado", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "cK", label: "Porcentaje de K2O en el fertilizante personalizado", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "tN", label: "Objetivo de N", unit: "kg/ha", type: "number", default: "100", when: { mode: ["mix"] } },
    { id: "tP", label: "Objetivo de P2O5", unit: "kg/ha", type: "number", default: "46", when: { mode: ["mix"] } },
    { id: "tK", label: "Objetivo de K2O", unit: "kg/ha", type: "number", default: "60", when: { mode: ["mix"] } }
  ],
  example: { values: { area: "1", areaUnit: "ha", mode: "single", rate: "100", nutrient: "N", fert: "urea", cN: "0", cP: "0", cK: "0", tN: "100", tP: "46", tK: "60" }, expect: ["217.4 kg"], note: "Ejemplo: 100 kg de N/ha con urea en una hectárea." },
  invalid: { values: { area: "1", areaUnit: "ha", mode: "single", rate: "100", nutrient: "N", fert: "mop", cN: "0", cP: "0", cK: "0", tN: "100", tP: "46", tK: "60" } },
  related: ["irrigation", "calorie-needs"]
};

function singlePlan(input, areaRaw, areaHa, unit) {
  const rate = num(input, "rate", "Necesidad del nutriente", { positive: true });
  const nut = choice(input, "nutrient", "Nutriente", ["N", "P", "K"], "N");
  const fk = choice(input, "fert", "Fertilizante", ["urea", "an", "as", "dap", "ssp", "mop", "sop", "npk15", "npk20", "custom"], "urea");
  const content = fk === "custom"
    ? { name: "Fertilizante personalizado", N: num(input, "cN", "Porcentaje de N", { nonNegative: true, max: 100, default: 0 }), P: num(input, "cP", "Porcentaje de P2O5", { nonNegative: true, max: 100, default: 0 }), K: num(input, "cK", "Porcentaje de K2O", { nonNegative: true, max: 100, default: 0 }) }
    : FERTS[fk];
  const pct = content[nut];
  if (!(pct > 0)) fail(`${content.name} no contiene ${NUTRIENT_NAME[nut]}; elija otro fertilizante.`, "fert");
  const perHa = rate / (pct / 100);
  const total = perHa * areaHa;
  const bags = Math.ceil(total / BAG);
  const steps = [
    { text: "Cantidad de fertilizante por hectárea = necesidad ÷ porcentaje del nutriente:", tex: `m_{ha} = \\frac{${ntex(rate)}}{${ntex(pct / 100, 6)}} = ${ntex(perHa, 6)}\\ kg/ha` },
    { text: "Conversión de la superficie a hectáreas:", tex: `A = ${ntex(areaRaw)} \\times ${ntex(AREA[unit], 6)} = ${ntex(areaHa, 6)}\\ ha` },
    { text: "Cantidad total:", tex: `M = m_{ha} \\times A = ${ntex(perHa, 6)} \\times ${ntex(areaHa, 6)} = ${ntex(total, 6)}\\ kg` }
  ];
  return {
    results: [
      { label: "Cantidad total de fertilizante", value: `${fmt(total, 4)} kg`, text: `${fmt(total, 4)} kg` },
      { label: "Cantidad por hectárea", value: `${fmt(perHa, 4)} kg/ha` },
      { label: "Porcentaje del nutriente en el fertilizante", value: `${fmt(pct, 4)} %` },
      { label: "Número de sacos de 50 kg", value: `${bags}` }
    ],
    steps,
    copy: `${content.name} para ${NUTRIENT_NAME[nut]}: ${fmt(total, 4)} kg`,
    values: { perHa, total, bags, pct }
  };
}

function mixPlan(input, areaHa) {
  const tN = num(input, "tN", "Objetivo de N", { nonNegative: true, default: 0 });
  const tP = num(input, "tP", "Objetivo de P2O5", { nonNegative: true, default: 0 });
  const tK = num(input, "tK", "Objetivo de K2O", { nonNegative: true, default: 0 });
  if (tN + tP + tK <= 0) fail("Introduzca un objetivo positivo para al menos un nutriente.", "tN");
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
    { text: "DAP para cubrir P2O5:", tex: `D = \\frac{${ntex(tP)}}{0.46} = ${ntex(dap, 6)}\\ kg/ha` },
    { text: "Nitrógeno aportado por el DAP:", tex: `N_{DAP} = ${ntex(dap, 6)} \\times 0.18 = ${ntex(dapN, 6)}\\ kg/ha` },
    { text: "Urea para cubrir el resto de N:", tex: `U = \\frac{\\max(${ntex(tN)} - ${ntex(dapN, 6)},\\ 0)}{0.46} = ${ntex(urea, 6)}\\ kg/ha` },
    { text: "MOP para cubrir K2O:", tex: `M = \\frac{${ntex(tK)}}{0.60} = ${ntex(mop, 6)}\\ kg/ha` }
  ];
  const blocks = [
    {
      type: "table",
      caption: "Cantidades de la mezcla",
      head: ["Fertilizante", "Por hectárea (kg)", "Para la superficie total (kg)", "Sacos de 50 kg"],
      rows: rows.map(([n, perHa, tot]) => [n, fmt(perHa, 4), fmt(tot, 4), String(Math.ceil(tot / BAG))])
    },
    dapN > tN
      ? { type: "note", text: `El DAP aporta ${fmt(dapN, 4)} kg de N por hectárea, más que el objetivo de nitrógeno, por lo que no se añadió urea.`, tone: "warn" }
      : { type: "note", text: `Se han contabilizado ${fmt(dapN, 4)} kg de N por hectárea aportados por el DAP dentro del objetivo de nitrógeno.` }
  ];
  const totals = rows.map(([n, , tot]) => `${n}: ${fmt(tot, 4)} kg`).join("، ");
  return {
    results: [
      { label: "DAP", value: `${fmt(dap * areaHa, 4)} kg` },
      { label: "MOP", value: `${fmt(mop * areaHa, 4)} kg` },
      { label: "Urea", value: `${fmt(urea * areaHa, 4)} kg` },
      { label: "N aportado realmente", value: `${fmt(suppliedN, 4)} kg/ha` },
      { label: "P2O5 aportado realmente", value: `${fmt(suppliedP, 4)} kg/ha` },
      { label: "K2O aportado realmente", value: `${fmt(suppliedK, 4)} kg/ha` }
    ],
    steps,
    copy: `Mezcla: ${totals}`,
    blocks,
    values: { dap, urea, mop, dapN, suppliedN, suppliedP, suppliedK, areaHa }
  };
}

export function solve(input) {
  const areaRaw = num(input, "area", "Superficie", { positive: true });
  const unit = choice(input, "areaUnit", "Unidad de superficie", ["m2", "dunum", "ha"], "ha");
  const areaHa = areaRaw * AREA[unit];
  const mode = choice(input, "mode", "Método", ["single", "mix"], "single");
  if (mode === "mix") return mixPlan(input, areaHa);
  return singlePlan(input, areaRaw, areaHa, unit);
}
