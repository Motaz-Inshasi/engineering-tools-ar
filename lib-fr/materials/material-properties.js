import { choice, fail } from "../core/validate.js";
import { fmt, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const OPTIONS = MATERIALS.map((m) => [m.id, m.ar]);
const find = (id) => MATERIALS.find((m) => m.id === id);

const PROPS = [
  { key: "E", label: "Module d'Young E", unit: "GPa" },
  { key: "yield", label: "Limite élastique σy", unit: "MPa" },
  { key: "uts", label: "Résistance à la traction σu", unit: "MPa" },
  { key: "density", label: "Masse volumique ρ", unit: "kg/m³" },
  { key: "alpha", label: "Coefficient de dilatation thermique α", unit: "10⁻⁶/K" },
  { key: "k", label: "Conductivité thermique k", unit: "W/(m·K)" },
  { key: "poisson", label: "Coefficient de Poisson ν", unit: "—" }
];

const NA = "Non applicable";

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
  description: "Affichez toutes les propriétés techniques d'un matériau : module d'Young, limites élastique et de traction, masse volumique, dilatation et conductivité thermique, avec comparaison de deux matériaux et calcul des rapports et des indices de performance.",
  keywords: ["Propriétés des matériaux", "Module d'Young", "Limite élastique", "Masse volumique du matériau", "Résistance spécifique", "material properties", "Young's modulus", "yield strength"],
  formulas: [
    { label: "Résistance spécifique", tex: "\\frac{\\sigma_y}{\\rho}" },
    { label: "Module spécifique", tex: "\\frac{E}{\\rho}" }
  ],
  inputs: [
    { id: "mat", label: "Matériau", type: "select", default: "a36", options: OPTIONS },
    { id: "cmp", label: "Matériau de comparaison (facultatif)", type: "select", default: "none", options: [["none", "Sans comparaison"], ...OPTIONS] }
  ],
  example: { values: { mat: "a36", cmp: "al6061" }, expect: ["E = 200 GPa", "ρ = 7850 kg/m³"], note: "Exemple : acier A36 comparé à l'aluminium 6061-T6." },
  invalid: { values: { mat: "a36", cmp: "a36" } },
  related: ["stress-strain", "beam-deflection", "unit-converter", "inclined-plane", "work-energy"]
};

export function solve(input) {
  const a = find(choice(input, "mat", "Matériau", IDS, "a36"));
  const cmp = choice(input, "cmp", "Matériau de comparaison", ["none", ...IDS], "none");
  if (cmp === a.id) fail("Choisissez un autre matériau pour la comparaison, ou choisissez « Sans comparaison ».", "cmp");
  const b = cmp === "none" ? null : find(cmp);

  const sa = specStrength(a), ma = specModulus(a);
  const sb = b ? specStrength(b) : null, mb = b ? specModulus(b) : null;

  const headBase = ["Propriété", "Unité", a.ar];
  const head = b ? [...headBase, b.ar, "Rapport (premier ÷ second)"] : headBase;
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
  rows.push(specRow("Résistance spécifique σy/ρ", "kJ/kg", sa, sb));
  rows.push(specRow("Module spécifique E/ρ", "MJ/kg", ma, mb));

  const results = [
    { label: "Module d'Young E", value: `${fmt(a.E, 4)} GPa` },
    { label: "Limite élastique σy", value: a.yield === null ? NA : `${fmt(a.yield, 4)} MPa` },
    { label: "Résistance à la traction σu", value: `${fmt(a.uts, 4)} MPa` },
    { label: "Masse volumique ρ", value: `${fmt(a.density, 4)} kg/m³` },
    { label: "Résistance spécifique σy/ρ", value: sa === null ? NA : `${fmt(sa, 4)} kJ/kg` },
    { label: "Module spécifique E/ρ", value: `${fmt(ma, 4)} MJ/kg` }
  ];

  const steps = [];
  steps.push({ text: "Conversion du module d'Young en pascals :", tex: `E = ${fmt(a.E, 4)}\\ GPa = ${ntex(a.E * 1e9, 6)}\\ Pa` });
  steps.push({ text: "Module spécifique = E / ρ :", tex: `\\frac{E}{\\rho} = \\frac{${ntex(a.E * 1e9, 6)}}{${ntex(a.density, 6)}} = ${ntex(ma * 1e6, 6)}\\ J/kg = ${fmt(ma, 4)}\\ MJ/kg` });
  if (sa !== null) {
    steps.push({ text: "Résistance spécifique = σy / ρ :", tex: `\\frac{\\sigma_y}{\\rho} = \\frac{${ntex(a.yield * 1e6, 6)}}{${ntex(a.density, 6)}} = ${ntex(sa * 1000, 6)}\\ J/kg = ${fmt(sa, 4)}\\ kJ/kg` });
  } else {
    steps.push("Ce matériau n'a pas de limite élastique nette ; la résistance spécifique n'est donc pas calculée.");
  }
  if (b && sa !== null && sb !== null) {
    steps.push({ text: "Rapport des résistances spécifiques entre les deux matériaux :", tex: `\\frac{(\\sigma_y/\\rho)_1}{(\\sigma_y/\\rho)_2} = \\frac{${fmt(sa, 4)}}{${fmt(sb, 4)}} = ${ratio(sa, sb)}` });
  }

  const blocks = [{ type: "table", caption: "Tableau des propriétés du matériau", head, rows }];
  if (a.note) blocks.push({ type: "note", text: `${a.ar}: ${a.note}` });
  if (b && b.note) blocks.push({ type: "note", text: `${b.ar}: ${b.note}` });

  const yieldA = a.yield === null ? NA : `${fmt(a.yield, 4)} MPa`;
  let copy = `${a.ar}: E = ${fmt(a.E, 4)} GPa، σy = ${yieldA}، σu = ${fmt(a.uts, 4)} MPa، ρ = ${fmt(a.density, 4)} kg/m³`;
  if (b) copy += ` | Comparaison avec ${b.ar} : rapport des résistances spécifiques = ${ratio(sa, sb)}, rapport des modules spécifiques = ${ratio(ma, mb)}`;

  return { results, steps, blocks, copy };
}
