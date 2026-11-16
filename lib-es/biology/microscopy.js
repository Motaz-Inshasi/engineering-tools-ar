import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calcule el aumento total del microscopio y el campo de visión a partir del número de campo, el tamaño de un objeto a partir de su imagen o del número de células a lo largo del campo de visión, y el poder de resolución según los criterios de Rayleigh y de Abbe.",
  keywords: ["Microscopio", "Aumento", "Campo de visión", "Número de campo", "field number", "Poder de resolución", "Rayleigh", "Abbe", "NA", "microscope"],
  formulas: [
    { label: "Aumento total", tex: "M = M_{\\text{objective}} \\times M_{\\text{eyepiece}}" },
    { label: "Diámetro del campo de visión", tex: "\\text{FOV} = \\frac{\\text{FN}}{M_{\\text{objective}}}" },
    { label: "Tamaño real del objeto", tex: "d = \\frac{\\text{tamaño de la imagen}}{M}" },
    { label: "Poder de resolución", tex: "d_R = \\frac{0.61\\,\\lambda}{NA},\\qquad d_A = \\frac{\\lambda}{2\\,NA}" }
  ],
  inputs: [
    {
      id: "mode", label: "Tipo de cálculo", type: "select", default: "magnification",
      options: [["magnification", "Aumento y campo de visión"], ["size", "Tamaño del objeto"], ["resolution", "Poder de resolución"]]
    },
    { id: "obj", label: "Aumento del objetivo (objective)", unit: "×", type: "number", default: "40", when: { mode: ["magnification", "size"] } },
    { id: "ocular", label: "Aumento del ocular (eyepiece)", unit: "×", type: "number", default: "10", when: { mode: ["magnification", "size"] } },
    { id: "fn", label: "Número de campo (Field Number)", unit: "mm", type: "number", default: "20", when: { mode: ["magnification", "size"] }, help: "Suele estar impreso en el ocular. Es necesario para calcular el campo de visión." },
    {
      id: "sizeBy", label: "Método de medición del tamaño", type: "select", default: "image",
      options: [["image", "A partir del tamaño medido de la imagen"], ["fov", "A partir del número de células a lo largo del campo de visión"]], when: { mode: ["size"] }
    },
    { id: "measured", label: "Tamaño medido de la imagen", unit: "mm", type: "number", default: "5", when: { mode: ["size"], sizeBy: ["image"] } },
    { id: "across", label: "Número de células a lo largo del campo de visión", type: "number", default: "5", when: { mode: ["size"], sizeBy: ["fov"] }, help: "Número entero positivo." },
    { id: "lambda", label: "Longitud de onda λ", unit: "nm", type: "number", default: "550", when: { mode: ["resolution"] } },
    { id: "NA", label: "Apertura numérica NA", type: "number", default: "1.25", when: { mode: ["resolution"] }, help: "Normalmente entre 0.1 y 1.6." }
  ],
  example: { values: { mode: "magnification", obj: "40", ocular: "10", fn: "20", sizeBy: "image", measured: "5", across: "5", lambda: "550", NA: "1.25" }, expect: ["400×", "0.5 mm"], note: "Ejemplo: objetivo 40× con ocular 10× y número de campo de 20 mm." },
  invalid: { values: { mode: "resolution", obj: "40", ocular: "10", fn: "20", sizeBy: "image", measured: "5", across: "5", lambda: "550", NA: "0" } },
  related: ["dna-tools", "optics"]
};

function magnification(input) {
  const obj = num(input, "obj", "Aumento del objetivo", { positive: true });
  const ocular = num(input, "ocular", "Aumento del ocular", { positive: true });
  const fn = num(input, "fn", "Número de campo", { positive: true });
  const M = obj * ocular;
  const fovMm = fn / obj;
  const fovUm = fovMm * 1000;
  return {
    results: [
      { label: "Aumento total", value: `${fmt(M, 6)}×` },
      { label: "Diámetro del campo de visión", value: `${fmt(fovMm, 4)} mm (${fmt(fovUm, 4)} µm)` }
    ],
    steps: [
      { text: "Aumento total = aumento del objetivo × aumento del ocular:", tex: `M = ${ntex(obj)} \\times ${ntex(ocular)} = ${ntex(M)}\\times` },
      { text: "Diámetro del campo de visión = número de campo ÷ aumento del objetivo:", tex: `\\text{FOV} = \\frac{${ntex(fn)}\\ \\text{mm}}{${ntex(obj)}} = ${ntex(fovMm, 6)}\\ \\text{mm} = ${ntex(fovUm, 6)}\\ \\mu\\text{m}` }
    ],
    copy: `Aumento total = ${fmt(M, 6)}× | Diámetro del campo de visión = ${fmt(fovMm, 4)} mm (${fmt(fovUm, 4)} µm)`,
    blocks: []
  };
}

