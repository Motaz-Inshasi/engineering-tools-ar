import { fail, str } from "../core/validate.js";
import { fmt, parseNumber, tex as ntex } from "../core/format.js";

function orient(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function crosses(a, b, c, d) {
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function selfIntersects(pts) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (crosses(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return true;
    }
  }
  return false;
}

export const meta = {
  description: "Calculate the area, perimeter and centroid of a polygon from its vertex coordinates using the shoelace formula, determine the vertex orientation, warn if the edges cross, and draw the polygon.",
  keywords: ["polygon area", "shoelace formula", "shoelace", "centroid", "perimeter", "polygon area", "coordinates"],
  formulas: [
    { label: "Area (shoelace formula)", tex: "A = \\frac{1}{2}\\left|\\sum_{i}(x_i y_{i+1} - x_{i+1} y_i)\\right|" },
    { label: "Centroid", tex: "C_x = \\frac{\\sum (x_i + x_{i+1})c_i}{3S},\\quad C_y = \\frac{\\sum (y_i + y_{i+1})c_i}{3S}" }
  ],
  inputs: [
    { id: "verts", label: "Polygon vertices (x y)", type: "textarea", rows: 5, placeholder: "0 0\n4 0\n4 3\n0 3", help: "One vertex per line in the form: x y or x, y. Vertices must be listed in order around the polygon." },
    { id: "unit", label: "Length unit", type: "text", default: "m" }
  ],
  example: { values: { verts: "0 0\n4 0\n4 3\n0 3", unit: "m" }, expect: ["12 m²", "14 m", "(2, 1.5)"], note: "Example: a 4 × 3 m rectangle." },
  invalid: { values: { verts: "0 0\n4 0", unit: "m" } },
  related: ["unit-converter", "far-coverage"]
};

export function solve(input) {
  const unit = str(input, "unit", "Length unit", { default: "m" });
  const lines = str(input, "verts", "Polygon vertices").split(/\r?\n/);
  const pts = [];
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t === "") return;
    const parts = t.split(/[\s,،;؛]+/).filter(Boolean);
    if (parts.length !== 2) fail(`Line ${i + 1}: each vertex must contain exactly two coordinates (x y).`, "verts");
    const x = parseNumber(parts[0]), y = parseNumber(parts[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) fail(`Line ${i + 1}: the coordinates must be numbers.`, "verts");
    pts.push({ x, y });
  });
  if (pts.length < 3) fail("Enter at least three vertices.", "verts");
  const n = pts.length;
  let S = 0, cxSum = 0, cySum = 0, perimeter = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const c = a.x * b.y - b.x * a.y;
    S += c;
    cxSum += (a.x + b.x) * c;
    cySum += (a.y + b.y) * c;
    perimeter += Math.hypot(b.x - a.x, b.y - a.y);
  }
  if (Math.abs(S) < 1e-12) fail("The polygon is degenerate: all vertices lie on one line or coincide, so its area is zero.", "verts");
  const area = Math.abs(S) / 2;
  const gx = cxSum / (3 * S), gy = cySum / (3 * S);
  const ccw = S > 0;
  const orientation = ccw ? "Counterclockwise" : "Clockwise";
  const crossing = selfIntersects(pts);
  const closed = [...pts, pts[0]].map((p) => [p.x, p.y]);
  const blocks = [
    { type: "plot", title: "Polygon and its centroid", xLabel: `x (${unit})`, yLabel: `y (${unit})`, series: [{ name: "Polygon", points: closed, marker: "o", line: true }, { name: "Centroid", points: [[gx, gy]], marker: "x", line: false }] }
  ];
  if (crossing) blocks.unshift({ type: "note", tone: "warn", text: "The polygon's edges cross each other, so the computed area does not represent a clear actual area; check the vertex order." });
  const steps = [
    { text: "Sum of shoelace terms (2 × signed area):", tex: `S = \\sum (x_i y_{i+1} - x_{i+1} y_i) = ${ntex(S, 6)}` },
    { text: "Area:", tex: `A = \\frac{|S|}{2} = ${ntex(area, 6)}\\ ${unit}^2` },
    { text: "Perimeter (sum of side lengths):", tex: `P = ${ntex(perimeter, 6)}\\ ${unit}` },
    { text: "Centroid:", tex: `C_x = \\frac{${ntex(cxSum, 6)}}{3S} = ${ntex(gx, 6)},\\quad C_y = \\frac{${ntex(cySum, 6)}}{3S} = ${ntex(gy, 6)}` }
  ];
  return {
    results: [
      { label: "Area", value: `${fmt(area, 6)} ${unit}²`, text: `${fmt(area, 6)} ${unit}²` },
      { label: "Perimeter", value: `${fmt(perimeter, 6)} ${unit}`, text: `${fmt(perimeter, 6)} ${unit}` },
      { label: "Vertex orientation", value: orientation },
      { label: "Centroid", value: `(${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}`, text: `(${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}` },
      { label: "Edge crossing", value: crossing ? "Yes" : "No" }
    ],
    steps,
    blocks,
    copy: `Area = ${fmt(area, 6)} ${unit}², perimeter = ${fmt(perimeter, 6)} ${unit}, centroid = (${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}`,
    values: { area, perimeter, gx, gy, S, ccw, crossing }
  };
}
