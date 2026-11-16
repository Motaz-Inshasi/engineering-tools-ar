import { choice, fail, isBlank, num } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const BIN_OPS = ["and", "or", "xor"];
const SHIFT_OPS = ["shl", "shr", "sar"];
const NAMES = { and: "AND", or: "OR", xor: "XOR", not: "NOT", shl: "SHL", shr: "SHR", sar: "SAR" };
const TEX_BIN = { and: "\\mathrm{AND}", or: "\\mathrm{OR}", xor: "\\mathrm{XOR}" };
const TEXTS = {
  and: "AND da 1 solo si el bit de A y el bit de B son ambos 1; en todos los demás casos da 0.",
  or: "OR da 1 si uno de los bits o ambos son 1; solo da 0 si ambos bits son 0.",
  xor: "XOR da 1 si los bits son distintos, y 0 si son iguales.",
  not: "NOT invierte cada bit: el 0 se convierte en 1 y el 1 en 0.",
  shl: "SHL desplaza los bits hacia la izquierda; los bits que salen por arriba se pierden y el extremo derecho se rellena con ceros.",
  shr: "SHR (lógico) desplaza los bits hacia la derecha y el extremo izquierdo siempre se rellena con ceros.",
  sar: "SAR (aritmético) desplaza los bits hacia la derecha conservando el bit de signo, así que el extremo izquierdo se rellena con copias de él."
};

export const meta = {
  description: "Calcula AND, OR, XOR, NOT y los desplazamientos SHL, SHR y SAR sobre números de 8, 16 o 32 bits, con el resultado en binario, hexadecimal y decimal con y sin signo, y pasos que explican la regla de cada operación.",
  keywords: ["Operaciones de bits", "bitwise", "AND", "OR", "XOR", "NOT", "desplazamiento", "shift", "complemento a 2", "two's complement", "SAR", "SHR"],
  formulas: [
    { label: "Operaciones lógicas", tex: "A \\land B,\\quad A \\lor B,\\quad A \\oplus B,\\quad \\lnot A" },
    { label: "Desplazamiento a la izquierda por s", tex: "A \\ll s = (A \\cdot 2^{s}) \\bmod 2^{w}" }
  ],
  inputs: [
    { id: "a", label: "Valor A", type: "text", default: "12", help: "En decimal, como -5; en hexadecimal con el prefijo 0x, como 0x0A; o en binario con el prefijo 0b, como 0b1010." },
    { id: "op", label: "Operación", type: "select", default: "and", options: [["and", "AND (y)"], ["or", "OR (o)"], ["xor", "XOR (o exclusiva)"], ["not", "NOT (negación)"], ["shl", "SHL (desplazamiento a la izquierda)"], ["shr", "SHR (desplazamiento lógico a la derecha)"], ["sar", "SAR (desplazamiento aritmético a la derecha)"]] },
    { id: "b", label: "Valor B", type: "text", default: "10", when: { op: ["and", "or", "xor"] } },
    { id: "shift", label: "Número de posiciones de desplazamiento", type: "number", default: "3", help: "Entre 0 y el ancho en bits menos 1.", when: { op: ["shl", "shr", "sar"] } },
    { id: "width", label: "Ancho en bits", type: "select", default: "8", options: [["8", "8 bits"], ["16", "16 bits"], ["32", "32 bits"]] }
  ],
  example: { values: { a: "12", op: "and", b: "10", shift: "3", width: "8" }, expect: ["0000 1000 (0x08 = 8)"], note: "Ejemplo: 12 AND 10 con ancho de 8 bits." },
  invalid: { values: { a: "300", op: "and", b: "1", shift: "0", width: "8" } },
  related: ["number-bases", "binary-twos-complement", "logic-gates", "truth-table", "chmod-calculator", "unix-timestamp"]
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);
}

function parseOperand(raw, label, field, w) {
  const s = normalizeDigits(String(raw)).replace(/[\s_]/g, "");
  const m = s.match(/^([+-]?)(0[xX][0-9a-fA-F]+|0[bB][01]+|\d+)$/);
  if (!m) fail(`${label} no es un entero válido. Escríbelo en decimal (como -5), con el prefijo 0x (como 0x0A) o con el prefijo 0b (como 0b1010).`, field);
  let v = BigInt(m[2].toLowerCase());
  if (m[1] === "-") v = -v;
  const full = 1n << BigInt(w);
  const half = full >> 1n;
  if (v >= 0n && v < full) return { v, raw: v };
  if (v < 0n && v >= -half) return { v, raw: v + full };
  fail(`${label} está fuera del rango de ${w} bits; el valor permitido va de ${-half} a ${full - 1n}.`, field);
}

function bitsOf(raw, w) {
  return raw.toString(2).padStart(w, "0");
}

function grouped(raw, w) {
  return bitsOf(raw, w).match(/.{4}/g).join(" ");
}

function hexOf(raw, w) {
  return "0x" + raw.toString(16).toUpperCase().padStart(w / 4, "0");
}

function signedOf(raw, w) {
  const full = 1n << BigInt(w);
  return raw >= full >> 1n ? raw - full : raw;
}

