import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, deg, toFraction, tex as ntex } from "../core/format.js";

const blank = { mode: "", unit: "cm", x1: "", y1: "", x2: "", y2: "", x3: "", y3: "", a1: "", b1: "", c1: "", a2: "", b2: "", c2: "" };

const minus = (s) => s.replace(/-/g, "−");

function gcd(x, y) {
  return y === 0 ? Math.abs(x) : gcd(y, x % y);
}

function frac(x) {
  const f = toFraction(x, 1000);
  if (!f) return minus(fmt(x, 6));
  return minus(f[1] === 1 ? String(f[0]) : `${f[0]}/${f[1]}`);
}

function isFractional(x) {
  const f = toFraction(x, 1000);
  return f !== null && f[1] !== 1;
}

function slopeForm(m, b) {
  let body = "";
  if (m !== 0) {
    const mt = isFractional(m) ? `(${frac(m)})` : frac(m);
    body = (m === 1 ? "" : m === -1 ? "−" : mt) + "x";
  }
  if (b !== 0) {
    const bt = minus(fmt(Math.abs(b), 6));
    body = body === "" ? (b < 0 ? "−" : "") + bt : body + (b < 0 ? " − " : " + ") + bt;
  }
  return `y = ${body === "" ? "0" : body}`;
}

function generalForm(A, B, C) {
  const terms = [[A, "x"], [B, "y"], [C, ""]].filter(([k]) => k !== 0);
  let s = "";
  terms.forEach(([k, v], i) => {
    const mag = Math.abs(k);
    const coef = Number.isInteger(mag) ? String(mag) : minus(fmt(mag, 6));
    const term = v === "" ? coef : (mag === 1 ? "" : coef) + v;
    const sign = i === 0 ? (k < 0 ? "−" : "") : (k < 0 ? " − " : " + ");
    s += sign + term;
  });
  return `${s === "" ? "0" : s} = 0`;
}

function normalizeInts(A, B, C) {
  const g = gcd(gcd(Math.abs(A), Math.abs(B)), Math.abs(C));
  let a = A / g, b = B / g, c = C / g;
  if (a < 0 || (a === 0 && b < 0)) { a = -a; b = -b; c = -c; }
  return [a, b, c];
}

function near(v, scale) {
  return Math.abs(v) <= 1e-9 * (1 + scale);
}

export const meta = {
  description: "Calculate the distance, midpoint, slope, angle of inclination and equation of the line between two points in the plane, and whether a third point lies on it, or find the intersection point of two lines and the angle between them, with detection of parallel and perpendicular lines.",
  keywords: ["Coordinate geometry", "Distance between two points", "Midpoint", "Slope", "Line equation", "Intersection of two lines", "Parallel", "Perpendicular", "coordinate geometry", "slope", "line equation"],
  formulas: [
    { label: "Distance and midpoint", tex: "d = \\sqrt{(x_2-x_1)^2+(y_2-y_1)^2},\\qquad M = \\left(\\tfrac{x_1+x_2}{2},\\tfrac{y_1+y_2}{2}\\right)" },
    { label: "Slope and line equation", tex: "m = \\frac{y_2-y_1}{x_2-x_1},\\qquad y = mx+b,\\qquad Ax+By+C=0" },
    { label: "Intersection of two lines", tex: "x = \\frac{c_1b_2-c_2b_1}{a_1b_2-a_2b_1},\\qquad y = \\frac{a_1c_2-a_2c_1}{a_1b_2-a_2b_1}" }
  ],
  inputs: [
    { id: "mode", label: "Mode", type: "select", default: "points", options: [["points", "Two points in the plane"], ["lines", "Two lines given by their general equations"]] },
    { id: "unit", label: "Length unit", type: "text", default: "cm" },
    { id: "x1", label: "First point x1", type: "number", default: "0", when: { mode: ["points"] } },
    { id: "y1", label: "First point y1", type: "number", default: "0", when: { mode: ["points"] } },
    { id: "x2", label: "Second point x2", type: "number", default: "4", when: { mode: ["points"] } },
    { id: "y2", label: "Second point y2", type: "number", default: "6", when: { mode: ["points"] } },
    { id: "x3", label: "Third point x3 (optional)", type: "number", when: { mode: ["points"] }, help: "Enter the coordinates of the third point together to find its distance from the line and whether it lies on it." },
    { id: "y3", label: "Third point y3 (optional)", type: "number", when: { mode: ["points"] } },
    { id: "a1", label: "Coefficient a1 in the first equation", type: "number", default: "2", when: { mode: ["lines"] }, help: "The equation is in the form a x + b y = c." },
    { id: "b1", label: "Coefficient b1", type: "number", default: "1", when: { mode: ["lines"] } },
    { id: "c1", label: "Right-hand side c1", type: "number", default: "5", when: { mode: ["lines"] } },
    { id: "a2", label: "Coefficient a2 in the second equation", type: "number", default: "1", when: { mode: ["lines"] } },
    { id: "b2", label: "Coefficient b2", type: "number", default: "-1", when: { mode: ["lines"] } },
    { id: "c2", label: "Right-hand side c2", type: "number", default: "1", when: { mode: ["lines"] } }
  ],
  example: { values: { ...blank, mode: "points", unit: "cm", x1: "0", y1: "0", x2: "4", y2: "6", x3: "2", y3: "3" }, expect: ["7.2111 cm", "3x − 2y = 0"], note: "Example: the line through (0,0) and (4,6) is 3x − 2y = 0, and the point (2,3) lies on it." },
  invalid: { values: { ...blank, mode: "points", unit: "cm", x1: "1", y1: "1", x2: "1", y2: "1" } },
  related: ["circle-geometry", "pythagoras", "plane-shapes", "solids", "triangle-solver", "polygon-area", "trigonometry", "unit-converter"]
};

