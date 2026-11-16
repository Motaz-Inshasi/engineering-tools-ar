import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const CFG = [["quarter", "Quart de pont (une jauge)"], ["half", "Demi-pont (deux jauges : traction et compression)"], ["full", "Pont complet (quatre jauges)"]];

export const meta = {
  description: "Jauge de contrainte dans un pont de Wheatstone : tension de sortie pour un quart de pont, un demi-pont et un pont complet à partir de la déformation et du facteur de jauge, ou déformation à partir de la tension de sortie, avec la variation de résistance et le gain d'amplificateur nécessaire.",
  keywords: ["Jauge de contrainte", "strain gauge", "déformation", "pont", "gauge factor", "Facteur de jauge", "microdéformation", "Cellule de charge"],
  formulas: [
    { label: "Variation de résistance", tex: "\\frac{\\Delta R}{R} = GF \\cdot \\varepsilon" },
    { label: "Sortie", tex: "\\text{quarter: } V_o = V_{ex}\\frac{GF\\varepsilon}{4}\\cdot\\frac{1}{1 + GF\\varepsilon/2},\\quad \\text{half: } \\frac{V_{ex}GF\\varepsilon}{2},\\quad \\text{full: } V_{ex}GF\\varepsilon" }
  ],
  inputs: [
    { id: "cfg", label: "Montage", type: "select", default: "quarter", options: CFG },
    { id: "dir", label: "Grandeur demandée", type: "select", default: "e2v", options: [["e2v", "Tension de sortie à partir de la déformation"], ["v2e", "Déformation à partir de la tension de sortie"]] },
    { id: "strain", label: "Déformation", unit: "µε", type: "number", default: "1000", when: { dir: ["e2v"] } },
    { id: "Vo", label: "Tension de sortie", unit: "V", type: "number", default: "5m", when: { dir: ["v2e"] } },
    { id: "GF", label: "Facteur de jauge GF", type: "number", default: "2" },
    { id: "Vex", label: "Tension d'excitation Vex", unit: "V", type: "number", default: "10" },
    { id: "R", label: "Résistance de la jauge", unit: "Ω", type: "number", default: "350" },
    { id: "Vadc", label: "Plage de l'ADC souhaitée pour la pleine sortie (facultatif)", unit: "V", type: "number", default: "3.3" }
  ],
  example: { values: { cfg: "quarter", dir: "e2v", strain: "1000", GF: "2", Vex: "10", R: "350", Vadc: "3.3" }, expect: ["Vo = 4.995 mV"], note: "Exemple : déformation de 1000 µε avec une jauge, GF = 2 et une alimentation de 10 V." },
  invalid: { values: { cfg: "quarter", dir: "e2v", strain: "1000", GF: "0", Vex: "10", R: "350" } },
  related: ["wheatstone-bridge", "op-amp", "adc", "rtd"]
};

export function output(cfg, Vex, GF, e) {
  const x = GF * e;
  if (cfg === "quarter") return (Vex * x) / 4 / (1 + x / 2);
  if (cfg === "half") return (Vex * x) / 2;
  return Vex * x;
}

export function strainFrom(cfg, Vex, GF, Vo) {
  const r = Vo / Vex;
  if (cfg === "quarter") return (4 * r) / (GF * (1 - 2 * r));
  if (cfg === "half") return (2 * r) / GF;
  return r / GF;
}

export function solve(input) {
  const cfg = choice(input, "cfg", "Montage", CFG.map((c) => c[0]), "quarter");
  const dir = choice(input, "dir", "Grandeur demandée", ["e2v", "v2e"], "e2v");
  const GF = num(input, "GF", "Facteur de jauge", { positive: true });
  const Vex = num(input, "Vex", "Tension d'alimentation", { positive: true });
  const R = num(input, "R", "Résistance de la jauge", { positive: true });
  const Vadc = num(input, "Vadc", "Plage de l'ADC", { optional: true, positive: true });
  let e, Vo;
  const steps = [];
  if (dir === "e2v") {
    e = num(input, "strain", "Déformation", { min: -1e5, max: 1e5 }) * 1e-6;
    Vo = output(cfg, Vex, GF, e);
  } else {
    Vo = num(input, "Vo", "Tension de sortie");
    e = strainFrom(cfg, Vex, GF, Vo);
  }
  const dR = R * GF * e;
  steps.push({ text: "Variation de la résistance de la jauge :", tex: `\\Delta R = R \\cdot GF \\cdot \\varepsilon = ${ntex(R)} \\times ${ntex(GF)} \\times ${ntex(e, 5)} = ${ntex(dR, 5)}\\ \\Omega` });
  if (cfg === "quarter") steps.push({ text: "Dans le quart de pont, un seul bras est actif, et la relation est légèrement non linéaire :", tex: `V_o = ${ntex(Vex)}\\frac{GF\\varepsilon/4}{1 + GF\\varepsilon/2} = ${ntex(Vo, 5)}\\ V` });
  else if (cfg === "half") steps.push({ text: "Dans le demi-pont, une jauge en traction et une autre en compression sur deux bras adjacents : la sensibilité double et la non-linéarité disparaît :", tex: `V_o = \\frac{V_{ex} GF \\varepsilon}{2} = ${ntex(Vo, 5)}\\ V` });
  else steps.push({ text: "Dans le pont complet, quatre jauges sont actives : la sensibilité est quatre fois celle du quart de pont :", tex: `V_o = V_{ex} GF \\varepsilon = ${ntex(Vo, 5)}\\ V` });
  if (dir === "v2e") steps.push({ text: "On inverse la relation pour trouver la déformation :", tex: `\\varepsilon = ${ntex(e * 1e6, 5)}\\ \\mu\\varepsilon` });
  steps.push("Le pont complet et le demi-pont compensent aussi automatiquement les variations de température, ce qui explique leur usage répandu dans les cellules de charge.");
  const results = [
    { label: "Tension de sortie", value: eng(Vo, "V", 4), text: `Vo = ${eng(Vo, "V", 4)}` },
    { label: "Déformation", value: `${fmt(e * 1e6, 5)} µε` },
    { label: "Variation de résistance", value: eng(dR, "Ω", 4) },
    { label: "Sensibilité", value: `${fmt((Vo / Vex) * 1000, 4)} mV/V` }
  ];
  if (Vadc !== null && Vo !== 0) {
    const G = Vadc / Math.abs(Vo);
    results.push({ label: "Gain de l'amplificateur pour remplir la plage de l'ADC", value: fmt(G, 4) });
    steps.push(`Pour amplifier cette sortie jusqu'à ${fmt(Vadc)} V, il faut un amplificateur (généralement un amplificateur d'instrumentation) de gain ${fmt(G, 4)}.`);
  }
  return { results, steps, copy: `Vo = ${eng(Vo, "V", 4)}, ε = ${fmt(e * 1e6, 5)} µε, ΔR = ${eng(dR, "Ω", 4)}` };
}
