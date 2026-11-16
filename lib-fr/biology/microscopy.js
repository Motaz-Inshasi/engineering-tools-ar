import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calculez le grossissement total du microscope et le champ de vision à partir du nombre de champ, la taille d'un objet à partir de son image ou du nombre de cellules dans le champ de vision, et le pouvoir de résolution selon les critères de Rayleigh et d'Abbe.",
  keywords: ["Microscope", "Grossissement", "Champ de vision", "Nombre de champ", "field number", "Pouvoir de résolution", "Rayleigh", "Abbe", "NA", "microscope"],
  formulas: [
    { label: "Grossissement total", tex: "M = M_{\\text{objective}} \\times M_{\\text{eyepiece}}" },
    { label: "Diamètre du champ de vision", tex: "\\text{FOV} = \\frac{\\text{FN}}{M_{\\text{objective}}}" },
    { label: "Taille réelle de l'objet", tex: "d = \\frac{\\text{taille de l'image}}{M}" },
    { label: "Pouvoir de résolution", tex: "d_R = \\frac{0.61\\,\\lambda}{NA},\\qquad d_A = \\frac{\\lambda}{2\\,NA}" }
  ],
  inputs: [
    {
      id: "mode", label: "Type de calcul", type: "select", default: "magnification",
      options: [["magnification", "Grossissement et champ de vision"], ["size", "Taille de l'objet"], ["resolution", "Pouvoir de résolution"]]
    },
    { id: "obj", label: "Grossissement de l'objectif (objective)", unit: "×", type: "number", default: "40", when: { mode: ["magnification", "size"] } },
    { id: "ocular", label: "Grossissement de l'oculaire (eyepiece)", unit: "×", type: "number", default: "10", when: { mode: ["magnification", "size"] } },
    { id: "fn", label: "Nombre de champ (Field Number)", unit: "mm", type: "number", default: "20", when: { mode: ["magnification", "size"] }, help: "Il est généralement gravé sur l'oculaire. Il est nécessaire pour calculer le champ de vision." },
    {
      id: "sizeBy", label: "Méthode de mesure de la taille", type: "select", default: "image",
      options: [["image", "À partir de la taille mesurée de l'image"], ["fov", "À partir du nombre de cellules dans le champ de vision"]], when: { mode: ["size"] }
    },
    { id: "measured", label: "Taille mesurée de l'image", unit: "mm", type: "number", default: "5", when: { mode: ["size"], sizeBy: ["image"] } },
    { id: "across", label: "Nombre de cellules dans le champ de vision", type: "number", default: "5", when: { mode: ["size"], sizeBy: ["fov"] }, help: "Entier positif." },
    { id: "lambda", label: "Longueur d'onde λ", unit: "nm", type: "number", default: "550", when: { mode: ["resolution"] } },
    { id: "NA", label: "Ouverture numérique NA", type: "number", default: "1.25", when: { mode: ["resolution"] }, help: "En général entre 0.1 et 1.6." }
  ],
  example: { values: { mode: "magnification", obj: "40", ocular: "10", fn: "20", sizeBy: "image", measured: "5", across: "5", lambda: "550", NA: "1.25" }, expect: ["400×", "0.5 mm"], note: "Exemple : objectif 40×, oculaire 10× et nombre de champ 20 mm." },
  invalid: { values: { mode: "resolution", obj: "40", ocular: "10", fn: "20", sizeBy: "image", measured: "5", across: "5", lambda: "550", NA: "0" } },
  related: ["dna-tools", "optics"]
};

function magnification(input) {
  const obj = num(input, "obj", "Grossissement de l'objectif", { positive: true });
  const ocular = num(input, "ocular", "Grossissement de l'oculaire", { positive: true });
  const fn = num(input, "fn", "Nombre de champ", { positive: true });
  const M = obj * ocular;
  const fovMm = fn / obj;
  const fovUm = fovMm * 1000;
  return {
    results: [
      { label: "Grossissement total", value: `${fmt(M, 6)}×` },
      { label: "Diamètre du champ de vision", value: `${fmt(fovMm, 4)} mm (${fmt(fovUm, 4)} µm)` }
    ],
    steps: [
      { text: "Grossissement total = grossissement de l'objectif × grossissement de l'oculaire :", tex: `M = ${ntex(obj)} \\times ${ntex(ocular)} = ${ntex(M)}\\times` },
      { text: "Diamètre du champ de vision = nombre de champ ÷ grossissement de l'objectif :", tex: `\\text{FOV} = \\frac{${ntex(fn)}\\ \\text{mm}}{${ntex(obj)}} = ${ntex(fovMm, 6)}\\ \\text{mm} = ${ntex(fovUm, 6)}\\ \\mu\\text{m}` }
    ],
    copy: `Grossissement total = ${fmt(M, 6)}× | Diamètre du champ de vision = ${fmt(fovMm, 4)} mm (${fmt(fovUm, 4)} µm)`,
    blocks: []
  };
}

