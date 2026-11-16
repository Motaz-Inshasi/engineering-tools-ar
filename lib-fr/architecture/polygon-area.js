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
  description: "Calculez l'aire, le périmètre et le centroïde d'un polygone à partir des coordonnées de ses sommets avec la formule du lacet, précisez le sens des sommets, signalez si les côtés se croisent et tracez le polygone.",
  keywords: ["aire d'un polygone", "formule du lacet", "shoelace", "centroïde", "périmètre", "polygon area", "coordonnées"],
  formulas: [
    { label: "Aire (formule du lacet)", tex: "A = \\frac{1}{2}\\left|\\sum_{i}(x_i y_{i+1} - x_{i+1} y_i)\\right|" },
    { label: "Centroïde", tex: "C_x = \\frac{\\sum (x_i + x_{i+1})c_i}{3S},\\quad C_y = \\frac{\\sum (y_i + y_{i+1})c_i}{3S}" }
  ],
  inputs: [
    { id: "verts", label: "Sommets du polygone (x y)", type: "textarea", rows: 5, placeholder: "0 0\n4 0\n4 3\n0 3", help: "Un sommet par ligne, sous la forme : x y ou x, y. Les sommets doivent être donnés dans l'ordre autour du polygone." },
    { id: "unit", label: "Unité de longueur", type: "text", default: "m" }
  ],
  example: { values: { verts: "0 0\n4 0\n4 3\n0 3", unit: "m" }, expect: ["12 m²", "14 m", "(2, 1.5)"], note: "Exemple : un rectangle de 4 × 3 m." },
  invalid: { values: { verts: "0 0\n4 0", unit: "m" } },
  related: ["unit-converter", "far-coverage"]
};

export function solve(input) {
  const unit = str(input, "unit", "Unité de longueur", { default: "m" });
  const lines = str(input, "verts", "Sommets du polygone").split(/\r?\n/);
  const pts = [];
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t === "") return;
    const parts = t.split(/[\s,،;؛]+/).filter(Boolean);
    if (parts.length !== 2) fail(`Ligne ${i + 1} : chaque sommet doit contenir exactement deux coordonnées (x y).`, "verts");
    const x = parseNumber(parts[0]), y = parseNumber(parts[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) fail(`Ligne ${i + 1} : les coordonnées doivent être des nombres.`, "verts");
    pts.push({ x, y });
  });
  if (pts.length < 3) fail("Saisissez au moins trois sommets.", "verts");
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
  if (Math.abs(S) < 1e-12) fail("Le polygone est dégénéré : tous les sommets sont alignés ou confondus, son aire est donc nulle.", "verts");
  const area = Math.abs(S) / 2;
  const gx = cxSum / (3 * S), gy = cySum / (3 * S);
  const ccw = S > 0;
  const orientation = ccw ? "Sens antihoraire" : "Sens horaire";
  const crossing = selfIntersects(pts);
  const closed = [...pts, pts[0]].map((p) => [p.x, p.y]);
  const blocks = [
    { type: "plot", title: "Polygone et son centroïde", xLabel: `x (${unit})`, yLabel: `y (${unit})`, series: [{ name: "Polygone", points: closed, marker: "o", line: true }, { name: "Centroïde", points: [[gx, gy]], marker: "x", line: false }] }
  ];
  if (crossing) blocks.unshift({ type: "note", tone: "warn", text: "Les côtés du polygone se croisent, donc l'aire calculée ne représente pas une aire réelle claire ; vérifiez l'ordre des sommets." });
  const steps = [
    { text: "Somme des termes du lacet (2 × aire signée) :", tex: `S = \\sum (x_i y_{i+1} - x_{i+1} y_i) = ${ntex(S, 6)}` },
    { text: "Aire :", tex: `A = \\frac{|S|}{2} = ${ntex(area, 6)}\\ ${unit}^2` },
    { text: "Périmètre (somme des longueurs des côtés) :", tex: `P = ${ntex(perimeter, 6)}\\ ${unit}` },
    { text: "Centroïde :", tex: `C_x = \\frac{${ntex(cxSum, 6)}}{3S} = ${ntex(gx, 6)},\\quad C_y = \\frac{${ntex(cySum, 6)}}{3S} = ${ntex(gy, 6)}` }
  ];
  return {
    results: [
      { label: "Aire", value: `${fmt(area, 6)} ${unit}²`, text: `${fmt(area, 6)} ${unit}²` },
      { label: "Périmètre", value: `${fmt(perimeter, 6)} ${unit}`, text: `${fmt(perimeter, 6)} ${unit}` },
      { label: "Sens des sommets", value: orientation },
      { label: "Centroïde", value: `(${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}`, text: `(${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}` },
      { label: "Croisement des côtés", value: crossing ? "Oui" : "Non" }
    ],
    steps,
    blocks,
    copy: `Aire = ${fmt(area, 6)} ${unit}², périmètre = ${fmt(perimeter, 6)} ${unit}, centroïde = (${fmt(gx, 6)}, ${fmt(gy, 6)}) ${unit}`,
    values: { area, perimeter, gx, gy, S, ccw, crossing }
  };
}
