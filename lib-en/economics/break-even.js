import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Calculate the break-even point in units and revenue, the contribution margin and its ratio, and the number of units needed to reach a target profit, with a plot of revenue and total cost up to twice the break-even point.",
  keywords: ["break-even point", "break-even", "contribution margin", "fixed costs", "variable costs", "target profit"],
  formulas: [
    { label: "Break-even point in units", tex: "Q^* = \\frac{F}{p-v}" },
    { label: "Units to reach a target profit", tex: "Q_T = \\frac{F+\\pi}{p-v}" }
  ],
  inputs: [
    { id: "F", label: "Fixed costs F", unit: "", type: "number", default: "10000" },
    { id: "p", label: "Selling price per unit p", type: "number", default: "50" },
    { id: "v", label: "Variable cost per unit v", type: "number", default: "30" },
    { id: "target", label: "Target profit π (optional)", type: "number", help: "Leave it empty if you do not need it." }
  ],
  example: { values: { F: "10000", p: "50", v: "30", target: "" }, expect: ["500 units", "25,000.00"], note: "Example: fixed costs of 10,000, a price of 50 and a variable cost of 30 per unit." },
  invalid: { values: { F: "10000", p: "30", v: "30", target: "" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const F = num(input, "F", "fixed costs", { nonNegative: true });
  const p = num(input, "p", "Selling price per unit", { positive: true });
  const v = num(input, "v", "Variable cost per unit", { nonNegative: true });
  const target = num(input, "target", "target profit", { optional: true });
  if (!(p > v)) fail("The selling price must be greater than the variable cost per unit; otherwise, sales will not cover any part of the fixed costs.", "p");
  const cm = p - v;
  const units = F / cm;
  const revenue = units * p;
  const cost = F + v * units;
  const ratio = cm / p;
  const integerUnits = Math.ceil(units - 1e-9);
  let targetUnits = null;
  if (target !== null) {
    if (F + target < 0) fail("The target loss exceeds the fixed costs, so it cannot be calculated with a positive number of units.", "target");
    targetUnits = (F + target) / cm;
  }
  const xMax = units > 0 ? 2 * units : 1;
  const sample = (fn) => Array.from({ length: 21 }, (_, k) => {
    const x = (xMax * k) / 20;
    return [x, fn(x)];
  });
  const plot = {
    type: "plot",
    title: "Revenue and total cost by number of units",
    xLabel: "Number of units",
    yLabel: "Amount",
    includeZero: true,
    series: [
      { name: "Total revenue", points: sample((x) => p * x), line: true },
      { name: "Total cost", points: sample((x) => F + v * x), line: true }
    ]
  };
  if (units > 0) plot.vlines = [{ x: units }];
  const results = [
    { label: "Break-even point in units", value: `${fmt(units, 6)} units`, text: `${fmt(units, 6)} units` },
    { label: "Smallest whole number of units", value: `${fmt(integerUnits)} units` },
    { label: "Break-even revenue", value: money(revenue) },
    { label: "Contribution margin per unit", value: money(cm) },
    { label: "Contribution margin ratio", value: `${fmt(ratio * 100, 4)}%` }
  ];
  const steps = [
    { text: "Contribution margin per unit:", tex: `p - v = ${ntex(p)} - ${ntex(v)} = ${ntex(cm)}` },
    { text: "Break-even point in units:", tex: `Q^* = \\frac{F}{p-v} = \\frac{${ntex(F)}}{${ntex(cm)}} = ${ntex(units, 6)}` },
    { text: "Break-even revenue:", tex: `R^* = pQ^* = ${ntex(p)} \\times ${ntex(units, 6)} = ${ntex(revenue, 8)}` }
  ];
  let copy = `Break-even point: ${fmt(units, 6)} units, revenue at that point: ${money(revenue)}`;
  if (targetUnits !== null) {
    results.push({ label: "Units to reach the target profit", value: `${fmt(targetUnits, 6)} units` });
    steps.push({ text: "Units to reach the target profit:", tex: `Q_T = \\frac{F+\\pi}{p-v} = \\frac{${ntex(F)} + ${ntex(target)}}{${ntex(cm)}} = ${ntex(targetUnits, 6)}` });
    copy += `, units to reach the target profit: ${fmt(targetUnits, 6)} units`;
  }
  return { results, steps, copy, blocks: [plot] };
}
