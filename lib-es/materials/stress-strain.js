import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const MAT_OPTIONS = [...MATERIALS.map((m) => [m.id, m.ar]), ["custom", "Material personalizado (introducir E manualmente)"]];
const find = (id) => MATERIALS.find((m) => m.id === id);

const sci = (x) => {
  const [m, e] = x.toExponential(3).split("e");
  return `${m.replace(/\.?0+$/, "")}e${Number(e)}`;
};

export const meta = {
  description: "Calcule el esfuerzo σ, la deformación unitaria ε, el alargamiento ΔL y el factor de seguridad a partir de la fuerza, la sección, la longitud y el material, o calcule el módulo de elasticidad a partir del alargamiento medido, con advertencias de fluencia y rotura.",
  keywords: ["Esfuerzo", "Deformación unitaria", "Módulo de Young", "Alargamiento", "Factor de seguridad", "stress", "strain", "Young's modulus", "Hooke"],
  formulas: [
    { label: "Esfuerzo", tex: "\\sigma = \\frac{F}{A}" },
    { label: "Deformación unitaria y módulo de elasticidad", tex: "\\varepsilon = \\frac{\\sigma}{E} = \\frac{\\Delta L}{L},\\qquad \\Delta L = \\varepsilon L" },
    { label: "Factor de seguridad", tex: "SF = \\frac{\\sigma_y}{\\sigma}" }
  ],
  inputs: [
    { id: "mode", label: "Modo de cálculo", type: "select", default: "axial", options: [["axial", "Desde la fuerza, la sección y el material"], ["measurement", "Desde el alargamiento medido (para calcular E)"]] },
    { id: "F", label: "Fuerza F", unit: "N", type: "number", default: "10k", help: "Puede usar el prefijo k para kilonewton, por ejemplo 10k." },
    { id: "section", label: "Forma de la sección", type: "select", default: "circle", options: [["circle", "Circular (diámetro d)"], ["rect", "Rectangular (b × h)"], ["custom", "Área personalizada A"]] },
    { id: "d", label: "Diámetro d", unit: "mm", type: "number", default: "10", when: { section: ["circle"] } },
    { id: "b", label: "Ancho b", unit: "mm", type: "number", default: "20", when: { section: ["rect"] } },
    { id: "h", label: "Altura h", unit: "mm", type: "number", default: "40", when: { section: ["rect"] } },
    { id: "Acust", label: "Área de la sección A", unit: "mm²", type: "number", default: "1000", when: { section: ["custom"] } },
    { id: "L", label: "Longitud inicial L", unit: "mm", type: "number", default: "1000" },
    { id: "dL", label: "Alargamiento medido ΔL", unit: "mm", type: "number", default: "0.6366", when: { mode: ["measurement"] } },
    { id: "mat", label: "Material", type: "select", default: "a36", options: MAT_OPTIONS, when: { mode: ["axial"] } },
    { id: "Ecust", label: "Módulo de elasticidad E (para material personalizado)", unit: "GPa", type: "number", default: "200", when: { mat: ["custom"] } },
    { id: "Ycust", label: "Resistencia a la fluencia (opcional)", unit: "MPa", type: "number", when: { mat: ["custom"] } },
    { id: "Ucust", label: "Resistencia a la tracción última (opcional)", unit: "MPa", type: "number", when: { mat: ["custom"] } }
  ],
  example: {
    values: { mode: "axial", F: "10k", section: "circle", d: "10", b: "", h: "", Acust: "", L: "1000", dL: "", mat: "a36", Ecust: "", Ycust: "", Ucust: "" },
    expect: ["σ = 127.3 MPa", "ε = 6.366e-4", "ΔL = 0.6366 mm", "Factor de seguridad = 1.96"],
    note: "Ejemplo: barra de acero A36 de 10 mm de diámetro que soporta 10 kN, de 1000 mm de longitud."
  },
  invalid: { values: { mode: "axial", F: "10k", section: "circle", d: "0", b: "", h: "", Acust: "", L: "1000", dL: "", mat: "a36", Ecust: "", Ycust: "", Ucust: "" } },
  related: ["material-properties", "beam-deflection", "unit-converter", "inclined-plane", "work-energy"]
};

function sectionArea(input, section) {
  if (section === "circle") {
    const d = num(input, "d", "Diámetro d", { positive: true });
    const A = (Math.PI * d * d) / 4;
    return { A, tex:`A = \\frac{\\pi d^2}{4} = \\frac{\\pi \\cdot ${ntex(d, 6)}^2}{4} = ${ntex(A, 6)}\\ mm^2`, text: "Área de la sección circular:" };
  }
  if (section === "rect") {
    const b = num(input, "b", "Ancho b", { positive: true });
    const h = num(input, "h", "Altura h", { positive: true });
    const A = b * h;
    return { A, tex: `A = b h = ${ntex(b, 6)} \\times ${ntex(h, 6)} = ${ntex(A, 6)}\\ mm^2`, text: "Área de la sección rectangular:" };
  }
  const A = num(input, "Acust", "Área de la sección A", { positive: true });
  return { A, tex: `A = ${ntex(A, 6)}\\ mm^2`, text: "Área de la sección dada:" };
}

