import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, eng, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const MAT_OPTIONS = [...MATERIALS.map((m) => [m.id, m.ar]), ["custom", "حسب ضرورت مادہ (E دستی طور پر درج کریں)"]];
const find = (id) => MATERIALS.find((m) => m.id === id);

const CASES = {
  ss_point: {
    name: "درمیان میں مرتکز بوجھ P کے ساتھ سادہ سہارے والا شہتیر",
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
    reactions: (q) => [["سہارا A پر ردِعمل", q / 2], ["سہارا B پر ردِعمل", q / 2]],
    fixed: false,
    curve: (q, L, EI, x) => {
      const s = x <= L / 2 ? x : L - x;
      return (q * s * (3 * L * L - 4 * s * s)) / (48 * EI);
    }
  },
  ss_uniform: {
    name: "یکساں بوجھ w کے ساتھ سادہ سہارے والا شہتیر",
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
    reactions: (q, L) => [["سہارا A پر ردِعمل", (q * L) / 2], ["سہارا B پر ردِعمل", (q * L) / 2]],
    fixed: false,
    curve: (q, L, EI, x) => (q * x * (L ** 3 - 2 * L * x * x + x ** 3)) / (24 * EI)
  },
  cant_point: {
    name: "آزاد سرے پر مرتکز بوجھ P کے ساتھ کینٹی لیور شہتیر (ایک سرے سے جڑا ہوا)",
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
    reactions: (q) => [["مقررہ سہارے پر عمودی ردِعمل", q]],
    fixed: true,
    curve: (q, L, EI, x) => (q * x * x * (3 * L - x)) / (6 * EI)
  },
  cant_uniform: {
    name: "یکساں بوجھ w کے ساتھ کینٹی لیور شہتیر (ایک سرے سے جڑا ہوا)",
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
    reactions: (q, L) => [["مقررہ سہارے پر عمودی ردِعمل", q * L]],
    fixed: true,
    curve: (q, L, EI, x) => (q * x * x * (6 * L * L - 4 * L * x + x * x)) / (24 * EI)
  }
};

