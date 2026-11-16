import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const n6 = (x) => ntex(x, 6);

const RATIOS = [
  {
    label: "Razón corriente", need: ["CA", "CL"], den: "CL", pct: false,
    sym: "\\frac{CA}{CL}", sub: (v) => `\\frac{${n6(v.CA)}}{${n6(v.CL)}}`, f: (v) => v.CA / v.CL,
    interp: (x) => (x >= 2 ? "Buena liquidez: los activos corrientes cubren al menos dos veces las obligaciones a corto plazo" : x >= 1 ? "Liquidez aceptable, pero con margen limitado" : "Los activos corrientes no bastan para cubrir las obligaciones a corto plazo")
  },
  {
    label: "Razón de liquidez rápida (prueba ácida)", need: ["CA", "inv", "CL"], den: "CL", pct: false,
    sym: "\\frac{CA-\\text{Inv}}{CL}", sub: (v) => `\\frac{${n6(v.CA)}-${n6(v.inv)}}{${n6(v.CL)}}`, f: (v) => (v.CA - v.inv) / v.CL,
    interp: (x) => (x >= 1 ? "Cubre las obligaciones a corto plazo sin depender de la venta de inventario" : "Depende de la venta de inventario para pagar las obligaciones a corto plazo")
  },
  {
    label: "Razón deuda a activos", need: ["TL", "TA"], den: "TA", pct: true,
    sym: "\\frac{TL}{TA}", sub: (v) => `\\frac{${n6(v.TL)}}{${n6(v.TA)}}`, f: (v) => v.TL / v.TA,
    interp: (x) => (x < 0.5 ? "Bajo endeudamiento" : x <= 1 ? "Endeudamiento moderado" : "Las obligaciones superan los activos")
  },
  {
    label: "Razón deuda a patrimonio", need: ["TL", "equity"], den: "equity", pct: false,
    sym: "\\frac{TL}{E}", sub: (v) => `\\frac{${n6(v.TL)}}{${n6(v.equity)}}`, f: (v) => v.TL / v.equity,
    interp: (x, v) => (v.equity < 0 ? "El patrimonio es negativo, una situación financiera que requiere precaución" : x < 1 ? "El financiamiento con patrimonio supera a la deuda" : "La deuda supera o iguala al patrimonio")
  },
  {
    label: "Rentabilidad sobre activos (ROA)", need: ["ni", "TA"], den: "TA", pct: true,
    sym: "\\frac{NI}{TA}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.TA)}}`, f: (v) => v.ni / v.TA,
    interp: (x) => (x < 0 ? "Pérdida en relación con los activos" : x < 0.05 ? "Rentabilidad baja sobre activos" : "Buena rentabilidad sobre activos")
  },
  {
    label: "Rentabilidad sobre patrimonio (ROE)", need: ["ni", "equity"], den: "equity", pct: true,
    sym: "\\frac{NI}{E}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.equity)}}`, f: (v) => v.ni / v.equity,
    interp: (x, v) => (v.equity < 0 ? "El patrimonio es negativo, así que la razón no refleja una rentabilidad real" : x < 0 ? "Pérdida en relación con el patrimonio" : x < 0.1 ? "Rentabilidad baja sobre patrimonio" : "Buena rentabilidad sobre patrimonio")
  },
  {
    label: "Margen de utilidad bruta", need: ["rev", "cogs"], den: "rev", pct: true,
    sym: "\\frac{Rev-COGS}{Rev}", sub: (v) => `\\frac{${n6(v.rev)}-${n6(v.cogs)}}{${n6(v.rev)}}`, f: (v) => (v.rev - v.cogs) / v.rev,
    interp: (x) => (x < 0 ? "El costo de ventas supera los ingresos" : "La parte de cada unidad monetaria de ventas que queda después del costo de ventas")
  },
  {
    label: "Margen de utilidad neta", need: ["ni", "rev"], den: "rev", pct: true,
    sym: "\\frac{NI}{Rev}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.rev)}}`, f: (v) => v.ni / v.rev,
    interp: (x) => (x < 0 ? "Pérdida neta sobre las ventas" : "La parte de cada unidad monetaria de ventas que se convierte en utilidad neta")
  },
  {
    label: "Rotación de activos", need: ["rev", "TA"], den: "TA", pct: false,
    sym: "\\frac{Rev}{TA}", sub: (v) => `\\frac{${n6(v.rev)}}{${n6(v.TA)}}`, f: (v) => v.rev / v.TA,
    interp: (x) => (x < 1 ? "Los activos generan ingresos menores que su valor" : "Los activos generan ingresos superiores a su valor")
  }
];