function ctxOf(unit) {
  return {
    L: (x) => `${fmt(x, 6)} ${unit}`,
    P: (x, y) => `(${minus(fmt(x, 6))}, ${minus(fmt(y, 6))}) ${unit}`,
    T: (x) => ntex(x, 6),
    U: `\\text{${unit}}`
  };
}

function linePoints(a, b, c, L, center) {
  const n2 = a * a + b * b;
  const px = (a * c) / n2, py = (b * c) / n2;
  const len = Math.hypot(a, b);
  const dx = -b / len, dy = a / len;
  const s = L * (1 + Math.hypot(px, py) + (center ? Math.hypot(center[0], center[1]) : 0));
  return [[px - s * dx, py - s * dy], [px + s * dx, py + s * dy]];
}

function pointsMode(input, c) {
  const x1 = num(input, "x1", "x1"), y1 = num(input, "y1", "y1");
  const x2 = num(input, "x2", "x2"), y2 = num(input, "y2", "y2");
  const x3 = num(input, "x3", "x3", { optional: true });
  const y3 = num(input, "y3", "y3", { optional: true });
  if ((x3 === null) !== (y3 === null)) fail("Enter the coordinates of the third point together, or leave both empty.", x3 === null ? "x3" : "y3");
  const dx = x2 - x1, dy = y2 - y1;
  const d = Math.hypot(dx, dy);
  if (d === 0) fail("The two points coincide, so no line is determined between them.", "x2");
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const vertical = dx === 0;
  const m = vertical ? null : dy / dx;
  const b = vertical ? null : y1 - m * x1;
  let ang = deg(Math.atan2(dy, dx));
  if (ang < 0) ang += 180;
  if (ang >= 180) ang -= 180;
  const A0 = dy, B0 = -dx, C0 = dx * y1 - dy * x1;
  const integers = [x1, y1, x2, y2].every((v) => Number.isInteger(v));
  const [A, B, C] = integers ? normalizeInts(A0, B0, C0) : [A0, B0, C0];
  const slopeText = vertical ? "Undefined" : isFractional(m) ? `${frac(m)} ≈ ${minus(fmt(m, 6))}` : minus(fmt(m, 6));
  const lineEq = vertical ? `x = ${minus(fmt(x1, 6))}` : slopeForm(m, b);
  const results = [
    { label: "Distance between the two points", value: c.L(d), text: c.L(d) },
    { label: "Midpoint", value: c.P(mx, my), text: c.P(mx, my) },
    { label: "Slope m", value: slopeText },
    { label: "Angle of inclination (in degrees)", value: `${fmt(ang, 6)}°` },
    { label: "Slope-intercept equation", value: lineEq },
    { label: "General form Ax + By + C = 0", value: generalForm(A, B, C) }
  ];
  const steps = [
    { text: "Distance:", tex: `d = \\sqrt{(${ntex(x2 - x1)})^2+(${ntex(y2 - y1)})^2} = ${c.T(d)}\\ ${c.U}` },
    { text: "Midpoint:", tex: `M = \\left(\\frac{x_1+x_2}{2},\\frac{y_1+y_2}{2}\\right) = (${c.T(mx)},\\ ${c.T(my)})` },
    { text: "Slope:", tex: vertical ? `m \\text{ undefined (vertical line)}` : `m = \\frac{y_2-y_1}{x_2-x_1} = ${c.T(m)}` }
  ];
  const series = [{ name: "Line", points: [[x1 - dx, y1 - dy], [x2 + dx, y2 + dy]], line: true }, { name: "Two points", points: [[x1, y1], [x2, y2]], marker: "o", line: false }];
  if (x3 !== null) {
    const cross = dx * (y3 - y1) - dy * (x3 - x1);
    const dist = Math.abs(cross) / d;
    const collinear = Math.abs(cross) <= 1e-9 * d * (1 + Math.hypot(x3 - x1, y3 - y1));
    results.push({ label: "Distance of the third point from the line", value: c.L(dist), text: c.L(dist) });
    results.push({ label: "The three points are on one straight line", value: collinear ? "Yes" : "No" });
    steps.push({ text: "Distance of the third point from the line:", tex: `\\delta = \\frac{|(x_2-x_1)(y_3-y_1)-(y_2-y_1)(x_3-x_1)|}{d} = ${c.T(dist)}\\ ${c.U}` });
    series.push({ name: "Third point", points: [[x3, y3]], marker: "x", line: false });
  }
  return {
    results,
    steps,
    series,
    copy: `Distance = ${c.L(d)}, midpoint = ${c.P(mx, my)}, slope = ${slopeText}, equation: ${generalForm(A, B, C)}`
  };
}

