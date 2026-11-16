import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Calculate the annual depreciation of an asset using the straight-line, declining-balance or sum-of-the-years'-digits method, with a table showing depreciation, accumulated depreciation and book value, without going below the salvage value.",
  keywords: ["depreciation", "depreciation", "depreciation", "straight-line", "declining balance", "sum of the years' digits", "book value", "salvage value"],
  formulas: [
    { label: "straight-line", tex: "D = \\frac{C-S}{n}" },
    { label: "sum of the years' digits", tex: "D_y = \\frac{n-y+1}{n(n+1)/2}\\,(C-S)" },
    { label: "declining balance", tex: "D_y = \\max\\left(B_{y-1}\\frac{k}{n},\\ \\frac{B_{y-1}-S}{n-y+1}\\right)" }
  ],
  inputs: [
    { id: "cost", label: "Asset cost C", type: "number", default: "10000" },
    { id: "salvage", label: "Salvage value S", type: "number", default: "1000" },
    { id: "life", label: "Useful life n", unit: "years", type: "number", default: "5", help: "Whole number from 1 to 100." },
    { id: "method", label: "Depreciation method", type: "select", default: "sl", options: [["sl", "straight-line"], ["db", "declining balance"], ["syd", "sum of the years' digits"]] },
    { id: "factor", label: "Declining-balance factor k", type: "select", default: "2", options: [["2", "Double (2)"], ["1.5", "1.5"]], when: { method: ["db"] } }
  ],
  example: { values: { cost: "10000", salvage: "1000", life: "5", method: "sl", factor: "2" }, expect: ["1,800.00"], note: "Example: an asset costing 10,000 with a salvage value of 1,000 and a 5-year life, using the straight-line method." },
  invalid: { values: { cost: "1000", salvage: "2000", life: "5", method: "sl", factor: "2" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const cost = num(input, "cost", "Asset cost", { positive: true });
  const salvage = num(input, "salvage", "salvage value", { nonNegative: true });
  const n = num(input, "life", "Useful life", { integer: true, min: 1, max: 100 });
  const method = choice(input, "method", "Depreciation method", ["sl", "db", "syd"], "sl");
  const factor = Number(choice(input, "factor", "Declining-balance factor", ["2", "1.5"], "2"));
  if (salvage > cost) fail("The salvage value cannot exceed the asset cost.", "salvage");
  const base = cost - salvage;
  const sumYears = (n * (n + 1)) / 2;
  let bv = cost;
  let acc = 0;
  let switchYear = null;
  const schedule = [];
  for (let y = 1; y <= n; y++) {
    let d;
    let kind = "";
    if (method === "sl") d = base / n;
    else if (method === "syd") d = (base * (n - y + 1)) / sumYears;
    else {
      const dbAmt = (bv * factor) / n;
      const slAmt = (bv - salvage) / (n - y + 1);
      const useSl = slAmt > dbAmt;
      if (useSl && switchYear === null) switchYear = y;
      d = Math.min(Math.max(dbAmt, slAmt), bv - salvage);
      kind = useSl ? "Straight-line" : "Declining balance";
    }
    bv = Math.max(bv - d, salvage);
    acc += d;
    schedule.push({ y, d, acc, bv, kind });
  }
  const withKind = method === "db";
  const rows = schedule.map((s) => (withKind ? [fmt(s.y), money(s.d), money(s.acc), money(s.bv), s.kind] : [fmt(s.y), money(s.d), money(s.acc), money(s.bv)]));
  const head = ["Year", "depreciation", "Accumulated", "book value"];
  if (withKind) head.push("Method");
  const first = schedule[0].d;
  const last = schedule[n - 1].bv;
  const results = [
    { label: "First-year depreciation", value: money(first) },
    { label: "Total depreciation", value: money(base) },
    { label: "Book value at the end of life", value: money(last) }
  ];
  if (method === "sl") results.unshift({ label: "Annual straight-line depreciation", value: money(base / n) });
  const steps = [];
  if (method === "sl") {
    steps.push({ text: "Straight-line:", tex: `D = \\frac{C-S}{n} = \\frac{${ntex(cost)} - ${ntex(salvage)}}{${n}} = ${ntex(base / n, 8)}` });
  } else if (method === "syd") {
    steps.push({ text: "Sum of the years' digits:", tex: `\\sum = \\frac{n(n+1)}{2} = \\frac{${n}(${n}+1)}{2} = ${ntex(sumYears)}` });
    steps.push({ text: "First-year depreciation:", tex: `D_1 = \\frac{n}{\\sum}(C-S) = \\frac{${n}}{${ntex(sumYears)}} \\times ${ntex(base)} = ${ntex(first, 8)}` });
  } else {
    steps.push({ text: "Declining-balance rate:", tex: `\\text{rate} = \\frac{k}{n} = \\frac{${factor}}{${n}} = ${ntex(factor / n, 6)}` });
    steps.push({ text: "First-year depreciation:", tex: `D_1 = C \\times \\text{rate} = ${ntex(cost)} \\times ${ntex(factor / n, 6)} = ${ntex(first, 8)}` });
    steps.push("Each year we take the larger of the declining-balance charge and the straight-line charge on the remaining value, without going below the salvage value.");
  }
  const copy = method === "sl"
    ? `Annual straight-line depreciation: ${money(base / n)}, book value at the end of life: ${money(last)}`
    : `First-year depreciation: ${money(first)}, book value at the end of life: ${money(last)}`;
  const blocks = [{ type: "table", caption: "Annual depreciation schedule", head, rows }];
  if (method === "db") {
    blocks.push(switchYear === null
      ? { type: "note", text: "The calculation did not need to switch to straight-line, and the book value did not fall below the salvage value." }
      : { type: "note", text: `The calculation switches to straight-line starting in year ${switchYear}, because the straight-line charge on the remaining value is larger; the book value then reaches the salvage value at the end of life without falling below it.` });
  }
  return { results, steps, copy, blocks };
}
