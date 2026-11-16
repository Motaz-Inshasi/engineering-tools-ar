import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MAX_MONTHS = 1200;
const isInt = (x) => Math.abs(x - Math.round(x)) < 1e-9;

const balanceAt = (PV, PMT, i, m) => (i === 0 ? PV + PMT * m : PV * Math.pow(1 + i, m) + (PMT * (Math.pow(1 + i, m) - 1)) / i);

const monthsText = (m) => {
  const y = Math.floor(m / 12);
  const r = m - y * 12;
  const yt = y === 0 ? "" : y === 1 ? "year" : y === 2 ? "two years" : y <= 10 ? `${y} years` : `${y} years`;
  const rt = r === 0 ? "" : r === 1 ? "month" : r === 2 ? "two months" : r <= 10 ? `${r} months` : `${r} months`;
  if (!yt && !rt) return "0 months";
  if (!yt) return rt;
  if (!rt) return yt;
  return `${yt} and ${rt}`;
};

const yearRows = (PV, PMT, i, months) => {
  const marks = [];
  for (let m = 12; m < months; m += 12) marks.push(m);
  if (months > 0) marks.push(months);
  return marks.map((m) => {
    const b = balanceAt(PV, PMT, i, m);
    const dep = PV + PMT * m;
    return [fmt(m / 12, 4), money(b), money(dep), money(b - dep)];
  });
};

const yearTable = (PV, PMT, i, months) => ({
  type: "table",
  caption: "Balance development at the end of each year",
  head: ["Period (years)", "Balance", "Total deposited", "Interest so far"],
  rows: yearRows(PV, PMT, i, months)
});

