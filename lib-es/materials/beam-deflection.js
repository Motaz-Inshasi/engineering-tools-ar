import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, eng, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const MAT_OPTIONS = [...MATERIALS.map((m) => [m.id, m.ar]), ["custom", "Material personalizado (introducir E manualmente)"]];
const find = (id) => MATERIALS.find((m) => m.id === id);

const CASES = {
  ss_point: {
    name: "Viga simplemente apoyada con carga puntual P en el centro",
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
    reactions: (q) => [["Reacción en el apoyo A", q / 2], ["Reacción en el apoyo B", q / 2]],
    fixed: false,
    curve: (q, L, EI, x) => {
      const s = x <= L / 2 ? x : L - x;
      return (q * s * (3 * L * L - 4 * s * s)) / (48 * EI);
    }
  },
  ss_uniform: {
    name: "Viga simplemente apoyada con carga uniforme w",
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
    reactions: (q, L) => [["Reacción en el apoyo A", (q * L) / 2], ["Reacción en el apoyo B", (q * L) / 2]],
    fixed: false,
    curve: (q, L, EI, x) => (q * x * (L ** 3 - 2 * L * x * x + x ** 3)) / (24 * EI)
  },
  cant_point: {
    name: "Viga en voladizo (empotrada en un extremo) con carga puntual P en el extremo libre",
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
    reactions: (q) => [["Reacción vertical en el apoyo fijo", q]],
    fixed: true,
    curve: (q, L, EI, x) => (q * x * x * (3 * L - x)) / (6 * EI)
  },
  cant_uniform: {
    name: "Viga en voladizo (empotrada en un extremo) con carga uniforme w",
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
    reactions: (q, L) => [["Reacción vertical en el apoyo fijo", q * L]],
    fixed: true,
    curve: (q, L, EI, x) => (q * x * x * (6 * L * L - 4 * L * x + x * x)) / (24 * EI)
  }
};

export const meta = {
  description: "Calcule la flecha máxima, el momento flector, la fuerza cortante, las reacciones y la tensión de flexión de una viga simplemente apoyada o en voladizo bajo carga puntual o uniforme, dibuje la curva de flecha y verifique el límite L/360.",
  keywords: ["Flexión de vigas", "Flecha de la viga", "Momento flector", "Fuerza cortante", "Viga simplemente apoyada", "Viga en voladizo", "beam deflection", "bending moment", "L/360"],
  formulas: [
    { label: "Flecha de viga simplemente apoyada con carga puntual", tex: "\\delta_{max} = \\frac{PL^3}{48EI}" },
    { label: "Flecha de viga simplemente apoyada con carga uniforme", tex: "\\delta_{max} = \\frac{5wL^4}{384EI}" },
    { label: "Flecha de viga en voladizo con carga puntual en el extremo", tex: "\\delta_{max} = \\frac{PL^3}{3EI}" },
    { label: "Flecha de viga en voladizo con carga uniforme", tex: "\\delta_{max} = \\frac{wL^4}{8EI}" },
    { label: "Tensión de flexión", tex: "\\sigma = \\frac{Mc}{I}" }
  ],
  inputs: [
    { id: "beam", label: "Tipo de viga y carga", type: "select", default: "ss_point", options: [["ss_point", "Simplemente apoyada - carga puntual en el centro"], ["ss_uniform", "Simplemente apoyada - carga uniforme"], ["cant_point", "Voladizo - carga puntual en el extremo libre"], ["cant_uniform", "Voladizo - carga uniforme"]] },
    { id: "L", label: "Longitud de la viga L", unit: "m", type: "number", default: "4" },
    { id: "P", label: "Carga puntual P", unit: "N", type: "number", default: "10k", when: { beam: ["ss_point", "cant_point"] } },
    { id: "w", label: "Carga uniforme w", unit: "N/m", type: "number", default: "5k", when: { beam: ["ss_uniform", "cant_uniform"] } },
    { id: "mat", label: "Material (para el módulo de elasticidad E)", type: "select", default: "a36", options: MAT_OPTIONS },
    { id: "Ecust", label: "Módulo de elasticidad E (para material personalizado)", unit: "GPa", type: "number", default: "200", when: { mat: ["custom"] } },
    { id: "section", label: "Sección", type: "select", default: "rect", options: [["rect", "Rectangular b × h"], ["circle", "Circular de diámetro d"], ["custom", "Momento de inercia I introducido manualmente"]] },
    { id: "b", label: "Ancho b", unit: "mm", type: "number", default: "100", when: { section: ["rect"] } },
    { id: "h", label: "Altura h", unit: "mm", type: "number", default: "200", when: { section: ["rect"] } },
    { id: "d", label: "Diámetro d", unit: "mm", type: "number", default: "100", when: { section: ["circle"] } },
    { id: "Icust", label: "Momento de inercia I", type: "number", default: "8e7", when: { section: ["custom"] } },
    { id: "Iunit", label: "Unidad de I", type: "select", default: "mm4", options: [["mm4", "mm⁴"], ["cm4", "cm⁴"]], when: { section: ["custom"] } },
    { id: "ccust", label: "Distancia c desde el eje neutro hasta la fibra más alejada", unit: "mm", type: "number", default: "100", when: { section: ["custom"] } }
  ],
  example: {
    values: { beam: "ss_point", L: "4", P: "10k", w: "5k", mat: "a36", Ecust: "200", section: "custom", b: "100", h: "200", d: "100", Icust: "8e7", Iunit: "mm4", ccust: "100" },
    expect: ["δ = 0.8333 mm", "σ = 12.5 MPa"],
    note: "Ejemplo: viga simplemente apoyada de 4 m de largo con carga de 10 kN en el centro, E = 200 GPa e I = 8.0e7 mm⁴."
  },
  invalid: { values: { beam: "ss_point", L: "0", P: "10k", w: "5k", mat: "a36", Ecust: "200", section: "rect", b: "100", h: "200", d: "100", Icust: "", Iunit: "mm4", ccust: "" } },
  related: ["material-properties", "stress-strain", "unit-converter", "inclined-plane", "work-energy"]
};

