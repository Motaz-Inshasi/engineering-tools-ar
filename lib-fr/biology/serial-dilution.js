import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const HEMO_VOLUME_FACTOR = 1e4;

function sci(x, sig = 4) {
  if (x === 0) return "0";
  const [m, e] = x.toExponential(sig - 1).split("e");
  return `${m.includes(".") ? m.replace(/\.?0+$/, "") : m} × 10^${Number(e)}`;
}

function dilText(x) {
  return Number.isInteger(x) && x < 1e15 ? String(x) : fmt(x, 4);
}

export const meta = {
  description: "Calculez les concentrations d'une dilution en série et le volume de diluant à chaque étape, ou le nombre d'unités formant colonies (UFC/mL) à partir des colonies comptées, ou le nombre de cellules/mL avec une cellule de comptage (hémocytomètre).",
  keywords: ["Dilution en série", "serial dilution", "CFU", "Unités formant colonies", "Comptage des cellules", "hemocytometer", "Bleu de trypan", "Concentration"],
  formulas: [
    { label: "Dilution à l'étape k", tex: "D_k = f^{k},\\qquad C_k = \\frac{C_0}{f^{k}}" },
    { label: "Unités formant colonies", tex: "\\text{CFU/mL} = \\frac{\\text{colonies}}{V \\times d}" },
    { label: "Cellule de comptage", tex: "\\text{cellules/mL} = \\frac{\\text{nombre de cellules}}{\\text{nombre de carrés}} \\times D \\times 10^4" }
  ],
  inputs: [
    {
      id: "mode", label: "Méthode de calcul", type: "select", default: "series",
      options: [["series", "Dilution en série"], ["cfu", "Comptage des colonies (CFU/mL)"], ["hemocytometer", "Comptage des cellules avec une cellule de comptage"]]
    },
    { id: "c0", label: "Concentration initiale C0", type: "number", default: "1000", when: { mode: ["series"] }, help: "Dans l'unité de votre choix, par exemple CFU/mL ou cellules/mL." },
    { id: "factor", label: "Facteur de dilution à chaque étape f", type: "number", default: "10", when: { mode: ["series"] }, help: "Par exemple 10 ou 2." },
    { id: "nsteps", label: "Nombre d'étapes de dilution", type: "number", default: "6", when: { mode: ["series"] }, help: "Entier de 1 à 15." },
    { id: "vt", label: "Volume transféré d'un tube à l'autre", unit: "mL", type: "number", default: "1", when: { mode: ["series"] } },
    { id: "colonies", label: "Nombre de colonies comptées", type: "number", default: "150", when: { mode: ["cfu"] } },
    { id: "vplate", label: "Volume de suspension étalé", unit: "mL", type: "number", default: "0.1", when: { mode: ["cfu"] } },
    { id: "dcfu", label: "Facteur de dilution de la boîte comptée", type: "number", default: "1e-6", when: { mode: ["cfu"] }, help: "Saisissez 1e-6 ou 1000000 ; une valeur supérieure à 1 est traitée comme l'inverse d'une dilution." },
    { id: "cells", label: "Nombre de cellules comptées dans la cellule de comptage", type: "number", default: "200", when: { mode: ["hemocytometer"] } },
    { id: "squares", label: "Nombre de grands carrés comptés", type: "number", default: "4", when: { mode: ["hemocytometer"] } },
    { id: "dhemo", label: "Facteur de dilution", type: "number", default: "2", when: { mode: ["hemocytometer"] }, help: "Par exemple 2 si les cellules sont mélangées au bleu de trypan dans un rapport 1:1." }
  ],
  example: { values: { mode: "cfu", c0: "1000", factor: "10", nsteps: "6", vt: "1", colonies: "150", vplate: "0.1", dcfu: "1e-6", cells: "200", squares: "4", dhemo: "2" }, expect: ["1.5 × 10^9 CFU/mL"], note: "Exemple : 150 colonies à partir de 0.1 mL d'une dilution 10^-6." },
  invalid: { values: { mode: "cfu", c0: "1000", factor: "10", nsteps: "6", vt: "1", colonies: "-5", vplate: "0.1", dcfu: "1e-6", cells: "200", squares: "4", dhemo: "2" } },
  related: ["solutions", "population-growth", "lab-units"]
};

