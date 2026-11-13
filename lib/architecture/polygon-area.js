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
  description: "احسب مساحة المضلع ومحيطه ومركزه الهندسي من إحداثيات رؤوسه بقانون رباط الحذاء، مع تحديد اتجاه الرؤوس، وتنبيه إن كانت الأضلاع تتقاطع، ورسم المضلع.",
  keywords: ["مساحة مضلع", "قانون الحذاء", "shoelace", "مركز هندسي", "محيط", "polygon area", "إحداثيات"],
  formulas: [
    { label: "المساحة (قانون الحذاء)", tex: "A = \\frac{1}{2}\\left|\\sum_{i}(x_i y_{i+1} - x_{i+1} y_i)\\right|" },
    { label: "المركز الهندسي", tex: "C_x = \\frac{\\sum (x_i + x_{i+1})c_i}{3S},\\quad C_y = \\frac{\\sum (y_i + y_{i+1})c_i}{3S}" }
  ],
  inputs: [
    { id: "verts", label: "رؤوس المضلع (x y)", type: "textarea", rows: 5, placeholder: "0 0\n4 0\n4 3\n0 3", help: "رأس في كل سطر بالصيغة: x y أو x, y. الرؤوس بالترتيب حول المضلع." },
    { id: "unit", label: "وحدة الطول", type: "text", default: "m" }
  ],
  example: { values: { verts: "0 0\n4 0\n4 3\n0 3", unit: "m" }, expect: ["12 m²", "14 m", "(2, 1.5)"], note: "مثال: مستطيل 4 × 3 متر." },
  invalid: { values: { verts: "0 0\n4 0", unit: "m" } },
  related: ["unit-converter", "far-coverage"]
};

export function solve(input) {
  const unit = str(input, "unit", "وحدة الطول", { default: "m" });
  const lines = str(input, "verts", "رؤوس المضلع").split(/\r?\n/);
  const pts = [];
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t === "") return;
    const parts = t.split(/[\s,،;؛]+/).filter(Boolean);
    if (parts.length !== 2) fail(`السطر ${i + 1}: كل رأس يجب أن يحتوي إحداثيين فقط (x y).`, "verts");
    const x = parseNumber(parts[0]), y = parseNumber(parts[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) fail(`السطر ${i + 1}: الإحداثيات يجب أن تكون أرقاماً.`, "verts");
    pts.push({ x, y });
  });
  if (pts.length < 3) fail("أدخل ثلاثة رؤوس على الأقل.", "verts");
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
  if (Math.abs(S) < 1e-12) fail("المضلع مُنحل: كل الرؤوس على استقامة واحدة أو متطابقة، فمساحته صفر.", "verts");
  const area = Math.abs(S) / 2;
  const gx = cxSum / (3 * S), gy = cySum / (3 * S);
  const ccw = S > 0;
  const orientation = ccw ? "عكس اتجاه عقارب الساعة" : "مع اتجاه عقارب الساعة";
  const crossing = selfIntersects(pts);
  const closed = [...pts, pts[0]].map((p) => [p.x, p.y]);
  const blocks = [
    { type: "plot", title: "المضلع ومركزه الهندسي", xLabel: `x (${unit})`, yLabel: `y (${unit})`, series: [{ name: "المضلع", points: closed, marker: "o", line: true }, { name: "المركز الهندسي", points: [[gx, gy]], marker: "x", line: false }] }
  ];
  if (crossing) blocks.unshift({ type: "note", tone: "warn", text: "أضلاع المضلع تتقاطع مع بعضها، لذا لا تمثل المساحة المحسوبة مساحة فعلية واضحة؛ راجع ترتيب الرؤوس." });
  const steps = [
    { text: "مجموع حدود الحذاء (2 × المساحة المُوقَّعة):", tex: `S = \\sum (x_i y_{i+1} - x_{i+1} y_i) = ${ntex(S, 6)}` },
    { text: "المساحة:", tex: `A = \\frac{|S|}{2} = ${ntex(area, 6)}\\ ${unit}^2` },
    { text: "المحيط (مجموع أطوال الأضلاع):", tex: `P = ${ntex(perimeter, 6)}\\ ${unit}` },
    { text: "المركز الهندسي:", tex: `C_x = \\frac{${ntex(cxSum, 6)}}{3S} = ${ntex(gx, 6)},\\quad C_y = \\frac{${ntex(cySum, 6)}}{3S} = ${ntex(gy, 6)}` }
  ];
  return {
    results: [
      { label: "المساحة", value: `${fmt(area, 6)} ${unit}²`, text: `${fmt(area, 6)} ${unit}²` },
      { label: "المحيط", value: `${fmt(perimeter, 6)} ${unit}`, text: `${fmt(perimeter, 6)} ${unit}` },
      { label: "اتجاه الرؤوس", value: orientation },
      { label: "المركز الهندسي", value: `(${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}`, text: `(${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}` },
      { label: "تقاطع الأضلاع", value: crossing ? "يوجد" : "لا يوجد" }
    ],
    steps,
    blocks,
    copy: `المساحة = ${fmt(area, 6)} ${unit}²، المحيط = ${fmt(perimeter, 6)} ${unit}، المركز = (${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}`,
    values: { area, perimeter, gx, gy, S, ccw, crossing }
  };
}