export function solve(input) {
  const beamId = choice(input, "beam", "Tipo de viga", Object.keys(CASES), "ss_point");
  const c = CASES[beamId];
  const L = num(input, "L", "Longitud de la viga L", { positive: true });
  const q = c.load === "P"
    ? num(input, "P", "Carga puntual P", { positive: true })
    : num(input, "w", "Carga uniforme w", { positive: true });

  const mat = choice(input, "mat", "Material", [...IDS, "custom"], "a36");
  const isCustom = mat === "custom";
  const Egpa = isCustom ? num(input, "Ecust", "Módulo de elasticidad E", { positive: true }) : find(mat).E;

  const sec = choice(input, "section", "Sección", ["rect", "circle", "custom"], "rect");
  let I, cDist;
  if (sec === "rect") {
    const b = num(input, "b", "Ancho b", { positive: true });
    const h = num(input, "h", "Altura h", { positive: true });
    I = (b * h ** 3) / 12;
    cDist = h / 2;
  } else if (sec === "circle") {
    const d = num(input, "d", "Diámetro d", { positive: true });
    I = (Math.PI * d ** 4) / 64;
    cDist = d / 2;
  } else {
    const Iraw = num(input, "Icust", "Momento de inercia I", { positive: true });
    const unit = choice(input, "Iunit", "Unidad de I", ["mm4", "cm4"], "mm4");
    I = unit === "cm4" ? Iraw * 1e4 : Iraw;
    cDist = num(input, "ccust", "Distancia c", { positive: true });
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
    { text: `Caso: ${c.name}`, tex: c.deflTex },
    { text: "Conversión de E a pascales e I a m⁴:", tex: `EI = ${ntex(EPa, 6)} \\times ${ntex(Im4, 6)} = ${ntex(EI, 6)}\\ N\\cdot m^2` },
    { text: "Flecha máxima:", tex: `\\delta_{max} = ${c.substDefl(q, L, EI)} = ${ntex(defm, 6)}\\ m = ${fmt(dMm, 4)}\\ mm` },
    { text: "Momento flector máximo:", tex: `M_{max} = ${c.substMom(q, L)} = ${ntex(M, 6)}\\ N\\cdot m` },
    { text: "Fuerza cortante máxima:", tex: `V_{max} = ${c.substShear(q, L)} = ${ntex(V, 6)}\\ N` },
    { text: "Tensión de flexión máxima (c = distancia a la fibra más alejada):", tex: `\\sigma_{max} = \\frac{M c}{I} = \\frac{${ntex(M * 1000, 6)} \\times ${ntex(cDist, 6)}}{${ntex(I, 6)}} = ${fmt(sigma, 4)}\\ MPa` },
    { text: "Verificación del límite admisible L/360:", tex: `\\frac{L}{360} = ${fmt(allow, 4)}\\ mm,\\qquad \\frac{L}{\\delta} = ${fmt(ratio, 4)}` }
  ];

  const results = [
    { label: "Flecha máxima δ", value: `${fmt(dMm, 4)} mm`, text: `δ = ${fmt(dMm, 4)} mm` },
    { label: "Momento flector máximo M", value: eng(M, "N·m", 4), text: `M = ${eng(M, "N·m", 4)}` },
    { label: "Fuerza cortante máxima V", value: eng(V, "N", 4) }
  ];
  for (const [label, v] of reactions) results.push({ label, value: eng(v, "N", 4) });
  if (c.fixed) results.push({ label: "Momento de empotramiento en el muro", value: eng(M, "N·m", 4) });
  results.push(
    { label: "Tensión de flexión máxima σ", value: `${fmt(sigma, 4)} MPa`, text: `σ = ${fmt(sigma, 4)} MPa` },
    { label: "Razón longitud/flecha L/δ", value: fmt(ratio, 4), text: `L/δ = ${fmt(ratio, 4)}` },
    { label: "Límite admisible L/360", value: `${fmt(allow, 4)} mm` },
    { label: "Verificación de la flecha", value: okDefl ? "Aceptable (δ ≤ L/360)" : "Supera el límite admisible L/360" }
  );
  if (SF !== null) results.push({ label: "Factor de seguridad frente a fluencia", value: fmt(SF, 3) });

  const blocks = [
    {
      type: "plot",
      title: "Curva de flecha (sentido negativo hacia abajo)",
      xLabel: "x (m)",
      yLabel: "y (mm)",
      includeZero: true,
      series: [{ name: "Curva elástica", points, line: true }],
      hlines: [{ y: 0 }]
    }
  ];
  if (!okDefl) blocks.push({ type: "note", tone: "warn", text: `Advertencia: la flecha (${fmt(dMm, 4)} mm) supera el límite admisible L/360 (${fmt(allow, 4)} mm).` });
  if (SF !== null && SF < 1) blocks.push({ type: "note", tone: "warn", text: "Advertencia: la tensión de flexión supera la resistencia a la fluencia del material elegido." });

  const copy = `δ = ${fmt(dMm, 4)} mm، M = ${eng(M, "N·m", 4)}، σ = ${fmt(sigma, 4)} MPa، L/δ = ${fmt(ratio, 4)}`;

  return { results, steps, blocks, copy };
}
