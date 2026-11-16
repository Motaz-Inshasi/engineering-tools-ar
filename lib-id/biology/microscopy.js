import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Hitung perbesaran total mikroskop dan bidang pandang dari nomor bidang, ukuran objek dari citranya atau dari jumlah sel yang melintasi bidang pandang, serta daya pisah dengan kriteria Rayleigh dan kriteria Abbe.",
  keywords: ["Mikroskop", "Perbesaran", "Bidang pandang", "Nomor bidang", "field number", "Daya pisah", "Rayleigh", "Abbe", "NA", "microscope"],
  formulas: [
    { label: "Perbesaran total", tex: "M = M_{\\text{objective}} \\times M_{\\text{eyepiece}}" },
    { label: "Diameter bidang pandang", tex: "\\text{FOV} = \\frac{\\text{FN}}{M_{\\text{objective}}}" },
    { label: "Ukuran objek sebenarnya", tex: "d = \\frac{\\text{ukuran citra}}{M}" },
    { label: "Daya pisah", tex: "d_R = \\frac{0.61\\,\\lambda}{NA},\\qquad d_A = \\frac{\\lambda}{2\\,NA}" }
  ],
  inputs: [
    {
      id: "mode", label: "Jenis perhitungan", type: "select", default: "magnification",
      options: [["magnification", "Perbesaran dan bidang pandang"], ["size", "Ukuran objek"], ["resolution", "Daya pisah"]]
    },
    { id: "obj", label: "Perbesaran objektif (objective)", unit: "×", type: "number", default: "40", when: { mode: ["magnification", "size"] } },
    { id: "ocular", label: "Perbesaran okuler (eyepiece)", unit: "×", type: "number", default: "10", when: { mode: ["magnification", "size"] } },
    { id: "fn", label: "Nomor bidang (Field Number)", unit: "mm", type: "number", default: "20", when: { mode: ["magnification", "size"] }, help: "Biasanya tercetak pada okuler. Diperlukan untuk menghitung bidang pandang." },
    {
      id: "sizeBy", label: "Cara mengukur ukuran", type: "select", default: "image",
      options: [["image", "Dari ukuran citra yang diukur"], ["fov", "Dari jumlah sel yang melintasi bidang pandang"]], when: { mode: ["size"] }
    },
    { id: "measured", label: "Ukuran citra yang diukur", unit: "mm", type: "number", default: "5", when: { mode: ["size"], sizeBy: ["image"] } },
    { id: "across", label: "Jumlah sel yang melintasi bidang pandang", type: "number", default: "5", when: { mode: ["size"], sizeBy: ["fov"] }, help: "Bilangan bulat positif." },
    { id: "lambda", label: "Panjang gelombang λ", unit: "nm", type: "number", default: "550", when: { mode: ["resolution"] } },
    { id: "NA", label: "Apertur numerik NA objektif", type: "number", default: "1.25", when: { mode: ["resolution"] }, help: "Biasanya antara 0.1 dan 1.6." }
  ],
  example: { values: { mode: "magnification", obj: "40", ocular: "10", fn: "20", sizeBy: "image", measured: "5", across: "5", lambda: "550", NA: "1.25" }, expect: ["400×", "0.5 mm"], note: "Contoh: objektif 40× dengan okuler 10× dan nomor bidang 20 mm." },
  invalid: { values: { mode: "resolution", obj: "40", ocular: "10", fn: "20", sizeBy: "image", measured: "5", across: "5", lambda: "550", NA: "0" } },
  related: ["dna-tools", "optics"]
};

function magnification(input) {
  const obj = num(input, "obj", "Perbesaran objektif", { positive: true });
  const ocular = num(input, "ocular", "Perbesaran okuler", { positive: true });
  const fn = num(input, "fn", "Nomor bidang", { positive: true });
  const M = obj * ocular;
  const fovMm = fn / obj;
  const fovUm = fovMm * 1000;
  return {
    results: [
      { label: "Perbesaran total", value: `${fmt(M, 6)}×` },
      { label: "Diameter bidang pandang", value: `${fmt(fovMm, 4)} mm (${fmt(fovUm, 4)} µm)` }
    ],
    steps: [
      { text: "Perbesaran total = perbesaran objektif × perbesaran okuler:", tex: `M = ${ntex(obj)} \\times ${ntex(ocular)} = ${ntex(M)}\\times` },
      { text: "Diameter bidang pandang = nomor bidang ÷ perbesaran objektif:", tex: `\\text{FOV} = \\frac{${ntex(fn)}\\ \\text{mm}}{${ntex(obj)}} = ${ntex(fovMm, 6)}\\ \\text{mm} = ${ntex(fovUm, 6)}\\ \\mu\\text{m}` }
    ],
    copy: `Perbesaran total = ${fmt(M, 6)}× | Diameter bidang pandang = ${fmt(fovMm, 4)} mm (${fmt(fovUm, 4)} µm)`,
    blocks: []
  };
}

