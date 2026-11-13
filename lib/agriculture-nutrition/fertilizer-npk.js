import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const AREA = { m2: 1e-4, dunum: 0.1, ha: 1 };
const BAG = 50;

const FERTS = {
  urea: { name: "يوريا (46-0-0)", N: 46, P: 0, K: 0 },
  an: { name: "نترات الأمونيوم (34-0-0)", N: 34, P: 0, K: 0 },
  as: { name: "كبريتات الأمونيوم (21-0-0)", N: 21, P: 0, K: 0 },
  dap: { name: "DAP (18-46-0)", N: 18, P: 46, K: 0 },
  ssp: { name: "السوبر فوسفات الأحادي SSP (0-20-0)", N: 0, P: 20, K: 0 },
  mop: { name: "كلوريد البوتاسيوم MOP (0-0-60)", N: 0, P: 0, K: 60 },
  sop: { name: "سلفات البوتاسيوم SOP (0-0-50)", N: 0, P: 0, K: 50 },
  npk15: { name: "NPK (15-15-15)", N: 15, P: 15, K: 15 },
  npk20: { name: "NPK (20-20-20)", N: 20, P: 20, K: 20 }
};

const NUTRIENT_NAME = { N: "النيتروجين N", P: "الفوسفور P2O5", K: "البوتاسيوم K2O" };

export const meta = {
  description: "احسب كمية السماد اللازمة لتغطية احتياج عنصر واحد من N أو P2O5 أو K2O لمساحة محددة، أو صمّم خلطة DAP وMOP واليوريا لتغطية أهداف N وP وK معاً، مع عدد أكياس 50 كغ.",
  keywords: ["أسمدة", "NPK", "يوريا", "DAP", "MOP", "سماد", "نيتروجين", "فوسفور", "بوتاسيوم", "fertilizer"],
  formulas: [
    { label: "كمية السماد لعنصر واحد", tex: "m_{ha} = \\frac{R}{p/100},\\qquad M = m_{ha}\\cdot A_{ha}" },
    { label: "خلطة DAP وMOP واليوريا", tex: "D = \\frac{P_{target}}{0.46},\\quad U = \\frac{N_{target} - 0.18D}{0.46},\\quad K = \\frac{K_{target}}{0.60}" }
  ],
  inputs: [
    { id: "area", label: "المساحة", type: "number", default: "1" },
    { id: "areaUnit", label: "وحدة المساحة", type: "select", default: "ha", options: [["m2", "م²"], ["dunum", "دونم (1000 م²)"], ["ha", "هكتار"]] },
    { id: "mode", label: "الطريقة", type: "select", default: "single", options: [["single", "احتياج عنصر واحد"], ["mix", "خلطة لثلاثة عناصر (DAP وMOP واليوريا)"]] },
    { id: "rate", label: "الاحتياج من العنصر", unit: "kg/ha", type: "number", default: "100", when: { mode: ["single"] } },
    { id: "nutrient", label: "العنصر", type: "select", default: "N", options: [["N", "N (نيتروجين)"], ["P", "P2O5 (فوسفور)"], ["K", "K2O (بوتاسيوم)"]], when: { mode: ["single"] } },
    { id: "fert", label: "السماد", type: "select", default: "urea", options: [["urea", "يوريا (46-0-0)"], ["an", "نترات الأمونيوم (34-0-0)"], ["as", "كبريتات الأمونيوم (21-0-0)"], ["dap", "DAP (18-46-0)"], ["ssp", "السوبر فوسفات SSP (0-20-0)"], ["mop", "كلوريد البوتاسيوم MOP (0-0-60)"], ["sop", "سلفات البوتاسيوم SOP (0-0-50)"], ["npk15", "NPK (15-15-15)"], ["npk20", "NPK (20-20-20)"], ["custom", "سماد مخصص"]], when: { mode: ["single"] } },
    { id: "cN", label: "نسبة N في السماد المخصص", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "cP", label: "نسبة P2O5 في السماد المخصص", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "cK", label: "نسبة K2O في السماد المخصص", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "tN", label: "الهدف من N", unit: "kg/ha", type: "number", default: "100", when: { mode: ["mix"] } },
    { id: "tP", label: "الهدف من P2O5", unit: "kg/ha", type: "number", default: "46", when: { mode: ["mix"] } },
    { id: "tK", label: "الهدف من K2O", unit: "kg/ha", type: "number", default: "60", when: { mode: ["mix"] } }
  ],
  example: { values: { area: "1", areaUnit: "ha", mode: "single", rate: "100", nutrient: "N", fert: "urea", cN: "0", cP: "0", cK: "0", tN: "100", tP: "46", tK: "60" }, expect: ["217.4 كغ"], note: "مثال: 100 كغ N/هكتار من اليوريا على هكتار واحد." },
  invalid: { values: { area: "1", areaUnit: "ha", mode: "single", rate: "100", nutrient: "N", fert: "mop", cN: "0", cP: "0", cK: "0", tN: "100", tP: "46", tK: "60" } },
  related: ["irrigation", "calorie-needs"]
};

