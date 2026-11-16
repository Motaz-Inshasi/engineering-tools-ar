import { choice, fail } from "../core/validate.js";
import { fmt, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const OPTIONS = MATERIALS.map((m) => [m.id, m.ar]);
const find = (id) => MATERIALS.find((m) => m.id === id);

const PROPS = [
  { key: "E", label: "Elastic modulus E", unit: "GPa" },
  { key: "yield", label: "Yield strength σy", unit: "MPa" },
  { key: "uts", label: "Ultimate tensile strength σu", unit: "MPa" },
  { key: "density", label: "Density ρ", unit: "kg/m³" },
  { key: "alpha", label: "Coefficient of thermal expansion α", unit: "10⁻⁶/K" },
  { key: "k", label: "Thermal conductivity k", unit: "W/(m·K)" },
  { key: "poisson", label: "Poisson's ratio ν", unit: "—" }
];

const NA = "Not applicable";

const cell = (m, key) => (m[key] === null ? NA : fmt(m[key], 4));
const numOrNull = (v) => (typeof v === "number" ? v : null);

function specStrength(m) {
  return m.yield === null ? null : (m.yield * 1000) / m.density;
}

function specModulus(m) {
  return (m.E * 1000) / m.density;
}

function ratio(a, b) {
  return a === null || b === null || b === 0 ? "—" : fmt(a / b, 3);
}

export const meta = {
  description: "Display the complete engineering properties of a material, including elastic modulus, yield and tensile strength, density, thermal expansion and thermal conductivity, with a comparison of two materials and calculation of ratios and specific properties.",
  keywords: ["Material properties", "Young's modulus", "Yield strength", "Material density", "Specific strength", "material properties", "Young's modulus", "yield strength"],
  formulas: [
    { label: "Specific strength", tex: "\\frac{\\sigma_y}{\\rho}" },
    { label: "Specific modulus", tex: "\\frac{E}{\\rho}" }
  ],
  inputs: [
    { id: "mat", label: "Material", type: "select", default: "a36", options: OPTIONS },
    { id: "cmp", label: "Material for comparison (optional)", type: "select", default: "none", options: [["none", "No comparison"], ...OPTIONS] }
  ],
  example: { values: { mat: "a36", cmp: "al6061" }, expect: ["E = 200 GPa", "ρ = 7850 kg/m³"], note: "Example: structural steel A36 compared with aluminum 6061-T6." },
  invalid: { values: { mat: "a36", cmp: "a36" } },
  related: ["stress-strain", "beam-deflection", "unit-converter", "inclined-plane", "work-energy"]
};

export function solve(input) {
  const a = find(choice(input, "mat", "Material", IDS, "a36"));
  const cmp = choice(input, "cmp", "Material for comparison", ["none", ...IDS], "none");
  if (cmp === a.id) fail("Choose a different material for comparison, or choose “No comparison”.", "cmp");
  const b = cmp === "none" ? null : find(cmp);

  const sa = specStrength(a), ma = specModulus(a);
  const sb = b ? specStrength(b) : null, mb = b ? specModulus(b) : null;

  const headBase = ["Property", "Unit", a.ar];
  const head = b ? [...headBase, b.ar, "Ratio (first ÷ second)"] : headBase;
  const rows = PROPS.map((p) => {
    const row = [p.label, p.unit, cell(a, p.key)];
    if (b) row.push(cell(b, p.key), ratio(numOrNull(a[p.key]), numOrNull(b[p.key])));
    return row;
  });
  const specRow = (label, unit, va, vb) => {
    const row = [label, unit, va === null ? NA : fmt(va, 4)];
    if (b) row.push(vb === null ? NA : fmt(vb, 4), ratio(va, vb));
    return row;
  };
  rows.push(specRow("Specific strength σy/ρ", "kJ/kg", sa, sb));
  rows.push(specRow("Specific modulus E/ρ", "MJ/kg", ma, mb));

  const results = [
    { label: "Elastic modulus E", value: `${fmt(a.E, 4)} GPa` },
    { label: "Yield strength σy", value: a.yield === null ? NA : `${fmt(a.yield, 4)} MPa` },
    { label: "Ultimate tensile strength σu", value: `${fmt(a.uts, 4)} MPa` },
    { label: "Density ρ", value: `${fmt(a.density, 4)} kg/m³` },
    { label: "Specific strength σy/ρ", value: sa === null ? NA : `${fmt(sa, 4)} kJ/kg` },
    { label: "Specific modulus E/ρ", value: `${fmt(ma, 4)} MJ/kg` }
  ];

  const steps = [];
  steps.push({ text: "Convert the elastic modulus to pascals:", tex: `E = ${fmt(a.E, 4)}\\ GPa = ${ntex(a.E * 1e9, 6)}\\ Pa` });
  steps.push({ text: "Specific modulus = E / ρ:", tex: `\\frac{E}{\\rho} = \\frac{${ntex(a.E * 1e9, 6)}}{${ntex(a.density, 6)}} = ${ntex(ma * 1e6, 6)}\\ J/kg = ${fmt(ma, 4)}\\ MJ/kg` });
  if (sa !== null) {
    steps.push({ text: "Specific strength = σy / ρ:", tex: `\\frac{\\sigma_y}{\\rho} = \\frac{${ntex(a.yield * 1e6, 6)}}{${ntex(a.density, 6)}} = ${ntex(sa * 1000, 6)}\\ J/kg = ${fmt(sa, 4)}\\ kJ/kg` });
  } else {
    steps.push("This material has no clear yield point, so the specific strength is not calculated.");
  }
  if (b && sa !== null && sb !== null) {
    steps.push({ text: "Ratio of specific strengths between the two materials:", tex: `\\frac{(\\sigma_y/\\rho)_1}{(\\sigma_y/\\rho)_2} = \\frac{${fmt(sa, 4)}}{${fmt(sb, 4)}} = ${ratio(sa, sb)}` });
  }

  const blocks = [{ type: "table", caption: "Material properties table", head, rows }];
  if (a.note) blocks.push({ type: "note", text: `${a.ar}: ${a.note}` });
  if (b && b.note) blocks.push({ type: "note", text: `${b.ar}: ${b.note}` });

  const yieldA = a.yield === null ? NA : `${fmt(a.yield, 4)} MPa`;
  let copy = `${a.ar}: E = ${fmt(a.E, 4)} GPa، σy = ${yieldA}، σu = ${fmt(a.uts, 4)} MPa، ρ = ${fmt(a.density, 4)} kg/m³`;
  if (b) copy += ` | Compared with ${b.ar}: specific strength ratio = ${ratio(sa, sb)}, specific modulus ratio = ${ratio(ma, mb)}`;

  return { results, steps, blocks, copy };
}
