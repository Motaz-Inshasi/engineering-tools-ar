import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const TAU = 2 * Math.PI;

const blank = { mode: "", unit: "cm", r: "", theta: "", x1: "", y1: "", x2: "", y2: "", x3: "", y3: "", D: "", E: "", F: "" };

export const meta = {
  description: "عناصر دایره را از شعاع و زاویهٔ مرکزی آن محاسبه کنید، مانند محیط، کمان، وتر، قطاع، قطعه و سهم، یا مرکز و شعاع دایره را از سه نقطهٔ واقع بر آن یا از معادلهٔ کلی x²+y²+Dx+Ey+F=0 بیابید.",
  keywords: ["دایره", "کمان", "وتر", "قطاع", "قطعه", "سهم", "مرکز دایره", "دایرهٔ گذرنده از سه نقطه", "معادلهٔ دایره", "circle", "arc", "chord"],
  formulas: [
    { label: "کمان، وتر و سهم", tex: "L = r\\theta,\\qquad c = 2r\\sin\\frac{\\theta}{2},\\qquad h = r\\left(1-\\cos\\frac{\\theta}{2}\\right)" },
    { label: "مساحت قطاع و قطعه", tex: "A_{\\text{sector}} = \\frac{r^2\\theta}{2},\\qquad A_{\\text{segment}} = \\frac{r^2}{2}(\\theta-\\sin\\theta)" },
    { label: "معادلهٔ کلی", tex: "x^2+y^2+Dx+Ey+F=0 \\Rightarrow \\left(-\\tfrac{D}{2},-\\tfrac{E}{2}\\right),\\quad r=\\sqrt{\\tfrac{D^2}{4}+\\tfrac{E^2}{4}-F}" }
  ],
  inputs: [
    { id: "mode", label: "حالت", type: "select", default: "central", options: [["central", "شعاع و زاویهٔ مرکزی"], ["three", "سه نقطهٔ واقع بر دایره"], ["equation", "معادلهٔ کلی دایره"]] },
    { id: "unit", label: "واحد طول", type: "text", default: "cm" },
    { id: "r", label: "شعاع r", type: "number", default: "2", when: { mode: ["central"] } },
    { id: "theta", label: "زاویهٔ مرکزی θ (بر حسب درجه)", type: "number", default: "90", when: { mode: ["central"] }, help: "بزرگ‌تر از 0 تا 360 درجه." },
    { id: "x1", label: "نقطهٔ اول x1", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "y1", label: "نقطهٔ اول y1", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "x2", label: "نقطهٔ دوم x2", type: "number", default: "4", when: { mode: ["three"] } },
    { id: "y2", label: "نقطهٔ دوم y2", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "x3", label: "نقطهٔ سوم x3", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "y3", label: "نقطهٔ سوم y3", type: "number", default: "3", when: { mode: ["three"] } },
    { id: "D", label: "ضریب D (ضریب x)", type: "number", default: "-4", when: { mode: ["equation"] } },
    { id: "E", label: "ضریب E (ضریب y)", type: "number", default: "6", when: { mode: ["equation"] } },
    { id: "F", label: "جملهٔ ثابت F", type: "number", default: "-3", when: { mode: ["equation"] } }
  ],
  example: { values: { ...blank, mode: "three", unit: "cm", x1: "0", y1: "0", x2: "4", y2: "0", x3: "0", y3: "3" }, expect: ["(2, 1.5) cm", "2.5 cm"], note: "مثال: دایرهٔ گذرنده از نقاط (0,0)، (4,0) و (0,3) مرکزش (2, 1.5) و شعاعش 2.5 است." },
  invalid: { values: { ...blank, mode: "three", unit: "cm", x1: "0", y1: "0", x2: "1", y2: "1", x3: "2", y3: "2" } },
  related: ["plane-shapes", "pythagoras", "solids", "coordinate-geometry", "triangle-solver", "polygon-area", "trigonometry", "unit-converter"]
};

function clean(x) {
  return Math.abs(x) < 1e-12 ? 0 : x;
}

function ctxOf(unit) {
  return {
    L: (x) => `${fmt(x, 6)} ${unit}`,
    A: (x) => `${fmt(x, 6)} ${unit}²`,
    P: (x, y) => `(${fmt(x, 6)}, ${fmt(y, 6)}) ${unit}`,
    T: (x) => ntex(x, 6),
    U: `\\text{${unit}}`
  };
}

function circlePts(cx, cy, r, from, to, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = from + ((to - from) * i) / n;
    pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  return pts;
}

