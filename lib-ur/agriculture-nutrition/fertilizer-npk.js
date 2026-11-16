import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const AREA = { m2: 1e-4, dunum: 0.1, ha: 1 };
const BAG = 50;

const FERTS = {
  urea: { name: "یوریا (46-0-0)", N: 46, P: 0, K: 0 },
  an: { name: "امونیم نائٹریٹ (34-0-0)", N: 34, P: 0, K: 0 },
  as: { name: "امونیم سلفیٹ (21-0-0)", N: 21, P: 0, K: 0 },
  dap: { name: "DAP (18-46-0)", N: 18, P: 46, K: 0 },
  ssp: { name: "سنگل سپر فاسفیٹ SSP (0-20-0)", N: 0, P: 20, K: 0 },
  mop: { name: "پوٹاشیم کلورائیڈ MOP (0-0-60)", N: 0, P: 0, K: 60 },
  sop: { name: "پوٹاشیم سلفیٹ SOP (0-0-50)", N: 0, P: 0, K: 50 },
  npk15: { name: "NPK (15-15-15)", N: 15, P: 15, K: 15 },
  npk20: { name: "NPK (20-20-20)", N: 20, P: 20, K: 20 }
};

const NUTRIENT_NAME = { N: "نائٹروجن N", P: "فاسفورس P2O5", K: "پوٹاشیم K2O" };

export const meta = {
  description: "ایک غذائی جزو (N، P2O5 یا K2O) کی ضرورت پورا کرنے کے لیے کسی مخصوص رقبے کی کھاد کی مقدار حساب کریں، یا N، P اور K کے اہداف یکجا پورے کرنے کے لیے DAP، MOP اور یوریا کا مرکب بنائیں، ساتھ 50 kg بوریوں کی تعداد۔",
  keywords: ["کھاد", "NPK", "یوریا", "DAP", "MOP", "کھاد", "نائٹروجن", "فاسفورس", "پوٹاشیم", "fertilizer"],
  formulas: [
    { label: "ایک جزو کے لیے کھاد کی مقدار", tex: "m_{ha} = \\frac{R}{p/100},\\qquad M = m_{ha}\\cdot A_{ha}" },
    { label: "DAP، MOP اور یوریا کا مرکب", tex: "D = \\frac{P_{target}}{0.46},\\quad U = \\frac{N_{target} - 0.18D}{0.46},\\quad K = \\frac{K_{target}}{0.60}" }
  ],
  inputs: [
    { id: "area", label: "رقبہ", type: "number", default: "1" },
    { id: "areaUnit", label: "رقبے کی اکائی", type: "select", default: "ha", options: [["m2", "m²"], ["dunum", "دونم (1000 m²)"], ["ha", "ہیکٹر"]] },
    { id: "mode", label: "طریقہ", type: "select", default: "single", options: [["single", "ایک جزو کی ضرورت"], ["mix", "تین اجزا کا مرکب (DAP، MOP اور یوریا)"]] },
    { id: "rate", label: "جزو کی ضرورت", unit: "kg/ha", type: "number", default: "100", when: { mode: ["single"] } },
    { id: "nutrient", label: "جزو", type: "select", default: "N", options: [["N", "N (نائٹروجن)"], ["P", "P2O5 (فاسفورس)"], ["K", "K2O (پوٹاشیم)"]], when: { mode: ["single"] } },
    { id: "fert", label: "کھاد", type: "select", default: "urea", options: [["urea", "یوریا (46-0-0)"], ["an", "امونیم نائٹریٹ (34-0-0)"], ["as", "امونیم سلفیٹ (21-0-0)"], ["dap", "DAP (18-46-0)"], ["ssp", "سنگل سپر فاسفیٹ SSP (0-20-0)"], ["mop", "پوٹاشیم کلورائیڈ MOP (0-0-60)"], ["sop", "پوٹاشیم سلفیٹ SOP (0-0-50)"], ["npk15", "NPK (15-15-15)"], ["npk20", "NPK (20-20-20)"], ["custom", "مخصوص کھاد"]], when: { mode: ["single"] } },
    { id: "cN", label: "مخصوص کھاد میں N کا فیصد", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "cP", label: "مخصوص کھاد میں P2O5 کا فیصد", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "cK", label: "مخصوص کھاد میں K2O کا فیصد", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "tN", label: "N کا ہدف", unit: "kg/ha", type: "number", default: "100", when: { mode: ["mix"] } },
    { id: "tP", label: "P2O5 کا ہدف", unit: "kg/ha", type: "number", default: "46", when: { mode: ["mix"] } },
    { id: "tK", label: "K2O کا ہدف", unit: "kg/ha", type: "number", default: "60", when: { mode: ["mix"] } }
  ],
  example: { values: { area: "1", areaUnit: "ha", mode: "single", rate: "100", nutrient: "N", fert: "urea", cN: "0", cP: "0", cK: "0", tN: "100", tP: "46", tK: "60" }, expect: ["217.4 kg"], note: "مثال: ایک ہیکٹر پر یوریا سے 100 kg N/ha۔" },
  invalid: { values: { area: "1", areaUnit: "ha", mode: "single", rate: "100", nutrient: "N", fert: "mop", cN: "0", cP: "0", cK: "0", tN: "100", tP: "46", tK: "60" } },
  related: ["irrigation", "calorie-needs"]
};

