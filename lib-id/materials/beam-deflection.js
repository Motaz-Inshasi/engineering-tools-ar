import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, eng, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const MAT_OPTIONS = [...MATERIALS.map((m) => [m.id, m.ar]), ["custom", "Material khusus (masukkan E secara manual)"]];
const find = (id) => MATERIALS.find((m) => m.id === id);

const CASES = {
  ss_point: {
    name: "Balok sederhana dengan tumpuan dan beban terpusat P di tengah",
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
    reactions: (q) => [["Reaksi di tumpuan A", q / 2], ["Reaksi di tumpuan B", q / 2]],
    fixed: false,
    curve: (q, L, EI, x) => {
      const s = x <= L / 2 ? x : L - x;
      return (q * s * (3 * L * L - 4 * s * s)) / (48 * EI);
    }
  },
  ss_uniform: {
    name: "Balok sederhana dengan beban merata w",
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
    reactions: (q, L) => [["Reaksi di tumpuan A", (q * L) / 2], ["Reaksi di tumpuan B", (q * L) / 2]],
    fixed: false,
    curve: (q, L, EI, x) => (q * x * (L ** 3 - 2 * L * x * x + x ** 3)) / (24 * EI)
  },
  cant_point: {
    name: "Balok kantilever (dijepit di satu ujung) dengan beban terpusat P di ujung bebas",
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
    reactions: (q) => [["Reaksi vertikal di tumpuan tetap", q]],
    fixed: true,
    curve: (q, L, EI, x) => (q * x * x * (3 * L - x)) / (6 * EI)
  },
  cant_uniform: {
    name: "Balok kantilever (dijepit di satu ujung) dengan beban merata w",
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
    reactions: (q, L) => [["Reaksi vertikal di tumpuan tetap", q * L]],
    fixed: true,
    curve: (q, L, EI, x) => (q * x * x * (6 * L * L - 4 * L * x + x * x)) / (24 * EI)
  }
};

export const meta = {
  description: "Hitung lendutan maksimum, momen lentur, gaya geser, reaksi tumpuan, dan tegangan lentur untuk balok sederhana atau kantilever di bawah beban terpusat atau merata, gambar kurva lendutan, dan periksa batas L/360.",
  keywords: ["lenturan balok", "lendutan balok", "momen lentur", "gaya geser", "balok sederhana", "kantilever", "beam deflection", "bending moment", "L/360"],
  formulas: [
    { label: "Lendutan balok sederhana dengan beban terpusat", tex: "\\delta_{max} = \\frac{PL^3}{48EI}" },
    { label: "Lendutan balok sederhana dengan beban merata", tex: "\\delta_{max} = \\frac{5wL^4}{384EI}" },
    { label: "Lendutan kantilever dengan beban terpusat di ujung", tex: "\\delta_{max} = \\frac{PL^3}{3EI}" },
    { label: "Lendutan kantilever dengan beban merata", tex: "\\delta_{max} = \\frac{wL^4}{8EI}" },
    { label: "Tegangan lentur", tex: "\\sigma = \\frac{Mc}{I}" }
  ],
  inputs: [
    { id: "beam", label: "Jenis balok dan beban", type: "select", default: "ss_point", options: [["ss_point", "Balok sederhana - beban terpusat di tengah"], ["ss_uniform", "Balok sederhana - beban merata"], ["cant_point", "Kantilever - beban terpusat di ujung bebas"], ["cant_uniform", "Kantilever - beban merata"]] },
    { id: "L", label: "Panjang balok L", unit: "m", type: "number", default: "4" },
    { id: "P", label: "Beban terpusat P", unit: "N", type: "number", default: "10k", when: { beam: ["ss_point", "cant_point"] } },
    { id: "w", label: "Beban merata w", unit: "N/m", type: "number", default: "5k", when: { beam: ["ss_uniform", "cant_uniform"] } },
    { id: "mat", label: "Material (untuk modulus elastisitas E)", type: "select", default: "a36", options: MAT_OPTIONS },
    { id: "Ecust", label: "Modulus elastisitas E (untuk material khusus)", unit: "GPa", type: "number", default: "200", when: { mat: ["custom"] } },
    { id: "section", label: "Penampang", type: "select", default: "rect", options: [["rect", "persegi panjang b × h"], ["circle", "lingkaran berdiameter d"], ["custom", "Momen inersia I dimasukkan manual"]] },
    { id: "b", label: "Lebar b", unit: "mm", type: "number", default: "100", when: { section: ["rect"] } },
    { id: "h", label: "Tinggi h", unit: "mm", type: "number", default: "200", when: { section: ["rect"] } },
    { id: "d", label: "Diameter d", unit: "mm", type: "number", default: "100", when: { section: ["circle"] } },
    { id: "Icust", label: "Momen inersia I", type: "number", default: "8e7", when: { section: ["custom"] } },
    { id: "Iunit", label: "Satuan I", type: "select", default: "mm4", options: [["mm4", "mm⁴"], ["cm4", "cm⁴"]], when: { section: ["custom"] } },
    { id: "ccust", label: "Jarak c dari sumbu netral ke serat terluar", unit: "mm", type: "number", default: "100", when: { section: ["custom"] } }
  ],
  example: {
    values: { beam: "ss_point", L: "4", P: "10k", w: "5k", mat: "a36", Ecust: "200", section: "custom", b: "100", h: "200", d: "100", Icust: "8e7", Iunit: "mm4", ccust: "100" },
    expect: ["δ = 0.8333 mm", "σ = 12.5 MPa"],
    note: "Contoh: balok sederhana panjang 4 m dengan beban 10 kN di tengah, E = 200 GPa, dan I = 8.0e7 mm⁴."
  },
  invalid: { values: { beam: "ss_point", L: "0", P: "10k", w: "5k", mat: "a36", Ecust: "200", section: "rect", b: "100", h: "200", d: "100", Icust: "", Iunit: "mm4", ccust: "" } },
  related: ["material-properties", "stress-strain", "unit-converter", "inclined-plane", "work-energy"]
};

