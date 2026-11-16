import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const MAT_OPTIONS = [...MATERIALS.map((m) => [m.id, m.ar]), ["custom", "ماده سفارشی (وارد کردن E به‌صورت دستی)"]];
const find = (id) => MATERIALS.find((m) => m.id === id);

const sci = (x) => {
  const [m, e] = x.toExponential(3).split("e");
  return `${m.replace(/\.?0+$/, "")}e${Number(e)}`;
};

export const meta = {
  description: "تنش σ، کرنش ε، ازدیاد طول ΔL و ضریب ایمنی را از نیرو، سطح مقطع، طول و ماده محاسبه کنید، یا مدول الاستیسیته را از اندازه‌گیری ازدیاد طول بیابید، همراه با هشدارهای تسلیم و شکست.",
  keywords: ["تنش", "کرنش", "مدول یانگ", "ازدیاد طول", "ضریب ایمنی", "stress", "strain", "Young's modulus", "قانون هوک"],
  formulas: [
    { label: "تنش", tex: "\\sigma = \\frac{F}{A}" },
    { label: "کرنش و مدول الاستیسیته", tex: "\\varepsilon = \\frac{\\sigma}{E} = \\frac{\\Delta L}{L},\\qquad \\Delta L = \\varepsilon L" },
    { label: "ضریب ایمنی", tex: "SF = \\frac{\\sigma_y}{\\sigma}" }
  ],
  inputs: [
    { id: "mode", label: "حالت محاسبه", type: "select", default: "axial", options: [["axial", "از نیرو، سطح مقطع و ماده"], ["measurement", "از اندازه‌گیری ازدیاد طول (برای محاسبهٔ E)"]] },
    { id: "F", label: "نیروی F", unit: "N", type: "number", default: "10k", help: "می‌توانید از پیشوند k برای کیلونیوتن استفاده کنید، مانند 10k." },
    { id: "section", label: "شکل سطح مقطع", type: "select", default: "circle", options: [["circle", "دایره‌ای (قطر d)"], ["rect", "مستطیلی (b × h)"], ["custom", "مساحت سطح مقطع دلخواه A"]] },
    { id: "d", label: "قطر d", unit: "mm", type: "number", default: "10", when: { section: ["circle"] } },
    { id: "b", label: "عرض b", unit: "mm", type: "number", default: "20", when: { section: ["rect"] } },
    { id: "h", label: "ارتفاع h", unit: "mm", type: "number", default: "40", when: { section: ["rect"] } },
    { id: "Acust", label: "مساحت سطح مقطع A", unit: "mm²", type: "number", default: "1000", when: { section: ["custom"] } },
    { id: "L", label: "طول اولیه L", unit: "mm", type: "number", default: "1000" },
    { id: "dL", label: "ازدیاد طول اندازه‌گیری‌شده ΔL", unit: "mm", type: "number", default: "0.6366", when: { mode: ["measurement"] } },
    { id: "mat", label: "ماده", type: "select", default: "a36", options: MAT_OPTIONS, when: { mode: ["axial"] } },
    { id: "Ecust", label: "مدول الاستیسیته E (برای ماده سفارشی)", unit: "GPa", type: "number", default: "200", when: { mat: ["custom"] } },
    { id: "Ycust", label: "تنش تسلیم (اختیاری)", unit: "MPa", type: "number", when: { mat: ["custom"] } },
    { id: "Ucust", label: "تنش کششی نهایی (اختیاری)", unit: "MPa", type: "number", when: { mat: ["custom"] } }
  ],
  example: {
    values: { mode: "axial", F: "10k", section: "circle", d: "10", b: "", h: "", Acust: "", L: "1000", dL: "", mat: "a36", Ecust: "", Ycust: "", Ucust: "" },
    expect: ["σ = 127.3 MPa", "ε = 6.366e-4", "ΔL = 0.6366 mm", "ضریب ایمنی = 1.96"],
    note: "مثال: میلهٔ فولادی A36 به قطر 10 mm که 10 kN بار را تحمل می‌کند، طول آن 1000 mm است."
  },
  invalid: { values: { mode: "axial", F: "10k", section: "circle", d: "0", b: "", h: "", Acust: "", L: "1000", dL: "", mat: "a36", Ecust: "", Ycust: "", Ucust: "" } },
  related: ["material-properties", "beam-deflection", "unit-converter", "inclined-plane", "work-energy"]
};

function sectionArea(input, section) {
  if (section === "circle") {
    const d = num(input, "d", "قطر d", { positive: true });
    const A = (Math.PI * d * d) / 4;
    return { A, tex:`A = \\frac{\\pi d^2}{4} = \\frac{\\pi \\cdot ${ntex(d, 6)}^2}{4} = ${ntex(A, 6)}\\ mm^2`, text: "مساحت سطح مقطع دایره‌ای:" };
  }
  if (section === "rect") {
    const b = num(input, "b", "عرض b", { positive: true });
    const h = num(input, "h", "ارتفاع h", { positive: true });
    const A = b * h;
    return { A, tex: `A = b h = ${ntex(b, 6)} \\times ${ntex(h, 6)} = ${ntex(A, 6)}\\ mm^2`, text: "مساحت سطح مقطع مستطیلی:" };
  }
  const A = num(input, "Acust", "مساحت سطح مقطع A", { positive: true });
  return { A, tex: `A = ${ntex(A, 6)}\\ mm^2`, text: "مساحت سطح مقطع داده‌شده:" };
}

