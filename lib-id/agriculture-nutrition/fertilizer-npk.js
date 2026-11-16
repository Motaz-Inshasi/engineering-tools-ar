import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const AREA = { m2: 1e-4, dunum: 0.1, ha: 1 };
const BAG = 50;

const FERTS = {
  urea: { name: "Urea (46-0-0)", N: 46, P: 0, K: 0 },
  an: { name: "Amonium nitrat (34-0-0)", N: 34, P: 0, K: 0 },
  as: { name: "Amonium sulfat (21-0-0)", N: 21, P: 0, K: 0 },
  dap: { name: "DAP (18-46-0)", N: 18, P: 46, K: 0 },
  ssp: { name: "Superfosfat tunggal SSP (0-20-0)", N: 0, P: 20, K: 0 },
  mop: { name: "Kalium klorida MOP (0-0-60)", N: 0, P: 0, K: 60 },
  sop: { name: "Kalium sulfat SOP (0-0-50)", N: 0, P: 0, K: 50 },
  npk15: { name: "NPK (15-15-15)", N: 15, P: 15, K: 15 },
  npk20: { name: "NPK (20-20-20)", N: 20, P: 20, K: 20 }
};

const NUTRIENT_NAME = { N: "Nitrogen N", P: "Fosfor P2O5", K: "Kalium K2O" };

export const meta = {
  description: "Hitung jumlah pupuk yang diperlukan untuk memenuhi kebutuhan satu unsur N, P2O5, atau K2O pada luas tertentu, atau rancang campuran DAP, MOP, dan urea untuk memenuhi target N, P, dan K sekaligus, dengan jumlah kantong 50 kg.",
  keywords: ["pupuk", "NPK", "urea", "DAP", "MOP", "pupuk", "nitrogen", "fosfor", "kalium", "fertilizer"],
  formulas: [
    { label: "Jumlah pupuk untuk satu unsur", tex: "m_{ha} = \\frac{R}{p/100},\\qquad M = m_{ha}\\cdot A_{ha}" },
    { label: "Campuran DAP, MOP, dan urea", tex: "D = \\frac{P_{target}}{0.46},\\quad U = \\frac{N_{target} - 0.18D}{0.46},\\quad K = \\frac{K_{target}}{0.60}" }
  ],
  inputs: [
    { id: "area", label: "Luas", type: "number", default: "1" },
    { id: "areaUnit", label: "Satuan luas", type: "select", default: "ha", options: [["m2", "m²"], ["dunum", "Dunam (1000 m²)"], ["ha", "Hektar"]] },
    { id: "mode", label: "Metode", type: "select", default: "single", options: [["single", "Kebutuhan satu unsur"], ["mix", "Campuran tiga unsur (DAP, MOP, dan urea)"]] },
    { id: "rate", label: "Kebutuhan unsur", unit: "kg/ha", type: "number", default: "100", when: { mode: ["single"] } },
    { id: "nutrient", label: "Unsur", type: "select", default: "N", options: [["N", "N (nitrogen)"], ["P", "P2O5 (fosfor)"], ["K", "K2O (kalium)"]], when: { mode: ["single"] } },
    { id: "fert", label: "Pupuk", type: "select", default: "urea", options: [["urea", "Urea (46-0-0)"], ["an", "Amonium nitrat (34-0-0)"], ["as", "Amonium sulfat (21-0-0)"], ["dap", "DAP (18-46-0)"], ["ssp", "Superfosfat SSP (0-20-0)"], ["mop", "Kalium klorida MOP (0-0-60)"], ["sop", "Kalium sulfat SOP (0-0-50)"], ["npk15", "NPK (15-15-15)"], ["npk20", "NPK (20-20-20)"], ["custom", "Pupuk kustom"]], when: { mode: ["single"] } },
    { id: "cN", label: "Persentase N pada pupuk kustom", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "cP", label: "Persentase P2O5 pada pupuk kustom", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "cK", label: "Persentase K2O pada pupuk kustom", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "tN", label: "Target N", unit: "kg/ha", type: "number", default: "100", when: { mode: ["mix"] } },
    { id: "tP", label: "Target P2O5", unit: "kg/ha", type: "number", default: "46", when: { mode: ["mix"] } },
    { id: "tK", label: "Target K2O", unit: "kg/ha", type: "number", default: "60", when: { mode: ["mix"] } }
  ],
  example: { values: { area: "1", areaUnit: "ha", mode: "single", rate: "100", nutrient: "N", fert: "urea", cN: "0", cP: "0", cK: "0", tN: "100", tP: "46", tK: "60" }, expect: ["217.4 kg"], note: "Contoh: 100 kg N/ha dari urea pada satu hektar." },
  invalid: { values: { area: "1", areaUnit: "ha", mode: "single", rate: "100", nutrient: "N", fert: "mop", cN: "0", cP: "0", cK: "0", tN: "100", tP: "46", tK: "60" } },
  related: ["irrigation", "calorie-needs"]
};