export function solve(input) {
  const beamId = choice(input, "beam", "Jenis balok", Object.keys(CASES), "ss_point");
  const c = CASES[beamId];
  const L = num(input, "L", "Panjang balok L", { positive: true });
  const q = c.load === "P"
    ? num(input, "P", "Beban terpusat P", { positive: true })
    : num(input, "w", "Beban merata w", { positive: true });

  const mat = choice(input, "mat", "Material", [...IDS, "custom"], "a36");
  const isCustom = mat === "custom";
  const Egpa = isCustom ? num(input, "Ecust", "Modulus elastisitas E", { positive: true }) : find(mat).E;

  const sec = choice(input, "section", "Penampang", ["rect", "circle", "custom"], "rect");
  let I, cDist;
  if (sec === "rect") {
    const b = num(input, "b", "Lebar b", { positive: true });
    const h = num(input, "h", "Tinggi h", { positive: true });
    I = (b * h ** 3) / 12;
    cDist = h / 2;
  } else if (sec === "circle") {
    const d = num(input, "d", "Diameter d", { positive: true });
    I = (Math.PI * d ** 4) / 64;
    cDist = d / 2;
  } else {
    const Iraw = num(input, "Icust", "Momen inersia I", { positive: true });
    const unit = choice(input, "Iunit", "Satuan I", ["mm4", "cm4"], "mm4");
    I = unit === "cm4" ? Iraw * 1e4 : Iraw;
    cDist = num(input, "ccust", "Jarak c", { positive: true });
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
    { text: `Kasus: ${c.name}`, tex: c.deflTex },
    { text: "Konversi E ke pascal dan I ke m⁴:", tex: `EI = ${ntex(EPa, 6)} \\times ${ntex(Im4, 6)} = ${ntex(EI, 6)}\\ N\\cdot m^2` },
    { text: "Lendutan maksimum:", tex: `\\delta_{max} = ${c.substDefl(q, L, EI)} = ${ntex(defm, 6)}\\ m = ${fmt(dMm, 4)}\\ mm` },
    { text: "Momen lentur maksimum:", tex: `M_{max} = ${c.substMom(q, L)} = ${ntex(M, 6)}\\ N\\cdot m` },
    { text: "Gaya geser maksimum:", tex: `V_{max} = ${c.substShear(q, L)} = ${ntex(V, 6)}\\ N` },
    { text: "Tegangan lentur maksimum (c = jarak ke serat terluar):", tex: `\\sigma_{max} = \\frac{M c}{I} = \\frac{${ntex(M * 1000, 6)} \\times ${ntex(cDist, 6)}}{${ntex(I, 6)}} = ${fmt(sigma, 4)}\\ MPa` },
    { text: "Pemeriksaan batas izin L/360:", tex: `\\frac{L}{360} = ${fmt(allow, 4)}\\ mm,\\qquad \\frac{L}{\\delta} = ${fmt(ratio, 4)}` }
  ];

  const results = [
    { label: "Lendutan maksimum δ", value: `${fmt(dMm, 4)} mm`, text: `δ = ${fmt(dMm, 4)} mm` },
    { label: "Momen lentur maksimum M", value: eng(M, "N·m", 4), text: `M = ${eng(M, "N·m", 4)}` },
    { label: "Gaya geser maksimum V", value: eng(V, "N", 4) }
  ];
  for (const [label, v] of reactions) results.push({ label, value: eng(v, "N", 4) });
  if (c.fixed) results.push({ label: "Momen jepit di dinding", value: eng(M, "N·m", 4) });
  results.push(
    { label: "Tegangan lentur maksimum σ", value: `${fmt(sigma, 4)} MPa`, text: `σ = ${fmt(sigma, 4)} MPa` },
    { label: "Rasio panjang terhadap lendutan L/δ", value: fmt(ratio, 4), text: `L/δ = ${fmt(ratio, 4)}` },
    { label: "Batas izin L/360", value: `${fmt(allow, 4)} mm` },
    { label: "Pemeriksaan lendutan", value: okDefl ? "Diterima (δ ≤ L/360)" : "Melebihi batas izin L/360" }
  );
  if (SF !== null) results.push({ label: "Faktor keamanan terhadap luluh", value: fmt(SF, 3) });

  const blocks = [
    {
      type: "plot",
      title: "Kurva lendutan (arah negatif ke bawah)",
      xLabel: "x (m)",
      yLabel: "y (mm)",
      includeZero: true,
      series: [{ name: "Kurva elastis", points, line: true }],
      hlines: [{ y: 0 }]
    }
  ];
  if (!okDefl) blocks.push({ type: "note", tone: "warn", text: `Peringatan: lendutan (${fmt(dMm, 4)} mm) melebihi batas izin L/360 (${fmt(allow, 4)} mm).` });
  if (SF !== null && SF < 1) blocks.push({ type: "note", tone: "warn", text: "Peringatan: tegangan lentur melampaui kekuatan luluh material yang dipilih." });

  const copy = `δ = ${fmt(dMm, 4)} mm، M = ${eng(M, "N·m", 4)}، σ = ${fmt(sigma, 4)} MPa، L/δ = ${fmt(ratio, 4)}`;

  return { results, steps, blocks, copy };
}
