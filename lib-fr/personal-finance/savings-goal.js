import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MAX_MONTHS = 1200;
const isInt = (x) => Math.abs(x - Math.round(x)) < 1e-9;

const balanceAt = (PV, PMT, i, m) => (i === 0 ? PV + PMT * m : PV * Math.pow(1 + i, m) + (PMT * (Math.pow(1 + i, m) - 1)) / i);

const monthsText = (m) => {
  const y = Math.floor(m / 12);
  const r = m - y * 12;
  const yt = y === 0 ? "" : y === 1 ? "an" : y === 2 ? "deux ans" : y <= 10 ? `${y} ans` : `${y} ans`;
  const rt = r === 0 ? "" : r === 1 ? "mois" : r === 2 ? "deux mois" : r <= 10 ? `${r} mois` : `${r} mois`;
  if (!yt && !rt) return "0 mois";
  if (!yt) return rt;
  if (!rt) return yt;
  return `${yt} et ${rt}`;
};

const yearRows = (PV, PMT, i, months) => {
  const marks = [];
  for (let m = 12; m < months; m += 12) marks.push(m);
  if (months > 0) marks.push(months);
  return marks.map((m) => {
    const b = balanceAt(PV, PMT, i, m);
    const dep = PV + PMT * m;
    return [fmt(m / 12, 4), money(b), money(dep), money(b - dep)];
  });
};

const yearTable = (PV, PMT, i, months) => ({
  type: "table",
  caption: "Évolution du solde à la fin de chaque année",
  head: ["Durée (en années)", "Solde", "Total versé", "Intérêts à ce jour"],
  rows: yearRows(PV, PMT, i, months)
});