function central(input, c) {
  const r = num(input, "r", "شعاع r", { positive: true });
  const deg = num(input, "theta", "زاویهٔ مرکزی θ", { positive: true, max: 360 });
  const th = (deg * Math.PI) / 180;
  const circ = TAU * r, area = Math.PI * r * r, arc = r * th;
  const chord = clean(2 * r * Math.sin(th / 2));
  const sector = (r * r * th) / 2;
  const segment = (r * r) / 2 * (th - Math.sin(th));
  const sagitta = clean(r * (1 - Math.cos(th / 2)));
  return {
    results: [
      { label: "محیط", value: c.L(circ), text: c.L(circ) },
      { label: "مساحت", value: c.A(area), text: c.A(area) },
      { label: "طول کمان", value: c.L(arc) },
      { label: "طول وتر", value: c.L(chord) },
      { label: "مساحت قطاع", value: c.A(sector) },
      { label: "مساحت قطعه", value: c.A(segment) },
      { label: "سهم", value: c.L(sagitta) }
    ],
    steps: [
      { text: "زاویه بر حسب رادیان:", tex: `\\theta = \\frac{${c.T(deg)}\\pi}{180} = ${c.T(th)}` },
      { text: "محیط و مساحت:", tex: `C = 2\\pi r = ${c.T(circ)}\\ ${c.U},\\qquad A = \\pi r^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "طول کمان:", tex: `L = r\\theta = ${c.T(arc)}\\ ${c.U}` },
      { text: "طول وتر:", tex: `c = 2r\\sin\\frac{\\theta}{2} = ${c.T(chord)}\\ ${c.U}` },
      { text: "مساحت قطاع:", tex: `A_s = \\frac{r^2\\theta}{2} = ${c.T(sector)}\\ ${c.U}^2` },
      { text: "مساحت قطعه:", tex: `A_g = \\frac{r^2}{2}(\\theta-\\sin\\theta) = ${c.T(segment)}\\ ${c.U}^2` },
      { text: "سهم:", tex: `h = r\\left(1-\\cos\\frac{\\theta}{2}\\right) = ${c.T(sagitta)}\\ ${c.U}` }
    ],
    series: [
      { name: "دایره", points: circlePts(0, 0, r, 0, TAU, 180), line: true },
      { name: "قطاع", points: [[0, 0], ...circlePts(0, 0, r, 0, th, 90), [0, 0]], line: true }
    ],
    copy: `محیط = ${c.L(circ)}، مساحت = ${c.A(area)}، طول کمان = ${c.L(arc)}، وتر = ${c.L(chord)}، مساحت قطاع = ${c.A(sector)}`
  };
}

function fromCenter(cx, cy, r, c, steps, extraSeries = []) {
  const d = 2 * r, circ = TAU * r, area = Math.PI * r * r;
  return {
    results: [
      { label: "مرکز دایره", value: c.P(cx, cy), text: c.P(cx, cy) },
      { label: "شعاع", value: c.L(r), text: c.L(r) },
      { label: "قطر", value: c.L(d) },
      { label: "محیط", value: c.L(circ), text: c.L(circ) },
      { label: "مساحت", value: c.A(area), text: c.A(area) }
    ],
    steps,
    series: [{ name: "دایره", points: circlePts(cx, cy, r, 0, TAU, 180), line: true }, { name: "مرکز", points: [[cx, cy]], marker: "x", line: false }, ...extraSeries],
    copy: `مرکز = ${c.P(cx, cy)}، شعاع = ${c.L(r)}، محیط = ${c.L(circ)}، مساحت = ${c.A(area)}`
  };
}

function threePoints(input, c) {
  const x1 = num(input, "x1", "x1"), y1 = num(input, "y1", "y1");
  const x2 = num(input, "x2", "x2"), y2 = num(input, "y2", "y2");
  const x3 = num(input, "x3", "x3"), y3 = num(input, "y3", "y3");
  const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
  const scale = 1 + Math.max(x1 * x1 + y1 * y1, x2 * x2 + y2 * y2, x3 * x3 + y3 * y3);
  if (Math.abs(D) <= 1e-12 * scale) fail("سه نقطه روی یک خط راست هستند (یا بر هم منطبق‌اند)، پس دایره‌ای از آن‌ها نمی‌گذرد.", "x3");
  const s1 = x1 * x1 + y1 * y1, s2 = x2 * x2 + y2 * y2, s3 = x3 * x3 + y3 * y3;
  const cx = (s1 * (y2 - y3) + s2 * (y3 - y1) + s3 * (y1 - y2)) / D;
  const cy = (s1 * (x3 - x2) + s2 * (x1 - x3) + s3 * (x2 - x1)) / D;
  const r = Math.hypot(x1 - cx, y1 - cy);
  const steps = [
    { text: "مرکز دایره (دایرهٔ گذرنده از سه نقطه):", tex: `C = (${c.T(cx)},\\ ${c.T(cy)})` },
    { text: "شعاع (فاصله از مرکز تا نقطهٔ اول):", tex: `r = \\sqrt{(x_1-C_x)^2+(y_1-C_y)^2} = ${c.T(r)}\\ ${c.U}` }
  ];
  return fromCenter(cx, cy, r, c, steps, [{ name: "نقاط", points: [[x1, y1], [x2, y2], [x3, y3]], marker: "o", line: false }]);
}

function equation(input, c) {
  const D = num(input, "D", "ضریب D");
  const E = num(input, "E", "ضریب E");
  const F = num(input, "F", "جملهٔ ثابت F");
  const cx = -D / 2, cy = -E / 2;
  const r2 = (D * D) / 4 + (E * E) / 4 - F;
  if (!(r2 > 0)) fail("این معادله یک دایرهٔ واقعی را نشان نمی‌دهد: باید D²/4 + E²/4 − F بزرگ‌تر از صفر باشد.", "F");
  const r = Math.sqrt(r2);
  const steps = [
    { text: "تکمیل مربع، مرکز را به دست می‌دهد:", tex: `C = \\left(-\\frac{${c.T(D)}}{2},\\ -\\frac{${c.T(E)}}{2}\\right) = (${c.T(cx)},\\ ${c.T(cy)})` },
    { text: "شعاع:", tex: `r^2 = \\frac{D^2}{4}+\\frac{E^2}{4}-F = ${c.T(r2)} \\Rightarrow r = ${c.T(r)}\\ ${c.U}` }
  ];
  return fromCenter(cx, cy, r, c, steps);
}

export function solve(input) {
  const unit = str(input, "unit", "واحد طول", { default: "cm" });
  const mode = choice(input, "mode", "حالت", ["central", "three", "equation"], "central");
  const c = ctxOf(unit);
  const r = mode === "three" ? threePoints(input, c) : mode === "equation" ? equation(input, c) : central(input, c);
  const blocks = [{ type: "plot", title: "دایره", xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series: r.series }];
  return { results: r.results, steps: r.steps, blocks, copy: r.copy };
}
