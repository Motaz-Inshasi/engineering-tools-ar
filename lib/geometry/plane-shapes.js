import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, deg, tex as ntex } from "../core/format.js";

const TAU = 2 * Math.PI;

const SHAPE_LABELS = {
  square: "مربع",
  rectangle: "مستطيل",
  triangle: "مثلث",
  "right-triangle": "مثلث قائم الزاوية",
  circle: "دائرة",
  ellipse: "قطع ناقص (إهليلج)",
  trapezoid: "شبه منحرف",
  parallelogram: "متوازي أضلاع",
  rhombus: "معين",
  "regular-polygon": "مضلع منتظم",
  sector: "قطاع دائري"
};

const blank = {
  shape: "", unit: "cm", s: "", rl: "", rw: "", tmode: "", tb: "", th: "", ta: "", tc: "", t1: "", t2: "", t3: "",
  ra: "", rb: "", cmode: "", cval: "", ea: "", eb: "", pa: "", pb: "", ph: "", pl1: "", pl2: "", qb: "", qs: "", qh: "",
  d1: "", d2: "", npoly: "", ns: "", sr: "", sang: ""
};

export const meta = {
  description: "احسب مساحة ومحيط الأشكال المستوية الشائعة، مثل المربع والمستطيل والمثلث والدائرة والإهليلج وشبه المنحرف والمعين والمضلع المنتظم والقطاع الدائري، مع خواص إضافية ورسم للمخطط.",
  keywords: ["مساحة", "محيط", "مستطيل", "مثلث", "دائرة", "شبه منحرف", "معين", "مضلع منتظم", "قطاع دائري", "area", "perimeter", "plane shapes"],
  formulas: [
    { label: "مساحة المستطيل", tex: "A = LW" },
    { label: "مساحة المثلث", tex: "A = \\frac{1}{2}bh" },
    { label: "مساحة الدائرة", tex: "A = \\pi r^2" },
    { label: "مساحة المضلع المنتظم", tex: "A = \\frac{n s^2}{4\\tan(\\pi/n)}" }
  ],
  inputs: [
    { id: "shape", label: "الشكل", type: "select", default: "rectangle", options: [["square", "مربع"], ["rectangle", "مستطيل"], ["triangle", "مثلث"], ["right-triangle", "مثلث قائم الزاوية"], ["circle", "دائرة"], ["ellipse", "قطع ناقص (إهليلج)"], ["trapezoid", "شبه منحرف"], ["parallelogram", "متوازي أضلاع"], ["rhombus", "معين"], ["regular-polygon", "مضلع منتظم"], ["sector", "قطاع دائري"]] },
    { id: "unit", label: "وحدة الطول", type: "text", default: "cm", help: "الوحدة للعرض فقط؛ المساحة بوحدة مربعة." },
    { id: "s", label: "طول الضلع s", type: "number", default: "5", when: { shape: ["square"] } },
    { id: "rl", label: "الطول L", type: "number", default: "8", when: { shape: ["rectangle"] } },
    { id: "rw", label: "العرض W", type: "number", default: "5", when: { shape: ["rectangle"] } },
    { id: "tmode", label: "معطيات المثلث", type: "select", default: "bh", options: [["bh", "القاعدة والارتفاع"], ["sss", "الأضلاع الثلاثة"]], when: { shape: ["triangle"] } },
    { id: "tb", label: "القاعدة b", type: "number", default: "10", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "th", label: "الارتفاع h", type: "number", default: "4", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "ta", label: "الضلع الأيسر (اختياري)", type: "number", when: { shape: ["triangle"], tmode: ["bh"] }, help: "أدخل الضلعين الاختياريين معاً لحساب المحيط." },
    { id: "tc", label: "الضلع الأيمن (اختياري)", type: "number", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "t1", label: "الضلع الأول a", type: "number", default: "3", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "t2", label: "الضلع الثاني b", type: "number", default: "4", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "t3", label: "الضلع الثالث c", type: "number", default: "5", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "ra", label: "الساق الأولى a", type: "number", default: "3", when: { shape: ["right-triangle"] } },
    { id: "rb", label: "الساق الثانية b", type: "number", default: "4", when: { shape: ["right-triangle"] } },
    { id: "cmode", label: "المعطى", type: "select", default: "radius", options: [["radius", "نصف القطر"], ["diameter", "القطر"]], when: { shape: ["circle"] } },
    { id: "cval", label: "القيمة", type: "number", default: "1", when: { shape: ["circle"] }, help: "نصف القطر أو القطر حسب الاختيار أعلاه." },
    { id: "ea", label: "نصف المحور الأفقي a", type: "number", default: "5", when: { shape: ["ellipse"] } },
    { id: "eb", label: "نصف المحور الرأسي b", type: "number", default: "3", when: { shape: ["ellipse"] } },
    { id: "pa", label: "القاعدة العليا a", type: "number", default: "4", when: { shape: ["trapezoid"] } },
    { id: "pb", label: "القاعدة السفلى b", type: "number", default: "10", when: { shape: ["trapezoid"] } },
    { id: "ph", label: "الارتفاع h", type: "number", default: "3", when: { shape: ["trapezoid"] } },
    { id: "pl1", label: "الساق الأولى (اختياري)", type: "number", when: { shape: ["trapezoid"] } },
    { id: "pl2", label: "الساق الثانية (اختياري)", type: "number", when: { shape: ["trapezoid"] }, help: "أدخل الساقين معاً لحساب المحيط." },
    { id: "qb", label: "القاعدة b", type: "number", default: "10", when: { shape: ["parallelogram"] } },
    { id: "qs", label: "الضلع المائل s", type: "number", default: "6", when: { shape: ["parallelogram"] } },
    { id: "qh", label: "الارتفاع h", type: "number", default: "4", when: { shape: ["parallelogram"] }, help: "الارتفاع عمودي على القاعدة، ولا يزيد عن الضلع المائل." },
    { id: "d1", label: "القطر الأول d1", type: "number", default: "6", when: { shape: ["rhombus"] } },
    { id: "d2", label: "القطر الثاني d2", type: "number", default: "8", when: { shape: ["rhombus"] } },
    { id: "npoly", label: "عدد الأضلاع n", type: "number", default: "6", when: { shape: ["regular-polygon"] } },
    { id: "ns", label: "طول الضلع s", type: "number", default: "2", when: { shape: ["regular-polygon"] } },
    { id: "sr", label: "نصف القطر r", type: "number", default: "2", when: { shape: ["sector"] } },
    { id: "sang", label: "الزاوية θ (بالدرجات)", type: "number", default: "90", when: { shape: ["sector"] }, help: "من 0 إلى 360 درجة." }
  ],
  example: { values: { ...blank, shape: "rectangle", unit: "cm", rl: "8", rw: "5" }, expect: ["40 cm²", "26 cm"], note: "مثال: مستطيل طوله 8 cm وعرضه 5 cm." },
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
  const s = num(input, "s", "طول الضلع", { positive: true });
  const area = s * s, perimeter = 4 * s, d = s * Math.SQRT2;
  return {
    area, perimeter,
    extras: [["طول القطر", c.L(d)]],
    steps: [
      { text: "المساحة:", tex: `A = s^2 = ${c.T(s)}^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "المحيط:", tex: `P = 4s = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "طول القطر:", tex: `d = s\\sqrt{2} = ${c.T(d)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [s, 0], [s, s], [0, s]]
  };
}

function rectangle(input, c) {
  const L = num(input, "rl", "الطول L", { positive: true });
  const W = num(input, "rw", "العرض W", { positive: true });
  const area = L * W, perimeter = 2 * (L + W), d = Math.hypot(L, W);
  return {
    area, perimeter,
    extras: [["طول القطر", c.L(d)]],
    steps: [
      { text: "المساحة:", tex: `A = LW = ${c.T(L)} \\times ${c.T(W)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "المحيط:", tex: `P = 2(L+W) = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "طول القطر:", tex: `d = \\sqrt{L^2+W^2} = ${c.T(d)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [L, 0], [L, W], [0, W]]
  };
}

function triangleBaseHeight(input, c) {
  const b = num(input, "tb", "القاعدة b", { positive: true });
  const h = num(input, "th", "الارتفاع h", { positive: true });
  const ta = num(input, "ta", "الضلع الأيسر", { positive: true, optional: true });
  const tc = num(input, "tc", "الضلع الأيمن", { positive: true, optional: true });
  const area = (b * h) / 2;
  let x = b / 2, perimeter = null;
  const steps = [{ text: "المساحة:", tex: `A = \\frac{bh}{2} = \\frac{${c.T(b)} \\times ${c.T(h)}}{2} = ${c.T(area)}\\ ${c.U}^2` }];
  if (ta !== null || tc !== null) {
    if (ta === null || tc === null) fail("أدخل الضلعين الاختياريين معاً لحساب المحيط، أو اتركهما فارغين.", ta === null ? "ta" : "tc");
    if (ta + tc <= b || Math.abs(ta - tc) >= b) fail("الأضلاع المدخلة لا تُكوّن مثلثاً مع هذه القاعدة.", "ta");
    const s = (b + ta + tc) / 2;
    const heron = Math.sqrt(s * (s - b) * (s - ta) * (s - tc));
    if (Math.abs((2 * heron) / b - h) > 1e-6 * h) fail("الارتفاع h لا يتوافق مع الأضلاع المدخلة.", "th");
    x = (b * b + ta * ta - tc * tc) / (2 * b);
    perimeter = b + ta + tc;
    steps.push({ text: "المحيط:", tex: `P = b + a + c = ${c.T(perimeter)}\\ ${c.U}` });
  }
  return {
    area, perimeter, extras: [], steps,
    outline: [[0, 0], [b, 0], [x, h]]
  };
}

function triangleSides(input, c) {
  const a = num(input, "t1", "الضلع الأول a", { positive: true });
  const b = num(input, "t2", "الضلع الثاني b", { positive: true });
  const k = num(input, "t3", "الضلع الثالث c", { positive: true });
  if (a + b <= k || a + k <= b || b + k <= a) fail("الأضلاع الثلاثة لا تُكوّن مثلثاً: مجموع أي ضلعين يجب أن يزيد عن الضلع الثالث.", "t3");
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
      ["الارتفاعات (على a، b، c)", `${c.L(ha)}، ${c.L(hb)}، ${c.L(hc)}`],
      ["الزوايا (بالدرجات)", `${fmt(angA, 4)}°، ${fmt(angB, 4)}°، ${fmt(angC, 4)}°`]
    ],
    steps: [
      { text: "نصف المحيط:", tex: `s = \\frac{a+b+c}{2} = ${c.T(s)}` },
      { text: "مساحة هيرون:", tex: `A = \\sqrt{s(s-a)(s-b)(s-c)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "المحيط:", tex: `P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "الزاوية المقابلة لـ a بقانون جيب التمام:", tex: `\\cos A = \\frac{b^2+c^2-a^2}{2bc} \\Rightarrow A = ${fmt(angA, 4)}^\\circ` }
    ],
    outline: [[0, 0], [a, 0], [x, y]]
  };
}

function rightTriangle(input, c) {
  const a = num(input, "ra", "الساق الأولى a", { positive: true });
  const b = num(input, "rb", "الساق الثانية b", { positive: true });
  const hyp = Math.hypot(a, b);
  const area = (a * b) / 2, perimeter = a + b + hyp, alt = (a * b) / hyp;
  const angA = deg(Math.atan(b / a)), angB = 90 - angA;
  return {
    area, perimeter,
    extras: [
      ["الوتر", c.L(hyp)],
      ["الارتفاع على الوتر", c.L(alt)],
      ["الزاويتان الحادتان", `${fmt(angA, 4)}° و ${fmt(angB, 4)}°`]
    ],
    steps: [
      { text: "المساحة:", tex: `A = \\frac{ab}{2} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "الوتر (فيثاغورس):", tex: `c = \\sqrt{a^2+b^2} = ${c.T(hyp)}\\ ${c.U}` },
      { text: "المحيط:", tex: `P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "الارتفاع على الوتر:", tex: `h = \\frac{ab}{c} = ${c.T(alt)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [a, 0], [0, b]]
  };
}

function circle(input, c) {
  const mode = choice(input, "cmode", "المعطى", ["radius", "diameter"], "radius");
  const v = num(input, "cval", "القيمة", { positive: true });
  const r = mode === "diameter" ? v / 2 : v;
  const area = Math.PI * r * r, perimeter = TAU * r;
  return {
    area, perimeter,
    extras: [["نصف القطر", c.L(r)], ["القطر", c.L(2 * r)]],
    steps: [
      { text: "نصف القطر:", tex: `r = ${c.T(r)}\\ ${c.U}` },
      { text: "المساحة:", tex: `A = \\pi r^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "المحيط:", tex: `P = 2\\pi r = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: arcPoints(r, 0, TAU, 180),
    extra: [{ name: "المركز", points: [[0, 0]], marker: "x", line: false }]
  };
}

function ellipse(input, c) {
  const a = num(input, "ea", "نصف المحور الأفقي a", { positive: true });
  const b = num(input, "eb", "نصف المحور الرأسي b", { positive: true });
  const area = Math.PI * a * b;
  const perimeter = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  const outline = [];
  for (let i = 0; i <= 180; i++) {
    const t = (TAU * i) / 180;
    outline.push([a * Math.cos(t), b * Math.sin(t)]);
  }
  return {
    area, perimeter,
    extras: [["المحور الأطول", c.L(2 * Math.max(a, b))], ["المحور الأقصر", c.L(2 * Math.min(a, b))]],
    steps: [
      { text: "المساحة:", tex: `A = \\pi ab = ${c.T(area)}\\ ${c.U}^2` },
      { text: "المحيط (تقريب رامانوجان الثاني):", tex: `P \\approx \\pi\\left[3(a+b)-\\sqrt{(3a+b)(a+3b)}\\right] = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline
  };
}

function trapezoid(input, c) {
  const a = num(input, "pa", "القاعدة العليا a", { positive: true });
  const b = num(input, "pb", "القاعدة السفلى b", { positive: true });
  const h = num(input, "ph", "الارتفاع h", { positive: true });
  const l1 = num(input, "pl1", "الساق الأولى", { positive: true, optional: true });
  const l2 = num(input, "pl2", "الساق الثانية", { positive: true, optional: true });
  if ((l1 === null) !== (l2 === null)) fail("أدخل الساقين معاً لحساب المحيط، أو اتركهما فارغتين.", l1 === null ? "pl1" : "pl2");
  const area = ((a + b) / 2) * h;
  const d = b - a;
  let p = d / 2, perimeter = null;
  if (l1 !== null) {
    if (l1 < h || l2 < h) fail("طول الساق لا يمكن أن يكون أقل من الارتفاع.", l1 < h ? "pl1" : "pl2");
    const p1 = Math.sqrt(l1 * l1 - h * h);
    const fits = [p1, -p1].filter((q) => Math.abs((d - q) * (d - q) + h * h - l2 * l2) <= 1e-6 * l2 * l2);
    if (fits.length === 0) fail("الأضلاع المدخلة لا تُكوّن شبه منحرف بهذه القاعدتين والارتفاع.", "pl2");
    p = fits[0];
    perimeter = a + b + l1 + l2;
  }
  return {
    area, perimeter,
    extras: [["القاعدة المتوسطة", c.L((a + b) / 2)]],
    steps: [
      { text: "المساحة:", tex: `A = \\frac{(a+b)h}{2} = \\frac{(${c.T(a)}+${c.T(b)}) \\times ${c.T(h)}}{2} = ${c.T(area)}\\ ${c.U}^2` },
      ...(perimeter === null ? [] : [{ text: "المحيط:", tex: `P = a+b+c_1+c_2 = ${c.T(perimeter)}\\ ${c.U}` }])
    ],
    outline: [[0, 0], [b, 0], [p + a, h], [p, h]]
  };
}

function parallelogram(input, c) {
  const b = num(input, "qb", "القاعدة b", { positive: true });
  const s = num(input, "qs", "الضلع المائل s", { positive: true });
  const h = num(input, "qh", "الارتفاع h", { positive: true });
  if (h > s) fail("الارتفاع لا يمكن أن يزيد عن الضلع المائل.", "qh");
  const area = b * h, perimeter = 2 * (b + s), x = Math.sqrt(s * s - h * h);
  const d1 = Math.hypot(b + x, h), d2 = Math.hypot(b - x, h);
  return {
    area, perimeter,
    extras: [["القطر الطويل", c.L(Math.max(d1, d2))], ["القطر القصير", c.L(Math.min(d1, d2))]],
    steps: [
      { text: "المساحة:", tex: `A = bh = ${c.T(b)} \\times ${c.T(h)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "المحيط:", tex: `P = 2(b+s) = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "الإزاحة الأفقية للضلع المائل:", tex: `x = \\sqrt{s^2-h^2} = ${c.T(x)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [b, 0], [b + x, h], [x, h]]
  };
}

function rhombus(input, c) {
  const d1 = num(input, "d1", "القطر الأول d1", { positive: true });
  const d2 = num(input, "d2", "القطر الثاني d2", { positive: true });
  const area = (d1 * d2) / 2, side = Math.hypot(d1 / 2, d2 / 2), perimeter = 4 * side;
  return {
    area, perimeter,
    extras: [["طول الضلع", c.L(side)]],
    steps: [
      { text: "المساحة من القطرين:", tex: `A = \\frac{d_1 d_2}{2} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "الضلع (فيثاغورس على نصفي القطرين):", tex: `s = \\sqrt{(d_1/2)^2+(d_2/2)^2} = ${c.T(side)}\\ ${c.U}` },
      { text: "المحيط:", tex: `P = 4s = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: [[d1 / 2, 0], [0, d2 / 2], [-d1 / 2, 0], [0, -d2 / 2]]
  };
}

function regularPolygon(input, c) {
  const n = num(input, "npoly", "عدد الأضلاع n", { integer: true, min: 3, max: 10000 });
  const s = num(input, "ns", "طول الضلع s", { positive: true });
  const t = Math.PI / n;
  const area = (n * s * s) / (4 * Math.tan(t)), perimeter = n * s;
  const apothem = s / (2 * Math.tan(t)), R = s / (2 * Math.sin(t)), interior = ((n - 2) * 180) / n;
  const outline = [];
  for (let k = 0; k < n; k++) outline.push([R * Math.cos((TAU * k) / n), R * Math.sin((TAU * k) / n)]);
  return {
    area, perimeter,
    extras: [
      ["نصف قطر الدائرة الداخلية (الأبوثيم)", c.L(apothem)],
      ["نصف قطر الدائرة المحيطة", c.L(R)],
      ["الزاوية الداخلية (درجة)", `${fmt(interior, 6)}°`]
    ],
    steps: [
      { text: "المساحة:", tex: `A = \\frac{n s^2}{4\\tan(\\pi/n)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "المحيط:", tex: `P = ns = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "نصف قطر الدائرة الداخلية:", tex: `a = \\frac{s}{2\\tan(\\pi/n)} = ${c.T(apothem)}\\ ${c.U}` },
      { text: "نصف قطر الدائرة المحيطة:", tex: `R = \\frac{s}{2\\sin(\\pi/n)} = ${c.T(R)}\\ ${c.U}` }
    ],
    outline
  };
}

function sector(input, c) {
  const r = num(input, "sr", "نصف القطر r", { positive: true });
  const deg0 = num(input, "sang", "الزاوية θ", { positive: true, max: 360 });
  const th = (deg0 * Math.PI) / 180;
  const area = (r * r * th) / 2, arc = r * th, perimeter = 2 * r + arc;
  return {
    area, perimeter,
    extras: [["طول القوس", c.L(arc)], ["الزاوية بالراديان", `${fmt(th, 6)}`]],
    steps: [
      { text: "الزاوية بالراديان:", tex: `\\theta = \\frac{${c.T(deg0)}\\pi}{180} = ${c.T(th)}` },
      { text: "المساحة:", tex: `A = \\frac{1}{2}r^2\\theta = ${c.T(area)}\\ ${c.U}^2` },
      { text: "طول القوس:", tex: `L = r\\theta = ${c.T(arc)}\\ ${c.U}` },
      { text: "المحيط (قوسان نصفا قطر):", tex: `P = 2r + r\\theta = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: [[0, 0], ...arcPoints(r, 0, th, 90)]
  };
}

function triangle(input, c) {
  const mode = choice(input, "tmode", "معطيات المثلث", ["bh", "sss"], "bh");
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
  const unit = str(input, "unit", "وحدة الطول", { default: "cm" });
  const shape = choice(input, "shape", "الشكل", Object.keys(SHAPE_LABELS), "rectangle");
  const c = ctxOf(unit);
  const r = FN[shape](input, c);
  const name = SHAPE_LABELS[shape];
  const results = [{ label: "المساحة", value: c.A(r.area), text: c.A(r.area) }];
  const parts = [`المساحة = ${c.A(r.area)}`];
  if (r.perimeter !== null) {
    results.push({ label: "المحيط", value: c.L(r.perimeter), text: c.L(r.perimeter) });
    parts.push(`المحيط = ${c.L(r.perimeter)}`);
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
