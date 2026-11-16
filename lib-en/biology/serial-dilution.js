import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const HEMO_VOLUME_FACTOR = 1e4;

function sci(x, sig = 4) {
  if (x === 0) return "0";
  const [m, e] = x.toExponential(sig - 1).split("e");
  return `${m.includes(".") ? m.replace(/\.?0+$/, "") : m} × 10^${Number(e)}`;
}

function dilText(x) {
  return Number.isInteger(x) && x < 1e15 ? String(x) : fmt(x, 4);
}

export const meta = {
  description: "Calculate the concentrations and the diluent volume for each step of a serial dilution, the colony-forming units CFU/mL from counted colonies, or the number of cells/mL using a counting chamber (hemocytometer).",
  keywords: ["Serial dilution", "serial dilution", "CFU", "Colony-forming units", "Cell counting", "hemocytometer", "Trypan blue", "Concentration"],
  formulas: [
    { label: "Dilution at step k", tex: "D_k = f^{k},\\qquad C_k = \\frac{C_0}{f^{k}}" },
    { label: "Colony-forming units", tex: "\\text{CFU/mL} = \\frac{\\text{colonies}}{V \\times d}" },
    { label: "Counting chamber", tex: "\\text{cells/mL} = \\frac{\\text{cells counted}}{\\text{squares counted}} \\times D \\times 10^4" }
  ],
  inputs: [
    {
      id: "mode", label: "Calculation method", type: "select", default: "series",
      options: [["series", "Serial dilution"], ["cfu", "Colony count (CFU/mL)"], ["hemocytometer", "Cell count with a counting chamber"]]
    },
    { id: "c0", label: "Starting concentration C0", type: "number", default: "1000", when: { mode: ["series"] }, help: "In any unit you want, such as CFU/mL or cells/mL." },
    { id: "factor", label: "Dilution factor per step f", type: "number", default: "10", when: { mode: ["series"] }, help: "For example 10 or 2." },
    { id: "nsteps", label: "Number of dilution steps", type: "number", default: "6", when: { mode: ["series"] }, help: "Whole number from 1 to 15." },
    { id: "vt", label: "Transfer volume from one tube to the next", unit: "mL", type: "number", default: "1", when: { mode: ["series"] } },
    { id: "colonies", label: "Number of colonies counted", type: "number", default: "150", when: { mode: ["cfu"] } },
    { id: "vplate", label: "Volume of solution plated", unit: "mL", type: "number", default: "0.1", when: { mode: ["cfu"] } },
    { id: "dcfu", label: "Dilution factor of the counted plate", type: "number", default: "1e-6", when: { mode: ["cfu"] }, help: "Enter 1e-6 or 1000000. A value greater than 1 is treated as the reciprocal of a dilution." },
    { id: "cells", label: "Number of cells counted in the chamber", type: "number", default: "200", when: { mode: ["hemocytometer"] } },
    { id: "squares", label: "Number of large squares counted", type: "number", default: "4", when: { mode: ["hemocytometer"] } },
    { id: "dhemo", label: "Dilution factor", type: "number", default: "2", when: { mode: ["hemocytometer"] }, help: "For example 2 when cells are mixed with trypan blue at a 1:1 ratio." }
  ],
  example: { values: { mode: "cfu", c0: "1000", factor: "10", nsteps: "6", vt: "1", colonies: "150", vplate: "0.1", dcfu: "1e-6", cells: "200", squares: "4", dhemo: "2" }, expect: ["1.5 × 10^9 CFU/mL"], note: "Example: 150 colonies from 0.1 mL of a 10^-6 dilution." },
  invalid: { values: { mode: "cfu", c0: "1000", factor: "10", nsteps: "6", vt: "1", colonies: "-5", vplate: "0.1", dcfu: "1e-6", cells: "200", squares: "4", dhemo: "2" } },
  related: ["solutions", "population-growth", "lab-units"]
};