export const meta = {
  description: "Calculate the monthly deposit needed to reach a financial goal with an expected annual return over a set period, or calculate the time needed if you know the monthly deposit, with a yearly balance table.",
  keywords: ["savings", "financial goal", "monthly deposit", "PMT", "saving", "savings", "savings goal"],
  formulas: [
    { label: "Required monthly deposit (at the end of each month)", tex: "PMT = \\frac{(FV - PV(1+i)^N)\\, i}{(1+i)^N - 1},\\qquad i = \\frac{r}{12}" },
    { label: "Balance after N months", tex: "FV = PV(1+i)^N + PMT\\,\\frac{(1+i)^N - 1}{i}" },
    { label: "Number of months to reach the goal", tex: "N = \\frac{\\ln\\left(\\frac{FV\\, i + PMT}{PV\\, i + PMT}\\right)}{\\ln(1+i)}" }
  ],
  inputs: [
    { id: "mode", label: "What do you want to calculate?", type: "select", default: "forward", options: [["forward", "Required monthly deposit"], ["reverse", "Time needed for a fixed monthly deposit"]] },
    { id: "target", label: "Target amount", type: "number", default: "100000" },
    { id: "current", label: "Current savings", type: "number", default: "10000" },
    { id: "rate", label: "Expected annual return", unit: "%", type: "number", default: "5", help: "Set it to zero if you do not expect a return." },
    { id: "time", label: "Available time", type: "number", default: "10", when: { mode: ["forward"] } },
    { id: "timeUnit", label: "Time unit", type: "select", default: "years", options: [["years", "years"], ["months", "months"]], when: { mode: ["forward"] } },
    { id: "deposit", label: "monthly deposit", type: "number", default: "500", when: { mode: ["reverse"] }, help: "Deposited at the end of each month." }
  ],
  example: { values: { mode: "forward", target: "100000", current: "10000", rate: "5", time: "10", timeUnit: "years", deposit: "500" }, expect: ["537.92"], note: "Example: a goal of 100000 from 10000 at 5% per year over 10 years." },
  invalid: { values: { mode: "reverse", target: "100000", current: "10000", rate: "0", time: "10", timeUnit: "years", deposit: "0" } },
  related: ["compound-interest", "loan-amortization", "budget-planner", "zakat"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Calculation type", ["forward", "reverse"], "forward");
  const target = num(input, "target", "Target amount", { positive: true });
  const current = num(input, "current", "Current savings", { nonNegative: true, default: 0 });
  const rate = num(input, "rate", "Annual return", { nonNegative: true, max: 100, default: 0 });
  const i = rate / 1200;
  return mode === "reverse" ? reverse(input, target, current, i) : forward(input, target, current, i);
}

function forward(input, target, current, i) {
  const unit = choice(input, "timeUnit", "Time unit", ["years", "months"], "years");
  const t = num(input, "time", "Period", { positive: true });
  const n = unit === "years" ? t * 12 : t;
  if (!isInt(n)) fail("The period must give a whole number of months, such as 2.5 years or 30 months.", "time");
  if (n > MAX_MONTHS) fail("The period must not exceed 100 years.", "time");
  const months = Math.round(n);
  const pmt = balanceAt(current, 0, i, months) >= target ? 0
    : i === 0 ? (target - current) / months
    : ((target - current * Math.pow(1 + i, months)) * i) / (Math.pow(1 + i, months) - 1);
  const reached = pmt === 0;
  const deposited = current + pmt * months;
  const final = balanceAt(current, pmt, i, months);
  const interest = final - deposited;

  const steps = [{ text: "Convert the period to months and the monthly rate:", tex: `N = ${months},\\qquad i = \\frac{r}{12} = ${ntex(i, 6)}` }];
  if (reached) steps.push(current >= target ? "Current savings already reach the target amount, so no deposits are needed." : "Your current balance grows to the goal without additional deposits.");
  else if (i === 0) steps.push({ text: "Without return, the monthly deposit is the difference divided by the number of months:", tex: `PMT = \\frac{FV - PV}{N} = \\frac{${ntex(target)} - ${ntex(current)}}{${months}} = ${ntex(pmt, 8)}` });
  else steps.push({ text: "Required monthly deposit:", tex: `PMT = \\frac{(FV - PV(1+i)^N)\\, i}{(1+i)^N - 1} = \\frac{(${ntex(target)} - ${ntex(current)} \\times (1+${ntex(i, 6)})^{${months}}) \\times ${ntex(i, 6)}}{(1+${ntex(i, 6)})^{${months}} - 1} = ${ntex(pmt, 8)}` });

  return {
    results: [
      { label: "Required monthly deposit", value: reached ? "No deposit needed" : money(pmt) },
      { label: "Period", value: monthsText(months) },
      { label: "Total you will deposit", value: money(deposited) },
      { label: "Total expected interest", value: money(interest) },
      { label: "Balance at the end of the period", value: money(final) }
    ],
    steps,
    copy: reached
      ? `The goal is reached without deposits; expected balance: ${money(final)}`
      : `Required monthly deposit: ${money(pmt)} for ${monthsText(months)}, total expected interest: ${money(interest)}`,
    blocks: [yearTable(current, pmt, i, months)]
  };
}

function reverse(input, target, current, i) {
  const deposit = num(input, "deposit", "monthly deposit", { nonNegative: true });
  let real = 0;
  if (current < target) {
    if (i === 0) {
      if (!(deposit > 0)) fail("The monthly deposit must be greater than zero to reach the goal without return.", "deposit");
      real = (target - current) / deposit;
    } else {
      const denom = current * i + deposit;
      if (!(denom > 0)) fail("The goal cannot be reached with a zero deposit and zero current savings.", "deposit");
      real = Math.log((target * i + deposit) / denom) / Math.log(1 + i);
    }
  }
  const months = Math.ceil(real - 1e-9);
  if (months > MAX_MONTHS) fail("The required period exceeds 100 years; increase the deposit amount.", "deposit");
  const final = balanceAt(current, deposit, i, months);
  const deposited = current + deposit * months;
  const interest = final - deposited;

  const steps = [];
  if (months === 0) steps.push("Current savings already reach the target amount.");
  else {
    steps.push(i === 0
      ? { text: "Without return, the number of months is the difference divided by the deposit:", tex: `N = \\frac{FV - PV}{PMT} = \\frac{${ntex(target)} - ${ntex(current)}}{${ntex(deposit)}} = ${ntex(real, 6)}` }
      : { text: "Solving the balance equation for the number of months N:", tex: `N = \\frac{\\ln\\left(\\frac{FV\\, i + PMT}{PV\\, i + PMT}\\right)}{\\ln(1+i)} = ${ntex(real, 6)}` });
    steps.push({ text: "Round N up because deposits are made monthly:", tex: `N = \\lceil ${ntex(real, 6)} \\rceil = ${months}` });
  }

  return {
    results: [
      { label: "Required period", value: months === 0 ? "The goal is already reached" : `${months} months (${monthsText(months)})` },
      { label: "Balance on reaching the goal", value: money(final) },
      { label: "Total you will deposit", value: money(deposited) },
      { label: "Total interest", value: money(interest) }
    ],
    steps,
    copy: months === 0
      ? "The goal is already reached"
      : `You need ${months} months (${monthsText(months)}) to reach ${money(target)} by depositing ${money(deposit)} monthly`,
    blocks: months === 0 ? [] : [yearTable(current, deposit, i, months)]
  };
}
