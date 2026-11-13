import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const MAT_OPTIONS = [...MATERIALS.map((m) => [m.id, m.ar]), ["custom", "مادة مخصصة (إدخال E يدوياً)"]];
const find = (id) => MATERIALS.find((m) => m.id === id);

const sci = (x) => {
  const [m, e] = x.toExponential(3).split("e");
  return `${m.replace(/\.?0+$/, "")}e${Number(e)}`;
};

export const meta = {
  description: "احسب الإجهاد σ والانفعال ε والاستطالة ΔL وعامل الأمان من القوة والمقطع والطول والمادة، أو احسب معامل المرونة من قياس الاستطالة، مع تحذيرات الخضوع والكسر.",
  keywords: ["إجهاد", "انفعال", "معامل يونغ", "استطالة", "عامل الأمان", "stress", "strain", "Young's modulus", "هوك"],
  formulas: [
    { label: "الإجهاد", tex: "\\sigma = \\frac{F}{A}" },
    { label: "الانفعال ومعامل المرونة", tex: "\\varepsilon = \\frac{\\sigma}{E} = \\frac{\\Delta L}{L},\\qquad \\Delta L = \\varepsilon L" },
    { label: "عامل الأمان", tex: "SF = \\frac{\\sigma_y}{\\sigma}" }
  ],
  inputs: [
    { id: "mode", label: "وضع الحساب", type: "select", default: "axial", options: [["axial", "من القوة والمقطع والمادة"], ["measurement", "من قياس الاستطالة (لحساب E)"]] },
    { id: "F", label: "القوة F", unit: "N", type: "number", default: "10k", help: "يمكن استخدام البادئة k للكيلونيوتن، مثل 10k." },
    { id: "section", label: "شكل المقطع", type: "select", default: "circle", options: [["circle", "دائري (القطر d)"], ["rect", "مستطيل (b × h)"], ["custom", "مساحة مخصصة A"]] },
    { id: "d", label: "القطر d", unit: "mm", type: "number", default: "10", when: { section: ["circle"] } },
    { id: "b", label: "العرض b", unit: "mm", type: "number", default: "20", when: { section: ["rect"] } },
    { id: "h", label: "الارتفاع h", unit: "mm", type: "number", default: "40", when: { section: ["rect"] } },
    { id: "Acust", label: "مساحة المقطع A", unit: "mm²", type: "number", default: "1000", when: { section: ["custom"] } },
    { id: "L", label: "الطول الأصلي L", unit: "mm", type: "number", default: "1000" },
    { id: "dL", label: "الاستطالة المقاسة ΔL", unit: "mm", type: "number", default: "0.6366", when: { mode: ["measurement"] } },
    { id: "mat", label: "المادة", type: "select", default: "a36", options: MAT_OPTIONS, when: { mode: ["axial"] } },
    { id: "Ecust", label: "معامل المرونة E (للمادة المخصصة)", unit: "GPa", type: "number", default: "200", when: { mat: ["custom"] } },
    { id: "Ycust", label: "مقاومة الخضوع (اختياري)", unit: "MPa", type: "number", when: { mat: ["custom"] } },
    { id: "Ucust", label: "مقاومة الشد القصوى (اختياري)", unit: "MPa", type: "number", when: { mat: ["custom"] } }
  ],
  example: {
    values: { mode: "axial", F: "10k", section: "circle", d: "10", b: "", h: "", Acust: "", L: "1000", dL: "", mat: "a36", Ecust: "", Ycust: "", Ucust: "" },
    expect: ["σ = 127.3 MPa", "ε = 6.366e-4", "ΔL = 0.6366 mm", "عامل الأمان = 1.96"],
    note: "مثال: قضيب فولاذ A36 قطره 10 mm يحمل 10 kN، طوله 1000 mm."
  },
  invalid: { values: { mode: "axial", F: "10k", section: "circle", d: "0", b: "", h: "", Acust: "", L: "1000", dL: "", mat: "a36", Ecust: "", Ycust: "", Ucust: "" } },
  related: ["material-properties", "beam-deflection", "unit-converter", "inclined-plane", "work-energy"]
};

function sectionArea(input, section) {
  if (section === "circle") {
    const d = num(input, "d", "القطر d", { positive: true });
    const A = (Math.PI * d * d) / 4;
    return { A, tex:`A = \\frac{\\pi d^2}{4} = \\frac{\\pi \\cdot ${ntex(d, 6)}^2}{4} = ${ntex(A, 6)}\\ mm^2`, text: "مساحة المقطع الدائري:" };
  }
  if (section === "rect") {
    const b = num(input, "b", "العرض b", { positive: true });
    const h = num(input, "h", "الارتفاع h", { positive: true });
    const A = b * h;
    return { A, tex: `A = b h = ${ntex(b, 6)} \\times ${ntex(h, 6)} = ${ntex(A, 6)}\\ mm^2`, text: "مساحة المقطع المستطيل:" };
  }
  const A = num(input, "Acust", "مساحة المقطع A", { positive: true });
  return { A, tex: `A = ${ntex(A, 6)}\\ mm^2`, text: "مساحة المقطع المعطاة:" };
}

