import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, deg, tex as ntex } from "../core/format.js";

const TAU = 2 * Math.PI;

const SHAPE_LABELS = {
  square: "carré",
  rectangle: "rectangle",
  triangle: "triangle",
  "right-triangle": "triangle rectangle",
  circle: "cercle",
  ellipse: "ellipse",
  trapezoid: "trapèze",
  parallelogram: "parallélogramme",
  rhombus: "losange",
  "regular-polygon": "polygone régulier",
  sector: "secteur circulaire"
};

const blank = {
  shape: "", unit: "cm", s: "", rl: "", rw: "", tmode: "", tb: "", th: "", ta: "", tc: "", t1: "", t2: "", t3: "",
  ra: "", rb: "", cmode: "", cval: "", ea: "", eb: "", pa: "", pb: "", ph: "", pl1: "", pl2: "", qb: "", qs: "", qh: "",
  d1: "", d2: "", npoly: "", ns: "", sr: "", sang: ""
};

export const meta = {
  description: "Calculez l'aire et le périmètre des figures planes courantes, comme le carré, le rectangle, le triangle, le cercle, l'ellipse, le trapèze, le losange, le polygone régulier et le secteur circulaire, avec des propriétés supplémentaires et un tracé du schéma.",
  keywords: ["Aire", "Périmètre", "rectangle", "triangle", "cercle", "trapèze", "losange", "polygone régulier", "secteur circulaire", "area", "perimeter", "plane shapes"],
  formulas: [
    { label: "Aire du rectangle", tex: "A = LW" },
    { label: "Aire du triangle", tex: "A = \\frac{1}{2}bh" },
    { label: "Aire du cercle", tex: "A = \\pi r^2" },
    { label: "Aire du polygone régulier", tex: "A = \\frac{n s^2}{4\\tan(\\pi/n)}" }
  ],
  inputs: [
    { id: "shape", label: "Forme", type: "select", default: "rectangle", options: [["square", "carré"], ["rectangle", "rectangle"], ["triangle", "triangle"], ["right-triangle", "triangle rectangle"], ["circle", "cercle"], ["ellipse", "ellipse"], ["trapezoid", "trapèze"], ["parallelogram", "parallélogramme"], ["rhombus", "losange"], ["regular-polygon", "polygone régulier"], ["sector", "secteur circulaire"]] },
    { id: "unit", label: "Unité de longueur", type: "text", default: "cm", help: "L'unité ne sert qu'à l'affichage ; l'aire est exprimée en unité carrée." },
    { id: "s", label: "Longueur du côté s", type: "number", default: "5", when: { shape: ["square"] } },
    { id: "rl", label: "Longueur L", type: "number", default: "8", when: { shape: ["rectangle"] } },
    { id: "rw", label: "Largeur W", type: "number", default: "5", when: { shape: ["rectangle"] } },
    { id: "tmode", label: "Données du triangle", type: "select", default: "bh", options: [["bh", "Base et hauteur"], ["sss", "Trois côtés"]], when: { shape: ["triangle"] } },
    { id: "tb", label: "Base b", type: "number", default: "10", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "th", label: "Hauteur h", type: "number", default: "4", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "ta", label: "Côté gauche (facultatif)", type: "number", when: { shape: ["triangle"], tmode: ["bh"] }, help: "Saisissez les deux côtés facultatifs ensemble pour calculer le périmètre." },
    { id: "tc", label: "Côté droit (facultatif)", type: "number", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "t1", label: "Premier côté a", type: "number", default: "3", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "t2", label: "Deuxième côté b", type: "number", default: "4", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "t3", label: "Troisième côté c", type: "number", default: "5", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "ra", label: "Premier côté de l'angle droit a", type: "number", default: "3", when: { shape: ["right-triangle"] } },
    { id: "rb", label: "Second côté de l'angle droit b", type: "number", default: "4", when: { shape: ["right-triangle"] } },
    { id: "cmode", label: "Donnée", type: "select", default: "radius", options: [["radius", "Rayon"], ["diameter", "Diamètre"]], when: { shape: ["circle"] } },
    { id: "cval", label: "Valeur", type: "number", default: "1", when: { shape: ["circle"] }, help: "Rayon ou diamètre selon le choix ci-dessus." },
    { id: "ea", label: "Demi-axe horizontal a", type: "number", default: "5", when: { shape: ["ellipse"] } },
    { id: "eb", label: "Demi-axe vertical b", type: "number", default: "3", when: { shape: ["ellipse"] } },
    { id: "pa", label: "Petite base a", type: "number", default: "4", when: { shape: ["trapezoid"] } },
    { id: "pb", label: "Grande base b", type: "number", default: "10", when: { shape: ["trapezoid"] } },
    { id: "ph", label: "Hauteur h", type: "number", default: "3", when: { shape: ["trapezoid"] } },
    { id: "pl1", label: "Premier côté latéral (facultatif)", type: "number", when: { shape: ["trapezoid"] } },
    { id: "pl2", label: "Second côté latéral (facultatif)", type: "number", when: { shape: ["trapezoid"] }, help: "Saisissez les deux côtés latéraux ensemble pour calculer le périmètre." },
    { id: "qb", label: "Base b", type: "number", default: "10", when: { shape: ["parallelogram"] } },
    { id: "qs", label: "Côté oblique s", type: "number", default: "6", when: { shape: ["parallelogram"] } },
    { id: "qh", label: "Hauteur h", type: "number", default: "4", when: { shape: ["parallelogram"] }, help: "La hauteur est perpendiculaire à la base et ne dépasse pas le côté oblique." },
    { id: "d1", label: "Première diagonale d1", type: "number", default: "6", when: { shape: ["rhombus"] } },
    { id: "d2", label: "Deuxième diagonale d2", type: "number", default: "8", when: { shape: ["rhombus"] } },
    { id: "npoly", label: "Nombre de côtés n", type: "number", default: "6", when: { shape: ["regular-polygon"] } },
    { id: "ns", label: "Longueur du côté s", type: "number", default: "2", when: { shape: ["regular-polygon"] } },
    { id: "sr", label: "Rayon r", type: "number", default: "2", when: { shape: ["sector"] } },
    { id: "sang", label: "Angle θ (en degrés)", type: "number", default: "90", when: { shape: ["sector"] }, help: "De 0 à 360 degrés." }
  ],
  example: { values: { ...blank, shape: "rectangle", unit: "cm", rl: "8", rw: "5" }, expect: ["40 cm²", "26 cm"], note: "Exemple : rectangle de longueur 8 cm et de largeur 5 cm." },
  invalid: { values: { ...blank, shape: "square", unit: "cm", s: "0" } },
  related: ["solids", "pythagoras", "circle-geometry", "coordinate-geometry", "triangle-solver", "polygon-area", "trigonometry", "unit-converter"]
};

