import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const KARATS = ["24", "22", "21", "18"];
const RATE = 0.025;
const SILVER_NISAB_G = 595;
const GOLD_NISAB_G = 85;

export const meta = {
  description: "Calcule la zakat sur le patrimoine zakatable après déduction des dettes exigibles, en tenant compte des espèces, de l'or selon le carat, de l'argent, des marchandises commerciales, des créances recouvrables et des placements, et indique si le nisab est atteint en or ou en argent.",
  keywords: ["zakat", "nisab", "zakat de l'or", "zakat de l'argent", "zakat sur les biens", "calcul de la zakat", "zakat"],
  formulas: [
    { label: "Valeur de l'or ramené au 24 carats", tex: "V_{Au} = G \\times \\frac{k}{24} \\times P_{Au}" },
    { label: "Patrimoine zakatable net", tex: "N = A - D" },
    { label: "Nisab", tex: "N_{sb} = 595\\ \\text{g} \\times P_{Ag},\\qquad N_{gd} = 85\\ \\text{g} \\times P_{Au}" },
    { label: "Zakat", tex: "Z = 2.5\\% \\times N \\quad \\text{if } N \\ge \\text{Nisab}" }
  ],
  inputs: [
    { id: "cash", label: "Espèces et soldes bancaires", type: "number", default: "0" },
    { id: "goldG", label: "Or possédé", unit: "gramme", type: "number", default: "0" },
    { id: "karat", label: "Carat de l'or", type: "select", default: "24", options: [["24", "24 carats"], ["22", "22 carats"], ["21", "21 carats"], ["18", "18 carats"]] },
    { id: "silverG", label: "Argent possédé", unit: "gramme", type: "number", default: "0" },
    { id: "trade", label: "Valeur des marchandises et du stock commercial", type: "number", default: "0" },
    { id: "receivables", label: "Créances recouvrables", type: "number", default: "0" },
    { id: "invest", label: "Placements et actions (valeur de marché)", type: "number", default: "0" },
    { id: "debts", label: "Dettes exigibles maintenant", type: "number", default: "0", help: "Dettes à court terme échues dans l'année, déduites des actifs." },
    { id: "goldPrice", label: "Prix du gramme d'or 24 carats", type: "number", help: "Requis si vous possédez de l'or ou si la base du nisab est l'or." },
    { id: "silverPrice", label: "Prix du gramme d'argent", type: "number", help: "Requis si vous possédez de l'argent ou si la base du nisab est l'argent." },
    { id: "basis", label: "Base du nisab", type: "select", default: "silver", options: [["silver", "Argent (595 grammes)"], ["gold", "Or (85 grammes)"]], help: "De nombreux savants et organismes retiennent le nisab de l'argent, car il profite davantage aux pauvres, tandis que d'autres retiennent le nisab de l'or." }
  ],
  example: { values: { cash: "10000", goldG: "0", karat: "24", silverG: "0", trade: "0", receivables: "0", invest: "0", debts: "0", goldPrice: "", silverPrice: "1", basis: "silver" }, expect: ["250.00", "595.00"], note: "Exemple : espèces de 10000 avec un prix de l'argent de 1 par gramme, donc le nisab est de 595 et la zakat de 250." },
  invalid: { values: { cash: "10000", goldG: "0", karat: "24", silverG: "0", trade: "0", receivables: "0", invest: "0", debts: "0", goldPrice: "", silverPrice: "", basis: "silver" } },
  related: ["budget-planner", "savings-goal", "compound-interest", "loan-amortization"]
};

