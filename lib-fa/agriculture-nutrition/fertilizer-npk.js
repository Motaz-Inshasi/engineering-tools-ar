import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const AREA = { m2: 1e-4, dunum: 0.1, ha: 1 };
const BAG = 50;

const FERTS = {
  urea: { name: "اوره (46-0-0)", N: 46, P: 0, K: 0 },
  an: { name: "نیترات آمونیوم (34-0-0)", N: 34, P: 0, K: 0 },
  as: { name: "سولفات آمونیوم (21-0-0)", N: 21, P: 0, K: 0 },
  dap: { name: "DAP (18-46-0)", N: 18, P: 46, K: 0 },
  ssp: { name: "سوپرفسفات تک‌کلسیم SSP (0-20-0)", N: 0, P: 20, K: 0 },
  mop: { name: "کلرید پتاسیم MOP (0-0-60)", N: 0, P: 0, K: 60 },
  sop: { name: "سولفات پتاسیم SOP (0-0-50)", N: 0, P: 0, K: 50 },
  npk15: { name: "NPK (15-15-15)", N: 15, P: 15, K: 15 },
  npk20: { name: "NPK (20-20-20)", N: 20, P: 20, K: 20 }
};

const NUTRIENT_NAME = { N: "نیتروژن N", P: "فسفر P2O5", K: "پتاسیم K2O" };

export const meta = {
  description: "محاسبه مقدار کود لازم برای تأمین نیاز یک عنصر از N یا P2O5 یا K2O برای مساحت معین، یا طراحی مخلوط DAP و MOP و اوره برای تأمین هم‌زمان هدف‌های N و P و K، همراه با تعداد کیسه‌های 50 کیلوگرمی.",
  keywords: ["کود", "NPK", "اوره", "DAP", "MOP", "کود", "نیتروژن", "فسفر", "پتاسیم", "fertilizer"],
  formulas: [
    { label: "مقدار کود برای یک عنصر", tex: "m_{ha} = \\frac{R}{p/100},\\qquad M = m_{ha}\\cdot A_{ha}" },
    { label: "مخلوط DAP و MOP و اوره", tex: "D = \\frac{P_{target}}{0.46},\\quad U = \\frac{N_{target} - 0.18D}{0.46},\\quad K = \\frac{K_{target}}{0.60}" }
  ],
  inputs: [
    { id: "area", label: "مساحت", type: "number", default: "1" },
    { id: "areaUnit", label: "واحد مساحت", type: "select", default: "ha", options: [["m2", "م²"], ["dunum", "دونم (1000 م²)"], ["ha", "هکتار"]] },
    { id: "mode", label: "روش", type: "select", default: "single", options: [["single", "نیاز یک عنصر"], ["mix", "مخلوط سه عنصر (DAP و MOP و اوره)"]] },
    { id: "rate", label: "نیاز از عنصر", unit: "kg/ha", type: "number", default: "100", when: { mode: ["single"] } },
    { id: "nutrient", label: "عنصر", type: "select", default: "N", options: [["N", "N (نیتروژن)"], ["P", "P2O5 (فسفر)"], ["K", "K2O (پتاسیم)"]], when: { mode: ["single"] } },
    { id: "fert", label: "کود", type: "select", default: "urea", options: [["urea", "اوره (46-0-0)"], ["an", "نیترات آمونیوم (34-0-0)"], ["as", "سولفات آمونیوم (21-0-0)"], ["dap", "DAP (18-46-0)"], ["ssp", "سوپرفسفات تک‌کلسیم SSP (0-20-0)"], ["mop", "کلرید پتاسیم MOP (0-0-60)"], ["sop", "سولفات پتاسیم SOP (0-0-50)"], ["npk15", "NPK (15-15-15)"], ["npk20", "NPK (20-20-20)"], ["custom", "کود سفارشی"]], when: { mode: ["single"] } },
    { id: "cN", label: "درصد N در کود سفارشی", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "cP", label: "درصد P2O5 در کود سفارشی", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "cK", label: "درصد K2O در کود سفارشی", unit: "%", type: "number", default: "0", when: { fert: ["custom"] } },
    { id: "tN", label: "هدف N", unit: "kg/ha", type: "number", default: "100", when: { mode: ["mix"] } },
    { id: "tP", label: "هدف P2O5", unit: "kg/ha", type: "number", default: "46", when: { mode: ["mix"] } },
    { id: "tK", label: "هدف K2O", unit: "kg/ha", type: "number", default: "60", when: { mode: ["mix"] } }
  ],
  example: { values: { area: "1", areaUnit: "ha", mode: "single", rate: "100", nutrient: "N", fert: "urea", cN: "0", cP: "0", cK: "0", tN: "100", tP: "46", tK: "60" }, expect: ["217.4 کیلوگرم"], note: "مثال: 100 کیلوگرم N در هکتار از اوره روی یک هکتار." },
  invalid: { values: { area: "1", areaUnit: "ha", mode: "single", rate: "100", nutrient: "N", fert: "mop", cN: "0", cP: "0", cK: "0", tN: "100", tP: "46", tK: "60" } },
  related: ["irrigation", "calorie-needs"]
};

