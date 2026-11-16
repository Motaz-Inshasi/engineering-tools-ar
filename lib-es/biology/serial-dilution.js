import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const HEMO_VOLUME_FACTOR = 1e4;

function sci(x, sig = 4) {
  if (x === 0) return "0";
  const [m, e] = x.toExponential(sig - 1).split("e");
  return `${m.includes(".") ? m.replace(/\.?0+$/, "") : m} × 10^${Number(e)}`;
}

function dilText(x) {
  return Number.isInteger(x) && x < 1e15 ? String(x) : fmt(x, 4);
}

export const meta = {
  description: "Calcule las concentraciones de las diluciones seriadas y el volumen de diluyente en cada paso, las CFU/mL a partir de las colonias contadas, o el número de células/mL con cámara de recuento (hemocitómetro).",
  keywords: ["Dilución seriada", "serial dilution", "CFU", "Unidades formadoras de colonias", "Recuento de células", "hemocytometer", "Azul de tripano", "Concentración"],
  formulas: [
    { label: "Dilución en el paso k", tex: "D_k = f^{k},\\qquad C_k = \\frac{C_0}{f^{k}}" },
    { label: "Unidades formadoras de colonias", tex: "\\text{CFU/mL} = \\frac{\\text{colonias}}{V \\times d}" },
    { label: "Cámara de recuento", tex: "\\text{células/mL} = \\frac{\\text{número de células}}{\\text{número de cuadros}} \\times D \\times 10^4" }
  ],
  inputs: [
    {
      id: "mode", label: "Método de cálculo", type: "select", default: "series",
      options: [["series", "Dilución seriada"], ["cfu", "Recuento de colonias (CFU/mL)"], ["hemocytometer", "Recuento de células con cámara de recuento"]]
    },
    { id: "c0", label: "Concentración inicial C0", type: "number", default: "1000", when: { mode: ["series"] }, help: "En la unidad que desee, por ejemplo CFU/mL o células/mL." },
    { id: "factor", label: "Factor de dilución en cada paso f", type: "number", default: "10", when: { mode: ["series"] }, help: "Por ejemplo, 10 o 2." },
    { id: "nsteps", label: "Número de pasos de dilución", type: "number", default: "6", when: { mode: ["series"] }, help: "Número entero de 1 a 15." },
    { id: "vt", label: "Volumen transferido de un tubo al siguiente", unit: "mL", type: "number", default: "1", when: { mode: ["series"] } },
    { id: "colonies", label: "Número de colonias contadas", type: "number", default: "150", when: { mode: ["cfu"] } },
    { id: "vplate", label: "Volumen de solución sembrada", unit: "mL", type: "number", default: "0.1", when: { mode: ["cfu"] } },
    { id: "dcfu", label: "Factor de dilución de la placa contada", type: "number", default: "1e-6", when: { mode: ["cfu"] }, help: "Introduzca 1e-6 o 1000000; un valor mayor que 1 se trata como el inverso de una dilución." },
    { id: "cells", label: "Número de células contadas en la cámara", type: "number", default: "200", when: { mode: ["hemocytometer"] } },
    { id: "squares", label: "Número de cuadros grandes contados", type: "number", default: "4", when: { mode: ["hemocytometer"] } },
    { id: "dhemo", label: "Factor de dilución de la muestra", type: "number", default: "2", when: { mode: ["hemocytometer"] }, help: "Por ejemplo, 2 si mezcla las células con azul de tripano en proporción 1:1." }
  ],
  example: { values: { mode: "cfu", c0: "1000", factor: "10", nsteps: "6", vt: "1", colonies: "150", vplate: "0.1", dcfu: "1e-6", cells: "200", squares: "4", dhemo: "2" }, expect: ["1.5 × 10^9 CFU/mL"], note: "Ejemplo: 150 colonias de 0.1 mL de una dilución 10^-6." },
  invalid: { values: { mode: "cfu", c0: "1000", factor: "10", nsteps: "6", vt: "1", colonies: "-5", vplate: "0.1", dcfu: "1e-6", cells: "200", squares: "4", dhemo: "2" } },
  related: ["solutions", "population-growth", "lab-units"]
};

