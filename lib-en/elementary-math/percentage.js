import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["of", "what", "change", "add", "sub", "reverse", "points"];
const N = (x) => fmt(x, 10);
const P = (x) => `${fmt(x, 10)}%`;

export const meta = {
  description: "Calculate percentages in seven modes: a percent of a number, what percent one number is of another, percent change between values, increasing or decreasing a value by a percent, the original value before a change, or the difference between two percentages in percentage points.",
  keywords: ["percentage", "percentage", "percent change", "increase by a percentage", "decrease by a percentage", "percentage points", "percentage points", "original value"],
  formulas: [
    { label: "Percentage of a number", tex: "P = \\frac{X}{100}\\, Y" },
    { label: "percent change", tex: "\\Delta\\% = \\frac{B - A}{A}\\times 100" },
    { label: "Original value before the change", tex: "Y = \\frac{F}{1 \\pm \\frac{X}{100}}" },
    { label: "percentage points", tex: "\\Delta p = p_2 - p_1,\\qquad \\text{relative change} = \\frac{\\Delta p}{p_1}\\times 100" }
  ],
  inputs: [
    { id: "mode", label: "Calculation type", type: "select", default: "of", options: [["of", "X% of Y"], ["what", "Part X is what % of Y"], ["change", "Percent change from A to B"], ["add", "Increase Y by X%"], ["sub", "Decrease Y by X%"], ["reverse", "Original value before the change"], ["points", "Difference between two percentages (percentage points)"]] },
    { id: "pct", label: "Percentage X", unit: "%", type: "number", default: "20", when: { mode: ["of", "add", "sub", "reverse"] } },
    { id: "base", label: "Value Y", type: "number", default: "150", when: { mode: ["of", "add", "sub"] } },
    { id: "part", label: "Part X", type: "number", default: "30", when: { mode: ["what"] } },
    { id: "whole", label: "Whole Y", type: "number", default: "150", when: { mode: ["what"] } },
    { id: "dir", label: "Type of change", type: "select", default: "inc", options: [["inc", "Increase"], ["dec", "Decrease"]], when: { mode: ["reverse"] } },
    { id: "final", label: "Final value F", type: "number", default: "230", when: { mode: ["reverse"] } },
    { id: "from", label: "Original value A", type: "number", default: "80", when: { mode: ["change"] } },
    { id: "to", label: "New value B", type: "number", default: "100", when: { mode: ["change"] } },
    { id: "p1", label: "First percentage p1", unit: "%", type: "number", default: "12", when: { mode: ["points"] } },
    { id: "p2", label: "Second percentage p2", unit: "%", type: "number", default: "15", when: { mode: ["points"] } }
  ],
  example: {
    values: { mode: "of", pct: "20", base: "150", part: "30", whole: "150", dir: "inc", final: "230", from: "80", to: "100", p1: "12", p2: "15" },
    expect: ["= 30"],
    note: "Example: 20% of 150 = 30."
  },
  invalid: { values: { mode: "change", from: "0", to: "5" } },
  related: ["fractions", "ratio-proportion", "significant-figures"]
};

function ofMode(input) {
  const x = num(input, "pct", "Percentage X", { nonNegative: true });
  const y = num(input, "base", "Value Y");
  const r = (x * y) / 100;
  return {
    results: [
      { label: "Result", value: N(r) },
      { label: "Percentage as a decimal", value: N(x / 100) }
    ],
    steps: [
      { text: "We convert the percentage to a decimal by dividing by 100:", tex: `\\frac{${ntex(x)}}{100} = ${ntex(x / 100, 8)}` },
      { text: "We multiply the decimal number by the value:", tex: `${ntex(x / 100, 8)} \\times ${ntex(y)} = ${ntex(r, 8)}` }
    ],
    copy: `${N(x)}% of ${N(y)} = ${N(r)}`
  };
}

function whatMode(input) {
  const part = num(input, "part", "Part X");
  const whole = num(input, "whole", "Whole Y", { nonZero: true });
  const p = (part * 100) / whole;
  return {
    results: [{ label: "Percentage", value: P(p) }],
    steps: [
      { text: "We divide the part by the whole and multiply by 100:", tex: `\\frac{${ntex(part)}}{${ntex(whole)}} \\times 100 = ${ntex(p, 8)}\\%` }
    ],
    copy: `${N(part)} is ${N(p)}% of ${N(whole)}`
  };
}

