import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const n6 = (x) => ntex(x, 6);

const RATIOS = [
  {
    label: "Current ratio", need: ["CA", "CL"], den: "CL", pct: false,
    sym: "\\frac{CA}{CL}", sub: (v) => `\\frac{${n6(v.CA)}}{${n6(v.CL)}}`, f: (v) => v.CA / v.CL,
    interp: (x) => (x >= 2 ? "Good liquidity: current assets cover short-term liabilities at least twice" : x >= 1 ? "Acceptable liquidity, but the margin is limited" : "Current assets are not enough to cover short-term liabilities")
  },
  {
    label: "Quick ratio", need: ["CA", "inv", "CL"], den: "CL", pct: false,
    sym: "\\frac{CA-\\text{Inv}}{CL}", sub: (v) => `\\frac{${n6(v.CA)}-${n6(v.inv)}}{${n6(v.CL)}}`, f: (v) => (v.CA - v.inv) / v.CL,
    interp: (x) => (x >= 1 ? "Covers short-term liabilities without relying on selling inventory" : "Relies on selling inventory to pay short-term liabilities")
  },
  {
    label: "Debt-to-assets ratio", need: ["TL", "TA"], den: "TA", pct: true,
    sym: "\\frac{TL}{TA}", sub: (v) => `\\frac{${n6(v.TL)}}{${n6(v.TA)}}`, f: (v) => v.TL / v.TA,
    interp: (x) => (x < 0.5 ? "Low reliance on debt" : x <= 1 ? "Moderate reliance on debt" : "Liabilities exceed assets")
  },
  {
    label: "Debt-to-equity ratio", need: ["TL", "equity"], den: "equity", pct: false,
    sym: "\\frac{TL}{E}", sub: (v) => `\\frac{${n6(v.TL)}}{${n6(v.equity)}}`, f: (v) => v.TL / v.equity,
    interp: (x, v) => (v.equity < 0 ? "Equity is negative, which is a financial situation that calls for caution" : x < 1 ? "Equity financing exceeds debt" : "Debt equals or exceeds equity")
  },
  {
    label: "Return on assets", need: ["ni", "TA"], den: "TA", pct: true,
    sym: "\\frac{NI}{TA}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.TA)}}`, f: (v) => v.ni / v.TA,
    interp: (x) => (x < 0 ? "Loss relative to assets" : x < 0.05 ? "Low return on assets" : "Good return on assets")
  },
  {
    label: "Return on equity", need: ["ni", "equity"], den: "equity", pct: true,
    sym: "\\frac{NI}{E}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.equity)}}`, f: (v) => v.ni / v.equity,
    interp: (x, v) => (v.equity < 0 ? "Equity is negative, so the ratio does not indicate real profitability" : x < 0 ? "Loss relative to equity" : x < 0.1 ? "Low return on equity" : "Good return on equity")
  },
  {
    label: "Gross profit margin", need: ["rev", "cogs"], den: "rev", pct: true,
    sym: "\\frac{Rev-COGS}{Rev}", sub: (v) => `\\frac{${n6(v.rev)}-${n6(v.cogs)}}{${n6(v.rev)}}`, f: (v) => (v.rev - v.cogs) / v.rev,
    interp: (x) => (x < 0 ? "Cost of goods sold exceeds revenue" : "The share of each unit of sales remaining after the cost of goods sold")
  },
  {
    label: "Net profit margin", need: ["ni", "rev"], den: "rev", pct: true,
    sym: "\\frac{NI}{Rev}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.rev)}}`, f: (v) => v.ni / v.rev,
    interp: (x) => (x < 0 ? "Net loss on sales" : "The share of each unit of sales that becomes net profit")
  },
  {
    label: "Asset turnover", need: ["rev", "TA"], den: "TA", pct: false,
    sym: "\\frac{Rev}{TA}", sub: (v) => `\\frac{${n6(v.rev)}}{${n6(v.TA)}}`, f: (v) => v.rev / v.TA,
    interp: (x) => (x < 1 ? "Assets generate revenue less than their value" : "Assets generate revenue exceeding their value")
  }
];

