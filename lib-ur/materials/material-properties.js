import { choice, fail } from "../core/validate.js";
import { fmt, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const OPTIONS = MATERIALS.map((m) => [m.id, m.ar]);
const find = (id) => MATERIALS.find((m) => m.id === id);

const PROPS = [
  { key: "E", label: "لچک کا ماڈیولس E", unit: "GPa" },
  { key: "yield", label: "پیداواری مزاحمت σy", unit: "MPa" },
  { key: "uts", label: "زیادہ سے زیادہ تناؤ کی مزاحمت σu", unit: "MPa" },
  { key: "density", label: "کثافت ρ", unit: "kg/m³" },
  { key: "alpha", label: "حرارتی پھیلاؤ کا عامل α", unit: "10⁻⁶/K" },
  { key: "k", label: "حرارتی چالکتا k", unit: "W/(m·K)" },
  { key: "poisson", label: "پوئسن کا تناسب ν", unit: "—" }
];

const NA = "لاگو نہیں";

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
  description: "مادے کی مکمل انجینئرنگ خصوصیات دکھائیں، جن میں لچک کا ماڈیولس، پیداواری اور تناؤ کی مزاحمت، کثافت، حرارتی پھیلاؤ اور حرارتی چالکتا شامل ہیں، ساتھ دو مادوں کا موازنہ اور تناسب و مخصوص خصوصیات کا حساب۔",
  keywords: ["مادے کی خصوصیات", "ینگ کا ماڈیولس", "پیداواری مزاحمت", "مادے کی کثافت", "مخصوص مزاحمت", "material properties", "Young's modulus", "yield strength"],
  formulas: [
    { label: "مخصوص مزاحمت", tex: "\\frac{\\sigma_y}{\\rho}" },
    { label: "مخصوص ماڈیولس", tex: "\\frac{E}{\\rho}" }
  ],
  inputs: [
    { id: "mat", label: "مادہ", type: "select", default: "a36", options: OPTIONS },
    { id: "cmp", label: "موازنے کے لیے مادہ (اختیاری)", type: "select", default: "none", options: [["none", "کوئی موازنہ نہیں"], ...OPTIONS] }
  ],
  example: { values: { mat: "a36", cmp: "al6061" }, expect: ["E = 200 GPa", "ρ = 7850 kg/m³"], note: "مثال: ساختمانی اسٹیل A36 کا ایلومینیم 6061-T6 سے موازنہ۔" },
  invalid: { values: { mat: "a36", cmp: "a36" } },
  related: ["stress-strain", "beam-deflection", "unit-converter", "inclined-plane", "work-energy"]
};

export function solve(input) {
  const a = find(choice(input, "mat", "مادہ", IDS, "a36"));
  const cmp = choice(input, "cmp", "موازنے کے لیے مادہ", ["none", ...IDS], "none");
  if (cmp === a.id) fail("موازنے کے لیے کوئی دوسرا مادہ منتخب کریں، یا «کوئی موازنہ نہیں» چنیں۔", "cmp");
  const b = cmp === "none" ? null : find(cmp);

  const sa = specStrength(a), ma = specModulus(a);
  const sb = b ? specStrength(b) : null, mb = b ? specModulus(b) : null;

  const headBase = ["خاصیت", "اکائی", a.ar];
  const head = b ? [...headBase, b.ar, "تناسب (پہلا ÷ دوسرا)"] : headBase;
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
  rows.push(specRow("مخصوص مزاحمت σy/ρ", "kJ/kg", sa, sb));
  rows.push(specRow("مخصوص ماڈیولس E/ρ", "MJ/kg", ma, mb));

  const results = [
    { label: "لچک کا ماڈیولس E", value: `${fmt(a.E, 4)} GPa` },
    { label: "پیداواری مزاحمت σy", value: a.yield === null ? NA : `${fmt(a.yield, 4)} MPa` },
    { label: "زیادہ سے زیادہ تناؤ کی مزاحمت σu", value: `${fmt(a.uts, 4)} MPa` },
    { label: "کثافت ρ", value: `${fmt(a.density, 4)} kg/m³` },
    { label: "مخصوص مزاحمت σy/ρ", value: sa === null ? NA : `${fmt(sa, 4)} kJ/kg` },
    { label: "مخصوص ماڈیولس E/ρ", value: `${fmt(ma, 4)} MJ/kg` }
  ];

  const steps = [];
  steps.push({ text: "لچک کے ماڈیولس کو پاسکل میں تبدیل کریں:", tex: `E = ${fmt(a.E, 4)}\\ GPa = ${ntex(a.E * 1e9, 6)}\\ Pa` });
  steps.push({ text: "مخصوص ماڈیولس = E / ρ:", tex: `\\frac{E}{\\rho} = \\frac{${ntex(a.E * 1e9, 6)}}{${ntex(a.density, 6)}} = ${ntex(ma * 1e6, 6)}\\ J/kg = ${fmt(ma, 4)}\\ MJ/kg` });
  if (sa !== null) {
    steps.push({ text: "مخصوص مزاحمت = σy / ρ:", tex: `\\frac{\\sigma_y}{\\rho} = \\frac{${ntex(a.yield * 1e6, 6)}}{${ntex(a.density, 6)}} = ${ntex(sa * 1000, 6)}\\ J/kg = ${fmt(sa, 4)}\\ kJ/kg` });
  } else {
    steps.push("اس مادے کی کوئی واضح پیداواری حد نہیں ہے، اس لیے مخصوص مزاحمت کا حساب نہیں کیا جاتا۔");
  }
  if (b && sa !== null && sb !== null) {
    steps.push({ text: "دونوں مادوں کے درمیان مخصوص مزاحمت کا تناسب:", tex: `\\frac{(\\sigma_y/\\rho)_1}{(\\sigma_y/\\rho)_2} = \\frac{${fmt(sa, 4)}}{${fmt(sb, 4)}} = ${ratio(sa, sb)}` });
  }

  const blocks = [{ type: "table", caption: "مادے کی خصوصیات کا جدول", head, rows }];
  if (a.note) blocks.push({ type: "note", text: `${a.ar}: ${a.note}` });
  if (b && b.note) blocks.push({ type: "note", text: `${b.ar}: ${b.note}` });

  const yieldA = a.yield === null ? NA : `${fmt(a.yield, 4)} MPa`;
  let copy = `${a.ar}: E = ${fmt(a.E, 4)} GPa، σy = ${yieldA}، σu = ${fmt(a.uts, 4)} MPa، ρ = ${fmt(a.density, 4)} kg/m³`;
  if (b) copy += ` | ${b.ar} کے ساتھ موازنہ: مخصوص مزاحمت کا تناسب = ${ratio(sa, sb)}، مخصوص ماڈیولس کا تناسب = ${ratio(ma, mb)}`;

  return { results, steps, blocks, copy };
}
