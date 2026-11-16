import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const TAU = 2 * Math.PI;

const blank = { mode: "", unit: "cm", r: "", theta: "", x1: "", y1: "", x2: "", y2: "", x3: "", y3: "", D: "", E: "", F: "" };

export const meta = {
  description: "Calcule los elementos de un círculo a partir de su radio y su ángulo central, como el perímetro, el arco, la cuerda, el sector, el segmento y la flecha; o halle el centro y el radio a partir de tres puntos de la circunferencia o de su ecuación general x²+y²+Dx+Ey+F=0.",
  keywords: ["Círculo", "Arco", "Cuerda", "Sector", "Segmento", "Flecha", "Centro del círculo", "Círculo que pasa por tres puntos", "Ecuación de la circunferencia", "circle", "arc", "chord"],
  formulas: [
    { label: "Arco, cuerda y flecha", tex: "L = r\\theta,\\qquad c = 2r\\sin\\frac{\\theta}{2},\\qquad h = r\\left(1-\\cos\\frac{\\theta}{2}\\right)" },
    { label: "Área del sector y del segmento", tex: "A_{\\text{sector}} = \\frac{r^2\\theta}{2},\\qquad A_{\\text{segment}} = \\frac{r^2}{2}(\\theta-\\sin\\theta)" },
    { label: "Ecuación general", tex: "x^2+y^2+Dx+Ey+F=0 \\Rightarrow \\left(-\\tfrac{D}{2},-\\tfrac{E}{2}\\right),\\quad r=\\sqrt{\\tfrac{D^2}{4}+\\tfrac{E^2}{4}-F}" }
  ],
  inputs: [
    { id: "mode", label: "Modo", type: "select", default: "central", options: [["central", "Radio y ángulo central"], ["three", "Tres puntos sobre la circunferencia"], ["equation", "Ecuación general de la circunferencia"]] },
    { id: "unit", label: "Unidad de longitud", type: "text", default: "cm" },
    { id: "r", label: "Radio r", type: "number", default: "2", when: { mode: ["central"] } },
    { id: "theta", label: "Ángulo central θ (en grados)", type: "number", default: "90", when: { mode: ["central"] }, help: "De 0 (excluido) a 360 grados." },
    { id: "x1", label: "Primer punto x1", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "y1", label: "Primer punto y1", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "x2", label: "Segundo punto x2", type: "number", default: "4", when: { mode: ["three"] } },
    { id: "y2", label: "Segundo punto y2", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "x3", label: "Tercer punto x3", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "y3", label: "Tercer punto y3", type: "number", default: "3", when: { mode: ["three"] } },
    { id: "D", label: "Coeficiente D (de x)", type: "number", default: "-4", when: { mode: ["equation"] } },
    { id: "E", label: "Coeficiente E (de y)", type: "number", default: "6", when: { mode: ["equation"] } },
    { id: "F", label: "Término independiente F", type: "number", default: "-3", when: { mode: ["equation"] } }
  ],
  example: { values: { ...blank, mode: "three", unit: "cm", x1: "0", y1: "0", x2: "4", y2: "0", x3: "0", y3: "3" }, expect: ["(2, 1.5) cm", "2.5 cm"], note: "Ejemplo: la circunferencia que pasa por (0,0), (4,0) y (0,3) tiene centro (2, 1.5) y radio 2.5." },
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
  const r = num(input, "r", "Radio r", { positive: true });
  const deg = num(input, "theta", "Ángulo central θ", { positive: true, max: 360 });
  const th = (deg * Math.PI) / 180;
  const circ = TAU * r, area = Math.PI * r * r, arc = r * th;
  const chord = clean(2 * r * Math.sin(th / 2));
  const sector = (r * r * th) / 2;
  const segment = (r * r) / 2 * (th - Math.sin(th));
  const sagitta = clean(r * (1 - Math.cos(th / 2)));
  return {
    results: [
      { label: "Perímetro", value: c.L(circ), text: c.L(circ) },
      { label: "Área", value: c.A(area), text: c.A(area) },
      { label: "Longitud del arco", value: c.L(arc) },
      { label: "Longitud de la cuerda", value: c.L(chord) },
      { label: "Área del sector", value: c.A(sector) },
      { label: "Área del segmento", value: c.A(segment) },
      { label: "Flecha", value: c.L(sagitta) }
    ],
    steps: [
      { text: "Ángulo en radianes:", tex: `\\theta = \\frac{${c.T(deg)}\\pi}{180} = ${c.T(th)}` },
      { text: "Perímetro y área:", tex: `C = 2\\pi r = ${c.T(circ)}\\ ${c.U},\\qquad A = \\pi r^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Longitud del arco:", tex: `L = r\\theta = ${c.T(arc)}\\ ${c.U}` },
      { text: "Longitud de la cuerda:", tex: `c = 2r\\sin\\frac{\\theta}{2} = ${c.T(chord)}\\ ${c.U}` },
      { text: "Área del sector:", tex: `A_s = \\frac{r^2\\theta}{2} = ${c.T(sector)}\\ ${c.U}^2` },
      { text: "Área del segmento:", tex: `A_g = \\frac{r^2}{2}(\\theta-\\sin\\theta) = ${c.T(segment)}\\ ${c.U}^2` },
      { text: "Flecha:", tex: `h = r\\left(1-\\cos\\frac{\\theta}{2}\\right) = ${c.T(sagitta)}\\ ${c.U}` }
    ],
    series: [
      { name: "Círculo", points: circlePts(0, 0, r, 0, TAU, 180), line: true },
      { name: "Sector", points: [[0, 0], ...circlePts(0, 0, r, 0, th, 90), [0, 0]], line: true }
    ],
    copy: `Perímetro = ${c.L(circ)}, área = ${c.A(area)}, longitud del arco = ${c.L(arc)}, cuerda = ${c.L(chord)}, área del sector = ${c.A(sector)}`
  };
}

function fromCenter(cx, cy, r, c, steps, extraSeries = []) {
  const d = 2 * r, circ = TAU * r, area = Math.PI * r * r;
  return {
    results: [
      { label: "Centro del círculo", value: c.P(cx, cy), text: c.P(cx, cy) },
      { label: "Radio", value: c.L(r), text: c.L(r) },
      { label: "Diámetro", value: c.L(d) },
      { label: "Perímetro", value: c.L(circ), text: c.L(circ) },
      { label: "Área", value: c.A(area), text: c.A(area) }
    ],
    steps,
    series: [{ name: "Círculo", points: circlePts(cx, cy, r, 0, TAU, 180), line: true }, { name: "Centro", points: [[cx, cy]], marker: "x", line: false }, ...extraSeries],
    copy: `Centro = ${c.P(cx, cy)}, radio = ${c.L(r)}, perímetro = ${c.L(circ)}, área = ${c.A(area)}`
  };
}

function threePoints(input, c) {
  const x1 = num(input, "x1", "x1"), y1 = num(input, "y1", "y1");
  const x2 = num(input, "x2", "x2"), y2 = num(input, "y2", "y2");
  const x3 = num(input, "x3", "x3"), y3 = num(input, "y3", "y3");
  const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
  const scale = 1 + Math.max(x1 * x1 + y1 * y1, x2 * x2 + y2 * y2, x3 * x3 + y3 * y3);
  if (Math.abs(D) <= 1e-12 * scale) fail("Los tres puntos están alineados (o coinciden), por lo que no existe ninguna circunferencia que pase por ellos.", "x3");
  const s1 = x1 * x1 + y1 * y1, s2 = x2 * x2 + y2 * y2, s3 = x3 * x3 + y3 * y3;
  const cx = (s1 * (y2 - y3) + s2 * (y3 - y1) + s3 * (y1 - y2)) / D;
  const cy = (s1 * (x3 - x2) + s2 * (x1 - x3) + s3 * (x2 - x1)) / D;
  const r = Math.hypot(x1 - cx, y1 - cy);
  const steps = [
    { text: "Centro del círculo (círculo que pasa por los tres puntos):", tex: `C = (${c.T(cx)},\\ ${c.T(cy)})` },
    { text: "Radio (distancia del centro al primer punto):", tex: `r = \\sqrt{(x_1-C_x)^2+(y_1-C_y)^2} = ${c.T(r)}\\ ${c.U}` }
  ];
  return fromCenter(cx, cy, r, c, steps, [{ name: "Puntos", points: [[x1, y1], [x2, y2], [x3, y3]], marker: "o", line: false }]);
}

function equation(input, c) {
  const D = num(input, "D", "Coeficiente D");
  const E = num(input, "E", "Coeficiente E");
  const F = num(input, "F", "Término independiente F");
  const cx = -D / 2, cy = -E / 2;
  const r2 = (D * D) / 4 + (E * E) / 4 - F;
  if (!(r2 > 0)) fail("La ecuación no representa una circunferencia real: D²/4 + E²/4 − F debe ser mayor que cero.", "F");
  const r = Math.sqrt(r2);
  const steps = [
    { text: "Completar el cuadrado da el centro:", tex: `C = \\left(-\\frac{${c.T(D)}}{2},\\ -\\frac{${c.T(E)}}{2}\\right) = (${c.T(cx)},\\ ${c.T(cy)})` },
    { text: "Radio:", tex: `r^2 = \\frac{D^2}{4}+\\frac{E^2}{4}-F = ${c.T(r2)} \\Rightarrow r = ${c.T(r)}\\ ${c.U}` }
  ];
  return fromCenter(cx, cy, r, c, steps);
}

export function solve(input) {
  const unit = str(input, "unit", "Unidad de longitud", { default: "cm" });
  const mode = choice(input, "mode", "Modo", ["central", "three", "equation"], "central");
  const c = ctxOf(unit);
  const r = mode === "three" ? threePoints(input, c) : mode === "equation" ? equation(input, c) : central(input, c);
  const blocks = [{ type: "plot", title: "Círculo", xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series: r.series }];
  return { results: r.results, steps: r.steps, blocks, copy: r.copy };
}