const FIELDS = [
  ["CA", "Current assets", { nonNegative: true }],
  ["CL", "Current liabilities", { nonNegative: true }],
  ["inv", "Inventory", { nonNegative: true }],
  ["TA", "Total assets", { nonNegative: true }],
  ["TL", "Total liabilities", { nonNegative: true }],
  ["equity", "Equity", {}],
  ["rev", "Revenue", { nonNegative: true }],
  ["cogs", "Cost of goods sold", { nonNegative: true }],
  ["ni", "Net income", {}]
];

export const meta = {
  description: "Calculate the basic financial ratios (liquidity, leverage, profitability and asset efficiency) from the available data only, with a table showing each ratio, its formula and a brief interpretation.",
  keywords: ["Financial ratios", "financial ratios", "Current ratio", "liquidity", "ROA", "ROE", "profit margin", "leverage"],
  formulas: [
    { label: "Current ratio", tex: "\\frac{\\text{Current assets}}{\\text{Current liabilities}}" },
    { label: "Return on equity", tex: "ROE = \\frac{NI}{E}" },
    { label: "Return on assets", tex: "ROA = \\frac{NI}{TA}" }
  ],
  inputs: [
    { id: "CA", label: "Current assets", type: "number" },
    { id: "CL", label: "Current liabilities", type: "number" },
    { id: "inv", label: "Inventory", type: "number" },
    { id: "TA", label: "Total assets", type: "number" },
    { id: "TL", label: "Total liabilities", type: "number" },
    { id: "equity", label: "Equity", type: "number" },
    { id: "rev", label: "Revenue", type: "number" },
    { id: "cogs", label: "Cost of goods sold", type: "number" },
    { id: "ni", label: "Net income", type: "number", help: "All fields are optional; each ratio is calculated only when its data is available." }
  ],
  example: {
    values: { CA: "500000", CL: "250000", inv: "100000", TA: "1000000", TL: "600000", equity: "400000", rev: "800000", cogs: "500000", ni: "80000" },
    expect: ["Current ratio = 2", "Debt-to-assets ratio = 60%"],
    note: "Example: a company with current assets of 500,000, current liabilities of 250,000, and the asset and revenue data listed above."
  },
  invalid: { values: { CA: "", CL: "", inv: "", TA: "", TL: "", equity: "", rev: "", cogs: "", ni: "" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "depreciation", "price-elasticity"]
};

export function solve(input) {
  const v = {};
  for (const [id, label, opts] of FIELDS) v[id] = num(input, id, label, { ...opts, optional: true });
  const computed = [];
  const skipped = [];
  for (const d of RATIOS) {
    if (d.need.some((k) => v[k] === null)) {
      skipped.push(`${d.label} (missing data)`);
      continue;
    }
    if (v[d.den] === 0) {
      skipped.push(`${d.label} (zero denominator)`);
      continue;
    }
    computed.push({ d, x: d.f(v) });
  }
  if (computed.length === 0) fail("Enter enough data to calculate at least one financial ratio, such as current assets and current liabilities.", "CA");
  const disp = (d, x) => (d.pct ? `${fmt(x * 100, 4)}%` : fmt(x, 4));
  const results = computed.map(({ d, x }) => ({ label: d.label, value: disp(d, x), text: `${d.label} = ${disp(d, x)}` }));
  const steps = computed.map(({ d, x }) => ({ text: `${d.label}:`, tex: `${d.sym} = ${d.sub(v)} = ${d.pct ? `${ntex(x * 100, 6)}\\%` : ntex(x, 6)}` }));
  const rows = computed.map(({ d, x }) => [d.label, disp(d, x), { tex: d.sym }, d.interp(x, v)]);
  const blocks = [{ type: "table", caption: "Calculated ratios", head: ["Ratio", "Value", "Formula", "Interpretation"], rows }];
  if (skipped.length > 0) blocks.push({ type: "note", text: `Not calculated: ${skipped.join("، ")}.`, tone: "warn" });
  return {
    results,
    steps,
    copy: results.map((r) => `${r.label} = ${r.value}`).join("، "),
    blocks
  };
}
