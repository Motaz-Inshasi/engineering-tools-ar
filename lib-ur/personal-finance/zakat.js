import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const KARATS = ["24", "22", "21", "18"];
const RATE = 0.025;
const SILVER_NISAB_G = 595;
const GOLD_NISAB_G = 85;

export const meta = {
  description: "واجب الادا قرضے منہا کرنے کے بعد زکوٰۃ کے قابل مال پر زکوٰۃ کا حساب لگائیں، جس میں نقد رقم، قیراط کے لحاظ سے سونا، چاندی، تجارتی سامان، قابلِ وصول قرضے اور سرمایہ کاری شامل ہیں، اور بتائیں کہ سونے یا چاندی کے نصاب تک پہنچا گیا ہے یا نہیں۔",
  keywords: ["زکوٰۃ", "نصاب", "سونے کی زکوٰۃ", "چاندی کی زکوٰۃ", "مال کی زکوٰۃ", "زکوٰۃ کا حساب", "zakat"],
  formulas: [
    { label: "24 قیراط میں تبدیل شدہ سونے کی قدر", tex: "V_{Au} = G \\times \\frac{k}{24} \\times P_{Au}" },
    { label: "خالص زکوٰۃ کے قابل مال", tex: "N = A - D" },
    { label: "نصاب", tex: "N_{sb} = 595\\ \\text{g} \\times P_{Ag},\\qquad N_{gd} = 85\\ \\text{g} \\times P_{Au}" },
    { label: "زکوٰۃ", tex: "Z = 2.5\\% \\times N \\quad \\text{if } N \\ge \\text{Nisab}" }
  ],
  inputs: [
    { id: "cash", label: "نقد رقم اور بینک بیلنس", type: "number", default: "0" },
    { id: "goldG", label: "ملکیتی سونا", unit: "گرام", type: "number", default: "0" },
    { id: "karat", label: "سونے کا قیراط", type: "select", default: "24", options: [["24", "24 قیراط"], ["22", "22 قیراط"], ["21", "21 قیراط"], ["18", "18 قیراط"]] },
    { id: "silverG", label: "ملکیتی چاندی", unit: "گرام", type: "number", default: "0" },
    { id: "trade", label: "تجارتی سامان اور اسٹاک کی قدر", type: "number", default: "0" },
    { id: "receivables", label: "قابلِ وصول متوقع قرضے", type: "number", default: "0" },
    { id: "invest", label: "سرمایہ کاری اور حصص (مارکیٹ قدر)", type: "number", default: "0" },
    { id: "debts", label: "ابھی واجب الادا قرضے", type: "number", default: "0", help: "قلیل مدتی قرضے جو سال کے اندر واجب الادا ہوں، اثاثوں سے منہا کیے جاتے ہیں۔" },
    { id: "goldPrice", label: "24 قیراط سونے کا ایک گرام کا نرخ", type: "number", help: "اگر آپ کے پاس سونا ہو یا نصاب کی بنیاد سونا ہو تو ضروری ہے۔" },
    { id: "silverPrice", label: "چاندی کے ایک گرام کا نرخ", type: "number", help: "اگر آپ کے پاس چاندی ہو یا نصاب کی بنیاد چاندی ہو تو ضروری ہے۔" },
    { id: "basis", label: "نصاب کی بنیاد", type: "select", default: "silver", options: [["silver", "چاندی (595 گرام)"], ["gold", "سونا (85 گرام)"]], help: "بہت سے علماء اور ادارے چاندی کا نصاب اختیار کرتے ہیں کیونکہ یہ غریبوں کے لیے زیادہ نفع بخش ہے، جبکہ دیگر سونے کے نصاب پر عمل کرتے ہیں۔" }
  ],
  example: { values: { cash: "10000", goldG: "0", karat: "24", silverG: "0", trade: "0", receivables: "0", invest: "0", debts: "0", goldPrice: "", silverPrice: "1", basis: "silver" }, expect: ["250.00", "595.00"], note: "مثال: 10000 نقد اور چاندی کا نرخ 1 فی گرام، تو نصاب 595 ہے اور زکوٰۃ 250 ہے۔" },
  invalid: { values: { cash: "10000", goldG: "0", karat: "24", silverG: "0", trade: "0", receivables: "0", invest: "0", debts: "0", goldPrice: "", silverPrice: "", basis: "silver" } },
  related: ["budget-planner", "savings-goal", "compound-interest", "loan-amortization"]
};

