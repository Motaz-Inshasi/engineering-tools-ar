import { fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LO = -0.99;
const HI = 10;
const GRID = 4000;
const NO_PAYBACK = "La inversión no se recupera durante el plazo";

const npvAt = (cf, r) => {
  let s = 0;
  let d = 1;
  for (let t = 0; t < cf.length; t++) {
    if (t > 0) d *= 1 + r;
    s += cf[t] / d;
  }
  return s;
};

function bisect(cf, a, b) {
  let fa = npvAt(cf, a);
  for (let k = 0; k < 200; k++) {
    const m = (a + b) / 2;
    const fm = npvAt(cf, m);
    if (fm === 0) return m;
    if (fa * fm < 0) b = m;
    else {
      a = m;
      fa = fm;
    }
  }
  return (a + b) / 2;
}

function findIrr(cf) {
  let prevR = LO;
  let prevV = npvAt(cf, LO);
  let root = null;
  let changes = 0;
  for (let k = 1; k <= GRID; k++) {
    const r = LO + ((HI - LO) * k) / GRID;
    const v = npvAt(cf, r);
    if (Number.isFinite(prevV) && Number.isFinite(v) && prevV * v < 0) {
      changes++;
      if (root === null) root = bisect(cf, prevR, r);
    }
    if (Number.isFinite(v) && v === 0 && root === null) root = r;
    prevR = r;
    prevV = v;
  }
  return { root, changes };
}

function payback(vals) {
  let cum = 0;
  for (let t = 0; t < vals.length; t++) {
    const prev = cum;
    cum += vals[t];
    if (cum >= 0 && (t === 0 || prev < 0)) return t === 0 ? 0 : t - 1 + -prev / vals[t];
  }
  return null;
}

export const meta = {
  description: "Calcula el valor presente neto, la tasa interna de retorno, el índice de rentabilidad y el período de recuperación simple y descontado de una serie de flujos de caja, con una tabla anual de valores presentes y acumulados.",
  keywords: ["valor presente neto", "NPV", "tasa interna de retorno", "IRR", "período de recuperación", "payback", "índice de rentabilidad", "estudio de factibilidad"],
  formulas: [
    { label: "valor presente neto", tex: "NPV = \\sum_{t=0}^{n}\\frac{CF_t}{(1+r)^t}" },
    { label: "tasa interna de retorno", tex: "NPV(IRR) = 0" },
    { label: "índice de rentabilidad", tex: "PI = \\frac{\\sum_{t=1}^{n} CF_t/(1+r)^t}{|CF_0|}" }
  ],
  inputs: [
    { id: "r", label: "Tasa de descuento", unit: "%", type: "number", default: "10" },
    { id: "cf", label: "Flujos de caja CF0, CF1, ...", type: "textarea", rows: 3, default: "-1000 300 400 500", placeholder: "-1000 300 400 500", help: "Empieza con el flujo inicial CF0 (generalmente negativo) y luego los flujos anuales. Separa los valores con un espacio o una coma." }
  ],
  example: { values: { r: "10", cf: "-1000 300 400 500" }, expect: ["NPV = -21.04", "IRR = 8.896%"], note: "Ejemplo: una inversión de 1000 genera 300, 400 y 500 en los tres años siguientes, con una tasa de descuento de 10%." },
  invalid: { values: { r: "10", cf: "-1000" } },
  related: ["compound-interest", "loan-amortization", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const rPct = num(input, "r", "Tasa de descuento", { min: -99, max: 1000 });
  const cf = numList(input, "cf", "Flujos de caja", { min: 2, max: 200 });
  if (cf[0] === 0) fail("El flujo inicial CF0 no puede ser cero.", "cf");
  const rate = rPct / 100;
  const npv = npvAt(cf, rate);
  if (!Number.isFinite(npv)) fail("No se puede calcular el valor presente neto con esta tasa; prueba con una tasa mayor.", "r");
  const df = cf.map((_, t) => 1 / Math.pow(1 + rate, t));
  const pv = cf.map((c, t) => c * df[t]);
  const pvFuture = pv.slice(1).reduce((s, x) => s + x, 0);
  const PI = pvFuture / Math.abs(cf[0]);
  const cum = [];
  const cumPv = [];
  let a = 0;
  let b = 0;
  cf.forEach((c, t) => {
    a += c;
    b += pv[t];
    cum.push(a);
    cumPv.push(b);
  });
  const pb = payback(cf);
  const dpb = payback(pv);
  const { root, changes } = findIrr(cf);
  const irrText = root === null ? "Indefinida" : `${fmt(root * 100, 4)}%`;
  const pbText = pb === null ? NO_PAYBACK : `${fmt(pb, 4)} años`;
  const dpbText = dpb === null ? NO_PAYBACK : `${fmt(dpb, 4)} años`;
  const terms = cf.map((c, t) => (t === 0 ? ntex(c) : `\\frac{${ntex(c)}}{(1+${ntex(rate, 6)})^{${t}}}`)).join(" + ");
  const steps = [
    { text: "Valor presente neto = suma de los valores presentes de los flujos:", tex: `NPV = ${terms} = ${ntex(npv, 8)}` },
    "La TIR es la tasa que hace VPN = 0. Buscamos el primer cambio de signo del VPN en el rango de −99% a 1000% y luego reducimos el intervalo por bisección.",
    "Período de recuperación: último año en que el saldo acumulado es negativo, más la fracción del año siguiente.",
    `Índice de rentabilidad = ${ntex(pvFuture, 8)} ÷ ${ntex(Math.abs(cf[0]), 8)} = ${fmt(PI, 4)}`
  ];
  const blocks = [
    { type: "table", caption: "Tabla de valores presentes y acumulados", head: ["Año", "Flujo de caja", "Factor de descuento", "Valor presente", "Acumulado", "Acumulado descontado"], rows: cf.map((c, t) => [fmt(t), money(c), fmt(df[t], 6), money(pv[t]), money(cum[t]), money(cumPv[t])]) }
  ];
  if (changes === 0) blocks.push({ type: "note", text: "No hay cambio de signo del VPN en el rango de −99% a 1000%, así que no puede definirse una TIR.", tone: "warn" });
  if (changes > 1) blocks.push({ type: "note", text: "Hay más de una TIR para estos flujos; se muestra la menor." });
  return {
    results: [
      { label: "Valor presente neto (VPN)", value: money(npv), text: `NPV = ${money(npv)}` },
      { label: "Tasa interna de retorno (TIR)", value: irrText, text: `IRR = ${irrText}` },
      { label: "período de recuperación", value: pbText },
      { label: "Período de recuperación descontado", value: dpbText },
      { label: "Índice de rentabilidad (IR)", value: fmt(PI, 4) }
    ],
    steps,
    copy: `VPN = ${money(npv)}, TIR = ${irrText}, índice de rentabilidad IR = ${fmt(PI, 4)}`,
    blocks
  };
}