function linesMode(input, c) {
  const a1 = num(input, "a1", "Coefficient a1"), b1 = num(input, "b1", "Coefficient b1"), c1 = num(input, "c1", "Right-hand side c1");
  const a2 = num(input, "a2", "Coefficient a2"), b2 = num(input, "b2", "Coefficient b2"), c2 = num(input, "c2", "Right-hand side c2");
  if (a1 === 0 && b1 === 0) fail("The first equation does not represent a line: a1 or b1 must be non-zero.", "a1");
  if (a2 === 0 && b2 === 0) fail("The second equation does not represent a line: a2 or b2 must be non-zero.", "a2");
  const n1 = Math.hypot(a1, b1), n2 = Math.hypot(a2, b2);
  const det = a1 * b2 - a2 * b1;
  const dot = a1 * a2 + b1 * b2;
  const angle = deg(Math.acos(Math.min(1, Math.abs(dot) / (n1 * n2))));
  const parallel = near(det, Math.abs(a1 * b2) + Math.abs(a2 * b1));
  const coincident = parallel && near(a1 * c2 - a2 * c1, Math.abs(a1 * c2) + Math.abs(a2 * c1)) && near(b1 * c2 - b2 * c1, Math.abs(b1 * c2) + Math.abs(b2 * c1));
  const perpendicular = near(dot, n1 * n2);
  const yesNo = (v) => (v ? "Yes" : "No");
  const results = [];
  const series = [];
  const steps = [];
  let inter = null;
  if (!parallel) {
    const x = (c1 * b2 - c2 * b1) / det, y = (a1 * c2 - a2 * c1) / det;
    inter = [x, y];
    results.push({ label: "Intersection point", value: c.P(x, y), text: c.P(x, y) });
    steps.push({ text: "Determinant of the system:", tex: `\\Delta = a_1b_2-a_2b_1 = ${c.T(det)}` });
    steps.push({ text: "Solving the system with Cramer's rule:", tex: `x = \\frac{c_1b_2-c_2b_1}{\\Delta} = ${c.T(x)},\\qquad y = \\frac{a_1c_2-a_2c_1}{\\Delta} = ${c.T(y)}` });
    series.push({ name: "Intersection point", points: [[x, y]], marker: "x", line: false });
  } else {
    results.push({ label: "Intersection point", value: coincident ? "The lines coincide (all points are shared)" : "No intersection point (parallel)" });
    steps.push({ text: "The determinant is zero, so the lines are parallel or coincide.", tex: `\\Delta = ${c.T(det)}` });
  }
  results.push({ label: "Parallel", value: yesNo(parallel) });
  results.push({ label: "Perpendicular", value: yesNo(perpendicular && !parallel) });
  results.push({ label: "Acute angle between the lines", value: `${fmt(angle, 6)}°` });
  const L = 3;
  series.unshift({ name: "First line", points: linePoints(a1, b1, c1, L, inter), line: true });
  series.splice(1, 0, { name: "Second line", points: linePoints(a2, b2, c2, L, inter), line: true });
  return {
    results,
    steps,
    series,
    copy: parallel
      ? (coincident ? "The lines coincide" : "The lines are parallel and do not intersect")
      : `Intersection point = ${c.P(inter[0], inter[1])}, acute angle = ${fmt(angle, 6)}°${perpendicular ? ", the lines are perpendicular" : ""}`
  };
}

export function solve(input) {
  const unit = str(input, "unit", "Length unit", { default: "cm" });
  const mode = choice(input, "mode", "Mode", ["points", "lines"], "points");
  const c = ctxOf(unit);
  const r = mode === "lines" ? linesMode(input, c) : pointsMode(input, c);
  const blocks = [{ type: "plot", title: mode === "lines" ? "The lines and their intersection point" : "The line between the two points", xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series: r.series }];
  return { results: r.results, steps: r.steps, blocks, copy: r.copy };
}