export const meta = {
  description: "مرتکز یا یکساں بوجھ کے تحت سادہ سہارے یا کینٹی لیور شہتیر کا زیادہ سے زیادہ انحراف، موڑنے والا لمحہ، قینچی قوت، سہارے کے ردِعمل اور موڑنے کا دباؤ حساب کریں، انحراف کا خم بنائیں اور L/360 کی حد جانچیں۔",
  keywords: ["شہتیر کا موڑ", "شہتیر کا انحراف", "موڑنے والا لمحہ", "قینچی قوت", "سادہ سہارے والا شہتیر", "کینٹی لیور شہتیر", "beam deflection", "bending moment", "L/360"],
  formulas: [
    { label: "مرتکز بوجھ والے سادہ سہارے شہتیر کا انحراف", tex: "\\delta_{max} = \\frac{PL^3}{48EI}" },
    { label: "یکساں بوجھ والے سادہ سہارے شہتیر کا انحراف", tex: "\\delta_{max} = \\frac{5wL^4}{384EI}" },
    { label: "سرے پر مرتکز بوجھ والے کینٹی لیور کا انحراف", tex: "\\delta_{max} = \\frac{PL^3}{3EI}" },
    { label: "یکساں بوجھ والے کینٹی لیور کا انحراف", tex: "\\delta_{max} = \\frac{wL^4}{8EI}" },
    { label: "موڑنے کا دباؤ", tex: "\\sigma = \\frac{Mc}{I}" }
  ],
  inputs: [
    { id: "beam", label: "شہتیر کی قسم اور بوجھ", type: "select", default: "ss_point", options: [["ss_point", "سادہ سہارا - درمیان میں مرتکز بوجھ"], ["ss_uniform", "سادہ سہارا - یکساں بوجھ"], ["cant_point", "کینٹی لیور - آزاد سرے پر مرتکز بوجھ"], ["cant_uniform", "کینٹی لیور - یکساں بوجھ"]] },
    { id: "L", label: "شہتیر کی لمبائی L", unit: "m", type: "number", default: "4" },
    { id: "P", label: "مرتکز بوجھ P", unit: "N", type: "number", default: "10k", when: { beam: ["ss_point", "cant_point"] } },
    { id: "w", label: "یکساں بوجھ w", unit: "N/m", type: "number", default: "5k", when: { beam: ["ss_uniform", "cant_uniform"] } },
    { id: "mat", label: "مادہ (لچک کے ماڈیولس E کے لیے)", type: "select", default: "a36", options: MAT_OPTIONS },
    { id: "Ecust", label: "لچک کا ماڈیولس E (حسب ضرورت مادے کے لیے)", unit: "GPa", type: "number", default: "200", when: { mat: ["custom"] } },
    { id: "section", label: "تراش", type: "select", default: "rect", options: [["rect", "مستطیل b × h"], ["circle", "دائری، قطر d"], ["custom", "رقبے کا دوسرا لمحہ I دستی طور پر درج"]] },
    { id: "b", label: "چوڑائی b", unit: "mm", type: "number", default: "100", when: { section: ["rect"] } },
    { id: "h", label: "اونچائی h", unit: "mm", type: "number", default: "200", when: { section: ["rect"] } },
    { id: "d", label: "قطر d", unit: "mm", type: "number", default: "100", when: { section: ["circle"] } },
    { id: "Icust", label: "رقبے کا دوسرا لمحہ I", type: "number", default: "8e7", when: { section: ["custom"] } },
    { id: "Iunit", label: "I کی اکائی", type: "select", default: "mm4", options: [["mm4", "mm⁴"], ["cm4", "cm⁴"]], when: { section: ["custom"] } },
    { id: "ccust", label: "متعادل محور سے سب سے دور ریشے تک فاصلہ c", unit: "mm", type: "number", default: "100", when: { section: ["custom"] } }
  ],
  example: {
    values: { beam: "ss_point", L: "4", P: "10k", w: "5k", mat: "a36", Ecust: "200", section: "custom", b: "100", h: "200", d: "100", Icust: "8e7", Iunit: "mm4", ccust: "100" },
    expect: ["δ = 0.8333 mm", "σ = 12.5 MPa"],
    note: "مثال: 4 m لمبا سادہ سہارے والا شہتیر، درمیان میں 10 kN بوجھ، E = 200 GPa، اور I = 8.0e7 mm⁴۔"
  },
  invalid: { values: { beam: "ss_point", L: "0", P: "10k", w: "5k", mat: "a36", Ecust: "200", section: "rect", b: "100", h: "200", d: "100", Icust: "", Iunit: "mm4", ccust: "" } },
  related: ["material-properties", "stress-strain", "unit-converter", "inclined-plane", "work-energy"]
};

