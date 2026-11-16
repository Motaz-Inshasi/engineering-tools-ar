import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, deg, tex as ntex } from "../core/format.js";

const TAU = 2 * Math.PI;

const SHAPE_LABELS = {
  square: "Kare",
  rectangle: "Dikdörtgen",
  triangle: "Üçgen",
  "right-triangle": "Dik üçgen",
  circle: "Daire",
  ellipse: "Elips",
  trapezoid: "Yamuk",
  parallelogram: "Paralelkenar",
  rhombus: "Eşkenar dörtgen",
  "regular-polygon": "Düzgün çokgen",
  sector: "Daire dilimi"
};

const blank = {
  shape: "", unit: "cm", s: "", rl: "", rw: "", tmode: "", tb: "", th: "", ta: "", tc: "", t1: "", t2: "", t3: "",
  ra: "", rb: "", cmode: "", cval: "", ea: "", eb: "", pa: "", pb: "", ph: "", pl1: "", pl2: "", qb: "", qs: "", qh: "",
  d1: "", d2: "", npoly: "", ns: "", sr: "", sang: ""
};

export const meta = {
  description: "Kare, dikdörtgen, üçgen, daire, elips, yamuk, eşkenar dörtgen, düzgün çokgen ve daire dilimi gibi yaygın düzlemsel şekillerin alanını ve çevresini hesaplayın; ek özellikler ve şema çizimiyle birlikte.",
  keywords: ["Alan", "Çevre", "Dikdörtgen", "Üçgen", "Daire", "Yamuk", "Eşkenar dörtgen", "Düzgün çokgen", "Daire dilimi", "area", "perimeter", "plane shapes"],
  formulas: [
    { label: "Dikdörtgenin alanı", tex: "A = LW" },
    { label: "Üçgenin alanı", tex: "A = \\frac{1}{2}bh" },
    { label: "Dairenin alanı", tex: "A = \\pi r^2" },
    { label: "Düzgün çokgenin alanı", tex: "A = \\frac{n s^2}{4\\tan(\\pi/n)}" }
  ],
  inputs: [
    { id: "shape", label: "Şekil", type: "select", default: "rectangle", options: [["square", "Kare"], ["rectangle", "Dikdörtgen"], ["triangle", "Üçgen"], ["right-triangle", "Dik üçgen"], ["circle", "Daire"], ["ellipse", "Elips"], ["trapezoid", "Yamuk"], ["parallelogram", "Paralelkenar"], ["rhombus", "Eşkenar dörtgen"], ["regular-polygon", "Düzgün çokgen"], ["sector", "Daire dilimi"]] },
    { id: "unit", label: "Uzunluk birimi", type: "text", default: "cm", help: "Birim yalnızca uzunluklar içindir; alan kare birimdir." },
    { id: "s", label: "Kenar uzunluğu s", type: "number", default: "5", when: { shape: ["square"] } },
    { id: "rl", label: "Uzunluk L", type: "number", default: "8", when: { shape: ["rectangle"] } },
    { id: "rw", label: "Genişlik W", type: "number", default: "5", when: { shape: ["rectangle"] } },
    { id: "tmode", label: "Üçgen verileri", type: "select", default: "bh", options: [["bh", "Taban ve yükseklik"], ["sss", "Üç kenar"]], when: { shape: ["triangle"] } },
    { id: "tb", label: "Taban b", type: "number", default: "10", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "th", label: "Yükseklik h", type: "number", default: "4", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "ta", label: "Sol kenar (isteğe bağlı)", type: "number", when: { shape: ["triangle"], tmode: ["bh"] }, help: "Çevreyi hesaplamak için iki isteğe bağlı kenarı birlikte girin." },
    { id: "tc", label: "Sağ kenar (isteğe bağlı)", type: "number", when: { shape: ["triangle"], tmode: ["bh"] } },
    { id: "t1", label: "Birinci kenar a", type: "number", default: "3", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "t2", label: "İkinci kenar b", type: "number", default: "4", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "t3", label: "Üçüncü kenar c", type: "number", default: "5", when: { shape: ["triangle"], tmode: ["sss"] } },
    { id: "ra", label: "Birinci dik kenar a", type: "number", default: "3", when: { shape: ["right-triangle"] } },
    { id: "rb", label: "İkinci dik kenar b", type: "number", default: "4", when: { shape: ["right-triangle"] } },
    { id: "cmode", label: "Verilen", type: "select", default: "radius", options: [["radius", "Yarıçap"], ["diameter", "Çap"]], when: { shape: ["circle"] } },
    { id: "cval", label: "Değer", type: "number", default: "1", when: { shape: ["circle"] }, help: "Yukarıdaki seçime göre yarıçap veya çap." },
    { id: "ea", label: "Yatay yarı eksen a", type: "number", default: "5", when: { shape: ["ellipse"] } },
    { id: "eb", label: "Düşey yarı eksen b", type: "number", default: "3", when: { shape: ["ellipse"] } },
    { id: "pa", label: "Üst taban a", type: "number", default: "4", when: { shape: ["trapezoid"] } },
    { id: "pb", label: "Alt taban b", type: "number", default: "10", when: { shape: ["trapezoid"] } },
    { id: "ph", label: "Yükseklik h", type: "number", default: "3", when: { shape: ["trapezoid"] } },
    { id: "pl1", label: "Birinci kenar (isteğe bağlı)", type: "number", when: { shape: ["trapezoid"] } },
    { id: "pl2", label: "İkinci kenar (isteğe bağlı)", type: "number", when: { shape: ["trapezoid"] }, help: "Çevreyi hesaplamak için iki kenarı birlikte girin." },
    { id: "qb", label: "Taban b", type: "number", default: "10", when: { shape: ["parallelogram"] } },
    { id: "qs", label: "Eğik kenar s", type: "number", default: "6", when: { shape: ["parallelogram"] } },
    { id: "qh", label: "Yükseklik h", type: "number", default: "4", when: { shape: ["parallelogram"] }, help: "Yükseklik tabana diktir ve eğik kenardan büyük olamaz." },
    { id: "d1", label: "Birinci köşegen d1", type: "number", default: "6", when: { shape: ["rhombus"] } },
    { id: "d2", label: "İkinci köşegen d2", type: "number", default: "8", when: { shape: ["rhombus"] } },
    { id: "npoly", label: "Kenar sayısı n", type: "number", default: "6", when: { shape: ["regular-polygon"] } },
    { id: "ns", label: "Kenar uzunluğu s", type: "number", default: "2", when: { shape: ["regular-polygon"] } },
    { id: "sr", label: "Yarıçap r", type: "number", default: "2", when: { shape: ["sector"] } },
    { id: "sang", label: "Açı θ (derece)", type: "number", default: "90", when: { shape: ["sector"] }, help: "0 ile 360 derece arası." }
  ],
  example: { values: { ...blank, shape: "rectangle", unit: "cm", rl: "8", rw: "5" }, expect: ["40 cm²", "26 cm"], note: "Örnek: uzunluğu 8 cm, genişliği 5 cm olan dikdörtgen." },
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
  const s = num(input, "s", "Kenar uzunluğu", { positive: true });
  const area = s * s, perimeter = 4 * s, d = s * Math.SQRT2;
  return {
    area, perimeter,
    extras: [["Köşegen uzunluğu", c.L(d)]],
    steps: [
      { text: "Alan:", tex: `A = s^2 = ${c.T(s)}^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Çevre:", tex: `P = 4s = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Köşegen uzunluğu:", tex: `d = s\\sqrt{2} = ${c.T(d)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [s, 0], [s, s], [0, s]]
  };
}

function rectangle(input, c) {
  const L = num(input, "rl", "Uzunluk L", { positive: true });
  const W = num(input, "rw", "Genişlik W", { positive: true });
  const area = L * W, perimeter = 2 * (L + W), d = Math.hypot(L, W);
  return {
    area, perimeter,
    extras: [["Köşegen uzunluğu", c.L(d)]],
    steps: [
      { text: "Alan:", tex: `A = LW = ${c.T(L)} \\times ${c.T(W)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Çevre:", tex: `P = 2(L+W) = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Köşegen uzunluğu:", tex: `d = \\sqrt{L^2+W^2} = ${c.T(d)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [L, 0], [L, W], [0, W]]
  };
}

function triangleBaseHeight(input, c) {
  const b = num(input, "tb", "Taban b", { positive: true });
  const h = num(input, "th", "Yükseklik h", { positive: true });
  const ta = num(input, "ta", "Sol kenar", { positive: true, optional: true });
  const tc = num(input, "tc", "Sağ kenar", { positive: true, optional: true });
  const area = (b * h) / 2;
  let x = b / 2, perimeter = null;
  const steps = [{ text: "Alan:", tex: `A = \\frac{bh}{2} = \\frac{${c.T(b)} \\times ${c.T(h)}}{2} = ${c.T(area)}\\ ${c.U}^2` }];
  if (ta !== null || tc !== null) {
    if (ta === null || tc === null) fail("Çevreyi hesaplamak için iki isteğe bağlı kenarı birlikte girin ya da boş bırakın.", ta === null ? "ta" : "tc");
    if (ta + tc <= b || Math.abs(ta - tc) >= b) fail("Girilen kenarlar bu taban ile bir üçgen oluşturmuyor.", "ta");
    const s = (b + ta + tc) / 2;
    const heron = Math.sqrt(s * (s - b) * (s - ta) * (s - tc));
    if (Math.abs((2 * heron) / b - h) > 1e-6 * h) fail("Yükseklik h, girilen kenarlarla uyuşmuyor.", "th");
    x = (b * b + ta * ta - tc * tc) / (2 * b);
    perimeter = b + ta + tc;
    steps.push({ text: "Çevre:", tex: `P = b + a + c = ${c.T(perimeter)}\\ ${c.U}` });
  }
  return {
    area, perimeter, extras: [], steps,
    outline: [[0, 0], [b, 0], [x, h]]
  };
}

function triangleSides(input, c) {
  const a = num(input, "t1", "Birinci kenar a", { positive: true });
  const b = num(input, "t2", "İkinci kenar b", { positive: true });
  const k = num(input, "t3", "Üçüncü kenar c", { positive: true });
  if (a + b <= k || a + k <= b || b + k <= a) fail("Üç kenar bir üçgen oluşturmuyor: herhangi iki kenarın toplamı üçüncü kenardan büyük olmalıdır.", "t3");
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
      ["Yükseklikler (a, b, c üzerinde)", `${c.L(ha)}، ${c.L(hb)}، ${c.L(hc)}`],
      ["Açılar (derece)", `${fmt(angA, 4)}°، ${fmt(angB, 4)}°، ${fmt(angC, 4)}°`]
    ],
    steps: [
      { text: "Yarı çevre:", tex: `s = \\frac{a+b+c}{2} = ${c.T(s)}` },
      { text: "Heron alanı:", tex: `A = \\sqrt{s(s-a)(s-b)(s-c)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Çevre:", tex: `P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Kosinüs teoremiyle a'ya karşılık gelen açı:", tex: `\\cos A = \\frac{b^2+c^2-a^2}{2bc} \\Rightarrow A = ${fmt(angA, 4)}^\\circ` }
    ],
    outline: [[0, 0], [a, 0], [x, y]]
  };
}

function rightTriangle(input, c) {
  const a = num(input, "ra", "Birinci dik kenar a", { positive: true });
  const b = num(input, "rb", "İkinci dik kenar b", { positive: true });
  const hyp = Math.hypot(a, b);
  const area = (a * b) / 2, perimeter = a + b + hyp, alt = (a * b) / hyp;
  const angA = deg(Math.atan(b / a)), angB = 90 - angA;
  return {
    area, perimeter,
    extras: [
      ["Hipotenüs", c.L(hyp)],
      ["Hipotenüse ait yükseklik", c.L(alt)],
      ["İki dar açı", `${fmt(angA, 4)}° ve ${fmt(angB, 4)}°`]
    ],
    steps: [
      { text: "Alan:", tex: `A = \\frac{ab}{2} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Hipotenüs (Pisagor):", tex: `c = \\sqrt{a^2+b^2} = ${c.T(hyp)}\\ ${c.U}` },
      { text: "Çevre:", tex: `P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Hipotenüse ait yükseklik:", tex: `h = \\frac{ab}{c} = ${c.T(alt)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [a, 0], [0, b]]
  };
}

function circle(input, c) {
  const mode = choice(input, "cmode", "Verilen", ["radius", "diameter"], "radius");
  const v = num(input, "cval", "Değer", { positive: true });
  const r = mode === "diameter" ? v / 2 : v;
  const area = Math.PI * r * r, perimeter = TAU * r;
  return {
    area, perimeter,
    extras: [["Yarıçap", c.L(r)], ["Çap", c.L(2 * r)]],
    steps: [
      { text: "Yarıçap:", tex: `r = ${c.T(r)}\\ ${c.U}` },
      { text: "Alan:", tex: `A = \\pi r^2 = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Çevre:", tex: `P = 2\\pi r = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: arcPoints(r, 0, TAU, 180),
    extra: [{ name: "Merkez", points: [[0, 0]], marker: "x", line: false }]
  };
}

function ellipse(input, c) {
  const a = num(input, "ea", "Yatay yarı eksen a", { positive: true });
  const b = num(input, "eb", "Düşey yarı eksen b", { positive: true });
  const area = Math.PI * a * b;
  const perimeter = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  const outline = [];
  for (let i = 0; i <= 180; i++) {
    const t = (TAU * i) / 180;
    outline.push([a * Math.cos(t), b * Math.sin(t)]);
  }
  return {
    area, perimeter,
    extras: [["Uzun eksen", c.L(2 * Math.max(a, b))], ["Kısa eksen", c.L(2 * Math.min(a, b))]],
    steps: [
      { text: "Alan:", tex: `A = \\pi ab = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Çevre (Ramanujan II yaklaşımı):", tex: `P \\approx \\pi\\left[3(a+b)-\\sqrt{(3a+b)(a+3b)}\\right] = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline
  };
}

function trapezoid(input, c) {
  const a = num(input, "pa", "Üst taban a", { positive: true });
  const b = num(input, "pb", "Alt taban b", { positive: true });
  const h = num(input, "ph", "Yükseklik h", { positive: true });
  const l1 = num(input, "pl1", "Birinci dik kenar", { positive: true, optional: true });
  const l2 = num(input, "pl2", "İkinci dik kenar", { positive: true, optional: true });
  if ((l1 === null) !== (l2 === null)) fail("Çevreyi hesaplamak için iki dik kenarı birlikte girin ya da boş bırakın.", l1 === null ? "pl1" : "pl2");
  const area = ((a + b) / 2) * h;
  const d = b - a;
  let p = d / 2, perimeter = null;
  if (l1 !== null) {
    if (l1 < h || l2 < h) fail("Kenar uzunluğu yükseklikten küçük olamaz.", l1 < h ? "pl1" : "pl2");
    const p1 = Math.sqrt(l1 * l1 - h * h);
    const fits = [p1, -p1].filter((q) => Math.abs((d - q) * (d - q) + h * h - l2 * l2) <= 1e-6 * l2 * l2);
    if (fits.length === 0) fail("Girilen kenarlar bu iki taban ve yükseklikle bir yamuk oluşturmuyor.", "pl2");
    p = fits[0];
    perimeter = a + b + l1 + l2;
  }
  return {
    area, perimeter,
    extras: [["Orta taban", c.L((a + b) / 2)]],
    steps: [
      { text: "Alan:", tex: `A = \\frac{(a+b)h}{2} = \\frac{(${c.T(a)}+${c.T(b)}) \\times ${c.T(h)}}{2} = ${c.T(area)}\\ ${c.U}^2` },
      ...(perimeter === null ? [] : [{ text: "Çevre:", tex: `P = a+b+c_1+c_2 = ${c.T(perimeter)}\\ ${c.U}` }])
    ],
    outline: [[0, 0], [b, 0], [p + a, h], [p, h]]
  };
}

function parallelogram(input, c) {
  const b = num(input, "qb", "Taban b", { positive: true });
  const s = num(input, "qs", "Eğik kenar s", { positive: true });
  const h = num(input, "qh", "Yükseklik h", { positive: true });
  if (h > s) fail("Yükseklik eğik kenardan büyük olamaz.", "qh");
  const area = b * h, perimeter = 2 * (b + s), x = Math.sqrt(s * s - h * h);
  const d1 = Math.hypot(b + x, h), d2 = Math.hypot(b - x, h);
  return {
    area, perimeter,
    extras: [["Uzun köşegen", c.L(Math.max(d1, d2))], ["Kısa köşegen", c.L(Math.min(d1, d2))]],
    steps: [
      { text: "Alan:", tex: `A = bh = ${c.T(b)} \\times ${c.T(h)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Çevre:", tex: `P = 2(b+s) = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "Eğik kenarın yatay kayması:", tex: `x = \\sqrt{s^2-h^2} = ${c.T(x)}\\ ${c.U}` }
    ],
    outline: [[0, 0], [b, 0], [b + x, h], [x, h]]
  };
}

function rhombus(input, c) {
  const d1 = num(input, "d1", "Birinci köşegen d1", { positive: true });
  const d2 = num(input, "d2", "İkinci köşegen d2", { positive: true });
  const area = (d1 * d2) / 2, side = Math.hypot(d1 / 2, d2 / 2), perimeter = 4 * side;
  return {
    area, perimeter,
    extras: [["Kenar uzunluğu", c.L(side)]],
    steps: [
      { text: "Köşegenlerden alan:", tex: `A = \\frac{d_1 d_2}{2} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Kenar (iki yarı köşegenle Pisagor):", tex: `s = \\sqrt{(d_1/2)^2+(d_2/2)^2} = ${c.T(side)}\\ ${c.U}` },
      { text: "Çevre:", tex: `P = 4s = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: [[d1 / 2, 0], [0, d2 / 2], [-d1 / 2, 0], [0, -d2 / 2]]
  };
}

function regularPolygon(input, c) {
  const n = num(input, "npoly", "Kenar sayısı n", { integer: true, min: 3, max: 10000 });
  const s = num(input, "ns", "Kenar uzunluğu s", { positive: true });
  const t = Math.PI / n;
  const area = (n * s * s) / (4 * Math.tan(t)), perimeter = n * s;
  const apothem = s / (2 * Math.tan(t)), R = s / (2 * Math.sin(t)), interior = ((n - 2) * 180) / n;
  const outline = [];
  for (let k = 0; k < n; k++) outline.push([R * Math.cos((TAU * k) / n), R * Math.sin((TAU * k) / n)]);
  return {
    area, perimeter,
    extras: [
      ["İç çember yarıçapı (apotem)", c.L(apothem)],
      ["Çevre çemberi yarıçapı", c.L(R)],
      ["İç açı (derece)", `${fmt(interior, 6)}°`]
    ],
    steps: [
      { text: "Alan:", tex: `A = \\frac{n s^2}{4\\tan(\\pi/n)} = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Çevre:", tex: `P = ns = ${c.T(perimeter)}\\ ${c.U}` },
      { text: "İç çember yarıçapı:", tex: `a = \\frac{s}{2\\tan(\\pi/n)} = ${c.T(apothem)}\\ ${c.U}` },
      { text: "Çevre çemberi yarıçapı:", tex: `R = \\frac{s}{2\\sin(\\pi/n)} = ${c.T(R)}\\ ${c.U}` }
    ],
    outline
  };
}

function sector(input, c) {
  const r = num(input, "sr", "Yarıçap r", { positive: true });
  const deg0 = num(input, "sang", "Açı θ", { positive: true, max: 360 });
  const th = (deg0 * Math.PI) / 180;
  const area = (r * r * th) / 2, arc = r * th, perimeter = 2 * r + arc;
  return {
    area, perimeter,
    extras: [["Yay uzunluğu", c.L(arc)], ["Radyan cinsinden açı", `${fmt(th, 6)}`]],
    steps: [
      { text: "Radyan cinsinden açı:", tex: `\\theta = \\frac{${c.T(deg0)}\\pi}{180} = ${c.T(th)}` },
      { text: "Alan:", tex: `A = \\frac{1}{2}r^2\\theta = ${c.T(area)}\\ ${c.U}^2` },
      { text: "Yay uzunluğu:", tex: `L = r\\theta = ${c.T(arc)}\\ ${c.U}` },
      { text: "Çevre (iki yarıçap ve yay):", tex: `P = 2r + r\\theta = ${c.T(perimeter)}\\ ${c.U}` }
    ],
    outline: [[0, 0], ...arcPoints(r, 0, th, 90)]
  };
}

function triangle(input, c) {
  const mode = choice(input, "tmode", "Üçgen verileri", ["bh", "sss"], "bh");
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
  const unit = str(input, "unit", "Uzunluk birimi", { default: "cm" });
  const shape = choice(input, "shape", "Şekil", Object.keys(SHAPE_LABELS), "rectangle");
  const c = ctxOf(unit);
  const r = FN[shape](input, c);
  const name = SHAPE_LABELS[shape];
  const results = [{ label: "Alan", value: c.A(r.area), text: c.A(r.area) }];
  const parts = [`Alan = ${c.A(r.area)}`];
  if (r.perimeter !== null) {
    results.push({ label: "Çevre", value: c.L(r.perimeter), text: c.L(r.perimeter) });
    parts.push(`Çevre = ${c.L(r.perimeter)}`);
  }
  for (const [label, value] of r.extras) results.push({ label, value });
  const series = [{ name, points: closed(r.outline), ...(r.outline.length <= 12 ? { marker: "o" } : {}), line: true }, ...(r.extra || [])];
  const blocks = [{ type: "plot", title: `${name} çizimi`, xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series }];
  return {
    results,
    steps: r.steps,
    blocks,
    copy: `${name}: ${parts.join("، ")}`
  };
}