export function solve(input) {
  const mode = choice(input, "mode", "وضع الحساب", ["axial", "measurement"], "axial");
  const F = num(input, "F", "القوة F", { positive: true });
  const section = choice(input, "section", "شكل المقطع", ["circle", "rect", "custom"], "circle");
  const area = sectionArea(input, section);
  const A = area.A;
  const L = num(input, "L", "الطول الأصلي L", { positive: true });
  const sigma = F / A;

  if (mode === "measurement") {
    const dL = num(input, "dL", "الاستطالة ΔL", { positive: true });
    const eps = dL / L;
    const Egpa = sigma / eps / 1000;
    const steps = [
      { text: area.text, tex: area.tex },
      { text: "الإجهاد المحسوب:", tex: `\\sigma = \\frac{F}{A} = \\frac{${ntex(F, 6)}}{${ntex(A, 6)}} = ${ntex(sigma, 6)}\\ MPa` },
      { text: "الانفعال من الاستطالة المقاسة:", tex: `\\varepsilon = \\frac{\\Delta L}{L} = \\frac{${ntex(dL, 6)}}{${ntex(L, 6)}} = ${ntex(eps, 6)}` },
      { text: "معامل المرونة المقاس:", tex: `E = \\frac{\\sigma}{\\varepsilon} = \\frac{${ntex(sigma, 6)}}{${ntex(eps, 6)}} = ${ntex(sigma / eps, 6)}\\ MPa = ${fmt(Egpa, 4)}\\ GPa` }
    ];
    return {
      results: [
        { label: "المساحة A", value: `${fmt(A, 4)} mm²` },
        { label: "الإجهاد σ", value: `${fmt(sigma, 4)} MPa` },
        { label: "الانفعال ε", value: sci(eps) },
        { label: "معامل المرونة المقاس E", value: `${fmt(Egpa, 4)} GPa` }
      ],
      steps,
      copy: `σ = ${fmt(sigma, 4)} MPa، ε = ${sci(eps)}، E = ${fmt(Egpa, 4)} GPa`
    };
  }

  const mat = choice(input, "mat", "المادة", [...IDS, "custom"], "a36");
  let E, yieldV, utsV;
  if (mat === "custom") {
    E = num(input, "Ecust", "معامل المرونة E", { positive: true });
    yieldV = num(input, "Ycust", "مقاومة الخضوع", { positive: true, optional: true });
    utsV = num(input, "Ucust", "مقاومة الشد القصوى", { positive: true, optional: true });
  } else {
    const m = find(mat);
    E = m.E;
    yieldV = m.yield;
    utsV = m.uts;
  }
  const matName = mat === "custom" ? "مادة مخصصة" : find(mat).ar;
  const eps = sigma / (E * 1000);
  const dL = eps * L;
  const SF = yieldV ? yieldV / sigma : null;
  const sfText = SF === null ? "غير منطبق" : fmt(SF, 3);

  const blocks = [];
  if (yieldV && sigma > yieldV) blocks.push({ type: "note", tone: "warn", text: `تحذير: الإجهاد (${fmt(sigma, 4)} MPa) تجاوز مقاومة الخضوع (${fmt(yieldV, 4)} MPa)، فيحدث تشوه دائم (لدن).` });
  if (utsV && sigma > utsV) blocks.push({ type: "note", tone: "warn", text: `تحذير: الإجهاد (${fmt(sigma, 4)} MPa) تجاوز مقاومة الشد القصوى (${fmt(utsV, 4)} MPa)، فيحدث كسر.` });

  const steps = [
    { text: area.text, tex: area.tex },
    { text: "الإجهاد المحوري:", tex: `\\sigma = \\frac{F}{A} = \\frac{${ntex(F, 6)}}{${ntex(A, 6)}} = ${ntex(sigma, 6)}\\ MPa` },
    { text: `الانفعال بقانون هوك (E لـ ${matName} = ${fmt(E, 4)} GPa):`, tex: `\\varepsilon = \\frac{\\sigma}{E} = \\frac{${ntex(sigma, 6)}}{${ntex(E * 1000, 6)}} = ${ntex(eps, 6)}` },
    { text: "الاستطالة الكلية:", tex: `\\Delta L = \\varepsilon L = ${ntex(eps, 6)} \\times ${ntex(L, 6)} = ${ntex(dL, 6)}\\ mm` }
  ];
  if (SF !== null) steps.push({ text: "عامل الأمان على الخضوع:", tex: `SF = \\frac{\\sigma_y}{\\sigma} = \\frac{${ntex(yieldV, 6)}}{${ntex(sigma, 6)}} = ${fmt(SF, 4)}` });

  const results = [
    { label: "المساحة A", value: `${fmt(A, 4)} mm²` },
    { label: "الإجهاد σ", value: `${fmt(sigma, 4)} MPa` },
    { label: "الانفعال ε", value: sci(eps) },
    { label: "الاستطالة ΔL", value: `${fmt(dL, 4)} mm` },
    { label: "معامل المرونة المستخدم E", value: `${fmt(E, 4)} GPa` },
    { label: "عامل الأمان", value: sfText }
  ];

  return {
    results,
    steps,
    blocks,
    copy: `σ = ${fmt(sigma, 4)} MPa، ε = ${sci(eps)}، ΔL = ${fmt(dL, 4)} mm، عامل الأمان = ${sfText}`
  };
}
