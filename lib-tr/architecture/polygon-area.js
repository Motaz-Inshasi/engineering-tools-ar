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
  description: "Çokgenin alanını, çevresini ve geometrik merkezini köşe koordinatlarından ayakkabı bağı yöntemiyle (shoelace) hesaplayın; köşelerin yönünü belirleyin, kenarların kesişip kesişmediğini uyarın ve çokgeni çizin.",
  keywords: ["çokgen alanı", "ayakkabı bağı yöntemi", "shoelace", "geometrik merkez", "çevre", "polygon area", "koordinatlar"],
  formulas: [
    { label: "Alan (ayakkabı bağı yöntemi)", tex: "A = \\frac{1}{2}\\left|\\sum_{i}(x_i y_{i+1} - x_{i+1} y_i)\\right|" },
    { label: "Geometrik merkez", tex: "C_x = \\frac{\\sum (x_i + x_{i+1})c_i}{3S},\\quad C_y = \\frac{\\sum (y_i + y_{i+1})c_i}{3S}" }
  ],
  inputs: [
    { id: "verts", label: "Çokgen köşeleri (x y)", type: "textarea", rows: 5, placeholder: "0 0\n4 0\n4 3\n0 3", help: "Her satırda bir köşe: x y veya x, y biçiminde. Köşeler çokgenin etrafında sırayla yazılır." },
    { id: "unit", label: "Uzunluk birimi", type: "text", default: "m" }
  ],
  example: { values: { verts: "0 0\n4 0\n4 3\n0 3", unit: "m" }, expect: ["12 m²", "14 m", "(2, 1.5)"], note: "Örnek: 4 × 3 metrelik dikdörtgen." },
  invalid: { values: { verts: "0 0\n4 0", unit: "m" } },
  related: ["unit-converter", "far-coverage"]
};

export function solve(input) {
  const unit = str(input, "unit", "Uzunluk birimi", { default: "m" });
  const lines = str(input, "verts", "Çokgen köşeleri").split(/\r?\n/);
  const pts = [];
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t === "") return;
    const parts = t.split(/[\s,،;؛]+/).filter(Boolean);
    if (parts.length !== 2) fail(`${i + 1}. satır: her köşe yalnızca iki koordinat (x y) içermelidir.`, "verts");
    const x = parseNumber(parts[0]), y = parseNumber(parts[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) fail(`${i + 1}. satır: koordinatlar sayı olmalıdır.`, "verts");
    pts.push({ x, y });
  });
  if (pts.length < 3) fail("En az üç köşe girin.", "verts");
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
  if (Math.abs(S) < 1e-12) fail("Çokgen dejenere: tüm köşeler aynı doğru üzerinde veya çakışık, bu nedenle alanı sıfır.", "verts");
  const area = Math.abs(S) / 2;
  const gx = cxSum / (3 * S), gy = cySum / (3 * S);
  const ccw = S > 0;
  const orientation = ccw ? "Saat yönünün tersine" : "Saat yönünde";
  const crossing = selfIntersects(pts);
  const closed = [...pts, pts[0]].map((p) => [p.x, p.y]);
  const blocks = [
    { type: "plot", title: "Çokgen ve geometrik merkezi", xLabel: `x (${unit})`, yLabel: `y (${unit})`, series: [{ name: "Çokgen", points: closed, marker: "o", line: true }, { name: "Geometrik merkez", points: [[gx, gy]], marker: "x", line: false }] }
  ];
  if (crossing) blocks.unshift({ type: "note", tone: "warn", text: "Çokgenin kenarları birbiriyle kesişiyor; bu nedenle hesaplanan alan açık bir gerçek alanı temsil etmiyor. Köşe sıralamasını kontrol edin." });
  const steps = [
    { text: "Ayakkabı bağı terimlerinin toplamı (2 × işaretli alan):", tex: `S = \\sum (x_i y_{i+1} - x_{i+1} y_i) = ${ntex(S, 6)}` },
    { text: "Alan:", tex: `A = \\frac{|S|}{2} = ${ntex(area, 6)}\\ ${unit}^2` },
    { text: "Çevre (kenar uzunlukları toplamı):", tex: `P = ${ntex(perimeter, 6)}\\ ${unit}` },
    { text: "Geometrik merkez:", tex: `C_x = \\frac{${ntex(cxSum, 6)}}{3S} = ${ntex(gx, 6)},\\quad C_y = \\frac{${ntex(cySum, 6)}}{3S} = ${ntex(gy, 6)}` }
  ];
  return {
    results: [
      { label: "Alan", value: `${fmt(area, 6)} ${unit}²`, text: `${fmt(area, 6)} ${unit}²` },
      { label: "Çevre", value: `${fmt(perimeter, 6)} ${unit}`, text: `${fmt(perimeter, 6)} ${unit}` },
      { label: "Köşe yönü", value: orientation },
      { label: "Geometrik merkez", value: `(${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}`, text: `(${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}` },
      { label: "Kenar kesişimi", value: crossing ? "var" : "yok" }
    ],
    steps,
    blocks,
    copy: `Alan = ${fmt(area, 6)} ${unit}², çevre = ${fmt(perimeter, 6)} ${unit}, merkez = (${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}`,
    values: { area, perimeter, gx, gy, S, ccw, crossing }
  };
}
