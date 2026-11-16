import { fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LO = -0.99;
const HI = 10;
const GRID = 4000;
const NO_PAYBACK = "The investment is not recovered within the period";

const npvAt = (cf, r) => {
  let s = 0;
  let d = 1;
  for (let t = 0; t < cf.length; t++) {
    if (t > 0) d *= 1 + r;
    s += cf[t] / d;
  }
  return s;
};

function bisect(cf, a, b) {
  let fa = npvAt(cf, a);
  for (let k = 0; k < 200; k++) {
    const m = (a + b) / 2;
    const fm = npvAt(cf, m);
    if (fm === 0) return m;
    if (fa * fm < 0) b = m;
    else {
      a = m;
      fa = fm;
    }
  }
  return (a + b) / 2;
}

function findIrr(cf) {
  let prevR = LO;
  let prevV = npvAt(cf, LO);
  let root = null;
  let changes = 0;
  for (let k = 1; k <= GRID; k++) {
    const r = LO + ((HI - LO) * k) / GRID;
    const v = npvAt(cf, r);
    if (Number.isFinite(prevV) && Number.isFinite(v) && prevV * v < 0) {
      changes++;
      if (root === null) root = bisect(cf, prevR, r);
    }
    if (Number.isFinite(v) && v === 0 && root === null) root = r;
    prevR = r;
    prevV = v;
  }
  return { root, changes };
}

function payback(vals) {
  let cum = 0;
  for (let t = 0; t < vals.length; t++) {
    const prev = cum;
    cum += vals[t];
    if (cum >= 0 && (t === 0 || prev < 0)) return t === 0 ? 0 : t - 1 + -prev / vals[t];
  }
  return null;
}

export const meta = {
  description: "Calculate the net present value, internal rate of return, profitability index, and simple and discounted payback periods for a series of cash flows, with a yearly table of present and cumulative values.",
  keywords: ["net present value", "NPV", "internal rate of return", "IRR", "payback period", "payback", "profitability index", "feasibility study"],
  formulas: [
    { label: "net present value", tex: "NPV = \\sum_{t=0}^{n}\\frac{CF_t}{(1+r)^t}" },
    { label: "internal rate of return", tex: "NPV(IRR) = 0" },
    { label: "profitability index", tex: "PI = \\frac{\\sum_{t=1}^{n} CF_t/(1+r)^t}{|CF_0|}" }
  ],
  inputs: [
    { id: "r", label: "Discount rate", unit: "%", type: "number", default: "10" },
    { id: "cf", label: "Cash flows CF0, CF1, ...", type: "textarea", rows: 3, default: "-1000 300 400 500", placeholder: "-1000 300 400 500", help: "Start with the initial cash flow CF0 (usually negative), then the annual cash flows. Separate the values with a space or a comma." }
  ],
  example: { values: { r: "10", cf: "-1000 300 400 500" }, expect: ["NPV = -21.04", "IRR = 8.896%"], note: "Example: an investment of 1000 yields 300, 400 and 500 in the next three years at a 10% discount rate." },
  invalid: { values: { r: "10", cf: "-1000" } },
  related: ["compound-interest", "loan-amortization", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const rPct = num(input, "r", "Discount rate", { min: -99, max: 1000 });
  const cf = numList(input, "cf", "Cash flows", { min: 2, max: 200 });
  if (cf[0] === 0) fail("The initial cash flow CF0 cannot be zero.", "cf");
  const rate = rPct / 100;
  const npv = npvAt(cf, rate);
  if (!Number.isFinite(npv)) fail("The net present value cannot be calculated at this rate; try a higher rate.", "r");
  const df = cf.map((_, t) => 1 / Math.pow(1 + rate, t));
  const pv = cf.map((c, t) => c * df[t]);
  const pvFuture = pv.slice(1).reduce((s, x) => s + x, 0);
  const PI = pvFuture / Math.abs(cf[0]);
  const cum = [];
  const cumPv = [];
  let a = 0;
  let b = 0;
  cf.forEach((c, t) => {
    a += c;
    b += pv[t];
    cum.push(a);
    cumPv.push(b);
  });
  const pb = payback(cf);
  const dpb = payback(pv);
  const { root, changes } = findIrr(cf);
  const irrText = root === null ? "Undefined" : `${fmt(root * 100, 4)}%`;
  const pbText = pb === null ? NO_PAYBACK : `${fmt(pb, 4)} years`;
  const dpbText = dpb === null ? NO_PAYBACK : `${fmt(dpb, 4)} years`;
  const terms = cf.map((c, t) => (t === 0 ? ntex(c) : `\\frac{${ntex(c)}}{(1+${ntex(rate, 6)})^{${t}}}`)).join(" + ");
  const steps = [
    { text: "Net present value = sum of the present values of the cash flows:", tex: `NPV = ${terms} = ${ntex(npv, 8)}` },
    "The internal rate of return is the rate that makes NPV = 0. We search for the first change of sign of NPV across the range from -99% to 1000%, then narrow the interval by bisection.",
    "Payback period: the last year in which the cumulative balance is negative, plus the fractional part of the following year.",
    `Profitability index = ${ntex(pvFuture, 8)} ÷ ${ntex(Math.abs(cf[0]), 8)} = ${fmt(PI, 4)}`
  ];
  const blocks = [
    { type: "table", caption: "Table of present and cumulative values", head: ["Year", "Cash flow", "Discount factor", "Present value", "Cumulative", "Cumulative discounted"], rows: cf.map((c, t) => [fmt(t), money(c), fmt(df[t], 6), money(pv[t]), money(cum[t]), money(cumPv[t])]) }
  ];
  if (changes === 0) blocks.push({ type: "note", text: "NPV does not change sign across the range from -99% to 1000%, so an internal rate of return cannot be defined.", tone: "warn" });
  if (changes > 1) blocks.push({ type: "note", text: "More than one internal rate of return exists for these cash flows; the smallest is shown." });
  return {
    results: [
      { label: "Net present value NPV", value: money(npv), text: `NPV = ${money(npv)}` },
      { label: "Internal rate of return IRR", value: irrText, text: `IRR = ${irrText}` },
      { label: "payback period", value: pbText },
      { label: "Discounted payback period", value: dpbText },
      { label: "Profitability index PI", value: fmt(PI, 4) }
    ],
    steps,
    copy: `NPV = ${money(npv)}, IRR = ${irrText}, profitability index PI = ${fmt(PI, 4)}`,
    blocks
  };
}