function singlePlan(input, areaRaw, areaHa, unit) {
  const rate = num(input, "rate", "Kebutuhan unsur", { positive: true });
  const nut = choice(input, "nutrient", "Unsur", ["N", "P", "K"], "N");
  const fk = choice(input, "fert", "Pupuk", ["urea", "an", "as", "dap", "ssp", "mop", "sop", "npk15", "npk20", "custom"], "urea");
  const content = fk === "custom"
    ? { name: "Pupuk kustom", N: num(input, "cN", "Persentase N", { nonNegative: true, max: 100, default: 0 }), P: num(input, "cP", "Persentase P2O5", { nonNegative: true, max: 100, default: 0 }), K: num(input, "cK", "Persentase K2O", { nonNegative: true, max: 100, default: 0 }) }
    : FERTS[fk];
  const pct = content[nut];
  if (!(pct > 0)) fail(`${content.name} tidak mengandung ${NUTRIENT_NAME[nut]}, pilih pupuk lain.`, "fert");
  const perHa = rate / (pct / 100);
  const total = perHa * areaHa;
  const bags = Math.ceil(total / BAG);
  const steps = [
    { text: "Jumlah pupuk per hektar = kebutuhan ÷ persentase unsur:", tex: `m_{ha} = \\frac{${ntex(rate)}}{${ntex(pct / 100, 6)}} = ${ntex(perHa, 6)}\\ kg/ha` },
    { text: "Konversi luas ke hektar:", tex: `A = ${ntex(areaRaw)} \\times ${ntex(AREA[unit], 6)} = ${ntex(areaHa, 6)}\\ ha` },
    { text: "Jumlah total:", tex: `M = m_{ha} \\times A = ${ntex(perHa, 6)} \\times ${ntex(areaHa, 6)} = ${ntex(total, 6)}\\ kg` }
  ];
  return {
    results: [
      { label: "Jumlah pupuk total", value: `${fmt(total, 4)} kg`, text: `${fmt(total, 4)} kg` },
      { label: "Jumlah per hektar", value: `${fmt(perHa, 4)} kg/ha` },
      { label: "Persentase unsur dalam pupuk", value: `${fmt(pct, 4)} %` },
      { label: "Jumlah kantong 50 kg", value: `${bags}` }
    ],
    steps,
    copy: `${content.name} untuk ${NUTRIENT_NAME[nut]}: ${fmt(total, 4)} kg`,
    values: { perHa, total, bags, pct }
  };
}

function mixPlan(input, areaHa) {
  const tN = num(input, "tN", "Target N", { nonNegative: true, default: 0 });
  const tP = num(input, "tP", "Target P2O5", { nonNegative: true, default: 0 });
  const tK = num(input, "tK", "Target K2O", { nonNegative: true, default: 0 });
  if (tN + tP + tK <= 0) fail("Masukkan target positif untuk setidaknya satu unsur.", "tN");
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
    { text: "DAP untuk memenuhi P2O5:", tex: `D = \\frac{${ntex(tP)}}{0.46} = ${ntex(dap, 6)}\\ kg/ha` },
    { text: "Nitrogen yang disediakan DAP:", tex: `N_{DAP} = ${ntex(dap, 6)} \\times 0.18 = ${ntex(dapN, 6)}\\ kg/ha` },
    { text: "Urea untuk memenuhi sisa N:", tex: `U = \\frac{\\max(${ntex(tN)} - ${ntex(dapN, 6)},\\ 0)}{0.46} = ${ntex(urea, 6)}\\ kg/ha` },
    { text: "MOP untuk memenuhi K2O:", tex: `M = \\frac{${ntex(tK)}}{0.60} = ${ntex(mop, 6)}\\ kg/ha` }
  ];
  const blocks = [
    {
      type: "table",
      caption: "Jumlah campuran",
      head: ["Pupuk", "Per hektar (kg)", "Untuk seluruh luas (kg)", "Kantong 50 kg"],
      rows: rows.map(([n, perHa, tot]) => [n, fmt(perHa, 4), fmt(tot, 4), String(Math.ceil(tot / BAG))])
    },
    dapN > tN
      ? { type: "note", text: `DAP menyediakan ${fmt(dapN, 4)} kg N per hektar, lebih tinggi dari target nitrogen, sehingga urea tidak ditambahkan.`, tone: "warn" }
      : { type: "note", text: `${fmt(dapN, 4)} kg N per hektar yang disediakan DAP telah dihitung sebagai bagian dari target nitrogen.` }
  ];
  const totals = rows.map(([n, , tot]) => `${n}: ${fmt(tot, 4)} kg`).join("، ");
  return {
    results: [
      { label: "DAP", value: `${fmt(dap * areaHa, 4)} kg` },
      { label: "MOP", value: `${fmt(mop * areaHa, 4)} kg` },
      { label: "Urea", value: `${fmt(urea * areaHa, 4)} kg` },
      { label: "N yang benar-benar ditambahkan", value: `${fmt(suppliedN, 4)} kg/ha` },
      { label: "P2O5 yang benar-benar ditambahkan", value: `${fmt(suppliedP, 4)} kg/ha` },
      { label: "K2O yang benar-benar ditambahkan", value: `${fmt(suppliedK, 4)} kg/ha` }
    ],
    steps,
    copy: `Campuran: ${totals}`,
    blocks,
    values: { dap, urea, mop, dapN, suppliedN, suppliedP, suppliedK, areaHa }
  };
}

export function solve(input) {
  const areaRaw = num(input, "area", "Luas", { positive: true });
  const unit = choice(input, "areaUnit", "Satuan luas", ["m2", "dunum", "ha"], "ha");
  const areaHa = areaRaw * AREA[unit];
  const mode = choice(input, "mode", "Metode", ["single", "mix"], "single");
  if (mode === "mix") return mixPlan(input, areaHa);
  return singlePlan(input, areaRaw, areaHa, unit);
}
