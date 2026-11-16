import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const DEG = Math.PI / 180;

export const meta = {
  description: "Calcule la position et le grandissement de l'image, sa nature, son orientation et la vergence de la lentille à partir de l'équation des lentilles et des miroirs, ou l'angle de réfraction de la lumière avec la loi de Snell, l'angle critique et la réflexion totale interne.",
  keywords: ["lentille", "miroir", "distance focale", "équation des lentilles", "grandissement", "vergence de la lentille", "dioptrie", "loi de Snell", "réfraction", "réflexion totale", "lens", "mirror", "snell"],
  formulas: [
    { label: "Équation des lentilles et des miroirs", tex: "\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i},\\qquad m = -\\frac{d_i}{d_o},\\qquad P = \\frac{1}{f}" },
    { label: "loi de Snell", tex: "n_1\\sin\\theta_1 = n_2\\sin\\theta_2,\\qquad \\theta_c = \\sin^{-1}\\frac{n_2}{n_1}" }
  ],
  inputs: [
    { id: "mode", label: "Type de problème", type: "select", default: "lens", options: [["lens", "Lentilles et miroirs"], ["snell", "Réfraction de la lumière (Snell)"]] },
    { id: "ot", label: "Type d'élément", type: "select", default: "lens", options: [["lens", "lentille"], ["mirror", "miroir"]], when: { mode: ["lens"] }, help: "f positif : lentille convergente ou miroir concave. f négatif : lentille divergente ou miroir convexe." },
    { id: "f", label: "Distance focale f", unit: "m", type: "number", default: "0.1", when: { mode: ["lens"] }, help: "Saisissez f négatif pour une lentille divergente ou un miroir convexe." },
    { id: "do", label: "Distance de l'objet do", unit: "m", type: "number", default: "0.3", when: { mode: ["lens"] } },
    { id: "n1", label: "Indice de réfraction n1", type: "number", default: "1", when: { mode: ["snell"] }, help: "Air ≈ 1, eau ≈ 1.33, verre ≈ 1.5." },
    { id: "th1", label: "Angle d'incidence θ1", unit: "°", type: "number", default: "30", when: { mode: ["snell"] }, help: "Mesuré par rapport à la normale à la surface." },
    { id: "n2", label: "Indice de réfraction n2", type: "number", default: "1.5", when: { mode: ["snell"] } }
  ],
  example: {
    values: { mode: "snell", ot: "lens", f: "0.1", do: "0.3", n1: "1", th1: "30", n2: "1.5" },
    expect: ["θ2 = 19.47°"],
    note: "Exemple : lumière passant de l'air dans le verre avec un angle d'incidence de 30°."
  },
  invalid: { values: { mode: "lens", ot: "lens", f: "0", do: "0.3", n1: "1", th1: "30", n2: "1.5" } },
  related: ["waves-doppler", "harmonic-motion", "unit-converter", "formulas-constants"]
};

