import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, deg, tex as ntex } from "../core/format.js";

const TAU = 2 * Math.PI;

const SHAPE_LABELS = {
  square: "مربع",
  rectangle: "مستطیل",
  triangle: "مثلث",
  "right-triangle": "قائمۃ الزاویہ مثلث",
  circle: "دائرہ",
  ellipse: "بیضوی (اہلیلج)",
  trapezoid: "ذوزنقہ",
  parallelogram: "متوازی الاضلاع",
  rhombus: "لوزی",
  "regular-polygon": "منتظم کثیرالاضلاع",
  sector: "دائرے کا قطاع"
};

const blank = {
  shape: "", unit: "cm", s: "", rl: "", rw: "", tmode: "", tb: "", th: "", ta: "", tc: "", t1: "", t2: "", t3: "",
  ra: "", rb: "", cmode: "", cval: "", ea: "", eb: "", pa: "", pb: "", ph: "", pl1: "", pl2: "", qb: "", qs: "", qh: "",
  d1: "", d2: "", npoly: "", ns: "", sr: "", sang: ""
};

export const meta = {
  description: "عام مستوی اشکال، جیسے مربع، مستطیل، مثلث، دائرہ، بیضوی، ذوزنقہ، متوازی الاضلاع، لوزی، منتظم کثیرالاضلاع اور دائرے کا قطاع، کا رقبہ اور محیط حساب کریں، ساتھ اضافی خواص اور خاکے کی تصویر۔",
  keywords: ["رقبہ", "محیط", "مستطیل", "مثلث", "دائرہ", "ذوزنقہ", "لوزی", "منتظم کثیرالاضلاع", "دائرے کا قطاع", "area", "perimeter", "plane shapes"],
  formulas: [
    { label: "مستطیل کا رقبہ", tex: "A = LW" },
    { label: "مثلث کا رقبہ", tex: "A = \\frac{1}{2}bh" },
    { label: "دائرے کا رقبہ", tex: "A = \\pi r^2" },
    { label: "منتظم کثیرالاضلاع کا رقبہ", tex: "A = \\frac{n s^2}{4\\tan(\\pi/n)}" }
  ],
  inputs: [
    { id: "shape", label: "شکل", type: "select", default: "rectangle", options: [["square", "مربع"], ["rectangle", "مستطیل"], ["triangle", "مثلث"], ["right-triangle", "قائمۃ الزاویہ مثلث"], ["circle", "دائرہ"], ["ellipse", "بیضوی (اہلیلج)"], ["trapezoid", "ذوزنقہ"], ["parallelogram", "متوازی الاضلاع"], ["rhombus", "لوزی"], ["regular-polygon", "منتظم کثیرالاضلاع"], ["sector", "دائرے کا قطاع"]] },
    { id: "unit", label: "لمبائی کی اکائی", type: "text", default: "cm", help: "اکائی صرف ڈسپلے کے لیے ہے؛ رقبہ مربع اکائی میں ہوتا ہے۔" },
    { id: "s", label: "ضلع کی لمبائی s", type: "number", default: "5", when: { shape: ["square"] } },
    { id: "rl", label: "لمبائی L", type: "number", default: "8", when: { shape: ["rectangle"] } },
    { id: "rw", label: "چوڑائی W", type: "number", default: "5", when: { shape: ["rectangle"] } },
    { id: "tmode", label: "مثلث کا ڈیٹا", type: "select", default: "bh", options: [["bh", "قاعدہ اور اونچائی"], ["sss", "تین اضلاع"]], when: { shape: ["triangle"] } },
    { id: "tb", label: "قاعدہ b", type: "number", default: "10", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "th", label: "اونچائی h", type: "number", default: "4", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "ta", label: "بایاں ضلع (اختیاری)", type: "number", when: { shape: ["triangle"], tmode: ["bh"] }, help: "محیط کے حساب کے لیے دونوں اختیاری اضلاع اکٹھے درج کریں۔" },
    { id: "tc", label: "دایاں ضلع (اختیاری)", type: "number", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "t1", label: "پہلا ضلع a", type: "number", default: "3", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "t2", label: "دوسرا ضلع b", type: "number", default: "4", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "t3", label: "تیسرا ضلع c", type: "number", default: "5", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "ra", label: "پہلی قائم ضلع a", type: "number", default: "3", when: { shape: ["right-triangle"] } },
    { id: "rb", label: "دوسری قائم ضلع b", type: "number", default: "4", when: { shape: ["right-triangle"] } },
    { id: "cmode", label: "دیا گیا", type: "select", default: "radius", options: [["radius", "نصف قطر"], ["diameter", "قطر"]], when: { shape: ["circle"] } },
    { id: "cval", label: "قدر", type: "number", default: "1", when: { shape: ["circle"] }, help: "اوپر کے انتخاب کے مطابق نصف قطر یا قطر۔" },
    { id: "ea", label: "افقی نصف محور a", type: "number", default: "5", when: { shape: ["ellipse"] } },
    { id: "eb", label: "عمودی نصف محور b", type: "number", default: "3", when: { shape: ["ellipse"] } },
    { id: "pa", label: "بالائی قاعدہ a", type: "number", default: "4", when: { shape: ["trapezoid"] } },
    { id: "pb", label: "زیریں قاعدہ b", type: "number", default: "10", when: { shape: ["trapezoid"] } },
    { id: "ph", label: "اونچائی h", type: "number", default: "3", when: { shape: ["trapezoid"] } },
    { id: "pl1", label: "پہلی ساق (اختیاری)", type: "number", when: { shape: ["trapezoid"] } },
    { id: "pl2", label: "دوسری ساق (اختیاری)", type: "number", when: { shape: ["trapezoid"] }, help: "محیط کے حساب کے لیے دونوں ساقیں اکٹھی درج کریں۔" },
    { id: "qb", label: "قاعدہ b", type: "number", default: "10", when: { shape: ["parallelogram"] } },
    { id: "qs", label: "مائل ضلع s", type: "number", default: "6", when: { shape: ["parallelogram"] } },
    { id: "qh", label: "اونچائی h", type: "number", default: "4", when: { shape: ["parallelogram"] }, help: "اونچائی قاعدے پر عمود ہے اور مائل ضلع سے زیادہ نہیں ہو سکتی۔" },
    { id: "d1", label: "پہلا وتر d1", type: "number", default: "6", when: { shape: ["rhombus"] } },
    { id: "d2", label: "دوسرا وتر d2", type: "number", default: "8", when: { shape: ["rhombus"] } },
    { id: "npoly", label: "اضلاع کی تعداد n", type: "number", default: "6", when: { shape: ["regular-polygon"] } },
    { id: "ns", label: "ضلع کی لمبائی s", type: "number", default: "2", when: { shape: ["regular-polygon"] } },
    { id: "sr", label: "نصف قطر r", type: "number", default: "2", when: { shape: ["sector"] } },
    { id: "sang", label: "زاویہ θ (ڈگری میں)", type: "number", default: "90", when: { shape: ["sector"] }, help: "0 سے 360 ڈگری تک۔" }
  ],
  example: { values: { ...blank, shape: "rectangle", unit: "cm", rl: "8", rw: "5" }, expect: ["40 cm²", "26 cm"], note: "مثال: 8 cm لمبا اور 5 cm چوڑا مستطیل۔" },
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
  const s = num(input, "s", "ضلع کی لمبائی", { positive: true });
  const area = s * s, perimeter = 4 * s, d = s * Math.SQRT2;
  return {
    area, perimeter,
    extras: [["قطر", c.L(d)]],
    steps: [
      { text: "رقبہ:", tex: `A = s^2 = ${c.T(s)}^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "محیط:", tex: `P = 4s = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "قطر:", tex: `d = s\\sqrt{2} = ${c.T(d)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [s, 0], [s, s], [0, s]]
  };
}

function rectangle(input, c) {
  const L = num(input, "rl", "لمبائی L", { positive: true });
  const W = num(input, "rw", "چوڑائی W", { positive: true });
  const area = L * W, perimeter = 2 * (L + W), d = Math.hypot(L, W);
  return {
    area, perimeter,
    extras: [["قطر", c.L(d)]],
    steps: [
      { text: "رقبہ:", tex: `A = LW = ${c.T(L)} \\times ${c.T(W)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "محیط:", tex: `P = 2(L+W) = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "قطر:", tex: `d = \\sqrt{L^2+W^2} = ${c.T(d)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [L, 0], [L, W], [0, W]]
  };
}

function triangleBaseHeight(input, c) {
  const b = num(input, "tb", "قاعدہ b", { positive: true });
  const h = num(input, "th", "اونچائی h", { positive: true });
  const ta = num(input, "ta", "بایاں ضلع", { positive: true, optional: true });
  const tc = num(input, "tc", "دایاں ضلع", { positive: true, optional: true });
  const area = (b * h) / 2;
  let x = b / 2, perimeter = null;
  const steps = [{ text: "رقبہ:", tex: `A = \\frac{bh}{2} = \\frac{${c.T(b)} \\times ${c.T(h)}}{2} = ${c.T(area)}\\ ${c.U}^2` }];
  if (ta !== null || tc !== null) {
    if (ta === null || tc === null) fail("محیط کے حساب کے لیے دونوں اختیاری اضلاع اکٹھے درج کریں، یا انہیں خالی چھوڑ دیں۔", ta === null ? "ta" : "tc");
    if (ta + tc <= b || Math.abs(ta - tc) >= b) fail("درج کردہ اضلاع اس قاعدے کے ساتھ مثلث نہیں بناتے۔", "ta");
    const s = (b + ta + tc) / 2;
    const heron = Math.sqrt(s * (s - b) * (s - ta) * (s - tc));
    if (Math.abs((2 * heron) / b - h) > 1e-6 * h) fail("اونچائی h درج کردہ اضلاع سے مطابقت نہیں رکھتی۔", "th");
    x = (b * b + ta * ta - tc * tc) / (2 * b);
    perimeter = b + ta + tc;
    steps.push({ text: "محیط:", tex: `P = b + a + c = ${c.T(perimeter)}\\ ${c.U}` });
  }
  return {
    area, perimeter, extras: [], steps,
    outline: [[0, 0], [b, 0], [x, h]]
  };
}

function triangleSides(input, c) {
  const a = num(input, "t1", "پہلا ضلع a", { positive: true });
  const b = num(input, "t2", "دوسرا ضلع b", { positive: true });
  const k = num(input, "t3", "تیسرا ضلع c", { positive: true });
  if (a + b <= k || a + k <= b || b + k <= a) fail("تین اضلاع مثلث نہیں بناتے: کوئی بھی دو اضلاع کا مجموعہ تیسرے ضلع سے زیادہ ہونا چاہیے۔", "t3");
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
      ["اونچائیاں (a، b، c پر)", `${c.L(ha)}، ${c.L(hb)}، ${c.L(hc)}`],
      ["زاویے (ڈگری میں)", `${fmt(angA, 4)}°، ${fmt(angB, 4)}°، ${fmt(angC, 4)}°`]
    ],
    steps: [
      { text: "نصف محیط:", tex: `s = \\frac{a+b+c}{2} = ${c.T(s)}` },
      { text: "ہیرون کا رقبہ:", tex: `A = \\sqrt{s(s-a)(s-b)(s-c)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "محیط:", tex: `P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "ضلع a کے مقابل زاویہ کوسائن کے قانون سے:", tex: `\\cos A = \\frac{b^2+c^2-a^2}{2bc} \\Rightarrow A = ${fmt(angA, 4)}^\\circ` }
    ],
    outline: [[0, 0], [a, 0], [x, y]]
  };
}

function rightTriangle(input, c) {
  const a = num(input, "ra", "پہلی قائم ضلع a", { positive: true });
  const b = num(input, "rb", "دوسری قائم ضلع b", { positive: true });
  const hyp = Math.hypot(a, b);
  const area = (a * b) / 2, perimeter = a + b + hyp, alt = (a * b) / hyp;
  const angA = deg(Math.atan(b / a)), angB = 90 - angA;
  return {
    area, perimeter,
    extras: [
      ["وتر", c.L(hyp)],
      ["وتر پر اونچائی", c.L(alt)],
      ["دونوں حادہ زاویے", `${fmt(angA, 4)}° اور ${fmt(angB, 4)}°`]
    ],
    steps: [
      { text: "رقبہ:", tex: `A = \\frac{ab}{2} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "وتر (فیثاغورس):", tex: `c = \\sqrt{a^2+b^2} = ${c.T(hyp)}\\ ${c.U}` },
      { text: "محیط:", tex: `P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "وتر پر اونچائی:", tex: `h = \\frac{ab}{c} = ${c.T(alt)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [a, 0], [0, b]]
  };
}

function circle(input, c) {
  const mode = choice(input, "cmode", "دیا گیا", ["radius", "diameter"], "radius");
  const v = num(input, "cval", "قدر", { positive: true });
  const r = mode === "diameter" ? v / 2 : v;
  const area = Math.PI * r * r, perimeter = TAU * r;
  return {
    area, perimeter,
    extras: [["نصف قطر", c.L(r)], ["قطر", c.L(2 * r)]],
    steps: [
      { text: "نصف قطر:", tex: `r = ${c.T(r)}\\ ${c.U}` },
      { text: "رقبہ:", tex: `A = \\pi r^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "محیط:", tex: `P = 2\\pi r = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: arcPoints(r, 0, TAU, 180),
    extra: [{ name: "مرکز", points: [[0, 0]], marker: "x", line: false }]
  };
}

function ellipse(input, c) {
  const a = num(input, "ea", "افقی نصف محور a", { positive: true });
  const b = num(input, "eb", "عمودی نصف محور b", { positive: true });
  const area = Math.PI * a * b;
  const perimeter = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  const outline = [];
  for (let i = 0; i <= 180; i++) {
    const t = (TAU * i) / 180;
    outline.push([a * Math.cos(t), b * Math.sin(t)]);
  }
  return {
    area, perimeter,
    extras: [["بڑا محور", c.L(2 * Math.max(a, b))], ["چھوٹا محور", c.L(2 * Math.min(a, b))]],
    steps: [
      { text: "رقبہ:", tex: `A = \\pi ab = ${c.T(area)}\\ ${c.U}^2` },
      { text: "محیط (رامانوجن کا دوسرا تخمینہ):", tex: `P \\approx \\pi\\left[3(a+b)-\\sqrt{(3a+b)(a+3b)}\\right] = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline
  };
}

function trapezoid(input, c) {
  const a = num(input, "pa", "بالائی قاعدہ a", { positive: true });
  const b = num(input, "pb", "زیریں قاعدہ b", { positive: true });
  const h = num(input, "ph", "اونچائی h", { positive: true });
  const l1 = num(input, "pl1", "پہلی ساق", { positive: true, optional: true });
  const l2 = num(input, "pl2", "دوسری ساق", { positive: true, optional: true });
  if ((l1 === null) !== (l2 === null)) fail("محیط کے حساب کے لیے دونوں ساقیں اکٹھی درج کریں، یا انہیں خالی چھوڑ دیں۔", l1 === null ? "pl1" : "pl2");
  const area = ((a + b) / 2) * h;
  const d = b - a;
  let p = d / 2, perimeter = null;
  if (l1 !== null) {
    if (l1 < h || l2 < h) fail("ساق کی لمبائی اونچائی سے کم نہیں ہو سکتی۔", l1 < h ? "pl1" : "pl2");
    const p1 = Math.sqrt(l1 * l1 - h * h);
    const fits = [p1, -p1].filter((q) => Math.abs((d - q) * (d - q) + h * h - l2 * l2) <= 1e-6 * l2 * l2);
    if (fits.length === 0) fail("درج کردہ اضلاع ان دو قاعدوں اور اس اونچائی کے ساتھ ذوزنقہ نہیں بناتے۔", "pl2");
    p = fits[0];
    perimeter = a + b + l1 + l2;
  }
  return {
    area, perimeter,
    extras: [["وسطی قاعدہ", c.L((a + b) / 2)]],
    steps: [
      { text: "رقبہ:", tex: `A = \\frac{(a+b)h}{2} = \\frac{(${c.T(a)}+${c.T(b)}) \\times ${c.T(h)}}{2} = ${c.T(area)}\\ ${c.U}^2` },
      ...(perimeter === null ? [] : [{ text: "محیط:", tex: `P = a+b+c_1+c_2 = ${c.T(perimeter)}\\ ${c.U}` }])
    ],
    outline: [[0, 0], [b, 0], [p + a, h], [p, h]]
  };
}

function parallelogram(input, c) {
  const b = num(input, "qb", "قاعدہ b", { positive: true });
  const s = num(input, "qs", "مائل ضلع s", { positive: true });
  const h = num(input, "qh", "اونچائی h", { positive: true });
  if (h > s) fail("اونچائی مائل ضلع سے زیادہ نہیں ہو سکتی۔", "qh");
  const area = b * h, perimeter = 2 * (b + s), x = Math.sqrt(s * s - h * h);
  const d1 = Math.hypot(b + x, h), d2 = Math.hypot(b - x, h);
  return {
    area, perimeter,
    extras: [["لمبا وتر", c.L(Math.max(d1, d2))], ["چھوٹا وتر", c.L(Math.min(d1, d2))]],
    steps: [
      { text: "رقبہ:", tex: `A = bh = ${c.T(b)} \\times ${c.T(h)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "محیط:", tex: `P = 2(b+s) = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "مائل ضلع کا افقی انحراف:", tex: `x = \\sqrt{s^2-h^2} = ${c.T(x)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [b, 0], [b + x, h], [x, h]]
  };
}

function rhombus(input, c) {
  const d1 = num(input, "d1", "پہلا وتر d1", { positive: true });
  const d2 = num(input, "d2", "دوسرا وتر d2", { positive: true });
  const area = (d1 * d2) / 2, side = Math.hypot(d1 / 2, d2 / 2), perimeter = 4 * side;
  return {
    area, perimeter,
    extras: [["ضلع کی لمبائی", c.L(side)]],
    steps: [
      { text: "دونوں اوتار سے رقبہ:", tex: `A = \\frac{d_1 d_2}{2} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "ضلع (نصف اوتار پر فیثاغورس):", tex: `s = \\sqrt{(d_1/2)^2+(d_2/2)^2} = ${c.T(side)}\\ ${c.U}` },
      { text: "محیط:", tex: `P = 4s = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: [[d1 / 2, 0], [0, d2 / 2], [-d1 / 2, 0], [0, -d2 / 2]]
  };
}

function regularPolygon(input, c) {
  const n = num(input, "npoly", "اضلاع کی تعداد n", { integer: true, min: 3, max: 10000 });
  const s = num(input, "ns", "ضلع کی لمبائی s", { positive: true });
  const t = Math.PI / n;
  const area = (n * s * s) / (4 * Math.tan(t)), perimeter = n * s;
  const apothem = s / (2 * Math.tan(t)), R = s / (2 * Math.sin(t)), interior = ((n - 2) * 180) / n;
  const outline = [];
  for (let k = 0; k < n; k++) outline.push([R * Math.cos((TAU * k) / n), R * Math.sin((TAU * k) / n)]);
  return {
    area, perimeter,
    extras: [
      ["اندرونی دائرے کا نصف قطر (ایپوتھم)", c.L(apothem)],
      ["بیرونی دائرے کا نصف قطر", c.L(R)],
      ["اندرونی زاویہ (ڈگری)", `${fmt(interior, 6)}°`]
    ],
    steps: [
      { text: "رقبہ:", tex: `A = \\frac{n s^2}{4\\tan(\\pi/n)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "محیط:", tex: `P = ns = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "اندرونی دائرے کا نصف قطر:", tex: `a = \\frac{s}{2\\tan(\\pi/n)} = ${c.T(apothem)}\\ ${c.U}` },
      { text: "بیرونی دائرے کا نصف قطر:", tex: `R = \\frac{s}{2\\sin(\\pi/n)} = ${c.T(R)}\\ ${c.U}` }
    ],
    outline
  };
}

function sector(input, c) {
  const r = num(input, "sr", "نصف قطر r", { positive: true });
  const deg0 = num(input, "sang", "زاویہ θ", { positive: true, max: 360 });
  const th = (deg0 * Math.PI) / 180;
  const area = (r * r * th) / 2, arc = r * th, perimeter = 2 * r + arc;
  return {
    area, perimeter,
    extras: [["کمان کی لمبائی", c.L(arc)], ["ریڈیئن میں زاویہ", `${fmt(th, 6)}`]],
    steps: [
      { text: "ریڈیئن میں زاویہ:", tex: `\\theta = \\frac{${c.T(deg0)}\\pi}{180} = ${c.T(th)}` },
      { text: "رقبہ:", tex: `A = \\frac{1}{2}r^2\\theta = ${c.T(area)}\\ ${c.U}^2` },
      { text: "کمان کی لمبائی:", tex: `L = r\\theta = ${c.T(arc)}\\ ${c.U}` },
      { text: "محیط (دو نصف قطر اور کمان):", tex: `P = 2r + r\\theta = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: [[0, 0], ...arcPoints(r, 0, th, 90)]
  };
}

function triangle(input, c) {
  const mode = choice(input, "tmode", "مثلث کا ڈیٹا", ["bh", "sss"], "bh");
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
  const unit = str(input, "unit", "لمبائی کی اکائی", { default: "cm" });
  const shape = choice(input, "shape", "شکل", Object.keys(SHAPE_LABELS), "rectangle");
  const c = ctxOf(unit);
  const r = FN[shape](input, c);
  const name = SHAPE_LABELS[shape];
  const results = [{ label: "رقبہ", value: c.A(r.area), text: c.A(r.area) }];
  const parts = [`رقبہ = ${c.A(r.area)}`];
  if (r.perimeter !== null) {
    results.push({ label: "محیط", value: c.L(r.perimeter), text: c.L(r.perimeter) });
    parts.push(`محیط = ${c.L(r.perimeter)}`);
  }
  for (const [label, value] of r.extras) results.push({ label, value });
  const series = [{ name, points: closed(r.outline), ...(r.outline.length <= 12 ? { marker: "o" } : {}), line: true }, ...(r.extra || [])];
  const blocks = [{ type: "plot", title: `${name} کا خاکہ`, xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series }];
  return {
    results,
    steps: r.steps,
    blocks,
    copy: `${name}: ${parts.join("، ")}`
  };
}
