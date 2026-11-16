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
  description: "Hitung luas, keliling, dan titik berat poligon dari koordinat titik-titiknya dengan rumus sepatu (shoelace), tentukan arah urutan titik, beri peringatan jika sisi-sisinya berpotongan, dan gambar poligonnya.",
  keywords: ["luas poligon", "rumus shoelace", "shoelace", "titik berat", "keliling", "polygon area", "koordinat"],
  formulas: [
    { label: "Luas (rumus shoelace)", tex: "A = \\frac{1}{2}\\left|\\sum_{i}(x_i y_{i+1} - x_{i+1} y_i)\\right|" },
    { label: "Titik berat", tex: "C_x = \\frac{\\sum (x_i + x_{i+1})c_i}{3S},\\quad C_y = \\frac{\\sum (y_i + y_{i+1})c_i}{3S}" }
  ],
  inputs: [
    { id: "verts", label: "Titik sudut poligon (x y)", type: "textarea", rows: 5, placeholder: "0 0\n4 0\n4 3\n0 3", help: "Satu titik per baris dengan format: x y atau x, y. Titik harus diurutkan mengelilingi poligon." },
    { id: "unit", label: "Satuan panjang", type: "text", default: "m" }
  ],
  example: { values: { verts: "0 0\n4 0\n4 3\n0 3", unit: "m" }, expect: ["12 m²", "14 m", "(2, 1.5)"], note: "Contoh: persegi panjang 4 × 3 meter." },
  invalid: { values: { verts: "0 0\n4 0", unit: "m" } },
  related: ["unit-converter", "far-coverage"]
};

export function solve(input) {
  const unit = str(input, "unit", "Satuan panjang", { default: "m" });
  const lines = str(input, "verts", "Titik sudut poligon").split(/\r?\n/);
  const pts = [];
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t === "") return;
    const parts = t.split(/[\s,،;؛]+/).filter(Boolean);
    if (parts.length !== 2) fail(`Baris ${i + 1}: setiap titik harus berisi tepat dua koordinat (x y).`, "verts");
    const x = parseNumber(parts[0]), y = parseNumber(parts[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) fail(`Baris ${i + 1}: koordinat harus berupa angka.`, "verts");
    pts.push({ x, y });
  });
  if (pts.length < 3) fail("Masukkan minimal tiga titik.", "verts");
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
  if (Math.abs(S) < 1e-12) fail("Poligon merosot: semua titik berada pada satu garis lurus atau berhimpit, sehingga luasnya nol.", "verts");
  const area = Math.abs(S) / 2;
  const gx = cxSum / (3 * S), gy = cySum / (3 * S);
  const ccw = S > 0;
  const orientation = ccw ? "Berlawanan arah jarum jam" : "Searah jarum jam";
  const crossing = selfIntersects(pts);
  const closed = [...pts, pts[0]].map((p) => [p.x, p.y]);
  const blocks = [
    { type: "plot", title: "Poligon dan titik beratnya", xLabel: `x (${unit})`, yLabel: `y (${unit})`, series: [{ name: "Poligon", points: closed, marker: "o", line: true }, { name: "Titik berat", points: [[gx, gy]], marker: "x", line: false }] }
  ];
  if (crossing) blocks.unshift({ type: "note", tone: "warn", text: "Sisi-sisi poligon saling berpotongan, sehingga luas yang dihitung tidak mewakili luas nyata yang jelas; periksa urutan titik." });
  const steps = [
    { text: "Jumlah suku shoelace (2 × luas berarah):", tex: `S = \\sum (x_i y_{i+1} - x_{i+1} y_i) = ${ntex(S, 6)}` },
    { text: "Luas:", tex: `A = \\frac{|S|}{2} = ${ntex(area, 6)}\\ ${unit}^2` },
    { text: "Keliling (jumlah panjang sisi):", tex: `P = ${ntex(perimeter, 6)}\\ ${unit}` },
    { text: "Titik berat:", tex: `C_x = \\frac{${ntex(cxSum, 6)}}{3S} = ${ntex(gx, 6)},\\quad C_y = \\frac{${ntex(cySum, 6)}}{3S} = ${ntex(gy, 6)}` }
  ];
  return {
    results: [
      { label: "Luas", value: `${fmt(area, 6)} ${unit}²`, text: `${fmt(area, 6)} ${unit}²` },
      { label: "Keliling", value: `${fmt(perimeter, 6)} ${unit}`, text: `${fmt(perimeter, 6)} ${unit}` },
      { label: "Orientasi titik", value: orientation },
      { label: "Titik berat", value: `(${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}`, text: `(${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}` },
      { label: "Perpotongan sisi", value: crossing ? "Ada" : "Tidak ada" }
    ],
    steps,
    blocks,
    copy: `Luas = ${fmt(area, 6)} ${unit}², keliling = ${fmt(perimeter, 6)} ${unit}, titik berat = (${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}`,
    values: { area, perimeter, gx, gy, S, ccw, crossing }
  };
}