function seriesMode(input) {
  const c0 = num(input, "c0", "Concentración inicial C0", { positive: true });
  const f = num(input, "factor", "Factor de dilución", { positive: true });
  if (f <= 1) fail("El factor de dilución debe ser mayor que 1.", "factor");
  const n = num(input, "nsteps", "Número de pasos", { integer: true, min: 1, max: 15 });
  const vt = num(input, "vt", "Volumen de transferencia", { positive: true });
  const perTube = vt * (f - 1);
  const cn = c0 / Math.pow(f, n);
  const rows = [["Original", "1:1", fmt(c0, 6), "—"]];
  for (let k = 1; k <= n; k++) rows.push([String(k), `1:${dilText(Math.pow(f, k))}`, fmt(c0 / Math.pow(f, k), 4), fmt(perTube, 4)]);
  return {
    results: [
      { label: "Concentración final", value: fmt(cn, 4) },
      { label: "Dilución total", value: `1:${dilText(Math.pow(f, n))}` },
      { label: "Volumen total de diluyente añadido (mL)", value: fmt(n * perTube, 4) }
    ],
    steps: [
      { text: "Dilución en el último tubo:", tex: `D_n = f^n = ${ntex(f)}^{${n}} = ${ntex(Math.pow(f, n))}` },
      { text: "Concentración final:", tex: `C_n = \\frac{C_0}{f^n} = \\frac{${ntex(c0)}}{${ntex(Math.pow(f, n))}} = ${ntex(cn, 6)}` },
      { text: "Volumen de diluyente añadido en cada tubo:", tex: `V_d = V_t (f-1) = ${ntex(vt)} \\times ${ntex(f - 1)} = ${ntex(perTube)}\\ \\text{mL}` }
    ],
    copy: `Concentración tras ${n} pasos = ${fmt(cn, 4)} (dilución 1:${dilText(Math.pow(f, n))})`,
    blocks: [{ type: "table", caption: "Tabla de tubos", head: ["Tubo", "Dilución", "Concentración", "Diluyente añadido (mL)"], rows, ltr: true }]
  };
}

function cfuMode(input) {
  const colonies = num(input, "colonies", "Número de colonias", { integer: true, nonNegative: true });
  const V = num(input, "vplate", "Volumen de solución sembrada", { positive: true });
  const d0 = num(input, "dcfu", "Factor de dilución", { positive: true });
  const d = d0 > 1 ? 1 / d0 : d0;
  const cfu = colonies / (V * d);
  const inRange = colonies >= 30 && colonies <= 300;
  const blocks = [];
  if (!inRange) blocks.push({ type: "note", tone: "warn", text: "El número de colonias está fuera del intervalo aceptable de 30 a 300, por lo que el resultado es aproximado y menos preciso." });
  return {
    results: [
      { label: "Número de unidades formadoras de colonias", value: `${sci(cfu)} CFU/mL` },
      { label: "Factor de dilución utilizado", value: dilText(d) },
      { label: "Intervalo de recuento", value: inRange ? "Dentro del intervalo de 30 a 300" : "Fuera del intervalo de 30 a 300" }
    ],
    steps: [
      d0 > 1 ? { text: "El valor introducido es mayor que 1, así que se trata como el inverso de una dilución:", tex: `d = \\frac{1}{${ntex(d0)}} = ${ntex(d)}` } : { text: "Factor de dilución utilizado:", tex: `d = ${ntex(d)}` },
      { text: "Unidades formadoras de colonias por mL:", tex: `\\frac{${colonies}}{${ntex(V)} \\times ${ntex(d)}} = ${ntex(cfu, 6)}\\ \\text{CFU/mL}` }
    ],
    copy: `${sci(cfu)} CFU/mL`,
    blocks
  };
}

function hemoMode(input) {
  const cells = num(input, "cells", "Número de células contadas", { integer: true, nonNegative: true });
  const squares = num(input, "squares", "Número de cuadros", { integer: true, positive: true });
  const D = num(input, "dhemo", "Factor de dilución de la muestra", { positive: true });
  if (D < 1) fail("El factor de dilución de la muestra debe ser 1 o mayor.", "dhemo");
  const avg = cells / squares;
  const cpm = avg * D * HEMO_VOLUME_FACTOR;
  return {
    results: [
      { label: "Número de células por mL", value: `${sci(cpm)} células/mL` },
      { label: "Promedio de células por cuadro", value: fmt(avg, 4) }
    ],
    steps: [
      { text: "Promedio de células por cuadro grande:", tex: `\\frac{${cells}}{${squares}} = ${ntex(avg, 6)}` },
      { text: "Conversión a células por mL con la dilución y el volumen del cuadro (10^4 mL):", tex: `${ntex(avg, 6)} \\times ${ntex(D)} \\times 10^4 = ${ntex(cpm, 6)}\\ \\text{cells/mL}` }
    ],
    copy: `${sci(cpm)} células/mL`,
    blocks: [{ type: "note", text: "El volumen del cuadro grande de la cámara, 1 mm × 1 mm × 0.1 mm = 0.1 µL = 10^-4 mL, por lo que el promedio se multiplica por 10^4 para obtener células por mL." }]
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Método de cálculo", ["series", "cfu", "hemocytometer"], "series");
  if (mode === "cfu") return cfuMode(input);
  if (mode === "hemocytometer") return hemoMode(input);
  return seriesMode(input);
}
