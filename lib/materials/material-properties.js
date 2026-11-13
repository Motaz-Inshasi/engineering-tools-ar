import { choice, fail } from "../core/validate.js";
import { fmt, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const OPTIONS = MATERIALS.map((m) => [m.id, m.ar]);
const find = (id) => MATERIALS.find((m) => m.id === id);

const PROPS = [
  { key: "E", label: "معامل المرونة E", unit: "GPa" },
  { key: "yield", label: "مقاومة الخضوع σy", unit: "MPa" },
  { key: "uts", label: "مقاومة الشد القصوى σu", unit: "MPa" },
  { key: "density", label: "الكثافة ρ", unit: "kg/m³" },
  { key: "alpha", label: "معامل التمدد الحراري α", unit: "10⁻⁶/K" },
  { key: "k", label: "الموصلية الحرارية k", unit: "W/(m·K)" },
  { key: "poisson", label: "نسبة بواسون ν", unit: "—" }
];

const NA = "غير منطبق";

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
  description: "اعرض خصائص المادة الهندسية كاملة، من معامل المرونة ومقاومة الخضوع والشد والكثافة والتمدد والتوصيل الحراري، مع مقارنة مادتين وحساب النسب والمقاومة النوعية.",
  keywords: ["خصائص المواد", "معامل يونغ", "مقاومة الخضوع", "كثافة المادة", "المقاومة النوعية", "material properties", "Young's modulus", "yield strength"],
  formulas: [
    { label: "المقاومة النوعية", tex: "\\frac{\\sigma_y}{\\rho}" },
    { label: "المعامل النوعي", tex: "\\frac{E}{\\rho}" }
  ],
  inputs: [
    { id: "mat", label: "المادة", type: "select", default: "a36", options: OPTIONS },
    { id: "cmp", label: "مادة للمقارنة (اختياري)", type: "select", default: "none", options: [["none", "بدون مقارنة"], ...OPTIONS] }
  ],
  example: { values: { mat: "a36", cmp: "al6061" }, expect: ["E = 200 GPa", "ρ = 7850 kg/m³"], note: "مثال: فولاذ A36 مقارنة بالألومنيوم 6061-T6." },
  invalid: { values: { mat: "a36", cmp: "a36" } },
  related: ["stress-strain", "beam-deflection", "unit-converter", "inclined-plane", "work-energy"]
};

export function solve(input) {
  const a = find(choice(input, "mat", "المادة", IDS, "a36"));
  const cmp = choice(input, "cmp", "المادة للمقارنة", ["none", ...IDS], "none");
  if (cmp === a.id) fail("اختر مادة مختلفة للمقارنة، أو اختر «بدون مقارنة».", "cmp");
  const b = cmp === "none" ? null : find(cmp);

  const sa = specStrength(a), ma = specModulus(a);
  const sb = b ? specStrength(b) : null, mb = b ? specModulus(b) : null;

  const headBase = ["الخاصية", "الوحدة", a.ar];
  const head = b ? [...headBase, b.ar, "النسبة (الأولى ÷ الثانية)"] : headBase;
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
  rows.push(specRow("المقاومة النوعية σy/ρ", "kJ/kg", sa, sb));
  rows.push(specRow("المعامل النوعي E/ρ", "MJ/kg", ma, mb));

  const results = [
    { label: "معامل المرونة E", value: `${fmt(a.E, 4)} GPa` },
    { label: "مقاومة الخضوع σy", value: a.yield === null ? NA : `${fmt(a.yield, 4)} MPa` },
    { label: "مقاومة الشد القصوى σu", value: `${fmt(a.uts, 4)} MPa` },
    { label: "الكثافة ρ", value: `${fmt(a.density, 4)} kg/m³` },
    { label: "المقاومة النوعية σy/ρ", value: sa === null ? NA : `${fmt(sa, 4)} kJ/kg` },
    { label: "المعامل النوعي E/ρ", value: `${fmt(ma, 4)} MJ/kg` }
  ];

  const steps = [];
  steps.push({ text: "تحويل معامل المرونة إلى باسكال:", tex: `E = ${fmt(a.E, 4)}\\ GPa = ${ntex(a.E * 1e9, 6)}\\ Pa` });
  steps.push({ text: "المعامل النوعي = E / ρ:", tex: `\\frac{E}{\\rho} = \\frac{${ntex(a.E * 1e9, 6)}}{${ntex(a.density, 6)}} = ${ntex(ma * 1e6, 6)}\\ J/kg = ${fmt(ma, 4)}\\ MJ/kg` });
  if (sa !== null) {
    steps.push({ text: "المقاومة النوعية = σy / ρ:", tex: `\\frac{\\sigma_y}{\\rho} = \\frac{${ntex(a.yield * 1e6, 6)}}{${ntex(a.density, 6)}} = ${ntex(sa * 1000, 6)}\\ J/kg = ${fmt(sa, 4)}\\ kJ/kg` });
  } else {
    steps.push("لهذه المادة لا يوجد حد خضوع واضح، لذلك لا تُحسب المقاومة النوعية.");
  }
  if (b && sa !== null && sb !== null) {
    steps.push({ text: "نسبة المقاومة النوعية بين المادتين:", tex: `\\frac{(\\sigma_y/\\rho)_1}{(\\sigma_y/\\rho)_2} = \\frac{${fmt(sa, 4)}}{${fmt(sb, 4)}} = ${ratio(sa, sb)}` });
  }

  const blocks = [{ type: "table", caption: "جدول خصائص المادة", head, rows }];
  if (a.note) blocks.push({ type: "note", text: `${a.ar}: ${a.note}` });
  if (b && b.note) blocks.push({ type: "note", text: `${b.ar}: ${b.note}` });

  const yieldA = a.yield === null ? NA : `${fmt(a.yield, 4)} MPa`;
  let copy = `${a.ar}: E = ${fmt(a.E, 4)} GPa، σy = ${yieldA}، σu = ${fmt(a.uts, 4)} MPa، ρ = ${fmt(a.density, 4)} kg/m³`;
  if (b) copy += ` | مقارنة مع ${b.ar}: نسبة المقاومة النوعية = ${ratio(sa, sb)}، نسبة المعامل النوعي = ${ratio(ma, mb)}`;

  return { results, steps, blocks, copy };
}
