import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Calcula el punto de equilibrio en unidades e ingresos, el margen de contribución y su porcentaje, y el número de unidades necesario para alcanzar una utilidad objetivo, con la gráfica del ingreso y del costo total hasta el doble del punto de equilibrio.",
  keywords: ["punto de equilibrio", "break-even", "margen de contribución", "costos fijos", "costos variables", "utilidad objetivo"],
  formulas: [
    { label: "Punto de equilibrio en unidades", tex: "Q^* = \\frac{F}{p-v}" },
    { label: "Unidades para lograr una utilidad objetivo", tex: "Q_T = \\frac{F+\\pi}{p-v}" }
  ],
  inputs: [
    { id: "F", label: "Costos fijos F", unit: "", type: "number", default: "10000" },
    { id: "p", label: "Precio de venta por unidad p", type: "number", default: "50" },
    { id: "v", label: "Costo variable por unidad v", type: "number", default: "30" },
    { id: "target", label: "Utilidad objetivo π (opcional)", type: "number", help: "Déjalo vacío si no lo necesitas." }
  ],
  example: { values: { F: "10000", p: "50", v: "30", target: "" }, expect: ["500 unidades", "25,000.00"], note: "Ejemplo: costos fijos de 10,000, precio de 50 y costo variable de 30 por unidad." },
  invalid: { values: { F: "10000", p: "30", v: "30", target: "" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const F = num(input, "F", "costos fijos", { nonNegative: true });
  const p = num(input, "p", "Precio de venta por unidad", { positive: true });
  const v = num(input, "v", "Costo variable por unidad", { nonNegative: true });
  const target = num(input, "target", "utilidad objetivo", { optional: true });
  if (!(p > v)) fail("El precio de venta debe ser mayor que el costo variable por unidad; de lo contrario, las ventas no cubrirán ninguna parte de los costos fijos.", "p");
  const cm = p - v;
  const units = F / cm;
  const revenue = units * p;
  const cost = F + v * units;
  const ratio = cm / p;
  const integerUnits = Math.ceil(units - 1e-9);
  let targetUnits = null;
  if (target !== null) {
    if (F + target < 0) fail("La pérdida objetivo supera los costos fijos, así que no puede calcularse con un número positivo de unidades.", "target");
    targetUnits = (F + target) / cm;
  }
  const xMax = units > 0 ? 2 * units : 1;
  const sample = (fn) => Array.from({ length: 21 }, (_, k) => {
    const x = (xMax * k) / 20;
    return [x, fn(x)];
  });
  const plot = {
    type: "plot",
    title: "Ingreso y costo total según el número de unidades",
    xLabel: "Número de unidades",
    yLabel: "Monto",
    includeZero: true,
    series: [
      { name: "Ingreso total", points: sample((x) => p * x), line: true },
      { name: "Costo total", points: sample((x) => F + v * x), line: true }
    ]
  };
  if (units > 0) plot.vlines = [{ x: units }];
  const results = [
    { label: "Punto de equilibrio en unidades", value: `${fmt(units, 6)} unidades`, text: `${fmt(units, 6)} unidades` },
    { label: "Mínimo número entero de unidades", value: `${fmt(integerUnits)} unidades` },
    { label: "Ingreso en el punto de equilibrio", value: money(revenue) },
    { label: "Margen de contribución por unidad", value: money(cm) },
    { label: "Porcentaje de margen de contribución", value: `${fmt(ratio * 100, 4)}%` }
  ];
  const steps = [
    { text: "Margen de contribución por unidad:", tex: `p - v = ${ntex(p)} - ${ntex(v)} = ${ntex(cm)}` },
    { text: "Punto de equilibrio en unidades:", tex: `Q^* = \\frac{F}{p-v} = \\frac{${ntex(F)}}{${ntex(cm)}} = ${ntex(units, 6)}` },
    { text: "Ingreso en el punto de equilibrio:", tex: `R^* = pQ^* = ${ntex(p)} \\times ${ntex(units, 6)} = ${ntex(revenue, 8)}` }
  ];
  let copy = `Punto de equilibrio: ${fmt(units, 6)} unidades; ingreso en ese punto: ${money(revenue)}`;
  if (targetUnits !== null) {
    results.push({ label: "Unidades para lograr la utilidad objetivo", value: `${fmt(targetUnits, 6)} unidades` });
    steps.push({ text: "Unidades para lograr la utilidad objetivo:", tex: `Q_T = \\frac{F+\\pi}{p-v} = \\frac{${ntex(F)} + ${ntex(target)}}{${ntex(cm)}} = ${ntex(targetUnits, 6)}` });
    copy += `, unidades para lograr la utilidad objetivo: ${fmt(targetUnits, 6)} unidades`;
  }
  return { results, steps, copy, blocks: [plot] };
}
