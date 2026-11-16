import { choice, str, fail } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

export const meta = {
  description: "Convierte entre decimal, binario y hexadecimal con un número de bits fijo: complemento a dos, complemento a uno, signo y magnitud, con el rango de valores, los pasos de inversión y la suma de 1.",
  keywords: ["Complemento a dos", "two's complement", "Binario", "Hexadecimal", "hex", "binary", "Números negativos", "signed", "unsigned", "Bit"],
  formulas: [
    { label: "Complemento a dos de un número negativo", tex: "-x \\;\\to\\; \\overline{x} + 1 = 2^N - x" },
    { label: "Rango con N bits", tex: "\\text{unsigned}: [0, 2^N - 1],\\qquad \\text{signed}: [-2^{N-1}, 2^{N-1} - 1]" }
  ],
  inputs: [
    { id: "mode", label: "Sentido", type: "select", default: "dec", options: [["dec", "De decimal a binario"], ["bin", "De binario a decimal"], ["hex", "De hexadecimal a decimal"]] },
    { id: "x", label: "Valor", type: "text", default: "-42", help: "Binario: solo 0 y 1. Hexadecimal: 0–9 y A–F." },
    { id: "N", label: "Número de bits N", type: "select", default: "8", options: [["4", "4"], ["8", "8"], ["16", "16"], ["32", "32"], ["64", "64"]] }
  ],
  example: { values: { mode: "dec", x: "-42", N: "8" }, expect: ["11010110", "0xD6"], note: "Ejemplo: −42 en complemento a dos con 8 bits." },
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
  const mode = choice(input, "mode", "Sentido", ["dec", "bin", "hex"], "dec");
  const N = Number(choice(input, "N", "Número de bits", ["4", "8", "16", "32", "64"], "8"));
  const raw = normalizeDigits(str(input, "x", "Valor")).replace(/[\s_]/g, "");
  const min = -(1n << BigInt(N - 1)), maxS = (1n << BigInt(N - 1)) - 1n, maxU = (1n << BigInt(N)) - 1n;
  const steps = [];
  let bits;
  if (mode === "dec") {
    if (!/^[+-]?\d+$/.test(raw)) fail("Introduzca un entero decimal (sin fracciones).", "x");
    const v = BigInt(raw);
    if (v < min || v > maxU) fail(`El valor está fuera del rango de ${N} bits: de ${min} a ${maxU} (o hasta ${maxS} para números con signo).`, "x");
    bits = encode(v, N);
    if (v >= 0n) {
      steps.push(`El número es positivo, así que lo escribimos directamente en binario y lo completamos con ceros hasta ${N} bits: ${group(bits)}.`);
      if (v > maxS) steps.push(`Aviso: el valor es mayor que ${maxS}, así que solo es válido sin signo; si se leyera con signo sería ${decodeSigned(bits)}.`);
    } else {
      const pos = encode(-v, N);
      const inv = [...pos].map((b) => (b === "1" ? "0" : "1")).join("");
      steps.push(`Escribimos la magnitud ${-v} en binario con ${N} bits: ${group(pos)}.`);
      steps.push(`Invertimos todos los bits (complemento a uno): ${group(inv)}.`);
      steps.push(`Sumamos 1 y obtenemos el complemento a dos: ${group(bits)}.`);
      steps.push({ text: "Comprobación:", tex: `2^{${N}} - ${-v} = ${(1n << BigInt(N)) + v}` });
    }
  } else if (mode === "bin") {
    if (!/^[01]+$/.test(raw)) fail("El valor binario solo puede contener 0 y 1.", "x");
    if (raw.length > N) fail(`El número de bits introducido (${raw.length}) es mayor que ${N}.`, "x");
    bits = raw.padStart(N, "0");
    if (raw.length < N) steps.push(`Completamos el valor con ceros a la izquierda hasta ${N} bits: ${group(bits)}.`);
  } else {
    if (!/^(0x)?[0-9a-fA-F]+$/.test(raw)) fail("El valor hexadecimal solo puede contener 0–9 y A–F.", "x");
    const h = raw.replace(/^0x/i, "");
    const u = BigInt("0x" + h);
    if (u > maxU) fail(`El valor es mayor que ${N} bits.`, "x");
    bits = u.toString(2).padStart(N, "0");
    steps.push(`Cada dígito hexadecimal equivale a 4 bits: ${group(bits)}.`);
  }
  const u = BigInt("0b" + bits), s = decodeSigned(bits);
  const ones = bits[0] === "1" ? -(BigInt("0b" + [...bits].map((b) => (b === "1" ? "0" : "1")).join(""))) : u;
  const sm = bits[0] === "1" ? -BigInt("0b" + (bits.slice(1) || "0")) : u;
  if (mode !== "dec") {
    steps.push(bits[0] === "1"
      ? `El bit más significativo es 1, así que el número es negativo en complemento a dos: valor = ${u} − 2^${N} = ${s}.`
      : `El bit más significativo es 0, así que el número es positivo y su valor es ${u} con o sin signo.`);
  }
  const hex = "0x" + u.toString(16).toUpperCase().padStart(Math.ceil(N / 4), "0");
  return {
    results: [
      { label: "Binario (complemento a dos)", value: group(bits), text: bits },
      { label: "Hexadecimal", value: hex, text: hex },
      { label: "Decimal con signo (complemento a dos)", value: s.toString() },
      { label: "Decimal sin signo", value: u.toString() },
      { label: "Interpretación del complemento a uno", value: ones === 0n && bits[0] === "1" ? "-0" : ones.toString() },
      { label: "Interpretación de signo y magnitud", value: sm === 0n && bits[0] === "1" ? "-0" : sm.toString() },
      { label: `Rango de ${N} bits con signo`, value: `${min} … ${maxS}` }
    ],
    steps, copy: `${bits} = ${hex} = ${s} (signed) = ${u} (unsigned)`
  };
}
