import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const MAT_OPTIONS = [...MATERIALS.map((m) => [m.id, m.ar]), ["custom", "Custom material (enter E manually)"]];
const find = (id) => MATERIALS.find((m) => m.id === id);

const sci = (x) => {
  const [m, e] = x.toExponential(3).split("e");
  return `${m.replace(/\.?0+$/, "")}e${Number(e)}`;
};

export const meta = {
  description: "Calculate the stress σ, strain ε, elongation ΔL and safety factor from the force, cross-section, length and material, or calculate the elastic modulus from a measured elongation, with yield and fracture warnings.",
  keywords: ["stress", "strain", "Young's modulus", "elongation", "safety factor", "stress", "strain", "Young's modulus", "Hooke's law"],
  formulas: [
    { label: "Stress", tex: "\\sigma = \\frac{F}{A}" },
    { label: "Strain and elastic modulus", tex: "\\varepsilon = \\frac{\\sigma}{E} = \\frac{\\Delta L}{L},\\qquad \\Delta L = \\varepsilon L" },
    { label: "safety factor", tex: "SF = \\frac{\\sigma_y}{\\sigma}" }
  ],
  inputs: [
    { id: "mode", label: "Calculation mode", type: "select", default: "axial", options: [["axial", "From force, cross-section and material"], ["measurement", "From measured elongation (to calculate E)"]] },
    { id: "F", label: "Force F", unit: "N", type: "number", default: "10k", help: "The prefix k can be used for kilonewtons, such as 10k." },
    { id: "section", label: "Cross-section shape", type: "select", default: "circle", options: [["circle", "Circular (diameter d)"], ["rect", "Rectangular (b × h)"], ["custom", "Custom area A"]] },
    { id: "d", label: "Diameter d", unit: "mm", type: "number", default: "10", when: { section: ["circle"] } },
    { id: "b", label: "Width b", unit: "mm", type: "number", default: "20", when: { section: ["rect"] } },
    { id: "h", label: "Height h", unit: "mm", type: "number", default: "40", when: { section: ["rect"] } },
    { id: "Acust", label: "Cross-sectional area A", unit: "mm²", type: "number", default: "1000", when: { section: ["custom"] } },
    { id: "L", label: "Original length L", unit: "mm", type: "number", default: "1000" },
    { id: "dL", label: "Measured elongation ΔL", unit: "mm", type: "number", default: "0.6366", when: { mode: ["measurement"] } },
    { id: "mat", label: "Material", type: "select", default: "a36", options: MAT_OPTIONS, when: { mode: ["axial"] } },
    { id: "Ecust", label: "Elastic modulus E (for custom material)", unit: "GPa", type: "number", default: "200", when: { mat: ["custom"] } },
    { id: "Ycust", label: "Yield strength (optional)", unit: "MPa", type: "number", when: { mat: ["custom"] } },
    { id: "Ucust", label: "Ultimate tensile strength (optional)", unit: "MPa", type: "number", when: { mat: ["custom"] } }
  ],
  example: {
    values: { mode: "axial", F: "10k", section: "circle", d: "10", b: "", h: "", Acust: "", L: "1000", dL: "", mat: "a36", Ecust: "", Ycust: "", Ucust: "" },
    expect: ["σ = 127.3 MPa", "ε = 6.366e-4", "ΔL = 0.6366 mm", "Safety factor = 1.96"],
    note: "Example: an A36 steel rod 10 mm in diameter carrying 10 kN, 1000 mm long."
  },
  invalid: { values: { mode: "axial", F: "10k", section: "circle", d: "0", b: "", h: "", Acust: "", L: "1000", dL: "", mat: "a36", Ecust: "", Ycust: "", Ucust: "" } },
  related: ["material-properties", "beam-deflection", "unit-converter", "inclined-plane", "work-energy"]
};

function sectionArea(input, section) {
  if (section === "circle") {
    const d = num(input, "d", "Diameter d", { positive: true });
    const A = (Math.PI * d * d) / 4;
    return { A, tex:`A = \\frac{\\pi d^2}{4} = \\frac{\\pi \\cdot ${ntex(d, 6)}^2}{4} = ${ntex(A, 6)}\\ mm^2`, text: "Area of the circular section:" };
  }
  if (section === "rect") {
    const b = num(input, "b", "Width b", { positive: true });
    const h = num(input, "h", "Height h", { positive: true });
    const A = b * h;
    return { A, tex: `A = b h = ${ntex(b, 6)} \\times ${ntex(h, 6)} = ${ntex(A, 6)}\\ mm^2`, text: "Area of the rectangular section:" };
  }
  const A = num(input, "Acust", "Cross-sectional area A", { positive: true });
  return { A, tex: `A = ${ntex(A, 6)}\\ mm^2`, text: "Given section area:" };
}

