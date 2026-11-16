import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const TAU = 2 * Math.PI;

const SOLID_LABELS = {
  cube: "Küp",
  cuboid: "Dikdörtgenler prizması",
  cylinder: "Dik dairesel silindir",
  cone: "Dik dairesel koni",
  sphere: "Küre",
  hemisphere: "Yarım küre",
  "square-pyramid": "Düzgün dörtgen piramit",
  prism: "Düzgün dik prizma (taban çokgen)",
  frustum: "Kesik dik dairesel koni",
  torus: "Simit (halka)"
};

const blank = {
  shape: "", unit: "cm", a: "", l: "", w: "", h: "", r: "", R: "", n: ""
};

export const meta = {
  description: "Küp, silindir, koni, küre, piramit, prizma, kesik koni ve simit gibi yaygın cisimlerin hacmini, yüzey alanını ve yanal alanını uygun olduğunda hesaplayın; santimetre veya metre kullanıldığında kapasiteyi litre olarak da gösterin.",
  keywords: ["Hacim", "Yüzey alanı", "Küp", "Silindir", "Koni", "Küre", "Piramit", "Prizma", "Simit", "Kapasite (litre)", "volume", "surface area", "solids"],
  formulas: [
    { label: "Silindirin hacmi", tex: "V = \\pi r^2 h" },
    { label: "Koninin hacmi", tex: "V = \\frac{1}{3}\\pi r^2 h" },
    { label: "Kürenin hacmi", tex: "V = \\frac{4}{3}\\pi r^3" },
    { label: "Kesik koninin hacmi", tex: "V = \\frac{\\pi h}{3}\\left(R^2+Rr+r^2\\right)" },
    { label: "Hacim ve kapasite", tex: "1\\ L = 1000\\ cm^3,\\qquad 1\\ m^3 = 1000\\ L" }
  ],
  inputs: [
    { id: "shape", label: "Cisim", type: "select", default: "cube", options: [["cube", "Küp"], ["cuboid", "Dikdörtgenler prizması"], ["cylinder", "Dik dairesel silindir"], ["cone", "Dik dairesel koni"], ["sphere", "Küre"], ["hemisphere", "Yarım küre"], ["square-pyramid", "Düzgün dörtgen piramit"], ["prism", "Düzgün dik prizma (taban çokgen)"], ["frustum", "Kesik dik dairesel koni"], ["torus", "Simit (halka)"]] },
    { id: "unit", label: "Uzunluk birimi", type: "text", default: "cm", help: "Kapasitenin otomatik olarak litre cinsinden görünmesi için cm veya m kullanın." },
    { id: "a", label: "Kenar uzunluğu veya taban kenarı a", type: "number", default: "2", when: { shape: ["cube", "square-pyramid", "prism"] } },
    { id: "l", label: "Uzunluk l", type: "number", default: "4", when: { shape: ["cuboid"] } },
    { id: "w", label: "Genişlik w", type: "number", default: "3", when: { shape: ["cuboid"] } },
    { id: "h", label: "Yükseklik h", type: "number", default: "5", when: { shape: ["cuboid", "cylinder", "cone", "square-pyramid", "prism", "frustum"] } },
    { id: "r", label: "Yarıçap r", type: "number", default: "2", when: { shape: ["cylinder", "cone", "sphere", "hemisphere", "frustum", "torus"] }, help: "Kesik koninin üst yarıçapı; simitte ise kesit yarıçapı." },
    { id: "R", label: "Büyük yarıçap R", type: "number", default: "5", when: { shape: ["frustum", "torus"] }, help: "Kesik koninin alt yarıçapı; simitte ise merkezden kesit merkezine olan yarıçap." },
    { id: "n", label: "Taban kenar sayısı n", type: "number", default: "6", when: { shape: ["prism"] } }
  ],
  example: { values: { ...blank, shape: "cylinder", unit: "cm", h: "5", r: "2" }, expect: ["62.8319 cm³", "0,0628319 litre"], note: "Örnek: yarıçapı 2 cm ve yüksekliği 5 cm olan silindir." },
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
  const a = num(input, "a", "Kenar uzunluğu a", { positive: true });
  const V = a ** 3, S = 6 * a * a, lat = 4 * a * a;
  return {
    V, S, lat, extras: [],
    steps: [
      { text: "Hacim:", tex: `V = a^3 = ${c.T(a)}^3 = ${c.T(V)}\\ ${c.U}^3` },
      { text: "Toplam yüzey alanı:", tex: `S = 6a^2 = ${c.T(S)}\\ ${c.U}^2` },
      { text: "Yanal alan:", tex: `L = 4a^2 = ${c.T(lat)}\\ ${c.U}^2` }
    ],
    outline: [[-a / 2, 0], [a / 2, 0], [a / 2, a], [-a / 2, a]]
  };
}

