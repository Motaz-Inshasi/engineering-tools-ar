import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const FNS = [["sin", "sin"], ["cos", "cos"], ["tan", "tan"]];

export const meta = {
  description: "Compute all six trigonometric functions of any angle in degrees or radians, with exact values for special angles, the quadrant, the reference angle and the unit circle point, or find the angle from a function value with the general solution.",
  keywords: ["trigonometry", "unit circle", "sin", "cos", "tan", "sine", "cosine", "tangent", "reference angle", "radian", "degree", "trigonometry"],
  formulas: [
    { label: "Unit circle and conversion", tex: "(\\cos\\theta, \\sin\\theta),\\qquad \\theta_{rad} = \\theta^\\circ \\cdot \\frac{\\pi}{180}" },
    { label: "Basic identities", tex: "\\sin^2\\theta + \\cos^2\\theta = 1,\\quad \\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}" }
  ],
  inputs: [
    { id: "mode", label: "Required", type: "select", default: "angle", options: [["angle", "Function values for an angle"], ["inverse", "Angle from a function value"]] },
    { id: "theta", label: "Angle", type: "number", default: "150", when: { mode: ["angle"] }, help: "You can enter an expression such as pi/6 when radians is selected." },
    { id: "unit", label: "Unit", type: "select", default: "deg", options: [["deg", "degree"], ["rad", "radian"]], when: { mode: ["angle"] } },
    { id: "fn", label: "Function", type: "select", default: "sin", options: FNS, when: { mode: ["inverse"] } },
    { id: "val", label: "Function value", type: "number", default: "0.5", when: { mode: ["inverse"] } }
  ],
  example: { values: { mode: "angle", theta: "150", unit: "deg" }, expect: ["sin = 1/2", "cos = -√3/2"], note: "Example: the angle 150° is in the second quadrant and its reference angle is 30°." },
  invalid: { values: { mode: "inverse", fn: "sin", val: "2" } },
  related: ["complex-numbers", "phasor", "function-plotter"]
};

const S3 = Math.sqrt(3), S2 = Math.SQRT2;
const EXACT_SIN = { 0: ["0", "0"], 15: ["\\frac{\\sqrt{6}-\\sqrt{2}}{4}", "(√6-√2)/4"], 30: ["\\frac{1}{2}", "1/2"], 45: ["\\frac{\\sqrt{2}}{2}", "√2/2"], 60: ["\\frac{\\sqrt{3}}{2}", "√3/2"], 75: ["\\frac{\\sqrt{6}+\\sqrt{2}}{4}", "(√6+√2)/4"], 90: ["1", "1"] };
const EXACT_TAN = { 0: ["0", "0"], 15: ["2-\\sqrt{3}", "2-√3"], 30: ["\\frac{\\sqrt{3}}{3}", "√3/3"], 45: ["1", "1"], 60: ["\\sqrt{3}", "√3"], 75: ["2+\\sqrt{3}", "2+√3"] };
const RECIP = { "0": null, "1/2": ["2", "2"], "√2/2": ["\\sqrt{2}", "√2"], "√3/2": ["\\frac{2\\sqrt{3}}{3}", "2√3/3"], "1": ["1", "1"], "(√6-√2)/4": ["\\sqrt{6}+\\sqrt{2}", "√6+√2"], "(√6+√2)/4": ["\\sqrt{6}-\\sqrt{2}", "√6-√2"], "√3/3": ["\\sqrt{3}", "√3"], "√3": ["\\frac{\\sqrt{3}}{3}", "√3/3"], "2-√3": ["2+\\sqrt{3}", "2+√3"], "2+√3": ["2-\\sqrt{3}", "2-√3"] };

function norm360(d) {
  let r = d % 360;
  if (r < 0) r += 360;
  if (Math.abs(r - 360) < 1e-9) r = 0;
  return r;
}

function signed(sign, pair) {
  if (!pair) return null;
  if (pair[1] === "0") return ["0", "0"];
  return sign < 0 ? [`-${pair[0]}`, `-${pair[1]}`] : pair;
}

export function exactValues(degIn) {
  const d = norm360(degIn);
  const r = Math.round(d);
  if (Math.abs(d - r) > 1e-9 || r % 15 !== 0) return null;
  const quad = r % 90 === 0 ? 0 : Math.floor(r / 90) + 1;
  const ref = r <= 90 ? r : r <= 180 ? 180 - r : r <= 270 ? r - 180 : 360 - r;
  const sSign = r > 180 && r < 360 ? -1 : 1;
  const cSign = r > 90 && r < 270 ? -1 : 1;
  const sin = signed(sSign, EXACT_SIN[ref]);
  const cos = signed(cSign, EXACT_SIN[90 - ref]);
  let tan = null;
  if (ref !== 90) tan = signed(sSign * cSign, EXACT_TAN[ref]);
  const inv = (p) => {
    if (!p || p[1] === "0") return null;
    const neg = p[1].startsWith("-");
    const base = RECIP[neg ? p[1].slice(1) : p[1]];
    return base ? signed(neg ? -1 : 1, base) : null;
  };
  return { sin, cos, tan, csc: inv(sin), sec: inv(cos), cot: tan ? (tan[1] === "0" ? null : inv(tan)) : ["0", "0"], quad, ref };
}