function ctxOf(unit) {
  return {
    T: (x) => ntex(x, 6),
    L: (x) => `${fmt(x, 6)} ${unit}`,
    A: (x) => `${fmt(x, 6)} ${unit}²`,
    U: `\\text{${unit}}`
  };
}

function arcPoints(r, from, to, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = from + ((to - from) * i) / n;
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  return pts;
}

function square(input, c) {
  const s = num(input, "s", "Longueur du côté", { positive: true });
  const area = s * s, perimeter = 4 * s, d = s * Math.SQRT2;
  return {
    area, perimeter,
    extras: [["Longueur du diamètre", c.L(d)]],
    steps: [
      { text: "Aire :", tex: `A = s^2 = ${c.T(s)}^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Périmètre :", tex: `P = 4s = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Longueur du diamètre :", tex: `d = s\\sqrt{2} = ${c.T(d)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [s, 0], [s, s], [0, s]]
  };
}

function rectangle(input, c) {
  const L = num(input, "rl", "Longueur L", { positive: true });
  const W = num(input, "rw", "Largeur W", { positive: true });
  const area = L * W, perimeter = 2 * (L + W), d = Math.hypot(L, W);
  return {
    area, perimeter,
    extras: [["Longueur du diamètre", c.L(d)]],
    steps: [
      { text: "Aire :", tex: `A = LW = ${c.T(L)} \\times ${c.T(W)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Périmètre :", tex: `P = 2(L+W) = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Longueur du diamètre :", tex: `d = \\sqrt{L^2+W^2} = ${c.T(d)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [L, 0], [L, W], [0, W]]
  };
}

function triangleBaseHeight(input, c) {
  const b = num(input, "tb", "Base b", { positive: true });
  const h = num(input, "th", "Hauteur h", { positive: true });
  const ta = num(input, "ta", "Côté gauche", { positive: true, optional: true });
  const tc = num(input, "tc", "Côté droit", { positive: true, optional: true });
  const area = (b * h) / 2;
  let x = b / 2, perimeter = null;
  const steps = [{ text: "Aire :", tex: `A = \\frac{bh}{2} = \\frac{${c.T(b)} \\times ${c.T(h)}}{2} = ${c.T(area)}\\ ${c.U}^2` }];
  if (ta !== null || tc !== null) {
    if (ta === null || tc === null) fail("Saisissez les deux côtés facultatifs ensemble pour calculer le périmètre, ou laissez-les vides.", ta === null ? "ta" : "tc");
    if (ta + tc <= b || Math.abs(ta - tc) >= b) fail("Les côtés saisis ne forment pas de triangle avec cette base.", "ta");
    const s = (b + ta + tc) / 2;
    const heron = Math.sqrt(s * (s - b) * (s - ta) * (s - tc));
    if (Math.abs((2 * heron) / b - h) > 1e-6 * h) fail("La hauteur h ne correspond pas aux côtés saisis.", "th");
    x = (b * b + ta * ta - tc * tc) / (2 * b);
    perimeter = b + ta + tc;
    steps.push({ text: "Périmètre :", tex: `P = b + a + c = ${c.T(perimeter)}\\ ${c.U}` });
  }
  return {
    area, perimeter, extras: [], steps,
    outline: [[0, 0], [b, 0], [x, h]]
  };
}

function triangleSides(input, c) {
  const a = num(input, "t1", "Premier côté a", { positive: true });
  const b = num(input, "t2", "Deuxième côté b", { positive: true });
  const k = num(input, "t3", "Troisième côté c", { positive: true });
  if (a + b <= k || a + k <= b || b + k <= a) fail("Les trois côtés ne forment pas un triangle : la somme de deux côtés quelconques doit être supérieure au troisième.", "t3");
  const s = (a + b + k) / 2;
  const area = Math.sqrt(s * (s - a) * (s - b) * (s - k));
  const perimeter = a + b + k;
  const clampCos = (v) => Math.min(1, Math.max(-1, v));
  const angA = deg(Math.acos(clampCos((b * b + k * k - a * a) / (2 * b * k))));
  const angB = deg(Math.acos(clampCos((a * a + k * k - b * b) / (2 * a * k))));
  const angC = 180 - angA - angB;
  const ha = (2 * area) / a, hb = (2 * area) / b, hc = (2 * area) / k;
  const x = (a * a + k * k - b * b) / (2 * a), y = Math.sqrt(k * k - x * x);
  return {
    area, perimeter,
    extras: [
      ["Hauteurs (sur a, b, c)", `${c.L(ha)}، ${c.L(hb)}، ${c.L(hc)}`],
      ["Angles (en degrés)", `${fmt(angA, 4)}°، ${fmt(angB, 4)}°، ${fmt(angC, 4)}°`]
    ],
    steps: [
      { text: "Demi-périmètre :", tex: `s = \\frac{a+b+c}{2} = ${c.T(s)}` },
      { text: "Aire de Héron :", tex: `A = \\sqrt{s(s-a)(s-b)(s-c)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Périmètre :", tex: `P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Angle opposé à a par la loi des cosinus :", tex: `\\cos A = \\frac{b^2+c^2-a^2}{2bc} \\Rightarrow A = ${fmt(angA, 4)}^\\circ` }
    ],
    outline: [[0, 0], [a, 0], [x, y]]
  };
}

function rightTriangle(input, c) {
  const a = num(input, "ra", "Premier côté de l'angle droit a", { positive: true });
  const b = num(input, "rb", "Second côté de l'angle droit b", { positive: true });
  const hyp = Math.hypot(a, b);
  const area = (a * b) / 2, perimeter = a + b + hyp, alt = (a * b) / hyp;
  const angA = deg(Math.atan(b / a)), angB = 90 - angA;
  return {
    area, perimeter,
    extras: [
      ["Hypoténuse", c.L(hyp)],
      ["Hauteur relative à l'hypoténuse", c.L(alt)],
      ["Les deux angles aigus", `${fmt(angA, 4)}° et ${fmt(angB, 4)}°`]
    ],
    steps: [
      { text: "Aire :", tex: `A = \\frac{ab}{2} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Hypoténuse (Pythagore) :", tex: `c = \\sqrt{a^2+b^2} = ${c.T(hyp)}\\ ${c.U}` },
      { text: "Périmètre :", tex: `P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Hauteur relative à l'hypoténuse :", tex: `h = \\frac{ab}{c} = ${c.T(alt)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [a, 0], [0, b]]
  };
}

function circle(input, c) {
  const mode = choice(input, "cmode", "Donnée", ["radius", "diameter"], "radius");
  const v = num(input, "cval", "Valeur", { positive: true });
  const r = mode === "diameter" ? v / 2 : v;
  const area = Math.PI * r * r, perimeter = TAU * r;
  return {
    area, perimeter,
    extras: [["Rayon", c.L(r)], ["Diamètre", c.L(2 * r)]],
    steps: [
      { text: "Rayon :", tex: `r = ${c.T(r)}\\ ${c.U}` },
      { text: "Aire :", tex: `A = \\pi r^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Périmètre :", tex: `P = 2\\pi r = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: arcPoints(r, 0, TAU, 180),
    extra: [{ name: "Centre", points: [[0, 0]], marker: "x", line: false }]
  };
}

function ellipse(input, c) {
  const a = num(input, "ea", "Demi-axe horizontal a", { positive: true });
  const b = num(input, "eb", "Demi-axe vertical b", { positive: true });
  const area = Math.PI * a * b;
  const perimeter = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  const outline = [];
  for (let i = 0; i <= 180; i++) {
    const t = (TAU * i) / 180;
    outline.push([a * Math.cos(t), b * Math.sin(t)]);
  }
  return {
    area, perimeter,
    extras: [["Grand axe", c.L(2 * Math.max(a, b))], ["Petit axe", c.L(2 * Math.min(a, b))]],
    steps: [
      { text: "Aire :", tex: `A = \\pi ab = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Périmètre (approximation de Ramanujan II) :", tex: `P \\approx \\pi\\left[3(a+b)-\\sqrt{(3a+b)(a+3b)}\\right] = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline
  };
}

function trapezoid(input, c) {
  const a = num(input, "pa", "Petite base a", { positive: true });
  const b = num(input, "pb", "Grande base b", { positive: true });
  const h = num(input, "ph", "Hauteur h", { positive: true });
  const l1 = num(input, "pl1", "Premier côté latéral", { positive: true, optional: true });
  const l2 = num(input, "pl2", "Second côté latéral", { positive: true, optional: true });
  if ((l1 === null) !== (l2 === null)) fail("Saisissez les deux côtés latéraux ensemble pour calculer le périmètre, ou laissez-les vides.", l1 === null ? "pl1" : "pl2");
  const area = ((a + b) / 2) * h;
  const d = b - a;
  let p = d / 2, perimeter = null;
  if (l1 !== null) {
    if (l1 < h || l2 < h) fail("La longueur d'un côté latéral ne peut pas être inférieure à la hauteur.", l1 < h ? "pl1" : "pl2");
    const p1 = Math.sqrt(l1 * l1 - h * h);
    const fits = [p1, -p1].filter((q) => Math.abs((d - q) * (d - q) + h * h - l2 * l2) <= 1e-6 * l2 * l2);
    if (fits.length === 0) fail("Les côtés saisis ne forment pas un trapèze avec ces deux bases et cette hauteur.", "pl2");
    p = fits[0];
    perimeter = a + b + l1 + l2;
  }
  return {
    area, perimeter,
    extras: [["Base moyenne", c.L((a + b) / 2)]],
    steps: [
      { text: "Aire :", tex: `A = \\frac{(a+b)h}{2} = \\frac{(${c.T(a)}+${c.T(b)}) \\times ${c.T(h)}}{2} = ${c.T(area)}\\ ${c.U}^2` },
      ...(perimeter === null ? [] : [{ text: "Périmètre :", tex: `P = a+b+c_1+c_2 = ${c.T(perimeter)}\\ ${c.U}` }])
    ],
    outline: [[0, 0], [b, 0], [p + a, h], [p, h]]
  };
}

function parallelogram(input, c) {
  const b = num(input, "qb", "Base b", { positive: true });
  const s = num(input, "qs", "Côté oblique s", { positive: true });
  const h = num(input, "qh", "Hauteur h", { positive: true });
  if (h > s) fail("La hauteur ne peut pas dépasser le côté oblique.", "qh");
  const area = b * h, perimeter = 2 * (b + s), x = Math.sqrt(s * s - h * h);
  const d1 = Math.hypot(b + x, h), d2 = Math.hypot(b - x, h);
  return {
    area, perimeter,
    extras: [["Grande diagonale", c.L(Math.max(d1, d2))], ["Petite diagonale", c.L(Math.min(d1, d2))]],
    steps: [
      { text: "Aire :", tex: `A = bh = ${c.T(b)} \\times ${c.T(h)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Périmètre :", tex: `P = 2(b+s) = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Décalage horizontal du côté oblique :", tex: `x = \\sqrt{s^2-h^2} = ${c.T(x)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [b, 0], [b + x, h], [x, h]]
  };
}

function rhombus(input, c) {
  const d1 = num(input, "d1", "Première diagonale d1", { positive: true });
  const d2 = num(input, "d2", "Deuxième diagonale d2", { positive: true });
  const area = (d1 * d2) / 2, side = Math.hypot(d1 / 2, d2 / 2), perimeter = 4 * side;
  return {
    area, perimeter,
    extras: [["Longueur du côté", c.L(side)]],
    steps: [
      { text: "Aire à partir des diagonales :", tex: `A = \\frac{d_1 d_2}{2} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Côté (Pythagore sur les demi-diagonales) :", tex: `s = \\sqrt{(d_1/2)^2+(d_2/2)^2} = ${c.T(side)}\\ ${c.U}` },
      { text: "Périmètre :", tex: `P = 4s = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: [[d1 / 2, 0], [0, d2 / 2], [-d1 / 2, 0], [0, -d2 / 2]]
  };
}

function regularPolygon(input, c) {
  const n = num(input, "npoly", "Nombre de côtés n", { integer: true, min: 3, max: 10000 });
  const s = num(input, "ns", "Longueur du côté s", { positive: true });
  const t = Math.PI / n;
  const area = (n * s * s) / (4 * Math.tan(t)), perimeter = n * s;
  const apothem = s / (2 * Math.tan(t)), R = s / (2 * Math.sin(t)), interior = ((n - 2) * 180) / n;
  const outline = [];
  for (let k = 0; k < n; k++) outline.push([R * Math.cos((TAU * k) / n), R * Math.sin((TAU * k) / n)]);
  return {
    area, perimeter,
    extras: [
      ["Rayon du cercle inscrit (apothème)", c.L(apothem)],
      ["Rayon du cercle circonscrit", c.L(R)],
      ["Angle intérieur (degrés)", `${fmt(interior, 6)}°`]
    ],
    steps: [
      { text: "Aire :", tex: `A = \\frac{n s^2}{4\\tan(\\pi/n)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Périmètre :", tex: `P = ns = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Rayon du cercle inscrit :", tex: `a = \\frac{s}{2\\tan(\\pi/n)} = ${c.T(apothem)}\\ ${c.U}` },
      { text: "Rayon du cercle circonscrit :", tex: `R = \\frac{s}{2\\sin(\\pi/n)} = ${c.T(R)}\\ ${c.U}` }
    ],
    outline
  };
}

function sector(input, c) {
  const r = num(input, "sr", "Rayon r", { positive: true });
  const deg0 = num(input, "sang", "Angle θ", { positive: true, max: 360 });
  const th = (deg0 * Math.PI) / 180;
  const area = (r * r * th) / 2, arc = r * th, perimeter = 2 * r + arc;
  return {
    area, perimeter,
    extras: [["Longueur de l'arc", c.L(arc)], ["Angle en radians", `${fmt(th, 6)}`]],
    steps: [
      { text: "Angle en radians :", tex: `\\theta = \\frac{${c.T(deg0)}\\pi}{180} = ${c.T(th)}` },
      { text: "Aire :", tex: `A = \\frac{1}{2}r^2\\theta = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Longueur de l'arc :", tex: `L = r\\theta = ${c.T(arc)}\\ ${c.U}` },
      { text: "Périmètre (deux rayons et un arc) :", tex: `P = 2r + r\\theta = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: [[0, 0], ...arcPoints(r, 0, th, 90)]
  };
}

function triangle(input, c) {
  const mode = choice(input, "tmode", "Données du triangle", ["bh", "sss"], "bh");
  return mode === "sss" ? triangleSides(input, c) : triangleBaseHeight(input, c);
}

const FN = {
  square,
  rectangle,
  triangle,
  "right-triangle": rightTriangle,
  circle,
  ellipse,
  trapezoid,
  parallelogram,
  rhombus,
  "regular-polygon": regularPolygon,
  sector
};

function closed(pts) {
  return [...pts, pts[0]];
}

export function solve(input) {
  const unit = str(input, "unit", "Unité de longueur", { default: "cm" });
  const shape = choice(input, "shape", "Forme", Object.keys(SHAPE_LABELS), "rectangle");
  const c = ctxOf(unit);
  const r = FN[shape](input, c);
  const name = SHAPE_LABELS[shape];
  const results = [{ label: "Aire", value: c.A(r.area), text: c.A(r.area) }];
  const parts = [`Aire = ${c.A(r.area)}`];
  if (r.perimeter !== null) {
    results.push({ label: "Périmètre", value: c.L(r.perimeter), text: c.L(r.perimeter) });
    parts.push(`Périmètre = ${c.L(r.perimeter)}`);
  }
  for (const [label, value] of r.extras) results.push({ label, value });
  const series = [{ name, points: closed(r.outline), ...(r.outline.length <= 12 ? { marker: "o" } : {}), line: true }, ...(r.extra || [])];
  const blocks = [{ type: "plot", title: `Tracé de ${name}`, xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series }];
  return {
    results,
    steps: r.steps,
    blocks,
    copy: `${name}: ${parts.join("، ")}`
  };
}
