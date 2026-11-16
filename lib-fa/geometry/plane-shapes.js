import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, deg, tex as ntex } from "../core/format.js";

const TAU = 2 * Math.PI;

const SHAPE_LABELS = {
  square: "مربع",
  rectangle: "مستطیل",
  triangle: "مثلث",
  "right-triangle": "مثلث قائم‌الزاویه",
  circle: "دایره",
  ellipse: "بیضی (الیپس)",
  trapezoid: "ذوزنقه",
  parallelogram: "متوازی‌الاضلاع",
  rhombus: "لوزی",
  "regular-polygon": "چندضلعی منتظم",
  sector: "قطاع دایره"
};

const blank = {
  shape: "", unit: "cm", s: "", rl: "", rw: "", tmode: "", tb: "", th: "", ta: "", tc: "", t1: "", t2: "", t3: "",
  ra: "", rb: "", cmode: "", cval: "", ea: "", eb: "", pa: "", pb: "", ph: "", pl1: "", pl2: "", qb: "", qs: "", qh: "",
  d1: "", d2: "", npoly: "", ns: "", sr: "", sang: ""
};

export const meta = {
  description: "مساحت و محیط شکل‌های مسطح رایج را محاسبه کنید، مانند مربع، مستطیل، مثلث، دایره، بیضی، ذوزنقه، لوزی، چندضلعی منتظم و قطاع دایره، همراه با ویژگی‌های اضافی و رسم نمودار.",
  keywords: ["مساحت", "محیط", "مستطیل", "مثلث", "دایره", "ذوزنقه", "لوزی", "چندضلعی منتظم", "قطاع دایره", "area", "perimeter", "plane shapes"],
  formulas: [
    { label: "مساحت مستطیل", tex: "A = LW" },
    { label: "مساحت مثلث", tex: "A = \\frac{1}{2}bh" },
    { label: "مساحت دایره", tex: "A = \\pi r^2" },
    { label: "مساحت چندضلعی منتظم", tex: "A = \\frac{n s^2}{4\\tan(\\pi/n)}" }
  ],
  inputs: [
    { id: "shape", label: "شکل", type: "select", default: "rectangle", options: [["square", "مربع"], ["rectangle", "مستطیل"], ["triangle", "مثلث"], ["right-triangle", "مثلث قائم‌الزاویه"], ["circle", "دایره"], ["ellipse", "بیضی (الیپس)"], ["trapezoid", "ذوزنقه"], ["parallelogram", "متوازی‌الاضلاع"], ["rhombus", "لوزی"], ["regular-polygon", "چندضلعی منتظم"], ["sector", "قطاع دایره"]] },
    { id: "unit", label: "واحد طول", type: "text", default: "cm", help: "واحد فقط برای نمایش است؛ مساحت بر حسب واحد مربع است." },
    { id: "s", label: "طول ضلع s", type: "number", default: "5", when: { shape: ["square"] } },
    { id: "rl", label: "طول L", type: "number", default: "8", when: { shape: ["rectangle"] } },
    { id: "rw", label: "عرض W", type: "number", default: "5", when: { shape: ["rectangle"] } },
    { id: "tmode", label: "داده‌های مثلث", type: "select", default: "bh", options: [["bh", "قاعده و ارتفاع"], ["sss", "سه ضلع"]], when: { shape: ["triangle"] } },
    { id: "tb", label: "قاعدهٔ b", type: "number", default: "10", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "th", label: "ارتفاع h", type: "number", default: "4", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "ta", label: "ضلع چپ (اختیاری)", type: "number", when: { shape: ["triangle"], tmode: ["bh"] }, help: "هر دو ضلع اختیاری را با هم وارد کنید تا محیط محاسبه شود." },
    { id: "tc", label: "ضلع راست (اختیاری)", type: "number", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "t1", label: "ضلع اول a", type: "number", default: "3", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "t2", label: "ضلع دوم b", type: "number", default: "4", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "t3", label: "ضلع سوم c", type: "number", default: "5", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "ra", label: "ساق اول a", type: "number", default: "3", when: { shape: ["right-triangle"] } },
    { id: "rb", label: "ساق دوم b", type: "number", default: "4", when: { shape: ["right-triangle"] } },
    { id: "cmode", label: "معلوم", type: "select", default: "radius", options: [["radius", "شعاع"], ["diameter", "قطر"]], when: { shape: ["circle"] } },
    { id: "cval", label: "مقدار", type: "number", default: "1", when: { shape: ["circle"] }, help: "شعاع یا قطر بسته به گزینهٔ بالا." },
    { id: "ea", label: "نیم‌محور افقی a", type: "number", default: "5", when: { shape: ["ellipse"] } },
    { id: "eb", label: "نیم‌محور عمودی b", type: "number", default: "3", when: { shape: ["ellipse"] } },
    { id: "pa", label: "قاعدهٔ بالایی a", type: "number", default: "4", when: { shape: ["trapezoid"] } },
    { id: "pb", label: "قاعدهٔ پایینی b", type: "number", default: "10", when: { shape: ["trapezoid"] } },
    { id: "ph", label: "ارتفاع h", type: "number", default: "3", when: { shape: ["trapezoid"] } },
    { id: "pl1", label: "ساق اول (اختیاری)", type: "number", when: { shape: ["trapezoid"] } },
    { id: "pl2", label: "ساق دوم (اختیاری)", type: "number", when: { shape: ["trapezoid"] }, help: "هر دو ساق را با هم وارد کنید تا محیط محاسبه شود." },
    { id: "qb", label: "قاعدهٔ b", type: "number", default: "10", when: { shape: ["parallelogram"] } },
    { id: "qs", label: "ضلع مایل s", type: "number", default: "6", when: { shape: ["parallelogram"] } },
    { id: "qh", label: "ارتفاع h", type: "number", default: "4", when: { shape: ["parallelogram"] }, help: "ارتفاع بر قاعده عمود است و نمی‌تواند از ضلع مایل بیشتر باشد." },
    { id: "d1", label: "قطر اول d1", type: "number", default: "6", when: { shape: ["rhombus"] } },
    { id: "d2", label: "قطر دوم d2", type: "number", default: "8", when: { shape: ["rhombus"] } },
    { id: "npoly", label: "تعداد اضلاع n", type: "number", default: "6", when: { shape: ["regular-polygon"] } },
    { id: "ns", label: "طول ضلع s", type: "number", default: "2", when: { shape: ["regular-polygon"] } },
    { id: "sr", label: "شعاع r", type: "number", default: "2", when: { shape: ["sector"] } },
    { id: "sang", label: "زاویهٔ θ (بر حسب درجه)", type: "number", default: "90", when: { shape: ["sector"] }, help: "از 0 تا 360 درجه." }
  ],
  example: { values: { ...blank, shape: "rectangle", unit: "cm", rl: "8", rw: "5" }, expect: ["40 cm²", "26 cm"], note: "مثال: مستطیلی به طول 8 cm و عرض 5 cm." },
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
  const s = num(input, "s", "طول ضلع", { positive: true });
  const area = s * s, perimeter = 4 * s, d = s * Math.SQRT2;
  return {
    area, perimeter,
    extras: [["طول قطر", c.L(d)]],
    steps: [
      { text: "مساحت:", tex: `A = s^2 = ${c.T(s)}^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "محیط:", tex: `P = 4s = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "طول قطر:", tex: `d = s\\sqrt{2} = ${c.T(d)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [s, 0], [s, s], [0, s]]
  };
}

function rectangle(input, c) {
  const L = num(input, "rl", "طول L", { positive: true });
  const W = num(input, "rw", "عرض W", { positive: true });
  const area = L * W, perimeter = 2 * (L + W), d = Math.hypot(L, W);
  return {
    area, perimeter,
    extras: [["طول قطر", c.L(d)]],
    steps: [
      { text: "مساحت:", tex: `A = LW = ${c.T(L)} \\times ${c.T(W)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "محیط:", tex: `P = 2(L+W) = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "طول قطر:", tex: `d = \\sqrt{L^2+W^2} = ${c.T(d)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [L, 0], [L, W], [0, W]]
  };
}

function triangleBaseHeight(input, c) {
  const b = num(input, "tb", "قاعدهٔ b", { positive: true });
  const h = num(input, "th", "ارتفاع h", { positive: true });
  const ta = num(input, "ta", "ضلع چپ", { positive: true, optional: true });
  const tc = num(input, "tc", "ضلع راست", { positive: true, optional: true });
  const area = (b * h) / 2;
  let x = b / 2, perimeter = null;
  const steps = [{ text: "مساحت:", tex: `A = \\frac{bh}{2} = \\frac{${c.T(b)} \\times ${c.T(h)}}{2} = ${c.T(area)}\\ ${c.U}^2` }];
  if (ta !== null || tc !== null) {
    if (ta === null || tc === null) fail("هر دو ضلع اختیاری را با هم وارد کنید تا محیط محاسبه شود، یا آن‌ها را خالی بگذارید.", ta === null ? "ta" : "tc");
    if (ta + tc <= b || Math.abs(ta - tc) >= b) fail("ضلع‌های وارد شده با این قاعده مثلث نمی‌سازند.", "ta");
    const s = (b + ta + tc) / 2;
    const heron = Math.sqrt(s * (s - b) * (s - ta) * (s - tc));
    if (Math.abs((2 * heron) / b - h) > 1e-6 * h) fail("ارتفاع h با ضلع‌های وارد شده سازگار نیست.", "th");
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
  const a = num(input, "t1", "ضلع اول a", { positive: true });
  const b = num(input, "t2", "ضلع دوم b", { positive: true });
  const k = num(input, "t3", "ضلع سوم c", { positive: true });
  if (a + b <= k || a + k <= b || b + k <= a) fail("این سه ضلع مثلث نمی‌سازند: مجموع هر دو ضلع باید از ضلع سوم بیشتر باشد.", "t3");
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
      ["ارتفاع‌ها (بر a، b، c)", `${c.L(ha)}، ${c.L(hb)}، ${c.L(hc)}`],
      ["زاویه‌ها (بر حسب درجه)", `${fmt(angA, 4)}°، ${fmt(angB, 4)}°، ${fmt(angC, 4)}°`]
    ],
    steps: [
      { text: "نیم‌محیط:", tex: `s = \\frac{a+b+c}{2} = ${c.T(s)}` },
      { text: "مساحت هرون:", tex: `A = \\sqrt{s(s-a)(s-b)(s-c)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "محیط:", tex: `P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "زاویهٔ روبه‌روی a از قانون کسینوس‌ها:", tex: `\\cos A = \\frac{b^2+c^2-a^2}{2bc} \\Rightarrow A = ${fmt(angA, 4)}^\\circ` }
    ],
    outline: [[0, 0], [a, 0], [x, y]]
  };
}

function rightTriangle(input, c) {
  const a = num(input, "ra", "ساق اول a", { positive: true });
  const b = num(input, "rb", "ساق دوم b", { positive: true });
  const hyp = Math.hypot(a, b);
  const area = (a * b) / 2, perimeter = a + b + hyp, alt = (a * b) / hyp;
  const angA = deg(Math.atan(b / a)), angB = 90 - angA;
  return {
    area, perimeter,
    extras: [
      ["وتر", c.L(hyp)],
      ["ارتفاع وارد بر وتر", c.L(alt)],
      ["دو زاویهٔ حاده", `${fmt(angA, 4)}° و ${fmt(angB, 4)}°`]
    ],
    steps: [
      { text: "مساحت:", tex: `A = \\frac{ab}{2} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "وتر (فیثاغورس):", tex: `c = \\sqrt{a^2+b^2} = ${c.T(hyp)}\\ ${c.U}` },
      { text: "محیط:", tex: `P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "ارتفاع وارد بر وتر:", tex: `h = \\frac{ab}{c} = ${c.T(alt)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [a, 0], [0, b]]
  };
}

function circle(input, c) {
  const mode = choice(input, "cmode", "معلوم", ["radius", "diameter"], "radius");
  const v = num(input, "cval", "مقدار", { positive: true });
  const r = mode === "diameter" ? v / 2 : v;
  const area = Math.PI * r * r, perimeter = TAU * r;
  return {
    area, perimeter,
    extras: [["شعاع", c.L(r)], ["قطر", c.L(2 * r)]],
    steps: [
      { text: "شعاع:", tex: `r = ${c.T(r)}\\ ${c.U}` },
      { text: "مساحت:", tex: `A = \\pi r^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "محیط:", tex: `P = 2\\pi r = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: arcPoints(r, 0, TAU, 180),
    extra: [{ name: "مرکز", points: [[0, 0]], marker: "x", line: false }]
  };
}

function ellipse(input, c) {
  const a = num(input, "ea", "نیم‌محور افقی a", { positive: true });
  const b = num(input, "eb", "نیم‌محور عمودی b", { positive: true });
  const area = Math.PI * a * b;
  const perimeter = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  const outline = [];
  for (let i = 0; i <= 180; i++) {
    const t = (TAU * i) / 180;
    outline.push([a * Math.cos(t), b * Math.sin(t)]);
  }
  return {
    area, perimeter,
    extras: [["محور بزرگ", c.L(2 * Math.max(a, b))], ["محور کوچک", c.L(2 * Math.min(a, b))]],
    steps: [
      { text: "مساحت:", tex: `A = \\pi ab = ${c.T(area)}\\ ${c.U}^2` },
      { text: "محیط (تقریب دوم رامانوجان):", tex: `P \\approx \\pi\\left[3(a+b)-\\sqrt{(3a+b)(a+3b)}\\right] = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline
  };
}

function trapezoid(input, c) {
  const a = num(input, "pa", "قاعدهٔ بالایی a", { positive: true });
  const b = num(input, "pb", "قاعدهٔ پایینی b", { positive: true });
  const h = num(input, "ph", "ارتفاع h", { positive: true });
  const l1 = num(input, "pl1", "ساق اول", { positive: true, optional: true });
  const l2 = num(input, "pl2", "ساق دوم", { positive: true, optional: true });
  if ((l1 === null) !== (l2 === null)) fail("هر دو ساق را با هم وارد کنید تا محیط محاسبه شود، یا آن‌ها را خالی بگذارید.", l1 === null ? "pl1" : "pl2");
  const area = ((a + b) / 2) * h;
  const d = b - a;
  let p = d / 2, perimeter = null;
  if (l1 !== null) {
    if (l1 < h || l2 < h) fail("طول ساق نمی‌تواند از ارتفاع کمتر باشد.", l1 < h ? "pl1" : "pl2");
    const p1 = Math.sqrt(l1 * l1 - h * h);
    const fits = [p1, -p1].filter((q) => Math.abs((d - q) * (d - q) + h * h - l2 * l2) <= 1e-6 * l2 * l2);
    if (fits.length === 0) fail("ضلع‌های وارد شده با این دو قاعده و این ارتفاع ذوزنقه نمی‌سازند.", "pl2");
    p = fits[0];
    perimeter = a + b + l1 + l2;
  }
  return {
    area, perimeter,
    extras: [["خط میانی", c.L((a + b) / 2)]],
    steps: [
      { text: "مساحت:", tex: `A = \\frac{(a+b)h}{2} = \\frac{(${c.T(a)}+${c.T(b)}) \\times ${c.T(h)}}{2} = ${c.T(area)}\\ ${c.U}^2` },
      ...(perimeter === null ? [] : [{ text: "محیط:", tex: `P = a+b+c_1+c_2 = ${c.T(perimeter)}\\ ${c.U}` }])
    ],
    outline: [[0, 0], [b, 0], [p + a, h], [p, h]]
  };
}

function parallelogram(input, c) {
  const b = num(input, "qb", "قاعدهٔ b", { positive: true });
  const s = num(input, "qs", "ضلع مایل s", { positive: true });
  const h = num(input, "qh", "ارتفاع h", { positive: true });
  if (h > s) fail("ارتفاع نمی‌تواند از ضلع مایل بیشتر باشد.", "qh");
  const area = b * h, perimeter = 2 * (b + s), x = Math.sqrt(s * s - h * h);
  const d1 = Math.hypot(b + x, h), d2 = Math.hypot(b - x, h);
  return {
    area, perimeter,
    extras: [["قطر بلند", c.L(Math.max(d1, d2))], ["قطر کوتاه", c.L(Math.min(d1, d2))]],
    steps: [
      { text: "مساحت:", tex: `A = bh = ${c.T(b)} \\times ${c.T(h)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "محیط:", tex: `P = 2(b+s) = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "جابه‌جایی افقی ضلع مایل:", tex: `x = \\sqrt{s^2-h^2} = ${c.T(x)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [b, 0], [b + x, h], [x, h]]
  };
}

function rhombus(input, c) {
  const d1 = num(input, "d1", "قطر اول d1", { positive: true });
  const d2 = num(input, "d2", "قطر دوم d2", { positive: true });
  const area = (d1 * d2) / 2, side = Math.hypot(d1 / 2, d2 / 2), perimeter = 4 * side;
  return {
    area, perimeter,
    extras: [["طول ضلع", c.L(side)]],
    steps: [
      { text: "مساحت از دو قطر:", tex: `A = \\frac{d_1 d_2}{2} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "ضلع (فیثاغورس روی نیم‌قطرها):", tex: `s = \\sqrt{(d_1/2)^2+(d_2/2)^2} = ${c.T(side)}\\ ${c.U}` },
      { text: "محیط:", tex: `P = 4s = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: [[d1 / 2, 0], [0, d2 / 2], [-d1 / 2, 0], [0, -d2 / 2]]
  };
}

function regularPolygon(input, c) {
  const n = num(input, "npoly", "تعداد اضلاع n", { integer: true, min: 3, max: 10000 });
  const s = num(input, "ns", "طول ضلع s", { positive: true });
  const t = Math.PI / n;
  const area = (n * s * s) / (4 * Math.tan(t)), perimeter = n * s;
  const apothem = s / (2 * Math.tan(t)), R = s / (2 * Math.sin(t)), interior = ((n - 2) * 180) / n;
  const outline = [];
  for (let k = 0; k < n; k++) outline.push([R * Math.cos((TAU * k) / n), R * Math.sin((TAU * k) / n)]);
  return {
    area, perimeter,
    extras: [
      ["شعاع دایرهٔ محاطی (آپوتم)", c.L(apothem)],
      ["شعاع دایرهٔ محیطی", c.L(R)],
      ["زاویهٔ داخلی (درجه)", `${fmt(interior, 6)}°`]
    ],
    steps: [
      { text: "مساحت:", tex: `A = \\frac{n s^2}{4\\tan(\\pi/n)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "محیط:", tex: `P = ns = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "شعاع دایرهٔ محاطی (آپوتم):", tex: `a = \\frac{s}{2\\tan(\\pi/n)} = ${c.T(apothem)}\\ ${c.U}` },
      { text: "شعاع دایرهٔ محیطی:", tex: `R = \\frac{s}{2\\sin(\\pi/n)} = ${c.T(R)}\\ ${c.U}` }
    ],
    outline
  };
}

function sector(input, c) {
  const r = num(input, "sr", "شعاع r", { positive: true });
  const deg0 = num(input, "sang", "زاویهٔ θ", { positive: true, max: 360 });
  const th = (deg0 * Math.PI) / 180;
  const area = (r * r * th) / 2, arc = r * th, perimeter = 2 * r + arc;
  return {
    area, perimeter,
    extras: [["طول کمان", c.L(arc)], ["زاویه بر حسب رادیان", `${fmt(th, 6)}`]],
    steps: [
      { text: "زاویه بر حسب رادیان:", tex: `\\theta = \\frac{${c.T(deg0)}\\pi}{180} = ${c.T(th)}` },
      { text: "مساحت:", tex: `A = \\frac{1}{2}r^2\\theta = ${c.T(area)}\\ ${c.U}^2` },
      { text: "طول کمان:", tex: `L = r\\theta = ${c.T(arc)}\\ ${c.U}` },
      { text: "محیط (دو شعاع و کمان):", tex: `P = 2r + r\\theta = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: [[0, 0], ...arcPoints(r, 0, th, 90)]
  };
}

function triangle(input, c) {
  const mode = choice(input, "tmode", "داده‌های مثلث", ["bh", "sss"], "bh");
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
  const unit = str(input, "unit", "واحد طول", { default: "cm" });
  const shape = choice(input, "shape", "شکل", Object.keys(SHAPE_LABELS), "rectangle");
  const c = ctxOf(unit);
  const r = FN[shape](input, c);
  const name = SHAPE_LABELS[shape];
  const results = [{ label: "مساحت", value: c.A(r.area), text: c.A(r.area) }];
  const parts = [`مساحت = ${c.A(r.area)}`];
  if (r.perimeter !== null) {
    results.push({ label: "محیط", value: c.L(r.perimeter), text: c.L(r.perimeter) });
    parts.push(`محیط = ${c.L(r.perimeter)}`);
  }
  for (const [label, value] of r.extras) results.push({ label, value });
  const series = [{ name, points: closed(r.outline), ...(r.outline.length <= 12 ? { marker: "o" } : {}), line: true }, ...(r.extra || [])];
  const blocks = [{ type: "plot", title: `رسم ${name}`, xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series }];
  return {
    results,
    steps: r.steps,
    blocks,
    copy: `${name}: ${parts.join("، ")}`
  };
}