function size(input) {
  const obj = num(input, "obj", "Aumento del objetivo", { positive: true });
  const ocular = num(input, "ocular", "Aumento del ocular", { positive: true });
  const by = choice(input, "sizeBy", "Método de medición", ["image", "fov"], "image");
  if (by === "fov") {
    const fn = num(input, "fn", "Número de campo", { positive: true });
    const across = num(input, "across", "Número de células a lo largo del campo", { integer: true, positive: true });
    const fovUm = (fn / obj) * 1000;
    const d = fovUm / across;
    return {
      results: [
        { label: "Diámetro del campo de visión", value: `${fmt(fovUm, 4)} µm` },
        { label: "Tamaño de una célula", value: `${fmt(d, 4)} µm` }
      ],
      steps: [
        { text: "Diámetro del campo de visión en micrómetros:", tex: `\\text{FOV} = \\frac{${ntex(fn)}}{${ntex(obj)}}\\ \\text{mm} = ${ntex(fovUm, 6)}\\ \\mu\\text{m}` },
        { text: "Diámetro de la célula = campo de visión ÷ número de células a lo largo de él:", tex: `d = \\frac{${ntex(fovUm, 6)}}{${ntex(across)}} = ${ntex(d, 6)}\\ \\mu\\text{m}` }
      ],
      copy: `Tamaño de la célula = ${fmt(d, 4)} µm (campo de visión ${fmt(fovUm, 4)} µm entre ${across} células)`,
      blocks: []
    };
  }
  const measured = num(input, "measured", "Tamaño medido de la imagen", { positive: true });
  const M = obj * ocular;
  const dUm = (measured * 1000) / M;
  return {
    results: [
      { label: "Aumento total", value: `${fmt(M, 6)}×` },
      { label: "Tamaño real del objeto", value: `${fmt(dUm, 4)} µm` }
    ],
    steps: [
      { text: "Tamaño real = tamaño de la imagen ÷ aumento total:", tex: `d = \\frac{${ntex(measured)}\\ \\text{mm}}{${ntex(M)}} = ${ntex(measured / M, 6)}\\ \\text{mm} = ${ntex(dUm, 6)}\\ \\mu\\text{m}` }
    ],
    copy: `Tamaño real = ${fmt(dUm, 4)} µm con un aumento de ${fmt(M, 6)}×`,
    blocks: []
  };
}

function resolution(input) {
  const lambda = num(input, "lambda", "Longitud de onda", { positive: true });
  const NA = num(input, "NA", "Apertura numérica", { positive: true, max: 2 });
  const dR = (0.61 * lambda) / NA;
  const dA = lambda / (2 * NA);
  return {
    results: [
      { label: "Poder de resolución (Rayleigh)", value: `${fmt(dR, 4)} nm` },
      { label: "Poder de resolución (Abbe)", value: `${fmt(dA, 4)} nm` }
    ],
    steps: [
      { text: "Criterio de Rayleigh:", tex: `d_R = 0.61 \\frac{\\lambda}{NA} = 0.61 \\times \\frac{${ntex(lambda)}}{${ntex(NA)}} = ${ntex(dR, 6)}\\ \\text{nm}` },
      { text: "Criterio de Abbe:", tex: `d_A = \\frac{\\lambda}{2\\,NA} = \\frac{${ntex(lambda)}}{2 \\times ${ntex(NA)}} = ${ntex(dA, 6)}\\ \\text{nm}` }
    ],
    copy: `Poder de resolución (Rayleigh) = ${fmt(dR, 4)} nm, (Abbe) = ${fmt(dA, 4)} nm`,
    blocks: []
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Tipo de cálculo", ["magnification", "size", "resolution"], "magnification");
  if (mode === "size") return size(input);
  if (mode === "resolution") return resolution(input);
  return magnification(input);
}
