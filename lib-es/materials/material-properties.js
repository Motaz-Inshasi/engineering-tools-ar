import { choice, fail } from "../core/validate.js";
import { fmt, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const OPTIONS = MATERIALS.map((m) => [m.id, m.ar]);
const find = (id) => MATERIALS.find((m) => m.id === id);

const PROPS = [
  { key: "E", label: "Módulo de elasticidad E", unit: "GPa" },
  { key: "yield", label: "Resistencia a la fluencia σy", unit: "MPa" },
  { key: "uts", label: "Resistencia a la tracción última σu", unit: "MPa" },
  { key: "density", label: "Densidad ρ", unit: "kg/m³" },
  { key: "alpha", label: "Coeficiente de dilatación térmica α", unit: "10⁻⁶/K" },
  { key: "k", label: "Conductividad térmica k", unit: "W/(m·K)" },
  { key: "poisson", label: "Coeficiente de Poisson ν", unit: "—" }
];

const NA = "No aplicable";

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
  description: "Muestre las propiedades completas del material de ingeniería: módulo de elasticidad, resistencias a fluencia y a tracción, densidad, dilatación y conductividad térmica, con comparación de dos materiales y cálculo de razones y resistencia específica.",
  keywords: ["Propiedades de los materiales", "Módulo de Young", "Resistencia a la fluencia", "Densidad del material", "Resistencia específica", "material properties", "Young's modulus", "yield strength"],
  formulas: [
    { label: "Resistencia específica", tex: "\\frac{\\sigma_y}{\\rho}" },
    { label: "Módulo específico", tex: "\\frac{E}{\\rho}" }
  ],
  inputs: [
    { id: "mat", label: "Material", type: "select", default: "a36", options: OPTIONS },
    { id: "cmp", label: "Material de comparación (opcional)", type: "select", default: "none", options: [["none", "Sin comparación"], ...OPTIONS] }
  ],
  example: { values: { mat: "a36", cmp: "al6061" }, expect: ["E = 200 GPa", "ρ = 7850 kg/m³"], note: "Ejemplo: acero A36 comparado con aluminio 6061-T6." },
  invalid: { values: { mat: "a36", cmp: "a36" } },
  related: ["stress-strain", "beam-deflection", "unit-converter", "inclined-plane", "work-energy"]
};

export function solve(input) {
  const a = find(choice(input, "mat", "Material", IDS, "a36"));
  const cmp = choice(input, "cmp", "Material de comparación", ["none", ...IDS], "none");
  if (cmp === a.id) fail("Elija un material distinto para comparar, o elija «Sin comparación».", "cmp");
  const b = cmp === "none" ? null : find(cmp);

  const sa = specStrength(a), ma = specModulus(a);
  const sb = b ? specStrength(b) : null, mb = b ? specModulus(b) : null;

  const headBase = ["Propiedad", "Unidad", a.ar];
  const head = b ? [...headBase, b.ar, "Razón (primera ÷ segunda)"] : headBase;
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
  rows.push(specRow("Resistencia específica σy/ρ", "kJ/kg", sa, sb));
  rows.push(specRow("Módulo específico E/ρ", "MJ/kg", ma, mb));

  const results = [
    { label: "Módulo de elasticidad E", value: `${fmt(a.E, 4)} GPa` },
    { label: "Resistencia a la fluencia σy", value: a.yield === null ? NA : `${fmt(a.yield, 4)} MPa` },
    { label: "Resistencia a la tracción última σu", value: `${fmt(a.uts, 4)} MPa` },
    { label: "Densidad ρ", value: `${fmt(a.density, 4)} kg/m³` },
    { label: "Resistencia específica σy/ρ", value: sa === null ? NA : `${fmt(sa, 4)} kJ/kg` },
    { label: "Módulo específico E/ρ", value: `${fmt(ma, 4)} MJ/kg` }
  ];

  const steps = [];
  steps.push({ text: "Conversión del módulo de elasticidad a pascales:", tex: `E = ${fmt(a.E, 4)}\\ GPa = ${ntex(a.E * 1e9, 6)}\\ Pa` });
  steps.push({ text: "Módulo específico = E / ρ:", tex: `\\frac{E}{\\rho} = \\frac{${ntex(a.E * 1e9, 6)}}{${ntex(a.density, 6)}} = ${ntex(ma * 1e6, 6)}\\ J/kg = ${fmt(ma, 4)}\\ MJ/kg` });
  if (sa !== null) {
    steps.push({ text: "Resistencia específica = σy / ρ:", tex: `\\frac{\\sigma_y}{\\rho} = \\frac{${ntex(a.yield * 1e6, 6)}}{${ntex(a.density, 6)}} = ${ntex(sa * 1000, 6)}\\ J/kg = ${fmt(sa, 4)}\\ kJ/kg` });
  } else {
    steps.push("Este material no tiene un límite de fluencia claro, por lo que no se calcula la resistencia específica.");
  }
  if (b && sa !== null && sb !== null) {
    steps.push({ text: "Razón de resistencias específicas entre los dos materiales:", tex: `\\frac{(\\sigma_y/\\rho)_1}{(\\sigma_y/\\rho)_2} = \\frac{${fmt(sa, 4)}}{${fmt(sb, 4)}} = ${ratio(sa, sb)}` });
  }

  const blocks = [{ type: "table", caption: "Tabla de propiedades del material", head, rows }];
  if (a.note) blocks.push({ type: "note", text: `${a.ar}: ${a.note}` });
  if (b && b.note) blocks.push({ type: "note", text: `${b.ar}: ${b.note}` });

  const yieldA = a.yield === null ? NA : `${fmt(a.yield, 4)} MPa`;
  let copy = `${a.ar}: E = ${fmt(a.E, 4)} GPa، σy = ${yieldA}، σu = ${fmt(a.uts, 4)} MPa، ρ = ${fmt(a.density, 4)} kg/m³`;
  if (b) copy += ` | Comparación con ${b.ar}: razón de resistencia específica = ${ratio(sa, sb)}, razón de módulo específico = ${ratio(ma, mb)}`;

  return { results, steps, blocks, copy };
}
