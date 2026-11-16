import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, eng, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const MAT_OPTIONS = [...MATERIALS.map((m) => [m.id, m.ar]), ["custom", "Custom material (enter E manually)"]];
const find = (id) => MATERIALS.find((m) => m.id === id);

const CASES = {
  ss_point: {
    name: "Simply supported beam with a point load P at midspan",
    load: "P",
    deflTex: "\\delta_{max} = \\frac{PL^3}{48EI}",
    momTex: "M_{max} = \\frac{PL}{4}",
    shearTex: "V_{max} = \\frac{P}{2}",
    defl: (q, L, EI) => (q * L ** 3) / (48 * EI),
    moment: (q, L) => (q * L) / 4,
    shear: (q) => q / 2,
    substDefl: (q, L, EI) => `\\frac{${ntex(q)} \\times ${ntex(L)}^3}{48 \\times ${ntex(EI)}}`,
    substMom: (q, L) => `\\frac{${ntex(q)} \\times ${ntex(L)}}{4}`,
    substShear: (q) => `\\frac{${ntex(q)}}{2}`,
    reactions: (q) => [["Reaction at support A", q / 2], ["Reaction at support B", q / 2]],
    fixed: false,
    curve: (q, L, EI, x) => {
      const s = x <= L / 2 ? x : L - x;
      return (q * s * (3 * L * L - 4 * s * s)) / (48 * EI);
    }
  },
  ss_uniform: {
    name: "Simply supported beam with uniform load w",
    load: "w",
    deflTex: "\\delta_{max} = \\frac{5wL^4}{384EI}",
    momTex: "M_{max} = \\frac{wL^2}{8}",
    shearTex: "V_{max} = \\frac{wL}{2}",
    defl: (q, L, EI) => (5 * q * L ** 4) / (384 * EI),
    moment: (q, L) => (q * L * L) / 8,
    shear: (q, L) => (q * L) / 2,
    substDefl: (q, L, EI) => `\\frac{5 \\times ${ntex(q)} \\times ${ntex(L)}^4}{384 \\times ${ntex(EI)}}`,
    substMom: (q, L) => `\\frac{${ntex(q)} \\times ${ntex(L)}^2}{8}`,
    substShear: (q, L) => `\\frac{${ntex(q)} \\times ${ntex(L)}}{2}`,
    reactions: (q, L) => [["Reaction at support A", (q * L) / 2], ["Reaction at support B", (q * L) / 2]],
    fixed: false,
    curve: (q, L, EI, x) => (q * x * (L ** 3 - 2 * L * x * x + x ** 3)) / (24 * EI)
  },
  cant_point: {
    name: "Cantilever beam (fixed at one end) with a point load P at the free end",
    load: "P",
    deflTex: "\\delta_{max} = \\frac{PL^3}{3EI}",
    momTex: "M_{max} = PL",
    shearTex: "V_{max} = P",
    defl: (q, L, EI) => (q * L ** 3) / (3 * EI),
    moment: (q, L) => q * L,
    shear: (q) => q,
    substDefl: (q, L, EI) => `\\frac{${ntex(q)} \\times ${ntex(L)}^3}{3 \\times ${ntex(EI)}}`,
    substMom: (q, L) => `${ntex(q)} \\times ${ntex(L)}`,
    substShear: (q) => `${ntex(q)}`,
    reactions: (q) => [["Vertical reaction at the fixed support", q]],
    fixed: true,
    curve: (q, L, EI, x) => (q * x * x * (3 * L - x)) / (6 * EI)
  },
  cant_uniform: {
    name: "Cantilever beam (fixed at one end) with uniform load w",
    load: "w",
    deflTex: "\\delta_{max} = \\frac{wL^4}{8EI}",
    momTex: "M_{max} = \\frac{wL^2}{2}",
    shearTex: "V_{max} = wL",
    defl: (q, L, EI) => (q * L ** 4) / (8 * EI),
    moment: (q, L) => (q * L * L) / 2,
    shear: (q, L) => q * L,
    substDefl: (q, L, EI) => `\\frac{${ntex(q)} \\times ${ntex(L)}^4}{8 \\times ${ntex(EI)}}`,
    substMom: (q, L) => `\\frac{${ntex(q)} \\times ${ntex(L)}^2}{2}`,
    substShear: (q, L) => `${ntex(q)} \\times ${ntex(L)}`,
    reactions: (q, L) => [["Vertical reaction at the fixed support", q * L]],
    fixed: true,
    curve: (q, L, EI, x) => (q * x * x * (6 * L * L - 4 * L * x + x * x)) / (24 * EI)
  }
};

