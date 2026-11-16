import { choice, fail } from "../core/validate.js";
import { fmt, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const OPTIONS = MATERIALS.map((m) => [m.id, m.ar]);
const find = (id) => MATERIALS.find((m) => m.id === id);

const PROPS = [
  { key: "E", label: "Modulus elastisitas E", unit: "GPa" },
  { key: "yield", label: "Kekuatan luluh σy", unit: "MPa" },
  { key: "uts", label: "Kekuatan tarik maksimum σu", unit: "MPa" },
  { key: "density", label: "Massa jenis ρ", unit: "kg/m³" },
  { key: "alpha", label: "Koefisien muai panjang α", unit: "10⁻⁶/K" },
  { key: "k", label: "Konduktivitas termal k", unit: "W/(m·K)" },
  { key: "poisson", label: "Rasio Poisson ν", unit: "—" }
];

const NA = "Tidak berlaku";

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
  description: "Tampilkan sifat teknik material secara lengkap, dari modulus elastisitas, kekuatan luluh dan tarik, massa jenis, muai panjang, dan konduktivitas termal, dengan membandingkan dua material serta menghitung rasio dan kekuatan spesifik.",
  keywords: ["sifat material", "modulus Young", "kekuatan luluh", "massa jenis material", "kekuatan spesifik", "material properties", "Young's modulus", "yield strength"],
  formulas: [
    { label: "kekuatan spesifik", tex: "\\frac{\\sigma_y}{\\rho}" },
    { label: "Modulus spesifik", tex: "\\frac{E}{\\rho}" }
  ],
  inputs: [
    { id: "mat", label: "Material", type: "select", default: "a36", options: OPTIONS },
    { id: "cmp", label: "Material pembanding (opsional)", type: "select", default: "none", options: [["none", "Tanpa pembanding"], ...OPTIONS] }
  ],
  example: { values: { mat: "a36", cmp: "al6061" }, expect: ["E = 200 GPa", "ρ = 7850 kg/m³"], note: "Contoh: baja A36 dibandingkan dengan aluminium 6061-T6." },
  invalid: { values: { mat: "a36", cmp: "a36" } },
  related: ["stress-strain", "beam-deflection", "unit-converter", "inclined-plane", "work-energy"]
};

export function solve(input) {
  const a = find(choice(input, "mat", "Material", IDS, "a36"));
  const cmp = choice(input, "cmp", "Material pembanding", ["none", ...IDS], "none");
  if (cmp === a.id) fail("Pilih material lain sebagai pembanding, atau pilih «Tanpa pembanding».", "cmp");
  const b = cmp === "none" ? null : find(cmp);

  const sa = specStrength(a), ma = specModulus(a);
  const sb = b ? specStrength(b) : null, mb = b ? specModulus(b) : null;

  const headBase = ["Properti", "Satuan", a.ar];
  const head = b ? [...headBase, b.ar, "Rasio (pertama ÷ kedua)"] : headBase;
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
  rows.push(specRow("Kekuatan spesifik σy/ρ", "kJ/kg", sa, sb));
  rows.push(specRow("Modulus spesifik E/ρ", "MJ/kg", ma, mb));

  const results = [
    { label: "Modulus elastisitas E", value: `${fmt(a.E, 4)} GPa` },
    { label: "Kekuatan luluh σy", value: a.yield === null ? NA : `${fmt(a.yield, 4)} MPa` },
    { label: "Kekuatan tarik maksimum σu", value: `${fmt(a.uts, 4)} MPa` },
    { label: "Massa jenis ρ", value: `${fmt(a.density, 4)} kg/m³` },
    { label: "Kekuatan spesifik σy/ρ", value: sa === null ? NA : `${fmt(sa, 4)} kJ/kg` },
    { label: "Modulus spesifik E/ρ", value: `${fmt(ma, 4)} MJ/kg` }
  ];

  const steps = [];
  steps.push({ text: "Konversi modulus elastisitas ke pascal:", tex: `E = ${fmt(a.E, 4)}\\ GPa = ${ntex(a.E * 1e9, 6)}\\ Pa` });
  steps.push({ text: "Modulus spesifik = E / ρ:", tex: `\\frac{E}{\\rho} = \\frac{${ntex(a.E * 1e9, 6)}}{${ntex(a.density, 6)}} = ${ntex(ma * 1e6, 6)}\\ J/kg = ${fmt(ma, 4)}\\ MJ/kg` });
  if (sa !== null) {
    steps.push({ text: "Kekuatan spesifik = σy / ρ:", tex: `\\frac{\\sigma_y}{\\rho} = \\frac{${ntex(a.yield * 1e6, 6)}}{${ntex(a.density, 6)}} = ${ntex(sa * 1000, 6)}\\ J/kg = ${fmt(sa, 4)}\\ kJ/kg` });
  } else {
    steps.push("Material ini tidak memiliki batas luluh yang jelas, sehingga kekuatan spesifik tidak dihitung.");
  }
  if (b && sa !== null && sb !== null) {
    steps.push({ text: "Rasio kekuatan spesifik antara kedua material:", tex: `\\frac{(\\sigma_y/\\rho)_1}{(\\sigma_y/\\rho)_2} = \\frac{${fmt(sa, 4)}}{${fmt(sb, 4)}} = ${ratio(sa, sb)}` });
  }

  const blocks = [{ type: "table", caption: "Tabel sifat material", head, rows }];
  if (a.note) blocks.push({ type: "note", text: `${a.ar}: ${a.note}` });
  if (b && b.note) blocks.push({ type: "note", text: `${b.ar}: ${b.note}` });

  const yieldA = a.yield === null ? NA : `${fmt(a.yield, 4)} MPa`;
  let copy = `${a.ar}: E = ${fmt(a.E, 4)} GPa، σy = ${yieldA}، σu = ${fmt(a.uts, 4)} MPa، ρ = ${fmt(a.density, 4)} kg/m³`;
  if (b) copy += ` | Dibandingkan dengan ${b.ar}: rasio kekuatan spesifik = ${ratio(sa, sb)}, rasio modulus spesifik = ${ratio(ma, mb)}`;

  return { results, steps, blocks, copy };
}
