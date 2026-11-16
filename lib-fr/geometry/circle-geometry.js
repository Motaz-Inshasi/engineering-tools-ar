import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const TAU = 2 * Math.PI;

const blank = { mode: "", unit: "cm", r: "", theta: "", x1: "", y1: "", x2: "", y2: "", x3: "", y3: "", D: "", E: "", F: "" };

export const meta = {
  description: "Calculez les éléments d'un cercle à partir de son rayon et de son angle au centre (périmètre, arc, corde, secteur, segment et flèche), ou déterminez le centre et le rayon d'un cercle passant par trois points, ou à partir de son équation générale x²+y²+Dx+Ey+F=0.",
  keywords: ["cercle", "arc", "corde", "secteur", "segment", "flèche", "centre du cercle", "Cercle passant par trois points", "Équation du cercle", "circle", "arc", "chord"],
  formulas: [
    { label: "Arc, corde et flèche", tex: "L = r\\theta,\\qquad c = 2r\\sin\\frac{\\theta}{2},\\qquad h = r\\left(1-\\cos\\frac{\\theta}{2}\\right)" },
    { label: "Aire du secteur et du segment", tex: "A_{\\text{sector}} = \\frac{r^2\\theta}{2},\\qquad A_{\\text{segment}} = \\frac{r^2}{2}(\\theta-\\sin\\theta)" },
    { label: "Équation générale", tex: "x^2+y^2+Dx+Ey+F=0 \\Rightarrow \\left(-\\tfrac{D}{2},-\\tfrac{E}{2}\\right),\\quad r=\\sqrt{\\tfrac{D^2}{4}+\\tfrac{E^2}{4}-F}" }
  ],
  inputs: [
    { id: "mode", label: "Mode", type: "select", default: "central", options: [["central", "Rayon et angle au centre"], ["three", "Trois points situés sur le cercle"], ["equation", "Équation générale du cercle"]] },
    { id: "unit", label: "Unité de longueur", type: "text", default: "cm" },
    { id: "r", label: "Rayon r", type: "number", default: "2", when: { mode: ["central"] } },
    { id: "theta", label: "Angle au centre θ (en degrés)", type: "number", default: "90", when: { mode: ["central"] }, help: "De 0 (exclu) à 360 degrés." },
    { id: "x1", label: "Premier point x1", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "y1", label: "Premier point y1", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "x2", label: "Deuxième point x2", type: "number", default: "4", when: { mode: ["three"] } },
    { id: "y2", label: "Deuxième point y2", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "x3", label: "Troisième point x3", type: "number", default: "0", when: { mode: ["three"] } },
    { id: "y3", label: "Troisième point y3", type: "number", default: "3", when: { mode: ["three"] } },
    { id: "D", label: "Coefficient D (coefficient de x)", type: "number", default: "-4", when: { mode: ["equation"] } },
    { id: "E", label: "Coefficient E (coefficient de y)", type: "number", default: "6", when: { mode: ["equation"] } },
    { id: "F", label: "Terme constant F", type: "number", default: "-3", when: { mode: ["equation"] } }
  ],
  example: { values: { ...blank, mode: "three", unit: "cm", x1: "0", y1: "0", x2: "4", y2: "0", x3: "0", y3: "3" }, expect: ["(2, 1.5) cm", "2.5 cm"], note: "Exemple : le cercle passant par les points (0,0), (4,0) et (0,3) a pour centre (2 ; 1.5) et pour rayon 2.5." },
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
  const r = num(input, "r", "Rayon r", { positive: true });
  const deg = num(input, "theta", "Angle au centre θ", { positive: true, max: 360 });
  const th = (deg * Math.PI) / 180;
  const circ = TAU * r, area = Math.PI * r * r, arc = r * th;
  const chord = clean(2 * r * Math.sin(th / 2));
  const sector = (r * r * th) / 2;
  const segment = (r * r) / 2 * (th - Math.sin(th));
  const sagitta = clean(r * (1 - Math.cos(th / 2)));
  return {
    results: [
      { label: "Périmètre", value: c.L(circ), text: c.L(circ) },
      { label: "Aire", value: c.A(area), text: c.A(area) },
      { label: "Longueur de l'arc", value: c.L(arc) },
      { label: "Longueur de la corde", value: c.L(chord) },
      { label: "Aire du secteur", value: c.A(sector) },
      { label: "Aire du segment", value: c.A(segment) },
      { label: "Flèche", value: c.L(sagitta) }
    ],
    steps: [
      { text: "Angle en radians :", tex: `\\theta = \\frac{${c.T(deg)}\\pi}{180} = ${c.T(th)}` },
      { text: "Périmètre et aire :", tex: `C = 2\\pi r = ${c.T(circ)}\\ ${c.U},\\qquad A = \\pi r^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Longueur de l'arc :", tex: `L = r\\theta = ${c.T(arc)}\\ ${c.U}` },
      { text: "Longueur de la corde :", tex: `c = 2r\\sin\\frac{\\theta}{2} = ${c.T(chord)}\\ ${c.U}` },
      { text: "Aire du secteur :", tex: `A_s = \\frac{r^2\\theta}{2} = ${c.T(sector)}\\ ${c.U}^2` },
      { text: "Aire du segment :", tex: `A_g = \\frac{r^2}{2}(\\theta-\\sin\\theta) = ${c.T(segment)}\\ ${c.U}^2` },
      { text: "Flèche :", tex: `h = r\\left(1-\\cos\\frac{\\theta}{2}\\right) = ${c.T(sagitta)}\\ ${c.U}` }
    ],
    series: [
      { name: "Cercle", points: circlePts(0, 0, r, 0, TAU, 180), line: true },
      { name: "Secteur", points: [[0, 0], ...circlePts(0, 0, r, 0, th, 90), [0, 0]], line: true }
    ],
    copy: `Périmètre = ${c.L(circ)}, aire = ${c.A(area)}, longueur de l'arc = ${c.L(arc)}, corde = ${c.L(chord)}, aire du secteur = ${c.A(sector)}`
  };
}

function fromCenter(cx, cy, r, c, steps, extraSeries = []) {
  const d = 2 * r, circ = TAU * r, area = Math.PI * r * r;
  return {
    results: [
      { label: "centre du cercle", value: c.P(cx, cy), text: c.P(cx, cy) },
      { label: "Rayon", value: c.L(r), text: c.L(r) },
      { label: "Diamètre", value: c.L(d) },
      { label: "Périmètre", value: c.L(circ), text: c.L(circ) },
      { label: "Aire", value: c.A(area), text: c.A(area) }
    ],
    steps,
    series: [{ name: "Cercle", points: circlePts(cx, cy, r, 0, TAU, 180), line: true }, { name: "Centre", points: [[cx, cy]], marker: "x", line: false }, ...extraSeries],
    copy: `Centre = ${c.P(cx, cy)}, rayon = ${c.L(r)}, périmètre = ${c.L(circ)}, aire = ${c.A(area)}`
  };
}

function threePoints(input, c) {
  const x1 = num(input, "x1", "x1"), y1 = num(input, "y1", "y1");
  const x2 = num(input, "x2", "x2"), y2 = num(input, "y2", "y2");
  const x3 = num(input, "x3", "x3"), y3 = num(input, "y3", "y3");
  const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
  const scale = 1 + Math.max(x1 * x1 + y1 * y1, x2 * x2 + y2 * y2, x3 * x3 + y3 * y3);
  if (Math.abs(D) <= 1e-12 * scale) fail("Les trois points sont alignés (ou confondus) : aucun cercle ne passe par eux.", "x3");
  const s1 = x1 * x1 + y1 * y1, s2 = x2 * x2 + y2 * y2, s3 = x3 * x3 + y3 * y3;
  const cx = (s1 * (y2 - y3) + s2 * (y3 - y1) + s3 * (y1 - y2)) / D;
  const cy = (s1 * (x3 - x2) + s2 * (x1 - x3) + s3 * (x2 - x1)) / D;
  const r = Math.hypot(x1 - cx, y1 - cy);
  const steps = [
    { text: "Centre du cercle (cercle passant par les trois points) :", tex: `C = (${c.T(cx)},\\ ${c.T(cy)})` },
    { text: "Rayon (distance du centre au premier point) :", tex: `r = \\sqrt{(x_1-C_x)^2+(y_1-C_y)^2} = ${c.T(r)}\\ ${c.U}` }
  ];
  return fromCenter(cx, cy, r, c, steps, [{ name: "Points", points: [[x1, y1], [x2, y2], [x3, y3]], marker: "o", line: false }]);
}

function equation(input, c) {
  const D = num(input, "D", "Coefficient D");
  const E = num(input, "E", "Coefficient E");
  const F = num(input, "F", "Terme constant F");
  const cx = -D / 2, cy = -E / 2;
  const r2 = (D * D) / 4 + (E * E) / 4 - F;
  if (!(r2 > 0)) fail("L'équation ne représente pas un cercle réel : il faut que D²/4 + E²/4 − F soit supérieur à zéro.", "F");
  const r = Math.sqrt(r2);
  const steps = [
    { text: "Le complètement du carré donne le centre :", tex: `C = \\left(-\\frac{${c.T(D)}}{2},\\ -\\frac{${c.T(E)}}{2}\\right) = (${c.T(cx)},\\ ${c.T(cy)})` },
    { text: "Rayon :", tex: `r^2 = \\frac{D^2}{4}+\\frac{E^2}{4}-F = ${c.T(r2)} \\Rightarrow r = ${c.T(r)}\\ ${c.U}` }
  ];
  return fromCenter(cx, cy, r, c, steps);
}

export function solve(input) {
  const unit = str(input, "unit", "Unité de longueur", { default: "cm" });
  const mode = choice(input, "mode", "Mode", ["central", "three", "equation"], "central");
  const c = ctxOf(unit);
  const r = mode === "three" ? threePoints(input, c) : mode === "equation" ? equation(input, c) : central(input, c);
  const blocks = [{ type: "plot", title: "Cercle", xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series: r.series }];
  return { results: r.results, steps: r.steps, blocks, copy: r.copy };
}
