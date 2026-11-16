import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "خوردبین کی کل میگنیفیکیشن اور فیلڈ آف ویو فیلڈ نمبر سے، کسی چیز کا سائز اس کی تصویر سے یا فیلڈ میں خلیوں کی تعداد سے، اور ریلے اور ایب معیار سے ریزالونگ پاور حساب کریں۔",
  keywords: ["خوردبین", "میگنیفیکیشن", "فیلڈ آف ویو", "فیلڈ نمبر", "field number", "ریزالونگ پاور", "Rayleigh", "Abbe", "NA", "microscope"],
  formulas: [
    { label: "کل میگنیفیکیشن", tex: "M = M_{\\text{objective}} \\times M_{\\text{eyepiece}}" },
    { label: "فیلڈ آف ویو کا قطر", tex: "\\text{FOV} = \\frac{\\text{FN}}{M_{\\text{objective}}}" },
    { label: "جسم کا اصل سائز", tex: "d = \\frac{\\text{تصویر کا سائز}}{M}" },
    { label: "ریزالونگ پاور", tex: "d_R = \\frac{0.61\\,\\lambda}{NA},\\qquad d_A = \\frac{\\lambda}{2\\,NA}" }
  ],
  inputs: [
    {
      id: "mode", label: "حساب کی قسم", type: "select", default: "magnification",
      options: [["magnification", "میگنیفیکیشن اور فیلڈ آف ویو"], ["size", "جسم کا سائز"], ["resolution", "ریزالونگ پاور"]]
    },
    { id: "obj", label: "آبجیکٹو کی میگنیفیکیشن (objective)", unit: "×", type: "number", default: "40", when: { mode: ["magnification", "size"] } },
    { id: "ocular", label: "آئی پیس کی میگنیفیکیشن (eyepiece)", unit: "×", type: "number", default: "10", when: { mode: ["magnification", "size"] } },
    { id: "fn", label: "فیلڈ نمبر (Field Number)", unit: "mm", type: "number", default: "20", when: { mode: ["magnification", "size"] }, help: "یہ عموماً آئی پیس پر لکھا ہوتا ہے۔ فیلڈ آف ویو کے حساب کے لیے درکار ہے۔" },
    {
      id: "sizeBy", label: "سائز ناپنے کا طریقہ", type: "select", default: "image",
      options: [["image", "ناپی گئی تصویر کے سائز سے"], ["fov", "فیلڈ آف ویو میں خلیوں کی تعداد سے"]], when: { mode: ["size"] }
    },
    { id: "measured", label: "ناپا گیا تصویر کا سائز", unit: "mm", type: "number", default: "5", when: { mode: ["size"], sizeBy: ["image"] } },
    { id: "across", label: "فیلڈ آف ویو میں خلیوں کی تعداد", type: "number", default: "5", when: { mode: ["size"], sizeBy: ["fov"] }, help: "مثبت عدد صحیح۔" },
    { id: "lambda", label: "ویو لینتھ λ", unit: "nm", type: "number", default: "550", when: { mode: ["resolution"] } },
    { id: "NA", label: "آبجیکٹو کا نیومیریکل ایپرچر NA", type: "number", default: "1.25", when: { mode: ["resolution"] }, help: "عموماً 0.1 اور 1.6 کے درمیان۔" }
  ],
  example: { values: { mode: "magnification", obj: "40", ocular: "10", fn: "20", sizeBy: "image", measured: "5", across: "5", lambda: "550", NA: "1.25" }, expect: ["400×", "0.5 mm"], note: "مثال: 40× آبجیکٹو، 10× آئی پیس اور فیلڈ نمبر 20 mm۔" },
  invalid: { values: { mode: "resolution", obj: "40", ocular: "10", fn: "20", sizeBy: "image", measured: "5", across: "5", lambda: "550", NA: "0" } },
  related: ["dna-tools", "optics"]
};

function magnification(input) {
  const obj = num(input, "obj", "آبجیکٹو میگنیفیکیشن", { positive: true });
  const ocular = num(input, "ocular", "آئی پیس میگنیفیکیشن", { positive: true });
  const fn = num(input, "fn", "فیلڈ نمبر", { positive: true });
  const M = obj * ocular;
  const fovMm = fn / obj;
  const fovUm = fovMm * 1000;
  return {
    results: [
      { label: "کل میگنیفیکیشن", value: `${fmt(M, 6)}×` },
      { label: "فیلڈ آف ویو کا قطر", value: `${fmt(fovMm, 4)} mm (${fmt(fovUm, 4)} µm)` }
    ],
    steps: [
      { text: "کل میگنیفیکیشن = آبجیکٹو میگنیفیکیشن × آئی پیس میگنیفیکیشن:", tex: `M = ${ntex(obj)} \\times ${ntex(ocular)} = ${ntex(M)}\\times` },
      { text: "فیلڈ آف ویو کا قطر = فیلڈ نمبر ÷ آبجیکٹو میگنیفیکیشن:", tex: `\\text{FOV} = \\frac{${ntex(fn)}\\ \\text{mm}}{${ntex(obj)}} = ${ntex(fovMm, 6)}\\ \\text{mm} = ${ntex(fovUm, 6)}\\ \\mu\\text{m}` }
    ],
    copy: `کل میگنیفیکیشن = ${fmt(M, 6)}× | فیلڈ آف ویو کا قطر = ${fmt(fovMm, 4)} mm (${fmt(fovUm, 4)} µm)`,
    blocks: []
  };
}

