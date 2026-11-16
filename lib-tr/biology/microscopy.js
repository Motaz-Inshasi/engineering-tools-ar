import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Mikroskobun toplam büyütmesini ve görüş alanını alan numarasından; cismin boyutunu görüntüsünden ya da görüş alanı boyunca hücre sayısından; ayırma gücünü Rayleigh ve Abbe ölçütlerine göre hesaplayın.",
  keywords: ["mikroskop", "büyütme", "görüş alanı", "alan numarası", "field number", "ayırma gücü", "Rayleigh", "Abbe", "NA", "microscope"],
  formulas: [
    { label: "Toplam büyütme", tex: "M = M_{\\text{objective}} \\times M_{\\text{eyepiece}}" },
    { label: "Görüş alanı çapı", tex: "\\text{FOV} = \\frac{\\text{FN}}{M_{\\text{objective}}}" },
    { label: "Cismin gerçek boyutu", tex: "d = \\frac{\\text{görüntü boyutu}}{M}" },
    { label: "ayırma gücü", tex: "d_R = \\frac{0.61\\,\\lambda}{NA},\\qquad d_A = \\frac{\\lambda}{2\\,NA}" }
  ],
  inputs: [
    {
      id: "mode", label: "Hesaplama türü", type: "select", default: "magnification",
      options: [["magnification", "Büyütme ve görüş alanı"], ["size", "Cisim boyutu"], ["resolution", "ayırma gücü"]]
    },
    { id: "obj", label: "Objektif büyütmesi (objective)", unit: "×", type: "number", default: "40", when: { mode: ["magnification", "size"] } },
    { id: "ocular", label: "Oküler büyütmesi (eyepiece)", unit: "×", type: "number", default: "10", when: { mode: ["magnification", "size"] } },
    { id: "fn", label: "Alan numarası (Field Number)", unit: "mm", type: "number", default: "20", when: { mode: ["magnification", "size"] }, help: "Genellikle okülere basılıdır. Görüş alanını hesaplamak için gereklidir." },
    {
      id: "sizeBy", label: "Boyut ölçüm yöntemi", type: "select", default: "image",
      options: [["image", "Ölçülen görüntü boyutundan"], ["fov", "Görüş alanı boyunca hücre sayısından"]], when: { mode: ["size"] }
    },
    { id: "measured", label: "Ölçülen görüntü boyutu", unit: "mm", type: "number", default: "5", when: { mode: ["size"], sizeBy: ["image"] } },
    { id: "across", label: "Görüş alanı boyunca hücre sayısı", type: "number", default: "5", when: { mode: ["size"], sizeBy: ["fov"] }, help: "Pozitif tam sayı." },
    { id: "lambda", label: "Dalga boyu λ", unit: "nm", type: "number", default: "550", when: { mode: ["resolution"] } },
    { id: "NA", label: "Objektifin sayısal açıklığı NA", type: "number", default: "1.25", when: { mode: ["resolution"] }, help: "Genellikle 0.1 ile 1.6 arasında." }
  ],
  example: { values: { mode: "magnification", obj: "40", ocular: "10", fn: "20", sizeBy: "image", measured: "5", across: "5", lambda: "550", NA: "1.25" }, expect: ["400×", "0.5 mm"], note: "Örnek: 40× objektif, 10× okülér ve alan numarası 20 mm." },
  invalid: { values: { mode: "resolution", obj: "40", ocular: "10", fn: "20", sizeBy: "image", measured: "5", across: "5", lambda: "550", NA: "0" } },
  related: ["dna-tools", "optics"]
};

function magnification(input) {
  const obj = num(input, "obj", "Objektif büyütmesi", { positive: true });
  const ocular = num(input, "ocular", "Oküler büyütmesi", { positive: true });
  const fn = num(input, "fn", "alan numarası", { positive: true });
  const M = obj * ocular;
  const fovMm = fn / obj;
  const fovUm = fovMm * 1000;
  return {
    results: [
      { label: "Toplam büyütme", value: `${fmt(M, 6)}×` },
      { label: "Görüş alanı çapı", value: `${fmt(fovMm, 4)} mm (${fmt(fovUm, 4)} µm)` }
    ],
    steps: [
      { text: "Toplam büyütme = objektif büyütmesi × okülér büyütmesi:", tex: `M = ${ntex(obj)} \\times ${ntex(ocular)} = ${ntex(M)}\\times` },
      { text: "Görüş alanı çapı = alan numarası ÷ objektif büyütmesi:", tex: `\\text{FOV} = \\frac{${ntex(fn)}\\ \\text{mm}}{${ntex(obj)}} = ${ntex(fovMm, 6)}\\ \\text{mm} = ${ntex(fovUm, 6)}\\ \\mu\\text{m}` }
    ],
    copy: `Toplam büyütme = ${fmt(M, 6)}× | görüş alanı çapı = ${fmt(fovMm, 4)} mm (${fmt(fovUm, 4)} µm)`,
    blocks: []
  };
}

