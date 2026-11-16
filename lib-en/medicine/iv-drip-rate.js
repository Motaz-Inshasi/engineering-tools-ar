import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "For education and training only. It does not replace your physician, pharmacist or the approved protocol of your institution." };

export const meta = {
  description: "Calculate the intravenous infusion rate in mL per hour, and the number of drops per minute for a given drop factor of the tubing, with the exact value and the value rounded to the nearest whole drop.",
  keywords: ["IV drip rate", "number of drops", "gtt/min", "infusion rate", "IV drip rate", "drop factor", "mL/h"],
  formulas: [
    { label: "Flow rate", tex: "R = \\frac{V}{T}" },
    { label: "Drops per minute", tex: "N = \\frac{R \\times DF}{60}" }
  ],
  inputs: [
    { id: "volume", label: "Solution volume", unit: "mL", type: "number", default: "1000" },
    { id: "hours", label: "Duration in hours", unit: "h", type: "number", default: "8", help: "Integer from 0 to 999." },
    { id: "minutes", label: "Duration in minutes", unit: "min", type: "number", default: "0", help: "Integer from 0 to 59." },
    { id: "dropFactor", label: "Tubing drop factor", unit: "gtt/mL", type: "select", default: "20", options: [["10", "10 drops/mL"], ["15", "15 drops/mL"], ["20", "20 drops/mL"], ["60", "60 drops/mL (micro)"]] }
  ],
  example: { values: { volume: "1000", hours: "8", minutes: "0", dropFactor: "15" }, expect: ["125 mL/h", "31 gtt/min"], note: "Example: 1000 mL given over 8 hours with a 15 drops/mL tubing." },
  invalid: { values: { volume: "1000", hours: "0", minutes: "0", dropFactor: "15" } },
  related: ["drug-dosage", "fluid-requirements", "bmi-bsa", "creatinine-clearance", "lab-units"]
};

export function solve(input) {
  const V = num(input, "volume", "Solution volume", { positive: true });
  const hours = num(input, "hours", "Duration in hours", { integer: true, min: 0, max: 999 });
  const minutes = num(input, "minutes", "Duration in minutes", { integer: true, min: 0, max: 59 });
  const DF = Number(choice(input, "dropFactor", "Tubing drop factor", ["10", "15", "20", "60"], "20"));
  const T = hours * 60 + minutes;
  if (T <= 0) fail("Enter a duration greater than zero (hours or minutes).", "hours");
  const rate = V * 60 / T;
  const exactDrops = rate * DF / 60;
  const drops = Math.round(exactDrops);
  const steps = [
    { text: "Total duration in minutes:", tex: `T = ${ntex(hours)} \\times 60 + ${ntex(minutes)} = ${ntex(T)}\\ min` },
    { text: "Flow rate in mL per hour:", tex: `R = \\frac{${ntex(V)}}{${ntex(T / 60, 6)}} = ${ntex(rate, 6)}\\ mL/h` },
    { text: "Drops per minute (exact value):", tex: `N = \\frac{${ntex(rate, 6)} \\times ${DF}}{60} = ${ntex(exactDrops, 6)}\\ gtt/min` },
    { text: "We round to the nearest whole drop:", tex: `N \\approx ${drops}\\ gtt/min` }
  ];
  const blocks = [NOTE];
  if (drops === 0) blocks.unshift({ type: "note", tone: "warn", text: "After rounding, the rate is less than one drop per minute, so it cannot be set with this tubing. Use a tubing with a higher drop factor or an infusion pump." });
  return {
    results: [
      { label: "Flow rate", value: `${fmt(rate, 6)} mL/h`, text: `${fmt(rate, 6)} mL/h` },
      { label: "Drops per minute (exact)", value: `${fmt(exactDrops, 6)} gtt/min` },
      { label: "Drops per minute (rounded)", value: `${drops} gtt/min`, text: `${drops} gtt/min` }
    ],
    steps,
    blocks,
    copy: `Flow rate ${fmt(rate, 6)} mL/h, and the drops ${fmt(exactDrops, 6)} are rounded to ${drops} gtt/min`
  };
}
