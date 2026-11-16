import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const n6 = (x) => ntex(x, 6);

const RATIOS = [
  {
    label: "Ratio courant", need: ["CA", "CL"], den: "CL", pct: false,
    sym: "\\frac{CA}{CL}", sub: (v) => `\\frac{${n6(v.CA)}}{${n6(v.CL)}}`, f: (v) => v.CA / v.CL,
    interp: (x) => (x >= 2 ? "Bonne liquidité : les actifs courants couvrent au moins deux fois les dettes à court terme" : x >= 1 ? "Liquidité acceptable, mais marge limitée" : "Les actifs courants ne suffisent pas à couvrir les dettes à court terme")
  },
  {
    label: "Ratio de liquidité réduite", need: ["CA", "inv", "CL"], den: "CL", pct: false,
    sym: "\\frac{CA-\\text{Inv}}{CL}", sub: (v) => `\\frac{${n6(v.CA)}-${n6(v.inv)}}{${n6(v.CL)}}`, f: (v) => (v.CA - v.inv) / v.CL,
    interp: (x) => (x >= 1 ? "Couvre les dettes à court terme sans recourir à la vente du stock" : "Dépend de la vente du stock pour rembourser les dettes à court terme")
  },
  {
    label: "Ratio dettes sur actifs", need: ["TL", "TA"], den: "TA", pct: true,
    sym: "\\frac{TL}{TA}", sub: (v) => `\\frac{${n6(v.TL)}}{${n6(v.TA)}}`, f: (v) => v.TL / v.TA,
    interp: (x) => (x < 0.5 ? "Faible endettement" : x <= 1 ? "Endettement moyen" : "Les dettes dépassent les actifs")
  },
  {
    label: "Ratio dettes sur capitaux propres", need: ["TL", "equity"], den: "equity", pct: false,
    sym: "\\frac{TL}{E}", sub: (v) => `\\frac{${n6(v.TL)}}{${n6(v.equity)}}`, f: (v) => v.TL / v.equity,
    interp: (x, v) => (v.equity < 0 ? "Les capitaux propres sont négatifs, situation financière qui demande de la prudence" : x < 1 ? "Le financement par capitaux propres dépasse l'endettement" : "Les dettes dépassent ou égalent les capitaux propres")
  },
  {
    label: "Rentabilité des actifs (ROA)", need: ["ni", "TA"], den: "TA", pct: true,
    sym: "\\frac{NI}{TA}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.TA)}}`, f: (v) => v.ni / v.TA,
    interp: (x) => (x < 0 ? "Perte par rapport aux actifs" : x < 0.05 ? "Faible rentabilité des actifs" : "Bonne rentabilité des actifs")
  },
  {
    label: "Rentabilité des capitaux propres (ROE)", need: ["ni", "equity"], den: "equity", pct: true,
    sym: "\\frac{NI}{E}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.equity)}}`, f: (v) => v.ni / v.equity,
    interp: (x, v) => (v.equity < 0 ? "Les capitaux propres sont négatifs, le ratio ne reflète pas une rentabilité réelle" : x < 0 ? "Perte par rapport aux capitaux propres" : x < 0.1 ? "Faible rentabilité des capitaux propres" : "Bonne rentabilité des capitaux propres")
  },
  {
    label: "Marge brute", need: ["rev", "cogs"], den: "rev", pct: true,
    sym: "\\frac{Rev-COGS}{Rev}", sub: (v) => `\\frac{${n6(v.rev)}-${n6(v.cogs)}}{${n6(v.rev)}}`, f: (v) => (v.rev - v.cogs) / v.rev,
    interp: (x) => (x < 0 ? "Le coût des marchandises vendues dépasse le chiffre d'affaires" : "Part de chaque unité de vente restant après le coût des marchandises vendues")
  },
  {
    label: "Marge nette", need: ["ni", "rev"], den: "rev", pct: true,
    sym: "\\frac{NI}{Rev}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.rev)}}`, f: (v) => v.ni / v.rev,
    interp: (x) => (x < 0 ? "Perte nette sur les ventes" : "Part de chaque unité de vente qui se transforme en bénéfice net")
  },
  {
    label: "Rotation des actifs", need: ["rev", "TA"], den: "TA", pct: false,
    sym: "\\frac{Rev}{TA}", sub: (v) => `\\frac{${n6(v.rev)}}{${n6(v.TA)}}`, f: (v) => v.rev / v.TA,
    interp: (x) => (x < 1 ? "Les actifs génèrent un chiffre d'affaires inférieur à leur valeur" : "Les actifs génèrent un chiffre d'affaires supérieur à leur valeur")
  }
];