function cuboid(input, c) {
  const l = num(input, "l", "Uzunluk l", { positive: true });
  const w = num(input, "w", "Genişlik w", { positive: true });
  const h = num(input, "h", "Yükseklik h", { positive: true });
  const V = l * w * h, S = 2 * (l * w + w * h + l * h), lat = 2 * h * (l + w);
  return {
    V, S, lat, extras: [],
    steps: [
      { text: "Hacim:", tex: `V = lwh = ${c.T(l)} \\times ${c.T(w)} \\times ${c.T(h)} = ${c.T(V)}\\ ${c.U}^3` },
      { text: "Toplam yüzey alanı:", tex: `S = 2(lw+wh+lh) = ${c.T(S)}\\ ${c.U}^2` },
      { text: "Yanal alan:", tex: `L = 2h(l+w) = ${c.T(lat)}\\ ${c.U}^2` }
    ],
    outline: [[0, 0], [l, 0], [l, h], [0, h]]
  };
}

function cylinder(input, c) {
  const r = num(input, "r", "Yarıçap r", { positive: true });
  const h = num(input, "h", "Yükseklik h", { positive: true });
  const V = Math.PI * r * r * h, S = 2 * Math.PI * r * (r + h), lat = 2 * Math.PI * r * h;
  return {
    V, S, lat, extras: [],
    steps: [
      { text: "Hacim:", tex: `V = \\pi r^2 h = ${c.T(V)}\\ ${c.U}^3` },
      { text: "Toplam yüzey alanı:", tex: `S = 2\\pi r(r+h) = ${c.T(S)}\\ ${c.U}^2` },
      { text: "Yanal alan:", tex: `L = 2\\pi r h = ${c.T(lat)}\\ ${c.U}^2` }
    ],
    outline: [[-r, 0], [r, 0], [r, h], [-r, h]]
  };
}

function cone(input, c) {
  const r = num(input, "r", "Yarıçap r", { positive: true });
  const h = num(input, "h", "Yükseklik h", { positive: true });
  const slant = Math.hypot(r, h);
  const V = (Math.PI * r * r * h) / 3, lat = Math.PI * r * slant, S = Math.PI * r * (r + slant);
  return {
    V, S, lat,
    extras: [["Eğik yükseklik", `${fmt(slant, 6)} ${c.unit}`]],
    steps: [
      { text: "Eğik yükseklik:", tex: `l = \\sqrt{r^2+h^2} = ${c.T(slant)}\\ ${c.U}` },
      { text: "Hacim:", tex: `V = \\frac{1}{3}\\pi r^2 h = ${c.T(V)}\\ ${c.U}^3` },
      { text: "Yanal alan:", tex: `L = \\pi r l = ${c.T(lat)}\\ ${c.U}^2` },
      { text: "Toplam yüzey alanı:", tex: `S = \\pi r(r+l) = ${c.T(S)}\\ ${c.U}^2` }
    ],
    outline: [[-r, 0], [r, 0], [0, h]]
  };
}

