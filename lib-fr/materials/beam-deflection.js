import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, eng, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const MAT_OPTIONS = [...MATERIALS.map((m) => [m.id, m.ar]), ["custom", "Matériau personnalisé (saisie manuelle de E)"]];
const find = (id) => MATERIALS.find((m) => m.id === id);

const CASES = {
  ss_point: {
    name: "Poutre simplement appuyée avec charge concentrée P au milieu",
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
    reactions: (q) => [["Réaction à l'appui A", q / 2], ["Réaction à l'appui B", q / 2]],
    fixed: false,
    curve: (q, L, EI, x) => {
      const s = x <= L / 2 ? x : L - x;
      return (q * s * (3 * L * L - 4 * s * s)) / (48 * EI);
    }
  },
  ss_uniform: {
    name: "Poutre simplement appuyée avec charge uniforme w",
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
    reactions: (q, L) => [["Réaction à l'appui A", (q * L) / 2], ["Réaction à l'appui B", (q * L) / 2]],
    fixed: false,
    curve: (q, L, EI, x) => (q * x * (L ** 3 - 2 * L * x * x + x ** 3)) / (24 * EI)
  },
  cant_point: {
    name: "Poutre console (encastrée) avec charge concentrée P à l'extrémité libre",
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
    reactions: (q) => [["Réaction verticale à l'appui encastré", q]],
    fixed: true,
    curve: (q, L, EI, x) => (q * x * x * (3 * L - x)) / (6 * EI)
  },
  cant_uniform: {
    name: "Poutre console (encastrée) avec charge uniforme w",
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
    reactions: (q, L) => [["Réaction verticale à l'appui encastré", q * L]],
    fixed: true,
    curve: (q, L, EI, x) => (q * x * x * (6 * L * L - 4 * L * x + x * x)) / (24 * EI)
  }
};

export const meta = {
  description: "Calculez la flèche maximale, le moment fléchissant, l'effort tranchant, les réactions d'appui et la contrainte de flexion d'une poutre simplement appuyée ou console sous charge concentrée ou uniforme, tracez la courbe de flèche et vérifiez la limite L/360.",
  keywords: ["Flexion de poutre", "Flèche de poutre", "Moment fléchissant", "Effort tranchant", "Poutre simplement appuyée", "Poutre console", "beam deflection", "bending moment", "L/360"],
  formulas: [
    { label: "Flèche d'une poutre simplement appuyée avec charge concentrée", tex: "\\delta_{max} = \\frac{PL^3}{48EI}" },
    { label: "Flèche d'une poutre simplement appuyée avec charge uniforme", tex: "\\delta_{max} = \\frac{5wL^4}{384EI}" },
    { label: "Flèche d'une poutre console avec charge concentrée à l'extrémité", tex: "\\delta_{max} = \\frac{PL^3}{3EI}" },
    { label: "Flèche d'une poutre console avec charge uniforme", tex: "\\delta_{max} = \\frac{wL^4}{8EI}" },
    { label: "Contrainte de flexion", tex: "\\sigma = \\frac{Mc}{I}" }
  ],
  inputs: [
    { id: "beam", label: "Type de poutre et de charge", type: "select", default: "ss_point", options: [["ss_point", "Simplement appuyée – charge concentrée au milieu"], ["ss_uniform", "Simplement appuyée – charge uniforme"], ["cant_point", "Console – charge concentrée à l'extrémité libre"], ["cant_uniform", "Console – charge uniforme"]] },
    { id: "L", label: "Longueur de la poutre L", unit: "m", type: "number", default: "4" },
    { id: "P", label: "Charge concentrée P", unit: "N", type: "number", default: "10k", when: { beam: ["ss_point", "cant_point"] } },
    { id: "w", label: "Charge uniforme w", unit: "N/m", type: "number", default: "5k", when: { beam: ["ss_uniform", "cant_uniform"] } },
    { id: "mat", label: "Matériau (pour le module d'Young E)", type: "select", default: "a36", options: MAT_OPTIONS },
    { id: "Ecust", label: "Module d'Young E (matériau personnalisé)", unit: "GPa", type: "number", default: "200", when: { mat: ["custom"] } },
    { id: "section", label: "Section", type: "select", default: "rect", options: [["rect", "Rectangulaire b × h"], ["circle", "Circulaire de diamètre d"], ["custom", "Moment d'inertie I saisi manuellement"]] },
    { id: "b", label: "Largeur b", unit: "mm", type: "number", default: "100", when: { section: ["rect"] } },
    { id: "h", label: "Hauteur h", unit: "mm", type: "number", default: "200", when: { section: ["rect"] } },
    { id: "d", label: "Diamètre d", unit: "mm", type: "number", default: "100", when: { section: ["circle"] } },
    { id: "Icust", label: "Moment d'inertie I", type: "number", default: "8e7", when: { section: ["custom"] } },
    { id: "Iunit", label: "Unité de I", type: "select", default: "mm4", options: [["mm4", "mm⁴"], ["cm4", "cm⁴"]], when: { section: ["custom"] } },
    { id: "ccust", label: "Distance c de l'axe neutre à la fibre la plus éloignée", unit: "mm", type: "number", default: "100", when: { section: ["custom"] } }
  ],
  example: {
    values: { beam: "ss_point", L: "4", P: "10k", w: "5k", mat: "a36", Ecust: "200", section: "custom", b: "100", h: "200", d: "100", Icust: "8e7", Iunit: "mm4", ccust: "100" },
    expect: ["δ = 0.8333 mm", "σ = 12.5 MPa"],
    note: "Exemple : poutre simplement appuyée de 4 m avec une charge de 10 kN au milieu, E = 200 GPa et I = 8.0e7 mm⁴."
  },
  invalid: { values: { beam: "ss_point", L: "0", P: "10k", w: "5k", mat: "a36", Ecust: "200", section: "rect", b: "100", h: "200", d: "100", Icust: "", Iunit: "mm4", ccust: "" } },
  related: ["material-properties", "stress-strain", "unit-converter", "inclined-plane", "work-energy"]
};

