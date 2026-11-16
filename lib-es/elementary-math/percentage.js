import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["of", "what", "change", "add", "sub", "reverse", "points"];
const N = (x) => fmt(x, 10);
const P = (x) => `${fmt(x, 10)}%`;

export const meta = {
  description: "Calcula porcentajes en siete modos: porcentaje de un número, qué porcentaje es un número de otro, variación porcentual entre valores, aumento o disminución de un valor, valor original antes de un cambio o diferencia entre dos porcentajes en puntos porcentuales.",
  keywords: ["porcentaje", "percentage", "variación porcentual", "aumento porcentual", "disminución porcentual", "puntos porcentuales", "percentage points", "valor original"],
  formulas: [
    { label: "Porcentaje de un número", tex: "P = \\frac{X}{100}\\, Y" },
    { label: "variación porcentual", tex: "\\Delta\\% = \\frac{B - A}{A}\\times 100" },
    { label: "Valor original antes del cambio", tex: "Y = \\frac{F}{1 \\pm \\frac{X}{100}}" },
    { label: "puntos porcentuales", tex: "\\Delta p = p_2 - p_1,\\qquad \\text{cambio relativo} = \\frac{\\Delta p}{p_1}\\times 100" }
  ],
  inputs: [
    { id: "mode", label: "Tipo de cálculo", type: "select", default: "of", options: [["of", "X % de Y"], ["what", "La parte X es qué % de Y"], ["change", "Variación porcentual de A a B"], ["add", "Aumentar Y un X %"], ["sub", "Disminuir Y un X %"], ["reverse", "Valor original antes del cambio"], ["points", "Diferencia entre dos porcentajes (puntos porcentuales)"]] },
    { id: "pct", label: "Porcentaje X", unit: "%", type: "number", default: "20", when: { mode: ["of", "add", "sub", "reverse"] } },
    { id: "base", label: "Valor Y", type: "number", default: "150", when: { mode: ["of", "add", "sub"] } },
    { id: "part", label: "Parte X", type: "number", default: "30", when: { mode: ["what"] } },
    { id: "whole", label: "Total Y", type: "number", default: "150", when: { mode: ["what"] } },
    { id: "dir", label: "Tipo de cambio", type: "select", default: "inc", options: [["inc", "Aumento"], ["dec", "Disminución"]], when: { mode: ["reverse"] } },
    { id: "final", label: "Valor final F", type: "number", default: "230", when: { mode: ["reverse"] } },
    { id: "from", label: "Valor original A", type: "number", default: "80", when: { mode: ["change"] } },
    { id: "to", label: "Nuevo valor B", type: "number", default: "100", when: { mode: ["change"] } },
    { id: "p1", label: "Primer porcentaje p1", unit: "%", type: "number", default: "12", when: { mode: ["points"] } },
    { id: "p2", label: "Segundo porcentaje p2", unit: "%", type: "number", default: "15", when: { mode: ["points"] } }
  ],
  example: {
    values: { mode: "of", pct: "20", base: "150", part: "30", whole: "150", dir: "inc", final: "230", from: "80", to: "100", p1: "12", p2: "15" },
    expect: ["= 30"],
    note: "Ejemplo: 20 % de 150 = 30."
  },
  invalid: { values: { mode: "change", from: "0", to: "5" } },
  related: ["fractions", "ratio-proportion", "significant-figures"]
};

function ofMode(input) {
  const x = num(input, "pct", "Porcentaje X", { nonNegative: true });
  const y = num(input, "base", "Valor Y");
  const r = (x * y) / 100;
  return {
    results: [
      { label: "Resultado", value: N(r) },
      { label: "Porcentaje como decimal", value: N(x / 100) }
    ],
    steps: [
      { text: "Convertimos el porcentaje a decimal dividiendo entre 100:", tex: `\\frac{${ntex(x)}}{100} = ${ntex(x / 100, 8)}` },
      { text: "Multiplicamos el número decimal por el valor:", tex: `${ntex(x / 100, 8)} \\times ${ntex(y)} = ${ntex(r, 8)}` }
    ],
    copy: `${N(x)} % de ${N(y)} = ${N(r)}`
  };
}

function whatMode(input) {
  const part = num(input, "part", "Parte X");
  const whole = num(input, "whole", "Total Y", { nonZero: true });
  const p = (part * 100) / whole;
  return {
    results: [{ label: "Porcentaje", value: P(p) }],
    steps: [
      { text: "Dividimos la parte entre el total y multiplicamos por 100:", tex: `\\frac{${ntex(part)}}{${ntex(whole)}} \\times 100 = ${ntex(p, 8)}\\%` }
    ],
    copy: `${N(part)} es el ${N(p)} % de ${N(whole)}`
  };
}

