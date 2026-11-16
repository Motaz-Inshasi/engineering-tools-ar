import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "محاسبه بزرگنمایی کل و میدان دید از شماره میدان، اندازه جسم از تصویر آن یا از تعداد سلول‌ها در عرض میدان دید، و قدرت تفکیک با معیار Rayleigh و معیار Abbe.",
  keywords: ["میکروسکوپ", "بزرگنمایی", "میدان دید", "شماره میدان", "field number", "قدرت تفکیک", "Rayleigh", "Abbe", "NA", "microscope"],
  formulas: [
    { label: "بزرگنمایی کل", tex: "M = M_{\\text{objective}} \\times M_{\\text{eyepiece}}" },
    { label: "قطر میدان دید", tex: "\\text{FOV} = \\frac{\\text{FN}}{M_{\\text{objective}}}" },
    { label: "اندازه واقعی جسم", tex: "d = \\frac{\\text{اندازه تصویر}}{M}" },
    { label: "قدرت تفکیک", tex: "d_R = \\frac{0.61\\,\\lambda}{NA},\\qquad d_A = \\frac{\\lambda}{2\\,NA}" }
  ],
  inputs: [
    {
      id: "mode", label: "نوع محاسبه", type: "select", default: "magnification",
      options: [["magnification", "بزرگنمایی و میدان دید"], ["size", "اندازه جسم"], ["resolution", "قدرت تفکیک"]]
    },
    { id: "obj", label: "بزرگنمایی شیئی (objective)", unit: "×", type: "number", default: "40", when: { mode: ["magnification", "size"] } },
    { id: "ocular", label: "بزرگنمایی عدسی چشمی (eyepiece)", unit: "×", type: "number", default: "10", when: { mode: ["magnification", "size"] } },
    { id: "fn", label: "شماره میدان (Field Number)", unit: "mm", type: "number", default: "20", when: { mode: ["magnification", "size"] }, help: "معمولاً روی عدسی چشمی چاپ شده است. برای محاسبه میدان دید لازم است." },
    {
      id: "sizeBy", label: "روش اندازه‌گیری اندازه", type: "select", default: "image",
      options: [["image", "از اندازه تصویر اندازه‌گیری‌شده"], ["fov", "از تعداد سلول‌ها در عرض میدان دید"]], when: { mode: ["size"] }
    },
    { id: "measured", label: "اندازه تصویر اندازه‌گیری‌شده", unit: "mm", type: "number", default: "5", when: { mode: ["size"], sizeBy: ["image"] } },
    { id: "across", label: "تعداد سلول‌ها در عرض میدان دید", type: "number", default: "5", when: { mode: ["size"], sizeBy: ["fov"] }, help: "عدد صحیح مثبت." },
    { id: "lambda", label: "طول موج λ", unit: "nm", type: "number", default: "550", when: { mode: ["resolution"] } },
    { id: "NA", label: "دهانه عددی NA عدسی شیئی", type: "number", default: "1.25", when: { mode: ["resolution"] }, help: "معمولاً بین 0.1 و 1.6." }
  ],
  example: { values: { mode: "magnification", obj: "40", ocular: "10", fn: "20", sizeBy: "image", measured: "5", across: "5", lambda: "550", NA: "1.25" }, expect: ["400×", "0.5 mm"], note: "مثال: شیئی 40× با چشمی 10× و شماره میدان 20 mm." },
  invalid: { values: { mode: "resolution", obj: "40", ocular: "10", fn: "20", sizeBy: "image", measured: "5", across: "5", lambda: "550", NA: "0" } },
  related: ["dna-tools", "optics"]
};

function magnification(input) {
  const obj = num(input, "obj", "بزرگنمایی شیئی", { positive: true });
  const ocular = num(input, "ocular", "بزرگنمایی چشمی", { positive: true });
  const fn = num(input, "fn", "شماره میدان", { positive: true });
  const M = obj * ocular;
  const fovMm = fn / obj;
  const fovUm = fovMm * 1000;
  return {
    results: [
      { label: "بزرگنمایی کل", value: `${fmt(M, 6)}×` },
      { label: "قطر میدان دید", value: `${fmt(fovMm, 4)} mm (${fmt(fovUm, 4)} µm)` }
    ],
    steps: [
      { text: "بزرگنمایی کل = بزرگنمایی شیئی × بزرگنمایی چشمی:", tex: `M = ${ntex(obj)} \\times ${ntex(ocular)} = ${ntex(M)}\\times` },
      { text: "قطر میدان دید = شماره میدان ÷ بزرگنمایی شیئی:", tex: `\\text{FOV} = \\frac{${ntex(fn)}\\ \\text{mm}}{${ntex(obj)}} = ${ntex(fovMm, 6)}\\ \\text{mm} = ${ntex(fovUm, 6)}\\ \\mu\\text{m}` }
    ],
    copy: `بزرگنمایی کل = ${fmt(M, 6)}× | قطر میدان دید = ${fmt(fovMm, 4)} mm (${fmt(fovUm, 4)} µm)`,
    blocks: []
  };
}

