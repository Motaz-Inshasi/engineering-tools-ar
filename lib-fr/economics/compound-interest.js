import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isInt = (x) => Math.abs(x - Math.round(x)) < 1e-9;

const FREQ = [["1", "Annuel (1)"], ["2", "Semestriel (2)"], ["4", "Trimestriel (4)"], ["12", "Mensuel (12)"], ["365", "Quotidien (365)"], ["continuous", "Continu"]];

export const meta = {
  description: "Calcul de la valeur future d'un montant avec intérêts simples, composés ou continus, avec des versements périodiques facultatifs, le total des intérêts, le taux effectif annuel, un tableau annuel du solde et un graphique.",
  keywords: ["intérêts composés", "intérêts simples", "compound interest", "valeur future", "FV", "placement", "intérêts continus"],
  formulas: [
    { label: "Intérêts simples", tex: "FV = P(1 + rt)" },
    { label: "Intérêts composés avec versements périodiques", tex: "FV = P\\left(1+\\frac{r}{n}\\right)^{nt} + PMT\\cdot\\frac{\\left(1+\\frac{r}{n}\\right)^{nt}-1}{r/n}" },
    { label: "Intérêts continus", tex: "FV = Pe^{rt}" }
  ],
  inputs: [
    { id: "P", label: "Montant initial P", type: "number", default: "1000" },
    { id: "r", label: "Taux d'intérêt annuel", unit: "%", type: "number", default: "5" },
    { id: "t", label: "Durée", unit: "ans", type: "number", default: "10", help: "Peut être fractionnaire, 100 ans au maximum." },
    { id: "mode", label: "Type d'intérêt", type: "select", default: "compound", options: [["simple", "Simples"], ["compound", "Composés"]] },
    { id: "freq", label: "Nombre de capitalisations par an", type: "select", default: "12", options: FREQ, when: { mode: ["compound"] } },
    { id: "pmt", label: "Versement périodique PMT", type: "number", default: "0", when: { mode: ["compound"] }, help: "Ajouté à la fin de chaque période de capitalisation. Non disponible avec les intérêts continus ; avec une durée fractionnaire, le nombre de périodes doit être entier." }
  ],
  example: { values: { P: "1000", r: "5", t: "10", mode: "compound", freq: "12", pmt: "0" }, expect: ["1,647.01"], note: "Exemple : 1000 à 5 % pendant 10 ans avec capitalisation mensuelle." },
  invalid: { values: { P: "1000", r: "5", t: "10", mode: "compound", freq: "continuous", pmt: "100" } },
  related: ["loan-amortization", "npv-irr", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const P = num(input, "P", "Montant initial", { nonNegative: true });
  const r = num(input, "r", "Taux d'intérêt", { nonNegative: true, max: 1000 });
  const t = num(input, "t", "Durée", { positive: true, max: 100 });
  const mode = choice(input, "mode", "Type d'intérêt", ["simple", "compound"], "compound");
  const freq = choice(input, "freq", "Nombre de capitalisations", ["1", "2", "4", "12", "365", "continuous"], "12");
  const pmt = num(input, "pmt", "Versement périodique", { nonNegative: true, default: 0 });
  const rate = r / 100;
  const simple = mode === "simple";
  const continuous = !simple && freq === "continuous";
  const n = simple || continuous ? 1 : Number(freq);
  const contributing = !simple && !continuous && pmt > 0;
  if (continuous && pmt > 0) fail("Le versement périodique n'est pas pris en charge avec les intérêts continus. Mettez-le à zéro ou choisissez un nombre défini de capitalisations.", "pmt");
  const N = n * t;
  if (contributing && !isInt(N)) fail(`Nombre de périodes n × t = ${fmt(N)} doit être entier en présence d'un versement périodique.`, "t");
  const i = rate / n;
  const balance = (y) => {
    if (simple) return P * (1 + rate * y);
    if (continuous) return P * Math.exp(rate * y);
    const k = n * y;
    const g = Math.pow(1 + i, k);
    return P * g + (i === 0 ? pmt * k : (pmt * (g - 1)) / i);
  };
  const FV = balance(t);
  const contributed = contributing ? pmt * N : 0;
  const totalContrib = P + contributed;
  const interest = FV - totalContrib;
  const ear = simple ? rate : continuous ? Math.exp(rate) - 1 : Math.pow(1 + i, n) - 1;
  const whole = Math.floor(t + 1e-9);
  const ys = [];
  for (let y = 1; y <= whole; y++) ys.push(y);
  if (t - whole > 1e-9) ys.push(t);
  const rows = ys.map((y) => {
    const b = balance(y);
    const contribY = contributing ? pmt * n * y : 0;
    return [fmt(y, 6), money(b), money(b - P - contribY)];
  });
  const points = [[0, P], ...ys.map((y) => [y, balance(y)])];
  const steps = [];
  if (simple) {
    steps.push({ text: "Les intérêts simples ne sont calculés que sur le montant initial :", tex: `FV = P(1 + rt) = ${ntex(P)} \\times (1 + ${ntex(rate, 6)} \\times ${ntex(t)}) = ${ntex(FV, 8)}` });
  } else if (continuous) {
    steps.push({ text: "Capitalisation continue :", tex: `FV = Pe^{rt} = ${ntex(P)} \\times e^{${ntex(rate, 6)} \\times ${ntex(t)}} = ${ntex(FV, 8)}` });
  } else {
    const contribTex = !contributing ? "" : i === 0 ? ` + ${ntex(pmt)} \\times ${ntex(N)}` : ` + ${ntex(pmt)} \\times \\frac{(1+${ntex(i, 6)})^{${ntex(N)}}-1}{${ntex(i, 6)}}`;
    steps.push({ text: "Taux d'intérêt par période et nombre de périodes :", tex: `i = \\frac{r}{n} = \\frac{${ntex(rate, 6)}}{${n}} = ${ntex(i, 6)},\\qquad N = nt = ${n} \\times ${ntex(t)} = ${ntex(N)}` });
    steps.push({ text: "Valeur future :", tex: `FV = P(1+i)^N${contributing ? " + PMT\\frac{(1+i)^N-1}{i}" : ""} = ${ntex(P)} \\times (1+${ntex(i, 6)})^{${ntex(N)}}${contribTex} = ${ntex(FV, 8)}` });
  }
  steps.push({ text: "Total des intérêts = valeur future − total versé :", tex: `${ntex(FV, 8)} - ${ntex(totalContrib, 8)} = ${ntex(interest, 8)}` });
  return {
    results: [
      { label: "Valeur future FV", value: money(FV), text: `FV = ${money(FV)}` },
      { label: "Total versé", value: money(totalContrib) },
      { label: "Total des intérêts", value: money(interest) },
      { label: "Taux effectif annuel", value: `${fmt(ear * 100, 5)}%` }
    ],
    steps,
    copy: `Valeur future : ${money(FV)}, total des intérêts : ${money(interest)}, taux effectif annuel : ${fmt(ear * 100, 5)}%`,
    blocks: [
      { type: "table", caption: "Solde à la fin de chaque année", head: ["Année", "Solde", "Intérêts cumulés jusqu'ici"], rows },
      { type: "plot", title: "Évolution du solde dans le temps", xLabel: "Années", yLabel: "Solde", includeZero: true, series: [{ name: "Solde", points, line: true }] }
    ]
  };
}
