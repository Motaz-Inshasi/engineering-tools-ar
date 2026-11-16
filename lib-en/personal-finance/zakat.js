import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const KARATS = ["24", "22", "21", "18"];
const RATE = 0.025;
const SILVER_NISAB_G = 595;
const GOLD_NISAB_G = 85;

export const meta = {
  description: "Calculates zakat on zakatable wealth after deducting due debts, including cash, gold by karat, silver, trade goods, collectible receivables, and investments, and shows whether the nisab is reached in gold or silver.",
  keywords: ["zakat", "nisab", "gold zakat", "silver zakat", "zakat on wealth", "zakat calculation", "zakat"],
  formulas: [
    { label: "Value of gold converted to 24 karat", tex: "V_{Au} = G \\times \\frac{k}{24} \\times P_{Au}" },
    { label: "Net zakatable wealth", tex: "N = A - D" },
    { label: "Nisab", tex: "N_{sb} = 595\\ \\text{g} \\times P_{Ag},\\qquad N_{gd} = 85\\ \\text{g} \\times P_{Au}" },
    { label: "Zakat", tex: "Z = 2.5\\% \\times N \\quad \\text{if } N \\ge \\text{Nisab}" }
  ],
  inputs: [
    { id: "cash", label: "Cash and bank balances", type: "number", default: "0" },
    { id: "goldG", label: "Gold owned", unit: "gram", type: "number", default: "0" },
    { id: "karat", label: "Gold karat", type: "select", default: "24", options: [["24", "24 karat"], ["22", "22 karat"], ["21", "21 karat"], ["18", "18 karat"]] },
    { id: "silverG", label: "Silver owned", unit: "gram", type: "number", default: "0" },
    { id: "trade", label: "Value of trade goods and inventory", type: "number", default: "0" },
    { id: "receivables", label: "Receivable debts expected to be collected", type: "number", default: "0" },
    { id: "invest", label: "Investments and shares (market value)", type: "number", default: "0" },
    { id: "debts", label: "Debts due now", type: "number", default: "0", help: "Short-term debts that fall due within the year, deducted from assets." },
    { id: "goldPrice", label: "Price of one gram of 24 karat gold", type: "number", help: "Required if you have gold or the nisab basis is gold." },
    { id: "silverPrice", label: "Price of one gram of silver", type: "number", help: "Required if you have silver or the nisab basis is silver." },
    { id: "basis", label: "Nisab basis", type: "select", default: "silver", options: [["silver", "Silver (595 grams)"], ["gold", "Gold (85 grams)"]], help: "Many scholars and bodies adopt the silver nisab because it benefits the poor more, while others follow the gold nisab." }
  ],
  example: { values: { cash: "10000", goldG: "0", karat: "24", silverG: "0", trade: "0", receivables: "0", invest: "0", debts: "0", goldPrice: "", silverPrice: "1", basis: "silver" }, expect: ["250.00", "595.00"], note: "Example: cash of 10000 with a silver price of 1 per gram, so the nisab is 595 and the zakat is 250." },
  invalid: { values: { cash: "10000", goldG: "0", karat: "24", silverG: "0", trade: "0", receivables: "0", invest: "0", debts: "0", goldPrice: "", silverPrice: "", basis: "silver" } },
  related: ["budget-planner", "savings-goal", "compound-interest", "loan-amortization"]
};

