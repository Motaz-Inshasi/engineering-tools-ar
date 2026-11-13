import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const TAU = 2 * Math.PI;

const blank = { mode: "", unit: "cm", r: "", theta: "", x1: "", y1: "", x2: "", y2: "", x3: "", y3: "", D: "", E: "", F: "" };

export const meta = {
  description: "احسب عناصر الدائرة من نصف قطرها وزاويتها المركزية، مثل المحيط والقوس والوتر والقطاع والقطعة والسهم، أو أوجد مركز الدائرة ونصف قطرها من ثلاث نقاط تقع عليها، أو من معادلتها العامة x²+y²+Dx+Ey+F=0.",
  keywords: ["دائرة", "قوس", "وتر", "قطاع", "قطعة", "سهم", "مركز الدائرة", "الدائرة المارة بثلاث نقاط", "معادلة الدائرة", "circle", "arc", "chord"],
  formulas: [
    { label: "القوس والوتر والسهم", tex: "L = r\\theta,\\qquad c = 2r\\sin\\frac{\\theta}{2},\\qquad h = r\\left(1-\\cos\\frac{\\theta}{2}\\right)" },
    { label: "مساحة القطاع والقطعة", tex: "A_{\\text{sector}} = \\frac{r^2\\theta}{2},\\qquad A_{\\text{segment}} = \\frac{r^2}{2}(\\theta-\\sin\\theta)" },
    { label: "المعادلة العامة", tex: "x^2+y^2+Dx+Ey+F=0 \\Rightarrow \\left(-\\tfrac{D}{2},-\\tfrac{E}{2}\\right),\\quad r=\\sqrt{\\tfrac{D^2}{4}+\\tfrac{E^2}{4}-F}" }
  ],
  inputs: [
    { id: "mode", label: "الوضع", type: "select", default: "central", options: [["central", "نصف القطر والزاوية المركزية"], ["three", "ثلاث نقاط تقع على الدائرة"], ["equation", "معادلة الدائرة العامة"]] },
    { id: "unit", label: "وحدة الطول", type: "text", default: "cm" },
    { id: "r", label: "نصف القطر r", type: "number", default: "2", when: { mode: ["central"] } },
    { id: "theta", label: "الزاوية المركزية θ (بالدرجات)", type: "number", default: "90", when: { mode: ["central"] }, help: "من 0 (exclusive) إلى 360 درجة." },
    { id: "x1", label: "النقطة الأولى x1", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "y1", label: "النقطة الأولى y1", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "x2", label: "النقطة الثانية x2", type: "number", default: "4", when: { mode: ["three"] } },
    { id: "y2", label: "النقطة الثانية y2", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "x3", label: "النقطة الثالثة x3", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "y3", label: "النقطة الثالثة y3", type: "number", default: "3", when: { mode: ["three"] } },
    { id: "D", label: "المعامل D (معامل x)", type: "number", default: "-4", when: { mode: ["equation"] } },
    { id: "E", label: "المعامل E (معامل y)", type: "number", default: "6", when: { mode: ["equation"] } },
    { id: "F", label: "الحد الثابت F", type: "number", default: "-3", when: { mode: ["equation"] } }
  ],
  example: { values: { ...blank, mode: "three", unit: "cm", x1: "0", y1: "0", x2: "4", y2: "0", x3: "0", y3: "3" }, expect: ["(2, 1.5) cm", "2.5 cm"], note: "مثال: الدائرة المارة بالنقاط (0,0) و(4,0) و(0,3) مركزها (2, 1.5) ونصف قطرها 2.5." },
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
  const r = num(input, "r", "نصف القطر r", { positive: true });
  const deg = num(input, "theta", "الزاوية المركزية θ", { positive: true, max: 360 });
  const th = (deg * Math.PI) / 180;
  const circ = TAU * r, area = Math.PI * r * r, arc = r * th;
  const chord = clean(2 * r * Math.sin(th / 2));
  const sector = (r * r * th) / 2;
  const segment = (r * r) / 2 * (th - Math.sin(th));
  const sagitta = clean(r * (1 - Math.cos(th / 2)));
  return {
    results: [
      { label: "المحيط", value: c.L(circ), text: c.L(circ) },
      { label: "المساحة", value: c.A(area), text: c.A(area) },
      { label: "طول القوس", value: c.L(arc) },
      { label: "طول الوتر", value: c.L(chord) },
      { label: "مساحة القطاع", value: c.A(sector) },
      { label: "مساحة القطعة", value: c.A(segment) },
      { label: "السهم", value: c.L(sagitta) }
    ],
    steps: [
      { text: "الزاوية بالراديان:", tex: `\\theta = \\frac{${c.T(deg)}\\pi}{180} = ${c.T(th)}` },
      { text: "المحيط والمساحة:", tex: `C = 2\\pi r = ${c.T(circ)}\\ ${c.U},\\qquad A = \\pi r^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "طول القوس:", tex: `L = r\\theta = ${c.T(arc)}\\ ${c.U}` },
      { text: "طول الوتر:", tex: `c = 2r\\sin\\frac{\\theta}{2} = ${c.T(chord)}\\ ${c.U}` },
      { text: "مساحة القطاع:", tex: `A_s = \\frac{r^2\\theta}{2} = ${c.T(sector)}\\ ${c.U}^2` },
      { text: "مساحة القطعة:", tex: `A_g = \\frac{r^2}{2}(\\theta-\\sin\\theta) = ${c.T(segment)}\\ ${c.U}^2` },
      { text: "السهم:", tex: `h = r\\left(1-\\cos\\frac{\\theta}{2}\\right) = ${c.T(sagitta)}\\ ${c.U}` }
    ],
    series: [
      { name: "الدائرة", points: circlePts(0, 0, r, 0, TAU, 180), line: true },
      { name: "القطاع", points: [[0, 0], ...circlePts(0, 0, r, 0, th, 90), [0, 0]], line: true }
    ],
    copy: `المحيط = ${c.L(circ)}، المساحة = ${c.A(area)}، طول القوس = ${c.L(arc)}، الوتر = ${c.L(chord)}، مساحة القطاع = ${c.A(sector)}`
  };
}

function fromCenter(cx, cy, r, c, steps, extraSeries = []) {
  const d = 2 * r, circ = TAU * r, area = Math.PI * r * r;
  return {
    results: [
      { label: "مركز الدائرة", value: c.P(cx, cy), text: c.P(cx, cy) },
      { label: "نصف القطر", value: c.L(r), text: c.L(r) },
      { label: "القطر", value: c.L(d) },
      { label: "المحيط", value: c.L(circ), text: c.L(circ) },
      { label: "المساحة", value: c.A(area), text: c.A(area) }
    ],
    steps,
    series: [{ name: "الدائرة", points: circlePts(cx, cy, r, 0, TAU, 180), line: true }, { name: "المركز", points: [[cx, cy]], marker: "x", line: false }, ...extraSeries],
    copy: `المركز = ${c.P(cx, cy)}، نصف القطر = ${c.L(r)}، المحيط = ${c.L(circ)}، المساحة = ${c.A(area)}`
  };
}

function threePoints(input, c) {
  const x1 = num(input, "x1", "x1"), y1 = num(input, "y1", "y1");
  const x2 = num(input, "x2", "x2"), y2 = num(input, "y2", "y2");
  const x3 = num(input, "x3", "x3"), y3 = num(input, "y3", "y3");
  const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
  const scale = 1 + Math.max(x1 * x1 + y1 * y1, x2 * x2 + y2 * y2, x3 * x3 + y3 * y3);
  if (Math.abs(D) <= 1e-12 * scale) fail("النقاط الثلاث على استقامة واحدة (أو متطابقة)، فلا توجد دائرة تمر بها.", "x3");
  const s1 = x1 * x1 + y1 * y1, s2 = x2 * x2 + y2 * y2, s3 = x3 * x3 + y3 * y3;
  const cx = (s1 * (y2 - y3) + s2 * (y3 - y1) + s3 * (y1 - y2)) / D;
  const cy = (s1 * (x3 - x2) + s2 * (x1 - x3) + s3 * (x2 - x1)) / D;
  const r = Math.hypot(x1 - cx, y1 - cy);
  const steps = [
    { text: "مركز الدائرة (الدائرة المارة بالنقاط الثلاث):", tex: `C = (${c.T(cx)},\\ ${c.T(cy)})` },
    { text: "نصف القطر (المسافة من المركز إلى النقطة الأولى):", tex: `r = \\sqrt{(x_1-C_x)^2+(y_1-C_y)^2} = ${c.T(r)}\\ ${c.U}` }
  ];
  return fromCenter(cx, cy, r, c, steps, [{ name: "النقاط", points: [[x1, y1], [x2, y2], [x3, y3]], marker: "o", line: false }]);
}

function equation(input, c) {
  const D = num(input, "D", "المعامل D");
  const E = num(input, "E", "المعامل E");
  const F = num(input, "F", "الحد الثابت F");
  const cx = -D / 2, cy = -E / 2;
  const r2 = (D * D) / 4 + (E * E) / 4 - F;
  if (!(r2 > 0)) fail("المعادلة لا تمثل دائرة حقيقية: يجب أن يكون D²/4 + E²/4 − F أكبر من صفر.", "F");
  const r = Math.sqrt(r2);
  const steps = [
    { text: "إكمال المربع يعطي المركز:", tex: `C = \\left(-\\frac{${c.T(D)}}{2},\\ -\\frac{${c.T(E)}}{2}\\right) = (${c.T(cx)},\\ ${c.T(cy)})` },
    { text: "نصف القطر:", tex: `r^2 = \\frac{D^2}{4}+\\frac{E^2}{4}-F = ${c.T(r2)} \\Rightarrow r = ${c.T(r)}\\ ${c.U}` }
  ];
  return fromCenter(cx, cy, r, c, steps);
}

export function solve(input) {
  const unit = str(input, "unit", "وحدة الطول", { default: "cm" });
  const mode = choice(input, "mode", "الوضع", ["central", "three", "equation"], "central");
  const c = ctxOf(unit);
  const r = mode === "three" ? threePoints(input, c) : mode === "equation" ? equation(input, c) : central(input, c);
  const blocks = [{ type: "plot", title: "الدائرة", xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series: r.series }];
  return { results: r.results, steps: r.steps, blocks, copy: r.copy };
}