function sphere(input, c) {
  const r = num(input, "r", "Yarıçap r", { positive: true });
  const V = (4 / 3) * Math.PI * r ** 3, S = 4 * Math.PI * r * r;
  return {
    V, S, lat: null, extras: [],
    steps: [
      { text: "Hacim:", tex: `V = \\frac{4}{3}\\pi r^3 = ${c.T(V)}\\ ${c.U}^3` },
      { text: "Yüzey alanı:", tex: `S = 4\\pi r^2 = ${c.T(S)}\\ ${c.U}^2` }
    ],
    outline: circlePts(0, 0, r, 0, TAU, 180)
  };
}

function hemisphere(input, c) {
  const r = num(input, "r", "Yarıçap r", { positive: true });
  const V = (2 / 3) * Math.PI * r ** 3, curved = 2 * Math.PI * r * r, S = 3 * Math.PI * r * r;
  return {
    V, S, lat: curved, extras: [],
    steps: [
      { text: "Hacim:", tex: `V = \\frac{2}{3}\\pi r^3 = ${c.T(V)}\\ ${c.U}^3` },
      { text: "Eğri yüzey alanı:", tex: `L = 2\\pi r^2 = ${c.T(curved)}\\ ${c.U}^2` },
      { text: "Toplam yüzey alanı (dairesel taban ile):", tex: `S = 3\\pi r^2 = ${c.T(S)}\\ ${c.U}^2` }
    ],
    outline: circlePts(0, 0, r, 0, Math.PI, 90)
  };
}

function squarePyramid(input, c) {
  const a = num(input, "a", "Taban kenarı a", { positive: true });
  const h = num(input, "h", "Yükseklik h", { positive: true });
  const slant = Math.sqrt(h * h + (a / 2) ** 2);
  const V = (a * a * h) / 3, lat = 2 * a * slant, S = a * a + lat;
  return {
    V, S, lat,
    extras: [["Eğik yüzün yüksekliği", `${fmt(slant, 6)} ${c.unit}`]],
    steps: [
      { text: "Eğik yüzün yüksekliği:", tex: `l = \\sqrt{h^2+(a/2)^2} = ${c.T(slant)}\\ ${c.U}` },
      { text: "Hacim:", tex: `V = \\frac{a^2 h}{3} = ${c.T(V)}\\ ${c.U}^3` },
      { text: "Yanal alan:", tex: `L = 2al = ${c.T(lat)}\\ ${c.U}^2` },
      { text: "Toplam yüzey alanı:", tex: `S = a^2 + 2al = ${c.T(S)}\\ ${c.U}^2` }
    ],
    outline: [[-a / 2, 0], [a / 2, 0], [0, h]]
  };
}

function prism(input, c) {
  const n = num(input, "n", "Taban kenar sayısı n", { integer: true, min: 3, max: 10000 });
  const a = num(input, "a", "Taban kenarı a", { positive: true });
  const h = num(input, "h", "Yükseklik h", { positive: true });
  const t = Math.PI / n;
  const base = (n * a * a) / (4 * Math.tan(t));
  const R = a / (2 * Math.sin(t));
  const V = base * h, lat = n * a * h, S = 2 * base + lat;
  const outline = [];
  for (let k = 0; k < n; k++) outline.push([R * Math.cos((TAU * k) / n), R * Math.sin((TAU * k) / n)]);
  return {
    V, S, lat,
    extras: [["Taban alanı", c.S(base)]],
    steps: [
      { text: "Taban alanı (düzgün çokgen):", tex: `A_b = \\frac{n a^2}{4\\tan(\\pi/n)} = ${c.T(base)}\\ ${c.U}^2` },
      { text: "Hacim:", tex: `V = A_b h = ${c.T(V)}\\ ${c.U}^3` },
      { text: "Yanal alan:", tex: `L = nah = ${c.T(lat)}\\ ${c.U}^2` },
      { text: "Toplam yüzey alanı:", tex: `S = 2A_b + L = ${c.T(S)}\\ ${c.U}^2` }
    ],
    outline
  };
}

