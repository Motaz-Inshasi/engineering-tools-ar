import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const TAU = 2 * Math.PI;

const blank = { mode: "", unit: "cm", r: "", theta: "", x1: "", y1: "", x2: "", y2: "", x3: "", y3: "", D: "", E: "", F: "" };

export const meta = {
  description: "Hitung unsur lingkaran dari jari-jari dan sudut pusatnya, seperti keliling, busur, tali busur, juring, tembereng, dan panah busur, atau tentukan pusat dan jari-jari lingkaran dari tiga titik yang dilaluinya, atau dari persamaan umumnya x²+y²+Dx+Ey+F=0.",
  keywords: ["lingkaran", "busur", "tali busur", "juring", "tembereng", "panah busur", "pusat lingkaran", "lingkaran yang melalui tiga titik", "persamaan lingkaran", "circle", "arc", "chord"],
  formulas: [
    { label: "Busur, tali busur, dan panah busur", tex: "L = r\\theta,\\qquad c = 2r\\sin\\frac{\\theta}{2},\\qquad h = r\\left(1-\\cos\\frac{\\theta}{2}\\right)" },
    { label: "Luas juring dan tembereng", tex: "A_{\\text{sector}} = \\frac{r^2\\theta}{2},\\qquad A_{\\text{segment}} = \\frac{r^2}{2}(\\theta-\\sin\\theta)" },
    { label: "Persamaan umum", tex: "x^2+y^2+Dx+Ey+F=0 \\Rightarrow \\left(-\\tfrac{D}{2},-\\tfrac{E}{2}\\right),\\quad r=\\sqrt{\\tfrac{D^2}{4}+\\tfrac{E^2}{4}-F}" }
  ],
  inputs: [
    { id: "mode", label: "Mode", type: "select", default: "central", options: [["central", "Jari-jari dan sudut pusat"], ["three", "Tiga titik pada lingkaran"], ["equation", "Persamaan umum lingkaran"]] },
    { id: "unit", label: "Satuan panjang", type: "text", default: "cm" },
    { id: "r", label: "Jari-jari r", type: "number", default: "2", when: { mode: ["central"] } },
    { id: "theta", label: "Sudut pusat θ (dalam derajat)", type: "number", default: "90", when: { mode: ["central"] }, help: "Dari 0 (tidak termasuk) hingga 360 derajat." },
    { id: "x1", label: "Titik pertama x1", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "y1", label: "Titik pertama y1", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "x2", label: "Titik kedua x2", type: "number", default: "4", when: { mode: ["three"] } },
    { id: "y2", label: "Titik kedua y2", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "x3", label: "Titik ketiga x3", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "y3", label: "Titik ketiga y3", type: "number", default: "3", when: { mode: ["three"] } },
    { id: "D", label: "Koefisien D (koefisien x)", type: "number", default: "-4", when: { mode: ["equation"] } },
    { id: "E", label: "Koefisien E (koefisien y)", type: "number", default: "6", when: { mode: ["equation"] } },
    { id: "F", label: "Suku konstanta F", type: "number", default: "-3", when: { mode: ["equation"] } }
  ],
  example: { values: { ...blank, mode: "three", unit: "cm", x1: "0", y1: "0", x2: "4", y2: "0", x3: "0", y3: "3" }, expect: ["(2, 1.5) cm", "2.5 cm"], note: "Contoh: lingkaran yang melalui titik (0,0), (4,0), dan (0,3) berpusat di (2, 1.5) dengan jari-jari 2.5." },
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
  const r = num(input, "r", "Jari-jari r", { positive: true });
  const deg = num(input, "theta", "Sudut pusat θ", { positive: true, max: 360 });
  const th = (deg * Math.PI) / 180;
  const circ = TAU * r, area = Math.PI * r * r, arc = r * th;
  const chord = clean(2 * r * Math.sin(th / 2));
  const sector = (r * r * th) / 2;
  const segment = (r * r) / 2 * (th - Math.sin(th));
  const sagitta = clean(r * (1 - Math.cos(th / 2)));
  return {
    results: [
      { label: "Keliling", value: c.L(circ), text: c.L(circ) },
      { label: "Luas", value: c.A(area), text: c.A(area) },
      { label: "Panjang busur", value: c.L(arc) },
      { label: "Panjang tali busur", value: c.L(chord) },
      { label: "Luas juring", value: c.A(sector) },
      { label: "Luas tembereng", value: c.A(segment) },
      { label: "Panah busur", value: c.L(sagitta) }
    ],
    steps: [
      { text: "Sudut dalam radian:", tex: `\\theta = \\frac{${c.T(deg)}\\pi}{180} = ${c.T(th)}` },
      { text: "Keliling dan luas:", tex: `C = 2\\pi r = ${c.T(circ)}\\ ${c.U},\\qquad A = \\pi r^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Panjang busur:", tex: `L = r\\theta = ${c.T(arc)}\\ ${c.U}` },
      { text: "Panjang tali busur:", tex: `c = 2r\\sin\\frac{\\theta}{2} = ${c.T(chord)}\\ ${c.U}` },
      { text: "Luas juring:", tex: `A_s = \\frac{r^2\\theta}{2} = ${c.T(sector)}\\ ${c.U}^2` },
      { text: "Luas tembereng:", tex: `A_g = \\frac{r^2}{2}(\\theta-\\sin\\theta) = ${c.T(segment)}\\ ${c.U}^2` },
      { text: "Panah busur:", tex: `h = r\\left(1-\\cos\\frac{\\theta}{2}\\right) = ${c.T(sagitta)}\\ ${c.U}` }
    ],
    series: [
      { name: "Lingkaran", points: circlePts(0, 0, r, 0, TAU, 180), line: true },
      { name: "Juring", points: [[0, 0], ...circlePts(0, 0, r, 0, th, 90), [0, 0]], line: true }
    ],
    copy: `Keliling = ${c.L(circ)}, luas = ${c.A(area)}, panjang busur = ${c.L(arc)}, tali busur = ${c.L(chord)}, luas juring = ${c.A(sector)}`
  };
}

function fromCenter(cx, cy, r, c, steps, extraSeries = []) {
  const d = 2 * r, circ = TAU * r, area = Math.PI * r * r;
  return {
    results: [
      { label: "pusat lingkaran", value: c.P(cx, cy), text: c.P(cx, cy) },
      { label: "Jari-jari", value: c.L(r), text: c.L(r) },
      { label: "Diameter", value: c.L(d) },
      { label: "Keliling", value: c.L(circ), text: c.L(circ) },
      { label: "Luas", value: c.A(area), text: c.A(area) }
    ],
    steps,
    series: [{ name: "Lingkaran", points: circlePts(cx, cy, r, 0, TAU, 180), line: true }, { name: "Pusat", points: [[cx, cy]], marker: "x", line: false }, ...extraSeries],
    copy: `Pusat = ${c.P(cx, cy)}, jari-jari = ${c.L(r)}, keliling = ${c.L(circ)}, luas = ${c.A(area)}`
  };
}

function threePoints(input, c) {
  const x1 = num(input, "x1", "x1"), y1 = num(input, "y1", "y1");
  const x2 = num(input, "x2", "x2"), y2 = num(input, "y2", "y2");
  const x3 = num(input, "x3", "x3"), y3 = num(input, "y3", "y3");
  const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
  const scale = 1 + Math.max(x1 * x1 + y1 * y1, x2 * x2 + y2 * y2, x3 * x3 + y3 * y3);
  if (Math.abs(D) <= 1e-12 * scale) fail("Ketiga titik segaris (atau berimpit), sehingga tidak ada lingkaran yang melaluinya.", "x3");
  const s1 = x1 * x1 + y1 * y1, s2 = x2 * x2 + y2 * y2, s3 = x3 * x3 + y3 * y3;
  const cx = (s1 * (y2 - y3) + s2 * (y3 - y1) + s3 * (y1 - y2)) / D;
  const cy = (s1 * (x3 - x2) + s2 * (x1 - x3) + s3 * (x2 - x1)) / D;
  const r = Math.hypot(x1 - cx, y1 - cy);
  const steps = [
    { text: "Pusat lingkaran (lingkaran yang melalui ketiga titik):", tex: `C = (${c.T(cx)},\\ ${c.T(cy)})` },
    { text: "Jari-jari (jarak dari pusat ke titik pertama):", tex: `r = \\sqrt{(x_1-C_x)^2+(y_1-C_y)^2} = ${c.T(r)}\\ ${c.U}` }
  ];
  return fromCenter(cx, cy, r, c, steps, [{ name: "Titik", points: [[x1, y1], [x2, y2], [x3, y3]], marker: "o", line: false }]);
}

function equation(input, c) {
  const D = num(input, "D", "Koefisien D");
  const E = num(input, "E", "Koefisien E");
  const F = num(input, "F", "Suku konstanta F");
  const cx = -D / 2, cy = -E / 2;
  const r2 = (D * D) / 4 + (E * E) / 4 - F;
  if (!(r2 > 0)) fail("Persamaan ini bukan lingkaran nyata: D²/4 + E²/4 − F harus lebih besar dari nol.", "F");
  const r = Math.sqrt(r2);
  const steps = [
    { text: "Melengkapi kuadrat memberikan pusat:", tex: `C = \\left(-\\frac{${c.T(D)}}{2},\\ -\\frac{${c.T(E)}}{2}\\right) = (${c.T(cx)},\\ ${c.T(cy)})` },
    { text: "Jari-jari:", tex: `r^2 = \\frac{D^2}{4}+\\frac{E^2}{4}-F = ${c.T(r2)} \\Rightarrow r = ${c.T(r)}\\ ${c.U}` }
  ];
  return fromCenter(cx, cy, r, c, steps);
}

export function solve(input) {
  const unit = str(input, "unit", "Satuan panjang", { default: "cm" });
  const mode = choice(input, "mode", "Mode", ["central", "three", "equation"], "central");
  const c = ctxOf(unit);
  const r = mode === "three" ? threePoints(input, c) : mode === "equation" ? equation(input, c) : central(input, c);
  const blocks = [{ type: "plot", title: "Lingkaran", xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series: r.series }];
  return { results: r.results, steps: r.steps, blocks, copy: r.copy };
}
