import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PRESETS = { "50-30-20": [50, 30, 20], "70-20-10": [70, 20, 10] };

const verdict = (kind, target, actual) => {
  if (actual === null) return "Dépense réelle non saisie";
  const diff = Math.round((actual - target) * 100) / 100;
  if (diff === 0) return "Conforme au budget";
  if (kind === "save") return diff > 0 ? `Au-dessus de l'objectif de ${money(diff)}` : `En dessous de l'objectif de ${money(-diff)}`;
  return diff < 0 ? `Dans le budget (économie de ${money(-diff)})` : `Dépassement du budget de ${money(diff)}`;
};

export const meta = {
  description: "Répartissez votre revenu mensuel net entre besoins, envies et épargne selon la règle 50/30/20 ou 70/20/10, ou selon des pourcentages de votre choix, et comparez la dépense réelle au budget pour repérer le dépassement ou l'économie.",
  keywords: ["budget", "répartition du revenu", "50 30 20", "70 20 10", "budget mensuel", "budget", "épargne"],
  formulas: [
    { label: "Montant de chaque catégorie", tex: "B_i = I \\times \\frac{p_i}{100}" },
    { label: "Condition des pourcentages personnalisés", tex: "p_1 + p_2 + p_3 = 100" },
    { label: "Écart entre le réel et le prévu", tex: "\\Delta_i = A_i - B_i" }
  ],
  inputs: [
    { id: "income", label: "Revenu mensuel net", type: "number", default: "10000", help: "Revenu après déductions et impôts." },
    { id: "method", label: "Méthode de répartition", type: "select", default: "50-30-20", options: [["50-30-20", "50 / 30 / 20 (besoins / envies / épargne)"], ["70-20-10", "70 / 20 / 10"], ["custom", "Pourcentages personnalisés"]] },
    { id: "needsPct", label: "Pourcentage des besoins", unit: "%", type: "number", default: "50", when: { method: ["custom"] } },
    { id: "wantsPct", label: "Pourcentage des envies", unit: "%", type: "number", default: "30", when: { method: ["custom"] } },
    { id: "savePct", label: "Pourcentage de l'épargne", unit: "%", type: "number", default: "20", when: { method: ["custom"] }, help: "La somme des trois pourcentages doit être égale à 100 %." },
    { id: "needsActual", label: "Dépense réelle pour les besoins", type: "number", help: "Facultatif : laissez vide si vous ne souhaitez pas de comparaison." },
    { id: "wantsActual", label: "Dépense réelle pour les envies", type: "number", help: "Facultatif." },
    { id: "savingsActual", label: "Montant effectivement épargné", type: "number", help: "Facultatif." }
  ],
  example: { values: { income: "10000", method: "50-30-20", needsPct: "50", wantsPct: "30", savePct: "20", needsActual: "6000", wantsActual: "", savingsActual: "1500" }, expect: ["5,000.00", "3,000.00"], note: "Exemple : revenu de 10000 avec la règle 50/30/20, et dépense réelle pour les besoins de 6000, ce qui dépasse le budget." },
  invalid: { values: { income: "10000", method: "custom", needsPct: "50", wantsPct: "30", savePct: "30", needsActual: "", wantsActual: "", savingsActual: "" } },
  related: ["savings-goal", "zakat", "compound-interest", "loan-amortization"]
};

export function solve(input) {
  const income = num(input, "income", "Revenu net", { positive: true });
  const method = choice(input, "method", "Méthode de répartition", ["50-30-20", "70-20-10", "custom"], "50-30-20");
  let pcts;
  if (method === "custom") {
    const needs = num(input, "needsPct", "Pourcentage des besoins", { min: 0, max: 100 });
    const wants = num(input, "wantsPct", "Pourcentage des envies", { min: 0, max: 100 });
    const save = num(input, "savePct", "Pourcentage de l'épargne", { min: 0, max: 100 });
    if (Math.abs(needs + wants + save - 100) > 1e-9) fail(`La somme des pourcentages est de ${fmt(needs + wants + save)} % et doit être égale à 100 %.`, "savePct");
    pcts = [needs, wants, save];
  } else {
    pcts = PRESETS[method];
  }
  const actual = (key, label) => num(input, key, label, { nonNegative: true, optional: true });
  const actuals = [actual("needsActual", "Dépense réelle pour les besoins"), actual("wantsActual", "Dépense réelle pour les envies"), actual("savingsActual", "Montant effectivement épargné")];

  const [pNeeds, pWants, pSave] = pcts;
  const needs = (income * pNeeds) / 100;
  const wants = (income * pWants) / 100;
  const save = (income * pSave) / 100;
  const targets = [needs, wants, save];
  const names = ["Besoins", "Envies", "Épargne"];
  const kinds = ["spend", "spend", "save"];

  const rows = names.map((name, k) => [
    name,
    `${fmt(pcts[k])}%`,
    money(targets[k]),
    actuals[k] === null ? "—" : money(actuals[k]),
    verdict(kinds[k], targets[k], actuals[k])
  ]);

  const steps = [
    { text: "Montant du revenu alloué aux besoins :", tex: `B_{\\text{needs}} = ${ntex(income)} \\times \\frac{${fmt(pNeeds)}}{100} = ${ntex(needs, 8)}` },
    { text: "Montant du revenu alloué aux envies :", tex: `B_{\\text{wants}} = ${ntex(income)} \\times \\frac{${fmt(pWants)}}{100} = ${ntex(wants, 8)}` },
    { text: "Montant du revenu alloué à l'épargne :", tex: `B_{\\text{save}} = ${ntex(income)} \\times \\frac{${fmt(pSave)}}{100} = ${ntex(save, 8)}` }
  ];

  return {
    results: [
      { label: "Montant des besoins", value: money(needs) },
      { label: "Montant des envies", value: money(wants) },
      { label: "Montant de l'épargne", value: money(save) }
    ],
    steps,
    copy: `Besoins : ${money(needs)}, envies : ${money(wants)}, épargne : ${money(save)} (sur un revenu de ${money(income)})`,
    blocks: [
      { type: "table", caption: "Budget prévu et dépense réelle", head: ["Catégorie", "Pourcentage", "Prévu", "Réel", "Verdict"], rows }
    ]
  };
}
