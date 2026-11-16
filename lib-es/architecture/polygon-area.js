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
  description: "Calcule el área, el perímetro y el centroide de un polígono a partir de las coordenadas de sus vértices con la fórmula del cordón (shoelace), determine el sentido de los vértices, avise si las aristas se cruzan y dibuje el polígono.",
  keywords: ["área de polígono", "fórmula del cordón", "shoelace", "centroide", "perímetro", "polygon area", "coordenadas"],
  formulas: [
    { label: "Área (fórmula del cordón)", tex: "A = \\frac{1}{2}\\left|\\sum_{i}(x_i y_{i+1} - x_{i+1} y_i)\\right|" },
    { label: "Centroide", tex: "C_x = \\frac{\\sum (x_i + x_{i+1})c_i}{3S},\\quad C_y = \\frac{\\sum (y_i + y_{i+1})c_i}{3S}" }
  ],
  inputs: [
    { id: "verts", label: "Vértices del polígono (x y)", type: "textarea", rows: 5, placeholder: "0 0\n4 0\n4 3\n0 3", help: "Un vértice por línea con el formato: x y o x, y. Los vértices deben listarse en orden alrededor del polígono." },
    { id: "unit", label: "Unidad de longitud", type: "text", default: "m" }
  ],
  example: { values: { verts: "0 0\n4 0\n4 3\n0 3", unit: "m" }, expect: ["12 m²", "14 m", "(2, 1.5)"], note: "Ejemplo: rectángulo de 4 × 3 m." },
  invalid: { values: { verts: "0 0\n4 0", unit: "m" } },
  related: ["unit-converter", "far-coverage"]
};

export function solve(input) {
  const unit = str(input, "unit", "Unidad de longitud", { default: "m" });
  const lines = str(input, "verts", "Vértices del polígono").split(/\r?\n/);
  const pts = [];
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t === "") return;
    const parts = t.split(/[\s,،;؛]+/).filter(Boolean);
    if (parts.length !== 2) fail(`Línea ${i + 1}: cada vértice debe contener exactamente dos coordenadas (x y).`, "verts");
    const x = parseNumber(parts[0]), y = parseNumber(parts[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) fail(`Línea ${i + 1}: las coordenadas deben ser números.`, "verts");
    pts.push({ x, y });
  });
  if (pts.length < 3) fail("Introduzca al menos tres vértices.", "verts");
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
  if (Math.abs(S) < 1e-12) fail("El polígono es degenerado: todos los vértices están en una misma línea o coinciden, así que su área es cero.", "verts");
  const area = Math.abs(S) / 2;
  const gx = cxSum / (3 * S), gy = cySum / (3 * S);
  const ccw = S > 0;
  const orientation = ccw ? "En sentido antihorario" : "En sentido horario";
  const crossing = selfIntersects(pts);
  const closed = [...pts, pts[0]].map((p) => [p.x, p.y]);
  const blocks = [
    { type: "plot", title: "Polígono y su centroide", xLabel: `x (${unit})`, yLabel: `y (${unit})`, series: [{ name: "Polígono", points: closed, marker: "o", line: true }, { name: "Centroide", points: [[gx, gy]], marker: "x", line: false }] }
  ];
  if (crossing) blocks.unshift({ type: "note", tone: "warn", text: "Las aristas del polígono se cruzan entre sí, así que el área calculada no representa un área real clara; revise el orden de los vértices." });
  const steps = [
    { text: "Suma de los términos de la fórmula del cordón (2 × área con signo):", tex: `S = \\sum (x_i y_{i+1} - x_{i+1} y_i) = ${ntex(S, 6)}` },
    { text: "Área:", tex: `A = \\frac{|S|}{2} = ${ntex(area, 6)}\\ ${unit}^2` },
    { text: "Perímetro (suma de las longitudes de los lados):", tex: `P = ${ntex(perimeter, 6)}\\ ${unit}` },
    { text: "Centroide:", tex: `C_x = \\frac{${ntex(cxSum, 6)}}{3S} = ${ntex(gx, 6)},\\quad C_y = \\frac{${ntex(cySum, 6)}}{3S} = ${ntex(gy, 6)}` }
  ];
  return {
    results: [
      { label: "Área", value: `${fmt(area, 6)} ${unit}²`, text: `${fmt(area, 6)} ${unit}²` },
      { label: "Perímetro", value: `${fmt(perimeter, 6)} ${unit}`, text: `${fmt(perimeter, 6)} ${unit}` },
      { label: "Sentido de los vértices", value: orientation },
      { label: "Centroide", value: `(${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}`, text: `(${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}` },
      { label: "Cruce de aristas", value: crossing ? "Sí" : "No" }
    ],
    steps,
    blocks,
    copy: `Área = ${fmt(area, 6)} ${unit}², perímetro = ${fmt(perimeter, 6)} ${unit}, centroide = (${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}`,
    values: { area, perimeter, gx, gy, S, ccw, crossing }
  };
}