function seriesMode(input) {
  const c0 = num(input, "c0", "Concentration initiale C0", { positive: true });
  const f = num(input, "factor", "Facteur de dilution", { positive: true });
  if (f <= 1) fail("Le facteur de dilution doit être supérieur à 1.", "factor");
  const n = num(input, "nsteps", "Nombre d'étapes", { integer: true, min: 1, max: 15 });
  const vt = num(input, "vt", "Volume de transfert", { positive: true });
  const perTube = vt * (f - 1);
  const cn = c0 / Math.pow(f, n);
  const rows = [["Original", "1:1", fmt(c0, 6), "—"]];
  for (let k = 1; k <= n; k++) rows.push([String(k), `1:${dilText(Math.pow(f, k))}`, fmt(c0 / Math.pow(f, k), 4), fmt(perTube, 4)]);
  return {
    results: [
      { label: "Concentration finale", value: fmt(cn, 4) },
      { label: "Dilution totale", value: `1:${dilText(Math.pow(f, n))}` },
      { label: "Volume total de diluant ajouté (mL)", value: fmt(n * perTube, 4) }
    ],
    steps: [
      { text: "Dilution au dernier tube :", tex: `D_n = f^n = ${ntex(f)}^{${n}} = ${ntex(Math.pow(f, n))}` },
      { text: "Concentration finale :", tex: `C_n = \\frac{C_0}{f^n} = \\frac{${ntex(c0)}}{${ntex(Math.pow(f, n))}} = ${ntex(cn, 6)}` },
      { text: "Volume de diluant ajouté dans chaque tube :", tex: `V_d = V_t (f-1) = ${ntex(vt)} \\times ${ntex(f - 1)} = ${ntex(perTube)}\\ \\text{mL}` }
    ],
    copy: `Concentration après ${n} étapes = ${fmt(cn, 4)} (dilution 1:${dilText(Math.pow(f, n))})`,
    blocks: [{ type: "table", caption: "Tableau des tubes", head: ["Tube", "Dilution", "Concentration", "Diluant ajouté (mL)"], rows, ltr: true }]
  };
}

function cfuMode(input) {
  const colonies = num(input, "colonies", "Nombre de colonies", { integer: true, nonNegative: true });
  const V = num(input, "vplate", "Volume de suspension étalé", { positive: true });
  const d0 = num(input, "dcfu", "Facteur de dilution", { positive: true });
  const d = d0 > 1 ? 1 / d0 : d0;
  const cfu = colonies / (V * d);
  const inRange = colonies >= 30 && colonies <= 300;
  const blocks = [];
  if (!inRange) blocks.push({ type: "note", tone: "warn", text: "Le nombre de colonies est hors de la plage acceptable de 30 à 300 ; le résultat est donc approximatif et moins précis." });
  return {
    results: [
      { label: "Unités formant colonies", value: `${sci(cfu)} CFU/mL` },
      { label: "Facteur de dilution utilisé", value: dilText(d) },
      { label: "Plage de comptage", value: inRange ? "Dans la plage de 30 à 300" : "Hors de la plage de 30 à 300" }
    ],
    steps: [
      d0 > 1 ? { text: "La valeur saisie est supérieure à 1 ; elle est traitée comme l'inverse d'une dilution :", tex: `d = \\frac{1}{${ntex(d0)}} = ${ntex(d)}` } : { text: "Facteur de dilution utilisé :", tex: `d = ${ntex(d)}` },
      { text: "Unités formant colonies par mL :", tex: `\\frac{${colonies}}{${ntex(V)} \\times ${ntex(d)}} = ${ntex(cfu, 6)}\\ \\text{CFU/mL}` }
    ],
    copy: `${sci(cfu)} CFU/mL`,
    blocks
  };
}

function hemoMode(input) {
  const cells = num(input, "cells", "Nombre de cellules comptées", { integer: true, nonNegative: true });
  const squares = num(input, "squares", "Nombre de carrés", { integer: true, positive: true });
  const D = num(input, "dhemo", "Facteur de dilution", { positive: true });
  if (D < 1) fail("Le facteur de dilution doit être égal à 1 ou supérieur.", "dhemo");
  const avg = cells / squares;
  const cpm = avg * D * HEMO_VOLUME_FACTOR;
  return {
    results: [
      { label: "Nombre de cellules par mL", value: `${sci(cpm)} cellules/mL` },
      { label: "Moyenne de cellules dans un petit carré", value: fmt(avg, 4) }
    ],
    steps: [
      { text: "Moyenne de cellules dans un grand carré :", tex: `\\frac{${cells}}{${squares}} = ${ntex(avg, 6)}` },
      { text: "Conversion en cellules par mL avec la dilution et le volume d'un carré (10^4 mL) :", tex: `${ntex(avg, 6)} \\times ${ntex(D)} \\times 10^4 = ${ntex(cpm, 6)}\\ \\text{cells/mL}` }
    ],
    copy: `${sci(cpm)} cellules/mL`,
    blocks: [{ type: "note", text: "Le volume d'un grand carré de la cellule de comptage (1 mm × 1 mm × 0.1 mm) est de 0.1 µL = 10^-4 mL ; la moyenne est donc multipliée par 10^4 pour obtenir des cellules par mL." }]
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Méthode de calcul", ["series", "cfu", "hemocytometer"], "series");
  if (mode === "cfu") return cfuMode(input);
  if (mode === "hemocytometer") return hemoMode(input);
  return seriesMode(input);
}
