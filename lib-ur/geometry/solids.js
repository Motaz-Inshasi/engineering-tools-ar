import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const TAU = 2 * Math.PI;

const SOLID_LABELS = {
  cube: "مکعب",
  cuboid: "قائمۃ السطوح متوازی مستطیلات",
  cylinder: "قائم دائری بیلن",
  cone: "قائم دائری مخروط",
  sphere: "کرہ",
  hemisphere: "نصف کرہ",
  "square-pyramid": "منتظم چوکور ہرم",
  prism: "منتظم قاعدے والا قائم پرزم",
  frustum: "کٹا ہوا قائم دائری مخروط",
  torus: "ٹورس (چھلا)"
};

const blank = {
  shape: "", unit: "cm", a: "", l: "", w: "", h: "", r: "", R: "", n: ""
};

export const meta = {
  description: "عام ٹھوس اشیاء، جیسے مکعب، بیلن، مخروط، کرہ، ہرم، پرزم، کٹا ہوا مخروط اور ٹورس، کا حجم، کل سطحی رقبہ اور جہاں قابلِ اطلاق ہو وہاں جانبی رقبہ حساب کریں، سینٹی میٹر یا میٹر استعمال کرنے پر لیٹر میں گنجائش کے ساتھ۔",
  keywords: ["حجم", "سطحی رقبہ", "مکعب", "بیلن", "مخروط", "کرہ", "ہرم", "پرزم", "ٹورس", "لیٹر میں گنجائش", "volume", "surface area", "solids"],
  formulas: [
    { label: "بیلن کا حجم", tex: "V = \\pi r^2 h" },
    { label: "مخروط کا حجم", tex: "V = \\frac{1}{3}\\pi r^2 h" },
    { label: "کرے کا حجم", tex: "V = \\frac{4}{3}\\pi r^3" },
    { label: "کٹے ہوئے مخروط کا حجم", tex: "V = \\frac{\\pi h}{3}\\left(R^2+Rr+r^2\\right)" },
    { label: "حجم اور گنجائش", tex: "1\\ L = 1000\\ cm^3,\\qquad 1\\ m^3 = 1000\\ L" }
  ],
  inputs: [
    { id: "shape", label: "ٹھوس جسم", type: "select", default: "cube", options: [["cube", "مکعب"], ["cuboid", "قائمۃ السطوح متوازی مستطیلات"], ["cylinder", "قائم دائری بیلن"], ["cone", "قائم دائری مخروط"], ["sphere", "کرہ"], ["hemisphere", "نصف کرہ"], ["square-pyramid", "منتظم چوکور ہرم"], ["prism", "منتظم قاعدے والا قائم پرزم"], ["frustum", "کٹا ہوا قائم دائری مخروط"], ["torus", "ٹورس (چھلا)"]] },
    { id: "unit", label: "لمبائی کی اکائی", type: "text", default: "cm", help: "گنجائش خودکار طور پر لیٹر میں دکھانے کے لیے cm یا m استعمال کریں۔" },
    { id: "a", label: "کنارے کی لمبائی یا قاعدے کا ضلع a", type: "number", default: "2", when: { shape: ["cube", "square-pyramid", "prism"] } },
    { id: "l", label: "لمبائی l", type: "number", default: "4", when: { shape: ["cuboid"] } },
    { id: "w", label: "چوڑائی w", type: "number", default: "3", when: { shape: ["cuboid"] } },
    { id: "h", label: "اونچائی h", type: "number", default: "5", when: { shape: ["cuboid", "cylinder", "cone", "square-pyramid", "prism", "frustum"] } },
    { id: "r", label: "نصف قطر r", type: "number", default: "2", when: { shape: ["cylinder", "cone", "sphere", "hemisphere", "frustum", "torus"] }, help: "کٹے ہوئے مخروط میں یہ اوپری نصف قطر ہے، اور ٹورس میں یہ عرضی تراش کا نصف قطر ہے۔" },
    { id: "R", label: "بڑا نصف قطر R", type: "number", default: "5", when: { shape: ["frustum", "torus"] }, help: "کٹے ہوئے مخروط میں یہ نچلا نصف قطر ہے، اور ٹورس میں یہ مرکز سے عرضی تراش کے مرکز تک کا فاصلہ ہے۔" },
    { id: "n", label: "قاعدے کے اضلاع کی تعداد n", type: "number", default: "6", when: { shape: ["prism"] } }
  ],
  example: { values: { ...blank, shape: "cylinder", unit: "cm", h: "5", r: "2" }, expect: ["62.8319 cm³", "0.0628319 لیٹر"], note: "مثال: 2 cm نصف قطر اور 5 cm اونچائی والا بیلن۔" },
  invalid: { values: { ...blank, shape: "torus", unit: "cm", R: "1", r: "2" } },
  related: ["plane-shapes", "pythagoras", "circle-geometry", "coordinate-geometry", "triangle-solver", "polygon-area", "trigonometry", "unit-converter"]
};

