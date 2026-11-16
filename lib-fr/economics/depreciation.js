import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Calcul de l'amortissement annuel d'un actif par la méthode linéaire, dégressive ou de la somme des chiffres des années, avec un tableau montrant l'amortissement, le cumul et la valeur comptable, sans descendre sous la valeur résiduelle.",
  keywords: ["amortissement", "dépréciation", "depreciation", "Amortissement linéaire", "amortissement dégressif", "somme des chiffres des années", "valeur comptable", "valeur résiduelle"],
  formulas: [
    { label: "Amortissement linéaire", tex: "D = \\frac{C-S}{n}" },
    { label: "somme des chiffres des années", tex: "D_y = \\frac{n-y+1}{n(n+1)/2}\\,(C-S)" },
    { label: "amortissement dégressif", tex: "D_y = \\max\\left(B_{y-1}\\frac{k}{n},\\ \\frac{B_{y-1}-S}{n-y+1}\\right)" }
  ],
  inputs: [
    { id: "cost", label: "Coût de l'actif C", type: "number", default: "10000" },
    { id: "salvage", label: "Valeur résiduelle S", type: "number", default: "1000" },
    { id: "life", label: "Durée de vie n", unit: "ans", type: "number", default: "5", help: "Nombre entier de 1 à 100." },
    { id: "method", label: "Méthode d'amortissement", type: "select", default: "sl", options: [["sl", "Amortissement linéaire"], ["db", "amortissement dégressif"], ["syd", "somme des chiffres des années"]] },
    { id: "factor", label: "Coefficient d'amortissement dégressif k", type: "select", default: "2", options: [["2", "Double (2)"], ["1.5", "1.5"]], when: { method: ["db"] } }
  ],
  example: { values: { cost: "10000", salvage: "1000", life: "5", method: "sl", factor: "2" }, expect: ["1,800.00"], note: "Exemple : actif coûtant 10 000, valeur résiduelle de 1 000 et durée de vie de 5 ans, en linéaire." },
  invalid: { values: { cost: "1000", salvage: "2000", life: "5", method: "sl", factor: "2" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const cost = num(input, "cost", "Coût de l'actif", { positive: true });
  const salvage = num(input, "salvage", "valeur résiduelle", { nonNegative: true });
  const n = num(input, "life", "Durée de vie", { integer: true, min: 1, max: 100 });
  const method = choice(input, "method", "Méthode d'amortissement", ["sl", "db", "syd"], "sl");
  const factor = Number(choice(input, "factor", "Coefficient d'amortissement dégressif", ["2", "1.5"], "2"));
  if (salvage > cost) fail("La valeur résiduelle ne peut pas dépasser le coût de l'actif.", "salvage");
  const base = cost - salvage;
  const sumYears = (n * (n + 1)) / 2;
  let bv = cost;
  let acc = 0;
  let switchYear = null;
  const schedule = [];
  for (let y = 1; y <= n; y++) {
    let d;
    let kind = "";
    if (method === "sl") d = base / n;
    else if (method === "syd") d = (base * (n - y + 1)) / sumYears;
    else {
      const dbAmt = (bv * factor) / n;
      const slAmt = (bv - salvage) / (n - y + 1);
      const useSl = slAmt > dbAmt;
      if (useSl && switchYear === null) switchYear = y;
      d = Math.min(Math.max(dbAmt, slAmt), bv - salvage);
      kind = useSl ? "linéaire" : "dégressif";
    }
    bv = Math.max(bv - d, salvage);
    acc += d;
    schedule.push({ y, d, acc, bv, kind });
  }
  const withKind = method === "db";
  const rows = schedule.map((s) => (withKind ? [fmt(s.y), money(s.d), money(s.acc), money(s.bv), s.kind] : [fmt(s.y), money(s.d), money(s.acc), money(s.bv)]));
  const head = ["Année", "amortissement", "Cumul", "valeur comptable"];
  if (withKind) head.push("Méthode");
  const first = schedule[0].d;
  const last = schedule[n - 1].bv;
  const results = [
    { label: "Amortissement de la première année", value: money(first) },
    { label: "Amortissement total", value: money(base) },
    { label: "Valeur comptable en fin de vie", value: money(last) }
  ];
  if (method === "sl") results.unshift({ label: "Amortissement annuel constant", value: money(base / n) });
  const steps = [];
  if (method === "sl") {
    steps.push({ text: "Amortissement linéaire :", tex: `D = \\frac{C-S}{n} = \\frac{${ntex(cost)} - ${ntex(salvage)}}{${n}} = ${ntex(base / n, 8)}` });
  } else if (method === "syd") {
    steps.push({ text: "Somme des chiffres des années :", tex: `\\sum = \\frac{n(n+1)}{2} = \\frac{${n}(${n}+1)}{2} = ${ntex(sumYears)}` });
    steps.push({ text: "Amortissement de la première année :", tex: `D_1 = \\frac{n}{\\sum}(C-S) = \\frac{${n}}{${ntex(sumYears)}} \\times ${ntex(base)} = ${ntex(first, 8)}` });
  } else {
    steps.push({ text: "Taux d'amortissement dégressif :", tex: `\\text{rate} = \\frac{k}{n} = \\frac{${factor}}{${n}} = ${ntex(factor / n, 6)}` });
    steps.push({ text: "Amortissement de la première année :", tex: `D_1 = C \\times \\text{rate} = ${ntex(cost)} \\times ${ntex(factor / n, 6)} = ${ntex(first, 8)}` });
    steps.push("Chaque année, on prend le plus grand entre l'amortissement dégressif et l'amortissement linéaire appliqué à la valeur restante, sans dépasser la valeur résiduelle.");
  }
  const copy = method === "sl"
    ? `Amortissement annuel constant : ${money(base / n)}, valeur comptable en fin de vie : ${money(last)}`
    : `Amortissement de la première année : ${money(first)}, valeur comptable en fin de vie : ${money(last)}`;
  const blocks = [{ type: "table", caption: "Tableau d'amortissement annuel", head, rows }];
  if (method === "db") {
    blocks.push(switchYear === null
      ? { type: "note", text: "Le calcul n'a pas eu besoin de passer à l'amortissement linéaire, et la valeur comptable ne descend pas sous la valeur résiduelle." }
      : { type: "note", text: `Le calcul passe à l'amortissement linéaire à partir de l'année ${switchYear}, car l'amortissement linéaire sur la valeur restante est plus grand ; ainsi, la valeur comptable atteint la valeur résiduelle en fin de vie sans descendre en dessous.` });
  }
  return { results, steps, copy, blocks };
}