function compute(op, ra, rb, sh, w) {
  const mask = (1n << BigInt(w)) - 1n;
  switch (op) {
    case "and": return ra & rb;
    case "or": return ra | rb;
    case "xor": return ra ^ rb;
    case "not": return ~ra & mask;
    case "shl": return (ra << BigInt(sh)) & mask;
    case "shr": return ra >> BigInt(sh);
    default: return BigInt.asUintN(w, signedOf(ra, w) >> BigInt(sh));
  }
}

function expr(op, sh) {
  if (op === "not") return "\\mathrm{NOT}\\ A";
  if (op === "shl") return `A \\ll ${sh}`;
  if (op === "shr") return `A \\gg ${sh}`;
  if (op === "sar") return `A \\gg_{\\mathrm{arith}} ${sh}`;
  return `A\\ ${TEX_BIN[op]}\\ B`;
}

function bitAlignment(named, w) {
  const cell = (c) => String(c).padStart(2);
  const head = Array.from({ length: w }, (_, i) => cell(w - 1 - i)).join(" ");
  const lines = [`${"bit".padEnd(5)}${head}`];
  for (const [name, raw] of named) {
    lines.push(`${name.padEnd(5)}${bitsOf(raw, w).split("").map(cell).join(" ")}`);
  }
  return lines.join("\n");
}

export function solve(input) {
  const op = choice(input, "op", "Operación", ["and", "or", "xor", "not", "shl", "shr", "sar"], "and");
  const w = Number(choice(input, "width", "Ancho en bits", ["8", "16", "32"], "8"));
  if (isBlank(input.a)) fail("Introduce el valor A.", "a");
  const va = parseOperand(input.a, "Valor A", "a", w);
  const isBin = BIN_OPS.includes(op);
  const isShift = SHIFT_OPS.includes(op);
  let vb = null;
  if (isBin) {
    if (isBlank(input.b)) fail("Introduce el valor B.", "b");
    vb = parseOperand(input.b, "Valor B", "b", w);
  }
  let sh = null;
  if (isShift) sh = num(input, "shift", "Número de posiciones de desplazamiento", { integer: true, min: 0, max: w - 1 });
  const ra = va.raw;
  const rb = vb ? vb.raw : null;
  const rr = compute(op, ra, rb, sh, w);
  const bin = grouped(rr, w);
  const hx = hexOf(rr, w);
  const un = rr.toString();
  const sg = signedOf(rr, w).toString();
  const rowOf = (name, raw) => [name, grouped(raw, w), hexOf(raw, w), raw.toString(), signedOf(raw, w).toString()];
  const rows = [rowOf("A", ra)];
  if (vb) rows.push(rowOf("B", rb));
  rows.push(rowOf("Resultado", rr));
  const named = [["A", ra]];
  if (vb) named.push(["B", rb]);
  named.push([NAMES[op], rr]);
  const steps = [TEXTS[op]];
  steps.push({ text: "Convertir A a un patrón de bits del ancho elegido:", tex: `A = ${va.v} \\Rightarrow \\text{${grouped(ra, w)}}_{2}` });
  if (vb) steps.push({ text: "Convertir B a un patrón de bits del ancho elegido:", tex: `B = ${vb.v} \\Rightarrow \\text{${grouped(rb, w)}}_{2}` });
  if (isShift) steps.push({ text: "Número de posiciones de desplazamiento:", tex: `s = ${sh}` });
  steps.push({ text: "Aplicar la operación bit a bit:", tex: `${expr(op, sh)} = \\text{${bin}}_{2}` });
  steps.push({ text: "Valor decimal sin signo:", tex: `\\text{${bin}}_{2} = \\text{${hx}} = ${un}` });
  steps.push(
    (rr >> BigInt(w - 1)) === 1n
      ? `El bit más alto del resultado es 1, así que se interpreta con signo en complemento a 2 como ${sg}.`
      : `El bit más alto del resultado es 0, así que el valor con signo en complemento a 2 es el mismo: ${sg}.`
  );
  const blocks = [
    { type: "table", caption: "Tabla de bits", head: ["Variable", "Binario", "Hexadecimal", "Sin signo", "Con signo (complemento a 2)"], rows, ltr: true },
    { type: "html", html: `<pre class="code" dir="ltr"><code>${escapeHtml(bitAlignment(named, w))}</code></pre>` }
  ];
  if (op === "shl" && (ra << BigInt(sh)) > (1n << BigInt(w)) - 1n) {
    blocks.push({ type: "note", text: "Se perdieron algunos bits de la parte alta del número porque el desplazamiento superó el ancho elegido.", tone: "warn" });
  }
  const lhs = isBin ? `${va.v} ${NAMES[op]} ${vb.v}` : op === "not" ? `NOT ${va.v}` : `${va.v} ${NAMES[op]} ${sh}`;
  return {
    results: [
      { label: "Resultado en binario", value: bin },
      { label: "Resultado en hexadecimal", value: hx },
      { label: "Resultado sin signo", value: un },
      { label: "Resultado con signo (complemento a 2)", value: sg }
    ],
    steps,
    blocks,
    copy: `${lhs} = ${bin} (${hx} = ${un})`
  };
}
