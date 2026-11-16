import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { MATERIALS } from "./data.js";

const IDS = MATERIALS.map((m) => m.id);
const MAT_OPTIONS = [...MATERIALS.map((m) => [m.id, m.ar]), ["custom", "Matériau personnalisé (saisie manuelle de E)"]];
const find = (id) => MATERIALS.find((m) => m.id === id);

const sci = (x) => {
  const [m, e] = x.toExponential(3).split("e");
  return `${m.replace(/\.?0+$/, "")}e${Number(e)}`;
};

export const meta = {
  description: "Calculez la contrainte σ, la déformation ε, l'allongement ΔL et le coefficient de sécurité à partir de la force, de la section, de la longueur et du matériau, ou calculez le module d'Young à partir de la mesure de l'allongement, avec alertes de limite élastique et de rupture.",
  keywords: ["Contrainte", "Déformation", "Module d'Young", "Allongement", "Coefficient de sécurité", "stress", "strain", "Young's modulus", "Hooke"],
  formulas: [
    { label: "Contrainte", tex: "\\sigma = \\frac{F}{A}" },
    { label: "Déformation et module d'Young", tex: "\\varepsilon = \\frac{\\sigma}{E} = \\frac{\\Delta L}{L},\\qquad \\Delta L = \\varepsilon L" },
    { label: "Coefficient de sécurité", tex: "SF = \\frac{\\sigma_y}{\\sigma}" }
  ],
  inputs: [
    { id: "mode", label: "Mode de calcul", type: "select", default: "axial", options: [["axial", "À partir de la force, de la section et du matériau"], ["measurement", "À partir de la mesure de l'allongement (pour calculer E)"]] },
    { id: "F", label: "Force F", unit: "N", type: "number", default: "10k", help: "Vous pouvez utiliser le préfixe k pour le kilonewton, par exemple 10k." },
    { id: "section", label: "Forme de la section", type: "select", default: "circle", options: [["circle", "Circulaire (diamètre d)"], ["rect", "Rectangulaire (b × h)"], ["custom", "Aire personnalisée A"]] },
    { id: "d", label: "Diamètre d", unit: "mm", type: "number", default: "10", when: { section: ["circle"] } },
    { id: "b", label: "Largeur b", unit: "mm", type: "number", default: "20", when: { section: ["rect"] } },
    { id: "h", label: "Hauteur h", unit: "mm", type: "number", default: "40", when: { section: ["rect"] } },
    { id: "Acust", label: "Aire de la section A", unit: "mm²", type: "number", default: "1000", when: { section: ["custom"] } },
    { id: "L", label: "Longueur initiale L", unit: "mm", type: "number", default: "1000" },
    { id: "dL", label: "Allongement mesuré ΔL", unit: "mm", type: "number", default: "0.6366", when: { mode: ["measurement"] } },
    { id: "mat", label: "Matériau", type: "select", default: "a36", options: MAT_OPTIONS, when: { mode: ["axial"] } },
    { id: "Ecust", label: "Module d'Young E (matériau personnalisé)", unit: "GPa", type: "number", default: "200", when: { mat: ["custom"] } },
    { id: "Ycust", label: "Limite élastique (facultatif)", unit: "MPa", type: "number", when: { mat: ["custom"] } },
    { id: "Ucust", label: "Résistance à la traction maximale (facultatif)", unit: "MPa", type: "number", when: { mat: ["custom"] } }
  ],
  example: {
    values: { mode: "axial", F: "10k", section: "circle", d: "10", b: "", h: "", Acust: "", L: "1000", dL: "", mat: "a36", Ecust: "", Ycust: "", Ucust: "" },
    expect: ["σ = 127.3 MPa", "ε = 6.366e-4", "ΔL = 0.6366 mm", "Coefficient de sécurité = 1.96"],
    note: "Exemple : barre d'acier A36 de diamètre 10 mm, soumise à 10 kN, de longueur 1000 mm."
  },
  invalid: { values: { mode: "axial", F: "10k", section: "circle", d: "0", b: "", h: "", Acust: "", L: "1000", dL: "", mat: "a36", Ecust: "", Ycust: "", Ucust: "" } },
  related: ["material-properties", "beam-deflection", "unit-converter", "inclined-plane", "work-energy"]
};

function sectionArea(input, section) {
  if (section === "circle") {
    const d = num(input, "d", "Diamètre d", { positive: true });
    const A = (Math.PI * d * d) / 4;
    return { A, tex:`A = \\frac{\\pi d^2}{4} = \\frac{\\pi \\cdot ${ntex(d, 6)}^2}{4} = ${ntex(A, 6)}\\ mm^2`, text: "Aire de la section circulaire :" };
  }
  if (section === "rect") {
    const b = num(input, "b", "Largeur b", { positive: true });
    const h = num(input, "h", "Hauteur h", { positive: true });
    const A = b * h;
    return { A, tex: `A = b h = ${ntex(b, 6)} \\times ${ntex(h, 6)} = ${ntex(A, 6)}\\ mm^2`, text: "Aire de la section rectangulaire :" };
  }
  const A = num(input, "Acust", "Aire de la section A", { positive: true });
  return { A, tex: `A = ${ntex(A, 6)}\\ mm^2`, text: "Aire de section donnée :" };
}

