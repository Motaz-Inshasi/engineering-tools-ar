import { choice, str, fail } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

export const meta = {
  description: "Convert between decimal, binary, and hexadecimal with a fixed number of bits: two's complement, one's complement, sign-and-magnitude, with the value range, the negation steps, and adding 1.",
  keywords: ["two's complement", "two's complement", "binary", "hexadecimal", "hex", "binary", "negative numbers", "signed", "unsigned", "bit"],
  formulas: [
    { label: "Two's complement of a negative number", tex: "-x \\;\\to\\; \\overline{x} + 1 = 2^N - x" },
    { label: "Range with N bits", tex: "\\text{unsigned}: [0, 2^N - 1],\\qquad \\text{signed}: [-2^{N-1}, 2^{N-1} - 1]" }
  ],
  inputs: [
    { id: "mode", label: "Direction", type: "select", default: "dec", options: [["dec", "From decimal to binary"], ["bin", "From binary to decimal"], ["hex", "From hexadecimal to decimal"]] },
    { id: "x", label: "Value", type: "text", default: "-42", help: "For binary: only 0 and 1. For hexadecimal: 0–9 and A–F." },
    { id: "N", label: "Number of bits N", type: "select", default: "8", options: [["4", "4"], ["8", "8"], ["16", "16"], ["32", "32"], ["64", "64"]] }
  ],
  example: { values: { mode: "dec", x: "-42", N: "8" }, expect: ["11010110", "0xD6"], note: "Example: −42 in two's complement on 8 bits." },
  invalid: { values: { mode: "dec", x: "300", N: "8" } },
  related: ["number-bases", "logic-gates", "adc"]
};

const group = (s) => s.replace(/(.{4})(?=.)/g, "$1 ");

export function encode(v, N) {
  const mod = 1n << BigInt(N);
  const u = ((v % mod) + mod) % mod;
  return u.toString(2).padStart(N, "0");
}

export function decodeSigned(bits) {
  const N = bits.length;
  const u = BigInt("0b" + bits);
  return bits[0] === "1" ? u - (1n << BigInt(N)) : u;
}

export function solve(input) {
  const mode = choice(input, "mode", "Direction", ["dec", "bin", "hex"], "dec");
  const N = Number(choice(input, "N", "Number of bits", ["4", "8", "16", "32", "64"], "8"));
  const raw = normalizeDigits(str(input, "x", "Value")).replace(/[\s_]/g, "");
  const min = -(1n << BigInt(N - 1)), maxS = (1n << BigInt(N - 1)) - 1n, maxU = (1n << BigInt(N)) - 1n;
  const steps = [];
  let bits;
  if (mode === "dec") {
    if (!/^[+-]?\d+$/.test(raw)) fail("Enter a decimal integer (no fractions).", "x");
    const v = BigInt(raw);
    if (v < min || v > maxU) fail(`The value is outside the range of ${N} bits: from ${min} to ${maxU} (or up to ${maxS} for signed numbers).`, "x");
    bits = encode(v, N);
    if (v >= 0n) {
      steps.push(`The number is positive, so we write it directly in binary and pad it with zeros up to ${N} bits: ${group(bits)}.`);
      if (v > maxS) steps.push(`Note: the value is greater than ${maxS}, so it is valid only as unsigned; if read as signed it would be ${decodeSigned(bits)}.`);
    } else {
      const pos = encode(-v, N);
      const inv = [...pos].map((b) => (b === "1" ? "0" : "1")).join("");
      steps.push(`We write the magnitude ${-v} in binary using ${N} bits: ${group(pos)}.`);
      steps.push(`We invert all bits (one's complement): ${group(inv)}.`);
      steps.push(`We add 1 to get the two's complement: ${group(bits)}.`);
      steps.push({ text: "Check:", tex: `2^{${N}} - ${-v} = ${(1n << BigInt(N)) + v}` });
    }
  } else if (mode === "bin") {
    if (!/^[01]+$/.test(raw)) fail("The binary value must contain only 0 and 1.", "x");
    if (raw.length > N) fail(`The number of input bits (${raw.length}) is greater than ${N}.`, "x");
    bits = raw.padStart(N, "0");
    if (raw.length < N) steps.push(`We padded the value with leading zeros up to ${N} bits: ${group(bits)}.`);
  } else {
    if (!/^(0x)?[0-9a-fA-F]+$/.test(raw)) fail("The hexadecimal value must contain only 0–9 and A–F.", "x");
    const h = raw.replace(/^0x/i, "");
    const u = BigInt("0x" + h);
    if (u > maxU) fail(`The value is greater than ${N} bits.`, "x");
    bits = u.toString(2).padStart(N, "0");
    steps.push(`Each hexadecimal digit equals 4 bits: ${group(bits)}.`);
  }
  const u = BigInt("0b" + bits), s = decodeSigned(bits);
  const ones = bits[0] === "1" ? -(BigInt("0b" + [...bits].map((b) => (b === "1" ? "0" : "1")).join(""))) : u;
  const sm = bits[0] === "1" ? -BigInt("0b" + (bits.slice(1) || "0")) : u;
  if (mode !== "dec") {
    steps.push(bits[0] === "1"
      ? `The most significant bit is 1, so the number is negative in two's complement: value = ${u} − 2^${N} = ${s}.`
      : `The most significant bit is 0, so the number is positive and its value is ${u} both signed and unsigned.`);
  }
  const hex = "0x" + u.toString(16).toUpperCase().padStart(Math.ceil(N / 4), "0");
  return {
    results: [
      { label: "Binary (two's complement)", value: group(bits), text: bits },
      { label: "Hexadecimal", value: hex, text: hex },
      { label: "Signed decimal (two's complement)", value: s.toString() },
      { label: "Unsigned decimal", value: u.toString() },
      { label: "One's complement reading", value: ones === 0n && bits[0] === "1" ? "-0" : ones.toString() },
      { label: "Sign-and-magnitude reading", value: sm === 0n && bits[0] === "1" ? "-0" : sm.toString() },
      { label: `Signed range of ${N} bits`, value: `${min} … ${maxS}` }
    ],
    steps, copy: `${bits} = ${hex} = ${s} (signed) = ${u} (unsigned)`
  };
}
