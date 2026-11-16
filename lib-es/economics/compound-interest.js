import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isInt = (x) => Math.abs(x - Math.round(x)) < 1e-9;

const FREQ = [["1", "Anual (1)"], ["2", "Semestral (2)"], ["4", "Trimestral (4)"], ["12", "Mensual (12)"], ["365", "Diario (365)"], ["continuous", "Continua"]];

export const meta = {
  description: "Calcula el valor futuro de un monto con interés simple, compuesto o continuo, con aportes periódicos opcionales, el interés total, la tasa de interés efectiva anual, una tabla del saldo anual y una gráfica.",
  keywords: ["interés compuesto", "interés simple", "compound interest", "valor futuro", "FV", "inversión", "interés continuo"],
  formulas: [
    { label: "Interés simple", tex: "FV = P(1 + rt)" },
    { label: "Interés compuesto con aportes periódicos", tex: "FV = P\\left(1+\\frac{r}{n}\\right)^{nt} + PMT\\cdot\\frac{\\left(1+\\frac{r}{n}\\right)^{nt}-1}{r/n}" },
    { label: "Interés continuo", tex: "FV = Pe^{rt}" }
  ],
  inputs: [
    { id: "P", label: "Capital inicial P", type: "number", default: "1000" },
    { id: "r", label: "Tasa de interés anual", unit: "%", type: "number", default: "5" },
    { id: "t", label: "Plazo", unit: "años", type: "number", default: "10", help: "Puede ser fraccionario, con un máximo de 100 años." },
    { id: "mode", label: "Tipo de interés", type: "select", default: "compound", options: [["simple", "Simple"], ["compound", "Compuesto"]] },
    { id: "freq", label: "Número de capitalizaciones al año", type: "select", default: "12", options: FREQ, when: { mode: ["compound"] } },
    { id: "pmt", label: "Aporte periódico PMT", type: "number", default: "0", when: { mode: ["compound"] }, help: "Se suma al final de cada período de capitalización. No está disponible con interés continuo; con un plazo fraccionario, el número de períodos debe ser entero." }
  ],
  example: { values: { P: "1000", r: "5", t: "10", mode: "compound", freq: "12", pmt: "0" }, expect: ["1,647.01"], note: "Ejemplo: 1000 a una tasa de 5% durante 10 años con capitalización mensual." },
  invalid: { values: { P: "1000", r: "5", t: "10", mode: "compound", freq: "continuous", pmt: "100" } },
  related: ["loan-amortization", "npv-irr", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const P = num(input, "P", "Capital inicial", { nonNegative: true });
  const r = num(input, "r", "Tasa de interés", { nonNegative: true, max: 1000 });
  const t = num(input, "t", "Plazo", { positive: true, max: 100 });
  const mode = choice(input, "mode", "Tipo de interés", ["simple", "compound"], "compound");
  const freq = choice(input, "freq", "Número de capitalizaciones", ["1", "2", "4", "12", "365", "continuous"], "12");
  const pmt = num(input, "pmt", "Aporte periódico", { nonNegative: true, default: 0 });
  const rate = r / 100;
  const simple = mode === "simple";
  const continuous = !simple && freq === "continuous";
  const n = simple || continuous ? 1 : Number(freq);
  const contributing = !simple && !continuous && pmt > 0;
  if (continuous && pmt > 0) fail("El aporte periódico no es compatible con el interés continuo. Deja el aporte en cero o elige un número específico de capitalizaciones.", "pmt");
  const N = n * t;
  if (contributing && !isInt(N)) fail(`El número de períodos n × t = ${fmt(N)} debe ser entero cuando hay un aporte periódico.`, "t");
  const i = rate / n;
  const balance = (y) => {
    if (simple) return P * (1 + rate * y);
    if (continuous) return P * Math.exp(rate * y);
    const k = n * y;
    const g = Math.pow(1 + i, k);
    return P * g + (i === 0 ? pmt * k : (pmt * (g - 1)) / i);
  };
  const FV = balance(t);
  const contributed = contributing ? pmt * N : 0;
  const totalContrib = P + contributed;
  const interest = FV - totalContrib;
  const ear = simple ? rate : continuous ? Math.exp(rate) - 1 : Math.pow(1 + i, n) - 1;
  const whole = Math.floor(t + 1e-9);
  const ys = [];
  for (let y = 1; y <= whole; y++) ys.push(y);
  if (t - whole > 1e-9) ys.push(t);
  const rows = ys.map((y) => {
    const b = balance(y);
    const contribY = contributing ? pmt * n * y : 0;
    return [fmt(y, 6), money(b), money(b - P - contribY)];
  });
  const points = [[0, P], ...ys.map((y) => [y, balance(y)])];
  const steps = [];
  if (simple) {
    steps.push({ text: "El interés simple se calcula solo sobre el capital inicial:", tex: `FV = P(1 + rt) = ${ntex(P)} \\times (1 + ${ntex(rate, 6)} \\times ${ntex(t)}) = ${ntex(FV, 8)}` });
  } else if (continuous) {
    steps.push({ text: "Capitalización continua:", tex: `FV = Pe^{rt} = ${ntex(P)} \\times e^{${ntex(rate, 6)} \\times ${ntex(t)}} = ${ntex(FV, 8)}` });
  } else {
    const contribTex = !contributing ? "" : i === 0 ? ` + ${ntex(pmt)} \\times ${ntex(N)}` : ` + ${ntex(pmt)} \\times \\frac{(1+${ntex(i, 6)})^{${ntex(N)}}-1}{${ntex(i, 6)}}`;
    steps.push({ text: "Tasa de interés por período y número de períodos:", tex: `i = \\frac{r}{n} = \\frac{${ntex(rate, 6)}}{${n}} = ${ntex(i, 6)},\\qquad N = nt = ${n} \\times ${ntex(t)} = ${ntex(N)}` });
    steps.push({ text: "Valor futuro:", tex: `FV = P(1+i)^N${contributing ? " + PMT\\frac{(1+i)^N-1}{i}" : ""} = ${ntex(P)} \\times (1+${ntex(i, 6)})^{${ntex(N)}}${contribTex} = ${ntex(FV, 8)}` });
  }
  steps.push({ text: "Interés total = valor futuro − total aportado:", tex: `${ntex(FV, 8)} - ${ntex(totalContrib, 8)} = ${ntex(interest, 8)}` });
  return {
    results: [
      { label: "Valor futuro FV", value: money(FV), text: `FV = ${money(FV)}` },
      { label: "Total aportado", value: money(totalContrib) },
      { label: "Interés total", value: money(interest) },
      { label: "Tasa de interés efectiva anual", value: `${fmt(ear * 100, 5)}%` }
    ],
    steps,
    copy: `Valor futuro: ${money(FV)}, interés total: ${money(interest)}, tasa efectiva anual: ${fmt(ear * 100, 5)}%`,
    blocks: [
      { type: "table", caption: "Saldo al final de cada año", head: ["Año", "Saldo", "Interés acumulado hasta la fecha"], rows },
      { type: "plot", title: "Crecimiento del saldo en el tiempo", xLabel: "Años", yLabel: "Saldo", includeZero: true, series: [{ name: "Saldo", points, line: true }] }
    ]
  };
}