function changeMode(input) {
  const a = num(input, "from", "Original value A", { nonZero: true });
  const b = num(input, "to", "New value B");
  const diff = b - a;
  const p = (diff * 100) / a;
  const dir = diff > 0 ? "Increase" : diff < 0 ? "Decrease" : "No change";
  return {
    results: [
      { label: "percent change", value: `${p > 0 ? "+" : ""}${P(p)}` },
      { label: "Amount of change", value: N(diff) },
      { label: "Type of change", value: dir }
    ],
    steps: [
      { text: "We calculate the difference between the two values:", tex: `\\Delta = B - A = ${ntex(b)} - ${ntex(a)} = ${ntex(diff)}` },
      { text: "We divide the difference by the original value and multiply by 100:", tex: `\\frac{${ntex(diff)}}{${ntex(a)}} \\times 100 = ${ntex(p, 8)}\\%` }
    ],
    copy: `From ${N(a)} to ${N(b)}: ${dir} ${N(Math.abs(p))}%`
  };
}

function shiftMode(input, sign) {
  const x = num(input, "pct", "Percentage X", { nonNegative: true });
  if (sign < 0 && x > 100) fail("The decrease percentage cannot exceed 100%.", "pct");
  const y = num(input, "base", "Value Y");
  const inc = (y * x) / 100;
  const r = y + sign * inc;
  const word = sign > 0 ? "Increase" : "Decrease";
  const op = sign > 0 ? "+" : "-";
  return {
    results: [
      { label: sign > 0 ? "Value after increase" : "Value after decrease", value: N(r) },
      { label: "Amount of change", value: N(inc) }
    ],
    steps: [
      { text: "We calculate the amount of change from the percentage:", tex: `\\frac{${ntex(x)}}{100} \\times ${ntex(y)} = ${ntex(inc, 8)}` },
      { text: `We apply ${word} to the original value:`, tex: `${ntex(y)} ${op} ${ntex(inc, 8)} = ${ntex(r, 8)}` }
    ],
    copy: `${N(y)} after ${word} ${N(x)}% = ${N(r)}`
  };
}

function reverseMode(input) {
  const f = num(input, "final", "Final value F");
  const x = num(input, "pct", "Percentage X", { nonNegative: true });
  const dir = choice(input, "dir", "Type of change", ["inc", "dec"], "inc");
  if (dir === "dec" && x >= 100) fail("The decrease percentage must be less than 100%.", "pct");
  const inc = dir === "inc";
  const f0 = inc ? 100 + x : 100 - x;
  const orig = (f * 100) / f0;
  const word = inc ? "Increase" : "Decrease";
  return {
    results: [
      { label: "original value", value: N(orig) },
      { label: "Change factor", value: `× ${N(f0 / 100)}` }
    ],
    steps: [
      { text: "Final value = original × change factor, where change factor = 1 ± X/100:", tex: `1 ${inc ? "+" : "-"} \\frac{${ntex(x)}}{100} = \\frac{${ntex(f0)}}{100}` },
      { text: "We divide the final value by the change factor:", tex: `Y = \\frac{${ntex(f)}}{${ntex(f0 / 100, 8)}} = \\frac{${ntex(f)} \\times 100}{${ntex(f0)}} = ${ntex(orig, 8)}` }
    ],
    copy: `Original value = ${N(orig)} (final ${N(f)} after ${word} ${N(x)}%)`
  };
}

function pointsMode(input) {
  const p1 = num(input, "p1", "First percentage p1", { nonZero: true });
  const p2 = num(input, "p2", "Second percentage p2");
  const diff = p2 - p1;
  const rel = (diff * 100) / p1;
  const word = diff > 0 ? "Increase" : diff < 0 ? "Decrease" : "No change";
  return {
    results: [
      { label: "Difference in percentage points", value: `${N(diff)} percentage points` },
      { label: "Relative change", value: `${rel > 0 ? "+" : ""}${P(rel)}` },
      { label: "Type of change", value: word }
    ],
    steps: [
      { text: "The difference in percentage points is the direct subtraction of the two percentages:", tex: `\\Delta p = p_2 - p_1 = ${ntex(p2)} - ${ntex(p1)} = ${ntex(diff)}\\ \\text{pp}` },
      { text: "The relative change compares the difference with the first percentage:", tex: `\\frac{\\Delta p}{p_1} \\times 100 = \\frac{${ntex(diff)}}{${ntex(p1)}} \\times 100 = ${ntex(rel, 8)}\\%` }
    ],
    copy: `From ${N(p1)}% to ${N(p2)}%: a difference of ${N(diff)} percentage points, and a relative change of ${N(rel)}%`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Calculation type", MODES, "of");
  if (mode === "of") return ofMode(input);
  if (mode === "what") return whatMode(input);
  if (mode === "change") return changeMode(input);
  if (mode === "add") return shiftMode(input, 1);
  if (mode === "sub") return shiftMode(input, -1);
  if (mode === "reverse") return reverseMode(input);
  return pointsMode(input);
}