export function solve(input) {
  const beamId = choice(input, "beam", "شہتیر کی قسم", Object.keys(CASES), "ss_point");
  const c = CASES[beamId];
  const L = num(input, "L", "شہتیر کی لمبائی L", { positive: true });
  const q = c.load === "P"
    ? num(input, "P", "مرتکز بوجھ P", { positive: true })
    : num(input, "w", "یکساں بوجھ w", { positive: true });

  const mat = choice(input, "mat", "مادہ", [...IDS, "custom"], "a36");
  const isCustom = mat === "custom";
  const Egpa = isCustom ? num(input, "Ecust", "لچک کا ماڈیولس E", { positive: true }) : find(mat).E;

  const sec = choice(input, "section", "تراش", ["rect", "circle", "custom"], "rect");
  let I, cDist;
  if (sec === "rect") {
    const b = num(input, "b", "چوڑائی b", { positive: true });
    const h = num(input, "h", "اونچائی h", { positive: true });
    I = (b * h ** 3) / 12;
    cDist = h / 2;
  } else if (sec === "circle") {
    const d = num(input, "d", "قطر d", { positive: true });
    I = (Math.PI * d ** 4) / 64;
    cDist = d / 2;
  } else {
    const Iraw = num(input, "Icust", "رقبے کا دوسرا لمحہ I", { positive: true });
    const unit = choice(input, "Iunit", "I کی اکائی", ["mm4", "cm4"], "mm4");
    I = unit === "cm4" ? Iraw * 1e4 : Iraw;
    cDist = num(input, "ccust", "فاصلہ c", { positive: true });
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
    { text: `صورت: ${c.name}`, tex: c.deflTex },
    { text: "E کو پاسکل اور I کو m⁴ میں تبدیل کریں:", tex: `EI = ${ntex(EPa, 6)} \\times ${ntex(Im4, 6)} = ${ntex(EI, 6)}\\ N\\cdot m^2` },
    { text: "زیادہ سے زیادہ انحراف:", tex: `\\delta_{max} = ${c.substDefl(q, L, EI)} = ${ntex(defm, 6)}\\ m = ${fmt(dMm, 4)}\\ mm` },
    { text: "زیادہ سے زیادہ موڑنے والا لمحہ:", tex: `M_{max} = ${c.substMom(q, L)} = ${ntex(M, 6)}\\ N\\cdot m` },
    { text: "زیادہ سے زیادہ قینچی قوت:", tex: `V_{max} = ${c.substShear(q, L)} = ${ntex(V, 6)}\\ N` },
    { text: "زیادہ سے زیادہ موڑنے کا دباؤ (c = سب سے دور ریشے تک فاصلہ):", tex: `\\sigma_{max} = \\frac{M c}{I} = \\frac{${ntex(M * 1000, 6)} \\times ${ntex(cDist, 6)}}{${ntex(I, 6)}} = ${fmt(sigma, 4)}\\ MPa` },
    { text: "مسموحہ حد L/360 سے موازنہ:", tex: `\\frac{L}{360} = ${fmt(allow, 4)}\\ mm,\\qquad \\frac{L}{\\delta} = ${fmt(ratio, 4)}` }
  ];

  const results = [
    { label: "زیادہ سے زیادہ انحراف δ", value: `${fmt(dMm, 4)} mm`, text: `δ = ${fmt(dMm, 4)} mm` },
    { label: "زیادہ سے زیادہ موڑنے والا لمحہ M", value: eng(M, "N·m", 4), text: `M = ${eng(M, "N·m", 4)}` },
    { label: "زیادہ سے زیادہ قینچی قوت V", value: eng(V, "N", 4) }
  ];
  for (const [label, v] of reactions) results.push({ label, value: eng(v, "N", 4) });
  if (c.fixed) results.push({ label: "دیوار پر سرے کا لمحہ", value: eng(M, "N·m", 4) });
  results.push(
    { label: "زیادہ سے زیادہ موڑنے کا دباؤ σ", value: `${fmt(sigma, 4)} MPa`, text: `σ = ${fmt(sigma, 4)} MPa` },
    { label: "لمبائی سے انحراف کا تناسب L/δ", value: fmt(ratio, 4), text: `L/δ = ${fmt(ratio, 4)}` },
    { label: "مسموحہ حد L/360", value: `${fmt(allow, 4)} mm` },
    { label: "انحراف کی جانچ", value: okDefl ? "قابلِ قبول (δ ≤ L/360)" : "مسموحہ حد L/360 سے تجاوز" }
  );
  if (SF !== null) results.push({ label: "پیداوار کے مقابلے میں حفاظتی عنصر", value: fmt(SF, 3) });

  const blocks = [
    {
      type: "plot",
      title: "انحراف کا خم (منفی سمت نیچے کی جانب)",
      xLabel: "x (m)",
      yLabel: "y (mm)",
      includeZero: true,
      series: [{ name: "لچک کا خم", points, line: true }],
      hlines: [{ y: 0 }]
    }
  ];
  if (!okDefl) blocks.push({ type: "note", tone: "warn", text: `وارننگ: انحراف (${fmt(dMm, 4)} mm) مسموحہ حد L/360 (${fmt(allow, 4)} mm) سے زیادہ ہے۔` });
  if (SF !== null && SF < 1) blocks.push({ type: "note", tone: "warn", text: "وارننگ: موڑنے کا دباؤ منتخب مادے کی پیداواری مزاحمت سے زیادہ ہو گیا ہے۔" });

  const copy = `δ = ${fmt(dMm, 4)} mm، M = ${eng(M, "N·m", 4)}، σ = ${fmt(sigma, 4)} MPa، L/δ = ${fmt(ratio, 4)}`;

  return { results, steps, blocks, copy };
}