export function solve(input) {
  const cash = num(input, "cash", "Espèces et soldes", { nonNegative: true, default: 0 });
  const goldG = num(input, "goldG", "Poids de l'or", { nonNegative: true, default: 0 });
  const karat = Number(choice(input, "karat", "Carat de l'or", KARATS, "24"));
  const silverG = num(input, "silverG", "Poids de l'argent", { nonNegative: true, default: 0 });
  const trade = num(input, "trade", "Marchandises commerciales", { nonNegative: true, default: 0 });
  const receivables = num(input, "receivables", "Créances recouvrables", { nonNegative: true, default: 0 });
  const invest = num(input, "invest", "Placements", { nonNegative: true, default: 0 });
  const debts = num(input, "debts", "Dettes exigibles", { nonNegative: true, default: 0 });
  const basis = choice(input, "basis", "Base du nisab", ["silver", "gold"], "silver");
  const goldPrice = num(input, "goldPrice", "Prix de l'or le gramme", { nonNegative: true, optional: true });
  const silverPrice = num(input, "silverPrice", "Prix du gramme d'argent", { nonNegative: true, optional: true });

  const gross = cash + goldG + silverG + trade + receivables + invest;
  if (!(gross > 0)) fail("Saisissez une valeur supérieure à zéro pour l'un des biens zakatables.", "cash");
  if ((goldG > 0 || basis === "gold") && !(goldPrice > 0)) fail("Saisissez le prix du gramme d'or 24 carats pour calculer la valeur de l'or ou le nisab.", "goldPrice");
  if ((silverG > 0 || basis === "silver") && !(silverPrice > 0)) fail("Saisissez le prix du gramme d'argent pour calculer la valeur de l'argent ou le nisab.", "silverPrice");

  const goldValue = goldG > 0 ? goldG * (karat / 24) * goldPrice : 0;
  const silverValue = silverG > 0 ? silverG * silverPrice : 0;
  const assets = cash + goldValue + silverValue + trade + receivables + invest;
  const net = assets - debts;
  const gold = basis === "gold";
  const nisab = gold ? GOLD_NISAB_G * goldPrice : SILVER_NISAB_G * silverPrice;
  const basisLabel = gold ? "l'or" : "l'argent";
  const eligible = net > 0 && net >= nisab;
  const zakat = eligible ? net * RATE : 0;
  const status = eligible ? "Le patrimoine atteint le nisab, et la zakat est due à condition qu'une année lunaire complète se soit écoulée" : "Le patrimoine est inférieur au nisab, donc aucune zakat n'est due";

  const rows = [
    ["Espèces et soldes bancaires", money(cash)],
    [`Or (${fmt(goldG)} g, ${karat} carats)`, money(goldValue)],
    [`Argent (${fmt(silverG)} g)`, money(silverValue)],
    ["Marchandises commerciales et stock", money(trade)],
    ["Créances recouvrables", money(receivables)],
    ["Placements et actions", money(invest)],
    ["Total des actifs", money(assets)],
    ["Moins les dettes exigibles", money(-debts)],
    ["Patrimoine zakatable net", money(net)],
    [`Nisab (${basisLabel})`, money(nisab)]
  ];

  const steps = [];
  if (goldG > 0) steps.push({ text: "Conversion de l'or en 24 carats, puis calcul de sa valeur :", tex: `V_{Au} = ${ntex(goldG)} \\times \\frac{${karat}}{24} \\times ${ntex(goldPrice)} = ${ntex(goldValue, 8)}` });
  if (silverG > 0) steps.push({ text: "Valeur de l'argent :", tex: `V_{Ag} = ${ntex(silverG)} \\times ${ntex(silverPrice)} = ${ntex(silverValue, 8)}` });
  steps.push({ text: "Total des actifs zakatables, puis déduction des dettes exigibles :", tex: `N = A - D = ${ntex(assets, 8)} - ${ntex(debts, 8)} = ${ntex(net, 8)}` });
  steps.push({ text: "Calcul du nisab selon la base choisie :", tex: gold ? `N_{gd} = 85 \\times ${ntex(goldPrice)} = ${ntex(nisab, 8)}` : `N_{sb} = 595 \\times ${ntex(silverPrice)} = ${ntex(nisab, 8)}` });
  steps.push(eligible
    ? { text: "Le patrimoine atteint le nisab, donc la zakat est calculée à 2.5 % :", tex: `Z = 0.025 \\times ${ntex(net, 8)} = ${ntex(zakat, 8)}` }
    : "Le patrimoine zakatable est inférieur au nisab, donc aucune zakat n'est due.");

  return {
    results: [
      { label: "Patrimoine zakatable net", value: money(net) },
      { label: `Valeur du nisab (${basisLabel})`, value: money(nisab) },
      { label: "Situation", value: eligible ? "Nisab atteint" : "Sous le nisab" },
      { label: "Zakat due (2.5 %)", value: money(zakat) }
    ],
    steps,
    copy: `${status}. Zakat due : ${money(zakat)}, patrimoine zakatable net : ${money(net)}, nisab : ${money(nisab)} (${basisLabel})`,
    blocks: [
      { type: "table", caption: "Composantes du patrimoine zakatable", head: ["Élément", "Valeur"], rows },
      { type: "note", text: "Condition de l'année : le patrimoine doit avoir été détenu par son propriétaire pendant une année hégirienne (lunaire) complète." },
      { type: "note", text: "Ce calcul est donné à titre indicatif ; consultez une autorité religieuse de confiance pour les cas particuliers.", tone: "warn" }
    ]
  };
}
