import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calculate the total magnification and field of view from the field number, the size of an object from its image or from the number of cells across the field of view, and the resolving power using the Rayleigh and Abbe criteria.",
  keywords: ["Microscope", "Magnification", "Field of view", "Field number", "field number", "Resolving power", "Rayleigh", "Abbe", "NA", "microscope"],
  formulas: [
    { label: "Total magnification", tex: "M = M_{\\text{objective}} \\times M_{\\text{eyepiece}}" },
    { label: "Field of view diameter", tex: "\\text{FOV} = \\frac{\\text{FN}}{M_{\\text{objective}}}" },
    { label: "Actual object size", tex: "d = \\frac{\\text{image size}}{M}" },
    { label: "Resolving power", tex: "d_R = \\frac{0.61\\,\\lambda}{NA},\\qquad d_A = \\frac{\\lambda}{2\\,NA}" }
  ],
  inputs: [
    {
      id: "mode", label: "Calculation type", type: "select", default: "magnification",
      options: [["magnification", "Magnification and field of view"], ["size", "Object size"], ["resolution", "Resolving power"]]
    },
    { id: "obj", label: "Objective magnification (objective)", unit: "×", type: "number", default: "40", when: { mode: ["magnification", "size"] } },
    { id: "ocular", label: "Eyepiece magnification (eyepiece)", unit: "×", type: "number", default: "10", when: { mode: ["magnification", "size"] } },
    { id: "fn", label: "Field Number", unit: "mm", type: "number", default: "20", when: { mode: ["magnification", "size"] }, help: "It is usually printed on the eyepiece. It is needed to calculate the field of view." },
    {
      id: "sizeBy", label: "Size measurement method", type: "select", default: "image",
      options: [["image", "From the measured image size"], ["fov", "From the number of cells across the field of view"]], when: { mode: ["size"] }
    },
    { id: "measured", label: "Measured image size", unit: "mm", type: "number", default: "5", when: { mode: ["size"], sizeBy: ["image"] } },
    { id: "across", label: "Number of cells across the field of view", type: "number", default: "5", when: { mode: ["size"], sizeBy: ["fov"] }, help: "Positive integer." },
    { id: "lambda", label: "Wavelength λ", unit: "nm", type: "number", default: "550", when: { mode: ["resolution"] } },
    { id: "NA", label: "Numerical aperture NA of the objective", type: "number", default: "1.25", when: { mode: ["resolution"] }, help: "Usually between 0.1 and 1.6." }
  ],
  example: { values: { mode: "magnification", obj: "40", ocular: "10", fn: "20", sizeBy: "image", measured: "5", across: "5", lambda: "550", NA: "1.25" }, expect: ["400×", "0.5 mm"], note: "Example: a 40× objective with a 10× eyepiece and a field number of 20 mm." },
  invalid: { values: { mode: "resolution", obj: "40", ocular: "10", fn: "20", sizeBy: "image", measured: "5", across: "5", lambda: "550", NA: "0" } },
  related: ["dna-tools", "optics"]
};

function magnification(input) {
  const obj = num(input, "obj", "Objective magnification", { positive: true });
  const ocular = num(input, "ocular", "Eyepiece magnification", { positive: true });
  const fn = num(input, "fn", "Field number", { positive: true });
  const M = obj * ocular;
  const fovMm = fn / obj;
  const fovUm = fovMm * 1000;
  return {
    results: [
      { label: "Total magnification", value: `${fmt(M, 6)}×` },
      { label: "Field of view diameter", value: `${fmt(fovMm, 4)} mm (${fmt(fovUm, 4)} µm)` }
    ],
    steps: [
      { text: "Total magnification = objective magnification × eyepiece magnification:", tex: `M = ${ntex(obj)} \\times ${ntex(ocular)} = ${ntex(M)}\\times` },
      { text: "Field of view diameter = field number ÷ objective magnification:", tex: `\\text{FOV} = \\frac{${ntex(fn)}\\ \\text{mm}}{${ntex(obj)}} = ${ntex(fovMm, 6)}\\ \\text{mm} = ${ntex(fovUm, 6)}\\ \\mu\\text{m}` }
    ],
    copy: `Total magnification = ${fmt(M, 6)}× | Field of view diameter = ${fmt(fovMm, 4)} mm (${fmt(fovUm, 4)} µm)`,
    blocks: []
  };
}

