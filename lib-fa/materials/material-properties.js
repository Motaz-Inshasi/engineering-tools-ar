import { choice, fail } from "../core/validate.js";
import { fmt, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const OPTIONS = MATERIALS.map((m) => [m.id, m.ar]);
const find = (id) => MATERIALS.find((m) => m.id === id);

const PROPS = [
  { key: "E", label: "مدول الاستیسیته E", unit: "GPa" },
  { key: "yield", label: "تنش تسلیم σy", unit: "MPa" },
  { key: "uts", label: "تنش کششی نهایی σu", unit: "MPa" },
  { key: "density", label: "چگالی ρ", unit: "kg/m³" },
  { key: "alpha", label: "ضریب انبساط حرارتی α", unit: "10⁻⁶/K" },
  { key: "k", label: "رسانایی حرارتی k", unit: "W/(m·K)" },
  { key: "poisson", label: "نسبت پواسون ν", unit: "—" }
];

const NA = "غیرقابل کاربرد";

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
  description: "خواص مهندسی کامل یک ماده را نمایش دهید، از مدول الاستیسیته، تنش تسلیم و کششی، چگالی، انبساط و رسانایی حرارتی، همراه با مقایسهٔ دو ماده و محاسبهٔ نسبت‌ها و مقاومت ویژه.",
  keywords: ["خواص مواد", "مدول یانگ", "تنش تسلیم", "چگالی ماده", "مقاومت ویژه", "material properties", "Young's modulus", "yield strength"],
  formulas: [
    { label: "مقاومت ویژه", tex: "\\frac{\\sigma_y}{\\rho}" },
    { label: "مدول ویژه", tex: "\\frac{E}{\\rho}" }
  ],
  inputs: [
    { id: "mat", label: "ماده", type: "select", default: "a36", options: OPTIONS },
    { id: "cmp", label: "ماده برای مقایسه (اختیاری)", type: "select", default: "none", options: [["none", "بدون مقایسه"], ...OPTIONS] }
  ],
  example: { values: { mat: "a36", cmp: "al6061" }, expect: ["E = 200 GPa", "ρ = 7850 kg/m³"], note: "مثال: فولاد A36 در مقایسه با آلومینیوم 6061-T6." },
  invalid: { values: { mat: "a36", cmp: "a36" } },
  related: ["stress-strain", "beam-deflection", "unit-converter", "inclined-plane", "work-energy"]
};

export function solve(input) {
  const a = find(choice(input, "mat", "ماده", IDS, "a36"));
  const cmp = choice(input, "cmp", "ماده برای مقایسه", ["none", ...IDS], "none");
  if (cmp === a.id) fail("ماده‌ای متفاوت برای مقایسه انتخاب کنید، یا «بدون مقایسه» را انتخاب کنید.", "cmp");
  const b = cmp === "none" ? null : find(cmp);

  const sa = specStrength(a), ma = specModulus(a);
  const sb = b ? specStrength(b) : null, mb = b ? specModulus(b) : null;

  const headBase = ["ویژگی", "واحد", a.ar];
  const head = b ? [...headBase, b.ar, "نسبت (اول ÷ دوم)"] : headBase;
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
  rows.push(specRow("مقاومت ویژه σy/ρ", "kJ/kg", sa, sb));
  rows.push(specRow("مدول ویژه E/ρ", "MJ/kg", ma, mb));

  const results = [
    { label: "مدول الاستیسیته E", value: `${fmt(a.E, 4)} GPa` },
    { label: "تنش تسلیم σy", value: a.yield === null ? NA : `${fmt(a.yield, 4)} MPa` },
    { label: "تنش کششی نهایی σu", value: `${fmt(a.uts, 4)} MPa` },
    { label: "چگالی ρ", value: `${fmt(a.density, 4)} kg/m³` },
    { label: "مقاومت ویژه σy/ρ", value: sa === null ? NA : `${fmt(sa, 4)} kJ/kg` },
    { label: "مدول ویژه E/ρ", value: `${fmt(ma, 4)} MJ/kg` }
  ];

  const steps = [];
  steps.push({ text: "تبدیل مدول الاستیسیته به پاسکال:", tex: `E = ${fmt(a.E, 4)}\\ GPa = ${ntex(a.E * 1e9, 6)}\\ Pa` });
  steps.push({ text: "مدول ویژه = E / ρ:", tex: `\\frac{E}{\\rho} = \\frac{${ntex(a.E * 1e9, 6)}}{${ntex(a.density, 6)}} = ${ntex(ma * 1e6, 6)}\\ J/kg = ${fmt(ma, 4)}\\ MJ/kg` });
  if (sa !== null) {
    steps.push({ text: "مقاومت ویژه = σy / ρ:", tex: `\\frac{\\sigma_y}{\\rho} = \\frac{${ntex(a.yield * 1e6, 6)}}{${ntex(a.density, 6)}} = ${ntex(sa * 1000, 6)}\\ J/kg = ${fmt(sa, 4)}\\ kJ/kg` });
  } else {
    steps.push("این ماده حد تسلیم مشخصی ندارد، پس مقاومت ویژه محاسبه نمی‌شود.");
  }
  if (b && sa !== null && sb !== null) {
    steps.push({ text: "نسبت مقاومت ویژه میان دو ماده:", tex: `\\frac{(\\sigma_y/\\rho)_1}{(\\sigma_y/\\rho)_2} = \\frac{${fmt(sa, 4)}}{${fmt(sb, 4)}} = ${ratio(sa, sb)}` });
  }

  const blocks = [{ type: "table", caption: "جدول خواص ماده", head, rows }];
  if (a.note) blocks.push({ type: "note", text: `${a.ar}: ${a.note}` });
  if (b && b.note) blocks.push({ type: "note", text: `${b.ar}: ${b.note}` });

  const yieldA = a.yield === null ? NA : `${fmt(a.yield, 4)} MPa`;
  let copy = `${a.ar}: E = ${fmt(a.E, 4)} GPa، σy = ${yieldA}، σu = ${fmt(a.uts, 4)} MPa، ρ = ${fmt(a.density, 4)} kg/m³`;
  if (b) copy += ` | مقایسه با ${b.ar}: نسبت مقاومت ویژه = ${ratio(sa, sb)}، نسبت مدول ویژه = ${ratio(ma, mb)}`;

  return { results, steps, blocks, copy };
}