function singlePlan(input, areaRaw, areaHa, unit) {
  const rate = num(input, "rate", "الاحتياج من العنصر", { positive: true });
  const nut = choice(input, "nutrient", "العنصر", ["N", "P", "K"], "N");
  const fk = choice(input, "fert", "السماد", ["urea", "an", "as", "dap", "ssp", "mop", "sop", "npk15", "npk20", "custom"], "urea");
  const content = fk === "custom"
    ? { name: "سماد مخصص", N: num(input, "cN", "نسبة N", { nonNegative: true, max: 100, default: 0 }), P: num(input, "cP", "نسبة P2O5", { nonNegative: true, max: 100, default: 0 }), K: num(input, "cK", "نسبة K2O", { nonNegative: true, max: 100, default: 0 }) }
    : FERTS[fk];
  const pct = content[nut];
  if (!(pct > 0)) fail(`${content.name} لا يحتوي على ${NUTRIENT_NAME[nut]}، اختر سماداً آخر.`, "fert");
  const perHa = rate / (pct / 100);
  const total = perHa * areaHa;
  const bags = Math.ceil(total / BAG);
  const steps = [
    { text: "كمية السماد لكل هكتار = الاحتياج ÷ نسبة العنصر:", tex: `m_{ha} = \\frac{${ntex(rate)}}{${ntex(pct / 100, 6)}} = ${ntex(perHa, 6)}\\ kg/ha` },
    { text: "تحويل المساحة إلى هكتار:", tex: `A = ${ntex(areaRaw)} \\times ${ntex(AREA[unit], 6)} = ${ntex(areaHa, 6)}\\ ha` },
    { text: "الكمية الكلية:", tex: `M = m_{ha} \\times A = ${ntex(perHa, 6)} \\times ${ntex(areaHa, 6)} = ${ntex(total, 6)}\\ kg` }
  ];
  return {
    results: [
      { label: "كمية السماد الكلية", value: `${fmt(total, 4)} كغ`, text: `${fmt(total, 4)} كغ` },
      { label: "الكمية لكل هكتار", value: `${fmt(perHa, 4)} كغ/هكتار` },
      { label: "نسبة العنصر في السماد", value: `${fmt(pct, 4)} %` },
      { label: "عدد أكياس 50 كغ", value: `${bags}` }
    ],
    steps,
    copy: `${content.name} لـ ${NUTRIENT_NAME[nut]}: ${fmt(total, 4)} كغ`,
    values: { perHa, total, bags, pct }
  };
}

function mixPlan(input, areaHa) {
  const tN = num(input, "tN", "الهدف من N", { nonNegative: true, default: 0 });
  const tP = num(input, "tP", "الهدف من P2O5", { nonNegative: true, default: 0 });
  const tK = num(input, "tK", "الهدف من K2O", { nonNegative: true, default: 0 });
  if (tN + tP + tK <= 0) fail("أدخل هدفاً موجباً لعنصر واحد على الأقل.", "tN");
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
    ["يوريا (46-0-0)", urea, urea * areaHa]
  ];
  const steps = [
    { text: "DAP لتغطية P2O5:", tex: `D = \\frac{${ntex(tP)}}{0.46} = ${ntex(dap, 6)}\\ kg/ha` },
    { text: "النيتروجين الذي يوفره DAP:", tex: `N_{DAP} = ${ntex(dap, 6)} \\times 0.18 = ${ntex(dapN, 6)}\\ kg/ha` },
    { text: "اليوريا لتغطية الباقي من N:", tex: `U = \\frac{\\max(${ntex(tN)} - ${ntex(dapN, 6)},\\ 0)}{0.46} = ${ntex(urea, 6)}\\ kg/ha` },
    { text: "MOP لتغطية K2O:", tex: `M = \\frac{${ntex(tK)}}{0.60} = ${ntex(mop, 6)}\\ kg/ha` }
  ];
  const blocks = [
    {
      type: "table",
      caption: "كميات الخلطة",
      head: ["السماد", "لكل هكتار (كغ)", "للمساحة كاملة (كغ)", "أكياس 50 كغ"],
      rows: rows.map(([n, perHa, tot]) => [n, fmt(perHa, 4), fmt(tot, 4), String(Math.ceil(tot / BAG))])
    },
    dapN > tN
      ? { type: "note", text: `DAP يوفر ${fmt(dapN, 4)} كغ N لكل هكتار، وهو أعلى من هدف النيتروجين، لذلك لم تُضف اليوريا.`, tone: "warn" }
      : { type: "note", text: `تم احتساب ${fmt(dapN, 4)} كغ N لكل هكتار يوفرها DAP ضمن هدف النيتروجين.` }
  ];
  const totals = rows.map(([n, , tot]) => `${n}: ${fmt(tot, 4)} كغ`).join("، ");
  return {
    results: [
      { label: "DAP", value: `${fmt(dap * areaHa, 4)} كغ` },
      { label: "MOP", value: `${fmt(mop * areaHa, 4)} كغ` },
      { label: "اليوريا", value: `${fmt(urea * areaHa, 4)} كغ` },
      { label: "N المضاف فعلياً", value: `${fmt(suppliedN, 4)} kg/ha` },
      { label: "P2O5 المضاف فعلياً", value: `${fmt(suppliedP, 4)} kg/ha` },
      { label: "K2O المضاف فعلياً", value: `${fmt(suppliedK, 4)} kg/ha` }
    ],
    steps,
    copy: `خلطة: ${totals}`,
    blocks,
    values: { dap, urea, mop, dapN, suppliedN, suppliedP, suppliedK, areaHa }
  };
}

export function solve(input) {
  const areaRaw = num(input, "area", "المساحة", { positive: true });
  const unit = choice(input, "areaUnit", "وحدة المساحة", ["m2", "dunum", "ha"], "ha");
  const areaHa = areaRaw * AREA[unit];
  const mode = choice(input, "mode", "الطريقة", ["single", "mix"], "single");
  if (mode === "mix") return mixPlan(input, areaHa);
  return singlePlan(input, areaRaw, areaHa, unit);
}