function size(input) {
  const obj = num(input, "obj", "آبجیکٹو میگنیفیکیشن", { positive: true });
  const ocular = num(input, "ocular", "آئی پیس میگنیفیکیشن", { positive: true });
  const by = choice(input, "sizeBy", "پیمائش کا طریقہ", ["image", "fov"], "image");
  if (by === "fov") {
    const fn = num(input, "fn", "فیلڈ نمبر", { positive: true });
    const across = num(input, "across", "فیلڈ میں خلیوں کی تعداد", { integer: true, positive: true });
    const fovUm = (fn / obj) * 1000;
    const d = fovUm / across;
    return {
      results: [
        { label: "فیلڈ آف ویو کا قطر", value: `${fmt(fovUm, 4)} µm` },
        { label: "ایک خلیے کا سائز", value: `${fmt(d, 4)} µm` }
      ],
      steps: [
        { text: "مائیکرومیٹر میں فیلڈ آف ویو کا قطر:", tex: `\\text{FOV} = \\frac{${ntex(fn)}}{${ntex(obj)}}\\ \\text{mm} = ${ntex(fovUm, 6)}\\ \\mu\\text{m}` },
        { text: "خلیے کا قطر = فیلڈ آف ویو ÷ اس میں خلیوں کی تعداد:", tex: `d = \\frac{${ntex(fovUm, 6)}}{${ntex(across)}} = ${ntex(d, 6)}\\ \\mu\\text{m}` }
      ],
      copy: `خلیے کا سائز = ${fmt(d, 4)} µm (فیلڈ آف ویو ${fmt(fovUm, 4)} µm، ${across} خلیے)`,
      blocks: []
    };
  }
  const measured = num(input, "measured", "ناپا گیا تصویر کا سائز", { positive: true });
  const M = obj * ocular;
  const dUm = (measured * 1000) / M;
  return {
    results: [
      { label: "کل میگنیفیکیشن", value: `${fmt(M, 6)}×` },
      { label: "جسم کا اصل سائز", value: `${fmt(dUm, 4)} µm` }
    ],
    steps: [
      { text: "اصل سائز = تصویر کا سائز ÷ کل میگنیفیکیشن:", tex: `d = \\frac{${ntex(measured)}\\ \\text{mm}}{${ntex(M)}} = ${ntex(measured / M, 6)}\\ \\text{mm} = ${ntex(dUm, 6)}\\ \\mu\\text{m}` }
    ],
    copy: `اصل سائز = ${fmt(dUm, 4)} µm، میگنیفیکیشن ${fmt(M, 6)}× پر`,
    blocks: []
  };
}

function resolution(input) {
  const lambda = num(input, "lambda", "ویو لینتھ", { positive: true });
  const NA = num(input, "NA", "آبجیکٹو کا نیومیریکل ایپرچر NA", { positive: true, max: 2 });
  const dR = (0.61 * lambda) / NA;
  const dA = lambda / (2 * NA);
  return {
    results: [
      { label: "ریزالونگ پاور (ریلے)", value: `${fmt(dR, 4)} nm` },
      { label: "ریزالونگ پاور (ایب)", value: `${fmt(dA, 4)} nm` }
    ],
    steps: [
      { text: "ریلے معیار:", tex: `d_R = 0.61 \\frac{\\lambda}{NA} = 0.61 \\times \\frac{${ntex(lambda)}}{${ntex(NA)}} = ${ntex(dR, 6)}\\ \\text{nm}` },
      { text: "ایب معیار:", tex: `d_A = \\frac{\\lambda}{2\\,NA} = \\frac{${ntex(lambda)}}{2 \\times ${ntex(NA)}} = ${ntex(dA, 6)}\\ \\text{nm}` }
    ],
    copy: `ریزالونگ پاور (ریلے) = ${fmt(dR, 4)} nm، (ایب) = ${fmt(dA, 4)} nm`,
    blocks: []
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "حساب کی قسم", ["magnification", "size", "resolution"], "magnification");
  if (mode === "size") return size(input);
  if (mode === "resolution") return resolution(input);
  return magnification(input);
}