export function solve(input) {
  const mode = choice(input, "mode", "Required", ["angle", "inverse"], "angle");
  if (mode === "inverse") return inverse(input);
  const unit = choice(input, "unit", "Unit", ["deg", "rad"], "deg");
  const t = num(input, "theta", "Angle");
  const degv = unit === "deg" ? t : (t * 180) / Math.PI;
  const radv = unit === "rad" ? t : (t * Math.PI) / 180;
  if (Math.abs(degv) > 1e9) fail("The angle is too large.", "theta");
  const d = norm360(degv);
  const ex = exactValues(degv);
  const sn = Math.sin(radv), cs = Math.cos(radv);
  const snap = (x) => (Math.abs(x) < 1e-12 ? 0 : x);
  const vals = { sin: snap(sn), cos: snap(cs) };
  vals.tan = Math.abs(cs) < 1e-12 ? NaN : snap(sn / cs);
  vals.cot = Math.abs(sn) < 1e-12 ? NaN : snap(cs / sn);
  vals.sec = Math.abs(cs) < 1e-12 ? NaN : 1 / cs;
  vals.csc = Math.abs(sn) < 1e-12 ? NaN : 1 / sn;
  const quadName = d === 0 || d === 90 || d === 180 || d === 270 ? "on an axis" : `${["first", "second", "third", "fourth"][Math.floor(d / 90)]} quadrant`;
  const ref = d <= 90 ? d : d <= 180 ? 180 - d : d <= 270 ? d - 180 : 360 - d;
  const steps = [
    { text: "Convert between degrees and radians:", tex: `\\theta = ${ntex(degv, 10)}^\\circ = ${ntex(radv, 10)}\\ \\text{rad}` },
    `We reduce the angle to the range $[0^\\circ, 360^\\circ)$: ${fmt(d, 10)}°, and it lies ${quadName}.`,
    `Reference angle (smallest angle with the horizontal axis) = ${fmt(ref, 10)}°.`,
    "Signs of the functions: in the first quadrant all are positive; in the second, sin is positive; in the third, tan is positive; in the fourth, cos is positive.",
    { text: "Unit circle point:", tex: `(\\cos\\theta, \\sin\\theta) = (${ntex(vals.cos, 8)},\\; ${ntex(vals.sin, 8)})` }
  ];
  const results = [];
  const copy = [];
  for (const k of ["sin", "cos", "tan", "cot", "sec", "csc"]) {
    const exact = ex && ex[k];
    const v = vals[k];
    if (Number.isNaN(v)) {
      results.push({ label: k, value: "Undefined" });
      copy.push(`${k} = undefined`);
    } else if (exact) {
      results.push({ label: k, tex: `${exact[0]} \\approx ${ntex(v, 8)}`, text: `${k} = ${exact[1]}` });
      copy.push(`${k} = ${exact[1]} ≈ ${fmt(v, 8)}`);
    } else {
      results.push({ label: k, value: v, sig: 10 });
      copy.push(`${k} = ${fmt(v, 10)}`);
    }
  }
  if (ex) steps.push("The angle is a multiple of 15°, so we give the exact values with roots.");
  const circle = [];
  for (let i = 0; i <= 120; i++) circle.push([Math.cos((i * Math.PI) / 60), Math.sin((i * Math.PI) / 60)]);
  return {
    results, steps, copy: copy.join("\n"),
    blocks: [{ type: "plot", title: "Angle on the unit circle", xLabel: "cos θ", yLabel: "sin θ", equalAspect: true, xMin: -1.3, xMax: 1.3, yMin: -1.3, yMax: 1.3, series: [{ name: "unit circle", points: circle }, { name: "θ", points: [[0, 0], [vals.cos, vals.sin]], marker: "o", line: true }] }]
  };
}

function inverse(input) {
  const f = choice(input, "fn", "Function", ["sin", "cos", "tan"], "sin");
  const v = num(input, "val", "Function value");
  if ((f === "sin" || f === "cos") && Math.abs(v) > 1) fail(`The value of ${f} must be between -1 and 1.`, "val");
  const p = f === "sin" ? Math.asin(v) : f === "cos" ? Math.acos(v) : Math.atan(v);
  const pd = (p * 180) / Math.PI;
  const steps = [{ text: "Principal value from the inverse function:", tex: `\\theta_0 = \\operatorname{arc${f}}(${ntex(v)}) = ${ntex(pd, 10)}^\\circ = ${ntex(p, 10)}\\ \\text{rad}` }];
  let sols, general;
  if (f === "sin") {
    sols = [pd, 180 - pd];
    general = `\\theta = ${ntex(pd, 8)}^\\circ + 360^\\circ k \\;\\text{or}\\; \\theta = ${ntex(180 - pd, 8)}^\\circ + 360^\\circ k`;
    steps.push("Sine has two solutions per cycle: $\\theta_0$ and $180^\\circ - \\theta_0$.");
  } else if (f === "cos") {
    sols = [pd, -pd];
    general = `\\theta = \\pm ${ntex(pd, 8)}^\\circ + 360^\\circ k`;
    steps.push("Cosine has two symmetric solutions: $\\pm\\theta_0$.");
  } else {
    sols = [pd, pd + 180];
    general = `\\theta = ${ntex(pd, 8)}^\\circ + 180^\\circ k`;
    steps.push("Tangent is periodic every $180^\\circ$.");
  }
  const inRange = [...new Set(sols.map((s) => Number(norm360(s).toFixed(10))))].sort((a, b) => a - b);
  steps.push({ text: "General solution (k is an integer):", tex: general });
  return {
    results: [
      { label: "Principal value", value: pd, unit: "°", sig: 10 },
      { label: "In radians", value: p, unit: "rad", sig: 10 },
      { label: "Solutions in [0°, 360°)", value: inRange.map((s) => `${fmt(s, 10)}°`).join("، ") },
      { label: "General solution", tex: general, text: general }
    ],
    steps, copy: `θ = ${inRange.map((s) => `${fmt(s, 10)}°`).join(", ")}`
  };
}
