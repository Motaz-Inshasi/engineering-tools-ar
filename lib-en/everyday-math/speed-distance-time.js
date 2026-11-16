import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const KMH_FACTOR = { kmh: 1, ms: 3.6, mph: 1.609344 };
const provided = (v) => !isBlank(v);

const hourWord = (h) => (h === 1 ? "1 hour" : h === 2 ? "2 hours" : h <= 10 ? `${h} hours` : `${h} hours`);
const minWord = (m) => (m === 1 ? "1 minute" : m === 2 ? "2 minutes" : m <= 10 ? `${m} minutes` : `${m} minutes`);

const hm = (h) => {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  const parts = [];
  if (hh > 0) parts.push(hourWord(hh));
  if (mm > 0) parts.push(minWord(mm));
  return parts.length ? parts.join(" and ") : "0 minutes";
};

const readTime = (input, timeMode) => {
  if (timeMode === "decimal") return num(input, "time", "Time", { positive: true });
  const h = num(input, "timeH", "Hours", { integer: true, nonNegative: true, default: 0 });
  const m = num(input, "timeM", "Minutes", { integer: true, min: 0, max: 59, default: 0 });
  const total = h + m / 60;
  if (!(total > 0)) fail("The time must be greater than zero.", "timeH");
  return total;
};

const solveTriple = (input) => {
  const unit = choice(input, "speedUnit", "Speed unit", ["kmh", "ms", "mph"], "kmh");
  const timeMode = choice(input, "timeMode", "Time format", ["decimal", "hm"], "decimal");
  const hasSpeed = provided(input.speed);
  const hasDistance = provided(input.distance);
  const hasTime = timeMode === "decimal" ? provided(input.time) : provided(input.timeH) || provided(input.timeM);
  const count = [hasSpeed, hasDistance, hasTime].filter(Boolean).length;
  if (count !== 2) {
    const field = !hasSpeed ? "speed" : !hasDistance ? "distance" : "time";
    fail("Enter exactly two values from speed, distance, and time, and leave the third empty.", field);
  }
  const speed = hasSpeed ? num(input, "speed", "Speed", { positive: true }) * KMH_FACTOR[unit] : null;
  const distance = hasDistance ? num(input, "distance", "Distance", { positive: true }) : null;
  const time = hasTime ? readTime(input, timeMode) : null;

  let v = speed;
  let d = distance;
  let t = time;
  if (v === null) v = d / t;
  else if (d === null) d = v * t;
  else t = d / v;

  const steps = [];
  if (speed === null) steps.push({ text: "Speed = distance ÷ time:", tex: `v = \\frac{${ntex(d)}}{${ntex(t, 6)}} = ${ntex(v, 6)}\\ \\text{km/h}` });
  else if (distance === null) steps.push({ text: "Distance = speed × time:", tex: `d = ${ntex(v, 6)} \\times ${ntex(t, 6)} = ${ntex(d, 6)}\\ \\text{km}` });
  else steps.push({ text: "Time = distance ÷ speed:", tex: `t = \\frac{${ntex(d, 6)}}{${ntex(v, 6)}} = ${ntex(t, 6)}\\ \\text{h}` });
  steps.push({ text: "Convert the speed to all three units:", tex: `${ntex(v, 6)}\\ \\text{km/h} = ${ntex(v / 3.6, 6)}\\ \\text{m/s} = ${ntex(v / KMH_FACTOR.mph, 6)}\\ \\text{mph}` });

  return {
    results: [
      { label: "Speed in kilometers per hour", value: `${fmt(v, 6)} km/h` },
      { label: "Speed in meters per second", value: `${fmt(v / 3.6, 6)} m/s` },
      { label: "Speed in miles per hour", value: `${fmt(v / KMH_FACTOR.mph, 6)} mph` },
      { label: "Distance", value: `${fmt(d, 6)} km` },
      { label: "Time", value: hm(t) },
      { label: "Time in decimal hours", value: `${fmt(t, 6)} hours` }
    ],
    steps,
    copy: `Speed: ${fmt(v, 6)} km/h, distance: ${fmt(d, 6)} km, time: ${hm(t)}`
  };
};

