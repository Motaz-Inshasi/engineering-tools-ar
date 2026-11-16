import { choice, fail, isBlank, num } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const BIN_OPS = ["and", "or", "xor"];
const SHIFT_OPS = ["shl", "shr", "sar"];
const NAMES = { and: "AND", or: "OR", xor: "XOR", not: "NOT", shl: "SHL", shr: "SHR", sar: "SAR" };
const TEX_BIN = { and: "\\mathrm{AND}", or: "\\mathrm{OR}", xor: "\\mathrm{XOR}" };
const TEXTS = {
  and: "AND gives 1 only if the bit in A and the bit in B are both 1; in all other cases it gives 0.",
  or: "OR gives 1 if at least one of the two bits is 1; it gives 0 only if both bits are 0.",
  xor: "XOR gives 1 if the two bits are different, and gives 0 if they are the same.",
  not: "NOT flips each bit: 0 becomes 1 and 1 becomes 0.",
  shl: "SHL shifts the bits to the left; bits shifted out at the top are lost, and the right end is filled with zeros.",
  shr: "SHR (logical) shifts the bits to the right; the left end is always filled with zeros.",
  sar: "SAR (arithmetic) shifts the bits to the right while keeping the sign bit, so the left end is filled with copies of it."
};

export const meta = {
  description: "Calculates the AND, OR, XOR, and NOT operations and the SHL, SHR, and SAR shifts on 8-, 16-, or 32-bit numbers, with the result in binary, hexadecimal, and decimal, signed and unsigned, and steps explaining the rule of each operation.",
  keywords: ["Bitwise operations", "bitwise", "AND", "OR", "XOR", "NOT", "Shift", "shift", "Two's complement", "two's complement", "SAR", "SHR"],
  formulas: [
    { label: "Logical operations", tex: "A \\land B,\\quad A \\lor B,\\quad A \\oplus B,\\quad \\lnot A" },
    { label: "Left shift by s", tex: "A \\ll s = (A \\cdot 2^{s}) \\bmod 2^{w}" }
  ],
  inputs: [
    { id: "a", label: "Value A", type: "text", default: "12", help: "In decimal such as -5, in hexadecimal with the 0x prefix such as 0x0A, or in binary with the 0b prefix such as 0b1010." },
    { id: "op", label: "Operation", type: "select", default: "and", options: [["and", "AND (and)"], ["or", "OR (or)"], ["xor", "XOR (exclusive or)"], ["not", "NOT (negation)"], ["shl", "SHL (shift left)"], ["shr", "SHR (shift right, logical)"], ["sar", "SAR (shift right, arithmetic)"]] },
    { id: "b", label: "Value B", type: "text", default: "10", when: { op: ["and", "or", "xor"] } },
    { id: "shift", label: "Shift amount", type: "number", default: "3", help: "Between 0 and the bit width minus 1.", when: { op: ["shl", "shr", "sar"] } },
    { id: "width", label: "Bit width", type: "select", default: "8", options: [["8", "8 bits"], ["16", "16 bits"], ["32", "32 bits"]] }
  ],
  example: { values: { a: "12", op: "and", b: "10", shift: "3", width: "8" }, expect: ["0000 1000 (0x08 = 8)"], note: "Example: 12 AND 10 with an 8-bit width." },
  invalid: { values: { a: "300", op: "and", b: "1", shift: "0", width: "8" } },
  related: ["number-bases", "binary-twos-complement", "logic-gates", "truth-table", "chmod-calculator", "unix-timestamp"]
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);
}

function parseOperand(raw, label, field, w) {
  const s = normalizeDigits(String(raw)).replace(/[\s_]/g, "");
  const m = s.match(/^([+-]?)(0[xX][0-9a-fA-F]+|0[bB][01]+|\d+)$/);
  if (!m) fail(`${label} is not a valid integer. Write it in decimal (such as -5), with the 0x prefix (such as 0x0A), or with the 0b prefix (such as 0b1010).`, field);
  let v = BigInt(m[2].toLowerCase());
  if (m[1] === "-") v = -v;
  const full = 1n << BigInt(w);
  const half = full >> 1n;
  if (v >= 0n && v < full) return { v, raw: v };
  if (v < 0n && v >= -half) return { v, raw: v + full };
  fail(`${label} is outside the ${w}-bit range; the allowed range is from ${-half} to ${full - 1n}.`, field);
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
  const op = choice(input, "op", "Operation", ["and", "or", "xor", "not", "shl", "shr", "sar"], "and");
  const w = Number(choice(input, "width", "Bit width", ["8", "16", "32"], "8"));
  if (isBlank(input.a)) fail("Enter value A.", "a");
  const va = parseOperand(input.a, "Value A", "a", w);
  const isBin = BIN_OPS.includes(op);
  const isShift = SHIFT_OPS.includes(op);
  let vb = null;
  if (isBin) {
    if (isBlank(input.b)) fail("Enter value B.", "b");
    vb = parseOperand(input.b, "Value B", "b", w);
  }
  let sh = null;
  if (isShift) sh = num(input, "shift", "Shift amount", { integer: true, min: 0, max: w - 1 });
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
  rows.push(rowOf("Result", rr));
  const named = [["A", ra]];
  if (vb) named.push(["B", rb]);
  named.push([NAMES[op], rr]);
  const steps = [TEXTS[op]];
  steps.push({ text: "Convert A to a bit pattern of the selected width:", tex: `A = ${va.v} \\Rightarrow \\text{${grouped(ra, w)}}_{2}` });
  if (vb) steps.push({ text: "Convert B to a bit pattern of the selected width:", tex: `B = ${vb.v} \\Rightarrow \\text{${grouped(rb, w)}}_{2}` });
  if (isShift) steps.push({ text: "Shift amount:", tex: `s = ${sh}` });
  steps.push({ text: "Apply the operation bit by bit:", tex: `${expr(op, sh)} = \\text{${bin}}_{2}` });
  steps.push({ text: "Unsigned decimal value:", tex: `\\text{${bin}}_{2} = \\text{${hx}} = ${un}` });
  steps.push(
    (rr >> BigInt(w - 1)) === 1n
      ? `The highest bit of the result = 1, so it is interpreted in two's complement as the value ${sg}.`
      : `The highest bit of the result = 0, so the value in two's complement is ${sg} itself.`
  );
  const blocks = [
    { type: "table", caption: "Bit table", head: ["Variable", "Binary", "Hexadecimal", "Unsigned", "Signed (two's complement)"], rows, ltr: true },
    { type: "html", html: `<pre class="code" dir="ltr"><code>${escapeHtml(bitAlignment(named, w))}</code></pre>` }
  ];
  if (op === "shl" && (ra << BigInt(sh)) > (1n << BigInt(w)) - 1n) {
    blocks.push({ type: "note", text: "Some bits were lost from the top of the number because the shift exceeded the selected width.", tone: "warn" });
  }
  const lhs = isBin ? `${va.v} ${NAMES[op]} ${vb.v}` : op === "not" ? `NOT ${va.v}` : `${va.v} ${NAMES[op]} ${sh}`;
  return {
    results: [
      { label: "Result in binary", value: bin },
      { label: "Result in hexadecimal", value: hx },
      { label: "Result unsigned", value: un },
      { label: "Result signed (two's complement)", value: sg }
    ],
    steps,
    blocks,
    copy: `${lhs} = ${bin} (${hx} = ${un})`
  };
}