function size(input) {
  const obj = num(input, "obj", "Perbesaran objektif", { positive: true });
  const ocular = num(input, "ocular", "Perbesaran okuler", { positive: true });
  const by = choice(input, "sizeBy", "Cara pengukuran", ["image", "fov"], "image");
  if (by === "fov") {
    const fn = num(input, "fn", "Nomor bidang", { positive: true });
    const across = num(input, "across", "Jumlah sel melintasi bidang", { integer: true, positive: true });
    const fovUm = (fn / obj) * 1000;
    const d = fovUm / across;
    return {
      results: [
        { label: "Diameter bidang pandang", value: `${fmt(fovUm, 4)} µm` },
        { label: "Ukuran satu sel", value: `${fmt(d, 4)} µm` }
      ],
      steps: [
        { text: "Diameter bidang pandang dalam mikrometer:", tex: `\\text{FOV} = \\frac{${ntex(fn)}}{${ntex(obj)}}\\ \\text{mm} = ${ntex(fovUm, 6)}\\ \\mu\\text{m}` },
        { text: "Diameter sel = bidang pandang ÷ jumlah sel yang melintasinya:", tex: `d = \\frac{${ntex(fovUm, 6)}}{${ntex(across)}} = ${ntex(d, 6)}\\ \\mu\\text{m}` }
      ],
      copy: `Ukuran sel = ${fmt(d, 4)} µm (bidang pandang ${fmt(fovUm, 4)} µm dengan ${across} sel)`,
      blocks: []
    };
  }
  const measured = num(input, "measured", "Ukuran citra yang diukur", { positive: true });
  const M = obj * ocular;
  const dUm = (measured * 1000) / M;
  return {
    results: [
      { label: "Perbesaran total", value: `${fmt(M, 6)}×` },
      { label: "Ukuran objek sebenarnya", value: `${fmt(dUm, 4)} µm` }
    ],
    steps: [
      { text: "Ukuran sebenarnya = ukuran citra ÷ perbesaran total:", tex: `d = \\frac{${ntex(measured)}\\ \\text{mm}}{${ntex(M)}} = ${ntex(measured / M, 6)}\\ \\text{mm} = ${ntex(dUm, 6)}\\ \\mu\\text{m}` }
    ],
    copy: `Ukuran sebenarnya = ${fmt(dUm, 4)} µm pada perbesaran ${fmt(M, 6)}×`,
    blocks: []
  };
}

function resolution(input) {
  const lambda = num(input, "lambda", "Panjang gelombang", { positive: true });
  const NA = num(input, "NA", "Apertur numerik NA objektif", { positive: true, max: 2 });
  const dR = (0.61 * lambda) / NA;
  const dA = lambda / (2 * NA);
  return {
    results: [
      { label: "Daya pisah (Rayleigh)", value: `${fmt(dR, 4)} nm` },
      { label: "Daya pisah (Abbe)", value: `${fmt(dA, 4)} nm` }
    ],
    steps: [
      { text: "Kriteria Rayleigh:", tex: `d_R = 0.61 \\frac{\\lambda}{NA} = 0.61 \\times \\frac{${ntex(lambda)}}{${ntex(NA)}} = ${ntex(dR, 6)}\\ \\text{nm}` },
      { text: "Kriteria Abbe:", tex: `d_A = \\frac{\\lambda}{2\\,NA} = \\frac{${ntex(lambda)}}{2 \\times ${ntex(NA)}} = ${ntex(dA, 6)}\\ \\text{nm}` }
    ],
    copy: `Daya pisah (Rayleigh) = ${fmt(dR, 4)} nm, (Abbe) = ${fmt(dA, 4)} nm`,
    blocks: []
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Jenis perhitungan", ["magnification", "size", "resolution"], "magnification");
  if (mode === "size") return size(input);
  if (mode === "resolution") return resolution(input);
  return magnification(input);
}
