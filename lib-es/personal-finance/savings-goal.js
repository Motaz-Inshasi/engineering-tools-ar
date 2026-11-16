import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MAX_MONTHS = 1200;
const isInt = (x) => Math.abs(x - Math.round(x)) < 1e-9;

const balanceAt = (PV, PMT, i, m) => (i === 0 ? PV + PMT * m : PV * Math.pow(1 + i, m) + (PMT * (Math.pow(1 + i, m) - 1)) / i);

const monthsText = (m) => {
  const y = Math.floor(m / 12);
  const r = m - y * 12;
  const yt = y === 0 ? "" : y === 1 ? "un año" : y === 2 ? "dos años" : y <= 10 ? `${y} años` : `${y} años`;
  const rt = r === 0 ? "" : r === 1 ? "un mes" : r === 2 ? "dos meses" : r <= 10 ? `${r} meses` : `${r} meses`;
  if (!yt && !rt) return "0 meses";
  if (!yt) return rt;
  if (!rt) return yt;
  return `${yt} y ${rt}`;
};

const yearRows = (PV, PMT, i, months) => {
  const marks = [];
  for (let m = 12; m < months; m += 12) marks.push(m);
  if (months > 0) marks.push(months);
  return marks.map((m) => {
    const b = balanceAt(PV, PMT, i, m);
    const dep = PV + PMT * m;
    return [fmt(m / 12, 4), money(b), money(dep), money(b - dep)];
  });
};

const yearTable = (PV, PMT, i, months) => ({
  type: "table",
  caption: "Evolución del saldo al final de cada año",
  head: ["Plazo (en años)", "Saldo", "Total depositado", "Interés acumulado"],
  rows: yearRows(PV, PMT, i, months)
});