function size(input) {
  const obj = num(input, "obj", "بزرگنمایی شیئی", { positive: true });
  const ocular = num(input, "ocular", "بزرگنمایی چشمی", { positive: true });
  const by = choice(input, "sizeBy", "روش اندازه‌گیری", ["image", "fov"], "image");
  if (by === "fov") {
    const fn = num(input, "fn", "شماره میدان", { positive: true });
    const across = num(input, "across", "تعداد سلول‌ها در عرض میدان", { integer: true, positive: true });
    const fovUm = (fn / obj) * 1000;
    const d = fovUm / across;
    return {
      results: [
        { label: "قطر میدان دید", value: `${fmt(fovUm, 4)} µm` },
        { label: "اندازه یک سلول", value: `${fmt(d, 4)} µm` }
      ],
      steps: [
        { text: "قطر میدان دید بر حسب میکرومتر:", tex: `\\text{FOV} = \\frac{${ntex(fn)}}{${ntex(obj)}}\\ \\text{mm} = ${ntex(fovUm, 6)}\\ \\mu\\text{m}` },
        { text: "قطر سلول = میدان دید ÷ تعداد سلول‌های موجود در آن:", tex: `d = \\frac{${ntex(fovUm, 6)}}{${ntex(across)}} = ${ntex(d, 6)}\\ \\mu\\text{m}` }
      ],
      copy: `اندازه سلول = ${fmt(d, 4)} µm (میدان دید ${fmt(fovUm, 4)} µm با ${across} سلول)`,
      blocks: []
    };
  }
  const measured = num(input, "measured", "اندازه تصویر اندازه‌گیری‌شده", { positive: true });
  const M = obj * ocular;
  const dUm = (measured * 1000) / M;
  return {
    results: [
      { label: "بزرگنمایی کل", value: `${fmt(M, 6)}×` },
      { label: "اندازه واقعی جسم", value: `${fmt(dUm, 4)} µm` }
    ],
    steps: [
      { text: "اندازه واقعی = اندازه تصویر ÷ بزرگنمایی کل:", tex: `d = \\frac{${ntex(measured)}\\ \\text{mm}}{${ntex(M)}} = ${ntex(measured / M, 6)}\\ \\text{mm} = ${ntex(dUm, 6)}\\ \\mu\\text{m}` }
    ],
    copy: `اندازه واقعی = ${fmt(dUm, 4)} µm در بزرگنمایی ${fmt(M, 6)}×`,
    blocks: []
  };
}

function resolution(input) {
  const lambda = num(input, "lambda", "طول موج", { positive: true });
  const NA = num(input, "NA", "دهانه عددی NA عدسی شیئی", { positive: true, max: 2 });
  const dR = (0.61 * lambda) / NA;
  const dA = lambda / (2 * NA);
  return {
    results: [
      { label: "قدرت تفکیک (Rayleigh)", value: `${fmt(dR, 4)} nm` },
      { label: "قدرت تفکیک (Abbe)", value: `${fmt(dA, 4)} nm` }
    ],
    steps: [
      { text: "معیار Rayleigh:", tex: `d_R = 0.61 \\frac{\\lambda}{NA} = 0.61 \\times \\frac{${ntex(lambda)}}{${ntex(NA)}} = ${ntex(dR, 6)}\\ \\text{nm}` },
      { text: "معیار Abbe:", tex: `d_A = \\frac{\\lambda}{2\\,NA} = \\frac{${ntex(lambda)}}{2 \\times ${ntex(NA)}} = ${ntex(dA, 6)}\\ \\text{nm}` }
    ],
    copy: `قدرت تفکیک (Rayleigh) = ${fmt(dR, 4)} nm، (Abbe) = ${fmt(dA, 4)} nm`,
    blocks: []
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "نوع محاسبه", ["magnification", "size", "resolution"], "magnification");
  if (mode === "size") return size(input);
  if (mode === "resolution") return resolution(input);
  return magnification(input);
}
