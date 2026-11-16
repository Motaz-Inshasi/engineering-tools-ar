import { fail, str } from "../core/validate.js";
import { fmt, parseNumber, tex as ntex } from "../core/format.js";

function orient(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function crosses(a, b, c, d) {
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function selfIntersects(pts) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (crosses(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return true;
    }
  }
  return false;
}

export const meta = {
  description: "کثیر الاضلاع کا رقبہ، محیط اور جیومیٹرک سینٹر اس کے راسوں کے محدد سے شو لیس فارمولے کے ذریعے حساب کریں، راسوں کی سمت معلوم کریں، اضلاع کے ایک دوسرے کو قطع کرنے پر خبردار کریں، اور کثیر الاضلاع کا خاکہ بنائیں۔",
  keywords: ["کثیر الاضلاع کا رقبہ", "شو لیس فارمولا", "shoelace", "جیومیٹرک سینٹر", "محیط", "polygon area", "محدد (کوآرڈینیٹس)"],
  formulas: [
    { label: "رقبہ (شو لیس فارمولا)", tex: "A = \\frac{1}{2}\\left|\\sum_{i}(x_i y_{i+1} - x_{i+1} y_i)\\right|" },
    { label: "جیومیٹرک سینٹر", tex: "C_x = \\frac{\\sum (x_i + x_{i+1})c_i}{3S},\\quad C_y = \\frac{\\sum (y_i + y_{i+1})c_i}{3S}" }
  ],
  inputs: [
    { id: "verts", label: "کثیر الاضلاع کے راس (x y)", type: "textarea", rows: 5, placeholder: "0 0\n4 0\n4 3\n0 3", help: "ہر سطر میں ایک راس، شکل: x y یا x, y۔ راس کثیر الاضلاع کے گرد ترتیب وار لکھیں۔" },
    { id: "unit", label: "لمبائی کی اکائی", type: "text", default: "m" }
  ],
  example: { values: { verts: "0 0\n4 0\n4 3\n0 3", unit: "m" }, expect: ["12 m²", "14 m", "(2, 1.5)"], note: "مثال: 4 × 3 میٹر مستطیل۔" },
  invalid: { values: { verts: "0 0\n4 0", unit: "m" } },
  related: ["unit-converter", "far-coverage"]
};

export function solve(input) {
  const unit = str(input, "unit", "لمبائی کی اکائی", { default: "m" });
  const lines = str(input, "verts", "کثیر الاضلاع کے راس").split(/\r?\n/);
  const pts = [];
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t === "") return;
    const parts = t.split(/[\s,،;؛]+/).filter(Boolean);
    if (parts.length !== 2) fail(`سطر ${i + 1}: ہر راس میں صرف دو محدد (x y) ہونے چاہئیں۔`, "verts");
    const x = parseNumber(parts[0]), y = parseNumber(parts[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) fail(`سطر ${i + 1}: محدد نمبر ہونے چاہئیں۔`, "verts");
    pts.push({ x, y });
  });
  if (pts.length < 3) fail("کم از کم تین راس درج کریں۔", "verts");
  const n = pts.length;
  let S = 0, cxSum = 0, cySum = 0, perimeter = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const c = a.x * b.y - b.x * a.y;
    S += c;
    cxSum += (a.x + b.x) * c;
    cySum += (a.y + b.y) * c;
    perimeter += Math.hypot(b.x - a.x, b.y - a.y);
  }
  if (Math.abs(S) < 1e-12) fail("کثیر الاضلاع منحل ہے: تمام راس ایک ہی سیدھی لکیر پر ہیں یا آپس میں ملتے ہیں، اس لیے اس کا رقبہ صفر ہے۔", "verts");
  const area = Math.abs(S) / 2;
  const gx = cxSum / (3 * S), gy = cySum / (3 * S);
  const ccw = S > 0;
  const orientation = ccw ? "گھڑی کی سوئیوں کی الٹی سمت" : "گھڑی کی سوئیوں کی سمت";
  const crossing = selfIntersects(pts);
  const closed = [...pts, pts[0]].map((p) => [p.x, p.y]);
  const blocks = [
    { type: "plot", title: "کثیر الاضلاع اور اس کا جیومیٹرک سینٹر", xLabel: `x (${unit})`, yLabel: `y (${unit})`, series: [{ name: "کثیر الاضلاع", points: closed, marker: "o", line: true }, { name: "جیومیٹرک سینٹر", points: [[gx, gy]], marker: "x", line: false }] }
  ];
  if (crossing) blocks.unshift({ type: "note", tone: "warn", text: "کثیر الاضلاع کے اضلاع ایک دوسرے کو قطع کرتے ہیں، اس لیے حساب کیا گیا رقبہ واضح حقیقی رقبہ نہیں ہے؛ راسوں کی ترتیب چیک کریں۔" });
  const steps = [
    { text: "شو لیس اصطلاحات کا مجموعہ (2 × سائنڈ رقبہ):", tex: `S = \\sum (x_i y_{i+1} - x_{i+1} y_i) = ${ntex(S, 6)}` },
    { text: "رقبہ:", tex: `A = \\frac{|S|}{2} = ${ntex(area, 6)}\\ ${unit}^2` },
    { text: "محیط (اضلاع کی لمبائیوں کا مجموعہ):", tex: `P = ${ntex(perimeter, 6)}\\ ${unit}` },
    { text: "جیومیٹرک سینٹر:", tex: `C_x = \\frac{${ntex(cxSum, 6)}}{3S} = ${ntex(gx, 6)},\\quad C_y = \\frac{${ntex(cySum, 6)}}{3S} = ${ntex(gy, 6)}` }
  ];
  return {
    results: [
      { label: "رقبہ", value: `${fmt(area, 6)} ${unit}²`, text: `${fmt(area, 6)} ${unit}²` },
      { label: "محیط", value: `${fmt(perimeter, 6)} ${unit}`, text: `${fmt(perimeter, 6)} ${unit}` },
      { label: "راسوں کی سمت", value: orientation },
      { label: "جیومیٹرک سینٹر", value: `(${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}`, text: `(${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}` },
      { label: "اضلاع کا تقاطع", value: crossing ? "موجود ہے" : "موجود نہیں" }
    ],
    steps,
    blocks,
    copy: `رقبہ = ${fmt(area, 6)} ${unit}²، محیط = ${fmt(perimeter, 6)} ${unit}، سینٹر = (${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}`,
    values: { area, perimeter, gx, gy, S, ccw, crossing }
  };
}