export function solve(input) {
  const mode = choice(input, "mode", "Calculation mode", ["axial", "measurement"], "axial");
  const F = num(input, "F", "Force F", { positive: true });
  const section = choice(input, "section", "Cross-section shape", ["circle", "rect", "custom"], "circle");
  const area = sectionArea(input, section);
  const A = area.A;
  const L = num(input, "L", "Original length L", { positive: true });
  const sigma = F / A;

  if (mode === "measurement") {
    const dL = num(input, "dL", "Elongation ΔL", { positive: true });
    const eps = dL / L;
    const Egpa = sigma / eps / 1000;
    const steps = [
      { text: area.text, tex: area.tex },
      { text: "Calculated stress:", tex: `\\sigma = \\frac{F}{A} = \\frac{${ntex(F, 6)}}{${ntex(A, 6)}} = ${ntex(sigma, 6)}\\ MPa` },
      { text: "Strain from the measured elongation:", tex: `\\varepsilon = \\frac{\\Delta L}{L} = \\frac{${ntex(dL, 6)}}{${ntex(L, 6)}} = ${ntex(eps, 6)}` },
      { text: "Measured elastic modulus:", tex: `E = \\frac{\\sigma}{\\varepsilon} = \\frac{${ntex(sigma, 6)}}{${ntex(eps, 6)}} = ${ntex(sigma / eps, 6)}\\ MPa = ${fmt(Egpa, 4)}\\ GPa` }
    ];
    return {
      results: [
        { label: "Area A", value: `${fmt(A, 4)} mm²` },
        { label: "Stress σ", value: `${fmt(sigma, 4)} MPa` },
        { label: "Strain ε", value: sci(eps) },
        { label: "Measured elastic modulus E", value: `${fmt(Egpa, 4)} GPa` }
      ],
      steps,
      copy: `σ = ${fmt(sigma, 4)} MPa، ε = ${sci(eps)}، E = ${fmt(Egpa, 4)} GPa`
    };
  }

  const mat = choice(input, "mat", "Material", [...IDS, "custom"], "a36");
  let E, yieldV, utsV;
  if (mat === "custom") {
    E = num(input, "Ecust", "Elastic modulus E", { positive: true });
    yieldV = num(input, "Ycust", "Yield strength", { positive: true, optional: true });
    utsV = num(input, "Ucust", "Ultimate tensile strength", { positive: true, optional: true });
  } else {
    const m = find(mat);
    E = m.E;
    yieldV = m.yield;
    utsV = m.uts;
  }
  const matName = mat === "custom" ? "Custom material" : find(mat).ar;
  const eps = sigma / (E * 1000);
  const dL = eps * L;
  const SF = yieldV ? yieldV / sigma : null;
  const sfText = SF === null ? "Not applicable" : fmt(SF, 3);

  const blocks = [];
  if (yieldV && sigma > yieldV) blocks.push({ type: "note", tone: "warn", text: `Warning: the stress (${fmt(sigma, 4)} MPa) exceeds the yield strength (${fmt(yieldV, 4)} MPa), so permanent (plastic) deformation occurs.` });
  if (utsV && sigma > utsV) blocks.push({ type: "note", tone: "warn", text: `Warning: the stress (${fmt(sigma, 4)} MPa) exceeds the ultimate tensile strength (${fmt(utsV, 4)} MPa), so fracture occurs.` });

  const steps = [
    { text: area.text, tex: area.tex },
    { text: "Axial stress:", tex: `\\sigma = \\frac{F}{A} = \\frac{${ntex(F, 6)}}{${ntex(A, 6)}} = ${ntex(sigma, 6)}\\ MPa` },
    { text: `Strain by Hooke's law (E for ${matName} = ${fmt(E, 4)} GPa):`, tex: `\\varepsilon = \\frac{\\sigma}{E} = \\frac{${ntex(sigma, 6)}}{${ntex(E * 1000, 6)}} = ${ntex(eps, 6)}` },
    { text: "Total elongation:", tex: `\\Delta L = \\varepsilon L = ${ntex(eps, 6)} \\times ${ntex(L, 6)} = ${ntex(dL, 6)}\\ mm` }
  ];
  if (SF !== null) steps.push({ text: "Safety factor against yield:", tex: `SF = \\frac{\\sigma_y}{\\sigma} = \\frac{${ntex(yieldV, 6)}}{${ntex(sigma, 6)}} = ${fmt(SF, 4)}` });

  const results = [
    { label: "Area A", value: `${fmt(A, 4)} mm²` },
    { label: "Stress σ", value: `${fmt(sigma, 4)} MPa` },
    { label: "Strain ε", value: sci(eps) },
    { label: "Elongation ΔL", value: `${fmt(dL, 4)} mm` },
    { label: "Elastic modulus used E", value: `${fmt(E, 4)} GPa` },
    { label: "safety factor", value: sfText }
  ];

  return {
    results,
    steps,
    blocks,
    copy: `σ = ${fmt(sigma, 4)} MPa, ε = ${sci(eps)}, ΔL = ${fmt(dL, 4)} mm, safety factor = ${sfText}`
  };
}