function frustum(input, c) {
  const R = num(input, "R", "Büyük yarıçap R", { positive: true });
  const r = num(input, "r", "Küçük yarıçap r", { positive: true });
  const h = num(input, "h", "Yükseklik h", { positive: true });
  const slant = Math.hypot(h, R - r);
  const V = (Math.PI * h * (R * R + R * r + r * r)) / 3;
  const lat = Math.PI * (R + r) * slant;
  const S = Math.PI * (R * R + r * r) + lat;
  return {
    V, S, lat,
    extras: [["Eğik yükseklik", `${fmt(slant, 6)} ${c.unit}`]],
    steps: [
      { text: "Eğik yükseklik:", tex: `l = \\sqrt{h^2+(R-r)^2} = ${c.T(slant)}\\ ${c.U}` },
      { text: "Hacim:", tex: `V = \\frac{\\pi h}{3}(R^2+Rr+r^2) = ${c.T(V)}\\ ${c.U}^3` },
      { text: "Yanal alan:", tex: `L = \\pi(R+r)l = ${c.T(lat)}\\ ${c.U}^2` },
      { text: "Toplam yüzey alanı:", tex: `S = \\pi(R^2+r^2) + \\pi(R+r)l = ${c.T(S)}\\ ${c.U}^2` }
    ],
    outline: [[-R, 0], [R, 0], [r, h], [-r, h]]
  };
}

function torus(input, c) {
  const R = num(input, "R", "Büyük yarıçap R", { positive: true });
  const r = num(input, "r", "Kesit yarıçapı r", { positive: true });
  if (R <= r) fail("Simitin kendini kesmemesi için büyük yarıçap R, kesit yarıçapı r'den büyük olmalıdır.", "R");
  const V = 2 * Math.PI * Math.PI * R * r * r, S = 4 * Math.PI * Math.PI * R * r;
  return {
    V, S, lat: null, extras: [],
    steps: [
      { text: "Hacim (Pappus teoremi):", tex: `V = 2\\pi^2 R r^2 = ${c.T(V)}\\ ${c.U}^3` },
      { text: "Yüzey alanı:", tex: `S = 4\\pi^2 R r = ${c.T(S)}\\ ${c.U}^2` }
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
  const unit = str(input, "unit", "Uzunluk birimi", { default: "cm" });
  const shape = choice(input, "shape", "Cisim", Object.keys(SOLID_LABELS), "cube");
  const c = ctxOf(unit);
  const r = FN[shape](input, c);
  const name = SOLID_LABELS[shape];
  const liters = unit === "cm" ? r.V / 1000 : unit === "m" ? r.V * 1000 : null;
  const results = [
    { label: "Hacim", value: c.V(r.V), text: c.V(r.V) },
    { label: "Toplam yüzey alanı", value: c.S(r.S), text: c.S(r.S) }
  ];
  if (r.lat !== null) results.push({ label: "Yanal alan", value: c.S(r.lat) });
  for (const [label, value] of r.extras) results.push({ label, value });
  const parts = [`Hacim = ${c.V(r.V)}`, `Yüzey alanı = ${c.S(r.S)}`];
  if (liters !== null) {
    results.push({ label: "Kapasite", value: `${fmt(liters, 6)} litre`, text: `${fmt(liters, 6)} litre` });
    parts.push(`Kapasite = ${fmt(liters, 6)} litre`);
  }
  const blocks = [{ type: "plot", title: `Şematik çizim: ${name}`, xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series: [{ name, points: [...r.outline, r.outline[0]], line: true }] }];
  return {
    results,
    steps: r.steps,
    blocks,
    copy: `${name}: ${parts.join("، ")}`
  };
}