function singlePlan(input, areaRaw, areaHa, unit) {
  const rate = num(input, "rate", "نیاز از عنصر", { positive: true });
  const nut = choice(input, "nutrient", "عنصر", ["N", "P", "K"], "N");
  const fk = choice(input, "fert", "کود", ["urea", "an", "as", "dap", "ssp", "mop", "sop", "npk15", "npk20", "custom"], "urea");
  const content = fk === "custom"
    ? { name: "کود سفارشی", N: num(input, "cN", "درصد N", { nonNegative: true, max: 100, default: 0 }), P: num(input, "cP", "درصد P2O5", { nonNegative: true, max: 100, default: 0 }), K: num(input, "cK", "درصد K2O", { nonNegative: true, max: 100, default: 0 }) }
    : FERTS[fk];
  const pct = content[nut];
  if (!(pct > 0)) fail(`${content.name} حاوی ${NUTRIENT_NAME[nut]} نیست؛ کود دیگری انتخاب کنید.`, "fert");
  const perHa = rate / (pct / 100);
  const total = perHa * areaHa;
  const bags = Math.ceil(total / BAG);
  const steps = [
    { text: "مقدار کود در هکتار = نیاز ÷ درصد عنصر:", tex: `m_{ha} = \\frac{${ntex(rate)}}{${ntex(pct / 100, 6)}} = ${ntex(perHa, 6)}\\ kg/ha` },
    { text: "تبدیل مساحت به هکتار:", tex: `A = ${ntex(areaRaw)} \\times ${ntex(AREA[unit], 6)} = ${ntex(areaHa, 6)}\\ ha` },
    { text: "مقدار کل:", tex: `M = m_{ha} \\times A = ${ntex(perHa, 6)} \\times ${ntex(areaHa, 6)} = ${ntex(total, 6)}\\ kg` }
  ];
  return {
    results: [
      { label: "مقدار کل کود", value: `${fmt(total, 4)} کیلوگرم`, text: `${fmt(total, 4)} کیلوگرم` },
      { label: "مقدار در هکتار", value: `${fmt(perHa, 4)} کیلوگرم در هکتار` },
      { label: "درصد عنصر در کود", value: `${fmt(pct, 4)} %` },
      { label: "تعداد کیسه‌های 50 کیلوگرمی", value: `${bags}` }
    ],
    steps,
    copy: `${content.name} برای ${NUTRIENT_NAME[nut]}: ${fmt(total, 4)} کیلوگرم`,
    values: { perHa, total, bags, pct }
  };
}

function mixPlan(input, areaHa) {
  const tN = num(input, "tN", "هدف N", { nonNegative: true, default: 0 });
  const tP = num(input, "tP", "هدف P2O5", { nonNegative: true, default: 0 });
  const tK = num(input, "tK", "هدف K2O", { nonNegative: true, default: 0 });
  if (tN + tP + tK <= 0) fail("حداقل برای یک عنصر، هدف مثبت وارد کنید.", "tN");
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
    ["اوره (46-0-0)", urea, urea * areaHa]
  ];
  const steps = [
    { text: "DAP برای تأمین P2O5:", tex: `D = \\frac{${ntex(tP)}}{0.46} = ${ntex(dap, 6)}\\ kg/ha` },
    { text: "نیتروژن تأمین‌شده توسط DAP:", tex: `N_{DAP} = ${ntex(dap, 6)} \\times 0.18 = ${ntex(dapN, 6)}\\ kg/ha` },
    { text: "اوره برای تأمین باقی‌مانده N:", tex: `U = \\frac{\\max(${ntex(tN)} - ${ntex(dapN, 6)},\\ 0)}{0.46} = ${ntex(urea, 6)}\\ kg/ha` },
    { text: "MOP برای تأمین K2O:", tex: `M = \\frac{${ntex(tK)}}{0.60} = ${ntex(mop, 6)}\\ kg/ha` }
  ];
  const blocks = [
    {
      type: "table",
      caption: "مقادیر مخلوط",
      head: ["کود", "در هکتار (کیلوگرم)", "برای کل مساحت (کیلوگرم)", "کیسه‌های 50 کیلوگرمی"],
      rows: rows.map(([n, perHa, tot]) => [n, fmt(perHa, 4), fmt(tot, 4), String(Math.ceil(tot / BAG))])
    },
    dapN > tN
      ? { type: "note", text: `DAP به میزان ${fmt(dapN, 4)} کیلوگرم N در هکتار تأمین می‌کند که از هدف نیتروژن بیشتر است، بنابراین اوره اضافه نشد.`, tone: "warn" }
      : { type: "note", text: `${fmt(dapN, 4)} کیلوگرم N در هکتار که DAP تأمین می‌کند در هدف نیتروژن محاسبه شد.` }
  ];
  const totals = rows.map(([n, , tot]) => `${n}: ${fmt(tot, 4)} کیلوگرم`).join("، ");
  return {
    results: [
      { label: "DAP", value: `${fmt(dap * areaHa, 4)} کیلوگرم` },
      { label: "MOP", value: `${fmt(mop * areaHa, 4)} کیلوگرم` },
      { label: "اوره", value: `${fmt(urea * areaHa, 4)} کیلوگرم` },
      { label: "N تأمین‌شده واقعی", value: `${fmt(suppliedN, 4)} kg/ha` },
      { label: "P2O5 تأمین‌شده واقعی", value: `${fmt(suppliedP, 4)} kg/ha` },
      { label: "K2O تأمین‌شده واقعی", value: `${fmt(suppliedK, 4)} kg/ha` }
    ],
    steps,
    copy: `مخلوط: ${totals}`,
    blocks,
    values: { dap, urea, mop, dapN, suppliedN, suppliedP, suppliedK, areaHa }
  };
}

export function solve(input) {
  const areaRaw = num(input, "area", "مساحت", { positive: true });
  const unit = choice(input, "areaUnit", "واحد مساحت", ["m2", "dunum", "ha"], "ha");
  const areaHa = areaRaw * AREA[unit];
  const mode = choice(input, "mode", "روش", ["single", "mix"], "single");
  if (mode === "mix") return mixPlan(input, areaHa);
  return singlePlan(input, areaRaw, areaHa, unit);
}