export const meta = {
  description: "Calculez le versement mensuel nécessaire pour atteindre un objectif financier avec un rendement annuel prévu sur une durée donnée, ou calculez la durée nécessaire si vous connaissez le versement mensuel, avec un tableau du solde annuel.",
  keywords: ["épargne", "objectif financier", "versement mensuel", "PMT", "économies", "économies", "savings goal"],
  formulas: [
    { label: "Versement mensuel nécessaire (en fin de chaque mois)", tex: "PMT = \\frac{(FV - PV(1+i)^N)\\, i}{(1+i)^N - 1},\\qquad i = \\frac{r}{12}" },
    { label: "Solde après N mois", tex: "FV = PV(1+i)^N + PMT\\,\\frac{(1+i)^N - 1}{i}" },
    { label: "Nombre de mois pour atteindre l'objectif", tex: "N = \\frac{\\ln\\left(\\frac{FV\\, i + PMT}{PV\\, i + PMT}\\right)}{\\ln(1+i)}" }
  ],
  inputs: [
    { id: "mode", label: "Que souhaitez-vous calculer ?", type: "select", default: "forward", options: [["forward", "Versement mensuel nécessaire"], ["reverse", "Durée nécessaire pour un versement mensuel fixe"]] },
    { id: "target", label: "Montant visé", type: "number", default: "100000" },
    { id: "current", label: "Épargne actuelle", type: "number", default: "10000" },
    { id: "rate", label: "Rendement annuel prévu", unit: "%", type: "number", default: "5", help: "Mettez 0 si vous n'attendez aucun rendement." },
    { id: "time", label: "Durée disponible", type: "number", default: "10", when: { mode: ["forward"] } },
    { id: "timeUnit", label: "Unité de durée", type: "select", default: "years", options: [["years", "années"], ["months", "mois"]], when: { mode: ["forward"] } },
    { id: "deposit", label: "versement mensuel", type: "number", default: "500", when: { mode: ["reverse"] }, help: "Versé en fin de chaque mois." }
  ],
  example: { values: { mode: "forward", target: "100000", current: "10000", rate: "5", time: "10", timeUnit: "years", deposit: "500" }, expect: ["537.92"], note: "Exemple : objectif de 100000 à partir de 10000 avec un rendement de 5 % par an sur 10 ans." },
  invalid: { values: { mode: "reverse", target: "100000", current: "10000", rate: "0", time: "10", timeUnit: "years", deposit: "0" } },
  related: ["compound-interest", "loan-amortization", "budget-planner", "zakat"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Type de calcul", ["forward", "reverse"], "forward");
  const target = num(input, "target", "Montant visé", { positive: true });
  const current = num(input, "current", "Épargne actuelle", { nonNegative: true, default: 0 });
  const rate = num(input, "rate", "Rendement annuel", { nonNegative: true, max: 100, default: 0 });
  const i = rate / 1200;
  return mode === "reverse" ? reverse(input, target, current, i) : forward(input, target, current, i);
}

function forward(input, target, current, i) {
  const unit = choice(input, "timeUnit", "Unité de durée", ["years", "months"], "years");
  const t = num(input, "time", "Durée", { positive: true });
  const n = unit === "years" ? t * 12 : t;
  if (!isInt(n)) fail("La durée doit donner un nombre entier de mois, par exemple 2.5 ans ou 30 mois.", "time");
  if (n > MAX_MONTHS) fail("La durée ne doit pas dépasser 100 ans.", "time");
  const months = Math.round(n);
  const pmt = balanceAt(current, 0, i, months) >= target ? 0
    : i === 0 ? (target - current) / months
    : ((target - current * Math.pow(1 + i, months)) * i) / (Math.pow(1 + i, months) - 1);
  const reached = pmt === 0;
  const deposited = current + pmt * months;
  const final = balanceAt(current, pmt, i, months);
  const interest = final - deposited;

  const steps = [{ text: "Conversion de la durée en mois et taux mensuel :", tex: `N = ${months},\\qquad i = \\frac{r}{12} = ${ntex(i, 6)}` }];
  if (reached) steps.push(current >= target ? "L'épargne actuelle atteint déjà le montant visé : aucun versement n'est nécessaire." : "Votre solde actuel atteint l'objectif sans versements supplémentaires.");
  else if (i === 0) steps.push({ text: "Sans rendement, le versement mensuel est l'écart divisé par le nombre de mois :", tex: `PMT = \\frac{FV - PV}{N} = \\frac{${ntex(target)} - ${ntex(current)}}{${months}} = ${ntex(pmt, 8)}` });
  else steps.push({ text: "Versement mensuel nécessaire :", tex: `PMT = \\frac{(FV - PV(1+i)^N)\\, i}{(1+i)^N - 1} = \\frac{(${ntex(target)} - ${ntex(current)} \\times (1+${ntex(i, 6)})^{${months}}) \\times ${ntex(i, 6)}}{(1+${ntex(i, 6)})^{${months}} - 1} = ${ntex(pmt, 8)}` });

  return {
    results: [
      { label: "Versement mensuel nécessaire", value: reached ? "Aucun versement nécessaire" : money(pmt) },
      { label: "Durée", value: monthsText(months) },
      { label: "Total que vous allez verser", value: money(deposited) },
      { label: "Total des intérêts attendus", value: money(interest) },
      { label: "Solde à la fin de la période", value: money(final) }
    ],
    steps,
    copy: reached
      ? `L'objectif est atteint sans versements ; solde attendu : ${money(final)}`
      : `Versement mensuel nécessaire : ${money(pmt)} pendant ${monthsText(months)}, total des intérêts attendus : ${money(interest)}`,
    blocks: [yearTable(current, pmt, i, months)]
  };
}

function reverse(input, target, current, i) {
  const deposit = num(input, "deposit", "versement mensuel", { nonNegative: true });
  let real = 0;
  if (current < target) {
    if (i === 0) {
      if (!(deposit > 0)) fail("Le versement mensuel doit être supérieur à zéro pour atteindre l'objectif sans rendement.", "deposit");
      real = (target - current) / deposit;
    } else {
      const denom = current * i + deposit;
      if (!(denom > 0)) fail("L'objectif ne peut pas être atteint avec un versement nul et une épargne actuelle nulle.", "deposit");
      real = Math.log((target * i + deposit) / denom) / Math.log(1 + i);
    }
  }
  const months = Math.ceil(real - 1e-9);
  if (months > MAX_MONTHS) fail("La durée nécessaire dépasse 100 ans : augmentez le montant du versement.", "deposit");
  const final = balanceAt(current, deposit, i, months);
  const deposited = current + deposit * months;
  const interest = final - deposited;

  const steps = [];
  if (months === 0) steps.push("L'épargne actuelle atteint déjà le montant visé.");
  else {
    steps.push(i === 0
      ? { text: "Sans rendement, le nombre de mois est l'écart divisé par le versement :", tex: `N = \\frac{FV - PV}{PMT} = \\frac{${ntex(target)} - ${ntex(current)}}{${ntex(deposit)}} = ${ntex(real, 6)}` }
      : { text: "Résolution de l'équation du solde pour le nombre de mois N :", tex: `N = \\frac{\\ln\\left(\\frac{FV\\, i + PMT}{PV\\, i + PMT}\\right)}{\\ln(1+i)} = ${ntex(real, 6)}` });
    steps.push({ text: "On arrondit N à l'entier supérieur, car les versements sont mensuels :", tex: `N = \\lceil ${ntex(real, 6)} \\rceil = ${months}` });
  }

  return {
    results: [
      { label: "Durée nécessaire", value: months === 0 ? "L'objectif est déjà atteint" : `${months} mois (${monthsText(months)})` },
      { label: "Solde à l'atteinte de l'objectif", value: money(final) },
      { label: "Total que vous allez verser", value: money(deposited) },
      { label: "Total des intérêts", value: money(interest) }
    ],
    steps,
    copy: months === 0
      ? "L'objectif est déjà atteint"
      : `Il faut ${months} mois (${monthsText(months)}) pour atteindre ${money(target)} en versant ${money(deposit)} par mois`,
    blocks: months === 0 ? [] : [yearTable(current, deposit, i, months)]
  };
}