function size(input) {
  const obj = num(input, "obj", "Objektif büyütmesi", { positive: true });
  const ocular = num(input, "ocular", "Oküler büyütmesi", { positive: true });
  const by = choice(input, "sizeBy", "Ölçüm yöntemi", ["image", "fov"], "image");
  if (by === "fov") {
    const fn = num(input, "fn", "alan numarası", { positive: true });
    const across = num(input, "across", "Görüş alanındaki hücre sayısı", { integer: true, positive: true });
    const fovUm = (fn / obj) * 1000;
    const d = fovUm / across;
    return {
      results: [
        { label: "Görüş alanı çapı", value: `${fmt(fovUm, 4)} µm` },
        { label: "Tek bir hücrenin boyutu", value: `${fmt(d, 4)} µm` }
      ],
      steps: [
        { text: "Görüş alanı çapı mikrometre cinsinden:", tex: `\\text{FOV} = \\frac{${ntex(fn)}}{${ntex(obj)}}\\ \\text{mm} = ${ntex(fovUm, 6)}\\ \\mu\\text{m}` },
        { text: "Hücre çapı = görüş alanı ÷ içinden geçen hücre sayısı:", tex: `d = \\frac{${ntex(fovUm, 6)}}{${ntex(across)}} = ${ntex(d, 6)}\\ \\mu\\text{m}` }
      ],
      copy: `Hücre boyutu = ${fmt(d, 4)} µm (görüş alanı ${fmt(fovUm, 4)} µm, ${across} hücre üzerinden)`,
      blocks: []
    };
  }
  const measured = num(input, "measured", "Ölçülen görüntü boyutu", { positive: true });
  const M = obj * ocular;
  const dUm = (measured * 1000) / M;
  return {
    results: [
      { label: "Toplam büyütme", value: `${fmt(M, 6)}×` },
      { label: "Cismin gerçek boyutu", value: `${fmt(dUm, 4)} µm` }
    ],
    steps: [
      { text: "Gerçek boyut = görüntü boyutu ÷ toplam büyütme:", tex: `d = \\frac{${ntex(measured)}\\ \\text{mm}}{${ntex(M)}} = ${ntex(measured / M, 6)}\\ \\text{mm} = ${ntex(dUm, 6)}\\ \\mu\\text{m}` }
    ],
    copy: `Gerçek boyut = ${fmt(dUm, 4)} µm, büyütme ${fmt(M, 6)}×`,
    blocks: []
  };
}

function resolution(input) {
  const lambda = num(input, "lambda", "Dalga boyu", { positive: true });
  const NA = num(input, "NA", "Objektifin sayısal açıklığı", { positive: true, max: 2 });
  const dR = (0.61 * lambda) / NA;
  const dA = lambda / (2 * NA);
  return {
    results: [
      { label: "Ayırma gücü (Rayleigh)", value: `${fmt(dR, 4)} nm` },
      { label: "Ayırma gücü (Abbe)", value: `${fmt(dA, 4)} nm` }
    ],
    steps: [
      { text: "Rayleigh ölçütü:", tex: `d_R = 0.61 \\frac{\\lambda}{NA} = 0.61 \\times \\frac{${ntex(lambda)}}{${ntex(NA)}} = ${ntex(dR, 6)}\\ \\text{nm}` },
      { text: "Abbe ölçütü:", tex: `d_A = \\frac{\\lambda}{2\\,NA} = \\frac{${ntex(lambda)}}{2 \\times ${ntex(NA)}} = ${ntex(dA, 6)}\\ \\text{nm}` }
    ],
    copy: `Ayırma gücü (Rayleigh) = ${fmt(dR, 4)} nm, (Abbe) = ${fmt(dA, 4)} nm`,
    blocks: []
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Hesaplama türü", ["magnification", "size", "resolution"], "magnification");
  if (mode === "size") return size(input);
  if (mode === "resolution") return resolution(input);
  return magnification(input);
}
