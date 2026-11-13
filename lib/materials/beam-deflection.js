import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, eng, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const MAT_OPTIONS = [...MATERIALS.map((m) => [m.id, m.ar]), ["custom", "مادة مخصصة (إدخال E يدوياً)"]];
const find = (id) => MATERIALS.find((m) => m.id === id);

const CASES = {
  ss_point: {
    name: "كمرة بسيطة الدعم بحمل مركّز P في المنتصف",
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
    reactions: (q) => [["رد الفعل عند الدعم A", q / 2], ["رد الفعل عند الدعم B", q / 2]],
    fixed: false,
    curve: (q, L, EI, x) => {
      const s = x <= L / 2 ? x : L - x;
      return (q * s * (3 * L * L - 4 * s * s)) / (48 * EI);
    }
  },
  ss_uniform: {
    name: "كمرة بسيطة الدعم بحمل منتظم w",
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
    reactions: (q, L) => [["رد الفعل عند الدعم A", (q * L) / 2], ["رد الفعل عند الدعم B", (q * L) / 2]],
    fixed: false,
    curve: (q, L, EI, x) => (q * x * (L ** 3 - 2 * L * x * x + x ** 3)) / (24 * EI)
  },
  cant_point: {
    name: "كمرة ذراع (مثبتة من طرف) بحمل مركّز P في الطرف الحر",
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
    reactions: (q) => [["رد الفعل الرأسي عند الدعم الثابت", q]],
    fixed: true,
    curve: (q, L, EI, x) => (q * x * x * (3 * L - x)) / (6 * EI)
  },
  cant_uniform: {
    name: "كمرة ذراع (مثبتة من طرف) بحمل منتظم w",
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
    reactions: (q, L) => [["رد الفعل الرأسي عند الدعم الثابت", q * L]],
    fixed: true,
    curve: (q, L, EI, x) => (q * x * x * (6 * L * L - 4 * L * x + x * x)) / (24 * EI)
  }
};

export const meta = {
  description: "احسب أقصى انحراف وعزم الانحناء وقوة القص وردود الأفعال والإجهاد الانحنائي لكمرة بسيطة أو ذراع تحت حمل مركّز أو منتظم، وارسم منحنى الانحراف وتحقق من حد L/360.",
  keywords: ["انحناء الكمرة", "انحراف الكمرة", "عزم الانحناء", "قوة القص", "كمرة بسيطة", "كمرة ذراع", "beam deflection", "bending moment", "L/360"],
  formulas: [
    { label: "انحراف كمرة بسيطة بحمل مركّز", tex: "\\delta_{max} = \\frac{PL^3}{48EI}" },
    { label: "انحراف كمرة بسيطة بحمل منتظم", tex: "\\delta_{max} = \\frac{5wL^4}{384EI}" },
    { label: "انحراف ذراع بحمل مركّز في الطرف", tex: "\\delta_{max} = \\frac{PL^3}{3EI}" },
    { label: "انحراف ذراع بحمل منتظم", tex: "\\delta_{max} = \\frac{wL^4}{8EI}" },
    { label: "إجهاد الانحناء", tex: "\\sigma = \\frac{Mc}{I}" }
  ],
  inputs: [
    { id: "beam", label: "نوع الكمرة والحمل", type: "select", default: "ss_point", options: [["ss_point", "بسيطة الدعم - حمل مركّز في المنتصف"], ["ss_uniform", "بسيطة الدعم - حمل منتظم"], ["cant_point", "ذراع - حمل مركّز في الطرف الحر"], ["cant_uniform", "ذراع - حمل منتظم"]] },
    { id: "L", label: "طول الكمرة L", unit: "m", type: "number", default: "4" },
    { id: "P", label: "الحمل المركّز P", unit: "N", type: "number", default: "10k", when: { beam: ["ss_point", "cant_point"] } },
    { id: "w", label: "الحمل المنتظم w", unit: "N/m", type: "number", default: "5k", when: { beam: ["ss_uniform", "cant_uniform"] } },
    { id: "mat", label: "المادة (لمعامل المرونة E)", type: "select", default: "a36", options: MAT_OPTIONS },
    { id: "Ecust", label: "معامل المرونة E (للمادة المخصصة)", unit: "GPa", type: "number", default: "200", when: { mat: ["custom"] } },
    { id: "section", label: "المقطع", type: "select", default: "rect", options: [["rect", "مستطيل b × h"], ["circle", "دائري قطره d"], ["custom", "عزم قصور I مدخل يدوياً"]] },
    { id: "b", label: "العرض b", unit: "mm", type: "number", default: "100", when: { section: ["rect"] } },
    { id: "h", label: "الارتفاع h", unit: "mm", type: "number", default: "200", when: { section: ["rect"] } },
    { id: "d", label: "القطر d", unit: "mm", type: "number", default: "100", when: { section: ["circle"] } },
    { id: "Icust", label: "عزم القصور I", type: "number", default: "8e7", when: { section: ["custom"] } },
    { id: "Iunit", label: "وحدة I", type: "select", default: "mm4", options: [["mm4", "mm⁴"], ["cm4", "cm⁴"]], when: { section: ["custom"] } },
    { id: "ccust", label: "المسافة c من المحور المحايد لأبعد ليف", unit: "mm", type: "number", default: "100", when: { section: ["custom"] } }
  ],
  example: {
    values: { beam: "ss_point", L: "4", P: "10k", w: "5k", mat: "a36", Ecust: "200", section: "custom", b: "100", h: "200", d: "100", Icust: "8e7", Iunit: "mm4", ccust: "100" },
    expect: ["δ = 0.8333 mm", "σ = 12.5 MPa"],
    note: "مثال: كمرة بسيطة طولها 4 m بحمل 10 kN في المنتصف، E = 200 GPa، و I = 8.0e7 mm⁴."
  },
  invalid: { values: { beam: "ss_point", L: "0", P: "10k", w: "5k", mat: "a36", Ecust: "200", section: "rect", b: "100", h: "200", d: "100", Icust: "", Iunit: "mm4", ccust: "" } },
  related: ["material-properties", "stress-strain", "unit-converter", "inclined-plane", "work-energy"]
};

