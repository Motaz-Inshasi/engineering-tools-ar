import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Calcula la cuota periódica fija de un préstamo, el total pagado y el interés total, con una tabla anual que muestra el interés pagado, el capital amortizado y el saldo restante, y una gráfica de la reducción del saldo.",
  keywords: ["préstamo", "tabla de amortización", "amortization", "cuota mensual", "interés del préstamo", "pago de deuda", "préstamo hipotecario"],
  formulas: [
    { label: "Cuota fija", tex: "PMT = \\frac{P\\,i}{1-(1+i)^{-N}},\\qquad i=\\frac{r}{m},\\quad N=mt" },
    { label: "Saldo después del pago k", tex: "B_k = B_{k-1}(1+i) - PMT" }
  ],
  inputs: [
    { id: "P", label: "Capital del préstamo P", type: "number", default: "100000" },
    { id: "r", label: "Tasa de interés anual", unit: "%", type: "number", default: "6" },
    { id: "t", label: "Plazo del préstamo", unit: "años", type: "number", default: "30", help: "El plazo × el número de pagos al año debe dar un número entero de pagos, con un máximo de 100 años." },
    { id: "freq", label: "Número de pagos al año", type: "select", default: "12", options: [["12", "Mensual (12)"], ["4", "Trimestral (4)"], ["2", "Semestral (2)"], ["1", "Anual (1)"]] }
  ],
  example: { values: { P: "100000", r: "6", t: "30", freq: "12" }, expect: ["599.55"], note: "Ejemplo: préstamo hipotecario de 100,000 con interés de 6% durante 30 años y cuotas mensuales." },
  invalid: { values: { P: "100000", r: "6", t: "1.01", freq: "12" } },
  related: ["compound-interest", "npv-irr", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const P = num(input, "P", "Capital del préstamo", { positive: true });
  const r = num(input, "r", "Tasa de interés", { nonNegative: true, max: 1000 });
  const t = num(input, "t", "Plazo del préstamo", { positive: true, max: 100 });
  const m = Number(choice(input, "freq", "Número de pagos al año", ["12", "4", "2", "1"], "12"));
  const Nraw = t * m;
  if (Math.abs(Nraw - Math.round(Nraw)) > 1e-9) fail(`El número de pagos (${fmt(Nraw)}) debe ser entero; ajusta el plazo en años.`, "t");
  const N = Math.round(Nraw);
  const i = r / 100 / m;
  const pmt = i === 0 ? P / N : (P * i) / (1 - Math.pow(1 + i, -N));
  const total = pmt * N;
  const interest = total - P;
  const rows = [];
  const points = [[0, P]];
  let bal = P;
  let yInt = 0;
  let yPri = 0;
  for (let k = 1; k <= N; k++) {
    const intr = bal * i;
    const pri = k === N ? bal : pmt - intr;
    bal -= pri;
    yInt += intr;
    yPri += pri;
    if (k % m === 0 || k === N) {
      rows.push([fmt(Math.ceil(k / m)), money(yInt), money(yPri), money(Math.max(0, bal))]);
      points.push([k / m, Math.max(0, bal)]);
      yInt = 0;
      yPri = 0;
    }
  }
  const steps = [
    { text: "Tasa de interés por pago:", tex: `i = \\frac{r}{m} = \\frac{${ntex(r / 100, 6)}}{${m}} = ${ntex(i, 6)}` },
    { text: "Número total de pagos:", tex: `N = mt = ${m} \\times ${ntex(t)} = ${N}` },
    i === 0
      ? { text: "Sin interés, el capital se divide entre el número de pagos:", tex: `PMT = \\frac{P}{N} = \\frac{${ntex(P)}}{${N}} = ${ntex(pmt, 8)}` }
      : { text: "Cuota fija:", tex: `PMT = \\frac{P\\,i}{1-(1+i)^{-N}} = \\frac{${ntex(P)} \\times ${ntex(i, 6)}}{1-(1+${ntex(i, 6)})^{-${N}}} = ${ntex(pmt, 8)}` },
    { text: "Total pagado e interés total:", tex: `${ntex(pmt, 8)} \\times ${N} = ${ntex(total, 8)},\\qquad ${ntex(total, 8)} - ${ntex(P)} = ${ntex(interest, 8)}` }
  ];
  return {
    results: [
      { label: "Cuota periódica", value: money(pmt), text: `Cuota ${money(pmt)}` },
      { label: "Total pagado", value: money(total) },
      { label: "Interés total", value: money(interest) },
      { label: "Número de pagos", value: String(N) }
    ],
    steps,
    copy: `Cuota: ${money(pmt)} por pago; total pagado: ${money(total)}; interés total: ${money(interest)}`,
    blocks: [
      { type: "table", caption: "Tabla anual de pagos", head: ["Año", "Interés pagado", "Capital amortizado", "Saldo restante"], rows: [...rows, ["Total", money(interest), money(P), "0.00"]] },
      { type: "note", text: "La cuota es fija durante todo el plazo, así que al inicio la parte de interés es mayor y, con el tiempo, aumenta la parte de capital. Las cifras están redondeadas a dos decimales." },
      { type: "plot", title: "Saldo restante a lo largo del tiempo", xLabel: "Años", yLabel: "Saldo", includeZero: true, series: [{ name: "Saldo restante", points, line: true }] }
    ]
  };
}