function singlePlan(input, areaRaw, areaHa, unit) {
  const rate = num(input, "rate", "جزو کی ضرورت", { positive: true });
  const nut = choice(input, "nutrient", "جزو", ["N", "P", "K"], "N");
  const fk = choice(input, "fert", "کھاد", ["urea", "an", "as", "dap", "ssp", "mop", "sop", "npk15", "npk20", "custom"], "urea");
  const content = fk === "custom"
    ? { name: "مخصوص کھاد", N: num(input, "cN", "N کا فیصد", { nonNegative: true, max: 100, default: 0 }), P: num(input, "cP", "P2O5 کا فیصد", { nonNegative: true, max: 100, default: 0 }), K: num(input, "cK", "K2O کا فیصد", { nonNegative: true, max: 100, default: 0 }) }
    : FERTS[fk];
  const pct = content[nut];
  if (!(pct > 0)) fail(`${content.name} میں ${NUTRIENT_NAME[nut]} نہیں ہے، کوئی اور کھاد منتخب کریں۔`, "fert");
  const perHa = rate / (pct / 100);
  const total = perHa * areaHa;
  const bags = Math.ceil(total / BAG);
  const steps = [
    { text: "فی ہیکٹر کھاد کی مقدار = ضرورت ÷ جزو کا فیصد:", tex: `m_{ha} = \\frac{${ntex(rate)}}{${ntex(pct / 100, 6)}} = ${ntex(perHa, 6)}\\ kg/ha` },
    { text: "رقبے کو ہیکٹر میں تبدیل کریں:", tex: `A = ${ntex(areaRaw)} \\times ${ntex(AREA[unit], 6)} = ${ntex(areaHa, 6)}\\ ha` },
    { text: "کل مقدار:", tex: `M = m_{ha} \\times A = ${ntex(perHa, 6)} \\times ${ntex(areaHa, 6)} = ${ntex(total, 6)}\\ kg` }
  ];
  return {
    results: [
      { label: "کل کھاد کی مقدار", value: `${fmt(total, 4)} kg`, text: `${fmt(total, 4)} kg` },
      { label: "فی ہیکٹر مقدار", value: `${fmt(perHa, 4)} kg/ha` },
      { label: "کھاد میں جزو کا فیصد", value: `${fmt(pct, 4)} %` },
      { label: "50 kg بوریوں کی تعداد", value: `${bags}` }
    ],
    steps,
    copy: `${content.name} برائے ${NUTRIENT_NAME[nut]}: ${fmt(total, 4)} kg`,
    values: { perHa, total, bags, pct }
  };
}