export function solve(input) {
  const beamId = choice(input, "beam", "نوع الكمرة", Object.keys(CASES), "ss_point");
  const c = CASES[beamId];
  const L = num(input, "L", "طول الكمرة L", { positive: true });
  const q = c.load === "P"
    ? num(input, "P", "الحمل المركّز P", { positive: true })
    : num(input, "w", "الحمل المنتظم w", { positive: true });

  const mat = choice(input, "mat", "المادة", [...IDS, "custom"], "a36");
  const isCustom = mat === "custom";
  const Egpa = isCustom ? num(input, "Ecust", "معامل المرونة E", { positive: true }) : find(mat).E;

  const sec = choice(input, "section", "المقطع", ["rect", "circle", "custom"], "rect");
  let I, cDist;
  if (sec === "rect") {
    const b = num(input, "b", "العرض b", { positive: true });
    const h = num(input, "h", "الارتفاع h", { positive: true });
    I = (b * h ** 3) / 12;
    cDist = h / 2;
  } else if (sec === "circle") {
    const d = num(input, "d", "القطر d", { positive: true });
    I = (Math.PI * d ** 4) / 64;
    cDist = d / 2;
  } else {
    const Iraw = num(input, "Icust", "عزم القصور I", { positive: true });
    const unit = choice(input, "Iunit", "وحدة I", ["mm4", "cm4"], "mm4");
    I = unit === "cm4" ? Iraw * 1e4 : Iraw;
    cDist = num(input, "ccust", "المسافة c", { positive: true });
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
    { text: `الحالة: ${c.name}`, tex: c.deflTex },
    { text: "تحويل E إلى باسكال و I إلى m⁴:", tex: `EI = ${ntex(EPa, 6)} \\times ${ntex(Im4, 6)} = ${ntex(EI, 6)}\\ N\\cdot m^2` },
    { text: "أقصى انحراف:", tex: `\\delta_{max} = ${c.substDefl(q, L, EI)} = ${ntex(defm, 6)}\\ m = ${fmt(dMm, 4)}\\ mm` },
    { text: "أقصى عزم انحناء:", tex: `M_{max} = ${c.substMom(q, L)} = ${ntex(M, 6)}\\ N\\cdot m` },
    { text: "أقصى قوة قص:", tex: `V_{max} = ${c.substShear(q, L)} = ${ntex(V, 6)}\\ N` },
    { text: "أقصى إجهاد انحناء (c = المسافة لأبعد ليف):", tex: `\\sigma_{max} = \\frac{M c}{I} = \\frac{${ntex(M * 1000, 6)} \\times ${ntex(cDist, 6)}}{${ntex(I, 6)}} = ${fmt(sigma, 4)}\\ MPa` },
    { text: "التحقق من الحد المسموح L/360:", tex: `\\frac{L}{360} = ${fmt(allow, 4)}\\ mm,\\qquad \\frac{L}{\\delta} = ${fmt(ratio, 4)}` }
  ];

  const results = [
    { label: "أقصى انحراف δ", value: `${fmt(dMm, 4)} mm`, text: `δ = ${fmt(dMm, 4)} mm` },
    { label: "أقصى عزم انحناء M", value: eng(M, "N·m", 4), text: `M = ${eng(M, "N·m", 4)}` },
    { label: "أقصى قوة قص V", value: eng(V, "N", 4) }
  ];
  for (const [label, v] of reactions) results.push({ label, value: eng(v, "N", 4) });
  if (c.fixed) results.push({ label: "عزم التثبيت عند الجدار", value: eng(M, "N·m", 4) });
  results.push(
    { label: "أقصى إجهاد انحناء σ", value: `${fmt(sigma, 4)} MPa`, text: `σ = ${fmt(sigma, 4)} MPa` },
    { label: "نسبة الطول إلى الانحراف L/δ", value: fmt(ratio, 4), text: `L/δ = ${fmt(ratio, 4)}` },
    { label: "الحد المسموح L/360", value: `${fmt(allow, 4)} mm` },
    { label: "التحقق من الانحراف", value: okDefl ? "مقبول (δ ≤ L/360)" : "يتجاوز الحد المسموح L/360" }
  );
  if (SF !== null) results.push({ label: "عامل الأمان على الخضوع", value: fmt(SF, 3) });

  const blocks = [
    {
      type: "plot",
      title: "منحنى الانحراف (الاتجاه السالب إلى الأسفل)",
      xLabel: "x (m)",
      yLabel: "y (mm)",
      includeZero: true,
      series: [{ name: "منحنى المرونة", points, line: true }],
      hlines: [{ y: 0 }]
    }
  ];
  if (!okDefl) blocks.push({ type: "note", tone: "warn", text: `تحذير: الانحراف (${fmt(dMm, 4)} mm) يتجاوز الحد المسموح L/360 (${fmt(allow, 4)} mm).` });
  if (SF !== null && SF < 1) blocks.push({ type: "note", tone: "warn", text: "تحذير: الإجهاد الانحنائي تجاوز مقاومة الخضوع للمادة المختارة." });

  const copy = `δ = ${fmt(dMm, 4)} mm، M = ${eng(M, "N·m", 4)}، σ = ${fmt(sigma, 4)} MPa، L/δ = ${fmt(ratio, 4)}`;

  return { results, steps, blocks, copy };
}