const FIELDS = [
  ["CA", "Actifs courants", { nonNegative: true }],
  ["CL", "Dettes à court terme", { nonNegative: true }],
  ["inv", "Stocks", { nonNegative: true }],
  ["TA", "Total de l'actif", { nonNegative: true }],
  ["TL", "Total des dettes", { nonNegative: true }],
  ["equity", "Capitaux propres", {}],
  ["rev", "Chiffre d'affaires", { nonNegative: true }],
  ["cogs", "Coût des marchandises vendues", { nonNegative: true }],
  ["ni", "Résultat net", {}]
];

export const meta = {
  description: "Calcul des principaux ratios financiers (liquidité, endettement, rentabilité, efficacité des actifs) à partir des seules données disponibles, avec un tableau montrant chaque ratio, sa formule et son interprétation succincte.",
  keywords: ["ratios financiers", "financial ratios", "Ratio courant", "liquidité", "ROA", "ROE", "marge bénéficiaire", "endettement"],
  formulas: [
    { label: "Ratio courant", tex: "\\frac{\\text{Actifs courants}}{\\text{Dettes à court terme}}" },
    { label: "Rentabilité des capitaux propres (ROE)", tex: "ROE = \\frac{NI}{E}" },
    { label: "Rentabilité des actifs (ROA)", tex: "ROA = \\frac{NI}{TA}" }
  ],
  inputs: [
    { id: "CA", label: "Actifs courants", type: "number" },
    { id: "CL", label: "Dettes à court terme", type: "number" },
    { id: "inv", label: "Stocks", type: "number" },
    { id: "TA", label: "Total de l'actif", type: "number" },
    { id: "TL", label: "Total des dettes", type: "number" },
    { id: "equity", label: "Capitaux propres", type: "number" },
    { id: "rev", label: "Chiffre d'affaires", type: "number" },
    { id: "cogs", label: "Coût des marchandises vendues", type: "number" },
    { id: "ni", label: "Résultat net", type: "number", help: "Tous les champs sont facultatifs, et chaque ratio dont les données sont disponibles est calculé." }
  ],
  example: {
    values: { CA: "500000", CL: "250000", inv: "100000", TA: "1000000", TL: "600000", equity: "400000", rev: "800000", cogs: "500000", ni: "80000" },
    expect: ["Ratio courant = 2", "Ratio dettes sur actifs = 60%"],
    note: "Exemple : entreprise avec des actifs courants de 500 000, des dettes à court terme de 250 000, et les données d'actifs et de chiffre d'affaires indiquées."
  },
  invalid: { values: { CA: "", CL: "", inv: "", TA: "", TL: "", equity: "", rev: "", cogs: "", ni: "" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "depreciation", "price-elasticity"]
};

export function solve(input) {
  const v = {};
  for (const [id, label, opts] of FIELDS) v[id] = num(input, id, label, { ...opts, optional: true });
  const computed = [];
  const skipped = [];
  for (const d of RATIOS) {
    if (d.need.some((k) => v[k] === null)) {
      skipped.push(`${d.label} (données insuffisantes)`);
      continue;
    }
    if (v[d.den] === 0) {
      skipped.push(`${d.label} (dénominateur nul)`);
      continue;
    }
    computed.push({ d, x: d.f(v) });
  }
  if (computed.length === 0) fail("Saisissez des données suffisantes pour calculer au moins un ratio financier, comme les actifs courants et les dettes à court terme.", "CA");
  const disp = (d, x) => (d.pct ? `${fmt(x * 100, 4)}%` : fmt(x, 4));
  const results = computed.map(({ d, x }) => ({ label: d.label, value: disp(d, x), text: `${d.label} = ${disp(d, x)}` }));
  const steps = computed.map(({ d, x }) => ({ text: `${d.label}:`, tex: `${d.sym} = ${d.sub(v)} = ${d.pct ? `${ntex(x * 100, 6)}\\%` : ntex(x, 6)}` }));
  const rows = computed.map(({ d, x }) => [d.label, disp(d, x), { tex: d.sym }, d.interp(x, v)]);
  const blocks = [{ type: "table", caption: "Ratios calculés", head: ["Ratio", "Valeur", "Formule", "Interprétation"], rows }];
  if (skipped.length > 0) blocks.push({ type: "note", text: `Non calculés : ${skipped.join("، ")}.`, tone: "warn" });
  return {
    results,
    steps,
    copy: results.map((r) => `${r.label} = ${r.value}`).join("، "),
    blocks
  };
}
