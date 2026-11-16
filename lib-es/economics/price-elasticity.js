import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Calcula el coeficiente de elasticidad precio de la demanda a partir de dos precios y dos cantidades, con el punto medio o con la razón simple; clasifica la elasticidad y muestra el efecto del cambio de precio sobre el ingreso total.",
  keywords: ["elasticidad precio", "price elasticity", "elasticidad de la demanda", "Ingreso total", "elástica", "inelástica", "elasticity"],
  formulas: [
    { label: "Coeficiente de elasticidad", tex: "E = \\frac{\\%\\Delta Q}{\\%\\Delta P}" },
    { label: "Punto medio", tex: "\\%\\Delta Q = \\frac{Q_2-Q_1}{(Q_1+Q_2)/2},\\qquad \\%\\Delta P = \\frac{P_2-P_1}{(P_1+P_2)/2}" }
  ],
  inputs: [
    { id: "P1", label: "Precio inicial P1", type: "number", default: "10" },
    { id: "Q1", label: "Cantidad inicial Q1", type: "number", default: "100" },
    { id: "P2", label: "Precio final P2", type: "number", default: "12" },
    { id: "Q2", label: "Cantidad final Q2", type: "number", default: "80" },
    { id: "method", label: "Método de cálculo", type: "select", default: "mid", options: [["mid", "Punto medio (arco)"], ["simple", "Razón simple"]], help: "El punto medio da el mismo resultado sin importar la dirección del cambio." }
  ],
  example: { values: { P1: "10", Q1: "100", P2: "12", Q2: "80", method: "mid" }, expect: ["-1.222", "elástica"], note: "Ejemplo: el precio sube de 10 a 12 y la cantidad baja de 100 a 80." },
  invalid: { values: { P1: "10", Q1: "100", P2: "10", Q2: "80", method: "mid" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "depreciation", "financial-ratios"]
};

export function solve(input) {
  const P1 = num(input, "P1", "Precio inicial", { positive: true });
  const Q1 = num(input, "Q1", "Cantidad inicial", { nonNegative: true });
  const P2 = num(input, "P2", "Precio final", { positive: true });
  const Q2 = num(input, "Q2", "Cantidad final", { nonNegative: true });
  const method = choice(input, "method", "Método de cálculo", ["mid", "simple"], "mid");
  if (P1 === P2) fail("El precio no cambió, así que no puede calcularse la elasticidad porque la división sería entre cero.", "P2");
  if (method === "simple" && Q1 === 0) fail("La cantidad inicial es cero, y la razón simple se calcula sobre la cantidad inicial.", "Q1");
  if (method === "mid" && Q1 + Q2 === 0) fail("Ambas cantidades son cero, así que no puede calcularse la variación porcentual media de la cantidad.", "Q2");
  const mid = method === "mid";
  const dP = P2 - P1;
  const dQ = Q2 - Q1;
  const baseP = mid ? (P1 + P2) / 2 : P1;
  const baseQ = mid ? (Q1 + Q2) / 2 : Q1;
  const pctP = dP / baseP;
  const pctQ = dQ / baseQ;
  const E = pctQ / pctP;
  const a = Math.abs(E);
  let cls;
  if (a < 1e-12) cls = "perfectamente inelástica";
  else if (Math.abs(a - 1) < 1e-9) cls = "de elasticidad unitaria";
  else if (a > 1) cls = "elástica";
  else cls = "inelástica";
  const R1 = P1 * Q1;
  const R2 = P2 * Q2;
  const dR = R2 - R1;
  const effect = Math.abs(dR) < 1e-9
    ? "El ingreso total no cambia"
    : dR > 0 ? `El ingreso total aumentó en ${money(dR)}` : `El ingreso total disminuyó en ${money(-dR)}`;
  let note;
  if (a < 1e-12) note = "La cantidad no cambia con el precio, así que el ingreso cambia en la misma proporción que el precio.";
  else if (Math.abs(a - 1) < 1e-9) note = "La elasticidad es uno, así que el ingreso total se mantiene aproximadamente constante cuando cambia el precio.";
  else if (a > 1) note = "La demanda es elástica: la variación porcentual de la cantidad es mayor que la del precio, así que el ingreso sube al bajar el precio y baja al subirlo.";
  else note = "La demanda es inelástica: la variación porcentual de la cantidad es menor que la del precio, así que el ingreso sube al subir el precio y baja al bajarlo.";
  const steps = [
    {
      text: mid ? "Variación porcentual de la cantidad con el punto medio:" : "Variación porcentual de la cantidad:",
      tex: mid
        ? `\\%\\Delta Q = \\frac{Q_2-Q_1}{(Q_1+Q_2)/2} = \\frac{${ntex(dQ)}}{${ntex(baseQ)}} = ${ntex(pctQ, 6)}`
        : `\\%\\Delta Q = \\frac{Q_2-Q_1}{Q_1} = \\frac{${ntex(dQ)}}{${ntex(Q1)}} = ${ntex(pctQ, 6)}`
    },
    {
      text: mid ? "Variación porcentual del precio con el punto medio:" : "Variación porcentual del precio:",
      tex: mid
        ? `\\%\\Delta P = \\frac{P_2-P_1}{(P_1+P_2)/2} = \\frac{${ntex(dP)}}{${ntex(baseP)}} = ${ntex(pctP, 6)}`
        : `\\%\\Delta P = \\frac{P_2-P_1}{P_1} = \\frac{${ntex(dP)}}{${ntex(P1)}} = ${ntex(pctP, 6)}`
    },
    { text: "Coeficiente de elasticidad:", tex: `E = \\frac{\\%\\Delta Q}{\\%\\Delta P} = \\frac{${ntex(pctQ, 6)}}{${ntex(pctP, 6)}} = ${ntex(E, 6)}` },
    { text: "Ingreso total antes y después del cambio:", tex: `R_1 = P_1Q_1 = ${ntex(R1)},\\qquad R_2 = P_2Q_2 = ${ntex(R2)}` }
  ];
  return {
    results: [
      { label: "Variación porcentual de la cantidad", value: `${fmt(pctQ * 100, 4)}%` },
      { label: "Variación porcentual del precio", value: `${fmt(pctP * 100, 4)}%` },
      { label: "Coeficiente de elasticidad E", value: fmt(E, 4), text: `E = ${fmt(E, 4)}` },
      { label: "Clasificación de la elasticidad", value: cls },
      { label: "Ingreso total antes del cambio", value: money(R1) },
      { label: "Ingreso total después del cambio", value: money(R2) },
      { label: "Efecto del cambio sobre el ingreso", value: effect }
    ],
    steps,
    copy: `E = ${fmt(E, 4)} (${cls}), ingreso de ${money(R1)} a ${money(R2)}, ${effect}`,
    blocks: [
      { type: "table", caption: "Comparación antes y después del cambio", head: ["Concepto", "Antes", "Después"], rows: [["Precio", fmt(P1, 6), fmt(P2, 6)], ["Cantidad", fmt(Q1, 6), fmt(Q2, 6)], ["Ingreso total", money(R1), money(R2)]] },
      { type: "note", text: note }
    ]
  };
}
