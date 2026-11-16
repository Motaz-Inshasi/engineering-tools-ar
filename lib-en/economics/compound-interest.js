import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isInt = (x) => Math.abs(x - Math.round(x)) < 1e-9;

const FREQ = [["1", "Yearly (1)"], ["2", "Semi-annual (2)"], ["4", "Quarterly (4)"], ["12", "Monthly (12)"], ["365", "Daily (365)"], ["continuous", "Continuous"]];

export const meta = {
  description: "Calculate the future value of an amount with simple, compound or continuous interest, with optional periodic contributions, the total interest, the effective annual rate, a yearly balance table and a chart.",
  keywords: ["compound interest", "simple interest", "compound interest", "future value", "FV", "investment", "continuous interest"],
  formulas: [
    { label: "Simple interest", tex: "FV = P(1 + rt)" },
    { label: "Compound interest with periodic contributions", tex: "FV = P\\left(1+\\frac{r}{n}\\right)^{nt} + PMT\\cdot\\frac{\\left(1+\\frac{r}{n}\\right)^{nt}-1}{r/n}" },
    { label: "Continuous interest", tex: "FV = Pe^{rt}" }
  ],
  inputs: [
    { id: "P", label: "Principal P", type: "number", default: "1000" },
    { id: "r", label: "Annual interest rate", unit: "%", type: "number", default: "5" },
    { id: "t", label: "Term", unit: "years", type: "number", default: "10", help: "Can be fractional, up to a maximum of 100 years." },
    { id: "mode", label: "Interest type", type: "select", default: "compound", options: [["simple", "Simple"], ["compound", "Compound"]] },
    { id: "freq", label: "Compounding periods per year", type: "select", default: "12", options: FREQ, when: { mode: ["compound"] } },
    { id: "pmt", label: "Periodic contribution PMT", type: "number", default: "0", when: { mode: ["compound"] }, help: "Added at the end of each compounding period. Not available with continuous interest; with a fractional term, the number of periods must be a whole number." }
  ],
  example: { values: { P: "1000", r: "5", t: "10", mode: "compound", freq: "12", pmt: "0" }, expect: ["1,647.01"], note: "Example: 1000 at 5% for 10 years with monthly compounding." },
  invalid: { values: { P: "1000", r: "5", t: "10", mode: "compound", freq: "continuous", pmt: "100" } },
  related: ["loan-amortization", "npv-irr", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const P = num(input, "P", "Principal", { nonNegative: true });
  const r = num(input, "r", "Interest rate", { nonNegative: true, max: 1000 });
  const t = num(input, "t", "Term", { positive: true, max: 100 });
  const mode = choice(input, "mode", "Interest type", ["simple", "compound"], "compound");
  const freq = choice(input, "freq", "Compounding periods", ["1", "2", "4", "12", "365", "continuous"], "12");
  const pmt = num(input, "pmt", "Periodic contribution", { nonNegative: true, default: 0 });
  const rate = r / 100;
  const simple = mode === "simple";
  const continuous = !simple && freq === "continuous";
  const n = simple || continuous ? 1 : Number(freq);
  const contributing = !simple && !continuous && pmt > 0;
  if (continuous && pmt > 0) fail("Periodic contributions are not supported with continuous interest. Set the contribution to zero or choose a specific number of compounding periods.", "pmt");
  const N = n * t;
  if (contributing && !isInt(N)) fail(`The number of periods n × t = ${fmt(N)} must be a whole number when there is a periodic contribution.`, "t");
  const i = rate / n;
  const balance = (y) => {
    if (simple) return P * (1 + rate * y);
    if (continuous) return P * Math.exp(rate * y);
    const k = n * y;
    const g = Math.pow(1 + i, k);
    return P * g + (i === 0 ? pmt * k : (pmt * (g - 1)) / i);
  };
  const FV = balance(t);
  const contributed = contributing ? pmt * N : 0;
  const totalContrib = P + contributed;
  const interest = FV - totalContrib;
  const ear = simple ? rate : continuous ? Math.exp(rate) - 1 : Math.pow(1 + i, n) - 1;
  const whole = Math.floor(t + 1e-9);
  const ys = [];
  for (let y = 1; y <= whole; y++) ys.push(y);
  if (t - whole > 1e-9) ys.push(t);
  const rows = ys.map((y) => {
    const b = balance(y);
    const contribY = contributing ? pmt * n * y : 0;
    return [fmt(y, 6), money(b), money(b - P - contribY)];
  });
  const points = [[0, P], ...ys.map((y) => [y, balance(y)])];
  const steps = [];
  if (simple) {
    steps.push({ text: "Simple interest is calculated on the principal only:", tex: `FV = P(1 + rt) = ${ntex(P)} \\times (1 + ${ntex(rate, 6)} \\times ${ntex(t)}) = ${ntex(FV, 8)}` });
  } else if (continuous) {
    steps.push({ text: "Continuous compounding:", tex: `FV = Pe^{rt} = ${ntex(P)} \\times e^{${ntex(rate, 6)} \\times ${ntex(t)}} = ${ntex(FV, 8)}` });
  } else {
    const contribTex = !contributing ? "" : i === 0 ? ` + ${ntex(pmt)} \\times ${ntex(N)}` : ` + ${ntex(pmt)} \\times \\frac{(1+${ntex(i, 6)})^{${ntex(N)}}-1}{${ntex(i, 6)}}`;
    steps.push({ text: "Interest rate per period and number of periods:", tex: `i = \\frac{r}{n} = \\frac{${ntex(rate, 6)}}{${n}} = ${ntex(i, 6)},\\qquad N = nt = ${n} \\times ${ntex(t)} = ${ntex(N)}` });
    steps.push({ text: "Future value:", tex: `FV = P(1+i)^N${contributing ? " + PMT\\frac{(1+i)^N-1}{i}" : ""} = ${ntex(P)} \\times (1+${ntex(i, 6)})^{${ntex(N)}}${contribTex} = ${ntex(FV, 8)}` });
  }
  steps.push({ text: "Total interest = future value − total amount deposited:", tex: `${ntex(FV, 8)} - ${ntex(totalContrib, 8)} = ${ntex(interest, 8)}` });
  return {
    results: [
      { label: "Future value FV", value: money(FV), text: `FV = ${money(FV)}` },
      { label: "Total deposited", value: money(totalContrib) },
      { label: "Total interest", value: money(interest) },
      { label: "Effective annual rate", value: `${fmt(ear * 100, 5)}%` }
    ],
    steps,
    copy: `Future value: ${money(FV)}, total interest: ${money(interest)}, effective annual rate: ${fmt(ear * 100, 5)}%`,
    blocks: [
      { type: "table", caption: "Balance at the end of each year", head: ["Year", "Balance", "Total interest so far"], rows },
      { type: "plot", title: "Balance growth over time", xLabel: "Years", yLabel: "Balance", includeZero: true, series: [{ name: "Balance", points, line: true }] }
    ]
  };
}
