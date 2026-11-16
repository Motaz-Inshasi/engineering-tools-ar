import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PRESETS = { "50-30-20": [50, 30, 20], "70-20-10": [70, 20, 10] };

const verdict = (kind, target, actual) => {
  if (actual === null) return "Sin valor real introducido";
  const diff = Math.round((actual - target) * 100) / 100;
  if (diff === 0) return "Conforme al presupuesto";
  if (kind === "save") return diff > 0 ? `Por encima del objetivo en ${money(diff)}` : `Por debajo del objetivo en ${money(-diff)}`;
  return diff < 0 ? `Dentro del presupuesto (ahorro de ${money(-diff)})` : `Excede el presupuesto en ${money(diff)}`;
};

export const meta = {
  description: "Distribuya su ingreso mensual neto entre necesidades, deseos y ahorro según la regla 50/30/20 o 70/20/10, o con porcentajes propios, y compare el gasto real con el presupuesto para conocer el exceso o el ahorro.",
  keywords: ["presupuesto", "distribución del ingreso", "50 30 20", "70 20 10", "presupuesto mensual", "budget", "ahorro"],
  formulas: [
    { label: "Importe de cada categoría", tex: "B_i = I \\times \\frac{p_i}{100}" },
    { label: "Condición de los porcentajes personalizados", tex: "p_1 + p_2 + p_3 = 100" },
    { label: "Diferencia entre real y planificado", tex: "\\Delta_i = A_i - B_i" }
  ],
  inputs: [
    { id: "income", label: "Ingreso neto mensual", type: "number", default: "10000", help: "Ingreso después de descuentos e impuestos." },
    { id: "method", label: "Método de distribución", type: "select", default: "50-30-20", options: [["50-30-20", "50 / 30 / 20 (necesidades / deseos / ahorro)"], ["70-20-10", "70 / 20 / 10"], ["custom", "Porcentajes personalizados"]] },
    { id: "needsPct", label: "Porcentaje de necesidades", unit: "%", type: "number", default: "50", when: { method: ["custom"] } },
    { id: "wantsPct", label: "Porcentaje de deseos", unit: "%", type: "number", default: "30", when: { method: ["custom"] } },
    { id: "savePct", label: "Porcentaje de ahorro", unit: "%", type: "number", default: "20", when: { method: ["custom"] }, help: "La suma de los tres porcentajes debe ser igual a 100%." },
    { id: "needsActual", label: "Gasto real en necesidades", type: "number", help: "Opcional: déjelo vacío si no desea comparar." },
    { id: "wantsActual", label: "Gasto real en deseos", type: "number", help: "Opcional." },
    { id: "savingsActual", label: "Monto ahorrado realmente", type: "number", help: "Opcional." }
  ],
  example: { values: { income: "10000", method: "50-30-20", needsPct: "50", wantsPct: "30", savePct: "20", needsActual: "6000", wantsActual: "", savingsActual: "1500" }, expect: ["5,000.00", "3,000.00"], note: "Ejemplo: ingreso de 10000 con la regla 50/30/20 y un gasto real en necesidades de 6000, que supera el presupuesto." },
  invalid: { values: { income: "10000", method: "custom", needsPct: "50", wantsPct: "30", savePct: "30", needsActual: "", wantsActual: "", savingsActual: "" } },
  related: ["savings-goal", "zakat", "compound-interest", "loan-amortization"]
};

export function solve(input) {
  const income = num(input, "income", "ingreso neto", { positive: true });
  const method = choice(input, "method", "Método de distribución", ["50-30-20", "70-20-10", "custom"], "50-30-20");
  let pcts;
  if (method === "custom") {
    const needs = num(input, "needsPct", "Porcentaje de necesidades", { min: 0, max: 100 });
    const wants = num(input, "wantsPct", "Porcentaje de deseos", { min: 0, max: 100 });
    const save = num(input, "savePct", "Porcentaje de ahorro", { min: 0, max: 100 });
    if (Math.abs(needs + wants + save - 100) > 1e-9) fail(`La suma de los porcentajes es ${fmt(needs + wants + save)}% y debe ser igual a 100%.`, "savePct");
    pcts = [needs, wants, save];
  } else {
    pcts = PRESETS[method];
  }
  const actual = (key, label) => num(input, key, label, { nonNegative: true, optional: true });
  const actuals = [actual("needsActual", "Gasto real en necesidades"), actual("wantsActual", "Gasto real en deseos"), actual("savingsActual", "Monto ahorrado realmente")];

  const [pNeeds, pWants, pSave] = pcts;
  const needs = (income * pNeeds) / 100;
  const wants = (income * pWants) / 100;
  const save = (income * pSave) / 100;
  const targets = [needs, wants, save];
  const names = ["Necesidades", "Deseos", "Ahorro"];
  const kinds = ["spend", "spend", "save"];

  const rows = names.map((name, k) => [
    name,
    `${fmt(pcts[k])}%`,
    money(targets[k]),
    actuals[k] === null ? "—" : money(actuals[k]),
    verdict(kinds[k], targets[k], actuals[k])
  ]);

  const steps = [
    { text: "Importe de necesidades sobre el ingreso:", tex: `B_{\\text{needs}} = ${ntex(income)} \\times \\frac{${fmt(pNeeds)}}{100} = ${ntex(needs, 8)}` },
    { text: "Importe de deseos sobre el ingreso:", tex: `B_{\\text{wants}} = ${ntex(income)} \\times \\frac{${fmt(pWants)}}{100} = ${ntex(wants, 8)}` },
    { text: "Importe de ahorro sobre el ingreso:", tex: `B_{\\text{save}} = ${ntex(income)} \\times \\frac{${fmt(pSave)}}{100} = ${ntex(save, 8)}` }
  ];

  return {
    results: [
      { label: "Importe de necesidades", value: money(needs) },
      { label: "Importe de deseos", value: money(wants) },
      { label: "Importe de ahorro", value: money(save) }
    ],
    steps,
    copy: `Necesidades: ${money(needs)}, deseos: ${money(wants)}, ahorro: ${money(save)} (de un ingreso de ${money(income)})`,
    blocks: [
      { type: "table", caption: "Presupuesto planificado frente al gasto real", head: ["Categoría", "Porcentaje", "Planificado", "Real", "Resultado"], rows }
    ]
  };
}