function size(input) {
  const obj = num(input, "obj", "Objective magnification", { positive: true });
  const ocular = num(input, "ocular", "Eyepiece magnification", { positive: true });
  const by = choice(input, "sizeBy", "Measurement method", ["image", "fov"], "image");
  if (by === "fov") {
    const fn = num(input, "fn", "Field number", { positive: true });
    const across = num(input, "across", "Cells across the field", { integer: true, positive: true });
    const fovUm = (fn / obj) * 1000;
    const d = fovUm / across;
    return {
      results: [
        { label: "Field of view diameter", value: `${fmt(fovUm, 4)} µm` },
        { label: "Size of one cell", value: `${fmt(d, 4)} µm` }
      ],
      steps: [
        { text: "Field of view diameter in micrometers:", tex: `\\text{FOV} = \\frac{${ntex(fn)}}{${ntex(obj)}}\\ \\text{mm} = ${ntex(fovUm, 6)}\\ \\mu\\text{m}` },
        { text: "Cell diameter = field of view ÷ number of cells across it:", tex: `d = \\frac{${ntex(fovUm, 6)}}{${ntex(across)}} = ${ntex(d, 6)}\\ \\mu\\text{m}` }
      ],
      copy: `Cell size = ${fmt(d, 4)} µm (field of view ${fmt(fovUm, 4)} µm across ${across} cells)`,
      blocks: []
    };
  }
  const measured = num(input, "measured", "Measured image size", { positive: true });
  const M = obj * ocular;
  const dUm = (measured * 1000) / M;
  return {
    results: [
      { label: "Total magnification", value: `${fmt(M, 6)}×` },
      { label: "Actual object size", value: `${fmt(dUm, 4)} µm` }
    ],
    steps: [
      { text: "Actual size = image size ÷ total magnification:", tex: `d = \\frac{${ntex(measured)}\\ \\text{mm}}{${ntex(M)}} = ${ntex(measured / M, 6)}\\ \\text{mm} = ${ntex(dUm, 6)}\\ \\mu\\text{m}` }
    ],
    copy: `Actual size = ${fmt(dUm, 4)} µm at magnification ${fmt(M, 6)}×`,
    blocks: []
  };
}

function resolution(input) {
  const lambda = num(input, "lambda", "Wavelength", { positive: true });
  const NA = num(input, "NA", "Numerical aperture NA of the objective", { positive: true, max: 2 });
  const dR = (0.61 * lambda) / NA;
  const dA = lambda / (2 * NA);
  return {
    results: [
      { label: "Resolving power (Rayleigh)", value: `${fmt(dR, 4)} nm` },
      { label: "Resolving power (Abbe)", value: `${fmt(dA, 4)} nm` }
    ],
    steps: [
      { text: "Rayleigh criterion:", tex: `d_R = 0.61 \\frac{\\lambda}{NA} = 0.61 \\times \\frac{${ntex(lambda)}}{${ntex(NA)}} = ${ntex(dR, 6)}\\ \\text{nm}` },
      { text: "Abbe criterion:", tex: `d_A = \\frac{\\lambda}{2\\,NA} = \\frac{${ntex(lambda)}}{2 \\times ${ntex(NA)}} = ${ntex(dA, 6)}\\ \\text{nm}` }
    ],
    copy: `Resolving power (Rayleigh) = ${fmt(dR, 4)} nm, (Abbe) = ${fmt(dA, 4)} nm`,
    blocks: []
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Calculation type", ["magnification", "size", "resolution"], "magnification");
  if (mode === "size") return size(input);
  if (mode === "resolution") return resolution(input);
  return magnification(input);
}