export const meta = {
  description: "Calculate the maximum deflection, bending moment, shear force, support reactions and bending stress of a simply supported or cantilever beam under a point or uniform load, plot the deflection curve, and check the L/360 limit.",
  keywords: ["Beam bending", "Beam deflection", "Bending moment", "Shear force", "Simply supported beam", "Cantilever beam", "beam deflection", "bending moment", "L/360"],
  formulas: [
    { label: "Deflection of a simply supported beam with a point load", tex: "\\delta_{max} = \\frac{PL^3}{48EI}" },
    { label: "Deflection of a simply supported beam with a uniform load", tex: "\\delta_{max} = \\frac{5wL^4}{384EI}" },
    { label: "Deflection of a cantilever with a point load at the end", tex: "\\delta_{max} = \\frac{PL^3}{3EI}" },
    { label: "Deflection of a cantilever with a uniform load", tex: "\\delta_{max} = \\frac{wL^4}{8EI}" },
    { label: "Bending stress", tex: "\\sigma = \\frac{Mc}{I}" }
  ],
  inputs: [
    { id: "beam", label: "Beam type and load", type: "select", default: "ss_point", options: [["ss_point", "Simply supported – point load at midspan"], ["ss_uniform", "Simply supported – uniform load"], ["cant_point", "Cantilever – point load at free end"], ["cant_uniform", "Cantilever – uniform load"]] },
    { id: "L", label: "Beam length L", unit: "m", type: "number", default: "4" },
    { id: "P", label: "Point load P", unit: "N", type: "number", default: "10k", when: { beam: ["ss_point", "cant_point"] } },
    { id: "w", label: "Uniform load w", unit: "N/m", type: "number", default: "5k", when: { beam: ["ss_uniform", "cant_uniform"] } },
    { id: "mat", label: "Material (for elastic modulus E)", type: "select", default: "a36", options: MAT_OPTIONS },
    { id: "Ecust", label: "Elastic modulus E (for custom material)", unit: "GPa", type: "number", default: "200", when: { mat: ["custom"] } },
    { id: "section", label: "Section", type: "select", default: "rect", options: [["rect", "Rectangular b × h"], ["circle", "Circular with diameter d"], ["custom", "Second moment of area I entered manually"]] },
    { id: "b", label: "Width b", unit: "mm", type: "number", default: "100", when: { section: ["rect"] } },
    { id: "h", label: "Height h", unit: "mm", type: "number", default: "200", when: { section: ["rect"] } },
    { id: "d", label: "Diameter d", unit: "mm", type: "number", default: "100", when: { section: ["circle"] } },
    { id: "Icust", label: "Second moment of area I", type: "number", default: "8e7", when: { section: ["custom"] } },
    { id: "Iunit", label: "Unit of I", type: "select", default: "mm4", options: [["mm4", "mm⁴"], ["cm4", "cm⁴"]], when: { section: ["custom"] } },
    { id: "ccust", label: "Distance c from the neutral axis to the outermost fiber", unit: "mm", type: "number", default: "100", when: { section: ["custom"] } }
  ],
  example: {
    values: { beam: "ss_point", L: "4", P: "10k", w: "5k", mat: "a36", Ecust: "200", section: "custom", b: "100", h: "200", d: "100", Icust: "8e7", Iunit: "mm4", ccust: "100" },
    expect: ["δ = 0.8333 mm", "σ = 12.5 MPa"],
    note: "Example: a simply supported beam 4 m long with a 10 kN load at midspan, E = 200 GPa, and I = 8.0e7 mm⁴."
  },
  invalid: { values: { beam: "ss_point", L: "0", P: "10k", w: "5k", mat: "a36", Ecust: "200", section: "rect", b: "100", h: "200", d: "100", Icust: "", Iunit: "mm4", ccust: "" } },
  related: ["material-properties", "stress-strain", "unit-converter", "inclined-plane", "work-energy"]
};

