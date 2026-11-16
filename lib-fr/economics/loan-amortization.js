import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Calcul de la mensualité constante d'un prêt, du total payé et du total des intérêts, avec un tableau annuel montrant les intérêts payés, le capital remboursé et le solde restant, ainsi qu'un graphique de la baisse du solde.",
  keywords: ["prêt", "tableau d'amortissement", "amortization", "mensualité", "intérêts du prêt", "remboursement de la dette", "prêt immobilier"],
  formulas: [
    { label: "Annuité constante", tex: "PMT = \\frac{P\\,i}{1-(1+i)^{-N}},\\qquad i=\\frac{r}{m},\\quad N=mt" },
    { label: "Solde après le versement k", tex: "B_k = B_{k-1}(1+i) - PMT" }
  ],
  inputs: [
    { id: "P", label: "Capital emprunté P", type: "number", default: "100000" },
    { id: "r", label: "Taux d'intérêt annuel", unit: "%", type: "number", default: "6" },
    { id: "t", label: "Durée du prêt", unit: "ans", type: "number", default: "30", help: "Le produit de la durée par le nombre de versements par an doit donner un nombre entier de versements, avec 100 ans au maximum." },
    { id: "freq", label: "Nombre de versements par an", type: "select", default: "12", options: [["12", "Mensuels (12)"], ["4", "Trimestriels (4)"], ["2", "Semestriels (2)"], ["1", "Annuels (1)"]] }
  ],
  example: { values: { P: "100000", r: "6", t: "30", freq: "12" }, expect: ["599.55"], note: "Exemple : prêt immobilier de 100 000 à 6 % sur 30 ans, avec versements mensuels." },
  invalid: { values: { P: "100000", r: "6", t: "1.01", freq: "12" } },
  related: ["compound-interest", "npv-irr", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const P = num(input, "P", "Capital emprunté", { positive: true });
  const r = num(input, "r", "Taux d'intérêt", { nonNegative: true, max: 1000 });
  const t = num(input, "t", "Durée du prêt", { positive: true, max: 100 });
  const m = Number(choice(input, "freq", "Nombre de versements par an", ["12", "4", "2", "1"], "12"));
  const Nraw = t * m;
  if (Math.abs(Nraw - Math.round(Nraw)) > 1e-9) fail(`Le nombre de versements (${fmt(Nraw)}) doit être entier : ajustez la durée en années.`, "t");
  const N = Math.round(Nraw);
  const i = r / 100 / m;
  const pmt = i === 0 ? P / N : (P * i) / (1 - Math.pow(1 + i, -N));
  const total = pmt * N;
  const interest = total - P;
  const rows = [];
  const points = [[0, P]];
  let bal = P;
  let yInt = 0;
  let yPri = 0;
  for (let k = 1; k <= N; k++) {
    const intr = bal * i;
    const pri = k === N ? bal : pmt - intr;
    bal -= pri;
    yInt += intr;
    yPri += pri;
    if (k % m === 0 || k === N) {
      rows.push([fmt(Math.ceil(k / m)), money(yInt), money(yPri), money(Math.max(0, bal))]);
      points.push([k / m, Math.max(0, bal)]);
      yInt = 0;
      yPri = 0;
    }
  }
  const steps = [
    { text: "Taux d'intérêt par versement :", tex: `i = \\frac{r}{m} = \\frac{${ntex(r / 100, 6)}}{${m}} = ${ntex(i, 6)}` },
    { text: "Nombre total de versements :", tex: `N = mt = ${m} \\times ${ntex(t)} = ${N}` },
    i === 0
      ? { text: "Sans intérêt, le capital est divisé par le nombre de versements :", tex: `PMT = \\frac{P}{N} = \\frac{${ntex(P)}}{${N}} = ${ntex(pmt, 8)}` }
      : { text: "Annuité constante :", tex: `PMT = \\frac{P\\,i}{1-(1+i)^{-N}} = \\frac{${ntex(P)} \\times ${ntex(i, 6)}}{1-(1+${ntex(i, 6)})^{-${N}}} = ${ntex(pmt, 8)}` },
    { text: "Total payé et total des intérêts :", tex: `${ntex(pmt, 8)} \\times ${N} = ${ntex(total, 8)},\\qquad ${ntex(total, 8)} - ${ntex(P)} = ${ntex(interest, 8)}` }
  ];
  return {
    results: [
      { label: "Versement périodique", value: money(pmt), text: `Versement ${money(pmt)}` },
      { label: "Total payé", value: money(total) },
      { label: "Total des intérêts", value: money(interest) },
      { label: "Nombre de versements", value: String(N) }
    ],
    steps,
    copy: `Versement : ${money(pmt)} par versement, total payé : ${money(total)}, total des intérêts : ${money(interest)}`,
    blocks: [
      { type: "table", caption: "Tableau annuel de remboursement", head: ["Année", "Intérêts payés", "Capital remboursé", "Solde restant"], rows: [...rows, ["Total", money(interest), money(P), "0.00"]] },
      { type: "note", text: "L'annuité est constante pendant toute la durée : la part des intérêts est donc plus élevée au début, et la part du capital augmente avec le temps. Les nombres sont arrondis à deux décimales." },
      { type: "plot", title: "Évolution du solde restant dans le temps", xLabel: "Années", yLabel: "Solde", includeZero: true, series: [{ name: "Solde restant", points, line: true }] }
    ]
  };
}