function changeMode(input) {
  const a = num(input, "from", "Valor original A", { nonZero: true });
  const b = num(input, "to", "Nuevo valor B");
  const diff = b - a;
  const p = (diff * 100) / a;
  const dir = diff > 0 ? "Aumento" : diff < 0 ? "Disminución" : "Sin cambio";
  return {
    results: [
      { label: "variación porcentual", value: `${p > 0 ? "+" : ""}${P(p)}` },
      { label: "Cantidad de cambio", value: N(diff) },
      { label: "Tipo de cambio", value: dir }
    ],
    steps: [
      { text: "Calculamos la diferencia entre los dos valores:", tex: `\\Delta = B - A = ${ntex(b)} - ${ntex(a)} = ${ntex(diff)}` },
      { text: "Dividimos la diferencia entre el valor original y multiplicamos por 100:", tex: `\\frac{${ntex(diff)}}{${ntex(a)}} \\times 100 = ${ntex(p, 8)}\\%` }
    ],
    copy: `De ${N(a)} a ${N(b)}: ${dir} ${N(Math.abs(p))} %`
  };
}

function shiftMode(input, sign) {
  const x = num(input, "pct", "Porcentaje X", { nonNegative: true });
  if (sign < 0 && x > 100) fail("El porcentaje de disminución no puede superar el 100 %.", "pct");
  const y = num(input, "base", "Valor Y");
  const inc = (y * x) / 100;
  const r = y + sign * inc;
  const word = sign > 0 ? "Aumento" : "Disminución";
  const op = sign > 0 ? "+" : "-";
  return {
    results: [
      { label: sign > 0 ? "Valor tras el aumento" : "Valor tras la disminución", value: N(r) },
      { label: "Cantidad de cambio", value: N(inc) }
    ],
    steps: [
      { text: "Calculamos la cantidad de cambio a partir del porcentaje:", tex: `\\frac{${ntex(x)}}{100} \\times ${ntex(y)} = ${ntex(inc, 8)}` },
      { text: `Aplicamos ${word} al valor original:`, tex: `${ntex(y)} ${op} ${ntex(inc, 8)} = ${ntex(r, 8)}` }
    ],
    copy: `${N(y)} tras ${word} de ${N(x)} % = ${N(r)}`
  };
}

function reverseMode(input) {
  const f = num(input, "final", "Valor final F");
  const x = num(input, "pct", "Porcentaje X", { nonNegative: true });
  const dir = choice(input, "dir", "Tipo de cambio", ["inc", "dec"], "inc");
  if (dir === "dec" && x >= 100) fail("El porcentaje de disminución debe ser menor que el 100 %.", "pct");
  const inc = dir === "inc";
  const f0 = inc ? 100 + x : 100 - x;
  const orig = (f * 100) / f0;
  const word = inc ? "Aumento" : "Disminución";
  return {
    results: [
      { label: "valor original", value: N(orig) },
      { label: "Factor de cambio", value: `× ${N(f0 / 100)}` }
    ],
    steps: [
      { text: "Valor final = original × factor de cambio, donde factor de cambio = 1 ± X/100:", tex: `1 ${inc ? "+" : "-"} \\frac{${ntex(x)}}{100} = \\frac{${ntex(f0)}}{100}` },
      { text: "Dividimos el valor final entre el factor de cambio:", tex: `Y = \\frac{${ntex(f)}}{${ntex(f0 / 100, 8)}} = \\frac{${ntex(f)} \\times 100}{${ntex(f0)}} = ${ntex(orig, 8)}` }
    ],
    copy: `Valor original = ${N(orig)} (final ${N(f)} tras ${word} de ${N(x)} %)`
  };
}

function pointsMode(input) {
  const p1 = num(input, "p1", "Primer porcentaje p1", { nonZero: true });
  const p2 = num(input, "p2", "Segundo porcentaje p2");
  const diff = p2 - p1;
  const rel = (diff * 100) / p1;
  const word = diff > 0 ? "Aumento" : diff < 0 ? "Disminución" : "Sin cambio";
  return {
    results: [
      { label: "Diferencia en puntos porcentuales", value: `${N(diff)} puntos porcentuales` },
      { label: "Cambio relativo", value: `${rel > 0 ? "+" : ""}${P(rel)}` },
      { label: "Tipo de cambio", value: word }
    ],
    steps: [
      { text: "La diferencia en puntos porcentuales es la resta directa de los dos porcentajes:", tex: `\\Delta p = p_2 - p_1 = ${ntex(p2)} - ${ntex(p1)} = ${ntex(diff)}\\ \\text{pp}` },
      { text: "El cambio relativo compara la diferencia con el primer porcentaje:", tex: `\\frac{\\Delta p}{p_1} \\times 100 = \\frac{${ntex(diff)}}{${ntex(p1)}} \\times 100 = ${ntex(rel, 8)}\\%` }
    ],
    copy: `De ${N(p1)} % a ${N(p2)} %: diferencia de ${N(diff)} puntos porcentuales y cambio relativo de ${N(rel)} %`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Tipo de cálculo", MODES, "of");
  if (mode === "of") return ofMode(input);
  if (mode === "what") return whatMode(input);
  if (mode === "change") return changeMode(input);
  if (mode === "add") return shiftMode(input, 1);
  if (mode === "sub") return shiftMode(input, -1);
  if (mode === "reverse") return reverseMode(input);
  return pointsMode(input);
}