function seriesMode(input) {
  const c0 = num(input, "c0", "Starting concentration C0", { positive: true });
  const f = num(input, "factor", "Dilution factor", { positive: true });
  if (f <= 1) fail("The dilution factor must be greater than 1.", "factor");
  const n = num(input, "nsteps", "Number of steps", { integer: true, min: 1, max: 15 });
  const vt = num(input, "vt", "Transfer volume", { positive: true });
  const perTube = vt * (f - 1);
  const cn = c0 / Math.pow(f, n);
  const rows = [["Original", "1:1", fmt(c0, 6), "—"]];
  for (let k = 1; k <= n; k++) rows.push([String(k), `1:${dilText(Math.pow(f, k))}`, fmt(c0 / Math.pow(f, k), 4), fmt(perTube, 4)]);
  return {
    results: [
      { label: "Final concentration", value: fmt(cn, 4) },
      { label: "Total dilution", value: `1:${dilText(Math.pow(f, n))}` },
      { label: "Total diluent added (mL)", value: fmt(n * perTube, 4) }
    ],
    steps: [
      { text: "Dilution at the last tube:", tex: `D_n = f^n = ${ntex(f)}^{${n}} = ${ntex(Math.pow(f, n))}` },
      { text: "Final concentration:", tex: `C_n = \\frac{C_0}{f^n} = \\frac{${ntex(c0)}}{${ntex(Math.pow(f, n))}} = ${ntex(cn, 6)}` },
      { text: "Volume of diluent added to each tube:", tex: `V_d = V_t (f-1) = ${ntex(vt)} \\times ${ntex(f - 1)} = ${ntex(perTube)}\\ \\text{mL}` }
    ],
    copy: `Concentration after ${n} steps = ${fmt(cn, 4)} (dilution 1:${dilText(Math.pow(f, n))})`,
    blocks: [{ type: "table", caption: "Tube table", head: ["Tube", "Dilution", "Concentration", "Diluent added (mL)"], rows, ltr: true }]
  };
}

function cfuMode(input) {
  const colonies = num(input, "colonies", "Number of colonies", { integer: true, nonNegative: true });
  const V = num(input, "vplate", "Volume of solution plated", { positive: true });
  const d0 = num(input, "dcfu", "Dilution factor", { positive: true });
  const d = d0 > 1 ? 1 / d0 : d0;
  const cfu = colonies / (V * d);
  const inRange = colonies >= 30 && colonies <= 300;
  const blocks = [];
  if (!inRange) blocks.push({ type: "note", tone: "warn", text: "The number of colonies is outside the acceptable range of 30 to 300, so the result is an estimate and less accurate." });
  return {
    results: [
      { label: "Number of colony-forming units", value: `${sci(cfu)} CFU/mL` },
      { label: "Dilution factor used", value: dilText(d) },
      { label: "Counting range", value: inRange ? "Within the range of 30 to 300" : "Outside the range of 30 to 300" }
    ],
    steps: [
      d0 > 1 ? { text: "The input value is greater than 1, so it is treated as the reciprocal of a dilution:", tex: `d = \\frac{1}{${ntex(d0)}} = ${ntex(d)}` } : { text: "Dilution factor used:", tex: `d = ${ntex(d)}` },
      { text: "Colony-forming units per mL:", tex: `\\frac{${colonies}}{${ntex(V)} \\times ${ntex(d)}} = ${ntex(cfu, 6)}\\ \\text{CFU/mL}` }
    ],
    copy: `${sci(cfu)} CFU/mL`,
    blocks
  };
}

function hemoMode(input) {
  const cells = num(input, "cells", "Number of cells counted", { integer: true, nonNegative: true });
  const squares = num(input, "squares", "Number of squares", { integer: true, positive: true });
  const D = num(input, "dhemo", "Dilution factor", { positive: true });
  if (D < 1) fail("The dilution factor must be 1 or greater.", "dhemo");
  const avg = cells / squares;
  const cpm = avg * D * HEMO_VOLUME_FACTOR;
  return {
    results: [
      { label: "Number of cells per mL", value: `${sci(cpm)} cells/mL` },
      { label: "Average cells per square", value: fmt(avg, 4) }
    ],
    steps: [
      { text: "Average cells per large square:", tex: `\\frac{${cells}}{${squares}} = ${ntex(avg, 6)}` },
      { text: "Conversion to cells per mL using the dilution and the chamber volume (10^4 mL):", tex: `${ntex(avg, 6)} \\times ${ntex(D)} \\times 10^4 = ${ntex(cpm, 6)}\\ \\text{cells/mL}` }
    ],
    copy: `${sci(cpm)} cells/mL`,
    blocks: [{ type: "note", text: "The volume of one large square in the chamber is 1 mm × 1 mm × 0.1 mm = 0.1 µL = 10^-4 mL, so the average is multiplied by 10^4 to get cells per mL." }]
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Calculation method", ["series", "cfu", "hemocytometer"], "series");
  if (mode === "cfu") return cfuMode(input);
  if (mode === "hemocytometer") return hemoMode(input);
  return seriesMode(input);
}
