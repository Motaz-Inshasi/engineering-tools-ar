import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const KARATS = ["24", "22", "21", "18"];
const RATE = 0.025;
const SILVER_NISAB_G = 595;
const GOLD_NISAB_G = 85;

export const meta = {
  description: "Calcule la zakat sobre el patrimonio zakatable tras descontar las deudas exigibles, con efectivo, oro según sus quilates, plata, mercancías, deudas por cobrar e inversiones, e indique si se alcanza el nisab en oro o en plata.",
  keywords: ["zakat", "nisab de la zakat", "zakat del oro", "zakat de la plata", "zakat del patrimonio", "cálculo de la zakat", "zakat"],
  formulas: [
    { label: "Valor del oro convertido a 24 quilates", tex: "V_{Au} = G \\times \\frac{k}{24} \\times P_{Au}" },
    { label: "Patrimonio zakatable neto", tex: "N = A - D" },
    { label: "Nisab", tex: "N_{sb} = 595\\ \\text{g} \\times P_{Ag},\\qquad N_{gd} = 85\\ \\text{g} \\times P_{Au}" },
    { label: "Zakat", tex: "Z = 2.5\\% \\times N \\quad \\text{if } N \\ge \\text{Nisab}" }
  ],
  inputs: [
    { id: "cash", label: "Efectivo y saldos bancarios", type: "number", default: "0" },
    { id: "goldG", label: "Oro que posee", unit: "gramos", type: "number", default: "0" },
    { id: "karat", label: "Quilates del oro", type: "select", default: "24", options: [["24", "24 quilates"], ["22", "22 quilates"], ["21", "21 quilates"], ["18", "18 quilates"]] },
    { id: "silverG", label: "Plata que posee", unit: "gramos", type: "number", default: "0" },
    { id: "trade", label: "Valor de mercancías y existencias", type: "number", default: "0" },
    { id: "receivables", label: "Deudas por cobrar", type: "number", default: "0" },
    { id: "invest", label: "Inversiones y acciones (valor de mercado)", type: "number", default: "0" },
    { id: "debts", label: "Deudas exigibles ahora", type: "number", default: "0", help: "Deudas a corto plazo que vencen en el año; se descuentan de los activos." },
    { id: "goldPrice", label: "Precio del gramo de oro de 24 quilates", type: "number", help: "Necesario si tiene oro o si la base del nisab es el oro." },
    { id: "silverPrice", label: "Precio del gramo de plata", type: "number", help: "Necesario si tiene plata o si la base del nisab es la plata." },
    { id: "basis", label: "Base del nisab", type: "select", default: "silver", options: [["silver", "Plata (595 gramos)"], ["gold", "Oro (85 gramos)"]], help: "Muchos eruditos y organismos adoptan el nisab de la plata por ser más beneficioso para los pobres, mientras que otros optan por el nisab del oro." }
  ],
  example: { values: { cash: "10000", goldG: "0", karat: "24", silverG: "0", trade: "0", receivables: "0", invest: "0", debts: "0", goldPrice: "", silverPrice: "1", basis: "silver" }, expect: ["250.00", "595.00"], note: "Ejemplo: efectivo de 10000 con un precio de la plata de 1 por gramo; el nisab es 595 y la zakat es 250." },
  invalid: { values: { cash: "10000", goldG: "0", karat: "24", silverG: "0", trade: "0", receivables: "0", invest: "0", debts: "0", goldPrice: "", silverPrice: "", basis: "silver" } },
  related: ["budget-planner", "savings-goal", "compound-interest", "loan-amortization"]
};

