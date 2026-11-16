import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const MAT_OPTIONS = [...MATERIALS.map((m) => [m.id, m.ar]), ["custom", "حسب ضرورت مادہ (E دستی طور پر درج کریں)"]];
const find = (id) => MATERIALS.find((m) => m.id === id);

const sci = (x) => {
  const [m, e] = x.toExponential(3).split("e");
  return `${m.replace(/\.?0+$/, "")}e${Number(e)}`;
};

export const meta = {
  description: "قوت، تراش، لمبائی اور مادے سے تناؤ σ، انفعال ε، لمبائی میں اضافہ ΔL اور حفاظتی عنصر حساب کریں، یا ناپی گئی لمبائی میں اضافے سے لچک کا ماڈیولس حساب کریں، ساتھ پیداوار اور ٹوٹ پھوٹ کی وارننگ۔",
  keywords: ["تناؤ", "انفعال", "ینگ کا ماڈیولس", "لمبائی میں اضافہ", "حفاظتی عنصر", "stress", "strain", "Young's modulus", "ہُک کا قانون"],
  formulas: [
    { label: "تناؤ", tex: "\\sigma = \\frac{F}{A}" },
    { label: "انفعال اور لچک کا ماڈیولس", tex: "\\varepsilon = \\frac{\\sigma}{E} = \\frac{\\Delta L}{L},\\qquad \\Delta L = \\varepsilon L" },
    { label: "حفاظتی عنصر", tex: "SF = \\frac{\\sigma_y}{\\sigma}" }
  ],
  inputs: [
    { id: "mode", label: "حساب کا طریقہ", type: "select", default: "axial", options: [["axial", "قوت، تراش اور مادے سے"], ["measurement", "ناپی گئی لمبائی میں اضافے سے (E حساب کرنے کے لیے)"]] },
    { id: "F", label: "قوت F", unit: "N", type: "number", default: "10k", help: "کلونیوٹن کے لیے سابقہ k استعمال کیا جا سکتا ہے، جیسے 10k۔" },
    { id: "section", label: "تراش کی شکل", type: "select", default: "circle", options: [["circle", "دائری (قطر d)"], ["rect", "مستطیل (b × h)"], ["custom", "حسب ضرورت رقبہ A"]] },
    { id: "d", label: "قطر d", unit: "mm", type: "number", default: "10", when: { section: ["circle"] } },
    { id: "b", label: "چوڑائی b", unit: "mm", type: "number", default: "20", when: { section: ["rect"] } },
    { id: "h", label: "اونچائی h", unit: "mm", type: "number", default: "40", when: { section: ["rect"] } },
    { id: "Acust", label: "تراش کا رقبہ A", unit: "mm²", type: "number", default: "1000", when: { section: ["custom"] } },
    { id: "L", label: "اصل لمبائی L", unit: "mm", type: "number", default: "1000" },
    { id: "dL", label: "ناپی گئی لمبائی میں اضافہ ΔL", unit: "mm", type: "number", default: "0.6366", when: { mode: ["measurement"] } },
    { id: "mat", label: "مادہ", type: "select", default: "a36", options: MAT_OPTIONS, when: { mode: ["axial"] } },
    { id: "Ecust", label: "لچک کا ماڈیولس E (حسب ضرورت مادے کے لیے)", unit: "GPa", type: "number", default: "200", when: { mat: ["custom"] } },
    { id: "Ycust", label: "پیداواری مزاحمت (اختیاری)", unit: "MPa", type: "number", when: { mat: ["custom"] } },
    { id: "Ucust", label: "زیادہ سے زیادہ تناؤ کی مزاحمت (اختیاری)", unit: "MPa", type: "number", when: { mat: ["custom"] } }
  ],
  example: {
    values: { mode: "axial", F: "10k", section: "circle", d: "10", b: "", h: "", Acust: "", L: "1000", dL: "", mat: "a36", Ecust: "", Ycust: "", Ucust: "" },
    expect: ["σ = 127.3 MPa", "ε = 6.366e-4", "ΔL = 0.6366 mm", "حفاظتی عنصر = 1.96"],
    note: "مثال: 10 mm قطر کی A36 اسٹیل کی سلاخ، جس پر 10 kN بوجھ ہے، اور لمبائی 1000 mm۔"
  },
  invalid: { values: { mode: "axial", F: "10k", section: "circle", d: "0", b: "", h: "", Acust: "", L: "1000", dL: "", mat: "a36", Ecust: "", Ycust: "", Ucust: "" } },
  related: ["material-properties", "beam-deflection", "unit-converter", "inclined-plane", "work-energy"]
};

function sectionArea(input, section) {
  if (section === "circle") {
    const d = num(input, "d", "قطر d", { positive: true });
    const A = (Math.PI * d * d) / 4;
    return { A, tex:`A = \\frac{\\pi d^2}{4} = \\frac{\\pi \\cdot ${ntex(d, 6)}^2}{4} = ${ntex(A, 6)}\\ mm^2`, text: "دائری تراش کا رقبہ:" };
  }
  if (section === "rect") {
    const b = num(input, "b", "چوڑائی b", { positive: true });
    const h = num(input, "h", "اونچائی h", { positive: true });
    const A = b * h;
    return { A, tex: `A = b h = ${ntex(b, 6)} \\times ${ntex(h, 6)} = ${ntex(A, 6)}\\ mm^2`, text: "مستطیل تراش کا رقبہ:" };
  }
  const A = num(input, "Acust", "تراش کا رقبہ A", { positive: true });
  return { A, tex: `A = ${ntex(A, 6)}\\ mm^2`, text: "دیا گیا تراش کا رقبہ:" };
}