export function solve(input) {
  const mode = choice(input, "mode", "حالت محاسبه", ["axial", "measurement"], "axial");
  const F = num(input, "F", "نیروی F", { positive: true });
  const section = choice(input, "section", "شکل سطح مقطع", ["circle", "rect", "custom"], "circle");
  const area = sectionArea(input, section);
  const A = area.A;
  const L = num(input, "L", "طول اولیه L", { positive: true });
  const sigma = F / A;

  if (mode === "measurement") {
    const dL = num(input, "dL", "ازدیاد طول ΔL", { positive: true });
    const eps = dL / L;
    const Egpa = sigma / eps / 1000;
    const steps = [
      { text: area.text, tex: area.tex },
      { text: "تنش محاسبه‌شده:", tex: `\\sigma = \\frac{F}{A} = \\frac{${ntex(F, 6)}}{${ntex(A, 6)}} = ${ntex(sigma, 6)}\\ MPa` },
      { text: "کرنش از ازدیاد طول اندازه‌گیری‌شده:", tex: `\\varepsilon = \\frac{\\Delta L}{L} = \\frac{${ntex(dL, 6)}}{${ntex(L, 6)}} = ${ntex(eps, 6)}` },
      { text: "مدول الاستیسیته اندازه‌گیری‌شده:", tex: `E = \\frac{\\sigma}{\\varepsilon} = \\frac{${ntex(sigma, 6)}}{${ntex(eps, 6)}} = ${ntex(sigma / eps, 6)}\\ MPa = ${fmt(Egpa, 4)}\\ GPa` }
    ];
    return {
      results: [
        { label: "مساحت A", value: `${fmt(A, 4)} mm²` },
        { label: "تنش σ", value: `${fmt(sigma, 4)} MPa` },
        { label: "کرنش ε", value: sci(eps) },
        { label: "مدول الاستیسیته اندازه‌گیری‌شده E", value: `${fmt(Egpa, 4)} GPa` }
      ],
      steps,
      copy: `σ = ${fmt(sigma, 4)} MPa، ε = ${sci(eps)}، E = ${fmt(Egpa, 4)} GPa`
    };
  }

  const mat = choice(input, "mat", "ماده", [...IDS, "custom"], "a36");
  let E, yieldV, utsV;
  if (mat === "custom") {
    E = num(input, "Ecust", "مدول الاستیسیته E", { positive: true });
    yieldV = num(input, "Ycust", "تنش تسلیم", { positive: true, optional: true });
    utsV = num(input, "Ucust", "تنش کششی نهایی", { positive: true, optional: true });
  } else {
    const m = find(mat);
    E = m.E;
    yieldV = m.yield;
    utsV = m.uts;
  }
  const matName = mat === "custom" ? "ماده سفارشی" : find(mat).ar;
  const eps = sigma / (E * 1000);
  const dL = eps * L;
  const SF = yieldV ? yieldV / sigma : null;
  const sfText = SF === null ? "غیرقابل کاربرد" : fmt(SF, 3);

  const blocks = [];
  if (yieldV && sigma > yieldV) blocks.push({ type: "note", tone: "warn", text: `هشدار: تنش (${fmt(sigma, 4)} MPa) از تنش تسلیم (${fmt(yieldV, 4)} MPa) گذشته است، پس تغییر شکل دائمی (خمیری) رخ می‌دهد.` });
  if (utsV && sigma > utsV) blocks.push({ type: "note", tone: "warn", text: `هشدار: تنش (${fmt(sigma, 4)} MPa) از تنش کششی نهایی (${fmt(utsV, 4)} MPa) گذشته است، پس شکست رخ می‌دهد.` });

  const steps = [
    { text: area.text, tex: area.tex },
    { text: "تنش محوری:", tex: `\\sigma = \\frac{F}{A} = \\frac{${ntex(F, 6)}}{${ntex(A, 6)}} = ${ntex(sigma, 6)}\\ MPa` },
    { text: `کرنش با قانون هوک (E برای ${matName} = ${fmt(E, 4)} GPa):`, tex: `\\varepsilon = \\frac{\\sigma}{E} = \\frac{${ntex(sigma, 6)}}{${ntex(E * 1000, 6)}} = ${ntex(eps, 6)}` },
    { text: "ازدیاد طول کل:", tex: `\\Delta L = \\varepsilon L = ${ntex(eps, 6)} \\times ${ntex(L, 6)} = ${ntex(dL, 6)}\\ mm` }
  ];
  if (SF !== null) steps.push({ text: "ضریب ایمنی در برابر تسلیم:", tex: `SF = \\frac{\\sigma_y}{\\sigma} = \\frac{${ntex(yieldV, 6)}}{${ntex(sigma, 6)}} = ${fmt(SF, 4)}` });

  const results = [
    { label: "مساحت A", value: `${fmt(A, 4)} mm²` },
    { label: "تنش σ", value: `${fmt(sigma, 4)} MPa` },
    { label: "کرنش ε", value: sci(eps) },
    { label: "ازدیاد طول ΔL", value: `${fmt(dL, 4)} mm` },
    { label: "مدول الاستیسیته به‌کاررفته E", value: `${fmt(E, 4)} GPa` },
    { label: "ضریب ایمنی", value: sfText }
  ];

  return {
    results,
    steps,
    blocks,
    copy: `σ = ${fmt(sigma, 4)} MPa، ε = ${sci(eps)}، ΔL = ${fmt(dL, 4)} mm، ضریب ایمنی = ${sfText}`
  };
}
