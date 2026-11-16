import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Calcula la depreciación anual de un activo por el método de línea recta, de saldo decreciente o de suma de los dígitos de los años, con una tabla de depreciación, depreciación acumulada y valor en libros, sin bajar del valor de rescate.",
  keywords: ["depreciación", "depreciación", "depreciation", "línea recta", "saldo decreciente", "suma de los dígitos de los años", "valor en libros", "valor de rescate"],
  formulas: [
    { label: "línea recta", tex: "D = \\frac{C-S}{n}" },
    { label: "suma de los dígitos de los años", tex: "D_y = \\frac{n-y+1}{n(n+1)/2}\\,(C-S)" },
    { label: "saldo decreciente", tex: "D_y = \\max\\left(B_{y-1}\\frac{k}{n},\\ \\frac{B_{y-1}-S}{n-y+1}\\right)" }
  ],
  inputs: [
    { id: "cost", label: "Costo del activo C", type: "number", default: "10000" },
    { id: "salvage", label: "Valor de rescate S", type: "number", default: "1000" },
    { id: "life", label: "Vida útil n", unit: "años", type: "number", default: "5", help: "Entero de 1 a 100." },
    { id: "method", label: "Método de depreciación", type: "select", default: "sl", options: [["sl", "línea recta"], ["db", "saldo decreciente"], ["syd", "suma de los dígitos de los años"]] },
    { id: "factor", label: "Factor de saldo decreciente k", type: "select", default: "2", options: [["2", "Doble (2)"], ["1.5", "1.5"]], when: { method: ["db"] } }
  ],
  example: { values: { cost: "10000", salvage: "1000", life: "5", method: "sl", factor: "2" }, expect: ["1,800.00"], note: "Ejemplo: activo de costo 10,000, valor de rescate 1,000 y vida útil de 5 años por línea recta." },
  invalid: { values: { cost: "1000", salvage: "2000", life: "5", method: "sl", factor: "2" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const cost = num(input, "cost", "Costo del activo", { positive: true });
  const salvage = num(input, "salvage", "valor de rescate", { nonNegative: true });
  const n = num(input, "life", "Vida útil", { integer: true, min: 1, max: 100 });
  const method = choice(input, "method", "Método de depreciación", ["sl", "db", "syd"], "sl");
  const factor = Number(choice(input, "factor", "Factor de saldo decreciente", ["2", "1.5"], "2"));
  if (salvage > cost) fail("El valor de rescate no puede superar el costo del activo.", "salvage");
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
      kind = useSl ? "Línea recta" : "Decreciente";
    }
    bv = Math.max(bv - d, salvage);
    acc += d;
    schedule.push({ y, d, acc, bv, kind });
  }
  const withKind = method === "db";
  const rows = schedule.map((s) => (withKind ? [fmt(s.y), money(s.d), money(s.acc), money(s.bv), s.kind] : [fmt(s.y), money(s.d), money(s.acc), money(s.bv)]));
  const head = ["Año", "depreciación", "Acumulada", "valor en libros"];
  if (withKind) head.push("Método");
  const first = schedule[0].d;
  const last = schedule[n - 1].bv;
  const results = [
    { label: "Depreciación del primer año", value: money(first) },
    { label: "Depreciación total", value: money(base) },
    { label: "Valor en libros al final de la vida útil", value: money(last) }
  ];
  if (method === "sl") results.unshift({ label: "Cuota anual fija", value: money(base / n) });
  const steps = [];
  if (method === "sl") {
    steps.push({ text: "Línea recta:", tex: `D = \\frac{C-S}{n} = \\frac{${ntex(cost)} - ${ntex(salvage)}}{${n}} = ${ntex(base / n, 8)}` });
  } else if (method === "syd") {
    steps.push({ text: "Suma de los dígitos de los años:", tex: `\\sum = \\frac{n(n+1)}{2} = \\frac{${n}(${n}+1)}{2} = ${ntex(sumYears)}` });
    steps.push({ text: "Depreciación del primer año:", tex: `D_1 = \\frac{n}{\\sum}(C-S) = \\frac{${n}}{${ntex(sumYears)}} \\times ${ntex(base)} = ${ntex(first, 8)}` });
  } else {
    steps.push({ text: "Tasa de saldo decreciente:", tex: `\\text{rate} = \\frac{k}{n} = \\frac{${factor}}{${n}} = ${ntex(factor / n, 6)}` });
    steps.push({ text: "Depreciación del primer año:", tex: `D_1 = C \\times \\text{rate} = ${ntex(cost)} \\times ${ntex(factor / n, 6)} = ${ntex(first, 8)}` });
    steps.push("Cada año tomamos el mayor entre el cargo decreciente y el cargo de línea recta sobre el valor restante, sin superar el valor de rescate.");
  }
  const copy = method === "sl"
    ? `Cuota anual fija: ${money(base / n)}, valor en libros al final de la vida útil: ${money(last)}`
    : `Depreciación del primer año: ${money(first)}, valor en libros al final de la vida útil: ${money(last)}`;
  const blocks = [{ type: "table", caption: "Tabla de depreciación anual", head, rows }];
  if (method === "db") {
    blocks.push(switchYear === null
      ? { type: "note", text: "El cálculo no necesitó cambiar a línea recta, y el valor en libros no baja del valor de rescate." }
      : { type: "note", text: `El cálculo cambia a línea recta a partir del año ${switchYear}, porque la línea recta sobre el valor restante es mayor; así, el valor en libros llega al valor de rescate al final de la vida útil sin bajar de él.` });
  }
  return { results, steps, copy, blocks };
}