function ctxOf(unit) {
  return {
    unit,
    T: (x) => ntex(x, 6),
    V: (x) => `${fmt(x, 6)} ${unit}³`,
    S: (x) => `${fmt(x, 6)} ${unit}²`,
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

function cube(input, c) {
  const a = num(input, "a", "کنارے کی لمبائی a", { positive: true });
  const V = a ** 3, S = 6 * a * a, lat = 4 * a * a;
  return {
    V, S, lat, extras: [],
    steps: [
      { text: "حجم:", tex: `V = a^3 = ${c.T(a)}^3 = ${c.T(V)}\\ ${c.U}^3` },
      { text: "کل سطحی رقبہ:", tex: `S = 6a^2 = ${c.T(S)}\\ ${c.U}^2` },
      { text: "جانبی رقبہ:", tex: `L = 4a^2 = ${c.T(lat)}\\ ${c.U}^2` }
    ],
    outline: [[-a / 2, 0], [a / 2, 0], [a / 2, a], [-a / 2, a]]
  };
}

function cuboid(input, c) {
  const l = num(input, "l", "لمبائی l", { positive: true });
  const w = num(input, "w", "چوڑائی w", { positive: true });
  const h = num(input, "h", "اونچائی h", { positive: true });
  const V = l * w * h, S = 2 * (l * w + w * h + l * h), lat = 2 * h * (l + w);
  return {
    V, S, lat, extras: [],
    steps: [
      { text: "حجم:", tex: `V = lwh = ${c.T(l)} \\times ${c.T(w)} \\times ${c.T(h)} = ${c.T(V)}\\ ${c.U}^3` },
      { text: "کل سطحی رقبہ:", tex: `S = 2(lw+wh+lh) = ${c.T(S)}\\ ${c.U}^2` },
      { text: "جانبی رقبہ:", tex: `L = 2h(l+w) = ${c.T(lat)}\\ ${c.U}^2` }
    ],
    outline: [[0, 0], [l, 0], [l, h], [0, h]]
  };
}

function cylinder(input, c) {
  const r = num(input, "r", "نصف قطر r", { positive: true });
  const h = num(input, "h", "اونچائی h", { positive: true });
  const V = Math.PI * r * r * h, S = 2 * Math.PI * r * (r + h), lat = 2 * Math.PI * r * h;
  return {
    V, S, lat, extras: [],
    steps: [
      { text: "حجم:", tex: `V = \\pi r^2 h = ${c.T(V)}\\ ${c.U}^3` },
      { text: "کل سطحی رقبہ:", tex: `S = 2\\pi r(r+h) = ${c.T(S)}\\ ${c.U}^2` },
      { text: "جانبی رقبہ:", tex: `L = 2\\pi r h = ${c.T(lat)}\\ ${c.U}^2` }
    ],
    outline: [[-r, 0], [r, 0], [r, h], [-r, h]]
  };
}

function cone(input, c) {
  const r = num(input, "r", "نصف قطر r", { positive: true });
  const h = num(input, "h", "اونچائی h", { positive: true });
  const slant = Math.hypot(r, h);
  const V = (Math.PI * r * r * h) / 3, lat = Math.PI * r * slant, S = Math.PI * r * (r + slant);
  return {
    V, S, lat,
    extras: [["ترچھی اونچائی", `${fmt(slant, 6)} ${c.unit}`]],
    steps: [
      { text: "ترچھی اونچائی:", tex: `l = \\sqrt{r^2+h^2} = ${c.T(slant)}\\ ${c.U}` },
      { text: "حجم:", tex: `V = \\frac{1}{3}\\pi r^2 h = ${c.T(V)}\\ ${c.U}^3` },
      { text: "جانبی رقبہ:", tex: `L = \\pi r l = ${c.T(lat)}\\ ${c.U}^2` },
      { text: "کل سطحی رقبہ:", tex: `S = \\pi r(r+l) = ${c.T(S)}\\ ${c.U}^2` }
    ],
    outline: [[-r, 0], [r, 0], [0, h]]
  };
}

function sphere(input, c) {
  const r = num(input, "r", "نصف قطر r", { positive: true });
  const V = (4 / 3) * Math.PI * r ** 3, S = 4 * Math.PI * r * r;
  return {
    V, S, lat: null, extras: [],
    steps: [
      { text: "حجم:", tex: `V = \\frac{4}{3}\\pi r^3 = ${c.T(V)}\\ ${c.U}^3` },
      { text: "سطحی رقبہ:", tex: `S = 4\\pi r^2 = ${c.T(S)}\\ ${c.U}^2` }
    ],
    outline: circlePts(0, 0, r, 0, TAU, 180)
  };
}

function hemisphere(input, c) {
  const r = num(input, "r", "نصف قطر r", { positive: true });
  const V = (2 / 3) * Math.PI * r ** 3, curved = 2 * Math.PI * r * r, S = 3 * Math.PI * r * r;
  return {
    V, S, lat: curved, extras: [],
    steps: [
      { text: "حجم:", tex: `V = \\frac{2}{3}\\pi r^3 = ${c.T(V)}\\ ${c.U}^3` },
      { text: "خمیدہ سطح کا رقبہ:", tex: `L = 2\\pi r^2 = ${c.T(curved)}\\ ${c.U}^2` },
      { text: "کل سطحی رقبہ (دائری قاعدے سمیت):", tex: `S = 3\\pi r^2 = ${c.T(S)}\\ ${c.U}^2` }
    ],
    outline: circlePts(0, 0, r, 0, Math.PI, 90)
  };
}

function squarePyramid(input, c) {
  const a = num(input, "a", "قاعدے کا ضلع a", { positive: true });
  const h = num(input, "h", "اونچائی h", { positive: true });
  const slant = Math.sqrt(h * h + (a / 2) ** 2);
  const V = (a * a * h) / 3, lat = 2 * a * slant, S = a * a + lat;
  return {
    V, S, lat,
    extras: [["ترچھے چہرے کی اونچائی", `${fmt(slant, 6)} ${c.unit}`]],
    steps: [
      { text: "ترچھے چہرے کی اونچائی:", tex: `l = \\sqrt{h^2+(a/2)^2} = ${c.T(slant)}\\ ${c.U}` },
      { text: "حجم:", tex: `V = \\frac{a^2 h}{3} = ${c.T(V)}\\ ${c.U}^3` },
      { text: "جانبی رقبہ:", tex: `L = 2al = ${c.T(lat)}\\ ${c.U}^2` },
      { text: "کل سطحی رقبہ:", tex: `S = a^2 + 2al = ${c.T(S)}\\ ${c.U}^2` }
    ],
    outline: [[-a / 2, 0], [a / 2, 0], [0, h]]
  };
}

function prism(input, c) {
  const n = num(input, "n", "قاعدے کے اضلاع کی تعداد n", { integer: true, min: 3, max: 10000 });
  const a = num(input, "a", "قاعدے کا ضلع a", { positive: true });
  const h = num(input, "h", "اونچائی h", { positive: true });
  const t = Math.PI / n;
  const base = (n * a * a) / (4 * Math.tan(t));
  const R = a / (2 * Math.sin(t));
  const V = base * h, lat = n * a * h, S = 2 * base + lat;
  const outline = [];
  for (let k = 0; k < n; k++) outline.push([R * Math.cos((TAU * k) / n), R * Math.sin((TAU * k) / n)]);
  return {
    V, S, lat,
    extras: [["قاعدے کا رقبہ", c.S(base)]],
    steps: [
      { text: "قاعدے کا رقبہ (منتظم کثیرالاضلاع):", tex: `A_b = \\frac{n a^2}{4\\tan(\\pi/n)} = ${c.T(base)}\\ ${c.U}^2` },
      { text: "حجم:", tex: `V = A_b h = ${c.T(V)}\\ ${c.U}^3` },
      { text: "جانبی رقبہ:", tex: `L = nah = ${c.T(lat)}\\ ${c.U}^2` },
      { text: "کل سطحی رقبہ:", tex: `S = 2A_b + L = ${c.T(S)}\\ ${c.U}^2` }
    ],
    outline
  };
}

function frustum(input, c) {
  const R = num(input, "R", "بڑا نصف قطر R", { positive: true });
  const r = num(input, "r", "چھوٹا نصف قطر r", { positive: true });
  const h = num(input, "h", "اونچائی h", { positive: true });
  const slant = Math.hypot(h, R - r);
  const V = (Math.PI * h * (R * R + R * r + r * r)) / 3;
  const lat = Math.PI * (R + r) * slant;
  const S = Math.PI * (R * R + r * r) + lat;
  return {
    V, S, lat,
    extras: [["ترچھی اونچائی", `${fmt(slant, 6)} ${c.unit}`]],
    steps: [
      { text: "ترچھی اونچائی:", tex: `l = \\sqrt{h^2+(R-r)^2} = ${c.T(slant)}\\ ${c.U}` },
      { text: "حجم:", tex: `V = \\frac{\\pi h}{3}(R^2+Rr+r^2) = ${c.T(V)}\\ ${c.U}^3` },
      { text: "جانبی رقبہ:", tex: `L = \\pi(R+r)l = ${c.T(lat)}\\ ${c.U}^2` },
      { text: "کل سطحی رقبہ:", tex: `S = \\pi(R^2+r^2) + \\pi(R+r)l = ${c.T(S)}\\ ${c.U}^2` }
    ],
    outline: [[-R, 0], [R, 0], [r, h], [-r, h]]
  };
}

function torus(input, c) {
  const R = num(input, "R", "بڑا نصف قطر R", { positive: true });
  const r = num(input, "r", "عرضی تراش کا نصف قطر r", { positive: true });
  if (R <= r) fail("ٹورس کو خود سے متقاطع ہونے سے بچانے کے لیے بڑا نصف قطر R، عرضی تراش کے نصف قطر r سے زیادہ ہونا چاہیے۔", "R");
  const V = 2 * Math.PI * Math.PI * R * r * r, S = 4 * Math.PI * Math.PI * R * r;
  return {
    V, S, lat: null, extras: [],
    steps: [
      { text: "حجم (پیپس کا نظریہ):", tex: `V = 2\\pi^2 R r^2 = ${c.T(V)}\\ ${c.U}^3` },
      { text: "سطحی رقبہ:", tex: `S = 4\\pi^2 R r = ${c.T(S)}\\ ${c.U}^2` }
    ],
    outline: circlePts(R, 0, r, 0, TAU, 180)
  };
}

const FN = {
  cube,
  cuboid,
  cylinder,
  cone,
  sphere,
  hemisphere,
  "square-pyramid": squarePyramid,
  prism,
  frustum,
  torus
};

export function solve(input) {
  const unit = str(input, "unit", "لمبائی کی اکائی", { default: "cm" });
  const shape = choice(input, "shape", "ٹھوس جسم", Object.keys(SOLID_LABELS), "cube");
  const c = ctxOf(unit);
  const r = FN[shape](input, c);
  const name = SOLID_LABELS[shape];
  const liters = unit === "cm" ? r.V / 1000 : unit === "m" ? r.V * 1000 : null;
  const results = [
    { label: "حجم", value: c.V(r.V), text: c.V(r.V) },
    { label: "کل سطحی رقبہ", value: c.S(r.S), text: c.S(r.S) }
  ];
  if (r.lat !== null) results.push({ label: "جانبی رقبہ", value: c.S(r.lat) });
  for (const [label, value] of r.extras) results.push({ label, value });
  const parts = [`حجم = ${c.V(r.V)}`, `سطحی رقبہ = ${c.S(r.S)}`];
  if (liters !== null) {
    results.push({ label: "گنجائش", value: `${fmt(liters, 6)} لیٹر`, text: `${fmt(liters, 6)} لیٹر` });
    parts.push(`گنجائش = ${fmt(liters, 6)} لیٹر`);
  }
  const blocks = [{ type: "plot", title: `خاکہ: ${name}`, xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series: [{ name, points: [...r.outline, r.outline[0]], line: true }] }];
  return {
    results,
    steps: r.steps,
    blocks,
    copy: `${name}: ${parts.join("، ")}`
  };
}
