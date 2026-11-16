import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PRESETS = { "50-30-20": [50, 30, 20], "70-20-10": [70, 20, 10] };

const verdict = (kind, target, actual) => {
  if (actual === null) return "Actual spending not entered";
  const diff = Math.round((actual - target) * 100) / 100;
  if (diff === 0) return "Matches the budget";
  if (kind === "save") return diff > 0 ? `Above the target by ${money(diff)}` : `Below the target by ${money(-diff)}`;
  return diff < 0 ? `Within budget (saved ${money(-diff)})` : `Over budget by ${money(diff)}`;
};

export const meta = {
  description: "Divide your monthly net income among needs, wants, and savings using the 50/30/20 or 70/20/10 rule, or with percentages you choose, and compare actual spending with the budget to find the overspend or savings.",
  keywords: ["budget", "income distribution", "50 30 20", "70 20 10", "monthly budget", "budget", "savings"],
  formulas: [
    { label: "Amount for each category", tex: "B_i = I \\times \\frac{p_i}{100}" },
    { label: "Custom percentages condition", tex: "p_1 + p_2 + p_3 = 100" },
    { label: "Difference between actual and planned", tex: "\\Delta_i = A_i - B_i" }
  ],
  inputs: [
    { id: "income", label: "Monthly net income", type: "number", default: "10000", help: "Income after deductions and taxes." },
    { id: "method", label: "Distribution method", type: "select", default: "50-30-20", options: [["50-30-20", "50 / 30 / 20 (needs / wants / savings)"], ["70-20-10", "70 / 20 / 10"], ["custom", "Custom percentages"]] },
    { id: "needsPct", label: "Needs percentage", unit: "%", type: "number", default: "50", when: { method: ["custom"] } },
    { id: "wantsPct", label: "Wants percentage", unit: "%", type: "number", default: "30", when: { method: ["custom"] } },
    { id: "savePct", label: "Savings percentage", unit: "%", type: "number", default: "20", when: { method: ["custom"] }, help: "The sum of the three percentages must equal 100%." },
    { id: "needsActual", label: "Actual spending on needs", type: "number", help: "Optional: leave empty if you do not want a comparison." },
    { id: "wantsActual", label: "Actual spending on wants", type: "number", help: "Optional." },
    { id: "savingsActual", label: "Actual amount saved", type: "number", help: "Optional." }
  ],
  example: { values: { income: "10000", method: "50-30-20", needsPct: "50", wantsPct: "30", savePct: "20", needsActual: "6000", wantsActual: "", savingsActual: "1500" }, expect: ["5,000.00", "3,000.00"], note: "Example: income of 10000 with the 50/30/20 rule, and actual needs spending of 6000, which exceeds the budget." },
  invalid: { values: { income: "10000", method: "custom", needsPct: "50", wantsPct: "30", savePct: "30", needsActual: "", wantsActual: "", savingsActual: "" } },
  related: ["savings-goal", "zakat", "compound-interest", "loan-amortization"]
};

export function solve(input) {
  const income = num(input, "income", "Net income", { positive: true });
  const method = choice(input, "method", "Distribution method", ["50-30-20", "70-20-10", "custom"], "50-30-20");
  let pcts;
  if (method === "custom") {
    const needs = num(input, "needsPct", "Needs percentage", { min: 0, max: 100 });
    const wants = num(input, "wantsPct", "Wants percentage", { min: 0, max: 100 });
    const save = num(input, "savePct", "Savings percentage", { min: 0, max: 100 });
    if (Math.abs(needs + wants + save - 100) > 1e-9) fail(`The percentages add up to ${fmt(needs + wants + save)}% and must equal 100%.`, "savePct");
    pcts = [needs, wants, save];
  } else {
    pcts = PRESETS[method];
  }
  const actual = (key, label) => num(input, key, label, { nonNegative: true, optional: true });
  const actuals = [actual("needsActual", "Actual spending on needs"), actual("wantsActual", "Actual spending on wants"), actual("savingsActual", "Actual amount saved")];

  const [pNeeds, pWants, pSave] = pcts;
  const needs = (income * pNeeds) / 100;
  const wants = (income * pWants) / 100;
  const save = (income * pSave) / 100;
  const targets = [needs, wants, save];
  const names = ["Needs", "Wants", "Savings"];
  const kinds = ["spend", "spend", "save"];

  const rows = names.map((name, k) => [
    name,
    `${fmt(pcts[k])}%`,
    money(targets[k]),
    actuals[k] === null ? "—" : money(actuals[k]),
    verdict(kinds[k], targets[k], actuals[k])
  ]);

  const steps = [
    { text: "Amount of income for needs:", tex: `B_{\\text{needs}} = ${ntex(income)} \\times \\frac{${fmt(pNeeds)}}{100} = ${ntex(needs, 8)}` },
    { text: "Amount of income for wants:", tex: `B_{\\text{wants}} = ${ntex(income)} \\times \\frac{${fmt(pWants)}}{100} = ${ntex(wants, 8)}` },
    { text: "Amount of income for savings:", tex: `B_{\\text{save}} = ${ntex(income)} \\times \\frac{${fmt(pSave)}}{100} = ${ntex(save, 8)}` }
  ];

  return {
    results: [
      { label: "Needs amount", value: money(needs) },
      { label: "Wants amount", value: money(wants) },
      { label: "Savings amount", value: money(save) }
    ],
    steps,
    copy: `Needs: ${money(needs)}, wants: ${money(wants)}, savings: ${money(save)} (of income ${money(income)})`,
    blocks: [
      { type: "table", caption: "Planned budget vs. actual spending", head: ["Category", "Percentage", "Planned", "Actual", "Verdict"], rows }
    ]
  };
}