function size(input) {
  const obj = num(input, "obj", "Grossissement de l'objectif", { positive: true });
  const ocular = num(input, "ocular", "Grossissement de l'oculaire", { positive: true });
  const by = choice(input, "sizeBy", "Méthode de mesure", ["image", "fov"], "image");
  if (by === "fov") {
    const fn = num(input, "fn", "Nombre de champ", { positive: true });
    const across = num(input, "across", "Nombre de cellules dans le champ", { integer: true, positive: true });
    const fovUm = (fn / obj) * 1000;
    const d = fovUm / across;
    return {
      results: [
        { label: "Diamètre du champ de vision", value: `${fmt(fovUm, 4)} µm` },
        { label: "Taille d'une cellule", value: `${fmt(d, 4)} µm` }
      ],
      steps: [
        { text: "Diamètre du champ de vision en micromètres :", tex: `\\text{FOV} = \\frac{${ntex(fn)}}{${ntex(obj)}}\\ \\text{mm} = ${ntex(fovUm, 6)}\\ \\mu\\text{m}` },
        { text: "Diamètre de la cellule = champ de vision ÷ nombre de cellules qu'il contient :", tex: `d = \\frac{${ntex(fovUm, 6)}}{${ntex(across)}} = ${ntex(d, 6)}\\ \\mu\\text{m}` }
      ],
      copy: `Taille de la cellule = ${fmt(d, 4)} µm (champ de vision ${fmt(fovUm, 4)} µm sur ${across} cellules)`,
      blocks: []
    };
  }
  const measured = num(input, "measured", "Taille mesurée de l'image", { positive: true });
  const M = obj * ocular;
  const dUm = (measured * 1000) / M;
  return {
    results: [
      { label: "Grossissement total", value: `${fmt(M, 6)}×` },
      { label: "Taille réelle de l'objet", value: `${fmt(dUm, 4)} µm` }
    ],
    steps: [
      { text: "Taille réelle = taille de l'image ÷ grossissement total :", tex: `d = \\frac{${ntex(measured)}\\ \\text{mm}}{${ntex(M)}} = ${ntex(measured / M, 6)}\\ \\text{mm} = ${ntex(dUm, 6)}\\ \\mu\\text{m}` }
    ],
    copy: `Taille réelle = ${fmt(dUm, 4)} µm pour un grossissement de ${fmt(M, 6)}×`,
    blocks: []
  };
}

function resolution(input) {
  const lambda = num(input, "lambda", "Longueur d'onde", { positive: true });
  const NA = num(input, "NA", "Ouverture numérique", { positive: true, max: 2 });
  const dR = (0.61 * lambda) / NA;
  const dA = lambda / (2 * NA);
  return {
    results: [
      { label: "Pouvoir de résolution (Rayleigh)", value: `${fmt(dR, 4)} nm` },
      { label: "Pouvoir de résolution (Abbe)", value: `${fmt(dA, 4)} nm` }
    ],
    steps: [
      { text: "Critère de Rayleigh :", tex: `d_R = 0.61 \\frac{\\lambda}{NA} = 0.61 \\times \\frac{${ntex(lambda)}}{${ntex(NA)}} = ${ntex(dR, 6)}\\ \\text{nm}` },
      { text: "Critère d'Abbe :", tex: `d_A = \\frac{\\lambda}{2\\,NA} = \\frac{${ntex(lambda)}}{2 \\times ${ntex(NA)}} = ${ntex(dA, 6)}\\ \\text{nm}` }
    ],
    copy: `Pouvoir de résolution (Rayleigh) = ${fmt(dR, 4)} nm, (Abbe) = ${fmt(dA, 4)} nm`,
    blocks: []
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Type de calcul", ["magnification", "size", "resolution"], "magnification");
  if (mode === "size") return size(input);
  if (mode === "resolution") return resolution(input);
  return magnification(input);
}