function lens(input) {
  const ot = choice(input, "ot", "Type d'élément", ["lens", "mirror"], "lens");
  const f = num(input, "f", "Distance focale f", { nonZero: true });
  const d = num(input, "do", "Distance de l'objet do", { positive: true });
  const el = ot === "lens" ? "La lentille" : "Le miroir";
  const power = 1 / f;
  const steps = [{ text: "Équation des lentilles et des miroirs :", tex: "\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i}" }];
  const results = [];
  const blocks = [];
  let copy;
  if (Math.abs(d - f) <= 1e-12 * Math.abs(f)) {
    steps.push({ text: "Lorsque l'objet est à la distance focale, l'image se forme à l'infini :", tex: "\\frac{1}{d_i} = \\frac{1}{f} - \\frac{1}{d_o} = 0" });
    results.push({ label: `Distance de l'image par rapport à ${el} di`, value: "à l'infini" });
    blocks.push({ type: "note", tone: "warn", text: "L'objet est exactement au foyer, donc les rayons émergents sont parallèles et ne se croisent pas : il n'existe pas d'image de position finie." });
    copy = `Image à l'infini (objet au foyer)`;
  } else {
    const di = f * d / (d - f);
    const m = -di / d;
    const type = di > 0 ? "réelle" : "virtuelle";
    const dir = m > 0 ? "droite" : "renversée";
    const size = Math.abs(m) > 1 ? "agrandie" : Math.abs(m) < 1 ? "réduite" : "de même taille";
    steps.push(
      { text: "Distance de l'image :", tex: `d_i = \\frac{f\\,d_o}{d_o - f} = \\frac{${ntex(f)} \\times ${ntex(d)}}{${ntex(d)} - ${ntex(f)}} = ${ntex(di, 6)}\\ m` },
      { text: "Grandissement :", tex: `m = -\\frac{d_i}{d_o} = ${ntex(m, 6)}` }
    );
    results.push(
      { label: `Distance de l'image par rapport à ${el} di`, value: `${fmt(di, 4)} m` },
      { label: "Nature de l'image", value: type },
      { label: "Orientation de l'image", value: dir },
      { label: "Taille de l'image", value: size },
      { label: "Grandissement m", value: fmt(m, 4) }
    );
    copy = `di = ${fmt(di, 4)} m, m = ${fmt(m, 4)} (${type}، ${dir}، ${size})`;
  }
  steps.push({ text: "Vergence de la lentille en dioptries :", tex: `P = \\frac{1}{f} = ${ntex(power, 6)}\\ D` });
  results.push({ label: "Vergence P = 1/f", value: `${fmt(power, 4)} D` });
  return { results, steps, blocks, copy: `${copy}, P = ${fmt(power, 4)} D` };
}

function snell(input) {
  const n1 = num(input, "n1", "Indice de réfraction n1", { positive: true });
  const th1 = num(input, "th1", "Angle d'incidence θ1", { nonNegative: true, below: 90 });
  const n2 = num(input, "n2", "Indice de réfraction n2", { positive: true });
  const s = n1 * Math.sin(th1 * DEG) / n2;
  const steps = [{ text: "Loi de Snell :", tex: "n_1\\sin\\theta_1 = n_2\\sin\\theta_2" }];
  const results = [];
  const blocks = [];
  const crit = n1 > n2 ? Math.asin(n2 / n1) / DEG : null;
  results.push({ label: "Angle critique θc", value: crit === null ? "Aucun (n1 ≤ n2)" : `${fmt(crit, 4)}°` });
  let copy;
  if (s > 1) {
    steps.push({ text: "sin θ2 est supérieur à 1, donc il n'existe pas d'angle de réfraction :", tex: `\\sin\\theta_2 = \\frac{${ntex(n1)}\\sin ${ntex(th1)}^\\circ}{${ntex(n2)}} = ${ntex(s, 6)} > 1` });
    results.push({ label: "Angle de réfraction θ2", value: "Aucun (réflexion totale interne)" });
    blocks.push({ type: "note", tone: "warn", text: "Réflexion totale interne : la lumière ne sort pas dans le second milieu, elle est entièrement réfléchie dans le milieu le plus dense." });
    copy = `Réflexion totale interne pour θ1 = ${fmt(th1, 4)}°`;
  } else {
    const th2 = Math.asin(s) / DEG;
    steps.push({ text: "Angle de réfraction :", tex: `\\sin\\theta_2 = ${ntex(s, 6)},\\quad \\theta_2 = ${ntex(th2, 6)}^\\circ` });
    results.push({ label: "Angle de réfraction θ2", value: `${fmt(th2, 4)}°` });
    copy = `θ2 = ${fmt(th2, 4)}°`;
  }
  if (crit !== null) {
    steps.push({ text: "Angle critique (car n1 > n2) :", tex: `\\theta_c = \\sin^{-1}\\frac{${ntex(n2)}}{${ntex(n1)}} = ${ntex(crit, 6)}^\\circ` });
    copy += `, θc = ${fmt(crit, 4)}°`;
  }
  return { results, steps, blocks, copy };
}

export function solve(input) {
  const mode = choice(input, "mode", "Type de problème", ["lens", "snell"], "lens");
  return mode === "snell" ? snell(input) : lens(input);
}