export function solve(input) {
  const cash = num(input, "cash", "Efectivo y saldos", { nonNegative: true, default: 0 });
  const goldG = num(input, "goldG", "Peso del oro", { nonNegative: true, default: 0 });
  const karat = Number(choice(input, "karat", "Quilates del oro", KARATS, "24"));
  const silverG = num(input, "silverG", "Peso de la plata", { nonNegative: true, default: 0 });
  const trade = num(input, "trade", "Mercancías", { nonNegative: true, default: 0 });
  const receivables = num(input, "receivables", "Deudas por cobrar", { nonNegative: true, default: 0 });
  const invest = num(input, "invest", "Inversiones", { nonNegative: true, default: 0 });
  const debts = num(input, "debts", "Deudas exigibles", { nonNegative: true, default: 0 });
  const basis = choice(input, "basis", "Base del nisab", ["silver", "gold"], "silver");
  const goldPrice = num(input, "goldPrice", "Precio del gramo de oro", { nonNegative: true, optional: true });
  const silverPrice = num(input, "silverPrice", "Precio del gramo de plata", { nonNegative: true, optional: true });

  const gross = cash + goldG + silverG + trade + receivables + invest;
  if (!(gross > 0)) fail("Introduzca un valor mayor que cero para alguno de los activos zakatables.", "cash");
  if ((goldG > 0 || basis === "gold") && !(goldPrice > 0)) fail("Introduzca el precio del gramo de oro de 24 quilates para calcular el valor del oro o el nisab.", "goldPrice");
  if ((silverG > 0 || basis === "silver") && !(silverPrice > 0)) fail("Introduzca el precio del gramo de plata para calcular el valor de la plata o el nisab.", "silverPrice");

  const goldValue = goldG > 0 ? goldG * (karat / 24) * goldPrice : 0;
  const silverValue = silverG > 0 ? silverG * silverPrice : 0;
  const assets = cash + goldValue + silverValue + trade + receivables + invest;
  const net = assets - debts;
  const gold = basis === "gold";
  const nisab = gold ? GOLD_NISAB_G * goldPrice : SILVER_NISAB_G * silverPrice;
  const basisLabel = gold ? "oro" : "plata";
  const eligible = net > 0 && net >= nisab;
  const zakat = eligible ? net * RATE : 0;
  const status = eligible ? "El patrimonio alcanza el nisab; la zakat es obligatoria siempre que haya transcurrido un año lunar" : "El patrimonio no alcanza el nisab; no hay zakat obligatoria";

  const rows = [
    ["Efectivo y saldos bancarios", money(cash)],
    [`Oro (${fmt(goldG)} g, ${karat} quilates)`, money(goldValue)],
    [`Plata (${fmt(silverG)} g)`, money(silverValue)],
    ["Mercancías y existencias", money(trade)],
    ["Deudas por cobrar", money(receivables)],
    ["Inversiones y acciones", money(invest)],
    ["Total de activos", money(assets)],
    ["menos deudas exigibles", money(-debts)],
    ["Patrimonio zakatable neto", money(net)],
    [`Nisab (${basisLabel})`, money(nisab)]
  ];

  const steps = [];
  if (goldG > 0) steps.push({ text: "Conversión del oro a 24 quilates y cálculo de su valor:", tex: `V_{Au} = ${ntex(goldG)} \\times \\frac{${karat}}{24} \\times ${ntex(goldPrice)} = ${ntex(goldValue, 8)}` });
  if (silverG > 0) steps.push({ text: "Valor de la plata:", tex: `V_{Ag} = ${ntex(silverG)} \\times ${ntex(silverPrice)} = ${ntex(silverValue, 8)}` });
  steps.push({ text: "Suma de los activos zakatables y luego descuento de las deudas exigibles:", tex: `N = A - D = ${ntex(assets, 8)} - ${ntex(debts, 8)} = ${ntex(net, 8)}` });
  steps.push({ text: "Cálculo del nisab según la base elegida:", tex: gold ? `N_{gd} = 85 \\times ${ntex(goldPrice)} = ${ntex(nisab, 8)}` : `N_{sb} = 595 \\times ${ntex(silverPrice)} = ${ntex(nisab, 8)}` });
  steps.push(eligible
    ? { text: "El patrimonio alcanza el nisab, por lo que la zakat se calcula al 2.5%:", tex: `Z = 0.025 \\times ${ntex(net, 8)} = ${ntex(zakat, 8)}` }
    : "El patrimonio zakatable es menor que el nisab, por lo que no hay zakat obligatoria.");

  return {
    results: [
      { label: "Patrimonio zakatable neto", value: money(net) },
      { label: `Valor del nisab (${basisLabel})`, value: money(nisab) },
      { label: "Estado", value: eligible ? "Alcanza el nisab" : "Por debajo del nisab" },
      { label: "Zakat exigible (2.5%)", value: money(zakat) }
    ],
    steps,
    copy: `${status}. Zakat exigible: ${money(zakat)}; patrimonio zakatable neto: ${money(net)}; nisab: ${money(nisab)} (${basisLabel})`,
    blocks: [
      { type: "table", caption: "Componentes del patrimonio zakatable", head: ["Concepto", "Valor"], rows },
      { type: "note", text: "Año lunar (hawl): se requiere que el patrimonio que alcanza el nisab haya estado en poder de su dueño durante un año lunar completo." },
      { type: "note", text: "El cálculo es orientativo y de divulgación; consulte a una autoridad de fatwa confiable en los casos particulares.", tone: "warn" }
    ]
  };
}