const average = (input) => {
  const legMode = choice(input, "legMode", "Data for the two legs", ["speeds", "times"], "speeds");
  const d1 = num(input, "d1", "Distance of the first leg", { positive: true });
  const d2 = num(input, "d2", "Distance of the second leg", { positive: true });
  let t1, t2, v1 = null, v2 = null;
  if (legMode === "speeds") {
    v1 = num(input, "v1", "Speed of the first leg", { positive: true });
    v2 = num(input, "v2", "Speed of the second leg", { positive: true });
    t1 = d1 / v1;
    t2 = d2 / v2;
  } else {
    t1 = num(input, "t1", "Time of the first leg", { positive: true });
    t2 = num(input, "t2", "Time of the second leg", { positive: true });
  }
  const D = d1 + d2;
  const T = t1 + t2;
  const avg = D / T;
  const equalLegs = legMode === "speeds" && Math.abs(d1 - d2) < 1e-12;
  const harmonic = equalLegs ? (2 * v1 * v2) / (v1 + v2) : null;

  const steps = [];
  if (legMode === "speeds") {
    steps.push({ text: "Time for each leg = distance ÷ speed:", tex: `t_1 = \\frac{${ntex(d1)}}{${ntex(v1)}} = ${ntex(t1, 6)},\\qquad t_2 = \\frac{${ntex(d2)}}{${ntex(v2)}} = ${ntex(t2, 6)}` });
  }
  steps.push({ text: "Average speed = total distance ÷ total time (not the average of the two speeds):", tex: `\\bar{v} = \\frac{d_1 + d_2}{t_1 + t_2} = \\frac{${ntex(D)}}{${ntex(T, 6)}} = ${ntex(avg, 6)}\\ \\text{km/h}` });
  if (equalLegs) steps.push({ text: "For two equal distances, the average is the harmonic mean of the two speeds:", tex: `\\bar{v} = \\frac{2 v_1 v_2}{v_1 + v_2} = ${ntex(harmonic, 6)}\\ \\text{km/h}` });

  const results = [
    { label: "Average speed", value: `${fmt(avg, 6)} km/h` },
    { label: "Total distance", value: `${fmt(D, 6)} km` },
    { label: "Total time", value: hm(T) }
  ];
  if (harmonic !== null) results.push({ label: "Harmonic mean of the two speeds", value: `${fmt(harmonic, 6)} km/h` });

  const blocks = [];
  if (legMode === "speeds") {
    blocks.push({ type: "note", text: "When covering two distances at two different speeds, the correct average is the harmonic mean (or the distance-weighted mean), not the arithmetic mean (v1 + v2) / 2." });
  }

  return {
    results,
    steps,
    copy: `Average speed: ${fmt(avg, 6)} km/h, total distance: ${fmt(D, 6)} km, total time: ${hm(T)}`,
    blocks
  };
};

export const meta = {
  description: "Calculate the speed, distance, or time when two of them are known, convert speed between km/h, m/s, and mph, and compute the average speed of two legs using the harmonic mean or total distance divided by total time.",
  keywords: ["speed", "distance", "time", "Average speed", "harmonic mean", "speed distance time", "km/h"],
  formulas: [
    { label: "Basic relation", tex: "d = v \\times t" },
    { label: "Average speed of two legs with equal distances", tex: "\\bar{v} = \\frac{2 v_1 v_2}{v_1 + v_2}" },
    { label: "Overall average speed", tex: "\\bar{v} = \\frac{d_1 + d_2}{t_1 + t_2}" }
  ],
  inputs: [
    { id: "mode", label: "Calculation type", type: "select", default: "solve", options: [["solve", "Solve for the unknown from two values"], ["average", "Average speed of two legs"]] },
    { id: "speed", label: "Speed", type: "number", default: "80", when: { mode: ["solve"] }, help: "Leave empty if this is the unknown." },
    { id: "speedUnit", label: "Speed unit", type: "select", default: "kmh", options: [["kmh", "km/h"], ["ms", "m/s"], ["mph", "mph"]], when: { mode: ["solve"] } },
    { id: "distance", label: "Distance", unit: "km", type: "number", default: "120", when: { mode: ["solve"] }, help: "Leave empty if this is the unknown." },
    { id: "timeMode", label: "Time format", type: "select", default: "decimal", options: [["decimal", "Decimal hours"], ["hm", "Hours and minutes"]], when: { mode: ["solve"] } },
    { id: "time", label: "Time", unit: "hour", type: "number", default: "", when: { mode: ["solve"], timeMode: ["decimal"] } },
    { id: "timeH", label: "Hours", type: "number", default: "", when: { mode: ["solve"], timeMode: ["hm"] } },
    { id: "timeM", label: "Minutes", type: "number", default: "", when: { mode: ["solve"], timeMode: ["hm"] } },
    { id: "legMode", label: "Data for the two legs", type: "select", default: "speeds", options: [["speeds", "Distance and speed for each leg"], ["times", "Distance and time for each leg"]], when: { mode: ["average"] } },
    { id: "d1", label: "Distance of the first leg", unit: "km", type: "number", default: "60", when: { mode: ["average"] } },
    { id: "v1", label: "Speed of the first leg", unit: "km/h", type: "number", default: "60", when: { mode: ["average"], legMode: ["speeds"] } },
    { id: "t1", label: "Time of the first leg", unit: "hour", type: "number", default: "1", when: { mode: ["average"], legMode: ["times"] } },
    { id: "d2", label: "Distance of the second leg", unit: "km", type: "number", default: "60", when: { mode: ["average"] } },
    { id: "v2", label: "Speed of the second leg", unit: "km/h", type: "number", default: "30", when: { mode: ["average"], legMode: ["speeds"] } },
    { id: "t2", label: "Time of the second leg", unit: "hour", type: "number", default: "2", when: { mode: ["average"], legMode: ["times"] } }
  ],
  example: {
    values: { mode: "solve", speed: "80", speedUnit: "kmh", distance: "120", timeMode: "decimal", time: "", timeH: "", timeM: "", legMode: "speeds", d1: "60", v1: "60", t1: "1", d2: "60", v2: "30", t2: "2" },
    expect: ["1 hour and 30 minutes"],
    note: "Example: a distance of 120 km at a speed of 80 km/h takes 1 hour and 30 minutes."
  },
  invalid: { values: { mode: "solve", speed: "80", speedUnit: "kmh", distance: "120", timeMode: "decimal", time: "1.5", timeH: "", timeM: "", legMode: "speeds", d1: "60", v1: "60", t1: "1", d2: "60", v2: "30", t2: "2" } },
  related: ["unit-converter", "fuel-cost", "discount-tax"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Calculation type", ["solve", "average"], "solve");
  return mode === "average" ? average(input) : solveTriple(input);
}