const FIELDS = [
  ["CA", "Activos corrientes", { nonNegative: true }],
  ["CL", "Pasivos corrientes", { nonNegative: true }],
  ["inv", "Inventario", { nonNegative: true }],
  ["TA", "Total de activos", { nonNegative: true }],
  ["TL", "Total de pasivos", { nonNegative: true }],
  ["equity", "Patrimonio", {}],
  ["rev", "Ingresos", { nonNegative: true }],
  ["cogs", "Costo de ventas", { nonNegative: true }],
  ["ni", "Utilidad neta", {}]
];

export const meta = {
  description: "Calcula las razones financieras básicas (liquidez, endeudamiento, rentabilidad y eficiencia de activos) solo con los datos disponibles, con una tabla que muestra cada razón, su fórmula y una breve interpretación.",
  keywords: ["Razones financieras", "financial ratios", "Razón corriente", "liquidez", "ROA", "ROE", "margen de utilidad", "endeudamiento"],
  formulas: [
    { label: "Razón corriente", tex: "\\frac{\\text{Activos corrientes}}{\\text{Pasivos corrientes}}" },
    { label: "Rentabilidad sobre patrimonio (ROE)", tex: "ROE = \\frac{NI}{E}" },
    { label: "Rentabilidad sobre activos (ROA)", tex: "ROA = \\frac{NI}{TA}" }
  ],
  inputs: [
    { id: "CA", label: "Activos corrientes", type: "number" },
    { id: "CL", label: "Pasivos corrientes", type: "number" },
    { id: "inv", label: "Inventario", type: "number" },
    { id: "TA", label: "Total de activos", type: "number" },
    { id: "TL", label: "Total de pasivos", type: "number" },
    { id: "equity", label: "Patrimonio", type: "number" },
    { id: "rev", label: "Ingresos", type: "number" },
    { id: "cogs", label: "Costo de ventas", type: "number" },
    { id: "ni", label: "Utilidad neta", type: "number", help: "Todos los campos son opcionales; solo se calcula cada razón cuyos datos estén disponibles." }
  ],
  example: {
    values: { CA: "500000", CL: "250000", inv: "100000", TA: "1000000", TL: "600000", equity: "400000", rev: "800000", cogs: "500000", ni: "80000" },
    expect: ["Razón corriente = 2", "Razón deuda a activos = 60%"],
    note: "Ejemplo: empresa con activos corrientes de 500,000, pasivos corrientes de 250,000 y los datos de activos e ingresos indicados."
  },
  invalid: { values: { CA: "", CL: "", inv: "", TA: "", TL: "", equity: "", rev: "", cogs: "", ni: "" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "depreciation", "price-elasticity"]
};

export function solve(input) {
  const v = {};
  for (const [id, label, opts] of FIELDS) v[id] = num(input, id, label, { ...opts, optional: true });
  const computed = [];
  const skipped = [];
  for (const d of RATIOS) {
    if (d.need.some((k) => v[k] === null)) {
      skipped.push(`${d.label} (datos incompletos)`);
      continue;
    }
    if (v[d.den] === 0) {
      skipped.push(`${d.label} (denominador cero)`);
      continue;
    }
    computed.push({ d, x: d.f(v) });
  }
  if (computed.length === 0) fail("Introduce datos suficientes para calcular al menos una razón financiera, como los activos corrientes y los pasivos corrientes.", "CA");
  const disp = (d, x) => (d.pct ? `${fmt(x * 100, 4)}%` : fmt(x, 4));
  const results = computed.map(({ d, x }) => ({ label: d.label, value: disp(d, x), text: `${d.label} = ${disp(d, x)}` }));
  const steps = computed.map(({ d, x }) => ({ text: `${d.label}:`, tex: `${d.sym} = ${d.sub(v)} = ${d.pct ? `${ntex(x * 100, 6)}\\%` : ntex(x, 6)}` }));
  const rows = computed.map(({ d, x }) => [d.label, disp(d, x), { tex: d.sym }, d.interp(x, v)]);
  const blocks = [{ type: "table", caption: "Razones calculadas", head: ["Razón", "Valor", "Fórmula", "Interpretación"], rows }];
  if (skipped.length > 0) blocks.push({ type: "note", text: `No calculadas: ${skipped.join("، ")}.`, tone: "warn" });
  return {
    results,
    steps,
    copy: results.map((r) => `${r.label} = ${r.value}`).join("، "),
    blocks
  };
}
