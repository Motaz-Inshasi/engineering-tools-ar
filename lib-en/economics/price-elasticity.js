import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Calculate the price elasticity of demand from two prices and two quantities using the midpoint or simple percentage method, classify the elasticity, and show the effect of the price change on total revenue.",
  keywords: ["price elasticity", "price elasticity", "demand elasticity", "total revenue", "elastic", "inelastic", "elasticity"],
  formulas: [
    { label: "Elasticity coefficient", tex: "E = \\frac{\\%\\Delta Q}{\\%\\Delta P}" },
    { label: "Midpoint", tex: "\\%\\Delta Q = \\frac{Q_2-Q_1}{(Q_1+Q_2)/2},\\qquad \\%\\Delta P = \\frac{P_2-P_1}{(P_1+P_2)/2}" }
  ],
  inputs: [
    { id: "P1", label: "First price P1", type: "number", default: "10" },
    { id: "Q1", label: "First quantity Q1", type: "number", default: "100" },
    { id: "P2", label: "Second price P2", type: "number", default: "12" },
    { id: "Q2", label: "Second quantity Q2", type: "number", default: "80" },
    { id: "method", label: "Calculation method", type: "select", default: "mid", options: [["mid", "Midpoint (arc)"], ["simple", "Simple percentage"]], help: "The midpoint method gives the same result regardless of the direction of the change." }
  ],
  example: { values: { P1: "10", Q1: "100", P2: "12", Q2: "80", method: "mid" }, expect: ["-1.222", "elastic"], note: "Example: raising the price from 10 to 12 reduced the quantity from 100 to 80." },
  invalid: { values: { P1: "10", Q1: "100", P2: "10", Q2: "80", method: "mid" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "depreciation", "financial-ratios"]
};

export function solve(input) {
  const P1 = num(input, "P1", "First price", { positive: true });
  const Q1 = num(input, "Q1", "First quantity", { nonNegative: true });
  const P2 = num(input, "P2", "Second price", { positive: true });
  const Q2 = num(input, "Q2", "Second quantity", { nonNegative: true });
  const method = choice(input, "method", "Calculation method", ["mid", "simple"], "mid");
  if (P1 === P2) fail("The price did not change, so elasticity cannot be calculated because the division would be by zero.", "P2");
  if (method === "simple" && Q1 === 0) fail("The first quantity is zero, and the simple percentage is calculated on the first quantity.", "Q1");
  if (method === "mid" && Q1 + Q2 === 0) fail("Both quantities are zero, so the midpoint percentage change in quantity cannot be calculated.", "Q2");
  const mid = method === "mid";
  const dP = P2 - P1;
  const dQ = Q2 - Q1;
  const baseP = mid ? (P1 + P2) / 2 : P1;
  const baseQ = mid ? (Q1 + Q2) / 2 : Q1;
  const pctP = dP / baseP;
  const pctQ = dQ / baseQ;
  const E = pctQ / pctP;
  const a = Math.abs(E);
  let cls;
  if (a < 1e-12) cls = "Perfectly inelastic";
  else if (Math.abs(a - 1) < 1e-9) cls = "Unit elastic";
  else if (a > 1) cls = "elastic";
  else cls = "inelastic";
  const R1 = P1 * Q1;
  const R2 = P2 * Q2;
  const dR = R2 - R1;
  const effect = Math.abs(dR) < 1e-9
    ? "Total revenue does not change"
    : dR > 0 ? `Total revenue rose by ${money(dR)}` : `Total revenue fell by ${money(-dR)}`;
  let note;
  if (a < 1e-12) note = "The quantity does not change with the price, so revenue changes by the same percentage as the price.";
  else if (Math.abs(a - 1) < 1e-9) note = "Elasticity equals one, so total revenue remains approximately constant when the price changes.";
  else if (a > 1) note = "Demand is elastic: the percentage change in quantity is larger than the percentage change in price, so revenue rises when the price is lowered and falls when it is raised.";
  else note = "Demand is inelastic: the percentage change in quantity is smaller than the percentage change in price, so revenue rises when the price is raised and falls when it is lowered.";
  const steps = [
    {
      text: mid ? "Percentage change in quantity (midpoint):" : "Percentage change in quantity:",
      tex: mid
        ? `\\%\\Delta Q = \\frac{Q_2-Q_1}{(Q_1+Q_2)/2} = \\frac{${ntex(dQ)}}{${ntex(baseQ)}} = ${ntex(pctQ, 6)}`
        : `\\%\\Delta Q = \\frac{Q_2-Q_1}{Q_1} = \\frac{${ntex(dQ)}}{${ntex(Q1)}} = ${ntex(pctQ, 6)}`
    },
    {
      text: mid ? "Percentage change in price (midpoint):" : "Percentage change in price:",
      tex: mid
        ? `\\%\\Delta P = \\frac{P_2-P_1}{(P_1+P_2)/2} = \\frac{${ntex(dP)}}{${ntex(baseP)}} = ${ntex(pctP, 6)}`
        : `\\%\\Delta P = \\frac{P_2-P_1}{P_1} = \\frac{${ntex(dP)}}{${ntex(P1)}} = ${ntex(pctP, 6)}`
    },
    { text: "Elasticity coefficient:", tex: `E = \\frac{\\%\\Delta Q}{\\%\\Delta P} = \\frac{${ntex(pctQ, 6)}}{${ntex(pctP, 6)}} = ${ntex(E, 6)}` },
    { text: "Total revenue before and after the change:", tex: `R_1 = P_1Q_1 = ${ntex(R1)},\\qquad R_2 = P_2Q_2 = ${ntex(R2)}` }
  ];
  return {
    results: [
      { label: "Percentage change in quantity", value: `${fmt(pctQ * 100, 4)}%` },
      { label: "Percentage change in price", value: `${fmt(pctP * 100, 4)}%` },
      { label: "Elasticity coefficient E", value: fmt(E, 4), text: `E = ${fmt(E, 4)}` },
      { label: "Elasticity classification", value: cls },
      { label: "Total revenue before the change", value: money(R1) },
      { label: "Total revenue after the change", value: money(R2) },
      { label: "Effect of the change on revenue", value: effect }
    ],
    steps,
    copy: `E = ${fmt(E, 4)} (${cls}), revenue from ${money(R1)} to ${money(R2)}, ${effect}`,
    blocks: [
      { type: "table", caption: "Comparison before and after the change", head: ["Item", "Before", "After"], rows: [["Price", fmt(P1, 6), fmt(P2, 6)], ["Quantity", fmt(Q1, 6), fmt(Q2, 6)], ["total revenue", money(R1), money(R2)]] },
      { type: "note", text: note }
    ]
  };
}