export function solve(input) {
  const mode = choice(input, "mode", "Mode de calcul", ["axial", "measurement"], "axial");
  const F = num(input, "F", "Force F", { positive: true });
  const section = choice(input, "section", "Forme de la section", ["circle", "rect", "custom"], "circle");
  const area = sectionArea(input, section);
  const A = area.A;
  const L = num(input, "L", "Longueur initiale L", { positive: true });
  const sigma = F / A;

  if (mode === "measurement") {
    const dL = num(input, "dL", "Allongement ΔL", { positive: true });
    const eps = dL / L;
    const Egpa = sigma / eps / 1000;
    const steps = [
      { text: area.text, tex: area.tex },
      { text: "Contrainte calculée :", tex: `\\sigma = \\frac{F}{A} = \\frac{${ntex(F, 6)}}{${ntex(A, 6)}} = ${ntex(sigma, 6)}\\ MPa` },
      { text: "Déformation à partir de l'allongement mesuré :", tex: `\\varepsilon = \\frac{\\Delta L}{L} = \\frac{${ntex(dL, 6)}}{${ntex(L, 6)}} = ${ntex(eps, 6)}` },
      { text: "Module d'Young mesuré :", tex: `E = \\frac{\\sigma}{\\varepsilon} = \\frac{${ntex(sigma, 6)}}{${ntex(eps, 6)}} = ${ntex(sigma / eps, 6)}\\ MPa = ${fmt(Egpa, 4)}\\ GPa` }
    ];
    return {
      results: [
        { label: "Aire A", value: `${fmt(A, 4)} mm²` },
        { label: "Contrainte σ", value: `${fmt(sigma, 4)} MPa` },
        { label: "Déformation ε", value: sci(eps) },
        { label: "Module d'Young mesuré E", value: `${fmt(Egpa, 4)} GPa` }
      ],
      steps,
      copy: `σ = ${fmt(sigma, 4)} MPa، ε = ${sci(eps)}، E = ${fmt(Egpa, 4)} GPa`
    };
  }

  const mat = choice(input, "mat", "Matériau", [...IDS, "custom"], "a36");
  let E, yieldV, utsV;
  if (mat === "custom") {
    E = num(input, "Ecust", "Module d'Young E", { positive: true });
    yieldV = num(input, "Ycust", "Limite élastique", { positive: true, optional: true });
    utsV = num(input, "Ucust", "Résistance à la traction maximale", { positive: true, optional: true });
  } else {
    const m = find(mat);
    E = m.E;
    yieldV = m.yield;
    utsV = m.uts;
  }
  const matName = mat === "custom" ? "Matériau personnalisé" : find(mat).ar;
  const eps = sigma / (E * 1000);
  const dL = eps * L;
  const SF = yieldV ? yieldV / sigma : null;
  const sfText = SF === null ? "Non applicable" : fmt(SF, 3);

  const blocks = [];
  if (yieldV && sigma > yieldV) blocks.push({ type: "note", tone: "warn", text: `Attention : la contrainte (${fmt(sigma, 4)} MPa) dépasse la limite élastique (${fmt(yieldV, 4)} MPa), une déformation permanente (plastique) se produit.` });
  if (utsV && sigma > utsV) blocks.push({ type: "note", tone: "warn", text: `Attention : la contrainte (${fmt(sigma, 4)} MPa) dépasse la résistance à la traction maximale (${fmt(utsV, 4)} MPa), il y a rupture.` });

  const steps = [
    { text: area.text, tex: area.tex },
    { text: "Contrainte axiale :", tex: `\\sigma = \\frac{F}{A} = \\frac{${ntex(F, 6)}}{${ntex(A, 6)}} = ${ntex(sigma, 6)}\\ MPa` },
    { text: `Déformation par la loi de Hooke (E pour ${matName} = ${fmt(E, 4)} GPa) :`, tex: `\\varepsilon = \\frac{\\sigma}{E} = \\frac{${ntex(sigma, 6)}}{${ntex(E * 1000, 6)}} = ${ntex(eps, 6)}` },
    { text: "Allongement total :", tex: `\\Delta L = \\varepsilon L = ${ntex(eps, 6)} \\times ${ntex(L, 6)} = ${ntex(dL, 6)}\\ mm` }
  ];
  if (SF !== null) steps.push({ text: "Coefficient de sécurité vis-à-vis de la limite élastique :", tex: `SF = \\frac{\\sigma_y}{\\sigma} = \\frac{${ntex(yieldV, 6)}}{${ntex(sigma, 6)}} = ${fmt(SF, 4)}` });

  const results = [
    { label: "Aire A", value: `${fmt(A, 4)} mm²` },
    { label: "Contrainte σ", value: `${fmt(sigma, 4)} MPa` },
    { label: "Déformation ε", value: sci(eps) },
    { label: "Allongement ΔL", value: `${fmt(dL, 4)} mm` },
    { label: "Module d'Young utilisé E", value: `${fmt(E, 4)} GPa` },
    { label: "Coefficient de sécurité", value: sfText }
  ];

  return {
    results,
    steps,
    blocks,
    copy: `σ = ${fmt(sigma, 4)} MPa, ε = ${sci(eps)}, ΔL = ${fmt(dL, 4)} mm, coefficient de sécurité = ${sfText}`
  };
}