export function solve(input) {
  const cash = num(input, "cash", "Cash and balances", { nonNegative: true, default: 0 });
  const goldG = num(input, "goldG", "Gold weight", { nonNegative: true, default: 0 });
  const karat = Number(choice(input, "karat", "Gold karat", KARATS, "24"));
  const silverG = num(input, "silverG", "Silver weight", { nonNegative: true, default: 0 });
  const trade = num(input, "trade", "Trade goods", { nonNegative: true, default: 0 });
  const receivables = num(input, "receivables", "Collectible receivables", { nonNegative: true, default: 0 });
  const invest = num(input, "invest", "Investments", { nonNegative: true, default: 0 });
  const debts = num(input, "debts", "Debts due", { nonNegative: true, default: 0 });
  const basis = choice(input, "basis", "Nisab basis", ["silver", "gold"], "silver");
  const goldPrice = num(input, "goldPrice", "Gold price per gram", { nonNegative: true, optional: true });
  const silverPrice = num(input, "silverPrice", "Price of one gram of silver", { nonNegative: true, optional: true });

  const gross = cash + goldG + silverG + trade + receivables + invest;
  if (!(gross > 0)) fail("Enter a value greater than zero for one of the zakatable assets.", "cash");
  if ((goldG > 0 || basis === "gold") && !(goldPrice > 0)) fail("Enter the price of one gram of 24 karat gold to calculate the value of gold or the nisab.", "goldPrice");
  if ((silverG > 0 || basis === "silver") && !(silverPrice > 0)) fail("Enter the price of one gram of silver to calculate the value of silver or the nisab.", "silverPrice");

  const goldValue = goldG > 0 ? goldG * (karat / 24) * goldPrice : 0;
  const silverValue = silverG > 0 ? silverG * silverPrice : 0;
  const assets = cash + goldValue + silverValue + trade + receivables + invest;
  const net = assets - debts;
  const gold = basis === "gold";
  const nisab = gold ? GOLD_NISAB_G * goldPrice : SILVER_NISAB_G * silverPrice;
  const basisLabel = gold ? "gold" : "silver";
  const eligible = net > 0 && net >= nisab;
  const zakat = eligible ? net * RATE : 0;
  const status = eligible ? "The wealth reaches the nisab, and zakat is due provided a full lunar year has passed" : "The wealth is below the nisab, so no zakat is due";

  const rows = [
    ["Cash and bank balances", money(cash)],
    [`Gold (${fmt(goldG)} g, ${karat} karat)`, money(goldValue)],
    [`Silver (${fmt(silverG)} g)`, money(silverValue)],
    ["Trade goods and inventory", money(trade)],
    ["Collectible receivables", money(receivables)],
    ["Investments and shares", money(invest)],
    ["Total assets", money(assets)],
    ["Minus due debts", money(-debts)],
    ["Net zakatable wealth", money(net)],
    [`Nisab (${basisLabel})`, money(nisab)]
  ];

  const steps = [];
  if (goldG > 0) steps.push({ text: "Convert the gold to 24 karat, then calculate its value:", tex: `V_{Au} = ${ntex(goldG)} \\times \\frac{${karat}}{24} \\times ${ntex(goldPrice)} = ${ntex(goldValue, 8)}` });
  if (silverG > 0) steps.push({ text: "Value of silver:", tex: `V_{Ag} = ${ntex(silverG)} \\times ${ntex(silverPrice)} = ${ntex(silverValue, 8)}` });
  steps.push({ text: "Total zakatable assets, then deduct due debts:", tex: `N = A - D = ${ntex(assets, 8)} - ${ntex(debts, 8)} = ${ntex(net, 8)}` });
  steps.push({ text: "Calculate the nisab according to the chosen basis:", tex: gold ? `N_{gd} = 85 \\times ${ntex(goldPrice)} = ${ntex(nisab, 8)}` : `N_{sb} = 595 \\times ${ntex(silverPrice)} = ${ntex(nisab, 8)}` });
  steps.push(eligible
    ? { text: "The wealth reaches the nisab, so zakat is calculated at 2.5%:", tex: `Z = 0.025 \\times ${ntex(net, 8)} = ${ntex(zakat, 8)}` }
    : "The zakatable wealth is below the nisab, so no zakat is due.");

  return {
    results: [
      { label: "Net zakatable wealth", value: money(net) },
      { label: `Nisab value (${basisLabel})`, value: money(nisab) },
      { label: "Status", value: eligible ? "Reached the nisab" : "Below the nisab" },
      { label: "Zakat due (2.5%)", value: money(zakat) }
    ],
    steps,
    copy: `${status}. Zakat due: ${money(zakat)}, net zakatable wealth: ${money(net)}, nisab: ${money(nisab)} (${basisLabel})`,
    blocks: [
      { type: "table", caption: "Components of zakatable wealth", head: ["Item", "Value"], rows },
      { type: "note", text: "Lunar year condition: the wealth must have been held by its owner for one full Hijri (lunar) year." },
      { type: "note", text: "This calculation is an estimate for awareness; consult a reliable religious authority for special cases.", tone: "warn" }
    ]
  };
}
