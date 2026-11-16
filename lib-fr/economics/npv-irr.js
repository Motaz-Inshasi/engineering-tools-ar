import { fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LO = -0.99;
const HI = 10;
const GRID = 4000;
const NO_PAYBACK = "L'investissement n'est pas récupéré pendant la durée";

const npvAt = (cf, r) => {
  let s = 0;
  let d = 1;
  for (let t = 0; t < cf.length; t++) {
    if (t > 0) d *= 1 + r;
    s += cf[t] / d;
  }
  return s;
};

function bisect(cf, a, b) {
  let fa = npvAt(cf, a);
  for (let k = 0; k < 200; k++) {
    const m = (a + b) / 2;
    const fm = npvAt(cf, m);
    if (fm === 0) return m;
    if (fa * fm < 0) b = m;
    else {
      a = m;
      fa = fm;
    }
  }
  return (a + b) / 2;
}

function findIrr(cf) {
  let prevR = LO;
  let prevV = npvAt(cf, LO);
  let root = null;
  let changes = 0;
  for (let k = 1; k <= GRID; k++) {
    const r = LO + ((HI - LO) * k) / GRID;
    const v = npvAt(cf, r);
    if (Number.isFinite(prevV) && Number.isFinite(v) && prevV * v < 0) {
      changes++;
      if (root === null) root = bisect(cf, prevR, r);
    }
    if (Number.isFinite(v) && v === 0 && root === null) root = r;
    prevR = r;
    prevV = v;
  }
  return { root, changes };
}

function payback(vals) {
  let cum = 0;
  for (let t = 0; t < vals.length; t++) {
    const prev = cum;
    cum += vals[t];
    if (cum >= 0 && (t === 0 || prev < 0)) return t === 0 ? 0 : t - 1 + -prev / vals[t];
  }
  return null;
}

export const meta = {
  description: "Calcul de la valeur actuelle nette, du taux de rentabilité interne, de l'indice de rentabilité, et des délais de récupération simple et actualisé pour une série de flux de trésorerie, avec un tableau annuel des valeurs actualisées et cumulées.",
  keywords: ["valeur actuelle nette", "NPV", "taux de rentabilité interne", "IRR", "délai de récupération", "payback", "indice de rentabilité", "étude de faisabilité"],
  formulas: [
    { label: "valeur actuelle nette", tex: "NPV = \\sum_{t=0}^{n}\\frac{CF_t}{(1+r)^t}" },
    { label: "taux de rentabilité interne", tex: "NPV(IRR) = 0" },
    { label: "indice de rentabilité", tex: "PI = \\frac{\\sum_{t=1}^{n} CF_t/(1+r)^t}{|CF_0|}" }
  ],
  inputs: [
    { id: "r", label: "Taux d'actualisation", unit: "%", type: "number", default: "10" },
    { id: "cf", label: "Flux de trésorerie CF0, CF1, ...", type: "textarea", rows: 3, default: "-1000 300 400 500", placeholder: "-1000 300 400 500", help: "Commencez par le flux initial CF0 (généralement négatif), puis les flux annuels. Séparez les valeurs par un espace ou une virgule." }
  ],
  example: { values: { r: "10", cf: "-1000 300 400 500" }, expect: ["NPV = -21.04", "IRR = 8.896%"], note: "Exemple : investissement de 1000 rapportant 300, 400 et 500 les trois années suivantes, avec un taux d'actualisation de 10 %." },
  invalid: { values: { r: "10", cf: "-1000" } },
  related: ["compound-interest", "loan-amortization", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const rPct = num(input, "r", "Taux d'actualisation", { min: -99, max: 1000 });
  const cf = numList(input, "cf", "Flux de trésorerie", { min: 2, max: 200 });
  if (cf[0] === 0) fail("Le flux initial CF0 ne peut pas être égal à zéro.", "cf");
  const rate = rPct / 100;
  const npv = npvAt(cf, rate);
  if (!Number.isFinite(npv)) fail("La valeur actuelle nette ne peut pas être calculée à ce taux, essayez un taux plus élevé.", "r");
  const df = cf.map((_, t) => 1 / Math.pow(1 + rate, t));
  const pv = cf.map((c, t) => c * df[t]);
  const pvFuture = pv.slice(1).reduce((s, x) => s + x, 0);
  const PI = pvFuture / Math.abs(cf[0]);
  const cum = [];
  const cumPv = [];
  let a = 0;
  let b = 0;
  cf.forEach((c, t) => {
    a += c;
    b += pv[t];
    cum.push(a);
    cumPv.push(b);
  });
  const pb = payback(cf);
  const dpb = payback(pv);
  const { root, changes } = findIrr(cf);
  const irrText = root === null ? "Indéfini" : `${fmt(root * 100, 4)}%`;
  const pbText = pb === null ? NO_PAYBACK : `${fmt(pb, 4)} ans`;
  const dpbText = dpb === null ? NO_PAYBACK : `${fmt(dpb, 4)} ans`;
  const terms = cf.map((c, t) => (t === 0 ? ntex(c) : `\\frac{${ntex(c)}}{(1+${ntex(rate, 6)})^{${t}}}`)).join(" + ");
  const steps = [
    { text: "La valeur actuelle nette est la somme des valeurs actuelles des flux :", tex: `NPV = ${terms} = ${ntex(npv, 8)}` },
    "Le taux de rentabilité interne est le taux qui annule la VAN. On cherche le premier changement de signe de la VAN sur l'intervalle de −99 % à 1000 %, puis on resserre cet intervalle par dichotomie.",
    "Délai de récupération : dernière année où le solde cumulé est négatif, auquel on ajoute la fraction de l'année suivante.",
    `Indice de rentabilité = ${ntex(pvFuture, 8)} ÷ ${ntex(Math.abs(cf[0]), 8)} = ${fmt(PI, 4)}`
  ];
  const blocks = [
    { type: "table", caption: "Tableau des valeurs actualisées et cumulées", head: ["Année", "Flux de trésorerie", "Coefficient d'actualisation", "Valeur actuelle", "Cumulé", "Cumulé actualisé"], rows: cf.map((c, t) => [fmt(t), money(c), fmt(df[t], 6), money(pv[t]), money(cum[t]), money(cumPv[t])]) }
  ];
  if (changes === 0) blocks.push({ type: "note", text: "La VAN ne change de signe nulle part sur l'intervalle de −99 % à 1000 %, il n'est donc pas possible de définir un taux de rentabilité interne.", tone: "warn" });
  if (changes > 1) blocks.push({ type: "note", text: "Plusieurs taux de rentabilité interne existent pour ces flux ; on affiche le plus petit." });
  return {
    results: [
      { label: "Valeur actuelle nette (VAN)", value: money(npv), text: `NPV = ${money(npv)}` },
      { label: "Taux de rentabilité interne (TRI)", value: irrText, text: `IRR = ${irrText}` },
      { label: "délai de récupération", value: pbText },
      { label: "Délai de récupération actualisé", value: dpbText },
      { label: "Indice de rentabilité (IP)", value: fmt(PI, 4) }
    ],
    steps,
    copy: `VAN = ${money(npv)}, TRI = ${irrText}, indice de rentabilité (IP) = ${fmt(PI, 4)}`,
    blocks
  };
}
