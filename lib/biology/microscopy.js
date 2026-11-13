import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "احسب التكبير الكلي للمجهر ومجال الرؤية من رقم المجال، وحجم الجسم من صورته أو من عدد الخلايا عبر مجال الرؤية، وقدرة التفريق بمعيار Rayleigh ومعيار Abbe.",
  keywords: ["مجهر", "تكبير", "مجال الرؤية", "رقم المجال", "field number", "قدرة التفريق", "Rayleigh", "Abbe", "NA", "microscope"],
  formulas: [
    { label: "التكبير الكلي", tex: "M = M_{\\text{objective}} \\times M_{\\text{eyepiece}}" },
    { label: "قطر مجال الرؤية", tex: "\\text{FOV} = \\frac{\\text{FN}}{M_{\\text{objective}}}" },
    { label: "حجم الجسم الفعلي", tex: "d = \\frac{\\text{حجم الصورة}}{M}" },
    { label: "قدرة التفريق", tex: "d_R = \\frac{0.61\\,\\lambda}{NA},\\qquad d_A = \\frac{\\lambda}{2\\,NA}" }
  ],
  inputs: [
    {
      id: "mode", label: "نوع الحساب", type: "select", default: "magnification",
      options: [["magnification", "التكبير ومجال الرؤية"], ["size", "حجم الجسم"], ["resolution", "قدرة التفريق"]]
    },
    { id: "obj", label: "تكبير الهدف (objective)", unit: "×", type: "number", default: "40", when: { mode: ["magnification", "size"] } },
    { id: "ocular", label: "تكبير العدسة العينية (eyepiece)", unit: "×", type: "number", default: "10", when: { mode: ["magnification", "size"] } },
    { id: "fn", label: "رقم المجال (Field Number)", unit: "mm", type: "number", default: "20", when: { mode: ["magnification", "size"] }, help: "يُطبع عادةً على العدسة العينية. يلزم لحساب مجال الرؤية." },
    {
      id: "sizeBy", label: "طريقة قياس الحجم", type: "select", default: "image",
      options: [["image", "من حجم الصورة المقاس"], ["fov", "من عدد الخلايا عبر مجال الرؤية"]], when: { mode: ["size"] }
    },
    { id: "measured", label: "حجم الصورة المقاس", unit: "mm", type: "number", default: "5", when: { mode: ["size"], sizeBy: ["image"] } },
    { id: "across", label: "عدد الخلايا عبر مجال الرؤية", type: "number", default: "5", when: { mode: ["size"], sizeBy: ["fov"] }, help: "عدد صحيح موجب." },
    { id: "lambda", label: "الطول الموجي λ", unit: "nm", type: "number", default: "550", when: { mode: ["resolution"] } },
    { id: "NA", label: "فتحة العدسة العددية NA", type: "number", default: "1.25", when: { mode: ["resolution"] }, help: "عادةً بين 0.1 و1.6." }
  ],
  example: { values: { mode: "magnification", obj: "40", ocular: "10", fn: "20", sizeBy: "image", measured: "5", across: "5", lambda: "550", NA: "1.25" }, expect: ["400×", "0.5 mm"], note: "مثال: هدف 40× مع عينية 10× ورقم مجال 20 mm." },
  invalid: { values: { mode: "resolution", obj: "40", ocular: "10", fn: "20", sizeBy: "image", measured: "5", across: "5", lambda: "550", NA: "0" } },
  related: ["dna-tools", "optics"]
};

function magnification(input) {
  const obj = num(input, "obj", "تكبير الهدف", { positive: true });
  const ocular = num(input, "ocular", "تكبير العينية", { positive: true });
  const fn = num(input, "fn", "رقم المجال", { positive: true });
  const M = obj * ocular;
  const fovMm = fn / obj;
  const fovUm = fovMm * 1000;
  return {
    results: [
      { label: "التكبير الكلي", value: `${fmt(M, 6)}×` },
      { label: "قطر مجال الرؤية", value: `${fmt(fovMm, 4)} mm (${fmt(fovUm, 4)} µm)` }
    ],
    steps: [
      { text: "التكبير الكلي = تكبير الهدف × تكبير العينية:", tex: `M = ${ntex(obj)} \\times ${ntex(ocular)} = ${ntex(M)}\\times` },
      { text: "قطر مجال الرؤية = رقم المجال ÷ تكبير الهدف:", tex: `\\text{FOV} = \\frac{${ntex(fn)}\\ \\text{mm}}{${ntex(obj)}} = ${ntex(fovMm, 6)}\\ \\text{mm} = ${ntex(fovUm, 6)}\\ \\mu\\text{m}` }
    ],
    copy: `التكبير الكلي = ${fmt(M, 6)}× | قطر مجال الرؤية = ${fmt(fovMm, 4)} mm (${fmt(fovUm, 4)} µm)`,
    blocks: []
  };
}

