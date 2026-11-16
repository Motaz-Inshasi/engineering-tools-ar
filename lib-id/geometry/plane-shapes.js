import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, deg, tex as ntex } from "../core/format.js";

const TAU = 2 * Math.PI;

const SHAPE_LABELS = {
  square: "Persegi",
  rectangle: "Persegi panjang",
  triangle: "Segitiga",
  "right-triangle": "Segitiga siku-siku",
  circle: "Lingkaran",
  ellipse: "Elips",
  trapezoid: "Trapesium",
  parallelogram: "Jajar genjang",
  rhombus: "Belah ketupat",
  "regular-polygon": "Poligon beraturan",
  sector: "Juring lingkaran"
};

const blank = {
  shape: "", unit: "cm", s: "", rl: "", rw: "", tmode: "", tb: "", th: "", ta: "", tc: "", t1: "", t2: "", t3: "",
  ra: "", rb: "", cmode: "", cval: "", ea: "", eb: "", pa: "", pb: "", ph: "", pl1: "", pl2: "", qb: "", qs: "", qh: "",
  d1: "", d2: "", npoly: "", ns: "", sr: "", sang: ""
};

export const meta = {
  description: "Hitung luas dan keliling bangun datar yang umum, seperti persegi, persegi panjang, segitiga, lingkaran, elips, trapesium, belah ketupat, poligon beraturan, dan juring lingkaran, dengan sifat tambahan dan gambar diagram.",
  keywords: ["luas", "keliling", "Persegi panjang", "Segitiga", "Lingkaran", "Trapesium", "Belah ketupat", "Poligon beraturan", "Juring lingkaran", "area", "perimeter", "plane shapes"],
  formulas: [
    { label: "Luas persegi panjang", tex: "A = LW" },
    { label: "Luas segitiga", tex: "A = \\frac{1}{2}bh" },
    { label: "Luas lingkaran", tex: "A = \\pi r^2" },
    { label: "Luas poligon beraturan", tex: "A = \\frac{n s^2}{4\\tan(\\pi/n)}" }
  ],
  inputs: [
    { id: "shape", label: "Bentuk", type: "select", default: "rectangle", options: [["square", "Persegi"], ["rectangle", "Persegi panjang"], ["triangle", "Segitiga"], ["right-triangle", "Segitiga siku-siku"], ["circle", "Lingkaran"], ["ellipse", "Elips"], ["trapezoid", "Trapesium"], ["parallelogram", "Jajar genjang"], ["rhombus", "Belah ketupat"], ["regular-polygon", "Poligon beraturan"], ["sector", "Juring lingkaran"]] },
    { id: "unit", label: "Satuan panjang", type: "text", default: "cm", help: "Satuan hanya untuk tampilan; luas dalam satuan persegi." },
    { id: "s", label: "Panjang sisi s", type: "number", default: "5", when: { shape: ["square"] } },
    { id: "rl", label: "Panjang L", type: "number", default: "8", when: { shape: ["rectangle"] } },
    { id: "rw", label: "Lebar W", type: "number", default: "5", when: { shape: ["rectangle"] } },
    { id: "tmode", label: "Data segitiga", type: "select", default: "bh", options: [["bh", "Alas dan tinggi"], ["sss", "Ketiga sisi"]], when: { shape: ["triangle"] } },
    { id: "tb", label: "Alas b", type: "number", default: "10", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "th", label: "Tinggi h", type: "number", default: "4", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "ta", label: "Sisi kiri (opsional)", type: "number", when: { shape: ["triangle"], tmode: ["bh"] }, help: "Masukkan kedua sisi opsional bersama-sama untuk menghitung keliling." },
    { id: "tc", label: "Sisi kanan (opsional)", type: "number", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "t1", label: "Sisi pertama a", type: "number", default: "3", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "t2", label: "Sisi kedua b", type: "number", default: "4", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "t3", label: "Sisi ketiga c", type: "number", default: "5", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "ra", label: "Kaki pertama a", type: "number", default: "3", when: { shape: ["right-triangle"] } },
    { id: "rb", label: "Kaki kedua b", type: "number", default: "4", when: { shape: ["right-triangle"] } },
    { id: "cmode", label: "Diberikan", type: "select", default: "radius", options: [["radius", "Jari-jari"], ["diameter", "Diameter"]], when: { shape: ["circle"] } },
    { id: "cval", label: "Nilai", type: "number", default: "1", when: { shape: ["circle"] }, help: "Jari-jari atau diameter sesuai pilihan di atas." },
    { id: "ea", label: "Setengah sumbu mendatar a", type: "number", default: "5", when: { shape: ["ellipse"] } },
    { id: "eb", label: "Setengah sumbu tegak b", type: "number", default: "3", when: { shape: ["ellipse"] } },
    { id: "pa", label: "Alas atas a", type: "number", default: "4", when: { shape: ["trapezoid"] } },
    { id: "pb", label: "Alas bawah b", type: "number", default: "10", when: { shape: ["trapezoid"] } },
    { id: "ph", label: "Tinggi h", type: "number", default: "3", when: { shape: ["trapezoid"] } },
    { id: "pl1", label: "Kaki pertama (opsional)", type: "number", when: { shape: ["trapezoid"] } },
    { id: "pl2", label: "Kaki kedua (opsional)", type: "number", when: { shape: ["trapezoid"] }, help: "Masukkan kedua kaki bersama-sama untuk menghitung keliling." },
    { id: "qb", label: "Alas b", type: "number", default: "10", when: { shape: ["parallelogram"] } },
    { id: "qs", label: "Sisi miring s", type: "number", default: "6", when: { shape: ["parallelogram"] } },
    { id: "qh", label: "Tinggi h", type: "number", default: "4", when: { shape: ["parallelogram"] }, help: "Tinggi tegak lurus alas dan tidak melebihi sisi miring." },
    { id: "d1", label: "Diagonal pertama d1", type: "number", default: "6", when: { shape: ["rhombus"] } },
    { id: "d2", label: "Diagonal kedua d2", type: "number", default: "8", when: { shape: ["rhombus"] } },
    { id: "npoly", label: "Jumlah sisi n", type: "number", default: "6", when: { shape: ["regular-polygon"] } },
    { id: "ns", label: "Panjang sisi s", type: "number", default: "2", when: { shape: ["regular-polygon"] } },
    { id: "sr", label: "Jari-jari r", type: "number", default: "2", when: { shape: ["sector"] } },
    { id: "sang", label: "Sudut θ (dalam derajat)", type: "number", default: "90", when: { shape: ["sector"] }, help: "Dari 0 hingga 360 derajat." }
  ],
  example: { values: { ...blank, shape: "rectangle", unit: "cm", rl: "8", rw: "5" }, expect: ["40 cm²", "26 cm"], note: "Contoh: persegi panjang dengan panjang 8 cm dan lebar 5 cm." },
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
  const s = num(input, "s", "Panjang sisi", { positive: true });
  const area = s * s, perimeter = 4 * s, d = s * Math.SQRT2;
  return {
    area, perimeter,
    extras: [["Panjang diagonal", c.L(d)]],
    steps: [
      { text: "Luas:", tex: `A = s^2 = ${c.T(s)}^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Keliling:", tex: `P = 4s = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Panjang diagonal:", tex: `d = s\\sqrt{2} = ${c.T(d)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [s, 0], [s, s], [0, s]]
  };
}

function rectangle(input, c) {
  const L = num(input, "rl", "Panjang L", { positive: true });
  const W = num(input, "rw", "Lebar W", { positive: true });
  const area = L * W, perimeter = 2 * (L + W), d = Math.hypot(L, W);
  return {
    area, perimeter,
    extras: [["Panjang diagonal", c.L(d)]],
    steps: [
      { text: "Luas:", tex: `A = LW = ${c.T(L)} \\times ${c.T(W)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Keliling:", tex: `P = 2(L+W) = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Panjang diagonal:", tex: `d = \\sqrt{L^2+W^2} = ${c.T(d)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [L, 0], [L, W], [0, W]]
  };
}

function triangleBaseHeight(input, c) {
  const b = num(input, "tb", "Alas b", { positive: true });
  const h = num(input, "th", "Tinggi h", { positive: true });
  const ta = num(input, "ta", "Sisi kiri", { positive: true, optional: true });
  const tc = num(input, "tc", "Sisi kanan", { positive: true, optional: true });
  const area = (b * h) / 2;
  let x = b / 2, perimeter = null;
  const steps = [{ text: "Luas:", tex: `A = \\frac{bh}{2} = \\frac{${c.T(b)} \\times ${c.T(h)}}{2} = ${c.T(area)}\\ ${c.U}^2` }];
  if (ta !== null || tc !== null) {
    if (ta === null || tc === null) fail("Masukkan kedua sisi opsional bersama-sama untuk menghitung keliling, atau biarkan kosong.", ta === null ? "ta" : "tc");
    if (ta + tc <= b || Math.abs(ta - tc) >= b) fail("Sisi yang dimasukkan tidak membentuk segitiga dengan alas ini.", "ta");
    const s = (b + ta + tc) / 2;
    const heron = Math.sqrt(s * (s - b) * (s - ta) * (s - tc));
    if (Math.abs((2 * heron) / b - h) > 1e-6 * h) fail("Tinggi h tidak sesuai dengan sisi yang dimasukkan.", "th");
    x = (b * b + ta * ta - tc * tc) / (2 * b);
    perimeter = b + ta + tc;
    steps.push({ text: "Keliling:", tex: `P = b + a + c = ${c.T(perimeter)}\\ ${c.U}` });
  }
  return {
    area, perimeter, extras: [], steps,
    outline: [[0, 0], [b, 0], [x, h]]
  };
}

function triangleSides(input, c) {
  const a = num(input, "t1", "Sisi pertama a", { positive: true });
  const b = num(input, "t2", "Sisi kedua b", { positive: true });
  const k = num(input, "t3", "Sisi ketiga c", { positive: true });
  if (a + b <= k || a + k <= b || b + k <= a) fail("Ketiga sisi tidak membentuk segitiga: jumlah dua sisi mana pun harus lebih besar dari sisi ketiga.", "t3");
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
      ["Tinggi (pada a, b, c)", `${c.L(ha)}، ${c.L(hb)}، ${c.L(hc)}`],
      ["Sudut (dalam derajat)", `${fmt(angA, 4)}°، ${fmt(angB, 4)}°، ${fmt(angC, 4)}°`]
    ],
    steps: [
      { text: "Setengah keliling:", tex: `s = \\frac{a+b+c}{2} = ${c.T(s)}` },
      { text: "Luas Heron:", tex: `A = \\sqrt{s(s-a)(s-b)(s-c)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Keliling:", tex: `P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Sudut di depan a dengan aturan cosinus:", tex: `\\cos A = \\frac{b^2+c^2-a^2}{2bc} \\Rightarrow A = ${fmt(angA, 4)}^\\circ` }
    ],
    outline: [[0, 0], [a, 0], [x, y]]
  };
}

function rightTriangle(input, c) {
  const a = num(input, "ra", "Kaki pertama a", { positive: true });
  const b = num(input, "rb", "Kaki kedua b", { positive: true });
  const hyp = Math.hypot(a, b);
  const area = (a * b) / 2, perimeter = a + b + hyp, alt = (a * b) / hyp;
  const angA = deg(Math.atan(b / a)), angB = 90 - angA;
  return {
    area, perimeter,
    extras: [
      ["Hipotenusa", c.L(hyp)],
      ["Tinggi pada hipotenusa", c.L(alt)],
      ["Dua sudut lancip", `${fmt(angA, 4)}° dan ${fmt(angB, 4)}°`]
    ],
    steps: [
      { text: "Luas:", tex: `A = \\frac{ab}{2} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Hipotenusa (Pythagoras):", tex: `c = \\sqrt{a^2+b^2} = ${c.T(hyp)}\\ ${c.U}` },
      { text: "Keliling:", tex: `P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Tinggi pada hipotenusa:", tex: `h = \\frac{ab}{c} = ${c.T(alt)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [a, 0], [0, b]]
  };
}

function circle(input, c) {
  const mode = choice(input, "cmode", "Diberikan", ["radius", "diameter"], "radius");
  const v = num(input, "cval", "Nilai", { positive: true });
  const r = mode === "diameter" ? v / 2 : v;
  const area = Math.PI * r * r, perimeter = TAU * r;
  return {
    area, perimeter,
    extras: [["Jari-jari", c.L(r)], ["Diameter", c.L(2 * r)]],
    steps: [
      { text: "Jari-jari:", tex: `r = ${c.T(r)}\\ ${c.U}` },
      { text: "Luas:", tex: `A = \\pi r^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Keliling:", tex: `P = 2\\pi r = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: arcPoints(r, 0, TAU, 180),
    extra: [{ name: "Pusat", points: [[0, 0]], marker: "x", line: false }]
  };
}

function ellipse(input, c) {
  const a = num(input, "ea", "Setengah sumbu mendatar a", { positive: true });
  const b = num(input, "eb", "Setengah sumbu tegak b", { positive: true });
  const area = Math.PI * a * b;
  const perimeter = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  const outline = [];
  for (let i = 0; i <= 180; i++) {
    const t = (TAU * i) / 180;
    outline.push([a * Math.cos(t), b * Math.sin(t)]);
  }
  return {
    area, perimeter,
    extras: [["Sumbu panjang", c.L(2 * Math.max(a, b))], ["Sumbu pendek", c.L(2 * Math.min(a, b))]],
    steps: [
      { text: "Luas:", tex: `A = \\pi ab = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Keliling (pendekatan Ramanujan kedua):", tex: `P \\approx \\pi\\left[3(a+b)-\\sqrt{(3a+b)(a+3b)}\\right] = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline
  };
}

function trapezoid(input, c) {
  const a = num(input, "pa", "Alas atas a", { positive: true });
  const b = num(input, "pb", "Alas bawah b", { positive: true });
  const h = num(input, "ph", "Tinggi h", { positive: true });
  const l1 = num(input, "pl1", "Kaki pertama", { positive: true, optional: true });
  const l2 = num(input, "pl2", "Kaki kedua", { positive: true, optional: true });
  if ((l1 === null) !== (l2 === null)) fail("Masukkan kedua kaki bersama-sama untuk menghitung keliling, atau biarkan kosong.", l1 === null ? "pl1" : "pl2");
  const area = ((a + b) / 2) * h;
  const d = b - a;
  let p = d / 2, perimeter = null;
  if (l1 !== null) {
    if (l1 < h || l2 < h) fail("Panjang kaki tidak boleh lebih kecil dari tinggi.", l1 < h ? "pl1" : "pl2");
    const p1 = Math.sqrt(l1 * l1 - h * h);
    const fits = [p1, -p1].filter((q) => Math.abs((d - q) * (d - q) + h * h - l2 * l2) <= 1e-6 * l2 * l2);
    if (fits.length === 0) fail("Sisi yang dimasukkan tidak membentuk trapesium dengan kedua alas dan tinggi ini.", "pl2");
    p = fits[0];
    perimeter = a + b + l1 + l2;
  }
  return {
    area, perimeter,
    extras: [["Alas tengah", c.L((a + b) / 2)]],
    steps: [
      { text: "Luas:", tex: `A = \\frac{(a+b)h}{2} = \\frac{(${c.T(a)}+${c.T(b)}) \\times ${c.T(h)}}{2} = ${c.T(area)}\\ ${c.U}^2` },
      ...(perimeter === null ? [] : [{ text: "Keliling:", tex: `P = a+b+c_1+c_2 = ${c.T(perimeter)}\\ ${c.U}` }])
    ],
    outline: [[0, 0], [b, 0], [p + a, h], [p, h]]
  };
}

function parallelogram(input, c) {
  const b = num(input, "qb", "Alas b", { positive: true });
  const s = num(input, "qs", "Sisi miring s", { positive: true });
  const h = num(input, "qh", "Tinggi h", { positive: true });
  if (h > s) fail("Tinggi tidak boleh melebihi sisi miring.", "qh");
  const area = b * h, perimeter = 2 * (b + s), x = Math.sqrt(s * s - h * h);
  const d1 = Math.hypot(b + x, h), d2 = Math.hypot(b - x, h);
  return {
    area, perimeter,
    extras: [["Diagonal panjang", c.L(Math.max(d1, d2))], ["Diagonal pendek", c.L(Math.min(d1, d2))]],
    steps: [
      { text: "Luas:", tex: `A = bh = ${c.T(b)} \\times ${c.T(h)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Keliling:", tex: `P = 2(b+s) = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Pergeseran mendatar sisi miring:", tex: `x = \\sqrt{s^2-h^2} = ${c.T(x)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [b, 0], [b + x, h], [x, h]]
  };
}

function rhombus(input, c) {
  const d1 = num(input, "d1", "Diagonal pertama d1", { positive: true });
  const d2 = num(input, "d2", "Diagonal kedua d2", { positive: true });
  const area = (d1 * d2) / 2, side = Math.hypot(d1 / 2, d2 / 2), perimeter = 4 * side;
  return {
    area, perimeter,
    extras: [["Panjang sisi", c.L(side)]],
    steps: [
      { text: "Luas dari kedua diagonal:", tex: `A = \\frac{d_1 d_2}{2} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Sisi (Pythagoras pada setengah diagonal):", tex: `s = \\sqrt{(d_1/2)^2+(d_2/2)^2} = ${c.T(side)}\\ ${c.U}` },
      { text: "Keliling:", tex: `P = 4s = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: [[d1 / 2, 0], [0, d2 / 2], [-d1 / 2, 0], [0, -d2 / 2]]
  };
}

function regularPolygon(input, c) {
  const n = num(input, "npoly", "Jumlah sisi n", { integer: true, min: 3, max: 10000 });
  const s = num(input, "ns", "Panjang sisi s", { positive: true });
  const t = Math.PI / n;
  const area = (n * s * s) / (4 * Math.tan(t)), perimeter = n * s;
  const apothem = s / (2 * Math.tan(t)), R = s / (2 * Math.sin(t)), interior = ((n - 2) * 180) / n;
  const outline = [];
  for (let k = 0; k < n; k++) outline.push([R * Math.cos((TAU * k) / n), R * Math.sin((TAU * k) / n)]);
  return {
    area, perimeter,
    extras: [
      ["Jari-jari lingkaran dalam (apotema)", c.L(apothem)],
      ["Jari-jari lingkaran luar", c.L(R)],
      ["Sudut dalam (derajat)", `${fmt(interior, 6)}°`]
    ],
    steps: [
      { text: "Luas:", tex: `A = \\frac{n s^2}{4\\tan(\\pi/n)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Keliling:", tex: `P = ns = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Jari-jari lingkaran dalam:", tex: `a = \\frac{s}{2\\tan(\\pi/n)} = ${c.T(apothem)}\\ ${c.U}` },
      { text: "Jari-jari lingkaran luar:", tex: `R = \\frac{s}{2\\sin(\\pi/n)} = ${c.T(R)}\\ ${c.U}` }
    ],
    outline
  };
}

function sector(input, c) {
  const r = num(input, "sr", "Jari-jari r", { positive: true });
  const deg0 = num(input, "sang", "Sudut θ", { positive: true, max: 360 });
  const th = (deg0 * Math.PI) / 180;
  const area = (r * r * th) / 2, arc = r * th, perimeter = 2 * r + arc;
  return {
    area, perimeter,
    extras: [["Panjang busur", c.L(arc)], ["Sudut dalam radian", `${fmt(th, 6)}`]],
    steps: [
      { text: "Sudut dalam radian:", tex: `\\theta = \\frac{${c.T(deg0)}\\pi}{180} = ${c.T(th)}` },
      { text: "Luas:", tex: `A = \\frac{1}{2}r^2\\theta = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Panjang busur:", tex: `L = r\\theta = ${c.T(arc)}\\ ${c.U}` },
      { text: "Keliling (dua jari-jari dan busur):", tex: `P = 2r + r\\theta = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: [[0, 0], ...arcPoints(r, 0, th, 90)]
  };
}

function triangle(input, c) {
  const mode = choice(input, "tmode", "Data segitiga", ["bh", "sss"], "bh");
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
  const unit = str(input, "unit", "Satuan panjang", { default: "cm" });
  const shape = choice(input, "shape", "Bentuk", Object.keys(SHAPE_LABELS), "rectangle");
  const c = ctxOf(unit);
  const r = FN[shape](input, c);
  const name = SHAPE_LABELS[shape];
  const results = [{ label: "Luas", value: c.A(r.area), text: c.A(r.area) }];
  const parts = [`Luas = ${c.A(r.area)}`];
  if (r.perimeter !== null) {
    results.push({ label: "Keliling", value: c.L(r.perimeter), text: c.L(r.perimeter) });
    parts.push(`Keliling = ${c.L(r.perimeter)}`);
  }
  for (const [label, value] of r.extras) results.push({ label, value });
  const series = [{ name, points: closed(r.outline), ...(r.outline.length <= 12 ? { marker: "o" } : {}), line: true }, ...(r.extra || [])];
  const blocks = [{ type: "plot", title: `Gambar ${name}`, xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series }];
  return {
    results,
    steps: r.steps,
    blocks,
    copy: `${name}: ${parts.join("، ")}`
  };
}
