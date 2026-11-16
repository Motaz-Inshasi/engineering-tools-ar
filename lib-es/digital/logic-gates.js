import { choice, str, fail } from "../core/validate.js";

const GATES = [["AND", "AND"], ["OR", "OR"], ["NOT", "NOT"], ["NAND", "NAND"], ["NOR", "NOR"], ["XOR", "XOR"], ["XNOR", "XNOR"], ["BUF", "BUFFER"]];

export const meta = {
  description: "Calcula la salida de cualquier puerta lógica (AND, OR, NOT, NAND, NOR, XOR y XNOR) para hasta 8 entradas, con la tabla de verdad completa de la puerta y su expresión algebraica.",
  keywords: ["Puertas lógicas", "logic gates", "AND", "OR", "NAND", "NOR", "XOR", "XNOR", "NOT", "Puerta"],
  formulas: [
    { label: "Puertas básicas", tex: "\\text{AND}: A\\cdot B,\\quad \\text{OR}: A + B,\\quad \\text{NOT}: \\overline{A}" },
    { label: "Derivadas de ellas", tex: "\\text{NAND}: \\overline{A\\cdot B},\\quad \\text{NOR}: \\overline{A + B},\\quad \\text{XOR}: A \\oplus B,\\quad \\text{XNOR}: \\overline{A \\oplus B}" }
  ],
  inputs: [
    { id: "gate", label: "Puerta", type: "select", default: "XOR", options: GATES },
    { id: "bits", label: "Valores de las entradas", type: "text", default: "1 0 1", help: "Valores 0 o 1 separados por espacios. NOT y BUFFER admiten una sola entrada." }
  ],
  example: { values: { gate: "XOR", bits: "1 0 1" }, expect: ["Y = 0"], note: "Ejemplo: XOR de tres entradas da 1 solo cuando el número de unos es impar." },
  invalid: { values: { gate: "AND", bits: "1 2" } },
  related: ["truth-table", "boolean-simplifier", "flip-flops"]
};

export function gate(name, ins) {
  const and = ins.every(Boolean), or = ins.some(Boolean), xor = ins.filter(Boolean).length % 2 === 1;
  const v = { AND: and, OR: or, NAND: !and, NOR: !or, XOR: xor, XNOR: !xor, NOT: !ins[0], BUF: !!ins[0] }[name];
  return v ? 1 : 0;
}

const DESC = {
  AND: "La salida es 1 solo si todas las entradas son 1.",
  OR: "La salida es 1 si alguna entrada es 1.",
  NAND: "NAND: la salida es 0 solo si todas las entradas son 1. Es una puerta universal con la que se puede construir cualquier circuito.",
  NOR: "NOR: la salida es 1 solo si todas las entradas son 0. También es una puerta universal.",
  XOR: "La salida es 1 si el número de unos es impar (con dos entradas: si son distintas).",
  XNOR: "La salida es 1 si el número de unos es par (con dos entradas: si son iguales).",
  NOT: "Invierte la entrada.",
  BUF: "Transmite la entrada sin cambios (se usa para reforzar la señal)."
};

const TEX = { AND: (v) => v.join(" \\cdot "), OR: (v) => v.join(" + "), NAND: (v) => `\\overline{${v.join(" \\cdot ")}}`, NOR: (v) => `\\overline{${v.join(" + ")}}`, XOR: (v) => v.join(" \\oplus "), XNOR: (v) => `\\overline{${v.join(" \\oplus ")}}`, NOT: (v) => `\\overline{${v[0]}}`, BUF: (v) => v[0] };

export function solve(input) {
  const g = choice(input, "gate", "Puerta", GATES.map((x) => x[0]), "AND");
  const raw = str(input, "bits", "Valores de las entradas").split(/[\s,،]+/).filter(Boolean);
  if (raw.some((b) => b !== "0" && b !== "1")) fail("Cada valor de entrada debe ser 0 o 1.", "bits");
  const ins = raw.map(Number);
  const single = g === "NOT" || g === "BUF";
  if (single && ins.length !== 1) fail(`La puerta ${g} admite una sola entrada.`, "bits");
  if (!single && (ins.length < 2 || ins.length > 8)) fail("El número de entradas debe estar entre 2 y 8.", "bits");
  const names = ins.map((_, i) => String.fromCharCode(65 + i));
  const y = gate(g, ins);
  const steps = [
    DESC[g],
    { text: "Expresión algebraica:", tex: `Y = ${TEX[g](names)}` },
    { text: "Sustituyendo:", tex: `Y = ${TEX[g](ins.map(String))} = ${y}` }
  ];
  const n = ins.length;
  const rows = [];
  if (n <= 5) for (let m = 0; m < 1 << n; m++) {
    const b = [...m.toString(2).padStart(n, "0")].map(Number);
    const out = gate(g, b);
    const cur = b.every((x, i) => x === ins[i]);
    rows.push([...b.map((x) => (cur ? { text: String(x), color: "var(--accent-soft)", fg: "var(--text)" } : String(x))), cur ? { text: String(out), color: "var(--accent-soft)", fg: "var(--text)" } : String(out)]);
  }
  return {
    results: [{ label: "Salida Y", value: y, text: `Y = ${y}` }, { label: "Puerta", value: `${g} con ${n} ${n === 1 ? "entrada" : "entradas"}` }],
    blocks: rows.length ? [{ type: "table", ltr: true, caption: "Tabla de verdad de la puerta (la fila sombreada corresponde a las entradas actuales)", head: [...names, "Y"], rows }] : [],
    steps, copy: `${g}(${ins.join(", ")}) → Y = ${y}`
  };
}