function size(input) {
  const obj = num(input, "obj", "تكبير الهدف", { positive: true });
  const ocular = num(input, "ocular", "تكبير العينية", { positive: true });
  const by = choice(input, "sizeBy", "طريقة القياس", ["image", "fov"], "image");
  if (by === "fov") {
    const fn = num(input, "fn", "رقم المجال", { positive: true });
    const across = num(input, "across", "عدد الخلايا عبر المجال", { integer: true, positive: true });
    const fovUm = (fn / obj) * 1000;
    const d = fovUm / across;
    return {
      results: [
        { label: "قطر مجال الرؤية", value: `${fmt(fovUm, 4)} µm` },
        { label: "حجم الخلية الواحدة", value: `${fmt(d, 4)} µm` }
      ],
      steps: [
        { text: "قطر مجال الرؤية بالميكرومتر:", tex: `\\text{FOV} = \\frac{${ntex(fn)}}{${ntex(obj)}}\\ \\text{mm} = ${ntex(fovUm, 6)}\\ \\mu\\text{m}` },
        { text: "قطر الخلية = مجال الرؤية ÷ عدد الخلايا عبره:", tex: `d = \\frac{${ntex(fovUm, 6)}}{${ntex(across)}} = ${ntex(d, 6)}\\ \\mu\\text{m}` }
      ],
      copy: `حجم الخلية = ${fmt(d, 4)} µm (مجال الرؤية ${fmt(fovUm, 4)} µm على ${across} خلايا)`,
      blocks: []
    };
  }
  const measured = num(input, "measured", "حجم الصورة المقاس", { positive: true });
  const M = obj * ocular;
  const dUm = (measured * 1000) / M;
  return {
    results: [
      { label: "التكبير الكلي", value: `${fmt(M, 6)}×` },
      { label: "الحجم الفعلي للجسم", value: `${fmt(dUm, 4)} µm` }
    ],
    steps: [
      { text: "الحجم الفعلي = حجم الصورة ÷ التكبير الكلي:", tex: `d = \\frac{${ntex(measured)}\\ \\text{mm}}{${ntex(M)}} = ${ntex(measured / M, 6)}\\ \\text{mm} = ${ntex(dUm, 6)}\\ \\mu\\text{m}` }
    ],
    copy: `الحجم الفعلي = ${fmt(dUm, 4)} µm عند تكبير ${fmt(M, 6)}×`,
    blocks: []
  };
}

function resolution(input) {
  const lambda = num(input, "lambda", "الطول الموجي", { positive: true });
  const NA = num(input, "NA", "فتحة العدسة العددية", { positive: true, max: 2 });
  const dR = (0.61 * lambda) / NA;
  const dA = lambda / (2 * NA);
  return {
    results: [
      { label: "قدرة التفريق (Rayleigh)", value: `${fmt(dR, 4)} nm` },
      { label: "قدرة التفريق (Abbe)", value: `${fmt(dA, 4)} nm` }
    ],
    steps: [
      { text: "معيار Rayleigh:", tex: `d_R = 0.61 \\frac{\\lambda}{NA} = 0.61 \\times \\frac{${ntex(lambda)}}{${ntex(NA)}} = ${ntex(dR, 6)}\\ \\text{nm}` },
      { text: "معيار Abbe:", tex: `d_A = \\frac{\\lambda}{2\\,NA} = \\frac{${ntex(lambda)}}{2 \\times ${ntex(NA)}} = ${ntex(dA, 6)}\\ \\text{nm}` }
    ],
    copy: `قدرة التفريق (Rayleigh) = ${fmt(dR, 4)} nm، (Abbe) = ${fmt(dA, 4)} nm`,
    blocks: []
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "نوع الحساب", ["magnification", "size", "resolution"], "magnification");
  if (mode === "size") return size(input);
  if (mode === "resolution") return resolution(input);
  return magnification(input);
}
