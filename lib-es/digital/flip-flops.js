import { choice, str, fail, isBlank } from "../core/validate.js";

const TYPES = [["SR", "SR"], ["D", "D"], ["JK", "JK"], ["T", "T"]];

export const meta = {
  description: "Referencia y calculadora de biestables (flip-flops) SR, D, JK y T: ecuación característica, tabla de características y tabla de excitación, el siguiente estado para cualesquiera entradas y un diagrama temporal para una secuencia de pulsos de reloj.",
  keywords: ["Biestable", "flip flop", "JK", "D flip flop", "SR", "T flip flop", "Tabla de excitación", "Ecuación característica", "Circuitos secuenciales"],
  formulas: [
    { label: "Ecuaciones características", tex: "D: Q^+ = D,\\quad T: Q^+ = T \\oplus Q,\\quad JK: Q^+ = J\\overline{Q} + \\overline{K}Q" },
    { label: "SR (con S·R = 0)", tex: "Q^+ = S + \\overline{R}Q" }
  ],
  inputs: [
    { id: "type", label: "Tipo de biestable", type: "select", default: "JK", options: TYPES },
    { id: "q0", label: "Estado actual Q", type: "select", default: "0", options: [["0", "0"], ["1", "1"]] },
    { id: "seq", label: "Entradas por pulso de reloj", type: "textarea", rows: 4, default: "1 0\n1 1\n0 0\n1 1\n0 1", help: "Una línea por pulso. SR: «S R», JK: «J K», D: «D», T: «T»." }
  ],
  example: { values: { type: "JK", q0: "0", seq: "1 0\n1 1\n0 0\n1 1\n0 1" }, expect: ["Q = 1, 0, 0, 1, 0"], note: "Ejemplo: biestable JK que parte de 0 con cinco pulsos de reloj." },
  invalid: { values: { type: "SR", q0: "0", seq: "1 1" } },
  related: ["logic-gates", "truth-table", "boolean-simplifier"]
};

export function next(type, q, ins) {
  switch (type) {
    case "D": return ins[0];
    case "T": return ins[0] ^ q;
    case "JK": { const [j, k] = ins; return (j & (q ^ 1)) | ((k ^ 1) & q); }
    case "SR": { const [s, r] = ins; if (s && r) return null; return s | ((r ^ 1) & q); }
  }
  return null;
}

const CHAR = {
  SR: [["S", "R", "Q⁺", "Función"], [["0", "0", "Q", "Mantener"], ["0", "1", "0", "Borrar (Reset)"], ["1", "0", "1", "Activar (Set)"], ["1", "1", "؟", "Prohibido"]]],
  D: [["D", "Q⁺", "Función"], [["0", "0", "Borrar"], ["1", "1", "Activar"]]],
  JK: [["J", "K", "Q⁺", "Función"], [["0", "0", "Q", "Mantener"], ["0", "1", "0", "Borrar"], ["1", "0", "1", "Activar"], ["1", "1", "Q'", "Conmutar (Toggle)"]]],
  T: [["T", "Q⁺", "Función"], [["0", "Q", "Mantener"], ["1", "Q'", "Conmutar"]]]
};

const EXC = {
  SR: [["Q", "Q⁺", "S", "R"], [["0", "0", "0", "X"], ["0", "1", "1", "0"], ["1", "0", "0", "1"], ["1", "1", "X", "0"]]],
  D: [["Q", "Q⁺", "D"], [["0", "0", "0"], ["0", "1", "1"], ["1", "0", "0"], ["1", "1", "1"]]],
  JK: [["Q", "Q⁺", "J", "K"], [["0", "0", "0", "X"], ["0", "1", "1", "X"], ["1", "0", "X", "1"], ["1", "1", "X", "0"]]],
  T: [["Q", "Q⁺", "T"], [["0", "0", "0"], ["0", "1", "1"], ["1", "0", "1"], ["1", "1", "0"]]]
};

export function solve(input) {
  const type = choice(input, "type", "Tipo", TYPES.map((t) => t[0]), "JK");
  let q = Number(choice(input, "q0", "Estado actual", ["0", "1"], "0"));
  const width = type === "SR" || type === "JK" ? 2 : 1;
  const lines = isBlank(input.seq) ? [] : str(input, "seq", "Entradas").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) fail("Introduzca al menos las entradas de un pulso de reloj.", "seq");
  if (lines.length > 64) fail("El número máximo de pulsos es 64.", "seq");
  const rows = [], outs = [];
  const q0 = q;
  lines.forEach((l, i) => {
    const ins = l.split(/[\s,،]+/).filter(Boolean);
    if (ins.length !== width || ins.some((b) => b !== "0" && b !== "1")) fail(`Línea ${i + 1}: introduzca ${width === 2 ? "dos valores" : "un valor"} de 0 y 1.`, "seq");
    const v = ins.map(Number);
    const nq = next(type, q, v);
    if (nq === null) fail(`Línea ${i + 1}: S = R = 1 es un estado prohibido en un biestable SR.`, "seq");
    rows.push([String(i + 1), ...ins, String(q), String(nq)]);
    outs.push(nq);
    q = nq;
  });
  const names = type === "SR" ? ["S", "R"] : type === "JK" ? ["J", "K"] : [type];
  const steps = [
    { text: "Ecuación característica del biestable:", tex: { SR: "Q^+ = S + \\overline{R}Q", D: "Q^+ = D", JK: "Q^+ = J\\overline{Q} + \\overline{K}Q", T: "Q^+ = T \\oplus Q" }[type] },
    `Partimos de Q = ${q0}; en cada flanco de reloj sustituimos las entradas y el estado actual en la ecuación para obtener el siguiente estado (véase la tabla temporal).`,
    "La tabla de excitación se usa en el diseño de contadores: indica las entradas necesarias para pasar de un estado a otro (X = indiferente)."
  ];
  const wave = [[0, q0]];
  outs.forEach((v, i) => { wave.push([i + 1, wave[wave.length - 1][1]], [i + 1, v]); });
  wave.push([outs.length + 1, outs[outs.length - 1]]);
  const qs = `Q = ${outs.join(", ")}`;
  return {
    results: [{ label: "Secuencia de estados tras cada pulso", value: qs, text: qs }, { label: "Estado final", value: q }],
    blocks: [
      { type: "table", ltr: true, caption: "Tabla temporal", head: ["Pulso", ...names, "Q", "Q⁺"], rows },
      { type: "plot", title: "Gráfica de Q a lo largo de los pulsos", xLabel: "Pulso", yLabel: "Q", yMin: -0.3, yMax: 1.3, series: [{ name: "Q", points: wave }] },
      { type: "table", caption: `Tabla de características del biestable ${type}`, head: CHAR[type][0], rows: CHAR[type][1] },
      { type: "table", caption: `Tabla de excitación del biestable ${type}`, head: EXC[type][0], rows: EXC[type][1] }
    ],
    steps, copy: qs
  };
}
