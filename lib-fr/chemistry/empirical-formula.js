import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { BY_SYMBOL, molarMass } from "./formula.js";

export const meta = {
  description: "Détermine la formule empirique (rapport le plus simple) à partir des pourcentages massiques ou des masses des éléments, puis la formule moléculaire si la masse molaire est connue, avec le tableau de division par le plus petit nombre de moles.",
  keywords: ["formule empirique", "formule moléculaire", "empirical formula", "molecular formula", "analyse élémentaire", "pourcentage", "rapport le plus simple"],
  formulas: [
    { label: "Moles de chaque élément puis rapport le plus simple", tex: "n_i = \\frac{m_i}{A_i},\\qquad r_i = \\frac{n_i}{\\min_j n_j}" },
    { label: "formule moléculaire", tex: "k = \\frac{M_{\\text{molecular}}}{M_{\\text{empirical}}}" }
  ],
  inputs: [
    { id: "data", label: "Éléments et leurs proportions ou masses", type: "textarea", default: "C 40.0\nH 6.71\nO 53.29", wide: true, help: "Une ligne par élément : le symbole puis le pourcentage ou la masse en grammes, par exemple C 40 ou Na: 2.3" },
    { id: "M", label: "Masse molaire du composé (facultatif)", unit: "g/mol", type: "number", default: "180" }
  ],
  example: { values: { data: "C 40.0\nH 6.71\nO 53.29", M: "180.16" }, expect: ["CH2O", "C6H12O6"], note: "Exemple : composé contenant C 40 %, H 6.71 % et O 53.29 %, de masse molaire 180.16 g/mol." },
  invalid: { values: { data: "C 40\nXx 60", M: "" } },
  related: ["molar-mass", "stoichiometry", "equation-balancer", "periodic-table"]
};

const ORDER = (els) => {
  const hasC = els.includes("C");
  return [...els].sort((a, b) => {
    if (hasC) {
      const r = (x) => (x === "C" ? 0 : x === "H" ? 1 : 2);
      if (r(a) !== r(b)) return r(a) - r(b);
    }
    return a.localeCompare(b);
  });
};

const write = (counts) => ORDER(Object.keys(counts)).map((el) => `${el}${counts[el] === 1 ? "" : counts[el]}`).join("");

export function solve(input) {
  const lines = str(input, "data", "Éléments").split(/\r?\n|[;؛,،]/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  lines.forEach((line, i) => {
    const m = line.match(/^([A-Za-z]{1,2})\s*[:=]?\s*(\S+?)\s*%?$/);
    if (!m) fail(`La ligne ${i + 1} n'est pas compréhensible. Écrivez-la par exemple : C 40`, "data");
    const sym = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    if (!BY_SYMBOL[sym]) fail(`«${m[1]}» n'est pas un symbole d'élément connu.`, "data");
    if (items.some((x) => x.sym === sym)) fail(`L'élément ${sym} est en double.`, "data");
    const v = parseNumber(m[2]);
    if (!(v > 0) || !isFinite(v)) fail(`La valeur de ${sym} doit être un nombre positif.`, "data");
    items.push({ sym, v });
  });
  if (items.length < 2) fail("Saisissez au moins deux éléments.", "data");
  for (const it of items) it.n = it.v / BY_SYMBOL[it.sym].mass;
  const min = Math.min(...items.map((x) => x.n));
  for (const it of items) it.r = it.n / min;
  let mult = 0, best = null;
  for (let k = 1; k <= 12; k++) {
    const err = Math.max(...items.map((x) => Math.abs(x.r * k - Math.round(x.r * k)) / Math.max(1, Math.round(x.r * k))));
    if (err < 0.04) { mult = k; break; }
    if (!best || err < best.err) best = { k, err };
  }
  const warn = !mult;
  if (!mult) mult = best.k;
  const counts = Object.fromEntries(items.map((x) => [x.sym, Math.round(x.r * mult)]));
  const emp = write(counts), Me = molarMass(counts);
  const total = items.reduce((a, x) => a + x.v, 0);
  const steps = [
    Math.abs(total - 100) < 1.5 ? "La somme est proche de 100 : on traite les valeurs comme des pourcentages et on suppose un échantillon de 100 g." : `On traite les valeurs comme des masses en grammes (leur somme vaut ${fmt(total, 5)} g).`,
    { text: "On convertit chaque masse en moles en la divisant par la masse atomique :", tex: `\\begin{aligned}${items.map((x) => `\\text{${x.sym}}:&\\ \\frac{${ntex(x.v)}}{${ntex(BY_SYMBOL[x.sym].mass)}} = ${ntex(x.n, 5)}`).join("\\\\")}\\end{aligned}` },
    `On divise par le plus petit nombre de moles (${fmt(min, 5)}) : ${items.map((x) => `${x.sym} = ${fmt(x.r, 4)}`).join("، ")}.`,
    mult > 1 ? `Les rapports ne sont pas des entiers, on les multiplie par ${mult} : ${items.map((x) => `${x.sym} = ${fmt(x.r * mult, 4)}`).join("، ")}, puis on arrondit.` : "Les rapports sont proches d'entiers, on les arrondit.",
    { text: "Formule empirique (ordre de Hill) et sa masse :", tex: `\\mathrm{${emp.replace(/(\d+)/g, "_{$1}")}},\\quad M_e = ${ntex(Me, 6)}\\ \\text{g/mol}` }
  ];
  const results = [{ label: "formule empirique", value: emp }, { label: "Masse de la formule empirique", value: `${fmt(Me, 6)} g/mol` }];
  let copy = `Formule empirique : ${emp}`;
  const blocks = [{ type: "table", caption: "Calcul du rapport le plus simple", head: ["Élément", "Valeur", "Moles", "÷ le plus petit", `× ${mult}`, "Nombre"], rows: items.map((x) => [x.sym, fmt(x.v, 5), fmt(x.n, 5), fmt(x.r, 4), fmt(x.r * mult, 4), String(counts[x.sym])]) }];
  if (warn) blocks.push({ type: "note", tone: "warn", text: "Les rapports ne sont pas clairement proches d'entiers : vérifiez la précision des données. Nous avons choisi l'arrondi le plus proche possible." });
  if (!isBlank(input.M)) {
    const M = num(input, "M", "Masse molaire", { positive: true });
    const kk = M / Me, k = Math.round(kk);
    if (k < 1 || Math.abs(kk - k) > 0.1) fail(`La masse molaire ${fmt(M)} n'est pas un multiple entier de la masse de la formule empirique (${fmt(Me, 5)}). Rapport ${fmt(kk, 4)}.`, "M");
    const mol = Object.fromEntries(Object.entries(counts).map(([el, n]) => [el, n * k]));
    const mf = write(mol);
    steps.push({ text: "Formule moléculaire :", tex: `k = \\frac{${ntex(M)}}{${ntex(Me, 6)}} = ${ntex(kk, 4)} \\approx ${k} \\Rightarrow \\mathrm{${mf.replace(/(\d+)/g, "_{$1}")}}` });
    results.push({ label: "formule moléculaire", value: mf });
    copy += ` | Formule moléculaire : ${mf}`;
  }
  return { results, steps, copy, blocks };
}