function mixPlan(input, areaHa) {
  const tN = num(input, "tN", "N کا ہدف", { nonNegative: true, default: 0 });
  const tP = num(input, "tP", "P2O5 کا ہدف", { nonNegative: true, default: 0 });
  const tK = num(input, "tK", "K2O کا ہدف", { nonNegative: true, default: 0 });
  if (tN + tP + tK <= 0) fail("کم از کم ایک جزو کے لیے مثبت ہدف درج کریں۔", "tN");
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
    ["یوریا (46-0-0)", urea, urea * areaHa]
  ];
  const steps = [
    { text: "P2O5 کے لیے DAP:", tex: `D = \\frac{${ntex(tP)}}{0.46} = ${ntex(dap, 6)}\\ kg/ha` },
    { text: "DAP سے فراہم ہونے والا نائٹروجن:", tex: `N_{DAP} = ${ntex(dap, 6)} \\times 0.18 = ${ntex(dapN, 6)}\\ kg/ha` },
    { text: "باقی N کے لیے یوریا:", tex: `U = \\frac{\\max(${ntex(tN)} - ${ntex(dapN, 6)},\\ 0)}{0.46} = ${ntex(urea, 6)}\\ kg/ha` },
    { text: "K2O کے لیے MOP:", tex: `M = \\frac{${ntex(tK)}}{0.60} = ${ntex(mop, 6)}\\ kg/ha` }
  ];
  const blocks = [
    {
      type: "table",
      caption: "مرکب کی مقداریں",
      head: ["کھاد", "فی ہیکٹر (kg)", "پورے رقبے کے لیے (kg)", "50 kg بوریاں"],
      rows: rows.map(([n, perHa, tot]) => [n, fmt(perHa, 4), fmt(tot, 4), String(Math.ceil(tot / BAG))])
    },
    dapN > tN
      ? { type: "note", text: `DAP فی ہیکٹر ${fmt(dapN, 4)} kg N فراہم کرتا ہے، جو نائٹروجن کے ہدف سے زیادہ ہے، اس لیے یوریا شامل نہیں کی گئی۔`, tone: "warn" }
      : { type: "note", text: `DAP کی فراہم کردہ ${fmt(dapN, 4)} kg N فی ہیکٹر نائٹروجن کے ہدف میں شمار کی گئی ہے۔` }
  ];
  const totals = rows.map(([n, , tot]) => `${n}: ${fmt(tot, 4)} kg`).join("، ");
  return {
    results: [
      { label: "DAP", value: `${fmt(dap * areaHa, 4)} kg` },
      { label: "MOP", value: `${fmt(mop * areaHa, 4)} kg` },
      { label: "یوریا", value: `${fmt(urea * areaHa, 4)} kg` },
      { label: "حقیقتاً فراہم کردہ N", value: `${fmt(suppliedN, 4)} kg/ha` },
      { label: "حقیقتاً فراہم کردہ P2O5", value: `${fmt(suppliedP, 4)} kg/ha` },
      { label: "حقیقتاً فراہم کردہ K2O", value: `${fmt(suppliedK, 4)} kg/ha` }
    ],
    steps,
    copy: `مرکب: ${totals}`,
    blocks,
    values: { dap, urea, mop, dapN, suppliedN, suppliedP, suppliedK, areaHa }
  };
}

export function solve(input) {
  const areaRaw = num(input, "area", "رقبہ", { positive: true });
  const unit = choice(input, "areaUnit", "رقبے کی اکائی", ["m2", "dunum", "ha"], "ha");
  const areaHa = areaRaw * AREA[unit];
  const mode = choice(input, "mode", "طریقہ", ["single", "mix"], "single");
  if (mode === "mix") return mixPlan(input, areaHa);
  return singlePlan(input, areaRaw, areaHa, unit);
}