export const meta = {
  description: "Calcule el depósito mensual necesario para alcanzar una meta financiera con una rentabilidad anual esperada y un plazo determinado, o calcule el plazo necesario si conoce el depósito mensual, con una tabla del saldo anual.",
  keywords: ["ahorro", "meta financiera", "depósito mensual", "PMT", "ahorro", "ahorros", "savings goal"],
  formulas: [
    { label: "Depósito mensual necesario (al final de cada mes)", tex: "PMT = \\frac{(FV - PV(1+i)^N)\\, i}{(1+i)^N - 1},\\qquad i = \\frac{r}{12}" },
    { label: "Saldo después de N meses", tex: "FV = PV(1+i)^N + PMT\\,\\frac{(1+i)^N - 1}{i}" },
    { label: "Número de meses para alcanzar la meta", tex: "N = \\frac{\\ln\\left(\\frac{FV\\, i + PMT}{PV\\, i + PMT}\\right)}{\\ln(1+i)}" }
  ],
  inputs: [
    { id: "mode", label: "¿Qué desea calcular?", type: "select", default: "forward", options: [["forward", "Depósito mensual necesario"], ["reverse", "Plazo necesario con un depósito mensual fijo"]] },
    { id: "target", label: "Monto objetivo", type: "number", default: "100000" },
    { id: "current", label: "Ahorros actuales", type: "number", default: "10000" },
    { id: "rate", label: "Rentabilidad anual esperada", unit: "%", type: "number", default: "5", help: "Introduzca 0 si no espera rentabilidad." },
    { id: "time", label: "Plazo disponible", type: "number", default: "10", when: { mode: ["forward"] } },
    { id: "timeUnit", label: "Unidad del plazo", type: "select", default: "years", options: [["years", "años"], ["months", "meses"]], when: { mode: ["forward"] } },
    { id: "deposit", label: "depósito mensual", type: "number", default: "500", when: { mode: ["reverse"] }, help: "Se deposita al final de cada mes." }
  ],
  example: { values: { mode: "forward", target: "100000", current: "10000", rate: "5", time: "10", timeUnit: "years", deposit: "500" }, expect: ["537.92"], note: "Ejemplo: meta de 100000 desde 10000 con una rentabilidad del 5% anual durante 10 años." },
  invalid: { values: { mode: "reverse", target: "100000", current: "10000", rate: "0", time: "10", timeUnit: "years", deposit: "0" } },
  related: ["compound-interest", "loan-amortization", "budget-planner", "zakat"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Tipo de cálculo", ["forward", "reverse"], "forward");
  const target = num(input, "target", "Monto objetivo", { positive: true });
  const current = num(input, "current", "Ahorros actuales", { nonNegative: true, default: 0 });
  const rate = num(input, "rate", "Rentabilidad anual", { nonNegative: true, max: 100, default: 0 });
  const i = rate / 1200;
  return mode === "reverse" ? reverse(input, target, current, i) : forward(input, target, current, i);
}

function forward(input, target, current, i) {
  const unit = choice(input, "timeUnit", "Unidad del plazo", ["years", "months"], "years");
  const t = num(input, "time", "plazo", { positive: true });
  const n = unit === "years" ? t * 12 : t;
  if (!isInt(n)) fail("El plazo debe dar un número entero de meses, por ejemplo 2.5 años o 30 meses.", "time");
  if (n > MAX_MONTHS) fail("El plazo no debe superar 100 años.", "time");
  const months = Math.round(n);
  const pmt = balanceAt(current, 0, i, months) >= target ? 0
    : i === 0 ? (target - current) / months
    : ((target - current * Math.pow(1 + i, months)) * i) / (Math.pow(1 + i, months) - 1);
  const reached = pmt === 0;
  const deposited = current + pmt * months;
  const final = balanceAt(current, pmt, i, months);
  const interest = final - deposited;

  const steps = [{ text: "Conversión del plazo a meses y tasa mensual:", tex: `N = ${months},\\qquad i = \\frac{r}{12} = ${ntex(i, 6)}` }];
  if (reached) steps.push(current >= target ? "Los ahorros actuales alcanzan el monto objetivo, por lo que no se necesitan depósitos." : "Su saldo actual crece hasta la meta sin depósitos adicionales.");
  else if (i === 0) steps.push({ text: "Sin rentabilidad, el depósito mensual es la diferencia dividida entre el número de meses:", tex: `PMT = \\frac{FV - PV}{N} = \\frac{${ntex(target)} - ${ntex(current)}}{${months}} = ${ntex(pmt, 8)}` });
  else steps.push({ text: "Depósito mensual necesario:", tex: `PMT = \\frac{(FV - PV(1+i)^N)\\, i}{(1+i)^N - 1} = \\frac{(${ntex(target)} - ${ntex(current)} \\times (1+${ntex(i, 6)})^{${months}}) \\times ${ntex(i, 6)}}{(1+${ntex(i, 6)})^{${months}} - 1} = ${ntex(pmt, 8)}` });

  return {
    results: [
      { label: "Depósito mensual necesario", value: reached ? "No se necesita depósito" : money(pmt) },
      { label: "plazo", value: monthsText(months) },
      { label: "Total que depositará", value: money(deposited) },
      { label: "Interés total esperado", value: money(interest) },
      { label: "Saldo al final del plazo", value: money(final) }
    ],
    steps,
    copy: reached
      ? `La meta se alcanza sin depósitos; saldo esperado: ${money(final)}`
      : `Depósito mensual necesario: ${money(pmt)} durante ${monthsText(months)}; interés total esperado: ${money(interest)}`,
    blocks: [yearTable(current, pmt, i, months)]
  };
}

function reverse(input, target, current, i) {
  const deposit = num(input, "deposit", "depósito mensual", { nonNegative: true });
  let real = 0;
  if (current < target) {
    if (i === 0) {
      if (!(deposit > 0)) fail("El depósito mensual debe ser mayor que cero para alcanzar la meta sin rentabilidad.", "deposit");
      real = (target - current) / deposit;
    } else {
      const denom = current * i + deposit;
      if (!(denom > 0)) fail("No se puede alcanzar la meta con un depósito cero y ahorros actuales cero.", "deposit");
      real = Math.log((target * i + deposit) / denom) / Math.log(1 + i);
    }
  }
  const months = Math.ceil(real - 1e-9);
  if (months > MAX_MONTHS) fail("El plazo necesario supera los 100 años; aumente el monto del depósito.", "deposit");
  const final = balanceAt(current, deposit, i, months);
  const deposited = current + deposit * months;
  const interest = final - deposited;

  const steps = [];
  if (months === 0) steps.push("Los ahorros actuales ya alcanzan el monto objetivo.");
  else {
    steps.push(i === 0
      ? { text: "Sin rentabilidad, el número de meses es la diferencia dividida entre el depósito:", tex: `N = \\frac{FV - PV}{PMT} = \\frac{${ntex(target)} - ${ntex(current)}}{${ntex(deposit)}} = ${ntex(real, 6)}` }
      : { text: "Despejando N en la ecuación del saldo:", tex: `N = \\frac{\\ln\\left(\\frac{FV\\, i + PMT}{PV\\, i + PMT}\\right)}{\\ln(1+i)} = ${ntex(real, 6)}` });
    steps.push({ text: "Redondeamos N hacia arriba porque el depósito se hace mensualmente:", tex: `N = \\lceil ${ntex(real, 6)} \\rceil = ${months}` });
  }

  return {
    results: [
      { label: "Plazo necesario", value: months === 0 ? "La meta ya se alcanza" : `${months} meses (${monthsText(months)})` },
      { label: "Saldo al alcanzar la meta", value: money(final) },
      { label: "Total que depositará", value: money(deposited) },
      { label: "Interés total", value: money(interest) }
    ],
    steps,
    copy: months === 0
      ? "La meta ya se alcanza"
      : `Necesita ${months} meses (${monthsText(months)}) para llegar a ${money(target)} con un depósito de ${money(deposit)} mensuales`,
    blocks: months === 0 ? [] : [yearTable(current, deposit, i, months)]
  };
}