export function solve(input) {
  const cash = num(input, "cash", "نقد اور بیلنس", { nonNegative: true, default: 0 });
  const goldG = num(input, "goldG", "سونے کا وزن", { nonNegative: true, default: 0 });
  const karat = Number(choice(input, "karat", "سونے کا قیراط", KARATS, "24"));
  const silverG = num(input, "silverG", "چاندی کا وزن", { nonNegative: true, default: 0 });
  const trade = num(input, "trade", "تجارتی سامان", { nonNegative: true, default: 0 });
  const receivables = num(input, "receivables", "قابلِ وصول قرضے", { nonNegative: true, default: 0 });
  const invest = num(input, "invest", "سرمایہ کاری", { nonNegative: true, default: 0 });
  const debts = num(input, "debts", "واجب الادا قرضے", { nonNegative: true, default: 0 });
  const basis = choice(input, "basis", "نصاب کی بنیاد", ["silver", "gold"], "silver");
  const goldPrice = num(input, "goldPrice", "سونے کا فی گرام نرخ", { nonNegative: true, optional: true });
  const silverPrice = num(input, "silverPrice", "چاندی کے ایک گرام کا نرخ", { nonNegative: true, optional: true });

  const gross = cash + goldG + silverG + trade + receivables + invest;
  if (!(gross > 0)) fail("زکوٰۃ کے قابل اثاثوں میں سے کسی ایک کی قدر صفر سے زیادہ درج کریں۔", "cash");
  if ((goldG > 0 || basis === "gold") && !(goldPrice > 0)) fail("سونے کی قدر یا نصاب کے حساب کے لیے 24 قیراط سونے کا ایک گرام کا نرخ درج کریں۔", "goldPrice");
  if ((silverG > 0 || basis === "silver") && !(silverPrice > 0)) fail("چاندی کی قدر یا نصاب کے حساب کے لیے چاندی کا ایک گرام کا نرخ درج کریں۔", "silverPrice");

  const goldValue = goldG > 0 ? goldG * (karat / 24) * goldPrice : 0;
  const silverValue = silverG > 0 ? silverG * silverPrice : 0;
  const assets = cash + goldValue + silverValue + trade + receivables + invest;
  const net = assets - debts;
  const gold = basis === "gold";
  const nisab = gold ? GOLD_NISAB_G * goldPrice : SILVER_NISAB_G * silverPrice;
  const basisLabel = gold ? "سونا" : "چاندی";
  const eligible = net > 0 && net >= nisab;
  const zakat = eligible ? net * RATE : 0;
  const status = eligible ? "مال نصاب کو پہنچ گیا ہے، اور ایک مکمل قمری سال گزرنے کی شرط پر زکوٰۃ واجب ہے" : "مال نصاب سے کم ہے، اس لیے زکوٰۃ واجب نہیں";

  const rows = [
    ["نقد رقم اور بینک بیلنس", money(cash)],
    [`سونا (${fmt(goldG)} گرام، ${karat} قیراط)`, money(goldValue)],
    [`چاندی (${fmt(silverG)} گرام)`, money(silverValue)],
    ["تجارتی سامان اور اسٹاک", money(trade)],
    ["قابلِ وصول قرضے", money(receivables)],
    ["سرمایہ کاری اور حصص", money(invest)],
    ["کل اثاثے", money(assets)],
    ["منہا واجب الادا قرضے", money(-debts)],
    ["خالص زکوٰۃ کے قابل مال", money(net)],
    [`نصاب (${basisLabel})`, money(nisab)]
  ];

  const steps = [];
  if (goldG > 0) steps.push({ text: "سونے کو 24 قیراط میں تبدیل کر کے اس کی قدر حساب کریں:", tex: `V_{Au} = ${ntex(goldG)} \\times \\frac{${karat}}{24} \\times ${ntex(goldPrice)} = ${ntex(goldValue, 8)}` });
  if (silverG > 0) steps.push({ text: "چاندی کی قدر:", tex: `V_{Ag} = ${ntex(silverG)} \\times ${ntex(silverPrice)} = ${ntex(silverValue, 8)}` });
  steps.push({ text: "زکوٰۃ کے قابل کل اثاثے، پھر واجب الادا قرضے منہا کریں:", tex: `N = A - D = ${ntex(assets, 8)} - ${ntex(debts, 8)} = ${ntex(net, 8)}` });
  steps.push({ text: "منتخب بنیاد کے مطابق نصاب کا حساب:", tex: gold ? `N_{gd} = 85 \\times ${ntex(goldPrice)} = ${ntex(nisab, 8)}` : `N_{sb} = 595 \\times ${ntex(silverPrice)} = ${ntex(nisab, 8)}` });
  steps.push(eligible
    ? { text: "مال نصاب کو پہنچ گیا ہے، اس لیے زکوٰۃ 2.5% کے حساب سے نکالی جاتی ہے:", tex: `Z = 0.025 \\times ${ntex(net, 8)} = ${ntex(zakat, 8)}` }
    : "زکوٰۃ کے قابل مال نصاب سے کم ہے، اس لیے زکوٰۃ واجب نہیں۔");

  return {
    results: [
      { label: "خالص زکوٰۃ کے قابل مال", value: money(net) },
      { label: `نصاب کی قدر (${basisLabel})`, value: money(nisab) },
      { label: "حالت", value: eligible ? "نصاب کو پہنچ گیا" : "نصاب سے کم" },
      { label: "واجب الادا زکوٰۃ (2.5%)", value: money(zakat) }
    ],
    steps,
    copy: `${status}۔ واجب الادا زکوٰۃ: ${money(zakat)}، خالص زکوٰۃ کے قابل مال: ${money(net)}، نصاب: ${money(nisab)} (${basisLabel})`,
    blocks: [
      { type: "table", caption: "زکوٰۃ کے قابل مال کے اجزاء", head: ["مد", "قدر"], rows },
      { type: "note", text: "سال کی شرط: مال کے مالک کے پاس نصاب کے مطابق ایک مکمل ہجری (قمری) سال گزرنا ضروری ہے۔" },
      { type: "note", text: "یہ حساب آگاہی کے لیے تخمینی ہے؛ خاص صورتوں کے لیے کسی معتبر دینی ادارے سے رجوع کریں۔", tone: "warn" }
    ]
  };
}
