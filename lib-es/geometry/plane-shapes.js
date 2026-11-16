import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, deg, tex as ntex } from "../core/format.js";

const TAU = 2 * Math.PI;

const SHAPE_LABELS = {
  square: "Cuadrado",
  rectangle: "Rectángulo",
  triangle: "Triángulo",
  "right-triangle": "Triángulo rectángulo",
  circle: "Círculo",
  ellipse: "Elipse",
  trapezoid: "Trapecio",
  parallelogram: "Paralelogramo",
  rhombus: "Rombo",
  "regular-polygon": "Polígono regular",
  sector: "Sector circular"
};

const blank = {
  shape: "", unit: "cm", s: "", rl: "", rw: "", tmode: "", tb: "", th: "", ta: "", tc: "", t1: "", t2: "", t3: "",
  ra: "", rb: "", cmode: "", cval: "", ea: "", eb: "", pa: "", pb: "", ph: "", pl1: "", pl2: "", qb: "", qs: "", qh: "",
  d1: "", d2: "", npoly: "", ns: "", sr: "", sang: ""
};

export const meta = {
  description: "Calcule el área y el perímetro de las figuras planas más comunes, como el cuadrado, el rectángulo, el triángulo, el círculo, la elipse, el trapecio, el rombo, el polígono regular y el sector circular, con propiedades adicionales y un gráfico.",
  keywords: ["Área", "Perímetro", "Rectángulo", "Triángulo", "Círculo", "Trapecio", "Rombo", "Polígono regular", "Sector circular", "area", "perimeter", "plane shapes"],
  formulas: [
    { label: "Área del rectángulo", tex: "A = LW" },
    { label: "Área del triángulo", tex: "A = \\frac{1}{2}bh" },
    { label: "Área del círculo", tex: "A = \\pi r^2" },
    { label: "Área del polígono regular", tex: "A = \\frac{n s^2}{4\\tan(\\pi/n)}" }
  ],
  inputs: [
    { id: "shape", label: "Figura", type: "select", default: "rectangle", options: [["square", "Cuadrado"], ["rectangle", "Rectángulo"], ["triangle", "Triángulo"], ["right-triangle", "Triángulo rectángulo"], ["circle", "Círculo"], ["ellipse", "Elipse"], ["trapezoid", "Trapecio"], ["parallelogram", "Paralelogramo"], ["rhombus", "Rombo"], ["regular-polygon", "Polígono regular"], ["sector", "Sector circular"]] },
    { id: "unit", label: "Unidad de longitud", type: "text", default: "cm", help: "La unidad solo es para la visualización; el área se expresa en unidades cuadradas." },
    { id: "s", label: "Longitud del lado s", type: "number", default: "5", when: { shape: ["square"] } },
    { id: "rl", label: "Largo L", type: "number", default: "8", when: { shape: ["rectangle"] } },
    { id: "rw", label: "Ancho W", type: "number", default: "5", when: { shape: ["rectangle"] } },
    { id: "tmode", label: "Datos del triángulo", type: "select", default: "bh", options: [["bh", "Base y altura"], ["sss", "Tres lados"]], when: { shape: ["triangle"] } },
    { id: "tb", label: "Base b", type: "number", default: "10", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "th", label: "Altura h", type: "number", default: "4", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "ta", label: "Lado izquierdo (opcional)", type: "number", when: { shape: ["triangle"], tmode: ["bh"] }, help: "Introduzca ambos lados opcionales juntos para calcular el perímetro." },
    { id: "tc", label: "Lado derecho (opcional)", type: "number", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "t1", label: "Primer lado a", type: "number", default: "3", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "t2", label: "Segundo lado b", type: "number", default: "4", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "t3", label: "Tercer lado c", type: "number", default: "5", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "ra", label: "Cateto a", type: "number", default: "3", when: { shape: ["right-triangle"] } },
    { id: "rb", label: "Cateto b", type: "number", default: "4", when: { shape: ["right-triangle"] } },
    { id: "cmode", label: "Dato", type: "select", default: "radius", options: [["radius", "Radio"], ["diameter", "Diámetro"]], when: { shape: ["circle"] } },
    { id: "cval", label: "Valor", type: "number", default: "1", when: { shape: ["circle"] }, help: "Radio o diámetro, según la opción elegida arriba." },
    { id: "ea", label: "Semieje horizontal a", type: "number", default: "5", when: { shape: ["ellipse"] } },
    { id: "eb", label: "Semieje vertical b", type: "number", default: "3", when: { shape: ["ellipse"] } },
    { id: "pa", label: "Base superior a", type: "number", default: "4", when: { shape: ["trapezoid"] } },
    { id: "pb", label: "Base inferior b", type: "number", default: "10", when: { shape: ["trapezoid"] } },
    { id: "ph", label: "Altura h", type: "number", default: "3", when: { shape: ["trapezoid"] } },
    { id: "pl1", label: "Lado 1 (opcional)", type: "number", when: { shape: ["trapezoid"] } },
    { id: "pl2", label: "Lado 2 (opcional)", type: "number", when: { shape: ["trapezoid"] }, help: "Introduzca ambos lados juntos para calcular el perímetro." },
    { id: "qb", label: "Base b", type: "number", default: "10", when: { shape: ["parallelogram"] } },
    { id: "qs", label: "Lado oblicuo s", type: "number", default: "6", when: { shape: ["parallelogram"] } },
    { id: "qh", label: "Altura h", type: "number", default: "4", when: { shape: ["parallelogram"] }, help: "La altura es perpendicular a la base y no puede superar el lado oblicuo." },
    { id: "d1", label: "Primera diagonal d1", type: "number", default: "6", when: { shape: ["rhombus"] } },
    { id: "d2", label: "Segunda diagonal d2", type: "number", default: "8", when: { shape: ["rhombus"] } },
    { id: "npoly", label: "Número de lados n", type: "number", default: "6", when: { shape: ["regular-polygon"] } },
    { id: "ns", label: "Longitud del lado s", type: "number", default: "2", when: { shape: ["regular-polygon"] } },
    { id: "sr", label: "Radio r", type: "number", default: "2", when: { shape: ["sector"] } },
    { id: "sang", label: "Ángulo θ (en grados)", type: "number", default: "90", when: { shape: ["sector"] }, help: "De 0 a 360 grados." }
  ],
  example: { values: { ...blank, shape: "rectangle", unit: "cm", rl: "8", rw: "5" }, expect: ["40 cm²", "26 cm"], note: "Ejemplo: rectángulo de 8 cm de largo y 5 cm de ancho." },
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
  const s = num(input, "s", "Longitud del lado", { positive: true });
  const area = s * s, perimeter = 4 * s, d = s * Math.SQRT2;
  return {
    area, perimeter,
    extras: [["Longitud de la diagonal", c.L(d)]],
    steps: [
      { text: "Área:", tex: `A = s^2 = ${c.T(s)}^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Perímetro:", tex: `P = 4s = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Longitud de la diagonal:", tex: `d = s\\sqrt{2} = ${c.T(d)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [s, 0], [s, s], [0, s]]
  };
}

function rectangle(input, c) {
  const L = num(input, "rl", "Largo L", { positive: true });
  const W = num(input, "rw", "Ancho W", { positive: true });
  const area = L * W, perimeter = 2 * (L + W), d = Math.hypot(L, W);
  return {
    area, perimeter,
    extras: [["Longitud de la diagonal", c.L(d)]],
    steps: [
      { text: "Área:", tex: `A = LW = ${c.T(L)} \\times ${c.T(W)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Perímetro:", tex: `P = 2(L+W) = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Longitud de la diagonal:", tex: `d = \\sqrt{L^2+W^2} = ${c.T(d)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [L, 0], [L, W], [0, W]]
  };
}

function triangleBaseHeight(input, c) {
  const b = num(input, "tb", "Base b", { positive: true });
  const h = num(input, "th", "Altura h", { positive: true });
  const ta = num(input, "ta", "Lado izquierdo", { positive: true, optional: true });
  const tc = num(input, "tc", "Lado derecho", { positive: true, optional: true });
  const area = (b * h) / 2;
  let x = b / 2, perimeter = null;
  const steps = [{ text: "Área:", tex: `A = \\frac{bh}{2} = \\frac{${c.T(b)} \\times ${c.T(h)}}{2} = ${c.T(area)}\\ ${c.U}^2` }];
  if (ta !== null || tc !== null) {
    if (ta === null || tc === null) fail("Introduzca ambos lados opcionales juntos para calcular el perímetro, o déjelos vacíos.", ta === null ? "ta" : "tc");
    if (ta + tc <= b || Math.abs(ta - tc) >= b) fail("Los lados introducidos no forman un triángulo con esta base.", "ta");
    const s = (b + ta + tc) / 2;
    const heron = Math.sqrt(s * (s - b) * (s - ta) * (s - tc));
    if (Math.abs((2 * heron) / b - h) > 1e-6 * h) fail("La altura h no es compatible con los lados introducidos.", "th");
    x = (b * b + ta * ta - tc * tc) / (2 * b);
    perimeter = b + ta + tc;
    steps.push({ text: "Perímetro:", tex: `P = b + a + c = ${c.T(perimeter)}\\ ${c.U}` });
  }
  return {
    area, perimeter, extras: [], steps,
    outline: [[0, 0], [b, 0], [x, h]]
  };
}

function triangleSides(input, c) {
  const a = num(input, "t1", "Primer lado a", { positive: true });
  const b = num(input, "t2", "Segundo lado b", { positive: true });
  const k = num(input, "t3", "Tercer lado c", { positive: true });
  if (a + b <= k || a + k <= b || b + k <= a) fail("Los tres lados no forman un triángulo: la suma de cualesquiera dos lados debe ser mayor que el tercero.", "t3");
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
      ["Alturas (sobre a, b, c)", `${c.L(ha)}، ${c.L(hb)}، ${c.L(hc)}`],
      ["Ángulos (en grados)", `${fmt(angA, 4)}°، ${fmt(angB, 4)}°، ${fmt(angC, 4)}°`]
    ],
    steps: [
      { text: "Semiperímetro:", tex: `s = \\frac{a+b+c}{2} = ${c.T(s)}` },
      { text: "Área de Herón:", tex: `A = \\sqrt{s(s-a)(s-b)(s-c)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Perímetro:", tex: `P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Ángulo opuesto a a por la ley del coseno:", tex: `\\cos A = \\frac{b^2+c^2-a^2}{2bc} \\Rightarrow A = ${fmt(angA, 4)}^\\circ` }
    ],
    outline: [[0, 0], [a, 0], [x, y]]
  };
}

function rightTriangle(input, c) {
  const a = num(input, "ra", "Cateto a", { positive: true });
  const b = num(input, "rb", "Cateto b", { positive: true });
  const hyp = Math.hypot(a, b);
  const area = (a * b) / 2, perimeter = a + b + hyp, alt = (a * b) / hyp;
  const angA = deg(Math.atan(b / a)), angB = 90 - angA;
  return {
    area, perimeter,
    extras: [
      ["Hipotenusa", c.L(hyp)],
      ["Altura sobre la hipotenusa", c.L(alt)],
      ["Ángulos agudos", `${fmt(angA, 4)}° y ${fmt(angB, 4)}°`]
    ],
    steps: [
      { text: "Área:", tex: `A = \\frac{ab}{2} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Hipotenusa (Pitágoras):", tex: `c = \\sqrt{a^2+b^2} = ${c.T(hyp)}\\ ${c.U}` },
      { text: "Perímetro:", tex: `P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Altura sobre la hipotenusa:", tex: `h = \\frac{ab}{c} = ${c.T(alt)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [a, 0], [0, b]]
  };
}

function circle(input, c) {
  const mode = choice(input, "cmode", "Dato", ["radius", "diameter"], "radius");
  const v = num(input, "cval", "Valor", { positive: true });
  const r = mode === "diameter" ? v / 2 : v;
  const area = Math.PI * r * r, perimeter = TAU * r;
  return {
    area, perimeter,
    extras: [["Radio", c.L(r)], ["Diámetro", c.L(2 * r)]],
    steps: [
      { text: "Radio:", tex: `r = ${c.T(r)}\\ ${c.U}` },
      { text: "Área:", tex: `A = \\pi r^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Perímetro:", tex: `P = 2\\pi r = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: arcPoints(r, 0, TAU, 180),
    extra: [{ name: "Centro", points: [[0, 0]], marker: "x", line: false }]
  };
}

function ellipse(input, c) {
  const a = num(input, "ea", "Semieje horizontal a", { positive: true });
  const b = num(input, "eb", "Semieje vertical b", { positive: true });
  const area = Math.PI * a * b;
  const perimeter = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  const outline = [];
  for (let i = 0; i <= 180; i++) {
    const t = (TAU * i) / 180;
    outline.push([a * Math.cos(t), b * Math.sin(t)]);
  }
  return {
    area, perimeter,
    extras: [["Eje mayor", c.L(2 * Math.max(a, b))], ["Eje menor", c.L(2 * Math.min(a, b))]],
    steps: [
      { text: "Área:", tex: `A = \\pi ab = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Perímetro (aproximación de Ramanujan II):", tex: `P \\approx \\pi\\left[3(a+b)-\\sqrt{(3a+b)(a+3b)}\\right] = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline
  };
}

function trapezoid(input, c) {
  const a = num(input, "pa", "Base superior a", { positive: true });
  const b = num(input, "pb", "Base inferior b", { positive: true });
  const h = num(input, "ph", "Altura h", { positive: true });
  const l1 = num(input, "pl1", "Lado 1", { positive: true, optional: true });
  const l2 = num(input, "pl2", "Lado 2", { positive: true, optional: true });
  if ((l1 === null) !== (l2 === null)) fail("Introduzca ambos lados juntos para calcular el perímetro, o déjelos vacíos.", l1 === null ? "pl1" : "pl2");
  const area = ((a + b) / 2) * h;
  const d = b - a;
  let p = d / 2, perimeter = null;
  if (l1 !== null) {
    if (l1 < h || l2 < h) fail("La longitud del lado no puede ser menor que la altura.", l1 < h ? "pl1" : "pl2");
    const p1 = Math.sqrt(l1 * l1 - h * h);
    const fits = [p1, -p1].filter((q) => Math.abs((d - q) * (d - q) + h * h - l2 * l2) <= 1e-6 * l2 * l2);
    if (fits.length === 0) fail("Los lados introducidos no forman un trapecio con estas bases y esta altura.", "pl2");
    p = fits[0];
    perimeter = a + b + l1 + l2;
  }
  return {
    area, perimeter,
    extras: [["Base media", c.L((a + b) / 2)]],
    steps: [
      { text: "Área:", tex: `A = \\frac{(a+b)h}{2} = \\frac{(${c.T(a)}+${c.T(b)}) \\times ${c.T(h)}}{2} = ${c.T(area)}\\ ${c.U}^2` },
      ...(perimeter === null ? [] : [{ text: "Perímetro:", tex: `P = a+b+c_1+c_2 = ${c.T(perimeter)}\\ ${c.U}` }])
    ],
    outline: [[0, 0], [b, 0], [p + a, h], [p, h]]
  };
}

function parallelogram(input, c) {
  const b = num(input, "qb", "Base b", { positive: true });
  const s = num(input, "qs", "Lado oblicuo s", { positive: true });
  const h = num(input, "qh", "Altura h", { positive: true });
  if (h > s) fail("La altura no puede superar el lado oblicuo.", "qh");
  const area = b * h, perimeter = 2 * (b + s), x = Math.sqrt(s * s - h * h);
  const d1 = Math.hypot(b + x, h), d2 = Math.hypot(b - x, h);
  return {
    area, perimeter,
    extras: [["Diagonal mayor", c.L(Math.max(d1, d2))], ["Diagonal menor", c.L(Math.min(d1, d2))]],
    steps: [
      { text: "Área:", tex: `A = bh = ${c.T(b)} \\times ${c.T(h)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Perímetro:", tex: `P = 2(b+s) = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Desplazamiento horizontal del lado oblicuo:", tex: `x = \\sqrt{s^2-h^2} = ${c.T(x)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [b, 0], [b + x, h], [x, h]]
  };
}

function rhombus(input, c) {
  const d1 = num(input, "d1", "Primera diagonal d1", { positive: true });
  const d2 = num(input, "d2", "Segunda diagonal d2", { positive: true });
  const area = (d1 * d2) / 2, side = Math.hypot(d1 / 2, d2 / 2), perimeter = 4 * side;
  return {
    area, perimeter,
    extras: [["Longitud del lado", c.L(side)]],
    steps: [
      { text: "Área a partir de las diagonales:", tex: `A = \\frac{d_1 d_2}{2} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Lado (Pitágoras con las mitades de las diagonales):", tex: `s = \\sqrt{(d_1/2)^2+(d_2/2)^2} = ${c.T(side)}\\ ${c.U}` },
      { text: "Perímetro:", tex: `P = 4s = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: [[d1 / 2, 0], [0, d2 / 2], [-d1 / 2, 0], [0, -d2 / 2]]
  };
}

function regularPolygon(input, c) {
  const n = num(input, "npoly", "Número de lados n", { integer: true, min: 3, max: 10000 });
  const s = num(input, "ns", "Longitud del lado s", { positive: true });
  const t = Math.PI / n;
  const area = (n * s * s) / (4 * Math.tan(t)), perimeter = n * s;
  const apothem = s / (2 * Math.tan(t)), R = s / (2 * Math.sin(t)), interior = ((n - 2) * 180) / n;
  const outline = [];
  for (let k = 0; k < n; k++) outline.push([R * Math.cos((TAU * k) / n), R * Math.sin((TAU * k) / n)]);
  return {
    area, perimeter,
    extras: [
      ["Radio de la circunferencia inscrita (apotema)", c.L(apothem)],
      ["Radio de la circunferencia circunscrita", c.L(R)],
      ["Ángulo interior (grados)", `${fmt(interior, 6)}°`]
    ],
    steps: [
      { text: "Área:", tex: `A = \\frac{n s^2}{4\\tan(\\pi/n)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Perímetro:", tex: `P = ns = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Radio de la circunferencia inscrita:", tex: `a = \\frac{s}{2\\tan(\\pi/n)} = ${c.T(apothem)}\\ ${c.U}` },
      { text: "Radio de la circunferencia circunscrita:", tex: `R = \\frac{s}{2\\sin(\\pi/n)} = ${c.T(R)}\\ ${c.U}` }
    ],
    outline
  };
}

function sector(input, c) {
  const r = num(input, "sr", "Radio r", { positive: true });
  const deg0 = num(input, "sang", "Ángulo θ", { positive: true, max: 360 });
  const th = (deg0 * Math.PI) / 180;
  const area = (r * r * th) / 2, arc = r * th, perimeter = 2 * r + arc;
  return {
    area, perimeter,
    extras: [["Longitud del arco", c.L(arc)], ["Ángulo en radianes", `${fmt(th, 6)}`]],
    steps: [
      { text: "Ángulo en radianes:", tex: `\\theta = \\frac{${c.T(deg0)}\\pi}{180} = ${c.T(th)}` },
      { text: "Área:", tex: `A = \\frac{1}{2}r^2\\theta = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Longitud del arco:", tex: `L = r\\theta = ${c.T(arc)}\\ ${c.U}` },
      { text: "Perímetro (dos radios y el arco):", tex: `P = 2r + r\\theta = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: [[0, 0], ...arcPoints(r, 0, th, 90)]
  };
}

function triangle(input, c) {
  const mode = choice(input, "tmode", "Datos del triángulo", ["bh", "sss"], "bh");
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
  const unit = str(input, "unit", "Unidad de longitud", { default: "cm" });
  const shape = choice(input, "shape", "Figura", Object.keys(SHAPE_LABELS), "rectangle");
  const c = ctxOf(unit);
  const r = FN[shape](input, c);
  const name = SHAPE_LABELS[shape];
  const results = [{ label: "Área", value: c.A(r.area), text: c.A(r.area) }];
  const parts = [`Área = ${c.A(r.area)}`];
  if (r.perimeter !== null) {
    results.push({ label: "Perímetro", value: c.L(r.perimeter), text: c.L(r.perimeter) });
    parts.push(`Perímetro = ${c.L(r.perimeter)}`);
  }
  for (const [label, value] of r.extras) results.push({ label, value });
  const series = [{ name, points: closed(r.outline), ...(r.outline.length <= 12 ? { marker: "o" } : {}), line: true }, ...(r.extra || [])];
  const blocks = [{ type: "plot", title: `Gráfico de ${name}`, xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series }];
  return {
    results,
    steps: r.steps,
    blocks,
    copy: `${name}: ${parts.join("، ")}`
  };
}