export function solve(input) {
  const mode = choice(input, "mode", "حساب کا طریقہ", ["axial", "measurement"], "axial");
  const F = num(input, "F", "قوت F", { positive: true });
  const section = choice(input, "section", "تراش کی شکل", ["circle", "rect", "custom"], "circle");
  const area = sectionArea(input, section);
  const A = area.A;
  const L = num(input, "L", "اصل لمبائی L", { positive: true });
  const sigma = F / A;

  if (mode === "measurement") {
    const dL = num(input, "dL", "لمبائی میں اضافہ ΔL", { positive: true });
    const eps = dL / L;
    const Egpa = sigma / eps / 1000;
    const steps = [
      { text: area.text, tex: area.tex },
      { text: "حساب شدہ تناؤ:", tex: `\\sigma = \\frac{F}{A} = \\frac{${ntex(F, 6)}}{${ntex(A, 6)}} = ${ntex(sigma, 6)}\\ MPa` },
      { text: "ناپی گئی لمبائی میں اضافے سے انفعال:", tex: `\\varepsilon = \\frac{\\Delta L}{L} = \\frac{${ntex(dL, 6)}}{${ntex(L, 6)}} = ${ntex(eps, 6)}` },
      { text: "ناپا گیا لچک کا ماڈیولس:", tex: `E = \\frac{\\sigma}{\\varepsilon} = \\frac{${ntex(sigma, 6)}}{${ntex(eps, 6)}} = ${ntex(sigma / eps, 6)}\\ MPa = ${fmt(Egpa, 4)}\\ GPa` }
    ];
    return {
      results: [
        { label: "رقبہ A", value: `${fmt(A, 4)} mm²` },
        { label: "تناؤ σ", value: `${fmt(sigma, 4)} MPa` },
        { label: "انفعال ε", value: sci(eps) },
        { label: "ناپا گیا لچک کا ماڈیولس E", value: `${fmt(Egpa, 4)} GPa` }
      ],
      steps,
      copy: `σ = ${fmt(sigma, 4)} MPa، ε = ${sci(eps)}، E = ${fmt(Egpa, 4)} GPa`
    };
  }

  const mat = choice(input, "mat", "مادہ", [...IDS, "custom"], "a36");
  let E, yieldV, utsV;
  if (mat === "custom") {
    E = num(input, "Ecust", "لچک کا ماڈیولس E", { positive: true });
    yieldV = num(input, "Ycust", "پیداواری مزاحمت", { positive: true, optional: true });
    utsV = num(input, "Ucust", "زیادہ سے زیادہ تناؤ کی مزاحمت", { positive: true, optional: true });
  } else {
    const m = find(mat);
    E = m.E;
    yieldV = m.yield;
    utsV = m.uts;
  }
  const matName = mat === "custom" ? "حسب ضرورت مادہ" : find(mat).ar;
  const eps = sigma / (E * 1000);
  const dL = eps * L;
  const SF = yieldV ? yieldV / sigma : null;
  const sfText = SF === null ? "لاگو نہیں" : fmt(SF, 3);

  const blocks = [];
  if (yieldV && sigma > yieldV) blocks.push({ type: "note", tone: "warn", text: `وارننگ: تناؤ (${fmt(sigma, 4)} MPa) پیداواری مزاحمت (${fmt(yieldV, 4)} MPa) سے زیادہ ہے، اس لیے مستقل (پلاسٹک) تشکیل ہوگی۔` });
  if (utsV && sigma > utsV) blocks.push({ type: "note", tone: "warn", text: `وارننگ: تناؤ (${fmt(sigma, 4)} MPa) زیادہ سے زیادہ تناؤ کی مزاحمت (${fmt(utsV, 4)} MPa) سے زیادہ ہے، اس لیے ٹوٹ پھوٹ ہوگی۔` });

  const steps = [
    { text: area.text, tex: area.tex },
    { text: "محوری تناؤ:", tex: `\\sigma = \\frac{F}{A} = \\frac{${ntex(F, 6)}}{${ntex(A, 6)}} = ${ntex(sigma, 6)}\\ MPa` },
    { text: `ہُک کے قانون سے انفعال (${matName} کے لیے E = ${fmt(E, 4)} GPa):`, tex: `\\varepsilon = \\frac{\\sigma}{E} = \\frac{${ntex(sigma, 6)}}{${ntex(E * 1000, 6)}} = ${ntex(eps, 6)}` },
    { text: "کل لمبائی میں اضافہ:", tex: `\\Delta L = \\varepsilon L = ${ntex(eps, 6)} \\times ${ntex(L, 6)} = ${ntex(dL, 6)}\\ mm` }
  ];
  if (SF !== null) steps.push({ text: "پیداوار کے مقابلے میں حفاظتی عنصر:", tex: `SF = \\frac{\\sigma_y}{\\sigma} = \\frac{${ntex(yieldV, 6)}}{${ntex(sigma, 6)}} = ${fmt(SF, 4)}` });

  const results = [
    { label: "رقبہ A", value: `${fmt(A, 4)} mm²` },
    { label: "تناؤ σ", value: `${fmt(sigma, 4)} MPa` },
    { label: "انفعال ε", value: sci(eps) },
    { label: "لمبائی میں اضافہ ΔL", value: `${fmt(dL, 4)} mm` },
    { label: "استعمال شدہ لچک کا ماڈیولس E", value: `${fmt(E, 4)} GPa` },
    { label: "حفاظتی عنصر", value: sfText }
  ];

  return {
    results,
    steps,
    blocks,
    copy: `σ = ${fmt(sigma, 4)} MPa، ε = ${sci(eps)}، ΔL = ${fmt(dL, 4)} mm، حفاظتی عنصر = ${sfText}`
  };
}
