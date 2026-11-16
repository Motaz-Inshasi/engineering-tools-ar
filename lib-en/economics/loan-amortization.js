import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Calculate the fixed periodic payment of a loan, the total paid and the total interest, with an annual table showing the interest paid, the principal repaid and the remaining balance, and a chart of the declining balance.",
  keywords: ["loan", "repayment schedule", "amortization", "monthly payment", "loan interest", "debt repayment", "mortgage"],
  formulas: [
    { label: "Fixed payment", tex: "PMT = \\frac{P\\,i}{1-(1+i)^{-N}},\\qquad i=\\frac{r}{m},\\quad N=mt" },
    { label: "Balance after payment k", tex: "B_k = B_{k-1}(1+i) - PMT" }
  ],
  inputs: [
    { id: "P", label: "Loan principal P", type: "number", default: "100000" },
    { id: "r", label: "Annual interest rate", unit: "%", type: "number", default: "6" },
    { id: "t", label: "Loan term", unit: "years", type: "number", default: "30", help: "The term × the number of payments per year must give a whole number of payments, up to a maximum of 100 years." },
    { id: "freq", label: "Payments per year", type: "select", default: "12", options: [["12", "Monthly (12)"], ["4", "Quarterly (4)"], ["2", "Semi-annual (2)"], ["1", "Yearly (1)"]] }
  ],
  example: { values: { P: "100000", r: "6", t: "30", freq: "12" }, expect: ["599.55"], note: "Example: a mortgage of 100,000 at 6% for 30 years with monthly payments." },
  invalid: { values: { P: "100000", r: "6", t: "1.01", freq: "12" } },
  related: ["compound-interest", "npv-irr", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const P = num(input, "P", "Loan principal", { positive: true });
  const r = num(input, "r", "Interest rate", { nonNegative: true, max: 1000 });
  const t = num(input, "t", "Loan term", { positive: true, max: 100 });
  const m = Number(choice(input, "freq", "Payments per year", ["12", "4", "2", "1"], "12"));
  const Nraw = t * m;
  if (Math.abs(Nraw - Math.round(Nraw)) > 1e-9) fail(`The number of payments (${fmt(Nraw)}) must be a whole number, so adjust the term in years.`, "t");
  const N = Math.round(Nraw);
  const i = r / 100 / m;
  const pmt = i === 0 ? P / N : (P * i) / (1 - Math.pow(1 + i, -N));
  const total = pmt * N;
  const interest = total - P;
  const rows = [];
  const points = [[0, P]];
  let bal = P;
  let yInt = 0;
  let yPri = 0;
  for (let k = 1; k <= N; k++) {
    const intr = bal * i;
    const pri = k === N ? bal : pmt - intr;
    bal -= pri;
    yInt += intr;
    yPri += pri;
    if (k % m === 0 || k === N) {
      rows.push([fmt(Math.ceil(k / m)), money(yInt), money(yPri), money(Math.max(0, bal))]);
      points.push([k / m, Math.max(0, bal)]);
      yInt = 0;
      yPri = 0;
    }
  }
  const steps = [
    { text: "Interest rate per payment:", tex: `i = \\frac{r}{m} = \\frac{${ntex(r / 100, 6)}}{${m}} = ${ntex(i, 6)}` },
    { text: "Total number of payments:", tex: `N = mt = ${m} \\times ${ntex(t)} = ${N}` },
    i === 0
      ? { text: "Without interest, the loan principal is divided by the number of payments:", tex: `PMT = \\frac{P}{N} = \\frac{${ntex(P)}}{${N}} = ${ntex(pmt, 8)}` }
      : { text: "Fixed payment:", tex: `PMT = \\frac{P\\,i}{1-(1+i)^{-N}} = \\frac{${ntex(P)} \\times ${ntex(i, 6)}}{1-(1+${ntex(i, 6)})^{-${N}}} = ${ntex(pmt, 8)}` },
    { text: "Total paid and total interest:", tex: `${ntex(pmt, 8)} \\times ${N} = ${ntex(total, 8)},\\qquad ${ntex(total, 8)} - ${ntex(P)} = ${ntex(interest, 8)}` }
  ];
  return {
    results: [
      { label: "Periodic payment", value: money(pmt), text: `Payment ${money(pmt)}` },
      { label: "Total paid", value: money(total) },
      { label: "Total interest", value: money(interest) },
      { label: "Number of payments", value: String(N) }
    ],
    steps,
    copy: `Payment: ${money(pmt)} per period, total paid: ${money(total)}, total interest: ${money(interest)}`,
    blocks: [
      { type: "table", caption: "Annual repayment schedule", head: ["Year", "Interest paid", "Principal repaid", "Remaining balance"], rows: [...rows, ["Total", money(interest), money(P), "0.00"]] },
      { type: "note", text: "The payment is fixed for the whole term, so the interest share is larger at the start and the principal share grows over time. Figures are rounded to two decimal places." },
      { type: "plot", title: "Remaining balance over time", xLabel: "Years", yLabel: "Balance", includeZero: true, series: [{ name: "Remaining balance", points, line: true }] }
    ]
  };
}