export function solve(input) {
  const mode = choice(input, "mode", "Modo de cálculo", ["axial", "measurement"], "axial");
  const F = num(input, "F", "Fuerza F", { positive: true });
  const section = choice(input, "section", "Forma de la sección", ["circle", "rect", "custom"], "circle");
  const area = sectionArea(input, section);
  const A = area.A;
  const L = num(input, "L", "Longitud inicial L", { positive: true });
  const sigma = F / A;

  if (mode === "measurement") {
    const dL = num(input, "dL", "Alargamiento ΔL", { positive: true });
    const eps = dL / L;
    const Egpa = sigma / eps / 1000;
    const steps = [
      { text: area.text, tex: area.tex },
      { text: "Esfuerzo calculado:", tex: `\\sigma = \\frac{F}{A} = \\frac{${ntex(F, 6)}}{${ntex(A, 6)}} = ${ntex(sigma, 6)}\\ MPa` },
      { text: "Deformación unitaria a partir del alargamiento medido:", tex: `\\varepsilon = \\frac{\\Delta L}{L} = \\frac{${ntex(dL, 6)}}{${ntex(L, 6)}} = ${ntex(eps, 6)}` },
      { text: "Módulo de elasticidad medido:", tex: `E = \\frac{\\sigma}{\\varepsilon} = \\frac{${ntex(sigma, 6)}}{${ntex(eps, 6)}} = ${ntex(sigma / eps, 6)}\\ MPa = ${fmt(Egpa, 4)}\\ GPa` }
    ];
    return {
      results: [
        { label: "Área A", value: `${fmt(A, 4)} mm²` },
        { label: "Esfuerzo σ", value: `${fmt(sigma, 4)} MPa` },
        { label: "Deformación unitaria ε", value: sci(eps) },
        { label: "Módulo de elasticidad medido E", value: `${fmt(Egpa, 4)} GPa` }
      ],
      steps,
      copy: `σ = ${fmt(sigma, 4)} MPa، ε = ${sci(eps)}، E = ${fmt(Egpa, 4)} GPa`
    };
  }

  const mat = choice(input, "mat", "Material", [...IDS, "custom"], "a36");
  let E, yieldV, utsV;
  if (mat === "custom") {
    E = num(input, "Ecust", "Módulo de elasticidad E", { positive: true });
    yieldV = num(input, "Ycust", "Resistencia a la fluencia", { positive: true, optional: true });
    utsV = num(input, "Ucust", "Resistencia a la tracción última", { positive: true, optional: true });
  } else {
    const m = find(mat);
    E = m.E;
    yieldV = m.yield;
    utsV = m.uts;
  }
  const matName = mat === "custom" ? "Material personalizado" : find(mat).ar;
  const eps = sigma / (E * 1000);
  const dL = eps * L;
  const SF = yieldV ? yieldV / sigma : null;
  const sfText = SF === null ? "No aplicable" : fmt(SF, 3);

  const blocks = [];
  if (yieldV && sigma > yieldV) blocks.push({ type: "note", tone: "warn", text: `Advertencia: el esfuerzo (${fmt(sigma, 4)} MPa) supera la resistencia a la fluencia (${fmt(yieldV, 4)} MPa), por lo que se produce una deformación permanente (plástica).` });
  if (utsV && sigma > utsV) blocks.push({ type: "note", tone: "warn", text: `Advertencia: el esfuerzo (${fmt(sigma, 4)} MPa) supera la resistencia a la tracción última (${fmt(utsV, 4)} MPa), por lo que se produce la rotura.` });

  const steps = [
    { text: area.text, tex: area.tex },
    { text: "Esfuerzo axial:", tex: `\\sigma = \\frac{F}{A} = \\frac{${ntex(F, 6)}}{${ntex(A, 6)}} = ${ntex(sigma, 6)}\\ MPa` },
    { text: `Deformación unitaria por la ley de Hooke (E de ${matName} = ${fmt(E, 4)} GPa):`, tex: `\\varepsilon = \\frac{\\sigma}{E} = \\frac{${ntex(sigma, 6)}}{${ntex(E * 1000, 6)}} = ${ntex(eps, 6)}` },
    { text: "Alargamiento total:", tex: `\\Delta L = \\varepsilon L = ${ntex(eps, 6)} \\times ${ntex(L, 6)} = ${ntex(dL, 6)}\\ mm` }
  ];
  if (SF !== null) steps.push({ text: "Factor de seguridad frente a fluencia:", tex: `SF = \\frac{\\sigma_y}{\\sigma} = \\frac{${ntex(yieldV, 6)}}{${ntex(sigma, 6)}} = ${fmt(SF, 4)}` });

  const results = [
    { label: "Área A", value: `${fmt(A, 4)} mm²` },
    { label: "Esfuerzo σ", value: `${fmt(sigma, 4)} MPa` },
    { label: "Deformación unitaria ε", value: sci(eps) },
    { label: "Alargamiento ΔL", value: `${fmt(dL, 4)} mm` },
    { label: "Módulo de elasticidad utilizado E", value: `${fmt(E, 4)} GPa` },
    { label: "Factor de seguridad", value: sfText }
  ];

  return {
    results,
    steps,
    blocks,
    copy: `σ = ${fmt(sigma, 4)} MPa, ε = ${sci(eps)}, ΔL = ${fmt(dL, 4)} mm, factor de seguridad = ${sfText}`
  };
}