export function solve(input) {
  const beamId = choice(input, "beam", "Type de poutre", Object.keys(CASES), "ss_point");
  const c = CASES[beamId];
  const L = num(input, "L", "Longueur de la poutre L", { positive: true });
  const q = c.load === "P"
    ? num(input, "P", "Charge concentrée P", { positive: true })
    : num(input, "w", "Charge uniforme w", { positive: true });

  const mat = choice(input, "mat", "Matériau", [...IDS, "custom"], "a36");
  const isCustom = mat === "custom";
  const Egpa = isCustom ? num(input, "Ecust", "Module d'Young E", { positive: true }) : find(mat).E;

  const sec = choice(input, "section", "Section", ["rect", "circle", "custom"], "rect");
  let I, cDist;
  if (sec === "rect") {
    const b = num(input, "b", "Largeur b", { positive: true });
    const h = num(input, "h", "Hauteur h", { positive: true });
    I = (b * h ** 3) / 12;
    cDist = h / 2;
  } else if (sec === "circle") {
    const d = num(input, "d", "Diamètre d", { positive: true });
    I = (Math.PI * d ** 4) / 64;
    cDist = d / 2;
  } else {
    const Iraw = num(input, "Icust", "Moment d'inertie I", { positive: true });
    const unit = choice(input, "Iunit", "Unité de I", ["mm4", "cm4"], "mm4");
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
    { text: `Cas : ${c.name}`, tex: c.deflTex },
    { text: "Conversion de E en pascals et de I en m⁴ :", tex: `EI = ${ntex(EPa, 6)} \\times ${ntex(Im4, 6)} = ${ntex(EI, 6)}\\ N\\cdot m^2` },
    { text: "Flèche maximale :", tex: `\\delta_{max} = ${c.substDefl(q, L, EI)} = ${ntex(defm, 6)}\\ m = ${fmt(dMm, 4)}\\ mm` },
    { text: "Moment fléchissant maximal :", tex: `M_{max} = ${c.substMom(q, L)} = ${ntex(M, 6)}\\ N\\cdot m` },
    { text: "Effort tranchant maximal :", tex: `V_{max} = ${c.substShear(q, L)} = ${ntex(V, 6)}\\ N` },
    { text: "Contrainte de flexion maximale (c = distance à la fibre la plus éloignée) :", tex: `\\sigma_{max} = \\frac{M c}{I} = \\frac{${ntex(M * 1000, 6)} \\times ${ntex(cDist, 6)}}{${ntex(I, 6)}} = ${fmt(sigma, 4)}\\ MPa` },
    { text: "Vérification de la limite admissible L/360 :", tex: `\\frac{L}{360} = ${fmt(allow, 4)}\\ mm,\\qquad \\frac{L}{\\delta} = ${fmt(ratio, 4)}` }
  ];

  const results = [
    { label: "Flèche maximale δ", value: `${fmt(dMm, 4)} mm`, text: `δ = ${fmt(dMm, 4)} mm` },
    { label: "Moment fléchissant maximal M", value: eng(M, "N·m", 4), text: `M = ${eng(M, "N·m", 4)}` },
    { label: "Effort tranchant maximal V", value: eng(V, "N", 4) }
  ];
  for (const [label, v] of reactions) results.push({ label, value: eng(v, "N", 4) });
  if (c.fixed) results.push({ label: "Moment d'encastrement au mur", value: eng(M, "N·m", 4) });
  results.push(
    { label: "Contrainte de flexion maximale σ", value: `${fmt(sigma, 4)} MPa`, text: `σ = ${fmt(sigma, 4)} MPa` },
    { label: "Rapport longueur/flèche L/δ", value: fmt(ratio, 4), text: `L/δ = ${fmt(ratio, 4)}` },
    { label: "Limite admissible L/360", value: `${fmt(allow, 4)} mm` },
    { label: "Vérification de la flèche", value: okDefl ? "Admissible (δ ≤ L/360)" : "Dépasse la limite admissible L/360" }
  );
  if (SF !== null) results.push({ label: "Coefficient de sécurité vis-à-vis de la limite élastique", value: fmt(SF, 3) });

  const blocks = [
    {
      type: "plot",
      title: "Courbe de flèche (sens négatif vers le bas)",
      xLabel: "x (m)",
      yLabel: "y (mm)",
      includeZero: true,
      series: [{ name: "Courbe élastique", points, line: true }],
      hlines: [{ y: 0 }]
    }
  ];
  if (!okDefl) blocks.push({ type: "note", tone: "warn", text: `Attention : la flèche (${fmt(dMm, 4)} mm) dépasse la limite admissible L/360 (${fmt(allow, 4)} mm).` });
  if (SF !== null && SF < 1) blocks.push({ type: "note", tone: "warn", text: "Attention : la contrainte de flexion dépasse la limite élastique du matériau choisi." });

  const copy = `δ = ${fmt(dMm, 4)} mm، M = ${eng(M, "N·m", 4)}، σ = ${fmt(sigma, 4)} MPa، L/δ = ${fmt(ratio, 4)}`;

  return { results, steps, blocks, copy };
}