export function solve(input) {
  const beamId = choice(input, "beam", "Beam type", Object.keys(CASES), "ss_point");
  const c = CASES[beamId];
  const L = num(input, "L", "Beam length L", { positive: true });
  const q = c.load === "P"
    ? num(input, "P", "Point load P", { positive: true })
    : num(input, "w", "Uniform load w", { positive: true });

  const mat = choice(input, "mat", "Material", [...IDS, "custom"], "a36");
  const isCustom = mat === "custom";
  const Egpa = isCustom ? num(input, "Ecust", "Elastic modulus E", { positive: true }) : find(mat).E;

  const sec = choice(input, "section", "Section", ["rect", "circle", "custom"], "rect");
  let I, cDist;
  if (sec === "rect") {
    const b = num(input, "b", "Width b", { positive: true });
    const h = num(input, "h", "Height h", { positive: true });
    I = (b * h ** 3) / 12;
    cDist = h / 2;
  } else if (sec === "circle") {
    const d = num(input, "d", "Diameter d", { positive: true });
    I = (Math.PI * d ** 4) / 64;
    cDist = d / 2;
  } else {
    const Iraw = num(input, "Icust", "Second moment of area I", { positive: true });
    const unit = choice(input, "Iunit", "Unit of I", ["mm4", "cm4"], "mm4");
    I = unit === "cm4" ? Iraw * 1e4 : Iraw;
    cDist = num(input, "ccust", "Distance c", { positive: true });
  }

  const EPa = Egpa * 1e9;
  const Im4 = I * 1e-12;
  const EI = EPa * Im4;
  const defm = c.defl(q, L, EI);
  const dMm = defm * 1000;
  const M = c.moment(q, L);
  const V = c.shear(q, L);
  const sigma = ((M * 1000) * cDist) / I;
  const allow = (L * 1000) / 360;
  const ratio = (L * 1000) / dMm;
  const okDefl = dMm <= allow;

  const yieldV = !isCustom && find(mat).yield !== null ? find(mat).yield : null;
  const SF = yieldV ? yieldV / sigma : null;

  const N = 120;
  const points = [];
  for (let i = 0; i <= N; i++) {
    const x = (L * i) / N;
    points.push([x, -c.curve(q, L, EI, x) * 1000]);
  }

  const reactions = c.reactions(q, L);
  const steps = [
    { text: `Case: ${c.name}`, tex: c.deflTex },
    { text: "Convert E to pascals and I to m⁴:", tex: `EI = ${ntex(EPa, 6)} \\times ${ntex(Im4, 6)} = ${ntex(EI, 6)}\\ N\\cdot m^2` },
    { text: "Maximum deflection:", tex: `\\delta_{max} = ${c.substDefl(q, L, EI)} = ${ntex(defm, 6)}\\ m = ${fmt(dMm, 4)}\\ mm` },
    { text: "Maximum bending moment:", tex: `M_{max} = ${c.substMom(q, L)} = ${ntex(M, 6)}\\ N\\cdot m` },
    { text: "Maximum shear force:", tex: `V_{max} = ${c.substShear(q, L)} = ${ntex(V, 6)}\\ N` },
    { text: "Maximum bending stress (c = distance to the outermost fiber):", tex: `\\sigma_{max} = \\frac{M c}{I} = \\frac{${ntex(M * 1000, 6)} \\times ${ntex(cDist, 6)}}{${ntex(I, 6)}} = ${fmt(sigma, 4)}\\ MPa` },
    { text: "Check against the allowable limit L/360:", tex: `\\frac{L}{360} = ${fmt(allow, 4)}\\ mm,\\qquad \\frac{L}{\\delta} = ${fmt(ratio, 4)}` }
  ];

  const results = [
    { label: "Maximum deflection δ", value: `${fmt(dMm, 4)} mm`, text: `δ = ${fmt(dMm, 4)} mm` },
    { label: "Maximum bending moment M", value: eng(M, "N·m", 4), text: `M = ${eng(M, "N·m", 4)}` },
    { label: "Maximum shear force V", value: eng(V, "N", 4) }
  ];
  for (const [label, v] of reactions) results.push({ label, value: eng(v, "N", 4) });
  if (c.fixed) results.push({ label: "Fixed-end moment at the wall", value: eng(M, "N·m", 4) });
  results.push(
    { label: "Maximum bending stress σ", value: `${fmt(sigma, 4)} MPa`, text: `σ = ${fmt(sigma, 4)} MPa` },
    { label: "Length-to-deflection ratio L/δ", value: fmt(ratio, 4), text: `L/δ = ${fmt(ratio, 4)}` },
    { label: "Allowable limit L/360", value: `${fmt(allow, 4)} mm` },
    { label: "Deflection check", value: okDefl ? "Acceptable (δ ≤ L/360)" : "Exceeds the allowable limit L/360" }
  );
  if (SF !== null) results.push({ label: "Safety factor against yield", value: fmt(SF, 3) });

  const blocks = [
    {
      type: "plot",
      title: "Deflection curve (negative direction is downward)",
      xLabel: "x (m)",
      yLabel: "y (mm)",
      includeZero: true,
      series: [{ name: "Elastic curve", points, line: true }],
      hlines: [{ y: 0 }]
    }
  ];
  if (!okDefl) blocks.push({ type: "note", tone: "warn", text: `Warning: the deflection (${fmt(dMm, 4)} mm) exceeds the allowable limit L/360 (${fmt(allow, 4)} mm).` });
  if (SF !== null && SF < 1) blocks.push({ type: "note", tone: "warn", text: "Warning: the bending stress exceeds the yield strength of the selected material." });

  const copy = `δ = ${fmt(dMm, 4)} mm، M = ${eng(M, "N·m", 4)}، σ = ${fmt(sigma, 4)} MPa، L/δ = ${fmt(ratio, 4)}`;

  return { results, steps, blocks, copy };
}
